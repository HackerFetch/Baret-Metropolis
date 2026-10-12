import { transfers, type WalletCall } from "@baret/wallet-core";
import { fromAnalyze, type SignContext, unreachable } from "@baret/wallet-ui/data/analyze";
import { toUnits } from "@baret/wallet-ui/data/format";
import type { SignRequest as SignRequestData } from "@baret/wallet-ui/data/types";
import { SignRequest } from "@baret/wallet-ui/sign/SignRequest";
import { type JSX, useEffect, useRef, useState } from "react";
import { type Hex, hexToString, isHex, maxUint256 } from "viem";
import { ERRORS, type Pending, type RpcOutcome, siteOf } from "../core/protocol.js";
import { activeAccount, useExtension } from "../data/store.js";
import type {
  Activity,
  MessageRequest,
  PopupRequest,
  TransactionRequest,
  TypedDataRequest,
} from "../data/types.js";
import { type Decision, MessageView, TypedDataView } from "../entrypoints/popup/parts/Requests.js";
import { ConnectPhase } from "../entrypoints/popup/screens/Connect.js";
import { fromTransaction } from "../entrypoints/popup/screens/Sign.js";
import { grantsFrom, isPayment, paymentFrom, problemFrom, withGrants } from "./records.js";
import { declinedKind, loggedRow } from "./row.js";
import { capsOf, cardAfter, type SiteStop, siteStop } from "./site-caps.js";
import {
  type AnalyzeResponse,
  chain,
  EXPLORER,
  feeOf,
  guard,
  openAccount,
  USDC,
  walletFor,
} from "./wallet.js";

/**
 * A live request, on the screens the samples use.
 *
 * Whatever a site asks for (to connect, a transaction, structured data, a
 * message) arrives here as a Pending from the background. A transaction and
 * structured data go to Baret's server first; the screen shows Checking until
 * the verdict is in, and nothing can be signed before it. Fail-closed: no
 * answer is Can't reach Baret, which has no way to sign.
 *
 * `onAnswer` gives the site its answer through the background; the screen
 * then stays for the reader until they move on (`onFinished`).
 */

const SECONDS = 300;

type Answer = (outcome: RpcOutcome) => void;

/** The account a request is for: the one its site sees, else the account in use. */
function useOwner(origin?: string | null): { id: string; address: string } {
  const { state } = useExtension();
  const seen = origin ? state.sites.find((s) => s.origin === siteOf(origin))?.account : null;
  const account = state.accounts.find((a) => a.id === seen) ?? activeAccount(state);
  return { id: account?.id ?? state.active, address: account?.address ?? "" };
}

/** One row of the log for a request that is not a transaction. */
function rowOf(
  request: MessageRequest | TypedDataRequest,
  decision: Decision,
  account: string,
): Activity {
  const at = new Date().toISOString();
  const status =
    decision === "signed"
      ? "confirmed"
      : decision === "overridden"
        ? "overridden"
        : decision === "expired"
          ? "expired"
          : "declined";
  const base = {
    id: `${request.id}-${decision}-${at}`,
    at,
    account,
    origin: siteOf(request.origin),
    changes: [],
    status,
  } as const;
  if (request.kind === "message") {
    return {
      ...base,
      kind: "message",
      counterparty: null,
      values: {},
      verdict: null,
      findings: [],
    };
  }
  return {
    ...base,
    kind: "typedData",
    counterparty: request.permit?.spender ?? null,
    values: request.permit ? { asset: request.permit.asset } : {},
    verdict: request.verdict,
    findings: request.findings,
  };
}

// ── A transaction ──

/**
 * One call, checked and then signed: a site's eth_sendTransaction, or the
 * account's own transfer from the Send form (`origin` null).
 */
