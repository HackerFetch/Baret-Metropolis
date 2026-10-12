import { act, renderHook } from "@testing-library/react";
import type { Address, Hex } from "viem";
import { afterEach, describe, expect, it } from "vitest";
import { SendRefused, sendErrorOf } from "./baret.js";
import { baretSender, hashOf, windowCallOf } from "./baretSend.js";
import type { BaretAnswer } from "./baretWindow.js";
import { type Engine, resetForTests, type SendCall } from "./store.js";
import { useSendFlow } from "./useSendFlow.js";

const OWNER: Address = "0x1111111111111111111111111111111111111111";
const TO: Address = "0x2222222222222222222222222222222222222222";
const HASH: Hex = `0x${"ab".repeat(32)}`;
const call: SendCall = { from: OWNER, to: TO, value: "5", data: "0x01" };

/** An engine whose injected send must never be reached: the window is the sender. */
function engineThatNeverSends(): { sent: number } {
  const log = { sent: 0 };
  const engine: Engine = {
    connect: async () => undefined,
    disconnect: async () => undefined,
    switchToMonad: async () => undefined,
    refreshBalance: async () => undefined,
    send: async () => {
      log.sent += 1;
      throw new Error("the injected wallet was asked");
    },
    signTyped: async () => HASH,
    confirm: async () => "success",
    balanceOf: async () => 0n,
    tokenBalance: async () => 0n,
  };
  resetForTests(async () => engine);
  return log;
}

afterEach(() => {
  resetForTests();
});

describe("the Baret wallet's window as the sender", () => {
  it("drops the sender from the call: the window takes to, value and data", () => {
    expect(windowCallOf(call)).toEqual({ to: TO, value: "5", data: "0x01" });
  });

  it("takes the hash of a signature", () => {
    expect(hashOf({ type: "signed", id: "1", address: OWNER, hash: HASH })).toBe(HASH);
  });

  it("turns every other answer into a send error, never a hash (fail-closed)", () => {
    const refused = (reason: "declined" | "blocked" | "unreachable" | "invalid"): BaretAnswer => ({
      type: "refused",
      id: "1",
      reason,
      address: OWNER,
      findings: [],
    });
    const kindOf = (answer: BaretAnswer): string => {
      try {
        hashOf(answer);
        return "hash";
      } catch (error) {
        return error instanceof SendRefused ? error.kind : "other";
      }
    };
    expect(kindOf(refused("declined"))).toBe("rejected");
    expect(kindOf(refused("blocked"))).toBe("checked");
    expect(kindOf(refused("invalid"))).toBe("checked");
    expect(kindOf(refused("unreachable"))).toBe("unreachable");
    expect(kindOf({ type: "closed" })).toBe("closed");
    expect(kindOf({ type: "blocked" })).toBe("window");
    expect(kindOf({ type: "busy" })).toBe("pending");
    expect(kindOf({ type: "connected", id: "1", address: OWNER })).toBe("closed");
    expect(sendErrorOf(new SendRefused("checked"))).toBe("checked");
  });

  it("runs a one-step flow through the window, not the injected wallet", async () => {
    const log = engineThatNeverSends();
    const first = Promise.resolve<BaretAnswer>({
      type: "signed",
      id: "1",
      address: OWNER,
      hash: HASH,
    });
    const { result } = renderHook(() => useSendFlow());
    let ok = false;
    await act(async () => {
      ok = await result.current.run([call], undefined, baretSender(first));
    });
    expect(ok).toBe(true);
    expect(log.sent).toBe(0);
    expect(result.current.state).toMatchObject({
      phase: "done",
      steps: [{ status: "done", hash: HASH }],
    });
  });

  it("a refusal after Baret's check stops the run with its own reason", async () => {
    engineThatNeverSends();
    const first = Promise.resolve<BaretAnswer>({
      type: "refused",
      id: "1",
      reason: "blocked",
      address: OWNER,
      findings: [{ code: "KNOWN_MALICIOUS_ADDRESS", values: {} }],
    });
    const { result } = renderHook(() => useSendFlow());
    let ok = true;
    await act(async () => {
      ok = await result.current.run([call], undefined, baretSender(first));
    });
    expect(ok).toBe(false);
    expect(result.current.state).toMatchObject({
      phase: "stopped",
      error: "checked",
      steps: [{ status: "failed", hash: null }],
    });
  });
});
