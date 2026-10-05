import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "wallet-core",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
