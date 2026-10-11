import { next } from "@vercel/functions";

/**
 * Vercel Routing Middleware, in front of this site's `/api` rewrite to the
 * Baret server (vercel.json).
 *
 * It marks every request the site sends on with `x-baret-edge`, a secret the
 * server shares (BARET_EDGE_SECRET on both sides). The server then knows the
 * request came through this site's edge and which X-Forwarded-For entry is
 * the visitor, so a caller who goes to the server directly cannot pass for a
 * visitor or invent addresses to dodge the rate limits
 * (apps/server/src/api/client.ts, docs/SYSTEM_GAPS.md G-17).
 *
 * Whatever the browser sent under that name is replaced, never passed on.
 * With no secret set the header is removed and the rewrite goes on as before.
 */
export const config = { matcher: "/api/:path*" };

export default function middleware(request: Request): Response {
  const headers = new Headers(request.headers);
  const secret = process.env.BARET_EDGE_SECRET;
  if (secret) headers.set("x-baret-edge", secret);
  else headers.delete("x-baret-edge");
  return next({ request: { headers } });
}
