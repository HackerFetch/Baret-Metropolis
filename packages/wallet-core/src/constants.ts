import type { MonadNetwork } from "@baret/guard";
import type { Address } from "viem";

/** Where the wallet finds Baret's contracts on each network. */
export const WALLET_CONTRACTS: Record<
  MonadNetwork,
  {
    usdc: Address;
    usdcDecimals: number;
    paymentGuardFactory: Address;
    /** Where sealed settings are kept (contracts/src/SealedStore.sol). */
    sealedStore: Address;
  } | null
> = {
  testnet: {
    usdc: "0x534b2f3A21130d7a60830c2Df862319e593943A3",
    usdcDecimals: 6,
    paymentGuardFactory: "0xDe897d4dF6E1c34aB868948dE035AE29D32eA822",
    sealedStore: "0xC094af68bE1039f70E1362C2f326542BB2DC21BB",
  },
  /** Not deployed. */
  mainnet: null,
};
