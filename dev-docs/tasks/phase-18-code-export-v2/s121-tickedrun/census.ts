// Usage: census.ts <exportSrc> <root...> — every Run-wired Function with a ticked value input (wired or literal), what it
// sends, how its outputs are read, and its disposition under that export source. `V=1` lists them.
import * as fs from 'fs';
import * as path from 'path';
const [E, ...roots] = process.argv.slice(2);
const { loadCatalog, CatalogIndex } = require(`${E}/catalog`);
const { parseProject } = require(`${E}/parse/parseProject`);
const { planProject } = require(`${E}/analyze/plan`);
const catalog = loadCatalog();
const index = new CatalogIndex(catalog);
const projects: string[] = [];
const walk = (d: string, depth: number) => {
  if (depth > 3) return;
  let ents: fs.Dirent[] = [];
  try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
  if (ents.some((e) => e.name === 'nodegx.project.json')) { projects.push(d); return; }
  for (const e of ents) if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) walk(path.join(d, e.name), depth + 1);
};
for (const r of roots) walk(r, 0);
const tally = new Map<string, number>();
const bump = (k: string) => tally.set(k, (tally.get(k) ?? 0) + 1);
const rows: string[] = [];
for (const p of projects) {
  let ir: any, plan: any;
  try { ir = parseProject(p, catalog); plan = planProject(ir, index); } catch { continue; }
  for (const c of ir.components) {
    const cp = plan.byLegacyPath.get(`/${c.path}`);
    const by = new Map<string, any>(c.nodes.map((x: any) => [x.id, x]));
    for (const f of c.nodes) {
      if (f.type !== 'JavaScriptFunction') continue;
      if (!c.connections.some((w: any) => w.toId === f.id && w.toProperty === 'run')) continue;
      const box = (port: string) => f.parameters.find((q: any) => q.name === `runOnChange-${port}`)?.value?.value !== false;
      const tickedWired = c.connections.filter((w: any) => w.toId === f.id && w.toProperty.startsWith('in-') && box(w.toProperty));
      const tickedLiteral = f.parameters.filter((q: any) => q.name.startsWith('in-') && q.value?.kind === 'literal' && box(q.name)
        && !c.connections.some((w: any) => w.toId === f.id && w.toProperty === q.name));
      if (tickedWired.length === 0 && tickedLiteral.length === 0) continue;
      const outs = c.connections.filter((w: any) => w.fromId === f.id);
      const signals = outs.filter((w: any) => w.fromProperty.startsWith('out-') && isSignalTarget(w, by));
      const disp = cp?.dispositions?.[f.id];
      const kind = disp ? (disp.kind === 'deferred' ? `deferred: ${String(disp.reason).slice(0, 110)}` : disp.kind) : 'none';
      const shape = `${tickedWired.length > 0 ? 'wired' : ''}${tickedLiteral.length > 0 ? (tickedWired.length > 0 ? '+literal' : 'literal') : ''}`;
      const reads = outs.some((w: any) => w.fromProperty.startsWith('out-') && !isSignalTarget(w, by)) ? 'reads' : 'no-reads';
      const sends = signals.length > 0 ? 'sends' : 'no-sends';
      bump(`${shape} ${sends} ${reads} → ${disp?.kind ?? 'none'}`);
      rows.push(`${path.basename(p)} ${c.path} "${f.authoredLabel ?? f.id.slice(0, 6)}" [${shape}; ${sends}; ${reads}] run<-${c.connections.filter((w: any) => w.toId === f.id && w.toProperty === 'run').map((w: any) => `${by.get(w.fromId)?.type}.${w.fromProperty}`).join(',')} ticked: ${[...tickedWired.map((w: any) => `${by.get(w.fromId)?.type}.${w.fromProperty}->${w.toProperty}`), ...tickedLiteral.map((q: any) => `${q.name}=${JSON.stringify(q.value.value).slice(0, 20)}`)].join(', ')} :: ${kind}`);
    }
  }
}
function isSignalTarget(w: any, by: Map<string, any>): boolean {
  // A Function's out-<name> is a signal when its body calls it; read it off the body.
  const f = by.get(w.fromId);
  const src = f?.parameters.find((q: any) => q.name === 'functionScript')?.value;
  const body = String(src?.source ?? src?.value ?? '');
  const name = w.fromProperty.slice(4);
  return new RegExp(`Outputs\\.${name}\\s*(?:\\.send\\s*)?\\(`).test(body);
}
console.log(projects.length, 'projects;', rows.length, 'Run-wired Functions with a ticked value input');
for (const [k, n] of [...tally].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${k}`);
if (process.env.V) for (const r of rows) console.log(' ', r);
