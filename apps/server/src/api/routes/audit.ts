import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { getAddress, isAddress } from "viem";
import type { AnalyzeDeps } from "../../application/analyze.js";
import {
  createIndexerClient,
  type IndexerClient,
  IndexerUnavailableError,
  newestFirst,
  type Ordered,
  QUERIES,
} from "../../sources/indexer.js";

/**
 * The audit trail, read from the Envio indexer. Amounts are base units as
 * strings; addresses are lowercase, as the indexer stores them.
 *
 *   GET /v1/audit/recent?limit=          latest agent payments and registry changes
 *   GET /v1/audit/vault/:address?limit=  one vault: state, merchants, activity, payments
 *   GET /v1/audit/owner/:address         the vaults an account opened through the factory
 *   GET /v1/audit/reputation/:address    an address's registry entry and its history
 *
 * Without an indexer, or when it does not answer: 503. The caller shows
 * "history unavailable"; it never falls back to an empty history.
 */
export const auditRoutes: FastifyPluginAsync<AnalyzeDeps & { indexer?: IndexerClient }> = async (
  app,
  deps,
) => {
  const client =
    deps.indexer ??
    (deps.config.envioEndpoint
      ? createIndexerClient(deps.config.envioEndpoint, deps.config.requestTimeoutMs)
      : null);

  const limitOf = (raw: unknown) => {
    const n = Number(raw ?? 25);
    return Number.isInteger(n) && n > 0 ? Math.min(n, 100) : 25;
  };

  const run = async <T>(reply: FastifyReply, query: string, variables: Record<string, unknown>) => {
    if (!client) {
      reply.code(503).send({ error: "indexer_unavailable", message: "no indexer is configured" });
      return null;
    }
    try {
      return await client.query<T>(query, variables);
    } catch (err) {
      if (!(err instanceof IndexerUnavailableError)) throw err;
      reply.code(503).send({ error: "indexer_unavailable", message: err.message });
      return null;
    }
  };

  const addressParam = (reply: FastifyReply, raw: string) => {
    if (!isAddress(raw)) {
      reply.code(400).send({ error: "invalid_request", message: "not a 0x address" });
      return null;
    }
    return getAddress(raw).toLowerCase();
  };

  // The indexer serves one network; the chain is asked on the same one.
  const network = Object.values(deps.config.networks)[0] ?? null;

  app.get<{ Querystring: { limit?: string } }>("/v1/audit/recent", async (req, reply) => {
    const data = await run<{ Payment: Ordered[]; ReputationChange: Ordered[] }>(
      reply,
      QUERIES.recent,
      {
        limit: limitOf(req.query.limit),
      },
    );
    if (data) {
      return {
        payments: newestFirst(data.Payment),
        reputationChanges: newestFirst(data.ReputationChange),
      };
    }
  });

  app.get<{ Params: { address: string }; Querystring: { limit?: string } }>(
    "/v1/audit/vault/:address",
    async (req, reply) => {
      const id = addressParam(reply, req.params.address);
      if (!id) return;
      const data = await run<{
        Vault: { owner?: string | null }[];
        VaultActivity: Ordered[];
        Payment: Ordered[];
      }>(reply, QUERIES.vault, { id, limit: limitOf(req.query.limit) });
      if (!data) return;
      const vault = data.Vault[0];
      if (!vault) {
        return reply
          .code(404)
          .send({ error: "not_found", message: "the indexer has no such vault" });
      }
      // A vault the indexer first saw through a deposit, not through the
      // factory, has no owner on record: the chain knows it.
      if (vault.owner == null && network) {
        const owner = await deps.rpcFor(network).vaultOwner(getAddress(id));
        if (owner) vault.owner = owner.toLowerCase();
      }
      return {
        vault,
        activity: newestFirst(data.VaultActivity),
        payments: newestFirst(data.Payment),
      };
    },
  );

  app.get<{ Params: { address: string } }>("/v1/audit/owner/:address", async (req, reply) => {
    const owner = addressParam(reply, req.params.address);
    if (!owner) return;
    const data = await run<{ Vault: unknown[] }>(reply, QUERIES.vaultsOf, { owner });
    if (data) return { vaults: data.Vault };
  });

  app.get<{ Params: { address: string } }>("/v1/audit/reputation/:address", async (req, reply) => {
    const id = addressParam(reply, req.params.address);
    if (!id) return;
    const data = await run<{ ReputationEntry: unknown[]; ReputationChange: Ordered[] }>(
      reply,
      QUERIES.reputation,
      { id },
    );
    if (data) {
      return {
        entry: data.ReputationEntry[0] ?? null,
        history: newestFirst(data.ReputationChange),
      };
    }
  });
};
