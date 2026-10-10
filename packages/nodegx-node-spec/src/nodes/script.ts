/**
 * Script (`Javascript2`) — read from `packages/noodl-viewer-react/src/nodes/std-library/javascript.ts` and
 * `packages/noodl-runtime/src/javascriptnodeparser.js` on 2026-10-09 (NSP-017, s66), with node.ts's update loop (:632-790) and
 * `scheduleAfterInputsHaveUpdated` (:1294-1297), `sendSignalOnOutput` (:859-872) and `flagOutputDirty` (:848-851) beside them.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from (javascript.ts unless named).
 *
 * A CONTRACT, NOT A BEHAVIOUR (NSP-017 AC3) — as the Function's. The person writes the code; this spec runs the same text the same
 * way — compiled over the same four parameters (`define`, `script`, `Node`, `Component`) with the same prefix, sourced once per parse,
 * its functions called with the same receiver and arguments — and writes down everything AROUND it. It is graded with the FIXTURES
 * below, one script per rule, and the ledger counts it as a contract (`spec-ledger.js`).
 *
 * THE RULES:
 *   - THREE WAYS TO WRITE IT (javascriptnodeparser.js): `define({ inputs, outputs, setup, run | change, destroy, <signal>() })`
 *     (:47-55) — the object itself is where a signal's function is looked up; `script({ inputs, outputs, signals, changed, methods,
 *     setup, destroy })` (:58-130) — `setup` puts `inputs`, `outputs`, `setOutputs` and the methods on `this`, a run calls `changed.<x>`
 *     (new, old) for each input that is not `===` what it was at the last run, and each of `signals` is a signal input; and, when the
 *     code calls neither, the `Node` (alias `Script`, the prefix :492-495) object (:159-212) — `Node.Inputs` / `Node.Outputs` name the
 *     ports while the code is read, then ARE the values (:443-444), `Node.Setters.<x>` is called for each input that arrived,
 *     `Node.OnInputsChanged` after them, `Node.OnInit` at setup, `Node.Signals.<x>` is a signal input, `Node.setOutputs` writes several.
 *     A throw while the code is read is a parse failure (:29-43).
 *   - WHEN THE CODE IS READ — the Code set to text, at the frame's end (:302-316); text that is empty is ignored and the code before
 *     keeps running (:303). Before reading, the code before is told it is going (its `destroy`, :309). Code that does not compile or
 *     throws while read changes nothing else: the code before keeps its functions — after its `destroy` (:380-391; the raise
 *     `script/source-failed` is not on the wire).
 *   - WHAT A READ STARTS (:416-440) — `setup` asked for (when there is one), then a run (when there is a run function), then every input
 *     that arrived before the FIRST read, in order, as if it arrived now (:433-440; held until then, :651-659, signals too).
 *   - THE FRAME'S END (node.ts :740-790, :1294-1297) — what is asked for runs in the order asked, and what that asks for runs in the same
 *     frame, after (the node is dirty again). Asked for twice before it runs, a setup, a run or a signal's function runs once (:579-623).
 *   - AN INPUT (:636-660) — every arrival of a value, the same value too, is kept on `inputs`, marked in the run's third argument
 *     (`changedInputs`, emptied after each run :604) and asks for a run. A port the node has as a SIGNAL (the play's ports, below) calls
 *     the function of that name — when the code has one — at the frame's end, once however many pulses (:640-645, :610-623); its value is
 *     never kept.
 *   - WHAT THE CODE SEES — `this` is ONE object for the node's life (:193-226), kept across reads of new code: what the code puts there
 *     stays; `inputs` is the node's own object, the same every call; `outputs` has a property per output the node has (:457-485).
 *   - WHAT COMES OUT — `outputs.x = v` keeps the value and sends it (:466-472); a SIGNAL output is a function that fires it (:474-477;
 *     writing one does nothing). `this.sendSignalOnOutput(x)` fires it too; `this.flagOutputDirty(x)` sends `x` again (:204-209, :223).
 *     A write to a name the node has no output for is kept on `outputs` and sends nothing.
 *   - A THROW (:492-508, :520-537, :546-574) — in a run, a signal's function, setup or destroy: what was written before it stays, the
 *     rest of that call does not happen, and nothing reaches the wire (the logs and the editor's warning are not on it). The next call
 *     runs as usual.
 *
 * THE SESSION. A read sources the code once: what its top level makes (a `let` the functions close over, `Node.Setters`) lives in
 * closures as long as that code does. The spec keeps them the only way JavaScript can — live — in a SESSION held by a function in the
 * state (`session`): the interpreter freezes what a reducer sees, and a function is not frozen. Each mount makes its own session.
 *
 * THE PLAY'S PORTS — as the Function's: the editor sends the ports of the code it reads (:831-840) and a project saves them, so the
 * node carries every fixture's ports from the placing (`model.inputPorts` / `model.outputPorts`, read at :394-414 and :640).
 *
 * Not in v1: External File (a network seam — the file's load; `useExternalFile` / `externalFile` are `undriven`), `runNextFrame`
 * (a run at the NEXT frame — a settle's second drain), `createComponent` / `deleteComponent` (a graph seam), `Component` (the
 * component's state objects), colour inputs (:393-410), the node's deletion (`destroy` at :346-350), and a throw of `null` or
 * `undefined` (the logger throws inside the catch — measured as a row, never played: it escapes the frame).
 */

