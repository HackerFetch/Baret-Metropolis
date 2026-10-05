import { indexer } from "envio";
import { FIELDS, logId, lower } from "./shared.js";

// A new vault: start indexing its own events from this block on.
indexer.contractRegister(
  { contract: "PaymentGuardFactory", event: "VaultCreated" },
  async ({ event, context }) => {
    context.chain.PaymentGuard.add(event.params.vault);
  },
);

indexer.onEvent(
  { contract: "PaymentGuardFactory", event: "VaultCreated", fields: FIELDS },
  async ({ event, context }) => {
    const id = lower(event.params.vault);
    context.Vault.set({
      id,
      owner: lower(event.params.owner),
      token: lower(event.params.token),
      agent: undefined,
      deposited: 0n,
      withdrawn: 0n,
      paid: 0n,
      paymentCount: 0,
      createdAtBlock: event.block.number,
    });
    context.VaultActivity.set({
      id: logId(event),
      vault_id: id,
      kind: "created",
      merchant: undefined,
      agent: undefined,
      amount: undefined,
      timestamp: event.block.timestamp,
      block: event.block.number,
      txHash: event.transaction.hash,
    });
  },
);
