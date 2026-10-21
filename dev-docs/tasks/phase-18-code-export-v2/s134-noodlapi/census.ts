// Usage (from packages/nodegx-export): census.ts <exportSrc> <out.json> — over ROOTS: every JavaScriptFunction whose
// body reads Noodl.*, its members, whether it awaits at its top level, its disposition today, and its component's.
import * as fs from 'fs';
import * as path from 'path';
const [E, out] = process.argv.slice(2);
const roots = (process.env.ROOTS ?? '').split(':').filter(Boolean);
const projects: string[] = [];
const walk = (d: string, depth: number) => { if (depth > 3) return; let ents: fs.Dirent[] = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } if (ents.some((e) => e.name === 'nodegx.project.json')) { projects.push(d); return; } for (const e of ents) if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) walk(path.join(d, e.name), depth + 1); };
for (const r of roots) walk(r, 0);
type Json = Record<string, any>;
const cat = require(`${E}/catalog`), parse = require(`${E}/parse/parseProject`), planM = require(`${E}/analyze/plan`), js = require(`${E}/analyze/jsfun`);
const catalog = cat.loadCatalog();
const index = new cat.CatalogIndex(catalog);
const rows: Json[] = [];
const tally: Record<string, Record<string, number>> = {};
const bump = (k: string, v: string) => { (tally[k] ??= {})[v] = (tally[k][v] ?? 0) + 1; };
for (const p of projects.sort()) {
  const ir = parse.parseProject(p, catalog);
  const pp = planM.planProject(ir, index);
  for (const c of ir.components as Json[]) {
    const plan = pp.byLegacyPath.get(`/${c.path}`);
    const nodes = c.nodes as Json[], wires = c.connections as Json[];
    for (const n of nodes) {
      if (n.type !== 'JavaScriptFunction') continue;
      const pv = n.parameters.find((x: Json) => x.name === 'functionScript')?.value; const body = pv?.source ?? pv?.value;
      if (typeof body !== 'string') continue;
      const s = js.strippedForScan(body);
      if (!/\bNoodl\s*[.\[]/.test(s)) continue;
      const members = [...new Set([...s.matchAll(/\bNoodl\.([A-Za-z_]+)(?:\.([A-Za-z_]+))?/g)].map((m) => m[1] + (m[2] ? '.' + m[2] : '')))].sort();
      const disp = plan?.dispositions?.[n.id];
      const others = nodes.filter((m) => m.id !== n.id).map((m) => plan?.dispositions?.[m.id]?.kind);
      const row = {
        project: path.basename(p), component: c.path, node: n.id, label: n.authoredLabel, members,
        topAwait: js.jsAwaitsAtTopLevel(body), traits: js.jsHostTraitsOf(body), component_: s.match(/\bComponent\s*[.\[]/) ? 'Component.*' : '',
        run: wires.some((w: Json) => w.toId === n.id && w.toProperty === 'run'),
        disp: disp?.kind, reason: disp?.reason, compKinds: others.reduce((a: Json, k: string) => ((a[k ?? 'none'] = (a[k ?? 'none'] ?? 0) + 1), a), {}),
        planKind: plan?.kind ?? plan?.componentKind ?? Object.keys(plan ?? {}).slice(0, 0).join(''),
      };
      rows.push(row);
      bump('project', row.project);
      bump('disp', `${disp?.kind}: ${String(disp?.reason ?? '').replace(/"[^"]*"/g, '"…"').slice(0, 150)}`);
      bump('topAwait', String(row.topAwait));
      bump('run', String(row.run));
      for (const m of members) bump('member', m);
    }
  }
}
fs.writeFileSync(out, JSON.stringify({ rows, tally }, null, 1));
console.log(rows.length, 'Noodl-reading Functions');
for (const [k, t] of Object.entries(tally)) { console.log(`\n## ${k}`); for (const [v, nn] of Object.entries(t).sort((a, b) => b[1] - a[1])) console.log(String(nn).padStart(4), v); }
