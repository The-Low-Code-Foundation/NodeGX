// Usage: census.ts <exportSrc> — every snapshot Condition: its condition source, its Evaluate senders, its readers, the readers' authored Mounted, and the sender's disposition.
import * as fs from 'fs';
import * as path from 'path';
const [E] = process.argv.slice(2);
const { loadCatalog, CatalogIndex } = require(`${E}/catalog`);
const { parseProject } = require(`${E}/parse/parseProject`);
const { planProject } = require(`${E}/analyze/plan`);
const catalog = loadCatalog();
const roots = (process.env.ROOTS ?? '').split(':').filter(Boolean);
const projects: string[] = [];
const walk = (d: string, depth: number) => { if (depth > 3) return; let ents: fs.Dirent[] = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } if (ents.some((e) => e.name === 'nodegx.project.json')) { projects.push(d); return; } for (const e of ents) if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) walk(path.join(d, e.name), depth + 1); };
for (const r of roots) walk(r, 0);
const tally: Record<string, number> = {};
const bump = (k: string) => (tally[k] = (tally[k] || 0) + 1);
for (const p of projects) {
  let ir: any, plan: any; try { ir = parseProject(p, catalog); plan = planProject(ir, new CatalogIndex(catalog)); } catch { continue; }
  for (const c of ir.components) {
    const cp = plan.byLegacyPath.get(`/${c.path}`); const by = new Map<string, any>(c.nodes.map((x: any) => [x.id, x]));
    for (const node of c.nodes) {
      if (node.type !== 'Condition') continue;
      if (!cp.notes.some((x: string) => x.includes(`wire ${node.id}:`) && /snapshots of the last Evaluate/.test(x))) continue;
      const condW = c.connections.find((w: any) => w.toId === node.id && w.toProperty === 'condition');
      const condP = node.parameters.find((q: any) => q.name === 'condition');
      const cond = condW ? `wired ${by.get(condW.fromId)?.type}.${condW.fromProperty}` : `literal ${JSON.stringify(condP?.value?.value)}`;
      const evals = c.connections.filter((w: any) => w.toId === node.id && w.toProperty === 'eval').map((w: any) => `${by.get(w.fromId)?.type}.${w.fromProperty}[${cp.dispositions[w.fromId]?.kind}]`);
      const outs = c.connections.filter((w: any) => w.fromId === node.id).map((w: any) => { const t = by.get(w.toId); const m = t?.parameters.find((q: any) => q.name === w.toProperty); return `${w.fromProperty}->${t?.type}.${w.toProperty}(authored ${JSON.stringify(m?.value?.value)})`; });
      bump(`cond ${cond}`); for (const e of evals) bump(`eval ${e}`); bump(`#evals ${evals.length}`); for (const o of outs) bump(`out ${o}`);
      if (process.env.V) console.log(path.basename(p), c.path, node.id, '|', cond, '|', evals.join(','), '|', outs.join(','));
    }
  }
}
for (const [k, v] of Object.entries(tally).sort()) console.log(String(v).padStart(4), k);
