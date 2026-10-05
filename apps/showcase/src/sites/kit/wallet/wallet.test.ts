import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BARET_RDNS, connectErrorOf, isBaret, safeIcon } from "./baret.js";
import { start } from "./engine.js";
import { hadWallet, INITIAL, type Push, type WalletState } from "./store.js";
import { exceeds, formatMon } from "./useDemoWallet.js";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const ICON = "data:image/svg+xml;base64,PHN2Zy8+";

/** A browser wallet that announces itself over EIP-6963 and answers EIP-1193 calls. */
function mockWallet(rdns: string, name: string, chainId = 1) {
  let chain = chainId;
  let authorised = false;
  const known = new Set([chainId]);
  const calls: string[] = [];
  const handlers = new Map<string, Set<(arg: unknown) => void>>();
  const emit = (event: string, arg: unknown) => {
    for (const fn of handlers.get(event) ?? []) fn(arg);
  };
  const provider = {
    async request({ method, params }: { method: string; params?: unknown[] }) {
      calls.push(method);
      switch (method) {
        case "eth_requestAccounts":
          authorised = true;
          return [ACCOUNT];
        case "eth_accounts":
          return authorised ? [ACCOUNT] : [];
        case "eth_chainId":
          return `0x${chain.toString(16)}`;
        case "wallet_switchEthereumChain": {
          const id = Number((params as [{ chainId: string }])[0].chainId);
          if (!known.has(id)) throw Object.assign(new Error("Unrecognized chain"), { code: 4902 });
          chain = id;
          emit("chainChanged", `0x${id.toString(16)}`);
          return null;
        }
        case "wallet_addEthereumChain": {
          // Like MetaMask and Rabby: adding a chain also switches to it.
          const id = Number((params as [{ chainId: string }])[0].chainId);
          known.add(id);
          chain = id;
          emit("chainChanged", `0x${id.toString(16)}`);
          return null;
        }
        case "wallet_requestPermissions":
          return [{ parentCapability: "eth_accounts" }];
        case "wallet_revokePermissions":
          authorised = false;
          return null;
        default:
          throw Object.assign(new Error(`unsupported ${method}`), { code: 4200 });
      }
    },
    on(event: string, fn: (arg: unknown) => void) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)?.add(fn);
    },
    removeListener(event: string, fn: (arg: unknown) => void) {
      handlers.get(event)?.delete(fn);
    },
  };
  const detail = Object.freeze({
    info: { uuid: crypto.randomUUID(), name, icon: ICON, rdns },
    provider,
  });
  const announce = () =>
    window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail }));
  window.addEventListener("eip6963:requestProvider", announce);
  announce();
  return {
    calls,
    get chain() {
      return chain;
    },
    stop: () => window.removeEventListener("eip6963:requestProvider", announce),
  };
}

function harness() {
  let state: WalletState = INITIAL;
  const push: Push = (patch) => {
    state = { ...state, ...patch };
  };
  return {
    push,
    read: () => state,
    get state() {
      return state;
    },
  };
}

describe("wallet helpers", () => {
  it("knows Baret by its reverse-DNS name only", () => {
    expect(isBaret(BARET_RDNS)).toBe(true);
    expect(isBaret("io.metamask")).toBe(false);
  });

  it("draws only image data URIs", () => {
    expect(safeIcon(ICON)).toBe(ICON);
    expect(safeIcon("data:image/png;base64,AA")).toBe("data:image/png;base64,AA");
    for (const bad of [
      "https://x.example/i.svg",
      "javascript:alert(1)",
      "data:text/html,x",
      undefined,
    ]) {
      expect(safeIcon(bad)).toBeNull();
    }
  });

  it("reads 4001 and -32002 anywhere in the cause chain", () => {
    expect(connectErrorOf({ code: 4001 })).toBe("rejected");
    expect(connectErrorOf({ cause: { cause: { code: -32002 } } })).toBe("pending");
    expect(connectErrorOf(new Error("x"))).toBe("failed");
  });

  it("prints MON cut to four decimals and compares a known balance only", () => {
    expect(formatMon(1_234_567_890_000_000_000n)).toBe("1.2345");
    expect(formatMon(0n)).toBe("0");
    expect(exceeds(2n, 1n)).toBe(true);
    expect(exceeds(2n, null)).toBe(false);
  });
});

describe("wallet engine (wagmi over EIP-6963)", () => {
  let wallets: ReturnType<typeof mockWallet>[] = [];
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    for (const w of wallets) w.stop();
    wallets = [];
  });

  it("lists announced wallets, Baret marked, and connects without a prompt to switch", async () => {
    wallets = [mockWallet("io.rabby", "Rabby"), mockWallet(BARET_RDNS, "Baret")];
    const h = harness();
    const engine = await start(h.push, h.read);
    expect(h.state.ready).toBe(true);
    const ids = h.state.options.map((o) => o.id);
    expect(ids).toEqual(expect.arrayContaining(["io.rabby", BARET_RDNS]));
    expect(h.state.options.find((o) => o.id === BARET_RDNS)?.baret).toBe(true);
    expect(h.state.options[0]?.icon).toBe(ICON);

    await engine.connect("io.rabby");
    expect(h.state.connection).toMatchObject({ status: "connected", address: ACCOUNT, chainId: 1 });
    expect(hadWallet()).toBe(true);
  });

  it("adds Monad testnet when the wallet does not know it, then switches", async () => {
    const w = mockWallet("io.rabby", "Rabby");
    wallets = [w];
    const h = harness();
    const engine = await start(h.push, h.read);
    await engine.connect("io.rabby");
    await engine.switchToMonad();
    expect(w.calls).toContain("wallet_addEthereumChain");
    expect(w.chain).toBe(10143);
    expect(h.state.switching).toBe("idle");
  });

  it("forgets a disconnected wallet on the next load", async () => {
    wallets = [mockWallet("io.rabby", "Rabby")];
    const h = harness();
    const engine = await start(h.push, h.read);
    await engine.connect("io.rabby");
    await engine.disconnect();
    expect(h.state.connection.status).toBe("disconnected");
    expect(hadWallet()).toBe(false);
  });
});
