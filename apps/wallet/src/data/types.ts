import type {
  CheckApproval,
  CheckChange,
  CheckFinding,
  Verdict,
} from "@baret/web-ui/lib/check-types";
import type { GuardPolicy, GuardPolicyField } from "../../../../packages/guard/src/policy.js";

/**
 * The shapes the wallet's screens read. Today every one is filled from
 * sample.ts; the store (store.tsx) is the one seam a live account, Monad RPC
 * and the Baret server will fill later.
 */

export type { GuardPolicy, GuardPolicyField };

/** A verdict as the wallet logs it: Baret's four answers. */
export type LoggedVerdict = Verdict | "unreachable";

export interface Asset {
  readonly symbol: string;
  /** Whole units, as a decimal string, so no float drift. */
  readonly balance: string;
  readonly decimals: number;
  /** The token contract; null for MON. */
  readonly contract: string | null;
}

/** One row of the activity log. `values` fill the row's sentence (content history.rows). */
export interface ActivityItem {
  readonly id: string;
  readonly kind:
    | "sent"
    | "received"
    | "allowance"
    | "revoke"
    | "payment"
    | "blocked"
    | "declined"
    | "expired"
    | "overridden"
    | "unchecked"
    | "drift"
    | "connect"
    | "disconnect";
  /** ISO time. */
  readonly at: string;
  readonly values: Readonly<Record<string, string>>;
  /** The verdict at the time, when a check ran or was due. */
  readonly verdict: LoggedVerdict | null;
  readonly findings: readonly CheckFinding[];
  readonly changes: readonly CheckChange[];
  /** The rule that blocked it, or the one an override went past. */
  readonly rule?: GuardPolicyField;
  readonly hash?: string;
  readonly block?: string;
  /** In MON. */
  readonly fee?: string;
}

/** Something that can spend from the account without asking again. */
export interface Permission {
  readonly id: string;
  readonly kind: "allowance" | "unlimited" | "operator" | "agent" | "site";
  readonly values: Readonly<Record<string, string>>;
}

export interface Alert {
  readonly id: string;
  readonly kind: "capNearly" | "unlimitedOpen" | "agentRevoked" | "drift";
  readonly values: Readonly<Record<string, string>>;
}

/** One merchant in the PaymentGuard vault, amounts in the vault's asset. */
export interface Merchant {
  readonly address: string;
  /** The site the merchant takes payments for, as the agent knows it. */
  readonly origin: string;
  readonly perPayment: string;
  /** Null: no hourly limit (the contract's 0). */
  readonly perHour: string | null;
  readonly perDay: string;
  /** Spent in the rolling 24 hours. */
  readonly spent: string;
  readonly status: "active" | "paused" | "removed";
}

export interface AgentKey {
  readonly address: string;
  /** ISO date. */
  readonly created: string;
  readonly payments: number;
}

export interface Vault {
  readonly address: string;
  readonly asset: string;
  readonly balance: string;
  readonly merchants: readonly Merchant[];
  /** Null until the key is created, and again after a revoke. */
  readonly agent: AgentKey | null;
}

export interface AgentPayment {
  readonly id: string;
  readonly at: string;
  readonly merchant: string;
  readonly amount: string;
}

/** A sign request a site sent, with Baret's answer (or none: unreachable). */
export interface SignRequest {
  readonly id: "safe" | "caution" | "blocked" | "unreachable";
  readonly origin: string;
  /** A key of content sign.actions, and the values for its sentence. */
  readonly action: "transfer" | "contractCall" | "approvalUnlimited" | "payment";
  readonly values: Readonly<Record<string, string>>;
  /** What the site says about the request, shown and never trusted. */
  readonly claim: string;
  readonly verdict: LoggedVerdict;
  /** The impact sentence's key (content sign.impact). */
  readonly impact: "transfer" | "approvalUnlimited" | "payment" | "unknown";
  readonly findings: readonly CheckFinding[];
  readonly changes: readonly CheckChange[];
  readonly approvals: readonly CheckApproval[];
  /** In MON. */
  readonly fee: string;
  /** The rules that fired, with the limit and the observed value. */
  readonly rules: readonly {
    readonly rule: GuardPolicyField;
    readonly limit?: string;
    readonly actual?: string;
  }[];
  readonly raw: {
    readonly to: string;
    readonly value: string;
    readonly data: string;
    readonly decoded: string | null;
  };
  /** Seconds until the request declines on its own. */
  readonly expires: number;
}

/** A connection request. */
export interface ConnectRequest {
  readonly id: "firstTime" | "insecure";
  readonly origin: string;
  readonly secure: boolean;
}
