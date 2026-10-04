/**
 * Step 5, funds. The account starts at zero; the reader opens the Monad
 * faucet in a new tab, and that press starts watching the address. About
 * two seconds later the sample transfer "arrives" (a stand-in wait; no
 * request is made) and Continue opens. Until then Continue stays shut, and
 * the note under it says why.
 */

import { extFrame, extOnboarding } from "@baret/content";
import { Button } from "@baret/ui";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, useEffect, useId, useState } from "react";
import { SETUP_ART } from "../../../../assets.js";
import { AddressLine, OutLink, StepFrame } from "./Frame.js";
import { EMPTY_BALANCE, FAUCET_AMOUNT, MINIMUM, SYMBOL, WAIT } from "./words.js";

const { fund } = extOnboarding;

type Funds = "idle" | "watching" | "arrived";

export function Funds({ onNext }: { onNext: () => void }): JSX.Element {
  const [funds, setFunds] = useState<Funds>("idle");
  const noteId = useId();
  const minimumId = useId();
  const arrived = funds === "arrived" && Number(FAUCET_AMOUNT) >= MINIMUM;

  // The faucet's transfer, once the reader has opened the faucet.
  useEffect(() => {
    if (funds !== "watching") return;
    const id = window.setTimeout(() => setFunds("arrived"), WAIT.faucet);
    return () => window.clearTimeout(id);
  }, [funds]);

  return (
    <StepFrame title={fund.title} body={fund.body} picture={SETUP_ART.fund}>
      <dl className="grid border-t border-[color:var(--rule)]">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[color:var(--rule)] py-3">
          <dt className="text-sm text-[color:var(--fg-muted)]">{fund.balanceLabel}</dt>
          <dd className={`font-display text-2xl font-extrabold text-[color:var(--fg)] ${T.num}`}>
            {`${funds === "arrived" ? FAUCET_AMOUNT : EMPTY_BALANCE} ${SYMBOL}`}
          </dd>
        </div>
        <div className="grid gap-1 border-b border-[color:var(--rule)] py-3">
          <dt className="text-sm text-[color:var(--fg-muted)]">{fund.addressLabel}</dt>
          <dd>
            <AddressLine />
          </dd>
        </div>
      </dl>

      <div className="grid gap-2">
        <div className="flex">
          <OutLink
            href={extFrame.links.faucet}
            label={fund.action.label}
            variant={arrived ? "ghost" : "primary"}
            describedBy={noteId}
            onClick={() => setFunds((now) => (now === "idle" ? "watching" : now))}
          />
        </div>
        <p id={noteId} className={T.small}>
          {fund.action.note}
        </p>
      </div>

      <p role="status" className="min-h-6 text-sm font-medium text-[color:var(--fg)]">
        {funds === "watching"
          ? fund.waiting
          : funds === "arrived"
            ? fill(fund.arrived, { amount: `${FAUCET_AMOUNT} ${SYMBOL}` })
            : ""}
      </p>

      <div className="grid gap-2">
        <div className="flex">
          <Button
            type="button"
            variant={arrived ? "primary" : "ghost"}
            size="lg"
            disabled={!arrived}
            aria-describedby={minimumId}
            onClick={onNext}
          >
            {fund.next.label}
          </Button>
        </div>
        <p id={minimumId} className={T.small}>
          {fund.minimum}
        </p>
      </div>
    </StepFrame>
  );
}
