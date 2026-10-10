/**
 * Visual Function (`Logic Builder`) — read from `packages/noodl-runtime/src/nodes/std-library/logic-builder.ts` on 2026-10-09
 * (NSP-017, s67), with the port reader it shares with the editor and the exporter (`@nodegx/project-contract/logic-builder-io`), the
 * block probes (`blockrun.ts` IDENTITY_VALUE_PROBE / NOOP_STATEMENT_PROBE), the editor's generators beside it
 * (`noodl-editor/…/BlocklyEditor/NoodlGenerators.ts`) and node.ts `flagOutputDirty` / `sendValue` (:852-873).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * A CONTRACT, NOT A BEHAVIOUR (NSP-017 AC3). The person arranges blocks; the editor turns them into JavaScript (Generated Code) and
 * the runtime runs that text — it never reads the blocks for behaviour, only for ports (:605-609). So what the node does is whatever
 * the generated code does. This spec runs the same text the same way — the same eleven parameters in the same order, called with no
 * receiver — and writes down everything AROUND it. It is graded with the FIXTURES below — one program per rule — and the ledger counts
 * it as a contract (`spec-ledger.js`), never as a behaviour spec.
 *
 * THE RULES:
 *   - PORTS COME FROM THE BLOCKS, NEVER THE CODE (:192-273, `logic-builder-io.ts`): `Define input` / `get input` make a value input,
 *     `Define output` / `set output` a value output, the hat and `Define signal input` a signal input, `Define signal output` /
 *     `send signal` a signal output. The reader is the project's one (`@nodegx/project-contract/logic-builder-io`), carried here as a
 *     byte-identical copy (`./logic-builder-io.ts`, held by tests/logic-builder-io-parity.test.ts). A name the node owns (`workspace`,
 *     `generatedCode`, `run`; `error`, `success`, `failure`, `done`, `unchanged`, `completed`) is never a block's port (:111-140).
 *   - A PORT'S KIND IS DECIDED ONCE (:200-253): the first touch registers it, a signal if the blocks the node READS name it a signal
 *     input, else a value — any name is accepted. The node reads the blocks off its model first (`this.model.parameters.workspace`),
 *     and its own last write only when the model has none: in this play, the blocks it was PLACED with. So `derived.inputs` is the
 *     placing's blocks, and a write to Logic Blocks while the app runs changes no port's kind.
 *   - WHEN IT RUNS (:765-781, :233-241): on Run, and on each signal input the blocks declare — at once, in the pulse, and every one
 *     of them runs the WHOLE program (the hat emits no code: NoodlGenerators.ts :104-121). A value arriving runs nothing (:246-251) —
 *     it is kept in `Inputs` for the next run. Setting Logic Blocks or Generated Code runs nothing either (:740-763).
 *   - WHAT THE CODE SEES (:443-461, :528-603, :610-667): `Inputs` is the node's own object of input values — the SAME object every
 *     run, so what the code writes there is what the next run reads; `Outputs` a fresh `{}` each run; `sendSignalOnOutput(name)`;
 *     `__triggerSignal__` the input that started the run (`run`, or the signal input's name); `__p(id, v)` returns `v` and `__s(id)`
 *     does nothing (blockrun.ts :42-50 — what every value and statement block is wrapped in). `this` is the global object (no
 *     receiver). Not in v1: `Noodl`, `Variables`, `Objects`, `Arrays` (the registry seam) and `console` (not on the wire).
 *   - WHAT COMES OUT (:463-501): a signal the code sends fires AT ONCE, in the code's order (:566-576). The values are written to
 *     `Outputs` and land AFTER the code returns, each name in the order first written, and EACH IS SENT EVERY RUN — `flagOutputDirty`
 *     sends whatever the getter reads, the same value too (node.ts :870-873; a lone node's trace never repeats an unchanged value, so
 *     the Function's publish-on-change difference is graded through the graph). A value of `undefined` is never sent (node.ts :858).
 *     Then Error is sent (blank text), Success fires, then Done answers the run.
 *   - A THROW (:503-511): the run ends there. The signals the code sent before it have fired; the values it wrote are DROPPED — they
 *     were only in the run's own `Outputs` (unlike the Function, whose writes land as they are made). Error is the throw's message, or
 *     `String(thrown)` for a throw with none (`throw null` reads "null"); the run is answered `failure` (`logic-builder/blocks-threw`).
 *   - CODE THAT WILL NOT COMPILE (:385-414, :610-676): compiled at the run, never at the write: Error is "The blocks could not be
 *     compiled: " and the engine's own words; the run is answered `failure` (`logic-builder/code-not-compiled`).
 *   - NO CODE (:416-421): no Generated Code (or empty): the run is answered Unchanged, and nothing else happens.
 *   - A NAME THE NODE OWNS, written by the code (:466-490): the other values still land (sent in order), then Error says the name and
 *     the run is answered `failure` (`logic-builder/reserved-port-name`) — no Success. SENT as a signal (:582-597), the same answer
 *     (v2, P109 ISL-051 row C149): the send does nothing then; after the code the values land, Error says the first such name and
 *     the run is answered `failure` — no Success, no Done. (v1: Failure pulsed at once and the run went on to Success and Done.)
 *
 * THE PLAY'S PORTS. An author edits the blocks while the app runs and the editor re-sends the ports for each edit (:822-888). A play
 * may set any fixture's code, so the node carries every fixture's OUTPUTS from the start (`derived.outputs`, below) — what a loaded
 * project's saved `dynamicports` give the model. Its INPUTS are the placing's blocks' (A PORT'S KIND, above) and any other name the
 * generator writes is a value input.
 */

