import type { Address } from "viem";
import { describe, expect, it } from "vitest";
import { NansenError, NansenHttpSource, profileFromLabels } from "./nansen.js";

const A = "0x1111111111111111111111111111111111111111" as Address;
const B = "0x2222222222222222222222222222222222222222" as Address;

describe("profileFromLabels", () => {
  it("treats an address with no labels as new", () => {
    expect(profileFromLabels([])).toEqual({
      trustLevel: "new",
      flagged: false,
      freshWallet: false,
      whale: false,
    });
  });

  it("identifies a named entity", () => {
    const p = profileFromLabels([
      { label: "Binance: Hot Wallet", category: "cefi", kind: ["entity"] },
    ]);
    expect(p.trustLevel).toBe("identified");
  });

  it("calls any other history established, unless it is a fresh wallet", () => {
    expect(profileFromLabels([{ label: "DEX Trader", category: "behavioral" }]).trustLevel).toBe(
      "established",
    );
    const fresh = profileFromLabels([{ label: "Fresh Wallet", category: "behavioral" }]);
    expect(fresh).toMatchObject({ trustLevel: "new", freshWallet: true });
  });

  it("flags exploiters and spots whales", () => {
    expect(profileFromLabels([{ label: "Exploiter: Bridge Hack" }]).flagged).toBe(true);
    expect(profileFromLabels([{ label: "Phishing Scam Address" }]).flagged).toBe(true);
    expect(profileFromLabels([{ label: "Whale" }]).whale).toBe(true);
    expect(profileFromLabels([{ label: "Smart Trader" }]).flagged).toBe(false);
  });
});

function fakeFetch(handler: (body: { address: string; chain: string }) => Response) {
  const calls: {
    url: string;
    headers: Record<string, string>;
    body: { address: string; chain: string };
  }[] = [];
  const fetch = (async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    calls.push({ url, headers: init.headers as Record<string, string>, body });
    return handler(body);
  }) as unknown as typeof globalThis.fetch;
  return { fetch, calls };
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

describe("NansenHttpSource", () => {
  it("asks for Monad labels with the API key and answers every address", async () => {
    const { fetch, calls } = fakeFetch((b) =>
      json({ data: b.address === A ? [{ label: "Whale" }] : [], pagination: { page: 1 } }),
    );
    const src = new NansenHttpSource({ apiKey: "k", timeoutMs: 1000, fetch });
    const res = await src.lookup([A, B]);
    expect(calls[0]?.url).toBe("https://api.nansen.ai/api/v1/profiler/address/labels");
    expect(calls[0]?.headers.apikey).toBe("k");
    expect(calls.map((c) => c.body.chain)).toEqual(["monad", "monad"]);
    expect(res.get(A)?.whale).toBe(true);
    expect(res.get(B)?.trustLevel).toBe("new");
  });

  it("reuses an answer inside the cache window", async () => {
    let now = 0;
    const { fetch, calls } = fakeFetch(() => json({ data: [] }));
    const src = new NansenHttpSource({
      apiKey: "k",
      timeoutMs: 1000,
      fetch,
      now: () => now,
      cacheTtlMs: 100,
    });
    await src.lookup([A]);
    await src.lookup([A]);
    expect(calls).toHaveLength(1);
    now = 200;
    await src.lookup([A]);
    expect(calls).toHaveLength(2);
  });

  it("treats 404 as no labels", async () => {
    const { fetch } = fakeFetch(() => json({ detail: "not found" }, 404));
    const src = new NansenHttpSource({ apiKey: "k", timeoutMs: 1000, fetch });
    expect((await src.lookup([A])).get(A)?.trustLevel).toBe("new");
  });

  it("throws on a rate limit, an auth error or a broken body, so the rules fail closed", async () => {
    for (const res of [json({}, 429), json({}, 401), json({ nope: 1 })]) {
      const { fetch } = fakeFetch(() => res);
      const src = new NansenHttpSource({ apiKey: "k", timeoutMs: 1000, fetch });
      await expect(src.lookup([A])).rejects.toBeInstanceOf(NansenError);
    }
  });
});
