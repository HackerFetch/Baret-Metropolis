import { describe, expect, it } from "vitest";
import {
  AGENT_VAULT,
  AUDIT_URL,
  agentPaymentsOf,
  amountText,
  DYNAMIC_AGENT,
  loadAgentPayments,
  VAULT_TOKEN,
} from "./liveAgent.js";

const OTHER_AGENT = "0xb05ac3af10934d45c44e4fcbfd01ad856729266b";
const MERCHANT = "0x1365566191baa9872a64acdce963751d5343ff49";
const HASH = "0x06a81dda28c49041c2bfa4b5c841b350021be408a4745ba5f56c07cc2b124ab3";

/**
 * GET /v1/audit/vault/0x0A82...0A35?limit=100 on the live API, 2026-10-09
 * (merchants cut to the fields this module does not read anyway): the
 * earlier test key's payment, then the Dynamic agent's after the handover.
 */
const LIVE = {
  vault: {
    id: "0x0a82671420114e47c672d5e8e23017ddce850a35",
    owner: null,
    token: "0x534b2f3a21130d7a60830c2df862319e593943a3",
    agent: "0x306707be3cd50b1cca5e27f838afcfc4fd84c353",
    deposited: "5000000",
    withdrawn: "0",
    paid: "500000",
    paymentCount: 2,
    createdAtBlock: 68462899,
    merchants: [{ address: MERCHANT }],
  },
  activity: [],
  payments: [
    {
      id: "68466682-2",
      vault_id: "0x0a82671420114e47c672d5e8e23017ddce850a35",
      merchant: MERCHANT,
      agent: "0x306707be3cd50b1cca5e27f838afcfc4fd84c353",
      amount: "250000",
      ref: "0xdabed65c2b6a65fd7db5b5844396154426ae5879103707038339f975d33e92bf",
      timestamp: 1791223039,
      block: 68466682,
      txHash: HASH,
    },
    {
      id: "68462966-75",
      vault_id: "0x0a82671420114e47c672d5e8e23017ddce850a35",
      merchant: MERCHANT,
      agent: OTHER_AGENT,
      amount: "250000",
      ref: "0xdbdd9a56ffe3f2a961ae70739d3721a89d1494641310a7fc7b8db6d0836f89bb",
      timestamp: 1791221916,
      block: 68462966,
      txHash: "0x0b01928b2ec0edc8fa325a89c702cea78268582621c4db4f16a02df8de4e845b",
    },
  ],
};

const vaultWith = (payments: unknown[], paymentCount: unknown = payments.length) => ({
  vault: { ...LIVE.vault, paymentCount },
  payments,
});
const row = (fields: Record<string, unknown> = {}) => ({
  agent: DYNAMIC_AGENT,
  merchant: MERCHANT,
  amount: "1000",
  timestamp: 1,
  ...fields,
});

