import { agents } from "@baret/demo";
import { FAILED } from "@baret/web-ui/lib/check";
import type { CheckResult, CheckSource } from "@baret/web-ui/lib/check-types";
import { type Address, getAddress } from "viem";
// By file, like sample.ts: this module imports types only, so zod stays out of the chunk.
import { createPolicy } from "../../../../../packages/guard/src/policy-templates.js";
import { ANALYZE_URL, analyze, fromAnalyzeResponse } from "../../sites/kit/live.js";
import { type ActionId, type PolicyName, SAMPLES, verdictFor } from "./sample.js";

/**
 * Where "Check it as the agent" goes. The one place that knows the request
 * and the source of the answer.
 *
 * With `VITE_BARET_PLAYGROUND=live` both paths go to Baret's `/v1/analyze`
 * and fail closed: the six actions through `@baret/demo`'s `agents`
 * builders, "paste your own" with the picked policy. Without the flag the
 * six actions answer from the prepared samples, and a pasted transaction is
 * NOT_SENT: fail-closed like a failed check, but the page says nothing was
 * sent instead of "can't reach Baret".
 *
 * The six actions all sign from `VITE_BARET_PLAYGROUND_AGENT`, a wallet kept
 * funded with MON, real test USDC and fake USDC (same need as
 * `verify-demo`'s own `--from`): the engine's loss rule and its post-balance
 * floor cannot be computed from a zero balance and fail closed when they
 * cannot, which would turn "pay" and "the wrong address" into Blocked no
 * matter what they are built to show. Unset or invalid, the six actions
 * answer from the prepared samples even with the live flag, and only a
 * pasted transaction goes live.
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

const agentEnv: unknown = import.meta.env.VITE_BARET_PLAYGROUND_AGENT;

/**
 * The address the six live actions sign from: the funded wallet named by
 * `VITE_BARET_PLAYGROUND_AGENT`, else null (`env` is only a parameter so a
 * test can pick the branch directly).
 */
export function agentAddress(env: unknown = agentEnv): Address | null {
  return typeof env === "string" && isAddress(env) ? getAddress(env) : null;
}

/** The funded agent of this build, or null when none is set. */
export const AGENT = agentAddress();

/** True when the six actions go live: the flag and a funded agent address. */
export const LIVE_ACTIONS = LIVE && AGENT !== null;

/**
 * A pasted transaction this build did not send. A failed check (Blocked), kept
 * as its own object so the page can say why: `runCheck` resolves the source's
 * answer as it is, so the reference survives.
 */
export const NOT_SENT: CheckResult = { ...FAILED };

/** True when the answer is NOT_SENT: nothing was sent, so nothing was checked. */
export function isNotSent(result: CheckResult): boolean {
  return result === NOT_SENT;
}

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

/**
 * One of the six actions, live: `@baret/demo`'s builder for it, with the
 * picked template as `policyTemplate` (the server fills in full rules). The
 * two shapes split exactly as `analyzeRequestSchema` expects them: an x402
 * builder's `{ typedData, payment }` spread as is, never under `transaction`.
 */
function liveActionResult(
  action: ActionId,
  policy: PolicyName,
  from: Address,
  signal: AbortSignal,
): Promise<CheckResult> {
  const built = agents[action](from);
  return "typedData" in built
    ? analyze(
        { typedData: built.typedData, payment: built.payment, policyTemplate: policy },
        built.typedData.signer,
        signal,
      )
    : analyze(
        { transaction: built, userWallet: built.from, policyTemplate: policy },
        built.from,
        signal,
      );
}

/**
 * Picks the answer for one run; `runCheck` turns any failure into Blocked.
 * The six actions go live only with a funded agent address as well: from an
 * unfunded one the loss rules fail closed and the verdicts would mislead.
 */
export function sourceFor(
  live: boolean,
  agent: Address | null = AGENT,
): CheckSource<PlaygroundInput> {
  return async (input, signal) => {
    if (input.kind === "action") {
      return live && agent
        ? liveActionResult(input.action, input.policy, agent, signal)
        : sampleResult(input.action, input.policy);
    }
    if (!live) return NOT_SENT;
    return liveResult(input.transaction, input.from, input.policy, signal);
  };
}
