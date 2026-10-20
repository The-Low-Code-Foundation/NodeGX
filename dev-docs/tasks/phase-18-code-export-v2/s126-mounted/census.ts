// Usage (from packages/nodegx-export): census.ts <exportSrc> <out.json> — over ROOTS (as dispdiff.ts): every node the
// export refuses because its trigger is not drawn or not run (EXP-011 §91), grouped by the element that gates it and by
// what feeds that element's Mounted: the feeder node's type and port, and why the wire is not carried.
import * as fs from 'fs';
import * as path from 'path';
const [E, out] = process.argv.slice(2);
const roots = (process.env.ROOTS ?? '').split(':').filter(Boolean);
const projects: string[] = [];
const walkDir = (d: string, depth: number) => { if (depth > 3) return; let ents: fs.Dirent[] = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } if (ents.some((e) => e.name === 'nodegx.project.json')) { projects.push(d); return; } for (const e of ents) if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) walkDir(path.join(d, e.name), depth + 1); };
for (const r of roots) walkDir(r, 0);
type Json = Record<string, unknown>;
const cat = require(`${E}/catalog`), parse = require(`${E}/parse/parseProject`), planM = require(`${E}/analyze/plan`);
const catalog = cat.loadCatalog();
interface Row { project: string; component: string; node: string; type: string; label?: string; owner: string; gate: string; gateLabel?: string; feeder: string; feederPort: string; feederType: string; why: string; reason: string }
const rows: Row[] = [];
for (const p of projects.sort()) {
  const ir = parse.parseProject(p, catalog);
  const pp = planM.planProject(ir, new cat.CatalogIndex(catalog));
  for (const c of ir.components) {
    const plan = pp.byLegacyPath.get(`/${c.path}`);
    if (!plan || plan.file === null) continue;
    const byId = new Map<string, Json>(c.nodes.map((n: Json) => [n.id as string, n]));
    for (const n of c.nodes as Json[]) {
      const d = plan.dispositions[n.id as string];
      if (d?.kind !== 'deferred') continue;
      const m = /its trigger, (?:the Did Mount of )?(?:"[^"]*" \(([^)\s]+)\)|\S+ (\S+)), is not (drawn|run): (.*)$/.exec(d.reason);
      if (!m) continue;
      const owner = m[1] ?? m[2];
      // The gate: the element (owner or above) the sentence names.
      let gate = owner;
      const above = /an element above it, (?:"[^"]*" \(([^)\s]+)\)|\S+ (\S+)), is/.exec(m[4]);
      if (above) gate = above[1] ?? above[2];
      const wire = (c.connections as Json[]).find((w) => w.toId === gate && w.toProperty === 'mounted');
      const from = wire ? byId.get(wire.fromId as string) : undefined;
      const fd = wire ? plan.dispositions[wire.fromId as string] : undefined;
      rows.push({
        project: path.basename(p), component: c.path, node: n.id as string, type: n.type as string, label: n.authoredLabel as string | undefined,
        owner, gate, gateLabel: byId.get(gate)?.authoredLabel as string | undefined,
        feeder: wire ? (wire.fromId as string) : '(none)', feederPort: wire ? (wire.fromProperty as string) : '', feederType: from ? (from.type as string) : '(none)',
        why: m[3] === 'run' ? 'didMount-not-run' : (m[4].includes('authored Mounted false') ? 'authored-false-wire' : m[4].includes('statically false') ? 'static-false' : 'other'),
        reason: d.reason + (fd ? ` || feeder disp: ${JSON.stringify(fd).slice(0, 300)}` : '')
      });
    }
  }
}
fs.writeFileSync(out, JSON.stringify(rows, null, 1));
const tally = (key: (r: Row) => string) => { const t: Record<string, number> = {}; for (const r of rows) t[key(r)] = (t[key(r)] ?? 0) + 1; return Object.entries(t).sort((a, b) => b[1] - a[1]); };
console.log(rows.length, 'nodes refused for an unreached trigger');
console.log('\nby why/feeder type:'); for (const [k, v] of tally((r) => `${r.why} ${r.feederType.startsWith('/') ? '<instance>' : r.feederType}`)) console.log(String(v).padStart(4), k);
console.log('\nby gate:'); for (const [k, v] of tally((r) => `${r.project} ${r.component} gate=${r.gateLabel ?? r.gate} feeder=${r.feederType}.${r.feederPort}`)) console.log(String(v).padStart(4), k);
