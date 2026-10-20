// The runtime's own Function: what a node fired by `Outputs.<signal>()` reads, and how often.
const path = require('path');
const ROOT = '/Users/richardosborne/vscode_projects/OpenNoodl';
require(require.resolve('ts-node', { paths: [ROOT] })).register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', esModuleInterop: true } });
globalThis.Noodl = { deployed: true, baseUrl: '/' };
const { createCorpusGraph } = require(path.join(ROOT, 'packages/noodl-runtime/test/corpus/graph-harness'));
const FunctionNode = require(path.join(ROOT, 'packages/noodl-runtime/src/nodes/std-library/simplejavascript'));
const log = [];
const Pulser = { node: { name: 'corpus.Pulser', category: 'Corpus', outputs: { fire: { type: 'signal' } }, methods: { pulse() { this.sendSignalOnOutput('fire'); } } } };
const recorder = (name) => ({ node: { name, category: 'Corpus',
  inputs: {
    a: { type: '*', set(v) { this._internal.a = v; } },
    go: { type: 'signal', valueChangedToTrue() { const now = this._internal.a; log.push(`${this.id} now=${JSON.stringify(now)}`); this.scheduleAfterInputsHaveUpdated(() => log.push(`${this.id} after=${JSON.stringify(this._internal.a)}`)); } }
  } } });
async function run(body, runs = 1, extraSignals = []) {
  log.length = 0;
  const graph = await createCorpusGraph({ modules: [FunctionNode, Pulser, recorder('corpus.RecA'), recorder('corpus.RecB')], data: { components: [{ name: '/root', nodes: [
    { id: 'p', type: 'corpus.Pulser' },
    { id: 'f', type: 'JavaScriptFunction', parameters: { functionScript: body }, ports: [{ name: 'out-a', type: '*', plug: 'output' }, { name: 'out-go', type: 'signal', plug: 'output' }, { name: 'out-go2', type: 'signal', plug: 'output' }] },
    { id: 'r1', type: 'corpus.RecA' }, { id: 'r2', type: 'corpus.RecB' }
  ], connections: [
    { sourceId: 'p', sourcePort: 'fire', targetId: 'f', targetPort: 'run' },
    { sourceId: 'f', sourcePort: 'out-a', targetId: 'r1', targetPort: 'a' },
    { sourceId: 'f', sourcePort: 'out-go', targetId: 'r1', targetPort: 'go' },
    { sourceId: 'f', sourcePort: 'out-a', targetId: 'r2', targetPort: 'a' },
    { sourceId: 'f', sourcePort: 'out-go2', targetId: 'r2', targetPort: 'go' }
  ] }] } });
  await graph.settle();
  for (let i = 0; i < runs; i++) { log.push(`-- run ${i + 1}`); graph.node('p').pulse(); await graph.settle(); }
  return log.slice();
}
(async () => {
  const cases = [
    ['write then signal', 'Outputs.a = 1; Outputs.go();'],
    ['write, signal, write', 'Outputs.a = 1; Outputs.go(); Outputs.a = 2;'],
    ['signal twice', 'Outputs.a = 1; Outputs.go(); Outputs.a = 2; Outputs.go();'],
    ['two signals', 'Outputs.a = 1; Outputs.go(); Outputs.a = 2; Outputs.go2();'],
    ['signal before write', 'Outputs.go(); Outputs.a = 3;'],
    ['same value twice over two runs', 'Outputs.a = 1; Outputs.go();', 2],
    ['unwritten keeps last run', 'if (this.n === undefined) { this.n = 1; Outputs.a = 5; } Outputs.go();', 2],
    ['signal then await then write', 'Outputs.a = 1; Outputs.go(); await Promise.resolve(); Outputs.a = 2;']
  ];
  for (const [name, body, runs] of cases) console.log(`## ${name}: ${body}\n   ${(await run(body, runs)).join('\n   ')}`);
})().catch((e) => { console.error(e); process.exit(1); });
