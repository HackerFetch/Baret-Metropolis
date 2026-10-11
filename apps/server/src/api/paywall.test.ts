import { decodeFunctionData, type Hex, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { describe, expect, it, vi } from "vitest";
import type { PaymentSender } from "../application/review.js";
import { X402Paywall } from "../application/x402.js";
import { loadConfig } from "../config/env.js";
import { deps, FakeRpc, PEER, USDC } from "../testing/fake.js";
import { buildApp } from "./app.js";

const payer = privateKeyToAccount(`0x${"42".repeat(32)}`);
const HASH = `0x${"cd".repeat(32)}` as Hex;
const NOW = Date.parse("2026-10-11T12:00:00Z");
const PRICE = 50_000n;
const ABI = parseAbi([
  "function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)",
]);

interface Over {
  to?: string;
  value?: bigint;
  validBefore?: number;
  validAfter?: number;
  nonce?: Hex;
  chainId?: number;
  from?: string;
}

/** An X-PAYMENT header as a client builds it from the 402's requirements. */
async function header(over: Over = {}): Promise<string> {
  const authorization = {
    from: payer.address,
    to: over.to ?? PEER,
    value: (over.value ?? PRICE).toString(),
    validAfter: String(over.validAfter ?? 0),
    validBefore: String(over.validBefore ?? Math.floor(NOW / 1000) + 600),
    nonce: over.nonce ?? (`0x${"07".repeat(32)}` as Hex),
  };
  const signature = await payer.signTypedData({
    domain: { name: "USDC", version: "2", chainId: over.chainId ?? 10143, verifyingContract: USDC },
    types: {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "TransferWithAuthorization",
    message: {
      from: payer.address,
      to: authorization.to as Hex,
      value: BigInt(authorization.value),
      validAfter: BigInt(authorization.validAfter),
      validBefore: BigInt(authorization.validBefore),
      nonce: authorization.nonce,
    },
  });
  return Buffer.from(
    JSON.stringify({
      x402Version: 1,
      scheme: "exact",
      network: "monad-testnet",
      payload: { signature, authorization: { ...authorization, from: over.from ?? payer.address } },
    }),
  ).toString("base64");
}

async function setup(
  over: { used?: boolean; send?: PaymentSender; dailyLimit?: number; paywall?: boolean } = {},
) {
  const send = vi.fn(over.send ?? (async () => ({ hash: HASH, status: "confirmed" as const })));
  const used = vi.fn(async () => over.used ?? false);
  const paywall = new X402Paywall({
    chainId: 10143,
    asset: USDC,
    domain: { name: "USDC", version: "2" },
    payTo: PEER,
    price: PRICE,
    dailyLimit: over.dailyLimit ?? 300,
    used,
    send,
    now: () => NOW,
  });
  const app = await buildApp({
    ...deps(new FakeRpc()),
    paywall: over.paywall === false ? null : paywall,
  });
  const get = (payment?: string) =>
    app.inject({
      method: "GET",
      url: "/demo/paywall?q=what%20is%20x402",
      ...(payment ? { headers: { "x-payment": payment } } : {}),
    });
  return { app, send, used, get };
}

describe("GET /demo/paywall (x402)", () => {
  it("asks for payment first: 402 with exactly what to pay", async () => {
    const { get, send } = await setup();
    const res = await get();
    expect(res.statusCode).toBe(402);
    expect(res.json()).toEqual({
      x402Version: 1,
      error: "X-PAYMENT header is required",
      accepts: [
        {
          scheme: "exact",
          network: "monad-testnet",
          maxAmountRequired: "50000",
          resource: "/demo/paywall?q=what%20is%20x402",
          description: expect.any(String),
          mimeType: "application/json",
          payTo: PEER,
          maxTimeoutSeconds: 600,
          asset: USDC,
          extra: { name: "USDC", version: "2" },
        },
      ],
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("settles a good payment on-chain, then serves the answer with a receipt", async () => {
    const { get, send } = await setup();
    const res = await get(await header());
    expect(res.statusCode).toBe(200);
    expect(res.json().answer.length).toBeGreaterThan(20);
    expect(res.json().payment).toEqual({
      success: true,
      transaction: HASH,
      network: "monad-testnet",
      payer: payer.address,
      amount: "50000",
    });
    const receipt = JSON.parse(
      Buffer.from(String(res.headers["x-payment-response"]), "base64").toString("utf8"),
    );
    expect(receipt).toMatchObject({ success: true, transaction: HASH, payer: payer.address });

    // The transfer it submitted is the one the payer signed, to the token itself.
    const call = send.mock.calls[0]?.[0];
    expect(call?.to).toBe(USDC);
    const decoded = decodeFunctionData({ abi: ABI, data: call?.data as Hex });
    expect(decoded.args.slice(0, 3)).toEqual([payer.address, PEER, PRICE]);
  });

  it("answers 402 again, and sends nothing, for a payment it does not take", async () => {
    const { get, send } = await setup();
    const refused = async (payment: string, reason: RegExp) => {
      const res = await get(payment);
      expect(res.statusCode).toBe(402);
      expect(res.json().error).toMatch(reason);
      expect(res.json().accepts).toHaveLength(1);
    };
    await refused("not base64 json", /base64 JSON/);
    await refused(await header({ to: USDC }), /another address/);
    await refused(await header({ value: PRICE - 1n }), /price/);
    await refused(await header({ value: PRICE + 1n }), /price/);
    await refused(await header({ validBefore: Math.floor(NOW / 1000) + 5 }), /expired/);
    await refused(await header({ validAfter: Math.floor(NOW / 1000) + 60 }), /not valid yet/);
    // Signed for another chain: the signature does not recover to the payer here.
    await refused(await header({ chainId: 143 }), /not signed by its payer/);
    // Another account named as the payer of a signature that is not theirs.
    await refused(await header({ from: PEER }), /not signed by its payer/);
    expect(send).not.toHaveBeenCalled();
  });

  it("does not take the same authorisation twice", async () => {
    const spent = await setup({ used: true });
    const res = await spent.get(await header());
    expect(res.statusCode).toBe(402);
    expect(res.json().error).toMatch(/already used/);
    expect(spent.send).not.toHaveBeenCalled();
  });

  it("serves nothing when the transfer does not land", async () => {
    const failing = await setup({ send: async () => ({ hash: null, status: "failed" }) });
    const res = await failing.get(await header());
    expect(res.statusCode).toBe(502);
    expect(res.json().answer).toBeUndefined();
    const late = await setup({ send: async () => ({ hash: HASH, status: "timeout" }) });
    expect((await late.get(await header())).statusCode).toBe(502);
  });

  it("stops at the daily cap, and answers 503 when it is not configured", async () => {
    const capped = await setup({ dailyLimit: 1 });
    expect((await capped.get(await header())).statusCode).toBe(200);
    const second = await capped.get(await header({ nonce: `0x${"08".repeat(32)}` as Hex }));
    expect(second.statusCode).toBe(429);
    const off = await setup({ paywall: false });
    expect((await off.get()).statusCode).toBe(503);
    const ready = await off.app.inject({ method: "GET", url: "/health/ready" });
    expect(ready.json().networks[0].configured.x402).toBe(false);
  });
});

describe("x402 config", () => {
  const base = { MONAD_TESTNET_RPC_URL: "https://rpc.example", MONAD_TESTNET_USDC_ADDRESS: USDC };
  const key = `0x${"33".repeat(32)}`;

  it("needs testnet USDC and a key to pay gas with; the sealed relayer's key will do", () => {
    expect(loadConfig(base).x402).toBeNull();
    expect(
      loadConfig({
        MONAD_TESTNET_RPC_URL: "https://rpc.example",
        BARET_X402_FACILITATOR_PRIVATE_KEY: key,
      }).x402,
    ).toBeNull();
    expect(loadConfig({ ...base, BARET_SEALED_RELAYER_PRIVATE_KEY: key }).x402).toMatchObject({
      asset: USDC,
      price: 50_000n,
      facilitatorPrivateKey: key,
    });
    const own = `0x${"44".repeat(32)}`;
    const both = loadConfig({
      ...base,
      BARET_SEALED_RELAYER_PRIVATE_KEY: key,
      BARET_X402_FACILITATOR_PRIVATE_KEY: own,
    });
    expect(both.x402?.facilitatorPrivateKey).toBe(own);
  });
});
