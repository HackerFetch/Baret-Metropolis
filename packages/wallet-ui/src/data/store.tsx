import { createContext, type JSX, type ReactNode, use, useReducer } from "react";
import type { PolicyTemplateName } from "../../../guard/src/policy-templates.js";
import { fromUnits, toUnits } from "./format.js";
import { diffFields } from "./rules.js";
import {
  ACCOUNT,
  ACTIVITY,
  AGENT_PAYMENTS,
  ALERTS,
  ASSETS,
  DRIFT_ALERT,
  EMPTY_VAULT,
  PERMISSIONS,
  POLICY,
  VAULT,
} from "./sample.js";
import type {
  ActivityItem,
  AgentPayment,
  Alert,
  Asset,
  GuardPolicy,
  GuardPolicyField,
  Merchant,
  Permission,
  Vault,
} from "./types.js";

/**
 * The wallet's state, shared by every screen: the one seam between the
 * screens and where their data comes from. Today it starts from sample.ts
 * and lives in memory: a reload starts over, and nothing is sent anywhere
 * (the frame says so on every screen). A live account, Monad RPC and the
 * Baret server replace `initial` and the actions' bodies, not the screens.
 */

export interface RuleChange {
  readonly field: GuardPolicyField;
  /** The raw values; the rules page writes them out in words. */
  readonly previous: GuardPolicy[GuardPolicyField];
  readonly value: GuardPolicy[GuardPolicyField];
  readonly at: string;
}

/** Where a part of the state stands. Only "ok" means it can be trusted. */
export type LoadStatus = "ok" | "loading" | "error";

export interface WalletStatus {
  /** The Baret server: without it nothing is checked, so nothing is signed. */
  readonly analyzer: LoadStatus;
  /** The account's balances, read from Monad RPC. */
  readonly balances: LoadStatus;
  /** The account's activity, read from the indexer. */
  readonly activity: LoadStatus;
}

/**
 * Which sample the wallet starts from, read once from `?sample=`:
 * - default: a few days of history, everything reachable.
 * - empty: a new account with no assets, activity or permissions.
 * - offline: Baret unreachable, balances and activity failed to load.
 * - drift: the default account plus a drift alert.
 * - passkey-error, fund-timeout: the default account; onboarding reads
 *   them to fail its passkey or its funding step.
 */
export const SAMPLES = [
  "default",
  "empty",
  "offline",
  "drift",
  "passkey-error",
  "fund-timeout",
] as const;
export type Sample = (typeof SAMPLES)[number];

/** The sample a query string names; anything unknown is the default one. */
export function readSample(search: string): Sample {
  const name = new URLSearchParams(search).get("sample");
  return (SAMPLES as readonly string[]).includes(name ?? "") ? (name as Sample) : "default";
}

export interface WalletState {
  readonly sample: Sample;
  /** Fail-closed: a part not "ok" is shown as failed or loading, never as data. */
  readonly status: WalletStatus;
  readonly address: string;
  readonly accountName: string;
  readonly assets: readonly Asset[];
  readonly activity: readonly ActivityItem[];
  readonly permissions: readonly Permission[];
  readonly alerts: readonly Alert[];
  readonly policy: GuardPolicy;
  /** The template the rules started from; the label reads Custom once they differ. */
  readonly template: PolicyTemplateName;
  readonly ruleChanges: readonly RuleChange[];
  readonly vault: Vault;
  readonly agentPayments: readonly AgentPayment[];
  readonly settings: {
    readonly lockAfterInactivity: boolean;
    readonly passkeyEverySignature: boolean;
  };
  /**
   * Whether the wallet is locked. Sample only: it lives in memory, so it
   * covers the tab it was set in, and a request window opened as a new
   * document starts unlocked. The live keystore will hold it instead.
   */
  readonly locked: boolean;
}

export type WalletAction =
  | { type: "rename"; name: string }
  | { type: "lock" }
  | { type: "unlock" }
  | { type: "setting"; key: keyof WalletState["settings"]; value: boolean }
  | { type: "log"; item: ActivityItem }
  | { type: "send"; asset: string; amount: string; fee: string; item: ActivityItem }
  | { type: "revoke"; id: string; item: ActivityItem }
  | { type: "connect"; origin: string; item: ActivityItem }
  | { type: "saveRules"; policy: GuardPolicy; template: PolicyTemplateName; at: string }
  | { type: "deposit"; amount: string }
  | { type: "withdraw"; amount: string }
  | { type: "merchant"; merchant: Merchant }
  | { type: "merchantStatus"; address: string; status: Merchant["status"] }
  | { type: "createAgent"; address: string; created: string }
  | { type: "revokeAgent"; at: string }
  | { type: "status"; key: keyof WalletStatus; value: LoadStatus }
  | { type: "reset" };

const ALL_OK: WalletStatus = { analyzer: "ok", balances: "ok", activity: "ok" };

/** True only when that part loaded: loading and error both read as not ready. */
export function ready(state: WalletState, key: keyof WalletStatus): boolean {
  return state.status[key] === "ok";
}

