import { Tag } from "@baret/ui";
import { Link } from "react-router";

/** The 404. Short, and it names the next move. */
export function Component() {
  return (
    <div className="mx-auto grid min-h-[60dvh] max-w-[640px] content-center gap-4 px-5 py-24">
      <Tag tone="neutral">Not found</Tag>
      <h1 className="font-stencil text-6xl uppercase leading-[0.9]">Nothing here.</h1>
      <p className="text-lg text-[color:var(--fg-muted)]">
        That page does not exist. It may have moved, or the link may be wrong.
      </p>
      <Link
        to="/"
        className="chamfer-sm inline-flex h-11 w-max items-center border border-[color:var(--fg)] px-5 font-display text-base uppercase tracking-[0.08em]"
      >
        Back to the start
      </Link>
    </div>
  );
}
