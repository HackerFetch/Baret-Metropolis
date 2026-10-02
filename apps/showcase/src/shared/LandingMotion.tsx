import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import type { JSX, ReactNode } from "react";
import { ENTER } from "./motion.js";

/**
 * The page-level motion default [SB 1.4]. Motion's built-in default for
 * transforms is a spring that can overshoot; BRAND section 08 forbids that, so
 * every motion element without its own transition gets the 160 ms ease-out
 * surface enter instead. `reducedMotion="user"` also switches Motion's own
 * transform animations off for readers who ask.
 *
 * LazyMotion with `domAnimation` gives `m.*` elements animation, variants and
 * whileInView only. The landing uses no layout animation and no drag, so the
 * projection and gesture code (about 45 kB minified) stays out of the chunk,
 * as long as every landing file renders `m.*` instead of `motion.*`: one
 * `motion.*` import pulls the full feature set back in.
 */
export function LandingMotion({ children }: { children: ReactNode }): JSX.Element {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user" transition={ENTER}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