/** The merchants the agent can pay today: those neither paused nor removed. */
export function activeMerchants(vault: Vault): number {
  return vault.merchants.filter((m) => m.status === "active").length;
}

/**
 * Keep the agent's permission row in step with the vault: it names how many
 * merchants the agent can pay, and it goes when the agent key is revoked.
 */
function withAgentRow(permissions: readonly Permission[], vault: Vault): readonly Permission[] {
  const row = permissions.find((p) => p.kind === "agent");
  if (!vault.agent) return row ? permissions.filter((p) => p !== row) : permissions;
  const values = { count: String(activeMerchants(vault)) };
  if (!row) return [...permissions, { id: "agent", kind: "agent", values }];
  return permissions.map((p) => (p === row ? { ...p, values } : p));
}

/**
 * Whether the account holds enough of the vault's asset for a deposit.
 * Fail-closed: an unreadable balance or amount refuses it.
 */
export function canDeposit(state: WalletState, amount: string): boolean {
  if (!ready(state, "balances")) return false;
  const asset = state.assets.find((a) => a.symbol === state.vault.asset);
  if (!asset) return false;
  const held = toUnits(asset.balance, asset.decimals);
  const wanted = toUnits(amount, asset.decimals);
  return held !== null && wanted !== null && wanted > 0n && wanted <= held;
}

/** The vault's asset has 6 decimals (USDC); its balance is kept to 2 places. */
const VAULT_DECIMALS = 6;

/**
 * Whether the vault holds enough for a withdrawal back to the account.
 * Fail-closed like canDeposit: unreadable balances, a missing account row
 * for the asset (the amount would land nowhere) or an unreadable amount
 * refuse it.
 */
export function canWithdraw(state: WalletState, amount: string): boolean {
  if (!ready(state, "balances")) return false;
  if (!state.assets.some((a) => a.symbol === state.vault.asset)) return false;
  const held = toUnits(state.vault.balance, VAULT_DECIMALS);
  const wanted = toUnits(amount, VAULT_DECIMALS);
  return held !== null && wanted !== null && wanted > 0n && wanted <= held;
}

/** Move an amount of the vault's asset in (sign -1) or out (sign 1) of the account. */
function accountAmount(state: WalletState, text: string, sign: 1n | -1n): readonly Asset[] {
  return state.assets.map((asset) => {
    if (asset.symbol !== state.vault.asset) return asset;
    const balance = toUnits(asset.balance, asset.decimals) ?? 0n;
    const change = toUnits(text, asset.decimals) ?? 0n;
    return { ...asset, balance: fromUnits(balance + sign * change, asset.decimals) };
  });
}

export function initialState(name: string, sample: Sample = "default"): WalletState {
  const base: WalletState = {
    sample,
    status: ALL_OK,
    address: ACCOUNT.address,
    accountName: name,
    assets: ASSETS,
    activity: ACTIVITY,
    permissions: withAgentRow(PERMISSIONS, VAULT),
    alerts: ALERTS,
    policy: POLICY,
    template: "balanced",
    ruleChanges: [],
    vault: VAULT,
    agentPayments: AGENT_PAYMENTS,
    settings: { lockAfterInactivity: true, passkeyEverySignature: false },
    locked: false,
  };
  switch (sample) {
    case "empty":
      return {
        ...base,
        assets: [],
        activity: [],
        permissions: [],
        alerts: [],
        vault: EMPTY_VAULT,
        agentPayments: [],
      };
    case "offline":
      // Nothing that failed to load is shown: no balances, no activity, and
      // none of the on-chain views read over the same RPC (the vault, the
      // permissions and the alerts about them).
      return {
        ...base,
        status: { analyzer: "error", balances: "error", activity: "error" },
        assets: [],
        activity: [],
        permissions: [],
        alerts: [],
        vault: EMPTY_VAULT,
        agentPayments: [],
      };
    case "drift":
      return { ...base, alerts: [DRIFT_ALERT, ...base.alerts] };
    default:
      return base;
  }
}

function vaultAmount(vault: Vault, text: string, sign: 1n | -1n): Vault {
  const balance = toUnits(vault.balance, VAULT_DECIMALS) ?? 0n;
  const change = toUnits(text, VAULT_DECIMALS) ?? 0n;
  return { ...vault, balance: fromUnits(balance + sign * change, VAULT_DECIMALS, { max: 2 }) };
}

