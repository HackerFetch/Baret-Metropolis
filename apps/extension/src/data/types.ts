import type {
  Asset,
  ConnectRequest,
  GuardPolicy,
  GuardPolicyField,
  LoggedVerdict,
  SignRequest,
} from "@baret/wallet-ui/data/types";
import type { CheckChange, CheckFinding } from "@baret/web-ui/lib/check-types";

/**
 * The shapes the extension's screens read: the popup and the options page.
 * Today every one is filled from sample.ts; the store (store.tsx) is the one
 * seam the background, the keystore and the Baret server will fill later.
 * The wallet's own shapes (assets, rules, a sign request) come from
 * @baret/wallet-ui, so a request reads the same on both surfaces.
 */

export type { Asset, ConnectRequest, GuardPolicy, GuardPolicyField, LoggedVerdict, SignRequest };

/** The Monad network a request is for: testnet (10143) or mainnet (143). */
export type Network = "testnet" | "mainnet";

/** A rule that fired on a request, with its limit and the observed value. */
export type FiredRule = SignRequest["rules"][number];

/** One account. Every account comes from the same recovery phrase. */
export interface Account {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  /** MON, as a decimal string. */
  readonly balance: string;
}

/** What happened, as the activity rows name it (content popupActivity.rows). */
export type ActivityKind =
  | "sent"
  | "received"
  | "payment"
  | "message"
  | "typedData"
  | "allowance"
  | "revoke"
  | "connect"
  | "alert";

/** What became of it (content popupActivity.status). */
export type ActivityStatus =
  | "pending"
  | "confirmed"
  | "failed"
  | "blocked"
  | "declined"
  | "expired"
  | "overridden"
  | "unchecked";

/** One row of the log. Every verdict lands here, the declined ones too. */
export interface Activity {
  readonly id: string;
  readonly kind: ActivityKind;
  readonly status: ActivityStatus;
  /** ISO time. */
  readonly at: string;
  /** The account it belongs to. */
  readonly account: string;
  /** The site that asked; null for the account's own transfer or an incoming one. */
  readonly origin: string | null;
  /** The other side: a recipient, a sender, a merchant or a spender. */
  readonly counterparty: string | null;
  /** The row's sentence values: amount, asset. */
  readonly values: Readonly<Record<string, string>>;
  /** The verdict at the time; null where no check ran (an incoming transfer). */
  readonly verdict: LoggedVerdict | null;
  readonly findings: readonly CheckFinding[];
  readonly changes: readonly CheckChange[];
  /** The rule that blocked it, or the one an override went past. */
  readonly rule?: GuardPolicyField;
  /** In MON. */
  readonly fee?: string;
  readonly hash?: string;
}

/** Caps on an agent's or a site's payments, in its asset. */
export interface Caps {
  readonly perPayment: string;
  /** Null: no hourly cap. */
  readonly hour: string | null;
  readonly day: string;
}

interface PermissionBase {
  readonly id: string;
  /** The site it was granted on. */
  readonly origin: string;
  readonly account: string;
  readonly status: "active" | "paused";
  /** ISO dates. */
  readonly granted: string;
  readonly lastUsed: string | null;
  /** The address that can spend under it. */
  readonly holder: string;
  /** Its uses, newest first. */
  readonly uses: readonly { readonly at: string; readonly amount: string }[];
}

/** A token allowance: a contract that can spend one of your tokens. */
export interface AllowancePermission extends PermissionBase {
  readonly kind: "allowance";
  readonly spender: string;
  readonly asset: string;
  /** Null: no limit, the whole balance now and later. */
  readonly amount: string | null;
}

/** Collection access: an operator that can move every item in a collection. */
export interface OperatorPermission extends PermissionBase {
  readonly kind: "operator";
  readonly operator: string;
  /** The collection, by name. */
  readonly contract: string;
}

/** Agent payments over x402, inside caps. */
export interface PaymentPermission extends PermissionBase {
  readonly kind: "payment";
  readonly merchant: string;
  readonly asset: string;
  readonly caps: Caps;
  /** Spent this hour and today. */
  readonly spent: { readonly hour: string; readonly day: string };
  readonly paymentsToday: number;
  readonly facilitator: string;
  /** Spent per day over the last seven days, oldest first. */
  readonly week: readonly number[];
}

export type Permission = AllowancePermission | OperatorPermission | PaymentPermission;

/** A post-sign notice (content alerts.types). */
export type AlertKind =
  | "drift"
  | "newAllowance"
  | "watched"
  | "capReached"
  | "capNear"
  | "revoked"
  | "unsettled"
  | "unchecked";

