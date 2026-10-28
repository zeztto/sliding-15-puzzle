import { cp, mkdir, rm } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of ['index.html', 'main.js', 'ui.js', 'controller.js', 'puzzle.js', 'style.css']) {
  await cp(new URL(`src/${file}`, root), new URL(file, dist));
}
console.log('Production files built.');
