import { findings, hub } from "@baret/content";
import { Button, truncateAddress } from "@baret/ui";
import type { WindowCall } from "@baret/wallet-core/window";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, useCallback, useRef, useState } from "react";
import { askBaret, type BaretAnswer, focusBaretWindow } from "./baretWindow.js";
import { BUSY, LINK } from "./SignBlock.js";

/**
 * A site's "Check with Baret", beside "Sign with your wallet": the same
 * request sent to the Baret wallet, which opens in its own window, checks it
 * with Baret and refuses it when Blocked, so nothing is signed. Under the
 * button, what the wallet answered: why it refused, or the signed hash on
 * the explorer.
 *
 * The block holds no state: the site owns the ask (useBaretCheck) and
 * builds the call, since only it knows its request.
 */

const copy = hub.frame.baretCheck;
const sign = hub.frame.sign;

export type BaretCheckState =
  | { readonly phase: "idle" }
  | { readonly phase: "waiting" }
  | { readonly phase: "done"; readonly answer: BaretAnswer };

/** The last ask of a site's "Check with Baret", and how to start or clear one. */
export function useBaretCheck(): {
  state: BaretCheckState;
  /** Call straight from the click: the wallet window opens synchronously. */
  ask: (call: WindowCall) => void;
  reset: () => void;
} {
  const [state, setState] = useState<BaretCheckState>({ phase: "idle" });
  // Each ask and reset moves this on, so an answer to an older ask is dropped.
  const run = useRef(0);

  const ask = useCallback((call: WindowCall) => {
    run.current += 1;
    const mine = run.current;
    const asked = askBaret("sign", call);
    setState({ phase: "waiting" });
    void asked.then((answer) => {
      if (run.current === mine) setState({ phase: "done", answer });
    });
  }, []);

  const reset = useCallback(() => {
    run.current += 1;
    setState({ phase: "idle" });
  }, []);

  return { state, ask, reset };
}

const ALERT = "text-sm font-medium text-[color:var(--blocked)] [overflow-wrap:anywhere]";

/**
 * A finding's title from the shared copy, filled with the values the wallet
 * sent; a code the copy does not know reads as itself.
 */
function titleOf(code: string, values: Readonly<Record<string, string>>): string {
  if (!Object.hasOwn(findings, code)) return code;
  return fill(findings[code as keyof typeof findings].title, values);
}

function Result({ answer }: { answer: BaretAnswer }): JSX.Element {
  switch (answer.type) {
    case "signed":
      return (
        <div className="grid gap-1">
          <p className="text-sm font-medium text-[color:var(--fg)]">{copy.signed}</p>
          <a
            href={`${sign.explorer}/tx/${answer.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className={LINK}
          >
            {fill(sign.view, { hash: truncateAddress(answer.hash) })}
          </a>
        </div>
      );
    case "refused":
      if (answer.reason === "declined") return <p className={T.small}>{copy.declined}</p>;
      if (answer.reason === "unreachable") return <p className={ALERT}>{copy.unreachable}</p>;
      return (
        <div className="grid gap-2">
          <p className={ALERT}>{copy.blocked}</p>
          {answer.findings.length > 0 ? (
            <>
              <p className={T.label}>{copy.findings}</p>
              <ul className="grid gap-1">
                {answer.findings.map((finding) => (
                  <li
                    key={finding.code}
                    className="border-l-4 border-[color:var(--blocked)] pl-3 text-sm text-[color:var(--fg)] [overflow-wrap:anywhere]"
                  >
                    {titleOf(finding.code, finding.values)}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      );
    case "closed":
      return <p className={T.small}>{copy.closed}</p>;
    case "blocked":
      return <p className={ALERT}>{copy.blockedWindow}</p>;
    case "busy":
      return <p className={T.small}>{copy.busy}</p>;
    default:
      // A connect answer never comes back to a sign request.
      return <p className={T.small}>{copy.closed}</p>;
  }
}

export function BaretCheck({
  state,
  busy = false,
  onCheck,
}: {
  state: BaretCheckState;
  /** True while another wallet request of the page is open. */
  busy?: boolean;
  onCheck: () => void;
}): JSX.Element {
  // While the wallet window waits, a press brings it back to the front
  // (it may have fallen behind the site); it never opens a second request.
  const waiting = state.phase === "waiting";
  const locked = busy && !waiting;
  return (
    <div className="grid gap-3">
      <Button
        type="button"
        variant="ghost"
        size="lg"
        className={`w-full ${BUSY}`}
        aria-disabled={locked || undefined}
        onClick={() => {
          if (waiting) focusBaretWindow();
          else if (!locked) onCheck();
        }}
      >
        {copy.action}
      </Button>
      <p className={T.small}>{copy.note}</p>
      {/* Always mounted, so each answer is read out; focusable, so a reader can return to it. */}
      <div aria-live="polite" tabIndex={-1} className="grid gap-2 empty:hidden focus:outline-none">
        {state.phase === "waiting" ? <p className={T.small}>{copy.waiting}</p> : null}
        {state.phase === "done" ? <Result answer={state.answer} /> : null}
      </div>
    </div>
  );
}
