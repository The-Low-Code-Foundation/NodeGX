// Usage: tickedrun.ts <exportSrc> <root...> — Run-wired Functions that also run on a ticked wired input, and fire a signal of their own into something.
import * as fs from 'fs';
import * as path from 'path';
const [E, ...roots] = process.argv.slice(2);
const { loadCatalog } = require(`${E}/catalog`);
const { parseProject } = require(`${E}/parse/parseProject`);
const catalog = loadCatalog();
const projects: string[] = [];
const walk = (d: string, depth: number) => { if (depth > 3) return; let ents: fs.Dirent[] = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } if (ents.some((e) => e.name === 'nodegx.project.json')) { projects.push(d); return; } for (const e of ents) if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) walk(path.join(d, e.name), depth + 1); };
for (const r of roots) walk(r, 0);
let n = 0; const rows: string[] = [];
for (const p of projects) {
  let ir: any; try { ir = parseProject(p, catalog); } catch { continue; }
  for (const c of ir.components) {
    const by = new Map(c.nodes.map((x: any) => [x.id, x]));
    for (const f of c.nodes) {
      if (f.type !== 'JavaScriptFunction') continue;
      if (!c.connections.some((w: any) => w.toId === f.id && w.toProperty === 'run')) continue;
      const src = f.parameters.find((q: any) => q.name === 'functionScript')?.value; const body = src?.source ?? src?.value ?? '';
      const sigs = new Set([...String(body).matchAll(/Outputs\.(\w+)\s*(?:\.send\s*)?\(/g)].map((m: any) => m[1]));
      const fired = c.connections.filter((w: any) => w.fromId === f.id && sigs.has(w.fromProperty.slice(4)));
      if (fired.length === 0) continue;
      const ticked = c.connections.filter((w: any) => w.toId === f.id && w.toProperty.startsWith('in-') && f.parameters.find((q: any) => q.name === `runOnChange-${w.toProperty}`)?.value?.value !== false);
      if (ticked.length === 0) continue;
      n++;
      const runFrom = c.connections.filter((w: any) => w.toId === f.id && w.toProperty === 'run').map((w: any) => `${(by.get(w.fromId) as any)?.type}.${w.fromProperty}`);
      rows.push(`${path.basename(p)} ${c.path} "${f.authoredLabel}" run<-${runFrom.join(',')} ticked: ${ticked.map((w: any) => `${(by.get(w.fromId) as any)?.type}.${w.fromProperty}->${w.toProperty}`).join(', ')} fires: ${fired.map((w: any) => `${w.fromProperty}->${(by.get(w.toId) as any)?.type}.${w.toProperty}`).join(', ')}`);
    }
  }
}
console.log(projects.length, 'projects;', n, 'Run-wired Functions that also run on a ticked input and fire a signal of their own');
for (const r of rows) console.log(' ', r);
