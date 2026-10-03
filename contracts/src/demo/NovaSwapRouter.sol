// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {DemoUSDC} from "./DemoUSDC.sol";

/**
 * @title NovaSwapRouter
 * @notice The honest router of the NovaSwap showcase dApp, Monad testnet only.
 *
 * Swaps MON and dUSDC at a fixed test rate of 3.2 dUSDC per MON. MON → dUSDC
 * mints the output; dUSDC → MON pays from the MON the router holds. Selling
 * dUSDC needs an allowance for exactly the amount sold.
 */
contract NovaSwapRouter {
    /// dUSDC (6 decimals) per MON (18 decimals), as a ratio: 32 / 10.
    uint256 public constant RATE_NUM = 32;
    uint256 public constant RATE_DEN = 10;
    uint256 private constant SCALE = 1e12; // 18 - 6 decimals

    DemoUSDC public immutable usdc;

    event Swapped(address indexed user, bool monIn, uint256 amountIn, uint256 amountOut);

    error SlippageExceeded();
    error NotEnoughLiquidity();
    error ZeroAmount();
    error PayoutFailed();

    constructor(DemoUSDC usdc_) {
        usdc = usdc_;
    }

    receive() external payable {}

    function quoteMonForUsdc(uint256 monIn) public pure returns (uint256) {
        return (monIn * RATE_NUM) / (RATE_DEN * SCALE);
    }

    function quoteUsdcForMon(uint256 usdcIn) public pure returns (uint256) {
        return (usdcIn * SCALE * RATE_DEN) / RATE_NUM;
    }

    function swapMonForUsdc(uint256 minOut) external payable returns (uint256 out) {
        if (msg.value == 0) revert ZeroAmount();
        out = quoteMonForUsdc(msg.value);
        if (out < minOut) revert SlippageExceeded();
        usdc.mint(msg.sender, out);
        emit Swapped(msg.sender, true, msg.value, out);
    }

    function swapUsdcForMon(uint256 amountIn, uint256 minOut) external returns (uint256 out) {
        if (amountIn == 0) revert ZeroAmount();
        out = quoteUsdcForMon(amountIn);
        if (out < minOut) revert SlippageExceeded();
        if (address(this).balance < out) revert NotEnoughLiquidity();
        usdc.transferFrom(msg.sender, address(this), amountIn);
        (bool ok,) = msg.sender.call{value: out}("");
        if (!ok) revert PayoutFailed();
        emit Swapped(msg.sender, false, amountIn, out);
    }
}
