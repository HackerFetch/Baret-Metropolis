import { type AnalyzeResponse, TransactionGuard } from "@baret/guard";
import {
  createWalletChain,
  type Receipt,
  Wallet,
  type WalletCall,
  type WalletSession,
} from "@baret/wallet-core";
import { fromUnits } from "@baret/wallet-ui/data/format";
import type { Asset, GuardPolicy } from "@baret/wallet-ui/data/types";
import type { Hex } from "viem";
import type { HDAccount } from "viem/accounts";
import { accountOf } from "../core/keystore.js";
import { session } from "../core/storage.js";
import { API_URL, RPC_URL } from "./source.js";

/**
 * The live wallet's working parts, for the popup and the options page: the
 * account, Monad, and Baret's check before every signature.
 *
 * The account is made from the open phrase each time it is needed and is
 * never kept in a variable: when the wallet locks, the phrase leaves session
 * storage and the next call here finds nothing to sign with.
 *
 * Signing goes through `@baret/wallet-core`'s `Wallet`, the same class the
 * web wallet uses: Safe signs, Caution signs only when the reader chose to,
 * Blocked and an expired verdict never do.
 */

/** Test USDC on Monad testnet: the wallet's second asset. */
export const USDC = "0x534b2f3A21130d7a60830c2Df862319e593943A3" as const;

export const EXPLORER = "https://testnet.monadexplorer.com";

let sharedChain: ReturnType<typeof createWalletChain> | null = null;
export function chain(): ReturnType<typeof createWalletChain> {
  sharedChain ??= createWalletChain({ rpcUrl: RPC_URL });
  return sharedChain;
}

export const guard = new TransactionGuard({ baseUrl: API_URL });

/** The open account, or null while the wallet is locked. */
export async function openAccount(): Promise<HDAccount | null> {
  const phrase = await session.phrase();
  return phrase ? accountOf(phrase) : null;
}

/** The signer for one request, bound to the rules as they are now. */
export async function walletFor(policy: GuardPolicy): Promise<Wallet | null> {
  const account = await openAccount();
  if (!account) return null;
  return new Wallet({
    // Only the address and the viem account are read from a session.
    session: { address: account.address, account } as unknown as WalletSession,
    chain: chain(),
    baretUrl: API_URL,
    policy: () => policy as never,
    guard,
  });
}

/** The most the network may charge for the call, in MON; "0" when it cannot be estimated. */
export async function feeOf(from: string, call: WalletCall): Promise<string> {
  try {
    const tx = await chain().prepare(from as Hex, call);
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

/** MON and test USDC of an address, as the screens show them. */
export async function balancesOf(address: string): Promise<Asset[]> {
  const balances = await chain().balances(address as Hex, [USDC]);
  return balances.map((b) => ({
    symbol: b.symbol,
    balance: fromUnits(b.amount, b.decimals, { min: 2, max: 6 }),
    decimals: b.decimals,
    contract: b.token,
  })) as Asset[];
}

export type { AnalyzeResponse, Receipt, WalletCall };
