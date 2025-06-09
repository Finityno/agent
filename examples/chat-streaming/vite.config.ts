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
    include: ['@convex-dev/agent']
  },
  build: {
    rollupOptions: {
      output: {
        // Ensure proper chunking
        manualChunks: {
          'convex-agent': ['@convex-dev/agent']
        }
      }
    }
  }
});
