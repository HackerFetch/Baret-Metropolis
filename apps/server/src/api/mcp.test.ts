import { describe, expect, it } from "vitest";
import { MCP_TOOLS } from "../application/mcp.js";
import {
  approveData,
  cleanSources,
  DRAINER,
  deps,
  FakeRpc,
  frame,
  maxUint256,
  PEER,
  USDC,
  USER,
} from "../testing/fake.js";
import { buildApp } from "./app.js";

async function client(sources = cleanSources(), node = new FakeRpc()) {
  const app = await buildApp(deps(node, sources));
  let next = 1;
  const rpc = async (method: string, params?: Record<string, unknown>) => {
    const res = await app.inject({
      method: "POST",
      url: "/mcp",
      payload: { jsonrpc: "2.0", id: next++, method, ...(params ? { params } : {}) },
    });
    return { status: res.statusCode, body: res.json() };
  };
  const call = async (name: string, args: Record<string, unknown>) =>
    (await rpc("tools/call", { name, arguments: args })).body.result;
  return { app, rpc, call };
}

describe("the MCP endpoint", () => {
  it("opens a session the way a client expects", async () => {
    const { app, rpc } = await client();
    const init = await rpc("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "test", version: "0" },
    });
    expect(init.status).toBe(200);
    expect(init.body.result).toMatchObject({
      protocolVersion: "2025-03-26",
      capabilities: { tools: {} },
      serverInfo: { name: "baret" },
    });
    expect(init.body.result.instructions).toMatch(/do not sign/i);
    // A version it does not know: it answers with the newest it speaks.
    const other = await rpc("initialize", { protocolVersion: "1999-01-01" });
    expect(other.body.result.protocolVersion).toBe("2025-06-18");

    // A notification has no id and gets no body.
    const note = await app.inject({
      method: "POST",
      url: "/mcp",
      payload: { jsonrpc: "2.0", method: "notifications/initialized" },
    });
    expect(note.statusCode).toBe(202);
    expect(note.body).toBe("");
    expect((await rpc("ping")).body.result).toEqual({});
  });

  it("lists its tools with a schema a model can fill", async () => {
    const { rpc } = await client();
    const { tools } = (await rpc("tools/list")).body.result;
    expect(tools.map((t: { name: string }) => t.name)).toEqual([
      "check_transaction",
      "check_signature",
      "address_reputation",
      "policy_templates",
    ]);
    for (const tool of tools) {
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.description.length).toBeGreaterThan(40);
      expect(tool.annotations.readOnlyHint).toBe(true);
    }
    expect(tools).toHaveLength(MCP_TOOLS.length);
  });

  it("checks a transaction and says first whether it may be signed", async () => {
    const node = new FakeRpc();
    // The trace of a plain transfer: one call that carries the value.
    node.frame = frame({ to: PEER, value: "0x1" });
    const { call } = await client(cleanSources(), node);
    const safe = await call("check_transaction", { from: USER, to: PEER, value: "1" });
    expect(safe.isError).toBe(false);
    expect(safe.content[0].text).toMatch(/^Decision: safe\. It may be signed\./);
    expect(safe.structuredContent.decision).toBe("safe");

    // No trace this time: the calldata alone says what the approval grants.
    const drain = await (await client()).call("check_transaction", {
      from: USER,
      to: USDC,
      data: approveData(DRAINER, maxUint256),
    });
    expect(drain.content[0].text).toMatch(/^Decision: blocked\. Do not sign\./);
    expect(drain.content[0].text).toContain("ERC20_APPROVAL_UNLIMITED (blocking)");
    expect(drain.structuredContent.decision).toBe("blocked");
  });

  it("checks a typed-data signature, with the domain type a wallet sends along", async () => {
    const { call } = await client();
    const result = await call("check_signature", {
      signer: USER,
      typedData: {
        domain: { name: "USD Coin", verifyingContract: USDC, chainId: 10143 },
        types: {
          EIP712Domain: [{ name: "name", type: "string" }],
          Permit: [{ name: "owner", type: "address" }],
        },
        primaryType: "Permit",
        message: { owner: USER, spender: DRAINER, value: "1000000", nonce: 0, deadline: 99 },
      },
    });
    expect(result.content[0].text).toContain("PERMIT_SIGNATURE_DETECTED");
    expect(result.structuredContent.decision).toBe("blocked");

    // A message nobody can read is never safe here either.
    const unknown = await call("check_signature", {
      signer: USER,
      typedData: {
        domain: { verifyingContract: USDC, chainId: 10143 },
        types: {},
        primaryType: "Mystery",
        message: { beneficiary: DRAINER, amount: "5" },
      },
    });
    expect(unknown.structuredContent.decision).toBe("blocked");
  });

  it("reads the registry, and does not call a missing registry clean", async () => {
    const flagged = await client(
      cleanSources({
        registry: { [DRAINER]: { flagged: true, severity: 4, reasonCode: "DRAINER_KIT" } },
      }),
    );
    const hit = await flagged.call("address_reputation", { address: DRAINER });
    expect(hit.structuredContent).toEqual({
      address: DRAINER,
      flagged: true,
      severity: 4,
      reasonCode: "DRAINER_KIT",
    });
    const clean = await flagged.call("address_reputation", { address: PEER });
    expect(clean.structuredContent.flagged).toBe(false);
    expect(clean.content[0].text).toMatch(/not proof it is safe/);

    const none = await client(cleanSources({ registry: null }));
    const missing = await none.call("address_reputation", { address: PEER });
    expect(missing.isError).toBe(true);
    expect(missing.content[0].text).toMatch(/No verdict.*do not sign/);
  });

  it("answers bad arguments and a node that is down as no verdict, never as safe", async () => {
    const { call } = await client();
    const bad = await call("check_transaction", { from: "not an address" });
    expect(bad.isError).toBe(true);
    expect(bad.content[0].text).toMatch(/not valid.*Treat this as blocked/);
    const extra = await call("check_transaction", { from: USER, sign: true });
    expect(extra.isError).toBe(true);

    const rpc = new FakeRpc();
    rpc.down = true;
    const app = await buildApp(deps(rpc));
    const res = await app.inject({
      method: "POST",
      url: "/mcp",
      payload: {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "check_transaction", arguments: { from: USER, to: PEER } },
      },
    });
    expect(res.json().result.isError).toBe(true);
    expect(res.json().result.content[0].text).toMatch(/do not sign/);
  });

  it("refuses what is not the protocol", async () => {
    const { app, rpc, call } = await client();
    expect(
      (await rpc("tools/call", { name: "sign_anything", arguments: {} })).body.error.code,
    ).toBe(-32602);
    expect((await rpc("resources/list")).body.error.code).toBe(-32601);
    expect(
      (await app.inject({ method: "POST", url: "/mcp", payload: { hello: 1 } })).statusCode,
    ).toBe(400);
    expect((await app.inject({ method: "GET", url: "/mcp" })).statusCode).toBe(405);
    const templates = await call("policy_templates", {});
    expect(Object.keys(templates.structuredContent)).toEqual(["strict", "balanced", "permissive"]);
  });
});
