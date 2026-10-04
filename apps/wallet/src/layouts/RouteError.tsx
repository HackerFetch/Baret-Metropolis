import { common } from "@baret/content";
import { Tag } from "@baret/ui/primitives/Tag";
import { T } from "@baret/web-ui/lib/type";
import { type JSX, useEffect } from "react";
import { Link, useRouteError } from "react-router";
import { routes } from "../routes.js";

const ACTION =
  "chamfer-sm inline-flex h-11 w-max items-center border border-[color:var(--fg)] px-4 font-display text-base font-extrabold uppercase tracking-[0.08em] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-solid focus-visible:outline-[color:var(--accent)]";

/**
 * A screen that failed to load: what happened, a reload, then the way back.
 * The browser's own message (a stale chunk after a new deploy, say) goes to
 * the console, never onto the screen.
 */
export function ErrorBoundary(): JSX.Element {
  const error = useRouteError();
  const { unknown } = common.errors;
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="mx-auto grid min-h-dvh max-w-[640px] content-center gap-4 px-4 py-24 md:px-8">
      <title>{unknown.title}</title>
      <div className="flex">
        <Tag tone="blocked">{unknown.tag}</Tag>
      </div>
      <h1 className={`${T.h2} text-[color:var(--fg)]`}>{unknown.heading}</h1>
      <p className={T.body}>{unknown.pageBody}</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => window.location.reload()} className={ACTION}>
          {unknown.reload}
        </button>
        <Link to={routes.home.path} className={ACTION}>
          {unknown.back}
        </Link>
      </div>
    </main>
  );
}
