import { findings } from "@baret/content";
import { describe, expect, it } from "vitest";
import { nextState } from "../kit/useSampleCheck.js";
import { format, parseAmount, quote, SAMPLE, sampleCheck } from "./sample.js";

describe("NovaSwap amount", () => {
  it("reads dots, commas and spaces, and refuses anything that is not positive", () => {
    expect(parseAmount("2.5")).toBe(2.5);
    expect(parseAmount(" 12,5 ")).toBe(12.5);
    for (const raw of ["", "0", "-1", "abc", "1e400"]) expect(parseAmount(raw)).toBeNull();
  });

  it("quotes USDC at the fixed test rate, to the cent", () => {
    expect(quote(2.5)).toBe(8);
    expect(format(quote(1.11))).toBe("3.55");
  });
});

describe("NovaSwap sample", () => {
  it("passes the honest swap: Safe, no findings, USDC back to the wallet", () => {
    const result = sampleCheck("safe", 2.5);
    expect(result.verdict).toBe("safe");
    expect(result.findings).toEqual([]);
    expect(result.contract).toBe(SAMPLE.router);
    expect(result.changes).toEqual([
      { direction: "out", value: "2.50", unit: "MON" },
      { direction: "in", value: "8.00", unit: "USDC" },
    ]);
  });

  it("blocks the attack: the reported look-alike, MON out and nothing in", () => {
    const result = sampleCheck("danger", 2.5);
    expect(result.verdict).toBe("blocked");
    expect(result.contract).toBe(SAMPLE.lookalike);
    expect(result.findings.map((f) => f.code)).toEqual(["RISKY_CONTRACT_INTERACTION"]);
    expect(result.changes[1]).toMatchObject({ direction: "in", value: "0.00" });
    for (const f of result.findings) expect(findings[f.code]).toBeDefined();
  });

  it("uses a look-alike that differs from the real router by one character", () => {
    const diff = [...SAMPLE.router].filter((c, i) => c !== SAMPLE.lookalike[i]);
    expect(SAMPLE.lookalike).toHaveLength(SAMPLE.router.length);
    expect(diff).toHaveLength(1);
  });
});

describe("panel phases", () => {
  it("walks every phase once, then stays done", () => {
    let state = nextState({ phase: "checking", step: 0 }, 4);
    expect(state).toEqual({ phase: "checking", step: 1 });
    state = nextState(nextState(state, 4), 4);
    expect(state).toEqual({ phase: "checking", step: 3 });
    state = nextState(state, 4);
    expect(state).toEqual({ phase: "done" });
    expect(nextState(state, 4)).toBe(state);
    expect(nextState({ phase: "idle" }, 4)).toEqual({ phase: "idle" });
  });
});
