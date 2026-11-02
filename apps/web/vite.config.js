import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // В dev-режиме браузер обращается к Vite (тот же origin), а Vite проксирует
  // REST и Socket.IO в backend. Поэтому CORS-список API не нужно расширять под порт 5173.
  const apiTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:3001";

  return {
    plugins: [react()],
    base: "./",
    server: {
      port: 5173,
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true },
        "/socket.io": { target: apiTarget, changeOrigin: true, ws: true }
      }
    },
    preview: {
      host: "127.0.0.1",
      port: 4173,
      strictPort: true
    },
    build: {
      outDir: fileURLToPath(new URL("../../dist", import.meta.url)),
      emptyOutDir: true,
      target: "es2022",
      sourcemap: false
    }
  };
});
