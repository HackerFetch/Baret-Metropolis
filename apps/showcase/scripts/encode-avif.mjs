/**
 * AVIF twins of the four big landing photos (IMPROVE E6).
 *
 * Encoded from the lossless masters in assets-raw (gitignored, local only),
 * never from the shipped WebP, so there is no generation loss. Same names and
 * widths as the WebP set, `.avif`, so `avif()` in assets.ts maps one to the
 * other. Run by hand when a master changes: `node scripts/encode-avif.mjs`.
 * Needs ImageMagick 7 built with libheif. The files are committed; nothing
 * runs at build time.
 *
 * Check every output by eye on the dark ground: AVIF can smear grain and band
 * smooth graphite skies. A frame that looks worse keeps WebP only (leave its
 * avifSrcSet unset in assets.ts).
 *
 * WEBP_FRAMES adds the smaller WebP widths a srcSet needs (bento pillars),
 * same master, quality 80 (matches the existing -w480 / -w768 copies).
 * `node scripts/encode-avif.mjs webp` (or `avif`) runs one set only.
 */
import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const at = (p) => fileURLToPath(new URL(p, import.meta.url));
const RAW = at("../../../assets-raw/");
const OUT = at("../public/assets/landing/");
const QUALITY = "55";

/** master file, shipped name, full width, smaller copies. */
const FRAMES = [
  ["l-6.png", "l-06", 1536, [768, 1024]],
  ["l-1.png", "l-01", 1536, []],
  ["l-7.png", "l-07", 1536, []],
  ["l-9.png", "l-09", 1536, []],
];

/** master file, shipped name, smaller WebP copies (the full width already ships). */
const WEBP_FRAMES = [
  ["l-12.png", "l-12", [480, 768, 1024]],
  ["l-13.png", "l-13", [480, 768]],
  ["l-14.png", "l-14", [480, 768]],
];

const only = process.argv[2];

for (const [master, name, smaller] of only === "avif" ? [] : WEBP_FRAMES) {
  const src = RAW + master;
  if (!existsSync(src)) throw new Error(`encode-avif: missing master ${src}`);
  for (const w of smaller) {
    const out = `${OUT}${name}-w${w}.webp`;
    execFileSync("magick", [
      src,
      "-resize",
      `${w}x`,
      "-strip",
      "-quality",
      "80",
      "-define",
      "webp:method=6",
      out,
    ]);
    console.log(`${out.slice(OUT.length)}  ${Math.round(statSync(out).size / 1024)} KB`);
  }
}

for (const [master, name, full, smaller] of only === "webp" ? [] : FRAMES) {
  const src = RAW + master;
  if (!existsSync(src)) throw new Error(`encode-avif: missing master ${src}`);
  for (const w of [...smaller, full]) {
    const out = `${OUT}${name}${w === full ? "" : `-w${w}`}.avif`;
    execFileSync("magick", [
      src,
      "-resize",
      `${w}x`,
      "-strip",
      "-quality",
      QUALITY,
      "-define",
      "heic:speed=4",
      out,
    ]);
    console.log(`${out.slice(OUT.length)}  ${Math.round(statSync(out).size / 1024)} KB`);
  }
}
