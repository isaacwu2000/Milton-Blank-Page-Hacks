import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  root: new URL(".", import.meta.url).pathname,
  envDir: new URL("..", import.meta.url).pathname,
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    proxy: {
      "/api": "http://127.0.0.1:8080",
      "/agent": "http://127.0.0.1:3001",
    },
  },
  build: { sourcemap: false },
});
