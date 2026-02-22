/**
 * Native compilation script using the solcjs in node_modules
 * Bypasses hardhat's need to download a compiler binary
 */
const solc = require('solc');
const fs = require('fs');
const path = require('path');

function findImports(importPath) {
  const paths = [
    path.join(__dirname, 'contracts', importPath),
    path.join(__dirname, 'node_modules', importPath),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      return { contents: fs.readFileSync(p, 'utf8') };
    }
  }
  return { error: `File not found: ${importPath}` };
}

const contractFiles = [
  'contracts/interfaces/AggregatorV3Interface.sol',
  'contracts/MockUSDT.sol',
  'contracts/CommodityOracle.sol',
  'contracts/CropVault.sol',
  'contracts/CropPerps.sol',
];

const sources = {};
for (const f of contractFiles) {
  sources[f] = { content: fs.readFileSync(path.join(__dirname, f), 'utf8') };
}

const input = {
  language: 'Solidity',
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } },
  },
};

console.log('Compiling contracts with solc', solc.version(), '...');
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

let hasErrors = false;
if (output.errors) {
  for (const err of output.errors) {
    if (err.severity === 'error') {
      console.error('ERROR:', err.formattedMessage);
      hasErrors = true;
    } else {
      console.warn('WARN:', err.formattedMessage.split('\n')[0]);
    }
  }
}

if (!hasErrors && output.contracts) {
  // Save ABIs
  fs.mkdirSync('artifacts-native', { recursive: true });
  for (const [file, contracts] of Object.entries(output.contracts)) {
    for (const [contractName, contractData] of Object.entries(contracts)) {
      const abiPath = path.join('artifacts-native', `${contractName}.json`);
      fs.writeFileSync(abiPath, JSON.stringify({
        contractName,
        abi: contractData.abi,
        bytecode: contractData.evm.bytecode.object,
      }, null, 2));
      console.log(`✓ ${contractName} compiled → artifacts-native/${contractName}.json`);
    }
  }
  console.log('\n✅ All contracts compiled successfully!');
} else if (hasErrors) {
  console.error('\n❌ Compilation failed');
  process.exit(1);
}
