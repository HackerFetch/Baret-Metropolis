import { sign } from "@baret/content";
import { CopyButton } from "@baret/web-ui/components/CopyButton";
import { T } from "@baret/web-ui/lib/type";
import { fill } from "@baret/web-ui/lib/util";
import type { JSX, ReactNode } from "react";
import type { SignRequest as Request } from "../data/types.js";

/**
 * Everything a careful reader may want and most readers do not, behind one
 * disclosure at the end of the sign request: what the site says about the
 * request (shown, never trusted), who checked it, and the exact raw request.
 * Nothing is dropped; it is only moved out of the way of the decision.
 */

function Block({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <div className="grid gap-2 border-t border-[color:var(--rule)] pt-4 first:border-t-0 first:pt-0">
      <p className={T.label}>{title}</p>
      {children}
    </div>
  );
}

export function Details({
  request,
  message,
  checked,
  alchemy,
}: {
  request: Request;
  message: boolean;
  /** The sources that answered, one line each; null under Can't reach Baret (nothing ran). */
  checked: string[] | null;
  /** The simulation line names Alchemy: shown unless the server says Alchemy did not answer. */
  alchemy: boolean;
}): JSX.Element {
  return (
    <section className="border-t border-[color:var(--rule)] px-5 py-3 md:px-6">
      <details className="group">
        <summary className="flex min-h-11 w-full cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--accent)] [&::-webkit-details-marker]:hidden">
          <span className="grid gap-0.5">
            <span className={T.label}>{sign.details.title}</span>
            <span className="text-xs font-normal text-[color:var(--fg-muted)]">
              {sign.details.hint}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="font-mono text-lg text-[color:var(--fg-muted)] transition-transform duration-150 group-open:rotate-45 motion-reduce:transition-none"
          >
            +
          </span>
        </summary>
        <div className="grid gap-4 pt-3 pb-3">
          {request.origin && request.claim ? (
            <Block title={fill(sign.claim.label, { origin: request.origin })}>
              <blockquote className="border-l-2 border-[color:var(--rule-strong)] pl-3 text-sm text-[color:var(--fg)]">
                {request.claim}
              </blockquote>
              <p className={T.small}>
                <span className="font-medium text-[color:var(--fg)]">{sign.claim.tag}</span>{" "}
                {message ? sign.claim.noteMessage : sign.claim.note}
              </p>
            </Block>
          ) : null}

          {checked ? (
            <Block title={sign.verdict.checkedBy.label}>
              <p className="text-sm text-[color:var(--fg)]">{sign.verdict.checkedBy.value}</p>
              {alchemy ? (
                <p className={T.small}>
                  {message ? sign.verdict.checkedBy.detailMessage : sign.verdict.checkedBy.detail}
                </p>
              ) : null}
              <ul className="grid gap-0.5">
                {checked.map((line) => (
                  <li key={line} className={T.small}>
                    {line}
                  </li>
                ))}
              </ul>
            </Block>
          ) : null}

          <Block title={sign.raw.title}>
            <p className={T.small}>
              {request.origin === null ? sign.raw.hintOwn : sign.raw.hint}
              {request.origin ? ` ${sign.header.originNote}` : ""}
            </p>
            <dl className="grid gap-3 text-sm">
              <div className="grid gap-1">
                <dt className="text-xs text-[color:var(--fg-muted)]">{sign.raw.decoded}</dt>
                <dd className="font-mono text-[color:var(--fg)] [overflow-wrap:anywhere]">
                  {request.raw.decoded ?? sign.raw.notDecoded}
                </dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-xs text-[color:var(--fg-muted)]">{sign.raw.to}</dt>
                <dd className="font-mono text-[color:var(--fg)] [overflow-wrap:anywhere]">
                  {request.raw.to}
                </dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-xs text-[color:var(--fg-muted)]">{sign.raw.value}</dt>
                <dd className={`font-mono text-[color:var(--fg)] ${T.num}`}>{request.raw.value}</dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-xs text-[color:var(--fg-muted)]">{sign.raw.calldata}</dt>
                <dd className="grid gap-1">
                  <code className="block max-h-32 overflow-y-auto bg-[color:var(--ground-deep)] p-2 font-mono text-xs text-[color:var(--fg)] [overflow-wrap:anywhere]">
                    {request.raw.data}
                  </code>
                  <span className="-ml-2 flex">
                    <CopyButton
                      text={request.raw.data}
                      label={sign.raw.copy}
                      done={sign.raw.copied}
                    />
                  </span>
                </dd>
              </div>
            </dl>
          </Block>
        </div>
      </details>
    </section>
  );
}
