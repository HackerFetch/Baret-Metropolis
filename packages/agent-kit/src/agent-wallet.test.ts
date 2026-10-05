import { type AnalyzeResponse, GuardUnreachableError } from "@baret/guard";
import { decodeFunctionData, keccak256, parseTransaction, stringToHex } from "viem";
import { describe, expect, it } from "vitest";
import { PAYMENT_GUARD_ABI } from "./abi.js";
import { AgentWallet, type ChainClient, payCall } from "./agent-wallet.js";
import { GuardBlockedError } from "./errors.js";
import { type AgentSigner, localSigner } from "./signer.js";

// A throwaway test key (the first Anvil account); it guards nothing.
const KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const VAULT = "0x0A82671420114E47c672D5e8e23017DdCE850A35";
const MERCHANT = "0x1365566191bAA9872A64AcDce963751d5343ff49";

const verdict = (decision: AnalyzeResponse["decision"], codes: string[] = []): AnalyzeResponse =>
  ({
    decision,
    findings: codes.map((code) => ({ code, severity: "high", values: {}, blocking: true })),
    firedRules: [],
    suggestions: [],
    confidence: "high",
    estimatedChanges: [],
    approvals: [],
    sources: [],
    expiresAt: new Date().toISOString(),
    meta: {
      requestId: "t",
      analysisVersion: "1",
      network: "testnet",
      chainId: 10143,
      analyzedAt: new Date().toISOString(),
      blockNumber: "1",
      traced: true,
    },
  }) as AnalyzeResponse;

function setup(answer: AnalyzeResponse | Error, options: { allowCaution?: boolean } = {}) {
  const asked: unknown[] = [];
  const signed: unknown[] = [];
  const sent: string[] = [];
  const inner = localSigner(KEY);
  const signer: AgentSigner = {
    address: inner.address,
    signTransaction: (tx) => {
      signed.push(tx);
      return inner.signTransaction(tx);
    },
  };
  const chain: ChainClient = {
    prepare: async (_from, call) => ({
      chainId: 10143,
      type: "eip1559",
      to: call.to,
      data: call.data ?? "0x",
      value: call.value ?? 0n,
      nonce: 7,
      gas: 100_000n,
      maxFeePerGas: 100n,
      maxPriorityFeePerGas: 1n,
    }),
    send: async (raw) => {
      sent.push(raw);
      return keccak256(raw);
    },
  };
  const wallet = new AgentWallet({
    signer,
    baretUrl: "http://unused",
    chain,
    policyTemplate: "balanced",
    ...options,
    guard: {
      evaluate: async (req) => {
        asked.push(req);
        if (answer instanceof Error) throw answer;
        return answer;
      },
    },
  });
  return { wallet, asked, signed, sent };
}

const payment = {
  vault: VAULT,
  merchant: MERCHANT,
  amount: 250_000n,
  reference: "invoice-42",
} as const;

describe("AgentWallet", () => {
  it("signs and sends what Baret clears, and asks about the exact call first", async () => {
    const { wallet, asked, sent } = setup(verdict("safe"));
    const { hash, verdict: v } = await wallet.pay(payment);
    expect(v.decision).toBe("safe");
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);

    expect(asked[0]).toMatchObject({
      network: "testnet",
      userWallet: wallet.address,
      policyTemplate: "balanced",
      transaction: { from: wallet.address, to: VAULT, value: "0" },
    });
    const tx = parseTransaction(sent[0] as `0x${string}`);
    expect(tx.to?.toLowerCase()).toBe(VAULT.toLowerCase());
    expect(tx.chainId).toBe(10143);
    expect(decodeFunctionData({ abi: PAYMENT_GUARD_ABI, data: tx.data as `0x${string}` })).toEqual({
      functionName: "pay",
      args: [MERCHANT, 250_000n, keccak256(stringToHex("invoice-42"))],
    });
  });

  it("signs nothing when Baret blocks", async () => {
    const { wallet, signed, sent } = setup(verdict("blocked", ["SIMULATION_FAILED"]));
    const err = await wallet.pay(payment).catch((e) => e);
    expect(err).toBeInstanceOf(GuardBlockedError);
    expect(err.message).toContain("SIMULATION_FAILED");
    expect(err.verdict.decision).toBe("blocked");
    expect(signed).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it("treats a Caution as not signable unless the operator allows it", async () => {
    const cautious = setup(verdict("caution", ["X402_DESTINATION_MISMATCH"]));
    await expect(cautious.wallet.pay(payment)).rejects.toBeInstanceOf(GuardBlockedError);
    expect(cautious.signed).toHaveLength(0);

    const allowed = setup(verdict("caution", ["ERC20_APPROVAL_GRANTED"]), { allowCaution: true });
    await allowed.wallet.pay(payment);
    expect(allowed.sent).toHaveLength(1);
  });

  it("signs nothing when Baret cannot be reached", async () => {
    const { wallet, signed } = setup(new GuardUnreachableError("Baret did not answer"));
    await expect(wallet.pay(payment)).rejects.toBeInstanceOf(GuardUnreachableError);
    expect(signed).toHaveLength(0);
  });

  it("can check without signing", async () => {
    const { wallet, signed } = setup(verdict("blocked", ["KNOWN_MALICIOUS_ADDRESS"]));
    const v = await wallet.evaluate(payCall(payment));
    expect(wallet.allows(v)).toBe(false);
    expect(signed).toHaveLength(0);
  });

  it("needs a way to reach the chain", () => {
    expect(() => new AgentWallet({ signer: localSigner(KEY), baretUrl: "http://x" })).toThrow(
      /rpcUrl/,
    );
  });
});
