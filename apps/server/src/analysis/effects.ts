import type { TypedDataRequest } from "@baret/guard";
import { type Address, getAddress, isAddress, zeroAddress } from "viem";
import {
  decodeKnownCall,
  decodeKnownLog,
  type KnownCall,
  multicallInner,
  UNLIMITED_THRESHOLD,
} from "../simulation/abi.js";
import type { NormalizedTx } from "../simulation/decode.js";
import type { CallTrace } from "../simulation/trace.js";

/** A permission the user grants in this request. */
export interface ApprovalEffect {
  kind: "erc20" | "operator" | "permit";
  contract: Address;
  spender: Address;
  /** Null for operator access, which has no amount. */
  amount: bigint | null;
  unlimited: boolean;
}

export interface TransferEffect {
  /** Null for MON. */
  token: Address | null;
  from: Address;
  to: Address;
  amount: bigint;
  nft: boolean;
}

export interface OwnershipEffect {
  contract: Address;
  newOwner: Address;
}

/** What the request does to the user, before balances are attached. */
export interface Effects {
  approvals: ApprovalEffect[];
  /** Every value movement out of or into the user's account. */
  transfers: TransferEffect[];
  ownership: OwnershipEffect[];
  /** Calls bundled into one signature (multicall items, or trace frames). */
  operationCount: number;
  /** Where the effects came from: the trace, or the calldata alone. */
  source: "trace" | "calldata" | "typedData";
  /** Typed data only: what Baret made of the message (`effectsFromTypedData`). */
  signature?: SignatureReading;
}

const NATIVE_VALUE_CALLS = new Set(["CALL", "CREATE", "CREATE2", "SELFDESTRUCT"]);

function pushApproval(out: ApprovalEffect[], a: ApprovalEffect) {
  if (a.kind !== "operator" && a.amount === 0n) return; // a revoke grants nothing
  const i = out.findIndex(
    (x) => x.kind === a.kind && x.contract === a.contract && x.spender === a.spender,
  );
  if (i >= 0) out[i] = a;
  else out.push(a);
}

const erc20 = (contract: Address, spender: Address, amount: bigint): ApprovalEffect => ({
  kind: "erc20",
  contract,
  spender,
  amount,
  unlimited: amount >= UNLIMITED_THRESHOLD,
});

/** Effects from what the simulation actually did. */
export function effectsFromTrace(trace: CallTrace, user: Address): Effects {
  const approvals: ApprovalEffect[] = [];
  const transfers: TransferEffect[] = [];
  const ownership: OwnershipEffect[] = [];

  for (const f of trace.frames) {
    if (f.reverted || f.value === 0n || !NATIVE_VALUE_CALLS.has(f.type) || !f.to) continue;
    if (f.from === user || f.to === user) {
      transfers.push({ token: null, from: f.from, to: f.to, amount: f.value, nft: false });
    }
  }

  for (const log of trace.logs) {
    const ev = decodeKnownLog(log);
    if (!ev) continue;
    switch (ev.name) {
      case "Transfer":
        if (ev.from === user || ev.to === user) {
          transfers.push({
            token: ev.token,
            from: ev.from,
            to: ev.to,
            amount: ev.value,
            nft: ev.nft,
          });
        }
        break;
      case "Approval":
        if (ev.owner === user) pushApproval(approvals, erc20(ev.token, ev.spender, ev.value));
        break;
      case "ApprovalForAll":
        if (ev.owner === user && ev.approved) {
          pushApproval(approvals, {
            kind: "operator",
            contract: ev.token,
            spender: ev.operator,
            amount: null,
            unlimited: true,
          });
        }
        break;
      case "OwnershipTransferred":
        ownership.push({ contract: ev.contract, newOwner: ev.newOwner });
        break;
    }
  }

  // A permit lands as an Approval log; mark the ones the calldata says came from a permit.
  for (const f of trace.frames) {
    if (f.reverted || !f.to) continue;
    const call = decodeKnownCall(f.input);
    if (call?.functionName === "permit" && call.args[0] === user) {
      const [, spender, value] = call.args;
      pushApproval(approvals, {
        kind: "permit",
        contract: f.to,
        spender,
        amount: value,
        unlimited: value >= UNLIMITED_THRESHOLD,
      });
      const plain = approvals.findIndex(
        (a) => a.kind === "erc20" && a.contract === f.to && a.spender === spender,
      );
      if (plain >= 0) approvals.splice(plain, 1);
    }
  }

  const calls = trace.frames.filter((f) => !f.reverted && f.type !== "STATICCALL").length;
  return { approvals, transfers, ownership, operationCount: calls, source: "trace" };
}

