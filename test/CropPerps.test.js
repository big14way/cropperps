const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CropPerps Protocol", function () {
  let usdt, oracle, vault, cropPerps;
  let owner, trader1, trader2, liquidator;
  const USDT_DECIMALS = 6;
  const PRICE_DECIMALS = 8;

  // Helper: parse USDT
  const parseUSDT = (amount) => ethers.parseUnits(amount.toString(), USDT_DECIMALS);
  const formatUSDT = (amount) => ethers.formatUnits(amount, USDT_DECIMALS);

  // Helper: commodity prices (8 decimals)
  const COCOA_PRICE   = BigInt("850000000000");  // $8,500
  const PALMOIL_PRICE = BigInt("120000000000");  // $1,200
  const MAIZE_PRICE   = BigInt("18000000000");   // $180
  const SOYBEAN_PRICE = BigInt("49000000000");   // $490

  beforeEach(async () => {
    [owner, trader1, trader2, liquidator] = await ethers.getSigners();

    // Deploy MockUSDT
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    usdt = await MockUSDT.deploy();

    // Deploy CommodityOracle
    const CommodityOracle = await ethers.getContractFactory("CommodityOracle");
    oracle = await CommodityOracle.deploy();

    // Deploy CropVault
    const CropVault = await ethers.getContractFactory("CropVault");
    vault = await CropVault.deploy(await usdt.getAddress());

    // Deploy CropPerps
    const CropPerps = await ethers.getContractFactory("CropPerps");
    cropPerps = await CropPerps.deploy(
      await usdt.getAddress(),
      await vault.getAddress(),
      await oracle.getAddress()
    );

    // Link vault to CropPerps
    await vault.setCropPerps(await cropPerps.getAddress());

    // Fund traders and approve contracts
    const traderFunds = parseUSDT(100_000); // 100k USDT each
    await usdt.transfer(trader1.address, traderFunds);
    await usdt.transfer(trader2.address, traderFunds);
    await usdt.transfer(liquidator.address, parseUSDT(1000));

    await usdt.connect(trader1).approve(await vault.getAddress(), ethers.MaxUint256);
    await usdt.connect(trader2).approve(await vault.getAddress(), ethers.MaxUint256);
    await usdt.connect(owner).approve(await vault.getAddress(), ethers.MaxUint256);
    await usdt.connect(trader1).approve(await cropPerps.getAddress(), ethers.MaxUint256);
    await usdt.connect(trader2).approve(await cropPerps.getAddress(), ethers.MaxUint256);

    // Seed vault with initial liquidity (owner)
    await vault.connect(owner).addLiquidity(parseUSDT(500_000));
  });

  // ═══════════════════════════════════════════════════════════
  //                   DEPLOYMENT & SETUP
  // ═══════════════════════════════════════════════════════════

  describe("Deployment", () => {
    it("Should deploy with correct configuration", async () => {
      expect(await vault.usdt()).to.equal(await usdt.getAddress());
      expect(await vault.cropPerps()).to.equal(await cropPerps.getAddress());
      expect(await cropPerps.vault()).to.equal(await vault.getAddress());
      expect(await cropPerps.oracle()).to.equal(await oracle.getAddress());
    });

    it("Should have correct initial oracle prices", async () => {
      expect(await oracle.getPrice(0)).to.equal(COCOA_PRICE);
      expect(await oracle.getPrice(1)).to.equal(PALMOIL_PRICE);
      expect(await oracle.getPrice(2)).to.equal(MAIZE_PRICE);
      expect(await oracle.getPrice(3)).to.equal(SOYBEAN_PRICE);
    });

    it("Should have initial vault liquidity from owner seed", async () => {
      expect(await vault.totalAssets()).to.equal(parseUSDT(500_000));
    });
  });

  // ═══════════════════════════════════════════════════════════
  //                     VAULT LP OPERATIONS
  // ═══════════════════════════════════════════════════════════

  describe("Vault LP Operations", () => {
    it("Should mint LP tokens proportional to deposit", async () => {
      const depositAmount = parseUSDT(10_000);
      const lpBefore = await vault.balanceOf(trader1.address);

      await vault.connect(trader1).addLiquidity(depositAmount);

      const lpAfter = await vault.balanceOf(trader1.address);
      expect(lpAfter).to.be.gt(lpBefore);
    });

    it("Should allow LP token redemption for USDT", async () => {
      const depositAmount = parseUSDT(10_000);
      await vault.connect(trader1).addLiquidity(depositAmount);

      const lpBalance = await vault.balanceOf(trader1.address);
      const usdtBefore = await usdt.balanceOf(trader1.address);

      await vault.connect(trader1).removeLiquidity(lpBalance);

      const usdtAfter = await usdt.balanceOf(trader1.address);
      expect(usdtAfter).to.be.gt(usdtBefore);
      expect(await vault.balanceOf(trader1.address)).to.equal(0);
    });

    it("Should reject deposits below minimum", async () => {
      await expect(
        vault.connect(trader1).addLiquidity(parseUSDT(5)) // 5 USDT < 10 USDT min
      ).to.be.revertedWith("Vault: Below minimum deposit");
    });

    it("Should prevent removing liquidity backing open positions", async () => {
      // Open a large position that uses most of the free capacity
      const collateral = parseUSDT(10_000);
      await cropPerps.connect(trader1).openPosition(0, true, collateral, 10); // 10x leverage

      // Owner tries to remove all LP — should fail due to reserved USDT
      const lpBalance = await vault.balanceOf(owner.address);

      // This should fail because reservedUSDT > 0 and removing everything
      await expect(
        vault.connect(owner).removeLiquidity(lpBalance)
      ).to.be.revertedWith("Vault: Insufficient free liquidity");
    });
  });

  // ═══════════════════════════════════════════════════════════
  //                    OPEN POSITIONS
  // ═══════════════════════════════════════════════════════════

  describe("Opening Positions", () => {
    it("Should open a long COCOA position", async () => {
      const collateral = parseUSDT(1_000);
      const leverage = 3;

      const tx = await cropPerps.connect(trader1).openPosition(0, true, collateral, leverage);
      const receipt = await tx.wait();

      const event = receipt.logs.find(l => {
        try { return cropPerps.interface.parseLog(l)?.name === "PositionOpened"; }
        catch { return false; }
      });
      const parsed = cropPerps.interface.parseLog(event);

      expect(parsed.args.trader).to.equal(trader1.address);
      expect(parsed.args.commodityId).to.equal(0);
      expect(parsed.args.isLong).to.equal(true);
      expect(parsed.args.leverage).to.equal(leverage);
      expect(parsed.args.entryPrice).to.equal(COCOA_PRICE);
    });

    it("Should open a short PALM OIL position", async () => {
      const collateral = parseUSDT(500);
      await cropPerps.connect(trader1).openPosition(1, false, collateral, 5);
      const positionIds = await cropPerps.getTraderPositions(trader1.address);
      expect(positionIds.length).to.equal(1);

      const details = await cropPerps.getPositionDetails(positionIds[0]);
      expect(details.pos.isLong).to.equal(false);
      expect(details.pos.commodityId).to.equal(1);
    });

    it("Should reject invalid leverage", async () => {
      await expect(
        cropPerps.connect(trader1).openPosition(0, true, parseUSDT(1000), 11) // >10x
      ).to.be.revertedWith("CropPerps: Invalid leverage");

      await expect(
        cropPerps.connect(trader1).openPosition(0, true, parseUSDT(1000), 0) // 0x
      ).to.be.revertedWith("CropPerps: Invalid leverage");
    });

    it("Should reject collateral below minimum", async () => {
      await expect(
        cropPerps.connect(trader1).openPosition(0, true, parseUSDT(5), 1) // 5 USDT < 10 USDT min
      ).to.be.revertedWith("CropPerps: Collateral too low");
    });

    it("Should reject invalid commodity ID", async () => {
      await expect(
        cropPerps.connect(trader1).openPosition(5, true, parseUSDT(1000), 2)
      ).to.be.revertedWith("CropPerps: Invalid commodity");
    });

    it("Should correctly track open interest", async () => {
      await cropPerps.connect(trader1).openPosition(0, true,  parseUSDT(1000), 2); // Long
      await cropPerps.connect(trader2).openPosition(0, false, parseUSDT(1000), 3); // Short

      expect(await cropPerps.openInterestLong(0)).to.equal(
        parseUSDT(1000) * BigInt(2) // collateral * leverage (approx, minus fee)
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  //                   CLOSE POSITIONS & PNL
  // ═══════════════════════════════════════════════════════════

  describe("Closing Positions & PnL", () => {
    let positionId;
    const collateral = 1_000; // USDT

    beforeEach(async () => {
      await cropPerps.connect(trader1).openPosition(0, true, parseUSDT(collateral), 2);
      const ids = await cropPerps.getTraderPositions(trader1.address);
      positionId = ids[0];
    });

    it("Should close a position and return collateral at same price", async () => {
      const usdtBefore = await usdt.balanceOf(trader1.address);
      await cropPerps.connect(trader1).closePosition(positionId);
      const usdtAfter = await usdt.balanceOf(trader1.address);

      // At same price: return = collateral - open fee - close fee - borrow fee
      // Expect payout to be close to original (minus small fees)
      expect(usdtAfter).to.be.gt(usdtBefore); // should get something back
      expect(usdtAfter).to.be.lt(usdtBefore + parseUSDT(collateral)); // less than original
    });

    it("Should profit on a winning long (price increases)", async () => {
      const usdtBefore = await usdt.balanceOf(trader1.address);

      // Price goes up 10%: $8500 → $9350
      const newPrice = BigInt("935000000000"); // $9,350
      await oracle.updatePrice(0, newPrice);

      await cropPerps.connect(trader1).closePosition(positionId);
      const usdtAfter = await usdt.balanceOf(trader1.address);

      // Long profits when price goes up
      // PnL = sizeUSDT * (9350 - 8500) / 8500 ≈ +10% of position
      expect(usdtAfter).to.be.gt(usdtBefore + parseUSDT(collateral));
    });

    it("Should lose on a losing long (price decreases)", async () => {
      const usdtBefore = await usdt.balanceOf(trader1.address);

      // Price drops 5%: $8500 → $8075
      const newPrice = BigInt("807500000000");
      await oracle.updatePrice(0, newPrice);

      await cropPerps.connect(trader1).closePosition(positionId);
      const usdtAfter = await usdt.balanceOf(trader1.address);

      // Should get back less than original collateral
      expect(usdtAfter).to.be.lt(usdtBefore + parseUSDT(collateral));
    });

    it("Should profit on a winning short (price decreases)", async () => {
      // Open a short
      await cropPerps.connect(trader2).openPosition(1, false, parseUSDT(500), 3); // Short PALMOIL 3x
      const ids = await cropPerps.getTraderPositions(trader2.address);
      const shortPosId = ids[0];

      const usdtBefore = await usdt.balanceOf(trader2.address);

      // Price drops 10%: $1200 → $1080
      await oracle.updatePrice(1, BigInt("108000000000"));

      await cropPerps.connect(trader2).closePosition(shortPosId);
      const usdtAfter = await usdt.balanceOf(trader2.address);

      expect(usdtAfter).to.be.gt(usdtBefore + parseUSDT(500));
    });

    it("Should revert when non-owner tries to close", async () => {
      await expect(
        cropPerps.connect(trader2).closePosition(positionId)
      ).to.be.revertedWith("CropPerps: Not your position");
    });

    it("Should not allow closing already-closed position", async () => {
      await cropPerps.connect(trader1).closePosition(positionId);
      await expect(
        cropPerps.connect(trader1).closePosition(positionId)
      ).to.be.revertedWith("CropPerps: Position not open");
    });
  });

  // ═══════════════════════════════════════════════════════════
  //                      LIQUIDATIONS
  // ═══════════════════════════════════════════════════════════

  describe("Liquidations", () => {
    it("Should liquidate an undercollateralized position", async () => {
      // Open 10x long
      await cropPerps.connect(trader1).openPosition(0, true, parseUSDT(1000), 10);
      const ids = await cropPerps.getTraderPositions(trader1.address);
      const posId = ids[0];

      // Price crashes 12%: $8500 → $7480 — should be liquidatable (10x → -120% loss)
      await oracle.updatePrice(0, BigInt("748000000000"));

      const [isLiquidatable] = await cropPerps.checkLiquidation(posId);
      expect(isLiquidatable).to.equal(true);

      const liquidatorBefore = await usdt.balanceOf(liquidator.address);
      await cropPerps.connect(liquidator).liquidatePosition(posId);
      const liquidatorAfter = await usdt.balanceOf(liquidator.address);

      // Liquidator should have earned a reward
      expect(liquidatorAfter).to.be.gt(liquidatorBefore);

      // Position should be closed
      const pos = await cropPerps.positions(posId);
      expect(pos.isOpen).to.equal(false);
    });

    it("Should reject liquidation of healthy position", async () => {
      await cropPerps.connect(trader1).openPosition(0, true, parseUSDT(1000), 2);
      const ids = await cropPerps.getTraderPositions(trader1.address);

      await expect(
        cropPerps.connect(liquidator).liquidatePosition(ids[0])
      ).to.be.revertedWith("CropPerps: Position not liquidatable");
    });
  });

  // ═══════════════════════════════════════════════════════════
  //                      ORACLE TESTS
  // ═══════════════════════════════════════════════════════════

  describe("CommodityOracle", () => {
    it("Should allow owner to update prices", async () => {
      const newPrice = BigInt("900000000000"); // $9,000
      await oracle.updatePrice(0, newPrice);
      expect(await oracle.getPrice(0)).to.equal(newPrice);
    });

    it("Should allow batch price update", async () => {
      const prices = [
        BigInt("900000000000"),
        BigInt("130000000000"),
        BigInt("20000000000"),
        BigInt("55000000000"),
      ];
      await oracle.updateAllPrices(prices);

      for (let i = 0; i < 4; i++) {
        expect(await oracle.getPrice(i)).to.equal(prices[i]);
      }
    });

    it("Should reject non-owner price update", async () => {
      await expect(
        oracle.connect(trader1).updatePrice(0, BigInt("900000000000"))
      ).to.be.reverted;
    });

    it("Should reject zero price", async () => {
      await expect(oracle.updatePrice(0, 0)).to.be.revertedWith("Oracle: Price must be positive");
    });
  });

  // ═══════════════════════════════════════════════════════════
  //                      USDT FAUCET
  // ═══════════════════════════════════════════════════════════

  describe("MockUSDT Faucet", () => {
    it("Should dispense 10,000 USDT from faucet", async () => {
      const newWallet = ethers.Wallet.createRandom().connect(ethers.provider);
      // Give gas money
      await owner.sendTransaction({ to: newWallet.address, value: ethers.parseEther("0.1") });

      const before = await usdt.balanceOf(newWallet.address);
      await usdt.connect(newWallet).faucet();
      const after = await usdt.balanceOf(newWallet.address);

      expect(after - before).to.equal(parseUSDT(10_000));
    });

    it("Should enforce 24 hour cooldown", async () => {
      await usdt.connect(trader1).faucet();
      await expect(usdt.connect(trader1).faucet()).to.be.revertedWith("USDT: Faucet cooldown active");

      // Advance 24 hours
      await time.increase(86401);
      await expect(usdt.connect(trader1).faucet()).to.not.be.reverted;
    });
  });
});
