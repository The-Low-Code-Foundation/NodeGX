// emitfx.ts <exportSrc> <outDir> — every fixture (the hls001 corpus) emitted to files, plus notes/report
import * as fs from 'fs';
import * as path from 'path';
const [E, outDir] = process.argv.slice(2);
const FX = path.join(__dirname, '..', '..', '..', '..', 'packages', 'nodegx-export', 'tests', 'fixtures');
const { loadCatalog } = require(`${E}/catalog`);
const { emitApp } = require(`${E}/emit/emitApp`);
const { parseProject } = require(`${E}/parse/parseProject`);
const catalog = loadCatalog();
for (const name of fs.readdirSync(FX).sort()) {
  if (!fs.existsSync(path.join(FX, name, 'nodegx.project.json'))) continue;
  let files: Record<string, string>;
  try { const app = emitApp(parseProject(path.join(FX, name), catalog), catalog); files = { ...app.files, '@notes': app.notes.join('\n'), '@report': JSON.stringify(app.report, null, 1) }; }
  catch (e) { files = { '@threw': String(e) }; }
  for (const [f, s] of Object.entries(files)) { const p = path.join(outDir, name, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); }
}
