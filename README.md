# CropPerps — Perpetuals DEX for African Agricultural Commodities

> **Avalanche Build Games 2026** | Built by Gwill, Lagos, Nigeria

[![Live App](https://img.shields.io/badge/Live-cropperps.vercel.app-00C853)](https://cropperps.vercel.app)
[![Network: Avalanche Fuji](https://img.shields.io/badge/Network-Avalanche%20Fuji-E84142)](https://testnet.snowtrace.io)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.26-363636)](https://soliditylang.org)
[![Tests](https://img.shields.io/badge/Tests-31%20passing-00C853)](test/CropPerps.test.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Live App:** https://cropperps.vercel.app
**GitHub:** https://github.com/big14way/cropperps

---

## The Problem: Africa's Commodity Producers Are Invisible to Global Finance

Africa feeds the world but cannot hedge, trade, or profit from the prices of what it grows.

**The scale is staggering:**

- Africa produces **75% of the world's cocoa**, **65% of the world's palm oil exports**, and over **200 million metric tons of maize and soybean annually** — yet not a single African commodity derivative exists on-chain
- **33 million smallholder farming households** across West and East Africa grow these crops, supporting over **200 million people** directly
- African farmers lose **20-40% of their crop value** to price volatility every year — they sell at harvest when prices are lowest because they have no tools to lock in better prices months ahead
- The total **commodity trade finance gap in Sub-Saharan Africa is $120 billion** according to the African Development Bank — farmers, traders, and exporters cannot access the financial instruments that protect them

**Why does this gap exist?**

Traditional commodity derivatives (CME, ICE Futures) require US or UK brokerage accounts, $10,000+ minimum deposits, institutional clearinghouse membership, and KYC documentation that excludes most African participants. A cocoa farmer in Ondo State, Nigeria — whose family has grown cocoa for three generations — has **zero access** to the $12 trillion global derivatives market that prices the very crop in his backyard.

**The human cost is real:**

When cocoa prices crashed 30% in 2017, Nigerian cocoa farmers had no way to hedge. Thousands abandoned their farms. Communities that had grown cocoa for decades fell into poverty — not because they couldn't grow it, but because they couldn't manage the price risk. The same pattern repeats every few years across palm oil in Ghana, maize in Kenya, and soybean in Zambia.

Meanwhile, a trader in Chicago can short cocoa futures in 3 clicks. The asymmetry is not just unfair — it's a structural failure that DeFi can fix.

**Currency risk makes it worse:**

Nigerian exporters invoice in USD but earn in Naira (NGN). With the Naira depreciating 40%+ in the last two years, even a profitable trade can become a loss after FX conversion. Stablecoin settlement eliminates this — traders keep their profits in USDT, immune to local currency devaluation.

**Africa's commodity producers are price-takers. CropPerps makes them price-setters.**

---

## The Solution: Permissionless Commodity Derivatives on Avalanche

**CropPerps** is a decentralized perpetuals exchange purpose-built for African agricultural commodities on Avalanche C-Chain.

Any wallet. No KYC. No minimum. Open a leveraged long or short on **COCOA, PALM OIL, MAIZE, or SOYBEAN** in one transaction, settled in USDT — at $0.02 gas cost on Avalanche.

### Who Uses CropPerps

| User | Action | Why |
|------|--------|-----|
| **Cocoa farmer in Ondo State** | Opens a SHORT before harvest season | Locks in today's price, protected if prices fall by harvest time |
| **Palm oil importer in Kano** | Shorts palm oil while waiting for shipment | Hedges inventory risk — if prices fall, the short profit offsets the cargo loss |
| **Commodity trader in Accra** | Goes LONG on maize after reading weather reports | Leverages local knowledge that international traders don't have |
| **Diaspora investor in London** | Provides USDT liquidity to the vault | Earns trading fees from African commodity markets without direct exposure |
| **DeFi yield farmer** | Deposits AUSD into the vault | Earns real yield from trading fees, not inflationary token rewards |

### What Makes CropPerps Different

1. **First mover** — No on-chain commodity derivatives exist for African agricultural products. Not on any chain.
2. **Local knowledge advantage** — African traders understand cocoa seasons, palm oil supply disruptions, and maize harvest cycles better than any algorithmic fund. CropPerps gives them the tools to profit from that knowledge.
3. **Stablecoin settlement** — All positions settle in USDT, eliminating the FX risk that destroys African commodity profits.
4. **Micro-positions** — Minimum collateral is 10 USDT (~$10). A farmer can hedge $100 worth of crop for $0.02 gas. Traditional futures require $10,000+ minimum.
5. **Dual stablecoin liquidity** — Vault accepts both Tether USDT and Agora AUSD, maximizing capital accessibility.

---

## Market Opportunity

### Total Addressable Market

| Market | Size | Source |
|--------|------|--------|
| Global commodity derivatives | **$12 trillion** annual notional | Bank for International Settlements |
| African agricultural exports | **$400 billion** annually | African Union / FAO |
| Sub-Saharan trade finance gap | **$120 billion** | African Development Bank |
| DeFi perpetuals volume (2025) | **$2.5 trillion** annually | DefiLlama |
| On-chain commodity derivatives | **$0** for African crops | — |

### Serviceable Market

CropPerps targets the intersection of:
- **African commodity traders** seeking price hedging tools (est. 5-10M active traders across West/East Africa)
- **DeFi users** seeking real-world yield from commodity trading fees
- **Diaspora investors** looking for exposure to African commodity markets
- **Institutional traders** who want programmatic access to African commodity prices

### Why Now

- **DeFi perpetuals are proven** — GMX, dYdX, and Hyperliquid have validated the on-chain perps model with billions in daily volume
- **Stablecoin adoption in Africa is exploding** — Nigeria is the #2 country globally for P2P crypto trading volume (Chainalysis 2024)
- **No competition** — Zero protocols offer African commodity derivatives. The market is entirely unserved.
- **Avalanche infrastructure is ready** — Sub-second finality, $0.02 gas, Chainlink oracles, and C-Chain EVM compatibility make it the ideal deployment target

---

## Revenue Model

CropPerps generates protocol revenue through trading fees that flow directly into the liquidity vault, increasing LP token value over time.

### Fee Structure

| Fee Type | Rate | When Charged | Flow |
|----------|------|-------------|------|
| **Opening fee** | 0.10% of notional | When position opens | → Vault (LP holders) |
| **Closing fee** | 0.10% of notional | When position closes | → Vault (LP holders) |
| **Borrow fee** | 0.01% of notional per hour | Accrues continuously, paid on close | → Vault (LP holders) |
| **Liquidation penalty** | 5% of collateral | When position is liquidated | → Liquidator (5%) + Vault (remainder) |

### Revenue Projections

```
Conservative scenario (Year 1 — testnet + early mainnet):
  Daily volume: $500K across 4 markets
  Daily fees:   $500K × 0.20% = $1,000/day
  Annual:       $365,000

Growth scenario (Year 2 — 8 markets, African adoption):
  Daily volume: $5M across 8 markets
  Daily fees:   $5M × 0.20% = $10,000/day
  Annual:       $3,650,000

Scale scenario (Year 3 — institutional + API access):
  Daily volume: $50M across 12+ markets
  Daily fees:   $50M × 0.20% = $100,000/day
  Annual:       $36,500,000
```

### LP Yield Economics

```
Example: $500K vault TVL, 100 trades/day at $5K average size

  Daily fee revenue = 100 × $5,000 × 0.20% = $1,000
  Daily LP yield = $1,000 / $500,000 = 0.20%/day
  Annualized = ~73% APY (real yield, not token emissions)
```

This is **real yield** — generated from actual trading activity, not inflationary token rewards. LP returns scale directly with trading volume.

### Future Revenue Streams (Post-Mainnet)

| Stream | Model | Timeline |
|--------|-------|----------|
| **Protocol fee share** | 10-20% of trading fees to protocol treasury / token holders | Phase 2 |
| **Premium API access** | Institutional traders pay for low-latency order execution | Phase 3 |
| **Cross-chain licensing** | Deploy CropPerps on other EVM chains, share fee revenue | Phase 3 |
| **Data feeds** | Sell aggregated African commodity price data to TradFi institutions | Phase 4 |

---

## Live Deployment (Avalanche Fuji Testnet)

All contracts are **verified on Snowtrace** — click any address to view source code on-chain.

| Contract | Address | Verified |
|----------|---------|----------|
| CropPerps (Trading Engine) | [`0xA0283BcC42CEFb7Cb93Cd0EA5E7A0A80fEc5c636`](https://testnet.snowtrace.io/address/0xA0283BcC42CEFb7Cb93Cd0EA5E7A0A80fEc5c636#code) | Yes |
| CropVault (LP Pool) | [`0x40f199cb423b44EA5321e89Fc44988464E286420`](https://testnet.snowtrace.io/address/0x40f199cb423b44EA5321e89Fc44988464E286420#code) | Yes |
| CommodityOracle | [`0x9BacC4b3FE6ad2664bC331C7354Fc3d4cdf4348b`](https://testnet.snowtrace.io/address/0x9BacC4b3FE6ad2664bC331C7354Fc3d4cdf4348b#code) | Yes |
| MockUSDT (Testnet) | [`0x30e9a40e757254FA41889c1fA1588D76E3CD3AD4`](https://testnet.snowtrace.io/address/0x30e9a40e757254FA41889c1fA1588D76E3CD3AD4#code) | Yes |
| MockAUSD (Testnet) | [`0x89B9c9d05A7F566107D31b6606eD54f0d7E4A84D`](https://testnet.snowtrace.io/address/0x89B9c9d05A7F566107D31b6606eD54f0d7E4A84D#code) | Yes |

**Chainlink AVAX/USD Feed:** [`0x5498BB86BC934c8D34FDA08E81D444153d0D06aD`](https://testnet.snowtrace.io/address/0x5498BB86BC934c8D34FDA08E81D444153d0D06aD) (live on Fuji)

---

## Technical Architecture

### System Overview

```
                           ┌─────────────────────┐
                           │    FRONTEND (SPA)    │
                           │   Vanilla JS + ethers│
                           │   Vercel-deployed    │
                           └──────────┬──────────┘
                                      │ ethers.js v6
                                      ▼
┌──────────────────────────────────────────────────────────────┐
│                    AVALANCHE C-CHAIN (Fuji)                   │
│                                                              │
│  ┌──────────────┐    ┌──────────────────┐   ┌─────────────┐ │
│  │  CROPPERPS    │───▶│    CROPVAULT     │   │ CHAINLINK   │ │
│  │              │    │                  │   │ AVAX/USD    │ │
│  │ openPosition │    │ USDT + AUSD pool │   │ Fuji Feed   │ │
│  │ closePosition│◀──▶│ CROP-LP ERC20    │   └──────┬──────┘ │
│  │ liquidate    │    │ reserveForPos    │          │        │
│  └──────┬───────┘    │ payTrader        │          │        │
│         │            │ collectFees      │          │        │
│         ▼            └──────────────────┘          │        │
│  ┌──────────────┐                                  │        │
│  │ COMMODITY    │◀─────────────────────────────────┘        │
│  │ ORACLE       │                                           │
│  │              │◀──── KEEPER BOT (off-chain, pm2)          │
│  │ COCOA        │     Random walk + mean reversion          │
│  │ PALMOIL      │     2-min intervals, max 10% guard        │
│  │ MAIZE        │                                           │
│  │ SOYBEAN      │     Staleness check: 2-hour MAX_PRICE_AGE│
│  └──────────────┘                                           │
└──────────────────────────────────────────────────────────────┘
```

### Contract Interaction Flow

```
OPEN POSITION:
  Trader → USDT.approve(CropPerps) → CropPerps.openPosition()
         → USDT.transferFrom(trader → vault)
         → Vault.collectFees(openFee)
         → Vault.reserveForPosition(positionSize)
         → Oracle.getPrice() [staleness check: ≤2 hours]
         → Position created in storage

CLOSE POSITION:
  Trader → CropPerps.closePosition()
         → Oracle.getPrice() [current market price]
         → _calculatePnL() [int256, can be negative]
         → borrowFee = size * 0.01% * hoursOpen
         → closeFee = size * 0.10%
         → finalBalance = collateral + PnL - fees
         → Vault.releaseReservation(positionSize)
         → Vault.payTrader(finalBalance) [if positive]
         → Vault.collectFees(totalFees)

LIQUIDATION:
  Anyone → CropPerps.liquidatePosition()
         → checkLiquidation() [remaining collateral < 10% of initial]
         → liquidatorReward = 5% of collateral
         → Vault.payTrader(liquidator, reward)
         → Vault.collectFees(borrowFee + closeFee)
         → Remaining collateral stays in vault (LP profit)
```

### Security Design

| Protection | Implementation |
|-----------|---------------|
| **Reentrancy** | OpenZeppelin `ReentrancyGuard` on all state-mutating functions |
| **Integer overflow** | Solidity 0.8.26 built-in checked arithmetic |
| **Access control** | `onlyOwner` for oracle updates, `onlyCropPerps` modifier for vault fund movement |
| **Oracle staleness** | `MAX_PRICE_AGE = 2 hours` — blocks trades if keeper stops |
| **Price sanity** | Keeper rejects any single-tick change > 10% |
| **Vault solvency** | 80% max utilization cap — 20% always reserved for payouts |
| **Double-close** | `require(pos.isOpen)` prevents settling same position twice |
| **SafeERC20** | All token transfers use OpenZeppelin SafeERC20 |
| **Withdrawal safety** | `removeLiquidity` checks both free liquidity AND actual USDT balance |
| **Zero-price guard** | `require(price > 0)` on all oracle reads |

### Dual Collateral System

```
                    ┌─────────────────────────┐
                    │       CROPVAULT         │
                    │                         │
   USDT (6 dec) ──▶│  addLiquidity()         │
                    │  Stored as-is           │──▶ CROP-LP tokens
   AUSD (18 dec)──▶│  addLiquidityAUSD()     │    (18 decimals)
                    │  Normalized: ÷ 1e12     │
                    │                         │
                    │  totalAssets() =        │
                    │    USDT.bal + AUSD/1e12  │
                    └─────────────────────────┘
```

AUSD (Agora stablecoin, 18 decimals) is normalized to 6-decimal USDT equivalent for all LP math. Both earn identical trading fees proportional to their share.

---

## Avalanche Technology Integration

### Why Avalanche C-Chain

CropPerps chose Avalanche for specific technical properties that make commodity trading viable for African users:

| Property | Avalanche C-Chain | Why It Matters for CropPerps |
|----------|------------------|------------------------------|
| **Sub-second finality** | ~1s | Traders see position confirmations instantly — critical on unreliable mobile connections in Lagos, Accra, Nairobi |
| **Gas cost** | ~$0.02/trade | A cocoa farmer hedging $50 of crop value can't pay $5-50 Ethereum gas. Avalanche makes micro-positions economic |
| **EVM compatibility** | Full Solidity 0.8+ | Leverages the entire Ethereum toolchain: OpenZeppelin, Hardhat, Ethers.js, Chainlink |
| **Throughput** | 4,500+ TPS | Supports the keeper updating 4 commodity prices every 2 minutes without network congestion |
| **Chainlink support** | Native on C-Chain | Live AVAX/USD price feed on both Fuji testnet and mainnet — same interface, zero migration cost |

### Avalanche-Specific Implementation Details

**1. Chainlink Oracle on Avalanche**
- Imports `@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol`
- Calls `latestRoundData()` on the real Chainlink AVAX/USD contract deployed at `0x5498BB86BC934c8D34FDA08E81D444153d0D06aD` on Fuji
- This is a genuine on-chain oracle call, not a mock. The same interface works on mainnet (`0x0A77230d17318075983913bC2145DB16C7366156`)
- Commodity prices use the same `AggregatorV3Interface` format — when Chainlink Functions launches commodity feeds on Avalanche, it's a drop-in replacement

**2. Avalanche C-Chain EVM Features Used**
- OpenZeppelin v5.x contracts (Ownable, ReentrancyGuard, ERC20, SafeERC20)
- Solidity 0.8.26 with checked arithmetic
- `block.timestamp` for borrow fee accrual (reliable on C-Chain with 1s blocks)
- Hardhat + `@nomicfoundation/hardhat-verify` for Snowtrace contract verification

**3. Gas Optimization for Avalanche**
- Batch price update: `updateAllPrices(int256[4])` updates all commodities in one transaction (106,289 gas = ~$0.005)
- Single-call position details: `getPositionDetails()` returns PnL, fees, and liquidation status in one view call (zero gas)
- LP minting shares logic between USDT and AUSD paths via internal `_mintLP()` to minimize deployed bytecode

**4. Mainnet Migration Path**
- All contract interfaces are production-ready (no testnet-specific logic in core contracts)
- MockUSDT → Real Tether USDT: `0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7`
- MockAUSD → Real Agora AUSD: deploy address via https://agora.finance
- Chainlink feed: update constructor arg from Fuji to mainnet address
- No other code changes needed

---

## Partner Integrations

### Chainlink — Live Oracle Feed

The `CommodityOracle` contract imports directly from `@chainlink/contracts` (official npm package) and calls `latestRoundData()` on the real Chainlink AVAX/USD price feed deployed on Fuji testnet. This is a genuine on-chain oracle call — not a mock.

- **Fuji:** [`0x5498BB86BC934c8D34FDA08E81D444153d0D06aD`](https://testnet.snowtrace.io/address/0x5498BB86BC934c8D34FDA08E81D444153d0D06aD)
- **Mainnet:** `0x0A77230d17318075983913bC2145DB16C7366156`

The frontend displays the live Chainlink AVAX/USD price and shows commodity prices denominated in both USD and AVAX. Commodity prices are updated by a keeper bot with realistic random-walk volatility until Chainlink Functions commodity feeds are available on Avalanche. The oracle implements `AggregatorV3Interface`, making it a drop-in swap for future Chainlink commodity feeds.

### Agora — AUSD Dual Collateral

The vault accepts [Agora AUSD](https://agora.finance) alongside USDT as liquidity. Agora is backed by Paradigm and Dragonfly, with AUSD fully collateralized by cash and T-bills managed by VanEck.

- `addLiquidity(amount)` — deposit USDT (6 decimals)
- `addLiquidityAUSD(amount)` — deposit AUSD (18 decimals, normalized internally)
- Both collateral types earn the same trading fees

### Tether — USDT Settlement

All positions are collateralized and settled in USDT. Mainnet uses the real Tether contract on Avalanche C-Chain (`0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7`). `MockUSDT.sol` mirrors it exactly for testnet.

---

## Trading Mechanics

| Parameter | Value |
|-----------|-------|
| Collateral | USDT (6 decimals) |
| Leverage | 1x to 10x |
| Markets | COCOA, PALM OIL, MAIZE, SOYBEAN |
| Prices | USD per metric ton (8 decimal precision) |
| Minimum position | 10 USDT |
| Open/Close fee | 0.10% of notional |
| Borrow fee | 0.01% of notional per hour |
| Liquidation threshold | Collateral < 10% of initial |
| Liquidation reward | 5% of collateral to liquidator |

### LP Vault

- Deposit USDT or AUSD, receive **CROP-LP** ERC20 tokens
- LP token price = Total vault assets / CROP-LP supply
- All trading fees (open + close + borrow) flow into the vault — LP value grows over time
- Max utilization: 80% (20% reserved for winning trader payouts)
- CROP-LP is standard ERC20, composable with any DeFi protocol

---

## Test Coverage

**31 tests passing** across all critical paths:

```
CropPerps Protocol
  Deployment (3 tests)
    ✔ Correct contract configuration
    ✔ Initial oracle prices
    ✔ Initial vault liquidity from owner seed

  Vault LP Operations (7 tests)
    ✔ LP token minting proportional to deposit
    ✔ LP token redemption for USDT
    ✔ Minimum deposit enforcement
    ✔ AUSD LP minting (18→6 decimal normalization)
    ✔ AUSD minimum deposit rejection
    ✔ Mixed USDT + AUSD deposits in same vault
    ✔ Withdrawal blocked when backing open positions

  Opening Positions (6 tests)
    ✔ Long position with correct PnL tracking
    ✔ Short position with inverse PnL
    ✔ Invalid leverage rejection
    ✔ Below-minimum collateral rejection
    ✔ Invalid commodity ID rejection
    ✔ Open interest tracking (long + short)

  Closing Positions & PnL (5 tests)
    ✔ Same-price close returns collateral minus fees
    ✔ Winning long (price increase → profit)
    ✔ Losing long (price decrease → loss)
    ✔ Winning short (price decrease → profit)
    ✔ Non-owner close rejection + double-close prevention

  Liquidations (3 tests)
    ✔ Undercollateralized position liquidation + reward payout
    ✔ Healthy position rejection
    ✔ Liquidation with AUSD vault liquidity

  Oracle (4 tests)
    ✔ Owner price updates + batch updates
    ✔ Non-owner rejection + zero price rejection

  Faucet (2 tests)
    ✔ 10,000 USDT dispensing + 24hr cooldown enforcement
```

Run tests:
```bash
npx hardhat test test/CropPerps.test.js
```

---

## Getting Started

### Prerequisites

```bash
node --version   # v18+
npm --version    # v9+
```

### Install and Test

```bash
git clone https://github.com/big14way/cropperps.git
cd cropperps
npm install
npx hardhat test
```

### Deploy to Fuji

```bash
cp .env.example .env
# Edit .env: add PRIVATE_KEY (testnet wallet only)
# Get testnet AVAX from https://core.app/tools/testnet-faucet/

npm run deploy:fuji
```

The deploy script handles everything: deploys all 5 contracts, links them together, seeds 500,000 USDT initial liquidity, and auto-writes contract addresses to `frontend/config.js`.

### Run the Price Keeper

The keeper simulates realistic commodity price movements (random walk with mean reversion) and updates prices on-chain every 2 minutes.

```bash
npm run keeper
```

Or run persistently with pm2:

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 logs cropperps-keeper    # watch price updates
pm2 status                   # check health
```

### Launch Frontend

Open `frontend/index.html` in any browser, or deploy to Vercel:

```bash
cd frontend
vercel --prod
```

The frontend is a single HTML file with mobile-responsive layout — no build step, no framework dependencies.

---

## Project Structure

```
cropperps/
├── contracts/
│   ├── CropPerps.sol            # Trading engine (open, close, liquidate)
│   ├── CropVault.sol            # LP vault (USDT + AUSD → CROP-LP)
│   ├── CommodityOracle.sol      # Chainlink-integrated price oracle
│   ├── MockUSDT.sol             # Testnet USDT with faucet
│   └── MockAUSD.sol             # Testnet AUSD with faucet
├── scripts/
│   ├── deploy.js                # Full deployment + auto config writer
│   └── keeper.js                # Price keeper bot (random walk simulation)
├── test/
│   └── CropPerps.test.js        # 31 Hardhat tests
├── frontend/
│   ├── index.html               # Trading UI (mobile-responsive)
│   ├── config.js                # Contract addresses (auto-generated)
│   └── abis.js                  # Contract ABIs
├── deployments/
│   └── fuji.json                # Deployed addresses + metadata
├── ecosystem.config.js          # PM2 config for persistent keeper
├── hardhat.config.js
├── package.json
└── .env.example
```

---

## Roadmap

### Phase 1: Foundation (Current — Q1 2026)

- [x] Core smart contracts: CropPerps, CropVault, CommodityOracle
- [x] 4 African commodity markets: COCOA, PALM OIL, MAIZE, SOYBEAN
- [x] Chainlink AVAX/USD oracle integration (live on Fuji)
- [x] Dual stablecoin vault (USDT + Agora AUSD)
- [x] Mobile-responsive trading frontend
- [x] Automated price keeper with realistic volatility simulation
- [x] 31 passing tests across all critical paths
- [x] Deployed and verified on Avalanche Fuji testnet
- [x] Live at [cropperps.vercel.app](https://cropperps.vercel.app)

### Phase 2: Mainnet Launch (Q2 2026)

- [ ] Deploy to Avalanche C-Chain mainnet
- [ ] Integrate real Tether USDT (`0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7`) and Agora AUSD
- [ ] Chainlink Functions consumer for automated commodity price feeds (replacing keeper bot)
- [ ] Chainlink Automation for borrow fee accrual
- [ ] Security audit (Slither + professional audit)
- [ ] Transfer oracle ownership to multisig (Gnosis Safe)
- [ ] Community launch: onboard first 100 traders in Lagos and Accra

### Phase 3: Growth (Q3–Q4 2026)

- [ ] Expand to 8 markets: add COFFEE, RUBBER, CASHEW, SESAME
- [ ] Governance token launch (CROP) — fee sharing with token holders
- [ ] DAO governance for adding new commodity markets
- [ ] API and SDK for institutional and algorithmic traders
- [ ] Mobile app (React Native) for low-bandwidth African markets
- [ ] Partnerships with African commodity exchanges (AFEX Nigeria, ECX Ethiopia)

### Phase 4: Scale (2027+)

- [ ] Avalanche Subnet deployment for dedicated throughput and custom gas token
- [ ] Cross-chain deployment (Arbitrum, Base) with Chainlink CCIP bridging
- [ ] Real-world oracle partnerships: integrate directly with AFEX, ECX, and NAMC for live African commodity prices
- [ ] Structured products: commodity baskets, yield-bearing LP vaults, and auto-compounding strategies
- [ ] Institutional API with compliance module for regulated funds
- [ ] Target: 10,000+ active traders, $50M+ daily volume, 12+ commodity markets

---

## Competitive Landscape

| Protocol | Commodities | African Markets | Chain | Min. Position |
|----------|------------|-----------------|-------|---------------|
| **CropPerps** | **COCOA, PALM OIL, MAIZE, SOYBEAN** | **Yes — purpose-built** | **Avalanche** | **$10** |
| GMX | BTC, ETH, AVAX, SOL | No | Arbitrum/Avalanche | ~$10 |
| dYdX | BTC, ETH, 100+ crypto | No | dYdX Chain | ~$20 |
| Hyperliquid | 100+ crypto pairs | No | Hyperliquid L1 | ~$10 |
| Gains Network | Crypto, forex, stocks | No | Arbitrum/Polygon | ~$5 |
| CME/ICE | All commodities | Requires US/UK account | TradFi | $10,000+ |

**No existing protocol offers on-chain African commodity derivatives.** CropPerps has zero direct competitors in its target market.

---

## About the Builder

Built by **Gwill** — blockchain engineer, Lagos, Nigeria.

6x international hackathon winner across Hedera, Solana, Starknet, Flare, and Cronos ecosystems. Building trade finance and commodity infrastructure for African markets since 2022.

CropPerps is born from firsthand experience: growing up in a cocoa-farming family in Nigeria and watching commodity price crashes devastate communities that had no tools to protect themselves. This isn't an abstract problem — it's personal.

**Partner Integrations:** [Chainlink](https://chain.link) | [Agora (AUSD)](https://agora.finance) | [Tether (USDT)](https://tether.to) | [Avalanche](https://avax.network)

---

MIT License — Built for [Avalanche Build Games 2026](https://build.avax.network/build-games)
