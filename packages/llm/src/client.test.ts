import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { extractJson, KIMI, LlmClient, LlmUnavailableError, QWEN } from "./client";

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
    expect(url).toBe("https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-key");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "qwen3.8-max",
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
    expect(JSON.parse(String(init?.body)).model).toBe("kimi-k3");
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
