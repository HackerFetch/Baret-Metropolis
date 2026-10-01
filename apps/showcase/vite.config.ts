import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Vite 8 runs on Rolldown, so the options are `oxc` and `rolldownOptions`
 * rather than `esbuild` and `rollupOptions`.
 *
 * React Compiler goes through Babel rather than the plugin's native `compiler`
 * flag. The native path is faster but is still marked experimental, and this
 * is the exact compiler the React team documents. Revisit when the flag loses
 * the experimental label.
 */
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],

  resolve: {
    // Native replacement for vite-tsconfig-paths, new in Vite 8.
    tsconfigPaths: true,
  },

  server: {
    port: 5173,
    proxy: {
      // The analysis server during development. Ezgin owns apps/server.
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },

  build: {
    target: "baseline-widely-available",
    sourcemap: true,
    rolldownOptions: {
      output: {
        // The six demo sites are heavy and rarely visited together.
        advancedChunks: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|react-router)[\\/]/ },
            { name: "chain", test: /node_modules[\\/]viem[\\/]/ },
          ],
        },
      },
    },
  },
});
