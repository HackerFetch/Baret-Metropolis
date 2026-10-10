import type { WebAuthnClient } from "@category-labs/mera";
import {
  bytesToHex,
  hexToBytes,
  keccak256,
  recoverTypedDataAddress,
  stringToBytes,
  toHex,
} from "viem";
import { describe, expect, it } from "vitest";
import { agentKeyFromPasskey, agentSalt, unlockWallet } from "./account.js";
import {
  SEALED_MAX_BYTES,
  SEALED_PUT_TYPES,
  SealedKeys,
  sealedDomain,
  sealedKeysFromPasskey,
  sealedSalt,
} from "./sealed.js";

const PRF = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
const STORE = "0xC094af68bE1039f70E1362C2f326542BB2DC21BB";
const TARGET = { store: STORE, chainId: 10143 } as const;
const text = (value: string) => stringToBytes(value);

/** A passkey authenticator in memory: one credential, PRF output fixed per salt. */
function fakeAuthenticator(seen?: Uint8Array[]): WebAuthnClient {
  const id = Uint8Array.from([9, 9, 9, 9]);
  const prf = (salt: Uint8Array) =>
    Uint8Array.from(PRF, (b, i) => b ^ (salt[i % salt.length] ?? 0));
  return {
    createCredential: async (request) => ({
      credentialId: id,
      transports: ["internal"],
      prfEnabled: true,
      prfOutput: prf(request.prfSalt),
    }),
    getCredential: async (request) => {
      seen?.push(Uint8Array.from(request.prfSalt));
      return { credentialId: id, prfOutput: prf(request.prfSalt) } as Awaited<
        ReturnType<WebAuthnClient["getCredential"]>
      >;
    },
  };
}

describe("SealedKeys", () => {
  it("opens what it sealed, and a second device with the same output opens it too", async () => {
    const here = await SealedKeys.fromPrf(PRF);
    const blob = await here.seal(text('{"template":"strict"}'), 3n);
    const there = await SealedKeys.fromPrf(PRF);
    expect(there.id).toBe(here.id);
    expect(new TextDecoder().decode(await there.open(blob, 3n))).toBe('{"template":"strict"}');
  });

  it("never seals the same bytes twice", async () => {
    const keys = await SealedKeys.fromPrf(PRF);
    const first = await keys.seal(text("rules"), 1n);
    expect(await keys.seal(text("rules"), 1n)).not.toBe(first);
    expect(first).not.toContain(toHex("rules").slice(2));
  });

  it("refuses an entry moved to another version, another id, or changed", async () => {
    const keys = await SealedKeys.fromPrf(PRF);
    const blob = await keys.seal(text("rules"), 2n);
    // An older blob served as the current version.
    await expect(keys.open(blob, 3n)).rejects.toThrow();
    // Another passkey's keys.
    const other = await SealedKeys.fromPrf(Uint8Array.from(PRF, (b) => b ^ 0xff));
    expect(other.id).not.toBe(keys.id);
    await expect(other.open(blob, 2n)).rejects.toThrow();
    // One bit flipped in storage.
    const bytes = hexToBytes(blob);
    bytes[bytes.length - 1] = (bytes[bytes.length - 1] ?? 0) ^ 1;
    await expect(keys.open(bytesToHex(bytes), 2n)).rejects.toThrow();
    await expect(keys.open("0x02aabbccddeeff00112233445566778899", 2n)).rejects.toThrow(
      /not a sealed entry/,
    );
  });

  it("signs a write the store's digest recovers to its id", async () => {
    const keys = await SealedKeys.fromPrf(PRF);
    const put = await keys.put(TARGET, 7n, text("rules"));
    expect(put.id).toBe(keys.id);
    expect(put.version).toBe("7");
    const signer = await recoverTypedDataAddress({
      domain: sealedDomain(STORE, 10143),
      types: SEALED_PUT_TYPES,
      primaryType: "Put",
      message: { id: put.id, version: 7n, blobHash: keccak256(put.blob) },
      signature: put.signature,
    });
    expect(signer).toBe(keys.id);
    // The same write on another chain or store is another digest.
    const elsewhere = await recoverTypedDataAddress({
      domain: sealedDomain(STORE, 143),
      types: SEALED_PUT_TYPES,
      primaryType: "Put",
      message: { id: put.id, version: 7n, blobHash: keccak256(put.blob) },
      signature: put.signature,
    });
    expect(elsewhere).not.toBe(keys.id);
    expect(await keys.open(put.blob, 7n)).toEqual(text("rules"));
  });

  it("will not seal more than the store takes", async () => {
    const keys = await SealedKeys.fromPrf(PRF);
    await expect(keys.seal(new Uint8Array(SEALED_MAX_BYTES), 1n)).rejects.toThrow(/too large/);
    const fits = await keys.seal(new Uint8Array(SEALED_MAX_BYTES - 29), 1n);
    expect(hexToBytes(fits).length).toBe(SEALED_MAX_BYTES);
  });

  it("cannot seal, open or sign once forgotten", async () => {
    const keys = await SealedKeys.fromPrf(PRF);
    const blob = await keys.seal(text("rules"), 1n);
    keys.forget();
    expect(keys.forgotten).toBe(true);
    await expect(keys.seal(text("rules"), 1n)).rejects.toThrow(/forgotten/);
    await expect(keys.open(blob, 1n)).rejects.toThrow(/forgotten/);
    await expect(keys.put(TARGET, 1n, text("rules"))).rejects.toThrow(/forgotten/);
  });

  it("takes exactly 32 bytes", async () => {
    await expect(SealedKeys.fromPrf(new Uint8Array(31))).rejects.toThrow(/32 bytes/);
  });
});

describe("the sealed namespace", () => {
  it("asks the passkey with its own salt, the same on every device", async () => {
    const seen: Uint8Array[] = [];
    const options = { rpId: "wallet.example", webAuthnClient: fakeAuthenticator(seen) };
    const here = await sealedKeysFromPasskey(options);
    const there = await sealedKeysFromPasskey({
      rpId: "wallet.example",
      webAuthnClient: fakeAuthenticator(),
    });
    expect(there.id).toBe(here.id);
    expect(seen).toEqual([sealedSalt()]);
    expect(sealedSalt()).toHaveLength(32);
    expect(sealedSalt()).not.toEqual(agentSalt(0));
    expect(await there.open(await here.seal(text("rules"), 1n), 1n)).toEqual(text("rules"));
  });

  it("shares nothing with the wallet's account or an agent's key", async () => {
    const options = { rpId: "wallet.example", webAuthnClient: fakeAuthenticator() };
    const sealed = await sealedKeysFromPasskey(options);
    const { session } = await unlockWallet(options);
    const agent = await agentKeyFromPasskey(options, 0);
    const ids = [sealed.id, session.address, session.agentAddress(0), agent.address];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
