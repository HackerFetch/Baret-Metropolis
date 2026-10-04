/**
 * Reading a twelve-word recovery phrase, the BIP39 way: every word on the
 * English list, then the checksum. Twelve words carry 132 bits, 11 per word:
 * 128 bits of entropy and 4 bits that must equal the first 4 bits of the
 * SHA-256 of that entropy. Nothing here derives a key; it only answers
 * whether the words form a phrase, and if not, the first reason why.
 */

import { english } from "viem/accounts";

export const PHRASE_LENGTH = 12;

export type PhraseCheck =
  | { readonly ok: true; readonly words: readonly string[] }
  | { readonly ok: false; readonly error: "wordCount"; readonly count: number }
  | { readonly ok: false; readonly error: "unknownWord"; readonly position: number }
  | { readonly ok: false; readonly error: "invalid" };

const INDEX: ReadonlyMap<string, number> = new Map(english.map((word, i) => [word, i]));

/** The typed words in order, in lower case, whatever spaces or line breaks sit between them. */
export function splitPhrase(text: string): string[] {
  return text.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/** True when twelve listed words carry a matching checksum. */
export async function hasValidChecksum(words: readonly string[]): Promise<boolean> {
  if (words.length !== PHRASE_LENGTH) return false;
  let bits = 0n;
  for (const word of words) {
    const index = INDEX.get(word);
    if (index === undefined) return false;
    bits = (bits << 11n) | BigInt(index);
  }
  const checksum = Number(bits & 0xfn);
  let entropy = bits >> 4n;
  const bytes = new Uint8Array(16);
  for (let i = bytes.length - 1; i >= 0; i--) {
    bytes[i] = Number(entropy & 0xffn);
    entropy >>= 8n;
  }
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return checksum === (digest[0] ?? 0) >> 4;
}

/** The first problem with a typed phrase, in the order the reader fixes them. */
export async function checkPhrase(text: string): Promise<PhraseCheck> {
  const words = splitPhrase(text);
  if (words.length !== PHRASE_LENGTH) return { ok: false, error: "wordCount", count: words.length };
  const unknown = words.findIndex((word) => !INDEX.has(word));
  if (unknown !== -1) return { ok: false, error: "unknownWord", position: unknown + 1 };
  return (await hasValidChecksum(words)) ? { ok: true, words } : { ok: false, error: "invalid" };
}
