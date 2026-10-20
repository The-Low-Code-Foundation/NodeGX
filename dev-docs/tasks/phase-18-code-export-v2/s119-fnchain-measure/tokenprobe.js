// The Site Builder's "Hold the token until the account exists", on the runtime's own Function: does typing fire go?
const path = require('path');
const ROOT = '/Users/richardosborne/vscode_projects/OpenNoodl';
require(require.resolve('ts-node', { paths: [ROOT] })).register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', esModuleInterop: true } });
globalThis.Noodl = { deployed: true, baseUrl: '/' };
const { createCorpusGraph } = require(path.join(ROOT, 'packages/noodl-runtime/test/corpus/graph-harness'));
const FunctionNode = require(path.join(ROOT, 'packages/noodl-runtime/src/nodes/std-library/simplejavascript'));
const log = [];
const Producer = { node: { name: 'corpus.Producer', category: 'Corpus', outputs: { value: { type: '*', getter() { return this._internal.value; } }, fire: { type: 'signal' } }, methods: { produce(v) { this._internal.value = v; this.flagOutputDirty('value'); }, pulse() { this.sendSignalOnOutput('fire'); } } } };
const Claim = { node: { name: 'corpus.Claim', category: 'Corpus', inputs: { token: { type: '*', set(v) { this._internal.t = v; } }, call: { type: 'signal', valueChangedToTrue() { this.scheduleAfterInputsHaveUpdated(() => log.push(`claimSite called with ${JSON.stringify(this._internal.t)}`)); } } } } };
(async () => {
  for (const box of [true, false, undefined]) {
    log.length = 0;
    const params = { functionScript: "if (Inputs.token === undefined || Inputs.token === null) return;\nOutputs.token = Inputs.token;\nOutputs.go();" };
    if (box !== undefined) params['runOnChange-in-token'] = box;
    const graph = await createCorpusGraph({ modules: [FunctionNode, Producer, Claim], data: { components: [{ name: '/root', nodes: [
      { id: 'field', type: 'corpus.Producer' }, { id: 'signup', type: 'corpus.Producer' },
      { id: 'hold', type: 'JavaScriptFunction', parameters: params, ports: [{ name: 'in-token', type: '*', plug: 'input' }, { name: 'out-token', type: '*', plug: 'output' }, { name: 'out-go', type: 'signal', plug: 'output' }] },
      { id: 'claim', type: 'corpus.Claim' }
    ], connections: [
      { sourceId: 'field', sourcePort: 'value', targetId: 'hold', targetPort: 'in-token' },
      { sourceId: 'signup', sourcePort: 'fire', targetId: 'hold', targetPort: 'run' },
      { sourceId: 'hold', sourcePort: 'out-token', targetId: 'claim', targetPort: 'token' },
      { sourceId: 'hold', sourcePort: 'out-go', targetId: 'claim', targetPort: 'call' }
    ] }] } });
    await graph.settle();
    for (const t of ['s', 'se', 'set']) { log.push(`typed "${t}"`); graph.node('field').produce(t); await graph.settle(); }
    log.push('Sign Up done'); graph.node('signup').pulse(); await graph.settle();
    console.log(`## runOnChange-in-token = ${box}\n   ${log.join('\n   ')}`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
