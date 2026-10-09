import { useEffect, useSyncExternalStore } from "react";
import { type Address, type Hex, isAddress } from "viem";
import type { ConnectError } from "./baret.js";
import { askBaret } from "./baretWindow.js";

/**
 * The demo sites' wallet, as the page reads it. A small store of its own, so
 * the six sites share one connection and the wallet library stays out of
 * their first chunks: the engine (engine.ts, @wagmi/core with viem) loads
 * when the visitor reaches for the wallet control, or on idle when a wallet
 * was connected on an earlier visit.
 */

/** One wallet the browser announced over EIP-6963. */
export interface WalletOption {
  /** The connector id: the wallet's reverse-DNS name. */
  readonly id: string;
  readonly name: string;
  /** A data URI, or null when the wallet sent none we can draw. */
  readonly icon: string | null;
  readonly baret: boolean;
}

export type Connection =
  | { readonly status: "disconnected" }
  | { readonly status: "reconnecting" }
  | { readonly status: "connecting"; readonly id: string }
  | {
      readonly status: "connected";
      readonly wallet: WalletOption;
      readonly address: Address;
      readonly chainId: number;
    };

export interface WalletState {
  /** The engine is loaded and has asked the browser for wallets. */
  readonly ready: boolean;
  readonly options: readonly WalletOption[];
  readonly connection: Connection;
  /** The last connect that failed, with the wallet's name; cleared on the next try. */
  readonly error: { readonly kind: ConnectError; readonly name: string } | null;
  /** MON on Monad testnet for the connected address, in wei; null until read, or unreadable. */
  readonly balance: bigint | null;
  readonly switching: "idle" | "busy" | "failed";
  /** The Baret wallet connected through its own window (baretWindow.ts), or null. */
  readonly baret: { readonly address: Address } | null;
  /** The last connect through the Baret wallet window: under way, or how it ended without an address. */
  readonly baretStatus: BaretStatus;
  /** MON on Monad testnet for the Baret window address, in wei; null until read, or unreadable. */
  readonly baretBalance: bigint | null;
}

export type BaretStatus = "idle" | "connecting" | "declined" | "closed" | "blocked" | "busy";

export const INITIAL: WalletState = {
  ready: false,
  options: [],
  connection: { status: "disconnected" },
  error: null,
  balance: null,
  switching: "idle",
  baret: null,
  baretStatus: "idle",
  baretBalance: null,
};

/** One call for the wallet to send, as `@baret/demo` builds it: value in wei, as a decimal string. */
export interface SendCall {
  readonly from: Address;
  readonly to: Address;
  readonly value: string;
  readonly data: Hex;
}

/** What the engine can do once it has loaded. */
export interface Engine {
  connect(id: string): Promise<void>;
  disconnect(): Promise<void>;
  switchToMonad(): Promise<void>;
  refreshBalance(): Promise<void>;
  /**
   * Asks the connected wallet to sign and send one call on Monad testnet;
   * resolves to its hash once sent. Refuses with SendRefused when no wallet
   * or another account is connected ("account"), or the wallet is on another
   * chain ("network").
   */
  send(call: SendCall): Promise<Hex>;
  /** Waits for the call's block: "success" or "reverted". Rejects when Monad testnet does not confirm in time. */
  confirm(hash: Hex): Promise<"success" | "reverted">;
  /** An ERC-20 balance in base units, read from Monad testnet's public RPC. */
  tokenBalance(token: Address, owner: Address): Promise<bigint>;
  /** MON in wei for any address, read from Monad testnet's public RPC (the Baret window address). */
  balanceOf(address: Address): Promise<bigint>;
}

export type Push = (patch: Partial<WalletState>) => void;
export type EngineLoader = (push: Push, read: () => WalletState) => Promise<Engine>;

let state: WalletState = INITIAL;
const listeners = new Set<() => void>();

const push: Push = (patch) => {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
};

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const read = (): WalletState => state;

const defaultLoader: EngineLoader = async (p, r) => (await import("./engine.js")).start(p, r);

let loader: EngineLoader = defaultLoader;
let engine: Promise<Engine> | null = null;

/** Loads the engine once; a failed load can be tried again. */
export function prepare(): Promise<Engine> {
  engine ??= loader(push, read).catch((error: unknown) => {
    engine = null;
    throw error;
  });
  return engine;
}

/** A load that may fail without anyone waiting on it: the picker shows what it has. */
export function prefetch(): void {
  prepare().catch(() => undefined);
}

export function connectWallet(id: string): Promise<void> {
  return prepare().then((e) => e.connect(id));
}

export function disconnectWallet(): Promise<void> {
  return prepare().then((e) => e.disconnect());
}

export function switchToMonad(): Promise<void> {
  return prepare().then((e) => e.switchToMonad());
}

export function refreshBalance(): Promise<void> {
  return prepare().then((e) => e.refreshBalance());
}

export function sendCall(call: SendCall): Promise<Hex> {
  return prepare().then((e) => e.send(call));
}

