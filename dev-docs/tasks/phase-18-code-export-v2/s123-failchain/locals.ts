// Usage: locals.ts <exportSrc> <root>... — every catch-local read (`outcome-error` with no row) in a plan that sits outside
// the Failure chain of the node whose catch declares it: the emitted page would read a name nothing declares.
import * as fs from 'fs';
import * as path from 'path';
const [E, ...roots] = process.argv.slice(2);
const { loadCatalog, CatalogIndex } = require(`${E}/catalog`);
const { parseProject } = require(`${E}/parse/parseProject`);
const { planProject } = require(`${E}/analyze/plan`);
const catalog = loadCatalog();
const projects: string[] = [];
const walk = (d: string, depth: number) => { if (depth > 3) return; let ents: fs.Dirent[] = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } if (ents.some((e) => e.name === 'nodegx.project.json')) { projects.push(d); return; } for (const e of ents) if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) walk(path.join(d, e.name), depth + 1); };
for (const r of roots) walk(r, 0);
let reads = 0; const bad: string[] = [];
for (const p of projects) {
  let ir: any, plan: any; try { ir = parseProject(p, catalog); plan = planProject(ir, new CatalogIndex(catalog)); } catch { continue; }
  for (const c of ir.components) {
    const cp = plan.byLegacyPath.get(`/${c.path}`); if (!cp) continue;
    const seen = new Set<object>();
    const visit = (v: any, declared: Set<string>, at: string): void => {
      if (v === null || typeof v !== 'object' || seen.has(v)) return;
      if (Array.isArray(v)) { v.forEach((x) => visit(x, declared, at)); return; }
      if (v.kind === 'outcome-error' && v.viaState === undefined) { reads++; if (!declared.has(v.nodeId)) bad.push(`${path.basename(p)} :: ${c.path} :: ${v.local} read at ${at}`); }
      for (const [k, child] of Object.entries(v)) {
        if (k === 'failThen' && typeof v.nodeId === 'string') visit(child, new Set([...declared, v.nodeId]), `${at}>${v.kind}:${v.nodeId}.fail`);
        else visit(child, declared, typeof v.kind === 'string' && typeof v.nodeId === 'string' ? `${at}>${v.kind}:${v.nodeId}` : at);
      }
    };
    visit(cp, new Set(), 'plan');
  }
}
console.log(`${projects.length} projects; ${reads} catch-local reads; ${bad.length} outside their catch`);
for (const b of bad) console.log('  ', b);
