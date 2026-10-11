import { fromUnits } from "@baret/wallet-ui/data/format";
import type { Activity } from "../data/types.js";

interface Shown {
  readonly approvals: readonly { readonly spender: string; readonly unit: string }[];
  readonly changes: readonly {
    readonly direction: "in" | "out";
    readonly value: string;
    readonly unit: string;
  }[];
}

/**
 * The log row with the words its sentence needs. A site's call names no
 * amount or asset by itself: an allowance is logged as one, anything else
 * as what the simulation says left the account, or the MON the call carries.
 * A call that sends nothing and brings something in (a faucet, a claim) is
 * logged as what arrived.
 */
export function loggedRow(item: Activity, shown: Shown, value: bigint): Activity {
  if (item.values.asset) return item;
  const approval = shown.approvals[0];
  if (approval) {
    return {
      ...item,
      kind: "allowance",
      counterparty: approval.spender,
      values: { asset: approval.unit },
    };
  }
  const out = shown.changes.find((change) => change.direction === "out");
  const arrived = shown.changes.find((change) => change.direction === "in");
  if (!out && arrived && value === 0n) {
    return { ...item, kind: "received", values: { amount: arrived.value, asset: arrived.unit } };
  }
  return {
    ...item,
    values: out
      ? { amount: out.value, asset: out.unit }
      : { amount: fromUnits(value, 18), asset: "MON" },
  };
}
