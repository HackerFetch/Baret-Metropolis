import { randomUUID } from "node:crypto";
import {
  type AnalyzeRequest,
  type AnalyzeResponse,
  type ApprovalChange,
  analyzeResponseSchema,
  type BalanceChange,
  createPolicy,
  type GuardPolicy,
  type SourceName,
  type SourceStatus,
  type Suggestion,
} from "@baret/guard";
import { type Address, getAddress } from "viem";
import type { AnalysisContext, DelegateCall, Lookup, TokenMeta } from "../analysis/context.js";
import {
  type Effects,
  effectsFromCalldata,
  effectsFromTrace,
  effectsFromTypedData,
} from "../analysis/effects.js";
import { tokenMeta } from "../analysis/format.js";
import type { AppConfig, NetworkConfig } from "../config/env.js";
import type { CallParams, MonadRpc } from "../infra/rpc.js";
import { decide, netDelta, policyFindings } from "../policy/evaluate.js";
import { runDetectors } from "../risk/index.js";
import { PROXY_IMPLEMENTATION_SLOTS } from "../simulation/abi.js";
import { decodeTransaction, type NormalizedTx } from "../simulation/decode.js";
import { type CallTrace, parseCallTrace } from "../simulation/trace.js";
import type { Sources } from "../sources/types.js";
import type { Explainer } from "./explain.js";

export const ANALYSIS_VERSION = "1";
/** Bounds the reads one request can cause. */
const MAX_ADDRESSES = 40;

export class AnalyzeInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyzeInputError";
  }
}

export interface AnalyzeDeps {
  config: AppConfig;
  rpcFor: (network: NetworkConfig) => MonadRpc;
  sourcesFor: (network: NetworkConfig) => Sources;
  now?: () => number;
  /** Writes /v1/explain's words. Absent or null: that route answers 503. */
  explainer?: Explainer | null;
}

async function lookup<T>(
  source: { lookup(a: readonly Address[]): Promise<Map<Address, T>> } | null,
  addresses: Address[],
): Promise<Lookup<T>> {
  if (!source) return { status: "unavailable", data: null };
  if (addresses.length === 0) return { status: "ok", data: new Map() };
  try {
    return { status: "ok", data: await source.lookup(addresses) };
  } catch {
    return { status: "unavailable", data: null };
  }
}

const uniq = (xs: (Address | null | undefined)[]): Address[] => [
  ...new Set(xs.filter((x): x is Address => Boolean(x))),
];

