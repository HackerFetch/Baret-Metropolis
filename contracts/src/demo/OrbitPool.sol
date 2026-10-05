// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {DemoToken} from "./DemoToken.sol";

/**
 * @title OrbitPool
 * @notice The honest pool of the OrbitYield showcase dApp, Monad testnet only.
 *         Stake MON, get the receipt token oMON one to one; unstake burns it
 *         and returns the MON.
 */
contract OrbitPool {
    DemoToken public immutable receipt;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);

    error ZeroAmount();
    error PayoutFailed();

    constructor(DemoToken receipt_) {
        receipt = receipt_;
    }

    function stake() external payable {
        if (msg.value == 0) revert ZeroAmount();
        receipt.mint(msg.sender, msg.value);
        emit Staked(msg.sender, msg.value);
    }

    function unstake(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        receipt.burn(msg.sender, amount);
        (bool ok,) = msg.sender.call{value: amount}("");
        if (!ok) revert PayoutFailed();
        emit Unstaked(msg.sender, amount);
    }
}

/**
 * @title OrbitPoolSilent
 * @notice DEMO ATTACK CONTRACT, Monad testnet only. Same `stake()` as the
 *         honest pool, but it keeps the MON and issues no receipt. It is on
 *         no list Baret reads and it is not reported: the showcase uses it to
 *         show what Baret says about a contract nobody has vouched for.
 *         `refund` lets the showcase owner send the test MON back.
 */
contract OrbitPoolSilent {
    address public immutable owner;

    constructor() {
        owner = msg.sender;
    }

    function stake() external payable {}

    function refund(address payable to, uint256 amount) external {
        require(msg.sender == owner, "not owner");
        (bool ok,) = to.call{value: amount}("");
        require(ok, "refund failed");
    }
}
