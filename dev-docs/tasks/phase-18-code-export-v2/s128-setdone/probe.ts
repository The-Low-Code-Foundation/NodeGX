// Usage (from packages/nodegx-export): probe.ts <exportSrc> [steps…] — the Set Desk (tests/helpers/set-desk.ts) read by both
// arms, the runtime's own nodes (runtime-mounted-arm.js) and the export of <exportSrc> under StrictMode (export-react-arm.js,
// settled), press by press. Prints each arm's readings and the steps where they differ.
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
const [E, ...given] = process.argv.slice(2);
const steps = given.length > 0 ? given : ['Ready', 'Order', 'Play', 'Answer'];
const { writeSetDesk } = require(path.resolve('tests/helpers/set-desk'));
const { loadCatalog } = require(`${E}/catalog`);
const { emitApp } = require(`${E}/emit/emitApp`);
const { parseProject } = require(`${E}/parse/parseProject`);
const catalog = loadCatalog();
const { dir } = writeSetDesk();
const app = emitApp(parseProject(dir, catalog), catalog);
const appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'set-desk-app-'));
for (const [f, s] of Object.entries(app.files as Record<string, string>)) { fs.mkdirSync(path.dirname(path.join(appDir, f)), { recursive: true }); fs.writeFileSync(path.join(appDir, f), s); }
const arm = (helper: string, input: unknown): string[][] => {
  try {
    return JSON.parse(execFileSync(process.execPath, [path.resolve('tests/helpers', helper)], { input: JSON.stringify(input), encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 120000 }))[0][0];
  } catch (e) {
    return [[`${helper} threw: ${String((e as { stderr?: unknown }).stderr ?? e).slice(0, 400)}`]];
  }
};
const runtime = arm('runtime-mounted-arm.js', [{ dir, scenarios: [steps] }]);
const exported = arm('export-react-arm.js', [{ dir: appDir, scenarios: [steps], settled: true }]);
const labels = ['load', ...steps];
for (const [i, l] of labels.entries()) {
  console.log(`${l.padEnd(8)} runtime: ${(runtime[i] ?? ['-']).join(' · ')}`);
  console.log(`${''.padEnd(8)} export:  ${(exported[i] ?? ['-']).join(' · ')}${JSON.stringify(runtime[i]) === JSON.stringify(exported[i]) ? '' : '   <-- differs'}`);
}
console.log('desk', dir, 'app', appDir);
