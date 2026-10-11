/**
 * The messages a site and the Baret wallet window exchange over postMessage.
 *
 * The wallet runs in its own window (a passkey only works on the domain it
 * was made on), so a site opens it with window.open and the two talk here.
 * Every message is parsed against a strict shape: anything else is ignored.
 * This module imports nothing, so a site can use it without the wallet code.
 */

export const WINDOW_CHANNEL = "baret-wallet/1";

/** The window name a site opens, so a second request reuses the window. */
export const WINDOW_NAME = "baret-wallet";

/** The only chain a site may ask the wallet to sign on (Monad testnet). */
export const WINDOW_CHAIN_ID = 10143;

export interface WindowCall {
  readonly to: `0x${string}`;
  /** Wei, as a decimal string. */
  readonly value: string;
  readonly data: `0x${string}`;
}

/**
 * An EIP-712 message, as `eth_signTypedData_v4` takes it. `types` may carry
 * EIP712Domain or leave it out. Plain JSON only: numbers that do not fit a
 * JSON number are decimal strings.
 */
export interface WindowTyped {
  readonly domain: Readonly<Record<string, unknown>>;
  readonly types: Readonly<Record<string, readonly { name: string; type: string }[]>>;
  readonly primaryType: string;
  readonly message: Readonly<Record<string, unknown>>;
}

export type SiteRequest =
  | { readonly channel: typeof WINDOW_CHANNEL; readonly type: "connect"; readonly id: string }
  | {
      readonly channel: typeof WINDOW_CHANNEL;
      readonly type: "sign";
      readonly id: string;
      readonly chainId: typeof WINDOW_CHAIN_ID;
      readonly call: WindowCall;
    }
  | {
      /** A typed message to check and sign. Nothing is sent to the chain. */
      readonly channel: typeof WINDOW_CHANNEL;
      readonly type: "signTyped";
      readonly id: string;
      readonly chainId: typeof WINDOW_CHAIN_ID;
      readonly typed: WindowTyped;
    };

export type RefusalReason = "declined" | "blocked" | "unreachable" | "invalid";

export type WalletAnswer =
  | { readonly channel: typeof WINDOW_CHANNEL; readonly type: "ready" }
  | {
      readonly channel: typeof WINDOW_CHANNEL;
      readonly type: "connected";
      readonly id: string;
      readonly address: `0x${string}`;
    }
  | {
      readonly channel: typeof WINDOW_CHANNEL;
      readonly type: "signed";
      readonly id: string;
      readonly address: `0x${string}`;
      readonly hash: `0x${string}`;
    }
  | {
      /** The answer to "signTyped": the signature, 65 bytes. */
      readonly channel: typeof WINDOW_CHANNEL;
      readonly type: "signedTyped";
      readonly id: string;
      readonly address: `0x${string}`;
      readonly signature: `0x${string}`;
    }
  | {
      readonly channel: typeof WINDOW_CHANNEL;
      readonly type: "refused";
      readonly id: string;
      readonly reason: RefusalReason;
      readonly address: `0x${string}` | null;
      readonly findings: readonly WindowFinding[];
    };

/**
 * One finding behind a refusal: its code and the values its sentence takes
 * ({asset}, {amount}...), so the site can word it from its own copy without
 * a placeholder left showing.
 */
export interface WindowFinding {
  readonly code: string;
  readonly values: Readonly<Record<string, string>>;
}

const ID = /^[A-Za-z0-9_-]{1,64}$/;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const HASH = /^0x[0-9a-fA-F]{64}$/;
const DATA = /^0x([0-9a-fA-F]{2})*$/;
const DATA_MAX = 100_000;
const VALUE = /^\d{1,78}$/;
const SIGNATURE = /^0x[0-9a-fA-F]{130}$/;
const TYPED_MAX = 20_000;
const TYPE_NAME = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
const FIELD_TYPE = /^[A-Za-z_][A-Za-z0-9_]{0,63}(\[\d{0,6}\]){0,4}$/;
const TYPES_MAX = 32;
const FIELDS_MAX = 64;
const FINDING = /^[A-Z0-9_]{1,64}$/;
const FINDINGS_MAX = 50;
const VALUE_KEY = /^[A-Za-z]{1,24}$/;
const VALUE_KEYS_MAX = 12;
const VALUE_MAX = 200;
const REASONS: readonly RefusalReason[] = ["declined", "blocked", "unreachable", "invalid"];

type Plain = Record<string, unknown>;

/** A plain object (not an array, not a class instance) with exactly these keys. */
function exact(data: unknown, keys: readonly string[]): data is Plain {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return false;
  const proto = Object.getPrototypeOf(data);
  if (proto !== Object.prototype && proto !== null) return false;
  const own = Object.keys(data);
  return own.length === keys.length && keys.every((key) => Object.hasOwn(data, key));
}

function text(value: unknown, pattern: RegExp): value is string {
  return typeof value === "string" && pattern.test(value);
}

function isAddress(value: unknown): value is `0x${string}` {
  return text(value, ADDRESS);
}

function typeOf(data: unknown): unknown {
  if (typeof data !== "object" || data === null) return undefined;
  const plain = data as Plain;
  return plain.channel === WINDOW_CHANNEL ? plain.type : undefined;
}

function parseCall(data: unknown): WindowCall | null {
  if (!exact(data, ["to", "value", "data"])) return null;
  const { to, value, data: input } = data;
  if (!isAddress(to) || !text(value, VALUE)) return null;
  if (typeof input !== "string" || input.length > DATA_MAX || !DATA.test(input)) return null;
  return { to, value, data: input as `0x${string}` };
}

function isPlain(data: unknown): data is Plain {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return false;
  const proto = Object.getPrototypeOf(data);
  return proto === Object.prototype || proto === null;
}

