/**
 * P109 ISL-018 — the one-off settle Richard ruled on 2026-10-05 ("Agent writes 'ticked'", README §8 round 5): the
 * folder-format projects on this machine still at format 4, which the editor's one-time clean-up would change, get
 * `true` written on exactly the boxes the clean-up would write `false` on — the reading they were authored and driven
 * under (an absent key is a ticked box). s15's census: every such project was created after the checkbox shipped
 * (2026-08-01), so the clean-up's repair is wrong for all of them. Classic single-file projects are never touched:
 * they predate the checkbox, and there the clean-up is the intended repair.
 *
 *   npx ts-node --transpile-only scripts/isl018-settle-format4.ts            list what would change (default)
 *   npx ts-node --transpile-only scripts/isl018-settle-format4.ts --write    settle them
 *   … --root <dir>                                                          scan this folder instead of the defaults
 *
 * The version is left at 4: settling is not an upgrade, and an older editor still opens the project. The clean-up then
 * runs on the next open and writes nothing, because a present key is never touched.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { projectPredatesRunOnValueChange } from '../packages/nodegx-project-contract/run-on-value-change-migration';
import { planRunOnValueChangeMigration } from '../packages/noodl-editor/src/editor/src/models/ProjectPatches/runOnValueChangeMigration';
import { pinRunOnValueChangeDefaultsInDirectory, readAsLegacyProject } from '../packages/noodl-mcp/tests/templateArtefact';

const HOME = os.homedir();
const DEFAULT_ROOTS = [
  path.resolve(__dirname, '..'),
  path.join(HOME, 'vscode_projects', 'NodeGX test projects'),
  path.join(HOME, 'vscode_projects', 'Noodl projects'),
  path.join(HOME, 'vscode_projects', 'Erleah-2-react19'),
  path.join(HOME, 'vscode_projects', 'MAU chatbot-react19')
];
const SKIP = new Set(['node_modules', 'noodl_modules', '.git', 'dist', 'build', '.webpack-cache']);

function findProjects(root: string, out: string[], depth = 0): void {
  if (depth > 7 || !fs.existsSync(root)) return;
  if (fs.existsSync(path.join(root, 'nodegx.project.json')) && fs.existsSync(path.join(root, 'components', '_registry.json'))) {
    out.push(root);
    return;
  }
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) if (e.isDirectory() && !SKIP.has(e.name) && !e.name.startsWith('OpenNoodl-worktrees')) findProjects(path.join(root, e.name), out, depth + 1);
}

const args = process.argv.slice(2);
const write = args.includes('--write');
const rootAt = args.indexOf('--root');
const roots = rootAt === -1 ? DEFAULT_ROOTS : [path.resolve(args[rootAt + 1])];

const projects: string[] = [];
for (const r of roots) findProjects(r, projects);

const rows: { dir: string; version: unknown; writes: number }[] = [];
for (const dir of projects) {
  let version: unknown;
  try {
    version = JSON.parse(fs.readFileSync(path.join(dir, 'nodegx.project.json'), 'utf8')).version;
  } catch {
    continue;
  }
  if (!projectPredatesRunOnValueChange(version)) continue;
  let writes = 0;
  try {
    writes = planRunOnValueChangeMigration(readAsLegacyProject(dir) as never).writes.length;
  } catch (e) {
    console.log(`unreadable\t${dir}\t${(e as Error).message.split('\n')[0]}`);
    continue;
  }
  rows.push({ dir, version, writes });
}

const changing = rows.filter((r) => r.writes > 0);
console.log(JSON.stringify({ folderProjects: projects.length, belowFormat5: rows.length, wouldChange: changing.length, writes: changing.reduce((a, r) => a + r.writes, 0) }));
for (const r of changing) console.log(`${r.writes}\t${r.dir}`);
if (write) {
  for (const r of changing) {
    const { writes } = pinRunOnValueChangeDefaultsInDirectory(r.dir);
    const after = planRunOnValueChangeMigration(readAsLegacyProject(r.dir) as never).writes.length;
    console.log(`settled\t${writes}\tclean-up now writes ${after}\t${r.dir}`);
  }
}
