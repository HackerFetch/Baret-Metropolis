import { type Address, encodeFunctionData, parseAbi } from "viem";
import type { DemoTx } from "./novaswap.js";

/**
 * Cleanverse on Monad testnet (chain 10143): the identity credential (A-Pass,
 * CVI) and a compliant asset (aUSDC, CVA) whose policy lets it move only
 * between wallets that hold an active credential. Addresses are from
 * Cleanverse's own `query_chain_config`; see docs/CONTRACTS.md section 4.
 */
export const CLEANVERSE = {
  chainId: 10143,
  /** The credential: one soulbound token per verified wallet. */
  apass: "0xbA82D189540CaC9DC6FF46B6837CaC1BFdEC58B9",
  /** What a compliant asset asks before it moves. */
  policy: "0x36489bE45fa84f70a0c2BDB11D824Be608CB12Dd",
  /** Access USDC, 6 decimals: test USDC wrapped as a compliant asset. */
  aUsdc: "0xaC0893567D43C3E7e6e35a72803df05416C1f20D",
  /**
   * Two wallets seen on testnet with an active credential, the first holding
   * aUSDC. They are not ours: they are simulated from, never signed for, and a
   * scenario built on them stops agreeing if their owner moves the funds.
   */
  verifiedHolder: "0x888895E314BF33CEeBCF5320279061aed3a5E2bd",
  verifiedRecipient: "0xc448042EdAC1899B023CaA0E9Da5e4a8833de873",
} as const satisfies Record<string, Address | number>;

const ERC20 = parseAbi(["function transfer(address to, uint256 amount) returns (bool)"]);

export const cleanverse = {
  /** A transfer of aUSDC. It settles only when both sides hold an A-Pass. */
  transfer(from: Address, to: Address, amount: bigint): DemoTx {
    return {
      from,
      to: CLEANVERSE.aUsdc,
      value: "0",
      data: encodeFunctionData({ abi: ERC20, functionName: "transfer", args: [to, amount] }),
    };
  },
};
