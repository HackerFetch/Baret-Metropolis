// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {SealedStore} from "../src/SealedStore.sol";

contract SealedStoreTest is Test {
    SealedStore store;
    uint256 constant KEY = 0xA11CE;
    uint256 constant OTHER_KEY = 0xB0B;
    address id;
    address relayer = makeAddr("relayer");

    event Sealed(address indexed id, uint64 version, uint256 size);

    function setUp() public {
        store = new SealedStore();
        id = vm.addr(KEY);
    }

    function _sign(uint256 key, address who, uint64 version, bytes memory blob)
        internal
        view
        returns (bytes memory)
    {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, store.digest(who, version, keccak256(blob)));
        return abi.encodePacked(r, s, v);
    }

    function test_anyoneRelaysWhatTheKeySigned() public {
        bytes memory blob = hex"0102030405";
        bytes memory sig = _sign(KEY, id, 1, blob);
        vm.expectEmit(true, false, false, true);
        emit Sealed(id, 1, blob.length);
        vm.prank(relayer);
        store.put(id, 1, blob, sig);
        (uint64 version, bytes memory got) = store.get(id);
        assertEq(version, 1);
        assertEq(got, blob);
    }

    function test_emptyEntryReadsAsVersionZero() public view {
        (uint64 version, bytes memory got) = store.get(id);
        assertEq(version, 0);
        assertEq(got.length, 0);
    }

    function test_newerVersionReplaces() public {
        store.put(id, 1, hex"aa", _sign(KEY, id, 1, hex"aa"));
        store.put(id, 5, hex"bbbb", _sign(KEY, id, 5, hex"bbbb"));
        (uint64 version, bytes memory got) = store.get(id);
        assertEq(version, 5);
        assertEq(got, hex"bbbb");
    }

    function test_olderOrSameVersionIsRefused() public {
        bytes memory first = _sign(KEY, id, 2, hex"aa");
        store.put(id, 2, hex"aa", first);
        // The same signed write again: a replay.
        vm.expectRevert(SealedStore.StaleVersion.selector);
        store.put(id, 2, hex"aa", first);
        bytes memory older = _sign(KEY, id, 1, hex"cc");
        vm.expectRevert(SealedStore.StaleVersion.selector);
        store.put(id, 1, hex"cc", older);
    }

    function test_anotherKeyCannotWriteUnderThisId() public {
        bytes memory sig = _sign(OTHER_KEY, id, 1, hex"aa");
        vm.expectRevert(SealedStore.BadSignature.selector);
        store.put(id, 1, hex"aa", sig);
    }

    function test_signatureCoversTheBlobAndTheVersion() public {
        bytes memory sig = _sign(KEY, id, 1, hex"aa");
        vm.expectRevert(SealedStore.BadSignature.selector);
        store.put(id, 1, hex"ab", sig);
        vm.expectRevert(SealedStore.BadSignature.selector);
        store.put(id, 2, hex"aa", sig);
    }

    function test_signatureIsBoundToThisContract() public {
        SealedStore second = new SealedStore();
        bytes memory sig = _sign(KEY, id, 1, hex"aa");
        vm.expectRevert(SealedStore.BadSignature.selector);
        second.put(id, 1, hex"aa", sig);
    }

    function test_malleableAndMalformedSignaturesAreRefused() public {
        bytes memory blob = hex"aa";
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(KEY, store.digest(id, 1, keccak256(blob)));
        uint256 order = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;
        bytes memory twin = abi.encodePacked(r, bytes32(order - uint256(s)), v == 27 ? 28 : 27);
        vm.expectRevert(SealedStore.BadSignature.selector);
        store.put(id, 1, blob, twin);
        vm.expectRevert(SealedStore.BadSignature.selector);
        store.put(id, 1, blob, abi.encodePacked(r, s));
        vm.expectRevert(SealedStore.BadSignature.selector);
        store.put(id, 1, blob, abi.encodePacked(r, s, uint8(0)));
    }

    function test_sizeLimits() public {
        uint256 max = store.MAX_SIZE();
        bytes memory emptySig = _sign(KEY, id, 1, "");
        vm.expectRevert(SealedStore.EmptyBlob.selector);
        store.put(id, 1, "", emptySig);
        bytes memory big = new bytes(max + 1);
        bytes memory bigSig = _sign(KEY, id, 1, big);
        vm.expectRevert(SealedStore.BlobTooLarge.selector);
        store.put(id, 1, big, bigSig);
        bytes memory full = new bytes(max);
        store.put(id, 1, full, _sign(KEY, id, 1, full));
        (, bytes memory got) = store.get(id);
        assertEq(got.length, max);
    }

    function test_aShorterBlobLeavesNothingOfTheLongerOne() public {
        bytes memory long = new bytes(200);
        for (uint256 i; i < long.length; ++i) {
            long[i] = 0xff;
        }
        store.put(id, 1, long, _sign(KEY, id, 1, long));
        store.put(id, 2, hex"01", _sign(KEY, id, 2, hex"01"));
        (, bytes memory got) = store.get(id);
        assertEq(got, hex"01");
    }

    function testFuzz_roundTrip(uint256 key, uint64 version, bytes calldata blob) public {
        key = bound(key, 1, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364140);
        vm.assume(version > 0 && blob.length > 0 && blob.length <= store.MAX_SIZE());
        address who = vm.addr(key);
        store.put(who, version, blob, _sign(key, who, version, blob));
        (uint64 v, bytes memory got) = store.get(who);
        assertEq(v, version);
        assertEq(got, blob);
    }
}
