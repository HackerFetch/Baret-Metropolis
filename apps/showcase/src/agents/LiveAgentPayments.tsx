import { agents } from "@baret/content";
import { LinkButton } from "@baret/web-ui/components/LinkButton";
import { Reveal } from "@baret/web-ui/components/Reveal";
import { Section, titleIdOf } from "@baret/web-ui/components/Section";
import { SectionHeader } from "@baret/web-ui/components/SectionHeader";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import { type JSX, useEffect, useState } from "react";
import { displayAmount, shortAddress } from "../sites/kit/live.js";
import { DYNAMIC_AGENT, type RecentPayment, recentPaymentsOf } from "./liveAgent.js";

/**
 * The Dynamic agent's own payments, read live from the indexer: serves the
 * Dynamic prize (a deployed agent wallet, demoable) and Envio (a frontend
 * consuming its data) together. Fail-closed like the demo sites: a non-2xx
 * or a network error shows "history unavailable", never an empty list — an
 * agent that genuinely has no payments yet is its own, different state.
 */

const ID = "live-agent";
const { liveAgent } = agents;
const USDC_DECIMALS = 6;
/** How many of the indexer's most recent payments (any agent) to search for this one in. */
const SEARCH_LIMIT = 100;
/** How many of this agent's own payments to show. */
const SHOW_LIMIT = 5;

type Load =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | { readonly status: "ok"; readonly rows: readonly RecentPayment[] };

function when(timestampSeconds: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(timestampSeconds * 1000),
  );
}

export function LiveAgentPayments(): JSX.Element {
  const [load, setLoad] = useState<Load>({ status: "loading" });

  useEffect(() => {
    let active = true;
    fetch(`/api/v1/audit/recent?limit=${SEARCH_LIMIT}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((body: unknown) => {
        if (active)
          setLoad({ status: "ok", rows: recentPaymentsOf(body, DYNAMIC_AGENT, SHOW_LIMIT) });
      })
      .catch(() => {
        if (active) setLoad({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Section id={ID} ground="deep">
      <SectionHeader titleId={titleIdOf(ID)} title={liveAgent.title} body={liveAgent.body} />
      <Reveal className="mt-8">
        <p className="font-mono text-sm text-[color:var(--fg-muted)]">{liveAgent.address}</p>
        <div className="mt-4 border border-[color:var(--rule-strong)] bg-[color:var(--surface)]">
          {load.status === "loading" ? (
            <p className={`${T.small} p-5`}>{liveAgent.loading}</p>
          ) : load.status === "error" ? (
            <div className="p-5">
              <p className={`${T.h3} text-[color:var(--fg)]`}>{liveAgent.unavailable.title}</p>
              <p className={`${T.body} mt-2`}>{liveAgent.unavailable.body}</p>
            </div>
          ) : load.rows.length === 0 ? (
            <div className="p-5">
              <p className={`${T.h3} text-[color:var(--fg)]`}>{liveAgent.empty.title}</p>
              <p className={`${T.body} mt-2`}>{liveAgent.empty.body}</p>
            </div>
          ) : (
            <ul>
              {load.rows.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-[color:var(--rule)] px-5 py-4 last:border-b-0"
                >
                  <div className="grid gap-1">
                    <p className="font-mono text-sm text-[color:var(--fg)]">
                      {liveAgent.columns.merchant}: {shortAddress(row.merchant)}
                    </p>
                    <p className={T.small}>{when(row.timestamp)}</p>
                  </div>
                  <div className="grid justify-items-end gap-1">
                    <p className={`${T.num} text-[color:var(--fg)]`}>
                      {displayAmount(BigInt(row.amount), USDC_DECIMALS)} USDC
                    </p>
                    {row.txHash ? (
                      <a
                        href={`${liveAgent.explorer}/tx/${row.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm underline decoration-[color:var(--rule-strong)] underline-offset-4 hover:decoration-[color:var(--fg)]"
                      >
                        {fill(liveAgent.view, { hash: shortAddress(row.txHash) })}
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-4">
          <LinkButton
            href={liveAgent.reviewLink.href}
            label={liveAgent.reviewLink.label}
            variant="ghost"
          />
        </div>
      </Reveal>
    </Section>
  );
}
