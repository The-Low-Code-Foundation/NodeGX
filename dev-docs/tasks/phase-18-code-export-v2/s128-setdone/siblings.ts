// Usage (from packages/nodegx-export): siblings.ts <exportSrc> — over ROOTS (as ../s119-fnchain-measure/dispdiff.ts):
// every wire from a placed component's value output into another placed component's input (P18-S127-SIBLINGVALUE), and
// what became of it: bound to the parent's lifted row, or named "not lifted" with the child's own reason for its port.
import * as fs from 'fs';
import * as path from 'path';
const [E] = process.argv.slice(2);
const roots = (process.env.ROOTS ?? '').split(':').filter(Boolean);
const projects: string[] = [];
const walkDir = (d: string, depth: number) => { if (depth > 3) return; let ents: fs.Dirent[] = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } if (ents.some((e) => e.name === 'nodegx.project.json')) { projects.push(d); return; } for (const e of ents) if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) walkDir(path.join(d, e.name), depth + 1); };
for (const r of roots) walkDir(r, 0);
type Json = Record<string, unknown>;
const cat = require(`${E}/catalog`), parse = require(`${E}/parse/parseProject`), planM = require(`${E}/analyze/plan`);
const catalog = cat.loadCatalog();
const tally: Record<string, number> = {}, byProject: Record<string, Record<string, number>> = {};
const add = (p: string, k: string) => { tally[k] = (tally[k] ?? 0) + 1; (byProject[p] = byProject[p] ?? {})[k] = (byProject[p][k] ?? 0) + 1; };
for (const p of projects.sort()) {
  const ir = parse.parseProject(p, catalog);
  const pp = planM.planProject(ir, new cat.CatalogIndex(catalog));
  const comps = new Map<string, Json>(ir.components.map((c: Json) => [`/${c.path}`, c]));
  for (const c of ir.components as Json[]) {
    const plan = pp.byLegacyPath.get(`/${c.path}`);
    if (!plan) continue;
    const byId = new Map<string, Json>((c.nodes as Json[]).map((n) => [n.id as string, n]));
    for (const w of c.connections as Json[]) {
      const from = byId.get(w.fromId as string), to = byId.get(w.toId as string);
      if (!from || !to || !comps.has(from.type as string) || !comps.has(to.type as string)) continue;
      const target = comps.get(to.type as string)!;
      const isValueInput = (target.nodes as Json[]).some((n) => n.type === 'Component Inputs' && (n.declaredPorts as Json[]).some((d) => d.plug === 'output' && d.name === w.toProperty && d.kind !== 'signal'));
      const source = comps.get(from.type as string)!;
      const isValueOutput = (source.nodes as Json[]).some((n) => n.type === 'Component Outputs' && (n.declaredPorts as Json[]).some((d) => d.plug === 'input' && d.name === w.fromProperty && d.kind !== 'signal'));
      if (!isValueInput || !isValueOutput) continue;
      const bound = plan.bindings[to.id as string]?.[w.toProperty as string];
      if (bound !== undefined) { add(path.basename(p), 'bound to the lifted row'); continue; }
      const dropped = (plan.droppedWires as Json[]).find((d) => d.key === w.key)?.reason as string | undefined ?? (plan.notes as string[]).find((n) => n.startsWith(`wire ${w.key} dropped:`));
      if (dropped !== undefined && dropped.includes('is not lifted by')) {
        const child = pp.byLegacyPath.get(from.type as string);
        const why = (child?.notes as string[] | undefined)?.find((n) => n.includes(`"${w.fromProperty}"`) && n.startsWith('wire '));
        add(path.basename(p), `not lifted: ${(why ?? '(no reason found)').replace(/^wire \S+ dropped: /, '').replace(/"[^"]*"/g, '"…"').slice(0, 110)}`);
      } else add(path.basename(p), `other: ${(dropped ?? '(no note)').replace(/^wire \S+ dropped: /, '').replace(/"[^"]*"/g, '"…"').slice(0, 110)}`);
    }
  }
}
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(String(v).padStart(4), k);
console.log(JSON.stringify(byProject, null, 1));
