import { useReducedMotion } from "motion/react";

/**
 * True when the reader asked for reduced motion. Motion reports `null` before
 * it knows; that counts as "no preference".
 *
 * Every landing component reads this itself. The CSS reset in tokens.css does
 * not reach Motion's JS animations or scroll-linked values.
 */
export function useReduce(): boolean {
  return useReducedMotion() === true;
}
