import { cp, readFile, rm, writeFile } from "node:fs/promises";

// GitHub Pages is set to publish the main branch root. Copy the Vite build
// there: index.html plus hashed assets. Source entry stays in dev.html.
await rm("assets", { recursive: true, force: true });
await cp("dist/assets", "assets", { recursive: true });

const html = await readFile("dist/dev.html", "utf8");
await writeFile("index.html", html);
await writeFile(".nojekyll", "");
