import { type Address, encodeFunctionData, maxUint256, parseAbi } from "viem";
import type { DemoTx } from "./novaswap.js";
import { DEMO } from "./sites.js";

/**
 * x402 payments for Scrybe and the agents playground. A payment is an
 * EIP-3009 `TransferWithAuthorization` message on the token, which the
 * wallet signs and the merchant's facilitator settles. It goes to
 * `/v1/analyze` as `typedData` together with `payment`: what the merchant's
 * 402 response asked for.
 */

/** The merchant's site and wallet. A plain wallet; Baret holds no opinion on it. */
export const SCRYBE = {
  origin: "https://baret-metropolis.vercel.app",
  payTo: "0x1365566191bAA9872A64AcDce963751d5343ff49",
  /** 0.05 USDC per answer. */
  price: 50_000n,
  /** Another plain wallet, for "paid the wrong address". Nobody holds its key. */
  otherWallet: "0x447be657388C5e488cEBC84924d611C3cC32E0f4",
} as const;

/** A past payment: base units and Unix seconds. */
export interface DemoSpend {
  amount: string;
  timestamp: number;
}

/** The `typedData` and `payment` fields of an analyze request. */
export interface DemoPayment {
  typedData: {
    signer: Address;
    domain: Record<string, unknown>;
    types: Record<string, { name: string; type: string }[]>;
    primaryType: string;
    message: Record<string, unknown>;
  };
  payment: {
    origin: string;
    payTo: Address;
    asset: Address;
    amount: string;
    memo: string | null;
    spendHistory: DemoSpend[];
  };
}

const TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
};

interface PaymentOptions {
  /** What the 402 asked for. */
  amount: bigint;
  payTo?: Address;
  /** Where the signed message really sends the money. Defaults to `payTo`. */
  actualTo?: Address;
  /** The token the signed message really moves. Defaults to the real USDC. */
  actualAsset?: Address;
  memo?: string | null;
  /** Earlier payments in the last 24 hours. Required for the hourly and daily caps. */
  history?: readonly DemoSpend[];
  /** Unix seconds; the message is valid for ten minutes from here. */
  now?: number;
}

/** An x402 payment as the analyze request needs it. */
export function payment(from: Address, o: PaymentOptions): DemoPayment {
  const payTo = o.payTo ?? SCRYBE.payTo;
  const token = o.actualAsset ?? DEMO.usdc;
  const now = o.now ?? Math.floor(Date.now() / 1000);
  return {
    typedData: {
      signer: from,
      domain: { name: "USDC", version: "2", chainId: DEMO.chainId, verifyingContract: token },
      types: TYPES,
      primaryType: "TransferWithAuthorization",
      message: {
        from,
        to: o.actualTo ?? payTo,
        value: o.amount.toString(),
        validAfter: "0",
        validBefore: String(now + 600),
        // The payment's number in this run: unique enough for a simulated demo.
        nonce: `0x${(BigInt(now) * 1000n + BigInt(o.history?.length ?? 0)).toString(16).padStart(64, "0")}`,
      },
    },
    payment: {
      origin: SCRYBE.origin,
      payTo,
      asset: DEMO.usdc,
      amount: o.amount.toString(),
      memo: o.memo === undefined ? "scrybe-answer" : o.memo,
      spendHistory: [...(o.history ?? [])],
    },
  };
}

export const scrybe = {
  /**
   * One answer, 0.05 USDC. With `paidBefore` earlier payments in this hour:
   * Baret answers Safe until the visitor's hourly cap, then
   * X402_HOURLY_CAP_EXCEEDED (Blocked). Send the cap as `policy.maxHourlyCap`.
   */
  pay: (from: Address, paidBefore = 0, now = Math.floor(Date.now() / 1000)): DemoPayment =>
    payment(from, {
      amount: SCRYBE.price,
      now,
      history: Array.from({ length: paidBefore }, (_, i) => ({
        amount: SCRYBE.price.toString(),
        timestamp: now - (paidBefore - i) * 20,
      })),
    }),
};

const ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function setApprovalForAll(address operator, bool approved)",
]);

/** The six actions of the /agents playground. */
export const agents = {
  /** Pays a merchant what its 402 asked, 0.25 USDC. Nothing to find. */
  pay: (from: Address): DemoPayment => payment(from, { amount: 250_000n }),

  /** Unlimited USDC allowance to a contract on no list. */
  unlimitedAllowance: (from: Address): DemoTx => ({
    from,
    to: DEMO.usdc,
    value: "0",
    data: encodeFunctionData({
      abi: ABI,
      functionName: "approve",
      args: [DEMO.orbityield.silentPool, maxUint256],
    }),
  }),

  /** Pays a 402, but to another wallet than the one the 402 named. */
  wrongPayee: (from: Address): DemoPayment =>
    payment(from, { amount: 250_000n, actualTo: SCRYBE.otherWallet }),

  /** Pays the 402 with a token that is named USDC and is not the USDC on the list. */
  lookalikeToken: (from: Address): DemoPayment =>
    payment(from, { amount: 250_000n, actualAsset: DEMO.fakeUsdc }),

  /** Opens a whole collection to another wallet (not a reported one). */
  operatorApproval: (from: Address): DemoTx => ({
    from,
    to: DEMO.pixeldrop.collection,
    value: "0",
    data: encodeFunctionData({
      abi: ABI,
      functionName: "setApprovalForAll",
      args: [SCRYBE.payTo, true],
    }),
  }),

  /** Sends MON to a wallet on the registry blocklist. */
  flaggedAddress: (from: Address, monWei = 10n ** 17n): DemoTx => ({
    from,
    to: DEMO.sink,
    value: monWei.toString(),
    data: "0x",
  }),
};
