import {
  type Address,
  BaseError,
  CallExecutionError,
  ContractFunctionRevertedError,
  createPublicClient,
  erc20Abi,
  type Hex,
  http,
  type PublicClient,
} from "viem";
import type { NetworkConfig } from "../config/env.js";

export interface CallParams {
  from: Address;
  to: Address | null;
  data: Hex;
  value: bigint;
  gas: bigint | null;
}

export type CallOutcome =
  | { ok: true; returnData: Hex }
  | { ok: false; revertReason: string | null; revertData: Hex | null };

/** One `callTracer` frame, as returned by `debug_traceCall` with `withLog`. */
export interface RawCallFrame {
  type: string;
  from: string;
  to?: string;
  value?: string;
  gas?: string;
  gasUsed?: string;
  input?: string;
  output?: string;
  error?: string;
  revertReason?: string;
  calls?: RawCallFrame[];
  logs?: { address: string; topics: string[]; data: string }[];
}

/** The RPC did not answer. Distinct from a revert, which is a valid answer. */
export class RpcUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RpcUnavailableError";
  }
}

/**
 * The chain reads the analysis needs. An interface so tests drive the whole
 * pipeline with an in-memory fake instead of a node. Implementations throw
 * RpcUnavailableError when the node does not answer; the API turns that into
 * a 503, never into a verdict.
 */
export interface MonadRpc {
  getChainId(): Promise<number>;
  getBlockNumber(): Promise<bigint>;
  getGasPrice(): Promise<bigint>;
  getBalance(address: Address, block: bigint): Promise<bigint>;
  getCode(address: Address, block: bigint): Promise<Hex>;
  getStorageAt(address: Address, slot: Hex, block: bigint): Promise<Hex>;
  call(params: CallParams, block: bigint): Promise<CallOutcome>;
  estimateGas(params: CallParams, block: bigint): Promise<bigint | null>;
  /** Null when the node does not offer `debug_traceCall`. */
  traceCall(params: CallParams, block: bigint): Promise<RawCallFrame | null>;
  erc20Balance(token: Address, owner: Address, block: bigint): Promise<bigint | null>;
  erc20Meta(token: Address): Promise<{ symbol: string | null; decimals: number | null }>;
}

const toHex = (n: bigint) => `0x${n.toString(16)}` as Hex;

function revertReasonOf(err: unknown): string | null {
  if (err instanceof BaseError) {
    const reverted = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) return reverted.reason ?? null;
    return err.shortMessage;
  }
  return null;
}

/** A node answering "execution reverted" is a result; anything else is an outage. */
function isRevert(err: unknown): boolean {
  if (!(err instanceof BaseError)) return false;
  const msg = `${err.shortMessage} ${err.details ?? ""}`.toLowerCase();
  return (
    err instanceof CallExecutionError &&
    (msg.includes("revert") || msg.includes("out of gas") || msg.includes("insufficient"))
  );
}

export class ViemMonadRpc implements MonadRpc {
  private readonly client: PublicClient;
  private traceSupported: boolean | null = null;

  constructor(config: NetworkConfig, timeoutMs: number) {
    this.client = createPublicClient({
      transport: http(config.rpcUrl, { timeout: timeoutMs, retryCount: 1 }),
    });
  }

  private async guard<T>(what: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (cause) {
      throw new RpcUnavailableError(`${what} failed`, { cause });
    }
  }

  getChainId() {
    return this.guard("eth_chainId", () => this.client.getChainId());
  }

  getBlockNumber() {
    return this.guard("eth_blockNumber", () => this.client.getBlockNumber({ cacheTime: 0 }));
  }

  getGasPrice() {
    return this.guard("eth_gasPrice", () => this.client.getGasPrice());
  }

  getBalance(address: Address, block: bigint) {
    return this.guard("eth_getBalance", () =>
      this.client.getBalance({ address, blockNumber: block }),
    );
  }

  getCode(address: Address, block: bigint) {
    return this.guard("eth_getCode", async () => {
      const code = await this.client.getCode({ address, blockNumber: block });
      return code ?? "0x";
    });
  }

  getStorageAt(address: Address, slot: Hex, block: bigint) {
    return this.guard("eth_getStorageAt", async () => {
      const v = await this.client.getStorageAt({ address, slot, blockNumber: block });
      return v ?? "0x";
    });
  }

  async call(params: CallParams, block: bigint): Promise<CallOutcome> {
    try {
      const res = await this.client.call({
        account: params.from,
        to: params.to ?? undefined,
        data: params.data,
        value: params.value,
        ...(params.gas != null ? { gas: params.gas } : {}),
        blockNumber: block,
      });
      return { ok: true, returnData: res.data ?? "0x" };
    } catch (err) {
      if (isRevert(err)) {
        const data =
          err instanceof BaseError
            ? ((
                err.walk((e) => typeof (e as { data?: unknown }).data === "string") as {
                  data?: Hex;
                } | null
              )?.data ?? null)
            : null;
        return { ok: false, revertReason: revertReasonOf(err), revertData: data };
      }
      throw new RpcUnavailableError("eth_call failed", { cause: err });
    }
  }

  async estimateGas(params: CallParams, block: bigint): Promise<bigint | null> {
    try {
      return await this.client.estimateGas({
        account: params.from,
        to: params.to ?? undefined,
        data: params.data,
        value: params.value,
        blockNumber: block,
      });
    } catch {
      // A revert makes estimation fail too; the call result already says so.
      return null;
    }
  }

  async traceCall(params: CallParams, block: bigint): Promise<RawCallFrame | null> {
    if (this.traceSupported === false) return null;
    const callObject: Record<string, string> = {
      from: params.from,
      data: params.data,
      value: toHex(params.value),
    };
    if (params.to) callObject.to = params.to;
    if (params.gas != null) callObject.gas = toHex(params.gas);
    try {
      // debug_ methods are not in viem's typed RPC schema.
      const request = this.client.request as unknown as (args: {
        method: string;
        params: unknown[];
      }) => Promise<unknown>;
      const frame = (await request({
        method: "debug_traceCall",
        params: [
          callObject,
          toHex(block),
          { tracer: "callTracer", tracerConfig: { withLog: true } },
        ],
      })) as RawCallFrame;
      this.traceSupported = true;
      return frame;
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      if (msg.includes("method") && (msg.includes("not") || msg.includes("unsupported"))) {
        this.traceSupported = false;
      }
      return null;
    }
  }

  async erc20Balance(token: Address, owner: Address, block: bigint): Promise<bigint | null> {
    try {
      return await this.client.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [owner],
        blockNumber: block,
      });
    } catch {
      return null;
    }
  }

  async erc20Meta(token: Address) {
    const [symbol, decimals] = await Promise.all([
      this.client
        .readContract({ address: token, abi: erc20Abi, functionName: "symbol" })
        .catch(() => null),
      this.client
        .readContract({ address: token, abi: erc20Abi, functionName: "decimals" })
        .catch(() => null),
    ]);
    return { symbol, decimals };
  }
}
