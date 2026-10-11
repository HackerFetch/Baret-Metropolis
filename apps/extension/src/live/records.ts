import type { AnalyzeResponse } from "@baret/guard";
import { fromUnits } from "@baret/wallet-ui/data/format";
import type { Payment, Permission, Problem } from "../data/types.js";

/**
 * The live wallet's lists that come from what it signed: allowances and
 * collection access (from the approvals in Baret's verdict), and x402
 * payments (from a signed TransferWithAuthorization). Pure: what the chain
 * says about them now is read in records-chain.ts.
 *
 * A grant's id carries what a revoke and a chain read need, since the rows
 * themselves hold display names: `<kind>:<contract>:<holder>:<account id>`.
 */

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const short = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

export function grantId(
  kind: "allowance" | "operator",
  contract: string,
  holder: string,
  account: string,
): string {
  return `${kind}:${contract.toLowerCase()}:${holder.toLowerCase()}:${account}`;
}

/** The contract and holder a grant's id names; null for a row that is not a live grant. */
export function grantOf(
  id: string,
): { kind: "allowance" | "operator"; contract: `0x${string}`; holder: `0x${string}` } | null {
  const [kind, contract, holder] = id.split(":");
  if (kind !== "allowance" && kind !== "operator") return null;
  if (!contract || !holder || !ADDRESS.test(contract) || !ADDRESS.test(holder)) return null;
  return { kind, contract: contract as `0x${string}`, holder: holder as `0x${string}` };
}

/** The grants a signed transaction opened, as the verdict's approvals name them. */
export function grantsFrom(
  approvals: AnalyzeResponse["approvals"],
  by: { owner: string; account: string; origin: string | null; at: string },
): Permission[] {
  return approvals.flatMap((a): Permission[] => {
    if (a.owner.toLowerCase() !== by.owner.toLowerCase() || a.kind === "permit") return [];
    const base = {
      origin: by.origin ?? "",
      account: by.account,
      status: "active" as const,
      granted: by.at,
      lastUsed: null,
      holder: a.spender,
      uses: [],
    };
    if (a.kind === "operator") {
      return [
        {
          ...base,
          id: grantId("operator", a.contract, a.spender, by.account),
          kind: "operator",
          operator: a.spender,
          contract: a.symbol || short(a.contract),
        },
      ];
    }
    // An allowance set to zero is a revoke: nothing to list.
    if (!a.unlimited && (a.amount === null || BigInt(a.amount) === 0n)) return [];
    return [
      {
        ...base,
        id: grantId("allowance", a.contract, a.spender, by.account),
        kind: "allowance",
        spender: a.spender,
        asset: a.symbol || short(a.contract),
        amount:
          a.unlimited || a.amount === null
            ? null
            : fromUnits(BigInt(a.amount), a.decimals ?? 18, { min: 0, max: 6 }),
      },
    ];
  });
}

/** The list with `grants` added; a grant for the same contract and holder replaces the earlier row. */
export function withGrants(
  list: readonly Permission[],
  grants: readonly Permission[],
): Permission[] {
  const ids = new Set(grants.map((g) => g.id));
  return [...grants, ...list.filter((p) => !ids.has(p.id))];
}

interface Typed {
  readonly domain: Record<string, unknown>;
  readonly primaryType: string;
  readonly message: Record<string, unknown>;
}

/** Whether a typed message is an x402 payment: an EIP-3009 transfer with a payee, an amount and a nonce. */
export function isPayment(typed: Typed): boolean {
  const { to, value, nonce } = typed.message;
  return (
    typed.primaryType === "TransferWithAuthorization" &&
    typeof to === "string" &&
    ADDRESS.test(to) &&
    /^\d{1,78}$/.test(String(value)) &&
    typeof nonce === "string" &&
    /^0x[0-9a-fA-F]{64}$/.test(nonce)
  );
}

function amountOf(typed: Typed, usdc: string): { amount: string; asset: string } {
  const token = String(typed.domain.verifyingContract ?? "");
  const known = token.toLowerCase() === usdc.toLowerCase();
  return {
    // Whole units only for the token the wallet knows the decimals of.
    amount: known
      ? fromUnits(BigInt(String(typed.message.value)), 6, { min: 2, max: 6 })
      : String(typed.message.value),
    asset: known ? "USDC" : short(token),
  };
}

/** `<payer>:<nonce>`: what the token itself keys an authorisation by. */
export function paymentId(payer: string, nonce: string): string {
  return `${payer.toLowerCase()}:${nonce.toLowerCase()}`;
}

/** The payment a signed authorisation is: checked by Baret, not settled yet. */
export function paymentFrom(
  typed: Typed,
  by: { payer: string; origin: string; at: string; usdc: string },
): Payment {
  return {
    id: paymentId(by.payer, String(typed.message.nonce)),
    at: by.at,
    merchant: String(typed.message.to),
    ...amountOf(typed, by.usdc),
    // The site that asked settles it or hands it to its facilitator.
    facilitator: by.origin,
    stage: "checked",
    hash: null,
  };
}

/** A payment Baret did not clear, for the payments page's problems. */
export function problemFrom(
  typed: Typed,
  by: { origin: string; at: string; usdc: string; code: string | null },
): Problem {
  const kind: Problem["kind"] =
    by.code === "X402_DESTINATION_MISMATCH"
      ? "mismatch"
      : by.code === "X402_ASSET_MISMATCH" || by.code === "X402_ASSET_NOT_ALLOWED"
        ? "asset"
        : by.code?.endsWith("_CAP_EXCEEDED")
          ? "overCap"
          : "declined";
  return {
    id: `problem-${by.at}`,
    kind,
    at: by.at,
    merchant: String(typed.message.to),
    values: { ...amountOf(typed, by.usdc), origin: by.origin },
  };
}
