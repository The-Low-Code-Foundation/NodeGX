/**
 * EXP-022 S7 — measure first: for every scenario outside on the Swift printer's verdict, what the printer loses, and
 * what the React export prints in its place (the plan's streams, the store modules). Emits only; builds nothing.
 *
 *   cd packages/nodegx-export && nice -n 19 npx ts-node --transpile-only \
 *     -O '{"module":"commonjs","esModuleInterop":true}' ../../dev-docs/tasks/phase-18-code-export-v2/exp-022/s7/measure.ts
 */
const PKG = '../../../../../packages/nodegx-export';
/* eslint-disable @typescript-eslint/no-var-requires */
const spec = require(`${PKG}/../nodegx-node-spec/src`);
const { swiftGraphVerdicts, SWIFT_PRINTER_VERDICT } = require(`${PKG}/tests/helpers/swift-graph-target`);
const { graphComponent, probeProject, drivenInputs } = require(`${PKG}/tests/helpers/node-spec-target`);
const { planProject } = require(`${PKG}/src/analyze/plan`);
const { CatalogIndex, loadCatalog } = require(`${PKG}/src/catalog`);
const { emitSwiftApp } = require(`${PKG}/src/emit/swift/emitSwift`);
const { emitApp } = require(`${PKG}/src/emit/emitApp`);

const scenarios = spec.loadGraphScenarios();
const verdicts = swiftGraphVerdicts(scenarios);
const index = new CatalogIndex(loadCatalog());
for (const [i, v] of verdicts.entries()) {
  if (!v.outside || !SWIFT_PRINTER_VERDICT.test(v.outside)) continue;
  const sc = scenarios[i];
  const file = (sc.file ?? '').replace(/^.*\//, '');
  const component = graphComponent(sc.nodes, sc.wires ?? [], drivenInputs(sc));
  const ir = probeProject(component);
  const plan = planProject(ir, index).plans.find((p: any) => p.path === component.path);
  const swift = emitSwiftApp(ir, loadCatalog());
  console.log(`\n## ${file} — ${sc.name.slice(0, 90)}`);
  console.log('  steps:', sc.steps.map((s: any) => (s === 'settle' ? '.' : 'signal' in s ? `!${s.node}.${s.signal}` : 'set' in s ? `=${s.node}.${s.set}` : Object.keys(s)[0])).join(' '));
  console.log('  streams:', plan.streams.map((s: any) => `${s.type.replace('net.noodl.', '')}(${s.store ?? ''})`).join(', ') || '—');
  console.log('  plan keys non-empty:', Object.keys(plan).filter((k) => Array.isArray(plan[k]) && plan[k].length).join(' '));
  for (const l of swift.preflight.swiftLosses) console.log(`  LOSS ${l.nodeId}: ${l.what}`);
  if (process.env.REACT) {
    const app = emitApp(ir, loadCatalog());
    const files = Object.keys(app.files).filter((f: string) => /stores|lib\/(history|actions|persistStore)/.test(f));
    console.log('  react files:', files.join(' '));
  }
}
