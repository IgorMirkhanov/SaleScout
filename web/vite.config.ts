import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/products": "http://127.0.0.1:3010",
      "/reprice": "http://127.0.0.1:3010",
    },
  },
});
