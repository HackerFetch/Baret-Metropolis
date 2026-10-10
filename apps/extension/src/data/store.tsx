import { fromUnits, toUnits } from "@baret/wallet-ui/data/format";
import { diffFields, type TEMPLATE_NAMES } from "@baret/wallet-ui/data/rules";
import {
  createContext,
  type JSX,
  type ReactNode,
  use,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { useLatest } from "../lib/useLatest.js";
import {
  ACCOUNTS,
  ACTIVITY,
  ALERTS,
  ASSETS,
  DRIFT_ALERT,
  FACILITATORS,
  PAYMENTS,
  PERMISSIONS,
  POLICY,
  PROBLEMS,
  SETTINGS,
  SITES,
  UNSETTLED_PAYMENT,
  WATCHED,
} from "./sample.js";
import type {
  Account,
  Activity,
  Alert,
  Asset,
  Facilitator,
  GuardPolicy,
  GuardPolicyField,
  Network,
  Payment,
  PaymentPermission,
  Permission,
  Problem,
  Settings,
  Site,
  SiteStatus,
  Watched,
} from "./types.js";

/**
 * The extension's state, shared by every screen of the popup and of the
 * options page: the one seam between the screens and where their data comes
 * from. Today it starts from sample.ts and lives in memory, one copy per
 * page: a reload starts over, and nothing is sent anywhere (the frame says so
 * on every screen). The background, the keystore and the Baret server replace
 * `initialState` and the actions' bodies, not the screens.
 */

export type TemplateName = (typeof TEMPLATE_NAMES)[number];

/**
 * Which sample the page starts from: a few days of history, or a new wallet.
 * "live" is no sample: a real wallet, read from the extension's own storage.
 */
export type Scenario = "full" | "empty" | "live";

export interface RuleChange {
  readonly field: GuardPolicyField;
  readonly previous: GuardPolicy[GuardPolicyField];
  readonly value: GuardPolicy[GuardPolicyField];
  readonly at: string;
}

export interface ExtState {
  readonly scenario: Scenario;
  readonly accounts: readonly Account[];
  /** The id of the account in use. */
  readonly active: string;
  readonly assets: readonly Asset[];
  readonly activity: readonly Activity[];
  readonly permissions: readonly Permission[];
  readonly alerts: readonly Alert[];
  readonly sites: readonly Site[];
  readonly facilitators: readonly Facilitator[];
  readonly payments: readonly Payment[];
  readonly problems: readonly Problem[];
  readonly watched: readonly Watched[];
  readonly policy: GuardPolicy;
  /** The template the rules started from; the label reads Custom once they differ. */
  readonly template: TemplateName;
  readonly ruleChanges: readonly RuleChange[];
  readonly settings: Settings;
  /**
   * Whether the Baret server answers. Null until the first check answers (and
   * while a check runs): unknown counts as unreachable, and while Baret is
   * unreachable every request counts as Blocked.
   */
  readonly reachable: boolean | null;
  readonly lastCheck: string | null;
  /** The Monad network the wallet is on. */
  readonly network: Network;
  /** Wrong passphrases in a row, and the pause they earned. Held by the keystore later. */
  readonly lock: LockState;
}

export interface LockState {
  readonly failures: number;
  /** ISO time the pause ends; null when there is none. */
  readonly pausedUntil: string | null;
}

/** What an unlock attempt came back with. */
export type UnlockResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly pausedUntil: string | null };

/** Every fifth wrong passphrase in a row pauses the field for thirty seconds. */
export const PAUSE_AFTER = 5;
export const PAUSE_MS = 30_000;

/** The lock after one more wrong passphrase at `at`. Pure, tested in data.test.ts. */
export function failUnlock(lock: LockState, at: string): LockState {
  const failures = lock.failures + 1;
  return {
    failures,
    pausedUntil:
      failures % PAUSE_AFTER === 0
        ? new Date(Date.parse(at) + PAUSE_MS).toISOString()
        : lock.pausedUntil,
  };
}

