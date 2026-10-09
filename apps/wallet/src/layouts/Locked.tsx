import { walletFrame } from "@baret/content";
import { Button, Mark } from "@baret/ui";
import { Problem } from "@baret/wallet-ui/components/Block";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, useEffect, useRef, useState } from "react";
import { sessionTime } from "../live/session.js";

export interface LockedProps {
  readonly onUnlock: () => void;
  /**
   * Set in a request window (/sign, /connect): the request waits behind the
   * lock, and it can still be declined without unlocking. Fail-closed: the
   * request itself is never shown while the wallet is locked.
   */
  readonly request?: boolean;
  /** Live: the passkey prompt is open, so the button waits. */
  readonly busy?: boolean;
  /** Live: why the last passkey prompt did not unlock, in the unlock's own words. */
  readonly problem?: "cancelled" | "unsupported" | "notCompatible" | null;
  /**
   * Live: when the session's deadline locked the wallet (ISO), or null after
   * a manual lock or a reload. Set, the screen says the session ended and at
   * what time, so an expiry reads as neither a crash nor the user's own doing.
   */
  readonly expiredAt?: string | null;
  /**
   * Live, in a request window a site opened: the site, as the browser reports
   * it, once its request is in. The screen names it.
   */
  readonly origin?: string | null;
  /** Live: tells the site the request was declined. The screen says so either way. */
  readonly onDecline?: () => void;
  /**
   * Live, with no passkey known on this device: creating the wallet becomes
   * the main action, and unlocking (a passkey from another device) the second.
   */
  readonly onCreate?: () => void;
}

/** What a locked wallet shows instead of the app or a pending request. */
export function Locked({
  onUnlock,
  request = false,
  busy = false,
  problem = null,
  expiredAt = null,
  origin = null,
  onDecline,
  onCreate,
}: LockedProps): JSX.Element {
  const { locked } = walletFrame;
  const [declined, setDeclined] = useState(false);
  const answer = useRef<HTMLParagraphElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  // After an expiry the screen replaced whatever was open, so focus starts at
  // its title rather than at the top of an empty document.
  useEffect(() => {
    if (expiredAt) heading.current?.focus();
  }, [expiredAt]);
  // The buttons go away on decline, so focus moves to the answer that replaces them.
  useEffect(() => {
    if (declined) answer.current?.focus();
  }, [declined]);
  return (
    <main className="mx-auto grid min-h-dvh max-w-[560px] content-center gap-6 px-4 py-16 md:px-8">
      <div className="flex size-24 items-center justify-center border border-[color:var(--rule-strong)] bg-[color:var(--surface)]">
        <Mark size={56} slit="var(--surface)" />
      </div>
      {/* Polite, so a screen reader hears that the session ended on its own. */}
      <div aria-live="polite" className="grid gap-6">
        <h1 ref={heading} tabIndex={-1} className={`${T.h2} text-[color:var(--fg)] outline-none`}>
          {expiredAt ? locked.expired.title : locked.title}
        </h1>
      </div>
      {expiredAt ? (
        <div className="grid gap-3">
          <p className={T.body}>{fill(locked.expired.body, { time: sessionTime(expiredAt) })}</p>
          <p className={T.body}>{locked.expired.unsent}</p>
        </div>
      ) : null}
      {request ? (
        <p className={`${T.body} [overflow-wrap:anywhere]`}>
          {origin ? fill(locked.requestFrom, { origin }) : locked.request}
        </p>
      ) : expiredAt ? null : (
        <p className={T.body}>{locked.body}</p>
      )}
      {problem ? (
        <Problem title={locked.errors[problem].title} body={locked.errors[problem].body} />
      ) : null}
      {declined || !onCreate ? null : <p className={T.body}>{locked.createNote}</p>}
      {declined ? null : (
        <div className="flex flex-wrap gap-3">
          {onCreate ? (
            <Button type="button" variant="primary" size="lg" disabled={busy} onClick={onCreate}>
              {locked.create}
            </Button>
          ) : null}
          <Button
            type="button"
            variant={onCreate ? "ghost" : "primary"}
            size="lg"
            disabled={busy}
            onClick={onUnlock}
          >
            {locked.action}
          </Button>
          {request ? (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => {
                onDecline?.();
                setDeclined(true);
              }}
            >
              {locked.decline}
            </Button>
          ) : null}
        </div>
      )}
      {/* Mounted before the answer, so the decline is announced. */}
      {request ? (
        <p ref={answer} tabIndex={-1} aria-live="polite" className={`${T.body} outline-none`}>
          {declined ? locked.declined : ""}
        </p>
      ) : null}
      {/* A site's window: once its answer went back, the window can close. */}
      {declined && origin ? (
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="justify-self-start"
          onClick={() => window.close()}
        >
          {walletFrame.request.close}
        </Button>
      ) : null}
    </main>
  );
}
