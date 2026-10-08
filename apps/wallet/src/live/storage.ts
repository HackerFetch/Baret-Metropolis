import type { StoredCredential } from "@baret/wallet-core";
import { TEMPLATE_NAMES } from "@baret/wallet-ui/data/rules";
import type { GuardPolicy } from "@baret/wallet-ui/data/types";
import type { PolicyTemplateName } from "../../../../packages/guard/src/policy-templates.js";

/**
 * What the live wallet keeps in this browser, and whether it is live at all.
 * Nothing here is secret and nothing here is needed to get the account back:
 * the passkey alone does that.
 */

/** Test USDC on Monad testnet: the wallet's second asset and the vault's token. */
export const USDC = "0x534b2f3A21130d7a60830c2Df862319e593943A3" as const;

/** How long an unlocked session lasts before it locks on its own. */
export const SESSION_MS = 15 * 60 * 1000;

/** Why a passkey prompt gave no account, as the onboarding copy names it. */
export type PasskeyProblem = "cancelled" | "unsupported" | "notCompatible";

const KEYS = {
  credential: "baret.wallet.credential",
  name: "baret.wallet.name",
  rules: "baret.wallet.rules",
  merchants: "baret.wallet.merchants",
  agentSince: "baret.wallet.agentSince",
} as const;

/**
 * Live on a deployed build, or in dev with VITE_BARET_WALLET=live. Any
 * `?sample=` keeps the sample: the tests and the design states read it.
 */
export function isLive(search: string): boolean {
  if (new URLSearchParams(search).has("sample")) return false;
  return import.meta.env.PROD || import.meta.env.VITE_BARET_WALLET === "live";
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage is a convenience; the wallet works without it.
  }
}

export function readCredential(): StoredCredential | null {
  try {
    const value: unknown = JSON.parse(read(KEYS.credential) ?? "null");
    if (typeof value !== "object" || value === null) return null;
    const { credentialId } = value as { credentialId?: unknown };
    return typeof credentialId === "string" && credentialId !== ""
      ? (value as StoredCredential)
      : null;
  } catch {
    return null;
  }
}

export function writeCredential(credential: StoredCredential): void {
  write(KEYS.credential, JSON.stringify(credential));
}

export function readName(): string | null {
  const name = read(KEYS.name);
  return name && name.trim() !== "" ? name : null;
}

export function writeName(name: string): void {
  write(KEYS.name, name);
}

export interface StoredRules {
  readonly policy: GuardPolicy;
  readonly template: PolicyTemplateName;
}

/** The rules as saved; null when missing or unreadable, and the wallet then uses Balanced. */
export function readRules(): StoredRules | null {
  try {
    const value: unknown = JSON.parse(read(KEYS.rules) ?? "null");
    if (typeof value !== "object" || value === null) return null;
    const { policy, template } = value as { policy?: unknown; template?: unknown };
    if (typeof policy !== "object" || policy === null) return null;
    if (!(TEMPLATE_NAMES as readonly unknown[]).includes(template)) return null;
    return { policy: policy as GuardPolicy, template: template as PolicyTemplateName };
  } catch {
    return null;
  }
}

export function writeRules(rules: StoredRules): void {
  write(KEYS.rules, JSON.stringify(rules));
}

/**
 * The names this browser gave its vault's merchants, by lowercase address.
 * The chain holds no names; without this a merchant shows as its address.
 */
export function readMerchants(): Record<string, string> {
  try {
    const value: unknown = JSON.parse(read(KEYS.merchants) ?? "{}");
    if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
    const out: Record<string, string> = {};
    for (const [address, label] of Object.entries(value)) {
      if (/^0x[0-9a-f]{40}$/.test(address) && typeof label === "string") out[address] = label;
    }
    return out;
  } catch {
    return {};
  }
}

export function writeMerchant(address: string, label: string): void {
  write(KEYS.merchants, JSON.stringify({ ...readMerchants(), [address.toLowerCase()]: label }));
}

/** When this browser authorised the vault's agent, for the time before the indexer says. */
export function readAgentSince(): string | null {
  const at = read(KEYS.agentSince);
  return at && Number.isFinite(Date.parse(at)) ? at : null;
}

export function writeAgentSince(at: string): void {
  write(KEYS.agentSince, at);
}

export function clearStored(): void {
  for (const key of Object.values(KEYS)) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Nothing to clear.
    }
  }
}
