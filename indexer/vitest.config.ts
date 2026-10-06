import { defineConfig } from "vitest/config";

// Not one of the workspace's test projects: these tests read real blocks
// through HyperSync and need ENVIO_API_TOKEN and the network.
export default defineConfig({
  test: {
    name: "indexer",
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 60_000,
  },
});
