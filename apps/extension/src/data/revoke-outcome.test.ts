import { describe, expect, it } from "vitest";
import { revokeOutcome } from "./revoke-outcome.js";

describe("what a live revoke says", () => {
  it("says done only when Monad confirmed every id", () => {
    expect(revokeOutcome(["a", "b"], ["b", "a"])).toEqual({ kind: "done", count: 2 });
  });

  it("says partial with the real count when only some closed", () => {
    expect(revokeOutcome(["a", "b", "c"], ["b"])).toEqual({ kind: "partial", count: 1, total: 3 });
  });

  it("says failed when nothing closed: a refusal, a locked wallet or a failed transaction", () => {
    expect(revokeOutcome(["a"], [])).toEqual({ kind: "failed", total: 1, stop: null });
  });

  it("carries why the wallet stopped: Baret's refusal names its first finding", () => {
    const result = {
      closed: [],
      stopped: [{ id: "a", why: "blocked", code: "KNOWN_MALICIOUS_ADDRESS" }],
    } as const;
    expect(revokeOutcome(["a"], result)).toEqual({
      kind: "failed",
      total: 1,
      stop: { why: "blocked", code: "KNOWN_MALICIOUS_ADDRESS" },
    });
    const away = { closed: [], stopped: [{ id: "a", why: "unreachable", code: null }] } as const;
    expect(
      revokeOutcome(["a"], away).kind === "failed" && revokeOutcome(["a"], away),
    ).toMatchObject({ stop: { why: "unreachable" } });
  });

  it("does not count an id that was not asked for", () => {
    expect(revokeOutcome(["a"], ["z"])).toEqual({ kind: "failed", total: 1, stop: null });
  });

  it("never says done for an empty request", () => {
    expect(revokeOutcome([], [])).toEqual({ kind: "failed", total: 0, stop: null });
  });
});
