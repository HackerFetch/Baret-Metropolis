import { FAILED } from "@baret/web-ui/lib/check";
import type { CheckResult, CheckSource } from "@baret/web-ui/lib/check-types";
// By file, like sample.ts: this module imports types only, so zod stays out of the chunk.
import { createPolicy } from "../../../../../packages/guard/src/policy-templates.js";
import { ANALYZE_URL, fromAnalyzeResponse } from "../../sites/kit/live.js";
import { type ActionId, type PolicyName, SAMPLES, verdictFor } from "./sample.js";

/**
 * Where "Check it as the agent" goes. The one place that knows the request
 * and the source of the answer.
 *
 * The six actions always answer from the prepared samples: their requests
 * would need builders in `@baret/demo` (not shipped yet), and the frontend
 * never writes calldata by hand. "Paste your own" is a real transaction: with
 * `VITE_BARET_PLAYGROUND=live` it goes to Baret's `/v1/analyze` with the
 * picked policy; without it nothing is sent, and since nothing was checked,
 * the answer is the fail-closed one. With the defaults the page never calls
 * the API.
 */

export type PlaygroundInput =
  | { readonly kind: "action"; readonly action: ActionId; readonly policy: PolicyName }
  | {
      readonly kind: "custom";
      readonly transaction: ParsedTransaction;
      readonly from: string;
      readonly policy: PolicyName;
    };

/**
 * A request as pasted: raw hex, or the to / value / data of a JSON request,
 * with its own `from` when it names one.
 */
export type ParsedTransaction =
  | { readonly raw: string }
  | { readonly to: string; readonly value: string; readonly data: string; readonly from?: string };

const HEX = /^0x(?:[0-9a-fA-F]{2})+$/;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
/** Base units, as the server reads them: decimal digits or 0x hex. */
const AMOUNT = /^(?:\d+|0x[0-9a-fA-F]+)$/;

/** A 0x address of 40 hex digits. */
export function isAddress(text: string): boolean {
  return ADDRESS.test(text);
}

function amountOf(value: unknown): string | null {
  if (typeof value === "number")
    return Number.isSafeInteger(value) && value >= 0 ? String(value) : null;
  return typeof value === "string" && AMOUNT.test(value) ? value : null;
}

/**
 * Raw hex, or JSON with a `to` address and optional `value` (base units),
 * `data` and `from`. Anything else is unreadable.
 */
export function parseTransaction(text: string): ParsedTransaction | null {
  const input = text.trim();
  if (input === "") return null;
  if (HEX.test(input) && input.length >= 10) return { raw: input };
  try {
    const json: unknown = JSON.parse(input);
    if (typeof json !== "object" || json === null || Array.isArray(json)) return null;
    const { to, value = "0", data = "0x", from } = json as Record<string, unknown>;
    if (typeof to !== "string" || !isAddress(to)) return null;
    if (typeof data !== "string" || !(data === "0x" || HEX.test(data))) return null;
    const amount = amountOf(value);
    if (amount === null) return null;
    if (from === undefined) return { to, value: amount, data };
    return typeof from === "string" && isAddress(from) ? { to, value: amount, data, from } : null;
  } catch {
    return null;
  }
}

/** Who sends it: the pasted request's own `from`, else the agent address. */
export function senderOf(transaction: ParsedTransaction, agent: string): string {
  return "from" in transaction && transaction.from ? transaction.from : agent;
}

/**
 * The `/v1/analyze` body for a pasted transaction: the picked template as a
 * full policy (the server takes rules, not a template name), the sender as
 * the wallet the loss rules protect. The playground sends no x402 payment,
 * so the template's empty asset list is never read.
 */
export function requestFor(transaction: ParsedTransaction, from: string, policy: PolicyName) {
  return {
    network: "testnet",
    transaction:
      "raw" in transaction
        ? { raw: transaction.raw }
        : { from, to: transaction.to, value: transaction.value, data: transaction.data },
    policy: createPolicy(policy, { allowedAssets: [] }),
    userWallet: from,
  } as const;
}

const env: unknown = import.meta.env.VITE_BARET_PLAYGROUND;

/** True only when the env flag asks for live answers. */
export const LIVE = env === "live";

/** The prepared answer for one action under one policy. */
export function sampleResult(action: ActionId, policy: PolicyName): CheckResult {
  const sample = SAMPLES[action];
  return {
    source: "sample",
    verdict: verdictFor(sample.findings, policy).verdict,
    findings: sample.findings,
    changes: sample.changes,
    approvals: sample.approvals,
  };
}

async function liveResult(
  transaction: ParsedTransaction,
  from: string,
  policy: PolicyName,
  signal: AbortSignal,
): Promise<CheckResult> {
  // The schemas load with the first live check only.
  const { analyzeRequestSchema, analyzeResponseSchema } = await import("@baret/guard");
  const request = analyzeRequestSchema.safeParse(requestFor(transaction, from, policy));
  if (!request.success) return FAILED;
  const res = await fetch(ANALYZE_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request.data),
    signal,
  });
  if (!res.ok) return FAILED;
  const parsed = analyzeResponseSchema.safeParse(await res.json());
  return parsed.success ? fromAnalyzeResponse(parsed.data, from) : FAILED;
}

/** Picks the answer for one run; `runCheck` turns any failure into Blocked. */
export function sourceFor(live: boolean): CheckSource<PlaygroundInput> {
  return async (input, signal) => {
    if (input.kind === "action") return sampleResult(input.action, input.policy);
    if (!live) return FAILED;
    return liveResult(input.transaction, input.from, input.policy, signal);
  };
}
