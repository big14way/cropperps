# CropPerps — Perpetuals DEX for African Agricultural Commodities

> **Avalanche Build Games 2026** | Built by Gwill, Lagos, Nigeria

[![Live App](https://img.shields.io/badge/Live-cropperps.vercel.app-00C853)](https://cropperps.vercel.app)
[![Network: Avalanche Fuji](https://img.shields.io/badge/Network-Avalanche%20Fuji-E84142)](https://testnet.snowtrace.io)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.26-363636)](https://soliditylang.org)
[![Tests](https://img.shields.io/badge/Tests-27%20passing-00C853)](test/CropPerps.test.js)
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
| CropPerps (Trading Engine) | [`0xda2057b0d68503E38C4FFbd74DF163073b1eD80b`](https://testnet.snowtrace.io/address/0xda2057b0d68503E38C4FFbd74DF163073b1eD80b#code) | Yes |
| CropVault (LP Pool) | [`0x2D633Eb5371b00e1459a26FAd237d255bdbb7560`](https://testnet.snowtrace.io/address/0x2D633Eb5371b00e1459a26FAd237d255bdbb7560#code) | Yes |
| CommodityOracle | [`0x631100C996aBFea0d81233D4DF446a816E124C97`](https://testnet.snowtrace.io/address/0x631100C996aBFea0d81233D4DF446a816E124C97#code) | Yes |
| MockUSDT (Testnet) | [`0x0477BeD86FeA5c4c0ae4bC3AAdbEe42D76273e22`](https://testnet.snowtrace.io/address/0x0477BeD86FeA5c4c0ae4bC3AAdbEe42D76273e22#code) | Yes |
| MockAUSD (Testnet) | [`0x122b9C153c7AB589465505f01E8bdA66552f768D`](https://testnet.snowtrace.io/address/0x122b9C153c7AB589465505f01E8bdA66552f768D#code) | Yes |

**Chainlink AVAX/USD Feed:** [`0x5498BB86BC934c8D34FDA08E81D444153d0D06aD`](https://testnet.snowtrace.io/address/0x5498BB86BC934c8D34FDA08E81D444153d0D06aD) (live on Fuji)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CROPPERPS PROTOCOL                   │
├──────────────┬──────────────────────┬───────────────────┤
│  TRADERS     │    CROPPERPS.SOL     │   CROPVAULT.SOL   │
│              │                      │                   │
│  Post USDT   │  Open long/short     │  LP pool (USDT    │
│  collateral  │  1-10x leverage      │    + AUSD)        │
│              │  PnL settlement      │  CROP-LP ERC20    │
│  Get PnL     │  Liquidations        │  Counterparty     │
│  in USDT     │                      │  to all trades    │
├──────────────┴──────────┬───────────┴───────────────────┤
│              COMMODITYORACLE.SOL                        │
│         Chainlink AggregatorV3Interface                 │
│     COCOA  ·  PALMOIL  ·  MAIZE  ·  SOYBEAN           │
│              + Live AVAX/USD Feed                       │
└─────────────────────────────────────────────────────────┘
```

### Contracts

| Contract | Purpose |
|----------|---------|
| **CropPerps.sol** | Core trading engine — open, close, liquidate positions with up to 10x leverage |
| **CropVault.sol** | LP liquidity pool — accepts USDT + AUSD, issues CROP-LP ERC20 tokens |
| **CommodityOracle.sol** | Chainlink-compatible oracle with live AVAX/USD feed + commodity prices |
| **MockUSDT.sol** | Testnet USDT (6 decimals) with public faucet |
| **MockAUSD.sol** | Testnet Agora AUSD (18 decimals) with public faucet |

### Trading Mechanics

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

## Why Avalanche

| Metric | Avalanche C-Chain | Ethereum |
|--------|-------------------|----------|
| Finality | ~1 second | ~12 seconds |
| Gas per trade | ~$0.02 | $5-50 |
| TPS | 4,500+ | ~15 |

For commodity traders in Lagos, Accra, and Nairobi on mobile connections, sub-second finality and $0.02 gas is the prerequisite — not a feature.

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

# Run all 27 tests (Hardhat)
npx hardhat test

# Or run 25 offline tests (no network needed)
node run-tests-native.js
```

### Deploy to Fuji

```bash
cp .env.example .env
# Edit .env: add PRIVATE_KEY (testnet wallet only)
# Get testnet AVAX from https://faucet.avax.network/

npm run deploy:fuji
```

The deploy script handles everything: deploys all 5 contracts, links them together, seeds 50,000 USDT initial liquidity, and auto-writes contract addresses to `frontend/config.js`.

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

The frontend is a single HTML file — no build step, no framework dependencies.

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
│   └── CropPerps.test.js        # 27 Hardhat tests
├── frontend/
│   ├── index.html               # Trading UI
│   ├── config.js                # Contract addresses (auto-generated)
│   └── abis.js                  # Contract ABIs
├── deployments/
│   └── fuji.json                # Deployed addresses + metadata
├── ecosystem.config.js          # PM2 config for persistent keeper
├── run-tests-native.js          # Offline test runner (25 tests)
├── compile-native.js            # Offline compiler
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
| P2 | Mobile-responsive frontend redesign |
| P2 | Avalanche Subnet deployment for dedicated throughput |

---

## About

Built by **Gwill** — blockchain engineer, Lagos, Nigeria.

6x international hackathon winner across Hedera, Solana, Starknet, Flare, and Cronos ecosystems. Building trade finance and commodity infrastructure for African markets since 2022.

**Integrations:** [Chainlink](https://chain.link) | [Agora (AUSD)](https://agora.finance) | [Tether (USDT)](https://tether.to) | [Avalanche](https://avax.network)

---

MIT License — Built for [Avalanche Build Games 2026](https://build.avax.network/build-games)
