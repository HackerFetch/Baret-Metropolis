import {
  type AnalyzeRequest,
  type AnalyzeResponse,
  type GuardPolicy,
  type MonadNetwork,
  type PaymentContext,
  TransactionGuard,
} from "@baret/guard";
import type { Hex } from "viem";
import type { WalletSession } from "./account.js";
import type { WalletCall } from "./calls.js";
import type { Receipt, WalletChain } from "./chain.js";

/** An EIP-712 message this account is asked to sign; `types` may carry EIP712Domain. */
export interface WalletTyped {
  readonly domain: Readonly<Record<string, unknown>>;
  readonly types: Readonly<Record<string, readonly { name: string; type: string }[]>>;
  readonly primaryType: string;
  readonly message: Readonly<Record<string, unknown>>;
}

/** Baret did not clear the call and the owner has not overridden it. Nothing was signed. */
export class NotClearedError extends Error {
  constructor(public readonly verdict: AnalyzeResponse) {
    super(`Baret answered ${verdict.decision}`);
    this.name = "NotClearedError";
  }
}

export interface WalletOptions {
  session: WalletSession;
  chain: WalletChain;
  /** The Baret server: `/api` behind the wallet's own origin in production. */
  baretUrl: string;
  network?: MonadNetwork;
  /** The owner's rules, read at the moment of each check so an edit applies at once. */
  policy: () => GuardPolicy;
  guard?: Pick<TransactionGuard, "evaluate">;
}

/**
 * The wallet's one way to sign: check, then sign, then send.
 *
 *   check(call)            Baret's verdict for the sign request screen.
 *   sign(call, verdict)    Signs and broadcasts what `check` returned a verdict
 *                          for. Safe goes through. Caution needs the owner's
 *                          explicit `acknowledged: true` (they read the
 *                          findings and chose to sign). Blocked never signs.
 *
 * A check that cannot finish throws GuardUnreachableError from @baret/guard,
 * and there is then no verdict to sign with.
 */
export class Wallet {
  private readonly network: MonadNetwork;
  private readonly guard: Pick<TransactionGuard, "evaluate">;

  constructor(private readonly options: WalletOptions) {
    this.network = options.network ?? "testnet";
    this.guard = options.guard ?? new TransactionGuard({ baseUrl: options.baretUrl });
  }

  get address() {
    return this.options.session.address;
  }

  request(call: WalletCall): AnalyzeRequest {
    return {
      network: this.network,
      transaction: {
        from: this.address,
        to: call.to,
        value: call.value.toString(),
        data: call.data,
      },
      userWallet: this.address,
      policy: this.options.policy(),
    };
  }

  check(call: WalletCall): Promise<AnalyzeResponse> {
    return this.guard.evaluate(this.request(call));
  }

  async sign(
    call: WalletCall,
    verdict: AnalyzeResponse,
    choice: { acknowledged?: boolean } = {},
  ): Promise<Hex> {
    if (Date.parse(verdict.expiresAt) <= Date.now()) {
      throw new Error("the check has expired: check again before signing");
    }
    const cleared =
      verdict.decision === "safe" ||
      (verdict.decision === "caution" && choice.acknowledged === true);
    if (!cleared) throw new NotClearedError(verdict);

    const tx = await this.options.chain.prepare(this.address, call);
    const raw = await this.options.session.account.signTransaction(tx);
    return this.options.chain.send(raw);
  }

  /** The analyze request for a typed message (EIP-712) this account is asked to sign. */
  typedRequest(typed: WalletTyped, payment?: PaymentContext): AnalyzeRequest {
    return {
      network: this.network,
      typedData: {
        signer: this.address,
        domain: { ...typed.domain },
        types: Object.fromEntries(
          Object.entries(typed.types).map(([name, fields]) => [
            name,
            fields.map((f) => ({ ...f })),
          ]),
        ),
        primaryType: typed.primaryType,
        message: { ...typed.message },
      },
      userWallet: this.address,
      policy: this.options.policy(),
      ...(payment ? { payment } : {}),
    };
  }

  /** Baret's verdict for a typed message. `payment` is an x402 request's own terms, when the site gave them. */
  checkTyped(typed: WalletTyped, payment?: PaymentContext): Promise<AnalyzeResponse> {
    return this.guard.evaluate(this.typedRequest(typed, payment));
  }

  /**
   * Signs the typed message `checkTyped` returned a verdict for, under the
   * same rules as `sign`. Returns the signature; nothing is sent to the chain.
   */
  async signTyped(
    typed: WalletTyped,
    verdict: AnalyzeResponse,
    choice: { acknowledged?: boolean } = {},
  ): Promise<Hex> {
    if (Date.parse(verdict.expiresAt) <= Date.now()) {
      throw new Error("the check has expired: check again before signing");
    }
    const cleared =
      verdict.decision === "safe" ||
      (verdict.decision === "caution" && choice.acknowledged === true);
    if (!cleared) throw new NotClearedError(verdict);
    // viem derives EIP712Domain from the domain itself.
    const { EIP712Domain: _domain, ...types } = typed.types as Record<
      string,
      readonly { name: string; type: string }[]
    >;
    return this.options.session.account.signTypedData({
      domain: typed.domain,
      types,
      primaryType: typed.primaryType,
      message: typed.message,
    } as never);
  }

  /** Check, sign and wait for the block. For flows with no screen in between. */
  async checkAndSign(
    call: WalletCall,
    choice: { acknowledged?: boolean } = {},
  ): Promise<{ verdict: AnalyzeResponse; receipt: Receipt }> {
    const verdict = await this.check(call);
    const hash = await this.sign(call, verdict, choice);
    return { verdict, receipt: await this.options.chain.wait(hash) };
  }
}
