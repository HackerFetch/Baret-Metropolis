import type { AnalyzeRequest, AnalyzeResponse } from "@baret/guard";
import { type Hex, recoverTypedDataAddress } from "viem";
import { describe, expect, it, vi } from "vitest";
import { GuardBlockedError } from "./errors.js";
import { localSigner } from "./signer.js";
import { payX402, X402Error } from "./x402.js";

// A throwaway test key (the first Anvil account); it guards nothing.
const KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const MERCHANT = "0x1365566191bAA9872A64AcDce963751d5343ff49";
const USDC = "0x534b2f3A21130d7a60830c2Df862319e593943A3";
const URL_ = "https://merchant.example/answer?q=hi";
const HASH = `0x${"ab".repeat(32)}`;

const terms = (over: Record<string, unknown> = {}) => ({
  scheme: "exact",
  network: "monad-testnet",
  maxAmountRequired: "50000",
  payTo: MERCHANT,
  asset: USDC,
  maxTimeoutSeconds: 600,
  extra: { name: "USDC", version: "2" },
  ...over,
});

function setup(decision: AnalyzeResponse["decision"] = "safe", accepts: unknown[] = [terms()]) {
  const signer = localSigner(KEY);
  const signTypedData = vi.fn(signer.signTypedData);
  const asked: AnalyzeRequest[] = [];
  const guard = {
    evaluate: async (request: AnalyzeRequest) => {
      asked.push(request);
      return { decision, findings: [] } as unknown as AnalyzeResponse;
    },
  };
  const calls: (RequestInit | undefined)[] = [];
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
    calls.push(init);
    if (!new Headers(init?.headers).has("x-payment")) {
      return Response.json({ x402Version: 1, accepts }, { status: 402 });
    }
    const receipt = {
      success: true,
      transaction: HASH,
      network: "monad-testnet",
      payer: signer.address,
    };
    return Response.json(
      { answer: "42" },
      { headers: { "x-payment-response": btoa(JSON.stringify(receipt)) } },
    );
  }) as unknown as typeof fetch;
  const options = {
    signer: { address: signer.address, signTypedData },
    guard,
    fetch: fetcher,
    now: () => 1_000,
  };
  return { signer, signTypedData, asked, calls, options };
}

describe("payX402", () => {
  it("asks Baret about the exact payment, then signs it and gets the resource", async () => {
    const t = setup();
    const paid = await payX402(URL_, t.options);
    expect(paid.response.status).toBe(200);
    expect(await paid.response.json()).toEqual({ answer: "42" });
    expect(paid.receipt?.transaction).toBe(HASH);
    expect(paid.spend).toEqual({ amount: "50000", timestamp: 1_000 });

    // What Baret saw: the message itself, and the 402's terms beside it.
    const request = t.asked[0];
    expect(request?.payment).toMatchObject({
      origin: "https://merchant.example",
      payTo: MERCHANT,
      asset: USDC,
      amount: "50000",
    });
    expect(request?.typedData?.message).toMatchObject({
      to: MERCHANT,
      value: "50000",
      validBefore: "1600",
    });

    // What the server got: that same message, signed by the payer.
    const sent = JSON.parse(atob(new Headers(t.calls[1]?.headers).get("x-payment") ?? ""));
    expect(sent).toMatchObject({ x402Version: 1, scheme: "exact", network: "monad-testnet" });
    expect(sent.payload.authorization).toEqual(request?.typedData?.message);
    const typed = request?.typedData;
    const recovered = await recoverTypedDataAddress({
      domain: typed?.domain,
      types: typed?.types,
      primaryType: "TransferWithAuthorization",
      message: {
        ...sent.payload.authorization,
        value: 50_000n,
        validAfter: 0n,
        validBefore: 1_600n,
      },
      signature: sent.payload.signature as Hex,
    } as never);
    expect(recovered).toBe(t.signer.address);
  });

  it("signs nothing when Baret does not clear the payment", async () => {
    const blocked = setup("blocked");
    await expect(payX402(URL_, blocked.options)).rejects.toBeInstanceOf(GuardBlockedError);
    expect(blocked.signTypedData).not.toHaveBeenCalled();
    const caution = setup("caution");
    await expect(payX402(URL_, caution.options)).rejects.toBeInstanceOf(GuardBlockedError);
    expect(caution.signTypedData).not.toHaveBeenCalled();
    const allowed = await payX402(URL_, { ...caution.options, allowCaution: true });
    expect(allowed.response.status).toBe(200);
  });

  it("refuses a 402 it cannot pay as asked, before Baret or the key see it", async () => {
    const dear = setup();
    await expect(payX402(URL_, { ...dear.options, maxAmount: 49_999n })).rejects.toBeInstanceOf(
      X402Error,
    );
    const elsewhere = setup("safe", [
      terms({ network: "somewhere-else" }),
      terms({ scheme: "upto" }),
    ]);
    await expect(payX402(URL_, elsewhere.options)).rejects.toBeInstanceOf(X402Error);
    const broken = setup("safe", [terms({ payTo: "not an address" })]);
    await expect(payX402(URL_, broken.options)).rejects.toBeInstanceOf(X402Error);
    for (const t of [dear, elsewhere, broken]) {
      expect(t.asked).toHaveLength(0);
      expect(t.signTypedData).not.toHaveBeenCalled();
    }
  });

  it("passes a free resource through, and uses a new nonce for every payment", async () => {
    const t = setup();
    const free = await payX402(URL_, {
      ...t.options,
      fetch: (async () => Response.json({ ok: 1 })) as typeof fetch,
    });
    expect(free).toMatchObject({ requirements: null, verdict: null, receipt: null, spend: null });
    await payX402(URL_, t.options);
    await payX402(URL_, t.options);
    const nonces = t.asked.map((r) => r.typedData?.message.nonce);
    expect(nonces[0]).not.toBe(nonces[1]);
  });
});
