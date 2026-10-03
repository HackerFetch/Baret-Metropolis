import { common } from "@baret/content";
import { Mark } from "@baret/ui";
import { LinkButton } from "@baret/web-ui/components/LinkButton";
import { TextReveal } from "@baret/web-ui/components/TextReveal";
import { T } from "@baret/web-ui/lib/type";

/**
 * The wallet's 404, inside the wallet's own frame: the mark on a plate (the
 * vector Mark, BRAND section 02, never a raster copy), one stencil line, one
 * sentence and the way back to the wallet. Self-contained, so it reads the
 * same in any frame the wallet uses.
 */
export function Component() {
  const { notFound } = common;
  return (
    <div className="mx-auto grid min-h-[60dvh] max-w-[560px] content-center justify-items-start gap-6 py-12">
      <div className="grid size-32 place-items-center border border-[color:var(--rule)] bg-[color:var(--surface)] md:size-40">
        <Mark size={72} slit="var(--surface)" />
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
