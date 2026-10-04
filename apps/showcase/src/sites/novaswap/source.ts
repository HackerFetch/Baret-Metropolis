import { NOVASWAP, novaswap } from "@baret/demo";
import type { CheckSource, DemoMode } from "@baret/web-ui/lib/check-types";
import { type Address, isAddress, parseEther } from "viem";
import type { DemoCall } from "../kit/live.js";
import { sampleCheck } from "./sample.js";

/**
 * Where NovaSwap's "Review swap" goes. The one place that knows both the
 * request and the source of the answer.
 *
 * The request comes from `@baret/demo`, so the frontend never writes
 * calldata: honest is `swapMonForUsdc` on the router, attack is the
 * "enable trading" approval, `approve(look-alike, unlimited)` on dUSDC.
 *
 * The answer is live when there is a real wallet to simulate from, and the
 * prepared sample otherwise. Until wallet connect lands, a developer can set
 * VITE_BARET_DEMO_FROM to a funded testnet address (no key needed: Baret
 * only simulates) to see live answers. Unset, the page never calls the API.
 */

export interface SwapInput {
  readonly mode: DemoMode;
  /** What the visitor typed, already validated: MON when honest, dUSDC in the attack. */
  readonly amount: string;
  readonly from: Address;
}

const envFrom: unknown = import.meta.env.VITE_BARET_DEMO_FROM;

/** The address live checks simulate from, or null for the sample. */
export const DEMO_FROM: Address | null =
  typeof envFrom === "string" && isAddress(envFrom) ? envFrom : null;

/** The call each version asks the wallet to sign. */
export function buildRequest(input: SwapInput): DemoCall {
  return input.mode === "safe"
    ? novaswap.swapMonForUsdc(input.from, parseEther(input.amount.replace(",", ".").trim()))
    : novaswap.attackApprove(input.from);
}

/** The contract each version's request touches, for "What the site asks for". */
export function contractOf(mode: DemoMode): Address {
  return mode === "safe" ? NOVASWAP.router : NOVASWAP.lookalike;
}

const sampleSource: CheckSource<SwapInput> = async (input) =>
  sampleCheck(input.mode, Number(input.amount.replace(",", ".")));

/** The live path loads only when a check runs, so the sample page never fetches it. */
const liveSource: CheckSource<SwapInput> = async (input, signal) => {
  const { analyzeCall } = await import("../kit/live.js");
  return analyzeCall(buildRequest(input), signal);
};

/** Live with a wallet to simulate from, the sample without. */
export function sourceFor(from: Address | null): CheckSource<SwapInput> {
  return from ? liveSource : sampleSource;
}
