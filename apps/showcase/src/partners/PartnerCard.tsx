import { type Partner, partners } from "@baret/content";
import { Tag } from "@baret/ui/primitives/Tag";
import { T } from "@baret/web-ui/lib/type";
import { ArrowUpRight } from "lucide-react";
import type { JSX } from "react";
import { NewTabLink } from "../components/NewTabLink.js";
import { LogoTile } from "./LogoTile.js";

/**
 * One partner: its logo on a white plate, the name and maker, the status,
 * one sentence on what Baret uses it for, and two links that leave the site
 * (new tab): the partner itself and the file or transaction that proves it.
 */
export function PartnerCard({ partner }: { partner: Partner }): JSX.Element {
  const { labels, status } = partners;
  const live = partner.status === "live";
  return (
    <article
      id={partner.id}
      className="group/card flex h-full flex-col border border-[color:var(--rule)] bg-[color:var(--surface)] p-5 transition-colors duration-150 ease-out hover:border-[color:var(--fg)] md:p-6"
    >
      <div className="flex items-start gap-4">
        <LogoTile id={partner.id} name={partner.name} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className={`${T.h3} text-[color:var(--fg)]`}>{partner.name}</h3>
          {partner.by ? (
            <p className="mt-1 font-mono text-label uppercase text-[color:var(--fg-muted)]">
              {partner.by}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Tag tone={live ? "safe" : "caution"} size="sm">
          {live ? status.live : status.simulated}
        </Tag>
        <span className="font-mono text-label uppercase text-[color:var(--fg-muted)]">
          {partner.statusNote}
        </span>
      </div>

      <p className={`${T.body} mt-4`}>{partner.role}</p>

      <div className="mt-auto pt-6">
        <div className="flex flex-wrap gap-x-6 gap-y-0 border-t border-[color:var(--rule)] pt-2">
          <CardLink href={partner.site.href} label={`${labels.visit} ${partner.site.label}`} />
          {partner.evidence ? (
            <CardLink href={partner.evidence.href} label={partner.evidence.label} />
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CardLink({ href, label }: { href: string; label: string }): JSX.Element {
  return (
    <NewTabLink
      href={href}
      className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[color:var(--fg-muted)] underline decoration-transparent underline-offset-4 transition-colors duration-150 hover:text-[color:var(--fg)] hover:decoration-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]"
    >
      {label}
      <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={1.5} />
    </NewTabLink>
  );
}
