// P18-S119-TICKEDRUN (session 121): the runtime's own Function with Run wired AND a ticked value input. When does a
// value run it, how many runs per frame, does such a run send Done, and does a literal on a ticked input run it at load?
// `node tickprobe.js > tickprobe.out`
const path = require('path');
const ROOT = '/Users/richardosborne/vscode_projects/OpenNoodl';
require(require.resolve('ts-node', { paths: [ROOT] })).register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', esModuleInterop: true } });
globalThis.Noodl = { deployed: true, baseUrl: '/' };
const { createCorpusGraph } = require(path.join(ROOT, 'packages/noodl-runtime/test/corpus/graph-harness'));
const FunctionNode = require(path.join(ROOT, 'packages/noodl-runtime/src/nodes/std-library/simplejavascript'));

const log = [];
const Producer = {
  node: {
    name: 'corpus.Producer',
    category: 'Corpus',
    inputs: { init: { type: '*', set(v) { this._internal.value = v; this.flagOutputDirty('value'); } } },
    outputs: { value: { type: '*', getter() { return this._internal.value; } }, fire: { type: 'signal' } },
    methods: {
      produce(v) { this._internal.value = v; this.flagOutputDirty('value'); },
      pulse() { this.sendSignalOnOutput('fire'); }
    }
  }
};
const Rec = {
  node: {
    name: 'corpus.Rec',
    category: 'Corpus',
    inputs: {
      x: { type: '*', set(v) { this._internal.x = v; } },
      go: { type: 'signal', valueChangedToTrue() { this.scheduleAfterInputsHaveUpdated(() => log.push(`go x=${JSON.stringify(this._internal.x)}`)); } },
      done: { type: 'signal', valueChangedToTrue() { log.push('done'); } }
    }
  }
};

const BODY = "Outputs.x = String(Inputs.a) + '|' + String(Inputs.b);\nOutputs.go();";

async function graphOf({ aInit, aLiteral, box, bWired = false, runWired = true }) {
  const params = { functionScript: BODY };
  if (box !== undefined) params['runOnChange-in-a'] = box;
  if (aLiteral !== undefined) params['in-a'] = aLiteral;
  const nodes = [
    { id: 'a', type: 'corpus.Producer', parameters: aInit === undefined ? {} : { init: aInit } },
    { id: 'b', type: 'corpus.Producer' },
    { id: 'runner', type: 'corpus.Producer' },
    { id: 'fn', type: 'JavaScriptFunction', parameters: params, ports: [
      { name: 'in-a', type: '*', plug: 'input' }, { name: 'in-b', type: '*', plug: 'input' },
      { name: 'out-x', type: '*', plug: 'output' }, { name: 'out-go', type: 'signal', plug: 'output' }
    ] },
    { id: 'rec', type: 'corpus.Rec' }
  ];
  const connections = [
    { sourceId: 'fn', sourcePort: 'out-x', targetId: 'rec', targetPort: 'x' },
    { sourceId: 'fn', sourcePort: 'out-go', targetId: 'rec', targetPort: 'go' },
    { sourceId: 'fn', sourcePort: 'done', targetId: 'rec', targetPort: 'done' }
  ];
  if (aLiteral === undefined) connections.push({ sourceId: 'a', sourcePort: 'value', targetId: 'fn', targetPort: 'in-a' });
  if (bWired) connections.push({ sourceId: 'b', sourcePort: 'value', targetId: 'fn', targetPort: 'in-b' });
  if (runWired) connections.push({ sourceId: 'runner', sourcePort: 'fire', targetId: 'fn', targetPort: 'run' });
  const graph = await createCorpusGraph({ modules: [FunctionNode, Producer, Rec], data: { components: [{ name: '/root', nodes, connections }] } });
  await graph.settle();
  return graph;
}

async function scenario(name, setup, steps) {
  log.length = 0;
  log.push('[load]');
  const graph = await graphOf(setup);
  for (const [label, act] of steps) {
    log.push(`[${label}]`);
    act(graph);
    await graph.settle();
  }
  console.log(`## ${name}\n   ${log.join('\n   ')}`);
}

(async () => {
  const obj = { id: 1 };
  await scenario('S1 source defined at creation, box unset', { aInit: 'p' }, [['produce p again', (g) => g.node('a').produce('p')], ['produce q', (g) => g.node('a').produce('q')]]);
  await scenario('S2 source undefined at creation, box unset', {}, [['produce p', (g) => g.node('a').produce('p')]]);
  await scenario('S3 box false, source defined at creation', { aInit: 'p', box: false }, [['produce q', (g) => g.node('a').produce('q')], ['Run', (g) => g.node('runner').pulse()]]);
  await scenario('S4 same object twice', {}, [['produce obj', (g) => g.node('a').produce(obj)], ['produce obj again', (g) => g.node('a').produce(obj)]]);
  await scenario('S5 two ticked inputs in one frame', { bWired: true }, [['produce a=p and b=q in one frame', (g) => { g.node('a').produce('p'); g.node('b').produce('q'); }]]);
  await scenario('S6 value and Run in one frame', {}, [['produce p + Run', (g) => { g.node('a').produce('p'); g.node('runner').pulse(); }], ['Run alone', (g) => g.node('runner').pulse()]]);
  await scenario('S7 Run then value in one frame', {}, [['Run + produce p', (g) => { g.node('runner').pulse(); g.node('a').produce('p'); }]]);
  await scenario('S8 defined then undefined', { aInit: 'p' }, [['produce undefined', (g) => g.node('a').produce(undefined)], ['produce undefined again', (g) => g.node('a').produce(undefined)]]);
  await scenario('S9 literal on a ticked input, Run wired', { aLiteral: 'lit' }, [['Run', (g) => g.node('runner').pulse()]]);
  await scenario('S10 literal on an unticked input, Run wired', { aLiteral: 'lit', box: false }, [['Run', (g) => g.node('runner').pulse()]]);
  await scenario('S11 source null at creation', { aInit: null }, [['produce null', (g) => g.node('a').produce(null)]]);
})().catch((e) => { console.error(e); process.exit(1); });
