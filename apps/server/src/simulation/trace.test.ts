import { describe, expect, it } from "vitest";
import { effectsFromTrace } from "../analysis/effects.js";
import { parseCallTrace } from "./trace.js";

const A = "0x00000000000000000000000000000000000000a1";
const B = "0x00000000000000000000000000000000000000b2";
const C = "0x00000000000000000000000000000000000000c3";
const IMPL = "0x00000000000000000000000000000000000000d4";

type Raw = NonNullable<Parameters<typeof parseCallTrace>[0]>;
const call = (to: string, calls: Raw[] = [], type = "CALL"): Raw => ({ type, from: A, to, calls });

describe("contract depth", () => {
  it("counts each contract that calls the next", () => {
    expect(parseCallTrace(call(A))?.maxDepth).toBe(0);
    expect(parseCallTrace(call(A, [call(B, [call(C)])]))?.maxDepth).toBe(2);
  });

  it("does not count a proxy handing over to its implementation", () => {
    // A token proxy that asks a policy proxy: two contracts, four frames deep.
    const token = call(A, [
      call(IMPL, [call(B, [call(IMPL, [], "DELEGATECALL")], "STATICCALL")], "DELEGATECALL"),
    ]);
    const trace = parseCallTrace(token);
    expect(trace?.maxDepth).toBe(1);
    // The frames keep their real depth; only the nesting measure changes.
    expect(trace?.frames.map((f) => f.depth)).toEqual([0, 1, 2, 3]);
  });

  it("still counts the calls an implementation makes", () => {
    const viaProxy = call(A, [call(IMPL, [call(B, [call(C)])], "DELEGATECALL")]);
    expect(parseCallTrace(viaProxy)?.maxDepth).toBe(2);
  });
});

describe("read-only frames", () => {
  it("marks a STATICCALL and everything inside it, and nothing else", () => {
    // A vault that reads a credential through a proxy, then moves a token through another.
    const pay = call(A, [
      call(B, [call(IMPL, [], "DELEGATECALL")], "STATICCALL"),
      call(C, [call(IMPL, [], "DELEGATECALL")]),
    ]);
    expect(parseCallTrace(pay)?.frames.map((f) => f.readOnly)).toEqual([
      false,
      true,
      true,
      false,
      false,
    ]);
  });
});

describe("operations counted from a trace", () => {
  it("counts the calls that can change something, once per contract", () => {
    // A vault reads two credentials through a proxy, asks a policy, then moves
    // a token whose proxy asks the same policy: 3 operations, 13 frames.
    const read = () => call(B, [call(IMPL, [], "DELEGATECALL")], "STATICCALL");
    const pay = call(A, [
      read(),
      read(),
      read(),
      call(C, [call(IMPL, [read(), call(B, [call(IMPL, [], "DELEGATECALL")])], "DELEGATECALL")]),
    ]);
    const trace = parseCallTrace(pay);
    expect(trace?.frames.length).toBe(13);
    expect(effectsFromTrace(trace as NonNullable<typeof trace>, A).operationCount).toBe(3);
  });
});
