import { MONAD_NETWORKS, type MonadNetwork } from "@baret/guard";
import {
  type Address,
  createPublicClient,
  erc20Abi,
  type Hex,
  http,
  type PublicClient,
  type TransactionSerializable,
  zeroAddress,
} from "viem";
import { PAYMENT_GUARD_ABI, PAYMENT_GUARD_FACTORY_ABI, type WalletCall } from "./calls.js";
import { WALLET_CONTRACTS } from "./constants.js";

/** A balance in base units. `token` is null for MON. */
export interface Balance {
  token: Address | null;
  symbol: string;
  decimals: number;
  amount: bigint;
}

export interface MerchantState {
  address: Address;
  perPayment: bigint;
  /** Null: no hourly limit. */
  perHour: bigint | null;
  perDay: bigint;
  spentLastHour: bigint;
  spentLastDay: bigint;
  status: "active" | "paused" | "removed";
}

export interface VaultState {
  address: Address;
  token: Address;
  balance: bigint;
  /** What the owner may withdraw: the balance above the merchants' reserve. */
  unreserved: bigint;
  reserved: bigint;
  /** Null when no agent is authorised. */
  agent: Address | null;
  merchants: MerchantState[];
}

/** What a transaction did, once it is in a block. */
export interface Receipt {
  hash: Hex;
  ok: boolean;
  block: bigint;
  /** In wei. */
  fee: bigint;
}

/** The chain as the wallet needs it. An interface so tests run without a node. */
export interface WalletChain {
  balances(owner: Address, tokens: readonly Address[]): Promise<Balance[]>;
  /** The owner's latest vault from the factory, or null when there is none. */
  findVault(owner: Address): Promise<Address | null>;
  /**
   * A vault's state. The contract cannot list its merchants, so the wallet
   * passes the addresses it has added (it keeps them with its own settings).
   */
  vault(vault: Address, merchants: readonly Address[]): Promise<VaultState>;
  prepare(from: Address, call: WalletCall): Promise<TransactionSerializable>;
  send(raw: Hex): Promise<Hex>;
  wait(hash: Hex): Promise<Receipt>;
}

export function createWalletChain(options: {
  rpcUrl: string;
  network?: MonadNetwork;
  client?: PublicClient;
}): WalletChain {
  const network = options.network ?? "testnet";
  const chainId = MONAD_NETWORKS[network].chainId;
  const client =
    options.client ??
    createPublicClient({ transport: http(options.rpcUrl, { batch: { wait: 10 } }) });
  const contracts = WALLET_CONTRACTS[network];

  return {
    async balances(owner, tokens) {
      const [native, ...rest] = await Promise.all([
        client.getBalance({ address: owner }),
        ...tokens.map((address) =>
          Promise.all([
            client.readContract({
              address,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [owner],
            }),
            client.readContract({ address, abi: erc20Abi, functionName: "symbol" }),
            client.readContract({ address, abi: erc20Abi, functionName: "decimals" }),
          ]),
        ),
      ]);
      return [
        { token: null, symbol: "MON", decimals: 18, amount: native },
        ...rest.map(([amount, symbol, decimals], i) => ({
          token: tokens[i] as Address,
          symbol,
          decimals,
          amount,
        })),
      ];
    },

    async findVault(owner) {
      if (!contracts) return null;
      const found = await client.readContract({
        address: contracts.paymentGuardFactory,
        abi: PAYMENT_GUARD_FACTORY_ABI,
        functionName: "latestVault",
        args: [owner],
      });
      return found === zeroAddress ? null : found;
    },

    async vault(address, merchants) {
      const read = <T>(functionName: string, args: readonly unknown[] = []) =>
        client.readContract({ address, abi: PAYMENT_GUARD_ABI, functionName, args } as Parameters<
          typeof client.readContract
        >[0]) as Promise<T>;
      const [token, agent, reserved, unreserved, states] = await Promise.all([
        read<Address>("token"),
        read<Address>("agent"),
        read<bigint>("totalReserved"),
        read<bigint>("unreserved"),
        Promise.all(
          merchants.map((m) =>
            Promise.all([
              read<readonly [bigint, bigint, bigint, boolean, boolean]>("merchant", [m]),
              read<readonly [bigint, bigint]>("spent", [m]),
            ]),
          ),
        ),
      ]);
      const balance = await client.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      });
      return {
        address,
        token,
        balance,
        unreserved,
        reserved,
        agent: agent === zeroAddress ? null : agent,
        merchants: states.map(
          ([[perPayment, perHour, perDay, active, paused], [hour, day]], i) => ({
            address: merchants[i] as Address,
            perPayment,
            perHour: perHour === 0n ? null : perHour,
            perDay,
            spentLastHour: hour,
            spentLastDay: day,
            status: !active ? "removed" : paused ? "paused" : "active",
          }),
        ),
      };
    },

    async prepare(from, call) {
      const request = { account: from, to: call.to, data: call.data, value: call.value };
      const [nonce, gas, fees] = await Promise.all([
        client.getTransactionCount({ address: from, blockTag: "pending" }),
        client.estimateGas(request),
        client.estimateFeesPerGas(),
      ]);
      return {
        chainId,
        type: "eip1559",
        to: call.to,
        data: call.data,
        value: call.value,
        nonce,
        // Monad charges for the whole limit, so the margin is kept small.
        gas: (gas * 110n) / 100n,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      };
    },

    send: (raw) => client.sendRawTransaction({ serializedTransaction: raw }),

    async wait(hash) {
      const r = await client.waitForTransactionReceipt({ hash, timeout: 60_000 });
      return {
        hash,
        ok: r.status === "success",
        block: r.blockNumber,
        fee: r.gasUsed * r.effectiveGasPrice,
      };
    },
  };
}
