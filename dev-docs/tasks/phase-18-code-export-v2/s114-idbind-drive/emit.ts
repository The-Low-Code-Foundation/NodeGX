// Emits a project into a folder with the export package's working tree (the fixed arm), or, run against HEAD's three
// source files put back for the duration (build.sh's control), what HEAD emitted.
import * as fs from 'fs';
import * as path from 'path';
const [project, outDir] = process.argv.slice(2);
const E = '/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export/src';
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
