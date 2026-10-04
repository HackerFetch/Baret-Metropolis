/**
 * The screens for a route that failed: a page chunk or the frame that did
 * not load (most often after an extension update swapped the hashed files
 * under an open tab), or a page that threw. Eager, so it shows even when the
 * lazy chunks are gone. It never prints the raw error: it says what happened
 * and offers a reload, which fetches the new files, and the way back.
 */

import { optionsFrame } from "@baret/content/extension/options/frame.content";
import { Tag } from "@baret/ui/primitives/Tag";
import { T } from "@baret/web-ui/lib/type";
import type { JSX } from "react";
import { pageTitle, routes } from "../routes.js";

const { failed } = optionsFrame;

const ACTION =
  "chamfer-sm inline-flex min-h-11 w-max items-center border px-4 font-display text-base font-extrabold uppercase tracking-[0.08em] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]";

function Body(): JSX.Element {
  return (
    <>
      <title>{pageTitle(failed.title)}</title>
      <div className="flex">
        <Tag tone="blocked">{failed.tag}</Tag>
      </div>
      <h1 className={`${T.h2} text-[color:var(--fg)]`}>{failed.heading}</h1>
      <p className={T.body}>{failed.body}</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => location.reload()}
          className={`${ACTION} border-[color:var(--fg)] bg-[color:var(--fg)] text-[color:var(--ground)] forced-colors:border-[ButtonText]`}
        >
          {failed.reload}
        </button>
        {/* A full load, not a router link: the router may be what broke. */}
        <a
          href={`#${routes.home.path}`}
          onClick={() => window.setTimeout(() => location.reload(), 0)}
          className={`${ACTION} border-[color:var(--fg)] text-[color:var(--fg)]`}
        >
          {failed.back}
        </a>
      </div>
    </>
  );
}

/** The whole tab: the frame itself, or a setup step, failed. */
export function RouteError(): JSX.Element {
  return (
    <main className="mx-auto grid min-h-dvh max-w-[640px] content-center gap-4 bg-[color:var(--ground)] px-4 py-24 md:px-8">
      <Body />
    </main>
  );
}

/** One page failed inside the frame: the sidebar and the way out stay. */
export function PageError(): JSX.Element {
  return (
    <section className="grid max-w-[640px] gap-4">
      <Body />
    </section>
  );
}

/** The ground colour while the first setup chunk loads, so nothing flashes. */
export function Blank(): JSX.Element {
  return <div className="min-h-dvh bg-[color:var(--ground)]" />;
}
