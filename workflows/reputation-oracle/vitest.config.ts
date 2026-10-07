import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "reputation-oracle",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
