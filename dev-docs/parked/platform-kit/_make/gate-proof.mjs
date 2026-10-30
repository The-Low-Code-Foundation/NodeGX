// Proves every gate can fire: for each gate, a copy of the fixture broken in one way that gate exists to refuse, and
// tools/check.mjs --only <gate> must exit 1 on it; the unbroken copy must exit 0 (the control). A gate that never
// goes red is prose. Copies go to a temporary folder (each its own git repository, for gate 6).
//   node _make/gate-proof.mjs [--only 1,7]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const kit = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = path.join(kit, '_make/fixture');
const args = process.argv.slice(2);
const only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1].split(',').map(Number)) : null;

const append = (file, text) => (dir) => fs.appendFileSync(path.join(dir, file), text);
const replace = (file, a, b) => (dir) => {
  const f = path.join(dir, file), s = fs.readFileSync(f, 'utf8');
  if (!s.includes(a)) throw new Error(`${file} has no "${a}"`);
  fs.writeFileSync(f, s.replace(a, b));
};
const write = (file, text) => (dir) => (fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true }), fs.writeFileSync(path.join(dir, file), text));
const git = (dir, ...a) => execFileSync('git', ['-C', dir, ...a], { stdio: 'ignore' });
const commitAll = (dir) => (git(dir, 'add', '-A'), git(dir, '-c', 'user.name=proof', '-c', 'user.email=proof@example.invalid', 'commit', '-qm', 'the first build'));

// [gate, what is broken, how; expect red (true) or green (false, a control)]
const CASES = [
  [0, 'nothing (the control: every gate green)', () => {}, false],
  [1, 'a number chosen by eye, no knob, no reason', append('src/life.mjs', '\nexport const PANIC = 3.7;\n'), true],
  [2, 'a mesh in the scene outside any part', replace('src/main.mjs', 'expose({ scene, camera, renderer });', 'scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));\nexpose({ scene, camera, renderer });'), true],
  [3, 'no model registered', replace('src/main.mjs', 'expose({ scene, camera, renderer });', 'registry.models.clear();\nexpose({ scene, camera, renderer });'), true],
  [4, 'a design file the game cannot hold (a width past its range)', write('design/knobs/room.json', JSON.stringify({ values: { width: 99 } })), true],
  [5, 'a value kept in the browser', append('src/main.mjs', "\nlocalStorage.setItem('room', JSON.stringify(R.$.changes()));\n"), true],
  [6, 'a new place that changes the engine (after the first build is committed)', (dir) => {
    commitAll(dir);
    write('places/lighthouse.mjs', fs.readFileSync(path.join(fixture, 'places/two-rooms.mjs'), 'utf8').replaceAll('two-rooms', 'lighthouse').replace("knobs('lighthouse'", "knobs('lighthouse'"))(dir);
    append('src/engine/view.mjs', '\n// the lighthouse needed this\n')(dir);
  }, true],
  [6, 'a new place alone (the control: the engine untouched)', (dir) => {
    commitAll(dir);
    write('places/lighthouse.mjs', '// a level\n')(dir);
  }, false],
  [7, 'an editor nobody asked for', write('editors/lamps.mjs', '// a panel for the lamps\n'), true],
  [7, 'an editor the owner asked to keep (the control)', (dir) => {
    write('editors/lamps.mjs', '// a panel for the lamps\n')(dir);
    write('RECORD.md', '# Record\n\nkeep: lamps — "keep the lamp thing, I like it"\n')(dir);
  }, false],
  [8, 'a knob nothing reads', replace('src/room.mjs', "  wallThickness:", "  shine: num(1, [0, 2], '', 'Shine'),\n  wallThickness:"), true],
  [9, 'a place with no drive', write('places/roof.mjs', "import { place } from '../kit/index.mjs';\nimport * as THREE from 'three';\nexport default place('roof', { build: () => new THREE.Group() });\n"), true],
  [9, 'a place whose drive fails', write('tests/two-rooms.json', JSON.stringify([{ waitFor: 'window.__play && __play.ready' }, { eval: '__fixture.crowd.count', expect: 'r => r === 999', label: 'impossible' }])), true],
  [10, 'words a player reads, written into the code', replace('src/main.mjs', "hud.textContent = say('title');", "hud.textContent = 'Welcome to the tower';"), true]
];

let wrong = 0;
for (const [n, what, breakIt, red] of CASES) {
  if (only && !only.has(n)) continue;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `gate-${n}-`));
  fs.cpSync(fixture, dir, { recursive: true });
  git(dir, 'init', '-q');
  breakIt(dir);
  const r = spawnSync(process.execPath, [path.join(kit, 'tools/check.mjs'), '--root', dir, ...(n ? ['--only', String(n)] : [])], { encoding: 'utf8' });
  // Red means this gate's own FAIL line, not just exit 1 (a crash exits 1 too: 2026-10-30, three "reds" were one).
  const own = n ? new RegExp(`^FAIL\\s+${n} `, 'm').test(r.stdout) : /^FAIL/m.test(r.stdout);
  const ok = red ? r.status === 1 && own : r.status === 0 && !/^FAIL/m.test(r.stdout);
  if (!ok) wrong++;
  const says = r.stdout.split('\n').filter((l) => /^(FAIL|\s{8})/.test(l)).slice(0, 3).map((l) => l.trim()).join(' | ');
  console.log(`${ok ? 'PASS' : 'FAIL'}  gate ${String(n || 'all').padStart(3)}: ${what} → ${r.status === 1 ? 'red' : r.status === 0 ? 'green' : `exit ${r.status}`}${says ? `  [${says.slice(0, 220)}]` : ''}`);
  if (!ok || !says) console.log(r.stdout.slice(-1500), r.stderr.slice(-800));
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log(wrong ? `\n${wrong} wrong` : '\nevery gate fires on its breakage, and stays green on its control');
process.exit(wrong ? 1 : 0);
