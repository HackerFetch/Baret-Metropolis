import { KEYS, local } from "../core/storage.js";
import { type ExtState, initialState, type LiveSource } from "../data/store.js";
import { sendMessage } from "../lib/messaging.js";

/**
 * The live wallet's side of the store (data/store.tsx `LiveSource`): where a
 * live page's state comes from and where it goes.
 *
 * The wallet's own records (accounts, sites, the activity log, rules,
 * settings) are saved to the extension's storage on every change, and a
 * change another page saved is taken in. What the chain or the server says
 * (balances, whether Baret answers) is never saved: it is read again.
 *
 * Loaded only on a live page (lib/live.ts), so the sample pages and the
 * tests never touch the extension's APIs.
 */

/** Baret's server: fixed into the build, like the manifest's host permission. */
export const API_URL: string = (
  (import.meta.env.WXT_BARET_API_URL as string | undefined) || "http://localhost:8080"
).replace(/\/+$/, "");

export const RPC_URL: string =
  (import.meta.env.WXT_MONAD_TESTNET_RPC_URL as string | undefined) ||
  "https://testnet-rpc.monad.xyz";

/** The parts of the state that are the wallet's own record. */
const SAVED = [
  "accounts",
  "active",
  "activity",
  "permissions",
  "alerts",
  "sites",
  "facilitators",
  "payments",
  "problems",
  "watched",
  "policy",
  "template",
  "ruleChanges",
  "settings",
  "lock",
] as const satisfies readonly (keyof ExtState)[];

type Saved = Pick<ExtState, (typeof SAVED)[number]>;

function pick(state: ExtState): Saved {
  return Object.fromEntries(SAVED.map((key) => [key, state[key]])) as Saved;
}

/** What storage holds, as a patch: only known keys, and only arrays where arrays belong. */
function read(stored: Record<string, unknown> | null): Partial<ExtState> {
  if (!stored) return {};
  const patch: Record<string, unknown> = {};
  for (const key of SAVED) {
    const value = stored[key];
    if (value === undefined || value === null) continue;
    const wasArray = Array.isArray(EMPTY[key]);
    if (wasArray !== Array.isArray(value)) continue;
    patch[key] = value;
  }
  return patch as Partial<ExtState>;
}

/** A wallet with nothing in it yet: no account, no history, Balanced rules. */
const EMPTY: ExtState = {
  ...initialState({ scenario: "empty" }),
  scenario: "live",
  accounts: [],
  active: "main",
  watched: [],
};

export async function reach(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(20_000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function liveSource(): Promise<LiveSource> {
  const initial: ExtState = { ...EMPTY, ...read(await local.state()) };
  // What this page last wrote or took in, so a save is not echoed back.
  let last = JSON.stringify(pick(initial));

  return {
    initial,
    save(state) {
      const next = JSON.stringify(pick(state));
      if (next === last) return;
      last = next;
      void local.setState(JSON.parse(next));
    },
    subscribe(apply) {
      const listener = (changes: Record<string, { newValue?: unknown }>, area: string): void => {
        if (area !== "local" || !(KEYS.state in changes)) return;
        const value = changes[KEYS.state]?.newValue;
        if (typeof value !== "object" || value === null) return;
        const text = JSON.stringify(pick({ ...EMPTY, ...read(value as Record<string, unknown>) }));
        if (text === last) return;
        last = text;
        apply(JSON.parse(text) as Partial<ExtState>);
      };
      browser.storage.onChanged.addListener(listener);
      return () => browser.storage.onChanged.removeListener(listener);
    },
    unlock: (passphrase) => sendMessage("unlock", passphrase),
    reach,
  };
}
