// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title Baret SealedStore
 * @notice Untrusted storage for ciphertext a passkey can open again.
 *
 * The Baret wallet seals a person's rules and merchant names with a key that
 * comes from its own passkey namespace, and keeps the ciphertext here so any
 * device with the same passkey can read it back. The contract never sees a
 * key or a plaintext, and it does not know which wallet account an entry
 * belongs to: an entry is filed under `id`, the address of a signing key from
 * the same namespace.
 *
 * Anyone may submit a write (a relayer pays the gas), but only the holder of
 * `id`'s key can authorise one: {put} takes that key's EIP-712 signature over
 * the entry's version and the hash of its blob. Versions only go up, so a
 * relayer cannot replay an older blob over a newer one.
 */
contract SealedStore {
    /// @notice The longest blob an entry may hold, in bytes.
    uint256 public constant MAX_SIZE = 2048;

    bytes32 private constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 public constant PUT_TYPEHASH =
        keccak256("Put(address id,uint64 version,bytes32 blobHash)");
    /// @dev secp256k1n / 2: a signature's `s` above it is the malleable twin.
    uint256 private constant HALF_ORDER =
        0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;

    struct Entry {
        uint64 version;
        bytes blob;
    }

    mapping(address id => Entry) private _entries;

    error EmptyBlob();
    error BlobTooLarge();
    error StaleVersion();
    error BadSignature();

    event Sealed(address indexed id, uint64 version, uint256 size);

    /// @notice The EIP-712 domain separator of this contract on this chain.
    function domainSeparator() public view returns (bytes32) {
        return keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256("Baret SealedStore"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }

    /// @notice The digest `id`'s key signs to authorise {put}.
    function digest(address id, uint64 version, bytes32 blobHash) public view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                "\x19\x01",
                domainSeparator(),
                keccak256(abi.encode(PUT_TYPEHASH, id, version, blobHash))
            )
        );
    }

    /**
     * @notice Stores `blob` under `id`, replacing the entry before it.
     * @param id The address of the key that signed.
     * @param version Higher than the stored version.
     * @param blob The ciphertext, at most {MAX_SIZE} bytes.
     * @param signature 65 bytes, `r || s || v`, over {digest}.
     */
    function put(address id, uint64 version, bytes calldata blob, bytes calldata signature)
        external
    {
        if (blob.length == 0) revert EmptyBlob();
        if (blob.length > MAX_SIZE) revert BlobTooLarge();
        Entry storage entry = _entries[id];
        if (version <= entry.version) revert StaleVersion();
        if (_recover(digest(id, version, keccak256(blob)), signature) != id) revert BadSignature();

        entry.version = version;
        entry.blob = blob;
        emit Sealed(id, version, blob.length);
    }

    /// @notice The entry under `id`: version 0 and an empty blob when there is none.
    function get(address id) external view returns (uint64 version, bytes memory blob) {
        Entry storage entry = _entries[id];
        return (entry.version, entry.blob);
    }

    function _recover(bytes32 hash, bytes calldata signature) private pure returns (address) {
        if (signature.length != 65) return address(0);
        bytes32 r = bytes32(signature[0:32]);
        bytes32 s = bytes32(signature[32:64]);
        uint8 v = uint8(signature[64]);
        if (uint256(s) > HALF_ORDER) return address(0);
        if (v != 27 && v != 28) return address(0);
        return ecrecover(hash, v, r, s);
    }
}