import { defineNode, type InputDecl, type OutputDecl } from '../spec';
import { RESERVED_INPUTS, RESERVED_OUTPUTS, detectIO } from './logic-builder-io';

/** :625-666 — the parameters, in order (the eleventh shadows the global console). */
const PARAMETERS = ['Inputs', 'Outputs', 'Noodl', 'Variables', 'Objects', 'Arrays', 'sendSignalOnOutput', '__triggerSignal__', '__p', '__s', 'console'] as const;

// ---------------------------------------------------------------------------------------------
// THE FIXTURES — the blocks and the code the editor writes from them
// ---------------------------------------------------------------------------------------------

type Block = { type: string; fields?: Record<string, string>; inputs?: Record<string, { block: Block }>; next?: { block: Block } };

const field = (type: string, NAME: string, TYPE?: string): Block => ({ type, fields: TYPE === undefined ? { NAME } : { NAME, TYPE } });
/** A workspace as the block editor saves it: each block a stack of its own (`detectIO` walks every top-level block). */
const workspace = (...blocks: Block[]): string => JSON.stringify({ blocks: { languageVersion: 0, blocks } });

const defineInput = (name: string, type = '*') => field('noodl_define_input', name, type);
const getInput = (name: string) => field('noodl_get_input', name);
const defineOutput = (name: string, type = '*') => field('noodl_define_output', name, type);
const setOutput = (name: string) => field('noodl_set_output', name);
const hat = (name: string) => field('noodl_when_signal', name);
const defineSignalInput = (name: string) => field('noodl_define_signal_input', name);
const defineSignalOutput = (name: string) => field('noodl_define_signal_output', name);
const sendSignal = (name: string) => field('noodl_send_signal', name);

/**
 * THE FIXTURES (NSP-017 §3, AC2) — one program per rule of the contract: the blocks (`workspace`) and the JavaScript the editor
 * writes from them (`code`, in NoodlGenerators.ts's shapes, with the probe calls every block is wrapped in). A planted break of the
 * rule a fixture names turns its scenario red (noodl-runtime/test/node-spec/logic-builder-contract.test.ts). Names keep ONE kind
 * across all of them (a value never a signal elsewhere): the play carries every fixture's outputs at once.
 */
