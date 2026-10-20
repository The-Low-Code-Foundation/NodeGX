// Usage (from packages/nodegx-export): census.ts <exportSrc> <out.json> — over ROOTS (as ../s119-fnchain-measure/dispdiff.ts):
// every wire out of a Function's (or an Expression's, a Visual Function's) Success (P18-S129-FNSUCCESS): the component (visual or
// logic), whether Run is wired and by what, whether a value input is ticked, the Function's disposition and reason, what the
// wire drives, the target's disposition, and the sentence the wire is dropped with; and every node refused with a reason
// that names a Success wire or the "only done continues a Run chain" sentence.
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
const FN = new Set(['JavaScriptFunction', 'Expression', 'net.noodl.JavaScriptFunction']);
interface Row { project: string; component: string; visual: boolean; fn: string; fnType: string; label?: string; runWired: string; ticked: string[]; fnDisp: string; fnReason?: string; toType: string; toPort: string; toDisp: string; toReason?: string; dropped?: string; doneWired: boolean }
const rows: Row[] = [];
const refused: string[] = [];
const isTicked = (n: Json, input: string): boolean => {
  const ps = (n.parameters ?? []) as Array<{ name: string; value: { kind: string; value?: unknown } }>;
  const v = ps.find((x) => x.name === `runOnChange-in-${input}` || x.name === `runOnChange-${input}`)?.value;
  return !(v?.kind === 'literal' && v.value === false);
};
for (const p of projects.sort()) {
  const ir = parse.parseProject(p, catalog);
  const pp = planM.planProject(ir, new cat.CatalogIndex(catalog));
  for (const c of ir.components as Json[]) {
    const plan = pp.byLegacyPath.get(`/${c.path}`);
    if (!plan) continue;
    const nodes = c.nodes as Json[], wires = c.connections as Json[];
    const byId = new Map<string, Json>(nodes.map((n) => [n.id as string, n]));
    const droppedOf = (w: Json): string | undefined => (plan.droppedWires as Json[]).find((x) => x.key === w.key)?.reason as string | undefined;
    const visual = plan.file !== null;
    for (const w of wires) {
      if (w.fromProperty !== 'success') continue;
      const fn = byId.get(w.fromId as string);
      if (!fn) continue;
      const to = byId.get(w.toId as string);
      const runW = wires.filter((x) => x.toId === fn.id && x.toProperty === 'run').map((x) => `${byId.get(x.fromId as string)?.type ?? '?'}.${x.fromProperty}`);
      const inputs = wires.filter((x) => x.toId === fn.id && String(x.toProperty).startsWith('in-')).map((x) => String(x.toProperty).slice(3));
      const fd = plan.dispositions[fn.id as string], td = plan.dispositions[w.toId as string];
      rows.push({
        project: path.basename(p), component: c.path as string, visual, fn: fn.id as string, fnType: fn.type as string, label: fn.authoredLabel as string | undefined,
        runWired: runW.join(',') || '(none)', ticked: [...new Set(inputs)].filter((i) => isTicked(fn, i)),
        fnDisp: fd?.kind ?? 'none', fnReason: fd?.kind === 'deferred' ? fd.reason : undefined,
        toType: (to?.type as string) ?? '?', toPort: w.toProperty as string, toDisp: td?.kind ?? 'none', toReason: td?.kind === 'deferred' ? td.reason : undefined,
        dropped: droppedOf(w), doneWired: wires.some((x) => x.fromId === fn.id && x.fromProperty === 'done')
      });
    }
    for (const n of nodes) {
      const d = plan.dispositions[n.id as string];
      if (d?.kind !== 'deferred') continue;
      if (/success/.test(d.reason)) refused.push(`${path.basename(p)} ${visual ? 'V' : 'L'} ${c.path} ${n.type} ${n.id} :: ${d.reason.slice(0, 200)}`);
    }
  }
}
fs.writeFileSync(out, JSON.stringify({ rows, refused }, null, 1));
const tally = <T>(xs: T[], key: (r: T) => string) => { const t: Record<string, number> = {}; for (const r of xs) t[key(r)] = (t[key(r)] ?? 0) + 1; return Object.entries(t).sort((a, b) => b[1] - a[1]); };
const show = (title: string, t: Array<[string, number]>) => { console.log(`\n${title}`); for (const [k, v] of t) console.log(String(v).padStart(4), k); };
const short = (s?: string) => (s ?? '').replace(/"[^"]*"/g, '"…"').slice(0, 150);
console.log(`${rows.length} wires out of a Success (${new Set(rows.map((r) => r.project + r.component + r.fn)).size} Functions); visual ${rows.filter((r) => r.visual).length}, logic ${rows.filter((r) => !r.visual).length}`);
const V = rows.filter((r) => r.visual);
show('visual, by project:', tally(V, (r) => r.project));
show('visual, by sender type / Run wired / ticked:', tally(V, (r) => `${r.fnType} run=${r.runWired} ticked=${r.ticked.length > 0 ? r.ticked.join('+') : '-'} done=${r.doneWired}`));
show('visual, by target:', tally(V, (r) => `${r.toType.startsWith('/') ? '<instance>' : r.toType}.${r.toPort}`));
show('visual, the Function\'s disposition:', tally(V, (r) => `${r.fnDisp} ${short(r.fnReason)}`));
show('visual, the drop sentence:', tally(V, (r) => short(r.dropped ?? '(not dropped)')));
show('logic, by sender / Run wired:', tally(rows.filter((r) => !r.visual), (r) => `${r.fnType} run=${r.runWired ? (r.runWired === '(none)' ? 'none' : 'wired') : ''} ticked=${r.ticked.length > 0}`));
console.log('\nvisual rows:');
for (const r of V) console.log(` ${r.project} ${r.component} ${r.fn} [${r.label}] run=${r.runWired} ticked=${r.ticked.join('+') || '-'} → ${r.toType}.${r.toPort} (${r.toDisp}) fn=${r.fnDisp}: ${short(r.fnReason)} | drop: ${short(r.dropped)}`);
console.log(`\n${refused.length} nodes refused with a reason naming success`);
for (const r of refused) console.log(' ', r);
