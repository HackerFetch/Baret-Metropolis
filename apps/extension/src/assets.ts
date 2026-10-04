/**
 * Every extension asset path, with its intrinsic size. The only file in the
 * extension where an asset path is written. Files live in
 * apps/extension/public/assets/extension and are named by their prompt id;
 * each one was opened and checked against its screen. `ground` is the paper
 * colour sampled from the picture's corners, so a well paints it behind a
 * contained picture with no seam. The asset shape and the srcset helper live
 * in @baret/web-ui (lib/img).
 *
 * The smaller copies were made from assets-raw with `cwebp -q 82 -resize
 * <width> 0`: 480, 768 and 1152 px for every picture, and 160, 320 and 480 px
 * for the four verdict tags, which the popup shows small.
 *
 * The widest well is 380 px, so a DPR 3 screen needs 1152 px at most: the
 * 1152 copy stands in for the 1536 px original, which no page asks for.
 */

import { type ImgAsset, widths } from "@baret/web-ui/lib/img";

export type { ImgAsset } from "@baret/web-ui/lib/img";

const E = "/assets/extension/";

/** The widest copy a well needs (380 px at DPR 3). */
const TOP = 1152;

function art(
  id: string,
  width: number,
  height: number,
  ground: string,
  sizes?: readonly number[],
): ImgAsset {
  // The verdict tags pass their own small sizes and keep the 1024 px original.
  if (sizes) {
    const src = `${E}${id}.webp`;
    return { src, width, height, ground, srcSet: widths(src, width, sizes) };
  }
  const copies = [480, 768].map((w) => `${E}${id}-w${w}.webp ${w}w`).join(", ");
  const src = `${E}${id}-w${TOP}.webp`;
  const scaled = Math.round((height * TOP) / width);
  return { src, width: TOP, height: scaled, ground, srcSet: `${copies}, ${src} ${TOP}w` };
}

/** Setup, one picture per step (FILE e-01 to e-08). */
export const SETUP_ART = {
  /** A hard hat and a blank tag on a ledge at the site entrance. Welcome. */
  welcome: art("e-01", 1536, 1024, "#B4B3B3"),
  /** A combination dial on a lockbox door, an orange tag through the shackle. Passphrase. */
  passphrase: art("e-02", 1536, 1024, "#746E68"),
  /** A freshly cut brass key on the bed of a key-cutting machine. Your key. */
  key: art("e-03", 1536, 1024, "#6F3A21"),
  /** The tag folded once and sealed with an orange dot. Backup. */
  backup: art("e-04", 1536, 1024, "#363533"),
  /** A tap on a concrete wall filling a tagged bucket. Funds. */
  fund: art("e-05", 1254, 1254, "#DBD7D2"),
  /** Formwork being filled, a spirit level on top. The account check. */
  account: art("e-06", 1536, 1024, "#DEDAD2"),
  /** Three tags on a board, green, amber and grey, one lifted off. Rules. */
  rules: art("e-07", 1536, 1024, "#DFC1A9"),
  /** The night site from the gate, a helmeted figure walking in. Done. */
  done: art("e-08", 1536, 1024, "#0E0A1D"),
} as const satisfies Record<string, ImgAsset>;

/** The popup, one picture per screen (FILE e-09 to e-16, e-21, e-29 to e-31). */
export const POPUP_ART = {
  /** An empty hard-hat hook with an orange tag on it. No wallet yet. */
  setup: art("e-09", 1536, 1024, "#D4D0C7"),
  /** An orange latch bar dropped across a lockbox door. Locked. */
  locked: art("e-10", 1536, 1024, "#807C76"),
  /** One tag on its wire on graphite. Home, nothing in it yet. */
  home: art("e-11", 1536, 1024, "#1F1F1F"),
  /** An empty conveyor belt. Activity, nothing in it yet. */
  activity: art("e-12", 1536, 1024, "#DBD6CC"),
  /** A rack of empty hooks, one tag on the first. Allowances, none yet. */
  allowances: art("e-13", 1536, 1024, "#CECBC1"),
  /** A watchtower with its lamp off in daylight. Alerts, none. */
  alerts: art("e-14", 1536, 1024, "#C7AB97"),
  /** Two conveyors crossing, taped off at the junction. Swap, not built yet. */
  swap: art("e-15", 1536, 1024, "#BEBAB1"),
  /** Three hard hats on hooks, the first one orange. Accounts. */
  accounts: art("e-16", 1536, 1024, "#BFB9AF"),
  /** A site gate latch with a blank tag hanging from it. Connect. */
  connect: art("e-21", 1536, 1024, "#B9B0A8"),
  /** A chute angled away from an empty loading bay. Send, nothing to send. */
  send: art("e-29", 1536, 1024, "#C4C0BA"),
  /** An open hopper over an empty tray. Receive. */
  receive: art("e-30", 1536, 1024, "#DCC2B0"),
  /** A panel of four breaker levers beside two blank dials. Settings. */
  settings: art("e-31", 1536, 1024, "#DED8D1"),
} as const satisfies Record<string, ImgAsset>;

/** The tag of each verdict, its edge in the verdict's colour (FILE e-17 to e-20). */
export const VERDICT_ART = {
  safe: art("e-17", 1024, 1536, "#262524", [160, 320, 480]),
  caution: art("e-18", 1024, 1536, "#22201F", [160, 320, 480]),
  /** In front of a closed roller shutter. */
  blocked: art("e-19", 1024, 1536, "#4E4E4D", [160, 320, 480]),
  /** The edge in ink, the wire slack, the light low. */
  unreachable: art("e-20", 1024, 1536, "#121210", [160, 320, 480]),
} as const satisfies Record<string, ImgAsset>;

/**
 * The options page, one picture per page (FILE e-22 to e-28). E-22 came back
 * as a second take of the connect gate instead of the concrete header its
 * prompt asks for, so it stands for one site at its gate (the site detail)
 * and the overview uses the plain tag of e-11.
 */
export const OPTIONS_ART = {
  overview: POPUP_ART.home,
  /** A timeline of small squares, one filled orange. Activity. */
  activity: art("e-23", 1536, 512, "#EDECE8"),
  /** A rack of tags with orange fill bars of different lengths. Permissions. */
  permissions: art("e-24", 1536, 1024, "#D5D0C7"),
  /** A panel of blank toggles, one row in an orange dashed box. Rules. */
  rules: art("e-25", 1536, 1024, "#ECEAE6"),
  /** Concrete blocks under orange inspection lamps at night. Payments. */
  payments: art("e-26", 1536, 1024, "#291F35"),
  /** A row of site gates, one taped off. Sites. */
  sites: art("e-27", 1536, 1024, "#A8A2A0"),
  /** One site gate latch with its tag: a single site. Site detail. */
  site: art("e-22", 1536, 1024, "#A69D96"),
  /** A wide breaker panel with its door open. Settings. */
  settings: art("e-28", 1536, 1024, "#C7C2B8"),
} as const satisfies Record<string, ImgAsset>;
