// Usage: freshoutputs.ts <exportSrc> <root...> — exported Functions whose body reads one of its own outputs (`Outputs.x`
// as a value, not a write or a signal call) and that keep no node across runs (no pulses): P18-S121-FRESHOUTPUTS's reach.
import * as fs from 'fs';
import * as path from 'path';
const [E, ...roots] = process.argv.slice(2);
const { loadCatalog, CatalogIndex } = require(`${E}/catalog`);
const { parseProject } = require(`${E}/parse/parseProject`);
const { planProject } = require(`${E}/analyze/plan`);
const catalog = loadCatalog(); const index = new CatalogIndex(catalog);
const projects: string[] = [];
const walk = (d: string, depth: number) => { if (depth > 3) return; let ents: fs.Dirent[] = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } if (ents.some((e) => e.name === 'nodegx.project.json')) { projects.push(d); return; } for (const e of ents) if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) walk(path.join(d, e.name), depth + 1); };
for (const r of roots) walk(r, 0);
const READ = /Outputs\.([A-Za-z_$][\w$]*)(?![\w$])(?!\s*(?:=(?!=)|\(|\.send\b))/g;
let reading = 0, exported = 0; const rows: string[] = [];
for (const p of projects) {
  let ir: any, plan: any; try { ir = parseProject(p, catalog); plan = planProject(ir, index); } catch { continue; }
  for (const c of ir.components) {
    const cp = plan.byLegacyPath.get(`/${c.path}`);
    for (const f of c.nodes) {
      if (f.type !== 'JavaScriptFunction') continue;
      const src = f.parameters.find((q: any) => q.name === 'functionScript')?.value; const body = String(src?.source ?? src?.value ?? '');
      const reads = [...body.matchAll(READ)].map((m) => m[1]);
      if (reads.length === 0) continue;
      reading++;
      const def = cp?.jsFunctions?.[f.id];
      if (cp?.dispositions?.[f.id]?.kind !== 'collapsed' || def?.pulsed) continue;
      exported++;
      rows.push(`${path.basename(p)} ${c.path} "${f.authoredLabel ?? f.id.slice(0, 6)}" ${def?.mode} reads ${[...new Set(reads)].join(',')}`);
    }
  }
}
console.log(projects.length, 'projects;', reading, 'Functions read their own outputs;', exported, 'of them export with a fresh Outputs per run');
if (process.env.V) for (const r of rows) console.log(' ', r);