export async function analyze(req: AnalyzeRequest, deps: AnalyzeDeps): Promise<AnalyzeResponse> {
  const network = deps.config.networks[req.network];
  if (!network) throw new AnalyzeInputError(`this server does not serve Monad ${req.network}`);
  const rpc = deps.rpcFor(network);
  const sources = deps.sourcesFor(network);
  const now = deps.now?.() ?? Math.floor(Date.now() / 1000);

  const policy: GuardPolicy =
    req.policy ??
    createPolicy(req.policyTemplate ?? "balanced", {
      allowedAssets: network.usdcAddress ? [network.usdcAddress] : [],
    });

  await rpc.verifyChain();
  const block = await rpc.getBlockNumber();

  // 1. Simulate, or read the signed message.
  let tx: NormalizedTx | null = null;
  let user: Address;
  let effects: Effects;
  let trace: CallTrace | null = null;
  let simulation: AnalysisContext["simulation"] = {
    ran: false,
    ok: true,
    revertReason: null,
    revertData: null,
    traced: false,
    gasLimit: null,
  };
  let feeWei: bigint | null = null;

  if (req.transaction) {
    try {
      tx = await decodeTransaction(
        req.transaction,
        network.chainId,
        req.userWallet ? getAddress(req.userWallet) : null,
      );
    } catch (err) {
      throw new AnalyzeInputError(err instanceof Error ? err.message : String(err));
    }
    user = req.userWallet ? getAddress(req.userWallet) : tx.from;
    const params: CallParams = {
      from: tx.from,
      to: tx.to,
      data: tx.data,
      value: tx.value,
      gas: tx.gas,
    };
    const [outcome, estimate, frame, gasPrice] = await Promise.all([
      rpc.call(params, block),
      rpc.estimateGas(params, block),
      rpc.traceCall(params, block),
      tx.gasPrice ?? rpc.getGasPrice(),
    ]);
    trace = parseCallTrace(frame);
    const gasLimit = tx.gas ?? estimate;
    simulation = {
      ran: true,
      ok: outcome.ok,
      revertReason: outcome.ok ? null : outcome.revertReason,
      revertData: outcome.ok ? null : outcome.revertData,
      traced: trace !== null,
      gasLimit,
    };
    effects = trace && outcome.ok ? effectsFromTrace(trace, user) : effectsFromCalldata(tx, user);
    feeWei = gasLimit !== null ? gasLimit * gasPrice : null;
  } else if (req.typedData) {
    user = getAddress(req.typedData.signer);
    effects = effectsFromTypedData(req.typedData);
  } else {
    throw new AnalyzeInputError("send exactly one of `transaction` or `typedData`");
  }

  const payment = req.payment ?? null;

  // 2. Who and what the request reaches.
  const counterparties = uniq([
    tx?.to,
    ...effects.approvals.map((a) => a.spender),
    ...effects.transfers.filter((t) => t.from === user).map((t) => t.to),
    ...effects.ownership.map((o) => o.newOwner),
    payment ? getAddress(payment.payTo) : null,
  ]).filter((a) => a !== user);
  const recipients = uniq(
    effects.transfers.filter((t) => t.from === user && t.to !== user).map((t) => t.to),
  );
  const candidates = uniq([
    ...(trace?.touched ?? []),
    ...effects.approvals.map((a) => a.contract),
    ...counterparties,
  ])
    .filter((a) => a !== user)
    .slice(0, MAX_ADDRESSES);

  // Collections are asked too: they have a symbol to show, though no decimals.
  const tokenAddresses = uniq([
    ...effects.approvals.map((a) => a.contract),
    ...effects.transfers.map((t) => t.token),
    network.usdcAddress,
    payment ? getAddress(payment.asset) : null,
    ...(payment ? policy.allowedAssets.map((a) => getAddress(a)) : []),
  ]).slice(0, MAX_ADDRESSES);

  const frames = trace?.frames.filter((f) => !f.reverted) ?? [];
  // Reverted delegatecalls are kept: when the whole call fails, a proxy's
  // implementation should still not be reported as an unknown contract.
  const delegateFrames = (trace?.frames ?? []).filter((f) => f.type === "DELEGATECALL" && f.to);
  const selfdestructs = frames.filter((f) => f.type === "SELFDESTRUCT").map((f) => f.from);
  const balanceTokens = uniq([...effects.transfers.map((t) => t.token), network.usdcAddress]);

  const [codes, metas, implSlots, nativeBefore, tokenBefore] = await Promise.all([
    Promise.all(candidates.map((a) => rpc.getCode(a, block))),
    Promise.all(tokenAddresses.map((t) => rpc.erc20Meta(t))),
    Promise.all(
      delegateFrames.map((f) =>
        Promise.all(
          PROXY_IMPLEMENTATION_SLOTS.map((slot) => rpc.getStorageAt(f.from, slot, block)),
        ),
      ),
    ),
    rpc.getBalance(user, block).catch(() => null),
    Promise.all(balanceTokens.map((t) => rpc.erc20Balance(t, user, block))),
  ]);

  const contracts = candidates.filter((_, i) => (codes[i] ?? "0x") !== "0x");

  // A compliant asset demands identity on both sides by itself; ask about it
  // even when the user's rules do not. If the question fails, the simulation
  // still shows whether the asset refuses the transfer.
  const sentTokens = uniq(effects.transfers.filter((t) => t.from === user).map((t) => t.token));
  const gatedAssets =
    sources.compliance && sentTokens.length > 0
      ? await sources.compliance.gatedTokens(sentTokens).catch(() => [])
      : [];
  // Vaults from Baret's own factory are known contracts, like the listed ones.
  const factory = network.paymentGuardFactoryAddress;
  const listed = new Set(network.knownContracts);
  const vaults = factory
    ? await rpc.factoryVaults(
        factory,
        contracts.filter((c) => !listed.has(c)),
        block,
      )
    : [];
  // Cleanverse's own contracts and the compliant assets they govern are known too.
  const cleanverseContracts = network.cleanverse
    ? [network.cleanverse.apass, network.cleanverse.policy, ...gatedAssets]
    : [];
  const knownNetwork: NetworkConfig = {
    ...network,
    knownContracts: [
      ...network.knownContracts,
      ...(factory === null ? [] : [factory, ...vaults]),
      ...cleanverseContracts,
    ],
  };
  const tokens = new Map<Address, TokenMeta>();
  const symbols = new Map<Address, string>();
  tokenAddresses.forEach((t, i) => {
    const m = metas[i];
    if (m?.symbol) symbols.set(t, m.symbol);
    if (m?.symbol && m.decimals !== null) tokens.set(t, { symbol: m.symbol, decimals: m.decimals });
  });
  const delegateCalls: DelegateCall[] = delegateFrames.map((f, i) => {
    const target = f.to?.toLowerCase();
    const standardProxy = (implSlots[i] ?? []).some(
      (slot) => slot.length >= 42 && `0x${slot.slice(-40)}`.toLowerCase() === target,
    );
    return { contract: f.from, codeFrom: f.to as Address, standardProxy, reverted: f.reverted };
  });

  // 3. Reputation and identity.
  const reputationTargets = uniq([...counterparties, ...contracts]).slice(0, MAX_ADDRESSES);
  // Nansen is asked about wallets only: contracts are deployed, not funded or
  // labelled like people, and every call costs credits.
  const contractSet = new Set(contracts);
  const nansenTargets = counterparties.filter((a) => !contractSet.has(a));
  const complianceActive =
    gatedAssets.length > 0 ||
    policy.requireComplianceCheck ||
    policy.allowedCountries.length > 0 ||
    policy.minComplianceTier !== null;
  const [nansen, registry, compliance] = await Promise.all([
    lookup(sources.nansen, nansenTargets),
    lookup(sources.registry, reputationTargets),
    complianceActive && recipients.length > 0
      ? lookup(sources.compliance, uniq([user, ...recipients]))
      : Promise.resolve<Lookup<never>>({ status: "skipped", data: null }),
  ]);

  const ctx: AnalysisContext = {
    network: knownNetwork,
    policy,
    now,
    user,
    tx,
    simulation,
    trace,
    effects,
    delegateCalls,
    selfdestructs,
    contracts,
    counterparties,
    recipients,
    tokens,
    balancesBefore: {
      native: nativeBefore,
      tokens: new Map(balanceTokens.map((t, i) => [t, tokenBefore[i] ?? null])),
    },
    feeWei,
    nansen,
    registry,
    compliance,
    gatedAssets,
    payment,
  };

  // 4. Detect, then decide.
  const verdict = decide(ctx, [...runDetectors(ctx), ...policyFindings(ctx)]);

  const response: AnalyzeResponse = {
    decision: verdict.decision,
    findings: verdict.findings,
    firedRules: verdict.firedRules,
    suggestions: suggestionsFor(verdict.findings),
    confidence: confidenceOf(ctx, verdict.findings),
    estimatedChanges: balanceChanges(ctx),
    approvals: effects.approvals.map(
      (a): ApprovalChange => ({
        owner: user,
        kind: a.kind,
        contract: a.contract,
        symbol: symbols.get(a.contract) ?? null,
        decimals: tokens.get(a.contract)?.decimals ?? null,
        spender: a.spender,
        amount: a.amount?.toString() ?? null,
        unlimited: a.unlimited,
      }),
    ),
    sources: sourceStatuses(ctx, sources, verdict.findings),
    expiresAt: new Date((now + deps.config.verdictTtlSeconds) * 1000).toISOString(),
    meta: {
      requestId: randomUUID(),
      analysisVersion: ANALYSIS_VERSION,
      network: network.network,
      chainId: network.chainId,
      analyzedAt: new Date(now * 1000).toISOString(),
      blockNumber: block.toString(),
      traced: simulation.traced,
      ...(req.integratorRequestId ? { integratorRequestId: req.integratorRequestId } : {}),
    },
  };
  // The response is a contract with every client: never send one that breaks it.
  return analyzeResponseSchema.parse(response);
}

