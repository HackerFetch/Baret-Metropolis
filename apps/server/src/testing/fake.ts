import { type AnalyzeRequest, BALANCED_POLICY, createPolicy, type GuardPolicy } from "@baret/guard";
import {
  type Address,
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionData,
  type Hex,
  maxUint256,
  pad,
} from "viem";
import type { AnalyzeDeps } from "../application/analyze.js";
import type { AppConfig, NetworkConfig } from "../config/env.js";
import {
  type CallOutcome,
  type MonadRpc,
  type RawCallFrame,
  RpcUnavailableError,
} from "../infra/rpc.js";
import { KNOWN_EVENTS, KNOWN_FUNCTIONS } from "../simulation/abi.js";
import type { Credential, NansenProfile, RegistryEntry, Sources } from "../sources/types.js";

export const USER = "0x1111111111111111111111111111111111111111" as Address;
export const USDC = "0x2222222222222222222222222222222222222222" as Address;
export const DAPP = "0x3333333333333333333333333333333333333333" as Address;
export const PEER = "0x4444444444444444444444444444444444444444" as Address;
export const DRAINER = "0x5555555555555555555555555555555555555555" as Address;
export const FAKE_USDC = "0x6666666666666666666666666666666666666666" as Address;
export const NFT = "0x7777777777777777777777777777777777777777" as Address;
export const IMPL = "0x8888888888888888888888888888888888888888" as Address;
export const SHOP = "0x9999999999999999999999999999999999999999" as Address;

export const NOW = 1_800_000_000;
export const ONE_MON = 10n ** 18n;
export const ONE_USDC = 10n ** 6n;

export const network: NetworkConfig = {
  network: "testnet",
  chainId: 10143,
  rpcUrl: "http://fake",
  traceRpcUrl: "http://fake",
  usdcAddress: USDC,
  reputationRegistryAddress: null,
  knownContracts: [],
  paymentGuardFactoryAddress: null,
  cleanverse: null,
};

export const config: AppConfig = {
  port: 0,
  host: "127.0.0.1",
  logLevel: "fatal",
  networks: { testnet: network },
  apiKeys: [],
  corsOrigins: [],
  rateLimitPerMinute: 1000,
  explainRateLimitPerMinute: 1000,
  requestTimeoutMs: 1000,
  verdictTtlSeconds: 30,
  nansenApiKey: null,
  nansenMode: "funder",
  envioEndpoint: null,
  explain: null,
  policyDraftRateLimitPerMinute: 1000,
  kimiDailyLimit: 500,
  reviewRateLimitPerMinute: 1000,
  review: null,
  nansenLabelsDailyLimit: 25,
  sealedRateLimitPerMinute: 1000,
  sealed: null,
};

/** An in-memory chain. Everything defaults to an empty, healthy state. */
export class FakeRpc implements MonadRpc {
  native = new Map<Address, bigint>([[USER, 100n * ONE_MON]]);
  code = new Map<Address, Hex>();
  storage = new Map<string, Hex>();
  erc20 = new Map<string, bigint>([[`${USDC}:${USER}`, 1_000n * ONE_USDC]]);
  meta = new Map<Address, { symbol: string; decimals: number }>([
    [USDC, { symbol: "USDC", decimals: 6 }],
    [FAKE_USDC, { symbol: "USDC", decimals: 6 }],
  ]);
  outcome: CallOutcome = { ok: true, returnData: "0x" };
  frame: RawCallFrame | null = null;
  estimate: bigint | null = 50_000n;
  gasPrice = 100n * 10n ** 9n;
  down = false;
  balanceFails = false;

