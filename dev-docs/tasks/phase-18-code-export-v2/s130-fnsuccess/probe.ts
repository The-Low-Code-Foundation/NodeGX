// Usage (from packages/nodegx-export): probe.ts <exportSrc> [steps…] — the Success Desk (tests/helpers/success-desk.ts) read
// by both arms with their `fields` reading, the runtime's own nodes (runtime-mounted-arm.js) and the export of <exportSrc>
// under StrictMode (export-react-arm.js, settled), step by step. Prints each arm's readings and the steps where they
// differ. RUNTIME=0 skips the runtime arm; EXPORT=0 the export arm; EDIT=<module> edits the desk first.
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
const [E, ...given] = process.argv.slice(2);
export const STEPS = ['Say', 'Bob', 'Say', 'Show', 'Pick b', 'Pick b', 'Pick c and show', 'Edit'];
const steps = given.length > 0 ? given : STEPS;
const { writeSuccessDesk } = require(path.resolve('tests/helpers/success-desk'));
const { loadCatalog } = require(`${E}/catalog`);
const { emitApp } = require(`${E}/emit/emitApp`);
const { parseProject } = require(`${E}/parse/parseProject`);
const catalog = loadCatalog();
const edit = process.env.EDIT ? require(path.resolve(process.env.EDIT)) : undefined;
const { dir } = writeSuccessDesk(edit);
const app = emitApp(parseProject(dir, catalog), catalog);
const appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'success-desk-app-'));
for (const [f, s] of Object.entries(app.files as Record<string, string>)) { fs.mkdirSync(path.dirname(path.join(appDir, f)), { recursive: true }); fs.writeFileSync(path.join(appDir, f), s); }
const arm = (helper: string, input: unknown): string[][] => {
  try {
    return JSON.parse(execFileSync(process.execPath, [path.resolve('tests/helpers', helper)], { input: JSON.stringify(input), encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 120000 }))[0][0];
  } catch (e) {
    return [[`${helper} threw: ${String((e as { stderr?: unknown }).stderr ?? e).slice(0, 600)}`]];
  }
};
const runtime = process.env.RUNTIME === '0' ? [] : arm('runtime-mounted-arm.js', [{ dir, scenarios: [steps], fields: true }]);
const exported = process.env.EXPORT === '0' ? [] : arm('export-react-arm.js', [{ dir: appDir, scenarios: [steps], settled: true, fields: true }]);
const labels = ['load', ...steps];
for (const [i, l] of labels.entries()) {
  console.log(`${l.padEnd(16)} runtime: ${(runtime[i] ?? ['-']).join(' · ')}`);
  console.log(`${''.padEnd(16)} export:  ${(exported[i] ?? ['-']).join(' · ')}${JSON.stringify(runtime[i]) === JSON.stringify(exported[i]) ? '' : '   <-- differs'}`);
}
console.log('desk', dir, 'app', appDir);
