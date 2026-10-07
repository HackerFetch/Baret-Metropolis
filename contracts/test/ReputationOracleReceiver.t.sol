// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ReputationRegistry} from "../src/ReputationRegistry.sol";
import {ReputationOracleReceiver, IReceiver} from "../src/ReputationOracleReceiver.sol";

contract ReputationOracleReceiverTest is Test {
    ReputationRegistry reg;
    ReputationOracleReceiver receiver;
    address owner = makeAddr("owner");
    address forwarder = makeAddr("forwarder");
    address workflowOwner = makeAddr("workflowOwner");
    address drainer = makeAddr("drainer");
    address phisher = makeAddr("phisher");
    address router = makeAddr("router");
    address other = makeAddr("other");
    bytes10 constant WORKFLOW_NAME = "reputation";

    function setUp() public {
        reg = new ReputationRegistry(owner, owner);
        receiver = new ReputationOracleReceiver(owner, address(reg), forwarder, workflowOwner);
        vm.prank(owner);
        reg.setForwarder(address(receiver));
    }

    function _metadata(address author) internal pure returns (bytes memory) {
        // What the production forwarder passes: 62 bytes plus the two-byte report id.
        return abi.encodePacked(bytes32(uint256(1)), WORKFLOW_NAME, author, bytes2(0));
    }

    function _report(address a, address b) internal pure returns (bytes memory) {
        address[] memory targets = new address[](2);
        targets[0] = a;
        targets[1] = b;
        uint8[] memory sev = new uint8[](2);
        sev[0] = 3;
        sev[1] = 3;
        string[] memory reasons = new string[](2);
        reasons[0] = "SCAMSNIFFER_BLACKLIST";
        reasons[1] = "SCAMSNIFFER_BLACKLIST";
        return abi.encode(targets, sev, reasons);
    }

    function test_forwarderReportReachesRegistry() public {
        vm.prank(forwarder);
        receiver.onReport(_metadata(workflowOwner), _report(drainer, phisher));
        (bool flagged, uint8 severity, string memory reason) = reg.isFlagged(drainer);
        assertTrue(flagged);
        assertEq(severity, 3);
        assertEq(reason, "SCAMSNIFFER_BLACKLIST");
        (flagged,,) = reg.isFlagged(phisher);
        assertTrue(flagged);
    }

    function test_onlyForwarderReports() public {
        vm.prank(other);
        vm.expectRevert(ReputationOracleReceiver.NotForwarder.selector);
        receiver.onReport(_metadata(workflowOwner), _report(drainer, phisher));
        vm.prank(owner);
        vm.expectRevert(ReputationOracleReceiver.NotForwarder.selector);
        receiver.onReport(_metadata(workflowOwner), _report(drainer, phisher));
    }

    function test_anotherWorkflowOwnerIsRefused() public {
        vm.prank(forwarder);
        vm.expectRevert(
            abi.encodeWithSelector(ReputationOracleReceiver.WrongWorkflowOwner.selector, other)
        );
        receiver.onReport(_metadata(other), _report(drainer, phisher));
    }

    function test_shortMetadataIsRefusedWhenTheOwnerIsChecked() public {
        vm.prank(forwarder);
        vm.expectRevert(ReputationOracleReceiver.InvalidMetadata.selector);
        receiver.onReport("", _report(drainer, phisher));
    }

    function test_noMetadataIsFineWhenTheCheckIsOff() public {
        vm.prank(owner);
        receiver.setWorkflowOwner(address(0));
        vm.prank(forwarder);
        receiver.onReport("", _report(drainer, phisher));
        (bool flagged,,) = reg.isFlagged(drainer);
        assertTrue(flagged);
    }

    function test_protectedTargetStopsTheWholeReport() public {
        address[] memory protect = new address[](1);
        protect[0] = router;
        vm.prank(owner);
        receiver.setProtected(protect, true);

        vm.prank(forwarder);
        vm.expectRevert(
            abi.encodeWithSelector(ReputationOracleReceiver.ProtectedTarget.selector, router)
        );
        receiver.onReport(_metadata(workflowOwner), _report(drainer, router));
        (bool flagged,,) = reg.isFlagged(drainer);
        assertFalse(flagged);

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(ReputationOracleReceiver.ProtectedTarget.selector, router)
        );
        receiver.ownerReport(router, 4, "X");
    }

    function test_pendingSkipsFlaggedProtectedAndZero() public {
        vm.prank(owner);
        receiver.ownerReport(drainer, 4, "DRAINER_KIT");
        address[] memory protect = new address[](1);
        protect[0] = router;
        vm.prank(owner);
        receiver.setProtected(protect, true);

        address[] memory candidates = new address[](5);
        candidates[0] = drainer;
        candidates[1] = phisher;
        candidates[2] = router;
        candidates[3] = address(0);
        candidates[4] = other;
        address[] memory out = receiver.pending(candidates);
        assertEq(out.length, 2);
        assertEq(out[0], phisher);
        assertEq(out[1], other);
    }

    function test_ownerReportWritesAndOnlyOwner() public {
        vm.prank(owner);
        receiver.ownerReport(drainer, 4, "DRAINER_KIT");
        (bool flagged, uint8 severity,) = reg.isFlagged(drainer);
        assertTrue(flagged);
        assertEq(severity, 4);

        vm.prank(other);
        vm.expectRevert(ReputationOracleReceiver.NotOwner.selector);
        receiver.ownerReport(phisher, 4, "X");
    }

    function test_registryOwnerCanStillClear() public {
        vm.prank(forwarder);
        receiver.onReport(_metadata(workflowOwner), _report(drainer, phisher));
        vm.prank(owner);
        reg.clearFlag(drainer);
        (bool flagged,,) = reg.isFlagged(drainer);
        assertFalse(flagged);
    }

    function test_supportsTheReceiverInterface() public view {
        assertTrue(receiver.supportsInterface(type(IReceiver).interfaceId));
        assertTrue(receiver.supportsInterface(0x01ffc9a7));
        assertFalse(receiver.supportsInterface(0xffffffff));
        assertEq(type(IReceiver).interfaceId, bytes4(0x805f2132));
    }

    function test_adminIsOwnerOnly() public {
        address[] memory protect = new address[](1);
        protect[0] = router;
        vm.startPrank(other);
        vm.expectRevert(ReputationOracleReceiver.NotOwner.selector);
        receiver.setForwarder(other);
        vm.expectRevert(ReputationOracleReceiver.NotOwner.selector);
        receiver.setWorkflowOwner(other);
        vm.expectRevert(ReputationOracleReceiver.NotOwner.selector);
        receiver.setProtected(protect, true);
        vm.expectRevert(ReputationOracleReceiver.NotOwner.selector);
        receiver.transferOwnership(other);
        vm.stopPrank();

        vm.startPrank(owner);
        vm.expectRevert(ReputationOracleReceiver.ZeroAddress.selector);
        receiver.setForwarder(address(0));
        receiver.setForwarder(other);
        assertEq(receiver.forwarder(), other);
        receiver.transferOwnership(other);
        assertEq(receiver.owner(), other);
        vm.stopPrank();
    }

    function test_constructorRefusesZero() public {
        vm.expectRevert(ReputationOracleReceiver.ZeroAddress.selector);
        new ReputationOracleReceiver(address(0), address(reg), forwarder, workflowOwner);
        vm.expectRevert(ReputationOracleReceiver.ZeroAddress.selector);
        new ReputationOracleReceiver(owner, address(0), forwarder, workflowOwner);
        vm.expectRevert(ReputationOracleReceiver.ZeroAddress.selector);
        new ReputationOracleReceiver(owner, address(reg), address(0), workflowOwner);
    }

    function testFuzz_ownerCheckReadsTheRightBytes(address author) public {
        vm.assume(author != workflowOwner);
        vm.prank(forwarder);
        vm.expectRevert(
            abi.encodeWithSelector(ReputationOracleReceiver.WrongWorkflowOwner.selector, author)
        );
        receiver.onReport(_metadata(author), _report(drainer, phisher));
    }
}
