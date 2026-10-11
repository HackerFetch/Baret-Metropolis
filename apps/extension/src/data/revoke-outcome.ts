/**
 * What a live revoke screen says once the store answers. Only an id Monad
 * confirmed closed counts as revoked; anything else is still open.
 */
export type RevokeOutcome =
  | { readonly kind: "done"; readonly count: number }
  | { readonly kind: "partial"; readonly count: number; readonly total: number }
  | { readonly kind: "failed"; readonly total: number };

export function revokeOutcome(asked: readonly string[], closed: readonly string[]): RevokeOutcome {
  const confirmed = asked.filter((id) => closed.includes(id)).length;
  const total = asked.length;
  if (total === 0 || confirmed === 0) return { kind: "failed", total };
  if (confirmed < total) return { kind: "partial", count: confirmed, total };
  return { kind: "done", count: confirmed };
}
