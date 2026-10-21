// Usage (from packages/nodegx-export): census.ts <exportSrc> <out.json> — over ROOTS: every JavaScriptFunction with a host
// trait and no Run wire (EXP-019 slice 2), its shape: traits, inputs (wired from what, literal, unticked), what reads its
// value outputs, which signals / built-in outputs are wired, and what else stands in front (its disposition today).
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
    const byId = new Map<string, Json>(nodes.map((n) => [n.id, n]));
    for (const n of nodes) {
      if (n.type !== 'JavaScriptFunction') continue;
      const pv = n.parameters.find((x: Json) => x.name === 'functionScript')?.value; const body = pv?.source ?? pv?.value;
      if (typeof body !== 'string' || body.trim() === '') continue;
      const traits: string[] = js.jsHostTraitsOf(body);
      if (traits.length === 0) continue;
      if (wires.some((w) => w.toId === n.id && w.toProperty === 'run')) continue;
      const disp = plan?.dispositions?.[n.id];
      const inputs = wires.filter((w) => w.toId === n.id).map((w) => {
        const from = byId.get(w.fromId);
        const box = n.parameters.find((x: Json) => x.name === `runOnChange-${w.toProperty}`)?.value?.value;
        return `${w.toProperty}<-${from?.type ?? '?'}.${w.fromProperty}${box === false ? ' [unticked]' : ''}`;
      });
      const literals = n.parameters.filter((x: Json) => String(x.name).startsWith('in-')).map((x: Json) => x.name);
      const outs = wires.filter((w) => w.fromId === n.id).map((w) => `${w.fromProperty}->${byId.get(w.toId)?.type ?? '?'}.${w.toProperty}`);
      const signalCalls = [...body.matchAll(/\bOutputs\s*\.\s*([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]);
      const row = { project: path.basename(p), component: c.path, node: n.id, label: n.authoredLabel, traits, disp: disp?.kind, reason: disp?.reason, inputs, literals, outs, signalCalls: [...new Set(signalCalls)], lines: body.split('\n').length };
      rows.push(row);
      bump('project', row.project);
      for (const t of traits) bump('trait', t);
      bump('inputs', inputs.length === 0 ? (literals.length === 0 ? 'none' : 'literals only') : 'wired');
      for (const i of inputs) bump('input from', i.replace(/^in-[^<]*<-/, '').replace(/\[unticked\]/, '').trim() + (i.includes('unticked') ? ' UNTICKED' : ''));
      for (const o of outs) bump('out', o.replace(/^out-[^-]*->|^([a-z]+)->/, (m, b) => (b ? b + '->' : 'out->')));
      bump('signals', signalCalls.length > 0 ? 'calls Outputs.x()' : 'no signal call');
      bump('disp', `${disp?.kind}: ${String(disp?.reason ?? '').replace(/"[^"]*"/g, '"…"').slice(0, 140)}`);
    }
  }
}
fs.writeFileSync(out, JSON.stringify({ rows, tally }, null, 1));
console.log(rows.length, 'traited Functions with no Run wire');
for (const [k, t] of Object.entries(tally)) { console.log(`\n## ${k}`); for (const [v, nn] of Object.entries(t).sort((a, b) => b[1] - a[1])) console.log(String(nn).padStart(4), v); }
