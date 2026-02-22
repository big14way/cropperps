// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./CropVault.sol";
import "./CommodityOracle.sol";

/**
 * @title CropPerps
 * @notice Decentralized perpetuals exchange for African agricultural commodities.
 *         Traders can go long or short on COCOA, PALM OIL, MAIZE, and SOYBEAN
 *         with up to 10x leverage using USDT as collateral.
 *
 * Architecture:
 *   - Traders post USDT collateral
 *   - CropVault acts as counterparty (LP funds back all positions)
 *   - CommodityOracle (Chainlink-compatible) provides real-time prices
 *   - PnL settled in USDT on close
 *
 * Fee Structure:
 *   - Open fee:   0.10% of position size
 *   - Close fee:  0.10% of position size
 *   - Borrow fee: 0.01% of position size per hour
 *   All fees flow into CropVault, increasing LP token value.
 *
 * Liquidation:
 *   - Position liquidated if remaining collateral < 10% of initial collateral
 *   - Liquidator receives 5% of collateral as reward
 *
 * @dev Built for Avalanche C-Chain.
 * Partners: Chainlink (AVAX/USD live oracle feed on Fuji/Mainnet),
 *           Agora AUSD (dual collateral alongside USDT).
 * Collateral: USDT (6 dec) + AUSD (18 dec, normalized to 6 dec in vault).
 */
