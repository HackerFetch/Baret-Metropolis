import { onboarding, walletFrame } from "@baret/content";
import { Button, Mark } from "@baret/ui";
import { Problem } from "@baret/wallet-ui/components/Block";
import { T } from "@baret/web-ui/lib/type";
import { type JSX, useEffect, useRef, useState } from "react";

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
  /** Live: why the last passkey prompt did not unlock, in the onboarding's words. */
  readonly problem?: "cancelled" | "unsupported" | "notCompatible" | null;
}

/** What a locked wallet shows instead of the app or a pending request. */
export function Locked({
  onUnlock,
  request = false,
  busy = false,
  problem = null,
}: LockedProps): JSX.Element {
  const { locked } = walletFrame;
  const [declined, setDeclined] = useState(false);
  const answer = useRef<HTMLParagraphElement>(null);
  // The buttons go away on decline, so focus moves to the answer that replaces them.
  useEffect(() => {
    if (declined) answer.current?.focus();
  }, [declined]);
  return (
    <main className="mx-auto grid min-h-dvh max-w-[560px] content-center gap-6 px-4 py-16 md:px-8">
      <div className="flex size-24 items-center justify-center border border-[color:var(--rule-strong)] bg-[color:var(--surface)]">
        <Mark size={56} slit="var(--surface)" />
      </div>
      <h1 className={`${T.h2} text-[color:var(--fg)]`}>{locked.title}</h1>
      <p className={T.body}>{request ? locked.request : locked.body}</p>
      {problem ? (
        <Problem
          title={onboarding.passkey.errors[problem].title}
          body={onboarding.passkey.errors[problem].body}
        />
      ) : null}
      {declined ? null : (
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="primary" size="lg" disabled={busy} onClick={onUnlock}>
            {locked.action}
          </Button>
          {request ? (
            <Button type="button" variant="ghost" size="lg" onClick={() => setDeclined(true)}>
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
    </main>
  );
}
