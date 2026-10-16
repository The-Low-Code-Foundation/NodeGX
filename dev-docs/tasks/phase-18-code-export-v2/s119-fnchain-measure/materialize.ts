// Usage: materialize.ts <template.content.json> <outDir> — the editor's own legacy → v2 writer.
import * as fs from 'fs';
import * as path from 'path';
const { ProjectExporter } = require('/Users/richardosborne/vscode_projects/OpenNoodl/packages/noodl-editor/src/editor/src/io/ProjectExporter');
const [src, out] = process.argv.slice(2);
const r = new ProjectExporter().export(JSON.parse(fs.readFileSync(src, 'utf-8')));
for (const f of r.files) { const p = path.join(out, f.relativePath); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(f.content, null, 2)); }
console.log(r.stats);
