import { type Address, encodeFunctionData, erc20Abi, type Hex, parseAbi } from "viem";

/** A call the wallet asks its owner to sign. Every one goes through Baret first. */
export interface WalletCall {
  to: Address;
  data: Hex;
  value: bigint;
}

export const PAYMENT_GUARD_ABI = parseAbi([
  "function deposit(uint256 amount)",
  "function withdraw(uint256 amount)",
  "function setMerchantCap(address merchant, uint256 perTxCap, uint256 hourlyCap, uint256 dailyCap)",
  "function setMerchantPaused(address merchant, bool paused)",
  "function revokeMerchant(address merchant)",
  "function setAgentSigner(address agent)",
  "function revokeAgentSigner()",
  "function owner() view returns (address)",
  "function token() view returns (address)",
  "function agent() view returns (address)",
  "function totalReserved() view returns (uint256)",
  "function unreserved() view returns (uint256)",
  "function merchant(address who) view returns (uint256 perTxCap, uint256 hourlyCap, uint256 dailyCap, bool active, bool paused)",
  "function spent(address who) view returns (uint256 lastHour, uint256 lastDay)",
  "function available(address who) view returns (uint256)",
]);

export const PAYMENT_GUARD_FACTORY_ABI = parseAbi([
  "function createVault(address token) returns (address vault)",
  "function latestVault(address owner) view returns (address)",
  "function vaultsOf(address owner) view returns (address[])",
  "function isVault(address vault) view returns (bool)",
]);

const call = (to: Address, data: Hex, value = 0n): WalletCall => ({ to, data, value });
const guard = (vault: Address, functionName: string, args: readonly unknown[] = []) =>
  call(
    vault,
    encodeFunctionData({ abi: PAYMENT_GUARD_ABI, functionName, args } as Parameters<
      typeof encodeFunctionData
    >[0]),
  );

/** Sending money. */
export const transfers = {
  mon: (to: Address, wei: bigint) => call(to, "0x", wei),
  token: (token: Address, to: Address, amount: bigint) =>
    call(
      token,
      encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [to, amount] }),
    ),
};

/**
 * The owner's PaymentGuard vault. Each of these is one transaction with a
 * network fee; a cap is in the vault token's base units.
 */
export const vault = {
  /** Opens a vault the caller owns, paying in `token`. */
  create: (factory: Address, token: Address) =>
    call(
      factory,
      encodeFunctionData({
        abi: PAYMENT_GUARD_FACTORY_ABI,
        functionName: "createVault",
        args: [token],
      }),
    ),

  /**
   * Funding takes two signatures: an allowance for exactly `amount`, then the
   * deposit that uses it up. Never an unlimited allowance.
   */
  deposit: (vaultAddress: Address, token: Address, amount: bigint): [WalletCall, WalletCall] => [
    call(
      token,
      encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [vaultAddress, amount] }),
    ),
    guard(vaultAddress, "deposit", [amount]),
  ],

  withdraw: (vaultAddress: Address, amount: bigint) => guard(vaultAddress, "withdraw", [amount]),

  /** `perHour` null means no hourly limit (the contract's 0). */
  setMerchantCap: (
    vaultAddress: Address,
    merchant: Address,
    caps: { perPayment: bigint; perHour: bigint | null; perDay: bigint },
  ) =>
    guard(vaultAddress, "setMerchantCap", [
      merchant,
      caps.perPayment,
      caps.perHour ?? 0n,
      caps.perDay,
    ]),

  setMerchantPaused: (vaultAddress: Address, merchant: Address, paused: boolean) =>
    guard(vaultAddress, "setMerchantPaused", [merchant, paused]),

  revokeMerchant: (vaultAddress: Address, merchant: Address) =>
    guard(vaultAddress, "revokeMerchant", [merchant]),

  /** Authorises the one key that may pay from the vault; replaces any earlier one. */
  setAgent: (vaultAddress: Address, agent: Address) =>
    guard(vaultAddress, "setAgentSigner", [agent]),

  revokeAgent: (vaultAddress: Address) => guard(vaultAddress, "revokeAgentSigner"),
};
