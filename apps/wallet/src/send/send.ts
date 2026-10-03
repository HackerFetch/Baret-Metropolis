import type { CheckFinding } from "@baret/web-ui/lib/check-types";
import { fromUnits, toUnits } from "../data/format.js";
import { decide } from "../data/rules.js";
import { ADDRESS, FEE_RESERVE, TRANSFER_FEE } from "../data/sample.js";
import type { Asset, GuardPolicy, SignRequest } from "../data/types.js";

/**
 * The send form's checks and the request it hands to the sign screen. Pure,
 * tested in send.test.ts. A transfer gets the same check as a site's request:
 * the sample findings come from what Baret knows about the recipient.
 */

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/** A token transfer's fee is a little higher than a plain MON transfer's. */
export const TOKEN_FEE = "0.0034";

export function feeFor(symbol: string): string {
  return symbol === "MON" ? TRANSFER_FEE : TOKEN_FEE;
}

export type RecipientIssue = "invalidAddress" | "ownAddress" | "tokenContract" | "contractAddress";

/** What is wrong with the recipient, if anything. `contractAddress` warns and does not stop the form. */
export function checkRecipient(
  text: string,
  own: string,
  assets: readonly Asset[],
): { issue: RecipientIssue; asset?: string } | null {
  const value = text.trim();
  if (!ADDRESS_RE.test(value)) return { issue: "invalidAddress" };
  const lower = value.toLowerCase();
  if (lower === own.toLowerCase()) return { issue: "ownAddress" };
  const token = assets.find((a) => a.contract?.toLowerCase() === lower);
  if (token) return { issue: "tokenContract", asset: token.symbol };
  if ([ADDRESS.pool, ADDRESS.sale, ADDRESS.novaswapRouter].some((a) => a.toLowerCase() === lower)) {
    return { issue: "contractAddress" };
  }
  return null;
}

/** The most this asset can send: all of it, except MON, which keeps the fee reserve back. */
export function maxOf(asset: Asset): string {
  const balance = toUnits(asset.balance, asset.decimals) ?? 0n;
  const reserve = asset.symbol === "MON" ? (toUnits(FEE_RESERVE, asset.decimals) ?? 0n) : 0n;
  return fromUnits(balance > reserve ? balance - reserve : 0n, asset.decimals);
}

export type AmountIssue =
  | { issue: "amountZero" }
  | { issue: "amountTooHigh"; short: string }
  | { issue: "noFee"; amount: string };

/** What is wrong with the amount, given the balances and the fee in MON. */
export function checkAmount(
  text: string,
  asset: Asset,
  assets: readonly Asset[],
): AmountIssue | null {
  const units = toUnits(text, asset.decimals);
  if (units === null || units === 0n) return { issue: "amountZero" };
  const balance = toUnits(asset.balance, asset.decimals) ?? 0n;
  if (units > balance)
    return { issue: "amountTooHigh", short: fromUnits(units - balance, asset.decimals) };
  const mon = assets.find((a) => a.symbol === "MON");
  const fee = toUnits(feeFor(asset.symbol), 18) ?? 0n;
  const monBalance = mon ? (toUnits(mon.balance, 18) ?? 0n) : 0n;
  const monSpent = asset.symbol === "MON" ? units : 0n;
  if (monSpent + fee > monBalance) return { issue: "noFee", amount: feeFor(asset.symbol) };
  return null;
}

/**
 * An address from the account's history that `recipient` imitates: the same
 * first four and last four characters after 0x, and a different middle.
 */
export function lookalikeOf(recipient: string, known: readonly string[]): string | null {
  const value = recipient.trim().toLowerCase();
  if (!ADDRESS_RE.test(value)) return null;
  const head = value.slice(0, 6);
  const tail = value.slice(-4);
  return (
    known.find((address) => {
      const other = address.toLowerCase();
      return other !== value && other.slice(0, 6) === head && other.slice(-4) === tail;
    }) ?? null
  );
}

/** What Baret's sample knows about a recipient: a listed address, or a contract on no list. */
export function findingsFor(recipient: string): CheckFinding[] {
  const lower = recipient.toLowerCase();
  if ([ADDRESS.drainer, ADDRESS.oldSpender].some((a) => a.toLowerCase() === lower)) {
    return [{ code: "KNOWN_MALICIOUS_ADDRESS", values: { address: recipient } }];
  }
  if ([ADDRESS.pool, ADDRESS.sale].some((a) => a.toLowerCase() === lower)) {
    return [{ code: "UNKNOWN_CONTRACT_EXPOSURE", values: { contract: recipient } }];
  }
  return [];
}

/** The sign request a transfer becomes, with its verdict under the account's rules. */
export function transferRequest(
  asset: Asset,
  amount: string,
  recipient: string,
  policy: GuardPolicy,
): SignRequest {
  const findings = findingsFor(recipient);
  const decision = decide(findings, policy);
  const shown = fromUnits(toUnits(amount, asset.decimals) ?? 0n, asset.decimals);
  return {
    id: decision.verdict,
    origin: null,
    action: "transfer",
    values: { amount: shown, asset: asset.symbol, recipient },
    claim: null,
    verdict: decision.verdict,
    impact: "transfer",
    findings,
    changes: [{ direction: "out", value: shown, unit: asset.symbol }],
    approvals: [],
    fee: feeFor(asset.symbol),
    rules: decision.rule && decision.verdict === "blocked" ? [{ rule: decision.rule }] : [],
    raw: {
      to: asset.contract ?? recipient,
      value: asset.contract ? "0" : (toUnits(amount, 18) ?? 0n).toString(),
      data: asset.contract ? "0xa9059cbb" : "0x",
      decoded: asset.contract ? "transfer(to, amount)" : null,
    },
    expires: 300,
  };
}
