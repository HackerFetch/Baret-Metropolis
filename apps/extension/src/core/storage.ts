import type { SealedVault } from "./keystore.js";
import type { Pending } from "./protocol.js";

/**
 * Where the extension keeps things.
 *
 *   storage.local    on disk: the sealed vault and the wallet's own records
 *                    (accounts, sites, activity, rules, settings). No key.
 *   storage.session  in memory, gone when the browser closes: the open
 *                    phrase, the lock deadline and the requests in waiting.
 *
 * Read on every use and never cached in a variable: the background can be
 * stopped at any moment and must find the same state when it starts again.
 */

export const KEYS = {
  vault: "baret.vault",
  /** The screens' persisted state (live/persist.ts). */
  state: "baret.state",
  /** Why the wallet last locked: "manual" or "idle". Absent: the browser restarted. */
  lockReason: "baret.lockReason",
  phrase: "baret.session.phrase",
  deadline: "baret.session.deadline",
  pending: "baret.session.pending",
  window: "baret.session.window",
} as const;

async function get<T>(area: "local" | "session", key: string): Promise<T | null> {
  const found = await browser.storage[area].get(key);
  return (found[key] as T | undefined) ?? null;
}

export const local = {
  vault: () => get<SealedVault>("local", KEYS.vault),
  setVault: (vault: SealedVault) => browser.storage.local.set({ [KEYS.vault]: vault }),
  state: () => get<Record<string, unknown>>("local", KEYS.state),
  setState: (state: unknown) => browser.storage.local.set({ [KEYS.state]: state }),
  lockReason: () => get<"manual" | "idle">("local", KEYS.lockReason),
  setLockReason: (reason: "manual" | "idle" | null) =>
    reason === null
      ? browser.storage.local.remove(KEYS.lockReason)
      : browser.storage.local.set({ [KEYS.lockReason]: reason }),
  clear: () => browser.storage.local.clear(),
};

export const session = {
  phrase: () => get<string>("session", KEYS.phrase),
  deadline: () => get<number>("session", KEYS.deadline),
  open: (phrase: string, deadline: number) =>
    browser.storage.session.set({ [KEYS.phrase]: phrase, [KEYS.deadline]: deadline }),
  setDeadline: (deadline: number) => browser.storage.session.set({ [KEYS.deadline]: deadline }),
  lock: () => browser.storage.session.remove([KEYS.phrase, KEYS.deadline]),
  pending: async () => (await get<Pending[]>("session", KEYS.pending)) ?? [],
  setPending: (pending: readonly Pending[]) =>
    browser.storage.session.set({ [KEYS.pending]: pending }),
  window: () => get<number>("session", KEYS.window),
  setWindow: (id: number | null) =>
    id === null
      ? browser.storage.session.remove(KEYS.window)
      : browser.storage.session.set({ [KEYS.window]: id }),
  clear: () => browser.storage.session.clear(),
};
