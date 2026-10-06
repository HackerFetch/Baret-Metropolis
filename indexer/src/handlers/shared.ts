/** Ids and small helpers shared by the handlers. */

export const lower = (address: string) => address.toLowerCase();

/** A stable id for one log: its block and its position in it. */
export const logId = (event: { block: { number: number }; logIndex: number }) =>
  `${event.block.number}-${event.logIndex}`;

export const merchantId = (vault: string, merchant: string) => `${lower(vault)}-${lower(merchant)}`;

/** The block and transaction fields every handler asks for. */
export const FIELDS = { transaction: ["hash"], block: ["timestamp"] } as const;
