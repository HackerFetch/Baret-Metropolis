import { describe, expect, it } from "vitest";
import { ADDRESS, SIGN_REQUESTS } from "./sample.js";
import {
  activeMerchants,
  canDeposit,
  canWithdraw,
  initialState,
  readSample,
  ready,
  reduce,
  type WalletState,
} from "./store.js";
import type { ActivityItem } from "./types.js";

const usdc = (state: WalletState) => state.assets.find((a) => a.symbol === "USDC")?.balance;
const agentRow = (state: WalletState) => state.permissions.find((p) => p.kind === "agent");

describe("the wallet samples", () => {
  it("reads ?sample= and falls back to the default", () => {
    expect(readSample("?sample=empty")).toBe("empty");
    expect(readSample("?sample=offline&x=1")).toBe("offline");
    expect(readSample("?sample=nope")).toBe("default");
    expect(readSample("")).toBe("default");
  });

  it("starts the default sample with everything loaded", () => {
    const state = initialState("Main account");
    expect(state.status).toEqual({ analyzer: "ok", balances: "ok", activity: "ok", vault: "ok" });
    expect(state.assets.length).toBeGreaterThan(0);
    expect(state.activity.length).toBeGreaterThan(0);
  });

  it("starts the empty sample with nothing in it", () => {
    const state = initialState("Main account", "empty");
    expect(state.assets).toEqual([]);
    expect(state.activity).toEqual([]);
    expect(state.permissions).toEqual([]);
    expect(state.vault.agent).toBeNull();
  });

  it("fails closed offline: nothing reads as ready and no stale data shows", () => {
    const state = initialState("Main account", "offline");
    expect(ready(state, "analyzer")).toBe(false);
    expect(ready(state, "balances")).toBe(false);
    expect(ready(state, "activity")).toBe(false);
    expect(state.assets).toEqual([]);
    expect(state.activity).toEqual([]);
    expect(canDeposit(state, "1")).toBe(false);
    // The on-chain views go too: no stale vault, permissions or alerts.
    expect(state.vault.balance).toBe("0.00");
    expect(state.vault.merchants).toEqual([]);
    expect(state.vault.agent).toBeNull();
    expect(state.permissions).toEqual([]);
    expect(state.alerts).toEqual([]);
  });

  it("refuses every vault move offline", () => {
    const state = initialState("Main account", "offline");
    expect(canWithdraw(state, "1")).toBe(false);
    expect(reduce(state, { type: "withdraw", amount: "1" })).toBe(state);
    expect(reduce(state, { type: "deposit", amount: "1" })).toBe(state);
  });

  it("adds a drift alert in the drift sample", () => {
    expect(initialState("Main account", "drift").alerts[0]?.kind).toBe("drift");
  });

  it("treats loading as not ready", () => {
    const loading = reduce(initialState("Main account"), {
      type: "status",
      key: "analyzer",
      value: "loading",
    });
    expect(ready(loading, "analyzer")).toBe(false);
  });

  it("resets to the same sample", () => {
    const start = initialState("Main account", "empty");
    expect(reduce(start, { type: "reset" })).toEqual(start);
  });

  it("quotes each demo site's claim in the sign requests", () => {
    for (const request of SIGN_REQUESTS) expect(request.claim?.length).toBeGreaterThan(0);
  });
});

describe("the vault and the account", () => {
  const start = initialState("Main account");

  it("moves a deposit out of the account", () => {
    const next = reduce(start, { type: "deposit", amount: "19.50" });
    expect(usdc(next)).toBe("100.00");
    expect(next.vault.balance).toBe("79.50");
  });

  it("refuses a deposit above the account balance", () => {
    expect(canDeposit(start, "200")).toBe(false);
    expect(reduce(start, { type: "deposit", amount: "200" })).toBe(start);
  });

  it("moves a withdrawal back into the account", () => {
    const next = reduce(start, { type: "withdraw", amount: "10" });
    expect(usdc(next)).toBe("129.50");
    expect(next.vault.balance).toBe("50.00");
  });

  it("refuses a withdrawal above the vault balance", () => {
    expect(canWithdraw(start, "60")).toBe(true);
    expect(canWithdraw(start, "60.01")).toBe(false);
    expect(reduce(start, { type: "withdraw", amount: "60.01" })).toBe(start);
  });

  it("refuses an empty or unreadable withdrawal", () => {
    expect(canWithdraw(start, "0")).toBe(false);
    expect(canWithdraw(start, "abc")).toBe(false);
  });
});

describe("the agent's permission row", () => {
  const start = initialState("Main account");

  it("counts only active merchants", () => {
    expect(activeMerchants(start.vault)).toBe(1);
    expect(agentRow(start)?.values.count).toBe("1");
  });

  it("follows merchant changes", () => {
    const resumed = reduce(start, {
      type: "merchantStatus",
      address: ADDRESS.weather,
      status: "active",
    });
    expect(agentRow(resumed)?.values.count).toBe("2");
    const removed = reduce(resumed, {
      type: "merchantStatus",
      address: ADDRESS.scrybe,
      status: "removed",
    });
    expect(agentRow(removed)?.values.count).toBe("1");
  });

  it("goes with the agent key and comes back with a new one", () => {
    const revoked = reduce(start, { type: "revokeAgent", at: "2026-10-04" });
    expect(agentRow(revoked)).toBeUndefined();
    const again = reduce(revoked, {
      type: "createAgent",
      address: ADDRESS.agent,
      created: "2026-10-04",
    });
    expect(agentRow(again)?.values.count).toBe("1");
  });
});

describe("the vault's history from the indexer", () => {
  const own = (id: string, at: string): ActivityItem => ({
    id,
    kind: "sent",
    at,
    values: { amount: "1", asset: "MON", recipient: ADDRESS.friend },
    verdict: "safe",
    findings: [],
    changes: [],
  });
  const paid = (id: string, at: string): ActivityItem => ({
    id,
    kind: "payment",
    at,
    values: { amount: "0.10", asset: "USDC", merchant: ADDRESS.weather },
    verdict: null,
    findings: [],
    changes: [],
    source: "indexer",
  });
  const start = { ...initialState("Main account", "empty"), live: true };

  it("joins the wallet's own log, newest first, and keeps every verdict it logged", () => {
    const logged = reduce(
      reduce(start, { type: "log", item: own("sent-1", "2026-10-09T10:00:00.000Z") }),
      { type: "log", item: own("blocked-1", "2026-10-09T12:00:00.000Z") },
    );
    const read = reduce(logged, {
      type: "history",
      items: [paid("p2", "2026-10-09T13:00:00.000Z"), paid("p1", "2026-10-09T11:00:00.000Z")],
    });
    expect(read.activity.map((item) => item.id)).toEqual(["p2", "blocked-1", "p1", "sent-1"]);
  });

  it("replaces only its own earlier rows on a new read", () => {
    const first = reduce(
      reduce(start, { type: "log", item: own("sent-1", "2026-10-09T10:00:00.000Z") }),
      {
        type: "history",
        items: [paid("p1", "2026-10-09T11:00:00.000Z")],
      },
    );
    const again = reduce(first, {
      type: "history",
      items: [paid("p1", "2026-10-09T11:00:00.000Z"), paid("p2", "2026-10-09T12:00:00.000Z")],
    });
    expect(again.activity.map((item) => item.id)).toEqual(["p2", "p1", "sent-1"]);
    // No vault: the indexer's rows go, the wallet's own stay.
    expect(reduce(again, { type: "history", items: [] }).activity.map((item) => item.id)).toEqual([
      "sent-1",
    ]);
  });
});
