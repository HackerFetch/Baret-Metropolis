import type { JSX, ReactNode } from "react";
import { IDS, type SectionKey, titleId } from "./ids.js";
import { FRAME, GROUND, type Ground, SECTION_PAD, SECTION_PAD_COMPACT } from "./layout.js";
import { cx } from "./util.js";

export interface SectionFrameProps {
  /** id = IDS[key], aria-labelledby = titleId(key). */
  sectionKey: SectionKey;
  /** Default "ground". */
  ground?: Ground;
  /** Adds data-band="dark", which the header reads to switch to graphite. */
  band?: "dark";
  /** Default true: SECTION_PAD. "compact": SECTION_PAD_COMPACT. false: none. */
  pad?: boolean | "compact";
  /** Default true: children inside the FRAME container. */
  contained?: boolean;
  /** Appended after the frame's own classes. */
  className?: string;
  children: ReactNode;
}

const PAD: Record<string, string | undefined> = {
  true: SECTION_PAD,
  compact: SECTION_PAD_COMPACT,
};

/**
 * One landing section: the `<section>` landmark, its anchor, its ground and
 * padding, and the container. No motion of its own.
 *
 * The section takes no ref. A section that needs a scroll target or a
 * measurement box puts its own ref on an inner element.
 */
export function SectionFrame({
  sectionKey,
  ground = "ground",
  band,
  pad = true,
  contained = true,
  className,
  children,
}: SectionFrameProps): JSX.Element {
  return (
    <section
      id={IDS[sectionKey]}
      aria-labelledby={titleId(sectionKey)}
      {...(band ? { "data-band": band } : {})}
      className={cx("relative", GROUND[ground], PAD[String(pad)], className)}
    >
      {contained ? <div className={FRAME}>{children}</div> : children}
    </section>
  );
}
