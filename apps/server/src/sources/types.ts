import type { NansenTrustLevel } from "@baret/guard";
import type { Address } from "viem";

/** What Nansen says about one address. */
export interface NansenProfile {
  trustLevel: NansenTrustLevel;
  flagged: boolean;
  freshWallet: boolean;
  whale: boolean;
}

export interface NansenSource {
  /** Throws when Nansen does not answer. Every requested address gets an entry. */
  lookup(addresses: readonly Address[]): Promise<Map<Address, NansenProfile>>;
}

/** An entry in the on-chain ReputationRegistry (written by the CRE workflow). */
export interface RegistryEntry {
  flagged: boolean;
  /** 1 low … 4 critical; 3 and above is a blocklist entry. */
  severity: number;
  reasonCode: string;
}

export interface RegistrySource {
  lookup(addresses: readonly Address[]): Promise<Map<Address, RegistryEntry>>;
}

/** A Cleanverse identity credential, or null when the address has none. */
export interface Credential {
  /** Unix seconds. */
  expiresAt: number;
  /** ISO 3166-1 alpha-2. */
  country: string;
  tier: number;
}

export interface ComplianceSource {
  lookup(addresses: readonly Address[]): Promise<Map<Address, Credential | null>>;
}

export interface Sources {
  nansen: NansenSource | null;
  registry: RegistrySource | null;
  compliance: ComplianceSource | null;
}

export const REGISTRY_BLOCKLIST_SEVERITY = 3;
