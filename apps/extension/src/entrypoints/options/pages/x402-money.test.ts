import { x402 } from "@baret/content";
import { fill } from "@baret/web-ui/lib/util";
import { describe, expect, it } from "vitest";
import type { Payment } from "../../../data/types.js";
import { readDraft, spentWithin } from "./x402-money.js";

const words = x402.merchants.capsDialog.errors;

describe("readDraft", () => {
  it("accepts caps PaymentGuard accepts", () => {
    expect(readDraft({ perPayment: "0.50", hour: "2", day: "10" }).caps).toEqual({
      perPayment: "0.50",
      hour: "2.00",
      day: "10.00",
    });
    expect(readDraft({ perPayment: "1", hour: "", day: "1" }).caps?.hour).toBeNull();
  });

  // PaymentGuard reverts InvalidCaps when perTxCap > dailyCap.
  it("rejects a per-payment cap above the daily cap", () => {
    const { caps, errors } = readDraft({ perPayment: "50", hour: "", day: "10" });
    expect(caps).toBeNull();
    expect(errors.day).toBe(words.dayBelowPayment);
  });

  // PaymentGuard reverts InvalidCaps when hourlyCap != 0 and hourlyCap < perTxCap.
  it("rejects an hourly cap below the per-payment cap", () => {
    const { caps, errors } = readDraft({ perPayment: "10", hour: "5", day: "20" });
    expect(caps).toBeNull();
    expect(errors.hour).toBe(words.hourBelowPayment);
  });

  it("rejects an hourly cap above the daily cap", () => {
    const { caps, errors } = readDraft({ perPayment: "1", hour: "30", day: "20" });
    expect(caps).toBeNull();
    expect(errors.hour).toBe(words.order);
  });

  it("rejects amounts that are not above 0", () => {
    const { caps, errors } = readDraft({ perPayment: "0", hour: "x", day: "" });
    expect(caps).toBeNull();
    expect(errors).toEqual({ perPayment: words.amount, hour: words.amount, day: words.amount });
  });
});

function payment(at: string, amount: string, asset = "USDC"): Payment {
  return {
    id: at,
    at,
    merchant: "m",
    amount,
    asset,
    facilitator: "f1",
    stage: "settled",
    hash: null,
  };
}

describe("spentWithin", () => {
  const at = "2026-10-04T12:00:00Z";

  it("adds in base units without float drift", () => {
    const list = [payment("2026-10-04T10:00:00Z", "0.1"), payment("2026-10-04T11:00:00Z", "0.2")];
    expect(spentWithin(list, 1, at)).toBe("0.30 USDC");
  });

  it("keeps each asset apart and labels it from the data", () => {
    const list = [
      payment("2026-10-04T10:00:00Z", "1.5"),
      payment("2026-10-04T11:00:00Z", "2", "USDT"),
      payment("2026-09-01T11:00:00Z", "9"),
    ];
    expect(spentWithin(list, 1, at)).toBe("1.50 USDC + 2.00 USDT");
  });

  // An amount with more decimals than USDC has cannot be read; the total must
  // not quietly drop it and show less than was spent.
  it("marks an asset's total unavailable when an amount cannot be read", () => {
    const list = [
      payment("2026-10-04T10:00:00Z", "1"),
      payment("2026-10-04T11:00:00Z", "0.1234567"),
      payment("2026-10-04T11:30:00Z", "2", "USDT"),
    ];
    expect(spentWithin(list, 1, at)).toBe(
      `${fill(x402.summary.unavailable, { asset: "USDC" })} + 2.00 USDT`,
    );
  });

  it("ignores an unreadable amount outside the window", () => {
    const list = [
      payment("2026-09-01T10:00:00Z", "0.1234567"),
      payment("2026-10-04T10:00:00Z", "1"),
    ];
    expect(spentWithin(list, 1, at)).toBe("1.00 USDC");
  });

  it("reads 0 when the ledger is empty", () => {
    expect(spentWithin([], 7, at)).toBe("0.00 USDC");
  });
});