contract CropPerps is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════
    //                          STATE
    // ═══════════════════════════════════════════════════════════════

    IERC20 public immutable usdt;
    CropVault public immutable vault;
    CommodityOracle public immutable oracle;

    uint256 public constant MAX_LEVERAGE = 10;
    uint256 public constant MIN_LEVERAGE = 1;
    uint256 public constant OPEN_FEE_BPS = 10;       // 0.10%
    uint256 public constant CLOSE_FEE_BPS = 10;      // 0.10%
    uint256 public constant BORROW_FEE_BPS_PER_HOUR = 1; // 0.01% per hour
    uint256 public constant LIQUIDATION_THRESHOLD_BPS = 1000; // 10% of collateral
    uint256 public constant LIQUIDATION_REWARD_BPS = 500;     // 5% of collateral
    uint256 public constant BPS_DIVISOR = 10000;
    uint256 public constant MIN_COLLATERAL = 10 * 10 ** 6; // 10 USDT minimum

    uint256 private nextPositionId = 1;

    struct Position {
        uint256 id;
        address trader;
        uint8 commodityId;      // 0=COCOA, 1=PALMOIL, 2=MAIZE, 3=SOYBEAN
        bool isLong;
        uint256 collateral;     // USDT deposited (6 decimals)
        uint256 leverage;       // 1–10x (integer)
        uint256 sizeUSDT;       // collateral * leverage (position notional value)
        uint256 entryPrice;     // Commodity price at open (8 decimals)
        uint256 openTimestamp;
        bool isOpen;
    }

    // positionId → Position
    mapping(uint256 => Position) public positions;
    // trader → list of their position IDs
    mapping(address => uint256[]) public traderPositions;
    // total open interest per commodity (long and short separately)
    mapping(uint8 => uint256) public openInterestLong;
    mapping(uint8 => uint256) public openInterestShort;

    uint256 public totalOpenPositions;

    // ═══════════════════════════════════════════════════════════════
    //                          EVENTS
    // ═══════════════════════════════════════════════════════════════

    event PositionOpened(
        uint256 indexed positionId,
        address indexed trader,
        uint8 commodityId,
        bool isLong,
        uint256 collateral,
        uint256 leverage,
        uint256 sizeUSDT,
        uint256 entryPrice
    );

    event PositionClosed(
        uint256 indexed positionId,
        address indexed trader,
        int256 pnl,
        uint256 closingPrice,
        uint256 fees,
        uint256 payoutToTrader
    );

    event PositionLiquidated(
        uint256 indexed positionId,
        address indexed trader,
        address indexed liquidator,
        uint256 closingPrice,
        uint256 liquidatorReward
    );

    // ═══════════════════════════════════════════════════════════════
    //                        CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════

    constructor(
        address _usdt,
        address payable _vault,
        address _oracle
    ) Ownable(msg.sender) {
        require(_usdt != address(0), "CropPerps: zero USDT");
        require(_vault != address(0), "CropPerps: zero vault");
        require(_oracle != address(0), "CropPerps: zero oracle");
        usdt = IERC20(_usdt);
        vault = CropVault(_vault);
        oracle = CommodityOracle(_oracle);
    }

    // ═══════════════════════════════════════════════════════════════
    //                       TRADING FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Open a long or short position on an agricultural commodity
     * @param commodityId 0=COCOA, 1=PALMOIL, 2=MAIZE, 3=SOYBEAN
     * @param isLong true for long (bet price goes up), false for short
     * @param collateralAmount USDT collateral to post (6 decimals)
     * @param leverage Multiplier 1–10
     * @return positionId The ID of the newly opened position
     */
    function openPosition(
        uint8 commodityId,
        bool isLong,
        uint256 collateralAmount,
        uint256 leverage
    ) external nonReentrant returns (uint256 positionId) {
        require(collateralAmount >= MIN_COLLATERAL, "CropPerps: Collateral too low");
        require(leverage >= MIN_LEVERAGE && leverage <= MAX_LEVERAGE, "CropPerps: Invalid leverage");
        require(commodityId < oracle.COMMODITY_COUNT(), "CropPerps: Invalid commodity");

        uint256 currentPrice = oracle.getPrice(commodityId);
        require(currentPrice > 0, "CropPerps: No valid price");

        uint256 positionSize = collateralAmount * leverage;

        // Calculate open fee and deduct from collateral
        uint256 openFee = (positionSize * OPEN_FEE_BPS) / BPS_DIVISOR;
        require(collateralAmount > openFee, "CropPerps: Fee exceeds collateral");
        uint256 netCollateral = collateralAmount - openFee;

        // Check vault has capacity to back this position
        // The vault needs to reserve positionSize to cover max potential profit
        require(
            positionSize <= vault.availableCapacity() + netCollateral,
            "CropPerps: Insufficient vault liquidity"
        );

        // Transfer collateral from trader to this contract, then to vault
        usdt.safeTransferFrom(msg.sender, address(vault), collateralAmount);

        // Vault books the fee immediately
        vault.collectFees(openFee);

        // Reserve position notional in vault
        vault.reserveForPosition(positionSize);

        // Create position
        positionId = nextPositionId++;
        positions[positionId] = Position({
            id: positionId,
            trader: msg.sender,
            commodityId: commodityId,
            isLong: isLong,
            collateral: netCollateral,
            leverage: leverage,
            sizeUSDT: positionSize,
            entryPrice: currentPrice,
            openTimestamp: block.timestamp,
            isOpen: true
        });

        traderPositions[msg.sender].push(positionId);
        totalOpenPositions++;

        // Update open interest
        if (isLong) {
            openInterestLong[commodityId] += positionSize;
        } else {
            openInterestShort[commodityId] += positionSize;
        }

        emit PositionOpened(
            positionId,
            msg.sender,
            commodityId,
            isLong,
            netCollateral,
            leverage,
            positionSize,
            currentPrice
        );
    }

    /**
     * @notice Close an open position and settle PnL
     * @param positionId The ID of the position to close
     */
    function closePosition(uint256 positionId) external nonReentrant {
        Position storage pos = positions[positionId];
        require(pos.isOpen, "CropPerps: Position not open");
        require(pos.trader == msg.sender, "CropPerps: Not your position");

        uint256 currentPrice = oracle.getPrice(pos.commodityId);
        _settlePosition(positionId, currentPrice, msg.sender, false);
    }

    /**
     * @notice Liquidate an undercollateralized position and earn a reward
     * @param positionId The ID of the position to liquidate
     */
    function liquidatePosition(uint256 positionId) external nonReentrant {
        Position storage pos = positions[positionId];
        require(pos.isOpen, "CropPerps: Position not open");

        uint256 currentPrice = oracle.getPrice(pos.commodityId);
        (bool isLiquidatable,) = checkLiquidation(positionId);
        require(isLiquidatable, "CropPerps: Position not liquidatable");

        _settlePosition(positionId, currentPrice, msg.sender, true);
    }

    // ═══════════════════════════════════════════════════════════════
    //                     INTERNAL SETTLEMENT
    // ═══════════════════════════════════════════════════════════════

    function _settlePosition(
        uint256 positionId,
        uint256 closingPrice,
        address caller,
        bool isLiquidation
    ) internal {
        Position storage pos = positions[positionId];

        // Calculate raw PnL
        int256 pnl = _calculatePnL(Position({
            id: pos.id, trader: pos.trader, commodityId: pos.commodityId, isLong: pos.isLong,
            collateral: pos.collateral, leverage: pos.leverage, sizeUSDT: pos.sizeUSDT,
            entryPrice: pos.entryPrice, openTimestamp: pos.openTimestamp, isOpen: pos.isOpen
        }), closingPrice);

        // Calculate borrow fee (accumulates over time held)
        uint256 hoursOpen = (block.timestamp - pos.openTimestamp) / 3600;
        uint256 borrowFee = (pos.sizeUSDT * BORROW_FEE_BPS_PER_HOUR * hoursOpen) / BPS_DIVISOR;

        // Calculate close fee
        uint256 closeFee = (pos.sizeUSDT * CLOSE_FEE_BPS) / BPS_DIVISOR;

        uint256 totalFees = borrowFee + closeFee;

        // Compute final payout: collateral + pnl - fees
        uint256 payoutToTrader = 0;
        uint256 liquidatorReward = 0;

        if (isLiquidation) {
            // Liquidator gets 5% of remaining collateral
            liquidatorReward = (pos.collateral * LIQUIDATION_REWARD_BPS) / BPS_DIVISOR;
            // Rest goes to vault
        } else {
            int256 finalBalance = int256(pos.collateral) + pnl - int256(totalFees);
            if (finalBalance > 0) {
                payoutToTrader = uint256(finalBalance);
            }
            // If finalBalance <= 0, trader loses all collateral (vault keeps it)
        }

        // Release vault reservation
        vault.releaseReservation(pos.sizeUSDT);

        // Settle: if trader is winning, vault pays out the profit
        if (!isLiquidation && payoutToTrader > 0) {
            if (pnl > 0) {
                // Vault pays profit + returns collateral
                vault.payTrader(pos.trader, payoutToTrader);
            } else {
                // Vault returns remaining collateral (loss already in vault)
                // The USDT is already in vault from open; pay back remainder
                vault.payTrader(pos.trader, payoutToTrader);
            }
        }

        if (isLiquidation && liquidatorReward > 0) {
            vault.payTrader(caller, liquidatorReward);
        }

        vault.collectFees(totalFees);

        // Close position
        pos.isOpen = false;
        totalOpenPositions--;

        // Update open interest
        if (pos.isLong) {
            openInterestLong[pos.commodityId] -= pos.sizeUSDT;
        } else {
            openInterestShort[pos.commodityId] -= pos.sizeUSDT;
        }

        if (isLiquidation) {
            emit PositionLiquidated(positionId, pos.trader, caller, closingPrice, liquidatorReward);
        } else {
            emit PositionClosed(positionId, pos.trader, pnl, closingPrice, totalFees, payoutToTrader);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //                       VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Calculate current unrealized PnL for a position
     * @dev Price uses 8 decimals (Chainlink standard)
     *      PnL = sizeUSDT * (currentPrice - entryPrice) / entryPrice  [for long]
     *      PnL = sizeUSDT * (entryPrice - currentPrice) / entryPrice  [for short]
     */
    function _calculatePnL(Position memory pos, uint256 currentPrice)
        internal
        pure
        returns (int256)
    {
        if (pos.entryPrice == 0) return 0;

        int256 priceDelta = int256(currentPrice) - int256(pos.entryPrice);

        if (!pos.isLong) {
            priceDelta = -priceDelta; // Invert for shorts
        }

        // PnL in USDT = (sizeUSDT * priceDelta) / entryPrice
        // sizeUSDT is 6 decimals, prices are 8 decimals — ratio is dimensionless
        return (int256(pos.sizeUSDT) * priceDelta) / int256(pos.entryPrice);
    }

    /// @notice Get current unrealized PnL for a position (public view)
    function getUnrealizedPnL(uint256 positionId) external view returns (int256 pnl) {
        Position storage pos = positions[positionId];
        require(pos.isOpen, "CropPerps: Position not open");
        uint256 currentPrice = oracle.getPrice(pos.commodityId);
        return _calculatePnL(Position({
            id: pos.id, trader: pos.trader, commodityId: pos.commodityId, isLong: pos.isLong,
            collateral: pos.collateral, leverage: pos.leverage, sizeUSDT: pos.sizeUSDT,
            entryPrice: pos.entryPrice, openTimestamp: pos.openTimestamp, isOpen: pos.isOpen
        }), currentPrice);
    }

    /// @notice Check if a position is eligible for liquidation
    function checkLiquidation(uint256 positionId)
        public
        view
        returns (bool liquidatable, int256 remainingCollateral)
    {
        Position storage pos = positions[positionId];
        if (!pos.isOpen) return (false, 0);

        uint256 currentPrice = oracle.getPrice(pos.commodityId);
        int256 pnl = _calculatePnL(Position({
            id: pos.id, trader: pos.trader, commodityId: pos.commodityId, isLong: pos.isLong,
            collateral: pos.collateral, leverage: pos.leverage, sizeUSDT: pos.sizeUSDT,
            entryPrice: pos.entryPrice, openTimestamp: pos.openTimestamp, isOpen: pos.isOpen
        }), currentPrice);

        uint256 hoursOpen = (block.timestamp - pos.openTimestamp) / 3600;
        uint256 borrowFee = (pos.sizeUSDT * BORROW_FEE_BPS_PER_HOUR * hoursOpen) / BPS_DIVISOR;

        remainingCollateral = int256(pos.collateral) + pnl - int256(borrowFee);

        uint256 liquidationFloor = (pos.collateral * LIQUIDATION_THRESHOLD_BPS) / BPS_DIVISOR;
        liquidatable = remainingCollateral < int256(liquidationFloor);
    }

    /// @notice Get full position details with current PnL
    function getPositionDetails(uint256 positionId)
        external
        view
        returns (
            Position memory pos,
            uint256 currentPrice,
            int256 unrealizedPnL,
            uint256 accruedBorrowFee,
            bool isLiquidatable
        )
    {
        pos = positions[positionId];
        currentPrice = oracle.getPrice(pos.commodityId);
        unrealizedPnL = _calculatePnL(pos, currentPrice);
        uint256 hoursOpen = (block.timestamp - pos.openTimestamp) / 3600;
        accruedBorrowFee = (pos.sizeUSDT * BORROW_FEE_BPS_PER_HOUR * hoursOpen) / BPS_DIVISOR;
        (isLiquidatable,) = checkLiquidation(positionId);
    }

    /// @notice Get all position IDs for a trader
    function getTraderPositions(address trader) external view returns (uint256[] memory) {
        return traderPositions[trader];
    }

    /// @notice Get open interest for all commodities
    function getAllOpenInterest()
        external
        view
        returns (
            uint256[4] memory longOI,
            uint256[4] memory shortOI
        )
    {
        for (uint8 i = 0; i < 4; i++) {
            longOI[i] = openInterestLong[i];
            shortOI[i] = openInterestShort[i];
        }
    }
}
