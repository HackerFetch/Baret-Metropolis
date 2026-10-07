// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IReputationRegistry {
    function onReport(bytes calldata metadata, bytes calldata report) external;
    function reportFlagged(address target, uint8 severity, string calldata reasonCode) external;
    function isFlagged(address target)
        external
        view
        returns (bool flagged, uint8 severity, string memory reasonCode);
}

/// @notice The receiver interface a Chainlink CRE forwarder delivers reports to.
interface IReceiver {
    function onReport(bytes calldata metadata, bytes calldata report) external;
}

/**
 * @title Baret ReputationOracleReceiver
 * @notice The door between the Chainlink CRE reputation-oracle workflow and
 * the ReputationRegistry.
 *
 * A CRE forwarder only delivers to a contract that answers ERC-165 for
 * IReceiver, and it delivers the reports of every workflow on the network, so
 * the receiver has to say whose reports it takes. This contract does both and
 * passes an accepted report on to the registry unchanged; it is set as the
 * registry's forwarder.
 *
 * Three checks before a report is written: the caller is the forwarder, the
 * report comes from a workflow owned by {workflowOwner} (when set), and no
 * target is on the protected list. The protected list holds the contracts
 * Baret vouches for, so a poisoned threat feed cannot turn them into
 * blocklist entries.
 *
 * The owner can still write one entry by hand ({ownerReport}), which is how
 * the demo entries are seeded.
 */
contract ReputationOracleReceiver is IReceiver {
    /// @dev abi.encodePacked(bytes32 workflowId, bytes10 workflowName, address workflowOwner)
    uint256 private constant METADATA_LENGTH = 62;
    uint256 private constant WORKFLOW_OWNER_OFFSET = 42;

    IReputationRegistry public immutable registry;
    address public owner;
    address public forwarder;
    /// @notice Only reports of workflows owned by this address are taken. Zero turns the check off.
    address public workflowOwner;
    mapping(address target => bool) public isProtected;

    error NotOwner();
    error NotForwarder();
    error ZeroAddress();
    error InvalidMetadata();
    error WrongWorkflowOwner(address received);
    error ProtectedTarget(address target);

    event ForwarderSet(address indexed forwarder);
    event WorkflowOwnerSet(address indexed workflowOwner);
    event ProtectedSet(address indexed target, bool isProtected);
    event ReportForwarded(uint256 targets);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address owner_, address registry_, address forwarder_, address workflowOwner_) {
        if (owner_ == address(0) || registry_ == address(0) || forwarder_ == address(0)) {
            revert ZeroAddress();
        }
        owner = owner_;
        registry = IReputationRegistry(registry_);
        forwarder = forwarder_;
        workflowOwner = workflowOwner_;
        emit OwnershipTransferred(address(0), owner_);
        emit ForwarderSet(forwarder_);
        emit WorkflowOwnerSet(workflowOwner_);
    }

    /// @notice CRE entry point. `report` is abi.encode(address[], uint8[], string[]).
    function onReport(bytes calldata metadata, bytes calldata report) external {
        if (msg.sender != forwarder) revert NotForwarder();
        address expected = workflowOwner;
        if (expected != address(0)) {
            if (metadata.length < METADATA_LENGTH) revert InvalidMetadata();
            address received = address(bytes20(metadata[WORKFLOW_OWNER_OFFSET:METADATA_LENGTH]));
            if (received != expected) revert WrongWorkflowOwner(received);
        }
        (address[] memory targets,,) = abi.decode(report, (address[], uint8[], string[]));
        for (uint256 i = 0; i < targets.length; ++i) {
            if (isProtected[targets[i]]) revert ProtectedTarget(targets[i]);
        }
        registry.onReport(metadata, report);
        emit ReportForwarded(targets.length);
    }

    /// @notice One entry written by the owner, for the demo entries. Protected targets are refused.
    function ownerReport(address target, uint8 severity, string calldata reasonCode)
        external
        onlyOwner
    {
        if (isProtected[target]) revert ProtectedTarget(target);
        registry.reportFlagged(target, severity, reasonCode);
    }

    /**
     * @notice The candidates a report may still write: not in the registry
     * yet and not protected. The workflow asks this before it builds a
     * report, so an entry is written once and an existing one is never
     * overwritten by the feed.
     */
    function pending(address[] calldata candidates) external view returns (address[] memory) {
        address[] memory out = new address[](candidates.length);
        uint256 n;
        for (uint256 i = 0; i < candidates.length; ++i) {
            address c = candidates[i];
            if (c == address(0) || isProtected[c]) continue;
            (bool flagged,,) = registry.isFlagged(c);
            if (!flagged) out[n++] = c;
        }
        assembly {
            mstore(out, n)
        }
        return out;
    }

    function setForwarder(address forwarder_) external onlyOwner {
        if (forwarder_ == address(0)) revert ZeroAddress();
        forwarder = forwarder_;
        emit ForwarderSet(forwarder_);
    }

    function setWorkflowOwner(address workflowOwner_) external onlyOwner {
        workflowOwner = workflowOwner_;
        emit WorkflowOwnerSet(workflowOwner_);
    }

    function setProtected(address[] calldata targets, bool isProtected_) external onlyOwner {
        for (uint256 i = 0; i < targets.length; ++i) {
            isProtected[targets[i]] = isProtected_;
            emit ProtectedSet(targets[i], isProtected_);
        }
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /// @notice ERC-165: the forwarder asks for IReceiver before it delivers.
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IReceiver).interfaceId || interfaceId == 0x01ffc9a7;
    }
}
