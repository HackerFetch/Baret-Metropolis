import type { JSX, ReactNode } from "react";
import type { ImgAsset } from "../../shared/assets.js";
import { Img, type Responsive } from "../../shared/Img.js";
import { T } from "../../shared/type.js";
import { cx } from "../../shared/util.js";

/**
 * One bento tile: a square box with a 1 px rule, no shadow, no radius.
 *
 * Two surfaces. `chalk` is the light card (the surface token, so it follows
 * the theme). `graphite` is the one dark tile in both themes; in the dark
 * theme it drops to ink with a strong rule, so it still reads as the deepest
 * box on the #24252a band instead of melting into it.
 *
 * Tiles are not links, so they stay still on hover: no rule change, no image
 * scale. The pressable dApp cards further down own the hover response.
 */

export type Surface = "chalk" | "graphite";

const SURFACE: Record<Surface, string> = {
  chalk: "bg-[color:var(--surface)] text-[color:var(--fg)] border-[color:var(--rule-strong)]",
  graphite:
    "bg-graphite text-chalk border-graphite dark:bg-ink dark:border-[color:var(--rule-strong)]",
};

export function Tile({
  surface = "chalk",
  className,
  children,
}: {
  surface?: Surface;
  className?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <article
      className={cx("relative flex h-full overflow-hidden border", SURFACE[surface], className)}
    >
      {children}
    </article>
  );
}

/** Muted text for each surface: graphite never reads the theme tokens. */
const MUTED: Record<Surface, string> = {
  chalk: "text-[color:var(--fg-muted)]",
  graphite: "text-chalk/70",
};

/**
 * T.label, T.body and T.small carry the theme's muted colour, which would
 * fight the graphite tile's chalk; the tiles repeat their size parts instead.
 */
const FG: Record<Surface, string> = {
  chalk: "text-[color:var(--fg)]",
  graphite: "text-chalk",
};

/** The tile grammar: mono label, display title, one paragraph, then extras. */
export function TileText({
  label,
  title,
  body,
  surface = "chalk",
  className,
  children,
}: {
  label: string;
  title: string;
  body: string;
  surface?: Surface;
  className?: string;
  children?: ReactNode;
}): JSX.Element {
  const muted = MUTED[surface];
  return (
    <div className={cx("flex flex-col p-6 lg:p-8", className)}>
      <p className={`font-mono text-label uppercase ${muted}`}>{label}</p>
      <h3 className={`${T.h3} mt-3`}>{title}</h3>
      <p className={`text-base leading-normal ${muted} mt-3 max-w-[52ch]`}>{body}</p>
      {children}
    </div>
  );
}

/** Hairline rows for a pillar's points: a list, not decoration. */
export function Points({
  points,
  surface = "chalk",
  className,
}: {
  points: readonly string[];
  surface?: Surface;
  /** Defaults to a 24 px gap under the body; pass `mt-auto pt-6` to sit the list on the tile's floor. */
  className?: string;
}): JSX.Element {
  const rule = surface === "chalk" ? "border-[color:var(--rule)]" : "border-chalk/15";
  return (
    <ul className={className ?? "mt-6"}>
      {points.map((point) => (
        <li key={point} className={`text-sm leading-normal ${FG[surface]} border-t ${rule} py-2`}>
          {point}
        </li>
      ))}
    </ul>
  );
}

/**
 * The dark-theme treatment for a chalk-paper illustration: a flat filter,
 * no gradient, never an invert. Shared with the Showcase card heads so both
 * blocks sit at the same brightness on graphite.
 */
export const DARK_PRINT = "dark:brightness-[0.78] dark:contrast-[1.05]";

/**
 * The image well inside a tile. It paints the illustration's own paper colour
 * so a cover crop or a contained letterbox never shows a seam. Wells meet their text across a --rule-strong hairline (the
 * caller sets which side), so a chalk print on the concrete band still reads
 * as part of its tile in the light theme.
 */
export function TileMedia({
  asset,
  className,
  position,
  fit,
  sizes,
  dim = false,
}: {
  asset: ImgAsset;
  className?: string;
  position?: string;
  fit?: Responsive<"cover" | "contain">;
  sizes: string;
  /**
   * Lowers a chalk print in the dark theme (DARK_PRINT) so it sits inside the
   * tile instead of being the brightest block on the band; never inverts it.
   * The filter sits on the well, so the paper ground dims with the print and
   * a contained letterbox stays seamless.
   */
  dim?: boolean;
}): JSX.Element {
  return (
    <div
      className={cx("relative overflow-hidden", dim && DARK_PRINT, className)}
      {...(asset.ground ? { style: { backgroundColor: asset.ground } } : {})}
    >
      <Img
        asset={asset}
        sizes={sizes}
        {...(position ? { position } : {})}
        {...(fit ? { fit } : {})}
        className="absolute inset-0 size-full"
      />
    </div>
  );
}
