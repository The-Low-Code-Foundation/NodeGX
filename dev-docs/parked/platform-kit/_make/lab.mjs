// Makes the two lab folders of THE-TEST.md §2 (ruled: ~/vscode_projects/platform-lab/A and /B):
//   A: the packed kit (pack.mjs) and the brief.
//   B: bare: three.js, the drive tool, the same twelve people as plain GLBs (their real-3D models, clips inside), the
//      same brief. No kit, no gates, no note.
// Each is a git repository with one commit ("the starting folder"), so gate 6 and the measures have a base. Refuses a
// folder that is not empty: a lab with a game in it is never overwritten.
//   node _make/lab.mjs [~/vscode_projects/platform-lab]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const kit = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lab = path.resolve(process.argv[2] ?? path.join(os.homedir(), 'vscode_projects/platform-lab'));
const A = path.join(lab, 'A'), B = path.join(lab, 'B');
for (const d of [A, B]) if (fs.existsSync(d) && fs.readdirSync(d).length) throw new Error(`${d} is not empty: remove it by hand if it holds nothing worth keeping`);
const brief = path.join(kit, '_make/BRIEF-FOR-THE-LAB.md');

execFileSync(process.execPath, [path.join(kit, '_make/pack.mjs'), A], { stdio: 'inherit' });
fs.copyFileSync(brief, path.join(A, 'BRIEF.md'));

fs.mkdirSync(path.join(B, 'tools'), { recursive: true });
fs.cpSync(path.join(kit, 'vendor'), path.join(B, 'vendor'), { recursive: true });
fs.copyFileSync(path.join(kit, 'tools/drive.mjs'), path.join(B, 'tools/drive.mjs'));
fs.cpSync(path.join(kit, 'assets/people/party'), path.join(B, 'assets/people'), { recursive: true });
fs.copyFileSync(path.join(kit, 'assets/people/LICENSE.md'), path.join(B, 'assets/people/LICENSE.md'));
fs.copyFileSync(brief, path.join(B, 'BRIEF.md'));
fs.writeFileSync(path.join(B, '.gitignore'), 'shots/\n.chrome-profile-*\n');

for (const d of [A, B]) {
  const git = (...a) => execFileSync('git', ['-C', d, ...a], { stdio: 'ignore' });
  git('init', '-q');
  git('add', '-A');
  git('-c', 'user.name=Platform lab', '-c', 'user.email=lab@example.invalid', 'commit', '-qm', 'the starting folder');
  console.log(`${d}: ${execFileSync('git', ['-C', d, 'ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean).length} files committed`);
}
