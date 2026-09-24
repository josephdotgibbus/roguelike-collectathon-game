import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the built site works from the GitHub Pages project subpath
  // https://<user>.github.io/roguelike-collectathon-game/.
  base: "./",
  build: {
    rollupOptions: {
      // dev.html stays the Vite entry. The production index.html is generated
      // from this file so GitHub Pages can serve the repo root as-is.
      input: "dev.html",
    },
  },
  plugins: [
    {
      name: "serve-dev-html",
      apply: "serve",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const request = req as { url?: string };
          const url = request.url ?? "";
          if (url === "/" || url.startsWith("/index.html")) {
            request.url = "/dev.html";
          }
          next();
        });
      },
    },
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
