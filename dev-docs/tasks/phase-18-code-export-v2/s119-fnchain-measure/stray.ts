// Usage: stray.ts <exportSrc> — over the corpus: the invoked-Function stray-read refusal, by sink type, and the fetched-trigger refusal.
import * as fs from 'fs';
import * as path from 'path';
const [E] = process.argv.slice(2);
const { loadCatalog, CatalogIndex } = require(`${E}/catalog`);
const { parseProject } = require(`${E}/parse/parseProject`);
const { planProject } = require(`${E}/analyze/plan`);
const catalog = loadCatalog();
const roots = (process.env.ROOTS ?? ['/Users/richardosborne/vscode_projects/NodeGX test projects', '/Users/richardosborne/vscode_projects/Noodl projects', `${E}/../tests/fixtures`].join(':')).split(':');
const projects: string[] = [];
const walk = (d: string, depth: number) => { if (depth > 3) return; let ents: fs.Dirent[] = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } if (ents.some((e) => e.name === 'nodegx.project.json')) { projects.push(d); return; } for (const e of ents) if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) walk(path.join(d, e.name), depth + 1); };
for (const r of roots) walk(r, 0);
const stray: Record<string, number> = {}; const strayProj = new Set<string>(); let strayN = 0;
const sinkTypes: Record<string, number> = {}; const runFrom: Record<string, number> = {};
const fetched: Record<string, number> = {};
for (const p of projects) {
  let ir: any, plan: any; try { ir = parseProject(p, catalog); plan = planProject(ir, new CatalogIndex(catalog)); } catch { continue; }
  for (const c of ir.components) {
    const cp = plan.byLegacyPath.get(`/${c.path}`); const by = new Map(c.nodes.map((n: any) => [n.id, n]));
    for (const n of c.nodes) {
      const d = cp.dispositions[n.id]; if (!d || d.kind !== 'deferred') continue;
      if (/consumed outside the Run chain by an unrendered sink/.test(d.reason)) {
        strayN++; strayProj.add(path.basename(p));
        const k = `${c.path}`; stray[k] = (stray[k] || 0) + 1;
        for (const w of c.connections) {
          if (w.fromId === n.id && w.fromProperty.startsWith('out-')) { const t: any = by.get(w.toId); sinkTypes[`${t?.type}.${w.toProperty.replace(/^(qp|prop|in|pm)-.*/, '$1-*')}`] = (sinkTypes[`${t?.type}.${w.toProperty.replace(/^(qp|prop|in|pm)-.*/, '$1-*')}`] || 0) + 1; }
          if (w.toId === n.id && w.toProperty === 'run') { const f: any = by.get(w.fromId); runFrom[`${f?.type}.${w.fromProperty}`] = (runFrom[`${f?.type}.${w.fromProperty}`] || 0) + 1; }
        }
      }
      const m = /^trigger [^ ]+\.(\w+) is not a rendered element event/.exec(d.reason);
      if (m && n.type === 'JavaScriptFunction') fetched[m[1]] = (fetched[m[1]] || 0) + 1;
    }
  }
}
console.log(projects.length, 'projects; stray-read refusals:', strayN, 'in', strayProj.size, 'projects');
console.log('by component:', Object.entries(stray).sort((a, b) => b[1] - a[1]).slice(0, 25));
console.log('sinks:', Object.entries(sinkTypes).sort((a, b) => b[1] - a[1]));
console.log('run from:', Object.entries(runFrom).sort((a, b) => b[1] - a[1]));
console.log('JS Function triggered by a non-DOM signal:', fetched);
