/**
 * Every showcase asset path, with its intrinsic size. The only file in the app
 * where an asset path is written.
 *
 * Paths never go into @baret/content: the route test treats every string that
 * starts with "/" as an href [SB 1.8]. Files live in apps/showcase/public and
 * are named by their canonical FILE name (ASSET_MAP_CANONICAL.md), never by the
 * prompt ids. `ground` is the paper colour sampled from an illustration's
 * edges; a well paints it behind the image so letterboxing shows no seam. The
 * asset shape and the srcset helpers live in @baret/web-ui (lib/img).
 */

import { avif, type ImgAsset, widths } from "@baret/web-ui/lib/img";

export type { ImgAsset } from "@baret/web-ui/lib/img";

export const IMG = {
  l01: {
    src: "/assets/landing/l-01.webp",
    width: 1536,
    height: 768,
    avifSrcSet: avif("/assets/landing/l-01.webp"),
  },
  l06: {
    src: "/assets/landing/l-06.webp",
    width: 1536,
    height: 1024,
    srcSet: widths("/assets/landing/l-06.webp", 1536, [768, 1024]),
    avifSrcSet: avif(widths("/assets/landing/l-06.webp", 1536, [768, 1024])),
  },
  l07: {
    src: "/assets/landing/l-07.webp",
    width: 1536,
    height: 1024,
    avifSrcSet: avif("/assets/landing/l-07.webp"),
  },
  l09: {
    src: "/assets/landing/l-09.webp",
    width: 1536,
    height: 1024,
    ground: "#121212",
    avifSrcSet: avif("/assets/landing/l-09.webp"),
  },
  /** Pillar 1, Pre-sign Guard: the site office (FILE l-12, chalk line art). */
  l12: {
    src: "/assets/landing/l-12.webp",
    width: 1312,
    height: 1199,
    ground: "#EBEAE4",
    srcSet: widths("/assets/landing/l-12.webp", 1312, [480, 768, 1024]),
  },
  /** Pillar 2, Authorization Ledger: the tag rack (FILE l-13, chalk line art). */
  l13: {
    src: "/assets/landing/l-13.webp",
    width: 1374,
    height: 1145,
    ground: "#DBD9D1",
    srcSet: widths("/assets/landing/l-13.webp", 1374, [480, 768]),
  },
  /** Pillar 3, Post-sign Monitor: the dark watchtower (FILE l-14, painted night). */
  l14: {
    src: "/assets/landing/l-14.webp",
    width: 1374,
    height: 1145,
    ground: "#221D3D",
    srcSet: widths("/assets/landing/l-14.webp", 1374, [480, 768]),
  },
  l21: {
    src: "/assets/landing/l-21.webp",
    width: 1254,
    height: 1254,
    ground: "#CAC4BA",
    srcSet: widths("/assets/landing/l-21.webp", 1254, [480, 768]),
  },
  l22: {
    src: "/assets/landing/l-22.webp",
    width: 1536,
    height: 1024,
    ground: "#CDC9C0",
    srcSet: widths("/assets/landing/l-22.webp", 1536, [480, 768]),
  },
  l23: {
    src: "/assets/landing/l-23.webp",
    width: 1254,
    height: 1254,
    ground: "#D6D2C8",
    srcSet: widths("/assets/landing/l-23.webp", 1254, [480, 768]),
  },
  l25: {
    src: "/assets/landing/l-25.webp",
    width: 1024,
    height: 1536,
    ground: "#EAE5D8",
    srcSet: widths("/assets/landing/l-25.webp", 1024, [480, 768]),
  },
  l26: {
    src: "/assets/landing/l-26.webp",
    width: 1254,
    height: 1254,
    ground: "#E8E5D6",
    srcSet: widths("/assets/landing/l-26.webp", 1254, [480, 768]),
  },
  l27: {
    src: "/assets/landing/l-27.webp",
    width: 1024,
    height: 1536,
    ground: "#EAE4D6",
    srcSet: widths("/assets/landing/l-27.webp", 1024, [480, 768]),
  },
} as const satisfies Record<string, ImgAsset>;

/**
 * The demo dApps' pictures, by site, under their canonical file names
 * (public/assets/showcase). Each site has a hero and the two versions.
 */
export const SITE_ART = {
  novaswap: {
    routes: { src: "/assets/showcase/s-04.webp", width: 1536, height: 864 },
    safe: { src: "/assets/showcase/s-05.webp", width: 1536, height: 1024, ground: "#cfd0cb" },
    danger: { src: "/assets/showcase/s-06.webp", width: 1536, height: 953, ground: "#f4f1e7" },
  },
} as const satisfies Record<string, Record<string, ImgAsset>>;
