import { createContext, type JSX, type ReactNode, use, useReducer } from "react";
import type { PolicyTemplateName } from "../../../../packages/guard/src/policy-templates.js";
import { fromUnits, toUnits } from "./format.js";
import { diffFields } from "./rules.js";
import {
  ACCOUNT,
  ACTIVITY,
  AGENT_PAYMENTS,
  ALERTS,
  ASSETS,
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

export interface WalletState {
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
  | { type: "reset" };

export function initialState(name: string): WalletState {
  return {
    address: ACCOUNT.address,
    accountName: name,
    assets: ASSETS,
    activity: ACTIVITY,
    permissions: PERMISSIONS,
    alerts: ALERTS,
    policy: POLICY,
    template: "balanced",
    ruleChanges: [],
    vault: VAULT,
    agentPayments: AGENT_PAYMENTS,
    settings: { lockAfterInactivity: true, passkeyEverySignature: false },
    locked: false,
  };
}

function vaultAmount(vault: Vault, text: string, sign: 1n | -1n): Vault {
  const decimals = 6;
  const balance = toUnits(vault.balance, decimals) ?? 0n;
  const change = toUnits(text, decimals) ?? 0n;
  return { ...vault, balance: fromUnits(balance + sign * change, decimals, { max: 2 }) };
}

export function reduce(
  state: WalletState,
  action: WalletAction,
  initial = initialState,
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
      return { ...state, vault: vaultAmount(state.vault, action.amount, 1n) };
    case "withdraw":
      return { ...state, vault: vaultAmount(state.vault, action.amount, -1n) };
    case "merchant": {
      const others = state.vault.merchants.filter((m) => m.address !== action.merchant.address);
      return { ...state, vault: { ...state.vault, merchants: [...others, action.merchant] } };
    }
    case "merchantStatus":
      return {
        ...state,
        vault: {
          ...state.vault,
          merchants: state.vault.merchants.map((m) =>
            m.address === action.address ? { ...m, status: action.status } : m,
          ),
        },
      };
    case "createAgent":
      return {
        ...state,
        vault: {
          ...state.vault,
          agent: { address: action.address, created: action.created, payments: 0 },
        },
        alerts: state.alerts.filter((alert) => alert.kind !== "agentRevoked"),
      };
    case "revokeAgent":
      return {
        ...state,
        vault: { ...state.vault, agent: null },
        alerts: [
          { id: `agent-revoked-${action.at}`, kind: "agentRevoked", values: {} },
          ...state.alerts,
        ],
      };
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
  const [state, dispatch] = useReducer(
    (current: WalletState, action: WalletAction) => reduce(current, action),
    name,
    initialState,
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
