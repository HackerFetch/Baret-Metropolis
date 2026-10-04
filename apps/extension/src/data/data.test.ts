import { popupActivity } from "@baret/content";
import { fromTemplate } from "@baret/wallet-ui/data/rules";
import { describe, expect, it } from "vitest";
import { readStart } from "../lib/start.js";
import {
  ago,
  bannerOf,
  byDay,
  byExposure,
  dayGroup,
  fill,
  matchesPopupFilter,
  nearCap,
  payments,
  rulesTemplate,
  unread,
} from "./derive.js";
import { ACTIVITY, DRIFT_ALERT, PERMISSIONS, queueOf, REQUESTS, SAMPLE_NOW } from "./sample.js";
import { initialState, reduce } from "./store.js";
import type { PaymentPermission } from "./types.js";
import { activityText, headline, partyOf, permissionLine, statusOf, timeOf } from "./words.js";

const full = () => initialState({ scenario: "full" });

describe("times against the sample's present", () => {
  it("reads minutes, hours and days ago", () => {
    expect(ago("2026-10-03T13:59:30Z", SAMPLE_NOW)).toBe("just now");
    expect(ago("2026-10-03T13:42:00Z", SAMPLE_NOW)).toBe("18 min ago");
    expect(ago("2026-10-03T11:05:00Z", SAMPLE_NOW)).toBe("2 h ago");
    expect(ago("2026-09-30T14:00:00Z", SAMPLE_NOW)).toBe("3 d ago");
  });

  it("groups by calendar day in UTC", () => {
    expect(dayGroup("2026-10-03T00:01:00Z", SAMPLE_NOW)).toBe("today");
    expect(dayGroup("2026-10-02T23:59:00Z", SAMPLE_NOW)).toBe("yesterday");
    expect(dayGroup("2026-10-01T12:00:00Z", SAMPLE_NOW)).toBe("earlier");
  });

  it("keeps the log's order inside each group and drops empty groups", () => {
    const groups = byDay(ACTIVITY.slice(0, 3), SAMPLE_NOW);
    expect(groups.map((g) => g.group)).toEqual(["today"]);
    expect(groups[0]?.items.map((i) => i.id)).toEqual(["x1", "x2", "x3"]);
  });

  it("says a time relatively today and as a date before", () => {
    expect(timeOf("2026-10-03T13:42:00Z", SAMPLE_NOW)).toBe("18 min ago");
    expect(timeOf("2026-10-02T18:31:00Z", SAMPLE_NOW)).toContain("2 Oct");
  });
});

describe("caps", () => {
  const scrybe = PERMISSIONS.find((p): p is PaymentPermission => p.id === "p4");

  it("measures how full a cap is, and a missing cap as empty", () => {
    expect(fill("1.70", "2.00")).toBeCloseTo(0.85);
    expect(fill("3", "2")).toBe(1);
    expect(fill("1", null)).toBe(0);
  });

  it("calls a payment site near its cap from 80 percent", () => {
    expect(scrybe && nearCap(scrybe)).toBe(true);
    const paused = PERMISSIONS.find((p): p is PaymentPermission => p.id === "p5");
    expect(paused && nearCap(paused)).toBe(false);
  });

  it("puts the largest exposure first: no limit, then collection access, then amounts", () => {
    expect(byExposure(PERMISSIONS).map((p) => p.id)).toEqual(["p1", "p3", "p2", "p5", "p4"]);
  });
});

describe("the popup's one banner", () => {
  it("puts funds that moved without you above everything", () => {
    const state = initialState({ scenario: "full", drift: true });
    expect(bannerOf(state)?.kind).toBe("drift");
    expect(unread(state.alerts)).toBe(3);
  });

  it("shows an unsettled payment before a cap that is nearly used", () => {
    expect(bannerOf(full())?.kind).toBe("unsettled");
    const read = reduce(full(), { type: "readAlerts" });
    expect(bannerOf(read)?.kind).toBe("capNear");
  });

  it("asks a new wallet for its backup", () => {
    expect(bannerOf(initialState({ scenario: "empty" }))?.kind).toBe("backup");
  });

  it("treats Baret unreachable as the second most urgent", () => {
    const down = reduce(full(), { type: "reachable", value: false, at: SAMPLE_NOW });
    expect(bannerOf(down)?.kind).toBe("unreachable");
  });
});

