import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: path.resolve(__dirname, "src/renderer"),
  plugins: [react()],
  base: "./",
  server: {
    host: "127.0.0.1",
    port: 5173
  },
  build: {
    outDir: path.resolve(__dirname, "dist/renderer"),
    emptyOutDir: true
  },
  resolve: {
    alias: {
      "@renderer": path.resolve(__dirname, "src/renderer"),
      "@shared": path.resolve(__dirname, "src/shared")
    }
  }
});
