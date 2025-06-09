import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    conditions: ['import', 'module', 'browser', 'default'],
    // Ensure proper resolution of package exports
    dedupe: ['@convex-dev/agent'],
  },
  server: {
    // Reduce logging verbosity
    hmr: {
      overlay: false
    }
  },
  // Reduce build logging
  logLevel: 'warn',
  optimizeDeps: {
    include: ['@convex-dev/agent'],
    // Force pre-bundling of the agent package
    force: true
  },
  build: {
    rollupOptions: {
      // Don't externalize the agent package - bundle it instead
      output: {
        manualChunks: {
          'convex-agent': ['@convex-dev/agent']
        }
      }
    }
  }
});
