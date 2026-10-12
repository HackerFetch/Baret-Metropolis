/**
 * Where the live wallet reaches Baret and Monad, fixed into the build like
 * the manifest's host permissions. On its own so wallet.ts, the records and
 * the store's live source can all read it without importing each other.
 */

/** Baret's server. */
export const API_URL: string = (
  (import.meta.env.WXT_BARET_API_URL as string | undefined) || "http://localhost:8080"
).replace(/\/+$/, "");

/** The Monad testnet node the wallet reads from. */
export const RPC_URL: string =
  (import.meta.env.WXT_MONAD_TESTNET_RPC_URL as string | undefined) ||
  "https://testnet-rpc.monad.xyz";
