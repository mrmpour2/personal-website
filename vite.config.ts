import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  // Vite loads .env files after evaluating the config, so read this proxy setting explicitly.
  const viteEnv = loadEnv(mode, process.cwd(), "VITE_");
  const devApiTarget = viteEnv.VITE_DEV_API_TARGET || process.env.VITE_DEV_API_TARGET;
  const apiTarget = devApiTarget || "http://localhost:5000";

  return {
     base: '/personal-website/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5400, // پورت مجزا از داشبورد
      watch: {
        usePolling: true,
      },
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          configure(proxy) {
            if (devApiTarget) {
              proxy.on("proxyReq", (proxyRequest) => {
                proxyRequest.removeHeader("origin");
              });
            }
          }
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
  };
});
