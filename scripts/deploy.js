const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * CropPerps Full Deployment Script
 * 
 * Deploys in order:
 *   1. MockUSDT (testnet) or uses existing USDT address (mainnet)
 *   2. CommodityOracle
 *   3. CropVault
 *   4. CropPerps
 *   5. Links: vault.setCropPerps(cropPerps.address)
 *   6. Seeds: LP vault with initial liquidity
 * 
 * Outputs: deployments/{network}.json with all addresses
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "localhost" : network.name;

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║        CropPerps Deployment Script       ║");
  console.log("╚══════════════════════════════════════════╝\n");
  console.log(`Network:   ${networkName} (chainId: ${network.chainId})`);
  console.log(`Deployer:  ${deployer.address}`);
  console.log(`Balance:   ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} AVAX\n`);

  const deployedContracts = {};

  // ─── 1. Deploy MockUSDT (testnet) ───────────────────────────────
  console.log("📄 [1/5] Deploying MockUSDT...");
  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const usdt = await MockUSDT.deploy();
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();
  console.log(`   ✅ MockUSDT deployed: ${usdtAddress}`);
  deployedContracts.MockUSDT = usdtAddress;

  // ─── 2. Deploy CommodityOracle ──────────────────────────────────
  console.log("\n📄 [2/5] Deploying CommodityOracle...");
  const CommodityOracle = await ethers.getContractFactory("CommodityOracle");
  const oracle = await CommodityOracle.deploy();
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log(`   ✅ CommodityOracle deployed: ${oracleAddress}`);
  console.log(`   Initial prices (USD/ton):`);
  console.log(`     COCOA:    $8,500`);
  console.log(`     PALM OIL: $1,200`);
  console.log(`     MAIZE:    $180`);
  console.log(`     SOYBEAN:  $490`);
  deployedContracts.CommodityOracle = oracleAddress;

  // ─── 3. Deploy CropVault ────────────────────────────────────────
  console.log("\n📄 [3/5] Deploying CropVault...");
  const CropVault = await ethers.getContractFactory("CropVault");
  const vault = await CropVault.deploy(usdtAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log(`   ✅ CropVault deployed: ${vaultAddress}`);
  deployedContracts.CropVault = vaultAddress;

  // ─── 4. Deploy CropPerps ────────────────────────────────────────
  console.log("\n📄 [4/5] Deploying CropPerps...");
  const CropPerps = await ethers.getContractFactory("CropPerps");
  const cropPerps = await CropPerps.deploy(usdtAddress, vaultAddress, oracleAddress);
  await cropPerps.waitForDeployment();
  const cropPerpsAddress = await cropPerps.getAddress();
  console.log(`   ✅ CropPerps deployed: ${cropPerpsAddress}`);
  deployedContracts.CropPerps = cropPerpsAddress;

  // ─── 5. Link CropPerps → Vault ──────────────────────────────────
  console.log("\n🔗 [5/5] Linking contracts...");
  const setCropPerpsTx = await vault.setCropPerps(cropPerpsAddress);
  await setCropPerpsTx.wait();
  console.log(`   ✅ Vault → CropPerps linked`);

  // ─── 6. Seed initial LP liquidity ───────────────────────────────
  console.log("\n💧 Seeding initial liquidity...");
  const seedAmount = ethers.parseUnits("50000", 6); // 50,000 USDT

  const approveTx = await usdt.approve(vaultAddress, seedAmount);
  await approveTx.wait();

  const addLiqTx = await vault.addLiquidity(seedAmount);
  await addLiqTx.wait();
  console.log(`   ✅ Seeded vault with 50,000 USDT`);

  // ─── Save deployment addresses ──────────────────────────────────
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentData = {
    network: networkName,
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: deployedContracts,
  };

  const outPath = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(outPath, JSON.stringify(deploymentData, null, 2));

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║           DEPLOYMENT COMPLETE ✅          ║");
  console.log("╚══════════════════════════════════════════╝\n");
  console.log("Contract Addresses:");
  console.log(`  MockUSDT:         ${deployedContracts.MockUSDT}`);
  console.log(`  CommodityOracle:  ${deployedContracts.CommodityOracle}`);
  console.log(`  CropVault:        ${deployedContracts.CropVault}`);
  console.log(`  CropPerps:        ${deployedContracts.CropPerps}`);
  console.log(`\n📁 Saved to: deployments/${networkName}.json`);

  // ─── Update frontend config automatically ───────────────────────
  const frontendConfigPath = path.join(__dirname, "../frontend/config.js");
  const frontendConfig = `// Auto-generated by deploy.js — do not edit manually
// Generated: ${new Date().toISOString()}

const CONTRACTS = {
  USDT:    "${deployedContracts.MockUSDT}",
  ORACLE:  "${deployedContracts.CommodityOracle}",
  VAULT:   "${deployedContracts.CropVault}",
  PERPS:   "${deployedContracts.CropPerps}",
};

const NETWORK = {
  chainId: ${Number(network.chainId)},
  name: "${networkName}",
  rpc: "${network.chainId == 43113 ? "https://api.avax-test.network/ext/bc/C/rpc" : "https://api.avax.network/ext/bc/C/rpc"}",
  explorer: "${network.chainId == 43113 ? "https://testnet.snowtrace.io" : "https://snowtrace.io"}",
};

const COMMODITIES = [
  { id: 0, name: "Cocoa",    symbol: "COCOA",   unit: "MT",  flag: "🍫" },
  { id: 1, name: "Palm Oil", symbol: "PALMOIL", unit: "MT",  flag: "🌴" },
  { id: 2, name: "Maize",    symbol: "MAIZE",   unit: "MT",  flag: "🌽" },
  { id: 3, name: "Soybean",  symbol: "SOYBEAN", unit: "MT",  flag: "🫘" },
];
`;

  fs.writeFileSync(frontendConfigPath, frontendConfig);
  console.log(`\n🖥️  Frontend config updated: frontend/config.js`);
  console.log("\n🚀 Next Steps:");
  console.log("  1. Open frontend/index.html in your browser");
  console.log("  2. Connect MetaMask to Avalanche Fuji Testnet");
  console.log("  3. Click 'Faucet' to get test USDT");
  console.log("  4. Add liquidity to vault, then start trading!\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
