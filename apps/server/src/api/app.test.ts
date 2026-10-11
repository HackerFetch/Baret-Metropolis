import { analyzeResponseSchema } from "@baret/guard";
import { describe, expect, it } from "vitest";
import { config, deps, FakeRpc, PEER, tx } from "../testing/fake.js";
import { buildApp } from "./app.js";

describe("http", () => {
  it("serves health and readiness", async () => {
    const rpc = new FakeRpc();
    const app = await buildApp(deps(rpc));
    expect((await app.inject({ method: "GET", url: "/health" })).statusCode).toBe(200);
    // How many proxies a request came through, as a count only.
    const hops = async (header?: string) =>
      (
        await app.inject({
          method: "GET",
          url: "/health",
          ...(header ? { headers: { "x-forwarded-for": header } } : {}),
        })
      ).json().forwardedHops;
    expect(await hops()).toBe(0);
    expect(await hops("203.0.113.7")).toBe(1);
    expect(await hops("203.0.113.7, 198.51.100.2,10.0.0.1")).toBe(3);
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

  it("refuses to analyse when the RPC is on another chain", async () => {
    const rpc = new FakeRpc();
    rpc.chainId = 1;
    const app = await buildApp(deps(rpc));
    const res = await app.inject({ method: "POST", url: "/v1/analyze", payload: tx({ to: PEER }) });
    expect(res.statusCode).toBe(503);
    expect((await app.inject({ method: "GET", url: "/health/ready" })).statusCode).toBe(503);
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

  it("gives each visitor behind the proxy its own rate-limit bucket", async () => {
    const app = await buildApp({
      ...deps(new FakeRpc()),
      config: { ...config, rateLimitPerMinute: 2 },
    });
    const from = (forwarded?: string) =>
      app.inject({
        method: "GET",
        url: "/health",
        ...(forwarded ? { headers: { "x-forwarded-for": forwarded } } : {}),
      });
    // The proxy appends its own address after the visitor's.
    expect((await from("203.0.113.7, 10.0.0.1")).statusCode).toBe(200);
    expect((await from("203.0.113.7, 10.0.0.1")).statusCode).toBe(200);
    expect((await from("203.0.113.7, 10.0.0.1")).statusCode).toBe(429);
    // Another visitor through the same proxy is not held back by the first.
    const other = await from("198.51.100.9, 10.0.0.1");
    expect(other.statusCode).toBe(200);
    expect(other.headers["x-ratelimit-remaining"]).toBe("1");
    // And one with no proxy in front still has a bucket of its own.
    expect((await from()).statusCode).toBe(200);
  });

  it("keys the limit on an address a proxy wrote, once the proxy hops are known", async () => {
    const secret = "edge-secret-edge-secret-edge";
    const app = await buildApp({
      ...deps(new FakeRpc()),
      config: {
        ...config,
        rateLimitPerMinute: 2,
        proxyTrust: { directHops: 1, edgeHops: 2, edgeSecret: secret },
      },
    });
    const from = (forwarded: string, edge?: string) =>
      app.inject({
        method: "GET",
        url: "/health",
        headers: { "x-forwarded-for": forwarded, ...(edge ? { "x-baret-edge": edge } : {}) },
      });
    const edge = async (mark?: string) =>
      (
        await app.inject({
          method: "GET",
          url: "/health",
          headers: { "x-forwarded-for": "192.0.2.1", ...(mark ? { "x-baret-edge": mark } : {}) },
        })
      ).json().viaEdge;
    expect([await edge(secret), await edge("wrong"), await edge()]).toEqual([true, false, false]);
    // Direct: the host's proxy appended the caller. A made-up address in front buys nothing.
    expect((await from("198.51.100.9")).statusCode).toBe(200);
    expect((await from("1.1.1.1, 198.51.100.9")).statusCode).toBe(200);
    expect((await from("2.2.2.2, 198.51.100.9")).statusCode).toBe(429);
    // Through a site: its edge marks the request, and the visitor is one entry further left.
    expect((await from("203.0.113.7, 10.0.0.1", secret)).statusCode).toBe(200);
    expect((await from("203.0.113.8, 10.0.0.1", secret)).statusCode).toBe(200);
    expect((await from("203.0.113.7, 10.0.0.1", secret)).statusCode).toBe(200);
    expect((await from("203.0.113.7, 10.0.0.1", secret)).statusCode).toBe(429);
    // The edge names the visitor itself: that wins over whatever the list starts with.
    const named = (client: string, forwarded: string, mark = secret) =>
      app.inject({
        method: "GET",
        url: "/health",
        headers: { "x-forwarded-for": forwarded, "x-baret-edge": mark, "x-baret-client": client },
      });
    expect((await named("203.0.113.20", "5.5.5.5, 10.0.0.1")).statusCode).toBe(200);
    expect((await named("203.0.113.20", "6.6.6.6, 10.0.0.1")).statusCode).toBe(200);
    expect((await named("203.0.113.20", "7.7.7.7, 10.0.0.1")).statusCode).toBe(429);
    // Without the secret the name counts for nothing: the direct caller's own bucket.
    expect((await named("203.0.113.21", "5.5.5.5, 10.0.0.3", "wrong")).statusCode).toBe(200);
    expect((await named("203.0.113.22", "5.5.5.5, 10.0.0.3", "wrong")).statusCode).toBe(200);
    expect((await named("203.0.113.23", "5.5.5.5, 10.0.0.3", "wrong")).statusCode).toBe(429);
    // Claiming to be a site without the secret counts as direct: the edge's bucket, not a fresh one.
    expect((await from("9.9.9.9, 10.0.0.2", "wrong")).statusCode).toBe(200);
    expect((await from("8.8.8.8, 10.0.0.2", "wrong")).statusCode).toBe(200);
    expect((await from("7.7.7.7, 10.0.0.2")).statusCode).toBe(429);
  });
});