export function LiveTransaction({
  id,
  origin,
  call,
  words,
  firstTime,
  onAnswer,
  onFinished,
}: {
  id: string;
  origin: string | null;
  call: WalletCall;
  /** What the request says it is, for the screen's sentence. */
  words: Pick<SignContext, "action" | "values" | "impact">;
  firstTime: boolean;
  onAnswer: Answer;
  onFinished: () => void;
}): JSX.Element {
  const { state, dispatch, check: recheckServer } = useExtension();
  const owner = useOwner(origin);
  const records = useRef(state);
  records.current = state;
  const context = useRef<SignContext>({
    id,
    origin: origin === null ? null : siteOf(origin),
    ...words,
    claim: null,
    fee: "0",
    raw: { to: call.to, value: call.value.toString(), data: call.data, decoded: null },
    expires: SECONDS,
    wallet: owner.address,
  });
  const [shown, setShown] = useState<SignRequestData>(() => unreachable(context.current));
  const [pending, setPending] = useState(true);
  const cleared = useRef<AnalyzeResponse | null>(null);
  const answered = useRef(false);
  const policy = useRef(state.policy);
  policy.current = state.policy;

  const answer = (outcome: RpcOutcome): void => {
    if (answered.current) return;
    answered.current = true;
    onAnswer(outcome);
  };

  /** Asks Baret about the call. Null when there is no verdict. */
  const ask = useRef(async (): Promise<SignRequestData | null> => {
    cleared.current = null;
    const wallet = await walletFor(policy.current, owner.address);
    if (!wallet) return null;
    try {
      context.current = { ...context.current, fee: await feeOf(wallet.address, call) };
      const verdict = await wallet.check(call);
      const request = fromAnalyze(verdict, context.current);
      if (request.verdict !== "unreachable") cleared.current = verdict;
      return request;
    } catch {
      // No verdict: the store learns Baret did not answer, and nothing is signable.
      recheckServer();
      return null;
    }
  });

  useEffect(() => {
    let alive = true;
    void ask.current().then((request) => {
      if (!alive) return;
      setShown(request ?? unreachable(context.current));
      setPending(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const row = (item: Activity): Activity => loggedRow(item, shown, call.value);

  const tx: TransactionRequest = {
    kind: "transaction",
    id,
    network: "testnet",
    request: shown,
    firstTime,
  };

  return (
    <SignRequest
      request={shown}
      network="testnet"
      compact
      framed={false}
      pending={pending}
      onCheckAgain={async () => {
        const request = await ask.current();
        if (request) setShown(request);
        return request;
      }}
      onSign={async (_outcome, sending) => {
        const verdict = cleared.current;
        const wallet = await walletFor(policy.current, owner.address);
        if (!verdict || !wallet) throw new Error("nothing was cleared to sign");
        // The reader has the findings on screen and pressed sign: that is the
        // acknowledgement a Caution needs. Blocked is refused by the wallet itself.
        const hash = await wallet.sign(call, verdict, { acknowledged: true });
        // The site learns the hash as soon as the transaction is out.
        answer({ result: hash });
        sending();
        const receipt = await chain().wait(hash);
        if (!receipt.ok) throw new Error("the transaction reverted");
        // What the transaction lets someone spend from now on goes on the
        // allowances list; the list is checked against Monad again as it is read.
        const grants = grantsFrom(verdict.approvals, {
          owner: owner.address,
          account: owner.id,
          origin: origin === null ? null : siteOf(origin),
          at: new Date().toISOString(),
        });
        if (grants.length > 0) {
          dispatch({
            type: "patch",
            patch: { permissions: withGrants(records.current.permissions, grants) },
          });
        }
        return { hash: receipt.hash, block: receipt.block.toString() };
      }}
      onDecline={() => {
        // Every answer lands in the log, the refused ones too.
        if (!answered.current) {
          const at = new Date().toISOString();
          const kind = declinedKind(shown.verdict);
          dispatch({
            type: "log",
            item: row(
              fromTransaction(
                {
                  id: `${id}-${kind}-${at}`,
                  kind,
                  at,
                  values: {},
                  verdict: shown.verdict,
                  findings: shown.findings,
                  changes: shown.changes,
                },
                tx,
                owner.id,
              ),
            ),
          });
        }
        answer({ error: shown.verdict === "blocked" ? ERRORS.blocked : ERRORS.rejected });
        onFinished();
      }}
      onLog={(item) => dispatch({ type: "log", item: row(fromTransaction(item, tx, owner.id)) })}
      onAgain={() => {
        // Left without a signature (blocked, expired, could not be reached).
        answer({ error: shown.verdict === "blocked" ? ERRORS.blocked : ERRORS.rejected });
        onFinished();
      }}
      explorer={(hash: string) => `${EXPLORER}/tx/${hash}`}
      // The wallet does not sign a block: the way past is the rule.
      canOverride={false}
      {...(shown.verdict !== "unreachable" ? { explainId: shown.id } : {})}
    />
  );
}

/** The call a site's eth_sendTransaction asks for, or null when it is not one. */
export function callOf(params: readonly unknown[]): WalletCall | null {
  const tx = params[0] as { to?: unknown; value?: unknown; data?: unknown; input?: unknown };
  if (typeof tx !== "object" || tx === null) return null;
  if (typeof tx.to !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(tx.to)) return null;
  const data = tx.data ?? tx.input ?? "0x";
  if (typeof data !== "string" || !isHex(data)) return null;
  let value = 0n;
  if (tx.value !== undefined) {
    if (typeof tx.value !== "string" || !isHex(tx.value)) return null;
    value = tx.value === "0x" ? 0n : BigInt(tx.value);
  }
  return { to: tx.to as Hex, data, value };
}

/** The Send form's transfer as a call: MON, or a token by its contract. */
export function transferCall(
  request: SignRequestData,
  assets: readonly { symbol: string; decimals: number; contract: string | null }[],
): WalletCall | null {
  const { amount, asset, recipient } = request.values;
  const found = assets.find((a) => a.symbol === asset);
  if (!found || !amount || !recipient || !/^0x[0-9a-fA-F]{40}$/.test(recipient)) return null;
  const units = toUnits(amount, found.decimals);
  if (units === null || units <= 0n) return null;
  return found.contract
    ? transfers.token(found.contract as Hex, recipient as Hex, units)
    : transfers.mon(recipient as Hex, units);
}

// ── Structured data and messages ──

export interface TypedData {
  domain: Record<string, unknown>;
  types: Record<string, readonly { name: string; type: string }[]>;
  primaryType: string;
  message: Record<string, unknown>;
}

function parseTyped(raw: unknown): TypedData | null {
  try {
    const value = (typeof raw === "string" ? JSON.parse(raw) : raw) as Partial<TypedData>;
    if (typeof value !== "object" || value === null) return null;
    if (typeof value.primaryType !== "string") return null;
    if (typeof value.types !== "object" || value.types === null) return null;
    if (typeof value.message !== "object" || value.message === null) return null;
    return {
      domain: (value.domain ?? {}) as Record<string, unknown>,
      types: value.types,
      primaryType: value.primaryType,
      message: value.message,
    };
  } catch {
    return null;
  }
}

function fieldsOf(message: Record<string, unknown>): { name: string; value: string }[] {
  return Object.entries(message).map(([name, value]) => ({
    name,
    value: typeof value === "object" && value !== null ? JSON.stringify(value) : String(value),
  }));
}

/** Deadlines this far out (past the year 9999) are shown as none, like the maximum. */
const DEADLINE_MAX_SECONDS = 253_402_300_799n;

/**
 * A permit's deadline, a uint256 of unix seconds, as an ISO date. Null for
 * the maximum, a value past any calendar, or one that is not a number: the
 * screen then says there is no deadline instead of a date it cannot format.
 */
export function deadlineOf(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  try {
    const seconds = BigInt(typeof raw === "number" ? Math.trunc(raw) : String(raw));
    if (seconds < 0n || seconds >= DEADLINE_MAX_SECONDS) return null;
    return new Date(Number(seconds) * 1000).toISOString();
  } catch {
    return null;
  }
}

/** The allowance a Permit hides in its fields. */
export function permitOf(typed: TypedData): TypedDataRequest["permit"] {
  if (typed.primaryType !== "Permit") return null;
  const { spender, value, deadline } = typed.message;
  if (typeof spender !== "string") return null;
  let amount: string | null = String(value ?? "");
  try {
    if (BigInt(String(value)) === maxUint256) amount = null;
  } catch {
    // Not a number: shown as the site sent it.
  }
  return {
    spender,
    asset: String(typed.domain.name ?? typed.domain.verifyingContract ?? ""),
    amount,
    deadline: deadlineOf(deadline),
  };
}

function LiveTypedData({
  pending,
  onAnswer,
  onFinished,
}: {
  pending: Pending;
  onAnswer: Answer;
  onFinished: () => void;
}): JSX.Element | null {
  const { state, dispatch } = useExtension();
  const owner = useOwner(pending.origin);
  const typed = parseTyped(pending.params[1]);
  const [request, setRequest] = useState<TypedDataRequest | null>(null);
  const policy = useRef(state.policy);
  // The site's own caps or its pause stopped the payment, before any check.
  const stop = useRef<SiteStop | null>(null);
  const ledger = useRef({ permissions: state.permissions, payments: state.payments });
  ledger.current = { permissions: state.permissions, payments: state.payments };

  // One check per request: the request does not change under the screen.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the request's id
  useEffect(() => {
    let alive = true;
    const base = {
      kind: "typedData",
      id: pending.id,
      origin: pending.origin,
      network: "testnet",
      fields: typed ? fieldsOf(typed.message) : [],
      permit: typed ? permitOf(typed) : null,
      expires: SECONDS,
    } as const;
    const stopped: TypedDataRequest = { ...base, verdict: "unreachable", findings: [], rules: [] };
    if (!typed) {
      setRequest(stopped);
      return;
    }
    // A payment to a site the reader paused, or over the caps they set for it,
    // ends here: the caps live in this wallet and nothing else enforces them.
    if (isPayment(typed)) {
      const origin = siteOf(pending.origin);
      const asked = paymentFrom(typed, { payer: owner.address, origin, at: "", usdc: USDC });
      stop.current = siteStop(
        { origin, amount: asked.amount, asset: asked.asset },
        ledger.current.permissions,
        ledger.current.payments,
        Date.now(),
      );
      if (stop.current) {
        setRequest({
          ...base,
          verdict: "blocked",
          findings: stop.current.finding ? [stop.current.finding] : [],
          rules: [stop.current.rule],
        });
        return;
      }
    }
    const context: SignContext = {
      id: pending.id,
      origin: siteOf(pending.origin),
      action: "contractCall",
      values: {},
      claim: null,
      impact: "unknown",
      fee: "0",
      raw: { to: "", value: "0", data: "0x", decoded: null },
      expires: SECONDS,
      wallet: owner.address,
    };
    guard
      .evaluate({
        network: "testnet",
        typedData: { signer: owner.address, ...typed } as never,
        userWallet: owner.address as Hex,
        policy: policy.current as never,
      })
      .then(
        (verdict) => {
          if (!alive) return;
          const read = fromAnalyze(verdict, context);
          setRequest({
            ...base,
            verdict: read.verdict,
            findings: read.findings,
            rules: read.rules,
          });
        },
        () => {
          if (alive) setRequest(stopped);
        },
      );
    return () => {
      alive = false;
    };
  }, [pending.id]);

  if (!request) return null;

  async function decide(decision: Decision): Promise<void> {
    if (!request) return;
    const signing = decision === "signed" || decision === "overridden";
    // Only a verdict Baret gave, and never a block, reaches the key.
    const allowed = request.verdict === "safe" || request.verdict === "caution";
    let outcome: RpcOutcome = { error: ERRORS.rejected };
    if (signing && allowed && typed) {
      try {
        const account = await openAccount(owner.address);
        if (account) {
          const { EIP712Domain: _domain, ...types } = typed.types;
          outcome = {
            result: await account.signTypedData({
              domain: typed.domain,
              types,
              primaryType: typed.primaryType,
              message: typed.message,
            } as never),
          };
        }
      } catch {
        outcome = { error: ERRORS.internal };
      }
    } else if (request.verdict === "blocked") {
      outcome = {
        error: stop.current
          ? { code: ERRORS.blocked.code, message: stop.current.message }
          : ERRORS.blocked,
      };
    }
    const signed = "result" in outcome;
    dispatch({ type: "log", item: rowOf(request, signed ? decision : "declined", owner.id) });
    // An x402 payment goes on the payments page: signed, or why Baret stopped it.
    if (typed && isPayment(typed)) {
      const by = { origin: siteOf(pending.origin), at: new Date().toISOString(), usdc: USDC };
      if (signed) {
        const payment = paymentFrom(typed, { ...by, payer: owner.address });
        const payments = [payment, ...state.payments.filter((p) => p.id !== payment.id)];
        dispatch({ type: "patch", patch: { payments } });
        // The site's caps card counts it: its meters and its last use.
        const card = capsOf(state.permissions, by.origin);
        if (card && card.asset === payment.asset) {
          dispatch({
            type: "caps",
            permission: cardAfter(card, payments, by.at, payment.amount),
          });
        }
      } else if (request.verdict === "blocked") {
        const code = request.findings[0]?.code ?? null;
        // A pause has no finding: the payments page lists it as declined.
        dispatch({
          type: "patch",
          patch: { problems: [problemFrom(typed, { ...by, code }), ...state.problems] },
        });
      }
    }
    onAnswer(outcome);
    onFinished();
  }

  return (
    <TypedDataView
      request={request}
      onDecide={(decision) => void decide(decision)}
      // The key never signs a block or an unchecked request: no hold is offered.
      canOverride={false}
    />
  );
}

function LiveMessage({
  pending,
  onAnswer,
  onFinished,
}: {
  pending: Pending;
  onAnswer: Answer;
  onFinished: () => void;
}): JSX.Element {
  const { dispatch } = useExtension();
  const owner = useOwner(pending.origin);
  const raw = pending.params[0];
  let text = typeof raw === "string" ? raw : "";
  let readable = false;
  if (typeof raw === "string" && isHex(raw)) {
    try {
      const decoded = hexToString(raw);
      // Text a person can read: no control characters but line breaks and tabs.
      if (!/[^\P{C}\n\r\t]/u.test(decoded)) {
        text = decoded;
        readable = true;
      }
    } catch {
      // Not text: shown as the bytes the site sent.
    }
  } else if (typeof raw === "string") {
    readable = true;
  }
  const request: MessageRequest = {
    kind: "message",
    id: pending.id,
    origin: pending.origin,
    network: "testnet",
    text,
    readable,
    expires: SECONDS,
  };

  async function decide(decision: Decision): Promise<void> {
    let outcome: RpcOutcome = { error: ERRORS.rejected };
    if (decision === "signed" && typeof raw === "string") {
      try {
        const account = await openAccount(owner.address);
        if (account) {
          outcome = {
            result: await account.signMessage({ message: isHex(raw) ? { raw } : raw }),
          };
        }
      } catch {
        outcome = { error: ERRORS.internal };
      }
    }
    dispatch({
      type: "log",
      item: rowOf(request, "result" in outcome ? "signed" : "declined", owner.id),
    });
    onAnswer(outcome);
    onFinished();
  }

  return <MessageView request={request} onDecide={(decision) => void decide(decision)} />;
}

// ── Connect ──

function LiveConnect({
  pending,
  onAnswer,
  onFinished,
}: {
  pending: Pending;
  onAnswer: Answer;
  onFinished: () => void;
}): JSX.Element | null {
  const { state } = useExtension();
  const site = state.sites.find((s) => s.origin === siteOf(pending.origin));
  const connected = site?.status === "connected";
  const address =
    state.accounts.find((a) => a.id === site?.account)?.address ?? activeAccount(state)?.address;
  const already = useRef(connected);
  const answered = useRef(false);

  // The moment the reader connects, the site has its answer.
  useEffect(() => {
    if (!connected || !address || answered.current) return;
    answered.current = true;
    onAnswer(
      pending.method === "wallet_requestPermissions"
        ? { result: [{ parentCapability: "eth_accounts" }] }
        : { result: [address] },
    );
    // A site that was connected before only waited for the wallet to open.
    if (already.current) onFinished();
  }, [connected, address, onAnswer, onFinished, pending.method]);

  if (already.current) return null;
  const secure =
    pending.origin.startsWith("https://") || /^http:\/\/localhost(:|$)/.test(pending.origin);
  return (
    <ConnectPhase
      sample={{
        id: secure ? "firstTime" : "insecure",
        origin: pending.origin,
        secure,
        multipleWallets: false,
        already: false,
      }}
      onFinished={() => {
        if (!answered.current) {
          answered.current = true;
          onAnswer({ error: ERRORS.rejected });
        }
        onFinished();
      }}
    />
  );
}

/** The screen for one waiting request. */
export function LiveRequest({
  pending,
  onAnswer,
  onFinished,
}: {
  pending: Pending;
  onAnswer: Answer;
  onFinished: () => void;
}): JSX.Element | null {
  const firstTime = useSiteRequest(pending);
  const props = { pending, onAnswer, onFinished };
  if (pending.kind === "connect") return <LiveConnect {...props} />;
  if (pending.kind === "typedData") return <LiveTypedData {...props} />;
  if (pending.kind === "message") return <LiveMessage {...props} />;
  const call = callOf(pending.params);
  if (!call) {
    // Not a call the wallet can read: refused, and the site is told why.
    return <Refuse onAnswer={onAnswer} onFinished={onFinished} />;
  }
  return (
    <LiveTransaction
      id={pending.id}
      origin={pending.origin}
      call={call}
      words={{ action: "contractCall", values: { contract: call.to }, impact: "contractCall" }}
      firstTime={firstTime}
      onAnswer={onAnswer}
      onFinished={onFinished}
    />
  );
}

/**
 * Counts the request on its site once it is on screen, and says whether it
 * is the site's first after connecting. The count is read before it moves,
 * so the screen's "first time" line does not change under the reader.
 */
function useSiteRequest(pending: Pending): boolean {
  const { state, dispatch } = useExtension();
  const [firstTime] = useState(() => {
    const site = state.sites.find((s) => s.origin === siteOf(pending.origin));
    return (site?.requests ?? 0) <= 1;
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: counted once per request
  useEffect(() => {
    if (pending.kind === "connect") return;
    dispatch({ type: "request", origin: siteOf(pending.origin), at: new Date().toISOString() });
  }, [pending.id]);
  return firstTime;
}

function Refuse({ onAnswer, onFinished }: { onAnswer: Answer; onFinished: () => void }): null {
  useEffect(() => {
    onAnswer({ error: ERRORS.invalid });
    onFinished();
  }, [onAnswer, onFinished]);
  return null;
}

/** The account's own transfer from the Send form, as a live request. */
export function OwnTransfer({
  request,
  onFinished,
}: {
  request: PopupRequest;
  onFinished: () => void;
}): JSX.Element | null {
  const { state } = useExtension();
  const call = request.kind === "transaction" ? transferCall(request.request, state.assets) : null;
  useEffect(() => {
    if (!call) onFinished();
  }, [call, onFinished]);
  if (!call || request.kind !== "transaction") return null;
  return (
    <LiveTransaction
      id={request.id}
      origin={null}
      call={call}
      words={{ action: "transfer", values: request.request.values, impact: "transfer" }}
      firstTime={false}
      onAnswer={() => {}}
      onFinished={onFinished}
    />
  );
}
