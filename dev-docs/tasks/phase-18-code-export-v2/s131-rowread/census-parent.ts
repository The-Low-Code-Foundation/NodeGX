// Usage (from packages/nodegx-export): census-parent.ts <exportSrc> <out.json> — over ROOTS (as ../s119-fnchain-measure/dispdiff.ts):
// every wire out of a placed component's value output into a logic node's input in the parent (EXP-011 §99.6.2, todo-list's
// `tdSelectFromList`): whether the child lifts that output, the sink's trigger wires (a signal of the SAME instance, another
// instance, an element), the sink's disposition and reason.
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
interface Row { project: string; holder: string; inst: string; childPath: string; childVisual: boolean; lifted: boolean; port: string; sink: string; sinkType: string; sinkPort: string; triggers: string[]; sameInstanceSignal: boolean; sinkDisp: string; reason?: string }
const rows: Row[] = [];
const LOGIC = new Set(['Set Variable', 'JavaScriptFunction', 'Expression', 'Condition', 'String Format', 'Set Object Properties', 'Inverter', 'And', 'Or', 'Switch', 'Counter', 'States']);
for (const p of projects.sort()) {
  const ir = parse.parseProject(p, catalog);
  const pp = planM.planProject(ir, new cat.CatalogIndex(catalog));
  for (const c of ir.components as Json[]) {
    const plan = pp.byLegacyPath.get(`/${c.path}`);
    if (!plan || plan.file === null) continue;
    const nodes = c.nodes as Json[], wires = c.connections as Json[];
    const byId = new Map<string, Json>(nodes.map((n) => [n.id as string, n]));
    for (const w of wires) {
      const from = byId.get(w.fromId as string), to = byId.get(w.toId as string);
      if (!from || !to || !String(from.type).startsWith('/') || !LOGIC.has(String(to.type))) continue;
      const child = pp.byLegacyPath.get(String(from.type));
      if (child === undefined) continue;
      const isSignalOut = (child.outputProps ?? []).some((o: Json) => o.port === w.fromProperty);
      if (isSignalOut) continue; // a signal, not a value
      const triggers = wires.filter((x) => x.toId === w.toId && x.key !== w.key && ['do', 'run', 'eval'].includes(String(x.toProperty)));
      const d = plan.dispositions[w.toId as string];
      rows.push({
        project: path.basename(p), holder: c.path as string, inst: from.id as string, childPath: String(from.type), childVisual: child.file !== null,
        lifted: (child.liftedOutputProps ?? []).some((l: Json) => l.port === w.fromProperty), port: w.fromProperty as string,
        sink: to.id as string, sinkType: String(to.type), sinkPort: w.toProperty as string,
        triggers: triggers.map((x) => `${x.fromId === from.id ? 'SAME ' : String(byId.get(x.fromId as string)?.type).startsWith('/') ? 'INST ' : ''}${x.fromId}.${x.fromProperty}→${x.toProperty}`),
        sameInstanceSignal: triggers.some((x) => x.fromId === from.id), sinkDisp: d?.kind ?? 'none', reason: d?.reason
      });
    }
  }
}
fs.writeFileSync(out, JSON.stringify(rows, null, 1));
const tally = <T>(xs: T[], key: (r: T) => string) => { const t: Record<string, number> = {}; for (const r of xs) t[key(r)] = (t[key(r)] ?? 0) + 1; return Object.entries(t).sort((a, b) => b[1] - a[1]); };
const show = (title: string, t: Array<[string, number]>) => { console.log(`\n${title}`); for (const [k, v] of t) console.log(String(v).padStart(4), k); };
console.log(`${rows.length} wires from a placed component's value output into a logic node in a visual parent`);
show('child visual / lifts the output:', tally(rows, (r) => `visual ${r.childVisual} lifted ${r.lifted}`));
show('sink type:', tally(rows, (r) => r.sinkType));
show('lifted, by trigger:', tally(rows.filter((r) => r.lifted), (r) => (r.sameInstanceSignal ? 'the same instance\'s signal' : r.triggers.length === 0 ? 'no trigger (reactive)' : 'another trigger')));
show('lifted, sink disposition:', tally(rows.filter((r) => r.lifted), (r) => `${r.sinkDisp} ${(r.reason ?? '').replace(/"[^"]*"/g, '"…"').slice(0, 120)}`));
show('lifted, by project:', tally(rows.filter((r) => r.lifted), (r) => r.project));
console.log('\nlifted, the same instance\'s signal:');
for (const r of rows.filter((x) => x.lifted && x.sameInstanceSignal)) console.log(` ${r.project} ${r.holder} ${r.inst}.${r.port} → ${r.sink}(${r.sinkType}).${r.sinkPort} | ${r.triggers.join('; ')} | ${r.sinkDisp} ${(r.reason ?? '').slice(0, 120)}`);
