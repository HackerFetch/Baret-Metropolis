import { walletFrame } from "@baret/content";
import { Button } from "@baret/ui";
import { useWallet } from "@baret/wallet-ui/data/store";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, useEffect, useState } from "react";
import { useLive } from "../live/live.js";
import { sessionTime } from "../live/session.js";

/** How often the line checks the clock: the end time is shown to the minute. */
const TICK_MS = 30_000;
/** The last stretch of a session, when the line warns and offers a renewal. */
const SOON_MS = 2 * 60_000;

/**
 * Live only: how long signing goes without a prompt. The time is the
 * session's fixed end, in the reader's local clock. In the last two minutes
 * the line turns to the caution tone and offers one passkey prompt that
 * starts a fresh session. Nothing on the sample or while locked
 * (sessionEndsAt is null): a made-up time would be false.
 */
export function SessionLine(): JSX.Element | null {
  const { state } = useWallet();
  const live = useLive();
  const endsAt = state.sessionEndsAt;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, [endsAt]);

  if (!live || !endsAt) return null;
  const time = sessionTime(endsAt);
  const soon = Date.parse(endsAt) - now <= SOON_MS;

  // With the passkey asked on every signature, the session is not prompt-free.
  const line = state.settings.passkeyEverySignature
    ? walletFrame.session.lineAsk
    : walletFrame.session.line;
  if (!soon) return <p className={T.small}>{fill(line, { time })}</p>;
  return (
    <div className="grid gap-2 border-l-2 border-l-[color:var(--caution)] pl-3">
      <p className={`${T.small} text-[color:var(--fg)]`}>
        {fill(walletFrame.session.soon, { time })}
      </p>
      <div className="-ml-2 flex">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={live.busy}
          onClick={() => void live.unlock()}
        >
          {walletFrame.session.renew}
        </Button>
      </div>
    </div>
  );
}
