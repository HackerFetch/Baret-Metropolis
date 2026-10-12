import { webUiFonts } from "@baret/web-ui/vite";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // webUiFonts: the self-hosted faces at /fonts, shared with the showcase.
  plugins: [webUiFonts(), react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  resolve: { tsconfigPaths: true },
  server: {
    port: 5180,
    proxy: {
      "/api": {
        // BARET_API_URL points the dev proxy at another local API (a second port).
        target: process.env.BARET_API_URL ?? "http://localhost:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  build: {
    target: "baseline-widely-available",
    // A security product does not publish its source: same rule as the
    // showcase. BARET_SOURCEMAPS=1 writes hidden maps (no sourceMappingURL
    // comment) for a local look at a stack trace.
    sourcemap: process.env.BARET_SOURCEMAPS === "1" ? "hidden" : false,
  },
});
