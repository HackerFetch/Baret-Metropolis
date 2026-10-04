import { common, extFrame } from "@baret/content";
import { Mark } from "@baret/ui";
import { LinkButton } from "@baret/web-ui/components/LinkButton";
import { TextReveal } from "@baret/web-ui/components/TextReveal";
import { T } from "@baret/web-ui/lib/type";

/**
 * The options page's 404, inside its own frame: the mark on a plate (the
 * vector Mark, never a raster copy), the shared stencil line, one sentence
 * and the way back to the overview. The same shape as the wallet's.
 */
export function Component() {
  return (
    <div className="mx-auto grid min-h-[60dvh] max-w-[560px] content-center justify-items-start gap-6 py-12">
      <div className="grid size-32 place-items-center border border-[color:var(--rule)] bg-[color:var(--surface)] md:size-40">
        <Mark size={72} slit="var(--surface)" />
      </div>
      <div className="@container w-full">
        <TextReveal
          as="h1"
          text={common.notFound.title}
          immediate
          className={`${T.h1Page} text-[color:var(--fg)]`}
        />
      </div>
      <p className={T.lead}>{extFrame.notFound.body}</p>
      <LinkButton
        href={extFrame.notFound.back.href}
        label={extFrame.notFound.back.label}
        variant="primary"
        icon="arrow-right"
      />
    </div>
  );
}
