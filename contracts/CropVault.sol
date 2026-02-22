// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CropVault
 * @notice LP vault for CropPerps. Accepts USDT and AUSD as collateral.
 *         LPs deposit stablecoins and receive CROP-LP tokens representing
 *         their proportional share. The vault is the counterparty to all
 *         trader positions — trader losses go to the vault, profits are paid out.
 *
 * PARTNER INTEGRATIONS:
 * - Tether USDT: Primary settlement currency (6 decimals).
 *   Testnet: MockUSDT | Mainnet: 0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7
 *
 * - Agora AUSD: Second accepted collateral (18 decimals).
 *   Agora is a Dragonfly & Paradigm-backed stablecoin live on Avalanche.
 *   Testnet: MockAUSD | Mainnet: see https://agora.finance for AUSD address.
 *   AUSD deposits are normalized to 6-decimal USDT equivalent for LP math.
 *
 * LP Token Price = (Total normalized USD in vault) / (Total CROP-LP supply)
 *
 * Max utilization: 80% of vault assets can back open positions at any time.
 */
contract CropVault is ERC20, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ─── Accepted stablecoins ───────────────────────────────────────
    IERC20 public immutable usdt;  // Tether USDT (6 decimals)
    IERC20 public immutable ausd;  // Agora AUSD  (18 decimals)

    /// @notice Only CropPerps trading contract can move vault funds
    address public cropPerps;

    uint256 public constant MAX_UTILIZATION_BPS = 8000; // 80%
    uint256 public constant BPS_DIVISOR = 10000;
    uint256 public constant MIN_DEPOSIT = 10 * 10 ** 6; // 10 USDT (6 dec)

    /// @notice How much is locked backing open positions (in USDT 6-dec units)
    uint256 public reservedUSDT;

    /// @notice Total fees collected (informational)
    uint256 public totalFeesCollected;

    event LiquidityAdded(address indexed provider, address token, uint256 amount, uint256 lpMinted);
    event LiquidityRemoved(address indexed provider, uint256 lpBurned, uint256 usdtOut);
    event ReservesUpdated(uint256 reserved, uint256 total);
    event FeesCollected(uint256 amount);
    event CropPerpsSet(address indexed cropPerps);

    constructor(address _usdt, address _ausd) ERC20("CropPerps LP", "CROP-LP") Ownable(msg.sender) {
        require(_usdt != address(0), "Vault: zero USDT");
        require(_ausd != address(0), "Vault: zero AUSD");
        usdt = IERC20(_usdt);
        ausd = IERC20(_ausd);
    }

    modifier onlyCropPerps() {
        require(msg.sender == cropPerps, "Vault: Only CropPerps");
        _;
    }

    /// @notice Link CropPerps trading contract (one-time)
    function setCropPerps(address _cropPerps) external onlyOwner {
        require(_cropPerps != address(0), "Vault: Zero address");
        require(cropPerps == address(0), "Vault: Already set");
        cropPerps = _cropPerps;
        emit CropPerpsSet(_cropPerps);
    }

    // ═══════════════════════════════════════════════════════════════
    //                      LP OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Deposit USDT to receive CROP-LP tokens
     * @param usdtAmount Amount in USDT (6 decimals)
     */
    function addLiquidity(uint256 usdtAmount) external nonReentrant {
        require(usdtAmount >= MIN_DEPOSIT, "Vault: Below minimum deposit");
        _mintLP(msg.sender, usdtAmount, address(usdt), usdtAmount);
        usdt.safeTransferFrom(msg.sender, address(this), usdtAmount);
        emit LiquidityAdded(msg.sender, address(usdt), usdtAmount, 0);
    }

    /**
     * @notice Deposit Agora AUSD to receive CROP-LP tokens
     * @param ausdAmount Amount in AUSD (18 decimals)
     * @dev AUSD is normalized to USDT-equivalent (divide by 1e12) for LP math
     */
    function addLiquidityAUSD(uint256 ausdAmount) external nonReentrant {
        // Normalize 18-decimal AUSD to 6-decimal USDT equivalent
        uint256 normalizedAmount = ausdAmount / 1e12;
        require(normalizedAmount >= MIN_DEPOSIT, "Vault: AUSD below minimum deposit");
        _mintLP(msg.sender, normalizedAmount, address(ausd), ausdAmount);
        ausd.safeTransferFrom(msg.sender, address(this), ausdAmount);
        emit LiquidityAdded(msg.sender, address(ausd), ausdAmount, 0);
    }

    /**
     * @notice Internal LP minting — shared by USDT and AUSD deposit paths
     * @param provider Address receiving LP tokens
     * @param normalizedUSD Amount in 6-decimal USDT units (for LP math)
     * @param token Token being deposited
     * @param rawAmount Raw token amount (pre-normalization)
     */
    function _mintLP(
        address provider,
        uint256 normalizedUSD,
        address token,
        uint256 rawAmount
    ) internal {
        uint256 lpToMint;
        uint256 totalUsd = totalAssets();

        if (totalSupply() == 0 || totalUsd == 0) {
            // First deposit: 1 USD = 1 CROP-LP (scaled to 18 dec)
            lpToMint = normalizedUSD * 1e12;
        } else {
            // Proportional to existing pool
            lpToMint = (normalizedUSD * totalSupply()) / totalUsd;
        }

        _mint(provider, lpToMint);
    }

    /**
     * @notice Burn CROP-LP and withdraw proportional USDT
     * @param lpAmount CROP-LP tokens to burn
     */
    function removeLiquidity(uint256 lpAmount) external nonReentrant {
        require(lpAmount > 0, "Vault: Zero LP");
        require(balanceOf(msg.sender) >= lpAmount, "Vault: Insufficient LP");

        uint256 usdtOut = (lpAmount * totalAssets()) / totalSupply();
        require(usdtOut > 0, "Vault: Zero output");
        require(usdtOut <= totalAssets() - reservedUSDT, "Vault: Insufficient free liquidity");

        _burn(msg.sender, lpAmount);
        usdt.safeTransfer(msg.sender, usdtOut);

        emit LiquidityRemoved(msg.sender, lpAmount, usdtOut);
    }

    // ═══════════════════════════════════════════════════════════════
    //              TRADING ENGINE HOOKS (onlyCropPerps)
    // ═══════════════════════════════════════════════════════════════

    function reserveForPosition(uint256 amount) external onlyCropPerps {
        require(
            (reservedUSDT + amount) * BPS_DIVISOR <= totalAssets() * MAX_UTILIZATION_BPS,
            "Vault: Max utilization reached"
        );
        reservedUSDT += amount;
        emit ReservesUpdated(reservedUSDT, totalAssets());
    }

    function releaseReservation(uint256 amount) external onlyCropPerps {
        if (amount > reservedUSDT) reservedUSDT = 0;
        else reservedUSDT -= amount;
        emit ReservesUpdated(reservedUSDT, totalAssets());
    }

    function payTrader(address trader, uint256 amount) external onlyCropPerps {
        require(amount <= usdt.balanceOf(address(this)), "Vault: Insufficient USDT balance");
        usdt.safeTransfer(trader, amount);
    }

    function collectFees(uint256 feeAmount) external onlyCropPerps {
        totalFeesCollected += feeAmount;
        emit FeesCollected(feeAmount);
    }

    // ═══════════════════════════════════════════════════════════════
    //                      VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Total USD value in vault (USDT + AUSD normalized to 6 dec)
     */
    function totalAssets() public view returns (uint256) {
        uint256 usdtBalance = usdt.balanceOf(address(this));
        uint256 ausdBalance = ausd.balanceOf(address(this)) / 1e12; // normalize to 6 dec
        return usdtBalance + ausdBalance;
    }

    /// @notice Price of 1 CROP-LP in USDT (scaled: result * 1e18 / totalSupply = price in 6 dec)
    function lpTokenPrice() external view returns (uint256) {
        if (totalSupply() == 0) return 1e6;
        return (totalAssets() * 1e18) / totalSupply();
    }

    /// @notice Available USDT capacity for new positions
    function availableCapacity() external view returns (uint256) {
        uint256 maxReservable = (totalAssets() * MAX_UTILIZATION_BPS) / BPS_DIVISOR;
        if (reservedUSDT >= maxReservable) return 0;
        return maxReservable - reservedUSDT;
    }

    /// @notice Full vault stats in one call
    function getVaultStats()
        external
        view
        returns (
            uint256 totalUSDT,
            uint256 ausdBalance,
            uint256 reservedAmount,
            uint256 freeLiquidity,
            uint256 utilizationBps,
            uint256 tokenPrice,
            uint256 totalLPSupply
        )
    {
        totalUSDT = usdt.balanceOf(address(this));
        ausdBalance = ausd.balanceOf(address(this));
        reservedAmount = reservedUSDT;
        uint256 totalUsd = totalAssets();
        freeLiquidity = totalUsd > reservedAmount ? totalUsd - reservedAmount : 0;
        utilizationBps = totalUsd > 0 ? (reservedAmount * BPS_DIVISOR) / totalUsd : 0;
        tokenPrice = totalSupply() > 0 ? (totalUsd * 1e18) / totalSupply() : 1e6;
        totalLPSupply = totalSupply();
    }
}
