// A static copy of the game that runs from any folder of a plain file server (nodegx.io/threadspace/):
//   node tools/build-static.mjs <out-dir>
// What differs from `npm start`: every root path (/src/, /vendor/, /ships/, /shipyard.html) is made relative, only the
// three.js files the game imports are copied, and each page is marked <html data-static>, so the shipyard keeps a saved
// design in the browser instead of posting it to server.mjs (src/models/store.mjs). Each rewrite names how many times it
// must match; a count that moved means the game changed under this script, and the build stops instead of shipping a
// broken path.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2];
if (!out) {
  console.error('usage: node tools/build-static.mjs <out-dir>');
  process.exit(2);
}
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(path.join(here, 'public'), out, { recursive: true });

const three = path.join(here, 'node_modules/three');
for (const [from, to] of [
  ['build/three.module.js', 'vendor/three/three.module.js'],
  ['build/three.core.js', 'vendor/three/three.core.js'],
  ['examples/jsm/controls/OrbitControls.js', 'vendor/three-addons/controls/OrbitControls.js'],
  ['examples/jsm/utils/BufferGeometryUtils.js', 'vendor/three-addons/utils/BufferGeometryUtils.js']
]) {
  fs.mkdirSync(path.dirname(path.join(out, to)), { recursive: true });
  fs.copyFileSync(path.join(three, from), path.join(out, to));
}

function rewrite(file, pairs) {
  const p = path.join(out, file);
  let s = fs.readFileSync(p, 'utf8');
  for (const [a, b, n] of pairs) {
    const seen = s.split(a).length - 1;
    if (seen !== n) throw new Error(`${file}: expected ${n} × ${JSON.stringify(a)}, found ${seen}`);
    s = s.split(a).join(b);
  }
  fs.writeFileSync(p, s);
}
const page = [
  ['<html lang="en">', '<html lang="en" data-static>', 1],
  ['href="/style.css"', 'href="style.css"', 1],
  ['"/vendor/', '"./vendor/', 2]
];
rewrite('index.html', [...page, ['src="/src/', 'src="./src/', 1]]);
rewrite('shipyard.html', [...page, ['href="/shipyard.css"', 'href="shipyard.css"', 1], ['src="/src/', 'src="./src/', 1], ['href="/"', 'href="./"', 1]]);
rewrite('src/main.mjs', [["'/shipyard.html'", "'shipyard.html'", 1]]);
rewrite('src/panel.mjs', [["'/shipyard.html'", "'shipyard.html'", 2]]);
rewrite('src/models/store.mjs', [['`/ships/', '`ships/', 1]]);

// Nothing absolute may be left: a root path on nodegx.io is another site's page.
const left = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(html|mjs|css)$/.test(e.name)) {
      const hits = fs.readFileSync(p, 'utf8').match(/["'`(]\/(src|vendor|ships|shipyard|style|api)\b[^"'`)]*/g);
      if (hits) left.push(`${path.relative(out, p)}: ${hits.join(', ')}`);
    }
  }
})(out);
const allowed = left.filter((l) => !/^src[\\/]models[\\/]store\.mjs: [`'"(]\/api\/design\//.test(l));
if (allowed.length) throw new Error(`root paths left in the static copy:\n${allowed.join('\n')}`);
console.log(`built ${out}`);
