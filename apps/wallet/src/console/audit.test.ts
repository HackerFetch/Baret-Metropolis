import { describe, expect, it } from "vitest";
import { recentOf, spentSince, units, vaultOf } from "./audit.js";

const HASH = `0x${"ab".repeat(32)}`;

describe("units", () => {
  it("reads base units as USDC with two decimals", () => {
    expect(units("100000")).toBe("0.10");
    expect(units("50000000")).toBe("50.00");
    expect(units(10000)).toBe("0.01");
  });
  it("shows nothing for what is not a whole number", () => {
    expect(units("1.5")).toBeNull();
    expect(units(null)).toBeNull();
    expect(units("")).toBeNull();
  });
});

describe("recentOf", () => {
  it("merges payments and registry changes, newest first", () => {
    const rows = recentOf({
      payments: [
        {
          id: "10-1",
          merchant: "0xm",
          agent: "0xa",
          amount: "100000",
          timestamp: 100,
          txHash: HASH,
        },
      ],
      reputationChanges: [
        {
          id: "12-1",
          target: "0xt",
          kind: "flagged",
          reasonCode: "SCAM",
          timestamp: 200,
          txHash: "bad",
        },
      ],
    });
    expect(rows?.map((r) => r.kind)).toEqual(["flagged", "payment"]);
    expect(rows?.[0]).toMatchObject({ merchant: "0xt", reason: "SCAM", txHash: null });
    expect(rows?.[1]).toMatchObject({ amount: "0.10", txHash: HASH });
  });
  it("is null for an answer that is not the expected shape", () => {
    expect(recentOf({ error: "indexer_unavailable" })).toBeNull();
    expect(recentOf(null)).toBeNull();
  });
});

describe("vaultOf", () => {
  const body = {
    vault: {
      id: "0xv",
      deposited: "50000000",
      withdrawn: "0",
      paid: "710000",
      paymentCount: 8,
      merchants: [
        {
          address: "0xm",
          perTxCap: "1000000",
          dailyCap: "5000000",
          paused: false,
          active: true,
          paid: "710000",
          paymentCount: 8,
        },
      ],
    },
    activity: [
      { id: "5-1", kind: "merchantCapSet", merchant: "0xm", timestamp: 50 },
      { id: "9-1", kind: "paid", amount: "100000", timestamp: 90 },
    ],
    payments: [
      { id: "9-1", merchant: "0xm", agent: "0xa", amount: "100000", timestamp: 90, txHash: HASH },
    ],
  };
  it("reads the balance, the merchants and one row per event", () => {
    const vault = vaultOf(body);
    expect(vault).toMatchObject({ address: "0xv", balance: "49.29", paid: "0.71", payments: 8 });
    expect(vault?.merchants[0]).toMatchObject({
      perPayment: "1.00",
      perDay: "5.00",
      status: "active",
    });
    expect(vault?.feed.map((r) => r.kind)).toEqual(["payment", "merchant"]);
  });
  it("is null with no vault", () => {
    expect(vaultOf({ error: "not_found" })).toBeNull();
  });
  it("adds up the payments since a time", () => {
    const vault = vaultOf(body);
    expect(spentSince(vault?.feed ?? [], 80)).toBe("0.10");
    expect(spentSince(vault?.feed ?? [], 100)).toBe("0.00");
  });
});
