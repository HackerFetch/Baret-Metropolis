import { describe, expect, it } from "vitest";
import type { Activity } from "../data/types.js";
import { loggedRow } from "./row.js";

const item: Activity = {
  id: "1",
  kind: "sent",
  status: "confirmed",
  at: "2026-10-11T00:00:00.000Z",
  account: "acc-1",
  origin: "baret-metropolis.vercel.app",
  counterparty: "0x5BB6fF1FCbE31ED8FBce6805852Ce279475522fc",
  values: {},
  verdict: null,
  findings: [],
  changes: [],
};

describe("the log row of a site's transaction", () => {
  it("logs a call that only brings a token in as received, not as 0 MON sent", () => {
    const row = loggedRow(
      item,
      { approvals: [], changes: [{ direction: "in", value: "100.00", unit: "dUSDC" }] },
      0n,
    );
    expect(row.kind).toBe("received");
    expect(row.values).toEqual({ amount: "100.00", asset: "dUSDC" });
  });

  it("logs what left the account when something did, also on a swap", () => {
    const row = loggedRow(
      item,
      {
        approvals: [],
        changes: [
          { direction: "out", value: "1.00", unit: "MON" },
          { direction: "in", value: "25.00", unit: "dUSDC" },
        ],
      },
      10n ** 18n,
    );
    expect(row.kind).toBe("sent");
    expect(row.values).toEqual({ amount: "1.00", asset: "MON" });
  });

  it("logs an allowance as one, and a bare call as the MON it carries", () => {
    const allowance = loggedRow(
      item,
      { approvals: [{ spender: "0xeB9E", unit: "dUSDC" }], changes: [] },
      0n,
    );
    expect(allowance.kind).toBe("allowance");
    expect(allowance.values).toEqual({ asset: "dUSDC" });
    expect(loggedRow(item, { approvals: [], changes: [] }, 0n).values.asset).toBe("MON");
  });
});
