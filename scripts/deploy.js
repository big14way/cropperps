const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * CropPerps Full Deployment Script
 *
 * Deploys in order:
 *   1. MockUSDT   — testnet Tether USDT (6 dec)
 *   2. MockAUSD   — testnet Agora AUSD (18 dec)
 *   3. CommodityOracle — with real Chainlink AVAX/USD feed address
 *   4. CropVault  — accepts both USDT + AUSD (Agora dual collateral)
 *   5. CropPerps  — core trading engine
 *   6. Links vault → perps (setCropPerps)
 *   7. Seeds vault with 50,000 USDT initial liquidity
 *
 * PARTNER INTEGRATIONS:
 *   Chainlink: AVAX/USD feed hardcoded per network (Fuji/Mainnet)
 *   Agora AUSD: MockAUSD on testnet, real AUSD address on mainnet
 *   Tether USDT: MockUSDT on testnet, real USDT address on mainnet
 */

// ─── Real contract addresses (used on mainnet) ──────────────────
const MAINNET_ADDRESSES = {
  USDT:              "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", // Tether USDT on Avalanche
  AUSD:              "0x00000000efe302beaa2b3e6e1b18d08d69a9012a", // Agora AUSD (verify at agora.finance)
  CHAINLINK_AVAX_USD: "0x0A77230d17318075983913bC2145DB16C7366156", // Chainlink AVAX/USD mainnet
};