describe("the log's words", () => {
  it("fills a row from content and shortens addresses", () => {
    const sent = ACTIVITY.find((a) => a.id === "x5");
    expect(sent && activityText(sent)).toBe("Sent 2.50 MON");
    expect(sent && partyOf(sent)).toMatch(/^0x4b1d.+0c0d$/);
    expect(sent && statusOf(sent)).toBeNull();
    const declined = ACTIVITY.find((a) => a.id === "x7");
    expect(declined && statusOf(declined)).toBe(popupActivity.status.declined);
  });

  it("keeps a site in its own case inside an uppercase headline", () => {
    const parts = headline("{origin} is near its cap", { origin: "scrybe.example" });
    expect(parts[0]).toEqual({ text: "scrybe.example", keep: true });
  });

  it("says what each kind of permission can do", () => {
    const [unlimited, capped, operator, payment] = PERMISSIONS;
    expect(unlimited && permissionLine(unlimited)).toContain("all of your USDC");
    expect(capped && permissionLine(capped)).toContain("50.00 USDC");
    expect(operator && permissionLine(operator)).toContain("PixelDrop Genesis");
    expect(payment && permissionLine(payment)).toContain("scrybe.example");
  });
});

describe("the popup's filters", () => {
  it("puts each row under the chips that name it", () => {
    const ids = (filter: Parameters<typeof matchesPopupFilter>[1]) =>
      ACTIVITY.filter((a) => matchesPopupFilter(a, filter)).map((a) => a.id);
    expect(ids("payments")).toEqual(["x1"]);
    expect(ids("alerts")).toEqual(["x2"]);
    expect(ids("received")).toEqual(["x13", "x14"]);
    expect(ids("sites")).not.toContain("x1");
    expect(ids("all")).toHaveLength(ACTIVITY.length);
  });
});

describe("the store", () => {
  it("revokes, logs one row per permission and clears the alerts it settles", () => {
    const next = reduce(full(), { type: "revoke", ids: ["p4"], at: SAMPLE_NOW });
    expect(next.permissions.some((p) => p.id === "p4")).toBe(false);
    expect(next.activity[0]?.kind).toBe("revoke");
    expect(next.alerts.some((a) => a.kind === "capNear")).toBe(false);
  });

  it("pauses a payment site on this device", () => {
    const next = reduce(full(), { type: "permissionStatus", id: "p4", status: "paused" });
    expect(payments(next.permissions).find((p) => p.id === "p4")?.status).toBe("paused");
  });

  it("connects a new site and logs it", () => {
    const next = reduce(full(), {
      type: "connect",
      origin: "atlas.example",
      account: "main",
      at: SAMPLE_NOW,
    });
    expect(next.sites[0]).toMatchObject({ origin: "atlas.example", status: "connected" });
    expect(next.activity[0]?.kind).toBe("connect");
  });

  it("moves the balances when a transfer goes out, the fee in MON", () => {
    const item = { ...ACTIVITY[4], id: "t" } as (typeof ACTIVITY)[number];
    const next = reduce(full(), {
      type: "send",
      asset: "MON",
      amount: "2.50",
      fee: "0.0021",
      item,
    });
    expect(next.assets.find((a) => a.symbol === "MON")?.balance).toBe("19.9958");
    expect(next.accounts.find((a) => a.id === "main")?.balance).toBe("19.9958");
  });

  it("records which rules changed, and reads Custom once they leave the template", () => {
    const strict = fromTemplate("strict", []);
    const saved = reduce(full(), {
      type: "saveRules",
      policy: strict,
      template: "strict",
      at: SAMPLE_NOW,
    });
    expect(rulesTemplate(saved)).toBe("strict");
    expect(saved.ruleChanges.length).toBeGreaterThan(0);
    const tweaked = reduce(saved, {
      type: "saveRules",
      policy: { ...strict, maxLossPercent: 37 },
      template: "strict",
      at: SAMPLE_NOW,
    });
    expect(rulesTemplate(tweaked)).toBe("custom");
  });

  it("starts over as a new wallet after a reset", () => {
    const next = reduce(full(), { type: "reset" });
    expect(next.activity).toEqual([]);
    expect(next.settings.backedUp).toBe(false);
  });

  it("adds the drift alert only to the alert preview", () => {
    expect(full().alerts.some((a) => a.id === DRIFT_ALERT.id)).toBe(false);
  });
});

describe("where a page starts", () => {
  it("reads the phase, the request and the scenario from the address", () => {
    expect(readStart("?phase=signing&request=permit")).toMatchObject({
      phase: "signing",
      request: "permit",
      scenario: "full",
    });
    expect(readStart("?sample=empty").scenario).toBe("empty");
  });

  it("falls back for anything unknown", () => {
    expect(readStart("?phase=nope&request=nope")).toMatchObject({
      phase: "uninitialized",
      request: "safe",
      connect: "firstTime",
    });
  });

  it("builds the queue preview from three different requests", () => {
    expect(queueOf("queue").map((r) => r.kind)).toEqual(["transaction", "message", "transaction"]);
    expect(queueOf("permit")).toEqual([REQUESTS.permit]);
  });
});
