import { home } from "@baret/content";
import type { JSX } from "react";
import { IMG } from "../shared/assets.js";
import { staggerDelay } from "../shared/motion.js";
import { Reveal } from "../shared/Reveal.js";
import { SectionFrame } from "../shared/SectionFrame.js";
import { SectionHeader } from "../shared/SectionHeader.js";
import { T } from "../shared/type.js";
import { STAT_ROW_DELAY, StatTile } from "./pillars/StatTile.js";
import { Points, Tile, TileMedia, TileText } from "./pillars/Tile.js";

/**
 * How it works, as a bento grid of the three layers and the four counted
 * numbers. Every word comes from home.pillars and home.stats.
 *
 * From 1024 px, on 12 columns: Pre-sign Guard is the tall tile on the left
 * (columns 1 to 5, two rows) with the site office on top at a fixed 4:3,
 * contained on its own paper so the whole office reads at every width; the
 * right column's two tiles stretch to the left tile's height. Each tile
 * ends in its three ruled points, pushed to the tile's floor. Authorization Ledger (chalk, the tag rack) and Post-sign Monitor (the
 * one graphite tile, where the dark watchtower belongs) stack on the right,
 * text left and image right. The four stats run as one row under them.
 * Tablet: Pre-sign spans both columns, the other two sit side by side.
 * Phone: one column, image on top of each tile. Stats run 2 x 2 below
 * 1024 px, where four across would wrap the "ms" under the 800.
 *
 * Tiles rise in order (60 ms apart, once). Stats count up once in view.
 */

const P_SIZES = "(min-width: 1024px) 480px, 100vw";
/** Every tile's ruled points sit on its floor, so the three share one baseline rhythm. */
const POINTS_FLOOR = "mt-auto pt-6";
const SIDE_SIZES = "(min-width: 1024px) 260px, (min-width: 768px) 50vw, 100vw";

export function PillarsSection(): JSX.Element {
  const { title, body, items } = home.pillars;
  const [guard, ledger, monitor] = items;
  const stats = home.stats;
  return (
    <SectionFrame sectionKey="pillars" ground="deep">
      <SectionHeader sectionKey="pillars" layout="split" keepBeats title={title} body={body} />
      <div className="mt-12 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-12 lg:gap-4">
        <Reveal className="md:col-span-2 lg:col-span-5 lg:row-span-2">
          <Tile className="flex-col md:flex-row lg:flex-col">
            <TileMedia
              asset={IMG.l12}
              dim
              sizes={P_SIZES}
              fit={{ base: "cover", lg: "contain" }}
              className="aspect-[16/10] border-b border-[color:var(--rule-strong)] md:order-last md:aspect-auto md:w-1/2 md:border-b-0 md:border-l lg:order-first lg:aspect-[4/3] lg:w-full lg:border-b lg:border-l-0"
            />
            <TileText
              label={guard.label}
              title={guard.title}
              body={guard.body}
              className="md:w-1/2 lg:w-full lg:flex-1"
            >
              <Points points={guard.points} className={POINTS_FLOOR} />
            </TileText>
          </Tile>
        </Reveal>
        <Reveal className="lg:col-span-7" delay={staggerDelay(1)}>
          <Tile className="flex-col lg:flex-row">
            <TileMedia
              asset={IMG.l13}
              position="50% 35%"
              dim
              sizes={SIDE_SIZES}
              className="aspect-[16/10] border-b border-[color:var(--rule-strong)] lg:order-last lg:aspect-auto lg:w-[36%] lg:border-b-0 lg:border-l"
            />
            <TileText
              label={ledger.label}
              title={ledger.title}
              body={ledger.body}
              className="lg:flex-1"
            >
              <Points points={ledger.points} className={POINTS_FLOOR} />
            </TileText>
          </Tile>
        </Reveal>
        <Reveal className="lg:col-span-7" delay={staggerDelay(2)}>
          <Tile surface="graphite" className="flex-col lg:flex-row">
            <TileMedia
              asset={IMG.l14}
              sizes={SIDE_SIZES}
              position="30% 0%"
              className="aspect-[16/10] lg:order-last lg:aspect-auto lg:w-[36%]"
            />
            <TileText
              surface="graphite"
              label={monitor.label}
              title={monitor.title}
              body={monitor.body}
              className="lg:flex-1"
            >
              <Points points={monitor.points} surface="graphite" className={POINTS_FLOOR} />
            </TileText>
          </Tile>
        </Reveal>
        <Reveal className="md:col-span-2 lg:col-span-12" delay={STAT_ROW_DELAY}>
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            {stats.items.map((stat, i) => (
              <li key={stat.label}>
                <StatTile value={stat.value} label={stat.label} index={i} stencil={i === 1} />
              </li>
            ))}
          </ul>
          <p className={`${T.small} mt-4 max-w-[72ch]`}>{stats.note}</p>
        </Reveal>
      </div>
    </SectionFrame>
  );
}
