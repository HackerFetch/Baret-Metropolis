import { GuardUnreachableError } from "@baret/guard";
import { NotClearedError } from "@baret/wallet-core";
import { describe, expect, it } from "vitest";
import { stopOf } from "./revoke.js";

const verdict = (findings: { code: string; blocking: boolean }[]) =>
  ({ decision: "blocked", findings, firedRules: [] }) as never;

describe("why a live revoke stopped", () => {
  it("names Baret's first blocking finding when its check refused the revoke", () => {
    const error = new NotClearedError(
      verdict([
        { code: "UNKNOWN_CONTRACT", blocking: false },
        { code: "KNOWN_MALICIOUS_ADDRESS", blocking: true },
      ]),
    );
    expect(stopOf(error)).toEqual({ why: "blocked", code: "KNOWN_MALICIOUS_ADDRESS" });
  });

  it("says unreachable when Baret did not answer, never a failed transaction", () => {
    expect(stopOf(new GuardUnreachableError("down"))).toEqual({ why: "unreachable", code: null });
  });

  it("calls everything else a transaction that did not confirm", () => {
    expect(stopOf(new Error("the transaction reverted"))).toEqual({ why: "failed", code: null });
    expect(stopOf("odd")).toEqual({ why: "failed", code: null });
  });
});
