import { novaswap } from "@baret/content";
import { SITE_ART } from "../../shared/assets.js";
import type { DemoMode, SampleResult } from "../kit/types.js";

/**
 * NovaSwap's prepared sample. Frontend only: no wallet is asked, no contract
 * is called and no request leaves the page. The addresses below are sample
 * data; the attack router differs from the honest one by its last character,
 * which is exactly the kind of difference a person does not see.
 *
 * When the demo routers are deployed and the server is connected, a live
 * CheckSource replaces `sampleCheck` with the same SampleResult shape.
 */

export const SAMPLE = {
  wallet: "0x7a3f9e21c84b5d06f13a2e9b7c40d58e6f21c21e",
  router: "0x4e1b7c2a9d3f6058b1e24c7a9f30d6b8e15a2c90",
  lookalike: "0x4e1b7c2a9d3f6058b1e24c7a9f30d6b8e15a2c9e",
  /** Fixed test rate: USDC per MON. */
  rate: 3.2,
  /** The sample wallet's MON balance. */
  balance: 25,
} as const;

/** The three NovaSwap pictures (paths live in shared/assets.ts). */
export const ART = SITE_ART.novaswap;

/** "12.5" -> 12.5; anything that is not a positive number -> null. */
export function parseAmount(raw: string): number | null {
  const value = Number(raw.replace(",", ".").trim());
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Two decimals, no grouping: what the swap card and the panel print. */
export function format(value: number): string {
  return value.toFixed(2);
}

/** The USDC a given MON amount buys at the fixed test rate. */
export function quote(mon: number): number {
  return Math.round(mon * SAMPLE.rate * 100) / 100;
}

/**
 * The sample result for one version of the swap. Honest: Safe, MON out and
 * USDC in. Attack: Blocked by the reported look-alike router, MON out and
 * nothing in, because the USDC is paid to another wallet.
 */
export function sampleCheck(mode: DemoMode, mon: number): SampleResult {
  const out = { direction: "out", value: format(mon), unit: "MON" } as const;
  if (mode === "safe") {
    return {
      verdict: "safe",
      contract: SAMPLE.router,
      findings: [],
      changes: [out, { direction: "in", value: format(quote(mon)), unit: "USDC" }],
    };
  }
  return {
    verdict: "blocked",
    contract: SAMPLE.lookalike,
    findings: [{ code: "RISKY_CONTRACT_INTERACTION", values: { contract: SAMPLE.lookalike } }],
    changes: [
      out,
      {
        direction: "in",
        value: format(0),
        unit: "USDC",
        note: novaswap.scenario.watchFor[1],
      },
    ],
  };
}
