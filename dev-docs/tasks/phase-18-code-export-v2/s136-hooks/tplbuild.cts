// Usage (from packages/nodegx-export): tplbuild.ts <exportSrc> <out.json> — every template under ROOTS (as dispdiff.ts)
// emitted and typechecked as its own `tsc -b` would (tests/helpers/typecheckApp, the scaffold's strict options): the
// error count per project, per TS code, and per emitted file (P18-S122-TPLBUILD's gate, by count).
import * as fs from 'fs';
import * as path from 'path';
const [E, out] = process.argv.slice(2);
const roots = (process.env.ROOTS ?? '').split(':').filter(Boolean);
const projects: string[] = [];
const walk = (d: string, depth: number) => { if (depth > 3) return; let ents: fs.Dirent[] = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } if (ents.some((e) => e.name === 'nodegx.project.json')) { projects.push(d); return; } for (const e of ents) if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) walk(path.join(d, e.name), depth + 1); };
for (const r of roots) walk(r, 0);
const { loadCatalog } = require(`${E}/catalog`);
const { emitApp } = require(`${E}/emit/emitApp`);
const { parseProject } = require(`${E}/parse/parseProject`);
const { typecheckEmittedApp } = require('/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export/tests/helpers/typecheckApp');
const catalog = loadCatalog();
const result: Record<string, { errors: number; byCode: Record<string, number>; byFile: Record<string, number> }> = {};
for (const p of projects.sort()) {
  // Each diagnostic is a string: `TS<code> <file>:<line>: <message>` (or `TS<code>: <message>` with no file).
  const diags: string[] = typecheckEmittedApp(emitApp(parseProject(p, catalog), catalog));
  const byCode: Record<string, number> = {}, byFile: Record<string, number> = {};
  for (const d of diags) { const m = /^(TS\d+)(?: ([^:]+):\d+)?:/.exec(d); const c = m?.[1] ?? '?'; byCode[c] = (byCode[c] ?? 0) + 1; const f = m?.[2] ?? '?'; byFile[f] = (byFile[f] ?? 0) + 1; }
  result[path.basename(p)] = { errors: diags.length, byCode, byFile };
  console.log(String(diags.length).padStart(4), path.basename(p), JSON.stringify(byCode));
}
fs.writeFileSync(out, JSON.stringify(result, null, 1));
console.log('total', Object.values(result).reduce((n, r) => n + r.errors, 0), 'errors in', Object.values(result).filter((r) => r.errors > 0).length, 'of', projects.length);
