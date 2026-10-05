import { parseAbi } from "viem";

/** The part of contracts/src/PaymentGuard.sol an agent calls. */
export const PAYMENT_GUARD_ABI = parseAbi([
  "function pay(address merchant, uint256 amount, bytes32 ref)",
  "function available(address merchant) view returns (uint256)",
  "function agent() view returns (address)",
  "function token() view returns (address)",
]);