  private check() {
    if (this.down) throw new RpcUnavailableError("rpc down");
  }
  chainId = 10143;
  async getChainId() {
    this.check();
    return this.chainId;
  }
  async verifyChain() {
    this.check();
    if (this.chainId !== 10143) throw new RpcUnavailableError(`RPC is on chain ${this.chainId}`);
  }
  async getBlockNumber() {
    this.check();
    return 1_000n;
  }
  async getGasPrice() {
    return this.gasPrice;
  }
  async getBalance(a: Address) {
    if (this.balanceFails) throw new Error("balance read failed");
    return this.native.get(a) ?? 0n;
  }
  async getCode(a: Address) {
    return this.code.get(a) ?? "0x";
  }
  async getStorageAt(a: Address, slot: Hex) {
    return this.storage.get(`${a}:${slot}`) ?? "0x";
  }
  async call() {
    return this.outcome;
  }
  async estimateGas() {
    return this.estimate;
  }
  async traceCall() {
    return this.frame;
  }
  async erc20Balance(token: Address, owner: Address) {
    return this.erc20.get(`${token}:${owner}`) ?? 0n;
  }
  vaults = new Set<Address>();
  async factoryVaults(_factory: Address, addresses: readonly Address[]) {
    return addresses.filter((a) => this.vaults.has(a));
  }
  async erc20Meta(token: Address) {
    return this.meta.get(token) ?? { symbol: null, decimals: null };
  }
}

/** Sources that answer "nothing known" for every address. */
export function cleanSources(
  overrides: {
    nansen?: Partial<Record<Address, Partial<NansenProfile>>> | null;
    registry?: Partial<Record<Address, RegistryEntry>> | null;
    compliance?: Partial<Record<Address, Credential | null>> | null;
    /** Tokens the compliance source reports as compliant assets. */
    gated?: Address[];
  } = {},
): Sources {
  const nansen = overrides.nansen === undefined ? {} : overrides.nansen;
  const registry = overrides.registry === undefined ? {} : overrides.registry;
  const compliance = overrides.compliance === undefined ? {} : overrides.compliance;
  return {
    nansen: nansen && {
      lookup: async (as) =>
        new Map(
          as.map((a) => [
            a,
            {
              trustLevel: "established",
              flagged: false,
              freshWallet: false,
              whale: false,
              ...nansen[a],
            },
          ]),
        ),
    },
    registry: registry && {
      lookup: async (as) =>
        new Map(as.map((a) => [a, registry[a] ?? { flagged: false, severity: 0, reasonCode: "" }])),
    },
    compliance: compliance && {
      lookup: async (as) => new Map(as.map((a) => [a, compliance[a] ?? null])),
      gatedTokens: async (tokens) => tokens.filter((t) => overrides.gated?.includes(t)),
    },
  };
}

export function deps(rpc: FakeRpc, sources: Sources = cleanSources()): AnalyzeDeps {
  return { config, rpcFor: () => rpc, sourcesFor: () => sources, now: () => NOW };
}

export const policy = (over: Partial<GuardPolicy> = {}): GuardPolicy => ({
  ...createPolicy("balanced", { allowedAssets: [USDC] }),
  ...over,
});

export const tx = (over: Partial<NonNullable<AnalyzeRequest["transaction"]>> = {}) => ({
  network: "testnet" as const,
  transaction: { from: USER, ...over },
  policy: policy(),
});

// ── calldata and trace builders ──

export const calldata = encodeFunctionData as unknown as (args: {
  abi: typeof KNOWN_FUNCTIONS;
  functionName: string;
  args: readonly unknown[];
}) => Hex;

export const approveData = (spender: Address, amount: bigint) =>
  calldata({ abi: KNOWN_FUNCTIONS, functionName: "approve", args: [spender, amount] });

export function log(
  address: Address,
  eventName: "Transfer" | "Approval" | "ApprovalForAll" | "OwnershipTransferred",
  args: Record<string, unknown>,
  data: { types: { type: string }[]; values: unknown[] },
) {
  const topics = encodeEventTopics({
    abi: KNOWN_EVENTS,
    eventName,
    args,
  } as Parameters<typeof encodeEventTopics>[0]) as Hex[];
  return { address, topics, data: encodeAbiParameters(data.types, data.values) };
}

export const transferLog = (token: Address, from: Address, to: Address, value: bigint) =>
  log(token, "Transfer", { from, to }, { types: [{ type: "uint256" }], values: [value] });

export const approvalLog = (token: Address, owner: Address, spender: Address, value: bigint) =>
  log(token, "Approval", { owner, spender }, { types: [{ type: "uint256" }], values: [value] });

export const frame = (f: Partial<RawCallFrame> & { to?: string }): RawCallFrame => ({
  type: "CALL",
  from: USER,
  value: "0x0",
  input: "0x",
  ...f,
});

export const implSlotValue = (impl: Address) => pad(impl, { size: 32 });
export { BALANCED_POLICY, maxUint256 };
