import {
  type AnalyzeRequest,
  type AnalyzeResponse,
  type GuardPolicy,
  type MonadNetwork,
  TransactionGuard,
} from "@baret/guard";
import type { Hex } from "viem";
import type { WalletSession } from "./account.js";
import type { WalletCall } from "./calls.js";
import type { Receipt, WalletChain } from "./chain.js";

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
