// Usage: wires.cts <exportSrc> — what a placed logic component's wires connect to in its parent, by kind.
import * as fs from 'fs';
import * as path from 'path';
const [E] = process.argv.slice(2);
const { loadCatalog, CatalogIndex } = require(`${E}/catalog`);
const { parseProject } = require(`${E}/parse/parseProject`);
const { planProject } = require(`${E}/analyze/plan`);
const catalog = loadCatalog();
const T = '/Users/richardosborne/vscode_projects/OpenNoodl/templates';
const c: Record<string, number> = {};
const inc = (k: string) => (c[k] = (c[k] || 0) + 1);
for (const t of fs.readdirSync(T)) {
  const p = path.join(T, t);
  if (!fs.existsSync(path.join(p, 'nodegx.project.json'))) continue;
  const ir = parseProject(p, catalog);
  const plan = planProject(ir, new CatalogIndex(catalog));
  const comps = new Map<string, any>(ir.components.map((x: any) => [`/${x.path}`, x]));
  const logic = new Set<string>();
  for (const x of ir.components) { const cp = plan.byLegacyPath.get(`/${x.path}`); if (String(cp?.skipReason ?? '').startsWith('no visual root — logic-only')) logic.add(`/${x.path}`); }
  const kindOf = (comp: any, port: string, plug: string) => { for (const n of comp.nodes) if (n.type === (plug === 'input' ? 'Component Outputs' : 'Component Inputs')) for (const q of n.declaredPorts) if (q.name === port) return q.kind === 'signal' || q.type === 'signal' ? 'signal' : 'value'; return '?'; };
  for (const pc of ir.components) {
    const pcp = plan.byLegacyPath.get(`/${pc.path}`);
    if (logic.has(`/${pc.path}`)) continue;
    const byId = new Map<string, any>(pc.nodes.map((n: any) => [n.id, n]));
    for (const w of pc.connections) {
      const from = byId.get(w.fromId), to = byId.get(w.toId);
      if (from && logic.has(from.type)) {
        const k = kindOf(comps.get(from.type), w.fromProperty, 'input');
        const role = pcp?.roleOf?.[to.id];
        inc(`OUT ${k} → ${logic.has(to.type) ? 'another logic component' : role && role !== 'unsupported' ? 'drawn:' + role : to.type}`);
      }
      if (to && logic.has(to.type)) {
        const k = kindOf(comps.get(to.type), w.toProperty, 'output');
        const role = pcp?.roleOf?.[from.id];
        inc(`IN  ${k} ← ${logic.has(from.type) ? 'another logic component' : role && role !== 'unsupported' ? 'drawn:' + role : from.type}`);
      }
    }
  }
}
for (const [k, v] of Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 50)) console.log(String(v).padStart(5), k);
