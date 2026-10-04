import { describe, expect, it } from "vitest";
import { fromTemplate } from "../data/rules.js";
import { ACCOUNT, ADDRESS, ASSETS, POLICY } from "../data/sample.js";
import type { Asset } from "../data/types.js";
import {
  checkAmount,
  checkRecipient,
  findingsFor,
  lookalikeOf,
  maxOf,
  transferRequest,
} from "./send.js";

function asset(symbol: string): Asset {
  const found = ASSETS.find((a) => a.symbol === symbol);
  if (!found) throw new Error(`no sample asset ${symbol}`);
  return found;
}

describe("the recipient", () => {
  it("refuses what is not an address, the account itself and a token contract", () => {
    expect(checkRecipient("0x1234", ACCOUNT.address, ASSETS)).toEqual({ issue: "invalidAddress" });
    expect(
      checkRecipient(ACCOUNT.address.toUpperCase().replace("0X", "0x"), ACCOUNT.address, ASSETS),
    ).toEqual({
      issue: "ownAddress",
    });
    expect(checkRecipient(ADDRESS.usdc, ACCOUNT.address, ASSETS)).toEqual({
      issue: "tokenContract",
      asset: "USDC",
    });
  });

  it("warns about a contract and passes a plain address", () => {
    expect(checkRecipient(ADDRESS.pool, ACCOUNT.address, ASSETS)).toEqual({
      issue: "contractAddress",
    });
    expect(checkRecipient(` ${ADDRESS.friend} `, ACCOUNT.address, ASSETS)).toBeNull();
  });

  it("catches a look-alike of an address from the history, and nothing else", () => {
    expect(lookalikeOf(ADDRESS.lookalike, [ADDRESS.friend])).toBe(ADDRESS.friend);
    expect(lookalikeOf(ADDRESS.friend, [ADDRESS.friend])).toBeNull();
    expect(lookalikeOf(ADDRESS.pool, [ADDRESS.friend])).toBeNull();
    expect(lookalikeOf("not an address", [ADDRESS.friend])).toBeNull();
  });
});

describe("the amount", () => {
  it("keeps the fee reserve back from MON and sends a token whole", () => {
    expect(maxOf(asset("MON"))).toBe("22.4879");
    expect(maxOf(asset("USDC"))).toBe("119.50");
  });

  it("asks for an amount, names the shortfall, and keeps MON for the fee", () => {
    expect(checkAmount("", asset("MON"), ASSETS)).toEqual({ issue: "amountZero" });
    expect(checkAmount("0", asset("MON"), ASSETS)).toEqual({ issue: "amountZero" });
    expect(checkAmount("120.5", asset("USDC"), ASSETS)).toEqual({
      issue: "amountTooHigh",
      short: "1.00",
    });
    expect(checkAmount("22.4979", asset("MON"), ASSETS)).toEqual({
      issue: "noFee",
      amount: "0.0021",
    });
    expect(checkAmount("22", asset("MON"), ASSETS)).toBeNull();
  });
});

describe("the request a transfer becomes", () => {
  it("is Safe to an unknown wallet, Caution to a contract on no list, Blocked to a listed address", () => {
    const usdc = asset("USDC");
    expect(transferRequest(usdc, "5", ADDRESS.friend, POLICY).verdict).toBe("safe");
    expect(transferRequest(usdc, "5", ADDRESS.pool, POLICY).verdict).toBe("caution");
    const blocked = transferRequest(usdc, "5", ADDRESS.drainer, POLICY);
    expect(blocked.verdict).toBe("blocked");
    expect(blocked.rules).toEqual([{ rule: "blockKnownMalicious" }]);
    expect(transferRequest(usdc, "5", ADDRESS.pool, fromTemplate("strict", [])).verdict).toBe(
      "blocked",
    );
  });

  it("carries no site, and calls the token contract for a token", () => {
    const request = transferRequest(asset("USDC"), "5", ADDRESS.friend, POLICY);
    expect(request.origin).toBeNull();
    expect(request.claim).toBeNull();
    expect(request.raw).toMatchObject({
      to: ADDRESS.usdc,
      value: "0",
      decoded: "transfer(to, amount)",
    });
    expect(request.changes).toEqual([{ direction: "out", value: "5.00", unit: "USDC" }]);
    expect(findingsFor(ADDRESS.friend)).toEqual([]);
  });
});