import { defineNode, type InputDecl, type OutputDecl } from '../spec';

/** javascriptnodeparser.js :492-495 — in front of every body. */
const CODE_PREFIX = "const Script = (typeof Node !== 'undefined')?Node:undefined;\n";
/** javascriptnodeparser.js :22 — the parameters, in order. */
const PARAMETERS = ['define', 'script', 'Node', 'Component'];

/**
 * THE FIXTURES (NSP-017 §3, AC2) — one script per rule of the contract, each the Code a play may set. A planted break of the rule it
 * names turns its scenario red (noodl-runtime/test/node-spec/script-contract.test.ts).
 */
export const SCRIPT_FIXTURES = {
  /** define: inputs arrive on `inputs` and run the code (`change`) */
  sum: "define({\n  inputs: { a: 'number', b: 'number' },\n  outputs: { sum: 'number' },\n  change: function (inputs, outputs) {\n    outputs.sum = inputs.a + inputs.b;\n  }\n})",
  /** define's `run`: `this` is kept, and counts the runs — once a frame, once per arrival, the same value too */
  count: "define({\n  inputs: { a: 'number' },\n  outputs: { count: 'number' },\n  run: function (inputs, outputs) {\n    this.n = (this.n || 0) + 1;\n    outputs.count = this.n;\n  }\n})",
  /** the run's third argument: the inputs that arrived since the last run */
  changed: "define({\n  inputs: { a: '*', b: '*' },\n  outputs: { changed: 'string' },\n  change: function (inputs, outputs, changed) {\n    this.k = (this.k || 0) + 1;\n    outputs.changed = this.k + ':' + Object.keys(changed).sort().join(',');\n  }\n})",
  /** a signal input calls the function of its name, once a frame; a signal output is a function on `outputs` */
  signals: "define({\n  inputs: { go: 'signal', a: '*' },\n  outputs: { got: 'string', done: 'signal' },\n  go: function (inputs, outputs) {\n    this.g = (this.g || 0) + 1;\n    outputs.got = this.g + ':' + inputs.a;\n    outputs.done();\n  }\n})",
  /** setup when read, destroy when replaced, and `this` across both */
  lifecycle: "define({\n  outputs: { log: 'string' },\n  setup: function (inputs, outputs) {\n    this.log = (this.log || '') + 's';\n    outputs.log = this.log;\n  },\n  destroy: function () {\n    this.log = (this.log || '') + 'd';\n  },\n  change: function (inputs, outputs) {\n    this.log = (this.log || '') + 'r';\n    outputs.log = this.log;\n  }\n})",
  /** a throw ends the call: what was written before it stays, and the next run runs */
  throws: "define({\n  inputs: { a: '*' },\n  outputs: { before: '*', after: '*' },\n  change: function (inputs, outputs) {\n    outputs.before = inputs.a;\n    if (typeof inputs.a === 'string') throw new Error('boom ' + inputs.a);\n    outputs.after = inputs.a;\n  }\n})",
  /** a throw in a signal's function, and a thrown string: the next pulse runs it again */
  poke: "define({\n  inputs: { poke: 'signal' },\n  outputs: { poked: 'number' },\n  poke: function (inputs, outputs) {\n    this.p = (this.p || 0) + 1;\n    outputs.poked = this.p;\n    if (this.p % 2 === 0) throw 'even';\n  }\n})",
  /** code that does not compile: the code before keeps running, after its destroy */
  broken: "define({\n  outputs: { sum: 'number' },\n  change: function (inputs, outputs) {\n    outputs.sum = (;\n  }\n})",
  /** code that throws while it is read: the same */
  sourced: "throw new Error('while read')",
  /** script(): changed handlers (new, old), methods and setOutputs on `this`, a signal from `signals` */
  scripted: "script({\n  inputs: { a: '*' },\n  outputs: { twice: 'string', seen: 'string', ping: 'signal' },\n  signals: {\n    reset: function () {\n      this.setOutputs({ twice: 'none' });\n      this.outputs.ping();\n    }\n  },\n  changed: {\n    a: function (value, old) {\n      this.outputs.twice = String(value) + String(value);\n      this.outputs.seen = this.label(old);\n    }\n  },\n  methods: {\n    label: function (v) {\n      return 'was ' + v;\n    }\n  }\n})",
  /** the Node object: ports named while read, then the values; Setters, OnInputsChanged, OnInit, Signals, setOutputs; a top-level `let` */
  node: "let runs = 0;\nScript.Inputs = { a: 'number' };\nScript.Outputs = { doubled: 'string', inited: 'boolean', runs: 'number', tick: 'signal' };\nScript.OnInit = function () {\n  Script.setOutputs({ inited: true });\n};\nScript.Setters.a = function (value) {\n  Script.Outputs.doubled = String(Script.Inputs.a) + String(value);\n};\nScript.OnInputsChanged = function () {\n  runs += 1;\n  Script.Outputs.runs = runs;\n};\nScript.Signals.go = function () {\n  Script.Outputs.tick();\n};",
  /** `this.sendSignalOnOutput` and `this.flagOutputDirty`; a write to a name that is no output */
  self: "define({\n  inputs: { a: '*' },\n  outputs: { done: 'signal', echoed: '*' },\n  change: function (inputs, outputs) {\n    outputs.nowhere = inputs.a;\n    outputs.echoed = outputs.nowhere;\n    this.flagOutputDirty('echoed');\n    this.sendSignalOnOutput('done');\n  }\n})",
  /** empty: ignored, the code before keeps running */
  empty: ''
} as const;

