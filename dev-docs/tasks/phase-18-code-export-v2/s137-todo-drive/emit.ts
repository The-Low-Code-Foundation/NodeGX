// Emits a project from the working tree's export `src` (or EXPORT_SRC) into outDir: `emit.ts <project> <outDir>`.
import * as fs from 'fs';
import * as path from 'path';
const [project, outDir] = process.argv.slice(2);
const E = process.env.EXPORT_SRC ?? '/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export/src';
const { loadCatalog } = require(`${E}/catalog`);
const { emitApp } = require(`${E}/emit/emitApp`);
const { parseProject } = require(`${E}/parse/parseProject`);
const catalog = loadCatalog();
const app = emitApp(parseProject(project, catalog), catalog);
for (const [f, v] of Object.entries(app.files) as Array<[string, string]>) {
  fs.mkdirSync(path.dirname(path.join(outDir, f)), { recursive: true });
  fs.writeFileSync(path.join(outDir, f), v);
}
console.log(Object.keys(app.files).length, 'files');
