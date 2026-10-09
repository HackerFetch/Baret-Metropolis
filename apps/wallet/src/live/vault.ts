import type { VaultState, WalletCall } from "@baret/wallet-core";
import type { SignContext } from "@baret/wallet-ui/data/analyze";
import { fromUnits, toUnits } from "@baret/wallet-ui/data/format";
import type { AgentPayment, Merchant, Vault } from "@baret/wallet-ui/data/types";

/**
 * The vault as the screens read it, from what the chain and the indexer say.
 * Pure: live.tsx does the reading and the signing.
 *
 * The contract cannot list its merchants, so their addresses come from the
 * indexer (every merchant the vault ever had) and from this browser (the ones
 * just added, before the indexer has seen them). The caps, the spend and the
 * balance always come from the chain.
 */

export const VAULT_DECIMALS = 6;
export const VAULT_ASSET = "USDC";

/** One step of a vault action: a call, and how the sign request names it. */
export interface LiveStep {
  readonly context: SignContext;
  readonly call: WalletCall;
}

/** Built when its turn comes: a later step may need the vault an earlier one opened. */
export type StepBuilder = () => Promise<LiveStep>;

/** What `/v1/audit/vault/<address>` answers with, as far as the wallet reads it. */
export interface AuditVault {
  readonly merchants: readonly string[];
  readonly paymentCount: number;
  /** ISO time the current agent was authorised; null when the indexer does not say. */
  readonly agentSince: string | null;
  readonly payments: readonly AgentPayment[];
}

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

function iso(seconds: unknown): string | null {
  return typeof seconds === "number" && Number.isFinite(seconds)
    ? new Date(seconds * 1000).toISOString()
    : null;
}

/** Reads the indexer's answer defensively; anything unreadable is left out, never guessed. */
export function auditVaultOf(body: unknown): AuditVault | null {
  if (typeof body !== "object" || body === null) return null;
  const { vault, activity, payments } = body as Record<string, unknown>;
  if (typeof vault !== "object" || vault === null) return null;
  const v = vault as Record<string, unknown>;
  const merchants = (Array.isArray(v.merchants) ? v.merchants : [])
    .map((m) => (m as { address?: unknown } | null)?.address)
    .filter((a): a is string => typeof a === "string" && ADDRESS_RE.test(a));
  const agent = typeof v.agent === "string" ? v.agent.toLowerCase() : null;
  const set = (Array.isArray(activity) ? activity : [])
    .map((a) => a as Record<string, unknown>)
    .filter((a) => a.kind === "agentSet" && String(a.agent ?? "").toLowerCase() === agent)
    .map((a) => (typeof a.timestamp === "number" ? a.timestamp : 0))
    .sort((a, b) => b - a)[0];
  return {
    merchants,
    paymentCount: Number(v.paymentCount) || 0,
    agentSince: iso(set),
    payments: (Array.isArray(payments) ? payments : []).flatMap((p) => {
      const row = p as Record<string, unknown>;
      const at = iso(row.timestamp);
      const amount = typeof row.amount === "string" && /^\d+$/.test(row.amount) ? row.amount : null;
      if (!at || !amount || typeof row.merchant !== "string") return [];
      return [
        {
          id: String(row.id ?? row.txHash ?? at),
          at,
          merchant: row.merchant,
          // All six decimals: a sub-cent x402 payment must not read 0.00.
          amount: fromUnits(BigInt(amount), VAULT_DECIMALS, { max: 6 }),
        },
      ];
    }),
  };
}

const money = (amount: bigint) => fromUnits(amount, VAULT_DECIMALS, { max: 6 });

/**
 * The vault for the screens. `labels` are the names this browser gave its
 * merchants (the chain holds none); `since` is when this browser authorised
 * the agent, used when the indexer has not said.
 */
export function toVault(
  state: VaultState,
  audit: AuditVault | null,
  labels: Readonly<Record<string, string>>,
  since: string | null,
): Vault {
  return {
    address: state.address,
    asset: VAULT_ASSET,
    balance: money(state.balance),
    merchants: state.merchants
      // An address the vault never listed reads as removed with no caps: not a merchant.
      .filter((m) => m.status !== "removed" || m.perDay > 0n)
      .map(
        (m): Merchant => ({
          address: m.address,
          origin: labels[m.address.toLowerCase()] ?? m.address,
          perPayment: money(m.perPayment),
          perHour: m.perHour === null ? null : money(m.perHour),
          perDay: money(m.perDay),
          spent: money(m.spentLastDay),
          status: m.status,
        }),
      ),
    agent: state.agent
      ? {
          address: state.agent,
          created: audit?.agentSince ?? since ?? new Date().toISOString(),
          payments: audit?.paymentCount ?? 0,
        }
      : null,
  };
}

/** The addresses to ask the chain about: the indexer's and this browser's, once each. */
export function merchantAddresses(
  audit: AuditVault | null,
  labels: Readonly<Record<string, string>>,
): `0x${string}`[] {
  const seen = new Set<string>();
  const out: `0x${string}`[] = [];
  for (const address of [...(audit?.merchants ?? []), ...Object.keys(labels)]) {
    const key = address.toLowerCase();
    if (!ADDRESS_RE.test(address) || seen.has(key)) continue;
    seen.add(key);
    out.push(address as `0x${string}`);
  }
  return out;
}

/** A vault amount in base units; null when the text is not a positive amount. */
export function vaultUnits(text: string): bigint | null {
  const units = toUnits(text, VAULT_DECIMALS);
  return units === null || units <= 0n ? null : units;
}
