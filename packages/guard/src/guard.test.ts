import { describe, expect, it } from "vitest";
import type { AnalyzeRequest, AnalyzeResponse } from "./analyze.js";
import { GuardUnreachableError, TransactionGuard, verdictRefusal } from "./guard.js";

const request: AnalyzeRequest = {
  network: "testnet",
  transaction: {
    from: "0x306707be3CD50B1Cca5E27F838AfcfC4fD84C353",
    to: "0xac9517a70c88480c9fA7E9a280DA485F7f552C29",
    value: "100000000000000000",
    data: "0x",
  },
  policyTemplate: "balanced",
};

function guardAnswering(response: Response): TransactionGuard {
  return new TransactionGuard({ baseUrl: "https://baret.test", fetch: async () => response });
}

async function failure(guard: TransactionGuard): Promise<GuardUnreachableError> {
  const error = await guard.evaluate(request).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(GuardUnreachableError);
  return error as GuardUnreachableError;
}

describe("a non-2xx answer", () => {
  it("keeps the server's JSON body", async () => {
    const body = { error: "invalid_request", message: "the body is not JSON" };
    const error = await failure(guardAnswering(Response.json(body, { status: 400 })));
    expect(error.status).toBe(400);
    expect(error.body).toEqual(body);
  });

  it("keeps a body that is not JSON as text", async () => {
    const error = await failure(guardAnswering(new Response("Bad Gateway", { status: 502 })));
    expect(error.status).toBe(502);
    expect(error.body).toBe("Bad Gateway");
  });

  it("has a null body when the answer is empty", async () => {
    const error = await failure(guardAnswering(new Response(null, { status: 503 })));
    expect(error.body).toBeNull();
  });
});

describe("a failure with no answer to read", () => {
  it("has a null body when Baret did not answer", async () => {
    const guard = new TransactionGuard({
      baseUrl: "https://baret.test",
      fetch: async () => {
        throw new Error("network down");
      },
    });
    const error = await failure(guard);
    expect(error.status).toBeNull();
    expect(error.body).toBeNull();
  });

  it("has a null body when a 200 breaks the contract", async () => {
    const error = await failure(guardAnswering(Response.json({ decision: "safe" })));
    expect(error.status).toBe(200);
    expect(error.body).toBeNull();
  });
});

describe("verdictRefusal", () => {
  const now = new Date("2026-10-13T12:00:00.000Z");
  const verdict = (expiresAt: string, chainId = 10143) =>
    ({ expiresAt, meta: { chainId } }) as AnalyzeResponse;

  it("lets a current verdict for the expected chain through", () => {
    expect(verdictRefusal(verdict("2026-10-13T12:01:30.000Z"), { chainId: 10143, now })).toBeNull();
  });

  it("refuses a verdict past its expiry, and at the instant of it", () => {
    expect(verdictRefusal(verdict("2026-10-13T11:59:59.000Z"), { chainId: 10143, now })).toBe(
      "expired",
    );
    expect(verdictRefusal(verdict(now.toISOString()), { chainId: 10143, now })).toBe("expired");
  });

  it("refuses a verdict for another chain, even a current one", () => {
    expect(verdictRefusal(verdict("2026-10-13T12:01:30.000Z", 143), { chainId: 10143, now })).toBe(
      "wrong_chain",
    );
  });

  it("reads an expiry that is not a date as expired", () => {
    expect(verdictRefusal(verdict("soon"), { chainId: 10143, now })).toBe("expired");
  });

  it("uses the clock when no time is given", () => {
    expect(verdictRefusal(verdict("2000-01-01T00:00:00.000Z"), { chainId: 10143 })).toBe("expired");
    expect(verdictRefusal(verdict("2999-01-01T00:00:00.000Z"), { chainId: 10143 })).toBeNull();
  });
});
