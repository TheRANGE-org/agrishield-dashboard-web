import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget =
    env.VITE_API_BASE_URL ||
    "https://agrishield-dashboard-api-378259382997.us-south1.run.app";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      proxy: {
        // Proxy /api/* and /health to the backend, bypassing browser CORS.
        // In production (CF Pages) the frontend calls the API domain directly;
        // CF Access handles auth there. This proxy is dev-only.
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
        },
        "/health": {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
    },
  };
});
