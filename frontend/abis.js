const ABIS = {

  USDT: [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function faucet()",
    "function lastFaucetTime(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
  ],

  ORACLE: [
    "function getPrice(uint8 commodityId) view returns (uint256)",
    "function getCommodityInfo(uint8) view returns (string name, string symbol, int256 price, uint256 updatedAt)",
    "function updatePrice(uint8 commodityId, int256 newPrice)",
    "function updateAllPrices(int256[4] prices)",
    "function COMMODITY_COUNT() view returns (uint8)",
  ],

  VAULT: [
    "function addLiquidity(uint256 usdtAmount)",
    "function removeLiquidity(uint256 lpAmount)",
    "function balanceOf(address) view returns (uint256)",
    "function totalAssets() view returns (uint256)",
    "function availableCapacity() view returns (uint256)",
    "function reservedUSDT() view returns (uint256)",
    "function lpTokenPrice() view returns (uint256)",
    "function getVaultStats() view returns (uint256 totalUSDT, uint256 reservedAmount, uint256 freeLiquidity, uint256 utilizationBps, uint256 tokenPrice, uint256 totalLPSupply)",
    "function totalFeesCollected() view returns (uint256)",
    "event LiquidityAdded(address indexed provider, uint256 usdtAmount, uint256 lpTokensMinted)",
    "event LiquidityRemoved(address indexed provider, uint256 lpTokensBurned, uint256 usdtAmount)",
  ],

  PERPS: [
    "function openPosition(uint8 commodityId, bool isLong, uint256 collateralAmount, uint256 leverage) returns (uint256 positionId)",
    "function closePosition(uint256 positionId)",
    "function liquidatePosition(uint256 positionId)",
    "function getTraderPositions(address trader) view returns (uint256[])",
    "function getPositionDetails(uint256 positionId) view returns (tuple(uint256 id, address trader, uint8 commodityId, bool isLong, uint256 collateral, uint256 leverage, uint256 sizeUSDT, uint256 entryPrice, uint256 openTimestamp, bool isOpen) pos, uint256 currentPrice, int256 unrealizedPnL, uint256 accruedBorrowFee, bool isLiquidatable)",
    "function checkLiquidation(uint256 positionId) view returns (bool liquidatable, int256 remainingCollateral)",
    "function getUnrealizedPnL(uint256 positionId) view returns (int256)",
    "function openInterestLong(uint8) view returns (uint256)",
    "function openInterestShort(uint8) view returns (uint256)",
    "function totalOpenPositions() view returns (uint256)",
    "event PositionOpened(uint256 indexed positionId, address indexed trader, uint8 commodityId, bool isLong, uint256 collateral, uint256 leverage, uint256 sizeUSDT, uint256 entryPrice)",
    "event PositionClosed(uint256 indexed positionId, address indexed trader, int256 pnl, uint256 closingPrice, uint256 fees, uint256 payoutToTrader)",
    "event PositionLiquidated(uint256 indexed positionId, address indexed trader, address indexed liquidator, uint256 closingPrice, uint256 liquidatorReward)",
  ],
};
