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
  /**
   * How the source answers right now, for /health/ready: the mode it was set
   * to, the mode its next uncached lookup will use, and how many label lookups
   * are left today (null in funder mode). No key, no address.
   */
  describe?(): NansenState;
}

export interface NansenState {
  mode: "funder" | "labels";
  /** "funder" in labels mode once today's label lookups are used up. */
  answering: "funder" | "labels";
  labelsLeftToday: number | null;
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

/** An active Cleanverse identity credential (A-Pass), or null when the address has none. */
export interface Credential {
  /** Unix seconds; null when the credential does not expire. */
  expiresAt: number | null;
  /** ISO 3166-1 alpha-2 codes the credential carries. Can be empty. */
  countries: string[];
  tier: number;
}

export interface ComplianceSource {
  /** Throws when the source does not answer. Every requested address gets an entry. */
  lookup(addresses: readonly Address[]): Promise<Map<Address, Credential | null>>;
  /**
   * Which of these tokens are compliant assets (CVA): tokens that refuse to
   * move unless both sides hold a credential.
   */
  gatedTokens(tokens: readonly Address[]): Promise<Address[]>;
}

export interface Sources {
  nansen: NansenSource | null;
  registry: RegistrySource | null;
  compliance: ComplianceSource | null;
}

export const REGISTRY_BLOCKLIST_SEVERITY = 3;