export type ExtAction =
  | { type: "account"; id: string }
  | { type: "addAccount"; account: Account }
  | { type: "renameAccount"; id: string; name: string }
  | { type: "log"; item: Activity }
  | { type: "send"; asset: string; amount: string; fee: string; item: Activity }
  | { type: "permissionStatus"; id: string; status: "active" | "paused" }
  | { type: "revoke"; ids: readonly string[]; at: string }
  | { type: "caps"; permission: PaymentPermission }
  | { type: "limit"; id: string; amount: string }
  | { type: "readAlerts" }
  | { type: "dismissAlert"; id: string }
  | { type: "site"; origin: string; status: SiteStatus; at: string }
  | { type: "forgetSite"; origin: string }
  | { type: "connect"; origin: string; account: string; at: string }
  | { type: "saveRules"; policy: GuardPolicy; template: TemplateName; at: string }
  | { type: "settings"; patch: Partial<Settings> }
  | { type: "clearActivity" }
  | { type: "dismissProblem"; id: string }
  | { type: "reachable"; value: boolean; at: string }
  | { type: "check" }
  | { type: "unlockFailed"; at: string }
  | { type: "unlocked" }
  | { type: "reset" }
  /** Live only: the state another page of the extension saved, or what the chain says. */
  | { type: "patch"; patch: Partial<ExtState> };

export interface StartOptions {
  readonly scenario: Scenario;
  /** The popup's "with an alert" preview: funds left without a signature. */
  readonly drift?: boolean;
  /**
   * The sample server's answer to a reachability check: true (the default),
   * false for the offline preview, null for one that never answers (loading).
   */
  readonly reachable?: boolean | null;
}

export function initialState({ scenario, drift = false }: StartOptions): ExtState {
  const base = {
    scenario,
    policy: POLICY,
    template: "balanced" as const,
    ruleChanges: [],
    // Unknown until the source answers: fail-closed.
    reachable: null,
    network: "testnet" as const,
    lock: { failures: 0, pausedUntil: null },
  };
  if (scenario === "empty") {
    const [first] = ACCOUNTS;
    return {
      ...base,
      accounts: first ? [{ ...first, balance: "0" }] : [],
      active: first?.id ?? "main",
      assets: [],
      activity: [],
      permissions: [],
      alerts: [],
      sites: [],
      facilitators: [],
      payments: [],
      problems: [],
      watched: WATCHED.slice(0, 1).map((w) => ({ ...w, lastMovement: null })),
      settings: { ...SETTINGS, backedUp: false },
      lastCheck: null,
    };
  }
  return {
    ...base,
    accounts: ACCOUNTS,
    active: "main",
    assets: ASSETS,
    activity: ACTIVITY,
    permissions: PERMISSIONS,
    alerts: drift ? [DRIFT_ALERT, ...ALERTS] : ALERTS,
    sites: SITES,
    facilitators: FACILITATORS,
    payments: [...PAYMENTS, UNSETTLED_PAYMENT],
    problems: PROBLEMS,
    watched: drift
      ? WATCHED.map((w, i) => (i === 0 ? { ...w, unsigned: 1, lastMovement: DRIFT_ALERT.at } : w))
      : WATCHED,
    settings: SETTINGS,
    lastCheck: "2026-10-03T13:42:00Z",
  };
}

function moveBalances(assets: readonly Asset[], asset: string, amount: string, fee: string) {
  return assets.map((a) => {
    const balance = toUnits(a.balance, a.decimals) ?? 0n;
    let spend = a.symbol === asset ? (toUnits(amount, a.decimals) ?? 0n) : 0n;
    if (a.symbol === "MON") spend += toUnits(fee, a.decimals) ?? 0n;
    return spend === 0n ? a : { ...a, balance: fromUnits(balance - spend, a.decimals) };
  });
}

/** The origin a permission belongs to, for the alerts that name it. */
function originOf(permission: Permission): string {
  return permission.origin;
}

