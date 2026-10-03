import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "demo",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
