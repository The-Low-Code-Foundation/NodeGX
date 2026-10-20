// Usage (from packages/nodegx-export): census.ts <exportSrc> <out.json> — over ROOTS (as ../s119-fnchain-measure/dispdiff.ts):
// every Set Variable with a wire out of Done, Failure or Completed (P18-S127-SETDONE): the Set's own disposition, what each
// wire drives (type, port, disposition), whether the chain's targets read the variable the Set writes, and the nodes
// refused "trigger <set>.done is not a rendered element event or a receiver".
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
interface Row { project: string; component: string; set: string; label?: string; name?: string; setDisp: string; port: string; to: string; toType: string; toPort: string; toDisp: string; toReason?: string; readsVar: boolean; dropped?: string }
const rows: Row[] = [];
const refused: string[] = [];
const paramOf = (n: Json, k: string): unknown => (n.parameters as Json[]).find((p) => p.name === k)?.value;
for (const p of projects.sort()) {
  const ir = parse.parseProject(p, catalog);
  const pp = planM.planProject(ir, new cat.CatalogIndex(catalog));
  for (const c of ir.components as Json[]) {
    const plan = pp.byLegacyPath.get(`/${c.path}`);
    if (!plan) continue;
    const nodes = c.nodes as Json[], wires = c.connections as Json[];
    const byId = new Map<string, Json>(nodes.map((n) => [n.id as string, n]));
    const droppedOf = (w: Json): string | undefined => (plan.droppedWires as Json[]).find((x) => x.key === w.key)?.reason as string | undefined;
    // Whether `id` reads (through value wires, a few hops) a Variable named `name`.
    const reads = (id: string, name: string, seen = new Set<string>()): boolean => {
      if (seen.has(id)) return false;
      seen.add(id);
      for (const w of wires) {
        if (w.toId !== id) continue;
        const from = byId.get(w.fromId as string);
        if (!from) continue;
        if ((from.type === 'Variable' || from.type === 'Variable2') && paramOf(from, 'name') === name) return true;
        if (from.type !== 'Set Variable' && reads(from.id as string, name, seen)) return true;
      }
      return false;
    };
    for (const n of nodes) {
      if (n.type === 'Set Variable') {
        for (const w of wires) {
          if (w.fromId !== n.id || !['done', 'failure', 'completed'].includes(w.fromProperty as string)) continue;
          const to = byId.get(w.toId as string);
          if (!to) continue;
          const d = plan.dispositions[to.id as string];
          rows.push({ project: path.basename(p), component: c.path as string, set: n.id as string, label: n.authoredLabel as string | undefined, name: paramOf(n, 'name') as string | undefined, setDisp: plan.dispositions[n.id as string]?.kind ?? 'none', port: w.fromProperty as string, to: to.id as string, toType: to.type as string, toPort: w.toProperty as string, toDisp: d?.kind ?? 'none', toReason: d?.reason, readsVar: reads(to.id as string, paramOf(n, 'name') as string), dropped: droppedOf(w) });
        }
      }
      const d = plan.dispositions[n.id as string];
      // The base's sentence, and the tree's (P18-S127-SETDONE): "trigger <set>.done: the Set Variable …".
      const m = d?.kind === 'deferred' ? /^trigger (\S+?)\.(\S+?)(?: is not a rendered element event or a receiver|: the Set Variable)/.exec(d.reason) : null;
      if (m && byId.get(m[1])?.type === 'Set Variable') refused.push(`${path.basename(p)} ${c.path} ${n.type} ${n.id}`);
    }
  }
}
fs.writeFileSync(out, JSON.stringify({ rows, refused }, null, 1));
const tally = <T>(xs: T[], key: (r: T) => string) => { const t: Record<string, number> = {}; for (const r of xs) t[key(r)] = (t[key(r)] ?? 0) + 1; return Object.entries(t).sort((a, b) => b[1] - a[1]); };
console.log(`${refused.length} nodes refused with a Set Variable's output as their trigger`);
for (const [k, v] of tally(refused, (r) => r.split(' ')[0])) console.log(String(v).padStart(4), k);
console.log(`\n${rows.length} wires out of a Set Variable's Done/Failure/Completed (${new Set(rows.map((r) => r.set)).size} Sets); by port, target type/port, target disposition:`);
for (const [k, v] of tally(rows, (r) => `${r.port} → ${r.toType.startsWith('/') ? '<instance>' : r.toType}.${r.toPort.replace(/^to-.*/, 'to-<state>')} ${r.toDisp}`)) console.log(String(v).padStart(4), k);
console.log('\nthe Set\'s own disposition:'); for (const [k, v] of tally(rows, (r) => r.setDisp)) console.log(String(v).padStart(4), k);
console.log('\na chain target that reads the variable the Set writes:', rows.filter((r) => r.readsVar).length);
for (const r of rows.filter((x) => x.readsVar)) console.log('   ', r.project, r.component, r.set, r.name, '→', r.toType, r.toPort);
console.log('\nthe wire\'s drop sentence:'); for (const [k, v] of tally(rows, (r) => (r.dropped ?? '(not dropped)').replace(/"[^"]*"/g, '"…"').replace(/\b[a-z0-9]{6,}\b/gi, 'ID').slice(0, 150))) console.log(String(v).padStart(4), k);
console.log('\nthe target\'s refusal when deferred:'); for (const [k, v] of tally(rows.filter((r) => r.toDisp === 'deferred'), (r) => (r.toReason ?? '').replace(/"[^"]*"/g, '"…"').replace(/\b[a-z0-9]{6,}\b/gi, 'ID').slice(0, 150))) console.log(String(v).padStart(4), k);
