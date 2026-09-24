import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the built site works whether it is served from the domain
  // root (local preview) or from a GitHub Pages project subpath such as
  // https://<user>.github.io/roguelike-collectathon-game/.
  base: "./",
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
