import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  type AgentRequest,
  type AgentStep,
  extractJson,
  KIMI,
  LlmClient,
  type LlmTool,
  LlmUnavailableError,
  QWEN,
} from "./client";

const schema = z.object({ verdict: z.enum(["approve", "veto"]), reason: z.string() }).strict();

function completion(content: unknown, status = 200): typeof fetch {
  return vi.fn(
    async () =>
      new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content } }] }), {
        status,
      }),
  ) as unknown as typeof fetch;
}

const ask = (doFetch: typeof fetch) =>
  new LlmClient({ provider: QWEN, apiKey: "test-key", fetch: doFetch }).json({
    system: "s",
    user: "u",
    schema,
  });

describe("LlmClient.json", () => {
  it("posts an OpenAI chat completion to the provider and returns the checked object", async () => {
    const doFetch = completion('{"verdict":"veto","reason":"sends more than stated"}');
    await expect(ask(doFetch)).resolves.toEqual({
      verdict: "veto",
      reason: "sends more than stated",
    });

    const [url, init] = vi.mocked(doFetch).mock.calls[0] ?? [];
    expect(url).toBe("https://maas.qwencloudapi.com/compatible-mode/v1/chat/completions");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-key");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "qwen3.8-max",
      enable_thinking: false,
      max_tokens: 800,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "s" },
        { role: "user", content: "u" },
      ],
    });
  });

  it("uses the other provider's endpoint and model", async () => {
    const doFetch = completion('{"verdict":"approve","reason":"matches"}');
    await new LlmClient({ provider: KIMI, apiKey: "k", fetch: doFetch }).json({
      system: "s",
      user: "u",
      schema,
    });
    const [url, init] = vi.mocked(doFetch).mock.calls[0] ?? [];
    expect(url).toBe("https://api.moonshot.ai/v1/chat/completions");
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({
      model: "kimi-k3",
      reasoning_effort: "low",
      max_completion_tokens: 800,
    });
    expect(body).not.toHaveProperty("max_tokens");
  });

  it("reads JSON wrapped in a code fence", async () => {
    const doFetch = completion('```json\n{"verdict":"approve","reason":"ok"}\n```');
    await expect(ask(doFetch)).resolves.toMatchObject({ verdict: "approve" });
  });

  it.each([
    ["an error status", completion("{}", 429)],
    ["prose instead of JSON", completion("I think this is fine.")],
    ["JSON off the schema", completion('{"verdict":"maybe","reason":"x"}')],
    ["an extra field", completion('{"verdict":"approve","reason":"x","override":true}')],
    ["an empty message", completion("")],
    ["no choices", vi.fn(async () => new Response("{}")) as unknown as typeof fetch],
    [
      "a body that is not JSON",
      vi.fn(async () => new Response("<html>")) as unknown as typeof fetch,
    ],
  ])("has no answer on %s", async (_name, doFetch) => {
    await expect(ask(doFetch)).rejects.toThrow(LlmUnavailableError);
  });

  it("has no answer when the request fails", async () => {
    const doFetch = vi.fn(async () => {
      throw new Error("socket hang up");
    }) as unknown as typeof fetch;
    await expect(ask(doFetch)).rejects.toThrow(/qwen did not answer/);
  });

  it("refuses to be built without a key", () => {
    expect(() => new LlmClient({ provider: QWEN, apiKey: "" })).toThrow(/API key/);
  });
});

describe("extractJson", () => {
  it("takes the outermost object", () => {
    expect(extractJson('noise {"a":{"b":1}} trailing')).toEqual({ a: { b: 1 } });
  });

  it("refuses text with no object and a broken one", () => {
    expect(() => extractJson("nothing here")).toThrow(LlmUnavailableError);
    expect(() => extractJson('{"a": }')).toThrow(LlmUnavailableError);
  });
});

/** A stubbed provider that answers each POST with the next message in order. */
function script(...messages: unknown[]) {
  const bodies: Record<string, unknown>[] = [];
  const doFetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));
    const message = messages.shift();
    if (message instanceof Response) return message;
    return new Response(JSON.stringify({ choices: [{ message }] }));
  }) as unknown as typeof fetch;
  return { doFetch, bodies };
}

const callTool = (id: string, name: string, args: string) => ({
  role: "assistant",
  content: null,
  tool_calls: [{ id, type: "function", function: { name, arguments: args } }],
});
const say = (content: string) => ({ role: "assistant", content });

const lookup: LlmTool = {
  name: "lookup",
  description: "Looks an address up.",
  parameters: { type: "object", properties: { address: { type: "string" } } },
  run: async (args) => ({ seen: (args as { address: string }).address, flagged: false }),
};

const run = (
  doFetch: typeof fetch,
  extra: Partial<AgentRequest<z.infer<typeof schema>>> = {},
  provider = QWEN,
) =>
  new LlmClient({ provider, apiKey: "k", fetch: doFetch }).agent({
    system: "s",
    user: "u",
    tools: [lookup],
    schema,
    ...extra,
  });

