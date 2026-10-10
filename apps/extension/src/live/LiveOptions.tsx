import { LandingMotion } from "@baret/web-ui/components/LandingMotion";
import {
  type JSX,
  type ReactNode,
  StrictMode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { recoverMessageAddress } from "viem";
import { KEYS, session } from "../core/storage.js";
import { type Gate, GateContext } from "../data/gate.js";
import { activeAccount, ExtensionProvider, useExtension } from "../data/store.js";
import { router } from "../entrypoints/options/router.js";
import { sendMessage } from "../lib/messaging.js";
import { liveSource } from "./source.js";
import { balancesOf, openAccount } from "./wallet.js";

/**
 * The live options page: the same pages as the sample, on the real wallet.
 * It gives the pages the gate (data/gate.ts): whether the keystore is locked,
 * and its operations for setup, the backup and the lock. A browser with no
 * wallet yet opens setup, whatever page was asked for.
 */

const SETUP = "#/onboarding";

function read() {
  return sendMessage("status");
}

function Gated({ children }: { children: ReactNode }): JSX.Element | null {
  const { state, dispatch } = useExtension();
  const [status, setStatus] = useState<Awaited<ReturnType<typeof read>> | null>(null);
  const accounts = useRef(state.accounts);
  accounts.current = state.accounts;

  const refresh = useCallback(async () => setStatus(await read()), []);

  useEffect(() => {
    void refresh();
    const listener = (changes: Record<string, unknown>, area: string): void => {
      if (area === "session" && KEYS.phrase in changes) void refresh();
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, [refresh]);

  // No wallet in this browser: every page leads to setup.
  useEffect(() => {
    if (status && !status.initialized && !window.location.hash.startsWith(SETUP)) {
      window.location.hash = SETUP;
    }
  }, [status]);

  // The balances, read again every few seconds while the wallet is open.
  const address = activeAccount(state)?.address;
  const open = status?.unlocked === true;
  useEffect(() => {
    if (!open || !address) return;
    const load = () =>
      void balancesOf(address).then(
        (assets) => {
          const mon = assets.find((a) => a.symbol === "MON")?.balance ?? "0";
          dispatch({
            type: "patch",
            patch: {
              assets,
              accounts: accounts.current.map((a) =>
                a.address === address ? { ...a, balance: mon } : a,
              ),
            },
          });
        },
        () => {},
      );
    load();
    const id = window.setInterval(load, 6000);
    return () => window.clearInterval(id);
  }, [open, address, dispatch]);

  const gate = useMemo<Gate | null>(() => {
    if (!status) return null;
    return {
      // During setup there is nothing to lock yet.
      locked: status.initialized && !status.unlocked,
      lockReason: status.lockReason,
      lock: () => void sendMessage("lock").then(refresh),
      opened: () => void refresh(),
      wipe: (restore) =>
        void sendMessage("wipe").then(() => {
          window.location.assign(
            `${window.location.pathname}${restore ? "?restore=1" : ""}${SETUP}`,
          );
        }),
      create: async (passphrase, phrase) => {
        const made = await sendMessage("create", {
          passphrase,
          ...(phrase ? { phrase } : {}),
        });
        if ("error" in made) return made;
        dispatch({
          type: "patch",
          patch: {
            accounts: [{ id: "main", name: "Account 1", address: made.address, balance: "0" }],
            active: "main",
          },
        });
        await refresh();
        return made;
      },
      phrase: async () => (await session.phrase())?.split(" ") ?? null,
      reveal: async (passphrase) => (await sendMessage("reveal", passphrase))?.split(" ") ?? null,
      rekey: (current, next) => sendMessage("rekey", { current, next }),
      checkAccount: async (step) => {
        try {
          const account = await openAccount();
          if (!account) return false;
          step(0);
          await balancesOf(account.address);
          step(1);
          const message = `Baret account check ${new Date().toISOString()}`;
          const signature = await account.signMessage({ message });
          const signer = await recoverMessageAddress({ message, signature });
          return signer === account.address;
        } catch {
          return false;
        }
      },
    };
  }, [status, refresh, dispatch]);

  if (!gate) return null;
  return <GateContext value={gate}>{children}</GateContext>;
}

export async function mountLiveOptions(container: HTMLElement): Promise<void> {
  const source = await liveSource();
  createRoot(container).render(
    <StrictMode>
      <LandingMotion>
        <ExtensionProvider start={{ scenario: "live" }} live={source}>
          <Gated>
            <RouterProvider router={router} />
          </Gated>
        </ExtensionProvider>
      </LandingMotion>
    </StrictMode>,
  );
}
