import type { AnalyzeResponse } from "@baret/guard";
import { FAILED } from "@baret/web-ui/lib/check";
import type { CheckApproval, CheckChange, CheckResult } from "@baret/web-ui/lib/check-types";

/**
 * Baret's live answer for a demo dApp. The showcase reaches the server at
 * `/api` (the Vite proxy in development, a Vercel rewrite in production), so
 * there is no URL to configure.
 *
 * Fail-closed at every step: a non-2xx status or an answer that does not
 * match the /v1/analyze contract becomes FAILED (Blocked). A network error
 * or an abort rejects, which `runCheck` turns into FAILED as well.
 */

export const ANALYZE_URL = "/api/v1/analyze";

/** An unsigned call, as `@baret/demo` builds it. */
export interface DemoCall {
  readonly from: string;
  readonly to: string;
  readonly value: string;
  readonly data: string;
}

export async function analyzeCall(call: DemoCall, signal: AbortSignal): Promise<CheckResult> {
  const res = await fetch(ANALYZE_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ network: "testnet", transaction: call, userWallet: call.from }),
    signal,
  });
  if (!res.ok) return FAILED;
  // The schema (and zod with it) loads only when a live check runs.
  const { analyzeResponseSchema } = await import("@baret/guard");
  const parsed = analyzeResponseSchema.safeParse(await res.json());
  return parsed.success ? fromAnalyzeResponse(parsed.data, call.from) : FAILED;
}

/**
 * Base units to a short display amount: at most four decimals, cut (never
 * rounded up), no trailing zeros. BigInt maths only, so the live seam does
 * not pull in a chain library. A negative amount keeps its sign; a negative
 * or fractional `decimals` throws, which the caller turns into FAILED.
 */
export function displayAmount(raw: bigint, decimals: number): string {
  if (!Number.isInteger(decimals) || decimals < 0) throw new RangeError("decimals");
  const sign = raw < 0n ? "-" : "";
  const abs = raw < 0n ? -raw : raw;
  const base = 10n ** BigInt(decimals);
  const whole = (abs / base).toString();
  const fraction = (abs % base).toString().padStart(decimals, "0");
  const short = fraction.slice(0, 4).replace(/0+$/, "");
  return `${sign}${short ? `${whole}.${short}` : whole}`;
}

/** A contract address cut to its head and tail, the unit of a token with no symbol. */
export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * AnalyzeResponse to what the panel reads. Only the visitor's own balance
 * changes and allowances are shown: that is the "What changes" a wallet
 * would show before signing. A token with no symbol is named by its
 * shortened contract address, so an allowance never shows a blank unit.
 * firedRules, suggestions, sources and expiresAt are not mapped yet:
 * CheckResult has no place for them.
 */
export function fromAnalyzeResponse(response: AnalyzeResponse, wallet: string): CheckResult {
  const changes: CheckChange[] = response.estimatedChanges
    .filter((c) => same(c.account, wallet))
    .flatMap((c) => {
      const delta = BigInt(c.delta);
      if (delta === 0n) return [];
      const abs = delta < 0n ? -delta : delta;
      return [
        {
          direction: delta < 0n ? "out" : "in",
          value: displayAmount(abs, c.asset.decimals),
          unit: c.asset.symbol || (c.asset.address ? shortAddress(c.asset.address) : ""),
        } as const,
      ];
    });

  const approvals: CheckApproval[] = response.approvals
    .filter((a) => same(a.owner, wallet))
    .map((a) => ({
      unit: a.symbol || shortAddress(a.contract),
      spender: a.spender,
      unlimited: a.unlimited,
      amount:
        a.unlimited || a.amount === null || a.decimals === null
          ? null
          : displayAmount(BigInt(a.amount), a.decimals),
    }));

  return {
    source: "live",
    verdict: response.decision,
    findings: response.findings.map((f) => ({ code: f.code, values: f.values })),
    changes,
    approvals,
  };
}
