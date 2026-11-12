// Usage: census.ts <exportSrc> <out.json> — every deferred node of every template, grouped by reason shape (first-refusal rank).
import * as fs from 'fs';
import * as path from 'path';
const [E, out] = process.argv.slice(2);
const { loadCatalog, CatalogIndex } = require(`${E}/catalog`);
const { parseProject } = require(`${E}/parse/parseProject`);
const { planProject } = require(`${E}/analyze/plan`);
const catalog = loadCatalog();
const T = '/Users/richardosborne/vscode_projects/OpenNoodl/templates';
const rows: any[] = [];
for (const t of fs.readdirSync(T)) {
  const p = path.join(T, t);
  if (!fs.existsSync(path.join(p, 'nodegx.project.json'))) continue;
  const ir = parseProject(p, catalog);
  const plan = planProject(ir, new CatalogIndex(catalog));
  for (const c of ir.components) {
    const cp = plan.byLegacyPath.get(`/${c.path}`);
    for (const n of c.nodes) {
      const d = cp.dispositions[n.id];
      if (!d || d.kind !== 'deferred') continue;
      rows.push({ template: t, component: c.path, type: n.type, label: n.authoredLabel, reason: d.reason });
    }
  }
}
fs.writeFileSync(out, JSON.stringify(rows, null, 1));
const shape = (r: string) => r.replace(/"[^"]*"/g, '"…"').replace(/`[^`]*`/g, '`…`').replace(/ is fed by [A-Za-z0-9]+ — .*/, ' is fed by X — …').slice(0, 140);
const g: Record<string, Set<string>> = {}; const n: Record<string, number> = {};
for (const r of rows) { const k = shape(r.reason); n[k] = (n[k] || 0) + 1; (g[k] = g[k] || new Set()).add(r.template); }
console.log(rows.length, 'deferred');
for (const [k, v] of Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 45)) console.log(String(v).padStart(4), k, '\n        [' + [...g[k]].join(' ') + ']');
