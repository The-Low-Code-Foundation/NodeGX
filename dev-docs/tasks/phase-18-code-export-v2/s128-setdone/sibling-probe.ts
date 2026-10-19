// Usage (from packages/nodegx-export): sibling-probe.ts <exportSrc> [steps…] — P18-S127-SIBLINGVALUE's shape, the Sibling
// Desk (tests/helpers/sibling-desk.ts), on both arms: the runtime's own nodes (runtime-mounted-arm.js) and the export of
// <exportSrc> under StrictMode (export-react-arm.js, settled), press by press.
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
const [E] = process.argv.slice(2);
const { writeSiblingDesk } = require(path.resolve('tests/helpers/sibling-desk'));
const { loadCatalog } = require(`${E}/catalog`);
const { emitApp } = require(`${E}/emit/emitApp`);
const { parseProject } = require(`${E}/parse/parseProject`);
const catalog = loadCatalog();
const { dir } = writeSiblingDesk();
const app = emitApp(parseProject(dir, catalog), catalog);
const appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sibling-desk-app-'));
for (const [f, s] of Object.entries(app.files as Record<string, string>)) { fs.mkdirSync(path.dirname(path.join(appDir, f)), { recursive: true }); fs.writeFileSync(path.join(appDir, f), s); }
const steps = process.argv.length > 3 ? process.argv.slice(3) : ['Pick A', 'Pick B', 'Pick A', 'Choose C', 'Pick A'];
const arm = (helper: string, input: unknown): string[][] => {
  try {
    return JSON.parse(execFileSync(process.execPath, [path.resolve('tests/helpers', helper)], { input: JSON.stringify(input), encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 120000 }))[0][0];
  } catch (e) {
    return [[`${helper} threw: ${String((e as { stderr?: unknown }).stderr ?? e).slice(0, 400)}`]];
  }
};
const runtime = arm('runtime-mounted-arm.js', [{ dir, scenarios: [steps] }]);
const exported = arm('export-react-arm.js', [{ dir: appDir, scenarios: [steps], settled: true }]);
for (const [i, l] of ['load', ...steps].entries()) console.log(`${l.padEnd(7)} runtime: ${(runtime[i] ?? ['-']).join(' · ')}\n${''.padEnd(7)} export:  ${(exported[i] ?? ['-']).join(' · ')}`);
console.log(app.files['src/pages/Home.tsx'].split('\n').filter((l: string) => /<Picker|<Shower|which|Picked/.test(l)).join('\n'));
