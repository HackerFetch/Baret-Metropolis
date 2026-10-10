import { LandingMotion } from "@baret/web-ui/components/LandingMotion";
import { type JSX, StrictMode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Pending, RpcOutcome } from "../core/protocol.js";
import { KEYS } from "../core/storage.js";
import { activeAccount, ExtensionProvider, type LiveSource, useExtension } from "../data/store.js";
import { openOptions, openOptionsPath } from "../entrypoints/popup/navigation.js";
import { type LiveHooks, PopupApp } from "../entrypoints/popup/PopupApp.js";
import { Locked } from "../entrypoints/popup/screens/Locked.js";
import { Uninitialized } from "../entrypoints/popup/screens/Uninitialized.js";
import { sendMessage } from "../lib/messaging.js";
import type { Start } from "../lib/start.js";
import { LiveRequest, OwnTransfer } from "./requests.js";
import { liveSource } from "./source.js";
import { balancesOf } from "./wallet.js";

/**
 * The live popup: the same screens as the sample, driven by the wallet's real
 * state. The background says whether a wallet exists and whether it is open,
 * and holds the requests that wait; this decides what the 360 by 600 shows:
 *
 *   no wallet yet      the first-run screen, which opens setup
 *   locked             the passphrase
 *   a request waits    that request and nothing else, one at a time
 *   otherwise          the wallet's tabs
 *
 * Opened by the background as the request window (`?request=1`), it closes
 * itself when the last request is answered.
 */

const START: Start = {
  scenario: "live",
  phase: "ready",
  request: "safe",
  connect: "firstTime",
  reachable: true,
};

const REQUEST_WINDOW = new URLSearchParams(window.location.search).has("request");

interface Status {
  initialized: boolean;
  unlocked: boolean;
  lockReason: "manual" | "idle" | "restart";
}

/** Keeps the balances in the store current while the wallet is open. */
function useBalances(open: boolean): () => void {
  const { state, dispatch } = useExtension();
  const address = activeAccount(state)?.address;
  const accounts = useRef(state.accounts);
  accounts.current = state.accounts;
  const refresh = useCallback(() => {
    if (!open || !address) return;
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
      // A balance that was not read stays as it was; the screens say when Baret is away.
      () => {},
    );
  }, [open, address, dispatch]);
  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 15_000);
    return () => window.clearInterval(id);
  }, [refresh]);
  return refresh;
}

function Live(): JSX.Element | null {
  const { state } = useExtension();
  const [status, setStatus] = useState<Status | null>(null);
  const [pending, setPending] = useState<readonly Pending[]>([]);
  // The request on screen stays until the reader moves on, answered or not.
  const [shown, setShown] = useState<Pending | null>(null);
  // Requests this window has finished with. The background takes one off the
  // queue a moment after its answer: it must not come up a second time.
  const finished = useRef(new Set<string>());
  // The request on screen has its answer and only its result is still shown.
  const [answered, setAnswered] = useState(false);

  const read = useCallback(async () => {
    const [next, waiting] = await Promise.all([sendMessage("status"), sendMessage("pending")]);
    setStatus(next);
    setPending(waiting);
  }, []);

  useEffect(() => {
    void read();
    // A new request, a lock or an unlock anywhere: read again.
    const listener = (changes: Record<string, unknown>, area: string): void => {
      if (area !== "session") return;
      if (KEYS.pending in changes || KEYS.phrase in changes) void read();
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, [read]);

  const open = status?.initialized === true && status.unlocked;
  const refresh = useBalances(open);

  useEffect(() => {
    if (!open) return;
    const next = pending.find((p) => !finished.current.has(p.id) && p.id !== shown?.id);
    // A result left on screen gives way to the next request: a site that is
    // waiting must not wait on a screen the reader has finished with.
    if (shown && !(answered && next)) return;
    if (shown) finished.current.add(shown.id);
    setAnswered(false);
    if (next) setShown(next);
    else if (shown) setShown(null);
    else if (REQUEST_WINDOW && status) window.close();
  }, [open, shown, pending, status, answered]);

  const hooks = useMemo<LiveHooks>(
    () => ({
      lock: () => void sendMessage("lock").then(read),
      reset: () =>
        void sendMessage("wipe").then(() => {
          openOptions("onboarding");
          window.close();
        }),
      Transfer: ({ request, onFinished }) => (
        <OwnTransfer
          request={request}
          onFinished={() => {
            refresh();
            onFinished();
          }}
        />
      ),
    }),
    [read, refresh],
  );

  if (!status) return null;

  let body: JSX.Element;
  if (!status.initialized || state.accounts.length === 0) {
    body = (
      <Uninitialized
        onSetup={() => openOptions("onboarding")}
        onRestore={() => openOptionsPath("/onboarding", "?restore=1")}
      />
    );
  } else if (!status.unlocked) {
    const waiting = pending[0];
    body = (
      <Locked
        reason={
          waiting
            ? waiting.kind === "connect"
              ? "connectRequest"
              : "signRequest"
            : status.lockReason
        }
        values={{
          count: String(state.settings.lockMinutes),
          origin: waiting ? waiting.origin.replace(/^https?:\/\//, "") : "",
        }}
        onOpen={() => void read()}
        onReset={() => openOptionsPath("/onboarding", "?restore=1")}
      />
    );
  } else if (shown) {
    const answer = (outcome: RpcOutcome) => {
      setAnswered(true);
      void sendMessage("resolve", { id: shown.id, outcome });
    };
    body = (
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <LiveRequest
            key={shown.id}
            pending={shown}
            onAnswer={answer}
            onFinished={() => {
              finished.current.add(shown.id);
              refresh();
              setAnswered(false);
              setShown(null);
            }}
          />
        </div>
      </div>
    );
  } else {
    return <PopupApp start={START} onRestart={() => {}} live={hooks} />;
  }

  return (
    <div className="flex h-full flex-col bg-[color:var(--ground)] text-[color:var(--fg)]">
      <main className="relative min-h-0 flex-1">{body}</main>
    </div>
  );
}

export async function mountLivePopup(container: HTMLElement): Promise<void> {
  const source: LiveSource = await liveSource();
  createRoot(container).render(
    <StrictMode>
      <LandingMotion>
        <ExtensionProvider start={{ scenario: "live" }} live={source}>
          <Live />
        </ExtensionProvider>
      </LandingMotion>
    </StrictMode>,
  );
}
