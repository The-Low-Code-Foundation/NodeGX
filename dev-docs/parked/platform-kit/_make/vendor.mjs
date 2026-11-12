// Copies three.js (0.186.1, MIT, the version Life Sim pins) into vendor/three/: the two module files, every addon
// under addons/, and the licence. The kit and the game import it through the page's import map ('three',
// 'three/addons/'). Safe to re-run.
//   node _make/vendor.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const kit = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const three = path.join(kit, '../lifesim/node_modules/three');
const version = JSON.parse(fs.readFileSync(path.join(three, 'package.json'), 'utf8')).version;
const out = path.join(kit, 'vendor/three');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of ['three.module.js', 'three.core.js']) fs.copyFileSync(path.join(three, 'build', f), path.join(out, f));
fs.cpSync(path.join(three, 'examples/jsm'), path.join(out, 'addons'), { recursive: true });
fs.copyFileSync(path.join(three, 'LICENSE'), path.join(out, 'LICENSE'));
fs.writeFileSync(path.join(out, 'VERSION'), `${version}\n`);
console.log(`three ${version} → vendor/three/`);
