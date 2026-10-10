import { accountOf, isPhrase, newPhrase, open, seal } from "../core/keystore.js";
import {
  CHAIN_ID,
  CHAIN_ID_HEX,
  ERRORS,
  type Pending,
  type PendingKind,
  READ_METHODS,
  type RpcOutcome,
  type RpcReply,
  siteOf,
} from "../core/protocol.js";
import { local, session } from "../core/storage.js";
import { onMessage, sendMessage } from "../lib/messaging.js";

/**
 * The background. A service worker on Chrome, an event page on Firefox. WXT
 * emits the right manifest key for each from this one file.
 *
 * Design rule, borrowed from how Rabby does it rather than how MetaMask does
 * it: assume this context dies at any moment. Chrome terminates the worker
 * after 30 seconds of inactivity, after a single request over 5 minutes, and
 * after any fetch that takes over 30 seconds. Keeping it alive with a
 * heartbeat is explicitly outside what Google sanctions, so nothing here is
 * allowed to depend on staying resident.
 *
 * What that means in practice:
 *  - The open phrase lives in storage.session, which survives a restart of
 *    this worker and is wiped when the browser closes. Never in
 *    storage.local, never on disk.
 *  - Auto-lock is an absolute deadline, not a timer, so it survives a restart.
 *  - A request that waits for the owner is parked in storage.session and
 *    answered by a message to the tab that asked, never by a promise this
 *    worker would have to keep alive.
 *
 * What the background does: it answers a page's provider requests, parks the
 * ones that need the owner and opens the request window, and holds the
 * keystore's three operations (create, open, lock). It never signs: the
 * request window does, after Baret's verdict, with the owner looking at it.
 */

const RPC_URL: string =
  (import.meta.env.WXT_MONAD_TESTNET_RPC_URL as string | undefined) ||
  "https://testnet-rpc.monad.xyz";

const LOCK_ALARM = "baret.lock";
const DEFAULT_LOCK_MINUTES = 15;

export default defineBackground({
  // Not `type: "module"`: a module worker shares chunks with the pages, and a
  // chunk that touches `document` when it loads stops the worker before it
  // registers a single listener. Built as one file, it loads nothing it does
  // not use.
  main() {
    // Keep this synchronous. Listeners have to be registered during the first
    // evaluation of the worker, or an event that woke it up is lost.
    browser.runtime.onInstalled.addListener(({ reason }) => {
      if (reason === "install") {
        void browser.tabs.create({ url: browser.runtime.getURL("/options.html#/onboarding") });
      }
    });

    onMessage("rpc", ({ data, sender }) => {
      const origin = originOf(sender);
      const tabId = sender.tab?.id;
      if (!origin || tabId === undefined) return { error: ERRORS.internal };
      return handle(origin, tabId, data).catch((): RpcReply => ({ error: ERRORS.internal }));
    });
    onMessage("resolve", ({ data }) => resolve(data.id, data.outcome));
    onMessage("pending", () => session.pending());
    onMessage("status", () => status());
    onMessage("create", ({ data }) => create(data.passphrase, data.phrase));
    onMessage("unlock", ({ data }) => unlock(data));
    onMessage("lock", () => lock());
    onMessage("wipe", () => wipe());
    onMessage("reveal", async ({ data }) => open(await local.vault(), data));
    onMessage("rekey", ({ data }) => rekey(data.current, data.next));

    browser.windows.onRemoved.addListener((id) => void windowClosed(id));
    browser.tabs.onRemoved.addListener((id) => void tabClosed(id));
    browser.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === LOCK_ALARM) void lockIfDue();
    });
  },
});

/** The origin the browser reports for a sender; a page cannot choose it. */
function originOf(sender: { origin?: string; url?: string }): string | null {
  try {
    const origin = sender.origin ?? (sender.url ? new URL(sender.url).origin : null);
    return origin && origin !== "null" ? origin : null;
  } catch {
    return null;
  }
}

// ── The wallet's records, as the screens persist them ──

interface StoredAccount {
  id: string;
  address: string;
}

interface StoredSite {
  origin: string;
  status: string;
  account: string | null;
}

async function records(): Promise<{
  accounts: StoredAccount[];
  active: string | null;
  sites: StoredSite[];
  lockMinutes: number;
}> {
  const state = (await local.state()) ?? {};
  const accounts = Array.isArray(state.accounts) ? (state.accounts as StoredAccount[]) : [];
  const sites = Array.isArray(state.sites) ? (state.sites as StoredSite[]) : [];
  const settings = state.settings as { lockMinutes?: unknown } | undefined;
  return {
    accounts,
    active: typeof state.active === "string" ? state.active : null,
    sites,
    lockMinutes:
      typeof settings?.lockMinutes === "number" && settings.lockMinutes > 0
        ? settings.lockMinutes
        : DEFAULT_LOCK_MINUTES,
  };
}

