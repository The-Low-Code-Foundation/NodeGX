// Emits a project into a folder with an export package's src: the working tree (the fixed arm), or a copy holding HEAD's sources (the control). Usage: emit.ts <exportSrc> <project> <outDir>
import * as fs from 'fs';
import * as path from 'path';
const [E, project, outDir] = process.argv.slice(2);
const { loadCatalog } = require(`${E}/catalog`);
const { emitApp } = require(`${E}/emit/emitApp`);
const { parseProject } = require(`${E}/parse/parseProject`);
const catalog = loadCatalog();
const app = emitApp(parseProject(project, catalog), catalog);
for (const [f, v] of Object.entries(app.files) as Array<[string, string]>) {
  fs.mkdirSync(path.dirname(path.join(outDir, f)), { recursive: true });
  fs.writeFileSync(path.join(outDir, f), v);
}
console.log(outDir, Object.keys(app.files).length, 'files; notes:', JSON.stringify(app.notes));
