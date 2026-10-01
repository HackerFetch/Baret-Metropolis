/**
 * The two networks Baret runs on. There is no third entry and no generic
 * "any chain" path: a request names one of these keys or it is rejected.
 */
export const MONAD_NETWORKS = {
  testnet: {
    chainId: 10143,
    caip2: "eip155:10143",
    explorerUrl: "https://testnet.monadexplorer.com",
    nativeSymbol: "MON",
    nativeDecimals: 18,
  },
  mainnet: {
    chainId: 143,
    caip2: "eip155:143",
    explorerUrl: "https://monadexplorer.com",
    nativeSymbol: "MON",
    nativeDecimals: 18,
  },
} as const;

export type MonadNetwork = keyof typeof MONAD_NETWORKS;

export const MONAD_NETWORK_KEYS = Object.keys(MONAD_NETWORKS) as [MonadNetwork, ...MonadNetwork[]];
