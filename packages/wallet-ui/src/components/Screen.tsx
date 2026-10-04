import { ImgWell } from "@baret/web-ui/components/Img";
import { TwoToneText } from "@baret/web-ui/components/SectionHeader";
import { TextReveal } from "@baret/web-ui/components/TextReveal";
import type { ImgAsset } from "@baret/web-ui/lib/img";
import { T } from "@baret/web-ui/lib/type";
import type { JSX, ReactNode } from "react";

/**
 * The frame every wallet screen shares, in the landing's grammar: the
 * screen's stencil title (`T.h1Page`, sized by its column), one lead with its
 * first sentence in --fg, the screen's actions, and from 768 px the screen's
 * picture beside them. Then the screen's own blocks, on hairlines.
 */
export function Screen({
  title,
  body,
  picture,
  picturePosition,
  actions,
  children,
}: {
  title: string;
  body?: string;
  picture?: ImgAsset;
  /** object-position for a picture whose subject sits off centre. */
  picturePosition?: string;
  actions?: ReactNode;
  children?: ReactNode;
}): JSX.Element {
  return (
    <div className="grid gap-10 md:gap-14">
      <header className="grid gap-8 md:grid-cols-12 md:items-end md:gap-8">
        <div className={`@container grid gap-5 ${picture ? "md:col-span-7" : "md:col-span-10"}`}>
          <TextReveal
            as="h1"
            text={title}
            immediate
            className={`${T.h1Page} text-balance text-[color:var(--fg)]`}
          />
          {body ? (
            <p className={`${T.lead} max-w-[56ch]`}>
              <TwoToneText text={body} />
            </p>
          ) : null}
          {actions ? <div className="flex flex-wrap gap-3 pt-1">{actions}</div> : null}
        </div>
        {picture ? (
          <ImgWell
            asset={picture}
            ratio="4/3"
            dim
            {...(picturePosition ? { position: picturePosition } : {})}
            sizes="(min-width: 1024px) 380px, 40vw"
            className="hidden border border-[color:var(--rule)] md:col-span-5 md:block"
          />
        ) : null}
      </header>
      {children}
    </div>
  );
}
