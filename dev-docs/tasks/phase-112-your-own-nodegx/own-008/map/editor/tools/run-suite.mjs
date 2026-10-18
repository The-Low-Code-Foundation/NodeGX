// The kit's editor-suite command, for an ES-module adapter on any Node version.
// node tools/run-suite.mjs <adapter.mjs> <project-dir> <edits.json>
//
// `editor-suite-node.js` loads the adapter with require(), which only loads an ES module on
// Node 22 and later. This does what its runCommand does — the same readProjectTree, runSuite,
// graph grader and formatReport from @nodegx/project-contract — but loads the adapter with import().
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readProjectTree, graphGraderFromNodeSpec } from '@nodegx/project-contract/editor-suite-node.js';
import { runSuite, formatReport } from '@nodegx/project-contract/editor-suite.js';

const [adapterPath, projectDir, editsPath] = process.argv.slice(2);
if (!adapterPath || !projectDir || !editsPath) {
  process.stderr.write('usage: run-suite <adapter.mjs> <project-dir> <edits.json>\n');
  process.exit(2);
}
const mod = await import(pathToFileURL(path.resolve(adapterPath)).href);
const candidate = mod.adapter ?? mod.default ?? mod;
const adapter = typeof candidate === 'function' ? candidate() : candidate;
const files = readProjectTree(projectDir);
const edits = JSON.parse(fs.readFileSync(editsPath, 'utf8'));
const report = await runSuite(adapter, { name: path.basename(path.resolve(projectDir)), files, edits }, { graph: graphGraderFromNodeSpec() });
process.stdout.write(formatReport(report) + '\n');
process.exit(report.pass ? 0 : 1);
