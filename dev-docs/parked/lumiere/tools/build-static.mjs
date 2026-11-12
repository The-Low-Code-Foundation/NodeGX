// Builds the game as a static folder that works under any path (nodegx.io/lab/lumiere/): public/ as it is, less the
// lab pages and the full-size VRM, plus ONLY the three.js / three-vrm files the game imports (followed import by
// import), with the import map made relative. The life sim's tools/build-static.mjs, for this game.
//   node tools/build-static.mjs <out-dir>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] ?? path.join(root, '.static'));
const nm = path.join(root, 'node_modules');
if (!fs.existsSync(path.join(root, 'public/assets/vrm/sample-slim.vrm'))) throw new Error('no assets: run `node tools/fetch-assets.mjs` first');

fs.rmSync(out, { recursive: true, force: true });
// The game loads the slimmed VRM; the 10 MB original stays home (slim-vrm.mjs reads it). The lab pages are for building.
const SKIP = [path.join(root, 'public/assets/vrm/VRM1_Constraint_Twist_Sample.vrm'), path.join(root, 'public/lab')];
fs.cpSync(path.join(root, 'public'), out, { recursive: true, filter: (src) => !SKIP.includes(src) });

// Vendor mounts, as server.mjs serves them.
const MOUNTS = {
  'vendor/three/': path.join(nm, 'three/build'),
  'vendor/three-addons/': path.join(nm, 'three/examples/jsm'),
  'vendor/three-vrm/': path.join(nm, '@pixiv/three-vrm/lib')
};
const copied = new Set();
function copyWithImports(mount, rel) {
  const key = mount + rel;
  if (copied.has(key)) return;
  copied.add(key);
  const src = path.join(MOUNTS[mount], rel);
  const dest = path.join(out, mount, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  // Relative imports inside the vendored file come along too; bare "three" resolves through the import map.
  const text = fs.readFileSync(src, 'utf8');
  for (const m of text.matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
    copyWithImports(mount, path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[1])));
  }
}
copyWithImports('vendor/three/', 'three.module.js');
copyWithImports('vendor/three-vrm/', 'three-vrm.module.js');
// The game's addon imports: read them from the source rather than listing them twice.
for (const file of fs.readdirSync(path.join(root, 'public/src'), { recursive: true }).filter((f) => f.endsWith('.mjs'))) {
  const text = fs.readFileSync(path.join(root, 'public/src', file), 'utf8');
  for (const m of text.matchAll(/from\s+['"]three\/addons\/([^'"]+)['"]/g)) copyWithImports('vendor/three-addons/', m[1]);
}
fs.copyFileSync(path.join(nm, 'three/LICENSE'), path.join(out, 'vendor/three/LICENSE'));
fs.copyFileSync(path.join(nm, '@pixiv/three-vrm/LICENSE'), path.join(out, 'vendor/three-vrm/LICENSE'));

// The import map points at /vendor/ for the dev server; a folder under any path needs ./vendor/. Not for search engines.
const html = path.join(out, 'index.html');
const page = fs.readFileSync(html, 'utf8');
if (!page.includes('"/vendor/')) throw new Error('index.html: no "/vendor/ import map to make relative');
let built = page.replaceAll('"/vendor/', '"./vendor/');
if (!/<meta name="robots"/.test(built)) built = built.replace('<meta charset="utf-8" />', '<meta charset="utf-8" />\n    <meta name="robots" content="noindex, nofollow" />');
fs.writeFileSync(html, built);

let bytes = 0, files = 0;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : ((bytes += fs.statSync(path.join(d, e.name)).size), files++)));
walk(out);
console.log(`${out}: ${files} files, ${(bytes / 1048576).toFixed(1)} MB (${copied.size} vendored modules)`);
