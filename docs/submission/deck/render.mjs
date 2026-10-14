// Renders the pitch deck and the one-pager to PDF with playwright-core.
// Usage: PLAYWRIGHT_CORE=/path/to/playwright-core/index.mjs node docs/submission/deck/render.mjs [shots-dir]
// playwright-core is not a dependency of this repository; point PLAYWRIGHT_CORE at any local copy.

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = await import(process.env.PLAYWRIGHT_CORE ?? "playwright-core");
const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);
const shots = process.argv[2];

async function render(html, pdf, opts, viewport) {
  const page = await browser.newPage({ viewport });
  await page.goto(pathToFileURL(path.join(here, html)).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.join(here, "..", pdf), printBackground: true, ...opts });
  if (shots)
    await page.screenshot({
      path: path.join(shots, html.replace(".html", ".png")),
      fullPage: true,
    });
  await page.close();
}

await render(
  "pitch-deck.html",
  "baret-pitch-deck.pdf",
  { width: "1920px", height: "1080px" },
  { width: 1920, height: 1080 },
);
await render(
  "one-pager.html",
  "baret-one-pager.pdf",
  { format: "A4" },
  { width: 794, height: 1123 },
);
await browser.close();
process.stdout.write("rendered\n");
