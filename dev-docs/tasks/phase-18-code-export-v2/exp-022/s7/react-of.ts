/**
 * EXP-022 S7 — what the React export prints for a store scenario's probe (the component, its store modules), to read
 * beside the Swift printer. `SC=<file>:<index>`. Emits only.
 */
const PKG = '../../../../../packages/nodegx-export';
/* eslint-disable @typescript-eslint/no-var-requires */
const spec = require(`${PKG}/../nodegx-node-spec/src`);
const { graphComponent, probeProject, drivenInputs } = require(`${PKG}/tests/helpers/node-spec-target`);
const { loadCatalog } = require(`${PKG}/src/catalog`);
const { emitApp } = require(`${PKG}/src/emit/emitApp`);
const [file, i] = (process.env.SC ?? 't01-global-store:0').split(':');
const sc = spec.loadGraphScenarios().filter((s: any) => (s.file ?? '').includes(file))[Number(i)];
const component = graphComponent(sc.nodes, sc.wires ?? [], drivenInputs(sc));
const app = emitApp(probeProject(component), loadCatalog());
for (const f of Object.keys(app.files).filter((f: string) => /components\/Probe|stores\//.test(f))) console.log(`=== ${f}\n${app.files[f]}`);
