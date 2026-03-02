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

## The Problem

Africa produces 75% of the world's cocoa and drives $400B+ in agricultural exports annually. Yet African commodity traders have **zero access to on-chain derivatives**.

- **CME and ICE futures** require US/UK brokerage accounts, $10K+ minimums, and institutional clearinghouse access
- **No on-chain price discovery** — a cocoa farmer in Nigeria cannot hedge harvest prices, short a glut, or speculate on the commodity they know best
- **Zero DeFi commodity exposure** — you can trade BTC and ETH perps in seconds, but COCOA and PALM OIL don't exist anywhere on-chain
- **Currency risk** compounds losses — Nigerian exporters invoice in USD but earn in NGN, losing 20-40% to FX slippage even when the trade is correct

Africa's commodity producers are price-takers. CropPerps makes them price-setters.

---

## The Solution

**CropPerps** is a decentralized perpetuals exchange for African agricultural commodities on Avalanche.

Any wallet. No KYC. No minimum. Open a leveraged long or short on **COCOA, PALM OIL, MAIZE, or SOYBEAN** in one transaction, settled in USDT.

A cocoa farmer in Lagos hedges before harvest. A palm oil importer in Kano shorts to manage inventory risk. A trader in Accra speculates on commodity prices with real-world insight — the same tools Wall Street has had for 150 years, now permissionless on Avalanche at $0.02 gas.

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

### Fee Architecture

All fees flow into the vault, increasing LP token value over time:

```
Trader opens $10,000 COCOA position at 5x leverage ($2,000 collateral):
  Open fee:   $10,000 * 0.10% = $10.00  → vault
  Borrow fee: $10,000 * 0.01%/hr = $1.00/hr → vault (on close)
  Close fee:  $10,000 * 0.10% = $10.00  → vault (on close)

LP earning example:
  $500K vault TVL, 100 trades/day at $5K avg size:
  Daily fees = 100 * $5,000 * 0.20% = $1,000 → 0.20% daily yield for LPs
```

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

## Production Roadmap

| Priority | Task |
|----------|------|
| P0 | Chainlink Functions consumer for automated commodity price feeds (5-min heartbeat) |
| P0 | Swap MockUSDT for real Tether USDT (`0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7`) |
| P0 | Verify Agora AUSD mainnet contract integration |
| P1 | Transfer oracle ownership to multisig (Gnosis Safe) |
| P1 | Slither static analysis + Code4rena / Certik audit |
| P1 | Chainlink Automation for borrow fee accrual |
| P2 | Position size limits per commodity (oracle manipulation protection) |
| P2 | Avalanche Subnet deployment for dedicated throughput |

---

## About

Built by **Gwill** — blockchain engineer, Lagos, Nigeria.

6x international hackathon winner across Hedera, Solana, Starknet, Flare, and Cronos ecosystems. Building trade finance and commodity infrastructure for African markets since 2022.

**Integrations:** [Chainlink](https://chain.link) | [Agora (AUSD)](https://agora.finance) | [Tether (USDT)](https://tether.to) | [Avalanche](https://avax.network)

---

MIT License — Built for [Avalanche Build Games 2026](https://build.avax.network/build-games)
