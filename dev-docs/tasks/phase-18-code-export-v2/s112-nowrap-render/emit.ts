import * as fs from 'fs';
import * as path from 'path';
const [srcDir, project, outDir] = process.argv.slice(2);
const { loadCatalog } = require(path.join(srcDir, 'catalog'));
const { emitApp } = require(path.join(srcDir, 'emit/emitApp'));
const { parseProject } = require(path.join(srcDir, 'parse/parseProject'));
const catalog = loadCatalog();
const app = emitApp(parseProject(project, catalog), catalog);
for (const [f, v] of Object.entries(app.files) as Array<[string, string]>) {
  fs.mkdirSync(path.dirname(path.join(outDir, f)), { recursive: true });
  fs.writeFileSync(path.join(outDir, f), v);
}
console.log(Object.keys(app.files).length, 'files;', app.notes.filter((n: string) => /Text|wrap|Overflow|unmapped|style/i.test(n)).join(' | '));
