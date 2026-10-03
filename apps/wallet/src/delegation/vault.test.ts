import { ADDRESS, VAULT } from "@baret/wallet-ui/data/sample";
import { describe, expect, it } from "vitest";
import { merchantFrom, SAMPLE_AGENT_KEY, vaultAmount, withdrawable } from "./vault.js";

describe("the vault", () => {
  it("reads positive amounts only", () => {
    expect(vaultAmount("5")).toBe("5.00");
    expect(vaultAmount("0.5")).toBe("0.50");
    expect(vaultAmount("0")).toBeNull();
    expect(vaultAmount("five")).toBeNull();
  });

  it("lets a withdrawal take only what the merchants do not reserve", () => {
    // 60.00 in the vault, 15.00 reserved by the two merchants (the paused one too).
    expect(withdrawable(VAULT, "45")).toBe("ok");
    expect(withdrawable(VAULT, "45.01")).toBe("reserved");
    expect(withdrawable(VAULT, "")).toBe("invalid");
  });
});

describe("a new merchant", () => {
  const form = { address: ADDRESS.friend, origin: "", perPayment: "1", perHour: "", perDay: "10" };

  it("takes an address and two caps, the hourly one optional", () => {
    expect(merchantFrom(form)).toEqual({
      merchant: {
        address: ADDRESS.friend,
        origin: ADDRESS.friend,
        perPayment: "1.00",
        perHour: null,
        perDay: "10.00",
        spent: "0.00",
        status: "active",
      },
    });
    const hourly = merchantFrom({ ...form, perHour: "4" });
    expect("merchant" in hourly && hourly.merchant.perHour).toBe("4.00");
  });

  it("names the first field it can't read", () => {
    expect(merchantFrom({ ...form, address: "0x12" })).toEqual({ issue: "address" });
    expect(merchantFrom({ ...form, perPayment: "" })).toEqual({ issue: "perPayment" });
    expect(merchantFrom({ ...form, perHour: "x" })).toEqual({ issue: "perHour" });
    expect(merchantFrom({ ...form, perDay: "0" })).toEqual({ issue: "perDay" });
  });

  it("keeps the sample agent key obviously made up", () => {
    expect(SAMPLE_AGENT_KEY).toMatch(/^0x(5a3c){16}$/);
  });
});
