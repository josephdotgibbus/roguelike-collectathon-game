# Static assets

Drop images, audio, fonts, or any other static files here. Everything in this
`public/` folder is copied to the site root as-is at build time, so a file at
`public/sprites/player.png` is served at `sprites/player.png` and can be loaded
from code with a root-relative or relative URL, e.g.:

```ts
const img = new Image();
img.src = "sprites/player.png"; // resolves under the Pages subpath automatically
```

You can add files here directly from the GitHub web UI (Add file → Upload files)
without any local setup.