/** The address a connected site sees, or null when the site is not connected. */
async function addressFor(origin: string): Promise<string | null> {
  const { accounts, active, sites } = await records();
  const site = sites.find((s) => s.origin === siteOf(origin));
  if (!site) return null;
  if (site.status !== "connected") return null;
  const account =
    accounts.find((a) => a.id === site.account) ??
    accounts.find((a) => a.id === active) ??
    accounts[0];
  return account?.address ?? null;
}

// ── Keystore ──

async function unlocked(): Promise<boolean> {
  await lockIfDue();
  return (await session.phrase()) !== null;
}

async function lockIfDue(): Promise<void> {
  const deadline = await session.deadline();
  if (deadline !== null && Date.now() >= deadline) await lock("idle");
}

async function arm(): Promise<number> {
  const { lockMinutes } = await records();
  const deadline = Date.now() + lockMinutes * 60_000;
  await browser.alarms.create(LOCK_ALARM, { when: deadline });
  return deadline;
}

async function status(): Promise<{
  initialized: boolean;
  unlocked: boolean;
  lockReason: "manual" | "idle" | "restart";
}> {
  const initialized = (await local.vault()) !== null;
  const isOpen = initialized && (await unlocked());
  // The owner is looking at the wallet: the idle deadline moves on.
  if (isOpen) await session.setDeadline(await arm());
  return { initialized, unlocked: isOpen, lockReason: (await local.lockReason()) ?? "restart" };
}

async function create(
  passphrase: string,
  given?: string,
): Promise<{ address: string } | { error: string }> {
  if ((await local.vault()) !== null) return { error: "a wallet already exists in this browser" };
  const phrase = given?.trim().toLowerCase().split(/\s+/).join(" ") ?? newPhrase();
  if (!isPhrase(phrase)) return { error: "not a recovery phrase" };
  try {
    await local.setVault(await seal(phrase, passphrase));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "the wallet could not be made" };
  }
  await session.open(phrase, await arm());
  await local.setLockReason(null);
  return { address: accountOf(phrase).address };
}

async function unlock(passphrase: string): Promise<boolean> {
  const phrase = await open(await local.vault(), passphrase);
  if (phrase === null) return false;
  await session.open(phrase, await arm());
  await local.setLockReason(null);
  return true;
}

async function lock(reason: "manual" | "idle" = "manual"): Promise<void> {
  await session.lock();
  await local.setLockReason(reason);
  await browser.alarms.clear(LOCK_ALARM);
}

async function rekey(current: string, next: string): Promise<boolean> {
  const phrase = await open(await local.vault(), current);
  if (phrase === null) return false;
  try {
    await local.setVault(await seal(phrase, next));
    return true;
  } catch {
    // Too short to seal under: the vault stays as it was.
    return false;
  }
}

async function wipe(): Promise<void> {
  await rejectAll();
  await session.clear();
  await local.clear();
  await browser.alarms.clear(LOCK_ALARM);
}

// ── Requests that wait for the owner ──

/** One change to the queue at a time: two requests must not overwrite each other. */
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(run: () => Promise<T>): Promise<T> {
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}

function park(
  kind: PendingKind,
  origin: string,
  tabId: number,
  request: { id: string; method: string; params: readonly unknown[] },
): Promise<RpcReply> {
  return serial(async () => {
    const list = await session.pending();
    list.push({
      id: request.id,
      kind,
      origin,
      tabId,
      method: request.method,
      params: request.params,
      at: new Date().toISOString(),
    });
    await session.setPending(list);
    await showWindow();
    return { pending: true } as const;
  });
}

async function showWindow(): Promise<void> {
  const known = await session.window();
  if (known !== null) {
    try {
      await browser.windows.update(known, { focused: true });
      return;
    } catch {
      // It was closed without this worker hearing of it.
    }
  }
  const created = await browser.windows.create({
    url: `${browser.runtime.getURL("/popup.html")}?request=1`,
    type: "popup",
    width: 376,
    height: 640,
    focused: true,
  });
  await session.setWindow(created?.id ?? null);
}

function resolve(id: string, outcome: RpcOutcome): Promise<void> {
  return serial(async () => {
    const list = await session.pending();
    const found = list.find((p) => p.id === id);
    if (!found) return;
    await session.setPending(list.filter((p) => p.id !== id));
    await tell(found, outcome);
  });
}

async function tell(pending: Pending, outcome: RpcOutcome): Promise<void> {
  try {
    await sendMessage("rpcResult", { id: pending.id, outcome }, pending.tabId);
  } catch {
    // The tab is gone: nobody is waiting for the answer.
  }
}