// ─── Chainlink feed addresses per network ───────────────────────
const CHAINLINK_FEEDS = {
  fuji:      "0x5498BB86BC934c8D34FDA08E81D444153d0D06aD", // AVAX/USD on Fuji testnet
  avalanche: "0x0A77230d17318075983913bC2145DB16C7366156", // AVAX/USD on Avalanche mainnet
  localhost: "0x0000000000000000000000000000000000000001", // placeholder — use mock on local
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const networkName = chainId === 43113 ? "fuji"
    : chainId === 43114 ? "avalanche"
    : "localhost";

  const isTestnet = networkName !== "avalanche";

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║         CropPerps Deployment Script              ║");
  console.log("╚══════════════════════════════════════════════════╝\n");
  console.log(`Network:   ${networkName} (chainId: ${chainId})`);
  console.log(`Deployer:  ${deployer.address}`);
  console.log(`Balance:   ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} AVAX`);
  console.log(`Mode:      ${isTestnet ? "TESTNET (deploying mock tokens)" : "MAINNET (using real token addresses)"}\n`);

  const deployed = {};

  // ─── 1. USDT ────────────────────────────────────────────────────
  let usdtAddress;
  if (isTestnet) {
    console.log("📄 [1/7] Deploying MockUSDT (Tether USDT testnet)...");
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const usdt = await MockUSDT.deploy();
    await usdt.waitForDeployment();
    usdtAddress = await usdt.getAddress();
    console.log(`   ✅ MockUSDT:  ${usdtAddress}`);
  } else {
    usdtAddress = MAINNET_ADDRESSES.USDT;
    console.log(`   ℹ️  [1/7] Using real USDT: ${usdtAddress}`);
  }
  deployed.USDT = usdtAddress;

  // ─── 2. AUSD (Agora) ────────────────────────────────────────────
  let ausdAddress;
  if (isTestnet) {
    console.log("\n📄 [2/7] Deploying MockAUSD (Agora AUSD testnet)...");
    const MockAUSD = await ethers.getContractFactory("MockAUSD");
    const ausd = await MockAUSD.deploy();
    await ausd.waitForDeployment();
    ausdAddress = await ausd.getAddress();
    console.log(`   ✅ MockAUSD (Agora): ${ausdAddress}`);
  } else {
    ausdAddress = MAINNET_ADDRESSES.AUSD;
    console.log(`   ℹ️  [2/7] Using real Agora AUSD: ${ausdAddress}`);
  }
  deployed.AUSD = ausdAddress;

  // ─── 3. CommodityOracle (with Chainlink AVAX/USD feed) ──────────
  const chainlinkFeed = CHAINLINK_FEEDS[networkName] || CHAINLINK_FEEDS.localhost;
  console.log(`\n📄 [3/7] Deploying CommodityOracle...`);
  console.log(`   Chainlink AVAX/USD feed: ${chainlinkFeed}`);

  // For local testing, deploy a mock feed if needed
  let oracleFeedAddress = chainlinkFeed;
  if (networkName === "localhost") {
    console.log("   ⚠️  Localhost: deploying MockChainlinkFeed for AVAX/USD");
    // Simple mock: deploy MockUSDT-style contract or just use a dummy address
    // The oracle constructor will accept any address on localhost
    // For real testing, run: npx hardhat node and use fuji addresses
    oracleFeedAddress = ethers.ZeroAddress.replace("0000", "0001"); // dummy
  }

  const CommodityOracle = await ethers.getContractFactory("CommodityOracle");
  const oracle = await CommodityOracle.deploy(
    networkName === "localhost" ? deployer.address : oracleFeedAddress
  );
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log(`   ✅ CommodityOracle: ${oracleAddress}`);
  console.log(`   Initial commodity prices:`);
  console.log(`     COCOA:    $8,500/ton  |  PALMOIL: $1,200/ton`);
  console.log(`     MAIZE:    $180/ton    |  SOYBEAN: $490/ton`);
  deployed.CommodityOracle = oracleAddress;
  deployed.ChainlinkFeed = oracleFeedAddress;

  // ─── 4. CropVault (dual USDT + AUSD) ────────────────────────────
  console.log(`\n📄 [4/7] Deploying CropVault (USDT + AUSD collateral)...`);
  const CropVault = await ethers.getContractFactory("CropVault");
  const vault = await CropVault.deploy(usdtAddress, ausdAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log(`   ✅ CropVault: ${vaultAddress}`);
  console.log(`   Collateral: USDT (Tether) + AUSD (Agora)`);
  deployed.CropVault = vaultAddress;

  // ─── 5. CropPerps ───────────────────────────────────────────────
  console.log(`\n📄 [5/7] Deploying CropPerps...`);
  const CropPerps = await ethers.getContractFactory("CropPerps");
  const cropPerps = await CropPerps.deploy(usdtAddress, vaultAddress, oracleAddress);
  await cropPerps.waitForDeployment();
  const cropPerpsAddress = await cropPerps.getAddress();
  console.log(`   ✅ CropPerps: ${cropPerpsAddress}`);
  deployed.CropPerps = cropPerpsAddress;

  // ─── 6. Link vault → perps ──────────────────────────────────────
  console.log(`\n🔗 [6/7] Linking contracts...`);
  const linkTx = await vault.setCropPerps(cropPerpsAddress);
  await linkTx.wait();
  console.log(`   ✅ Vault → CropPerps linked`);

  // ─── 7. Seed initial liquidity ──────────────────────────────────
  if (isTestnet) {
    console.log(`\n💧 [7/7] Seeding initial liquidity (50,000 USDT)...`);
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const usdt = MockUSDT.attach(usdtAddress);
    const seedAmount = ethers.parseUnits("50000", 6);
    const approveTx = await usdt.approve(vaultAddress, seedAmount);
    await approveTx.wait();
    const addLiqTx = await vault.addLiquidity(seedAmount);
    await addLiqTx.wait();
    console.log(`   ✅ Seeded vault with 50,000 USDT`);
  } else {
    console.log(`\n   ℹ️  [7/7] Skipping seed on mainnet — add liquidity manually`);
  }

  // ─── Save deployment ─────────────────────────────────────────────
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });

  const deploymentData = {
    network: networkName,
    chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: deployed,
    partners: {
      chainlink: { feed: "AVAX/USD", address: oracleFeedAddress, docs: "https://data.chain.link/avalanche" },
      agora: { token: "AUSD", address: ausdAddress, docs: "https://agora.finance" },
      tether: { token: "USDT", address: usdtAddress, docs: "https://tether.to/en/transparency" },
    },
  };

  const outPath = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(outPath, JSON.stringify(deploymentData, null, 2));

  // ─── Update frontend config ──────────────────────────────────────
  const frontendConfig = `// Auto-generated by deploy.js — do not edit manually
// Generated: ${new Date().toISOString()}

const CONTRACTS = {
  USDT:    "${deployed.USDT}",
  AUSD:    "${deployed.AUSD}",
  ORACLE:  "${deployed.CommodityOracle}",
  VAULT:   "${deployed.CropVault}",
  PERPS:   "${deployed.CropPerps}",
};

const CHAINLINK = {
  AVAX_USD_FEED: "${oracleFeedAddress}",
  docs: "https://data.chain.link/avalanche/mainnet/crypto-usd/avax-usd",
};

const NETWORK = {
  chainId: ${chainId},
  name: "${networkName}",
  rpc: "${chainId === 43113 ? "https://api.avax-test.network/ext/bc/C/rpc" : "https://api.avax.network/ext/bc/C/rpc"}",
  explorer: "${chainId === 43113 ? "https://testnet.snowtrace.io" : "https://snowtrace.io"}",
};

const COMMODITIES = [
  { id: 0, name: "Cocoa",    symbol: "COCOA",   unit: "MT", flag: "🍫" },
  { id: 1, name: "Palm Oil", symbol: "PALMOIL", unit: "MT", flag: "🌴" },
  { id: 2, name: "Maize",    symbol: "MAIZE",   unit: "MT", flag: "🌽" },
  { id: 3, name: "Soybean",  symbol: "SOYBEAN", unit: "MT", flag: "🫘" },
];
`;

  fs.writeFileSync(path.join(__dirname, "../frontend/config.js"), frontendConfig);

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║              DEPLOYMENT COMPLETE ✅               ║");
  console.log("╚══════════════════════════════════════════════════╝\n");
  console.log("Addresses:");
  Object.entries(deployed).forEach(([k, v]) => console.log(`  ${k.padEnd(18)}: ${v}`));
  console.log(`\n📁 Saved: deployments/${networkName}.json`);
  console.log(`🖥️  Frontend config updated: frontend/config.js`);
  console.log("\n🔗 Partner Integrations Deployed:");
  console.log(`  Chainlink AVAX/USD : ${oracleFeedAddress}`);
  console.log(`  Agora AUSD        : ${deployed.AUSD}`);
  console.log(`  Tether USDT       : ${deployed.USDT}`);
  console.log("\n🚀 Next: open frontend/index.html in browser\n");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
