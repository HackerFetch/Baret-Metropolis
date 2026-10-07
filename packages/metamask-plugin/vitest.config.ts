import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "metamask-plugin",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
