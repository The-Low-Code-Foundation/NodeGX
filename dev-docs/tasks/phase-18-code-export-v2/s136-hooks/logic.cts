// Usage: logic.cts <exportSrc> <out.json> — every logic-only component of every template: its size, its ports, who places it and how.
import * as fs from 'fs';
import * as path from 'path';
const [E, out] = process.argv.slice(2);
const { loadCatalog, CatalogIndex } = require(`${E}/catalog`);
const { parseProject } = require(`${E}/parse/parseProject`);
const { planProject } = require(`${E}/analyze/plan`);
const catalog = loadCatalog();
const T = '/Users/richardosborne/vscode_projects/OpenNoodl/templates';
const res: any[] = [];
for (const t of fs.readdirSync(T)) {
  const p = path.join(T, t);
  if (!fs.existsSync(path.join(p, 'nodegx.project.json'))) continue;
  const ir = parseProject(p, catalog);
  const plan = planProject(ir, new CatalogIndex(catalog));
  const byPath = new Map<string, any>(ir.components.map((c: any) => [`/${c.path}`, c]));
  const logic = new Set<string>();
  for (const c of ir.components) { const cp = plan.byLegacyPath.get(`/${c.path}`); if (cp && String(cp.skipReason ?? '').startsWith('no visual root — logic-only')) logic.add(`/${c.path}`); }
  // templates of repeaters: a component named as a For Each / Repeater template anywhere
  const rowTemplates = new Set<string>();
  for (const c of ir.components) for (const n of c.nodes) { const tp = n.parameters?.template; if ((n.type === 'For Each' || /Repeater|ForEach/.test(n.type)) && typeof tp === 'string') rowTemplates.add(tp); }
  for (const lp of logic) {
    const c = byPath.get(lp);
    const placements: any[] = [];
    for (const pc of ir.components) for (const n of pc.nodes) if (n.type === lp) {
      const pcp = plan.byLegacyPath.get(`/${pc.path}`);
      placements.push({ by: pc.path, byLogic: logic.has(`/${pc.path}`), byRow: rowTemplates.has(`/${pc.path}`), byPage: pc.role === 'page', parentFile: !!pcp?.file, visualParent: n.parent !== undefined });
    }
    const ins = c.nodes.filter((n: any) => n.type === 'Component Inputs').flatMap((n: any) => n.declaredPorts.filter((q: any) => q.plug === 'output').map((q: any) => `${q.name}:${q.kind ?? q.type}`));
    const outs = c.nodes.filter((n: any) => n.type === 'Component Outputs').flatMap((n: any) => n.declaredPorts.filter((q: any) => q.plug === 'input').map((q: any) => `${q.name}:${q.kind ?? q.type}`));
    const types: Record<string, number> = {}; for (const n of c.nodes) types[n.type] = (types[n.type] || 0) + 1;
    res.push({ template: t, path: lp, nodes: c.nodes.length, ins, outs, placements, types });
  }
}
fs.writeFileSync(out, JSON.stringify(res, null, 1));
let nodes = 0, placed = 0, unplaced = 0, nested = 0, inRow = 0, byVisual = 0;
for (const r of res) { nodes += r.nodes; if (r.placements.length === 0) unplaced++; else placed++; for (const pl of r.placements) { if (pl.byLogic) nested++; else if (pl.byRow) inRow++; else byVisual++; } }
console.log(res.length, 'logic components,', nodes, 'nodes;', placed, 'placed,', unplaced, 'never placed; placements: by a visual non-row', byVisual, ', by a row template', inRow, ', by a logic component', nested);
const tt: Record<string, number> = {}; for (const r of res) for (const [k, v] of Object.entries(r.types)) tt[k] = (tt[k] || 0) + (v as number);
console.log(Object.entries(tt).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, v]) => `${k} ${v}`).join(', '));
