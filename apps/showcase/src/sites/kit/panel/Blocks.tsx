import { common, findings, hub, sign } from "@baret/content";
import { ChangeRow, VerdictTag } from "@baret/ui";
import type { JSX, ReactNode } from "react";
import { T } from "../../../shared/type.js";
import { fill } from "../../../shared/util.js";
import type { SampleChange, SampleFinding, SampleVerdict } from "../types.js";

/**
 * The building blocks of the Baret panel. Every label comes from
 * hub.frame.panel, shared/findings, wallet/sign and common.verdicts, so the
 * six demo dApps read the same and a copy change reaches all of them.
 */

const { panel } = hub.frame;

/** A titled group inside the panel: a hairline, a mono label, the content. */
export function PanelBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="grid gap-3 border-t border-[color:var(--rule)] pt-5">
      <h3 className={T.label}>{title}</h3>
      {children}
    </section>
  );
}

/** The expected verdict, always framed as expected (never as live). */
export function ExpectedVerdict({
  verdict,
  body,
}: {
  verdict: SampleVerdict;
  body: string;
}): JSX.Element {
  return (
    <PanelBlock title={panel.expected}>
      <div className="flex">
        <VerdictTag kind={verdict} label={common.verdicts[verdict].label} />
      </div>
      <p className={T.body}>{body}</p>
      <p className={T.small}>{panel.expectedNote}</p>
    </PanelBlock>
  );
}

/** What the site asks the wallet to sign, and the call itself in mono. */
export function TheAsk({ asks, call }: { asks: string; call: string }): JSX.Element {
  return (
    <PanelBlock title={panel.asks}>
      <p className={T.body}>{asks}</p>
      <p className={T.label}>{panel.call}</p>
      <code className="block border border-[color:var(--rule)] bg-[color:var(--ground)] px-3 py-2 font-mono text-sm text-[color:var(--fg)]">
        {call}
      </code>
    </PanelBlock>
  );
}

/** Findings rendered from their codes: title, the filled sentence, the fix. */
export function FindingList({ items }: { items: readonly SampleFinding[] }): JSX.Element {
  return (
    <PanelBlock title={panel.findings}>
      {items.length === 0 ? (
        <p className={T.body}>{panel.noFindings}</p>
      ) : (
        <ul className="grid gap-4">
          {items.map((item) => {
            const copy = findings[item.code];
            return (
              <li
                key={item.code}
                className="grid gap-1 border-l-4 border-[color:var(--blocked)] pl-3"
              >
                <p className={`${T.h3} text-[color:var(--fg)]`}>{copy.title}</p>
                <p className={T.body}>{fill(copy.body, item.values)}</p>
                {"fix" in copy && copy.fix ? <p className={T.small}>{copy.fix}</p> : null}
              </li>
            );
          })}
        </ul>
      )}
    </PanelBlock>
  );
}

/** "What changes": what leaves and what arrives, in the wallet's own words. */
export function ChangeList({ rows }: { rows: readonly SampleChange[] }): JSX.Element {
  return (
    <PanelBlock title={panel.changes}>
      <div className="grid gap-2">
        {/* ChangeRow's own note is a one-word qualifier; a sample's note is a
            sentence, so it goes on its own line where it can wrap. */}
        {rows.map((row) => (
          <div key={`${row.direction}-${row.unit}`}>
            <ChangeRow
              label={row.direction === "out" ? sign.changes.out : sign.changes.in}
              value={row.value}
              unit={row.unit}
              direction={row.direction}
            />
            {row.note ? <p className="text-sm text-[color:var(--caution)]">{row.note}</p> : null}
          </div>
        ))}
      </div>
      <p className={T.small}>{sign.changes.disclaimer}</p>
    </PanelBlock>
  );
}

/** What the page claims about itself, next to what Baret actually checks. */
export function ClaimsList({
  claims,
}: {
  claims: readonly { claim: string; check: string }[];
}): JSX.Element {
  const { title, check, note } = hub.frame.claims;
  return (
    <PanelBlock title={title}>
      <ul className="grid gap-4">
        {claims.map((item) => (
          <li key={item.claim} className="grid gap-1">
            <p className={`${T.body} text-[color:var(--fg)]`}>{item.claim}</p>
            <p className={T.small}>
              <span className="font-medium text-[color:var(--fg)]">{check}: </span>
              {item.check}
            </p>
          </li>
        ))}
      </ul>
      <p className={T.small}>{note}</p>
    </PanelBlock>
  );
}

/** A short titled note: "If this were signed", "Take this with you". */
export function NoteBlock({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <PanelBlock title={title}>
      <p className={T.body}>{body}</p>
    </PanelBlock>
  );
}
