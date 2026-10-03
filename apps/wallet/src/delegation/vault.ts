import { fromUnits, toUnits } from "@baret/wallet-ui/data/format";
import { free } from "@baret/wallet-ui/data/store";
import type { Merchant, Vault } from "@baret/wallet-ui/data/types";

/**
 * The vault screen's pure parts: whether a withdrawal fits under the
 * reserve, a merchant from the form, and the sample agent key. Tested in
 * vault.test.ts. Amounts are in the vault's asset (USDC, 6 decimals).
 */

const DECIMALS = 6;
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/** A positive amount, as the vault stores it ("5.00"); null when it is not one. */
export function vaultAmount(text: string): string | null {
  const units = toUnits(text, DECIMALS);
  return units === null || units === 0n ? null : fromUnits(units, DECIMALS, { max: 2 });
}

/** A withdrawal can take only what the merchants do not reserve. */
export function withdrawable(vault: Vault, text: string): "ok" | "invalid" | "reserved" {
  const amount = toUnits(text, DECIMALS);
  if (amount === null || amount === 0n) return "invalid";
  return amount <= (toUnits(free(vault), DECIMALS) ?? 0n) ? "ok" : "reserved";
}

export interface MerchantForm {
  readonly address: string;
  readonly origin: string;
  readonly perPayment: string;
  /** Empty: no hourly cap. */
  readonly perHour: string;
  readonly perDay: string;
}

export type MerchantIssue = "address" | "perPayment" | "perHour" | "perDay";

/** The first field the form gets wrong, or the merchant it describes. */
export function merchantFrom(
  form: MerchantForm,
): { issue: MerchantIssue } | { merchant: Merchant } {
  const address = form.address.trim();
  if (!ADDRESS_RE.test(address)) return { issue: "address" };
  const perPayment = vaultAmount(form.perPayment);
  if (!perPayment) return { issue: "perPayment" };
  const perHour = form.perHour.trim() === "" ? null : vaultAmount(form.perHour);
  if (form.perHour.trim() !== "" && !perHour) return { issue: "perHour" };
  const perDay = vaultAmount(form.perDay);
  if (!perDay) return { issue: "perDay" };
  return {
    merchant: {
      address,
      origin: form.origin.trim() || address,
      perPayment,
      perHour,
      perDay,
      spent: "0.00",
      status: "active",
    },
  };
}

/** The sample agent key: made up, and never a key anyone holds. */
export const SAMPLE_AGENT_KEY = `0x${"5a3c".repeat(16)}`;
