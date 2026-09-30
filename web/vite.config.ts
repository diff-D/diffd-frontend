import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { searchForWorkspaceRoot } from "vite";
import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [solid(), tailwindcss()],
  server: {
    port: 5173,
    // the API server (API_TARGET picks another)
    proxy: { "/api": { target: process.env.API_TARGET ?? "http://127.0.0.1:8080", ws: true } },
    // unjumble imports its dictionary from the repo's wordlists/
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), fileURLToPath(new URL("../wordlists", import.meta.url))] },
  },
  // unit tests are pure logic; vite-plugin-solid would otherwise pick jsdom
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
