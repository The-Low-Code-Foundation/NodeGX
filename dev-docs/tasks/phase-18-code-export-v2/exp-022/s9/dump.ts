/**
 * EXP-022 S9 — print one t07 scenario's probe in both exports, to read before building.
 *   cd packages/nodegx-export && nice -n 19 npx ts-node --transpile-only \
 *     -O '{"module":"commonjs","esModuleInterop":true}' ../../dev-docs/tasks/phase-18-code-export-v2/exp-022/s9/dump.ts <k> <out-dir>
 */
const PKG = '../../../../../packages/nodegx-export';
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const spec = require(`${PKG}/../nodegx-node-spec/src`);
const { graphComponent, probeProject, drivenInputs } = require(`${PKG}/tests/helpers/node-spec-target`);
const { loadCatalog } = require(`${PKG}/src/catalog`);
const { emitSwiftApp } = require(`${PKG}/src/emit/swift/emitSwift`);
const { emitApp } = require(`${PKG}/src/emit/emitApp`);

const k = Number(process.argv[2] ?? 0);
const out = process.argv[3];
const sc = spec.loadGraphScenarios().filter((s: any) => /t07-on-app-error/.test(s.file ?? ''))[k];
const component = graphComponent(sc.nodes, sc.wires ?? [], drivenInputs(sc));
const ir = probeProject(component);
for (const [name, app] of [['react', emitApp(ir, loadCatalog())], ['swift', emitSwiftApp(ir, loadCatalog())]] as const) {
  for (const [file, text] of Object.entries((app as any).files)) {
    const to = path.join(out, name, file);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.writeFileSync(to, String(text));
  }
}
console.log(sc.name);
