// Runs both arms on the Root Desk with Ask and Unless: `ask.ts <exportSrc> <label>`.
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
const [E, label] = process.argv.slice(2);
const H = '/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export/tests/helpers';
const { writeDesk } = require(`${H}/root-desk`);
const { addAskAndUnless } = require(`${H}/header-desk`);
const { loadCatalog } = require(`${E}/catalog`); const { emitApp } = require(`${E}/emit/emitApp`); const { parseProject } = require(`${E}/parse/parseProject`);
const X = path.join(__dirname, "work", `ask-${label}`);
fs.rmSync(X, { recursive: true, force: true });
const { dir } = writeDesk(addAskAndUnless);
const c = loadCatalog(); const app = emitApp(parseProject(dir, c), c);
for (const [f, t] of Object.entries(app.files) as any) { fs.mkdirSync(path.dirname(path.join(X, f)), { recursive: true }); fs.writeFileSync(path.join(X, f), t); }
const SC = [['Open', 'Close']];
const run = (arm: string, input: unknown) => JSON.parse(execFileSync(process.execPath, [`${H}/${arm}`], { input: JSON.stringify(input), encoding: 'utf-8', maxBuffer: 1 << 24 }));
const rt = run('runtime-mounted-arm.js', [{ dir, scenarios: SC }]);
const ex = run('export-react-arm.js', [{ dir: X, scenarios: SC }]);
const only = (r: string[]) => r.filter((t) => /the (ask|unless)/.test(t)).join(', ') || '—';
rt[0][0].forEach((r: string[], i: number) => console.log(['load', 'Open', 'Close'][i].padEnd(6), 'runtime:', only(r).padEnd(22), `export-${label}:`, only(ex[0][0][i]), JSON.stringify(r) === JSON.stringify(ex[0][0][i]) ? '(all Texts equal)' : '(Texts differ)'));
