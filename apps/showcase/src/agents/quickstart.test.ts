import { agents } from "@baret/content";
import { describe, expect, it } from "vitest";
import { SAMPLES, WORKS_TODAY } from "./Quickstart.js";

const LIVE = "https://baret-monad-api.onrender.com";

describe("the quickstart samples", () => {
  it("offers four samples, in order, and each one works today", () => {
    expect(Object.keys(SAMPLES)).toEqual(["http", "sdk", "cli", "mcp"]);
    expect([...WORKS_TODAY]).toEqual(["http", "sdk", "cli", "mcp"]);
  });

  it("points the MCP sample at the live /mcp URL with a tools/call", () => {
    const { mcp } = agents.quickstart;
    const code = mcp.code.join("\n");
    expect(mcp.title).toBe("MCP");
    expect(mcp.before).toContain(`${LIVE}/mcp`);
    expect(code).toContain(`curl -X POST ${LIVE}/mcp`);
    expect(code).toContain("accept: application/json, text/event-stream");
    expect(code).toContain('"method": "tools/call"');
    expect(code).toContain('"name": "address_reputation"');
    expect(code).toContain("0xa8f3762b03ae73cbbdb9173d3537c632628727a4");
    for (const tool of [
      "check_transaction",
      "check_signature",
      "address_reputation",
      "policy_templates",
    ]) {
      expect(mcp.after).toContain(tool);
    }
    expect(mcp.after).toContain("No answer means no signature.");
  });

  it("sends the HTTP and TypeScript samples to the live API, never to localhost", () => {
    const { http, sdk } = agents.quickstart;
    expect(http.code.join("\n")).toContain(`curl -X POST ${LIVE}/v1/analyze`);
    expect(sdk.code.join("\n")).toContain(`baretUrl: "${LIVE}"`);
    for (const sample of Object.values(SAMPLES)) {
      expect(sample.code.join("\n")).not.toContain("localhost");
      expect(sample.before).not.toMatch(/locally/);
    }
  });

  it("keeps the HTTP sample's body valid JSON", () => {
    const code = agents.quickstart.http.code.join("\n");
    const body = code.slice(code.indexOf("'") + 1, code.lastIndexOf("'"));
    expect(JSON.parse(body)).toMatchObject({ network: "testnet", policyTemplate: "balanced" });
  });
});
