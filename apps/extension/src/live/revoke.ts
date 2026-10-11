import type { Account, Permission } from "../data/types.js";
import { revokeCall } from "./records-chain.js";
import { walletFor } from "./wallet.js";

/**
 * Revokes for real: one transaction per grant (`approve(holder, 0)` or
 * `setApprovalForAll(holder, false)`), checked by Baret like anything else
 * the wallet signs, and counted only once Monad confirmed it. Returns the
 * ids that are closed; a locked wallet, a refusal or a failed transaction
 * leaves its row on the list.
 */
export async function revokeGrants(
  permissions: readonly Permission[],
  accounts: readonly Account[],
  policy: Parameters<typeof walletFor>[0],
): Promise<string[]> {
  const done: string[] = [];
  // One after another: they share the account's nonce.
  for (const permission of permissions) {
    const call = revokeCall(permission.id);
    const address = accounts.find((a) => a.id === permission.account)?.address;
    if (!call || !address) continue;
    try {
      const wallet = await walletFor(policy, address);
      if (!wallet) break;
      const { receipt } = await wallet.checkAndSign(call);
      if (receipt.ok) done.push(permission.id);
    } catch {
      // Not cleared, not sent or not confirmed: the grant is still open.
    }
  }
  return done;
}
