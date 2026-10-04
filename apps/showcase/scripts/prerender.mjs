/**
 * Prerenders "/" into dist/index.html after the client build (IMPROVE E5).
 *
 * The landing used to paint only once its scripts had loaded and run: about
 * 2.1 s on a throttled phone, with the hero picture painting later still.
 * With the markup in the HTML the first frame needs the HTML and the CSS
 * alone, and React hydrates it when the scripts arrive.
 *
 * Steps: build src/entry-server.tsx for Node into node_modules/.cache (never
 * shipped), render "/" and write the markup into the empty #root. Every
 * other route keeps the empty shell: route-heads.mjs has already written its
 * own file from it.
 */
import { readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";

const root = resolve(import.meta.dirname, "..");
const outDir = join(root, "node_modules/.cache/baret-ssr");
const page = join(root, "dist/index.html");
const EMPTY = '<div id="root"></div>';

await build({
  root,
  logLevel: "warn",
  build: {
    ssr: "src/entry-server.tsx",
    outDir,
    emptyOutDir: true,
    copyPublicDir: false,
    rolldownOptions: {
      // Chunking does not matter in a bundle that only runs here once.
      onLog(level, log, handler) {
        if (log.code === "INEFFECTIVE_DYNAMIC_IMPORT") return;
        handler(level, log);
      },
    },
  },
});

const { render } = await import(pathToFileURL(join(outDir, "entry-server.js")).href);
const markup = await render("/");
if (!markup.startsWith("<div")) throw new Error("prerender: unexpected markup at the start of /");

const shell = await readFile(page, "utf8");
if (!shell.includes(EMPTY)) throw new Error("prerender: dist/index.html has no empty #root");
await writeFile(page, shell.replace(EMPTY, `<div id="root">${markup}</div>`));
await rm(outDir, { recursive: true, force: true });
console.log(
  `prerender: "/" written into dist/index.html (${Math.round(markup.length / 1024)} KB of markup)`,
);
