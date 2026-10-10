import type { AnalyzeResponse } from "@baret/guard";
import type {
  SealedKeys,
  StoredCredential,
  Wallet,
  WalletCall,
  WalletSession,
} from "@baret/wallet-core";
import { fromAnalyze, type SignContext, unreachable } from "@baret/wallet-ui/data/analyze";
import { fromUnits, toUnits } from "@baret/wallet-ui/data/format";
import { useWallet, type WalletState } from "@baret/wallet-ui/data/store";
import type { Asset, GuardPolicy, Merchant, SignRequest } from "@baret/wallet-ui/data/types";
import type { SignReceipt } from "@baret/wallet-ui/sign/SignRequest";
import {
  createContext,
  type JSX,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { activityOf, merchantNames } from "./history.js";
import { parseSealed, sealedText } from "./sealedDoc.js";
import {
  clearStored,
  type PasskeyProblem,
  readAgentSince,
  readCredential,
  readMerchants,
  readName,
  readRules,
  SESSION_MS,
  USDC,
  writeAgentSince,
  writeCredential,
  writeMerchant,
  writeName,
  writeRules,
} from "./storage.js";
import {
  auditVaultOf,
  type LiveStep,
  merchantAddresses,
  type StepBuilder,
  toVault,
  VAULT_ASSET,
  vaultUnits,
} from "./vault.js";

/**
 * The wallet's live side: the one place the screens' store meets a real
 * account. The account is a Mera passkey account (`@baret/wallet-core`), the
 * balances come from Monad, and nothing is signed that the Baret server has
 * not cleared.
 *
 * What is kept where:
 *  - The keys: in memory only, inside the unlocked session, until lock(), a
 *    reload or the session's deadline. Never in storage.
 *  - The passkey's credential id, the account's name and the rules: in
 *    localStorage. None is secret, and none is needed: with storage cleared,
 *    or on another device, unlock() offers every passkey the site has and the
 *    same passkey brings back the same address (rules fall back to Balanced).
 *  - A sealed copy of the rules, the merchants' names and the account's name,
 *    when the reader asks for one: encrypted with a key from the passkey's
 *    own namespace and kept on Monad, so the same passkey brings them back on
 *    any device (`sealed`). That key is in memory until lock(), like the rest.
 *
 * Fail-closed: a balance that was not read is "error", never a number; a
 * check that did not finish is Can't reach Baret, which cannot be signed.
 */

export interface LiveRequest {
  readonly request: SignRequest;
  /** Null when there is no verdict to sign with. */
  readonly signable: { readonly call: WalletCall; readonly verdict: AnalyzeResponse } | null;
}

export interface Live {
  /** A passkey was made or used in this browser before. */
  readonly known: boolean;
  /** A passkey prompt is open. */
  readonly busy: boolean;
  /** Why the last passkey prompt gave no account; null when it did or none ran. */
  readonly problem: PasskeyProblem | null;
  /** One passkey prompt: a new passkey and the account that comes from it. */
  create(name: string): Promise<boolean>;
  /** One passkey prompt: the account back from its passkey, stored credential or not. */
  unlock(): Promise<boolean>;
  /** Ends the session: "you" for the reader's own lock, "expired" for the deadline. */
  lock(reason?: "you" | "expired"): void;
  /**
   * When the deadline locked the wallet, its ISO time; null after a lock by
   * the reader, a reload, and once a new session opens.
   */
  readonly expiredAt: string | null;
  /** Reads the balances again; resolves when they are in the store. */
  refresh(): Promise<void>;
  /** Builds a transfer and asks Baret about it. */
  transfer(asset: Asset, amount: string, recipient: string): Promise<LiveRequest>;
  /**
   * Asks Baret about a call a site sent (request/siteRequest.tsx); `origin`
   * is the site as the browser reports it.
   */
  siteRequest(origin: string, call: WalletCall): Promise<LiveRequest>;
  /** Asks Baret again about the same call. */
  recheck(context: SignContext, call: WalletCall): Promise<LiveRequest>;
  /** Signs and sends a cleared call; resolves once it is in a block. */
  sign(
    signable: NonNullable<LiveRequest["signable"]>,
    outcome: "sent" | "overridden",
    sending: () => void,
  ): Promise<SignReceipt>;
  /** Forgets everything this browser holds about the account. The passkey itself stays. */
  forget(): void;
  /**
   * Reads the vault's history from the indexer into the store (screens call
   * it through `useHistoryRead`). Its rows join the wallet's own log; a newer
   * call supersedes one in flight. An account with no vault reads as "ok"
   * with only its own log; a vault not read yet, or an indexer that did not
   * answer, never reads as an empty history.
   */
  loadHistory(): Promise<void>;
  /**
   * The PaymentGuard vault. Every change is a list of steps, each one a call
   * the page puts in front of the owner as a sign request (recheck, then
   * sign): nothing here signs by itself. The first step opens the vault when
   * the account has none.
   */
  readonly vault: {
    /** Reads the vault from Monad and the indexer into the store. */
    refresh(): Promise<void>;
    /** An exact allowance, then the deposit: two sign requests. */
    deposit(amount: string): StepBuilder[];
    withdraw(amount: string): StepBuilder[];
    /** Lists a merchant or changes its caps. */
    merchant(merchant: Merchant): StepBuilder[];
    pause(address: string, paused: boolean): StepBuilder[];
    remove(address: string): StepBuilder[];
    /** Authorises `address` as the one key that may pay from the vault. */
    agent(address: string): StepBuilder[];
    revokeAgent(): StepBuilder[];
    /**
     * One passkey prompt in the agent's own PRF namespace: the agent's address
     * and key, the same on every device. Null when the prompt gave nothing.
     */
    derive(): Promise<{ readonly address: string; readonly privateKey: string } | null>;
  };
  /**
   * The rules, the merchants' names and the account's name, sealed with a key
   * from the passkey's own namespace and kept on Monad. The first use in a
   * session shows one passkey prompt; nothing is signed by the account and
   * the account pays no gas (Baret's server relays the write).
   */
  readonly sealed: {
    /**
     * Against the copy this session last saved or restored: "unknown" before
     * either, "changed" once the settings differ from it.
     */
    readonly state: "unknown" | "current" | "changed";
    save(): Promise<SealedOutcome>;
    /** Replaces this browser's rules and names with the sealed copy. */
    restore(): Promise<SealedOutcome>;
  };
}

/** How a sealed save or restore ended. */
export type SealedOutcome =
  | { readonly result: "saved" | "restored"; readonly version: string }
  /** Restore only: this passkey has no sealed copy yet. */
  | { readonly result: "empty" }
  /** The passkey prompt gave nothing. */
  | { readonly result: "cancelled" }
  | { readonly result: "failed" };

export type { LiveStep, StepBuilder };

const LiveContext = createContext<Live | null>(null);

/** The live wallet, or null on the sample. */
export function useLive(): Live | null {
  return use(LiveContext);
}

/**
 * Reads the vault's history from the indexer while a screen that shows the
 * log is open, and again when the account, its vault or the vault's status
 * changes. Nothing on the sample, nothing while locked.
 */
export function useHistoryRead(): void {
  const load = useLive()?.loadHistory;
  const { state } = useWallet();
  const key =
    state.live && !state.locked
      ? `${state.address}|${state.status.vault}|${state.vault.address}`
      : null;
  useEffect(() => {
    if (key !== null) void load?.();
  }, [key, load]);
}

/** How long the history read may take before it reads as unavailable. */
const HISTORY_TIMEOUT_MS = 15_000;

const RPC_URL: string =
  import.meta.env.VITE_MONAD_TESTNET_RPC_URL || "https://testnet-rpc.monad.xyz";

type CreateChain = typeof import("@baret/wallet-core")["createWalletChain"];
let sharedChain: ReturnType<CreateChain> | null = null;

/** One client for every read, so calls made together travel in one batch to the RPC. */
function chainOf(create: CreateChain): ReturnType<CreateChain> {
  sharedChain ??= create({ rpcUrl: RPC_URL });
  return sharedChain;
}

function problemOf(error: unknown, isMeraError: (e: unknown) => boolean): PasskeyProblem {
  if (typeof window.PublicKeyCredential === "undefined") return "unsupported";
  if (isMeraError(error)) {
    const code = (error as { code?: string }).code;
    if (code === "PRF_UNAVAILABLE") return "notCompatible";
  }
  return "cancelled";
}

function shown(amount: bigint, decimals: number): string {
  return fromUnits(amount, decimals, { min: 2, max: 6 });
}

/**
 * The status with one part changed. The ref is moved on at once, so reads
 * that answer before the next render (health, balances, vault) do not undo
 * each other.
 */
function statusWith(
  ref: { current: WalletState["status"] },
  part: Partial<WalletState["status"]>,
): WalletState["status"] {
  ref.current = { ...ref.current, ...part };
  return ref.current;
}

/** The most the network may charge for the call, in MON; "0" when it cannot be estimated. */
async function feeOf(from: string | undefined, call: WalletCall): Promise<string> {
  if (!from) return "0";
  try {
    const { createWalletChain } = await import("@baret/wallet-core");
    const tx = await chainOf(createWalletChain).prepare(from as `0x${string}`, call);
    const gas = typeof tx.gas === "bigint" ? tx.gas : 0n;
    const price =
      "maxFeePerGas" in tx && typeof tx.maxFeePerGas === "bigint"
        ? tx.maxFeePerGas
        : "gasPrice" in tx && typeof tx.gasPrice === "bigint"
          ? tx.gasPrice
          : 0n;
    return fromUnits(gas * price, 18, { min: 2, max: 6 });
  } catch {
    // A call that cannot be estimated reverts; Baret's check will say why.
    return "0";
  }
}

export function LiveProvider({ children }: { children: ReactNode }): JSX.Element {
  const { state, dispatch } = useWallet();
  const session = useRef<WalletSession | null>(null);
  const wallet = useRef<Wallet | null>(null);
  const policy = useRef<GuardPolicy>(state.policy);
  policy.current = state.policy;
  const [known, setKnown] = useState(() => readCredential() !== null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<PasskeyProblem | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [expiredAt, setExpiredAt] = useState<string | null>(null);
  // The deadline as sign() sees it, without waiting for a render.
  const deadlineRef = useRef<number | null>(null);
  deadlineRef.current = deadline;

  const patch = useCallback(
    (next: Partial<Omit<WalletState, "sample" | "live">>) =>
      dispatch({ type: "patch", patch: next }),
    [dispatch],
  );

  // The sealed namespace's keys, once the passkey gave them, and the document
  // this session last saved or restored.
  const sealedKeys = useRef<SealedKeys | null>(null);
  const [sealedCopy, setSealedCopy] = useState<string | null>(null);

  const lock = useCallback(
    (reason: "you" | "expired" = "you") => {
      session.current?.lock();
      session.current = null;
      wallet.current = null;
      sealedKeys.current?.forget();
      sealedKeys.current = null;
      setSealedCopy(null);
      const ended = deadlineRef.current;
      setExpiredAt(reason === "expired" && ended !== null ? new Date(ended).toISOString() : null);
      setDeadline(null);
      patch({ locked: true, sessionEndsAt: null });
    },
    [patch],
  );

  const refresh = useCallback(async () => {
    const open = session.current;
    if (!open) return;
    try {
      const { createWalletChain } = await import("@baret/wallet-core");
      const balances = await chainOf(createWalletChain).balances(open.address, [USDC]);
      if (session.current !== open) return;
      patch({
        assets: balances.map((b) => ({
          symbol: b.symbol,
          balance: shown(b.amount, b.decimals),
          decimals: b.decimals,
          contract: b.token,
        })),
        status: statusWith(statusRef, { balances: "ok" }),
      });
    } catch {
      if (session.current === open)
        patch({ assets: [], status: statusWith(statusRef, { balances: "error" }) });
    }
  }, [patch]);

  const vaultRead = useCallback(async (): Promise<boolean> => {
    const open = session.current;
    if (!open) return true;
    try {
      const { createWalletChain } = await import("@baret/wallet-core");
      const chain = chainOf(createWalletChain);
      const found = await chain.findVault(open.address);
      if (!found) {
        if (session.current === open)
          patch({
            vault: { address: "", asset: VAULT_ASSET, balance: "0.00", merchants: [], agent: null },
            agentPayments: [],
            status: statusWith(statusRef, { vault: "ok" }),
          });
        return true;
      }
      // The indexer names the merchants the vault ever had. Without it the
      // ones this browser added are still read; a fresh browser then shows none.
      const audit = await fetch(`/api/v1/audit/vault/${found}?limit=50`)
        .then((res) => (res.ok ? res.json() : null))
        .then(auditVaultOf)
        .catch(() => null);
      const labels = readMerchants();
      const state = await chain.vault(found, merchantAddresses(audit, labels));
      if (session.current !== open) return true;
      const vault = toVault(state, audit, labels, readAgentSince());
      patch({
        vault,
        agentPayments: audit?.payments ?? [],
        permissions: vault.agent
          ? [
              {
                id: "agent",
                kind: "agent",
                values: {
                  count: String(vault.merchants.filter((m) => m.status === "active").length),
                },
              },
            ]
          : [],
        status: statusWith(statusRef, { vault: "ok" }),
      });
      return true;
    } catch {
      return false;
    }
  }, [patch]);

  /**
   * One read at a time: a second caller waits for the one in flight, so a
   * signature that triggers several refreshes costs one. A read that fails is
   * tried once more (the public RPC limits bursts); then the vault reads as
   * unreachable. Fail-closed: an unread vault shows no figures.
   */
  const vaultInFlight = useRef<Promise<void> | null>(null);
  const vaultRefresh = useCallback((): Promise<void> => {
    vaultInFlight.current ??= (async () => {
      const open = session.current;
      if (!(await vaultRead())) {
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
        if (!(await vaultRead()) && session.current === open)
          patch({ status: statusWith(statusRef, { vault: "error" }) });
      }
    })().finally(() => {
      vaultInFlight.current = null;
    });
    return vaultInFlight.current;
  }, [patch, vaultRead]);

  // The latest status and state, for the async reads above.
  const statusRef = useRef(state.status);
  statusRef.current = state.status;
  const stateRef = useRef(state);
  stateRef.current = state;

  /**
   * The vault's history from the indexer, read by the screens that show the
   * log (`useHistoryRead`), not by unlock. Its rows join the wallet's own log
   * in the store ("history" keeps what this wallet logged). Fail-closed: the
   * vault's address counts only once the vault was read; a 404 (the indexer
   * has not seen the vault yet), a 503 (no indexer), a network error, a
   * timeout or an answer of the wrong shape all read as "error".
   */
  const historyRun = useRef<AbortController | null>(null);
  const loadHistory = useCallback(async (): Promise<void> => {
    const open = session.current;
    if (!open) return;
    // A newer read supersedes one in flight: only the latest may write.
    historyRun.current?.abort();
    const run = new AbortController();
    historyRun.current = run;
    const latest = () => session.current === open && historyRun.current === run;
    const { status, vault } = stateRef.current;
    if (status.vault !== "ok") {
      // Unread is not "no vault": loading stays loading, a failed read is an error.
      patch({ status: statusWith(statusRef, { activity: status.vault }) });
      return;
    }
    if (!vault.address) {
      // No vault: the indexer has nothing for this account, only the wallet's own log.
      dispatch({ type: "history", items: [] });
      patch({ status: statusWith(statusRef, { activity: "ok" }) });
      return;
    }
    patch({ status: statusWith(statusRef, { activity: "loading" }) });
    const timer = window.setTimeout(() => run.abort(), HISTORY_TIMEOUT_MS);
    try {
      const res = await fetch(`/api/v1/audit/vault/${vault.address}?limit=100`, {
        signal: run.signal,
      });
      if (!res.ok) throw new Error(String(res.status));
      const items = activityOf(await res.json(), merchantNames(vault.merchants));
      if (!items) throw new Error("not an audit answer");
      if (!latest()) return;
      dispatch({ type: "history", items });
      patch({ status: statusWith(statusRef, { activity: "ok" }) });
    } catch {
      if (latest()) patch({ status: statusWith(statusRef, { activity: "error" }) });
    } finally {
      window.clearTimeout(timer);
    }
  }, [dispatch, patch]);

  /** An unlocked session arrives: the account, the wallet that signs, the first reads. */
  const open = useCallback(
    async (next: WalletSession, credential: StoredCredential) => {
      const { Wallet: WalletClass, createWalletChain } = await import("@baret/wallet-core");
      // A passkey asked again while unlocked (every signature, or Unlock
      // again): the old session's keys are wiped, not left for the GC.
      const previous = session.current;
      if (previous && previous !== next) previous.lock();
      const same = previous?.address === next.address;
      session.current = next;
      wallet.current = new WalletClass({
        session: next,
        chain: chainOf(createWalletChain),
        baretUrl: "/api",
        policy: () => policy.current,
      });
      writeCredential(credential);
      setKnown(true);
      const ends = Date.now() + SESSION_MS;
      deadlineRef.current = ends;
      setDeadline(ends);
      setExpiredAt(null);
      // The same account again: a new deadline, and the screens stay as they are.
      if (same) {
        patch({ sessionEndsAt: new Date(ends).toISOString() });
        return;
      }
      // Another account: the sealed keys of the one before are not this one's.
      sealedKeys.current?.forget();
      sealedKeys.current = null;
      setSealedCopy(null);
      const rules = readRules();
      // Another account than the one on screen: its log is not this one's.
      const other = stateRef.current.address !== next.address;
      patch({
        ...(other ? { activity: [] } : {}),
        address: next.address,
        locked: false,
        sessionEndsAt: new Date(ends).toISOString(),
        accountName: readName() ?? state.accountName,
        ...(rules ? { policy: rules.policy, template: rules.template } : {}),
        // The log of what this wallet did lives in memory; the indexer's
        // history is read by the history screen.
        status: statusWith(statusRef, {
          analyzer: "loading",
          balances: "loading",
          activity: "ok",
          vault: "loading",
        }),
      });
      // Baret's server is asked, not assumed: a health check that fails or
      // does not answer reads as unreachable (fail-closed).
      void fetch("/api/health")
        .then((res) => res.ok)
        .catch(() => false)
        .then((ok) => {
          if (session.current === next)
            patch({ status: statusWith(statusRef, { analyzer: ok ? "ok" : "error" }) });
        });
      void refresh().then(vaultRefresh);
    },
    [patch, refresh, vaultRefresh, state.accountName],
  );

  const prompt = useCallback(
    async (kind: "create" | "unlock", name: string): Promise<boolean> => {
      if (busy) return false;
      setBusy(true);
      setProblem(null);
      const core = await import("@baret/wallet-core");
      try {
        const rpId = window.location.hostname;
        const stored = readCredential();
        const got =
          kind === "create"
            ? await core.createWallet({ rpId, rpName: "Baret", userName: name })
            : await core.unlockWallet({ rpId, ...(stored ? { credential: stored } : {}) });
        // `name` is the passkey's own label in the browser's passkey list;
        // the account keeps its display name.
        await open(got.session, got.credential);
        return true;
      } catch (error) {
        setProblem(problemOf(error, core.isMeraError));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [busy, open],
  );

  // The session ends on an absolute deadline, always, so a sleeping tab cannot
  // outlive it: checked every 5 s and again when the tab is shown.
  useEffect(() => {
    if (deadline === null) return;
    const check = () => {
      if (Date.now() >= deadline) lock("expired");
    };
    const id = window.setInterval(check, 5000);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [deadline, lock]);

  // Rules and the name are kept as the reader changes them.
  useEffect(() => {
    if (state.locked) return;
    writeRules({ policy: state.policy, template: state.template });
    writeName(state.accountName);
  }, [state.locked, state.policy, state.template, state.accountName]);

  const check = useCallback(
    async (context: SignContext, call: WalletCall): Promise<LiveRequest> => {
      const signer = wallet.current;
      if (!signer) return { request: unreachable(context), signable: null };
      try {
        const verdict = await signer.check(call);
        patch({ status: statusWith(statusRef, { analyzer: "ok" }) });
        const request = fromAnalyze(verdict, context);
        return {
          request,
          signable: request.verdict === "unreachable" ? null : { call, verdict },
        };
      } catch {
        // No verdict: nothing to sign with.
        patch({ status: statusWith(statusRef, { analyzer: "error" }) });
        return { request: unreachable(context), signable: null };
      }
    },
    [patch],
  );

  const transfer = useCallback(
    async (asset: Asset, amount: string, recipient: string): Promise<LiveRequest> => {
      const { transfers } = await import("@baret/wallet-core");
      const units = toUnits(amount, asset.decimals) ?? 0n;
      const to = recipient as `0x${string}`;
      const call = asset.contract
        ? transfers.token(asset.contract as `0x${string}`, to, units)
        : transfers.mon(to, units);
      const context: SignContext = {
        id: `transfer-${Date.now()}`,
        origin: null,
        action: "transfer",
        values: { amount: fromUnits(units, asset.decimals), asset: asset.symbol, recipient },
        claim: null,
        impact: "transfer",
        fee: await feeOf(session.current?.address, call),
        raw: {
          to: call.to,
          value: call.value.toString(),
          data: call.data,
          decoded: asset.contract ? "transfer(to, amount)" : null,
        },
        expires: 300,
        wallet: session.current?.address ?? "",
      };
      return check(context, call);
    },
    [check],
  );

  const siteRequest = useCallback(
    async (origin: string, call: WalletCall): Promise<LiveRequest> => {
      const context: SignContext = {
        id: `site-${Date.now()}`,
        origin,
        action: "contractCall",
        values: { contract: call.to },
        claim: null,
        impact: "contractCall",
        fee: await feeOf(session.current?.address, call),
        raw: { to: call.to, value: call.value.toString(), data: call.data, decoded: null },
        expires: 300,
        wallet: session.current?.address ?? "",
      };
      return check(context, call);
    },
    [check],
  );

  const sign = useCallback(
    async (
      signable: NonNullable<LiveRequest["signable"]>,
      _outcome: "sent" | "overridden",
      sending: () => void,
    ): Promise<SignReceipt> => {
      const signer = wallet.current;
      if (!signer) throw new Error("the wallet is locked");
      // A tab that slept past the deadline may still hold the keys for the few
      // seconds before the interval locks it: refuse rather than sign.
      const ends = deadlineRef.current;
      if (ends === null || Date.now() >= ends) throw new Error("the session ended");
      const { createWalletChain } = await import("@baret/wallet-core");
      // The reader has the verdict and its findings on screen and pressed
      // sign: that is the acknowledgement a Caution needs. The wallet still
      // refuses Blocked and an expired verdict itself, override or not.
      const hash = await signer.sign(signable.call, signable.verdict, { acknowledged: true });
      sending();
      const receipt = await chainOf(createWalletChain).wait(hash);
      void refresh().then(vaultRefresh);
      if (!receipt.ok) throw new Error("the transaction reverted");
      return { hash: receipt.hash, block: receipt.block.toString() };
    },
    [refresh, vaultRefresh],
  );

  const vault = useMemo<Live["vault"]>(() => {
    const core = () => import("@baret/wallet-core");
    const owner = () => {
      const open = session.current;
      if (!open) throw new Error("the wallet is locked");
      return open.address;
    };
    /** The vault's address, read from the factory: the account may have just opened it. */
    const address = async () => {
      const { createWalletChain } = await core();
      const found = await chainOf(createWalletChain).findVault(owner());
      if (!found) throw new Error("the account has no vault");
      return found;
    };
    const step = async (
      call: WalletCall,
      action: SignContext["action"],
      values: Readonly<Record<string, string>>,
      impact: SignContext["impact"],
      decoded: string,
    ): Promise<LiveStep> => ({
      call,
      context: {
        id: `${action}-${Date.now()}`,
        origin: null,
        action,
        values,
        claim: null,
        impact,
        fee: await feeOf(owner(), call),
        raw: { to: call.to, value: call.value.toString(), data: call.data, decoded },
        expires: 300,
        wallet: owner(),
      },
    });
    /** Opening the vault comes first when the account has none. */
    const withVault = (steps: StepBuilder[]): StepBuilder[] => {
      const opened = async (): Promise<LiveStep> => {
        const { vault: calls, WALLET_CONTRACTS } = await core();
        const factory = WALLET_CONTRACTS.testnet?.paymentGuardFactory;
        if (!factory) throw new Error("no vault factory on this network");
        return step(
          calls.create(factory, USDC),
          "vaultCreate",
          {},
          "nothing",
          "createVault(token)",
        );
      };
      return stateRef.current.vault.address === "" ? [opened, ...steps] : steps;
    };
    const units = (text: string) => {
      const amount = vaultUnits(text);
      if (amount === null) throw new Error("not an amount");
      return amount;
    };
    return {
      refresh: vaultRefresh,
      deposit: (amount) =>
        withVault([
          async () => {
            const { vault: calls } = await core();
            const to = await address();
            return step(
              calls.deposit(to, USDC, units(amount))[0],
              "vaultApproval",
              { spender: to, amount, asset: VAULT_ASSET },
              "vaultApproval",
              "approve(spender, amount)",
            );
          },
          async () => {
            const { vault: calls } = await core();
            return step(
              calls.deposit(await address(), USDC, units(amount))[1],
              "vaultDeposit",
              { amount, asset: VAULT_ASSET },
              "vaultDeposit",
              "deposit(amount)",
            );
          },
        ]),
      withdraw: (amount) => [
        async () => {
          const { vault: calls } = await core();
          return step(
            calls.withdraw(await address(), units(amount)),
            "vaultWithdraw",
            { amount, asset: VAULT_ASSET },
            "vaultWithdraw",
            "withdraw(amount)",
          );
        },
      ],
      merchant: (merchant) =>
        withVault([
          async () => {
            const { vault: calls } = await core();
            writeMerchant(merchant.address, merchant.origin);
            return step(
              calls.setMerchantCap(await address(), merchant.address as `0x${string}`, {
                perPayment: units(merchant.perPayment),
                perHour: merchant.perHour === null ? null : units(merchant.perHour),
                perDay: units(merchant.perDay),
              }),
              "vaultCaps",
              { merchant: merchant.address },
              "nothing",
              "setMerchantCap(merchant, perTxCap, hourlyCap, dailyCap)",
            );
          },
        ]),
      pause: (merchant, paused) => [
        async () => {
          const { vault: calls } = await core();
          const to = await address();
          return step(
            calls.setMerchantPaused(to, merchant as `0x${string}`, paused),
            paused ? "vaultPauseMerchant" : "vaultResumeMerchant",
            { merchant },
            "nothing",
            "setMerchantPaused(merchant, paused)",
          );
        },
      ],
      remove: (merchant) => [
        async () => {
          const { vault: calls } = await core();
          return step(
            calls.revokeMerchant(await address(), merchant as `0x${string}`),
            "vaultRemoveMerchant",
            { merchant },
            "nothing",
            "revokeMerchant(merchant)",
          );
        },
      ],
      agent: (agent) =>
        withVault([
          async () => {
            const { vault: calls } = await core();
            writeAgentSince(new Date().toISOString());
            return step(
              calls.setAgent(await address(), agent as `0x${string}`),
              "vaultAgentKey",
              { agent },
              "nothing",
              "setAgentSigner(agent)",
            );
          },
        ]),
      revokeAgent: () => [
        async () => {
          const { vault: calls } = await core();
          return step(
            calls.revokeAgent(await address()),
            "vaultRevokeAgent",
            {},
            "nothing",
            "revokeAgentSigner()",
          );
        },
      ],
      derive: async () => {
        const { agentKeyFromPasskey } = await core();
        const stored = readCredential();
        try {
          // Agent 0: the vault takes one agent at a time.
          const key = await agentKeyFromPasskey(
            { rpId: window.location.hostname, ...(stored ? { credential: stored } : {}) },
            0,
          );
          return { address: key.address, privateKey: key.privateKey };
        } catch {
          return null;
        }
      },
    };
  }, [vaultRefresh]);

  /** The settings as they would be sealed now. */
  const sealedNow = sealedText({
    rules: { policy: state.policy, template: state.template },
    merchants: readMerchants(),
    name: state.accountName,
  });
  const sealedNowRef = useRef(sealedNow);
  sealedNowRef.current = sealedNow;

  const sealed = useMemo(() => {
    /** The namespace's keys: from memory, or one passkey prompt. Null when the prompt gave nothing. */
    const keys = async (): Promise<SealedKeys | null> => {
      const open = session.current;
      if (!open) return null;
      if (sealedKeys.current) return sealedKeys.current;
      const { sealedKeysFromPasskey } = await import("@baret/wallet-core");
      const stored = readCredential();
      try {
        const got = await sealedKeysFromPasskey({
          rpId: window.location.hostname,
          ...(stored ? { credential: stored } : {}),
        });
        // Locked, or another account, while the prompt was open.
        if (session.current !== open) {
          got.forget();
          return null;
        }
        sealedKeys.current = got;
        return got;
      } catch {
        return null;
      }
    };
    const save = async (): Promise<SealedOutcome> => {
      const got = await keys();
      if (!got) return { result: "cancelled" };
      try {
        const { readSealed, sealedTarget } = await import("@baret/wallet-core");
        const target = sealedTarget();
        if (!target) return { result: "failed" };
        const text = sealedNowRef.current;
        const entry = await readSealed({ store: target.store, id: got.id, rpcUrl: RPC_URL });
        const put = await got.put(target, entry.version + 1n, new TextEncoder().encode(text));
        const res = await fetch("/api/v1/sealed", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(put),
        });
        if (!res.ok) return { result: "failed" };
        if (sealedKeys.current === got) setSealedCopy(text);
        return { result: "saved", version: put.version };
      } catch {
        return { result: "failed" };
      }
    };
    const restore = async (): Promise<SealedOutcome> => {
      const got = await keys();
      if (!got) return { result: "cancelled" };
      try {
        const { readSealed, sealedTarget } = await import("@baret/wallet-core");
        const target = sealedTarget();
        if (!target) return { result: "failed" };
        const entry = await readSealed({ store: target.store, id: got.id, rpcUrl: RPC_URL });
        if (entry.version === 0n) return { result: "empty" };
        // Fail-closed: an entry these keys cannot open, or that is not a
        // settings document, changes nothing.
        const doc = parseSealed(
          new TextDecoder().decode(await got.open(entry.blob, entry.version)),
        );
        if (!doc || sealedKeys.current !== got) return { result: "failed" };
        writeRules(doc.rules);
        for (const [address, label] of Object.entries(doc.merchants)) {
          writeMerchant(address, label);
        }
        const name = doc.name.trim() === "" ? stateRef.current.accountName : doc.name;
        writeName(name);
        patch({ policy: doc.rules.policy, template: doc.rules.template, accountName: name });
        setSealedCopy(sealedText({ rules: doc.rules, merchants: readMerchants(), name }));
        // The vault's merchants take their names from what was just restored.
        void vaultRefresh();
        return { result: "restored", version: entry.version.toString() };
      } catch {
        return { result: "failed" };
      }
    };
    return { save, restore };
  }, [patch, vaultRefresh]);

  const sealedState: Live["sealed"]["state"] =
    sealedCopy === null ? "unknown" : sealedCopy === sealedNow ? "current" : "changed";

  const forget = useCallback(() => {
    lock();
    clearStored();
    setKnown(false);
  }, [lock]);

  const value = useMemo<Live>(
    () => ({
      known,
      busy,
      problem,
      create: (name) => prompt("create", name),
      unlock: () => prompt("unlock", ""),
      lock,
      expiredAt,
      refresh,
      transfer,
      siteRequest,
      recheck: check,
      sign,
      forget,
      loadHistory,
      vault,
      sealed: { state: sealedState, ...sealed },
    }),
    [
      known,
      busy,
      problem,
      prompt,
      lock,
      expiredAt,
      refresh,
      transfer,
      siteRequest,
      check,
      sign,
      forget,
      loadHistory,
      vault,
      sealedState,
      sealed,
    ],
  );

  return <LiveContext value={value}>{children}</LiveContext>;
}
