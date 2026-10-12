import { describe, expect, it } from "vitest";
import {
  createIndexerClient,
  type IndexerClient,
  IndexerUnavailableError,
  newestFirst,
} from "../sources/indexer.js";
import { deps, FakeRpc } from "../testing/fake.js";
import { buildApp } from "./app.js";

const VAULT = "0xE0B411E9F1f48194A9Aa426B2F955e16B4b8a8Bd";

function fakeIndexer(answer: (query: string, vars: Record<string, unknown>) => unknown) {
  const asked: { query: string; vars: Record<string, unknown> }[] = [];
  const indexer: IndexerClient = {
    query: async <T>(query: string, vars: Record<string, unknown>) => {
      asked.push({ query, vars });
      return answer(query, vars) as T;
    },
  };
  return { indexer, asked };
}

describe("audit routes", () => {
  it("answer 503 without an indexer, never an empty history", async () => {
    const app = await buildApp(deps(new FakeRpc()));
    const res = await app.inject({ method: "GET", url: "/v1/audit/recent" });
    expect(res.statusCode).toBe(503);
    expect(res.json().error).toBe("indexer_unavailable");
  });

  it("return a vault with its merchants, activity and payments", async () => {
    const { indexer, asked } = fakeIndexer(() => ({
      Vault: [{ id: VAULT.toLowerCase(), paid: "100000", merchants: [{ address: "0xabc" }] }],
      VaultActivity: [{ kind: "paid" }, { kind: "agentSet" }],
      Payment: [{ amount: "100000" }],
    }));
    const app = await buildApp({ ...deps(new FakeRpc()), indexer } as never);
    const res = await app.inject({ method: "GET", url: `/v1/audit/vault/${VAULT}?limit=5` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      vault: { paid: "100000" },
      activity: [{ kind: "paid" }, { kind: "agentSet" }],
      payments: [{ amount: "100000" }],
    });
    // The indexer stores lowercase addresses; the route lowercases what it is given.
    expect(asked[0]?.vars).toEqual({ id: VAULT.toLowerCase(), limit: 5 });
  });

  it("answer 404 for a vault the indexer has not seen and 400 for a bad address", async () => {
    const { indexer } = fakeIndexer(() => ({ Vault: [], VaultActivity: [], Payment: [] }));
    const app = await buildApp({ ...deps(new FakeRpc()), indexer } as never);
    expect((await app.inject({ method: "GET", url: `/v1/audit/vault/${VAULT}` })).statusCode).toBe(
      404,
    );
    expect((await app.inject({ method: "GET", url: "/v1/audit/vault/nope" })).statusCode).toBe(400);
  });

  it("cap the limit and turn an indexer outage into 503", async () => {
    const { indexer, asked } = fakeIndexer(() => ({ Payment: [], ReputationChange: [] }));
    const app = await buildApp({ ...deps(new FakeRpc()), indexer } as never);
    await app.inject({ method: "GET", url: "/v1/audit/recent?limit=9999" });
    expect(asked[0]?.vars.limit).toBe(100);

    const down = fakeIndexer(() => {
      throw new IndexerUnavailableError("the indexer did not answer");
    });
    const app2 = await buildApp({ ...deps(new FakeRpc()), indexer: down.indexer } as never);
    expect((await app2.inject({ method: "GET", url: "/v1/audit/recent" })).statusCode).toBe(503);
  });

  it("return an address's registry entry, or null with its history", async () => {
    const { indexer } = fakeIndexer(() => ({
      ReputationEntry: [],
      ReputationChange: [{ kind: "cleared" }, { kind: "flagged" }],
    }));
    const app = await buildApp({ ...deps(new FakeRpc()), indexer } as never);
    const res = await app.inject({ method: "GET", url: `/v1/audit/reputation/${VAULT}` });
    expect(res.json()).toEqual({
      entry: null,
      history: [{ kind: "cleared" }, { kind: "flagged" }],
    });
  });
});

describe("order of the feeds", () => {
  it("puts the events of one block newest first by log index, whatever the indexer sent", async () => {
    const rows = [
      { id: "68466682-2", kind: "paid", block: 68466682, timestamp: 1 },
      { id: "68466640-2", kind: "agentRevoked", block: 68466640, timestamp: 1 },
      { id: "68466640-3", kind: "agentSet", block: 68466640, timestamp: 1 },
      { id: "68466640-10", kind: "deposited", block: 68466640, timestamp: 1 },
      { id: "68466600-1", kind: "created", block: 68466600, timestamp: 0 },
    ];
    const { indexer } = fakeIndexer(() => ({
      Vault: [{ id: VAULT.toLowerCase(), owner: "0xabc" }],
      VaultActivity: rows,
      Payment: [...rows].reverse(),
    }));
    const app = await buildApp({ ...deps(new FakeRpc()), indexer } as never);
    const res = await app.inject({ method: "GET", url: `/v1/audit/vault/${VAULT}` });
    const order = ["68466682-2", "68466640-10", "68466640-3", "68466640-2", "68466600-1"];
    expect(res.json().activity.map((r: { id: string }) => r.id)).toEqual(order);
    expect(res.json().payments.map((r: { id: string }) => r.id)).toEqual(order);
    expect(newestFirst([])).toEqual([]);
  });

  it("asks the chain for the owner of a vault the indexer has none for", async () => {
    const OWNER = "0x5aE13F1028144842f0384d09091067D6184F8197";
    const rpc = new FakeRpc();
    rpc.owners.set(VAULT.toLowerCase(), OWNER);
    const { indexer } = fakeIndexer(() => ({
      Vault: [{ id: VAULT.toLowerCase(), owner: null, createdAtBlock: 1 }],
      VaultActivity: [],
      Payment: [],
    }));
    const app = await buildApp({ ...deps(rpc), indexer } as never);
    const res = await app.inject({ method: "GET", url: `/v1/audit/vault/${VAULT}` });
    expect(res.json().vault.owner).toBe(OWNER.toLowerCase());

    // An owner the indexer knows is not asked for again.
    rpc.owners.clear();
    const known = fakeIndexer(() => ({
      Vault: [{ id: VAULT.toLowerCase(), owner: "0xabc" }],
      VaultActivity: [],
      Payment: [],
    }));
    const app2 = await buildApp({ ...deps(rpc), indexer: known.indexer } as never);
    expect(
      (await app2.inject({ method: "GET", url: `/v1/audit/vault/${VAULT}` })).json().vault.owner,
    ).toBe("0xabc");
  });
});

describe("indexer client", () => {
  const client = (res: Response) =>
    createIndexerClient("http://indexer", 1000, (async () => res) as unknown as typeof fetch);

  it("returns data and rejects GraphQL errors and bad statuses", async () => {
    const ok = new Response(JSON.stringify({ data: { Payment: [] } }));
    expect(await client(ok).query("q", {})).toEqual({ Payment: [] });
    const gql = new Response(JSON.stringify({ errors: [{ message: "field not found" }] }));
    await expect(client(gql).query("q", {})).rejects.toThrow(/field not found/);
    await expect(
      client(new Response("nope", { status: 502 })).query("q", {}),
    ).rejects.toBeInstanceOf(IndexerUnavailableError);
  });
});
