import { common } from "@baret/content";
import { Img } from "@baret/web-ui/components/Img";
import { LinkButton } from "@baret/web-ui/components/LinkButton";
import { TextReveal } from "@baret/web-ui/components/TextReveal";
import { T } from "@baret/web-ui/lib/type";
import { MARK_ART } from "../assets.js";

/**
 * The wallet's 404, inside the wallet's own frame: the mark on its plate (on
 * chalk in the light theme, on graphite in the dark one), one stencil line,
 * one sentence and the way back to the wallet. Self-contained, so it reads
 * the same in any frame the wallet uses.
 */
export function Component() {
  const { notFound } = common;
  return (
    <div className="mx-auto grid min-h-[60dvh] max-w-[560px] content-center justify-items-start gap-6 py-12">
      <div className="w-32 overflow-hidden border border-[color:var(--rule)] md:w-40">
        <div
          className="aspect-square dark:hidden"
          style={{ backgroundColor: MARK_ART.light.ground }}
        >
          <Img asset={MARK_ART.light} fit="contain" sizes="160px" className="size-full" />
        </div>
        <div
          className="hidden aspect-square dark:block"
          style={{ backgroundColor: MARK_ART.dark.ground }}
        >
          <Img asset={MARK_ART.dark} fit="contain" sizes="160px" className="size-full" />
        </div>
      </div>
      <div className="@container w-full">
        <TextReveal
          as="h1"
          text={notFound.title}
          immediate
          className={`${T.h1Page} text-[color:var(--fg)]`}
        />
      </div>
      <p className={T.lead}>{notFound.wallet.body}</p>
      <LinkButton
        href={notFound.wallet.back.href}
        label={notFound.wallet.back.label}
        variant="primary"
        icon="arrow-right"
      />
    </div>
  );
}
