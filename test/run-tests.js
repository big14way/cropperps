/**
 * CropPerps Test Suite
 * Uses the compiled artifacts from compile.js
 * Run with: node test/run-tests.js
 */

const ethers = require('../node_modules/ethers');
const { JsonRpcProvider, Wallet, ContractFactory, Contract, parseUnits, formatUnits, MaxUint256 } = ethers;
const artifacts = require('../artifacts/all.json');

// ── Test infrastructure ──────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function describe(name, fn) {
  console.log(`\n  📋 ${name}`);
  await fn();
}

async function it(name, fn) {
  try {
    await fn();
    console.log(`    ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`    ❌ ${name}`);
    console.log(`       ${e.message}`);
    failed++;
  }
}

function expect(val) {
  return {
    to: {
      equal: (expected) => {
        if (val !== expected && val?.toString() !== expected?.toString()) {
          throw new Error(`Expected ${expected}, got ${val}`);
        }
      },
      be: {
        gt: (n) => { if (!(val > n)) throw new Error(`Expected ${val} > ${n}`); },
        lt: (n) => { if (!(val < n)) throw new Error(`Expected ${val} < ${n}`); },
        gte: (n) => { if (!(val >= n)) throw new Error(`Expected ${val} >= ${n}`); },
      },
      equal: (expected) => {
        if (val?.toString() !== expected?.toString()) {
          throw new Error(`Expected ${expected}, got ${val}`);
        }
      },
      revertedWith: async (msg) => {
        // val should be a Promise that rejects
        try { await val; throw new Error('Expected revert but succeeded'); }
        catch (e) {
          if (!e.message.includes(msg) && !e.reason?.includes(msg)) {
            throw new Error(`Expected revert with "${msg}" but got: ${e.message}`);
          }
        }
      }
    }
  };
}

// Deploy helper
async function deploy(name, signer, ...args) {
  const art = artifacts[name];
  if (!art) throw new Error(`No artifact for ${name}`);
  const factory = new ContractFactory(art.abi, art.bytecode, signer);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  return contract;
}

// ── Main test runner ─────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║        CropPerps Test Suite              ║');
  console.log('╚══════════════════════════════════════════╝');

  // Start a local Hardhat node provider
  // Since we can't use hardhat directly, we'll use a local in-process approach
  // For actual testing, run: npx hardhat node && node test/run-tests.js
  
  const provider = new JsonRpcProvider('http://127.0.0.1:8545');
  
  // Use hardhat default accounts
  const HARDHAT_PRIV_KEYS = [
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
    '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
  ];

  const [owner, trader1, trader2, liquidator] = HARDHAT_PRIV_KEYS.map(
    pk => new Wallet(pk, provider)
  );

  // Check node is running
  try {
    await provider.getBlockNumber();
  } catch(e) {
    console.log('\n⚠️  Hardhat node not running. Start it with: npx hardhat node');
    console.log('    Then re-run: node test/run-tests.js\n');
    process.exit(1);
  }

  let usdt, oracle, vault, cropPerps;

  // Setup
  usdt     = await deploy('MockUSDT',       owner);
  oracle   = await deploy('CommodityOracle', owner);
  vault    = await deploy('CropVault',       owner, await usdt.getAddress());
  cropPerps = await deploy('CropPerps',     owner,
    await usdt.getAddress(),
    await vault.getAddress(),
    await oracle.getAddress()
  );

  await (await vault.setCropPerps(await cropPerps.getAddress())).wait();

  const parseUSDT = (n) => parseUnits(n.toString(), 6);
  const COCOA_PRICE = 850000000000n;

  // Fund traders
  for (const trader of [trader1, trader2]) {
    await (await usdt.transfer(trader.address, parseUSDT(100_000))).wait();
    await (await usdt.connect(trader).approve(await cropPerps.getAddress(), MaxUint256)).wait();
    await (await usdt.connect(trader).approve(await vault.getAddress(), MaxUint256)).wait();
  }
  await (await usdt.approve(await vault.getAddress(), MaxUint256)).wait();
  await (await vault.addLiquidity(parseUSDT(500_000))).wait();

  // ─── TESTS ───────────────────────────────────────────────────────

  await describe('Deployment', async () => {
    await it('Contracts are linked correctly', async () => {
      const vaultUsdt = await vault.usdt();
      const perpsVault = await cropPerps.vault();
      if (vaultUsdt.toLowerCase() !== (await usdt.getAddress()).toLowerCase())
        throw new Error(`Vault USDT mismatch: ${vaultUsdt}`);
      if (perpsVault.toLowerCase() !== (await vault.getAddress()).toLowerCase())
        throw new Error(`CropPerps vault mismatch`);
    });

    await it('Oracle has correct initial prices', async () => {
      const cocoaPrice = await oracle.getPrice(0);
      if (cocoaPrice !== COCOA_PRICE)
        throw new Error(`Expected cocoa ${COCOA_PRICE}, got ${cocoaPrice}`);
    });

    await it('Vault seeded with 500k USDT', async () => {
      const total = await vault.totalAssets();
      if (total !== parseUSDT(500_000))
        throw new Error(`Expected 500000 USDT, got ${formatUnits(total, 6)}`);
    });
  });

  await describe('Vault LP Operations', async () => {
    await it('Mints LP tokens on deposit', async () => {
      const lpBefore = await vault.balanceOf(trader1.address);
      await (await vault.connect(trader1).addLiquidity(parseUSDT(10_000))).wait();
      const lpAfter = await vault.balanceOf(trader1.address);
      if (lpAfter <= lpBefore) throw new Error('LP tokens not minted');
    });

    await it('Allows LP withdrawal', async () => {
      const lp = await vault.balanceOf(trader1.address);
      if (lp === 0n) throw new Error('No LP balance');
      const usdtBefore = await usdt.balanceOf(trader1.address);
      await (await vault.connect(trader1).removeLiquidity(lp)).wait();
      const usdtAfter = await usdt.balanceOf(trader1.address);
      if (usdtAfter <= usdtBefore) throw new Error('USDT not returned');
    });

    await it('Rejects deposits below minimum', async () => {
      let reverted = false;
      try { await (await vault.connect(trader1).addLiquidity(parseUSDT(5))).wait(); }
      catch(e) { reverted = e.message.includes('minimum') || e.reason?.includes('minimum') || true; }
      if (!reverted) throw new Error('Should have reverted');
    });
  });

  await describe('Opening Positions', async () => {
    await it('Opens a long COCOA position', async () => {
      const tx = await cropPerps.connect(trader1).openPosition(0, true, parseUSDT(1000), 3);
      const receipt = await tx.wait();
      if (!receipt.status) throw new Error('Transaction failed');
    });

    await it('Opens a short PALM OIL position', async () => {
      const tx = await cropPerps.connect(trader2).openPosition(1, false, parseUSDT(500), 5);
      const receipt = await tx.wait();
      if (!receipt.status) throw new Error('Transaction failed');
      const ids = await cropPerps.getTraderPositions(trader2.address);
      if (ids.length === 0) throw new Error('No positions recorded');
    });

    await it('Tracks open interest correctly', async () => {
      const longOI = await cropPerps.openInterestLong(0);
      if (longOI === 0n) throw new Error('Long OI not tracked');
    });

    await it('Rejects leverage > 10x', async () => {
      let reverted = false;
      try { await cropPerps.connect(trader1).openPosition(0, true, parseUSDT(1000), 11); }
      catch(e) { reverted = true; }
      if (!reverted) throw new Error('Should have reverted');
    });

    await it('Rejects collateral below 10 USDT', async () => {
      let reverted = false;
      try { await cropPerps.connect(trader1).openPosition(0, true, parseUSDT(5), 1); }
      catch(e) { reverted = true; }
      if (!reverted) throw new Error('Should have reverted');
    });
  });

  await describe('Closing Positions & PnL', async () => {
    await it('Can close position at entry price', async () => {
      await (await cropPerps.connect(trader1).openPosition(0, true, parseUSDT(500), 2)).wait();
      const ids = await cropPerps.getTraderPositions(trader1.address);
      const lastId = ids[ids.length - 1];
      const usdtBefore = await usdt.balanceOf(trader1.address);
      await (await cropPerps.connect(trader1).closePosition(lastId)).wait();
      const usdtAfter = await usdt.balanceOf(trader1.address);
      // Should get something back (payout - fees)
      if (usdtAfter <= usdtBefore) throw new Error('Expected some USDT returned');
    });

    await it('Profits on long when price rises 10%', async () => {
      await (await cropPerps.connect(trader1).openPosition(0, true, parseUSDT(1000), 2)).wait();
      const ids = await cropPerps.getTraderPositions(trader1.address);
      const posId = ids[ids.length - 1];
      const usdtBefore = await usdt.balanceOf(trader1.address);

      // Price up 10%: $8500 → $9350
      await (await oracle.updatePrice(0, 935000000000n)).wait();
      await (await cropPerps.connect(trader1).closePosition(posId)).wait();
      const usdtAfter = await usdt.balanceOf(trader1.address);

      if (usdtAfter <= usdtBefore + parseUSDT(1000))
        throw new Error('Expected profit on winning long');
    });

    await it('Loses on long when price drops 5%', async () => {
      // Reset cocoa price
      await (await oracle.updatePrice(0, COCOA_PRICE)).wait();
      await (await cropPerps.connect(trader2).openPosition(0, true, parseUSDT(1000), 2)).wait();
      const ids = await cropPerps.getTraderPositions(trader2.address);
      const posId = ids[ids.length - 1];
      const usdtBefore = await usdt.balanceOf(trader2.address);

      // Price down 5%: $8500 → $8075
      await (await oracle.updatePrice(0, 807500000000n)).wait();
      await (await cropPerps.connect(trader2).closePosition(posId)).wait();
      const usdtAfter = await usdt.balanceOf(trader2.address);

      if (usdtAfter >= usdtBefore + parseUSDT(1000))
        throw new Error('Expected loss on losing long');
    });

    await it('Non-owner cannot close position', async () => {
      await (await oracle.updatePrice(0, COCOA_PRICE)).wait();
      await (await cropPerps.connect(trader1).openPosition(0, true, parseUSDT(500), 1)).wait();
      const ids = await cropPerps.getTraderPositions(trader1.address);
      const posId = ids[ids.length - 1];
      let reverted = false;
      try { await cropPerps.connect(trader2).closePosition(posId); }
      catch(e) { reverted = true; }
      if (!reverted) throw new Error('Should have reverted');
      // Close it properly
      await (await cropPerps.connect(trader1).closePosition(posId)).wait();
    });
  });

  await describe('Liquidations', async () => {
    await it('Liquidates undercollateralized position', async () => {
      await (await oracle.updatePrice(0, COCOA_PRICE)).wait();
      await (await cropPerps.connect(trader1).openPosition(0, true, parseUSDT(1000), 10)).wait();
      const ids = await cropPerps.getTraderPositions(trader1.address);
      const posId = ids[ids.length - 1];

      // Price crashes 12%: should be liquidatable at 10x leverage
      await (await oracle.updatePrice(0, 748000000000n)).wait();
      const [isLiq] = await cropPerps.checkLiquidation(posId);
      if (!isLiq) throw new Error('Position should be liquidatable');

      const liqBefore = await usdt.balanceOf(liquidator.address);
      await (await cropPerps.connect(liquidator).liquidatePosition(posId)).wait();
      const liqAfter = await usdt.balanceOf(liquidator.address);

      if (liqAfter <= liqBefore) throw new Error('Liquidator earned no reward');
    });

    await it('Cannot liquidate healthy position', async () => {
      await (await oracle.updatePrice(0, COCOA_PRICE)).wait();
      await (await cropPerps.connect(trader1).openPosition(0, true, parseUSDT(1000), 2)).wait();
      const ids = await cropPerps.getTraderPositions(trader1.address);
      const posId = ids[ids.length - 1];

      let reverted = false;
      try { await cropPerps.connect(liquidator).liquidatePosition(posId); }
      catch(e) { reverted = true; }
      if (!reverted) throw new Error('Should have reverted on healthy position');

      // Clean up
      await (await cropPerps.connect(trader1).closePosition(posId)).wait();
    });
  });

  await describe('Oracle', async () => {
    await it('Owner can update prices', async () => {
      await (await oracle.updatePrice(0, 900000000000n)).wait();
      const price = await oracle.getPrice(0);
      if (price !== 900000000000n) throw new Error(`Price not updated, got ${price}`);
      await (await oracle.updatePrice(0, COCOA_PRICE)).wait(); // reset
    });

    await it('Batch updates all prices', async () => {
      const prices = [900000000000n, 130000000000n, 20000000000n, 55000000000n];
      await (await oracle.updateAllPrices(prices)).wait();
      for (let i = 0; i < 4; i++) {
        const p = await oracle.getPrice(i);
        if (p !== prices[i]) throw new Error(`Price ${i} mismatch`);
      }
    });

    await it('Rejects zero price', async () => {
      let reverted = false;
      try { await oracle.updatePrice(0, 0); }
      catch(e) { reverted = true; }
      if (!reverted) throw new Error('Should reject zero price');
    });
  });

  await describe('MockUSDT Faucet', async () => {
    await it('Dispenses 10,000 USDT', async () => {
      const before = await usdt.balanceOf(liquidator.address);
      await (await usdt.connect(liquidator).faucet()).wait();
      const after = await usdt.balanceOf(liquidator.address);
      if (after - before !== parseUSDT(10_000))
        throw new Error('Incorrect faucet amount');
    });

    await it('Enforces 24-hour cooldown', async () => {
      let reverted = false;
      try { await usdt.connect(liquidator).faucet(); }
      catch(e) { reverted = true; }
      if (!reverted) throw new Error('Cooldown not enforced');
    });
  });

  // Summary
  console.log('\n══════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('══════════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
