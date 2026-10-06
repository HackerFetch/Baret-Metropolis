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

export const QUERIES = {
  vault: `query Vault($id: String!, $limit: Int!) {
    Vault(where: { id: { _eq: $id } }) {
      id owner token agent deposited withdrawn paid paymentCount createdAtBlock
      merchants { address perTxCap hourlyCap dailyCap paused active paid paymentCount }
    }
    VaultActivity(where: { vault_id: { _eq: $id } }, order_by: { timestamp: desc }, limit: $limit) { ${ACTIVITY} }
    Payment(where: { vault_id: { _eq: $id } }, order_by: { timestamp: desc }, limit: $limit) { ${PAYMENT} }
  }`,
  vaultsOf: `query VaultsOf($owner: String!) {
    Vault(where: { owner: { _eq: $owner } }, order_by: { createdAtBlock: desc }) {
      id owner token agent deposited withdrawn paid paymentCount createdAtBlock
    }
  }`,
  recent: `query Recent($limit: Int!) {
    Payment(order_by: { timestamp: desc }, limit: $limit) { ${PAYMENT} }
    ReputationChange(order_by: { timestamp: desc }, limit: $limit) {
      id target kind severity reasonCode timestamp block txHash
    }
  }`,
  reputation: `query Reputation($id: String!) {
    ReputationEntry(where: { id: { _eq: $id } }) { id severity reasonCode flaggedAt block txHash }
    ReputationChange(where: { target: { _eq: $id } }, order_by: { timestamp: desc }) {
      id kind severity reasonCode timestamp block txHash
    }
  }`,
} as const;
