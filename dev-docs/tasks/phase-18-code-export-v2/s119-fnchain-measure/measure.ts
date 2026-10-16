// Usage: measure.ts <exportSrc> <out.json>  — every Query Records with a wired filter value, its disposition, and the JS node feeding each value.
import * as fs from 'fs';
import * as path from 'path';
const [E, out] = process.argv.slice(2);
const { loadCatalog } = require(`${E}/catalog`);
const { parseProject } = require(`${E}/parse/parseProject`);
const { planProject } = require(`${E}/analyze/plan`);
const { CatalogIndex } = require(`${E}/catalog`);
const catalog = loadCatalog();
const roots = process.env.ROOTS ? process.env.ROOTS.split(":") : ['/Users/richardosborne/vscode_projects/NodeGX test projects', '/Users/richardosborne/vscode_projects/Noodl projects', `${E}/../tests/fixtures`];
const projects: string[] = [];
const walk = (d: string, depth: number) => {
  if (depth > 3) return;
  let ents: fs.Dirent[] = [];
  try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
  if (ents.some((e) => e.name === 'nodegx.project.json')) { projects.push(d); return; }
  for (const e of ents) if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) walk(path.join(d, e.name), depth + 1);
};
for (const r of roots) walk(r, 0);
const rows: any[] = [];
const JS = new Set(['JavaScriptFunction', 'Expression', 'Javascript2', 'Logic Builder']);
for (const p of projects) {
  let ir: any, plan: any;
  try { ir = parseProject(p, catalog); plan = planProject(ir, new CatalogIndex(catalog)); } catch (e: any) { rows.push({ project: p, error: String(e.message).slice(0, 200) }); continue; }
  for (const c of ir.components) {
    const cp = plan.byLegacyPath.get(`/${c.path}`);
    const byId = new Map(c.nodes.map((n: any) => [n.id, n]));
    for (const n of c.nodes) {
      if (n.type !== 'DbCollection2') continue;
      const qp = c.connections.filter((w: any) => w.toId === n.id && w.toProperty.startsWith('qp-'));
      if (qp.length === 0) continue;
      const feeds = qp.map((w: any) => {
        const src: any = byId.get(w.fromId);
        const f: any = { port: w.toProperty, from: src?.type, fromPort: w.fromProperty };
        if (src && JS.has(src.type)) {
          const ins = c.connections.filter((x: any) => x.toId === src.id);
          f.js = {
            label: src.authoredLabel,
            disp: cp?.dispositions[src.id],
            inputs: ins.map((x: any) => `${(byId.get(x.fromId) as any)?.type}.${x.fromProperty}->${x.toProperty}`),
            body: (src.parameters.find((q: any) => ['functionScript', 'expression'].includes(q.name))?.value?.source ?? src.parameters.find((q: any) => ['functionScript', 'expression'].includes(q.name))?.value?.value ?? '').slice(0, 400)
          };
        }
        return f;
      });
      rows.push({ project: path.basename(p), component: c.path, node: n.id, disp: cp?.dispositions[n.id], feeds });
    }
  }
}
fs.writeFileSync(out, JSON.stringify(rows, null, 1));
console.log(projects.length, 'projects;', rows.length, 'rows');
