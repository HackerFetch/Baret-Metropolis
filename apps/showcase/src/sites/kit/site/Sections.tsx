import { ImgWell } from "@baret/web-ui/components/Img";
import { Reveal } from "@baret/web-ui/components/Reveal";
import type { ImgAsset } from "@baret/web-ui/lib/img";
import { FRAME, GRID } from "@baret/web-ui/lib/layout";
import { T } from "@baret/web-ui/lib/type";
import type { JSX } from "react";

/**
 * The rest of a demo dApp's home page, in the landing's grammar: a number or
 * a heading, one short paragraph, rows of equal items on hairlines. The
 * stats are the fake site's own claims; Baret's panel says which of them it
 * cannot check. Shared by the six sites, each passing its own copy.
 */

type Stat = { readonly value: string; readonly label: string };
type Block = { readonly title: string; readonly body: string };
type Faq = { readonly question: string; readonly answer: string };

export function Stats({ items }: { items: readonly Stat[] }): JSX.Element {
  return (
    <section className="border-y border-[color:var(--rule)]">
      <dl className={`${FRAME} grid grid-cols-1 sm:grid-cols-3`}>
        {items.map((stat, i) => (
          <div
            key={stat.label}
            className={`grid gap-1 py-8 ${i > 0 ? "sm:border-l sm:border-[color:var(--rule)] sm:pl-8" : ""} ${i > 0 ? "border-t border-[color:var(--rule)] sm:border-t-0" : ""}`}
          >
            <dd className="font-display text-5xl font-extrabold tabular-nums text-[color:var(--fg)]">
              {stat.value}
            </dd>
            <dt className={T.small}>{stat.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** One picture beside the site's feature blocks, each under a 2 px accent rule. */
export function Features({
  image,
  blocks,
}: {
  image: ImgAsset;
  blocks: readonly Block[];
}): JSX.Element {
  return (
    <section className={`${FRAME} py-16 lg:py-24`}>
      <div className={`${GRID} gap-y-10 lg:items-center`}>
        <Reveal className="col-span-4 md:col-span-8 lg:col-span-7">
          <ImgWell asset={image} ratio="16/10" className="border border-[color:var(--rule)]" />
        </Reveal>
        <div className="col-span-4 grid gap-8 md:col-span-8 lg:col-span-5">
          {blocks.map((block) => (
            <Reveal
              key={block.title}
              className="grid gap-3 border-t-2 border-[color:var(--accent)] pt-5"
            >
              <h2 className={`${T.h3} text-[color:var(--fg)]`}>{block.title}</h2>
              <p className={T.body}>{block.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/** The site's FAQ: one exclusive group (`name`), so opening one closes the others. */
export function Faq({ items, name }: { items: readonly Faq[]; name: string }): JSX.Element {
  return (
    <section className={`${FRAME} pb-16 lg:pb-24`}>
      <div className="max-w-[760px] border-t border-[color:var(--rule)]">
        {items.map((item) => (
          <details
            key={item.question}
            name={name}
            className="group border-b border-[color:var(--rule)]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-medium text-[color:var(--fg)] [&::-webkit-details-marker]:hidden">
              {item.question}
              <span
                aria-hidden="true"
                className="font-mono text-xl text-[color:var(--accent)] transition-transform duration-150 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className={`${T.body} pb-5`}>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function SiteFooter({ note, hostname }: { note: string; hostname: string }): JSX.Element {
  return (
    <footer className="border-t border-[color:var(--rule)]">
      <div className={`${FRAME} flex flex-wrap items-center justify-between gap-4 py-8`}>
        <p className={T.small}>{note}</p>
        <p className="font-mono text-label uppercase text-[color:var(--fg-faint)]">{hostname}</p>
      </div>
    </footer>
  );
}
