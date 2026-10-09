import type { history } from "@baret/content";
import { describe, expect, it } from "vitest";
import { groups } from "../lib/address.js";
import { matches, rowText, toCsv } from "./activity.js";
import { amount, fromUnits, toUnits } from "./format.js";
import { changedFields, decide, fromTemplate } from "./rules.js";
import { ACCOUNT, ACTIVITY, ADDRESS, POLICY, SIGN_REQUESTS, VAULT } from "./sample.js";
import { free, initialState, reduce, reserved } from "./store.js";
import type { ActivityItem } from "./types.js";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/** A sample activity row to build on. */
function row(index: number): ActivityItem {
  const item = ACTIVITY[index];
  if (!item) throw new Error(`no sample activity at ${index}`);
  return item;
}

describe("amounts", () => {
  it("reads decimal strings into base units and back without float drift", () => {
    expect(toUnits("12.5", 6)).toBe(12_500_000n);
    expect(toUnits("0,1", 18)).toBe(100_000_000_000_000_000n);
    expect(toUnits("1.2345678", 6)).toBeNull();
    expect(toUnits("abc", 6)).toBeNull();
    expect(fromUnits(12_500_000n, 6)).toBe("12.50");
    const wei = (text: string) => toUnits(text, 18) ?? 0n;
    expect(fromUnits(wei("0.1") + wei("0.2"), 18)).toBe("0.30");
  });

  it("groups only for display, so a stored value always parses back", () => {
    expect(amount("1234567.5", 6)).toBe("1,234,567.50");
    expect(fromUnits(1_234_567_500_000n, 6)).toBe("1234567.50");
    expect(toUnits(fromUnits(1_234_567_500_000n, 6), 6)).toBe(1_234_567_500_000n);
  });
});

describe("the decision rule (D-014)", () => {
  const balanced = fromTemplate("balanced", []);
  const strict = fromTemplate("strict", []);
  const permissive = fromTemplate("permissive", []);
  const unlimited = SIGN_REQUESTS.find((r) => r.id === "blocked")?.findings ?? [];
  const unknown = SIGN_REQUESTS.find((r) => r.id === "caution")?.findings ?? [];

  it("blocks an unlimited allowance to a listed spender under every template", () => {
    for (const policy of [strict, balanced, permissive]) {
      expect(decide(unlimited, policy).verdict).toBe("blocked");
    }
    expect(decide(unlimited, balanced).rule).toBe("blockUnlimitedApprovals");
  });

  it("makes an unknown contract Caution under Balanced and Blocked under Strict", () => {
    expect(decide(unknown, balanced)).toEqual({ verdict: "caution", rule: null });
    expect(decide(unknown, strict).verdict).toBe("blocked");
  });

  it("passes no findings as Safe, and lets a threshold go when its rule is off", () => {
    expect(decide([], strict)).toEqual({ verdict: "safe", rule: null });
    const loss = [
      { code: "ESTIMATED_LOSS_EXCEEDS_MAX", values: { actual: "62%", limit: "50%" } },
    ] as const;
    expect(decide(loss, balanced).rule).toBe("maxLossPercent");
    expect(decide(loss, { ...balanced, maxLossPercent: null }).verdict).toBe("caution");
  });

  it("reads Custom once a field differs from the template, ignoring the account's assets", () => {
    expect(changedFields(POLICY, "balanced")).toEqual([]);
    expect(changedFields({ ...POLICY, blockUnknownContractExposure: true }, "balanced")).toEqual([
      "blockUnknownContractExposure",
    ]);
  });
});

