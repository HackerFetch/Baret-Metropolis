import { english, generateMnemonic, type HDAccount, mnemonicToAccount } from "viem/accounts";

/**
 * The keystore: a twelve-word recovery phrase, encrypted with the passphrase
 * and kept in this browser.
 *
 * The phrase is the root of every account (BIP-39, BIP-44 path
 * m/44'/60'/0'/0/n, so the same words open the same accounts in any wallet).
 * It is sealed with AES-256-GCM under a key stretched from the passphrase
 * with PBKDF2-SHA-256. The sealed vault is the only thing written to disk:
 * the passphrase is never stored, and the open phrase lives in the browser's
 * session storage (memory, cleared when the browser closes) until the lock.
 *
 * Nothing here talks to storage or the network: the callers do, so this file
 * is tested as plain functions.
 */

/** OWASP's 2023 floor for PBKDF2-HMAC-SHA256. */
export const KDF_ITERATIONS = 600_000;
export const PASSPHRASE_MIN = 12;

export interface SealedVault {
  readonly v: 1;
  readonly kdf: "pbkdf2-sha256";
  readonly iterations: number;
  /** Base64. */
  readonly salt: string;
  readonly iv: string;
  readonly data: string;
}

const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const raw = atob(text);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function keyFrom(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** A new twelve-word phrase from the browser's random source. */
export function newPhrase(): string {
  return generateMnemonic(english);
}

/** Whether the words are a BIP-39 phrase an account can come from. */
export function isPhrase(phrase: string): boolean {
  try {
    mnemonicToAccount(phrase);
    return phrase.trim().split(/\s+/).length === 12;
  } catch {
    return false;
  }
}

/** Account `index` of the phrase. */
export function accountOf(phrase: string, index = 0): HDAccount {
  return mnemonicToAccount(phrase, { addressIndex: index });
}

/** Seals the phrase under the passphrase. `iterations` is lowered only by tests. */
export async function seal(
  phrase: string,
  passphrase: string,
  iterations = KDF_ITERATIONS,
): Promise<SealedVault> {
  if (passphrase.length < PASSPHRASE_MIN) throw new Error("the passphrase is too short");
  if (!isPhrase(phrase)) throw new Error("not a recovery phrase");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFrom(passphrase, salt, iterations);
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(phrase));
  return {
    v: 1,
    kdf: "pbkdf2-sha256",
    iterations,
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(data)),
  };
}

/** The phrase, or null for a wrong passphrase or a vault that is not one. */
export async function open(vault: unknown, passphrase: string): Promise<string | null> {
  if (!isVault(vault)) return null;
  try {
    const key = await keyFrom(passphrase, fromBase64(vault.salt), vault.iterations);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(vault.iv) },
      key,
      fromBase64(vault.data),
    );
    const phrase = new TextDecoder().decode(plain);
    return isPhrase(phrase) ? phrase : null;
  } catch {
    return null;
  }
}

export function isVault(value: unknown): value is SealedVault {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<SealedVault>;
  return (
    v.v === 1 &&
    v.kdf === "pbkdf2-sha256" &&
    typeof v.iterations === "number" &&
    Number.isInteger(v.iterations) &&
    v.iterations > 0 &&
    typeof v.salt === "string" &&
    typeof v.iv === "string" &&
    typeof v.data === "string"
  );
}
