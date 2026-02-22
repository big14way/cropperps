// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockAUSD
 * @notice Testnet version of Agora's AUSD stablecoin for local development.
 *
 * AGORA INTEGRATION:
 * On Avalanche mainnet, replace this with Agora's real AUSD contract:
 *   Avalanche C-Chain AUSD: https://agora.finance/
 *   Check https://docs.agora.finance for the canonical Avalanche AUSD address.
 *
 * AUSD is a fully-backed digital dollar by Agora Finance (backed by Paradigm & Dragonfly).
 * Reserves managed by VanEck, custodied at State Street.
 * CropPerps accepts AUSD as a second collateral option alongside USDT.
 *
 * @dev AUSD uses 18 decimals (unlike USDT's 6). The vault handles both.
 */
contract MockAUSD is ERC20, Ownable {
    uint256 public constant FAUCET_AMOUNT = 10_000 * 1e18; // 10,000 AUSD
    uint256 public constant FAUCET_COOLDOWN = 24 hours;

    mapping(address => uint256) public lastFaucetTime;

    constructor() ERC20("Agora USD", "AUSD") Ownable(msg.sender) {
        // Mint initial supply to deployer for testing
        _mint(msg.sender, 1_000_000 * 1e18);
    }

    /// @notice AUSD uses 18 decimals (standard ERC20, unlike USDT)
    function decimals() public pure override returns (uint8) {
        return 18;
    }

    /// @notice Testnet faucet — get 10,000 AUSD (24hr cooldown)
    function faucet() external {
        require(
            block.timestamp >= lastFaucetTime[msg.sender] + FAUCET_COOLDOWN,
            "AUSD: Faucet cooldown active"
        );
        lastFaucetTime[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
