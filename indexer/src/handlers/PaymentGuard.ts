import { indexer, type Vault, type VaultActivity } from "envio";
import { FIELDS, logId, lower, merchantId } from "./shared.js";

/** The part of a handler's context the two helpers below use. */
interface Context {
  Vault: { getOrCreate(row: Vault): Promise<Vault> };
  VaultActivity: { set(row: VaultActivity): void };
}

interface Log {
  srcAddress: string;
  logIndex: number;
  block: { number: number; timestamp: number };
  transaction: { hash: string };
}

/**
 * Vaults listed in config.yaml by address, which predate the factory and so
 * emit no VaultCreated: their owner, token and deploy block, as the chain
 * has them (docs/CONTRACTS.md). The first testnet vault, used by the Dynamic
 * agent (0x0A82...0A35), is one. Without this the row says owner null and
 * "created" at its first deposit.
 */
const STATIC_VAULTS: Record<string, { owner: string; token: string; createdAtBlock: number }> = {
  "0x0a82671420114e47c672d5e8e23017ddce850a35": {
    owner: "0x5ae13f1028144842f0384d09091067d6184f8197",
    token: "0x534b2f3a21130d7a60830c2df862319e593943a3",
    createdAtBlock: 67604750,
  },
};

/** The vault's row. A vault that predates the factory may not exist yet. */
function vaultOf(context: Context, event: Log) {
  const id = lower(event.srcAddress);
  const known = STATIC_VAULTS[id];
  return context.Vault.getOrCreate({
    id,
    owner: known?.owner,
    token: known?.token,
    agent: undefined,
    deposited: 0n,
    withdrawn: 0n,
    paid: 0n,
    paymentCount: 0,
    createdAtBlock: known?.createdAtBlock ?? event.block.number,
  });
}

function record(
  context: Context,
  event: Log,
  kind: string,
  more: { merchant?: string; agent?: string; amount?: bigint } = {},
) {
  context.VaultActivity.set({
    id: logId(event),
    vault_id: lower(event.srcAddress),
    kind,
    merchant: more.merchant,
    agent: more.agent,
    amount: more.amount,
    timestamp: event.block.timestamp,
    block: event.block.number,
    txHash: event.transaction.hash,
  });
}

indexer.onEvent(
  { contract: "PaymentGuard", event: "Deposited", fields: FIELDS },
  async ({ event, context }) => {
    const vault = await vaultOf(context, event);
    context.Vault.set({
      ...vault,
      token: vault.token ?? lower(event.params.token),
      deposited: vault.deposited + event.params.amount,
    });
    record(context, event, "deposited", { amount: event.params.amount });
  },
);

indexer.onEvent(
  { contract: "PaymentGuard", event: "Withdrawn", fields: FIELDS },
  async ({ event, context }) => {
    const vault = await vaultOf(context, event);
    context.Vault.set({ ...vault, withdrawn: vault.withdrawn + event.params.amount });
    record(context, event, "withdrawn", { amount: event.params.amount });
  },
);

indexer.onEvent(
  { contract: "PaymentGuard", event: "MerchantCapSet", fields: FIELDS },
  async ({ event, context }) => {
    await vaultOf(context, event);
    const merchant = lower(event.params.merchant);
    const id = merchantId(event.srcAddress, merchant);
    const existing = await context.Merchant.get(id);
    context.Merchant.set({
      id,
      vault_id: lower(event.srcAddress),
      address: merchant,
      perTxCap: event.params.perTxCap,
      hourlyCap: event.params.hourlyCap,
      dailyCap: event.params.dailyCap,
      // The contract keeps a pause across a cap change, and re-adding a revoked merchant starts unpaused.
      paused: existing?.active ? existing.paused : false,
      active: true,
      paid: existing?.paid ?? 0n,
      paymentCount: existing?.paymentCount ?? 0,
    });
    record(context, event, "merchantCapSet", { merchant, amount: event.params.dailyCap });
  },
);

indexer.onEvent(
  { contract: "PaymentGuard", event: "MerchantPausedSet", fields: FIELDS },
  async ({ event, context }) => {
    const merchant = lower(event.params.merchant);
    const existing = await context.Merchant.get(merchantId(event.srcAddress, merchant));
    if (existing) context.Merchant.set({ ...existing, paused: event.params.paused });
    record(context, event, event.params.paused ? "merchantPaused" : "merchantResumed", {
      merchant,
    });
  },
);

indexer.onEvent(
  { contract: "PaymentGuard", event: "MerchantRevoked", fields: FIELDS },
  async ({ event, context }) => {
    const merchant = lower(event.params.merchant);
    const existing = await context.Merchant.get(merchantId(event.srcAddress, merchant));
    if (existing) context.Merchant.set({ ...existing, active: false, paused: false });
    record(context, event, "merchantRevoked", { merchant });
  },
);

indexer.onEvent(
  { contract: "PaymentGuard", event: "AgentSignerSet", fields: FIELDS },
  async ({ event, context }) => {
    const vault = await vaultOf(context, event);
    const agent = lower(event.params.agent);
    context.Vault.set({ ...vault, agent });
    record(context, event, "agentSet", { agent });
  },
);

indexer.onEvent(
  { contract: "PaymentGuard", event: "AgentSignerRevoked", fields: FIELDS },
  async ({ event, context }) => {
    const vault = await vaultOf(context, event);
    const agent = lower(event.params.agent);
    // Replacing an agent emits Revoked(old) then Set(new) in one transaction:
    // only clear the vault's agent when it is still the one being revoked.
    if (vault.agent === agent) context.Vault.set({ ...vault, agent: undefined });
    record(context, event, "agentRevoked", { agent });
  },
);

indexer.onEvent(
  { contract: "PaymentGuard", event: "Paid", fields: FIELDS },
  async ({ event, context }) => {
    const vault = await vaultOf(context, event);
    const merchant = lower(event.params.merchant);
    const agent = lower(event.params.agent);
    const { amount } = event.params;

    context.Vault.set({
      ...vault,
      paid: vault.paid + amount,
      paymentCount: vault.paymentCount + 1,
    });
    const row = await context.Merchant.get(merchantId(event.srcAddress, merchant));
    if (row)
      context.Merchant.set({ ...row, paid: row.paid + amount, paymentCount: row.paymentCount + 1 });

    context.Payment.set({
      id: logId(event),
      vault_id: lower(event.srcAddress),
      merchant,
      agent,
      amount,
      ref: event.params.ref,
      timestamp: event.block.timestamp,
      block: event.block.number,
      txHash: event.transaction.hash,
    });
    record(context, event, "paid", { merchant, agent, amount });
  },
);
