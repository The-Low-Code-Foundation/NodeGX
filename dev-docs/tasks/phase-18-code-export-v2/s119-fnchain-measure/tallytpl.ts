// Usage: tallytpl.ts <exportSrc> <project> — every refused node of a project, grouped by reason shape.
const [E, p] = process.argv.slice(2);
const { loadCatalog, CatalogIndex } = require(`${E}/catalog`);
const { parseProject } = require(`${E}/parse/parseProject`);
const { planProject } = require(`${E}/analyze/plan`);
const catalog = loadCatalog();
const ir = parseProject(p, catalog);
const plan = planProject(ir, new CatalogIndex(catalog));
const groups: Record<string, string[]> = {};
let total = 0, refused = 0;
for (const c of ir.components) {
  const cp = plan.byLegacyPath.get(`/${c.path}`);
  for (const n of c.nodes) {
    total++;
    const d = cp.dispositions[n.id];
    if (!d || d.kind !== 'deferred') continue;
    refused++;
    const k = d.reason.replace(/"[^"]*"/g, '"…"').replace(/ is fed by [A-Za-z0-9]+ — .*/, ' is fed by X — …').slice(0, 150);
    (groups[k] = groups[k] || []).push(`${c.path}:${n.type}`);
  }
}
console.log(total, 'nodes,', refused, 'deferred; reachable:', JSON.stringify(plan.reachability).slice(0, 300));
for (const [k, v] of Object.entries(groups).sort((a, b) => b[1].length - a[1].length)) console.log(String(v.length).padStart(3), k, '\n      ', [...new Set(v)].slice(0, 5).join(' '));