function balanceChanges(ctx: AnalysisContext): BalanceChange[] {
  const assets = uniq(ctx.effects.transfers.filter((t) => !t.nft).map((t) => t.token));
  const rows: BalanceChange[] = [];
  const row = (token: Address | null) => {
    const delta = netDelta(ctx, token);
    if (delta === null || (delta === 0n && token !== null)) return;
    const meta = tokenMeta(ctx, token);
    const pre =
      token === null ? ctx.balancesBefore.native : (ctx.balancesBefore.tokens.get(token) ?? null);
    rows.push({
      account: ctx.user,
      asset: {
        kind: token === null ? "native" : "erc20",
        address: token,
        symbol: meta.symbol,
        decimals: meta.decimals,
      },
      before: pre?.toString() ?? null,
      after: pre === null ? null : (pre + delta).toString(),
      delta: delta.toString(),
    });
  };
  if (ctx.tx || ctx.effects.transfers.some((t) => t.token === null)) row(null);
  for (const token of assets) row(token);
  return rows;
}

function suggestionsFor(findings: AnalyzeResponse["findings"]): Suggestion[] {
  return findings
    .filter((f) => f.code === "ERC20_APPROVAL_UNLIMITED" && f.values.amount)
    .map((f) => ({
      code: f.code,
      values: { amount: f.values.amount ?? "", asset: f.values.asset ?? "" },
    }));
}

function confidenceOf(
  ctx: AnalysisContext,
  findings: AnalyzeResponse["findings"],
): AnalyzeResponse["confidence"] {
  if (!ctx.simulation.ok) return "low";
  if (findings.some((f) => f.code.endsWith("_UNAVAILABLE"))) return "low";
  if (ctx.simulation.ran && !ctx.simulation.traced) return "medium";
  if (!ctx.simulation.ran) return "medium";
  return "high";
}

function sourceStatuses(
  ctx: AnalysisContext,
  sources: Sources,
  findings: AnalyzeResponse["findings"],
): SourceStatus[] {
  const reputationUsed = findings.some((f) => f.code === "REPUTATION_DATA_UNAVAILABLE");
  const status = (configured: boolean, l: Lookup<unknown>, needed: boolean) =>
    !configured && !needed ? "skipped" : l.status;
  const list: [SourceName, SourceStatus["status"]][] = [
    ["alchemy", "ok"],
    ["nansen", status(sources.nansen !== null, ctx.nansen, reputationUsed)],
    ["reputation-registry", status(sources.registry !== null, ctx.registry, reputationUsed)],
    ["cleanverse", ctx.compliance.status],
  ];
  return list.map(([name, s]) => ({ name, status: s }));
}
