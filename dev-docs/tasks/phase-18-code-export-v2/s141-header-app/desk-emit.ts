// Writes the Header Desk into <deskDir> and emits it with <exportSrc> into <outDir>: `desk-emit.ts <exportSrc> <deskDir> <outDir>`.
import * as fs from 'fs';
import * as path from 'path';
const [E, deskDir, outDir] = process.argv.slice(2);
const { writeHeaderDesk } = require('/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export/tests/helpers/header-desk');
const { loadCatalog } = require(`${E}/catalog`);
const { emitApp } = require(`${E}/emit/emitApp`);
const { parseProject } = require(`${E}/parse/parseProject`);
fs.rmSync(deskDir, { recursive: true, force: true });
fs.mkdirSync(deskDir, { recursive: true });
writeHeaderDesk({}, deskDir);
const catalog = loadCatalog();
const app = emitApp(parseProject(deskDir, catalog), catalog);
fs.rmSync(outDir, { recursive: true, force: true });
for (const [f, v] of Object.entries(app.files) as Array<[string, string]>) {
  fs.mkdirSync(path.dirname(path.join(outDir, f)), { recursive: true });
  fs.writeFileSync(path.join(outDir, f), v);
}
console.log(Object.keys(app.files).length, 'files');
