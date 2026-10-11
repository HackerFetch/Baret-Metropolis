import { analyzeRequestSchema, POLICY_TEMPLATE_NAMES, POLICY_TEMPLATES } from "@baret/guard";
import { getAddress, isAddress } from "viem";
import { z } from "zod";
import { type AnalyzeDeps, analyze } from "./analyze.js";

/**
 * Baret as tools for an AI agent, over the Model Context Protocol.
 *
 * An agent that can sign should ask before it signs. These tools are that
 * question, shaped for a model: a few inputs, an answer that starts with the
 * decision in a sentence and carries the whole verdict after it. They call
 * the same `analyze` as POST /v1/analyze: one engine, one set of rules, the
 * same fail-closed answers. Nothing here signs, sends or holds a key.
 *
 * The transport is the protocol's Streamable HTTP in its simplest form: one
 * JSON-RPC message per POST, one JSON answer, no session and no stream.
 */

export const MCP_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"] as const;

export const MCP_SERVER_INFO = { name: "baret", title: "Baret pre-sign check", version: "1" };

export const MCP_INSTRUCTIONS =
  "Baret checks a Monad transaction or a signature request before it is signed. " +
  "Call check_transaction (or check_signature for EIP-712 typed data) before signing anything. " +
  "Sign only when the decision is safe. On caution, tell the person what was found and let them decide. " +
  "On blocked, or when the tool reports an error, do not sign: no verdict means no signature.";

const address = z.string().refine((v) => isAddress(v, { strict: false }), "must be a 0x address");
const template = z.enum(POLICY_TEMPLATE_NAMES).optional();
const network = z.enum(["testnet", "mainnet"]).optional();

interface Tool {
  name: string;
  title: string;
  description: string;
  input: z.ZodType;
  /** JSON Schema of `input`, written out: what a model reads to fill the call. */
  inputSchema: Record<string, unknown>;
  run(args: unknown, deps: AnalyzeDeps): Promise<{ text: string; structured?: unknown }>;
}

const hexSchema = { type: "string", pattern: "^0x[0-9a-fA-F]*$" };
const addressSchema = { type: "string", pattern: "^0x[0-9a-fA-F]{40}$" };
const templateSchema = {
  type: "string",
  enum: [...POLICY_TEMPLATE_NAMES],
  description: "The rules to apply. Default: balanced.",
};
const networkSchema = {
  type: "string",
  enum: ["testnet", "mainnet"],
  description: "Default: testnet (Monad testnet, chain 10143).",
};

/** The verdict as a model should read it: the decision first, then why. */
function sentence(verdict: Awaited<ReturnType<typeof analyze>>): string {
  const codes = verdict.findings.map((f) => (f.blocking ? `${f.code} (blocking)` : f.code));
  const why = codes.length > 0 ? ` Findings: ${codes.join(", ")}.` : " No findings.";
  const act =
    verdict.decision === "safe"
      ? "It may be signed."
      : verdict.decision === "caution"
        ? "Do not sign without telling the person what was found."
        : "Do not sign.";
  return `Decision: ${verdict.decision}. ${act}${why}`;
}

const checkTransaction = z
  .object({
    from: address,
    to: address.optional(),
    value: z
      .string()
      .regex(/^(\d+|0x[0-9a-fA-F]+)$/)
      .optional(),
    data: z
      .string()
      .regex(/^0x([0-9a-fA-F]{2})*$/)
      .optional(),
    policyTemplate: template,
    network,
  })
  .strict();

const checkSignature = z
  .object({
    signer: address,
    typedData: z
      .object({
        domain: z.record(z.string(), z.unknown()),
        types: z.record(z.string(), z.array(z.object({ name: z.string(), type: z.string() }))),
        primaryType: z.string(),
        message: z.record(z.string(), z.unknown()),
      })
      .strict(),
    policyTemplate: template,
    network,
  })
  .strict();

const addressReputation = z.object({ address, network }).strict();

async function verdictOf(request: unknown, deps: AnalyzeDeps) {
  const parsed = analyzeRequestSchema.parse(request);
  const verdict = await analyze(parsed, deps);
  // The same verdict /v1/explain can put into plain words.
  deps.verdicts?.remember(verdict);
  return { text: sentence(verdict), structured: verdict };
}

