import {
  type AnalyzeResponse,
  type GuardPolicy,
  MONAD_NETWORKS,
  type MonadNetwork,
  type SpendRecord,
  TransactionGuard,
} from "@baret/guard";
import { type Address, getAddress, type Hex, isAddress, toHex } from "viem";
import { GuardBlockedError } from "./errors.js";
import type { PaymentSigner } from "./signer.js";

/**
 * Paying an HTTP 402 the way an agent should: read what the server asks,
 * ask Baret about the exact message, and only then sign it.
 *
 * The payment is an EIP-3009 `TransferWithAuthorization` on the token (the
 * x402 "exact" scheme). Baret gets it as `typedData` together with the 402's
 * own terms, so a message that pays another address, another token or more
 * than the agent's caps allow is refused before the key sees it.
 */

/** What this client pays with. */
const SCHEME = "exact";
const NETWORK_NAMES: Record<MonadNetwork, string> = {
  testnet: "monad-testnet",
  mainnet: "monad",
};

const TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
};

/** One entry of a 402 response's `accepts`. */
export interface X402Requirements {
  scheme: string;
  network: string;
  /** Base units of `asset`. */
  maxAmountRequired: string;
  resource?: string;
  description?: string;
  payTo: Address;
  asset: Address;
  maxTimeoutSeconds?: number;
  /** The token's EIP-712 domain name and version. */
  extra?: { name?: string; version?: string };
}

/** The server's receipt, from the X-PAYMENT-RESPONSE header. */
export interface X402Receipt {
  success: boolean;
  transaction: Hex | null;
  network: string;
  payer: Address;
}

/** The 402 could not be paid: off the protocol, or over what the caller allowed. Nothing was signed. */
export class X402Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = "X402Error";
  }
}

export interface X402Options {
  signer: PaymentSigner;
  /** The Baret server. Not needed when `guard` is given. */
  baretUrl?: string;
  baretApiKey?: string;
  guard?: Pick<TransactionGuard, "evaluate">;
  network?: MonadNetwork;
  policy?: GuardPolicy;
  policyTemplate?: "strict" | "balanced" | "permissive";
  /** Sign when Baret answers Caution. Off by default, as in AgentWallet. */
  allowCaution?: boolean;
  /** The most this call may pay, in base units. A 402 asking more is not signed. */
  maxAmount?: bigint;
  /** The agent's payments of the last 24 hours, for the hourly and daily caps. */
  history?: readonly SpendRecord[];
  /** Request options for both requests (method, body, headers). */
  init?: RequestInit;
  fetch?: typeof fetch;
  /** Unix seconds. */
  now?: () => number;
}

export interface X402Result {
  /** The paid response, or the first one when the server asked for no payment. */
  response: Response;
  /** Null when the server asked for no payment. */
  requirements: X402Requirements | null;
  verdict: AnalyzeResponse | null;
  receipt: X402Receipt | null;
  /** What was paid, for the caller's `history`. */
  spend: SpendRecord | null;
}

function requirementsFrom(body: unknown, network: MonadNetwork): X402Requirements {
  const accepts = (body as { accepts?: unknown } | null)?.accepts;
  if (!Array.isArray(accepts)) throw new X402Error("the 402 response has no `accepts`");
  const wanted = accepts.find(
    (a): a is X402Requirements =>
      a?.scheme === SCHEME &&
      a?.network === NETWORK_NAMES[network] &&
      typeof a?.maxAmountRequired === "string" &&
      /^\d+$/.test(a.maxAmountRequired) &&
      typeof a?.payTo === "string" &&
      isAddress(a.payTo) &&
      typeof a?.asset === "string" &&
      isAddress(a.asset),
  );
  if (!wanted) {
    throw new X402Error(`the 402 offers no "${SCHEME}" payment on ${NETWORK_NAMES[network]}`);
  }
  return wanted;
}

function receiptFrom(response: Response): X402Receipt | null {
  const header = response.headers.get("x-payment-response");
  if (!header) return null;
  try {
    return JSON.parse(atob(header)) as X402Receipt;
  } catch {
    return null;
  }
}

/**
 * Requests `url`; when the answer is 402, checks the payment with Baret,
 * signs it and requests again with the X-PAYMENT header.
 *
 * Throws GuardBlockedError when Baret does not clear the payment and
 * X402Error when the 402 cannot be paid as asked. In both cases nothing was
 * signed. A server that still answers 402 after the payment was signed is
 * returned as it is: read `response.status`.
 */
export async function payX402(url: string, options: X402Options): Promise<X402Result> {
  const doFetch = options.fetch ?? fetch;
  const network = options.network ?? "testnet";
  const first = await doFetch(url, options.init);
  if (first.status !== 402) {
    return { response: first, requirements: null, verdict: null, receipt: null, spend: null };
  }
  const requirements = requirementsFrom(await first.json().catch(() => null), network);
  const amount = BigInt(requirements.maxAmountRequired);
  if (options.maxAmount !== undefined && amount > options.maxAmount) {
    throw new X402Error(`the 402 asks ${amount}, over the ${options.maxAmount} this call allows`);
  }

  const now = (options.now ?? (() => Math.floor(Date.now() / 1000)))();
  const from = options.signer.address;
  const payTo = getAddress(requirements.payTo);
  const asset = getAddress(requirements.asset);
  const message = {
    from,
    to: payTo,
    value: amount.toString(),
    validAfter: "0",
    validBefore: String(now + (requirements.maxTimeoutSeconds ?? 600)),
    nonce: toHex(crypto.getRandomValues(new Uint8Array(32))),
  };
  const typed = {
    domain: {
      name: requirements.extra?.name ?? "USDC",
      version: requirements.extra?.version ?? "2",
      chainId: MONAD_NETWORKS[network].chainId,
      verifyingContract: asset,
    },
    types: TYPES,
    primaryType: "TransferWithAuthorization",
    message,
  };

  const guard =
    options.guard ??
    (options.baretUrl
      ? new TransactionGuard({
          baseUrl: options.baretUrl,
          ...(options.baretApiKey ? { apiKey: options.baretApiKey } : {}),
        })
      : null);
  if (!guard) throw new Error("payX402 needs `baretUrl` (or a `guard`)");
  const { policy, policyTemplate } = options;
  const verdict = await guard.evaluate({
    network,
    typedData: { signer: from, ...typed },
    userWallet: from,
    payment: {
      origin: new URL(url).origin,
      payTo,
      asset,
      amount: amount.toString(),
      spendHistory: [...(options.history ?? [])],
    },
    ...(policy ? { policy } : policyTemplate ? { policyTemplate } : {}),
  });
  const cleared =
    verdict.decision === "safe" ||
    (verdict.decision === "caution" && options.allowCaution === true);
  if (!cleared) throw new GuardBlockedError(verdict);

  const signature = await options.signer.signTypedData(typed);
  const header = btoa(
    JSON.stringify({
      x402Version: 1,
      scheme: SCHEME,
      network: NETWORK_NAMES[network],
      payload: { signature, authorization: message },
    }),
  );
  const headers = new Headers(options.init?.headers);
  headers.set("x-payment", header);
  const response = await doFetch(url, { ...options.init, headers });
  return {
    response,
    requirements,
    verdict,
    receipt: receiptFrom(response),
    spend: response.ok ? { amount: amount.toString(), timestamp: now } : null,
  };
}
