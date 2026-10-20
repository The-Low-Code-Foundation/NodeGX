// Usage (from packages/nodegx-export): census.ts <exportSrc> <out.json> — over ROOTS (as ../s119-fnchain-measure/dispdiff.ts):
// every wire out of a For Each's relayed row value (`itemOutput-<name>`) into a node that is NOT a Component Outputs port or
// a placed component (EXP-011 §99.6.1: the value read inside its holder). For each: the sink, its disposition and reason,
// every trigger wire into the sink (and whether it is a row signal of the SAME repeater, directly), and what feeds the row
// template's output.
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
const index = new cat.CatalogIndex(catalog);
interface Row { project: string; holder: string; forEach: string; output: string; sink: string; sinkType: string; sinkPort: string; sinkDisp: string; sinkReason?: string; triggers: string[]; sameRowSignal: boolean; feed: string; label?: string }
const rows: Row[] = [];
for (const p of projects.sort()) {
  const ir = parse.parseProject(p, catalog);
  const pp = planM.planProject(ir, index);
  const byPath = new Map<string, Json>((ir.components as Json[]).map((c) => [`/${c.path}`, c]));
  for (const c of ir.components as Json[]) {
    const plan = pp.byLegacyPath.get(`/${c.path}`);
    if (!plan || plan.file === null) continue;
    const nodes = c.nodes as Json[], wires = c.connections as Json[];
    const byId = new Map<string, Json>(nodes.map((n) => [n.id as string, n]));
    for (const w of wires) {
      const fe = byId.get(w.fromId as string);
      if (fe?.type !== 'For Each' || !String(w.fromProperty).startsWith('itemOutput-')) continue;
      const to = byId.get(w.toId as string);
      const toType = String(to?.type ?? '?');
      if (toType === 'Component Outputs' || toType.startsWith('/')) continue;
      const output = String(w.fromProperty).slice('itemOutput-'.length);
      const tplParam = ((fe.parameters ?? []) as Array<{ name: string; value: { kind: string; value?: unknown } }>).find((x) => x.name === 'template')?.value;
      const tpl = byPath.get(String(tplParam?.value ?? ''));
      let feed = 'no template';
      if (tpl) {
        const tn = tpl.nodes as Json[], tw = tpl.connections as Json[];
        const tById = new Map<string, Json>(tn.map((n) => [n.id as string, n]));
        const into = tw.filter((x) => tById.get(x.toId as string)?.type === 'Component Outputs' && x.toProperty === output);
        feed = into.length === 0 ? 'nothing' : into.length > 1 ? `${into.length} wires` : (() => { const f = tById.get(into[0].fromId as string)!; return f.type === 'Component Inputs' ? `pass-through "${into[0].fromProperty}"` : `${String(f.type).startsWith('/') ? '<instance>' : f.type}.${into[0].fromProperty}`; })();
      }
      // trigger wires: any wire into the sink from a signal-kind source port
      const trig = wires.filter((x) => x.toId === w.toId && x.key !== w.key).filter((x) => {
        const src = byId.get(x.fromId as string);
        const fp = String(x.fromProperty);
        if (src?.type === 'For Each') return fp.startsWith('itemOutputSignal-');
        const k = index.portKind ? index.portKind(String(src?.type), fp) : undefined;
        return k === 'signal' || ['do', 'run', 'evaluate', 'fetch'].includes(String(x.toProperty).toLowerCase());
      });
      const d = plan.dispositions[w.toId as string];
      rows.push({
        project: path.basename(p), holder: c.path as string, forEach: fe.id as string, output, sink: w.toId as string, sinkType: toType, sinkPort: w.toProperty as string,
        sinkDisp: d?.kind ?? 'none', sinkReason: d?.reason, label: to?.authoredLabel as string | undefined,
        triggers: trig.map((x) => `${byId.get(x.fromId as string)?.type === 'For Each' ? (x.fromId === fe.id ? 'SAME ' : 'OTHER ') : ''}${x.fromId}.${x.fromProperty} → ${x.toProperty}`),
        sameRowSignal: trig.some((x) => x.fromId === fe.id && String(x.fromProperty).startsWith('itemOutputSignal-')), feed
      });
    }
  }
}
fs.writeFileSync(out, JSON.stringify(rows, null, 1));
const tally = <T>(xs: T[], key: (r: T) => string) => { const t: Record<string, number> = {}; for (const r of xs) t[key(r)] = (t[key(r)] ?? 0) + 1; return Object.entries(t).sort((a, b) => b[1] - a[1]); };
const show = (title: string, t: Array<[string, number]>) => { console.log(`\n${title}`); for (const [k, v] of t) console.log(String(v).padStart(4), k); };
const short = (s?: string) => (s ?? '(none)').replace(/"[^"]*"/g, '"…"').slice(0, 160);
console.log(`${rows.length} relayed row value wires into a logic sink in a visual holder`);
show('by sink type:', tally(rows, (r) => `${r.sinkType}.${r.sinkType === 'Set Variable' ? r.sinkPort : r.sinkType.startsWith('Java') ? 'in-*' : r.sinkPort}`));
show('triggered directly by the same repeater\'s row signal:', tally(rows, (r) => String(r.sameRowSignal)));
show('the row output\'s feed:', tally(rows, (r) => r.feed.replace(/"[^"]*"/, '"…"')));
show('sink disposition:', tally(rows, (r) => `${r.sinkDisp} ${short(r.sinkReason)}`));
console.log('\nrows:');
for (const r of rows) console.log(` ${r.project} ${r.holder} ${r.forEach}.${r.output} → ${r.sink}(${r.sinkType}${r.label ? ' "' + r.label + '"' : ''}).${r.sinkPort} | ${r.feed} | trig: ${r.triggers.join('; ') || '-'} | ${r.sinkDisp} ${short(r.sinkReason)}`);
