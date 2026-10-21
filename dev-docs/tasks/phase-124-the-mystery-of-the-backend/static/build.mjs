#!/usr/bin/env node
// The backend map as a static folder, for any web server at any path (nodegx.io/backend-map/ is this).
// The editor's page is copied as it is; `recorded.js` answers its /api/* calls from a recording made by
// record.mjs. The editor's server is never public: it holds the backend's admin credential.
//
//   node build.mjs --data <recording> --out <dir> [--home <url>]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const flag = (name) => {
  const at = process.argv.indexOf(name);
  return at === -1 ? undefined : process.argv[at + 1];
};
const data = flag('--data');
const out = flag('--out');
const home = flag('--home') ?? '/your-own-editor/#backend';
if (!data || !out || !fs.existsSync(path.join(data, 'recorded.json'))) {
  console.error('usage: node build.mjs --data <a recording from record.mjs> --out <dir> [--home <url>]');
  process.exit(2);
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.cpSync(path.join(here, '..', 'editor', 'public'), out, { recursive: true });
fs.cpSync(data, path.join(out, 'data'), { recursive: true });
fs.copyFileSync(path.join(here, 'recorded.js'), path.join(out, 'recorded.js'));

const index = path.join(out, 'index.html');
let html = fs.readFileSync(index, 'utf8');
const module = '<script type="module" src="app.js"></script>';
if (!html.includes(module)) throw new Error('build: the page no longer loads app.js the way this build expects');
html = html
  .replace(module, `<script src="recorded.js"></script>\n  ${module}`)
  .replace('<title>Backend map</title>', '<title>Backend map · NodeGX</title>\n  <meta name="description" content="The backend of a real NodeGX app as a map: who can reach which rows, measured by running its functions as each person.">')
  .replace('<input id="search"', `<a class="home" href="${home}" title="Back to nodegx.io">nodegx.io</a>\n    <input id="search"`);
fs.writeFileSync(index, html);
fs.appendFileSync(path.join(out, 'style.css'), '\n/* the public copy */\n#top .home { font-size: 12.5px; color: var(--dim); text-decoration: none; white-space: nowrap; }\n#top .home:hover { color: var(--text); }\n@media (max-width: 1640px) { #search { display: none; } }\n');

// The recording must hold no admin credential, key secret or local path.
const leaks = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else {
      const t = fs.readFileSync(p, 'utf8');
      if (/ngxk_|\/Users\/|\/private\/tmp|127\.0\.0\.1|Bearer /.test(t)) leaks.push(path.relative(out, p));
    }
  }
};
walk(out);
if (leaks.length) {
  console.error(`build: refusing, these files hold a secret, a local path or a local address: ${leaks.join(', ')}`);
  fs.rmSync(out, { recursive: true, force: true });
  process.exit(1);
}
const size = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
console.log(`built ${out}: ${(size(out) / 1e6).toFixed(2)} MB, recording of ${JSON.parse(fs.readFileSync(path.join(data, 'recorded.json'), 'utf8')).recordedAt}`);
