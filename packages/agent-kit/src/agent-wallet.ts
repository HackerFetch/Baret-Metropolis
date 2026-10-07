import {
  type AnalyzeRequest,
  type AnalyzeResponse,
  type GuardPolicy,
  MONAD_NETWORKS,
  type MonadNetwork,
  TransactionGuard,
} from "@baret/guard";
import {
  type Address,
  createPublicClient,
  encodeFunctionData,
  type Hex,
  http,
  keccak256,
  stringToHex,
  type TransactionSerializable,
} from "viem";
import { PAYMENT_GUARD_ABI } from "./abi.js";
import { GuardBlockedError } from "./errors.js";
import { type Review, type Reviewer, requireApproval } from "./reviewer.js";
import type { AgentSigner } from "./signer.js";

/** A call the agent wants to make. */
export interface AgentCall {
  to: Address;
  data?: Hex;
  value?: bigint;
}

/** The chain reads and the broadcast AgentWallet needs; replaceable in tests. */
export interface ChainClient {
  /** Fills in nonce, gas limit and fees for a call from `from`. */
  prepare(from: Address, call: AgentCall): Promise<TransactionSerializable>;
  send(raw: Hex): Promise<Hex>;
}

export interface AgentWalletOptions {
  signer: AgentSigner;
  /** The Baret server, e.g. https://baret-monad-api.onrender.com. */
  baretUrl: string;
  baretApiKey?: string;
  network?: MonadNetwork;
  /** Monad RPC for nonce, gas and broadcast. Not needed when `chain` is given. */
  rpcUrl?: string;
  /** Full rules, or a template name. Default: the Balanced template. */
  policy?: GuardPolicy;
  policyTemplate?: "strict" | "balanced" | "permissive";
  /**
   * Sign when Baret answers Caution. Off by default: a Caution is a finding
   * for a person to read, and an agent cannot read it.
   */
  allowCaution?: boolean;
  /**
   * A second check after Baret's: compares the call with the intent the agent
   * states and can veto. With a reviewer set, every signature needs an intent.
   */
  reviewer?: Reviewer;
  chain?: ChainClient;
  guard?: Pick<TransactionGuard, "evaluate">;
}

export interface SubmitResult {
  hash: Hex;
  verdict: AnalyzeResponse;
  /** The reviewer's approval, when a reviewer is set. */
  review?: Review;
}

/** What the agent says about a call it wants signed. */
export interface SignOptions {
  /** The agent's own description of what the call is for. The reviewer compares against it. */
  intent?: string;
}

function rpcChain(rpcUrl: string, chainId: number): ChainClient {
  const client = createPublicClient({ transport: http(rpcUrl) });
  return {
    async prepare(from, call) {
      const request = { account: from, to: call.to, data: call.data, value: call.value ?? 0n };
      const [nonce, gas, fees] = await Promise.all([
        client.getTransactionCount({ address: from, blockTag: "pending" }),
        client.estimateGas(request),
        client.estimateFeesPerGas(),
      ]);
      return {
        chainId,
        type: "eip1559",
        to: call.to,
        data: call.data ?? "0x",
        value: call.value ?? 0n,
        nonce,
        // Monad charges for the whole limit, so the margin is kept small.
        gas: (gas * 110n) / 100n,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      };
    },
    send: (raw) => client.sendRawTransaction({ serializedTransaction: raw }),
  };
}

/**
 * An agent's wallet that cannot sign what Baret has not cleared.
 *
 * `guardedSubmit` asks Baret about the exact call, and only on Safe (or on
 * Caution with `allowCaution`) does the signer see it. Blocked, an
 * unreachable server, or an answer off the contract all end the same way:
 * an error, and nothing signed.
 */
export class AgentWallet {
  readonly address: Address;
  private readonly network: MonadNetwork;
  private readonly chain: ChainClient;
  private readonly guard: Pick<TransactionGuard, "evaluate">;

  constructor(private readonly options: AgentWalletOptions) {
    this.address = options.signer.address;
    this.network = options.network ?? "testnet";
    this.guard =
      options.guard ??
      new TransactionGuard({
        baseUrl: options.baretUrl,
        ...(options.baretApiKey ? { apiKey: options.baretApiKey } : {}),
      });
    if (options.chain) {
      this.chain = options.chain;
    } else if (options.rpcUrl) {
      this.chain = rpcChain(options.rpcUrl, MONAD_NETWORKS[this.network].chainId);
    } else {
      throw new Error("AgentWallet needs `rpcUrl` (or a `chain` client)");
    }
  }

  private request(call: AgentCall): AnalyzeRequest {
    const { policy, policyTemplate } = this.options;
    return {
      network: this.network,
      transaction: {
        from: this.address,
        to: call.to,
        value: (call.value ?? 0n).toString(),
        data: call.data ?? "0x",
      },
      userWallet: this.address,
      ...(policy ? { policy } : policyTemplate ? { policyTemplate } : {}),
    };
  }

  /** Baret's verdict on a call, without signing anything. */
  evaluate(call: AgentCall): Promise<AnalyzeResponse> {
    return this.guard.evaluate(this.request(call));
  }

  /** Whether this wallet would sign under the verdict. */
  allows(verdict: AnalyzeResponse): boolean {
    if (verdict.decision === "safe") return true;
    return verdict.decision === "caution" && this.options.allowCaution === true;
  }

  /**
   * Checks, then signs. Throws GuardBlockedError when Baret does not clear the
   * call, and ReviewerVetoError when a reviewer is set and does not approve.
   * The reviewer is asked only about calls Baret cleared.
   */
  async guardedSign(
    call: AgentCall,
    options: SignOptions = {},
  ): Promise<{ raw: Hex; verdict: AnalyzeResponse; review?: Review }> {
    const verdict = await this.evaluate(call);
    if (!this.allows(verdict)) throw new GuardBlockedError(verdict);
    const review = this.options.reviewer
      ? await requireApproval(this.options.reviewer, {
          intent: options.intent,
          from: this.address,
          call,
          verdict,
        })
      : undefined;
    const tx = await this.chain.prepare(this.address, call);
    return {
      raw: await this.options.signer.signTransaction(tx),
      verdict,
      ...(review ? { review } : {}),
    };
  }

  /** Checks, signs and broadcasts. */
  async guardedSubmit(call: AgentCall, options: SignOptions = {}): Promise<SubmitResult> {
    const { raw, verdict, review } = await this.guardedSign(call, options);
    return { hash: await this.chain.send(raw), verdict, ...(review ? { review } : {}) };
  }

  /**
   * Pays a merchant from a PaymentGuard vault this wallet is the agent of.
   * `reference` is the invoice id or x402 memo; it is hashed into the
   * payment's on-chain reference.
   */
  pay(p: {
    vault: Address;
    merchant: Address;
    amount: bigint;
    reference: string;
    /** Defaults to a plain description of the payment. */
    intent?: string;
  }) {
    return this.guardedSubmit(payCall(p), {
      intent:
        p.intent ??
        `Pay ${p.amount} base units of the vault's token from vault ${p.vault} to merchant ${p.merchant} for "${p.reference}".`,
    });
  }
}

/** The PaymentGuard.pay call for a payment. */
export function payCall(p: {
  vault: Address;
  merchant: Address;
  amount: bigint;
  reference: string;
}): AgentCall {
  return {
    to: p.vault,
    data: encodeFunctionData({
      abi: PAYMENT_GUARD_ABI,
      functionName: "pay",
      args: [p.merchant, p.amount, keccak256(stringToHex(p.reference))],
    }),
  };
}
