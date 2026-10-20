// Usage (from packages/nodegx-export): probe.ts <exportSrc> [steps…] — the Field Desk (tests/helpers/field-desk.ts) read by
// both arms with their `fields` reading, the runtime's own nodes (runtime-mounted-arm.js) and the export of <exportSrc>
// under StrictMode (export-react-arm.js, settled), step by step. Prints each arm's readings and the steps where they
// differ. RUNTIME=0 skips the runtime arm; EDIT=<module> edits the desk first.
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
const [E, ...given] = process.argv.slice(2);
export const STEPS = ['Fill', 'type:name:Zed', 'Reset', 'Wipe', 'Focus', 'Reset', 'Blur', 'Focus title', 'enter:title', 'Form fill', 'type:form:Dee', 'Form fill', 'Form focus'];
const steps = given.length > 0 ? given : STEPS;
const { writeFieldDesk } = require(path.resolve('tests/helpers/field-desk'));
const { loadCatalog } = require(`${E}/catalog`);
const { emitApp } = require(`${E}/emit/emitApp`);
const { parseProject } = require(`${E}/parse/parseProject`);
const catalog = loadCatalog();
// EDIT=<file.js> exporting `(desk) => void` edits the desk first (a variant).
const edit = process.env.EDIT ? require(path.resolve(process.env.EDIT)) : undefined;
const { dir } = writeFieldDesk(edit);
const app = emitApp(parseProject(dir, catalog), catalog);
const appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'field-desk-app-'));
for (const [f, s] of Object.entries(app.files as Record<string, string>)) { fs.mkdirSync(path.dirname(path.join(appDir, f)), { recursive: true }); fs.writeFileSync(path.join(appDir, f), s); }
const arm = (helper: string, input: unknown): string[][] => {
  try {
    return JSON.parse(execFileSync(process.execPath, [path.resolve('tests/helpers', helper)], { input: JSON.stringify(input), encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 120000 }))[0][0];
  } catch (e) {
    return [[`${helper} threw: ${String((e as { stderr?: unknown }).stderr ?? e).slice(0, 600)}`]];
  }
};
const runtime = process.env.RUNTIME === '0' ? [] : arm('runtime-mounted-arm.js', [{ dir, scenarios: [steps], fields: true }]);
const exported = arm('export-react-arm.js', [{ dir: appDir, scenarios: [steps], settled: true, fields: true }]);
const labels = ['load', ...steps];
for (const [i, l] of labels.entries()) {
  console.log(`${l.padEnd(14)} runtime: ${(runtime[i] ?? ['-']).join(' · ')}`);
  console.log(`${''.padEnd(14)} export:  ${(exported[i] ?? ['-']).join(' · ')}${JSON.stringify(runtime[i]) === JSON.stringify(exported[i]) ? '' : '   <-- differs'}`);
}
console.log('desk', dir, 'app', appDir);
