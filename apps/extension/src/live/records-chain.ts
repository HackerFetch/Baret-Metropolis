import { createPublicClient, encodeFunctionData, type Hex, http, parseAbi } from "viem";
import type { Account, Payment, Permission } from "../data/types.js";
import { RPC_URL } from "./config.js";
import { grantOf } from "./records.js";

/**
 * What Monad says about the live wallet's lists now. A grant that the chain
 * no longer holds (revoked here or anywhere else) leaves the list; a payment
 * whose authorisation the token has used reads as settled. A read that fails
 * changes nothing: a row is never dropped on a guess.
 */

const ABI = parseAbi([
  "function allowance(address owner, address spender) view returns (uint256)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function authorizationState(address authorizer, bytes32 nonce) view returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function setApprovalForAll(address operator, bool approved)",
]);

let shared: ReturnType<typeof createPublicClient> | null = null;
function client() {
  shared ??= createPublicClient({
    transport: http(RPC_URL, { batch: { wait: 10 }, retryCount: 5, retryDelay: 250 }),
  });
  return shared;
}

/** The grants still open on-chain, in the list's order. */
export async function openGrants(
  permissions: readonly Permission[],
  accounts: readonly Account[],
): Promise<Permission[]> {
  const kept = await Promise.all(
    permissions.map(async (p) => {
      const grant = grantOf(p.id);
      const owner = accounts.find((a) => a.id === p.account)?.address as Hex | undefined;
      // Not a grant this module can read (an agent's caps, a sample row): left as it is.
      if (!grant || !owner) return true;
      try {
        return grant.kind === "allowance"
          ? (await client().readContract({
              address: grant.contract,
              abi: ABI,
              functionName: "allowance",
              args: [owner, grant.holder],
            })) > 0n
          : await client().readContract({
              address: grant.contract,
              abi: ABI,
              functionName: "isApprovedForAll",
              args: [owner, grant.holder],
            });
      } catch {
        return true;
      }
    }),
  );
  return permissions.filter((_p, i) => kept[i]);
}

/** The payments with the ones the token has taken marked settled. */
export async function settledPayments(payments: readonly Payment[], usdc: Hex): Promise<Payment[]> {
  return Promise.all(
    payments.map(async (p) => {
      if (p.stage === "settled" || p.asset !== "USDC") return p;
      const [payer, nonce] = p.id.split(":");
      if (!payer || !nonce) return p;
      try {
        const used = await client().readContract({
          address: usdc,
          abi: ABI,
          functionName: "authorizationState",
          args: [payer as Hex, nonce as Hex],
        });
        return used ? { ...p, stage: "settled" as const } : p;
      } catch {
        return p;
      }
    }),
  );
}

/** The transaction that closes a grant; null for a row that is not one. */
export function revokeCall(id: string): { to: Hex; value: bigint; data: Hex } | null {
  const grant = grantOf(id);
  if (!grant) return null;
  return {
    to: grant.contract,
    value: 0n,
    data:
      grant.kind === "allowance"
        ? encodeFunctionData({ abi: ABI, functionName: "approve", args: [grant.holder, 0n] })
        : encodeFunctionData({
            abi: ABI,
            functionName: "setApprovalForAll",
            args: [grant.holder, false],
          }),
  };
}
