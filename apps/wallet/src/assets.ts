/**
 * Every wallet asset path, with its intrinsic size. The only file in the
 * wallet where an asset path is written. Files live in apps/wallet/public and
 * are named by their prompt id; each one was opened and checked against its
 * screen. `ground` is the paper colour sampled from the picture's edges, so a
 * well paints it behind a contained picture with no seam. The asset shape and
 * the srcset helper live in @baret/web-ui (lib/img).
 */

import { type ImgAsset, widths } from "@baret/web-ui/lib/img";

export type { ImgAsset } from "@baret/web-ui/lib/img";

const W = "/assets/wallet/";

function art(id: string, width: number, height: number, ground: string): ImgAsset {
  const src = `${W}${id}.webp`;
  return { src, width, height, ground, srcSet: widths(src, width, [480, 768]) };
}

/** One picture per screen (FILE w-01 to w-14). */
export const WALLET_ART = {
  /** A site gate at sunset, a hard hat on its post: the way in. Onboarding, welcome. */
  welcome: art("w-01", 1536, 1024, "#D6D3D0"),
  /** A round steel plate ringed in violet, set in concrete: the passkey. Onboarding. */
  passkey: art("w-02", 1536, 1024, "#968E88"),
  /** A mixer pouring into a tagged bucket: the first funds. Onboarding. */
  fund: art("w-03", 1536, 1024, "#E3E0D8"),
  /** Three tags on a wall, green, orange and plain: three starting rules. Onboarding. */
  rules: art("w-04", 1536, 1024, "#DBD7CF"),
  /** A worker walking onto a night site: ready. Onboarding, done. */
  done: art("w-05", 1536, 1024, "#130D1B"),
  /** A concrete wall over an orange floor line. Home. */
  home: art("w-06", 1536, 1024, "#A59C93"),
  /** A conveyor with an orange arrow post: what leaves. Send. */
  send: art("w-07", 1536, 1024, "#EAE7E0"),
  /** A chute over an empty crate: what arrives. Receive. */
  receive: art("w-08", 1536, 1024, "#E0DCD3"),
  /** A blank tag on black: the log. Activity. */
  activity: art("w-09", 1024, 1536, "#202020"),
  /** A board of tags in rows: every rule. Rules. */
  policies: art("w-10", 1536, 1024, "#DFDAD1"),
  /** A breaker panel with its door open and a tag: the switches. Settings. */
  settings: art("w-11", 1536, 1024, "#D7D0C7"),
  /** A site gate with a latch and a tag: a site at the gate. Connect. */
  connect: art("w-12", 1536, 1024, "#AAA298"),
  /** A key drawn as a plan, a smaller key cut from it: the agent sub-key. Agents. */
  subKey: art("w-13", 1536, 1024, "#EFEEEA"),
  /** A lockbox with a master key, a small tagged key outside it: the vault. Agents. */
  vault: art("w-14", 1536, 1024, "#33302C"),
} as const satisfies Record<string, ImgAsset>;
