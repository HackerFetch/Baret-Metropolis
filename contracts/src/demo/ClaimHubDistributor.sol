// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {DemoToken} from "./DemoToken.sol";

/**
 * @title ClaimHubDistributor
 * @notice The honest airdrop of the ClaimHub showcase dApp, Monad testnet
 *         only. `claim()` sends the caller 2,410 HUB, as often as they ask.
 */
contract ClaimHubDistributor {
    uint256 public constant ALLOCATION = 2410 ether;
    DemoToken public immutable hub;

    event Claimed(address indexed user, uint256 amount);

    constructor(DemoToken hub_) {
        hub = hub_;
    }

    function claim() external {
        hub.mint(msg.sender, ALLOCATION);
        emit Claimed(msg.sender, ALLOCATION);
    }
}
