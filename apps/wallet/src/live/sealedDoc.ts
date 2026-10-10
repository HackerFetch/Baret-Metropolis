import { TEMPLATE_NAMES } from "@baret/wallet-ui/data/rules";
import type { PolicyTemplateName } from "../../../../packages/guard/src/policy-templates.js";
import type { StoredRules } from "./storage.js";

/**
 * What the wallet seals with its passkey (`@baret/wallet-core`, sealed.ts):
 * the settings that are the person's own and that the chain does not hold.
 * The rules, the names given to the vault's merchants, and the account's
 * name. No key, no address of the account, nothing the wallet can read back
 * from Monad by itself.
 */
export interface SealedDocument {
  readonly v: 1;
  readonly rules: StoredRules;
  /** Names by lowercase merchant address. */
  readonly merchants: Readonly<Record<string, string>>;
  readonly name: string;
}

const LABEL_MAX = 80;
const MERCHANTS_MAX = 24;

/** The document as text, keys in a fixed order, so the same settings read the same. */
export function sealedText(doc: Omit<SealedDocument, "v">): string {
  const merchants = Object.fromEntries(
    Object.entries(doc.merchants).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
  return JSON.stringify({ v: 1, rules: doc.rules, merchants, name: doc.name });
}

/**
 * A document that was opened, or null when it is not one. The bytes were
 * authenticated by the passkey's key before this runs; the shape is checked
 * all the same, as it is for what comes out of storage.
 */
export function parseSealed(text: string): SealedDocument | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const { v, rules, merchants, name } = value as Record<string, unknown>;
  if (v !== 1 || typeof name !== "string" || name.length > LABEL_MAX) return null;
  if (typeof rules !== "object" || rules === null) return null;
  const { policy, template } = rules as { policy?: unknown; template?: unknown };
  if (typeof policy !== "object" || policy === null || Array.isArray(policy)) return null;
  if (!(TEMPLATE_NAMES as readonly unknown[]).includes(template)) return null;
  if (typeof merchants !== "object" || merchants === null || Array.isArray(merchants)) return null;
  const entries = Object.entries(merchants);
  if (entries.length > MERCHANTS_MAX) return null;
  const names: Record<string, string> = {};
  for (const [address, label] of entries) {
    if (!/^0x[0-9a-f]{40}$/.test(address)) return null;
    if (typeof label !== "string" || label.length > LABEL_MAX) return null;
    names[address] = label;
  }
  return {
    v: 1,
    rules: {
      policy: policy as StoredRules["policy"],
      template: template as PolicyTemplateName,
    },
    merchants: names,
    name,
  };
}
