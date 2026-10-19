// Usage (from packages/nodegx-export): census.ts <exportSrc> <out.json> — over ROOTS (as ../s119-fnchain-measure/dispdiff.ts):
// every wire out of a Component Inputs port the parent drives with a signal (P18-S126-INSIGNAL), inside the component:
// the node it drives and its port, that node's disposition; and on the parent's side, every wire into an instance's
// signal input: the sender's type and port, what the plan said of it (its notes).
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
interface Inner { project: string; component: string; port: string; to: string; toType: string; toPort: string; disp: string; reason?: string; dropped?: string }
interface Outer { project: string; component: string; instance: string; target: string; port: string; from: string; fromType: string; fromPort: string; note?: string }
const inner: Inner[] = [], outer: Outer[] = [];
const refusedBy: Record<string, string[]> = {};
for (const p of projects.sort()) {
  const ir = parse.parseProject(p, catalog);
  const pp = planM.planProject(ir, new cat.CatalogIndex(catalog));
  const comps = new Map<string, Json>(ir.components.map((c: Json) => [`/${c.path}`, c]));
  // A component's signal inputs: Component Inputs ports typed signal, or wired into a trigger and fed by a signal.
  const signalPortsOf = (c: Json): Set<string> => {
    const s = new Set<string>();
    for (const n of c.nodes as Json[]) {
      if (n.type !== 'Component Inputs') continue;
      for (const port of n.declaredPorts as Json[]) if (port.plug === 'output' && port.kind === 'signal') s.add(port.name as string);
    }
    return s;
  };
  for (const c of ir.components as Json[]) {
    const plan = pp.byLegacyPath.get(`/${c.path}`);
    if (!plan) continue;
    const byId = new Map<string, Json>((c.nodes as Json[]).map((n) => [n.id as string, n]));
    const droppedOf = (w: Json): string | undefined => (plan.droppedWires as Json[]).find((x) => x.key === w.key)?.reason as string | undefined;
    for (const w of c.connections as Json[]) {
      const from = byId.get(w.fromId as string), to = byId.get(w.toId as string);
      if (!from || !to) continue;
      if (from.type === 'Component Inputs') {
        const d = plan.dispositions[to.id as string];
        const reason = d?.reason as string | undefined;
        if (!(reason ?? '').includes(`trigger ${w.fromId}.${w.fromProperty} is not a rendered element event`) && !signalPortsOf(c).has(w.fromProperty as string)) continue;
        inner.push({ project: path.basename(p), component: c.path as string, port: w.fromProperty as string, to: to.id as string, toType: to.type as string, toPort: w.toProperty as string, disp: d?.kind ?? 'none', reason, dropped: droppedOf(w) });
      }
      const target = comps.get(to.type as string);
      if (target && signalPortsOf(target).has(w.toProperty as string)) {
        const note = droppedOf(w);
        outer.push({ project: path.basename(p), component: c.path as string, instance: to.id as string, target: to.type as string, port: w.toProperty as string, from: from.id as string, fromType: from.type as string, fromPort: w.fromProperty as string, note });
      }
    }
    for (const n of c.nodes as Json[]) {
      const d = plan.dispositions[n.id as string];
      const m = d?.kind === 'deferred' ? /^trigger (\S+)\.(\S+) is not a rendered element event or a receiver/.exec(d.reason) : null;
      if (!m) continue;
      const src = byId.get(m[1]);
      const k = `${src?.type === 'Component Inputs' ? 'Component Inputs' : src?.type ?? '?'}`;
      (refusedBy[k] = refusedBy[k] ?? []).push(`${path.basename(p)} ${c.path} ${n.type}`);
    }
  }
}
fs.writeFileSync(out, JSON.stringify({ inner, outer, refusedBy }, null, 1));
const tally = <T>(rows: T[], key: (r: T) => string) => { const t: Record<string, number> = {}; for (const r of rows) t[key(r)] = (t[key(r)] ?? 0) + 1; return Object.entries(t).sort((a, b) => b[1] - a[1]); };
console.log('nodes refused "trigger … is not a rendered element event or a receiver", by the trigger\'s type:');
for (const [k, v] of Object.entries(refusedBy).sort((a, b) => b[1].length - a[1].length)) console.log(String(v.length).padStart(4), k);
console.log(`\ninside: ${inner.length} wires out of a signal Component Input; by target type/port and disposition:`);
for (const [k, v] of tally(inner, (r) => `${r.toType.startsWith('/') ? '<instance>' : r.toType}.${r.toPort.replace(/^to-.*/, 'to-<state>')} ${r.disp}`)) console.log(String(v).padStart(4), k);
console.log('\nby project:'); for (const [k, v] of tally(inner, (r) => r.project)) console.log(String(v).padStart(4), k);
console.log(`\noutside: ${outer.length} wires into an instance's signal input; by sender type/port:`);
for (const [k, v] of tally(outer, (r) => `${r.fromType.startsWith('/') ? '<instance>' : r.fromType}.${r.fromPort}`)) console.log(String(v).padStart(4), k);
console.log('\ninner dropped:'); for (const [k, v] of tally(inner, (r) => (r.dropped ?? '(kept)').replace(/"[^"]*"/g, '"…"').slice(0, 140))) console.log(String(v).padStart(4), k);
console.log('\nouter dropped:'); for (const [k, v] of tally(outer, (r) => (r.note ?? '(no note)').replace(/"[^"]*"/g, '"…"').replace(/\b[a-z0-9]{6,}\b/gi, 'ID').slice(0, 160))) console.log(String(v).padStart(4), k);