/**
 * A typed message, copied through JSON so nothing but plain data survives.
 * Refused when it is not plain JSON, is over 20,000 characters, names a type
 * or a field oddly, or has no definition for its primary type.
 */
function parseTyped(data: unknown): WindowTyped | null {
  if (!exact(data, ["domain", "types", "primaryType", "message"])) return null;
  let copy: Plain;
  try {
    const json = JSON.stringify(data);
    if (typeof json !== "string" || json.length > TYPED_MAX) return null;
    copy = JSON.parse(json) as Plain;
  } catch {
    return null;
  }
  const { domain, types, primaryType, message } = copy;
  if (!isPlain(domain) || !isPlain(message) || !isPlain(types)) return null;
  if (!text(primaryType, TYPE_NAME)) return null;
  const names = Object.keys(types);
  if (names.length === 0 || names.length > TYPES_MAX || !Object.hasOwn(types, primaryType)) {
    return null;
  }
  const parsed: Record<string, { name: string; type: string }[]> = {};
  for (const name of names) {
    const fields = types[name];
    if (!TYPE_NAME.test(name) || !Array.isArray(fields) || fields.length > FIELDS_MAX) return null;
    const list: { name: string; type: string }[] = [];
    for (const field of fields) {
      if (!exact(field, ["name", "type"])) return null;
      if (!text(field.name, TYPE_NAME) || !text(field.type, FIELD_TYPE)) return null;
      list.push({ name: field.name, type: field.type });
    }
    parsed[name] = list;
  }
  return { domain, types: parsed, primaryType, message };
}

/** A request from a site, or null when it is not exactly one. */
export function parseSiteRequest(data: unknown): SiteRequest | null {
  const type = typeOf(data);
  if (type === "connect") {
    if (!exact(data, ["channel", "type", "id"]) || !text(data.id, ID)) return null;
    return { channel: WINDOW_CHANNEL, type, id: data.id };
  }
  if (type === "sign") {
    if (!exact(data, ["channel", "type", "id", "chainId", "call"])) return null;
    if (!text(data.id, ID) || data.chainId !== WINDOW_CHAIN_ID) return null;
    const call = parseCall(data.call);
    if (!call) return null;
    return { channel: WINDOW_CHANNEL, type, id: data.id, chainId: WINDOW_CHAIN_ID, call };
  }
  if (type === "signTyped") {
    if (!exact(data, ["channel", "type", "id", "chainId", "typed"])) return null;
    if (!text(data.id, ID) || data.chainId !== WINDOW_CHAIN_ID) return null;
    const typed = parseTyped(data.typed);
    if (!typed) return null;
    return { channel: WINDOW_CHANNEL, type, id: data.id, chainId: WINDOW_CHAIN_ID, typed };
  }
  return null;
}

/** A finding's values: a plain object of at most 12 short strings under plain keys. */
function parseValues(data: unknown): Readonly<Record<string, string>> | null {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const proto = Object.getPrototypeOf(data);
  if (proto !== Object.prototype && proto !== null) return null;
  const entries = Object.entries(data);
  if (entries.length > VALUE_KEYS_MAX) return null;
  const values: Record<string, string> = {};
  for (const [key, item] of entries) {
    if (!VALUE_KEY.test(key) || typeof item !== "string" || item.length > VALUE_MAX) return null;
    values[key] = item;
  }
  return values;
}

function parseFindings(value: unknown): readonly WindowFinding[] | null {
  if (!Array.isArray(value) || value.length > FINDINGS_MAX) return null;
  const findings: WindowFinding[] = [];
  for (const item of value) {
    if (!exact(item, ["code", "values"]) || !text(item.code, FINDING)) return null;
    const values = parseValues(item.values);
    if (!values) return null;
    findings.push({ code: item.code, values });
  }
  return findings;
}

/** An answer from the wallet window, or null when it is not exactly one. */
export function parseWalletAnswer(data: unknown): WalletAnswer | null {
  const type = typeOf(data);
  if (type === "ready") {
    return exact(data, ["channel", "type"]) ? { channel: WINDOW_CHANNEL, type } : null;
  }
  if (type === "connected") {
    if (!exact(data, ["channel", "type", "id", "address"])) return null;
    if (!text(data.id, ID) || !isAddress(data.address)) return null;
    return { channel: WINDOW_CHANNEL, type, id: data.id, address: data.address };
  }
  if (type === "signed") {
    if (!exact(data, ["channel", "type", "id", "address", "hash"])) return null;
    if (!text(data.id, ID) || !isAddress(data.address) || !text(data.hash, HASH)) return null;
    return {
      channel: WINDOW_CHANNEL,
      type,
      id: data.id,
      address: data.address,
      hash: data.hash as `0x${string}`,
    };
  }
  if (type === "signedTyped") {
    if (!exact(data, ["channel", "type", "id", "address", "signature"])) return null;
    if (!text(data.id, ID) || !isAddress(data.address)) return null;
    if (!text(data.signature, SIGNATURE)) return null;
    return {
      channel: WINDOW_CHANNEL,
      type,
      id: data.id,
      address: data.address,
      signature: data.signature as `0x${string}`,
    };
  }
  if (type === "refused") {
    if (!exact(data, ["channel", "type", "id", "reason", "address", "findings"])) return null;
    const { id, reason, address } = data;
    if (!text(id, ID)) return null;
    if (!REASONS.includes(reason as RefusalReason)) return null;
    if (address !== null && !isAddress(address)) return null;
    const findings = parseFindings(data.findings);
    if (!findings) return null;
    return {
      channel: WINDOW_CHANNEL,
      type,
      id,
      reason: reason as RefusalReason,
      address,
      findings,
    };
  }
  return null;
}
