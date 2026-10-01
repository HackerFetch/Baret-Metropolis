import { analyzeResponseSchema } from "@baret/guard";
import { describe, expect, it } from "vitest";
import { config, deps, FakeRpc, PEER, tx } from "../testing/fake.js";
import { buildApp } from "./app.js";

describe("http", () => {
  it("serves health and readiness", async () => {
    const rpc = new FakeRpc();
    const app = await buildApp(deps(rpc));
    expect((await app.inject({ method: "GET", url: "/health" })).statusCode).toBe(200);
    const ready = await app.inject({ method: "GET", url: "/health/ready" });
    expect(ready.json()).toMatchObject({
      status: "ready",
      networks: [{ chainId: 10143, ok: true }],
    });

    rpc.down = true;
    expect((await app.inject({ method: "GET", url: "/health/ready" })).statusCode).toBe(503);
  });

  it("answers /v1/analyze with a body that matches the contract", async () => {
    const app = await buildApp(deps(new FakeRpc()));
    const res = await app.inject({
      method: "POST",
      url: "/v1/analyze",
      payload: tx({ to: PEER, value: "1" }),
    });
    expect(res.statusCode).toBe(200);
    expect(analyzeResponseSchema.safeParse(res.json()).success).toBe(true);
  });

  it("rejects a malformed request with the field at fault", async () => {
    const app = await buildApp(deps(new FakeRpc()));
    const res = await app.inject({
      method: "POST",
      url: "/v1/analyze",
      payload: { network: "elsewhere", transaction: { from: "0x1" } },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().issues.map((i: { path: string }) => i.path)).toContain("network");
  });

  it("fails closed with 503 when the RPC is down", async () => {
    const rpc = new FakeRpc();
    rpc.down = true;
    const app = await buildApp(deps(rpc));
    const res = await app.inject({ method: "POST", url: "/v1/analyze", payload: tx({ to: PEER }) });
    expect(res.statusCode).toBe(503);
    expect(res.json().error).toBe("rpc_unavailable");
  });

  it("requires an API key when keys are configured", async () => {
    const app = await buildApp({ ...deps(new FakeRpc()), config: { ...config, apiKeys: ["k1"] } });
    const payload = tx({ to: PEER, value: "1" });
    expect((await app.inject({ method: "POST", url: "/v1/analyze", payload })).statusCode).toBe(
      401,
    );
    const ok = await app.inject({
      method: "POST",
      url: "/v1/analyze",
      payload,
      headers: { "x-api-key": "k1" },
    });
    expect(ok.statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/health" })).statusCode).toBe(200);
  });
});
