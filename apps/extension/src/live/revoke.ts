import type { FindingCode } from "@baret/guard";
import { NotClearedError } from "@baret/wallet-core";
import type { RevokeResult, RevokeStop } from "../data/revoke-outcome.js";
import type { Account, Permission } from "../data/types.js";
import { revokeCall } from "./records-chain.js";
import { walletFor } from "./wallet.js";

/**
 * Revokes for real: one transaction per grant (`approve(holder, 0)` or
 * `setApprovalForAll(holder, false)`), checked by Baret like anything else
 * the wallet signs, and counted only once Monad confirmed it. Returns the
 * ids that are closed and, for each that is not, why: a locked wallet,
 * Baret's refusal with its first finding, Baret out of reach, or a
 * transaction that did not confirm. Every one of those leaves its row on
 * the list.
 *
 * A revoke only takes risk away, so the MON floor rule does not apply to
 * it: an account near empty must still be able to close a drainer's
 * allowance. Every other rule stays on, and no answer is still no signature.
 */
export async function revokeGrants(
  permissions: readonly Permission[],
  accounts: readonly Account[],
  policy: Parameters<typeof walletFor>[0],
): Promise<RevokeResult> {
  const closed: string[] = [];
  const stopped: RevokeStop[] = [];
  const rules = { ...policy, minPostNativeBalance: null };
  // One after another: they share the account's nonce.
  for (const permission of permissions) {
    const call = revokeCall(permission.id);
    const address = accounts.find((a) => a.id === permission.account)?.address;
    if (!call || !address) continue;
    const wallet = await walletFor(rules, address);
    if (!wallet) {
      stopped.push({ id: permission.id, why: "locked", code: null });
      break;
    }
    try {
      const { receipt } = await wallet.checkAndSign(call);
      if (receipt.ok) closed.push(permission.id);
      else stopped.push({ id: permission.id, why: "failed", code: null });
    } catch (error) {
      stopped.push({ id: permission.id, ...stopOf(error) });
    }
  }
  return { closed, stopped };
}

/** Why a revoke did not go through, from what the wallet threw. */
export function stopOf(error: unknown): Omit<RevokeStop, "id"> {
  if (error instanceof NotClearedError) {
    const first =
      error.verdict.findings.find((f) => f.blocking) ??
      error.verdict.findings[0] ??
      error.verdict.firedRules[0];
    return { why: "blocked", code: (first?.code as FindingCode | undefined) ?? null };
  }
  if (error instanceof Error && error.name === "GuardUnreachableError") {
    return { why: "unreachable", code: null };
  }
  return { why: "failed", code: null };
}