export function reduce(
  state: WalletState,
  action: WalletAction,
  initial: (name: string) => WalletState = (name) => initialState(name, state.sample),
): WalletState {
  switch (action.type) {
    case "rename":
      return { ...state, accountName: action.name };
    case "lock":
      return { ...state, locked: true };
    case "unlock":
      return { ...state, locked: false };
    case "setting":
      return { ...state, settings: { ...state.settings, [action.key]: action.value } };
    case "log":
      return { ...state, activity: [action.item, ...state.activity] };
    case "send": {
      const assets = state.assets.map((asset) => {
        const balance = toUnits(asset.balance, asset.decimals) ?? 0n;
        let spend =
          asset.symbol === action.asset ? (toUnits(action.amount, asset.decimals) ?? 0n) : 0n;
        if (asset.symbol === "MON") spend += toUnits(action.fee, asset.decimals) ?? 0n;
        return spend === 0n
          ? asset
          : { ...asset, balance: fromUnits(balance - spend, asset.decimals) };
      });
      return { ...state, assets, activity: [action.item, ...state.activity] };
    }
    case "revoke":
      return {
        ...state,
        permissions: state.permissions.filter((p) => p.id !== action.id),
        alerts: state.alerts.filter(
          (alert) =>
            !(
              alert.kind === "unlimitedOpen" &&
              state.permissions.some(
                (p) => p.id === action.id && p.values.spender === alert.values.spender,
              )
            ),
        ),
        activity: [action.item, ...state.activity],
      };
    case "connect": {
      const site = {
        id: `site-${action.origin}`,
        kind: "site" as const,
        values: { origin: action.origin },
      };
      const others = state.permissions.filter((p) => p.id !== site.id);
      return {
        ...state,
        permissions: [...others, site],
        activity: [action.item, ...state.activity],
      };
    }
    case "saveRules": {
      const changes = diffFields(state.policy, action.policy).map((field) => ({
        field,
        previous: state.policy[field],
        value: action.policy[field],
        at: action.at,
      }));
      return {
        ...state,
        policy: action.policy,
        template: action.template,
        ruleChanges: [...changes, ...state.ruleChanges],
      };
    }
    case "deposit":
      // Refused above what the account holds; the page says why.
      if (!canDeposit(state, action.amount)) return state;
      return {
        ...state,
        assets: accountAmount(state, action.amount, -1n),
        vault: vaultAmount(state.vault, action.amount, 1n),
      };
    case "withdraw":
      // Refused above what the vault holds, or with balances unread.
      if (!canWithdraw(state, action.amount)) return state;
      return {
        ...state,
        assets: accountAmount(state, action.amount, 1n),
        vault: vaultAmount(state.vault, action.amount, -1n),
      };
    case "merchant": {
      const others = state.vault.merchants.filter((m) => m.address !== action.merchant.address);
      const vault = { ...state.vault, merchants: [...others, action.merchant] };
      return { ...state, vault, permissions: withAgentRow(state.permissions, vault) };
    }
    case "merchantStatus": {
      const vault = {
        ...state.vault,
        merchants: state.vault.merchants.map((m) =>
          m.address === action.address ? { ...m, status: action.status } : m,
        ),
      };
      return { ...state, vault, permissions: withAgentRow(state.permissions, vault) };
    }
    case "createAgent": {
      const vault = {
        ...state.vault,
        agent: { address: action.address, created: action.created, payments: 0 },
      };
      return {
        ...state,
        vault,
        permissions: withAgentRow(state.permissions, vault),
        alerts: state.alerts.filter((alert) => alert.kind !== "agentRevoked"),
      };
    }
    case "revokeAgent":
      return {
        ...state,
        vault: { ...state.vault, agent: null },
        permissions: withAgentRow(state.permissions, { ...state.vault, agent: null }),
        alerts: [
          { id: `agent-revoked-${action.at}`, kind: "agentRevoked", values: {} },
          ...state.alerts,
        ],
      };
    case "status":
      return { ...state, status: { ...state.status, [action.key]: action.value } };
    case "reset":
      return initial(state.accountName);
  }
}

interface Store {
  readonly state: WalletState;
  readonly dispatch: (action: WalletAction) => void;
}

const WalletContext = createContext<Store | null>(null);

export function WalletProvider({
  name,
  children,
}: {
  /** The account's starting name, from the content's sample data. */
  name: string;
  children: ReactNode;
}): JSX.Element {
  // The sample is read once, on the first render; the wallet is not prerendered.
  const [state, dispatch] = useReducer(
    (current: WalletState, action: WalletAction) => reduce(current, action),
    name,
    (start: string) =>
      initialState(start, readSample(typeof window === "undefined" ? "" : window.location.search)),
  );
  return <WalletContext value={{ state, dispatch }}>{children}</WalletContext>;
}

export function useWallet(): Store {
  const store = use(WalletContext);
  if (!store) throw new Error("useWallet needs a WalletProvider above it");
  return store;
}

/** The sum of the daily caps of every merchant not removed: what a withdrawal can't take. */
export function reserved(vault: Vault): string {
  const total = vault.merchants
    .filter((m) => m.status !== "removed")
    .reduce((sum, m) => sum + (toUnits(m.perDay, 6) ?? 0n), 0n);
  return fromUnits(total, 6, { max: 2 });
}

/** What the owner can withdraw: the balance less the reserve, never below zero. */
export function free(vault: Vault): string {
  const balance = toUnits(vault.balance, 6) ?? 0n;
  const reserve = toUnits(reserved(vault), 6) ?? 0n;
  return fromUnits(balance > reserve ? balance - reserve : 0n, 6, { max: 2 });
}
