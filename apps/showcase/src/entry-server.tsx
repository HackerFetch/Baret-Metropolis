import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from "react-router";
import { routeObjects } from "./router.js";

/**
 * The <title>, <meta> and <link> tags React renders in front of the markup.
 * The page's static head already carries them, and React adds its own to the
 * head when it hydrates, so they never belong inside #root.
 */
const HOISTED = /^(?:<(?:title|meta|link)\b[^>]*>(?:[^<]*<\/title>)?)+/;

/**
 * Renders one path of the showcase to the markup for #root, from the same
 * route tree the browser uses. scripts/prerender.mjs builds this file for
 * Node and writes the result for "/" into dist/index.html, so the landing
 * paints before any script runs; main.tsx then hydrates it.
 *
 * Anything that reads the browser (matchMedia, WebGL, storage, layout) must
 * do so in an effect or behind useSyncExternalStore with a server snapshot,
 * or the first client render differs from this HTML and React redraws the
 * page (entry-server.test.tsx checks it).
 */
export async function render(path: string): Promise<string> {
  const handler = createStaticHandler(routeObjects);
  const context = await handler.query(new Request(`http://localhost${path}`));
  if (context instanceof Response) throw new Error(`prerender: ${path} answered ${context.status}`);
  const router = createStaticRouter(handler.dataRoutes, context);
  const html = renderToString(
    <StrictMode>
      <StaticRouterProvider router={router} context={context} hydrate={false} />
    </StrictMode>,
  );
  return html.replace(HOISTED, "");
}
