// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDT
 * @notice Testnet USDT with 6 decimals. On mainnet, replace with real USDT.
 * @dev Faucet allows anyone to mint 10,000 USDT for testing.
 */
contract MockUSDT is ERC20, Ownable {
    uint8 private constant DECIMALS = 6;
    uint256 public constant FAUCET_AMOUNT = 10_000 * 10 ** 6; // 10,000 USDT
    uint256 public constant FAUCET_COOLDOWN = 24 hours;

    mapping(address => uint256) public lastFaucetTime;

    constructor() ERC20("USD Tether", "USDT") Ownable(msg.sender) {
        // Mint initial supply to deployer for LP seeding
        _mint(msg.sender, 1_000_000 * 10 ** 6);
    }

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /// @notice Testnet faucet — get 10,000 USDT every 24 hours
    function faucet() external {
        require(
            block.timestamp >= lastFaucetTime[msg.sender] + FAUCET_COOLDOWN,
            "USDT: Faucet cooldown active"
        );
        lastFaucetTime[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    /// @notice Owner mint for seeding liquidity pools
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
