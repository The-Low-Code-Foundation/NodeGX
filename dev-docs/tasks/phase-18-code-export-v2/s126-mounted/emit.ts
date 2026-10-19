// Usage (from packages/nodegx-export): emit.ts <exportSrc> <outDir> — every project under ROOTS (as dispdiff.ts) emitted
// to files, with its notes (`@notes`), so HEAD and the tree can be diffed (`diff -r`). ONLY= limits it to some names.
import * as fs from 'fs';
import * as path from 'path';
const [E, outDir] = process.argv.slice(2);
const roots = (process.env.ROOTS ?? '').split(':').filter(Boolean);
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const projects: string[] = [];
const walkDir = (d: string, depth: number) => { if (depth > 3) return; let ents: fs.Dirent[] = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } if (ents.some((e) => e.name === 'nodegx.project.json')) { projects.push(d); return; } for (const e of ents) if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) walkDir(path.join(d, e.name), depth + 1); };
for (const r of roots) walkDir(r, 0);
const { loadCatalog } = require(`${E}/catalog`);
const { emitApp } = require(`${E}/emit/emitApp`);
const { parseProject } = require(`${E}/parse/parseProject`);
const catalog = loadCatalog();
for (const p of projects.sort()) {
  const name = path.basename(p);
  if (only && !only.includes(name)) continue;
  let files: Record<string, string>;
  try { const app = emitApp(parseProject(p, catalog), catalog); files = { ...app.files, '@notes': app.notes.join('\n') }; } catch (e) { files = { '@threw': String(e) }; }
  for (const [f, s] of Object.entries(files)) { const q = path.join(outDir, name, f); fs.mkdirSync(path.dirname(q), { recursive: true }); fs.writeFileSync(q, s); }
}
