import type { AnalyzeResponse } from "@baret/guard";
import type { StoredCredential, Wallet, WalletCall, WalletSession } from "@baret/wallet-core";
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
}

export type { LiveStep, StepBuilder };

const LiveContext = createContext<Live | null>(null);

/** The live wallet, or null on the sample. */
export function useLive(): Live | null {
  return use(LiveContext);
}

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
      const balances = await chainOf(createWalletChain).balances(open.address, [USDC]);
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
            status: { ...statusRef.current, vault: "ok" },
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
        status: { ...statusRef.current, vault: "ok" },
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
          patch({ status: { ...statusRef.current, vault: "error" } });
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

  /** An unlocked session arrives: the account, the wallet that signs, the first reads. */
  const open = useCallback(
    async (next: WalletSession, credential: StoredCredential) => {
      const { Wallet: WalletClass, createWalletChain } = await import("@baret/wallet-core");
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
        status: { analyzer: "ok", balances: "loading", activity: "ok", vault: "loading" },
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
      _outcome: "sent" | "overridden",
      sending: () => void,
    ): Promise<SignReceipt> => {
      const signer = wallet.current;
      if (!signer) throw new Error("the wallet is locked");
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
          "contractCall",
          { contract: factory },
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
              "approval",
              { spender: to, amount, asset: VAULT_ASSET },
              "approval",
              "approve(spender, amount)",
            );
          },
          async () => {
            const { vault: calls } = await core();
            return step(
              calls.deposit(await address(), USDC, units(amount))[1],
              "vaultDeposit",
              { amount, asset: VAULT_ASSET },
              "unknown",
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
            "unknown",
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
            "contractCall",
            { contract: to },
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
              {},
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
      vault,
    }),
    [known, busy, problem, prompt, lock, refresh, transfer, check, sign, forget, vault],
  );

  return <LiveContext value={value}>{children}</LiveContext>;
}