export const LOGIC_BUILDER_FIXTURES = {
  /** inputs arrive by name and wait for Run; the values written land after the code, then Success, then Done; `__p` hands its value back */
  sum: {
    workspace: workspace(defineInput('a', 'number'), defineInput('b', 'number'), defineOutput('sum', 'number'), setOutput('sum')),
    code: '__s("s1");\nOutputs["sum"] = __p("v1", __p("v2", Inputs["a"]) + __p("v3", Inputs["b"]));\n'
  },
  /** a signal input the blocks declare runs the whole program, as Run does, and `__triggerSignal__` names it */
  trigger: {
    workspace: workspace(hat('go'), defineSignalInput('stop'), defineOutput('by', 'string'), setOutput('by')),
    code: '__s("s1");\nOutputs["by"] = __p("v1", __triggerSignal__);\n'
  },
  /** a signal sent fires at once — before the values the same run wrote */
  signal: {
    workspace: workspace(defineSignalOutput('ping'), sendSignal('ping'), getInput('a'), setOutput('sent')),
    code: '__s("s1");\nsendSignalOnOutput("ping");\n__s("s2");\nOutputs["sent"] = __p("v1", Inputs["a"]);\n'
  },
  /** a throw: the signal sent before it fires, the value written before it is dropped; Error, a failure */
  throws: {
    workspace: workspace(sendSignal('ping'), setOutput('sum'), getInput('a')),
    code: '__s("s1");\nsendSignalOnOutput("ping");\n__s("s2");\nOutputs["sum"] = __p("v1", 1);\n__s("s3");\nthrow new Error("boom " + __p("v2", Inputs["a"]));\n'
  },
  /** whatever is thrown: its message, or its text when it has none (`throw null` reads "null") */
  thrown: {
    workspace: workspace(getInput('a')),
    code: '__s("s1");\nthrow __p("v1", Inputs["a"]);\n'
  },
  /** a throw in a run a signal input started: the same failure, and what the code wrote to Inputs before it stays written */
  tally: {
    workspace: workspace(hat('go'), defineSignalInput('stop'), getInput('n')),
    code: '__s("s1");\nInputs["n"] = __p("v1", (Inputs["n"] || 0) + 1);\n__s("s2");\nthrow "thrown " + __p("v2", __triggerSignal__) + " " + __p("v3", Inputs["n"]);\n'
  },
  /** code that will not compile: reported at the run, never at the write */
  broken: {
    workspace: workspace(defineOutput('sum', 'number'), setOutput('sum')),
    code: 'Outputs["sum"] = (;\n'
  },
  /** no code: Unchanged */
  empty: {
    workspace: workspace(defineInput('a'), defineOutput('sum')),
    code: ''
  },
  /** the code writes to Inputs: the next run reads what it wrote; a value of undefined is never sent */
  kept: {
    workspace: workspace(getInput('a'), getInput('z'), setOutput('kept'), setOutput('none')),
    code: '__s("s1");\nOutputs["kept"] = __p("v1", Inputs["a"]);\n__s("s2");\nInputs["a"] = "seen";\n__s("s3");\nOutputs["none"] = __p("v2", Inputs["z"]);\n'
  },
  /** a value written to a name the node owns: the others land, then Error says so and the run fails */
  reserved: {
    workspace: workspace(getInput('a'), setOutput('sum'), setOutput('done')),
    code: '__s("s1");\nOutputs["sum"] = __p("v1", Inputs["a"]);\n__s("s2");\nOutputs["done"] = __p("v2", 1);\n'
  },
  /** a signal sent to a name the node owns: Failure at once — and the run goes on to Success and Done */
  reservedSignal: {
    workspace: workspace(sendSignal('done'), getInput('a'), setOutput('sum')),
    code: '__s("s1");\nsendSignalOnOutput("done");\n__s("s2");\nOutputs["sum"] = __p("v1", Inputs["a"]);\n'
  }
} as const;

const FIXTURES = Object.values(LOGIC_BUILDER_FIXTURES);

// ---------------------------------------------------------------------------------------------
// THE RUN
// ---------------------------------------------------------------------------------------------

export type LogicBuilderState = {
  /** :748-763 — the text the code is compiled from, or `undefined` (none). */
  code: string | undefined;
  /** :187 `inputValues` — `Inputs`, as the code last left it. */
  inputs: Readonly<Record<string, unknown>>;
  /** :188 `outputValues` — what each value output last landed. */
  outputs: Readonly<Record<string, unknown>>;
  /** :186 `executionError` — what the Error getter reads (:806-808): blank when none. */
  error: string;
};

/** :610-676 — compiled by the same constructor over the same parameters, so a failure carries the engine's own words. */
function compile(code: string): { fn?: (...args: unknown[]) => unknown; error?: string } {
  try {
    return { fn: new Function(...PARAMETERS, code) as (...args: unknown[]) => unknown };
  } catch (e) {
    // :673
    return { error: e && (e as Error).message ? String((e as Error).message) : String(e) };
  }
}

/** :282-312 `_fail`'s message for a name the node owns, written (:486) or sent (:570). */
const reservedValue = (name: string) => '"' + name + '" is one of the node\'s own output ports and cannot be set from the blocks';
const reservedSignal = (name: string) => '"' + name + '" is one of the node\'s own output signals and cannot be sent from the blocks';

type Pulse = 'failure' | 'success' | { derived: string };

