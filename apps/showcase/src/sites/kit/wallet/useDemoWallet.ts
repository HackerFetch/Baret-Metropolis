import { type Address, isAddress } from "viem";
import { addressOf, useWallet, type WalletState } from "./store.js";

/**
 * What a demo site needs from the wallet: the address its live checks
 * simulate from, and the MON that address holds.
 */

const envFrom: unknown = import.meta.env.VITE_BARET_DEMO_FROM;

/**
 * A developer's stand-in for a wallet: a funded testnet address in
 * VITE_BARET_DEMO_FROM (no key; Baret only simulates). A connected wallet,
 * or the Baret wallet connected through its window, always wins over it.
 * Unset, a site with no wallet shows its samples and never calls the API.
 */
export const DEMO_FROM: Address | null =
  typeof envFrom === "string" && isAddress(envFrom) ? envFrom : null;

/**
 * The address "Check it live" simulates from when a visitor has no wallet:
 * VITE_BARET_DEMO_FROM when set, else a fixed testnet address. Baret only
 * simulates, so no key is involved and nothing is ever signed from it.
 */
export const DEMO_CHECK_FROM: Address = DEMO_FROM ?? "0x5aE13F1028144842f0384d09091067D6184F8197";

/** The chain every live check runs on: Monad testnet. */
export const MONAD_TESTNET_ID = 10143;

export interface DemoWallet {
  readonly wallet: WalletState;
  /**
   * Where live checks simulate from: the connected wallet, else the Baret
   * wallet's address from its window, else the test address.
   */
  readonly from: Address | null;
  readonly live: boolean;
  /** MON in wei for the connected wallet once read; null otherwise. */
  readonly balance: bigint | null;
}

export function useDemoWallet(): DemoWallet {
  const wallet = useWallet();
  const connected = addressOf(wallet);
  const from = connected ?? wallet.baret?.address ?? DEMO_FROM;
  // The Baret window address has its MON read too, so every site's balance guard holds for it.
  const balance = connected ? wallet.balance : wallet.baret ? wallet.baretBalance : null;
  return { wallet, from, live: from !== null, balance };
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
