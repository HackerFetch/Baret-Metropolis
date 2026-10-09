import { agents } from "@baret/content";
import { LinkButton } from "@baret/web-ui/components/LinkButton";
import { Reveal } from "@baret/web-ui/components/Reveal";
import { Section, titleIdOf } from "@baret/web-ui/components/Section";
import { SectionHeader } from "@baret/web-ui/components/SectionHeader";
import { T } from "@baret/web-ui/lib/type";
import { counted, fill } from "@baret/web-ui/lib/util";
import { type JSX, useEffect, useState } from "react";
import { shortAddress } from "../sites/kit/live.js";
import {
  AGENT_VAULT,
  type AgentPayments,
  AUDIT_LIMIT,
  amountText,
  DYNAMIC_AGENT,
  loadAgentPayments,
  VAULT_SYMBOL,
} from "./liveAgent.js";

/**
 * The Dynamic agent's own payments, read live from the indexer: serves the
 * Dynamic prize (a deployed agent wallet with delegated access, demoable)
 * and Envio (a frontend consuming its data) together. The agent and its
 * vault link to the explorer, so the claim and the full history can be
 * checked. Fail-closed like the demo sites: a non-2xx, a foreign answer, a
 * network error or a timeout shows "history unavailable", never an empty
 * list; an agent that genuinely has no payments yet is its own state. The
 * outcome is announced once through a status line.
 *
 * On the plain ground: it sits between the layers and the quickstart, both
 * deep, so the grounds keep alternating down the page.
 */

const ID = "live-agent";
const { liveAgent } = agents;

type Load =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | ({ readonly status: "ok" } & AgentPayments);

function when(timestampSeconds: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(timestampSeconds * 1000),
  );
}

const LINK =
  "underline decoration-[color:var(--rule-strong)] underline-offset-4 hover:decoration-[color:var(--fg)]";

function announcement(load: Load): string {
  if (load.status === "loading") return liveAgent.loading;
  if (load.status === "error") return liveAgent.unavailable.title;
  if (load.rows.length === 0)
    return load.complete ? liveAgent.empty.title : liveAgent.notRecent.title;
  return counted(load.rows.length, liveAgent.shown, liveAgent.shownOne);
}

export function LiveAgentPayments(): JSX.Element {
  const [load, setLoad] = useState<Load>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    loadAgentPayments({ signal: controller.signal }).then(
      (read) => {
        if (!controller.signal.aborted) setLoad({ status: "ok", ...read });
      },
      () => {
        if (!controller.signal.aborted) setLoad({ status: "error" });
      },
    );
    return () => controller.abort();
  }, []);

  return (
    <Section id={ID} ground="ground">
      <SectionHeader titleId={titleIdOf(ID)} title={liveAgent.title} body={liveAgent.body} />
      <Reveal className="mt-8">
        <dl className="grid gap-1 font-mono text-sm text-[color:var(--fg-muted)]">
          <div className="flex flex-wrap gap-x-2">
            <dt>{liveAgent.labels.agent}</dt>
            <dd className="min-w-0 break-all">
              <a
                href={`${liveAgent.explorer}/address/${DYNAMIC_AGENT}`}
                target="_blank"
                rel="noopener noreferrer"
                className={LINK}
              >
                {DYNAMIC_AGENT}
              </a>
            </dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt>{liveAgent.labels.vault}</dt>
            <dd className="min-w-0 break-all">
              <a
                href={`${liveAgent.explorer}/address/${AGENT_VAULT}`}
                target="_blank"
                rel="noopener noreferrer"
                className={LINK}
              >
                {AGENT_VAULT}
              </a>
            </dd>
          </div>
        </dl>
        <div
          aria-busy={load.status === "loading"}
          className="mt-4 border border-[color:var(--rule-strong)] bg-[color:var(--surface)]"
        >
          {load.status === "loading" ? (
            <p className={`${T.small} p-5`}>{liveAgent.loading}</p>
          ) : load.status === "error" ? (
            <div className="p-5">
              <p className={`${T.h3} text-[color:var(--fg)]`}>{liveAgent.unavailable.title}</p>
              <p className={`${T.body} mt-2`}>{liveAgent.unavailable.body}</p>
            </div>
          ) : load.rows.length === 0 ? (
            <div className="p-5">
              <p className={`${T.h3} text-[color:var(--fg)]`}>
                {load.complete ? liveAgent.empty.title : liveAgent.notRecent.title}
              </p>
              <p className={`${T.body} mt-2`}>
                {load.complete
                  ? liveAgent.empty.body
                  : fill(liveAgent.notRecent.body, { count: String(AUDIT_LIMIT) })}
              </p>
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
                      {liveAgent.labels.merchant}: {shortAddress(row.merchant)}
                    </p>
                    <p className={T.small}>{when(row.timestamp)}</p>
                  </div>
                  <div className="grid justify-items-end gap-1">
                    <p className={`${T.num} text-[color:var(--fg)]`}>
                      {amountText(row.amount)} {VAULT_SYMBOL}
                    </p>
                    {row.txHash ? (
                      <a
                        href={`${liveAgent.explorer}/tx/${row.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-sm ${LINK}`}
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
        <p role="status" className="sr-only">
          {announcement(load)}
        </p>
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
