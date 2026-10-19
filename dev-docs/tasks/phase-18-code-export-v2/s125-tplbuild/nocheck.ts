// nocheck.ts <emitDir> — typecheck each emitted app with the Function files' @ts-nocheck removed; list their errors by code
import * as fs from 'fs';
import * as path from 'path';
const WT = path.join(__dirname, '..', '..', '..', '..');
const { typecheckEmittedApp } = require(path.join(WT, 'packages/nodegx-export/tests/helpers/typecheckApp'));
const dir = process.argv[2];
const walk = (d: string, out: string[] = []): string[] => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, out); else out.push(p); } return out; };
const byCode: Record<string, number> = {};
for (const proj of fs.readdirSync(dir).sort()) {
  const root = path.join(dir, proj);
  const files: Record<string, string> = {};
  for (const f of walk(root)) { const rel = path.relative(root, f); let s = fs.readFileSync(f, 'utf8'); if (rel.startsWith('src/functions/')) s = s.replace('// @ts-nocheck\n', ''); files[rel] = s; }
  const diags: string[] = typecheckEmittedApp({ files }).filter((d: string) => d.includes(' src/functions/'));
  for (const d of diags) { const c = d.split(' ')[0]; byCode[c] = (byCode[c] ?? 0) + 1; if (/TS2304|TS2552|TS2448/.test(d)) console.log(proj, d.slice(0, 200)); }
}
console.log(JSON.stringify(byCode));
