import {
  type Connector,
  connect,
  createConfig,
  createStorage,
  disconnect,
  type GetConnectionReturnType,
  getBalance,
  getConnection,
  getConnectors,
  noopStorage,
  reconnect,
  switchChain,
  watchConnection,
  watchConnectors,
} from "@wagmi/core";
import { http } from "viem";
import { monadTestnet } from "viem/chains";
import { connectErrorOf, isBaret, safeIcon } from "./baret.js";
import type { Connection, Engine, Push, WalletOption, WalletState } from "./store.js";

/**
 * The wallet engine behind the demo sites, loaded on demand by store.ts.
 *
 * @wagmi/core on viem: wallets are found with EIP-6963 (multi injected
 * provider discovery, which wagmi runs through mipd), one config holds
 * Monad testnet only, and the last wallet is remembered in localStorage
 * under "baret.demo" so a reload reconnects without a prompt. Switching
 * networks goes through the wallet; a wallet that does not know Monad
 * testnet is offered viem's chain definition to add it.
 *
 * Nothing here signs or sends: the sites read the address, Baret simulates
 * each request from it, and the balance is read from Monad testnet's
 * public RPC.
 */

export const STORAGE_KEY = "baret.demo";

/** localStorage when the browser lets this page use it, the no-op store otherwise. */
function browserStorage(): Storage | typeof noopStorage {
  try {
    const store = window.localStorage;
    const probe = `${STORAGE_KEY}.probe`;
    store.setItem(probe, "1");
    store.removeItem(probe);
    return store;
  } catch {
    return noopStorage;
  }
}

function optionOf(connector: Connector): WalletOption {
  return {
    id: connector.id,
    name: connector.name,
    icon: safeIcon(connector.icon),
    baret: isBaret(connector.id),
  };
}

function connectionOf(connection: GetConnectionReturnType): Connection {
  switch (connection.status) {
    case "connected":
      return {
        status: "connected",
        wallet: optionOf(connection.connector),
        address: connection.address,
        chainId: connection.chainId,
      };
    case "reconnecting":
      return { status: "reconnecting" };
    case "connecting":
      return { status: "connecting", id: connection.connector?.id ?? "" };
    default:
      return { status: "disconnected" };
  }
}

export async function start(push: Push, read: () => WalletState): Promise<Engine> {
  const config = createConfig({
    chains: [monadTestnet],
    transports: { [monadTestnet.id]: http() },
    multiInjectedProviderDiscovery: true,
    storage: createStorage({ key: STORAGE_KEY, storage: browserStorage() }),
  });

  /** Only wallets the browser announced: EIP-6963 connectors are injected ones. */
  const options = (): WalletOption[] =>
    getConnectors(config)
      .filter((c) => c.type === "injected")
      .map(optionOf);

  async function refreshBalance(): Promise<void> {
    const connection = getConnection(config);
    if (connection.status !== "connected") {
      push({ balance: null });
      return;
    }
    try {
      const { value } = await getBalance(config, {
        address: connection.address,
        chainId: monadTestnet.id,
      });
      // The account may have changed while the read was out.
      if (getConnection(config).address === connection.address) push({ balance: value });
    } catch {
      push({ balance: null });
    }
  }

  watchConnectors(config, { onChange: () => push({ options: options() }) });
  watchConnection(config, {
    onChange(next, before) {
      const connection = connectionOf(next);
      // While a connect is out, the store keeps the wallet it is waiting on.
      if (connection.status === "connecting" && read().connection.status === "connecting") return;
      push({ connection, ...(next.address !== before.address ? { balance: null } : {}) });
      if (next.status === "connected" && next.address !== before.address) void refreshBalance();
    },
  });

  push({ ready: true, options: options(), connection: connectionOf(getConnection(config)) });

  // Silent: only a wallet that authorised this site before, and was not
  // disconnected here since, comes back.
  await reconnect(config).catch(() => undefined);

  return {
    async connect(id) {
      const connector = getConnectors(config).find((c) => c.id === id);
      if (!connector) return;
      const current = getConnection(config);
      if (current.status === "connected" && current.connector.id === id) return;
      push({ error: null, switching: "idle", connection: { status: "connecting", id } });
      try {
        await connect(config, { connector });
      } catch (error) {
        push({
          error: { kind: connectErrorOf(error), name: connector.name },
          connection: connectionOf(getConnection(config)),
        });
      }
    },

    async disconnect() {
      try {
        await disconnect(config);
      } finally {
        push({
          connection: connectionOf(getConnection(config)),
          balance: null,
          switching: "idle",
        });
      }
    },

    async switchToMonad() {
      push({ switching: "busy" });
      try {
        await switchChain(config, { chainId: monadTestnet.id });
        push({ switching: "idle" });
      } catch (error) {
        // Saying no in the wallet is an answer, not a failure.
        push({ switching: connectErrorOf(error) === "rejected" ? "idle" : "failed" });
      }
    },

    refreshBalance,
  };
}
