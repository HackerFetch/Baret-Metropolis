import { describe, expect, it, vi } from "vitest";
import { isRegistryAddress, lookupAddress, lookupOf, reputationUrl } from "./registry.js";

const LISTED_ADDRESS = "0xa8f3762b03ae73cbbdb9173d3537c632628727a4";
const CLEAR_ADDRESS = "0x1365566191bAA9872A64AcDce963751d5343ff49";
const HASH = "0xa1b9799281003c7a6d9113007540f31735033d6fba125fa20619395b16e359e8";

/** GET /v1/audit/reputation/0xa8f3...27a4 on the live API, 2026-10-11. */
const LISTED = {
  entry: {
    id: LISTED_ADDRESS,
    severity: 3,
    reasonCode: "SCAMSNIFFER_BLACKLIST",
    flaggedAt: 1791340079,
    block: 68851519,
    txHash: HASH,
  },
  history: [
    {
      id: "68851519-18",
      kind: "flagged",
      severity: 3,
      reasonCode: "SCAMSNIFFER_BLACKLIST",
      timestamp: 1791340079,
      block: 68851519,
      txHash: HASH,
    },
  ],
};
/** The same for 0x1365...ff49, which is not listed. */
const CLEAR = { entry: null, history: [] };

const answer = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("lookupOf", () => {
  it("reads the live listed answer", () => {
    expect(lookupOf(LISTED, LISTED_ADDRESS)).toEqual({
      status: "listed",
      reasonCode: "SCAMSNIFFER_BLACKLIST",
      severity: 3,
      flaggedAt: 1791340079,
      block: 68851519,
      txHash: HASH,
      historyCount: 1,
    });
  });

  it("reads every severity the contract allows, up to 4 (critical)", () => {
    for (const severity of [1, 2, 3, 4]) {
      expect(
        lookupOf({ entry: { ...LISTED.entry, severity }, history: [] }, LISTED_ADDRESS),
      ).toMatchObject({
        status: "listed",
        severity,
      });
    }
  });

  it("reads the live not-listed answer as clear", () => {
    expect(lookupOf(CLEAR, CLEAR_ADDRESS)).toEqual({ status: "clear" });
  });

  it("refuses every body that is not exactly one of the two shapes", () => {
    const entry = LISTED.entry;
    for (const body of [
      null,
      "listed",
      [],
      {},
      { entry: null },
      { entry: null, history: "none" },
      { history: [] },
      { entry: "listed", history: [] },
      { entry: { ...entry, id: CLEAR_ADDRESS }, history: [] },
      { entry: { ...entry, severity: 0 }, history: [] },
      { entry: { ...entry, severity: 5 }, history: [] },
      { entry: { ...entry, severity: "3" }, history: [] },
      { entry: { ...entry, reasonCode: "" }, history: [] },
      { entry: { ...entry, reasonCode: "<b>x</b>" }, history: [] },
      { entry: { ...entry, flaggedAt: -1 }, history: [] },
      { entry: { ...entry, block: 1.5 }, history: [] },
      { entry: { ...entry, txHash: "0x12" }, history: [] },
      { entry: { ...entry, txHash: undefined }, history: [] },
    ]) {
      expect(lookupOf(body, LISTED_ADDRESS)).toBeNull();
    }
  });
});

describe("isRegistryAddress", () => {
  it("takes an address in any case and refuses anything else", () => {
    expect(isRegistryAddress(LISTED_ADDRESS)).toBe(true);
    expect(isRegistryAddress(LISTED_ADDRESS.toUpperCase().replace("0X", "0x"))).toBe(true);
    expect(isRegistryAddress(` ${CLEAR_ADDRESS} `)).toBe(true);
    for (const text of ["", "0x12", "hello", `${LISTED_ADDRESS}00`, LISTED_ADDRESS.slice(2)]) {
      expect(isRegistryAddress(text)).toBe(false);
    }
  });
});

describe("lookupAddress", () => {
  it("asks the API through the site's /api rewrite, lowercase", async () => {
    const fetchImpl = answer(200, CLEAR);
    expect(await lookupAddress(CLEAR_ADDRESS, { fetchImpl })).toEqual({ status: "clear" });
    expect(fetchImpl).toHaveBeenCalledWith(
      `/api/v1/audit/reputation/${CLEAR_ADDRESS.toLowerCase()}`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(reputationUrl(CLEAR_ADDRESS)).toBe(
      "/api/v1/audit/reputation/0x1365566191baa9872a64acdce963751d5343ff49",
    );
  });

  it("returns a listed entry", async () => {
    const read = await lookupAddress(LISTED_ADDRESS, { fetchImpl: answer(200, LISTED) });
    expect(read).toMatchObject({ status: "listed", reasonCode: "SCAMSNIFFER_BLACKLIST" });
  });

  it("is unavailable on a 503, never clear", async () => {
    const fetchImpl = answer(503, CLEAR);
    expect(await lookupAddress(CLEAR_ADDRESS, { fetchImpl })).toEqual({ status: "unavailable" });
  });

  it("is unavailable on any other status, even with a clear-looking body", async () => {
    for (const status of [201, 204, 400, 404, 500]) {
      const fetchImpl = vi.fn(
        async () => new Response(status === 204 ? null : JSON.stringify(CLEAR), { status }),
      ) as unknown as typeof fetch;
      expect(await lookupAddress(CLEAR_ADDRESS, { fetchImpl })).toEqual({ status: "unavailable" });
    }
  });

  it("is unavailable on a bad body", async () => {
    const notJson = vi.fn(
      async () => new Response("<html>", { status: 200 }),
    ) as unknown as typeof fetch;
    expect(await lookupAddress(CLEAR_ADDRESS, { fetchImpl: notJson })).toEqual({
      status: "unavailable",
    });
    const foreign = answer(200, { ok: true });
    expect(await lookupAddress(CLEAR_ADDRESS, { fetchImpl: foreign })).toEqual({
      status: "unavailable",
    });
  });

  it("is unavailable on a network error", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    expect(await lookupAddress(CLEAR_ADDRESS, { fetchImpl })).toEqual({ status: "unavailable" });
  });

  it("is unavailable when the API does not answer in time", async () => {
    const fetchImpl = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new DOMException("", "AbortError")));
        }),
    ) as unknown as typeof fetch;
    expect(await lookupAddress(CLEAR_ADDRESS, { fetchImpl, timeoutMs: 10 })).toEqual({
      status: "unavailable",
    });
  });

  it("refuses a bad address without asking", async () => {
    const fetchImpl = answer(200, CLEAR);
    expect(await lookupAddress("0x12", { fetchImpl })).toEqual({ status: "invalid" });
    expect(await lookupAddress("", { fetchImpl })).toEqual({ status: "invalid" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
