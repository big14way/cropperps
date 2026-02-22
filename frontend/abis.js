// CropPerps Protocol — Contract ABIs
// Partners: Chainlink (AVAX/USD oracle) · Agora (AUSD collateral) · Tether (USDT)

const ABIS = {

  // ─── Tether USDT (6 decimals) ───────────────────────────────────
  USDT: [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function faucet()",
    "function lastFaucetTime(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function transfer(address to, uint256 amount) returns (bool)",
  ],

  // ─── Agora AUSD (18 decimals) ───────────────────────────────────
  AUSD: [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function faucet()",
    "function lastFaucetTime(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function transfer(address to, uint256 amount) returns (bool)",
  ],

  // ─── CommodityOracle (with real Chainlink AVAX/USD feed) ────────
  ORACLE: [
    "function getPrice(uint8 commodityId) view returns (uint256)",
    "function getAVAXPrice() view returns (int256 price, uint256 updatedAt)",
    "function getChainlinkFeedAddress() view returns (address)",
    "function getCommodityInfo(uint8) view returns (string name, string symbol, int256 price, uint256 updatedAt)",
    "function updatePrice(uint8 commodityId, int256 newPrice)",
    "function updateAllPrices(int256[4] prices)",
    "function COMMODITY_COUNT() view returns (uint8)",
    "function chainlinkAVAXFeed() view returns (address)",
  ],

  // ─── CropVault (LP pool — USDT + AUSD) ──────────────────────────
  VAULT: [
    "function addLiquidity(uint256 usdtAmount)",
    "function addLiquidityAUSD(uint256 ausdAmount)",
    "function removeLiquidity(uint256 lpAmount)",
    "function balanceOf(address) view returns (uint256)",
    "function totalAssets() view returns (uint256)",
    "function availableCapacity() view returns (uint256)",
    "function reservedUSDT() view returns (uint256)",
    "function lpTokenPrice() view returns (uint256)",
    "function getVaultStats() view returns (uint256 totalUSDT, uint256 ausdBalance, uint256 reservedAmount, uint256 freeLiquidity, uint256 utilizationBps, uint256 tokenPrice, uint256 totalLPSupply)",
    "function totalFeesCollected() view returns (uint256)",
    "function usdt() view returns (address)",
    "function ausd() view returns (address)",
    "event LiquidityAdded(address indexed provider, address token, uint256 amount, uint256 lpMinted)",
    "event LiquidityRemoved(address indexed provider, uint256 lpBurned, uint256 usdtOut)",
  ],

  // ─── CropPerps (core trading engine) ────────────────────────────
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
