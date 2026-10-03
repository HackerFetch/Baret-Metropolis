// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title DemoUSDC
 * @notice Test dollars for the Baret showcase on Monad testnet. Worth nothing.
 *
 * Anyone can take 100 from {faucet}; the NovaSwap router mints what a swap
 * pays out. Symbol `dUSDC` so it is never mistaken for the real USDC.
 */
contract DemoUSDC {
    string public constant name = "Baret Demo USDC";
    string public constant symbol = "dUSDC";
    uint8 public constant decimals = 6;
    uint256 public constant FAUCET_AMOUNT = 100e6;

    address public immutable owner;
    address public minter;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    error NotOwner();
    error NotMinter();
    error MinterAlreadySet();
    error InsufficientBalance();
    error InsufficientAllowance();

    constructor() {
        owner = msg.sender;
    }

    /// @notice Set once, to the NovaSwap router.
    function setMinter(address minter_) external {
        if (msg.sender != owner) revert NotOwner();
        if (minter != address(0)) revert MinterAlreadySet();
        minter = minter_;
    }

    function faucet() external {
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    function mint(address to, uint256 amount) external {
        if (msg.sender != minter) revert NotMinter();
        _mint(to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _move(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            if (allowed < amount) revert InsufficientAllowance();
            allowance[from][msg.sender] = allowed - amount;
        }
        _move(from, to, amount);
        return true;
    }

    function _move(address from, address to, uint256 amount) private {
        if (balanceOf[from] < amount) revert InsufficientBalance();
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) private {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
}