describe("agentPaymentsOf", () => {
  it("reads the agent's real payment from the live answer, and only the agent's", () => {
    expect(agentPaymentsOf(LIVE, DYNAMIC_AGENT, 5)).toEqual({
      rows: [
        {
          id: "68466682-2",
          merchant: MERCHANT,
          amount: "250000",
          timestamp: 1791223039,
          txHash: HASH,
        },
      ],
      complete: true,
    });
  });

  it("matches the agent address case-insensitively", () => {
    const body = vaultWith([row({ agent: DYNAMIC_AGENT.toUpperCase().replace("0X", "0x") })]);
    expect(agentPaymentsOf(body, DYNAMIC_AGENT.toLowerCase(), 5)?.rows).toHaveLength(1);
  });

  it("says when the answer may have left the agent's older payments out", () => {
    const others = Array.from({ length: 3 }, (_, i) => row({ agent: OTHER_AGENT, timestamp: i }));
    expect(agentPaymentsOf(vaultWith(others, 250), DYNAMIC_AGENT, 5)).toEqual({
      rows: [],
      complete: false,
    });
    expect(agentPaymentsOf(vaultWith(others), DYNAMIC_AGENT, 5)?.complete).toBe(true);
    expect(agentPaymentsOf(vaultWith(others, "3"), DYNAMIC_AGENT, 5)?.complete).toBe(false);
  });

  it("lists the newest first and stops at the limit", () => {
    const payments = [1, 5, 3, 4, 2].map((timestamp) => row({ timestamp }));
    const read = agentPaymentsOf(vaultWith(payments), DYNAMIC_AGENT, 3);
    expect(read?.rows.map((r) => r.timestamp)).toEqual([5, 4, 3]);
  });

  it("leaves out a row with no readable merchant, amount or time", () => {
    for (const bad of [
      { merchant: "not an address" },
      { amount: "not a number" },
      { amount: "-5" },
      { timestamp: "1791223039" },
    ]) {
      expect(agentPaymentsOf(vaultWith([row(bad)]), DYNAMIC_AGENT, 5)?.rows).toEqual([]);
    }
    expect(agentPaymentsOf(vaultWith([null, "row"]), DYNAMIC_AGENT, 5)?.rows).toEqual([]);
  });

  it("drops a txHash that is not a full hash, keeping the row", () => {
    const [read] =
      agentPaymentsOf(vaultWith([row({ txHash: "0x1" })]), DYNAMIC_AGENT, 5)?.rows ?? [];
    expect(read?.txHash).toBeNull();
  });

  it("falls back to an id from the hash, then the merchant and time", () => {
    expect(agentPaymentsOf(vaultWith([row({ txHash: HASH })]), DYNAMIC_AGENT, 5)?.rows[0]?.id).toBe(
      HASH,
    );
    expect(agentPaymentsOf(vaultWith([row()]), DYNAMIC_AGENT, 5)?.rows[0]?.id).toBe(
      `${MERCHANT}-1`,
    );
  });

  it("answers null, never an empty list, for an answer that is not the agent's USDC vault", () => {
    expect(agentPaymentsOf(null, DYNAMIC_AGENT, 5)).toBeNull();
    expect(agentPaymentsOf("payments", DYNAMIC_AGENT, 5)).toBeNull();
    expect(agentPaymentsOf({}, DYNAMIC_AGENT, 5)).toBeNull();
    expect(agentPaymentsOf({ payments: [] }, DYNAMIC_AGENT, 5)).toBeNull();
    expect(agentPaymentsOf({ ...LIVE, payments: "none" }, DYNAMIC_AGENT, 5)).toBeNull();
    expect(agentPaymentsOf({ error: "indexer_unavailable" }, DYNAMIC_AGENT, 5)).toBeNull();
    const elsewhere = { ...LIVE, vault: { ...LIVE.vault, id: OTHER_AGENT } };
    expect(agentPaymentsOf(elsewhere, DYNAMIC_AGENT, 5)).toBeNull();
    const otherToken = { ...LIVE, vault: { ...LIVE.vault, token: OTHER_AGENT } };
    expect(agentPaymentsOf(otherToken, DYNAMIC_AGENT, 5)).toBeNull();
  });

  it("is pointed at the demo vault and Circle's test USDC", () => {
    expect(AGENT_VAULT.toLowerCase()).toBe(LIVE.vault.id);
    expect(VAULT_TOKEN.toLowerCase()).toBe(LIVE.vault.token);
    expect(DYNAMIC_AGENT.toLowerCase()).toBe(LIVE.vault.agent);
    expect(AUDIT_URL).toBe(`/api/v1/audit/vault/${AGENT_VAULT}?limit=100`);
  });
});

describe("amountText", () => {
  it("keeps all six decimals of USDC, at least two", () => {
    expect(amountText("250000")).toBe("0.25");
    expect(amountText("1234")).toBe("0.001234");
    expect(amountText("1")).toBe("0.000001");
    expect(amountText("5000000")).toBe("5.00");
    expect(amountText("12500000")).toBe("12.50");
    expect(amountText("0")).toBe("0.00");
  });
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** A fetch that never answers on its own and rejects when its signal aborts, as fetch does. */
const hanging: typeof fetch = (_url, init) =>
  new Promise((_, reject) => {
    const abort = () => reject(new DOMException("The operation was aborted.", "AbortError"));
    if (init?.signal?.aborted) abort();
    init?.signal?.addEventListener("abort", abort);
  });

describe("loadAgentPayments", () => {
  it("asks the vault's audit trail and reads the agent's payments", async () => {
    const urls: string[] = [];
    const read = await loadAgentPayments({
      fetchImpl: async (url) => {
        urls.push(String(url));
        return json(LIVE);
      },
    });
    expect(urls).toEqual([AUDIT_URL]);
    expect(read.rows.map((r) => r.txHash)).toEqual([HASH]);
  });

  it("rejects a 503 from the server, never answering with an empty list", async () => {
    const fetchImpl = async () => json({ error: "indexer_unavailable" }, 503);
    await expect(loadAgentPayments({ fetchImpl })).rejects.toThrow("503");
  });

  it("rejects an answer it cannot read", async () => {
    await expect(
      loadAgentPayments({ fetchImpl: async () => new Response("<html>", { status: 200 }) }),
    ).rejects.toThrow();
    await expect(
      loadAgentPayments({ fetchImpl: async () => json({ payments: [] }) }),
    ).rejects.toThrow("the agent's vault");
  });

  it("rejects a network error", async () => {
    const fetchImpl = async () => {
      throw new TypeError("Failed to fetch");
    };
    await expect(loadAgentPayments({ fetchImpl })).rejects.toThrow("Failed to fetch");
  });

  it("gives up after the timeout", async () => {
    await expect(loadAgentPayments({ fetchImpl: hanging, timeoutMs: 5 })).rejects.toThrow(
      "aborted",
    );
  });

  it("stops when the page goes away", async () => {
    const page = new AbortController();
    const pending = loadAgentPayments({ fetchImpl: hanging, signal: page.signal });
    page.abort();
    await expect(pending).rejects.toThrow("aborted");
    const gone = new AbortController();
    gone.abort();
    await expect(loadAgentPayments({ fetchImpl: hanging, signal: gone.signal })).rejects.toThrow(
      "aborted",
    );
  });
});