function rejectAll(match: (pending: Pending) => boolean = () => true): Promise<void> {
  return serial(async () => {
    const list = await session.pending();
    await session.setPending(list.filter((p) => !match(p)));
    await Promise.all(list.filter(match).map((p) => tell(p, { error: ERRORS.rejected })));
  });
}

/** A request this young cannot have been on screen when the window closed. */
const JUST_ARRIVED_MS = 2000;

/**
 * The request window was closed: whatever waited in it was not approved.
 * The window also closes itself after its last answer, and a site's next
 * request can arrive in that same instant. Such a request was never shown, so
 * it is kept and gets a window of its own.
 */
async function windowClosed(id: number): Promise<void> {
  if ((await session.window()) !== id) return;
  await session.setWindow(null);
  const now = Date.now();
  const shown = (pending: Pending) => now - Date.parse(pending.at) >= JUST_ARRIVED_MS;
  await rejectAll(shown);
  if ((await session.pending()).length > 0) await serial(showWindow);
}

async function tabClosed(tabId: number): Promise<void> {
  await rejectAll((p) => p.tabId === tabId);
}

// ── The provider's methods ──

async function handle(
  origin: string,
  tabId: number,
  request: { id: string; method: string; params: readonly unknown[] },
): Promise<RpcReply> {
  const { method, params } = request;
  switch (method) {
    case "eth_chainId":
      return { result: CHAIN_ID_HEX };
    case "net_version":
      return { result: String(CHAIN_ID) };
    case "web3_clientVersion":
      return { result: `Baret/${browser.runtime.getManifest().version}` };

    case "eth_accounts": {
      const address = (await unlocked()) ? await addressFor(origin) : null;
      return { result: address ? [address] : [] };
    }
    case "eth_requestAccounts": {
      const address = await addressFor(origin);
      if (address && (await unlocked())) return { result: [address] };
      return park("connect", origin, tabId, request);
    }
    case "wallet_requestPermissions": {
      const address = await addressFor(origin);
      if (address && (await unlocked())) return { result: [{ parentCapability: "eth_accounts" }] };
      return park("connect", origin, tabId, request);
    }
    case "wallet_getPermissions":
      return {
        result: (await addressFor(origin)) ? [{ parentCapability: "eth_accounts" }] : [],
      };

    case "wallet_switchEthereumChain":
    case "wallet_addEthereumChain": {
      const asked = (params[0] as { chainId?: unknown } | undefined)?.chainId;
      const same = typeof asked === "string" && Number.parseInt(asked, 16) === CHAIN_ID;
      return same ? { result: null } : { error: ERRORS.chain };
    }

    case "eth_sendTransaction": {
      const address = await addressFor(origin);
      if (!address) return { error: ERRORS.unauthorized };
      const tx = params[0] as { from?: unknown; to?: unknown } | undefined;
      if (typeof tx !== "object" || tx === null) return { error: ERRORS.invalid };
      if (typeof tx.from === "string" && tx.from.toLowerCase() !== address.toLowerCase()) {
        return { error: ERRORS.unauthorized };
      }
      return park("transaction", origin, tabId, request);
    }
    case "eth_signTypedData_v4": {
      const address = await addressFor(origin);
      if (!address) return { error: ERRORS.unauthorized };
      if (typeof params[0] !== "string" || params[0].toLowerCase() !== address.toLowerCase()) {
        return { error: ERRORS.unauthorized };
      }
      return park("typedData", origin, tabId, request);
    }
    case "personal_sign": {
      const address = await addressFor(origin);
      if (!address) return { error: ERRORS.unauthorized };
      if (typeof params[0] !== "string") return { error: ERRORS.invalid };
      return park("message", origin, tabId, request);
    }

    default:
      // eth_sign and eth_signTransaction sign what nobody can read or check:
      // refused, like every method not listed here.
      if (!READ_METHODS.has(method)) return { error: ERRORS.unsupported };
      return read(method, params);
  }
}

/** A read-only call, passed to the Monad RPC as it is. */
async function read(method: string, params: readonly unknown[]): Promise<RpcOutcome> {
  try {
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(20_000),
    });
    const body = (await res.json()) as {
      result?: unknown;
      error?: { code?: unknown; message?: unknown };
    };
    if (body.error) {
      return {
        error: {
          code: typeof body.error.code === "number" ? body.error.code : -32603,
          message: typeof body.error.message === "string" ? body.error.message : "RPC error",
        },
      };
    }
    return { result: body.result ?? null };
  } catch {
    return { error: ERRORS.internal };
  }
}
