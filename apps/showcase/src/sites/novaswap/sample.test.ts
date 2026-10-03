import { findings } from "@baret/content";
import { DEMO_USDC_ABI, NOVASWAP, NOVASWAP_ROUTER_ABI } from "@baret/demo";
import { decodeFunctionData, maxUint256, parseEther } from "viem";
import { describe, expect, it } from "vitest";
import { hasValues } from "../kit/panel/Blocks.js";
import { balanceOf, format, parseAmount, quote, quoteBack, SAMPLE, sampleCheck } from "./sample.js";
import { buildRequest, contractOf, sourceFor } from "./source.js";

const from = SAMPLE.wallet;

describe("NovaSwap amount", () => {
  it("reads dots, commas and spaces, and refuses anything that is not positive", () => {
    expect(parseAmount("2.5")).toBe(2.5);
    expect(parseAmount(" 12,5 ")).toBe(12.5);
    for (const raw of ["", "0", "-1", "abc", "1e400"]) expect(parseAmount(raw)).toBeNull();
  });

  it("quotes both ways at the router's fixed rate, to the cent", () => {
    expect(quote(2.5)).toBe(8);
    expect(format(quote(1.11))).toBe("3.55");
    expect(quoteBack(32)).toBe(10);
  });

  it("spends MON when honest and dUSDC in the attack", () => {
    expect(balanceOf("safe")).toBe(SAMPLE.mon);
    expect(balanceOf("danger")).toBe(SAMPLE.usdc);
  });
});

describe("NovaSwap sample", () => {
  it("passes the honest swap: Safe, no findings, MON out and dUSDC in", () => {
    const result = sampleCheck("safe", 2.5);
    expect(result).toMatchObject({
      source: "sample",
      verdict: "safe",
      findings: [],
      approvals: [],
    });
    expect(result.changes).toEqual([
      { direction: "out", value: "2.50", unit: "MON" },
      { direction: "in", value: "8.00", unit: "dUSDC" },
    ]);
  });

  it("blocks the attack twice, as Baret does live: unlimited allowance and a listed spender", () => {
    const result = sampleCheck("danger", 20);
    expect(result.verdict).toBe("blocked");
    expect(result.findings.map((f) => f.code)).toEqual([
      "ERC20_APPROVAL_UNLIMITED",
      "KNOWN_MALICIOUS_ADDRESS",
    ]);
    expect(result.changes).toEqual([]);
    expect(result.approvals).toEqual([
      { unit: "dUSDC", spender: NOVASWAP.lookalike, unlimited: true, amount: null },
    ]);
  });

  it("fills every value each finding sentence needs, and drops the fix that does not apply", () => {
    for (const f of sampleCheck("danger", 20).findings) {
      expect(hasValues(findings[f.code].body, f.values)).toBe(true);
    }
    const [unlimited] = sampleCheck("danger", 20).findings;
    expect(unlimited && hasValues(findings.ERC20_APPROVAL_UNLIMITED.fix, unlimited.values)).toBe(
      false,
    );
  });
});

describe("NovaSwap request", () => {
  it("honest: swapMonForUsdc on the router, paying the MON typed", () => {
    const call = buildRequest({ mode: "safe", amount: "2,5", from });
    expect(call.to).toBe(NOVASWAP.router);
    expect(call.from).toBe(from);
    expect(call.value).toBe(parseEther("2.5").toString());
    const decoded = decodeFunctionData({
      abi: NOVASWAP_ROUTER_ABI,
      data: call.data as `0x${string}`,
    });
    expect(decoded.functionName).toBe("swapMonForUsdc");
  });

  it("attack: an unlimited dUSDC allowance to the look-alike, no MON", () => {
    const call = buildRequest({ mode: "danger", amount: "20", from });
    expect(call.to).toBe(NOVASWAP.usdc);
    expect(call.value).toBe("0");
    const decoded = decodeFunctionData({ abi: DEMO_USDC_ABI, data: call.data as `0x${string}` });
    expect(decoded.functionName).toBe("approve");
    expect(decoded.args).toEqual([NOVASWAP.lookalike, maxUint256]);
  });

  it("names the contract each version touches, one character apart", () => {
    expect(contractOf("safe")).toBe(NOVASWAP.router);
    expect(contractOf("danger")).toBe(NOVASWAP.lookalike);
    expect(NOVASWAP.lookalike.slice(-4)).not.toBe(NOVASWAP.router.slice(-4));
  });

  it("answers from the sample when there is no wallet to simulate from", async () => {
    const source = sourceFor(null);
    const result = await source(
      { mode: "safe", amount: "2.5", from },
      new AbortController().signal,
    );
    expect(result.source).toBe("sample");
  });
});
