// The runtime's own Condition, box unticked, Evaluate from a pulse, Is True into a recorder: what the sink receives, from boot.
const path = require('path');
const ROOT = '/Users/richardosborne/vscode_projects/OpenNoodl';
require(require.resolve('ts-node', { paths: [ROOT] })).register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', esModuleInterop: true } });
globalThis.Noodl = { deployed: true, baseUrl: '/' };
const { createCorpusGraph } = require(path.join(ROOT, 'packages/noodl-runtime/test/corpus/graph-harness'));
const ConditionNode = require(path.join(ROOT, 'packages/noodl-runtime/src/nodes/std-library/condition'));
const log = [];
const pulser = (name) => ({ node: { name, category: 'Corpus', outputs: { fire: { type: 'signal' } }, methods: { pulse() { this.sendSignalOnOutput('fire'); } } } });
const Rec = { node: { name: 'corpus.Rec', category: 'Corpus', inputs: { a: { type: 'boolean', set(v) { log.push(`a=${JSON.stringify(v)}`); } }, b: { type: 'boolean', set(v) { log.push(`b=${JSON.stringify(v)}`); } } } } };
async function run(title, { gate, clear, authored, steps, sameFrame }) {
  log.length = 0;
  const nodes = [{ id: 'pA', type: 'corpus.PA' }, { id: 'pB', type: 'corpus.PB' }, { id: 'r', type: 'corpus.Rec', parameters: authored === undefined ? {} : { a: authored } }];
  const connections = [];
  if (gate !== undefined) { nodes.push({ id: 'g', type: 'Condition', parameters: { condition: gate, 'runOnChange-condition': false } }); connections.push({ sourceId: 'pA', sourcePort: 'fire', targetId: 'g', targetPort: 'eval' }, { sourceId: 'g', sourcePort: 'result', targetId: 'r', targetPort: 'a' }); }
  if (clear !== undefined) { nodes.push({ id: 'c', type: 'Condition', parameters: { condition: clear, 'runOnChange-condition': false } }); connections.push({ sourceId: 'pB', sourcePort: 'fire', targetId: 'c', targetPort: 'eval' }, { sourceId: 'c', sourcePort: 'result', targetId: 'r', targetPort: 'a' }); }
  const graph = await createCorpusGraph({ modules: [ConditionNode, pulser('corpus.PA'), pulser('corpus.PB'), Rec], data: { components: [{ name: '/root', nodes, connections }] } });
  await graph.settle();
  log.push('| boot');
  for (const s of steps) {
    if (s === 'AB') { graph.node('pA').pulse(); graph.node('pB').pulse(); } else if (s === 'AA') { graph.node('pA').pulse(); graph.node('pA').pulse(); } else graph.node(s === 'A' ? 'pA' : 'pB').pulse();
    await graph.settle(); log.push(`| ${s}`);
  }
  console.log(`## ${title}\n   ${log.join(' ')}`);
}
(async () => {
  await run('show only, authored false', { gate: true, authored: false, steps: ['A', 'A'] });
  await run('show only, nothing authored', { gate: true, steps: ['A'] });
  await run('show only, authored true', { gate: true, authored: true, steps: ['A'] });
  await run('a false Condition, authored true', { gate: false, authored: true, steps: ['A', 'A'] });
  await run('show and clear on one sink', { gate: true, clear: false, authored: false, steps: ['A', 'B', 'A', 'B', 'B', 'A'] });
  await run('show and clear in one frame', { gate: true, clear: false, authored: false, steps: ['AB', 'A', 'AB'] });
  await run('show twice in one frame', { gate: true, authored: false, steps: ['AA'] });
})().catch((e) => { console.error(e); process.exit(1); });
