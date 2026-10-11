import {
  type Address,
  createPublicClient,
  encodeFunctionData,
  getAddress,
  type Hex,
  http,
  isAddress,
  isAddressEqual,
  isHex,
  parseAbi,
  parseSignature,
  recoverTypedDataAddress,
} from "viem";
import type { NetworkConfig } from "../config/env.js";
import { KimiBudget } from "./policy-draft.js";
import type { PaymentSender } from "./review.js";

/**
 * A paid resource over x402, and the facilitator that settles its payments.
 *
 * x402 turns HTTP 402 into a payment step: the server answers 402 with what
 * it wants (how much, of which token, to whom), the client signs an EIP-3009
 * authorisation for exactly that and sends the request again with it in the
 * X-PAYMENT header. Nothing is on-chain until somebody submits the
 * authorisation; that somebody is the facilitator. Here the resource server
 * and the facilitator are one process: it verifies the header, calls
 * `transferWithAuthorization` on the token, waits for the block, and only
 * then serves the answer.
 *
 * The payer signs a message, never a transaction, and pays no gas: the
 * facilitator's key pays it and can move nothing but what the message signs
 * over, to the address the message names. This is the payment a wallet or an
 * agent shows Baret before it signs (`payment` in /v1/analyze).
 */

export const X402_VERSION = 1;
/** The scheme and network names of x402's "exact" scheme on Monad testnet. */
export const X402_SCHEME = "exact";
export const X402_NETWORK = "monad-testnet";

const TOKEN_ABI = parseAbi([
  "function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)",
  "function authorizationState(address authorizer, bytes32 nonce) view returns (bool)",
]);

const AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

/** What the 402 answer asks for (x402 PaymentRequirements). */
export interface PaymentRequirements {
  scheme: typeof X402_SCHEME;
  network: typeof X402_NETWORK;
  /** Base units of the asset, as a decimal string. */
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: Address;
  maxTimeoutSeconds: number;
  asset: Address;
  /** The token's EIP-712 domain name and version, which the signature needs. */
  extra: { name: string; version: string };
}

export interface Settlement {
  transaction: Hex;
  payer: Address;
  /** Base units paid. */
  amount: string;
}

/** The X-PAYMENT header is missing or not a payment this server takes: answer 402 again. */
export class PaymentRefusedError extends Error {}

/** The payment was good and the transfer did not land. */
export class SettlementFailedError extends Error {}

export class X402LimitError extends Error {}

export interface PaywallOptions {
  chainId: number;
  asset: Address;
  /** The asset's EIP-712 domain. */
  domain: { name: string; version: string };
  payTo: Address;
  /** Base units for one answer. */
  price: bigint;
  dailyLimit: number;
  /** Whether the token has already used this authorisation. */
  used: (authorizer: Address, nonce: Hex) => Promise<boolean>;
  send: PaymentSender;
  now?: () => number;
}

const big = (value: unknown): bigint | null => {
  if (typeof value !== "string" || !/^\d{1,78}$/.test(value)) return null;
  return BigInt(value);
};

export class X402Paywall {
  private readonly budget: KimiBudget;
  private readonly now: () => number;
  /** Authorisations being settled right now: the same header twice is one payment. */
  private readonly settling = new Set<string>();

  constructor(private readonly options: PaywallOptions) {
    this.budget = new KimiBudget(options.dailyLimit, options.now);
    this.now = options.now ?? Date.now;
  }

  requirements(resource: string): PaymentRequirements {
    const { asset, payTo, price, domain } = this.options;
    return {
      scheme: X402_SCHEME,
      network: X402_NETWORK,
      maxAmountRequired: price.toString(),
      resource,
      description: "One answer from Scrybe, Baret's demo merchant",
      mimeType: "application/json",
      payTo,
      maxTimeoutSeconds: 600,
      asset,
      extra: domain,
    };
  }

