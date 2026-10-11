import { describe, expect, it } from "vitest";
import type { Payment, PaymentPermission } from "../data/types.js";
import { cardAfter, siteStop } from "./site-caps.js";

const NOW = Date.parse("2026-10-11T12:00:00.000Z");
const SITE = "scrybe.example";
const ago = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();

const card = (over: Partial<PaymentPermission> = {}): PaymentPermission => ({
  id: "caps-1",
  kind: "payment",
  origin: SITE,
  account: "main",
  status: "active",
  granted: ago(600),
  lastUsed: null,
  holder: SITE,
  uses: [],
  merchant: SITE,
  asset: "USDC",
  caps: { perPayment: "0.10", hour: "0.20", day: "0.50" },
  spent: { hour: "0.00", day: "0.00" },
  paymentsToday: 0,
  facilitator: "",
  week: [0, 0, 0, 0, 0, 0, 0],
  ...over,
});

const paid = (amount: string, minutes: number, facilitator = SITE, asset = "USDC"): Payment => ({
  id: `p-${minutes}-${amount}`,
  at: ago(minutes),
  merchant: "0x1365566191bAA9872A64AcDce963751d5343ff49",
  amount,
  asset,
  facilitator,
  stage: "checked",
  hash: null,
});

const ask = (amount: string, asset = "USDC") => ({ origin: SITE, amount, asset });

describe("a site's own caps and pause, before a payment is signed", () => {
  it("lets a payment through when the site has no card, or the payment fits", () => {
    expect(siteStop(ask("9.00"), [], [], NOW)).toBeNull();
    expect(siteStop(ask("0.05"), [card()], [], NOW)).toBeNull();
    expect(siteStop(ask("0.10"), [card()], [], NOW)).toBeNull();
  });

  it("stops every payment to a paused site and tells the site why", () => {
    const stop = siteStop(ask("0.01"), [card({ status: "paused" })], [], NOW);
    expect(stop?.reason).toBe("paused");
    expect(stop?.finding).toBeNull();
    expect(stop?.message).toBe(`${SITE} is paused. Resume it in Allowances to continue.`);
  });

  it("stops a payment over the cap per payment", () => {
    const stop = siteStop(ask("0.11"), [card()], [], NOW);
    expect(stop?.finding).toEqual({
      code: "X402_PER_TX_CAP_EXCEEDED",
      values: { origin: SITE, actual: "0.11 USDC", cap: "0.10 USDC" },
    });
    expect(stop?.rule).toEqual({ rule: "maxPerTxCap", limit: "0.10", actual: "0.11" });
  });

  it("counts the last hour, and only this site's payments in the card's asset", () => {
    const earlier = [
      paid("0.10", 10),
      paid("0.05", 30),
      paid("0.10", 20, "other.example"),
      paid("0.10", 20, SITE, "dUSDC"),
      paid("0.10", 90),
    ];
    expect(siteStop(ask("0.05"), [card()], earlier, NOW)).toBeNull();
    const stop = siteStop(ask("0.06"), [card()], earlier, NOW);
    expect(stop?.finding?.code).toBe("X402_HOURLY_CAP_EXCEEDED");
    expect(stop?.finding?.values).toEqual({
      amount: "0.06 USDC",
      actual: "0.21 USDC",
      cap: "0.20 USDC",
    });
  });

  it("counts the last 24 hours, with or without an hourly cap", () => {
    const earlier = [paid("0.10", 120), paid("0.10", 300), paid("0.10", 600), paid("0.10", 900)];
    const open = card({ caps: { perPayment: "0.10", hour: null, day: "0.50" } });
    expect(siteStop(ask("0.10"), [open], earlier, NOW)).toBeNull();
    const stop = siteStop(ask("0.10"), [open], [...earlier, paid("0.05", 1300)], NOW);
    expect(stop?.finding?.code).toBe("X402_DAILY_CAP_EXCEEDED");
    // A payment older than a day no longer counts.
    expect(siteStop(ask("0.10"), [open], [...earlier, paid("0.05", 1500)], NOW)).toBeNull();
  });

  it("leaves a payment in another asset to Baret's check", () => {
    expect(siteStop(ask("900", "0x5BB6...22fc"), [card()], [], NOW)).toBeNull();
  });

  it("moves the card's meters when a payment is signed", () => {
    const at = new Date(NOW).toISOString();
    const after = cardAfter(card(), [paid("0.05", 0), paid("0.10", 90)], at, "0.05");
    expect(after.spent).toEqual({ hour: "0.05", day: "0.15" });
    expect(after.paymentsToday).toBe(2);
    expect(after.lastUsed).toBe(at);
    expect(after.uses[0]).toEqual({ at, amount: "0.05" });
  });
});
