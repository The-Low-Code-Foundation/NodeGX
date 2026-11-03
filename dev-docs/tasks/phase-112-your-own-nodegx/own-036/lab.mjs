// OWN-036 AC5: four fresh `npm create nodegx` folders. Two get this checkout's kit (the two new skills and the note's
// game exception), two get the kit as it was at the commit before OWN-036 (b79ef0804^). Which letter is which is
// written to ARMS.json here, never into the lab, so an arm cannot read its own side from its path or its files.
//   node own-036/lab.mjs [--lab ~/vscode_projects/fp-lab] --old <extracted b79ef0804^ create-nodegx folder>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (name, dflt) => (argv.indexOf(name) >= 0 ? argv[argv.indexOf(name) + 1] : dflt);
const lab = path.resolve(opt('--lab', path.join(os.homedir(), 'vscode_projects/fp-lab')));
const old = opt('--old');
if (!old || !fs.existsSync(path.join(old, 'bin/create-nodegx.js'))) throw new Error('--old <folder with bin/create-nodegx.js>');
const kit = { new: path.join(here, '../../../../packages/create-nodegx/bin/create-nodegx.js'), old: path.join(old, 'bin/create-nodegx.js') };
// Fixed, not random, so a re-made lab keeps the same letters. a/c brief "app", b/d brief "game".
const arms = { a: { brief: 'app', kit: 'new' }, b: { brief: 'game', kit: 'old' }, c: { brief: 'app', kit: 'old' }, d: { brief: 'game', kit: 'new' } };
if (fs.existsSync(lab) && fs.readdirSync(lab).length) throw new Error(`${lab} is not empty; a lab is made once`);
for (const [letter, a] of Object.entries(arms)) {
  const dir = path.join(lab, letter, 'my-apps');
  const run = spawnSync(process.execPath, [kit[a.kit], dir], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`${letter}: ${run.stderr}`);
  // Each arm is its own git repository, so its history is readable afterwards (P130's labs did the same).
  spawnSync('git', ['init', '-q'], { cwd: dir });
  spawnSync('git', ['add', '-A'], { cwd: dir });
  spawnSync('git', ['-c', 'user.name=lab', '-c', 'user.email=lab@localhost', 'commit', '-qm', 'npm create nodegx'], { cwd: dir });
  const skills = fs.readdirSync(path.join(dir, '.claude/skills')).sort();
  console.log(`${letter}: ${a.brief}, ${a.kit} kit, skills ${skills.join(' ')}`);
}
fs.writeFileSync(path.join(here, 'ARMS.json'), JSON.stringify({ lab, made: new Date().toISOString(), arms }, null, 1) + '\n');