export function reduce(state: ExtState, action: ExtAction): ExtState {
  switch (action.type) {
    case "account":
      return state.accounts.some((a) => a.id === action.id)
        ? { ...state, active: action.id }
        : state;
    case "addAccount":
      return { ...state, accounts: [...state.accounts, action.account], active: action.account.id };
    case "renameAccount":
      return {
        ...state,
        accounts: state.accounts.map((a) => (a.id === action.id ? { ...a, name: action.name } : a)),
      };
    case "log":
      return { ...state, activity: [action.item, ...state.activity] };
    case "send": {
      const assets = moveBalances(state.assets, action.asset, action.amount, action.fee);
      const mon = assets.find((a) => a.symbol === "MON");
      return {
        ...state,
        assets,
        accounts: state.accounts.map((a) =>
          a.id === state.active && mon ? { ...a, balance: mon.balance } : a,
        ),
        activity: [action.item, ...state.activity],
      };
    }
    case "permissionStatus":
      return {
        ...state,
        permissions: state.permissions.map((p) =>
          p.id === action.id ? { ...p, status: action.status } : p,
        ),
      };
    case "revoke": {
      const gone = state.permissions.filter((p) => action.ids.includes(p.id));
      if (gone.length === 0) return state;
      const origins = new Set(gone.map(originOf));
      const rows: Activity[] = gone.map((p) => ({
        id: `revoke-${p.id}-${action.at}`,
        kind: "revoke",
        status: "confirmed",
        at: action.at,
        account: p.account,
        origin: p.origin,
        counterparty: p.holder,
        values: { asset: p.kind === "operator" ? p.contract : p.asset },
        verdict: "safe",
        findings: [],
        changes: [],
      }));
      return {
        ...state,
        permissions: state.permissions.filter((p) => !action.ids.includes(p.id)),
        alerts: state.alerts.filter(
          (alert) =>
            !(
              (alert.kind === "capNear" || alert.kind === "capReached") &&
              origins.has(alert.values.origin ?? "")
            ),
        ),
        activity: [...rows, ...state.activity],
      };
    }
    case "caps": {
      const others = state.permissions.filter((p) => p.id !== action.permission.id);
      return { ...state, permissions: [...others, action.permission] };
    }
    case "limit":
      return {
        ...state,
        permissions: state.permissions.map((p) =>
          p.id === action.id && p.kind === "allowance" ? { ...p, amount: action.amount } : p,
        ),
      };
    case "readAlerts":
      return { ...state, alerts: state.alerts.map((a) => ({ ...a, read: true })) };
    case "dismissAlert":
      return { ...state, alerts: state.alerts.filter((a) => a.id !== action.id) };
    case "site":
      return {
        ...state,
        sites: state.sites.map((s) =>
          s.origin === action.origin
            ? {
                ...s,
                status: action.status,
                ...(action.status === "notConnected" || action.status === "blocked"
                  ? { connected: null, account: null }
                  : {}),
              }
            : s,
        ),
      };
    case "forgetSite":
      return {
        ...state,
        sites: state.sites.filter((s) => s.origin !== action.origin),
        activity: state.activity.filter((a) => a.origin !== action.origin),
      };
    case "connect": {
      const known = state.sites.find((s) => s.origin === action.origin);
      const site: Site = known
        ? {
            ...known,
            status: "connected",
            connected: action.at,
            lastUsed: action.at,
            account: action.account,
            requests: known.requests + 1,
          }
        : {
            origin: action.origin,
            status: "connected",
            firstSeen: action.at,
            connected: action.at,
            lastUsed: action.at,
            account: action.account,
            requests: 1,
          };
      return {
        ...state,
        sites: [site, ...state.sites.filter((s) => s.origin !== action.origin)],
        activity: [
          {
            id: `connect-${action.origin}-${action.at}`,
            kind: "connect",
            status: "confirmed",
            at: action.at,
            account: action.account,
            origin: action.origin,
            counterparty: null,
            values: {},
            verdict: null,
            findings: [],
            changes: [],
          },
          ...state.activity,
        ],
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
    case "settings":
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case "clearActivity":
      return { ...state, activity: [] };
    case "dismissProblem":
      return { ...state, problems: state.problems.filter((p) => p.id !== action.id) };
    case "reachable":
      return {
        ...state,
        reachable: action.value,
        lastCheck: action.value ? action.at : state.lastCheck,
      };
    case "check":
      return { ...state, reachable: null };
    case "unlockFailed":
      return { ...state, lock: failUnlock(state.lock, action.at) };
    case "unlocked":
      return { ...state, lock: { failures: 0, pausedUntil: null } };
    case "reset":
      return { ...initialState({ scenario: "empty" }), reachable: state.reachable };
    case "patch":
      return { ...state, ...action.patch };
  }
}

/**
 * The state a sample page starts in: the sample server answers the first
 * check before the first paint. A real source starts from initialState and
 * dispatches "reachable" when it answers.
 */
export function startState(options: StartOptions): ExtState {
  const state = initialState(options);
  const answer = options.reachable === undefined ? true : options.reachable;
  return answer === null ? state : { ...state, reachable: answer };
}

/** The sample keystore: any passphrase of twelve characters or more opens it. */
const SAMPLE_MIN = 12;
/** How long the sample keystore and the sample server take to answer. */
const SAMPLE_WAIT_MS = 600;

interface Store {
  readonly state: ExtState;
  readonly dispatch: (action: ExtAction) => void;
  /** Ask the keystore to open the wallet. Wrong tries and the pause live here, not in a screen. */
  readonly unlock: (passphrase: string) => Promise<UnlockResult>;
  /** Check again whether Baret answers; reachable is unknown until it does. */
  readonly check: () => void;
}

const ExtensionContext = createContext<Store | null>(null);

/**
 * What a live page gives the store in place of the sample (live/source.ts):
 * the state it starts from, where each change is saved, the changes other
 * pages of the extension made, and the real keystore and server.
 */
export interface LiveSource {
  readonly initial: ExtState;
  /** Called after every change; saves what is the wallet's own record. */
  save(state: ExtState): void;
  /** Calls `apply` with what another page saved. Returns the way to stop. */
  subscribe(apply: (patch: Partial<ExtState>) => void): () => void;
  /** Opens the keystore. False on a wrong passphrase. */
  unlock(passphrase: string): Promise<boolean>;
  /** Whether Baret's server answers right now. */
  reach(): Promise<boolean>;
}

export function ExtensionProvider({
  start,
  live,
  children,
}: {
  start: StartOptions;
  /** Present on a live page: the store then holds a real wallet, not the sample. */
  live?: LiveSource;
  children: ReactNode;
}): JSX.Element {
  const [state, dispatch] = useReducer(reduce, start, (options) =>
    live ? live.initial : startState(options),
  );
  const latest = useLatest(state);
  const answer = start.reachable === undefined ? true : start.reachable;
  const timers = useRef(new Set<number>());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const id of pending) window.clearTimeout(id);
    };
  }, []);

  // Live: every change is saved, what another page saved is taken in, and
  // Baret's server is asked once at the start (unknown counts as unreachable).
  useEffect(() => {
    live?.save(state);
  }, [live, state]);
  useEffect(() => {
    if (!live) return;
    void live
      .reach()
      .then((value) => dispatch({ type: "reachable", value, at: new Date().toISOString() }));
    return live.subscribe((patch) => dispatch({ type: "patch", patch }));
  }, [live]);

  const store = useMemo<Store>(() => {
    function later(run: () => void): void {
      const id = window.setTimeout(() => {
        timers.current.delete(id);
        run();
      }, SAMPLE_WAIT_MS);
      timers.current.add(id);
    }
    return {
      state,
      dispatch,
      unlock: (passphrase) =>
        new Promise<UnlockResult>((resolve) => {
          const { lock } = latest.current;
          const at = new Date().toISOString();
          if (lock.pausedUntil && Date.parse(lock.pausedUntil) > Date.parse(at)) {
            resolve({ ok: false, pausedUntil: lock.pausedUntil });
            return;
          }
          const answered = (ok: boolean) => {
            if (ok) {
              dispatch({ type: "unlocked" });
              resolve({ ok: true });
              return;
            }
            const done = new Date().toISOString();
            dispatch({ type: "unlockFailed", at: done });
            const next = failUnlock(latest.current.lock, done);
            resolve({
              ok: false,
              pausedUntil:
                next.pausedUntil && Date.parse(next.pausedUntil) > Date.parse(done)
                  ? next.pausedUntil
                  : null,
            });
          };
          // Live: the keystore decides. A keystore that cannot be asked opens nothing.
          if (live) {
            live.unlock(passphrase).then(answered, () => answered(false));
            return;
          }
          later(() => answered(passphrase.length >= SAMPLE_MIN));
        }),
      check: () => {
        dispatch({ type: "check" });
        if (live) {
          void live
            .reach()
            .then((value) => dispatch({ type: "reachable", value, at: new Date().toISOString() }));
          return;
        }
        // The offline and loading previews keep their answer.
        if (answer === null) return;
        later(() => dispatch({ type: "reachable", value: answer, at: new Date().toISOString() }));
      },
    };
  }, [state, answer, latest, live]);

  return <ExtensionContext value={store}>{children}</ExtensionContext>;
}

export function useExtension(): Store {
  const store = use(ExtensionContext);
  if (!store) throw new Error("useExtension needs an ExtensionProvider above it");
  return store;
}

/** The account in use. */
export function activeAccount(state: ExtState): Account | undefined {
  return state.accounts.find((a) => a.id === state.active) ?? state.accounts[0];
}
