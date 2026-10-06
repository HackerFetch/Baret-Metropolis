import { indexer } from "envio";
import { FIELDS, logId, lower } from "./shared.js";

indexer.onEvent(
  { contract: "ReputationRegistry", event: "ReputationFlagged", fields: FIELDS },
  async ({ event, context }) => {
    const target = lower(event.params.target);
    const severity = Number(event.params.severity);
    context.ReputationEntry.set({
      id: target,
      severity,
      reasonCode: event.params.reasonCode,
      flaggedAt: event.block.timestamp,
      block: event.block.number,
      txHash: event.transaction.hash,
    });
    context.ReputationChange.set({
      id: logId(event),
      target,
      kind: "flagged",
      severity,
      reasonCode: event.params.reasonCode,
      timestamp: event.block.timestamp,
      block: event.block.number,
      txHash: event.transaction.hash,
    });
  },
);

indexer.onEvent(
  { contract: "ReputationRegistry", event: "ReputationCleared", fields: FIELDS },
  async ({ event, context }) => {
    const target = lower(event.params.target);
    context.ReputationEntry.deleteUnsafe(target);
    context.ReputationChange.set({
      id: logId(event),
      target,
      kind: "cleared",
      severity: undefined,
      reasonCode: undefined,
      timestamp: event.block.timestamp,
      block: event.block.number,
      txHash: event.transaction.hash,
    });
  },
);
