/**
 * The runtime arm of `tests/the-condition-remembers-its-answer.test.ts` (EXP-011 §87): what a Text's Mounted and Visible
 * hold when unticked Conditions are evaluated, from the runtime's OWN Condition and Switch nodes, in a child process.
 *
 * The graph is a fixture page's own nodes and wires, run on the runtime's corpus harness
 * (`noodl-runtime/test/corpus/graph-harness.ts`). The Condition and the Switch are the runtime's modules. A Button is a
 * stand-in with the Button's `onClick` signal, pressed by the test. A Text is a stand-in with the two inputs a Text has
 * from `react-component-node.ts` and `node-shared-port-definitions.ts`: each starts at its default (true) and stores
 * `value ? true : false`, which is what both setters do with what arrives. A Page or a Group is dropped (it carries no
 * wire here). A child process because ts-jest typechecks every file it transforms against this package's strict config,
 * and the runtime is not written for it (s115's query arm, s118's field arm, s119's Function arm).
 *
 * stdin: `[{ nodes, connections, scenarios }]`: per graph, a fixture page's `nodes.json` and `connections.json` arrays,
 * and lists of Button ids to press, one press per step. stdout: per graph, per scenario, one reading after load and one
 * after each press: `{ <textId>: { mounted, visible } }`.
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

const { createCorpusGraph } = require(path.join(ROOT, 'packages', 'noodl-runtime', 'test', 'corpus', 'graph-harness'));
const ConditionNode = require(path.join(ROOT, 'packages', 'noodl-runtime', 'src', 'nodes', 'std-library', 'condition'));
const SwitchNode = require(path.join(ROOT, 'packages', 'noodl-runtime', 'src', 'nodes', 'std-library', 'switch'));

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

const truthiness = (name) => ({
  type: 'boolean',
  set(value) {
    this._internal[name] = value ? true : false;
  }
});
const Text = {
  node: {
    name: 'corpus.Text',
    category: 'Corpus',
    initialize() {
      this._internal.mounted = true;
      this._internal.visible = true;
    },
    inputs: { mounted: truthiness('mounted'), visible: truthiness('visible'), text: { type: 'string', set() {} } }
  }
};

const STAND_INS = { 'net.noodl.controls.button': 'corpus.Button', Text: 'corpus.Text' };
const KEPT = new Set(['Condition', 'Switch', 'corpus.Button', 'corpus.Text']);

async function run({ nodes, connections, scenarios }) {
  const graphNodes = [];
  for (const n of nodes) {
    const type = STAND_INS[n.type] ?? n.type;
    if (!KEPT.has(type)) continue;
    // A Button's `label` and a Text's `text` are content, not wires; the stand-ins keep only what this arm reads.
    const parameters = type === 'corpus.Button' ? {} : { ...(n.parameters ?? {}) };
    graphNodes.push({ id: n.id, type, parameters });
  }
  const ids = new Set(graphNodes.map((n) => n.id));
  const texts = graphNodes.filter((n) => n.type === 'corpus.Text').map((n) => n.id);
  const graphConnections = connections
    .filter((c) => ids.has(c.fromId) && ids.has(c.toId))
    .map((c) => ({ sourceId: c.fromId, sourcePort: c.fromProperty, targetId: c.toId, targetPort: c.toProperty }));
  const out = [];
  for (const presses of scenarios) {
    const graph = await createCorpusGraph({
      modules: [ConditionNode, SwitchNode, Button, Text],
      data: { components: [{ name: '/root', nodes: graphNodes, connections: graphConnections }] }
    });
    await graph.settle();
    const read = () => Object.fromEntries(texts.map((id) => [id, { mounted: graph.node(id)._internal.mounted, visible: graph.node(id)._internal.visible }]));
    const readings = [read()];
    for (const id of presses) {
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