const FIXTURE_TEXTS: readonly string[] = Object.values(SCRIPT_FIXTURES);

// ---------------------------------------------------------------------------------------------
// THE PARSER — javascriptnodeparser.js, the same steps
// ---------------------------------------------------------------------------------------------

type Fn = (this: unknown, ...args: unknown[]) => unknown;
type PortMap = Record<string, unknown>;

/** What a read leaves: javascriptnodeparser.js's instance. */
interface Parsed {
  error?: string;
  inputs: PortMap;
  outputs: PortMap;
  setup?: Fn;
  change?: Fn;
  destroy?: Fn;
  definedObject?: Record<string, unknown>;
  apis: { Node: Record<string, unknown> };
}

/** :47-55 — the first generation */
function define(this: Parsed, userObject: Record<string, unknown>): void {
  this.inputs = (userObject.inputs as PortMap) || {};
  this.outputs = (userObject.outputs as PortMap) || {};
  this.setup = userObject.setup as Fn;
  this.change = (userObject.run || userObject.change) as Fn;
  this.destroy = userObject.destroy as Fn;
  this.definedObject = userObject;
}

/** :58-119 — the second generation's object */
function scriptExtend(_this: Record<string, unknown>): Record<string, unknown> {
  const extended: Record<string, unknown> = {
    inputs: _this.inputs || {},
    outputs: _this.outputs || {},
    setup: function (this: Record<string, unknown>, inputs: PortMap, outputs: PortMap) {
      this.inputs = inputs;
      this.outputs = outputs;
      this.setOutputs = function (this: Record<string, unknown>, states: PortMap) {
        for (const key in states) {
          (this.outputs as PortMap)[key] = states[key];
          (this.flagOutputDirty as (k: string) => void)(key);
        }
      };
      if (_this.methods) for (const key in _this.methods as PortMap) this[key] = (_this.methods as PortMap)[key];
      if (_this.setup) (_this.setup as Fn).apply(this);
    },
    destroy: function (this: Record<string, unknown>, inputs: PortMap, outputs: PortMap) {
      this.inputs = inputs;
      this.outputs = outputs;
      if (_this.destroy) (_this.destroy as Fn).apply(this);
    },
    change: function (this: Record<string, unknown>, inputs: PortMap, outputs: PortMap) {
      this.inputs = inputs;
      this.outputs = outputs;
      const old = (this._oldInputs as PortMap) || {};
      if (_this.changed) {
        for (const key in inputs) {
          if (inputs[key] !== old[key]) {
            const changedFunction = (_this.changed as PortMap)[key];
            if (typeof changedFunction === 'function') (changedFunction as Fn).apply(this, [inputs[key], old[key]]);
          }
        }
      }
      this._oldInputs = Object.assign({}, inputs);
    }
  };
  if (_this.signals) {
    for (const key in _this.signals as PortMap) {
      extended[key] = (_this.signals as PortMap)[key];
      (extended.inputs as PortMap)[key] = 'signal';
    }
  }
  return extended;
}

