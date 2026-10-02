import { routes } from "../../../routes.js";
import { IMG, type ImgAsset } from "../../shared/assets.js";

/**
 * The illustration for each showcase card, keyed by the card's href.
 *
 * One crop rule for all six: every print fills its well (`cover`) at one
 * aspect ratio, and a per-asset focal point keeps the subject at the same
 * share of the frame. The isometric scenes (Scrybe, NovaSwap, PixelDrop)
 * and the paper objects (OrbitYield, ClaimHub, LaunchPad) then read as one
 * set, with no letterbox and no seam.
 */

/** The paper colour a well shows while its print loads. */
export const WELL_GROUND = "#E9E4D6";

export interface CardMedia {
  readonly asset: ImgAsset;
  /** object-position for the cover crop. */
  readonly position: string;
}

export const CARD_MEDIA: Readonly<Record<string, CardMedia>> = {
  [routes.scrybe.path]: { asset: IMG.l21, position: "30% 60%" },
  [routes.novaswap.path]: { asset: IMG.l22, position: "50% 50%" },
  [routes.pixeldrop.path]: { asset: IMG.l23, position: "60% 66%" },
  [routes.orbityield.path]: { asset: IMG.l25, position: "50% 40%" },
  [routes.claimhub.path]: { asset: IMG.l26, position: "50% 20%" },
  [routes.launchpad.path]: { asset: IMG.l27, position: "50% 40%" },
};