/** :378-526 — one run, started by `trigger`. */
function run(s: Readonly<LogicBuilderState>, trigger: string, _world: { send(port: string, state?: Readonly<Record<string, unknown>>): void }) {
  const code = s.code || '';
  // :385-422 — no code: Unchanged; code that will not compile: Error, a failure
  if (!code) return { says: 'no Generated Code: nothing runs', outcome: 'unchanged' as const };
  const compiled = compile(code);
  if (!compiled.fn) {
    const error = 'The blocks could not be compiled: ' + compiled.error;
    return { says: "code that will not compile: Error says so, in the engine's words — nothing runs", set: { error }, send: ['error' as const], outcome: 'failure' as const, error: 'logic-builder/code-not-compiled' };
  }
  const inputs: Record<string, unknown> = { ...s.inputs };
  const written: Record<string, unknown> = {};
  const pulses: Pulse[] = [];
  // :582-597 — a signal fires at once; a name the node owns is remembered (the first) and fails the run after the code (v2, C149)
  let refused: string | null = null;
  const send = (name: string) => {
    if (RESERVED_OUTPUTS.indexOf(name) !== -1) {
      if (refused === null) refused = name;
      return;
    }
    pulses.push({ derived: name });
  };
  try {
    // :448-461 — no receiver; `__p` hands its value back, `__s` does nothing (blockrun.ts)
    compiled.fn(inputs, written, {}, undefined, undefined, undefined, send, trigger, (_id: unknown, v: unknown) => v, () => undefined, console);
  } catch (e) {
    // :503-511 — the values written are dropped; the signals sent have fired
    const message = e && (e as Error).message ? String((e as Error).message) : String(e);
    return {
      says: 'the code throws: the signals it sent before the throw have fired, the values it wrote are dropped, what it wrote to Inputs stays; Error is the message (or the thrown text)',
      set: { inputs, error: message },
      send: ['error' as const],
      sendDerived: [],
      pulses,
      outcome: 'failure' as const,
      error: 'logic-builder/blocks-threw'
    };
  }
  // :466-481 — each value lands after the code, in the order first written, and is sent; a name the node owns is skipped
  const outputs: Record<string, unknown> = { ...s.outputs };
  const sent: string[] = [];
  let reserved: string | null = null;
  for (const name of Object.keys(written)) {
    if (RESERVED_OUTPUTS.indexOf(name) !== -1) {
      reserved = name;
      continue;
    }
    outputs[name] = written[name];
    sent.push(name);
  }
  if (refused !== null) {
    // :487-497 (v2, C149) — the signal side answers as the value side does
    return {
      says: "a signal sent to a name the node owns (Done, Failure, Success …): that send does nothing; the other signals have fired, the values written land, then Error names it — no Success",
      set: { inputs, outputs, error: reservedSignal(refused) },
      send: ['error' as const],
      sendDerived: sent,
      pulses,
      outcome: 'failure' as const,
      error: 'logic-builder/reserved-port-name'
    };
  }
  if (reserved !== null) {
    // :483-490
    return {
      says: 'a value written to a name the node owns (Error, Done …): the signals have fired, the other values land, then Error names it — no Success',
      set: { inputs, outputs, error: reservedValue(reserved) },
      send: ['error' as const],
      sendDerived: sent,
      pulses,
      outcome: 'failure' as const,
      error: 'logic-builder/reserved-port-name'
    };
  }
  // :492-502 — Error cleared to blank and sent, Success, then Done
  return {
    says: 'the code runs through: the signals it sent have fired, in its order; the values it wrote land after it, each sent every run, the same value too (undefined never); Error goes blank, then Success',
    set: { inputs, outputs, error: '' },
    send: ['error' as const],
    sendDerived: sent,
    pulses: [...pulses, 'success' as const],
    outcome: 'done' as const
  };
}

/** The ports a workspace's blocks name, without the node's own (:833-883). */
function blockPorts(ws: unknown) {
  const io = detectIO(typeof ws === 'string' ? ws : undefined);
  const own = (list: readonly string[]) => (n: string) => list.indexOf(n) === -1;
  return {
    inputs: io.inputs.map((p) => p.name).filter(own(RESERVED_INPUTS)),
    signalInputs: io.signalInputs.filter(own(RESERVED_INPUTS)),
    outputs: io.outputs.map((p) => p.name).filter(own(RESERVED_OUTPUTS)),
    signalOutputs: io.signalOutputs.filter(own(RESERVED_OUTPUTS))
  };
}

/** THE PLAY'S PORTS (header): the outputs of the placing's blocks and of every fixture's — a signal wherever any of them says so. */
function playOutputs(params: Readonly<Record<string, unknown>>): { signals: string[]; values: string[] } {
  const signals: string[] = [];
  const values: string[] = [];
  for (const ws of [params.workspace, ...FIXTURES.map((f) => f.workspace)]) {
    const p = blockPorts(ws);
    for (const n of p.signalOutputs) if (!signals.includes(n)) signals.push(n);
    for (const n of p.outputs) if (!values.includes(n)) values.push(n);
  }
  return { signals, values: values.filter((n) => !signals.includes(n)) };
}

