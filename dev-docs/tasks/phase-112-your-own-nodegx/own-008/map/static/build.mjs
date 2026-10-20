#!/usr/bin/env node
// The map editor (round 4, "the Star Wars editor") as a static folder, to put on any web server at any path —
// nodegx.io/map/ is this. The stranger's `../editor/` is copied, never changed: its page is served as it is,
// its root-absolute URLs are made relative, the Open… button is hidden, and `api.js` (api-entry.mjs) answers
// the `/api/*` calls `server.mjs` would, on one project in memory. Nothing a visitor does is written anywhere.
//
//   node build.mjs --kit <dir> --out <dir> [--project <app folder>]
//
//   --kit      a folder holding the editor's node_modules: `npm ci --omit=dev` of ../editor/package*.json.
//              three, the canvas look, the in-page preview and its production runtime come from there.
//   --project  the app the page opens (default: the repo's templates/todo-list).
//
// The node ports and the type list are bundled from the repo's packages/nodegx-node-spec source, so the page
// draws every node the specs know today, not the 0.1.0 on npm the stranger built with.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..', '..', '..', '..');
const editor = join(here, '..', 'editor');
const flag = (name) => {
  const at = process.argv.indexOf(name);
  return at === -1 ? undefined : process.argv[at + 1];
};
const kit = flag('--kit');
const out = flag('--out');
const project = flag('--project') ?? join(repo, 'templates', 'todo-list');
if (!kit || !out) {
  console.error('usage: node build.mjs --kit <dir with the editor\'s node_modules> --out <dir> [--project <app folder>]');
  process.exit(2);
}
const mods = join(kit, 'node_modules');
const runtime = join(mods, '@nodegx/preview/dist/external/deploy');
for (const [what, at] of [
  ['three', join(mods, 'three/build/three.module.js')],
  ['the canvas look', join(mods, '@nodegx/canvas-look/dist/index.mjs')],
  ['the in-page preview', join(mods, '@nodegx/preview/dist/browser/noodl-preview-in-page.js')],
  ['the runtime', join(runtime, 'noodl.deploy.js')],
  ['the project', join(project, 'nodegx.project.json')]
]) {
  if (!existsSync(at)) {
    console.error(`build: no ${what} at ${at}`);
    process.exit(2);
  }
}
if (statSync(join(runtime, 'noodl.deploy.js')).size > 5e6) {
  console.error('build: the runtime is a development build; a public copy needs the production one');
  process.exit(2);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// The page and its modules. A root-absolute URL ('/ships.mjs', '/api/ports', '/kit/…') would point at the site's
// root, so each becomes relative to the page; the check below refuses any the pattern missed.
const relativise = (text) => text.replace(/(['"`(])\/(?=(?:api|core|kit|runtime|music|vendor)\/|[\w-]+\.(?:mjs|css)\b)/g, '$1./');
for (const name of readdirSync(join(editor, 'public'))) {
  let text = readFileSync(join(editor, 'public', name), 'utf8');
  text = relativise(text);
  if (name === 'app.mjs') {
    // mountPreview reads runtimeBase as a URL; './runtime/' alone is resolved against the preview's frame.
    text = text.replace("runtimeBase: './runtime/'", "runtimeBase: new URL('runtime/', document.baseURI).href");
  }
  if (name === 'index.html') {
    text = text.replace('<script type="module" src="./app.mjs"></script>', '<script type="module" src="./api.js"></script>\n    <script type="module" src="./app.mjs"></script>');
    text = text.replace('<button id="btn-open"', '<button id="btn-open" hidden');
    text = text.replace(/ Put a track of your own in editor\/music\/ to hear it instead\./, '');
  }
  writeFileSync(join(out, name), text);
}
mkdirSync(join(out, 'core'));
for (const name of readdirSync(join(editor, 'core'))) {
  if (name !== 'commit.mjs') writeFileSync(join(out, 'core', name), relativise(readFileSync(join(editor, 'core', name), 'utf8')));
}
for (const file of [...readdirSync(out).filter((n) => /\.(mjs|html|css)$/.test(n)).map((n) => join(out, n)), ...readdirSync(join(out, 'core')).map((n) => join(out, 'core', n))]) {
  const left = readFileSync(file, 'utf8').match(/['"`(]\/(?:api|core|kit|runtime|music|vendor|[\w-]+\.(?:mjs|css))\b/g);
  if (left) {
    console.error(`build: ${relative(out, file)} still has root-absolute URLs: ${left.join(', ')}`);
    process.exit(1);
  }
}
if (!readFileSync(join(out, 'app.mjs'), 'utf8').includes("runtimeBase: new URL('runtime/'")) {
  console.error('build: the preview\'s runtimeBase was not rewritten');
  process.exit(1);
}

// What server.mjs serves from node_modules.
mkdirSync(join(out, 'vendor/three-addons/utils'), { recursive: true });
mkdirSync(join(out, 'vendor/three-addons/geometries'), { recursive: true });
cpSync(join(mods, 'three/build'), join(out, 'vendor/three'), { recursive: true, filter: (p) => !p.endsWith('.cjs') && !p.includes('.webgpu') && !p.includes('.tsl') });
for (const rel of ['utils/BufferGeometryUtils.js', 'geometries/RoundedBoxGeometry.js']) cpSync(join(mods, 'three/examples/jsm', rel), join(out, 'vendor/three-addons', rel));
cpSync(join(mods, '@nodegx/canvas-look/dist'), join(out, 'kit/canvas-look'), { recursive: true });
mkdirSync(join(out, 'kit/preview'), { recursive: true });
cpSync(join(mods, '@nodegx/preview/dist/browser/noodl-preview-in-page.js'), join(out, 'kit/preview/noodl-preview-in-page.js'));
cpSync(runtime, join(out, 'runtime'), { recursive: true });

// The project, as server.mjs's projectTree reads it.
const tree = {};
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const abs = join(dir, e.name);
    if (e.isDirectory()) walk(abs);
    else if (/\.(json|md|css|js|txt|svg)$/i.test(e.name)) tree[relative(project, abs).split(sep).join('/')] = readFileSync(abs, 'utf8');
  }
};
walk(project);
writeFileSync(join(out, 'project.json'), JSON.stringify(tree));

// The in-page server.
const esbuild = join(repo, 'node_modules/.bin/esbuild');
execFileSync(esbuild, [
  join(here, 'api-entry.mjs'), '--bundle', '--format=esm', '--platform=browser', '--minify', `--outfile=${join(out, 'api.js')}`, '--log-level=error',
  `--alias:@nodegx/node-spec=${join(repo, 'packages/nodegx-node-spec/src/browser.ts')}`,
  `--alias:@nodegx/project-contract=${join(mods, '@nodegx/project-contract')}`
], { stdio: 'inherit' });

let bytes = 0;
const count = (p) => (statSync(p).isDirectory() ? readdirSync(p).forEach((n) => count(join(p, n))) : (bytes += statSync(p).size));
count(out);
console.log(`build: wrote ${out} (${(bytes / 1e6).toFixed(1)} MB; ${Object.keys(tree).length} project files from ${project})`);
