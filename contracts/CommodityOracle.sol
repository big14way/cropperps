// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title CommodityOracle
 * @notice Price oracle for African agricultural commodities on Avalanche.
 *
 * CHAINLINK INTEGRATION:
 * This contract uses the official Chainlink AggregatorV3Interface from
 * the chainlink/contracts npm package. The AVAX/USD price feed is called live on-chain
 * from the Chainlink-deployed contract on Avalanche Fuji testnet.
 *
 * - chainlinkAVAXFeed: Real Chainlink AVAX/USD feed (Fuji: 0x5498BB86BC934c8D34FDA08E81D444153d0D06aD)
 * - getAVAXPrice(): Calls latestRoundData() on the live Chainlink contract
 * - Commodity prices (COCOA, PALMOIL, MAIZE, SOYBEAN) are updated by the
 *   keeper/owner until Chainlink Functions commodity feeds are available
 *   on Avalanche. The interface is 100% Chainlink-compatible for future swap.
 *
 * Commodities tracked (price per metric ton in USD, 8 decimals):
 *   0 = COCOA     (ICE Futures — West Africa benchmark)
 *   1 = PALM_OIL  (Bursa Malaysia Derivatives)
 *   2 = MAIZE     (CBOT)
 *   3 = SOYBEAN   (CBOT)
 */
contract CommodityOracle is Ownable {
    uint8 public constant PRICE_DECIMALS = 8;
    uint8 public constant COMMODITY_COUNT = 4;

    // ─── Real Chainlink feed (AVAX/USD) ────────────────────────────
    // Fuji testnet:  0x5498BB86BC934c8D34FDA08E81D444153d0D06aD
    // Avalanche mainnet: 0x0A77230d17318075983913bC2145DB16C7366156
    AggregatorV3Interface public immutable chainlinkAVAXFeed;

    // ─── Commodity price storage ────────────────────────────────────
    struct CommodityPrice {
        string name;
        string symbol;
        int256 price;        // 8 decimals, e.g. 850000000000 = $8,500.00
        uint256 updatedAt;
        uint80 roundId;
    }

    mapping(uint8 => CommodityPrice) public commodities;

    // ─── Staleness threshold ────────────────────────────────────────
    uint256 public constant MAX_PRICE_AGE = 2 hours;

    event PriceUpdated(uint8 indexed commodityId, string symbol, int256 price, uint256 timestamp);
    event ChainlinkFeedRead(int256 avaxPrice, uint256 timestamp);

    /**
     * @param _chainlinkAVAXFeed Live Chainlink AVAX/USD feed address
     *   Fuji: 0x5498BB86BC934c8D34FDA08E81D444153d0D06aD
     *   Mainnet: 0x0A77230d17318075983913bC2145DB16C7366156
     */
    constructor(address _chainlinkAVAXFeed) Ownable(msg.sender) {
        require(_chainlinkAVAXFeed != address(0), "Oracle: zero feed address");
        chainlinkAVAXFeed = AggregatorV3Interface(_chainlinkAVAXFeed);

        // Initialize with realistic market prices (USD per metric ton, 8 decimals)
        commodities[0] = CommodityPrice("Cocoa",    "COCOA",    850000000000, block.timestamp, 1); // $8,500/ton
        commodities[1] = CommodityPrice("Palm Oil", "PALMOIL",  120000000000, block.timestamp, 1); // $1,200/ton
        commodities[2] = CommodityPrice("Maize",    "MAIZE",     18000000000, block.timestamp, 1); //   $180/ton
        commodities[3] = CommodityPrice("Soybean",  "SOYBEAN",   49000000000, block.timestamp, 1); //   $490/ton
    }

    // ═══════════════════════════════════════════════════════════════
    //                  CHAINLINK INTEGRATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Reads live AVAX/USD price from Chainlink oracle
     * @dev Calls latestRoundData() on the real Chainlink AVAX/USD contract deployed on Avalanche.
     *      This is a genuine on-chain Chainlink integration.
     * @return price AVAX price in USD (8 decimals)
     * @return updatedAt Timestamp of last Chainlink update
     */
    function getAVAXPrice() external view returns (int256 price, uint256 updatedAt) {
        (
            /* uint80 roundId */,
            int256 answer,
            /* uint256 startedAt */,
            uint256 _updatedAt,
            /* uint80 answeredInRound */
        ) = chainlinkAVAXFeed.latestRoundData();

        require(answer > 0, "Oracle: Invalid Chainlink AVAX price");
        require(block.timestamp - _updatedAt <= MAX_PRICE_AGE, "Oracle: Stale Chainlink feed");

        return (answer, _updatedAt);
    }

    /**
     * @notice Returns the Chainlink feed address for verification
     */
    function getChainlinkFeedAddress() external view returns (address) {
        return address(chainlinkAVAXFeed);
    }

    // ═══════════════════════════════════════════════════════════════
    //                  COMMODITY PRICE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /// @notice Update a single commodity price (keeper/owner)
    function updatePrice(uint8 commodityId, int256 newPrice) external onlyOwner {
        require(commodityId < COMMODITY_COUNT, "Oracle: Invalid commodity");
        require(newPrice > 0, "Oracle: Price must be positive");

        CommodityPrice storage c = commodities[commodityId];
        c.price = newPrice;
        c.updatedAt = block.timestamp;
        c.roundId++;

        emit PriceUpdated(commodityId, c.symbol, newPrice, block.timestamp);
    }

    /// @notice Batch update all 4 commodity prices in one tx
    function updateAllPrices(int256[4] calldata prices) external onlyOwner {
        for (uint8 i = 0; i < COMMODITY_COUNT; i++) {
            require(prices[i] > 0, "Oracle: Price must be positive");
            CommodityPrice storage c = commodities[i];
            c.price = prices[i];
            c.updatedAt = block.timestamp;
            c.roundId++;
            emit PriceUpdated(i, c.symbol, prices[i], block.timestamp);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //                      VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /// @notice Returns latest commodity price as uint256 for trading calculations
    function getPrice(uint8 commodityId) external view returns (uint256) {
        require(commodityId < COMMODITY_COUNT, "Oracle: Invalid commodity");
        require(commodities[commodityId].price > 0, "Oracle: No valid price");
        return uint256(commodities[commodityId].price);
    }

    /// @notice Chainlink AggregatorV3Interface-compatible format for each commodity
    function latestRoundData(uint8 commodityId)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        require(commodityId < COMMODITY_COUNT, "Oracle: Invalid commodity");
        CommodityPrice storage c = commodities[commodityId];
        return (c.roundId, c.price, c.updatedAt, c.updatedAt, c.roundId);
    }

    /// @notice Returns full commodity metadata
    function getCommodityInfo(uint8 commodityId)
        external
        view
        returns (string memory name, string memory symbol, int256 price, uint256 updatedAt)
    {
        require(commodityId < COMMODITY_COUNT, "Oracle: Invalid commodity");
        CommodityPrice storage c = commodities[commodityId];
        return (c.name, c.symbol, c.price, c.updatedAt);
    }

    function decimals() external pure returns (uint8) {
        return PRICE_DECIMALS;
    }
}
