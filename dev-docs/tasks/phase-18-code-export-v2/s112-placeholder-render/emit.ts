import * as fs from 'fs';
import * as path from 'path';
const [project, outDir] = process.argv.slice(2);
const { loadCatalog } = require('/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export/src/catalog');
const { emitApp } = require('/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export/src/emit/emitApp');
const { parseProject } = require('/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export/src/parse/parseProject');
const catalog = loadCatalog();
const app = emitApp(parseProject(project, catalog), catalog);
for (const [f, v] of Object.entries(app.files) as Array<[string, string]>) {
  fs.mkdirSync(path.dirname(path.join(outDir, f)), { recursive: true });
  fs.writeFileSync(path.join(outDir, f), v);
}
console.log(Object.keys(app.files).length, 'files;', app.notes.filter((n: string) => /placeholder|Dropdown|options/i.test(n)).join(' | '));
