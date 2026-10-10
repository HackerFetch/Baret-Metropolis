/**
 * What travels between a page, the content script and the background.
 *
 * A page talks to the provider (EIP-1193). The provider posts each request to
 * the isolated content script, which hands it to the background with the
 * extension's own messaging; the background stamps the origin the browser
 * reports. A request that needs the owner (connect, sign, send) is parked as
 * a Pending and answered later, when the request window has decided.
 */

/** Marks the provider's window messages. Bump it when their shape changes. */
export const PAGE_CHANNEL = "baret-extension/1";

/** Monad testnet, the only chain this build signs for. */
export const CHAIN_ID = 10143;
export const CHAIN_ID_HEX = "0x279f";

export interface RpcError {
  readonly code: number;
  readonly message: string;
}

/** EIP-1193 and EIP-1474 codes the wallet answers with. */
export const ERRORS = {
  rejected: { code: 4001, message: "The request was declined in Baret." },
  unauthorized: { code: 4100, message: "This site is not connected to Baret." },
  unsupported: { code: 4200, message: "Baret does not support this method." },
  blocked: { code: 4001, message: "Baret blocked this request. Nothing was signed." },
  chain: { code: 4902, message: "Baret is on Monad testnet (chain 10143) only." },
  invalid: { code: -32602, message: "The request is not valid." },
  internal: { code: -32603, message: "Baret could not answer." },
} as const satisfies Record<string, RpcError>;

export interface PageRequest {
  readonly channel: typeof PAGE_CHANNEL;
  readonly dir: "request";
  readonly id: string;
  readonly method: string;
  readonly params: readonly unknown[];
}

export type PageAnswer =
  | {
      readonly channel: typeof PAGE_CHANNEL;
      readonly dir: "response";
      readonly id: string;
      readonly result: unknown;
    }
  | {
      readonly channel: typeof PAGE_CHANNEL;
      readonly dir: "response";
      readonly id: string;
      readonly error: RpcError;
    };

export type RpcOutcome = { readonly result: unknown } | { readonly error: RpcError };

/** What the background says at once: an answer, or that the owner is being asked. */
export type RpcReply = RpcOutcome | { readonly pending: true };

export type PendingKind = "connect" | "transaction" | "typedData" | "message";

/** A request waiting for the owner, as the request window reads it. */
export interface Pending {
  readonly id: string;
  readonly kind: PendingKind;
  /** The site, as the browser reports it (scheme and host). */
  readonly origin: string;
  readonly tabId: number;
  readonly method: string;
  readonly params: readonly unknown[];
  /** ISO time it arrived. */
  readonly at: string;
}

/** A site's name in the sites list: its origin without the scheme. */
export function siteOf(origin: string): string {
  return origin.replace(/^https?:\/\//, "");
}

const ID = /^[A-Za-z0-9_-]{1,64}$/;

/** A request a page posted, or null when it is not exactly one. */
export function parsePageRequest(data: unknown): PageRequest | null {
  if (typeof data !== "object" || data === null) return null;
  const { channel, dir, id, method, params } = data as Record<string, unknown>;
  if (channel !== PAGE_CHANNEL || dir !== "request") return null;
  if (typeof id !== "string" || !ID.test(id)) return null;
  if (typeof method !== "string" || method.length === 0 || method.length > 64) return null;
  if (params !== undefined && !Array.isArray(params)) return null;
  return { channel: PAGE_CHANNEL, dir: "request", id, method, params: params ?? [] };
}

/** Read-only node methods the wallet passes to the Monad RPC as they are. */
export const READ_METHODS: ReadonlySet<string> = new Set([
  "eth_blockNumber",
  "eth_call",
  "eth_estimateGas",
  "eth_gasPrice",
  "eth_maxPriorityFeePerGas",
  "eth_feeHistory",
  "eth_getBalance",
  "eth_getCode",
  "eth_getStorageAt",
  "eth_getTransactionCount",
  "eth_getTransactionByHash",
  "eth_getTransactionReceipt",
  "eth_getBlockByNumber",
  "eth_getBlockByHash",
  "eth_getLogs",
]);
