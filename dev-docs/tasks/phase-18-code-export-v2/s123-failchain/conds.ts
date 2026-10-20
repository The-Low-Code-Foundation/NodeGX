// Usage: conds.ts <exportSrc> <root>... — every Condition in the given projects whose Evaluate is wired, its disposition and
// reason, and the chain that sends its Evaluate (the sender node and port).
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
let n = 0, def = 0;
for (const p of projects) {
  let ir: any, plan: any; try { ir = parseProject(p, catalog); plan = planProject(ir, new CatalogIndex(catalog)); } catch (e: any) { console.log('ERR', p, e.message); continue; }
  for (const c of ir.components) {
    const cp = plan.byLegacyPath.get(`/${c.path}`); const by = new Map(c.nodes.map((x: any) => [x.id, x]));
    for (const node of c.nodes) {
      if (node.type !== 'Condition') continue;
      const ev = c.connections.filter((w: any) => w.toId === node.id && w.toProperty === 'eval');
      if (!ev.length) continue;
      n++;
      const d = cp.dispositions[node.id];
      if (d?.kind !== 'deferred') continue;
      def++;
      const senders = ev.map((w: any) => { const f: any = by.get(w.fromId); return `${f?.type}(${f?.authoredLabel ?? f?.id}).${w.fromProperty}`; });
      console.log(`${path.basename(p)} :: ${c.path} :: ${node.id} :: eval<- ${senders.join(', ')}\n    ${String(d.reason).slice(0, 400)}`);
    }
  }
}
console.log(`== ${n} Evaluate-wired Conditions, ${def} deferred`);
