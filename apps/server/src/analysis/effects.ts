import type { TypedDataRequest } from "@baret/guard";
import { type Address, getAddress, isAddress } from "viem";
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

/**
 * Effects of an EIP-712 message. Recognises EIP-2612 permits, Permit2 single
 * and batch permits, and EIP-3009 transfer authorisations (x402 payments).
 */
export function effectsFromTypedData(t: TypedDataRequest): Effects {
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

  const permit = (contract: Address | null, spender: unknown, amount: unknown) => {
    const s = asAddress(spender);
    const a = asBig(amount);
    if (contract && s && a !== null) {
      pushApproval(out.approvals, {
        kind: "permit",
        contract,
        spender: s,
        amount: a,
        unlimited: a >= UNLIMITED_THRESHOLD,
      });
    }
  };

  switch (t.primaryType) {
    case "Permit":
      if (asAddress(m.owner) === user) permit(token, m.spender, m.value);
      break;
    case "PermitSingle": {
      const d = m.details as Record<string, unknown> | undefined;
      permit(asAddress(d?.token), m.spender, d?.amount);
      break;
    }
    case "PermitBatch": {
      const list = (m.details as Record<string, unknown>[] | undefined) ?? [];
      for (const d of list) permit(asAddress(d.token), m.spender, d.amount);
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
      }
      break;
    }
  }
  return out;
}
