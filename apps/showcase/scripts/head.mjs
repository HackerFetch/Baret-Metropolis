/**
 * The static document head, written into index.html at build and dev time
 * (IMPROVE G1, E1, G4, G5).
 *
 * Link-preview bots (Discord, Slack, X, Telegram, WhatsApp, iMessage,
 * LinkedIn) do not run JavaScript, so the title, description and share card
 * have to be in the HTML. The copy comes from @baret/content and the LCP
 * preload from assets.ts, so neither is written twice. main.tsx removes the
 * nodes marked `data-static-head` before React mounts, which leaves the
 * per-route <title> and description in RootLayout as the only ones.
 *
 * The site URL is the `BARET_SITE_URL` env. No domain is chosen yet: without
 * it the canonical and og:url are left out, og:image stays relative (preview
 * bots then show no image) and the build prints one warning.
 *
 * Wire it in vite.config.ts: `plugins: [baretHead(), ...]`.
 */
import { resolve } from "node:path";
import { loadEnv } from "vite";
// The content files are imported by path, not as @baret/content: Vite loads
// the config's bare imports with plain Node, and the package index uses
// `.js` specifiers Node cannot map to `.ts`. These files import nothing.
import { common } from "../../../packages/content/src/shared/common.content.ts";
import { agents } from "../../../packages/content/src/showcase/agents.content.ts";
import { docs } from "../../../packages/content/src/showcase/docs.content.ts";
import { home } from "../../../packages/content/src/showcase/home.content.ts";
import { hub } from "../../../packages/content/src/showcase/hub.content.ts";
import { install } from "../../../packages/content/src/showcase/install.content.ts";
import { IMG } from "../src/landing/shared/assets.ts";
import { writeRouteHeads } from "./route-heads.mjs";

export const HEAD_MARK = "<!-- baret:head -->";
const START = "<!-- baret:head:start -->";
const END = "<!-- baret:head:end -->";

/** HTML attribute escaping for copy that may hold quotes or ampersands. */
const esc = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

/** The opener's frame 0, the LCP image on "/". Same set Img renders. */
function lcpPreload() {
  const a = IMG.l06;
  const set = a.avifSrcSet ?? a.srcSet;
  const type = a.avifSrcSet ? ' type="image/avif"' : "";
  return `<link rel="preload" as="image" fetchpriority="high"${type} imagesizes="100vw" imagesrcset="${set}">`;
}

/**
 * One route's head. `path` "/" gets the landing copy and the LCP preload;
 * every other route gets its registry title and the brand line.
 */
export function headFor({ path, title, description, site }) {
  const url = site ? `${site}${path}` : "";
  const image = `${site}/og.png`;
  const t = esc(title);
  const d = esc(description);
  const tags = [
    `<title data-static-head>${t}</title>`,
    `<meta data-static-head name="description" content="${d}">`,
    url && `<link rel="canonical" href="${url}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Baret">',
    url && `<meta property="og:url" content="${url}">`,
    `<meta property="og:title" content="${t}">`,
    `<meta property="og:description" content="${d}">`,
    `<meta property="og:image" content="${image}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${esc(home.meta.imageAlt)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    path === "/" && lcpPreload(),
  ].filter(Boolean);
  return [START, ...tags, END].join("\n    ");
}

/** Drop the head markers once no route needs to find the block again. */
export const stripHeadMarks = (html) =>
  html.replace(`${START}\n    `, "").replace(`\n    ${END}`, "");

/**
 * Drop the developer comments from the built HTML; they are notes for whoever
 * edits index.html, not for every visitor. The head markers stay until
 * route-heads.mjs has used them.
 */
const stripComments = (html) => html.replace(/[ \t]*<!--(?! baret:head)[\s\S]*?-->\n?/g, "");

/** Swap the head block of a built page for another route's. */
export function replaceHead(html, head) {
  const from = html.indexOf(START);
  const to = html.indexOf(END);
  if (from < 0 || to < 0) throw new Error("baret-head: head markers missing");
  return html.slice(0, from) + head + html.slice(to + END.length);
}

export function baretHead() {
  let site = "";
  let outDir = "dist";
  let isBuild = false;
  let routesFile = "";
  return {
    name: "baret-head",
    configResolved(config) {
      const env = loadEnv(config.mode, config.envDir ?? config.root, "BARET_");
      site = (env.BARET_SITE_URL ?? process.env.BARET_SITE_URL ?? "").replace(/\/+$/, "");
      outDir = resolve(config.root, config.build.outDir);
      routesFile = resolve(config.root, "src/routes.ts");
      isBuild = config.command === "build";
      if (site && !/^https?:\/\/[^/]+/.test(site)) {
        throw new Error(`baret-head: BARET_SITE_URL must be an absolute URL, got "${site}"`);
      }
      if (isBuild && !site) {
        // A deploy without it ships no sitemap, no canonical and an og:image
        // most unfurlers reject. CI (or BARET_REQUIRE_SITE_URL=1) fails the
        // build; a local build gets a banner it cannot miss.
        const msg =
          "baret-head: BARET_SITE_URL is not set. This build has NO sitemap.xml, NO canonical/og:url and a RELATIVE og:image. Do not deploy it; set BARET_SITE_URL=https://<domain> and rebuild.";
        if (process.env.CI || process.env.BARET_REQUIRE_SITE_URL) throw new Error(msg);
        const bar = "!".repeat(72);
        config.logger.warn(`\n${bar}\n${msg}\n${bar}\n`);
      }
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        const head = headFor({ path: "/", ...home.meta, site });
        const out = html.replace(HEAD_MARK, head);
        return isBuild ? stripComments(out) : out;
      },
    },
    async closeBundle() {
      if (!isBuild) return;
      // Registry key -> that page's own description, so inner links do not
      // all unfurl with the brand line.
      const descriptions = {
        showcase: hub.meta.description,
        agents: agents.meta.description,
        docs: docs.meta.description,
        install: install.meta.description,
      };
      await writeRouteHeads({
        outDir,
        routesFile,
        site,
        description: common.brand.description,
        descriptions,
      });
    },
  };
}
