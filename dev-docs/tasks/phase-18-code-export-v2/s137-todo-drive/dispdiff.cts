// Usage: dispdiff.ts <srcA> <srcB> <out.json> — every node's disposition under two export sources, and the differences.
import * as fs from 'fs';
import * as path from 'path';
const [A, B, out] = process.argv.slice(2);
const roots = (process.env.ROOTS ?? ['/Users/richardosborne/vscode_projects/NodeGX test projects', '/Users/richardosborne/vscode_projects/Noodl projects', '/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export/tests/fixtures'].join(':')).split(':');
const projects: string[] = [];
const walk = (d: string, depth: number) => { if (depth > 3) return; let ents: fs.Dirent[] = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } if (ents.some((e) => e.name === 'nodegx.project.json')) { projects.push(d); return; } for (const e of ents) if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) walk(path.join(d, e.name), depth + 1); };
for (const r of roots) walk(r, 0);
const load = (E: string) => ({ cat: require(`${E}/catalog`), parse: require(`${E}/parse/parseProject`), plan: require(`${E}/analyze/plan`) });
const a = load(A), b = load(B);
const catA = a.cat.loadCatalog(), catB = b.cat.loadCatalog();
const diffs: any[] = []; let nodes = 0;
for (const p of projects) {
  let pa: any, pb: any, ir: any;
  try { ir = a.parse.parseProject(p, catA); pa = a.plan.planProject(ir, new a.cat.CatalogIndex(catA)); pb = b.plan.planProject(b.parse.parseProject(p, catB), new b.cat.CatalogIndex(catB)); } catch (e: any) { diffs.push({ project: p, error: String(e.message).slice(0, 300) }); continue; }
  for (const c of ir.components) {
    const ca = pa.byLegacyPath.get(`/${c.path}`), cb = pb.byLegacyPath.get(`/${c.path}`);
    for (const n of c.nodes) {
      nodes++;
      const da = JSON.stringify(ca.dispositions[n.id] ?? null), db = JSON.stringify(cb.dispositions[n.id] ?? null);
      if (da !== db) diffs.push({ project: path.basename(p), component: c.path, node: n.id, type: n.type, label: n.authoredLabel, before: ca.dispositions[n.id], after: cb.dispositions[n.id] });
    }
  }
}
fs.writeFileSync(out, JSON.stringify(diffs, null, 1));
const kind = (d: any) => (d ? d.kind : 'none');
const t: Record<string, number> = {};
for (const d of diffs) { if (d.error) { t['ERROR ' + d.error.slice(0, 100)] = (t['ERROR ' + d.error.slice(0, 100)] || 0) + 1; continue; } const k = `${d.type}: ${kind(d.before)} → ${kind(d.after)}${kind(d.after) === 'deferred' ? ' (' + String(d.after.reason).replace(/"[^"]*"/g, '"…"').slice(0, 120) + ')' : ''}`; t[k] = (t[k] || 0) + 1; }
console.log(projects.length, 'projects,', nodes, 'nodes,', diffs.length, 'changed');
for (const [k, v] of Object.entries(t).sort((x, y) => y[1] - x[1])) console.log(String(v).padStart(4), k);
