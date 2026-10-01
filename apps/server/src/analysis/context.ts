import type {
  FindingCode,
  GuardPolicy,
  GuardPolicyField,
  PaymentContext,
  SourceStatus,
} from "@baret/guard";
import type { Address } from "viem";
import type { NetworkConfig } from "../config/env.js";
import type { NormalizedTx } from "../simulation/decode.js";
import type { CallTrace } from "../simulation/trace.js";
import type { Credential, NansenProfile, RegistryEntry } from "../sources/types.js";
import type { Effects } from "./effects.js";

export interface TokenMeta {
  symbol: string;
  decimals: number;
}

/** A source lookup: the answers, or null when the source did not answer. */
export interface Lookup<T> {
  status: SourceStatus["status"];
  data: Map<Address, T> | null;
}

export interface DelegateCall {
  /** The contract whose storage and funds the borrowed code runs with. */
  contract: Address;
  codeFrom: Address;
  /** The target is the contract's own EIP-1967 implementation: a standard proxy. */
  standardProxy: boolean;
}

/**
 * Everything the detectors and the policy engine read. Built by the pipeline,
 * which does all the I/O; detectors are pure functions of this object.
 */
export interface AnalysisContext {
  network: NetworkConfig;
  policy: GuardPolicy;
  now: number;
  user: Address;
  tx: NormalizedTx | null;
  simulation: {
    ran: boolean;
    ok: boolean;
    revertReason: string | null;
    traced: boolean;
    /** The gas limit the network will charge for: the sender's, else the estimate. */
    gasLimit: bigint | null;
  };
  trace: CallTrace | null;
  effects: Effects;
  delegateCalls: DelegateCall[];
  selfdestructs: Address[];
  /** Touched addresses that hold code. */
  contracts: Address[];
  /** Addresses that receive funds, rights or calls from the user. */
  counterparties: Address[];
  /** Addresses that receive value from the user (compliance applies to these). */
  recipients: Address[];
  tokens: Map<Address, TokenMeta>;
  /** Balances at the simulation block, base units. Null when the read failed. */
  balancesBefore: { native: bigint | null; tokens: Map<Address, bigint | null> };
  /** The network fee in MON base units, null when it cannot be priced. */
  feeWei: bigint | null;
  nansen: Lookup<NansenProfile>;
  registry: Lookup<RegistryEntry>;
  compliance: Lookup<Credential | null>;
  payment: PaymentContext | null;
}

/** A finding before the policy engine decides it. */
export interface FindingDraft {
  code: FindingCode;
  values: Record<string, string>;
  details?: Record<string, unknown>;
  /** The rule field that produced it, for codes several fields can produce. */
  rule?: GuardPolicyField;
}

export type Detector = (ctx: AnalysisContext) => FindingDraft[];
