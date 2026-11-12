// Usage (from packages/nodegx-export): fed.cts <exportSrc> <out.json> — every For Each whose items wire comes from a placed
// component: the child, whether the child lifts that port (and its type), hook or drawn, the row signals and relays it carries.
import * as fs from 'fs';
import * as path from 'path';
const [E, out] = process.argv.slice(2);
const { loadCatalog, CatalogIndex } = require(`${E}/catalog`);
const { parseProject } = require(`${E}/parse/parseProject`);
const { planProject } = require(`${E}/analyze/plan`);
const catalog = loadCatalog();
const T = '/Users/richardosborne/vscode_projects/OpenNoodl/templates';
const rows: any[] = [];
for (const t of fs.readdirSync(T).sort()) {
  const p = path.join(T, t);
  if (!fs.existsSync(path.join(p, 'nodegx.project.json'))) continue;
  const ir = parseProject(p, catalog);
  const plan = planProject(ir, new CatalogIndex(catalog));
  for (const c of ir.components) {
    const cp = plan.byLegacyPath.get(`/${c.path}`);
    if (!cp || cp.file === null) continue;
    for (const n of c.nodes) {
      if (n.type !== 'For Each') continue;
      const w = c.connections.find((x: any) => x.toId === n.id && x.toProperty === 'items');
      if (!w) continue;
      const from = c.nodes.find((x: any) => x.id === w.fromId);
      const child = plan.byLegacyPath.get(from?.type);
      if (!child) continue;
      const lifted = child.liftedOutputProps.find((l: any) => l.port === w.fromProperty);
      const rep = cp.repeaters[n.id];
      rows.push({
        template: t, component: c.path, each: n.id, label: n.authoredLabel, from: from.id, child: from.type,
        port: w.fromProperty, hook: !!child.hook, lifted: lifted ? lifted.tsType : null,
        childNote: lifted ? undefined : child.notes.find((s: string) => s.includes(`"${w.fromProperty}"`)),
        planned: !!rep, mapping: rep ? (Array.isArray(rep.mapping) ? 'map' : rep.mapping) : undefined,
        template_: rep?.templatePath ?? null,
        rowSignals: c.connections.filter((x: any) => x.fromId === n.id && String(x.fromProperty).startsWith('itemOutputSignal-')).length,
        rowValues: c.connections.filter((x: any) => x.fromId === n.id && String(x.fromProperty).startsWith('itemOutput-')).length,
        disposition: cp.dispositions[n.id]?.kind,
      });
    }
  }
}
fs.writeFileSync(out, JSON.stringify(rows, null, 1));
const by = (k: (r: any) => string) => { const m: Record<string, number> = {}; for (const r of rows) m[k(r)] = (m[k(r)] || 0) + 1; return m; };
console.log(rows.length, 'For Each fed by a placed component');
console.log('per template', JSON.stringify(by((r) => r.template)));
console.log('child lifts it as', JSON.stringify(by((r) => String(r.lifted))));
console.log('hook/drawn', JSON.stringify(by((r) => (r.hook ? 'hook' : 'drawn'))));
console.log('mapping', JSON.stringify(by((r) => String(r.mapping))));
console.log('with row signals', rows.filter((r) => r.rowSignals).length, 'with row values', rows.filter((r) => r.rowValues).length);
console.log('not lifted, child says:', JSON.stringify(by((r) => (r.lifted ? 'lifted' : String(r.childNote).replace(/"[^"]*"/g, '"…"').slice(0, 150)))), null, 1);