/** A value input (:246-251) — kept, no conversion. */
const valuePort = (): InputDecl => ({ type: '*', coerce: 'none' });
/** A signal input (:233-241) — an action port like Run: it mints an invocation. */
const signalPort = (): InputDecl => ({ type: 'signal', outcome: true });

export const LogicBuilder = defineNode({
  type: 'Logic Builder',
  // v2 (P109 ISL-051, s34): a name the node owns SENT fails the run as one written does — no Success, no Done (row C149)
  version: 2,
  source: 'packages/noodl-runtime/src/nodes/std-library/logic-builder.ts',
  contract:
    'ports from the blocks, never the code, each kind decided once; runs on Run and on each declared signal input, the whole program, never on a value; Inputs kept across runs, Outputs fresh; __triggerSignal__, __p, __s; signals at once, values after the code, every run; a throw drops the values; a compile failure; no code; a name the node owns written or sent — LOGIC_BUILDER_FIXTURES, one per rule',

  state: { code: undefined, inputs: {}, outputs: {}, error: '' } as LogicBuilderState,
  // :712-720
  inspect: (s) => (s.error ? 'Error: ' + s.error : 'Visual Function'),
  // :794-800 (outcomeOutputs: done, unchanged, failure) — Failure is also pulsed on its own (:310)
  outcomes: ['done', 'unchanged', 'failure'],

  inputs: {
    // :730-747 — the blocks: the ports, never the behaviour; nothing runs
    workspace: {
      type: 'string',
      coerce: 'none',
      editOnly: true,
      displayName: 'Logic Blocks',
      group: 'General',
      description:
        'The block program itself, authored in the block editor — it decides which ports this node has, so editing it adds and removes ports',
      examples: ['', '{', ...FIXTURES.map((f) => f.workspace)]
    },
    // :748-764 — the code the blocks are written out as: compiled at the next run
    generatedCode: {
      type: 'string',
      coerce: 'none',
      editOnly: true,
      displayName: 'Generated Code',
      group: 'Advanced',
      description:
        'The JavaScript the block editor writes out of Logic Blocks and the runtime actually executes; it is overwritten on every block edit, so hand edits do not survive',
      examples: FIXTURES.map((f) => f.code)
    },
    // :765-781
    run: {
      type: 'signal',
      outcome: true,
      displayName: 'Run',
      group: 'Actions',
      description: 'Runs the block program once; the blocks never run on their own, so a value arriving at an input changes nothing until this fires'
    }
  },

  outputs: {
    // :788-793
    success: { type: 'signal', displayName: 'Success', group: 'Status', description: 'Fires once the block program has run through without throwing and every output it wrote is up to date' },
    // :801-809
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Status', description: "What the last run went wrong with, in JavaScript's own words; empty once a run succeeds" }
  }
}).on(
  {
    // :759-763 — kept, compiled at the next run
    generatedCode: (_s, v) => ({ says: 'always: kept, and compiled at the next Run or declared signal — nothing runs now, and a text that will not compile is reported then', set: { code: v as string | undefined }, send: [] }),
    // :740-746 — nothing on the wire: the kinds are the placing's (A PORT'S KIND, header)
    workspace: () => ({ says: 'always: nothing on the wire — the blocks decide the ports when the node is placed, and the code that runs is Generated Code', set: {}, send: [] }),
    // :771-780
    run: (s, _i, world) => run(s, 'run', world)
  },
  {
    derived: {
      // A PORT'S KIND (header) — the placing's blocks: each value input, each signal input
      inputs: (params) => {
        const p = blockPorts(params.workspace);
        const ports: Record<string, InputDecl> = {};
        for (const n of p.inputs) ports[n] = valuePort();
        // :228 — a name both a value and a signal is the signal
        for (const n of p.signalInputs) ports[n] = signalPort();
        return ports;
      },
      // THE PLAY'S PORTS (header) — the value outputs read what last landed; the signals are the code's to send
      outputs: (params) => {
        const { signals, values } = playOutputs(params);
        const out: Record<string, OutputDecl<LogicBuilderState>> = {};
        for (const n of values) out[n] = { type: '*', from: (s: Readonly<LogicBuilderState>) => s.outputs[n] };
        for (const n of signals) out[n] = { type: 'signal' };
        return out;
      },
      // :246-251 — a value: kept, nothing runs
      on: (s, port, value) => ({ set: { inputs: { ...s.inputs, [port]: value } }, send: [] }),
      // :233-241 — a signal input: the whole program, at once
      signal: (s, port, _d, world) => run(s, port, world),
      // :220-253 — any name is an input on its first touch
      discover: () => valuePort(),
      candidates: ['a', 'b', 'z']
    }
  }
);
