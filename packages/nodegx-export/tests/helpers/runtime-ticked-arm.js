/**
 * The runtime arm of `tests/the-ticked-input-runs-it-again.test.ts` (P18-S119-TICKEDRUN, P18-S121-DIDMOUNT): what a
 * fixture page's Texts show, from the runtime's OWN Function, Variable and Set Variable nodes, in a child process.
 *
 * The graph is the page's own nodes and wires on the runtime's corpus harness (`noodl-runtime/test/corpus/graph-harness.ts`).
 * A Button is a stand-in with the Button's `onClick`, pressed by the test. A Page or a Group is a stand-in with Did
 * Mount, sent after the graph is made and has settled: the viewer sends it from `componentDidMount`, after the values the
 * graph delivers as it is made (measured in the s121 drive: the arrival's run, then Did Mount's). A Text is a stand-in
 * that shows its authored text until something reaches its Text input, then that. A child process because ts-jest typechecks every file it transforms against
 * this package's strict config, and the runtime is not written for it (s115's query arm, s118's field arm).
 *
 * stdin: `[{ nodes, connections, scenarios }]`: per graph, a fixture page's `nodes.json` and `connections.json` arrays,
 * and lists of Button labels to press, one press per step. stdout: per graph, per scenario, one reading after load and
 * one after each press: each Text's shown string, in node order (the page's tree order in these fixtures).
 */

const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..', '..');
require(require.resolve('ts-node', { paths: [ROOT] })).register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS', allowJs: false, esModuleInterop: true }
});
globalThis.Noodl = { deployed: true, baseUrl: '/' };
console.log = (...args) => process.stderr.write(args.map(String).join(' ') + '\n');
console.warn = console.log;

const LIB = path.join(ROOT, 'packages', 'noodl-runtime', 'src');
const { createCorpusGraph } = require(path.join(ROOT, 'packages', 'noodl-runtime', 'test', 'corpus', 'graph-harness'));
const Model = require(path.join(LIB, 'model'));
const FunctionNode = require(path.join(LIB, 'nodes', 'std-library', 'simplejavascript'));
const VariableNode = require(path.join(LIB, 'nodes', 'std-library', 'data', 'variablenode2'));
const SetVariableNode = require(path.join(LIB, 'nodes', 'std-library', 'data', 'setvariablenode'));

const Button = {
  node: {
    name: 'corpus.Button',
    category: 'Corpus',
    outputs: { onClick: { type: 'signal' } },
    methods: {
      press() {
        this.sendSignalOnOutput('onClick');
      }
    }
  }
};
const Mounting = {
  node: {
    name: 'corpus.Mounting',
    category: 'Corpus',
    outputs: { didMount: { type: 'signal' } },
    methods: {
      mount() {
        this.sendSignalOnOutput('didMount');
      }
    }
  }
};
const Text = {
  node: {
    name: 'corpus.Text',
    category: 'Corpus',
    inputs: {
      authored: {
        type: 'string',
        set(value) {
          this._internal.shown = value === undefined || value === null ? '' : String(value);
        }
      },
      text: {
        type: 'string',
        set(value) {
          this._internal.shown = value === undefined || value === null ? '' : String(value);
        }
      }
    }
  }
};

const STAND_INS = { 'net.noodl.controls.button': 'corpus.Button', Text: 'corpus.Text', Page: 'corpus.Mounting', Group: 'corpus.Mounting' };
const KEPT = new Set(['JavaScriptFunction', 'Variable2', 'Set Variable', 'corpus.Button', 'corpus.Text', 'corpus.Mounting']);

async function run({ nodes, connections, scenarios }) {
  const graphNodes = [];
  for (const n of nodes) {
    const type = STAND_INS[n.type] ?? n.type;
    if (!KEPT.has(type)) continue;
    // A Button's label and a Page's title are content; the stand-ins keep only what this arm reads.
    const parameters =
      type === 'corpus.Text' ? { authored: n.parameters?.text ?? '' } : type.startsWith('corpus.') ? {} : { ...(n.parameters ?? {}) };
    graphNodes.push({ id: n.id, type, parameters, ...(n.ports ? { ports: n.ports } : {}) });
  }
  const ids = new Set(graphNodes.map((n) => n.id));
  const texts = graphNodes.filter((n) => n.type === 'corpus.Text').map((n) => n.id);
  const buttons = new Map(nodes.filter((n) => n.type === 'net.noodl.controls.button').map((n) => [String(n.parameters.label), n.id]));
  const mounting = graphNodes.filter((n) => n.type === 'corpus.Mounting').map((n) => n.id);
  const graphConnections = connections
    .filter((c) => ids.has(c.fromId) && ids.has(c.toId))
    .map((c) => ({ sourceId: c.fromId, sourcePort: c.fromProperty, targetId: c.toId, targetPort: c.toProperty }));
  const out = [];
  for (const presses of scenarios) {
    // Variables are the process's: a fresh record per scenario, as a fresh page load has.
    delete Model._models['--ndl--global-variables'];
    const graph = await createCorpusGraph({
      modules: [FunctionNode, VariableNode, SetVariableNode, Button, Mounting, Text],
      data: { components: [{ name: '/root', nodes: graphNodes, connections: graphConnections }] }
    });
    await graph.settle();
    // Children before their parent, as React commits them: the page's nodes list a parent first.
    for (const id of [...mounting].reverse()) graph.node(id).mount();
    await graph.settle();
    const read = () => texts.map((id) => graph.node(id)._internal.shown);
    const readings = [read()];
    for (const label of presses) {
      const id = buttons.get(label);
      if (id === undefined) throw new Error(`no button "${label}"`);
      graph.node(id).press();
      await graph.settle();
      readings.push(read());
    }
    out.push(readings);
  }
  return out;
}

let input = '';
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  // One graph at a time: the harness's scheduler is the runtime's, and two graphs settling together would share it.
  (async () => {
    const out = [];
    for (const graph of JSON.parse(input)) out.push(await run(graph));
    return out;
  })()
    .then((out) => process.stdout.write(JSON.stringify(out)))
    .catch((e) => {
      process.stderr.write(String(e && e.stack ? e.stack : e));
      process.exit(1);
    });
});