export const MCP_TOOLS: readonly Tool[] = [
  {
    name: "check_transaction",
    title: "Check a transaction before signing",
    description:
      "Simulates an unsigned Monad transaction, runs Baret's risk detectors and applies the rules. Returns the decision (safe, caution or blocked), the findings, and what the transaction would change in the sender's balances and allowances. Call this before signing or sending any transaction.",
    input: checkTransaction,
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["from"],
      properties: {
        from: { ...addressSchema, description: "The account that would sign and send." },
        to: { ...addressSchema, description: "The contract or account called. Omit to deploy." },
        value: { type: "string", description: "MON to send, in wei, decimal or 0x hex." },
        data: { ...hexSchema, description: "The calldata." },
        policyTemplate: templateSchema,
        network: networkSchema,
      },
    },
    run: (args, deps) => {
      const a = checkTransaction.parse(args);
      return verdictOf(
        {
          network: a.network ?? "testnet",
          policyTemplate: a.policyTemplate ?? "balanced",
          transaction: {
            from: a.from,
            ...(a.to ? { to: a.to } : {}),
            ...(a.value ? { value: a.value } : {}),
            ...(a.data ? { data: a.data } : {}),
          },
        },
        deps,
      );
    },
  },
  {
    name: "check_signature",
    title: "Check a typed-data signature before signing",
    description:
      "Reads an EIP-712 typed-data message before it is signed: permits, Permit2 transfers, x402 payment authorisations, marketplace orders and meta-transactions. A signature can give away funds without a transaction. A message Baret cannot read is never reported as safe.",
    input: checkSignature,
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["signer", "typedData"],
      properties: {
        signer: { ...addressSchema, description: "The account that would sign." },
        typedData: {
          type: "object",
          description: "The EIP-712 payload as passed to eth_signTypedData_v4.",
          required: ["domain", "types", "primaryType", "message"],
          properties: {
            domain: { type: "object" },
            types: { type: "object" },
            primaryType: { type: "string" },
            message: { type: "object" },
          },
        },
        policyTemplate: templateSchema,
        network: networkSchema,
      },
    },
    run: (args, deps) => {
      const a = checkSignature.parse(args);
      // EIP712Domain describes the domain itself and is not part of the message.
      const { EIP712Domain: _domain, ...types } = a.typedData.types;
      return verdictOf(
        {
          network: a.network ?? "testnet",
          policyTemplate: a.policyTemplate ?? "balanced",
          typedData: { signer: a.signer, ...a.typedData, types },
        },
        deps,
      );
    },
  },
  {
    name: "address_reputation",
    title: "Look an address up in the reputation registry",
    description:
      "Reads Baret's on-chain reputation registry on Monad for one address: whether it is flagged, how severely (1 low to 4 critical; 3 and above is a blocklist entry) and the reason code. The registry is fed by threat feeds through Chainlink CRE.",
    input: addressReputation,
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["address"],
      properties: { address: addressSchema, network: networkSchema },
    },
    run: async (args, deps) => {
      const a = addressReputation.parse(args);
      const config = deps.config.networks[a.network ?? "testnet"];
      const registry = config ? deps.sourcesFor(config).registry : null;
      // Fail-closed: no registry is not "not flagged".
      if (!registry) throw new Error("the reputation registry is not configured on this network");
      const target = getAddress(a.address);
      const entry = (await registry.lookup([target])).get(target);
      const flagged = entry?.flagged === true;
      return {
        text: flagged
          ? `${target} is flagged in the registry: severity ${entry?.severity}, reason ${entry?.reasonCode}.`
          : `${target} is not flagged in the registry. That is not proof it is safe: check the transaction itself.`,
        structured: {
          address: target,
          flagged,
          severity: entry?.severity ?? 0,
          reasonCode: entry?.reasonCode ?? "",
        },
      };
    },
  },
  {
    name: "policy_templates",
    title: "List the rule sets",
    description:
      "Returns Baret's three starting rule sets (strict, balanced, permissive) with every rule's value, so an agent can say which rules a check ran under.",
    input: z.object({}).strict(),
    inputSchema: { type: "object", additionalProperties: false, properties: {} },
    run: async () => ({
      text: `Rule sets: ${POLICY_TEMPLATE_NAMES.join(", ")}. Each has ${Object.keys(POLICY_TEMPLATES.balanced).length} rules.`,
      structured: POLICY_TEMPLATES,
    }),
  },
];

interface RpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export type McpReply =
  /** A notification: nothing to answer. */
  | null
  | { jsonrpc: "2.0"; id: string | number | null; result: unknown }
  | { jsonrpc: "2.0"; id: string | number | null; error: { code: number; message: string } };

export function isRpcRequest(value: unknown): value is RpcRequest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return v.jsonrpc === "2.0" && typeof v.method === "string";
}

/** Answers one JSON-RPC message of the protocol. Never throws. */
export async function handleMcp(message: RpcRequest, deps: AnalyzeDeps): Promise<McpReply> {
  const id = message.id ?? null;
  // A message with no id is a notification (initialized, cancelled): no answer.
  if (message.id === undefined) return null;
  const ok = (result: unknown): McpReply => ({ jsonrpc: "2.0", id, result });
  const fail = (code: number, text: string): McpReply => ({
    jsonrpc: "2.0",
    id,
    error: { code, message: text },
  });

  switch (message.method) {
    case "initialize": {
      const asked = message.params?.protocolVersion;
      const version = MCP_PROTOCOL_VERSIONS.find((v) => v === asked) ?? MCP_PROTOCOL_VERSIONS[0];
      return ok({
        protocolVersion: version,
        capabilities: { tools: {} },
        serverInfo: MCP_SERVER_INFO,
        instructions: MCP_INSTRUCTIONS,
      });
    }
    case "ping":
      return ok({});
    case "tools/list":
      return ok({
        tools: MCP_TOOLS.map((t) => ({
          name: t.name,
          title: t.title,
          description: t.description,
          inputSchema: t.inputSchema,
          // Every tool only reads: nothing is signed, sent or stored for the caller.
          annotations: { readOnlyHint: true, openWorldHint: true },
        })),
      });
    case "tools/call": {
      const name = message.params?.name;
      const tool = MCP_TOOLS.find((t) => t.name === name);
      if (!tool) return fail(-32602, `unknown tool: ${String(name)}`);
      try {
        const { text, structured } = await tool.run(message.params?.arguments ?? {}, deps);
        return ok({
          content: [
            { type: "text", text },
            ...(structured === undefined
              ? []
              : [{ type: "text", text: JSON.stringify(structured) }]),
          ],
          ...(structured === undefined ? {} : { structuredContent: structured }),
          isError: false,
        });
      } catch (err) {
        // The model must see that there is no verdict, and what that means.
        const reason =
          err instanceof z.ZodError
            ? `The arguments are not valid: ${err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`
            : err instanceof Error
              ? err.message
              : "the check did not finish";
        return ok({
          content: [
            {
              type: "text",
              text: `No verdict: ${reason}. Treat this as blocked and do not sign.`,
            },
          ],
          isError: true,
        });
      }
    }
    default:
      return fail(-32601, `method not found: ${message.method}`);
  }
}
