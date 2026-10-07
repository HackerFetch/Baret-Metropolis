import {
  type Address,
  decodeFunctionResult,
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  type Hex,
  isAddress,
  parseAbi,
  parseAbiParameters,
} from "viem";

/**
 * The parts of the reputation oracle that need no CRE runtime: reading the
 * threat feed, choosing which slice of it one run looks at, and encoding what
 * goes to the chain. `main.ts` wires these to the capabilities.
 */

export type Config = {
  /** Cron expression of the trigger. */
  schedule: string;
  /** A JSON array of addresses, the shape of ScamSniffer's public blacklist. */
  feedUrl: string;
  /** CRE chain name. Monad only. */
  chainName: "monad-testnet" | "monad-mainnet";
  /** The ReputationOracleReceiver the report is delivered to. */
  receiverAddress: Address;
  /** Gas limit of the write. Monad charges the limit, not the gas used. */
  gasLimit: string;
  /** Addresses one run checks and, at most, writes. */
  windowSize: number;
  /** How long the oracle stays on one window before it moves to the next. */
  rotationSeconds: number;
  /** Registry severity for a feed entry: 3 and above is a blocklist entry. */
  severity: number;
  /** Registry reason code for a feed entry. */
  reasonCode: string;
};

export const MAX_WINDOW_SIZE = 100;
/** Below this share of well-formed entries the feed is treated as broken. */
export const MIN_VALID_SHARE = 0.9;

export const receiverAbi = parseAbi([
  "function pending(address[] candidates) view returns (address[])",
]);

const CHAIN_NAMES = ["monad-testnet", "monad-mainnet"] as const;

function fail(field: string, why: string): never {
  throw new Error(`config.${field} ${why}`);
}

function str(raw: Record<string, unknown>, field: string): string {
  const v = raw[field];
  if (typeof v !== "string" || v.length === 0) fail(field, "must be a non-empty string");
  return v;
}

function int(raw: Record<string, unknown>, field: string, min: number, max: number): number {
  const v = raw[field];
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
    fail(field, `must be an integer from ${min} to ${max}`);
  }
  return v;
}

/** Checks the workflow's config file. Anything off stops the run before it reads or writes. */
export function parseConfig(input: unknown): Config {
  if (typeof input !== "object" || input === null) throw new Error("config must be an object");
  const raw = input as Record<string, unknown>;

  const feedUrl = str(raw, "feedUrl");
  if (!feedUrl.startsWith("https://")) fail("feedUrl", "must be an https URL");
  const chainName = str(raw, "chainName");
  if (!CHAIN_NAMES.some((n) => n === chainName)) fail("chainName", "must be a Monad network");
  const receiverAddress = str(raw, "receiverAddress");
  if (!isAddress(receiverAddress)) fail("receiverAddress", "must be an address");
  const gasLimit = str(raw, "gasLimit");
  if (!/^[1-9][0-9]*$/.test(gasLimit)) fail("gasLimit", "must be a positive integer string");
  const reasonCode = str(raw, "reasonCode");
  if (!/^[A-Z0-9_]{1,31}$/.test(reasonCode)) {
    fail("reasonCode", "must be 1 to 31 characters of A-Z, 0-9 and _");
  }

  return {
    schedule: str(raw, "schedule"),
    feedUrl,
    chainName: chainName as Config["chainName"],
    receiverAddress: getAddress(receiverAddress),
    gasLimit,
    windowSize: int(raw, "windowSize", 1, MAX_WINDOW_SIZE),
    rotationSeconds: int(raw, "rotationSeconds", 1, 86_400),
    severity: int(raw, "severity", 1, 4),
    reasonCode,
  };
}

/**
 * Turns the feed's body into a sorted list of unique lower-case addresses.
 * Sorting makes every node see the same order whatever the feed returns.
 *
 * Throws when the body is not a JSON array, when it has no address in it, or
 * when too many entries are malformed: a feed that changed shape must not be
 * half applied.
 */
export function parseFeed(body: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("threat feed is not JSON");
  }
  if (!Array.isArray(parsed)) throw new Error("threat feed is not a JSON array");
  if (parsed.length === 0) throw new Error("threat feed is empty");

  const seen = new Set<string>();
  let valid = 0;
  for (const entry of parsed) {
    if (typeof entry !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(entry)) continue;
    valid += 1;
    const address = entry.toLowerCase();
    if (address !== "0x0000000000000000000000000000000000000000") seen.add(address);
  }
  if (valid / parsed.length < MIN_VALID_SHARE) {
    throw new Error(`threat feed has ${parsed.length - valid} malformed entries`);
  }
  if (seen.size === 0) throw new Error("threat feed has no address");
  return [...seen].sort();
}

/** How many windows the feed splits into. */
export function windowCount(total: number, windowSize: number): number {
  return Math.max(1, Math.ceil(total / windowSize));
}

/**
 * Which window a run at `nowMs` looks at. The oracle keeps no state: time
 * walks it through the feed, one window per rotation, and around again, so
 * every entry is reached and a new one is picked up on the next pass.
 */
export function windowIndex(nowMs: number, rotationSeconds: number, windows: number): number {
  const step = Math.floor(nowMs / 1000 / rotationSeconds);
  return step % windows;
}

/** The slice of the sorted feed a run looks at. */
export function selectWindow(
  addresses: readonly string[],
  nowMs: number,
  config: Pick<Config, "windowSize" | "rotationSeconds">,
): { index: number; windows: number; addresses: string[] } {
  const windows = windowCount(addresses.length, config.windowSize);
  const index = windowIndex(nowMs, config.rotationSeconds, windows);
  const start = index * config.windowSize;
  return { index, windows, addresses: addresses.slice(start, start + config.windowSize) };
}

/** Calldata of `pending(candidates)` on the receiver. */
export function encodePendingCall(candidates: readonly string[]): Hex {
  return encodeFunctionData({
    abi: receiverAbi,
    functionName: "pending",
    args: [candidates.map((a) => getAddress(a))],
  });
}

export function decodePendingResult(data: Hex): Address[] {
  return [...decodeFunctionResult({ abi: receiverAbi, functionName: "pending", data })];
}

/** The report `ReputationRegistry.onReport` decodes: abi.encode(address[], uint8[], string[]). */
export function encodeReport(
  targets: readonly Address[],
  config: Pick<Config, "severity" | "reasonCode">,
): Hex {
  return encodeAbiParameters(
    parseAbiParameters("address[] targets, uint8[] severities, string[] reasons"),
    [[...targets], targets.map(() => config.severity), targets.map(() => config.reasonCode)],
  );
}
