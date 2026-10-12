import type { FindingCode } from "@baret/guard";

/**
 * What a live revoke screen says once the store answers. Only an id Monad
 * confirmed closed counts as revoked; anything else is still open, and the
 * screen says why when the wallet knows.
 */

/** Why one revoke did not close its grant. */
export interface RevokeStop {
  readonly id: string;
  /**
   * locked: the wallet had no open key. blocked: Baret's check refused it,
   * `code` names the first finding. unreachable: Baret did not answer, so
   * nothing was signed. failed: sent, or about to be, and not confirmed.
   */
  readonly why: "locked" | "blocked" | "unreachable" | "failed";
  readonly code: FindingCode | null;
}

export interface RevokeResult {
  readonly closed: readonly string[];
  readonly stopped: readonly RevokeStop[];
}

export type RevokeOutcome =
  | { readonly kind: "done"; readonly count: number }
  | { readonly kind: "partial"; readonly count: number; readonly total: number }
  | {
      readonly kind: "failed";
      readonly total: number;
      /** The first reason the wallet gave, when it gave one. */
      readonly stop: Omit<RevokeStop, "id"> | null;
    };

export function revokeOutcome(
  asked: readonly string[],
  result: RevokeResult | readonly string[],
): RevokeOutcome {
  const { closed, stopped }: RevokeResult = Array.isArray(result)
    ? { closed: result as readonly string[], stopped: [] }
    : (result as RevokeResult);
  const confirmed = asked.filter((id) => closed.includes(id)).length;
  const total = asked.length;
  if (total === 0 || confirmed === 0) {
    const first = stopped.find((s) => asked.includes(s.id)) ?? null;
    return { kind: "failed", total, stop: first ? { why: first.why, code: first.code } : null };
  }
  if (confirmed < total) return { kind: "partial", count: confirmed, total };
  return { kind: "done", count: confirmed };
}
