// Emits a project; with the arm `control`, every Record's "Record properties" box is unticked first, which makes the
// emitter produce the plain client and no subscription: what HEAD emitted for this app (the-live-record.test.ts §A, §B).
import * as fs from 'fs';
import * as path from 'path';
const [project, outDir, arm] = process.argv.slice(2);
const E = '/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export/src';
const { loadCatalog } = require(`${E}/catalog`);
const { emitApp } = require(`${E}/emit/emitApp`);
const { parseProject } = require(`${E}/parse/parseProject`);
const catalog = loadCatalog();
const ir = parseProject(project, catalog);
if (arm === 'control') {
  for (const component of ir.components)
    for (const node of component.nodes)
      if (node.type === 'DbModel2')
        node.parameters = [...node.parameters.filter((p: { name: string }) => p.name !== 'runOnChange-record'), { name: 'runOnChange-record', value: { kind: 'literal', value: false } }];
}
const app = emitApp(ir, catalog);
for (const [f, v] of Object.entries(app.files) as Array<[string, string]>) {
  fs.mkdirSync(path.dirname(path.join(outDir, f)), { recursive: true });
  fs.writeFileSync(path.join(outDir, f), v);
}
console.log(arm, Object.keys(app.files).length, 'files; subscribeRecord in client:', String(app.files['src/api/client.ts']).includes('subscribeRecord'));
