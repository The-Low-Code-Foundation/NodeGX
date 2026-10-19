// Usage (from packages/nodegx-export): census.ts <exportSrc> <out.json> — over ROOTS (as ../s119-fnchain-measure/dispdiff.ts):
// every wire into a Text Input's action input (Set, Focus, Blur, Clear, Insert Text, Backspace; P18-S128-FIELDSET), what
// sends it (type and port), the sender's and the field's dispositions, whether the field is drawn (rendered), and the
// sentence the wire is dropped with; and every node refused with a trigger sentence that names a field's action wire.
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
const FIELD = new Set(['net.noodl.controls.textinput', 'TextInput']);
const ACTIONS = new Set(['set', 'focus', 'blur', 'clear', 'insert', 'backspace']);
interface Row { project: string; component: string; field: string; label?: string; port: string; from: string; fromType: string; fromPort: string; fromDisp: string; fieldDisp: string; dropped?: string; valueWired: boolean; valueChain: boolean }
const rows: Row[] = [];
const refused: string[] = [];
for (const p of projects.sort()) {
  const ir = parse.parseProject(p, catalog);
  const pp = planM.planProject(ir, new cat.CatalogIndex(catalog));
  for (const c of ir.components as Json[]) {
    const plan = pp.byLegacyPath.get(`/${c.path}`);
    if (!plan) continue;
    const nodes = c.nodes as Json[], wires = c.connections as Json[];
    const byId = new Map<string, Json>(nodes.map((n) => [n.id as string, n]));
    const droppedOf = (w: Json): string | undefined => (plan.droppedWires as Json[]).find((x) => x.key === w.key)?.reason as string | undefined;
    const fieldWires = new Set<string>();
    for (const w of wires) {
      const to = byId.get(w.toId as string);
      if (!to || !FIELD.has(to.type as string) || !ACTIONS.has(w.toProperty as string)) continue;
      const from = byId.get(w.fromId as string);
      fieldWires.add(`${w.fromId}.${w.fromProperty}`);
      rows.push({
        project: path.basename(p), component: c.path as string, field: to.id as string, label: to.authoredLabel as string | undefined,
        port: w.toProperty as string, from: w.fromId as string, fromType: (from?.type as string) ?? '?', fromPort: w.fromProperty as string,
        fromDisp: plan.dispositions[w.fromId as string]?.kind ?? 'none', fieldDisp: plan.dispositions[to.id as string]?.kind ?? 'none',
        dropped: droppedOf(w),
        valueWired: wires.some((x) => x.toId === to.id && x.toProperty === 'startValue'),
        valueChain: wires.some((x) => x.fromId === to.id && (x.fromProperty === 'onTextChanged' || x.fromProperty === 'textChanged'))
      });
    }
    for (const n of nodes) {
      const d = plan.dispositions[n.id as string];
      if (d?.kind !== 'deferred') continue;
      const m = /trigger (\S+?)\.(\S+?)[ :]/.exec(d.reason);
      if (m && fieldWires.has(`${m[1]}.${m[2]}`)) refused.push(`${path.basename(p)} ${c.path} ${n.type} ${n.id} :: ${d.reason.slice(0, 160)}`);
    }
  }
}
fs.writeFileSync(out, JSON.stringify({ rows, refused }, null, 1));
const tally = <T>(xs: T[], key: (r: T) => string) => { const t: Record<string, number> = {}; for (const r of xs) t[key(r)] = (t[key(r)] ?? 0) + 1; return Object.entries(t).sort((a, b) => b[1] - a[1]); };
const show = (title: string, t: Array<[string, number]>) => { console.log(`\n${title}`); for (const [k, v] of t) console.log(String(v).padStart(4), k); };
console.log(`${rows.length} wires into a field's action input`);
show('by port:', tally(rows, (r) => r.port));
show('by port, by project:', tally(rows, (r) => `${r.port} ${r.project}`));
show('by sender:', tally(rows, (r) => `${r.port} ← ${r.fromType.startsWith('/') ? '<instance>' : r.fromType}.${r.fromPort} (${r.fromDisp})`));
show('the field\'s disposition:', tally(rows, (r) => `${r.port} ${r.fieldDisp}`));
show('the field\'s Value wired / a Value chain:', tally(rows, (r) => `${r.port} valueWired=${r.valueWired} valueChain=${r.valueChain}`));
show('the drop sentence:', tally(rows, (r) => `${r.port} ${(r.dropped ?? '(not dropped)').replace(/"[^"]*"/g, '"…"').replace(/\b[a-z0-9]{6,}\b/gi, 'ID').slice(0, 160)}`));
console.log(`\n${refused.length} nodes refused with a trigger that is a field's action wire's sender`);
for (const [k, v] of tally(refused, (r) => r.split(' ')[0])) console.log(String(v).padStart(4), k);
