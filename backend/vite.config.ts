import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: "localhost",
    proxy: {
      "/api": "http://localhost:3001",
    },
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
