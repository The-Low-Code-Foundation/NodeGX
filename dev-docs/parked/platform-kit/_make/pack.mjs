// Packs the kit into a folder a stranger builds a game in (THE-TEST.md §2, arm A): the kit, the tools, three.js, the
// people, the note (CLAUDE.md), an empty RECORD.md and LOOK.md, and the fixture as examples/two-rooms. Nothing else
// from this repository: not _make/, not the README, not the probe. Refuses a folder that is not empty.
//   node _make/pack.mjs ~/vscode_projects/platform-lab/A
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const kit = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('usage: node _make/pack.mjs <empty folder>');
if (fs.existsSync(dest) && fs.readdirSync(dest).length) throw new Error(`${dest} is not empty`);
for (const need of ['vendor/three/three.module.js', 'assets/people/index.json'])
  if (!fs.existsSync(path.join(kit, need))) throw new Error(`no ${need}: run node _make/make.mjs first`);
fs.mkdirSync(dest, { recursive: true });
const copy = (from, to = from, filter) => fs.cpSync(path.join(kit, from), path.join(dest, to), { recursive: true, filter });
for (const d of ['kit', 'tools', 'vendor']) copy(d);
copy('assets/people');
for (const f of ['CLAUDE.md', 'RECORD.md', 'LOOK.md']) copy(f);
copy('_make/fixture', 'examples/two-rooms', (f) => !/\/(design|shots)(\/|$)/.test(f));
fs.writeFileSync(path.join(dest, '.gitignore'), 'shots/\n.chrome-profile-*\n');
let files = 0, bytes = 0;
const count = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? count(path.join(d, e.name)) : (files++, (bytes += fs.statSync(path.join(d, e.name)).size))));
count(dest);
console.log(`packed ${files} files, ${(bytes / 1048576).toFixed(1)} MB → ${dest}`);