describe("the wallet store", () => {
  const start = initialState("Main account");
  const at = "2026-10-03T15:00:00Z";

  it("takes a send and its fee out of the balances, and logs it", () => {
    const next = reduce(start, {
      type: "send",
      asset: "MON",
      amount: "2.5",
      fee: "0.0021",
      item: { ...row(2), id: "new" },
    });
    expect(next.assets.find((a) => a.symbol === "MON")?.balance).toBe("19.9958");
    expect(next.activity[0]?.id).toBe("new");
  });

  it("revokes a permission and clears the alert about it", () => {
    const next = reduce(start, {
      type: "revoke",
      id: "p1",
      item: { ...row(0), id: "revoke", kind: "revoke" },
    });
    expect(next.permissions.some((p) => p.id === "p1")).toBe(false);
    expect(next.alerts.some((a) => a.kind === "unlimitedOpen")).toBe(false);
  });

  it("records each rule that changed, with its old and new value", () => {
    const next = reduce(start, {
      type: "saveRules",
      policy: { ...start.policy, blockUnknownContractExposure: true, maxLossPercent: 25 },
      template: "balanced",
      at,
    });
    expect(next.ruleChanges.map((c) => [c.field, c.previous, c.value])).toEqual([
      ["blockUnknownContractExposure", false, true],
      ["maxLossPercent", 50, 25],
    ]);
  });

  it("reserves the daily caps of every merchant not removed, paused ones included", () => {
    expect(reserved(VAULT)).toBe("15.00");
    expect(free(VAULT)).toBe("45.00");
    const removed = reduce(start, {
      type: "merchantStatus",
      address: ADDRESS.weather,
      status: "removed",
    });
    expect(reserved(removed.vault)).toBe("5.00");
    expect(free(reduce(start, { type: "withdraw", amount: "50" }).vault)).toBe("0.00");
  });

  it("raises an alert when the agent key is revoked and clears it with a new key", () => {
    const revoked = reduce(start, { type: "revokeAgent", at });
    expect(revoked.vault.agent).toBeNull();
    expect(revoked.alerts[0]?.kind).toBe("agentRevoked");
    const again = reduce(revoked, { type: "createAgent", address: ADDRESS.agent, created: at });
    expect(again.alerts.some((a) => a.kind === "agentRevoked")).toBe(false);
  });

  it("starts over on reset and keeps the account name", () => {
    const changed = reduce(reduce(start, { type: "rename", name: "Savings" }), { type: "lock" });
    expect(reduce(changed, { type: "reset" })).toEqual(initialState("Savings"));
  });
});

describe("sample data", () => {
  it("uses well-formed Monad addresses and the testnet chain id", () => {
    expect(ACCOUNT.chainId).toBe(10143);
    for (const address of [ACCOUNT.address, ...Object.values(ADDRESS)]) {
      expect(address).toMatch(ADDRESS_RE);
    }
  });

  it("plants a look-alike that shares the first and last four characters", () => {
    expect(ADDRESS.lookalike.slice(0, 6)).toBe(ADDRESS.friend.slice(0, 6));
    expect(ADDRESS.lookalike.slice(-4)).toBe(ADDRESS.friend.slice(-4));
    expect(ADDRESS.lookalike).not.toBe(ADDRESS.friend);
  });

  it("gives each sample request the verdict its findings earn under Balanced", () => {
    for (const request of SIGN_REQUESTS.filter((r) => r.verdict !== "unreachable")) {
      expect(decide(request.findings, POLICY).verdict).toBe(request.verdict);
    }
  });
});

describe("the activity log", () => {
  it("files each row under its filters, and never a declined request under Blocked", () => {
    const count = (id: (typeof history.filters)[number]["id"]) =>
      ACTIVITY.filter((item) => matches(item, id)).length;
    expect(count("all")).toBe(ACTIVITY.length);
    expect(count("sent")).toBe(1);
    expect(count("received")).toBe(2);
    expect(count("agent")).toBe(1);
    expect(count("blocked")).toBe(1);
    expect(count("declined")).toBe(2);
    expect(count("overrides")).toBe(1);
    expect(
      ACTIVITY.filter((item) => item.kind === "declined").every(
        (item) => !matches(item, "blocked"),
      ),
    ).toBe(true);
  });

  it("writes each row's sentence with short addresses and the rule's own label", () => {
    expect(rowText(row(2))).toBe("Sent 2.50 MON to 0x4b1d...0c0d");
    expect(rowText(row(6))).toBe("Signed with an override of Largest loss per request");
    // An agent payment read from the indexer names its merchant by address.
    const live = {
      ...row(0),
      values: { amount: "0.10", asset: "USDC", merchant: ADDRESS.weather },
    };
    expect(rowText(live)).toMatch(
      /^Your agent paid 0\.10 USDC to 0x[0-9a-fA-F]{4}\.\.\.[0-9a-fA-F]{4}$/,
    );
    // A merchant named by the reader keeps its name, as the sample's does.
    expect(rowText(row(0))).toBe("Your agent paid 0.50 USDC to scrybe.example");
  });

  it("exports a quoted CSV, one line per row plus the header", () => {
    const csv = toCsv(ACTIVITY).split("\n");
    expect(csv).toHaveLength(ACTIVITY.length + 1);
    expect(csv[0]).toBe("time,activity,verdict,transaction");
    expect(csv[2]).toBe(
      '"2026-10-03T11:05:00Z","Blocked a request from claimhub.example","blocked",""',
    );
  });

  it("groups an address in fours for reading", () => {
    expect(groups(ACCOUNT.address)).toEqual([
      "0x",
      "7a3f",
      "9e21",
      "c84b",
      "5d06",
      "f13a",
      "2e9b",
      "7c40",
      "d58e",
      "6f21",
      "c21e",
    ]);
  });
});