function applyCall(
  call: KnownCall,
  target: Address,
  user: Address,
  out: Pick<Effects, "approvals" | "transfers" | "ownership">,
) {
  switch (call.functionName) {
    case "transfer": {
      const [to, amount] = call.args;
      out.transfers.push({ token: target, from: user, to, amount, nft: false });
      break;
    }
    case "transferFrom": {
      const [from, to, amount] = call.args;
      if (from === user) out.transfers.push({ token: target, from, to, amount, nft: false });
      break;
    }
    case "safeTransferFrom": {
      const [from, to] = call.args;
      if (from === user) out.transfers.push({ token: target, from, to, amount: 1n, nft: true });
      break;
    }
    case "approve":
    case "increaseAllowance": {
      const [spender, amount] = call.args;
      pushApproval(out.approvals, erc20(target, spender, amount));
      break;
    }
    case "permit": {
      const [owner, spender, value] = call.args;
      if (owner === user) {
        pushApproval(out.approvals, {
          kind: "permit",
          contract: target,
          spender,
          amount: value,
          unlimited: value >= UNLIMITED_THRESHOLD,
        });
      }
      break;
    }
    case "setApprovalForAll": {
      const [operator, approved] = call.args;
      if (approved) {
        pushApproval(out.approvals, {
          kind: "operator",
          contract: target,
          spender: operator,
          amount: null,
          unlimited: true,
        });
      }
      break;
    }
    case "transferOwnership":
      out.ownership.push({ contract: target, newOwner: call.args[0] });
      break;
    case "transferWithAuthorization": {
      const [from, to, value] = call.args;
      if (from === user) out.transfers.push({ token: target, from, to, amount: value, nft: false });
      break;
    }
    case "multicall":
      break;
  }
}

/**
 * Effects read from the calldata alone. Used when there is no trace, or when
 * the call reverts: the request still says what it was trying to do.
 */
export function effectsFromCalldata(tx: NormalizedTx, user: Address): Effects {
  const out: Pick<Effects, "approvals" | "transfers" | "ownership"> = {
    approvals: [],
    transfers: [],
    ownership: [],
  };
  if (tx.value > 0n && tx.to) {
    out.transfers.push({ token: null, from: tx.from, to: tx.to, amount: tx.value, nft: false });
  }
  const top = decodeKnownCall(tx.data);
  const inner = multicallInner(top);
  if (tx.to && top) applyCall(top, tx.to, user, out);
  if (tx.to) {
    for (const data of inner) {
      const call = decodeKnownCall(data);
      if (call) applyCall(call, tx.to, user, out);
    }
  }
  return { ...out, operationCount: Math.max(1, inner.length), source: "calldata" };
}

const asAddress = (v: unknown): Address | null =>
  typeof v === "string" && isAddress(v, { strict: false }) ? getAddress(v) : null;
const asBig = (v: unknown): bigint | null => {
  if (typeof v === "bigint") return v;
  if (typeof v === "number" && Number.isSafeInteger(v)) return BigInt(v);
  if (typeof v === "string" && /^(0x[0-9a-fA-F]+|\d+)$/.test(v)) return BigInt(v);
  return null;
};

/** What Baret made of a signed EIP-712 message. */
export interface SignatureReading {
  /**
   * read: a kind Baret knows, and its fields said what it grants (possibly
   * nothing, as for a revoke or a vote delegation).
   * unread: a kind Baret does not know, or a known kind whose fields did not
   * yield the effect its name promises.
   */
  kind: "read" | "unread";
  /** Why it is unread; null when read. */
  reason: "unknownType" | "fields" | null;
  /**
   * Unread only: the message names another account or a token amount, so it
   * may move value. A message with neither (a vote, a profile, a login) cannot
   * be read either, but nothing in it points at funds.
   */
  valueBearing: boolean;
  /** The message says it is for another chain than the one being checked. */
  wrongChain: boolean;
  /** The contract the signature is meant for; null when the domain names none. */
  verifier: Address | null;
}

const MAX_UINT256 = (1n << 256n) - 1n;

/** Field names that carry an amount of something, whatever the message is. */
const AMOUNT_NAME =
  /amount|value|price|allow|limit|quantity|balance|wad|shares|assets|tokens?$|fee/i;

/**
 * Whether an unread message names another account or a token amount. Walks
 * the message with its declared types where they are given, and by the shape
 * of the values where they are not.
 */
function bearsValue(t: TypedDataRequest, user: Address): boolean {
  const seen = new Set<unknown>();
  const walk = (value: unknown, type: string | null, name: string, depth: number): boolean => {
    if (depth > 6) return true; // too deep to read is not a reason to wave it through
    if (Array.isArray(value)) {
      const item = type?.replace(/\[\d*\]$/, "") ?? null;
      return value.some((v) => walk(v, item, name, depth + 1));
    }
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return false;
      seen.add(value);
      const fields = type ? t.types[type] : undefined;
      return Object.entries(value as Record<string, unknown>).some(([key, v]) =>
        walk(v, fields?.find((f) => f.name === key)?.type ?? null, key, depth + 1),
      );
    }
    const address = asAddress(value);
    if (address && (type === null || type.startsWith("address"))) {
      return address !== user && address !== zeroAddress;
    }
    if (type?.startsWith("bytes") || type === "string" || type === "bool") return false;
    const amount = asBig(value);
    return amount !== null && amount > 0n && AMOUNT_NAME.test(name);
  };
  return walk(t.message, t.primaryType, "", 0);
}

