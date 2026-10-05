/**
 * Pure helpers for the demo sites' wallet picker: which announced wallet is
 * Baret, which icons are safe to draw, and what a failed connect means.
 */

/**
 * The reverse-DNS name the Baret extension announces over EIP-6963: the
 * showcase's own domain, baret-metropolis.vercel.app, reversed. The picker
 * lists Baret first when a wallet announces exactly this; the extension's
 * provider is to use the same value (tasks/FOR_EZGIN.md).
 */
export const BARET_RDNS = "app.vercel.baret-metropolis";

export function isBaret(id: string): boolean {
  return id === BARET_RDNS;
}

/**
 * EIP-6963 says a wallet's icon is a data URI. Anything else (an http URL
 * that would call home, a javascript: URL) is dropped and the picker draws
 * a plain mark instead. A data URI in an <img> runs no script, SVG included.
 */
export function safeIcon(icon: string | undefined): string | null {
  return typeof icon === "string" && /^data:image\/(?:svg\+xml|png|jpeg|webp|gif)[;,]/i.test(icon)
    ? icon
    : null;
}

/** Why a connect failed, as the picker words it. */
export type ConnectError = "rejected" | "pending" | "failed";

/**
 * The EIP-1193 code anywhere in the error's cause chain: 4001 is the user
 * saying no, -32002 a request the wallet already has open. Libraries wrap
 * the provider's error, so the code can sit a few causes down.
 */
export function connectErrorOf(error: unknown): ConnectError {
  let current: unknown = error;
  for (let depth = 0; depth < 6 && typeof current === "object" && current !== null; depth++) {
    const code = (current as { code?: unknown }).code;
    if (code === 4001) return "rejected";
    if (code === -32002) return "pending";
    current = (current as { cause?: unknown }).cause;
  }
  return "failed";
}
