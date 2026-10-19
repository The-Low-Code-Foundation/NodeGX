// Usage (from packages/nodegx-export): census.ts <exportSrc> <out.json> — over ROOTS (as ../s119-fnchain-measure/dispdiff.ts):
// every wire out of a For Each's relayed row value (`itemOutput-<name>`, EXP-011 §31/§96.5.1): the holder (visual or logic),
// what it drives, what feeds the row template's output (a pass-through of one of its Component Inputs ports, or a node),
// whether the repeater relays a row signal at all (the runtime copies the row's outputs only when one fires), the
// repeater's and the target's dispositions, and the sentence the wire is dropped with.
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
interface Row { project: string; holder: string; visual: boolean; forEach: string; output: string; toType: string; toPort: string; feed: string; signals: number; repeaterDisp: string; toDisp: string; dropped?: string }
const rows: Row[] = [];
for (const p of projects.sort()) {
  const ir = parse.parseProject(p, catalog);
  const pp = planM.planProject(ir, new cat.CatalogIndex(catalog));
  const byPath = new Map<string, Json>((ir.components as Json[]).map((c) => [`/${c.path}`, c]));
  for (const c of ir.components as Json[]) {
    const plan = pp.byLegacyPath.get(`/${c.path}`);
    if (!plan) continue;
    const nodes = c.nodes as Json[], wires = c.connections as Json[];
    const byId = new Map<string, Json>(nodes.map((n) => [n.id as string, n]));
    const droppedOf = (w: Json): string | undefined => {
      const head = `wire ${w.key} dropped: `;
      const note = (plan.notes as string[]).find((n) => n.startsWith(head) || n.includes(` ${head}`));
      return note === undefined ? undefined : note.slice(note.indexOf(head) + head.length);
    };
    for (const w of wires) {
      const fe = byId.get(w.fromId as string);
      if (fe?.type !== 'For Each' || !String(w.fromProperty).startsWith('itemOutput-')) continue;
      const output = String(w.fromProperty).slice('itemOutput-'.length);
      const tplParam = ((fe.parameters ?? []) as Array<{ name: string; value: { kind: string; value?: unknown } }>).find((x) => x.name === 'template')?.value;
      const tpl = byPath.get(String(tplParam?.value ?? ''));
      let feed = 'no template';
      if (tpl) {
        const tn = tpl.nodes as Json[], tw = tpl.connections as Json[];
        const tById = new Map<string, Json>(tn.map((n) => [n.id as string, n]));
        const into = tw.filter((x) => tById.get(x.toId as string)?.type === 'Component Outputs' && x.toProperty === output);
        feed = into.length === 0 ? 'nothing feeds the row output' : into.length > 1 ? `${into.length} wires` : (() => { const f = tById.get(into[0].fromId as string)!; return f.type === 'Component Inputs' ? `pass-through of input "${into[0].fromProperty}"` : `${String(f.type).startsWith('/') ? '<instance>' : f.type}.${into[0].fromProperty}`; })();
      }
      const to = byId.get(w.toId as string);
      rows.push({
        project: path.basename(p), holder: c.path as string, visual: plan.file !== null, forEach: fe.id as string, output,
        toType: (to?.type as string) ?? '?', toPort: w.toProperty as string, feed,
        signals: wires.filter((x) => x.fromId === fe.id && String(x.fromProperty).startsWith('itemOutputSignal-')).length,
        repeaterDisp: plan.dispositions[fe.id as string]?.kind ?? 'none', toDisp: plan.dispositions[w.toId as string]?.kind ?? 'none', dropped: droppedOf(w)
      });
    }
  }
}
fs.writeFileSync(out, JSON.stringify(rows, null, 1));
const tally = <T>(xs: T[], key: (r: T) => string) => { const t: Record<string, number> = {}; for (const r of xs) t[key(r)] = (t[key(r)] ?? 0) + 1; return Object.entries(t).sort((a, b) => b[1] - a[1]); };
const show = (title: string, t: Array<[string, number]>) => { console.log(`\n${title}`); for (const [k, v] of t) console.log(String(v).padStart(4), k); };
const short = (s?: string) => (s ?? '(not dropped)').replace(/"[^"]*"/g, '"…"').slice(0, 150);
const V = rows.filter((r) => r.visual);
console.log(`${rows.length} relayed row value wires; in visual holders ${V.length}`);
show('visual, by target:', tally(V, (r) => `${r.toType.startsWith('/') ? '<instance>' : r.toType}.${r.toType === 'Component Outputs' ? 'value' : r.toPort}`));
show('visual, by project:', tally(V, (r) => r.project));
show('visual, the row output\'s feed:', tally(V, (r) => r.feed.replace(/"[^"]*"/, '"…"')));
show('visual, row signals relayed:', tally(V, (r) => (r.signals > 0 ? 'some' : 'none')));
show('visual, the repeater\'s disposition:', tally(V, (r) => r.repeaterDisp));
show('visual, the drop sentence:', tally(V, (r) => `${r.toType === 'Component Outputs' ? 'CO' : 'other'} ${short(r.dropped)}`));
console.log('\nvisual rows into a Component Outputs value:');
for (const r of V.filter((x) => x.toType === 'Component Outputs')) console.log(` ${r.project} ${r.holder} ${r.forEach}.${r.output} → ${r.toPort} | ${r.feed} | signals ${r.signals} | ${r.repeaterDisp} | ${short(r.dropped)}`);