export function confirmCall(hash: Hex): Promise<"success" | "reverted"> {
  return prepare().then((e) => e.confirm(hash));
}

export function readTokenBalance(token: Address, owner: Address): Promise<bigint> {
  return prepare().then((e) => e.tokenBalance(token, owner));
}

const pickerListeners = new Set<() => void>();

/** Opens the header's wallet picker from anywhere on the page (a card's "Sign with your wallet" with no wallet). */
export function requestPicker(): void {
  prefetch();
  for (const fn of pickerListeners) fn();
}

/** For the wallet control: runs `fn` on each request; returns the unsubscribe. */
export function onPickerRequest(fn: () => void): () => void {
  pickerListeners.add(fn);
  return () => {
    pickerListeners.delete(fn);
  };
}

/** The key the engine keeps the last wallet under (wagmi's storage, key "baret.demo"). */
export const RECENT_KEY = "baret.demo.recentConnectorId";

/**
 * Whether a wallet was connected here before and not disconnected since, so
 * the engine should load on its own. wagmi stores the id as JSON and marks a
 * wallet the visitor disconnected with "<id>.disconnected".
 */
export function hadWallet(): boolean {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (raw === null) return false;
    const id: unknown = JSON.parse(raw);
    if (typeof id !== "string") return false;
    return window.localStorage.getItem(`baret.demo.${id}.disconnected`) === null;
  } catch {
    return false;
  }
}

let resumed = false;

/** Once per page load: bring back a wallet the visitor connected before, when the page is idle. */
function resume(): void {
  if (resumed || !hadWallet()) return;
  resumed = true;
  const idle =
    "requestIdleCallback" in window
      ? (fn: () => void) => window.requestIdleCallback(fn, { timeout: 2000 })
      : (fn: () => void) => window.setTimeout(fn, 1200);
  idle(prefetch);
}

/** Where the Baret window's address is kept between visits: an address, not a secret. */
export const BARET_KEY = "baret.demo.window";

function readBaret(): WalletState["baret"] {
  try {
    const raw = window.localStorage.getItem(BARET_KEY);
    if (raw === null) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const address = (value as { address?: unknown }).address;
    return typeof address === "string" && isAddress(address) ? { address } : null;
  } catch {
    return null;
  }
}

function writeBaret(baret: WalletState["baret"]): void {
  try {
    if (baret === null) window.localStorage.removeItem(BARET_KEY);
    else window.localStorage.setItem(BARET_KEY, JSON.stringify(baret));
  } catch {
    // Storage blocked: the connection lasts for this page only.
  }
}

let restored = false;

/** Once per page load, after the first render: the Baret window address from an earlier visit. */
function restore(): void {
  if (restored) return;
  restored = true;
  const baret = readBaret();
  if (baret !== null) {
    push({ baret });
    void refreshBaretBalance();
  }
}

/**
 * Reads the Baret window address's MON, so the sites' balance guards work
 * for it as for an injected wallet. Unreadable stays null, never zero.
 */
export async function refreshBaretBalance(): Promise<void> {
  const baret = state.baret;
  if (baret === null) {
    push({ baretBalance: null });
    return;
  }
  try {
    const value = await prepare().then((e) => e.balanceOf(baret.address));
    if (state.baret?.address === baret.address) push({ baretBalance: value });
  } catch {
    if (state.baret?.address === baret.address) push({ baretBalance: null });
  }
}

/**
 * Connects the Baret wallet through its own window. Call it straight from a
 * click, so the browser lets the window open. Resolves once it has ended.
 */
export async function connectBaret(): Promise<void> {
  push({ baretStatus: "connecting" });
  const answer = await askBaret("connect");
  if (answer.type === "connected") {
    const baret = { address: answer.address };
    writeBaret(baret);
    push({ baret, baretStatus: "idle", baretBalance: null });
    void refreshBaretBalance();
    return;
  }
  const status: BaretStatus =
    answer.type === "blocked"
      ? "blocked"
      : answer.type === "busy"
        ? "busy"
        : answer.type === "refused"
          ? "declined"
          : "closed";
  push({ baretStatus: status });
}

/** Forgets the Baret window address here; the wallet itself keeps its account. */
export function forgetBaret(): void {
  writeBaret(null);
  push({ baret: null, baretStatus: "idle", baretBalance: null });
}

/** The wallet state, for a component. */
export function useWallet(): WalletState {
  useEffect(resume, []);
  useEffect(restore, []);
  return useSyncExternalStore(subscribe, read, () => INITIAL);
}

/** The connected address, or null. */
export function addressOf(wallet: WalletState): Address | null {
  return wallet.connection.status === "connected" ? wallet.connection.address : null;
}

/** For tests: a fake engine, and a clean store. */
export function resetForTests(next: EngineLoader = defaultLoader): void {
  loader = next;
  engine = null;
  resumed = false;
  restored = false;
  state = INITIAL;
  for (const listener of listeners) listener();
}
