// Runs the map's save checks and the kit's structural validator over a project, writing nothing.
// node tools/check.mjs <project-dir>
import fs from 'node:fs';
import path from 'node:path';
import { diskFiles } from '@nodegx/project-contract/format-node.js';
import { validateStructure } from '@nodegx/project-contract/editor-suite.js';
import { V2ProjectStore, readProject, validateComponentFiles } from '../core/commit.mjs';

const dir = path.resolve(process.argv[2]);
const store = new V2ProjectStore(diskFiles(dir));
let problems = 0;
for (const c of readProject(store)) {
  for (const p of validateComponentFiles(c.key, c.files)) {
    problems++;
    console.log(p);
  }
}
const tree = {};
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const abs = path.join(d, e.name);
    if (e.isDirectory()) walk(abs);
    else if (e.name.endsWith('.json')) tree[path.relative(dir, abs).split(path.sep).join('/')] = fs.readFileSync(abs, 'utf8');
  }
};
walk(dir);
const structural = validateStructure(tree);
for (const s of structural) console.log('structural:', s);
console.log(`${problems} map check problem(s), ${structural.length} structural problem(s)`);
