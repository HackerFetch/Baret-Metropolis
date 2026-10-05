// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {DemoToken} from "./DemoToken.sol";

/**
 * @title LaunchSale
 * @notice The plain sale of the LaunchPad showcase dApp, Monad testnet only.
 *         0.01 to 1 MON per contribution, 1,000 LNTL per MON.
 */
contract LaunchSale {
    uint256 public constant RATE = 1000;
    uint256 public constant MIN = 0.01 ether;
    uint256 public constant MAX = 1 ether;
    DemoToken public immutable token;

    event Contributed(address indexed user, uint256 mon, uint256 tokens);

    error OutOfRange();

    constructor(DemoToken token_) {
        token = token_;
    }

    function contribute() external payable {
        if (msg.value < MIN || msg.value > MAX) revert OutOfRange();
        uint256 tokens = msg.value * RATE;
        token.mint(msg.sender, tokens);
        emit Contributed(msg.sender, msg.value, tokens);
    }
}

/**
 * @title LaunchSaleLogic
 * @notice The code the proxy below borrows. Run through the proxy, `token`
 *         is read from the proxy's storage and the proxy is the minter.
 */
contract LaunchSaleLogic {
    // Storage layout shared with LaunchSaleProxy: slot 0 logic, slot 1 owner, slot 2 token.
    address public logic;
    address public owner;
    DemoToken public token;

    event Contributed(address indexed user, uint256 mon, uint256 tokens);

    error OutOfRange();

    function contribute() external payable {
        if (msg.value < 0.01 ether || msg.value > 1 ether) revert OutOfRange();
        uint256 tokens = msg.value * 1000;
        token.mint(msg.sender, tokens);
        emit Contributed(msg.sender, msg.value, tokens);
    }
}

/**
 * @title LaunchSaleProxy
 * @notice The second sale of the LaunchPad showcase, Monad testnet only. It
 *         forwards every call to `logic` with delegatecall, and its owner can
 *         replace `logic` at any time: the code a buyer was shown is not
 *         necessarily the code that runs. It behaves honestly today; the
 *         showcase uses it to show Baret's borrowed-code finding. The logic
 *         address sits in an ordinary slot, not the EIP-1967 one, so Baret
 *         does not treat it as a standard upgradeable proxy.
 */
contract LaunchSaleProxy {
    address public logic;
    address public owner;
    DemoToken public token;

    constructor(address logic_, DemoToken token_) {
        logic = logic_;
        owner = msg.sender;
        token = token_;
    }

    function setLogic(address logic_) external {
        require(msg.sender == owner, "not owner");
        logic = logic_;
    }

    fallback() external payable {
        address target = logic;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let ok := delegatecall(gas(), target, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch ok
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    receive() external payable {}
}