const messagesOf = (body: Record<string, unknown> | undefined) =>
  (body?.messages ?? []) as Record<string, unknown>[];
const toolMessage = (body: Record<string, unknown> | undefined) =>
  messagesOf(body).find((m) => m.role === "tool");

describe("LlmClient.agent", () => {
  it("runs a tool, feeds the result back and returns the checked answer", async () => {
    const { doFetch, bodies } = script(
      callTool("c1", "lookup", '{"address":"0xabc"}'),
      say('{"verdict":"approve","reason":"matches"}'),
    );
    const seen: AgentStep[] = [];
    const result = await run(doFetch, { onStep: (step) => seen.push(step) });

    expect(result.answer).toEqual({ verdict: "approve", reason: "matches" });
    expect(result.steps.map((s) => s.kind)).toEqual(["model", "tool", "model"]);
    expect(seen).toEqual(result.steps);
    expect(result.steps[1]).toMatchObject({
      kind: "tool",
      id: "c1",
      name: "lookup",
      arguments: { address: "0xabc" },
      ok: true,
      result: { seen: "0xabc", flagged: false },
    });

    expect(bodies[0]).toMatchObject({
      model: "qwen3.8-max",
      enable_thinking: false,
      max_tokens: 800,
      tool_choice: "auto",
      tools: [
        { type: "function", function: { name: "lookup", description: "Looks an address up." } },
      ],
    });
    for (const body of bodies) expect(body).not.toHaveProperty("response_format");

    const messages = messagesOf(bodies[1]);
    expect(messages[2]).toMatchObject({
      role: "assistant",
      content: "",
      tool_calls: [{ id: "c1" }],
    });
    expect(messages[3]).toEqual({
      role: "tool",
      tool_call_id: "c1",
      content: JSON.stringify({ seen: "0xabc", flagged: false }),
    });
  });

  it("sends an answer that skipped a required tool back with a reminder", async () => {
    const { doFetch, bodies } = script(
      say('{"verdict":"approve","reason":"looks fine"}'),
      callTool("c1", "lookup", '{"address":"0xabc"}'),
      say('{"verdict":"approve","reason":"checked"}'),
    );
    const result = await run(doFetch, { requiredTools: ["lookup"] });

    expect(result.answer).toEqual({ verdict: "approve", reason: "checked" });
    const reminder = messagesOf(bodies[1]).at(-1);
    expect(reminder).toMatchObject({ role: "user" });
    expect(String(reminder?.content)).toContain("call these tools: lookup");
    expect(result.steps.map((s) => s.kind)).toEqual(["model", "model", "tool", "model"]);
  });

  it("lets the answer stand after two reminders, for the caller to judge", async () => {
    const { doFetch, bodies } = script(
      say('{"verdict":"approve","reason":"one"}'),
      say('{"verdict":"approve","reason":"two"}'),
      say('{"verdict":"approve","reason":"three"}'),
    );
    const result = await run(doFetch, { requiredTools: ["lookup"] });

    expect(result.answer).toEqual({ verdict: "approve", reason: "three" });
    expect(bodies).toHaveLength(3);
    expect(result.steps.some((s) => s.kind === "tool")).toBe(false);
  });

  it("does not count a failed run as the required tool", async () => {
    const failing: LlmTool = { ...lookup, run: async () => Promise.reject(new Error("down")) };
    const { doFetch, bodies } = script(
      callTool("c1", "lookup", '{"address":"0xabc"}'),
      say('{"verdict":"approve","reason":"one"}'),
      callTool("c2", "lookup", '{"address":"0xabc"}'),
      say('{"verdict":"veto","reason":"two"}'),
      say('{"verdict":"veto","reason":"could not check"}'),
    );
    const result = await new LlmClient({ provider: QWEN, apiKey: "k", fetch: doFetch }).agent({
      system: "s",
      user: "u",
      tools: [failing],
      schema,
      requiredTools: ["lookup"],
    });

    expect(result.answer).toEqual({ verdict: "veto", reason: "could not check" });
    expect(bodies).toHaveLength(5);
    expect(String(messagesOf(bodies[2]).at(-1)?.content)).toContain("call these tools: lookup");
    expect(String(messagesOf(bodies[4]).at(-1)?.content)).toContain("call these tools: lookup");
  });

  it("sends the provider's switches and token field on every turn", async () => {
    const { doFetch, bodies } = script(
      callTool("c1", "lookup", "{}"),
      say('{"verdict":"veto","reason":"x"}'),
    );
    await run(doFetch, { maxTokens: 300 }, KIMI);
    for (const body of bodies) {
      expect(body).toMatchObject({ reasoning_effort: "low", max_completion_tokens: 300 });
      expect(body).not.toHaveProperty("max_tokens");
    }
  });

  it("places the history after the user message", async () => {
    const { doFetch, bodies } = script(say('{"verdict":"approve","reason":"x"}'));
    await run(doFetch, { history: [{ role: "assistant", content: "plan: check the payee" }] });
    expect(bodies[0]?.messages).toEqual([
      { role: "system", content: "s" },
      { role: "user", content: "u" },
      { role: "assistant", content: "plan: check the payee" },
    ]);
  });

  it.each([
    ["an unknown tool", callTool("c1", "transfer", "{}"), /no tool named/],
    ["arguments that are not JSON", callTool("c1", "lookup", "{address:"), /not a JSON object/],
    ["arguments that are not an object", callTool("c1", "lookup", "[1]"), /not a JSON object/],
  ])("feeds %s back to the model as an error", async (_name, call, error) => {
    const { doFetch, bodies } = script(call, say('{"verdict":"veto","reason":"x"}'));
    const result = await run(doFetch);
    expect(result.steps[1]).toMatchObject({ kind: "tool", ok: false });
    expect(JSON.parse(String(toolMessage(bodies[1])?.content)).error).toMatch(error);
  });

  it("feeds a tool's throw back as an error, never as an answer", async () => {
    const broken: LlmTool = {
      ...lookup,
      run: async () => {
        throw new Error("indexer down");
      },
    };
    const { doFetch, bodies } = script(
      callTool("c1", "lookup", "{}"),
      say('{"verdict":"veto","reason":"no data"}'),
    );
    const result = await run(doFetch, { tools: [broken] });
    expect(result.steps[1]).toMatchObject({ ok: false, result: { error: "indexer down" } });
    expect(toolMessage(bodies[1])?.content).toBe('{"error":"indexer down"}');
  });

  it("gives up on a tool that runs past its timeout", async () => {
    const slow: LlmTool = { ...lookup, run: () => new Promise(() => {}) };
    const { doFetch } = script(
      callTool("c1", "lookup", "{}"),
      say('{"verdict":"veto","reason":"x"}'),
    );
    const result = await run(doFetch, { tools: [slow], toolTimeoutMs: 20 });
    expect(result.steps[1]).toMatchObject({
      ok: false,
      result: { error: "lookup did not finish in time" },
    });
  });

  it("cuts a long tool result", async () => {
    const big: LlmTool = { ...lookup, run: async () => "x".repeat(10_000) };
    const { doFetch, bodies } = script(
      callTool("c1", "lookup", "{}"),
      say('{"verdict":"veto","reason":"x"}'),
    );
    await run(doFetch, { tools: [big] });
    expect(String(toolMessage(bodies[1])?.content)).toHaveLength(6_000);
  });

  it("forces a last turn without tools after the step cap", async () => {
    const { doFetch, bodies } = script(
      callTool("c1", "lookup", "{}"),
      callTool("c2", "lookup", "{}"),
      say('{"verdict":"veto","reason":"ran out of steps"}'),
    );
    const result = await run(doFetch, { maxSteps: 2 });
    expect(result.answer.reason).toBe("ran out of steps");
    const last = bodies[2];
    expect(last).not.toHaveProperty("tools");
    expect(last).not.toHaveProperty("tool_choice");
    expect(last?.response_format).toEqual({ type: "json_object" });
    expect(messagesOf(last).at(-1)).toEqual({
      role: "user",
      content:
        "Stop calling tools. Answer now with the JSON object only, in the format the system message gives.",
    });
  });

  it("has no answer when the forced last turn is off the schema", async () => {
    const { doFetch } = script(callTool("c1", "lookup", "{}"), say("still thinking"));
    await expect(run(doFetch, { maxSteps: 1 })).rejects.toThrow(/did not finish/);
  });

  it("asks once more when the answer is off the schema", async () => {
    const { doFetch, bodies } = script(
      say("It looks fine to me."),
      say('{"verdict":"approve","reason":"x"}'),
    );
    const result = await run(doFetch);
    expect(result.answer.verdict).toBe("approve");
    expect(bodies[1]).not.toHaveProperty("tools");
    expect(bodies[1]?.response_format).toEqual({ type: "json_object" });
    expect(messagesOf(bodies[1]).slice(2)).toEqual([
      { role: "assistant", content: "It looks fine to me." },
      {
        role: "user",
        content: "Answer now with the JSON object only, in the format the system message gives.",
      },
    ]);
  });

  it("has no answer when the repair turn is off the schema too", async () => {
    const { doFetch } = script(
      say('{"verdict":"maybe","reason":"x"}'),
      say('{"verdict":"maybe","reason":"x"}'),
    );
    await expect(run(doFetch)).rejects.toThrow(LlmUnavailableError);
  });

  it.each([
    ["an error status", new Response("{}", { status: 503 })],
    ["an empty message", say("")],
  ])("has no answer on %s", async (_name, reply) => {
    const { doFetch } = script(reply);
    await expect(run(doFetch)).rejects.toThrow(LlmUnavailableError);
  });
});
