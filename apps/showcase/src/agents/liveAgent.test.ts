import { describe, expect, it } from "vitest";
import { DYNAMIC_AGENT, recentPaymentsOf } from "./liveAgent.js";

const OTHER_AGENT = "0x227ba9d7b649988c48662ac42360727ba971647e";
const MERCHANT = "0x1365566191bAA9872A64AcDce963751d5343ff49";
const HASH = "0x06a81dda28c49041c2bfa4b5c841b350021be408a4745ba5f56c07cc2b124ab3";

describe("recentPaymentsOf", () => {
  it("reads a real payment from the live agent, captured from /v1/audit/recent on 2026-10-09", () => {
    const body = {
      payments: [
        {
          id: "68466682-2",
          vault_id: "0x0a82671420114e47c672d5e8e23017ddce850a35",
          merchant: "0x1365566191baa9872a64acdce963751d5343ff49",
          agent: DYNAMIC_AGENT.toLowerCase(),
          amount: "250000",
          ref: "0xdabed65c2b6a65fd7db5b5844396154426ae5879103707038339f975d33e92bf",
          timestamp: 1_791_223_039,
          block: 68_466_682,
          txHash: HASH,
        },
      ],
    };
    expect(recentPaymentsOf(body, DYNAMIC_AGENT, 20)).toEqual([
      {
        id: "68466682-2",
        merchant: "0x1365566191baa9872a64acdce963751d5343ff49",
        amount: "250000",
        timestamp: 1_791_223_039,
        txHash: HASH,
      },
    ]);
  });

  it("keeps only the named agent's payments", () => {
    const body = {
      payments: [
        { agent: OTHER_AGENT, merchant: MERCHANT, amount: "1000", timestamp: 1 },
        { agent: DYNAMIC_AGENT, merchant: MERCHANT, amount: "2000", timestamp: 2 },
      ],
    };
    const rows = recentPaymentsOf(body, DYNAMIC_AGENT, 20);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.amount).toBe("2000");
  });

  it("matches the agent address case-insensitively", () => {
    const body = {
      payments: [
        { agent: DYNAMIC_AGENT.toUpperCase(), merchant: MERCHANT, amount: "500", timestamp: 1 },
      ],
    };
    expect(recentPaymentsOf(body, DYNAMIC_AGENT.toLowerCase(), 20)).toHaveLength(1);
  });

  it("leaves out a row with no readable merchant, amount or time", () => {
    const base = { agent: DYNAMIC_AGENT, merchant: MERCHANT, amount: "1000", timestamp: 1 };
    expect(
      recentPaymentsOf({ payments: [{ ...base, merchant: "not an address" }] }, DYNAMIC_AGENT, 20),
    ).toEqual([]);
    expect(
      recentPaymentsOf({ payments: [{ ...base, amount: "not a number" }] }, DYNAMIC_AGENT, 20),
    ).toEqual([]);
    expect(
      recentPaymentsOf({ payments: [{ ...base, timestamp: "not a time" }] }, DYNAMIC_AGENT, 20),
    ).toEqual([]);
  });

  it("drops a txHash that is not a full hash, keeping the row", () => {
    const body = {
      payments: [
        { agent: DYNAMIC_AGENT, merchant: MERCHANT, amount: "1000", timestamp: 1, txHash: "0x1" },
      ],
    };
    const [row] = recentPaymentsOf(body, DYNAMIC_AGENT, 20);
    expect(row?.txHash).toBeNull();
  });

  it("falls back to an id from the hash or the merchant and time, never undefined", () => {
    const withHash = recentPaymentsOf(
      {
        payments: [
          { agent: DYNAMIC_AGENT, merchant: MERCHANT, amount: "1000", timestamp: 1, txHash: HASH },
        ],
      },
      DYNAMIC_AGENT,
      20,
    );
    expect(withHash[0]?.id).toBe(HASH);
    const withoutHash = recentPaymentsOf(
      { payments: [{ agent: DYNAMIC_AGENT, merchant: MERCHANT, amount: "1000", timestamp: 1 }] },
      DYNAMIC_AGENT,
      20,
    );
    expect(withoutHash[0]?.id).toBe(`${MERCHANT}-1`);
  });

  it("caps at the given limit", () => {
    const payments = Array.from({ length: 5 }, (_, i) => ({
      agent: DYNAMIC_AGENT,
      merchant: MERCHANT,
      amount: "1000",
      timestamp: i,
    }));
    expect(recentPaymentsOf({ payments }, DYNAMIC_AGENT, 2)).toHaveLength(2);
  });

  it("reads nothing from a missing, malformed or empty body", () => {
    expect(recentPaymentsOf(null, DYNAMIC_AGENT, 20)).toEqual([]);
    expect(recentPaymentsOf({}, DYNAMIC_AGENT, 20)).toEqual([]);
    expect(recentPaymentsOf({ payments: "not an array" }, DYNAMIC_AGENT, 20)).toEqual([]);
  });
});
