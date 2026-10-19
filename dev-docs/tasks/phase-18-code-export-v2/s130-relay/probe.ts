// Usage (from packages/nodegx-export): probe.ts <exportSrc> [steps…] — the Relay Desk (tests/helpers/relay-desk.ts) read by
// both arms, the runtime's own nodes (runtime-mounted-arm.js, the viewer's own For Each) and the export of <exportSrc>
// under StrictMode (export-react-arm.js, settled), step by step. RUNTIME=0 / EXPORT=0 skip an arm; EDIT=<module> edits the desk first.
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
const [E, ...given] = process.argv.slice(2);
export const STEPS = ['Milk', 't2', 'Bread', 't1'];
const steps = given.length > 0 ? given : STEPS;
const { writeRelayDesk } = require(path.resolve('tests/helpers/relay-desk'));
const { loadCatalog } = require(`${E}/catalog`);
const { emitApp } = require(`${E}/emit/emitApp`);
const { parseProject } = require(`${E}/parse/parseProject`);
const catalog = loadCatalog();
const edit = process.env.EDIT ? require(path.resolve(process.env.EDIT)) : undefined;
const { dir } = writeRelayDesk(edit);
const app = emitApp(parseProject(dir, catalog), catalog);
const appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'relay-desk-app-'));
for (const [f, s] of Object.entries(app.files as Record<string, string>)) { fs.mkdirSync(path.dirname(path.join(appDir, f)), { recursive: true }); fs.writeFileSync(path.join(appDir, f), s); }
const arm = (helper: string, input: unknown): string[][] => {
  try {
    return JSON.parse(execFileSync(process.execPath, [path.resolve('tests/helpers', helper)], { input: JSON.stringify(input), encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 120000 }))[0][0];
  } catch (e) {
    return [[`${helper} threw: ${String((e as { stderr?: unknown }).stderr ?? e).slice(0, 900)}`]];
  }
};
const runtime = process.env.RUNTIME === '0' ? [] : arm('runtime-mounted-arm.js', [{ dir, scenarios: [steps] }]);
const exported = process.env.EXPORT === '0' ? [] : arm('export-react-arm.js', [{ dir: appDir, scenarios: [steps], settled: true }]);
const labels = ['load', ...steps];
for (const [i, l] of labels.entries()) {
  console.log(`${l.padEnd(10)} runtime: ${(runtime[i] ?? ['-']).join(' · ')}`);
  console.log(`${''.padEnd(10)} export:  ${(exported[i] ?? ['-']).join(' · ')}${JSON.stringify(runtime[i]) === JSON.stringify(exported[i]) ? '' : '   <-- differs'}`);
}
console.log('desk', dir, 'app', appDir);
