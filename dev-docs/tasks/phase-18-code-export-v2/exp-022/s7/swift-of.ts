/** EXP-022 S7 — the Swift printer's probe for one scenario (`SC=<file>:<index>`), and its Stores.swift. Emits only. */
const PKG = '../../../../../packages/nodegx-export';
/* eslint-disable @typescript-eslint/no-var-requires */
const spec = require(`${PKG}/../nodegx-node-spec/src`);
const { graphComponent, probeProject, drivenInputs } = require(`${PKG}/tests/helpers/node-spec-target`);
const { loadCatalog } = require(`${PKG}/src/catalog`);
const { emitSwiftApp } = require(`${PKG}/src/emit/swift/emitSwift`);
const [file, i] = (process.env.SC ?? 't02-state-history:0').split(':');
const sc = spec.loadGraphScenarios().filter((s: any) => (s.file ?? '').includes(file))[Number(i)];
const app = emitSwiftApp(probeProject(graphComponent(sc.nodes, sc.wires ?? [], drivenInputs(sc))), loadCatalog());
for (const f of Object.keys(app.files).filter((f: string) => /ProbeView\.swift|Stores\.swift|Functions\.swift/.test(f))) console.log(`=== ${f}\n${app.files[f]}`);
console.log('losses:', app.preflight.swiftLosses.length);