  /** Verifies the X-PAYMENT header and settles it on-chain. */
  async settle(header: string): Promise<Settlement> {
    const { chainId, asset, payTo, price, domain } = this.options;
    let decoded: unknown;
    try {
      decoded = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
    } catch {
      throw new PaymentRefusedError("X-PAYMENT is not base64 JSON");
    }
    const outer = decoded as {
      x402Version?: unknown;
      scheme?: unknown;
      network?: unknown;
      payload?: { signature?: unknown; authorization?: Record<string, unknown> };
    };
    if (outer?.x402Version !== X402_VERSION) throw new PaymentRefusedError("x402Version must be 1");
    if (outer.scheme !== X402_SCHEME || outer.network !== X402_NETWORK) {
      throw new PaymentRefusedError(`only ${X402_SCHEME} on ${X402_NETWORK} is accepted`);
    }
    const auth = outer.payload?.authorization;
    const signature = outer.payload?.signature;
    if (!auth || typeof signature !== "string" || !isHex(signature)) {
      throw new PaymentRefusedError("the payment carries no authorisation or no signature");
    }
    const from =
      typeof auth.from === "string" && isAddress(auth.from) ? getAddress(auth.from) : null;
    const to = typeof auth.to === "string" && isAddress(auth.to) ? getAddress(auth.to) : null;
    const value = big(auth.value);
    const validAfter = big(auth.validAfter);
    const validBefore = big(auth.validBefore);
    const nonce =
      typeof auth.nonce === "string" && /^0x[0-9a-fA-F]{64}$/.test(auth.nonce)
        ? (auth.nonce as Hex)
        : null;
    if (!from || !to || value === null || validAfter === null || validBefore === null || !nonce) {
      throw new PaymentRefusedError("the authorisation is missing a field");
    }
    // Exactly what was asked, to exactly whom.
    if (!isAddressEqual(to, payTo))
      throw new PaymentRefusedError("the payment is to another address");
    if (value !== price) throw new PaymentRefusedError(`the price is ${price} base units`);
    const seconds = BigInt(Math.floor(this.now() / 1000));
    // A little room on both ends for the block that will carry it.
    if (validAfter > seconds) throw new PaymentRefusedError("the authorisation is not valid yet");
    if (validBefore <= seconds + 15n)
      throw new PaymentRefusedError("the authorisation has expired");

    let signer: Address;
    try {
      signer = await recoverTypedDataAddress({
        domain: { ...domain, chainId, verifyingContract: asset },
        types: AUTHORIZATION_TYPES,
        primaryType: "TransferWithAuthorization",
        message: { from, to, value, validAfter, validBefore, nonce },
        signature,
      });
    } catch {
      throw new PaymentRefusedError("the signature is not valid");
    }
    if (!isAddressEqual(signer, from)) {
      throw new PaymentRefusedError("the authorisation is not signed by its payer");
    }

    const key = `${from.toLowerCase()}:${nonce.toLowerCase()}`;
    if (this.settling.has(key)) throw new PaymentRefusedError("this payment is being settled");
    this.settling.add(key);
    try {
      let spent: boolean;
      try {
        spent = await this.options.used(from, nonce);
      } catch {
        throw new SettlementFailedError("the token could not be read");
      }
      if (spent) throw new PaymentRefusedError("this authorisation was already used");
      if (!this.budget.take()) throw new X402LimitError("today's demo payments are used up");

      const { v, r, s } = parseSignature(signature);
      const sent = await this.options.send({
        to: asset,
        data: encodeFunctionData({
          abi: TOKEN_ABI,
          functionName: "transferWithAuthorization",
          args: [from, to, value, validAfter, validBefore, nonce, Number(v ?? 27n), r, s],
        }),
        value: 0n,
      });
      if (sent.status !== "confirmed" || !sent.hash) {
        throw new SettlementFailedError(`the transfer was not confirmed (${sent.status})`);
      }
      return { transaction: sent.hash, payer: from, amount: value.toString() };
    } finally {
      this.settling.delete(key);
    }
  }
}

/** Asks the token whether an authorisation was used. */
export function authorizationReader(network: NetworkConfig, asset: Address) {
  const client = createPublicClient({ transport: http(network.rpcUrl) });
  return (authorizer: Address, nonce: Hex) =>
    client.readContract({
      address: asset,
      abi: TOKEN_ABI,
      functionName: "authorizationState",
      args: [authorizer, nonce],
    });
}

/**
 * What Scrybe sells: a short answer. It is a demo merchant, so the answers
 * are a fixed set, picked by the question; the payment for them is real.
 */
const ANSWERS = [
  "An x402 payment is a signed message, not a transaction: the payer authorises one exact transfer and whoever holds the message submits it. You just paid for this sentence that way.",
  "An allowance lets a contract move your tokens later, without asking again. An unlimited one stays open until you revoke it, which is why Baret blocks it by default.",
  "A wallet that simulates a request can tell you what will change before you sign. One that does not shows a function name and bytes, and asks you to trust the site.",
  "An agent's key signs whatever it is handed. A vault with caps bounds what a mistake can cost; a check before the signature keeps the mistake from being signed at all.",
];

export function answerFor(question: string): string {
  let sum = 0;
  for (const char of question) sum = (sum + (char.codePointAt(0) ?? 0)) % 9973;
  return ANSWERS[sum % ANSWERS.length] as string;
}
