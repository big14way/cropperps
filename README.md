# 🌾 CropPerps — Perpetuals DEX for African Agricultural Commodities

> **Avalanche Build Games 2026** | Built by Gwill · Lagos, Nigeria

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Network: Avalanche Fuji](https://img.shields.io/badge/Network-Avalanche%20Fuji-E84142)](https://testnet.snowtrace.io)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.26-blue)](https://soliditylang.org)

---

## 🔥 The Problem

**Africa produces the world's commodities. African traders cannot hedge them.**

Nigeria is the world's 4th-largest cocoa producer. West Africa produces **75% of global cocoa supply**. Sub-Saharan Africa grows 60% of the world's uncultivated arable land and drives $400B+ in agricultural exports annually.

Yet every single one of these producers and traders faces the same brutal reality:

- **No access to commodity derivatives.** CME, ICE, and Bursa Malaysia are gated behind brokerage accounts requiring US/UK addresses, $10K+ minimums, and institutional clearinghouse access.
- **No price discovery tool.** A cocoa farmer in Cross River State, Nigeria has no on-chain way to lock in a forward price for their harvest, hedge against a price crash, or speculate on the commodity they know best.
- **Zero DeFi liquidity for commodity exposure.** You can trade BTC, ETH, and SOL perps on-chain in seconds. You cannot trade COCOA or PALM OIL anywhere on-chain — despite Africa's entire economy depending on these prices.
- **Currency risk compounds the problem.** Nigerian exporters invoice in USD but earn in NGN. Between delayed commodity settlements and naira devaluation, a trader can be correct on the commodity and still lose 20–40% to FX slippage.

The existing solutions — commodity ETFs, traditional futures brokers, structured notes — are slow, expensive, require KYC, and are entirely inaccessible from mobile-first markets like Nigeria, Ghana, and Côte d'Ivoire.

**The result: Africa's commodity producers are price-takers, never price-setters. They absorb global price risk with no tools to manage it.**

---

## 💡 The Solution

**CropPerps is a decentralized perpetuals exchange for African agricultural commodities, built on Avalanche.**

Any wallet. No KYC. No minimum account size. Open a leveraged long or short position on COCOA, PALM OIL, MAIZE, or SOYBEAN in one transaction using USDT as collateral.

A cocoa farmer in Lagos can go long COCOA before harvest to lock in a favorable price. A palm oil importer in Kano can short PALMOIL to hedge inventory risk. A crypto-native trader in Accra can speculate on commodity price movements they have real-world insight into — the same way traders in Chicago have done for 150 years, but on-chain, permissionless, and at $0.02 gas.

**CropPerps makes Africa's commodity markets globally accessible — and makes global commodity markets locally tradeable across Africa.**

---

## 🏗️ How It Works

```
┌─────────────────────────────────────────────────────────┐
│                    CROPPERPS PROTOCOL                   │
├──────────────┬──────────────────────┬───────────────────┤
│  TRADERS     │    CROPPERPS.SOL     │   CROPVAULT.SOL   │
│              │                      │                   │
│  Post USDT   │  • Open long/short   │  • LP pool        │
│  collateral  │  • 1–10x leverage    │  • CROP-LP ERC20  │
│              │  • PnL settlement    │  • Counterparty   │
│  Get PnL     │  • Liquidations      │    to all trades  │
│  in USDT     │                      │  • Fees → LPs     │
└──────────────┴──────────┬───────────┴───────────────────┘
                          │
              ┌───────────▼───────────┐
              │  COMMODITYORACLE.SOL  │
              │  (Chainlink-compat.)  │
              │  COCOA · PALMOIL     │
              │  MAIZE  · SOYBEAN    │
              └───────────────────────┘
```

### Contracts

| Contract | Role |
|----------|------|
| `CropPerps.sol` | Core trading engine — open, close, liquidate positions |
| `CropVault.sol` | LP liquidity pool — USDT in, `CROP-LP` ERC20 out |
| `CommodityOracle.sol` | Chainlink AggregatorV3Interface-compatible price feed |
| `MockUSDT.sol` | Testnet USDT with public faucet (10,000 USDT per call) |
| `MockAUSD.sol` | Testnet Agora AUSD with public faucet (10,000 AUSD per call) |

### Trading Mechanics

- **Collateral:** USDT (6 decimals, matching Tether WDK standard)
- **Leverage:** 1x to 10x
- **Markets:** COCOA, PALM OIL, MAIZE, SOYBEAN ($/metric ton, 8 decimal prices)
- **Minimum position:** 10 USDT collateral
- **Open fee:** 0.10% of notional
- **Close fee:** 0.10% of notional
- **Borrow fee:** 0.01% of notional per hour (accrues on open positions)
- **Liquidation threshold:** Position liquidated when remaining collateral < 10% of initial
- **Liquidation reward:** 5% of collateral to the liquidator

### LP Vault Mechanics

- Liquidity providers deposit USDT → receive `CROP-LP` ERC20 tokens
- LP token price = Total USDT in vault / Total CROP-LP supply
- Trading fees (open + close + borrow) flow into vault → LP value increases over time
- Max vault utilization: 80% (20% always free to pay winning traders)
- CROP-LP tokens are standard ERC20 — composable with any DeFi staking protocol

---

## 🔗 Partner Integrations

### Chainlink — Live AVAX/USD Price Feed

`CommodityOracle.sol` imports directly from `@chainlink/contracts` (official npm package) and stores the deployed Chainlink AVAX/USD feed address on-chain. The `getAVAXPrice()` function calls `latestRoundData()` on the real Chainlink contract deployed at:

- **Fuji testnet:** `0x5498BB86BC934c8D34FDA08E81D444153d0D06aD`
- **Avalanche mainnet:** `0x0A77230d17318075983913bC2145DB16C7366156`

This is a genuine on-chain call to a live Chainlink oracle — not a mock or a hand-written interface. The commodity prices (COCOA, PALMOIL, MAIZE, SOYBEAN) are updated by a keeper until Chainlink Functions commodity feeds are available on Avalanche. The oracle contract implements `AggregatorV3Interface` end-to-end, making it a drop-in swap for any future Chainlink commodity feed.

### Agora — AUSD Dual Collateral

`CropVault.sol` accepts both USDT and Agora's **AUSD** as liquidity. Agora is a Paradigm & Dragonfly-backed stablecoin with $20M+ minted on Avalanche, fully backed by cash and T-bills managed by VanEck.

- `addLiquidity(amount)` — deposit USDT
- `addLiquidityAUSD(amount)` — deposit AUSD (18 dec, normalized to 6 dec for LP math)
- Both collaterals earn the same trading fees
- Testnet: `MockAUSD.sol` | Mainnet: Agora AUSD contract (see [agora.finance](https://agora.finance))

AUSD is live on Avalanche C-Chain. Using it as a second collateral option means African traders who hold AUSD (an increasingly common institutional stablecoin) can provide liquidity and trade without converting to USDT first.

### Tether USDT — Primary Settlement Currency

All positions are collateralized and settled in USDT. The real Tether USDT contract on Avalanche C-Chain (`0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7`) is used on mainnet. `MockUSDT.sol` mirrors it exactly (6 decimals, same interface) for testnet.

---

## ⚡ Why Avalanche

| Metric | Avalanche C-Chain | Ethereum Mainnet |
|--------|------------------|-----------------|
| Finality | ~1 second | ~12 seconds |
| Gas per position open | ~$0.02 | $5–50 |
| TPS | 4,500+ | ~15 |
| EVM compatible | ✅ | ✅ |

For a commodity trading platform targeting African mobile users on limited data plans, sub-second finality and $0.02 gas isn't a feature — it's the prerequisite. Users in Lagos, Accra, and Nairobi won't wait 12 seconds for a price confirmation or pay $30 gas on a $100 position.

---

## 🚀 Getting Started Locally

### Prerequisites

Make sure you have these installed:

```bash
node --version   # Need v18+
npm --version    # Need v9+
```

### Step 1 — Install

```bash
unzip cropperps.zip
cd cropperps
npm install
```

### Step 2 — Verify contracts compile & tests pass

```bash
node run-tests-native.js
```

You should see **25 passed, 0 failed**. This runs without any network connection — it uses the solcjs compiler bundled in `node_modules`.

### Step 3 — Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
PRIVATE_KEY=your_wallet_private_key_here
FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
```

> ⚠️ **Never commit your .env file.** It's already in `.gitignore`.

To export your private key from MetaMask: Account Details → Export Private Key. Use a **dedicated testnet wallet** — never your main wallet.

### Step 4 — Get Fuji testnet AVAX

Go to **https://faucet.avax.network/** and request AVAX to your wallet address. You need at least **0.5 AVAX** for contract deployments.

Add Fuji to MetaMask manually if it's not there:

| Field | Value |
|-------|-------|
| Network Name | Avalanche Fuji Testnet |
| RPC URL | `https://api.avax-test.network/ext/bc/C/rpc` |
| Chain ID | `43113` |
| Symbol | `AVAX` |
| Explorer | `https://testnet.snowtrace.io` |

### Step 5 — Deploy to Fuji

```bash
npm run deploy:fuji
```

This does everything in one command:
1. Deploys `MockUSDT`
2. Deploys `CommodityOracle` with initial prices
3. Deploys `CropVault`
4. Deploys `CropPerps`
5. Links vault → perps (`setCropPerps`)
6. Seeds 50,000 USDT initial liquidity
7. **Auto-writes your contract addresses to `frontend/config.js`**

You'll see output like:
```
✅ MockUSDT deployed:        0xABC...
✅ CommodityOracle deployed: 0xDEF...
✅ CropVault deployed:       0x123...
✅ CropPerps deployed:       0x456...
✅ Vault → CropPerps linked
✅ Seeded vault with 50,000 USDT
📁 Saved to: deployments/avalanche-fuji.json
🖥️  Frontend config updated: frontend/config.js
```

### Step 6 — Open the frontend

```bash
# Just open the file directly in your browser
open frontend/index.html          # macOS
xdg-open frontend/index.html      # Linux
# Or drag it into Chrome/Firefox
```

Connect MetaMask to **Avalanche Fuji Testnet**, click **Faucet** to get test USDT, add some liquidity to the vault, then open a position.

---

## 🌐 Vercel Deployment

The frontend is a single HTML file with zero dependencies — no React, no build step. Deploying to Vercel takes 2 minutes.

### Option A — Via Vercel CLI (fastest)

```bash
# Install Vercel CLI globally
npm install -g vercel

# From inside your cropperps folder
cd frontend
vercel

# Follow prompts:
# Set up and deploy? Y
# Which scope? (your account)
# Link to existing project? N
# Project name: cropperps
# Directory: ./  (you're already in frontend/)
# Override settings? N
```

Your app is live at `https://cropperps-xyz.vercel.app` in ~30 seconds.

### Option B — Via GitHub (recommended for ongoing updates)

1. Push to GitHub:
```bash
git init
git add .
git commit -m "feat: initial CropPerps protocol"
git remote add origin https://github.com/YOUR_USERNAME/cropperps
git push -u origin main
```

2. Go to **vercel.com** → New Project → Import from GitHub → select `cropperps`

3. Configure build settings:
   - **Framework Preset:** `Other`
   - **Root Directory:** `frontend`
   - **Build Command:** *(leave empty — no build step)*
   - **Output Directory:** `.` (dot, meaning the root of frontend/)

4. Click **Deploy**

### After deploying on Vercel, update `frontend/config.js`

The deploy script already writes your contract addresses to `frontend/config.js`. If you redeploy contracts, run `npm run deploy:fuji` again — it overwrites `config.js` automatically. Then push to GitHub and Vercel auto-deploys.

---

## 📁 Project Structure

```
cropperps/
├── contracts/
│   ├── CropPerps.sol          # Core trading engine
│   ├── CropVault.sol          # LP vault (ERC20 CROP-LP)
│   ├── CommodityOracle.sol    # Chainlink-compatible oracle
│   ├── MockUSDT.sol           # Testnet USDT with faucet
│   └── MockAUSD.sol           # Testnet Agora AUSD with faucet
├── scripts/
│   └── deploy.js              # Full deployment + auto config writer
├── test/
│   └── CropPerps.test.js      # Hardhat test suite
├── frontend/
│   ├── index.html             # Single-file trading UI
│   ├── config.js              # Contract addresses (auto-generated)
│   └── abis.js                # Contract ABIs
├── deployments/               # Created after deploy (gitignored)
│   └── avalanche-fuji.json    # Deployed addresses + metadata
├── run-tests-native.js        # Offline test runner (25 tests)
├── hardhat.config.js
├── package.json
└── .env.example
```

---

## ✅ Production Upgrade Checklist

Before mainnet:

- [ ] Swap `MockUSDT` for real USDT: `0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7` (Avalanche)
- [ ] Set up Chainlink Functions consumer to auto-update commodity prices (5-min heartbeat)
- [ ] Verify Chainlink AVAX/USD feed staleness check is active in production
- [ ] Transfer oracle ownership to multisig (Gnosis Safe)
- [ ] Verify real Agora AUSD contract address at agora.finance
- [ ] Test addLiquidityAUSD() with real AUSD on mainnet
- [ ] Run Slither static analysis: `slither .`
- [ ] Get Certik or Code4rena audit before seeding significant TVL
- [ ] Set up Chainlink Automation for hourly borrow fee accrual
- [ ] Add position size limits per commodity to prevent oracle manipulation

---

## 🙏 Acknowledgements

Built by **Gwill** ([@your_twitter](https://twitter.com)) — blockchain engineer, Lagos Nigeria.

6x international hackathon winner across Hedera, Solana, Starknet, Flare, and Cronos ecosystems. Building trade finance and commodity infrastructure for African markets since 2022.

**Partners:** Chainlink · Agora (AUSD) · Tether (USDT) · Avalanche

---

## License

MIT — Built for Avalanche Build Games 2026
