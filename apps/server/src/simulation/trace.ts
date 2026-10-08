import { type Address, getAddress, type Hex, isAddress } from "viem";
import type { RawCallFrame } from "../infra/rpc.js";

export interface TraceFrame {
  type: string;
  from: Address;
  to: Address | null;
  value: bigint;
  input: Hex;
  depth: number;
  /** This frame or one of its parents reverted, so its effects never land. */
  reverted: boolean;
}

export interface TraceLog {
  address: Address;
  topics: Hex[];
  data: Hex;
}

export interface CallTrace {
  frames: TraceFrame[];
  /** Logs of frames that did not revert, in execution order. */
  logs: TraceLog[];
  /** The deepest chain of contracts calling contracts; delegatecalls add no level. */
  maxDepth: number;
  /** Every address a call frame targeted. */
  touched: Address[];
}

export const EMPTY_TRACE: CallTrace = { frames: [], logs: [], maxDepth: 0, touched: [] };

const addr = (v: string | undefined): Address | null =>
  v && isAddress(v, { strict: false }) ? getAddress(v) : null;

const amount = (v: string | undefined): bigint => {
  if (!v) return 0n;
  try {
    return BigInt(v);
  } catch {
    return 0n;
  }
};

/** Flattens a `callTracer` tree. Effects of reverted subtrees are dropped. */
export function parseCallTrace(root: RawCallFrame | null): CallTrace | null {
  if (!root) return null;
  const frames: TraceFrame[] = [];
  const logs: TraceLog[] = [];
  const touched = new Set<Address>();
  let maxDepth = 0;

  // `contractDepth` is how many contracts deep a frame is. A DELEGATECALL runs
  // borrowed code inside the calling contract (a proxy and its implementation
  // are one contract to the user), so it does not add a level.
  const walk = (f: RawCallFrame, depth: number, contractDepth: number, parentReverted: boolean) => {
    const reverted = parentReverted || Boolean(f.error) || Boolean(f.revertReason);
    const to = addr(f.to);
    if (to) touched.add(to);
    const type = (f.type ?? "CALL").toUpperCase();
    const level = type === "DELEGATECALL" ? Math.max(contractDepth - 1, 0) : contractDepth;
    maxDepth = Math.max(maxDepth, level);
    frames.push({
      type,
      from: addr(f.from) ?? ("0x0000000000000000000000000000000000000000" as Address),
      to,
      value: amount(f.value),
      input: (f.input ?? "0x") as Hex,
      depth,
      reverted,
    });
    if (!reverted) {
      for (const log of f.logs ?? []) {
        const a = addr(log.address);
        if (a) logs.push({ address: a, topics: log.topics as Hex[], data: log.data as Hex });
      }
    }
    for (const child of f.calls ?? []) walk(child, depth + 1, level + 1, reverted);
  };

  walk(root, 0, 0, false);
  return { frames, logs, maxDepth, touched: [...touched] };
}