export interface Alert {
  readonly id: string;
  readonly kind: AlertKind;
  readonly at: string;
  readonly read: boolean;
  readonly values: Readonly<Record<string, string>>;
}

export type SiteStatus = "connected" | "paused" | "blocked" | "notConnected";

/** Every site that ever asked to connect, allowed or not. */
export interface Site {
  readonly origin: string;
  readonly status: SiteStatus;
  readonly firstSeen: string;
  readonly connected: string | null;
  readonly lastUsed: string | null;
  /** The account it sees; null when it is not connected. */
  readonly account: string | null;
  readonly requests: number;
}

/** A service that verifies and settles x402 payments for a merchant. */
export interface Facilitator {
  readonly id: string;
  readonly name: string;
  readonly payments: number;
  /** In USDC. */
  readonly volume: string;
  /** Paid through before. */
  readonly known: boolean;
}

/** One x402 payment and how far it got. */
export interface Payment {
  readonly id: string;
  readonly at: string;
  readonly merchant: string;
  readonly amount: string;
  readonly asset: string;
  readonly facilitator: string;
  readonly stage: "checked" | "verified" | "settled";
  readonly hash: string | null;
}

/** A payment Baret declined, or one that never settled (content x402.problems.types). */
export interface Problem {
  readonly id: string;
  readonly kind: "declined" | "overCap" | "mismatch" | "asset" | "unsettled";
  readonly at: string;
  readonly merchant: string;
  readonly values: Readonly<Record<string, string>>;
}

/** An address Baret watches for funds that move without a signature. */
export interface Watched {
  readonly address: string;
  readonly name: string;
  readonly lastMovement: string | null;
  /** Movements nobody signed. */
  readonly unsigned: number;
}

export interface Settings {
  /** Minutes without activity before the wallet locks. */
  readonly lockMinutes: number;
  readonly notify: {
    readonly drift: boolean;
    readonly capNear: boolean;
    readonly capReached: boolean;
    readonly unsettled: boolean;
  };
  readonly rawData: boolean;
  /** Minutes a sign request stays open. */
  readonly timeoutMinutes: number;
  readonly debugLog: boolean;
  /** Pay within caps without asking. */
  readonly autoPay: boolean;
  readonly backedUp: boolean;
}

/** A personal_sign request: a message, nothing to simulate. */
export interface MessageRequest {
  readonly kind: "message";
  readonly id: string;
  readonly origin: string;
  readonly network: Network;
  /** Exactly as the site sent it. */
  readonly text: string;
  readonly readable: boolean;
  readonly expires: number;
}

/** An eth_signTypedData_v4 request, decoded field by field. */
export interface TypedDataRequest {
  readonly kind: "typedData";
  readonly id: string;
  readonly origin: string;
  readonly network: Network;
  /**
   * Baret's verdict on the signature, from /v1/analyze like a transaction.
   * "unreachable" when the check did not answer: it counts as Blocked.
   */
  readonly verdict: LoggedVerdict;
  readonly findings: readonly CheckFinding[];
  /** The rules that fired, with the limit and the observed value. */
  readonly rules: readonly FiredRule[];
  readonly fields: readonly { readonly name: string; readonly value: string }[];
  /** The allowance a permit hides inside the fields, when there is one. */
  readonly permit: {
    readonly spender: string;
    readonly asset: string;
    /** Null: no limit. */
    readonly amount: string | null;
    readonly deadline: string;
  } | null;
  readonly expires: number;
}

/** A site asked for payment over HTTP 402. */
export interface PaymentRequest {
  readonly kind: "payment";
  readonly id: string;
  readonly origin: string;
  readonly network: Network;
  readonly merchant: string;
  readonly amount: string;
  readonly asset: string;
  readonly facilitator: string;
  /**
   * first: the first payment to this site, which sets its caps.
   * auto: inside every cap, paid without this window.
   * overCap: past one of the caps.
   * notChecked: Baret could not check it, so it stopped it.
   */
  readonly state: "first" | "auto" | "overCap" | "notChecked";
  /** Which cap an over-cap payment hits. */
  readonly capHit?: "perPayment" | "hour" | "day";
  readonly caps?: Caps;
  readonly spentToday?: string;
  readonly expires: number;
}

/** A transaction: the wallet's sign request, with what the extension adds. */
export interface TransactionRequest {
  readonly kind: "transaction";
  readonly id: string;
  readonly network: Network;
  readonly request: SignRequest;
  /** The site has not sent a sign request before. */
  readonly firstTime: boolean;
}

export type PopupRequest = TransactionRequest | MessageRequest | TypedDataRequest | PaymentRequest;