/** :121-130 */
function script(this: Parsed, userObject: Record<string, unknown>): void {
  const extended = scriptExtend(userObject);
  this.inputs = (extended.inputs as PortMap) || {};
  this.outputs = (extended.outputs as PortMap) || {};
  this.setup = extended.setup as Fn;
  this.change = (extended.run || extended.change) as Fn;
  this.destroy = extended.destroy as Fn;
  this.definedObject = extended;
}

/** :159-212 — the third generation, when neither was called */
function afterSourced(p: Parsed): void {
  if (p.definedObject !== undefined) return;
  const node = p.apis.Node;
  p.inputs = Object.assign({}, (node.Inputs as PortMap) || {});
  p.outputs = Object.assign({}, (node.Outputs as PortMap) || {});
  p.setup = function (this: Record<string, unknown>, _inputs: PortMap, outputs: PortMap) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    node.setOutputs = function (o: PortMap) {
      for (const key in o) {
        outputs[key] = o[key];
        (self.flagOutputDirty as (k: string) => void)(key);
      }
    };
    if (node.OnInit) (node.OnInit as Fn).apply(this);
  } as Fn;
  // :181 — `this.destory` (sic) is always undefined
  p.destroy = node.OnDestroy as Fn;
  p.change = ((inputs: PortMap, _outputs: PortMap, changedInputs: PortMap) => {
    for (const key in changedInputs) {
      if (typeof (node.Setters as PortMap)[key] === 'function') ((node.Setters as PortMap)[key] as Fn)(inputs[key]);
    }
    if (typeof node.OnInputsChanged === 'function') (node.OnInputsChanged as Fn)();
  }) as Fn;
  p.definedObject = { inputs: p.inputs, outputs: p.outputs, setup: p.setup, destroy: p.destroy, change: p.change };
  if (node.Signals !== undefined) {
    for (const key in node.Signals as PortMap) {
      if (typeof (node.Signals as PortMap)[key] === 'function') {
        p.inputs[key] = 'signal';
        p.definedObject[key] = (node.Signals as PortMap)[key];
      }
    }
  }
}

/** :10-44 — compiled over the four parameters and sourced once; a compile failure or a throw while read is `error` */
function read(code: string): Parsed {
  const p: Parsed = { inputs: {}, outputs: {}, apis: { Node: { Inputs: {}, Outputs: {}, Signals: {}, Setters: {} } } };
  let userCode: Fn;
  try {
    userCode = new Function(PARAMETERS.join(','), CODE_PREFIX + code) as Fn;
  } catch (e) {
    p.error = (e as Error).message;
    return p;
  }
  try {
    userCode(define.bind(p), script.bind(p), p.apis.Node, {});
    afterSourced(p);
  } catch (e) {
    p.error = (e as Error).message;
  }
  return p;
}

