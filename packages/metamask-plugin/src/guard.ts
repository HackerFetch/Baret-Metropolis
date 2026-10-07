/**
 * The part of the plugin that needs no MetaMask runtime: turning what an agent
 * wants to send into a Baret request, reading the answer, and deciding
 * whether the proposal may go on to the wallet.
 *
 * The plugin ships without runtime dependencies (the Agent Wallet installs it
 * from npm on its own), so the answer is checked by hand here instead of with
 * the schemas in @baret/guard. Anything that does not look like a verdict is
 * treated as no verdict, and no verdict means the proposal is not sent.
 */

export const DEFAULT_API_URL = "https://baret-monad-api.onrender.com";
export const CHECK_TIMEOUT_MS = 20_000;

/** Monad only. The chain id an agent passes maps to the network Baret analyses on. */
export const MONAD_NETWORKS = { 10143: "testnet", 143: "mainnet" } as const;
export type MonadChainId = keyof typeof MONAD_NETWORKS;

export const POLICY_TEMPLATES = ["strict", "balanced", "permissive"] as const;
export type PolicyTemplate = (typeof POLICY_TEMPLATES)[number];

export type Decision = "safe" | "caution" | "blocked";

/** What the agent wants the wallet to send. `value` is in wei, as a decimal string. */
export interface Proposal {
  chainId: MonadChainId;
  from: string;
  to: string;
  value: string;
  data: string;
}

export interface Finding {
  code: string;
  severity: string;
  values: Record<string, string>;
  blocking: boolean;
}

export interface FiredRule {
  rule: string;
  code: string;
  limit: string | null;
  actual: string | null;
}

/** The parts of Baret's answer the plugin acts on or shows. */
export interface Verdict {
  decision: Decision;
  findings: Finding[];
  firedRules: FiredRule[];
  expiresAt: string;
  requestId: string;
}

/** Why a proposal may or may not go on to the wallet. */
export type GateReason = "safe" | "caution-accepted" | "caution" | "blocked" | "expired";

export interface Gate {
  allowed: boolean;
  reason: GateReason;
}

/** Baret gave no usable answer. The caller must not send. */
export class NoVerdictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoVerdictError";
  }
}

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const HEX = /^0x([0-9a-fA-F]{2})*$/;
const WEI = /^(0|[1-9][0-9]*)$/;

export function isMonadChainId(chainId: number): chainId is MonadChainId {
  return chainId === 10143 || chainId === 143;
}

/** Checks the agent's input. Returns the problem, or null when the proposal is well formed. */
export function proposalProblem(p: {
  chainId: number;
  from: string;
  to: string;
  value: string;
  data: string;
}): string | null {
  if (!isMonadChainId(p.chainId)) return "chain id must be 10143 (Monad testnet) or 143 (Monad)";
  if (!ADDRESS.test(p.from)) return "no wallet address to send from";
  if (!ADDRESS.test(p.to)) return "to must be a 0x address of 40 hex characters";
  if (!WEI.test(p.value)) return "value must be a whole number of wei";
  if (!HEX.test(p.data)) return "data must be 0x-prefixed hex with an even number of digits";
  return null;
}

/** Wei as the 0x-prefixed quantity the wallet's executor takes. */
export function toHexQuantity(wei: string): string {
  return `0x${BigInt(wei).toString(16)}`;
}

