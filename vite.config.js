import { defineConfig } from "vite";
import { resolve } from "node:path";
import { cpSync } from "node:fs";
export default defineConfig({
  publicDir: false,
  plugins: [
    {
      name: "static-assets",
      closeBundle() {
        for (const path of ["assets", "script.js", "favicon.svg", "CNAME"])
          cpSync(path, resolve("dist", path), { recursive: true });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        home: resolve("index.html"),
        kartr: resolve("kartr/index.html"),
        mobile: resolve("mobile-preview.html"),
      },
    },
  },
});
