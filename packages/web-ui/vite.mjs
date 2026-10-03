// The self-hosted faces for every web app, served at /fonts.
//
// The woff2 files live once, in packages/web-ui/fonts. This plugin serves
// them at /fonts/<file> in dev and writes them to dist/fonts/<file> in a
// build, so an app keeps the same stable URLs its index.html preloads and its
// vercel.json caches as immutable, without a copy in each app's public/.
// Plain JavaScript: the apps' vite.config.ts loads it through Node directly.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(import.meta.dirname, "fonts");
const PREFIX = "/fonts/";

/** @returns {import("vite").Plugin} */
export function webUiFonts() {
  const files = readdirSync(DIR).filter((name) => name.endsWith(".woff2"));
  return {
    name: "baret-web-ui-fonts",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? "").split("?")[0] ?? "";
        const name = path.startsWith(PREFIX) ? path.slice(PREFIX.length) : "";
        if (!files.includes(name)) return next();
        res.setHeader("Content-Type", "font/woff2");
        res.setHeader("Cache-Control", "no-cache");
        res.end(readFileSync(join(DIR, name)));
      });
    },
    generateBundle() {
      for (const name of files) {
        this.emitFile({
          type: "asset",
          fileName: `fonts/${name}`,
          source: readFileSync(join(DIR, name)),
        });
      }
    },
  };
}
