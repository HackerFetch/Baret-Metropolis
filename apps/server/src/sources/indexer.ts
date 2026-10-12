/**
 * The Envio indexer (indexer/) as the server reads it: a GraphQL endpoint
 * over the entities in indexer/schema.graphql. This is the persistent audit
 * trail (D-008): nothing here lives in the server's memory.
 */

export class IndexerUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "IndexerUnavailableError";
  }
}

export interface IndexerClient {
  query<T>(query: string, variables: Record<string, unknown>): Promise<T>;
}

export function createIndexerClient(
  endpoint: string,
  timeoutMs: number,
  fetchImpl: typeof globalThis.fetch = globalThis.fetch.bind(globalThis),
): IndexerClient {
  return {
    async query<T>(query: string, variables: Record<string, unknown>): Promise<T> {
      let res: Response;
      try {
        res = await fetchImpl(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query, variables }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (cause) {
        throw new IndexerUnavailableError("the indexer did not answer", { cause });
      }
      const body = (await res.json().catch(() => null)) as {
        data?: T;
        errors?: { message: string }[];
      } | null;
      if (!res.ok || !body || body.errors?.length || !body.data) {
        throw new IndexerUnavailableError(
          `the indexer answered ${res.status}${body?.errors?.[0] ? `: ${body.errors[0].message}` : ""}`,
        );
      }
      return body.data;
    },
  };
}

const ACTIVITY = "id kind merchant agent amount timestamp block txHash";
const PAYMENT = "id vault_id merchant agent amount ref timestamp block txHash";
/**
 * Newest first. Monad makes several blocks a second, so `timestamp` ties
 * across blocks, and one transaction's events share a block: the block, then
 * the log's place in it, decide. The id is `<block>-<logIndex>`, which the
 * store compares as text ("-10" before "-9"), so `newestFirst` below settles
 * the order once the rows are here.
 */
const NEWEST = "[{ block: desc }, { id: desc }]";

export const QUERIES = {
  vault: `query Vault($id: String!, $limit: Int!) {
    Vault(where: { id: { _eq: $id } }) {
      id owner token agent deposited withdrawn paid paymentCount createdAtBlock
      merchants { address perTxCap hourlyCap dailyCap paused active paid paymentCount }
    }
    VaultActivity(where: { vault_id: { _eq: $id } }, order_by: ${NEWEST}, limit: $limit) { ${ACTIVITY} }
    Payment(where: { vault_id: { _eq: $id } }, order_by: ${NEWEST}, limit: $limit) { ${PAYMENT} }
  }`,
  vaultsOf: `query VaultsOf($owner: String!) {
    Vault(where: { owner: { _eq: $owner } }, order_by: { createdAtBlock: desc }) {
      id owner token agent deposited withdrawn paid paymentCount createdAtBlock
    }
  }`,
  recent: `query Recent($limit: Int!) {
    Payment(order_by: ${NEWEST}, limit: $limit) { ${PAYMENT} }
    ReputationChange(order_by: ${NEWEST}, limit: $limit) {
      id target kind severity reasonCode timestamp block txHash
    }
  }`,
  reputation: `query Reputation($id: String!) {
    ReputationEntry(where: { id: { _eq: $id } }) { id severity reasonCode flaggedAt block txHash }
    ReputationChange(where: { target: { _eq: $id } }, order_by: ${NEWEST}) {
      id kind severity reasonCode timestamp block txHash
    }
  }`,
} as const;

/** An indexed event row, as far as its order is concerned. */
export interface Ordered {
  /** `<block>-<logIndex>`. */
  id?: unknown;
  block?: unknown;
  timestamp?: unknown;
}

const num = (v: unknown): bigint => {
  if (typeof v === "bigint") return v;
  if (typeof v === "number" && Number.isFinite(v)) return BigInt(Math.trunc(v));
  if (typeof v === "string" && /^\d+$/.test(v)) return BigInt(v);
  return -1n;
};

const logIndexOf = (id: unknown): bigint =>
  typeof id === "string" ? num(id.slice(id.lastIndexOf("-") + 1)) : -1n;

/**
 * Newest first: by block, then by the event's place in the block, then by
 * timestamp. Stable, so rows the indexer already ordered keep their order
 * when none of the three tells them apart.
 */
export function newestFirst<T extends Ordered>(rows: readonly T[]): T[] {
  const cmp = (a: bigint, b: bigint) => (a === b ? 0 : a > b ? -1 : 1);
  return [...rows].sort(
    (a, b) =>
      cmp(num(a.block), num(b.block)) ||
      cmp(logIndexOf(a.id), logIndexOf(b.id)) ||
      cmp(num(a.timestamp), num(b.timestamp)),
  );
}
