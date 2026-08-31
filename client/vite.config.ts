import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Reflex Logistics frontend — Vite config.
// The dev server proxies /api to the backend so the browser never needs a
// hardcoded backend origin baked into requests (see src/api/client.ts).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: true,
    // Route-level code splitting per role (Section 23 of the frontend spec) —
    // Vite/Rollup already splits dynamic imports; this just keeps vendor
    // chunks separate from role bundles so a rider on a low-end phone isn't
    // pulling in dispatcher-only code.
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          query: ["@tanstack/react-query"],
        },
      },
    },
  },
});
