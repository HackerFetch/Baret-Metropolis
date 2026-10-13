import type { ActivityItem, Permission } from "@baret/wallet-ui/data/types";
import { describe, expect, it } from "vitest";
import { forget, fromSite, sitesFrom } from "./sites.js";

const item = (
  id: string,
  kind: ActivityItem["kind"],
  at: string,
  origin?: string,
): ActivityItem => ({
  id,
  kind,
  at,
  values: origin ? { origin } : {},
  verdict: null,
  findings: [],
  changes: [],
});

const activity = [
  item("1", "connect", "2026-10-01T10:00:00Z", "a.example"),
  item("2", "blocked", "2026-10-03T10:00:00Z", "a.example"),
  item("3", "declined", "2026-10-02T10:00:00Z", "b.example"),
  item("4", "sent", "2026-10-04T10:00:00Z"),
];
const permissions: Permission[] = [
  { id: "site-a", kind: "site", values: { origin: "a.example" } },
  { id: "site-c", kind: "site", values: { origin: "c.example" } },
  { id: "al", kind: "allowance", values: { spender: "0x1" } },
];

describe("sitesFrom", () => {
  it("counts each site's requests and stops, newest first", () => {
    const rows = sitesFrom(activity, permissions);
    expect(rows.map((r) => r.origin)).toEqual(["a.example", "b.example", "c.example"]);
    expect(rows[0]).toMatchObject({
      requests: 2,
      stopped: 1,
      lastKind: "blocked",
      connected: true,
    });
    expect(rows[1]).toMatchObject({ requests: 1, stopped: 1, connected: false });
    expect(rows[2]).toMatchObject({ requests: 0, last: null, connected: true });
  });

  it("is empty with no records", () => {
    expect(sitesFrom([], [])).toEqual([]);
  });
});

describe("forget", () => {
  it("drops the site's rows and connection, and nothing else", () => {
    const left = forget("a.example", activity, permissions);
    expect(left.activity.map((i) => i.id)).toEqual(["3", "4"]);
    expect(left.permissions.map((p) => p.id)).toEqual(["site-c", "al"]);
  });
});

describe("fromSite", () => {
  it("stamps a sign record with the site's origin, so /sites lists it", () => {
    const signed = fromSite(item("s1", "signed", "2026-10-13T10:00:00Z"), "https://app.example");
    expect(signed.values.origin).toBe("app.example");
    const rows = sitesFrom([signed], []);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.origin).toBe("app.example");
    expect(rows[0]?.lastKind).toBe("signed");
  });

  it("keeps the record's own values and leaves it alone without an origin", () => {
    const sent = { ...item("s2", "sent", "2026-10-13T10:00:00Z"), values: { amount: "1" } };
    expect(fromSite(sent, "http://localhost:5173").values).toEqual({
      amount: "1",
      origin: "localhost:5173",
    });
    expect(fromSite(sent, "")).toBe(sent);
  });
});
