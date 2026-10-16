/**
 * The runtime arm of `tests/the-function-sends-its-signals.test.ts` (EXP-011 §86): what a node fired by a Function's own
 * signal reads, from the runtime's OWN Function node, in a child process.
 *
 * The graph is the runtime's corpus harness (`noodl-runtime/test/corpus/graph-harness.ts`): a pulser into the Function's
 * Run, every value output wired into one recorder per signal, each signal into its recorder's trigger. A recorder reads
 * its value inputs after its inputs have updated, which is where a record verb or a cloud call reads its own (they
 * schedule their work with `scheduleAfterInputsHaveUpdated`). A child process because ts-jest typechecks every file it
 * transforms against this package's strict config, and the runtime is not written for it (s115's query arm, s118's
 * field arm).
 *
 * stdin: `[{ body, outputs, signals, runs }]`: the script, its value outputs, its signals, and one input record per run
 * (each delivered to `in-<name>` before the Run). stdout: per case, per run, `{ <signal>: [values at each pulse] }`.
 */

const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..', '..');
require(require.resolve('ts-node', { paths: [ROOT] })).register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS', allowJs: false, esModuleInterop: true }
});
globalThis.Noodl = { deployed: true, baseUrl: '/' };
// stdout carries the answer; the runtime's own logging (a throwing script) goes to stderr.
console.log = (...args) => process.stderr.write(args.map(String).join(' ') + '\n');
console.warn = console.log;

const { createCorpusGraph } = require(path.join(ROOT, 'packages', 'noodl-runtime', 'test', 'corpus', 'graph-harness'));
const FunctionNode = require(path.join(ROOT, 'packages', 'noodl-runtime', 'src', 'nodes', 'std-library', 'simplejavascript'));

const Pulser = {
  node: {
    name: 'corpus.Pulser',
    category: 'Corpus',
    outputs: { fire: { type: 'signal' } },
    methods: {
      pulse() {
        this.sendSignalOnOutput('fire');
      }
    }
  }
};

/** A source for one Function input: what the run's record says it is, delivered as a wire delivers it. */
const Source = {
  node: {
    name: 'corpus.Source',
    category: 'Corpus',
    outputs: {
      value: {
        type: '*',
        getter() {
          return this._internal.value;
        }
      }
    },
    methods: {
      produce(value) {
        this._internal.value = value;
        this.flagOutputDirty('value');
      }
    }
  }
};

const unset = (v) => (v === undefined ? { $undefined: true } : v);

function recorderFor(outputs, log) {
  const inputs = {
    fire: {
      type: 'signal',
      valueChangedToTrue() {
        this.scheduleAfterInputsHaveUpdated(() => {
          const values = {};
          for (const name of outputs) values[name] = unset(this._internal[name]);
          log.push({ id: this.id, values });
        });
      }
    }
  };
  for (const name of outputs) {
    inputs[name] = {
      type: '*',
      set(value) {
        this._internal[name] = value;
      }
    };
  }
  return { node: { name: 'corpus.Recorder', category: 'Corpus', inputs } };
}

async function run(c) {
  const log = [];
  const inputNames = [...new Set(c.runs.flatMap((r) => Object.keys(r)))];
  const nodes = [
    { id: 'pulser', type: 'corpus.Pulser' },
    {
      id: 'fn',
      type: 'JavaScriptFunction',
      parameters: Object.fromEntries([['functionScript', c.body], ...inputNames.map((n) => [`runOnChange-in-${n}`, false])]),
      ports: [
        ...inputNames.map((n) => ({ name: `in-${n}`, type: '*', plug: 'input' })),
        ...c.outputs.map((n) => ({ name: `out-${n}`, type: '*', plug: 'output' })),
        ...c.signals.map((n) => ({ name: `out-${n}`, type: 'signal', plug: 'output' }))
      ]
    },
    ...inputNames.map((n) => ({ id: `src-${n}`, type: 'corpus.Source' })),
    ...c.signals.map((s) => ({ id: `rec-${s}`, type: 'corpus.Recorder' }))
  ];
  const connections = [
    { sourceId: 'pulser', sourcePort: 'fire', targetId: 'fn', targetPort: 'run' },
    ...inputNames.map((n) => ({ sourceId: `src-${n}`, sourcePort: 'value', targetId: 'fn', targetPort: `in-${n}` })),
    ...c.signals.flatMap((s) => [
      { sourceId: 'fn', sourcePort: `out-${s}`, targetId: `rec-${s}`, targetPort: 'fire' },
      ...c.outputs.map((o) => ({ sourceId: 'fn', sourcePort: `out-${o}`, targetId: `rec-${s}`, targetPort: o }))
    ])
  ];
  const graph = await createCorpusGraph({
    modules: [FunctionNode, Pulser, Source, recorderFor(c.outputs, log)],
    data: { components: [{ name: '/root', nodes, connections }] }
  });
  await graph.settle();
  const out = [];
  for (const inputs of c.runs) {
    for (const [name, value] of Object.entries(inputs)) graph.node(`src-${name}`).produce(value);
    await graph.settle();
    log.length = 0;
    graph.node('pulser').pulse();
    await graph.settle();
    const bySignal = Object.fromEntries(c.signals.map((s) => [s, []]));
    for (const entry of log) bySignal[entry.id.slice('rec-'.length)].push(entry.values);
    out.push(bySignal);
  }
  return out;
}

(async () => {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  const out = [];
  for (const c of JSON.parse(input)) out.push(await run(c));
  process.stdout.write(JSON.stringify(out));
})().catch((e) => {
  process.stderr.write(String((e && e.stack) || e));
  process.exit(1);
});
