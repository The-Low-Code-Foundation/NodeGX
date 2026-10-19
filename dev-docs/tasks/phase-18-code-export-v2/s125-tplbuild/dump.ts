// dump.ts <exportSrc> <out.json> [templatesDir] — all diagnostics per tracked template
import * as fs from 'fs';
import * as path from 'path';
const [E, out] = process.argv.slice(2);
const WT = path.join(__dirname, '..', '..', '..', '..');
const T = process.env.TDIR ?? path.join(WT, 'templates');
const { loadCatalog } = require(`${E}/catalog`);
const { emitApp } = require(`${E}/emit/emitApp`);
const { parseProject } = require(`${E}/parse/parseProject`);
const { typecheckEmittedApp } = require(path.join(WT, 'packages/nodegx-export/tests/helpers/typecheckApp'));
const catalog = loadCatalog();
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const res: Record<string, string[]> = {};
for (const name of fs.readdirSync(T).sort()) {
  if (!fs.existsSync(path.join(T, name, 'nodegx.project.json'))) continue;
  if (only && !only.includes(name)) continue;
  const app = emitApp(parseProject(path.join(T, name), catalog), catalog);
  if (process.env.EMITDIR) { for (const [f, s] of Object.entries(app.files)) { const p = path.join(process.env.EMITDIR, name, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s as string); } }
  res[name] = typecheckEmittedApp(app);
  const byCode: Record<string, number> = {};
  for (const d of res[name]) { const c = d.split(/[ :]/)[0]; byCode[c] = (byCode[c] ?? 0) + 1; }
  console.log(String(res[name].length).padStart(4), name, JSON.stringify(byCode));
}
fs.writeFileSync(out, JSON.stringify(res, null, 1));
console.log('total', Object.values(res).reduce((n, r) => n + r.length, 0));
