// Usage (from packages/nodegx-export): undrawn.ts <exportSrc> — over ROOTS (as ../s119-fnchain-measure/dispdiff.ts): every
// node dispositioned "collapsed into <a For Each>" whose repeater draws no rows in the export (its items have no feed the
// export reads: the §99 take-back's test), so the row callback it is said to be collapsed into is never printed.
import * as fs from 'fs';
import * as path from 'path';
const [E] = process.argv.slice(2);
const roots = (process.env.ROOTS ?? '').split(':').filter(Boolean);
const projects: string[] = [];
const walkDir = (d: string, depth: number) => { if (depth > 3) return; let ents: fs.Dirent[] = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } if (ents.some((e) => e.name === 'nodegx.project.json')) { projects.push(d); return; } for (const e of ents) if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) walkDir(path.join(d, e.name), depth + 1); };
for (const r of roots) walkDir(r, 0);
type Json = Record<string, unknown>;
const cat = require(`${E}/catalog`), parse = require(`${E}/parse/parseProject`), planM = require(`${E}/analyze/plan`);
const catalog = cat.loadCatalog();
let total = 0;
for (const p of projects.sort()) {
  const ir = parse.parseProject(p, catalog);
  const pp = planM.planProject(ir, new cat.CatalogIndex(catalog));
  for (const c of ir.components as Json[]) {
    const plan = pp.byLegacyPath.get(`/${c.path}`);
    if (!plan) continue;
    const byId = new Map<string, Json>((c.nodes as Json[]).map((n) => [n.id as string, n]));
    for (const [id, d] of Object.entries(plan.dispositions as Record<string, { kind: string; into?: string }>)) {
      if (d.kind !== 'collapsed' || d.into === undefined || byId.get(d.into)?.type !== 'For Each') continue;
      const r = plan.repeaters[d.into];
      const fed = r !== undefined && (plan.queries.some((q: Json) => q.nodeId === r.itemsQueryId) || r.itemsCollectionName != null || r.itemsExpr !== undefined || plan.staticData.some((s: Json) => s.nodeId === r.itemsStaticId));
      if (fed) continue;
      total++;
      console.log(`${path.basename(p)} ${c.path} ${id} (${byId.get(id)?.type}) collapsed into ${d.into}, which draws no rows`);
    }
  }
}
console.log(total, 'nodes collapsed into a repeater that draws no rows');
