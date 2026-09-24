import { cp, readFile, rm, writeFile } from "node:fs/promises";

// GitHub Pages publishes the main branch root. Copy the Vite build there.
await rm("assets", { recursive: true, force: true });
await cp("dist/assets", "assets", { recursive: true });

const html = await readFile("dist/dev.html", "utf8");
await writeFile("index.html", html);
await writeFile(".nojekyll", "");
