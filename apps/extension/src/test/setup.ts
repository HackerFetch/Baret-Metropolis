import { cleanup } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { afterEach } from "vitest";

/** Motion settles at once in tests, so interaction tests never wait on an
 *  animation; every test starts from an empty document, as in the other apps. */
MotionGlobalConfig.skipAnimations = true;

afterEach(() => {
  cleanup();
});
