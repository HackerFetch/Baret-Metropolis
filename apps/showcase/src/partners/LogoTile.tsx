import type { JSX } from "react";
import { PARTNER_LOGOS } from "./logos.js";

/**
 * A partner's mark on a white plate, in both themes: most marks are drawn
 * for a light ground, and a fixed plate keeps each one in its own colours.
 * A raster avatar (`bleed`) fills the plate; a vector mark sits padded.
 * The image is decorative when the partner's name is printed next to it.
 */
const SIZE = {
  sm: "size-14 md:size-16",
  md: "size-14",
  lg: "size-20 md:size-24",
} as const;

export function LogoTile({
  id,
  name,
  size = "md",
  labelled = false,
}: {
  id: string;
  name: string;
  size?: keyof typeof SIZE;
  /** Give the image the partner's name as alt text (no name printed next to it). */
  labelled?: boolean;
}): JSX.Element | null {
  const logo = PARTNER_LOGOS[id];
  if (!logo) return null;
  return (
    <span
      className={`chamfer-sm relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-black/10 bg-white ${SIZE[size]}`}
    >
      <img
        src={logo.src}
        width={logo.width}
        height={logo.height}
        alt={labelled ? name : ""}
        loading="lazy"
        decoding="async"
        className={logo.bleed ? "size-full object-cover" : "size-[62%] object-contain"}
      />
    </span>
  );
}
