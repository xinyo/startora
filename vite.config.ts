import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vite";
import { imagetools } from "vite-imagetools";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    imagetools({
      include: /[\\/]src[\\/]assets[\\/].*\.png(?:\?.*)?$/i,
      defaultDirectives: new URLSearchParams({
        w: "200",
        h: "200",
        fit: "inside",
        format: "webp",
        quality: "70",
        effort: "max",
      }),
    }),
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
  },
});
