import { SealedKeys } from "@baret/wallet-core";
import { decodeFunctionData, type Hex, parseAbi, stringToBytes } from "viem";
import { describe, expect, it, vi } from "vitest";
import type { PaymentSender } from "../application/review.js";
import { SEALED_MAX_BYTES, SealedRelay } from "../application/sealed.js";
import { loadConfig } from "../config/env.js";
import { deps, FakeRpc } from "../testing/fake.js";
import { buildApp } from "./app.js";

const STORE = "0xC094af68bE1039f70E1362C2f326542BB2DC21BB";
const TARGET = { store: STORE, chainId: 10143 } as const;
const HASH = `0x${"ab".repeat(32)}` as Hex;
const PRF = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
const PUT_ABI = parseAbi(["function put(address id, uint64 version, bytes blob, bytes signature)"]);

const confirmed: PaymentSender = async () => ({ hash: HASH, status: "confirmed" });

async function setup(
  over: { stored?: bigint; send?: PaymentSender; dailyLimit?: number; relay?: boolean } = {},
) {
  const send = vi.fn(over.send ?? confirmed);
  const current = vi.fn(async () => over.stored ?? 0n);
  const relay = new SealedRelay({
    store: STORE,
    chainId: 10143,
    dailyLimit: over.dailyLimit ?? 200,
    current,
    send,
  });
  const app = await buildApp({
    ...deps(new FakeRpc()),
    sealed: over.relay === false ? null : relay,
  });
  const keys = await SealedKeys.fromPrf(PRF);
  const post = (payload: Record<string, unknown>) =>
    app.inject({ method: "POST", url: "/v1/sealed", payload });
  return { app, keys, send, current, post };
}

describe("POST /v1/sealed", () => {
  it("relays a write its id's key signed, exactly as it was signed", async () => {
    const { keys, send, post } = await setup({ stored: 2n });
    const put = await keys.put(TARGET, 3n, stringToBytes('{"template":"strict"}'));
    const res = await post({ ...put });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: keys.id, version: "3", hash: HASH });
    expect(send).toHaveBeenCalledTimes(1);
    const call = send.mock.calls[0]?.[0];
    expect(call?.to).toBe(STORE);
    expect(call?.value).toBe(0n);
    const decoded = decodeFunctionData({ abi: PUT_ABI, data: call?.data as Hex });
    expect(decoded.args).toEqual([keys.id, 3n, put.blob, put.signature]);
  });

  it("sends nothing when the signature is another key's, or covers other bytes", async () => {
    const { keys, send, post } = await setup();
    const put = await keys.put(TARGET, 1n, stringToBytes("rules"));
    const other = await SealedKeys.fromPrf(Uint8Array.from(PRF, (b) => b ^ 0xff));
    const theirs = await other.put(TARGET, 1n, stringToBytes("rules"));

    const forged = await post({ ...theirs, id: keys.id });
    expect(forged.statusCode).toBe(400);
    expect(forged.json().error).toBe("sealed_bad_signature");
    const swapped = await post({ ...put, blob: theirs.blob });
    expect(swapped.statusCode).toBe(400);
    const moved = await post({ ...put, version: "2" });
    expect(moved.statusCode).toBe(400);
    // Signed for another store or chain: another digest.
    const elsewhere = await keys.put({ store: STORE, chainId: 143 }, 1n, stringToBytes("rules"));
    expect((await post({ ...elsewhere })).statusCode).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses a version the store already has, before spending gas", async () => {
    const { keys, send, post } = await setup({ stored: 5n });
    for (const version of [5n, 4n]) {
      const res = await post({ ...(await keys.put(TARGET, version, stringToBytes("rules"))) });
      expect(res.statusCode).toBe(409);
      expect(res.json().error).toBe("sealed_stale_version");
    }
    expect(send).not.toHaveBeenCalled();
  });

  it("takes only the exact shape, and no more than the store holds", async () => {
    const { keys, send, post } = await setup();
    const put = await keys.put(TARGET, 1n, stringToBytes("rules"));
    expect((await post({ ...put, extra: 1 })).statusCode).toBe(400);
    expect((await post({ ...put, version: "0" })).statusCode).toBe(400);
    expect((await post({ ...put, version: 1 })).statusCode).toBe(400);
    expect((await post({ ...put, blob: "0x" })).statusCode).toBe(400);
    expect((await post({ ...put, signature: "0x00" })).statusCode).toBe(400);
    expect((await post({ ...put, version: "99999999999999999999" })).statusCode).toBe(409);
    const big = await post({ ...put, blob: `0x${"00".repeat(SEALED_MAX_BYTES + 1)}` });
    expect(big.statusCode).toBe(400);
    expect(big.json().error).toBe("sealed_too_large");
    expect(send).not.toHaveBeenCalled();
  });

  it("reports a write that did not land, and a store it could not read", async () => {
    const failing = await setup({ send: async () => ({ hash: null, status: "failed" }) });
    const put = await failing.keys.put(TARGET, 1n, stringToBytes("rules"));
    expect((await failing.post({ ...put })).statusCode).toBe(502);
    const late = await setup({ send: async () => ({ hash: HASH, status: "timeout" }) });
    expect((await late.post({ ...put })).statusCode).toBe(502);

    const blind = await setup();
    blind.current.mockRejectedValueOnce(new Error("rpc down"));
    expect((await blind.post({ ...put })).statusCode).toBe(502);
    expect(blind.send).not.toHaveBeenCalled();
  });

  it("stops at the daily cap", async () => {
    const { keys, send, post } = await setup({ dailyLimit: 1 });
    const first = await post({ ...(await keys.put(TARGET, 1n, stringToBytes("a"))) });
    expect(first.statusCode).toBe(200);
    const second = await post({ ...(await keys.put(TARGET, 2n, stringToBytes("b"))) });
    expect(second.statusCode).toBe(429);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("answers 503 without a relay, and health says so", async () => {
    const off = await setup({ relay: false });
    const put = await off.keys.put(TARGET, 1n, stringToBytes("rules"));
    expect((await off.post({ ...put })).statusCode).toBe(503);
    const ready = await off.app.inject({ method: "GET", url: "/health/ready" });
    expect(ready.json().networks[0].configured.sealed).toBe(false);
    const on = await setup();
    const readyOn = await on.app.inject({ method: "GET", url: "/health/ready" });
    expect(readyOn.json().networks[0].configured.sealed).toBe(true);
  });
});

describe("sealed config", () => {
  const base = { MONAD_TESTNET_RPC_URL: "https://rpc.example" };
  const key = `0x${"22".repeat(32)}`;

  it("is on only with both the store and the relayer's key", () => {
    expect(loadConfig(base).sealed).toBeNull();
    expect(loadConfig({ ...base, MONAD_TESTNET_SEALED_STORE_ADDRESS: STORE }).sealed).toBeNull();
    expect(loadConfig({ ...base, BARET_SEALED_RELAYER_PRIVATE_KEY: key }).sealed).toBeNull();
    const on = loadConfig({
      ...base,
      MONAD_TESTNET_SEALED_STORE_ADDRESS: STORE,
      BARET_SEALED_RELAYER_PRIVATE_KEY: key,
    });
    expect(on.sealed).toEqual({ store: STORE, relayerPrivateKey: key, dailyLimit: 200 });
  });

  it("refuses a key that is not 32 bytes of hex", () => {
    expect(() => loadConfig({ ...base, BARET_SEALED_RELAYER_PRIVATE_KEY: "0x1234" })).toThrow();
  });
});