/**
 * Effects of an EIP-712 message. Recognises:
 *
 *   Permit                        EIP-2612 (`owner`, `value`) and the DAI form
 *                                 (`holder`, `allowed`)
 *   PermitSingle, PermitBatch     Permit2 allowances
 *   PermitTransferFrom,           Permit2 signature transfers, with or without
 *   PermitBatchTransferFrom,      a witness: the spender may pull up to the
 *   Permit*WitnessTransferFrom    amount once
 *   TransferWithAuthorization,    EIP-3009 (x402 payments)
 *   ReceiveWithAuthorization
 *   CancelAuthorization           EIP-3009: takes an authorisation back
 *   Delegation                    ERC-5805 voting power: moves no funds
 *
 * Fail-closed: any other kind, and a recognised kind whose fields do not
 * yield the effect its name promises (a permit for another owner, a missing
 * token, an amount that is not a number), is `unread`. A signature Baret
 * cannot read is never reported as doing nothing.
 */
export function effectsFromTypedData(t: TypedDataRequest, chainId?: number): Effects {
  const user = getAddress(t.signer);
  const token = asAddress(t.domain.verifyingContract);
  const m = t.message;
  const out: Effects = {
    approvals: [],
    transfers: [],
    ownership: [],
    operationCount: 1,
    source: "typedData",
  };

  /** Records a permit; false when its fields do not say who may spend what. */
  const permit = (contract: Address | null, spender: unknown, amount: unknown): boolean => {
    const s = asAddress(spender);
    const a = asBig(amount);
    if (!contract || !s || a === null) return false;
    pushApproval(out.approvals, {
      kind: "permit",
      contract,
      spender: s,
      amount: a,
      unlimited: a >= UNLIMITED_THRESHOLD,
    });
    return true;
  };
  const record = (v: unknown) =>
    typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

  let read = false;
  let known = true;
  switch (t.primaryType) {
    case "Permit":
      if ("holder" in m || "allowed" in m) {
        // DAI: no amount, a yes or no for the whole balance. A no is a revoke.
        if (asAddress(m.holder) !== user || typeof m.allowed !== "boolean") break;
        read = m.allowed ? permit(token, m.spender, MAX_UINT256) : asAddress(m.spender) !== null;
        break;
      }
      // A permit that names another owner is not this signer's to give: it is
      // not read as harmless, it is not read at all.
      read = asAddress(m.owner) === user && permit(token, m.spender, m.value);
      break;
    case "PermitSingle": {
      const d = record(m.details);
      read = permit(asAddress(d.token), m.spender, d.amount);
      break;
    }
    case "PermitBatch": {
      const list = Array.isArray(m.details) ? m.details : [];
      // Every entry has to be read: one unreadable entry hides an allowance.
      read = list.length > 0;
      for (const d of list) {
        if (!permit(asAddress(record(d).token), m.spender, record(d).amount)) read = false;
      }
      out.operationCount = Math.max(1, list.length);
      break;
    }
    case "PermitTransferFrom":
    case "PermitWitnessTransferFrom": {
      const p = record(m.permitted);
      read = permit(asAddress(p.token), m.spender, p.amount);
      break;
    }
    case "PermitBatchTransferFrom":
    case "PermitBatchWitnessTransferFrom": {
      const list = Array.isArray(m.permitted) ? m.permitted : [];
      read = list.length > 0;
      for (const p of list) {
        if (!permit(asAddress(record(p).token), m.spender, record(p).amount)) read = false;
      }
      out.operationCount = Math.max(1, list.length);
      break;
    }
    case "TransferWithAuthorization":
    case "ReceiveWithAuthorization": {
      const from = asAddress(m.from);
      const to = asAddress(m.to);
      const value = asBig(m.value);
      if (token && from === user && to && value !== null) {
        out.transfers.push({ token, from, to, amount: value, nft: false });
        read = true;
      }
      break;
    }
    case "CancelAuthorization":
      // Takes back an authorisation of the signer's own: nothing moves.
      read = token !== null && asAddress(m.authorizer) === user;
      break;
    case "Delegation":
      // Voting power to a delegate. The tokens stay where they are.
      read = token !== null && asAddress(m.delegatee) !== null;
      break;
    default:
      // An order, a vote, a login, a kind nobody has seen: Baret has no model
      // of what it authorises.
      known = false;
  }

  const declared = asBig(t.domain.chainId);
  out.signature = {
    kind: read ? "read" : "unread",
    reason: read ? null : known ? "fields" : "unknownType",
    // A known kind that did not read is a grant Baret could not pin down.
    valueBearing: read ? false : known || bearsValue(t, user),
    wrongChain: chainId !== undefined && declared !== null && declared !== BigInt(chainId),
    verifier: token,
  };
  return out;
}
