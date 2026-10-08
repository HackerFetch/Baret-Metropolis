import type { AnalyzeResponse } from "@baret/guard";
import type { StoredCredential, Wallet, WalletCall, WalletSession } from "@baret/wallet-core";
import { fromAnalyze, type SignContext, unreachable } from "@baret/wallet-ui/data/analyze";
import { fromUnits, toUnits } from "@baret/wallet-ui/data/format";
import { useWallet, type WalletState } from "@baret/wallet-ui/data/store";
import type { Asset, GuardPolicy, SignRequest } from "@baret/wallet-ui/data/types";
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
import {
  clearStored,
  type PasskeyProblem,
  readCredential,
  readName,
  readRules,
  SESSION_MS,
  USDC,
  writeCredential,
  writeName,
  writeRules,
} from "./storage.js";

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
  lock(): void;
  /** Reads the balances again; resolves when they are in the store. */
  refresh(): Promise<void>;
  /** Builds a transfer and asks Baret about it. */
  transfer(asset: Asset, amount: string, recipient: string): Promise<LiveRequest>;
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
}

const LiveContext = createContext<Live | null>(null);

/** The live wallet, or null on the sample. */
export function useLive(): Live | null {
  return use(LiveContext);
}

const RPC_URL: string =
  import.meta.env.VITE_MONAD_TESTNET_RPC_URL || "https://testnet-rpc.monad.xyz";

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

/** The most the network may charge for the call, in MON; "0" when it cannot be estimated. */
async function feeOf(from: string | undefined, call: WalletCall): Promise<string> {
  if (!from) return "0";
  try {
    const { createWalletChain } = await import("@baret/wallet-core");
    const tx = await createWalletChain({ rpcUrl: RPC_URL }).prepare(from as `0x${string}`, call);
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

  const patch = useCallback(
    (next: Partial<Omit<WalletState, "sample" | "live">>) =>
      dispatch({ type: "patch", patch: next }),
    [dispatch],
  );

  const lock = useCallback(() => {
    session.current?.lock();
    session.current = null;
    wallet.current = null;
    setDeadline(null);
    patch({ locked: true, sessionEndsAt: null });
  }, [patch]);

  const refresh = useCallback(async () => {
    const open = session.current;
    if (!open) return;
    try {
      const { createWalletChain } = await import("@baret/wallet-core");
      const balances = await createWalletChain({ rpcUrl: RPC_URL }).balances(open.address, [USDC]);
      if (session.current !== open) return;
      patch({
        assets: balances.map((b) => ({
          symbol: b.symbol,
          balance: shown(b.amount, b.decimals),
          decimals: b.decimals,
          contract: b.token,
        })),
        status: { ...statusRef.current, balances: "ok" },
      });
    } catch {
      if (session.current === open)
        patch({ assets: [], status: { ...statusRef.current, balances: "error" } });
    }
  }, [patch]);

  // The latest status, for the async reads above.
  const statusRef = useRef(state.status);
  statusRef.current = state.status;

  /** An unlocked session arrives: the account, the wallet that signs, the first reads. */
  const open = useCallback(
    async (next: WalletSession, credential: StoredCredential) => {
      const { Wallet: WalletClass, createWalletChain } = await import("@baret/wallet-core");
      session.current = next;
      wallet.current = new WalletClass({
        session: next,
        chain: createWalletChain({ rpcUrl: RPC_URL }),
        baretUrl: "/api",
        policy: () => policy.current,
      });
      writeCredential(credential);
      setKnown(true);
      const ends = Date.now() + SESSION_MS;
      setDeadline(ends);
      const rules = readRules();
      patch({
        address: next.address,
        locked: false,
        sessionEndsAt: new Date(ends).toISOString(),
        accountName: readName() ?? state.accountName,
        ...(rules ? { policy: rules.policy, template: rules.template } : {}),
        // The log of what this wallet did lives in memory; the indexer's
        // history is read by the history screen.
        status: { analyzer: "ok", balances: "loading", activity: "ok" },
      });
      void refresh();
    },
    [patch, refresh, state.accountName],
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
        if (kind === "create") writeName(name);
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

  // The session ends on an absolute deadline, so a sleeping tab cannot outlive it.
  useEffect(() => {
    if (deadline === null || !state.settings.lockAfterInactivity) return;
    const id = window.setInterval(() => {
      if (Date.now() >= deadline) lock();
    }, 5000);
    return () => window.clearInterval(id);
  }, [deadline, lock, state.settings.lockAfterInactivity]);

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
        patch({ status: { ...statusRef.current, analyzer: "ok" } });
        const request = fromAnalyze(verdict, context);
        return {
          request,
          signable: request.verdict === "unreachable" ? null : { call, verdict },
        };
      } catch {
        // No verdict: nothing to sign with.
        patch({ status: { ...statusRef.current, analyzer: "error" } });
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

  const sign = useCallback(
    async (
      signable: NonNullable<LiveRequest["signable"]>,
      outcome: "sent" | "overridden",
      sending: () => void,
    ): Promise<SignReceipt> => {
      const signer = wallet.current;
      if (!signer) throw new Error("the wallet is locked");
      const { createWalletChain } = await import("@baret/wallet-core");
      // The wallet refuses Blocked and an expired verdict itself; a Caution
      // is signed only because the reader held the override.
      const hash = await signer.sign(signable.call, signable.verdict, {
        acknowledged: outcome === "overridden",
      });
      sending();
      const receipt = await createWalletChain({ rpcUrl: RPC_URL }).wait(hash);
      void refresh();
      if (!receipt.ok) throw new Error("the transaction reverted");
      return { hash: receipt.hash, block: receipt.block.toString() };
    },
    [refresh],
  );

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
      refresh,
      transfer,
      recheck: check,
      sign,
      forget,
    }),
    [known, busy, problem, prompt, lock, refresh, transfer, check, sign, forget],
  );

  return <LiveContext value={value}>{children}</LiveContext>;
}
