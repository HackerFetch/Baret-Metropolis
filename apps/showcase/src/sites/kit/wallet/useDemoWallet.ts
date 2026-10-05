import { type Address, isAddress } from "viem";
import { addressOf, useWallet, type WalletState } from "./store.js";

/**
 * What a demo site needs from the wallet: the address its live checks
 * simulate from, and the MON that address holds.
 */

const envFrom: unknown = import.meta.env.VITE_BARET_DEMO_FROM;

/**
 * A developer's stand-in for a wallet: a funded testnet address in
 * VITE_BARET_DEMO_FROM (no key; Baret only simulates). A connected wallet
 * always wins over it. Unset, a site with no wallet shows its samples and
 * never calls the API.
 */
export const DEMO_FROM: Address | null =
  typeof envFrom === "string" && isAddress(envFrom) ? envFrom : null;

/** The chain every live check runs on: Monad testnet. */
export const MONAD_TESTNET_ID = 10143;

export interface DemoWallet {
  readonly wallet: WalletState;
  /** Where live checks simulate from: the connected wallet, else the test address. */
  readonly from: Address | null;
  readonly live: boolean;
  /** MON in wei for the connected wallet once read; null otherwise. */
  readonly balance: bigint | null;
}

export function useDemoWallet(): DemoWallet {
  const wallet = useWallet();
  const connected = addressOf(wallet);
  const from = connected ?? DEMO_FROM;
  return { wallet, from, live: from !== null, balance: connected ? wallet.balance : null };
}

/** Whether a request of `wei` asks for more MON than a known balance holds. */
export function exceeds(wei: bigint, balance: bigint | null): boolean {
  return balance !== null && wei > balance;
}

/** Wei to MON for display: at most four decimals, cut (never rounded up), no trailing zeros. */
export function formatMon(wei: bigint): string {
  const base = 10n ** 18n;
  const whole = (wei / base).toString();
  const fraction = (wei % base).toString().padStart(18, "0").slice(0, 4).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}
