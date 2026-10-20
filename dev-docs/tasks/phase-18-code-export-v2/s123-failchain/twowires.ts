// Usage: twowires.ts <exportSrc> <root>... — every Set Variable / Global Store Set with two or more wires into its Value,
// and its disposition: the export compiles the first wire and drops the rest, the runtime holds whichever wrote last.
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
let n = 0; const rows: string[] = [];
for (const p of projects) {
  let ir: any, plan: any; try { ir = parseProject(p, catalog); plan = planProject(ir, new CatalogIndex(catalog)); } catch { continue; }
  for (const c of ir.components) {
    const cp = plan.byLegacyPath.get(`/${c.path}`); if (!cp) continue; const by = new Map(c.nodes.map((x: any) => [x.id, x]));
    for (const node of c.nodes) {
      if (node.type !== 'Set Variable' && node.type !== 'GlobalStoreSet' && node.type !== 'net.noodl.GlobalStoreSet') continue;
      const ws = c.connections.filter((w: any) => w.toId === node.id && w.toProperty === 'value');
      if (ws.length < 2) continue;
      n++;
      const d = cp.dispositions[node.id];
      rows.push(`${d?.kind ?? 'none'} :: ${path.basename(p)} :: ${c.path} :: ${node.id} <- ${ws.map((w: any) => `${(by.get(w.fromId) as any)?.type}.${w.fromProperty}`).join(' | ')}`);
    }
  }
}
console.log(`${projects.length} projects; ${n} sets with two or more Value wires`);
for (const r of rows.sort()) console.log('  ', r);
