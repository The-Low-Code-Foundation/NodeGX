/**
 * EXP-022 S7 — §E's control: the listener graph played with every printed `on([...])` removed (M5 on the one graph that
 * has listeners). Predicted: the Counter never moves in Swift, so E2's two assertions fail.
 */
const PKG = '../../../../../packages/nodegx-export';
/* eslint-disable @typescript-eslint/no-var-requires */
const spec = require(`${PKG}/../nodegx-node-spec/src`);
const { playGraph } = require(`${PKG}/../nodegx-node-spec/src/runner/graph`);
const { exportGraphTarget } = require(`${PKG}/tests/helpers/node-spec-target`);
const { playSwiftGraphs, swiftGraphTarget, swiftGraphVerdicts } = require(`${PKG}/tests/helpers/swift-graph-target`);
async function main() {
  const t02 = spec.loadGraphScenarios().filter((s: any) => (s.file ?? '').includes('t02-state-history'))[0];
  const sc = { ...t02, name: 'S7 listener (mutant)', nodes: { ...t02.nodes, c: { type: 'Counter' } }, wires: [...(t02.wires ?? []), { from: 'h.historyChanged', to: 'c.increase' }, { from: 'u.undone', to: 'c.increase' }], steps: ['settle', { node: 'set', signal: 'set' }, 'settle', { node: 'u', signal: 'undo' }, 'settle'], expect: undefined, claims: undefined, divergence: undefined };
  const verdicts = swiftGraphVerdicts([sc]);
  let changed = 0;
  const run = playSwiftGraphs('s7-listener-mutant', [sc], verdicts, (f: string, t: string) => {
    const out = /Probe\d+View\.swift$/.test(f) ? t.replace(/\n {4}let _ = \w+\.on\(\[\n[\s\S]*?\n {4}\]\)/g, '') : t;
    if (out !== t) changed++;
    return out;
  });
  const swift = swiftGraphTarget(verdicts, run);
  swift.canPlay(sc);
  const reach = swift.graphReach(sc);
  const s = spec.projectGraphTrace(await playGraph(swift, sc), reach);
  const react = exportGraphTarget();
  react.canPlay(sc);
  const r = spec.projectGraphTrace(await playGraph(react, sc), reach);
  const counts = (t: any[]) => t.filter((e) => e.subject === 'c' && e.t === 'value').map((e) => e.value);
  console.log(JSON.stringify({ changed, swiftCounts: counts(s), reactCounts: counts(r), equal: JSON.stringify(s) === JSON.stringify(r) }));
}
main().catch((e) => { console.error(e); process.exit(1); });
