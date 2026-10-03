import { type Address, encodeFunctionData, type Hex, maxUint256, parseAbi } from "viem";

/**
 * NovaSwap on Monad testnet (chain 10143). Deployed 2026-10-03, source
 * verified. See docs/CONTRACTS.md §7.
 *
 * `lookalike` is the attack router: a CREATE2 address ground to start and end
 * like `router` (0xEB9E…1888 vs 0xeB9E…3888). It is reported in the Baret
 * ReputationRegistry, so Baret blocks any request that touches it.
 */
export const NOVASWAP = {
  chainId: 10143,
  /** dUSDC: worthless test dollars, 6 decimals, 100 per faucet call. */
  usdc: "0x5BB6fF1FCbE31ED8FBce6805852Ce279475522fc",
  router: "0xEB9EA352613D8545d70a586C112C30D23D5C1888",
  lookalike: "0xeB9EBB97BcD146FF1a4424490cbE8e19b7983888",
  /** Where the look-alike sends what it takes. Nobody holds its key. */
  sink: "0xac9517a70c88480c9fA7E9a280DA485F7f552C29",
  usdcDecimals: 6,
  /** dUSDC per MON. */
  rate: 3.2,
} as const satisfies Record<string, Address | number>;

export const DEMO_USDC_ABI = parseAbi([
  "function faucet()",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
]);

/** The honest router; the look-alike copies `swapUsdcForMon`. */
export const NOVASWAP_ROUTER_ABI = parseAbi([
  "function swapMonForUsdc(uint256 minOut) payable returns (uint256)",
  "function swapUsdcForMon(uint256 amountIn, uint256 minOut) returns (uint256)",
  "function quoteMonForUsdc(uint256 monIn) pure returns (uint256)",
  "function quoteUsdcForMon(uint256 usdcIn) pure returns (uint256)",
]);

/** A request ready for `eth_sendTransaction` or for Baret's `/v1/analyze`. */
export interface DemoTx {
  from: Address;
  to: Address;
  value: string;
  data: Hex;
}

const tx = (from: Address, to: Address, data: Hex, value = 0n): DemoTx => ({
  from,
  to,
  value: value.toString(),
  data,
});

/** dUSDC base units for a MON amount in wei, at the router's fixed rate (rounds down). */
export function quoteMonForUsdc(monWei: bigint): bigint {
  return (monWei * 32n) / (10n * 10n ** 12n);
}

export const novaswap = {
  /** 100 dUSDC to `from`. */
  faucet: (from: Address) =>
    tx(from, NOVASWAP.usdc, encodeFunctionData({ abi: DEMO_USDC_ABI, functionName: "faucet" })),

  /** Honest: MON in, dUSDC out. No allowance needed. Baret: Safe. */
  swapMonForUsdc: (from: Address, monWei: bigint) =>
    tx(
      from,
      NOVASWAP.router,
      encodeFunctionData({
        abi: NOVASWAP_ROUTER_ABI,
        functionName: "swapMonForUsdc",
        args: [quoteMonForUsdc(monWei)],
      }),
      monWei,
    ),

  /** Honest sale, step 1: an allowance for exactly the amount sold. Baret: Caution. */
  approveExact: (from: Address, usdcAmount: bigint) =>
    tx(
      from,
      NOVASWAP.usdc,
      encodeFunctionData({
        abi: DEMO_USDC_ABI,
        functionName: "approve",
        args: [NOVASWAP.router, usdcAmount],
      }),
    ),

  /** Honest sale, step 2. */
  swapUsdcForMon: (from: Address, usdcAmount: bigint) =>
    tx(
      from,
      NOVASWAP.router,
      encodeFunctionData({
        abi: NOVASWAP_ROUTER_ABI,
        functionName: "swapUsdcForMon",
        args: [usdcAmount, 0n],
      }),
    ),

  /** Attack, step 1: "enable trading" = unlimited allowance to the look-alike. Baret: Blocked. */
  attackApprove: (from: Address) =>
    tx(
      from,
      NOVASWAP.usdc,
      encodeFunctionData({
        abi: DEMO_USDC_ABI,
        functionName: "approve",
        args: [NOVASWAP.lookalike, maxUint256],
      }),
    ),

  /** Attack, step 2: looks like a sale of `usdcAmount`; takes the whole balance. */
  attackSwap: (from: Address, usdcAmount: bigint) =>
    tx(
      from,
      NOVASWAP.lookalike,
      encodeFunctionData({
        abi: NOVASWAP_ROUTER_ABI,
        functionName: "swapUsdcForMon",
        args: [usdcAmount, 0n],
      }),
    ),
};
