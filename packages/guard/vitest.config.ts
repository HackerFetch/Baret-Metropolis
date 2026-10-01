import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "guard",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
