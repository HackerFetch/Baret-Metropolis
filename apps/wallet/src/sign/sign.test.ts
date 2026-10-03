import { describe, expect, it } from "vitest";
import { SIGN_REQUESTS } from "../data/sample.js";
import type { SignRequest } from "../data/types.js";
import { fillParts } from "../lib/parts.js";
import {
  actionParts,
  actionText,
  blockedSummary,
  fixFor,
  impactText,
  logFor,
  ruleRows,
} from "./sign.js";

function sample(id: SignRequest["id"]): SignRequest {
  const request = SIGN_REQUESTS.find((r) => r.id === id);
  if (!request) throw new Error(`no sample ${id}`);
  return request;
}

const AT = "2026-10-03T16:00:00Z";

describe("the request's words", () => {
  it("names the action with the address shortened, and keeps the address's case", () => {
    expect(actionText(sample("safe"))).toBe("Send 0.50 MON to 0x5b0e…e2f4");
    const kept = actionParts(sample("blocked")).filter((part) => part.keep);
    expect(kept.map((part) => part.text)).toEqual(["0xa61f…7f30"]);
  });

  it("says what moves if you sign, with the address whole", () => {
    expect(impactText(sample("safe"))).toBe(
      "0.50 MON leaves your wallet for 0x5b0e2a3c9d4f71e86a0c2d9e4b7f31a6c8d0e2f4.",
    );
    expect(impactText(sample("unreachable"))).toBe(
      "Baret could not tell what moves. Treat that as a reason to stop.",
    );
  });

  it("sums up a block by its first rule and counts the rest", () => {
    expect(blockedSummary(sample("blocked"))).toBe(
      "Block unlimited allowances and 1 more rules stopped this request. Nothing was signed.",
    );
    expect(ruleRows(sample("blocked")).map((row) => row.label)).toEqual([
      "Block unlimited allowances",
      "Block listed addresses",
    ]);
  });

  it("suggests the fallback fix when the allowance carries no amount", () => {
    expect(fixFor(sample("blocked"))).toBe(
      "Decline, then ask the site for a request that fits your rules.",
    );
  });

  it("splits any template so chosen values keep their case", () => {
    expect(
      fillParts("{origin} wants to connect", { origin: "novaswap.example" }, new Set(["origin"])),
    ).toEqual([
      { text: "novaswap.example", keep: true },
      { text: " wants to connect", keep: false },
    ]);
  });
});

describe("what each outcome leaves in the activity log", () => {
  it("logs a declined Safe or Caution request as declined, never as Blocked", () => {
    expect(logFor(sample("caution"), "declined", AT, "1").kind).toBe("declined");
    expect(logFor(sample("unreachable"), "declined", AT, "1").kind).toBe("declined");
  });

  it("logs a declined Blocked request as blocked, with the rule that stopped it", () => {
    const item = logFor(sample("blocked"), "declined", AT, "1");
    expect(item.kind).toBe("blocked");
    expect(item.rule).toBe("blockUnlimitedApprovals");
  });

  it("logs an override with the rule it went past, or as unchecked when Baret was unreachable", () => {
    expect(logFor(sample("blocked"), "overridden", AT, "1")).toMatchObject({
      kind: "overridden",
      rule: "blockUnlimitedApprovals",
    });
    expect(logFor(sample("unreachable"), "overridden", AT, "1").kind).toBe("unchecked");
  });

  it("logs a signed transfer as sent and any other signed call as signed", () => {
    expect(logFor(sample("safe"), "sent", AT, "48212045")).toMatchObject({
      kind: "sent",
      values: { amount: "0.50", asset: "MON" },
      block: "48212045",
    });
    expect(logFor(sample("caution"), "sent", AT, "1").kind).toBe("signed");
    expect(logFor(sample("safe"), "expired", AT, "1").kind).toBe("expired");
  });
});
