/**
 * Custom compiler script using bundled solc - no internet required
 * Generates artifacts compatible with Hardhat's artifact format
 */

const solc = require('./node_modules/solc');
const fs = require('fs');
const path = require('path');

console.log(`\n🔨 Compiling with solc ${solc.version()}\n`);

// Read all contract files
function readContracts() {
  const contractsDir = path.join(__dirname, 'contracts');
  const sources = {};

  function readDir(dir, prefix = '') {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        readDir(fullPath, prefix + file + '/');
      } else if (file.endsWith('.sol')) {
        const key = prefix + file;
        sources[key] = { content: fs.readFileSync(fullPath, 'utf8') };
      }
    }
  }
  readDir(contractsDir);
  return sources;
}

// Resolve imports from node_modules
function findImports(importPath) {
  // Try node_modules
  const candidates = [
    path.join(__dirname, 'node_modules', importPath),
    path.join(__dirname, 'contracts', importPath),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return { contents: fs.readFileSync(candidate, 'utf8') };
    }
  }
  return { error: 'File not found: ' + importPath };
}

const sources = readContracts();
console.log('Sources found:', Object.keys(sources).join(', '));

const input = {
  language: 'Solidity',
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'evm.methodIdentifiers', 'metadata'],
      },
    },
  },
};

const output = JSON.parse(
  solc.compile(JSON.stringify(input), { import: findImports })
);

let hasErrors = false;
if (output.errors) {
  for (const e of output.errors) {
    if (e.severity === 'error') {
      console.error('❌ Error:', e.formattedMessage);
      hasErrors = true;
    } else {
      console.warn('⚠️  Warning:', e.message);
    }
  }
}

if (hasErrors) {
  process.exit(1);
}

// Write artifacts
const artifactsDir = path.join(__dirname, 'artifacts', 'contracts');
fs.mkdirSync(artifactsDir, { recursive: true });

for (const [sourcePath, contracts] of Object.entries(output.contracts || {})) {
  for (const [contractName, compiled] of Object.entries(contracts)) {
    const contractDir = path.join(artifactsDir, sourcePath, `${contractName}.sol`);
    fs.mkdirSync(contractDir, { recursive: true });

    const artifact = {
      contractName,
      abi: compiled.abi,
      bytecode: '0x' + compiled.evm.bytecode.object,
      deployedBytecode: '0x' + compiled.evm.deployedBytecode.object,
      linkReferences: compiled.evm.bytecode.linkReferences || {},
      deployedLinkReferences: compiled.evm.deployedBytecode.linkReferences || {},
    };

    const artifactPath = path.join(contractDir, `${contractName}.json`);
    fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
    console.log(`  ✅ ${contractName} → ${path.relative(__dirname, artifactPath)}`);
  }
}

// Also save a simple summary for tests
const deployArtifacts = {};
for (const [sourcePath, contracts] of Object.entries(output.contracts || {})) {
  for (const [contractName, compiled] of Object.entries(contracts)) {
    deployArtifacts[contractName] = {
      abi: compiled.abi,
      bytecode: '0x' + compiled.evm.bytecode.object,
    };
  }
}
fs.writeFileSync(
  path.join(__dirname, 'artifacts', 'all.json'),
  JSON.stringify(deployArtifacts, null, 2)
);

console.log('\n✅ Compilation complete!\n');
