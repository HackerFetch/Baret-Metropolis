/**
 * Build-time files that depend on the route registry (IMPROVE G4, G5).
 *
 * - `dist/<route>/index.html` for every marketing route: the built index.html
 *   with that route's title, description, og:* and canonical, so a shared
 *   inner link unfurls with its own card. The host serves these files before
 *   the SPA fallback. The body stays the SPA shell until "/" is prerendered.
 * - `dist/sitemap.xml` listing "/" and the marketing routes, and a Sitemap
 *   line appended to the robots.txt copied from public/. Both need absolute
 *   URLs, so they are written only when BARET_SITE_URL is set.
 *
 * The registry is read as text: importing routes.ts would pull every lazy
 * page into the config bundle. The demo sites are never listed (they carry
 * noindex), and neither is anything without `group: "marketing"`.
 */
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { headFor, replaceHead, stripHeadMarks } from "./head.mjs";

/** `{ key, path, title }` for each registry entry whose group is "marketing". */
export function marketingRoutes(source) {
  const parts = source.split(/\n {2}(\w+): \{/).slice(1);
  const entries = [];
  for (let i = 0; i < parts.length; i += 2) entries.push({ key: parts[i], body: parts[i + 1] });
  return entries
    .filter(({ body }) => /group: "marketing"/.test(body))
    .map(({ key, body }) => ({
      key,
      path: body.match(/path: "([^"]+)"/)?.[1],
      title: body.match(/title: "([^"]+)"/)?.[1],
    }))
    .filter((r) => r.path && r.title && !r.path.includes(":"));
}

function sitemap(site, paths) {
  const urls = paths.map((p) => `  <url><loc>${site}${p}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

/**
 * `descriptions` maps a registry key to that page's meta description from
 * @baret/content; a route without one falls back to `description` (the brand
 * line). The head markers are stripped from every written page, "/" included,
 * once they are no longer needed.
 */
export async function writeRouteHeads({ outDir, routesFile, site, description, descriptions }) {
  const routes = marketingRoutes(await readFile(routesFile, "utf8"));
  if (routes.length === 0) throw new Error("route-heads: no marketing routes found");
  const shellFile = join(outDir, "index.html");
  const shell = await readFile(shellFile, "utf8");

  for (const route of routes) {
    const own = descriptions?.[route.key] ?? description;
    const html = replaceHead(shell, headFor({ ...route, description: own, site }));
    const dir = join(outDir, route.path.slice(1));
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.html"), stripHeadMarks(html));
  }
  await writeFile(shellFile, stripHeadMarks(shell));

  if (!site) return;
  await writeFile(join(outDir, "sitemap.xml"), sitemap(site, ["/", ...routes.map((r) => r.path)]));
  await appendFile(join(outDir, "robots.txt"), `\nSitemap: ${site}/sitemap.xml\n`);
}
