/**
 * The runtime arm of `tests/the-failure-runs-its-chain.test.ts` (EXP-011 §90): what a fixture page shows when a record
 * verb fails or succeeds, from the runtime's OWN Delete Record, Condition, Variable and Set Variable, in a child process.
 *
 * The graph is the page's own nodes and wires on the runtime's corpus harness (`noodl-runtime/test/corpus/graph-harness.ts`).
 * Delete Record is the runtime's module with one method replaced: `cloudStoreForScope` hands back a store whose `delete`
 * holds each request until the test answers it (`answer:ok`, `answer:fail:<message>`), so the request answers after the
 * click has settled, as a network does. A Button is a stand-in with the Button's `onClick`, pressed by the test. A Text is a
 * stand-in with a Text's `mounted` (starts true, stores `value ? true : false`) and its text (authored until a value
 * arrives). A Page or a Group is dropped (no wire here reads one). A child process because ts-jest typechecks every file it
 * transforms against this package's strict config, and the runtime is not written for it (s115-s122's arms).
 *
 * stdin: `[{ nodes, connections, scenarios }]`: per graph, a fixture page's `nodes.json` and `connections.json` arrays, and
 * lists of steps: a Button's label to press, or `answer:…` for the oldest request still out (nothing, where none is).
 * stdout: per graph, per scenario, one reading after load and one after each step: the text of each mounted Text, in node
 * order (the page's tree order in these fixtures), which is what the export arm reads as the page's `<p>`s.
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
console.error = console.log;

const LIB = path.join(ROOT, 'packages', 'noodl-runtime', 'src');
const { createCorpusGraph } = require(path.join(ROOT, 'packages', 'noodl-runtime', 'test', 'corpus', 'graph-harness'));
const Model = require(path.join(LIB, 'model'));
const ConditionNode = require(path.join(LIB, 'nodes', 'std-library', 'condition'));
const VariableNode = require(path.join(LIB, 'nodes', 'std-library', 'data', 'variablenode2'));
const SetVariableNode = require(path.join(LIB, 'nodes', 'std-library', 'data', 'setvariablenode'));
const DeleteNode = require(path.join(LIB, 'nodes', 'std-library', 'data', 'deletedbmodelpropertiesnode'));

/** The requests out, oldest first: what a step `answer:…` settles. */
const pending = [];
DeleteNode.node.methods.cloudStoreForScope = function () {
  return {
    delete(options) {
      pending.push(options);
    }
  };
};

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
const Text = {
  node: {
    name: 'corpus.Text',
    category: 'Corpus',
    initialize() {
      this._internal.mounted = true;
    },
    inputs: {
      mounted: {
        type: 'boolean',
        set(value) {
          this._internal.mounted = value ? true : false;
        }
      },
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

const STAND_INS = { 'net.noodl.controls.button': 'corpus.Button', Text: 'corpus.Text' };
const KEPT = new Set(['DeleteDbModelProperties', 'Condition', 'Variable2', 'Set Variable', 'corpus.Button', 'corpus.Text']);

async function run({ nodes, connections, scenarios }) {
  const graphNodes = [];
  for (const n of nodes) {
    const type = STAND_INS[n.type] ?? n.type;
    if (!KEPT.has(type)) continue;
    // A Button's label is content; a Text keeps its authored text as the stand-in's starting text.
    const parameters = type === 'corpus.Text' ? { authored: n.parameters?.text ?? '' } : type.startsWith('corpus.') ? {} : { ...(n.parameters ?? {}) };
    graphNodes.push({ id: n.id, type, parameters });
  }
  const ids = new Set(graphNodes.map((n) => n.id));
  const texts = graphNodes.filter((n) => n.type === 'corpus.Text').map((n) => n.id);
  const buttons = new Map(nodes.filter((n) => n.type === 'net.noodl.controls.button').map((n) => [String(n.parameters.label), n.id]));
  const graphConnections = connections
    .filter((c) => ids.has(c.fromId) && ids.has(c.toId))
    .map((c) => ({ sourceId: c.fromId, sourcePort: c.fromProperty, targetId: c.toId, targetPort: c.toProperty }));
  const out = [];
  for (const steps of scenarios) {
    // Variables are the process's: a fresh record per scenario, as a fresh page load has.
    delete Model._models['--ndl--global-variables'];
    pending.length = 0;
    const graph = await createCorpusGraph({
      modules: [DeleteNode, ConditionNode, VariableNode, SetVariableNode, Button, Text],
      data: { components: [{ name: '/root', nodes: graphNodes, connections: graphConnections }] }
    });
    await graph.settle();
    const read = () => texts.filter((id) => graph.node(id)._internal.mounted).map((id) => graph.node(id)._internal.shown ?? '');
    const readings = [read()];
    for (const step of steps) {
      if (step.startsWith('answer:')) {
        const request = pending.shift();
        if (request !== undefined) {
          if (step === 'answer:ok') request.success();
          else request.error(step.slice('answer:fail:'.length));
        }
      } else {
        const id = buttons.get(step);
        if (id === undefined) throw new Error(`no button "${step}"`);
        graph.node(id).press();
      }
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