// ---------------------------------------------------------------------------------------------
// THE PLAY'S PORTS — what the editor draws for a code (:772-840, javascriptnodeparser.js :294-430)
// ---------------------------------------------------------------------------------------------

type Ports = { inputs: Record<string, 'signal' | 'value'>; outputs: Record<string, 'signal' | 'value'> };

const typeName = (t: unknown): unknown => (t && typeof t === 'object' ? (t as { name?: unknown }).name : t);

/** javascriptnodeparser.js :294-388 — the names the text itself mentions (only those not already a port of that plug) */
function scanned(code: string, ports: Ports): void {
  const add = (re: RegExp, plug: 'inputs' | 'outputs', kind: 'signal' | 'value') => {
    for (const m of code.matchAll(re)) {
      const name = m[1];
      if (name !== undefined && ports[plug][name] === undefined) ports[plug][name] = kind;
    }
  };
  add(/Inputs\.([A-Za-z0-9_]+)/g, 'inputs', 'value');
  add(/Outputs\.([A-Za-z0-9]+)\s*\(\s*\)/g, 'outputs', 'signal');
  add(/Outputs\s*\[\s*(?:'|")(.*)(?:'|")\s*\]\(\s*\)/g, 'outputs', 'signal');
  add(/Outputs\.([A-Za-z0-9_]+)/g, 'outputs', 'value');
  add(/Outputs\s*\[\s*"([^"]*)"\s*\]/g, 'outputs', 'value');
}

type Row = { label?: unknown };
const labelsOf = (list: unknown): string[] =>
  Array.isArray(list) ? list.map((r: Row) => r && r.label).filter((l): l is string => typeof l === 'string' && l.length > 0) : [];

/** :772-840 — the written lists first (each with its type picker), then what the code declares, then what its text names */
function portsOf(params: Readonly<Record<string, unknown>>, code: unknown, into: Ports): void {
  for (const label of labelsOf(params.scriptOutputs)) {
    if (into.inputs['outtype-' + label] === undefined) into.inputs['outtype-' + label] = 'value';
    if (into.outputs[label] === undefined) into.outputs[label] = params['outtype-' + label] === 'signal' ? 'signal' : 'value';
  }
  for (const label of labelsOf(params.scriptInputs)) {
    if (into.inputs['intype-' + label] === undefined) into.inputs['intype-' + label] = 'value';
    if (into.inputs[label] === undefined) into.inputs[label] = 'value';
  }
  if (typeof code !== 'string' || !code) return;
  const p = read(code);
  for (const [name, t] of Object.entries(p.inputs)) if (into.inputs[name] === undefined) into.inputs[name] = typeName(t) === 'signal' ? 'signal' : 'value';
  for (const [name, t] of Object.entries(p.outputs)) if (into.outputs[name] === undefined) into.outputs[name] = typeName(t) === 'signal' ? 'signal' : 'value';
  scanned(code, into);
}

/** THE PLAY'S PORTS (header): the params' code and lists, then every fixture's */
function playPorts(params: Readonly<Record<string, unknown>>): Ports {
  const ports: Ports = { inputs: {}, outputs: {} };
  portsOf(params, params.code, ports);
  for (const text of FIXTURE_TEXTS) portsOf({}, text, ports);
  return ports;
}

// ---------------------------------------------------------------------------------------------
// THE SESSION — the node's live objects (header)
// ---------------------------------------------------------------------------------------------

interface Session {
  /** :193-226 `userFunctionScope` — `this`, for the node's life */
  scope: Record<string, unknown>;
  /** :175 `inputValues` — `inputs` */
  inputs: PortMap;
  /** :176 `outputValues` */
  values: PortMap;
  /** :177 `outputProperties` — `outputs` */
  outputs: PortMap;
  /** :187 `changedInputs` */
  changed: Record<string, boolean>;
  /** :134-137 — the functions of the code read last */
  setup?: Fn;
  run?: Fn;
  destroy?: Fn;
  definedObject?: Record<string, unknown>;
  /** what the frame sent and fired, in order */
  sent: string[];
  fired: string[];
}

function openSession(ports: Ports): Session {
  const s: Session = { scope: {}, inputs: {}, values: {}, outputs: {}, changed: {}, sent: [], fired: [] };
  const send = (name: string) => {
    if (!s.sent.includes(name)) s.sent.push(name);
  };
  const fire = (name: string) => {
    // node.ts :859-863 — an output the node does not have: nothing
    if (ports.outputs[name] === 'signal') s.fired.push(name);
    else if (ports.outputs[name] === 'value') send(name);
  };
  // :204-225 — what the code may call on `this`
  s.scope.flagOutputDirty = (name: string) => {
    if (!name) throw new Error('Output port name must be specified');
    // node.ts :848-851 — `getOutput(name).value`: a name the node has no output for throws
    if (ports.outputs[name] === undefined) throw new TypeError("Cannot read properties of undefined (reading 'value')");
    send(name);
  };
  s.scope.sendSignalOnOutput = (name: string) => fire(name);
  for (const name of ['createComponent', 'deleteComponent', 'runNextFrame']) {
    s.scope[name] = () => {
      throw new Error(`Script v1: ${name} is not in the contract yet`);
    };
  }
  // :457-485 — a property per output: a value is kept and sent, a signal is a function that fires it
  for (const [name, kind] of Object.entries(ports.outputs)) {
    Object.defineProperty(s.outputs, name, {
      set: (value: unknown) => {
        if (kind === 'signal') return;
        s.values[name] = value;
        send(name);
      },
      get: () => (kind === 'signal' ? () => fire(name) : s.values[name]),
      enumerable: false,
      configurable: false
    });
  }
  return s;
}

const NO_SESSION: () => Session = () => {
  throw new Error('Script: no session — the node was not mounted');
};

// ---------------------------------------------------------------------------------------------
// THE STATE AND THE FRAME
// ---------------------------------------------------------------------------------------------

/** What waits for the frame's end, in the order asked (node.ts :1294-1297) */
type Callback = { kind: 'read'; code: string } | { kind: 'setup' } | { kind: 'run' } | { kind: 'signal'; port: string };

export type ScriptState = {
  /** THE SESSION (header) */
  session: () => Session;
  /** the play's ports, fixed at the placing */
  signalsIn: readonly string[];
  /** :186 `hasParsedCode` */
  parsed: boolean;
  /** :190 `inputQueue` — what arrived before the first read; null after it */
  queue: ReadonlyArray<{ port: string; value: unknown }> | null;
  /** node.ts `_afterInputsHaveUpdatedCallbacks` */
  callbacks: readonly Callback[];
  /** :178-179, :188 */
  runScheduled: boolean;
  setupScheduled: boolean;
  signalScheduled: Readonly<Record<string, true>>;
  /** what the outputs hold (read by the derived outputs) */
  outs: Readonly<Record<string, unknown>>;
};

/** The frame's work on a draft */
interface Draft {
  s: Session;
  signalsIn: readonly string[];
  parsed: boolean;
  queue: Array<{ port: string; value: unknown }> | null;
  callbacks: Callback[];
  runScheduled: boolean;
  setupScheduled: boolean;
  signalScheduled: Record<string, true>;
}

const draftOf = (st: Readonly<ScriptState>): Draft => ({
  s: st.session(),
  signalsIn: st.signalsIn,
  parsed: st.parsed,
  queue: st.queue ? [...st.queue] : null,
  callbacks: [...st.callbacks],
  runScheduled: st.runScheduled,
  setupScheduled: st.setupScheduled,
  signalScheduled: { ...st.signalScheduled }
});

/** The draft back into a patch: the state, what was sent and what fired */
function patchOf(d: Draft) {
  const sent = d.s.sent;
  const fired = d.s.fired;
  d.s.sent = [];
  d.s.fired = [];
  return {
    set: {
      parsed: d.parsed,
      queue: d.queue,
      callbacks: d.callbacks,
      runScheduled: d.runScheduled,
      setupScheduled: d.setupScheduled,
      signalScheduled: d.signalScheduled,
      outs: { ...d.s.values }
    } as Partial<ScriptState>,
    send: [] as never[],
    sendDerived: sent,
    emitDerived: fired
  };
}

/** :594-608 */
function scheduleRun(d: Draft): void {
  if (d.runScheduled) return;
  d.runScheduled = true;
  d.callbacks.push({ kind: 'run' });
}
/** :579-592 */
function scheduleSetup(d: Draft): void {
  if (d.setupScheduled) return;
  d.setupScheduled = true;
  d.callbacks.push({ kind: 'setup' });
}
/** :610-623 */
function scheduleSignal(d: Draft, port: string): void {
  if (d.signalScheduled[port]) return;
  d.signalScheduled[port] = true;
  d.callbacks.push({ kind: 'signal', port });
}

/** :636-660 `userInputSetter` */
function arrive(d: Draft, port: string, value: unknown): void {
  if (!d.parsed) {
    d.queue!.push({ port, value });
    return;
  }
  if (d.signalsIn.includes(port)) {
    if (d.s.definedObject && typeof d.s.definedObject[port] === 'function' && value) scheduleSignal(d, port);
    return;
  }
  d.s.inputs[port] = value;
  d.s.changed[port] = true;
  scheduleRun(d);
}

/** A call into the code: a throw ends it, and nothing reaches the wire (:492-574) */
function call(fn: Fn | undefined, d: Draft, args: unknown[]): void {
  if (!fn) return;
  try {
    fn.apply(d.s.scope, args);
  } catch {
    // :499-507, :526-536, :548-556, :566-573 — logged, and the editor's warning: not on the wire
  }
}

/** :302-316 → :358-445 — the code read at the frame's end */
function readCode(d: Draft, code: string): void {
  // :309 — the code before is told it is going
  call(d.s.destroy, d, [d.s.inputs, d.s.outputs]);
  const p = read(code);
  // :380-391 — a failure changes nothing else
  if (p.error !== undefined) return;
  d.s.setup = p.setup;
  d.s.run = p.change;
  d.s.destroy = p.destroy;
  d.s.definedObject = p.definedObject;
  if (d.s.setup) scheduleSetup(d);
  if (d.s.run) scheduleRun(d);
  d.parsed = true;
  // :433-440 — what arrived before the first read, as if it arrived now
  if (d.queue) {
    const queued = d.queue;
    d.queue = [];
    for (const { port, value } of queued) arrive(d, port, value);
    d.queue = null;
  }
  // :443-444 — the Node object's ports are the values from now on
  p.apis.Node.Inputs = d.s.inputs;
  p.apis.Node.Outputs = d.s.outputs;
}

/** node.ts :740-790 — what waits runs in order; what that asks for runs in the same frame, after */
function frame(d: Draft): void {
  for (let pass = 0; d.callbacks.length > 0 && pass < 100; pass++) {
    const list = d.callbacks;
    d.callbacks = [];
    for (const cb of list) {
      if (cb.kind === 'read') readCode(d, cb.code);
      else if (cb.kind === 'setup') {
        // :586-591
        call(d.s.setup, d, [d.s.inputs, d.s.outputs]);
        d.setupScheduled = false;
      } else if (cb.kind === 'run') {
        // :601-607, :486-498
        call(d.s.run, d, [d.s.inputs, d.s.outputs, d.s.changed]);
        d.s.changed = {};
        d.runScheduled = false;
      } else {
        // :617-622, :510-525 — the function of that name on the code's object
        const fn = d.s.definedObject && typeof d.s.definedObject[cb.port] === 'function' ? (d.s.definedObject[cb.port] as Fn) : undefined;
        call(fn, d, [d.s.inputs, d.s.outputs]);
        const rest = { ...d.signalScheduled };
        delete rest[cb.port];
        d.signalScheduled = rest;
      }
    }
  }
}

/** Any port the node does not declare is the code's: a value, kept and run on (:446-456) */
const valuePort = (): InputDecl => ({ type: '*', coerce: 'none' });
const signalPort = (): InputDecl => ({ type: 'signal' });

export const Script = defineNode({
  type: 'Javascript2',
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/javascript.ts',
  contract:
    'three ways to write it (define, script, the Node object); when the code is read (the Code, at the frame end; empty ignored; a failure keeps the code before, after its destroy); what a read starts (setup, a run, the inputs held before it); once a frame; inputs and signal inputs; this kept for the node\'s life; outputs and signal outputs; a throw ends the call — SCRIPT_FIXTURES, one per rule',

  state: {
    session: NO_SESSION,
    signalsIn: [],
    parsed: false,
    queue: [],
    callbacks: [],
    runScheduled: false,
    setupScheduled: false,
    signalScheduled: {},
    outs: {}
  } as ScriptState,
  init: (_w, params) => {
    const ports = playPorts(params);
    const session = openSession(ports);
    return { session: () => session, signalsIn: Object.keys(ports.inputs).filter((n) => ports.inputs[n] === 'signal') };
  },
  inspect: (s) => JSON.stringify({ parsed: s.parsed, outs: s.outs }),

  inputs: {
    // :241-251 — panel only; each row is an input port (derived, below)
    scriptInputs: { type: 'proplist', coerce: 'none', editOnly: true, group: 'Script Inputs', description: 'Names of the values the script reads, each becoming an input port' },
    // :252-262
    scriptOutputs: { type: 'proplist', coerce: 'none', editOnly: true, group: 'Script Outputs', description: 'Names of the values the script writes, each becoming an output port' },
    // :263-286
    useExternalFile: {
      type: 'enum',
      enums: ['yes', 'no'],
      default: 'no',
      coerce: 'none',
      editOnly: true,
      displayName: 'Use External File',
      group: 'Code',
      description: 'Whether the code is loaded from File Path instead of being typed into Code',
      undriven: 'v2: External File is a network seam (the file is loaded); Yes alone holds the node until a file arrives'
    },
    // :287-317
    code: {
      type: 'string',
      default: '',
      coerce: 'none',
      editOnly: true,
      displayName: 'Code',
      group: 'Code',
      description: 'The script, which declares its own ports through the define API',
      examples: [...FIXTURE_TEXTS]
    },
    // :318-343
    externalFile: {
      type: 'string',
      coerce: 'none',
      editOnly: true,
      displayName: 'File Path',
      group: 'Code',
      description: 'Where to load the script from; used only when Use External File is Yes',
      undriven: 'v2: External File is a network seam (the file is loaded)'
    }
  },

  outputs: {}
}).on(
  {
    // :302-316 — empty text is nothing; any other is read at the frame's end
    code: (s, v) => {
      if (!v) return { says: 'empty text: ignored — the code before keeps running', set: {}, send: [] as never[] };
      return {
        says: "new text: read at the frame's end — the code before is told it is going (its destroy), then the new code's setup and run are asked for, and every value and signal that arrived before the first read is handed to it; text that will not compile, or throws while read, leaves the code before running, after its destroy — nothing reaches the wire for that",
        set: { callbacks: [...s.callbacks, { kind: 'read' as const, code: v as string }] },
        send: [] as never[]
      };
    }
  },
  {
    // node.ts :740-790 — the frame's end
    afterInputs: (s) => {
      if (s.callbacks.length === 0) return { set: {}, send: [] as never[] };
      const d = draftOf(s);
      frame(d);
      return patchOf(d);
    },

    derived: {
      // :772-840 — the written rows with their type pickers, then each port the code declares or names
      inputs: (params) => {
        const ports: Record<string, InputDecl> = {};
        for (const [name, kind] of Object.entries(playPorts(params).inputs)) ports[name] = kind === 'signal' ? signalPort() : valuePort();
        return ports;
      },
      // THE PLAY'S PORTS — the value outputs read what the code last wrote; the signals are the code's to fire
      outputs: (params) => {
        const out: Record<string, OutputDecl<ScriptState>> = {};
        for (const [name, kind] of Object.entries(playPorts(params).outputs)) {
          out[name] = kind === 'signal' ? { type: 'signal' } : { type: '*', from: (s: Readonly<ScriptState>) => s.outs[name] };
        }
        return out;
      },
      // :636-660 — a value: kept, marked and a run asked for (or held before the first read)
      on: (s, port, value) => {
        const d = draftOf(s);
        arrive(d, port, value);
        return patchOf(d);
      },
      // :640-645 — a pulse: true, then false (the target's edge); held before the first read, both
      signal: (s, port) => {
        const d = draftOf(s);
        arrive(d, port, true);
        arrive(d, port, false);
        return patchOf(d);
      },
      // :446-456 — any name is an input on its first write
      discover: () => valuePort(),
      candidates: ['a', 'b', 'z']
    }
  }
);
