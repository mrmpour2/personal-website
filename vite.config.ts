import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5174, // پورت مجزا از داشبورد
    watch: {
      usePolling: true,
    },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (/\/(?:react|react-dom|scheduler)\//.test(id)) return "vendor-react";
          if (/\/(?:framer-motion|motion-dom|motion-utils)\//.test(id)) return "vendor-motion";
          if (/\/(?:gsap|lenis)\//.test(id)) return "vendor-scroll-motion";
          if (id.includes("/lucide-react/")) return "vendor-icons";
        },
      },
    },
  },
});
