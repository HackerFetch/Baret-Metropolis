import { defineConfig } from "vitest/config";

/**
 * One runner for the whole workspace. Projects inherit this root config in
 * Vitest 5, so a plugin declared here reaches every package.
 */
export default defineConfig({
  test: {
    projects: ["apps/*", "packages/*"],
  },
});
