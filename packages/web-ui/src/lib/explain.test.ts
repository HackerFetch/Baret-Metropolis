import { describe, expect, it, vi } from "vitest";
import { defaultLanguage, EXPLAIN_URL, fetchExplanation, parseExplainAnswer } from "./explain.js";

/** A good /v1/explain answer; the text is English placeholder whatever the language. */
const goodAnswer = (language = "en") => ({
  decision: "blocked",
  explanation: {
    headline: "This approval hands over every token.",
    summary: "The site asks to spend all of your tokens with no end date.",
    points: ["The spender is not a known contract."],
    advice: "Do not sign it.",
  },
  language,
  model: { provider: "kimi", name: "kimi-k2" },
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("parseExplainAnswer", () => {
  it("accepts a good answer", () => {
    expect(parseExplainAnswer(goodAnswer())).toEqual(goodAnswer());
  });

  const bad: [string, (a: ReturnType<typeof goodAnswer>) => unknown][] = [
    ["not an object", () => "text"],
    ["an unknown decision", (a) => ({ ...a, decision: "allow" })],
    ["an unknown language", (a) => ({ ...a, language: "de" })],
    ["an empty headline", (a) => ({ ...a, explanation: { ...a.explanation, headline: "" } })],
    [
      "a long headline",
      (a) => ({ ...a, explanation: { ...a.explanation, headline: "x".repeat(161) } }),
    ],
    [
      "a long summary",
      (a) => ({ ...a, explanation: { ...a.explanation, summary: "x".repeat(901) } }),
    ],
    ["points not a list", (a) => ({ ...a, explanation: { ...a.explanation, points: "one" } })],
    [
      "nine points",
      (a) => ({ ...a, explanation: { ...a.explanation, points: Array(9).fill("p") } }),
    ],
    ["an empty point", (a) => ({ ...a, explanation: { ...a.explanation, points: [""] } })],
    ["a missing advice", (a) => ({ ...a, explanation: { ...a.explanation, advice: undefined } })],
    ["no explanation", (a) => ({ ...a, explanation: null })],
    ["a model with no name", (a) => ({ ...a, model: { provider: "kimi" } })],
  ];
  it.each(bad)("refuses %s", (_, make) => {
    expect(parseExplainAnswer(make(goodAnswer()))).toBeNull();
  });
});

describe("fetchExplanation", () => {
  it("posts the request id and the language", async () => {
    const fetchImpl = vi.fn(async () => json(200, goodAnswer("tr")));
    const answer = await fetchExplanation("req-1", "tr", undefined, fetchImpl);
    expect(answer?.language).toBe("tr");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(EXPLAIN_URL);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ requestId: "req-1", language: "tr" });
  });

  it("is null on a 503", async () => {
    const fetchImpl = vi.fn(async () => json(503, { error: "unavailable" }));
    expect(await fetchExplanation("req-1", "en", undefined, fetchImpl)).toBeNull();
  });

  it("is null on a network error", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("network");
    });
    expect(await fetchExplanation("req-1", "en", undefined, fetchImpl)).toBeNull();
  });

  it("is null on a bad body", async () => {
    const fetchImpl = vi.fn(async () => json(200, { decision: "safe" }));
    expect(await fetchExplanation("req-1", "en", undefined, fetchImpl)).toBeNull();
  });
});

describe("defaultLanguage", () => {
  it("picks Turkish, Chinese or English from the tag", () => {
    expect(defaultLanguage("tr-TR")).toBe("tr");
    expect(defaultLanguage("zh-CN")).toBe("zh");
    expect(defaultLanguage("zh")).toBe("zh");
    expect(defaultLanguage("de-DE")).toBe("en");
    expect(defaultLanguage("")).toBe("en");
  });
});
