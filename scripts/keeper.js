/**
 * CropPerps Price Keeper
 *
 * Simulates realistic commodity price movements by calling
 * oracle.updateAllPrices() on-chain every UPDATE_INTERVAL seconds.
 *
 * Each commodity drifts randomly within a realistic daily volatility range:
 *   COCOA:    ~2% daily vol  (ICE Futures benchmark)
 *   PALM OIL: ~1.8% daily vol (Bursa Malaysia)
 *   MAIZE:    ~1.5% daily vol (CBOT)
 *   SOYBEAN:  ~1.5% daily vol (CBOT)
 *
 * Usage:
 *   PRIVATE_KEY=<key> npx hardhat run scripts/keeper.js --network fuji
 *
 * Or run standalone:
 *   PRIVATE_KEY=<key> node scripts/keeper.js
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// ─── Config ───────────────────────────────────────────────────────
const UPDATE_INTERVAL = 120; // seconds between price updates (2 min)

// Base prices (USD per metric ton, 8 decimals)
// These are the "anchor" prices — drift is bounded around them
const BASE_PRICES = [
  8500_00000000,  // COCOA    $8,500/ton
  1200_00000000,  // PALMOIL  $1,200/ton
   180_00000000,  // MAIZE    $180/ton
   490_00000000,  // SOYBEAN  $490/ton
];

// Max drift from base (percentage) — keeps prices realistic
const MAX_DRIFT_PCT = 15; // ±15% from base

// Max single-update change (sanity guard against bugs)
const MAX_UPDATE_PCT = 10; // reject any single tick > ±10%

// Per-update volatility (percentage of current price)
// Scaled so ~2% daily vol with 2-min updates (~720 updates/day)
// per-tick vol ≈ daily_vol / sqrt(720)
const TICK_VOL = [
  0.075, // COCOA   (~2% daily)
  0.067, // PALMOIL (~1.8% daily)
  0.056, // MAIZE   (~1.5% daily)
  0.056, // SOYBEAN (~1.5% daily)
];

const NAMES = ["COCOA", "PALMOIL", "MAIZE", "SOYBEAN"];

// ─── State ────────────────────────────────────────────────────────
let currentPrices = [...BASE_PRICES];

function randomWalk(currentPrice, basePrice, tickVol, maxDriftPct) {
  // Random normal-ish via Box-Muller (simplified)
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  // Apply percentage change
  const pctChange = z * tickVol;
  let newPrice = currentPrice * (1 + pctChange / 100);

  // Mean-revert if drifted too far from base
  const driftPct = ((newPrice - basePrice) / basePrice) * 100;
  if (Math.abs(driftPct) > maxDriftPct) {
    // Pull back toward base by 30% of excess
    const excess = driftPct - Math.sign(driftPct) * maxDriftPct;
    newPrice -= basePrice * (excess * 0.3) / 100;
  }

  // Light mean-reversion toward base (1% pull per tick)
  newPrice = newPrice * 0.999 + basePrice * 0.001;

  // Floor at 1% of base (never go to zero)
  newPrice = Math.max(newPrice, basePrice * 0.01);

  return Math.round(newPrice);
}

// ─── Main Loop ────────────────────────────────────────────────────
async function main() {
  const [signer] = await ethers.getSigners();

  // Load oracle address from deployment
  const deploymentPath = path.join(__dirname, "../deployments/fuji.json");
  let oracleAddress;
  if (fs.existsSync(deploymentPath)) {
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    oracleAddress = deployment.contracts.CommodityOracle;
  } else {
    console.error("No deployment file found. Run deploy.js first.");
    process.exit(1);
  }

  const oracle = await ethers.getContractAt("CommodityOracle", oracleAddress, signer);

  // Read current on-chain prices as starting point
  for (let i = 0; i < 4; i++) {
    try {
      const p = await oracle.getPrice(i);
      currentPrices[i] = Number(p);
    } catch {}
  }

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║         CropPerps Price Keeper                   ║");
  console.log("╚══════════════════════════════════════════════════╝\n");
  console.log(`Oracle:   ${oracleAddress}`);
  console.log(`Signer:   ${signer.address}`);
  console.log(`Interval: ${UPDATE_INTERVAL}s`);
  console.log(`\nStarting prices:`);
  for (let i = 0; i < 4; i++) {
    console.log(`  ${NAMES[i].padEnd(10)}: $${(currentPrices[i] / 1e8).toFixed(2)}`);
  }
  console.log(`\nKeeper running... (Ctrl+C to stop)\n`);

  let round = 0;

  while (true) {
    round++;

    // Compute new prices with sanity check
    const previousPrices = [...currentPrices];
    for (let i = 0; i < 4; i++) {
      currentPrices[i] = randomWalk(
        currentPrices[i],
        BASE_PRICES[i],
        TICK_VOL[i],
        MAX_DRIFT_PCT
      );
      // Sanity guard: reject any single tick > MAX_UPDATE_PCT
      const changePct = Math.abs((currentPrices[i] - previousPrices[i]) / previousPrices[i]) * 100;
      if (changePct > MAX_UPDATE_PCT) {
        console.log(`[GUARD] ${NAMES[i]} change ${changePct.toFixed(2)}% exceeds ${MAX_UPDATE_PCT}% — clamped`);
        currentPrices[i] = previousPrices[i]; // revert to previous
      }
    }

    // Build int256[4] for updateAllPrices
    const pricesArray = currentPrices.map((p) => BigInt(p));

    try {
      const tx = await oracle.updateAllPrices(pricesArray);
      const receipt = await tx.wait();
      const timestamp = new Date().toLocaleTimeString();

      console.log(
        `[${timestamp}] Round ${round} | ` +
        NAMES.map((n, i) =>
          `${n}: $${(currentPrices[i] / 1e8).toFixed(2)}`
        ).join(" | ") +
        ` | gas: ${receipt.gasUsed}`
      );
    } catch (e) {
      console.error(`[ERROR] Round ${round}: ${e.reason || e.message}`);
    }

    // Wait
    await new Promise((r) => setTimeout(r, UPDATE_INTERVAL * 1000));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