/** The body of `POST /v1/analyze` for a proposal. */
export function buildAnalyzeRequest(p: Proposal, policyTemplate: PolicyTemplate) {
  return {
    network: MONAD_NETWORKS[p.chainId],
    transaction: { from: p.from, to: p.to, value: p.value, data: p.data },
    userWallet: p.from,
    policyTemplate,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function nullableString(v: unknown): v is string | null {
  return v === null || typeof v === "string";
}

/** Reads Baret's answer. Throws NoVerdictError on anything that is not a verdict. */
export function parseVerdict(body: unknown): Verdict {
  if (!isRecord(body)) throw new NoVerdictError("the answer is not an object");
  const { decision, findings, firedRules, expiresAt, meta } = body;
  if (decision !== "safe" && decision !== "caution" && decision !== "blocked") {
    throw new NoVerdictError("the answer has no decision");
  }
  if (!Array.isArray(findings) || !Array.isArray(firedRules)) {
    throw new NoVerdictError("the answer has no findings");
  }
  if (typeof expiresAt !== "string" || Number.isNaN(Date.parse(expiresAt))) {
    throw new NoVerdictError("the answer has no expiry");
  }
  if (!isRecord(meta) || typeof meta.requestId !== "string") {
    throw new NoVerdictError("the answer has no request id");
  }

  return {
    decision,
    findings: findings.map((f) => {
      if (
        !isRecord(f) ||
        typeof f.code !== "string" ||
        typeof f.severity !== "string" ||
        typeof f.blocking !== "boolean" ||
        !isRecord(f.values)
      ) {
        throw new NoVerdictError("the answer has a malformed finding");
      }
      const values: Record<string, string> = {};
      for (const [k, v] of Object.entries(f.values)) values[k] = String(v);
      return { code: f.code, severity: f.severity, values, blocking: f.blocking };
    }),
    firedRules: firedRules.map((r) => {
      if (
        !isRecord(r) ||
        typeof r.rule !== "string" ||
        typeof r.code !== "string" ||
        !nullableString(r.limit) ||
        !nullableString(r.actual)
      ) {
        throw new NoVerdictError("the answer has a malformed rule");
      }
      return { rule: r.rule, code: r.code, limit: r.limit, actual: r.actual };
    }),
    expiresAt,
    requestId: meta.requestId,
  };
}

export interface CheckOptions {
  apiUrl?: string | undefined;
  apiKey?: string | undefined;
  policyTemplate?: PolicyTemplate | undefined;
  fetch?: typeof fetch | undefined;
  signal?: AbortSignal | undefined;
}

/**
 * Asks Baret about a proposal. Resolves with a verdict or throws
 * NoVerdictError: a timeout, a refused connection, a non-2xx status and an
 * answer of the wrong shape are all the same thing to the caller.
 */
export async function checkProposal(p: Proposal, options: CheckOptions = {}): Promise<Verdict> {
  const base = (options.apiUrl ?? DEFAULT_API_URL).replace(/\/+$/, "");
  const doFetch = options.fetch ?? fetch;
  const timeout = AbortSignal.timeout(CHECK_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await doFetch(`${base}/v1/analyze`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(options.apiKey ? { authorization: `Bearer ${options.apiKey}` } : {}),
      },
      body: JSON.stringify(buildAnalyzeRequest(p, options.policyTemplate ?? "balanced")),
      signal,
    });
  } catch (cause) {
    throw new NoVerdictError(
      `Baret did not answer: ${cause instanceof Error ? cause.message : "request failed"}`,
    );
  }
  if (!response.ok) throw new NoVerdictError(`Baret answered ${response.status}`);

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new NoVerdictError("the answer is not JSON");
  }
  return parseVerdict(body);
}

/**
 * May this proposal go on to the wallet?
 *
 * Safe: yes. Blocked: never. Caution: only when the caller said so, because a
 * Caution is a finding for a person to read and an agent cannot read it. A
 * verdict past its expiry is not a verdict any more.
 */
export function gate(verdict: Verdict, options: { acceptCaution: boolean; nowMs: number }): Gate {
  if (Date.parse(verdict.expiresAt) <= options.nowMs) return { allowed: false, reason: "expired" };
  if (verdict.decision === "blocked") return { allowed: false, reason: "blocked" };
  if (verdict.decision === "caution") {
    return options.acceptCaution
      ? { allowed: true, reason: "caution-accepted" }
      : { allowed: false, reason: "caution" };
  }
  return { allowed: true, reason: "safe" };
}

/** One line per finding for the agent: the code and the values behind it. */
export function reasons(verdict: Verdict): string[] {
  return verdict.findings.map((f) => {
    const values = Object.entries(f.values)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ");
    return `${f.code}${f.blocking ? " (blocks)" : ""}${values ? ` ${values}` : ""}`;
  });
}

/** What the wallet returned for a submitted proposal. */
export interface SubmitOutcome {
  status: string;
  hash?: string;
  failure?: string;
  pollingId?: string;
}

export interface GuardedSendResult {
  sent: boolean;
  gate: Gate;
  verdict: Verdict;
  outcome?: SubmitOutcome;
}

/**
 * Check first, then hand the proposal to the wallet, or do not hand it over.
 * `submit` is only ever called behind an open gate, and `check` throwing
 * leaves it uncalled.
 */
export async function guardedSend(
  proposal: Proposal,
  deps: {
    check: (p: Proposal) => Promise<Verdict>;
    submit: (p: Proposal) => Promise<SubmitOutcome>;
    now?: () => number;
  },
  options: { acceptCaution: boolean },
): Promise<GuardedSendResult> {
  const verdict = await deps.check(proposal);
  const decided = gate(verdict, {
    acceptCaution: options.acceptCaution,
    nowMs: (deps.now ?? Date.now)(),
  });
  if (!decided.allowed) return { sent: false, gate: decided, verdict };
  return { sent: true, gate: decided, verdict, outcome: await deps.submit(proposal) };
}

/** The address the wallet would send from, out of the Agent Wallet's state. */
export function activeAddress(state: unknown): string | null {
  if (!isRecord(state)) return null;
  const selected = state.selectedWallet;
  if (isRecord(selected)) {
    const ref = selected.ref;
    if (isRecord(ref) && typeof ref.address === "string" && ADDRESS.test(ref.address.trim())) {
      return ref.address.trim();
    }
  }
  for (const key of ["byokWallets", "remoteWallets"]) {
    const list = state[key];
    if (!Array.isArray(list)) continue;
    for (const wallet of list) {
      if (isRecord(wallet) && typeof wallet.address === "string" && ADDRESS.test(wallet.address)) {
        return wallet.address;
      }
    }
  }
  return null;
}
