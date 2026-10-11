/**
 * Function (`JavaScriptFunction`) — read from `packages/noodl-runtime/src/nodes/std-library/simplejavascript.ts` on 2026-10-09
 * (NSP-017, s65), with `javascriptnodeparser.js` (`getCodePrefix`, `createNoodlAPI`), node.ts `shouldRunOnValueChanged` /
 * `registerRunOnValueChangeInput` and nodedefinition.ts's `registerInputIfNeeded` wrapper beside it.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * A CONTRACT, NOT A BEHAVIOUR (NSP-017 AC3). The person writes the code, so what the node does is whatever their JavaScript does.
 * This spec runs the same text the same way — the same parameters (`Inputs`, `Outputs`, `Noodl`, `Component`, `Scripts`), the same
 * prefix, the same receiver — and writes down everything AROUND it: which names become ports, when the code runs, what reaches it,
 * how what it writes comes out, what a signal call does, what a compile failure and a throw do, and what Run owes. It is graded with
 * the FIXTURES below — one script per rule — and the ledger counts it as a contract (`spec-ledger.js`), never as a behaviour spec.
 *
 * THE RULES:
 *   - PORTS (:946-962, `function-ports.ts`): `Inputs.x` makes the input `in-x` (and its `runOnChange-in-x` checkbox, ticked unless a
 *     `false` is written — run-on-value-change.ts); `Outputs.y = …` makes the output `out-y`; `Outputs.z()` makes the SIGNAL output
 *     `out-z`. The written lists add `in-<label>` with its `intype-<label>`, and `out-<label>` with its `outtype-<label>` (:1013-1073).
 *     The reader is the project's one (`@nodegx/project-contract/function-ports`), carried here as a byte-identical copy
 *     (`./function-ports.ts`, held by tests/function-ports-parity.test.ts).
 *   - ANY `in-<x>` is accepted on first write (`registerInputIfNeeded` :847-868) — its value is `Inputs.x` from then on — and any
 *     `runOnChange-<port>` as the checkbox for that port (nodedefinition.ts). `intype-` / `outtype-` are accepted and do nothing at
 *     run time (:870-892 — the type setter misses the hyphen, so it has never applied a type).
 *   - WHEN IT RUNS — once per frame at most (:493-511 `runScheduled`), at the frame's end: the Script being set to text (:386 — only
 *     while `Run` is NOT wired: a scenario wires it under `wired`, P107-C155, and the code then waits for Run or an input); Run, always (:425-430); a value that CHANGED (`valueDidChange`, so `undefined` and every object
 *     count as changed) on a ticked `in-` port (:784-799). A Script set to nothing forgets the code and asks for no run (:369-375).
 *   - WHAT THE CODE SEES (:597-640): `Inputs` is the node's own object of input values — the SAME object every run, so a write the
 *     code makes to it is what the next arrival is compared with; `this` is one object kept across runs (:310); `Noodl` is the page's
 *     `window.Noodl` or a fresh `{}` with `Inputs` and `Outputs` on it (javascriptnodeparser.js :497-501); `Component` and `Scripts`
 *     (not in v1 — no fixture reads them).
 *   - WHAT COMES OUT (:275-308): `Outputs.y = v` sends `out-y` only when `v !==` the value it last wrote — the same value written again
 *     is HELD (sent after all if the same run fires a signal, GAM-011 :237-244 — invisible to a lone node, whose trace never repeats an
 *     unchanged value; graded through the graph). A signal output is a function on `Outputs` (`Outputs.z()` or `Outputs.z.send()`),
 *     prepared before the code runs for every signal port the node has (:600-618); calling it fires at once.
 *   - WHEN IT FINISHES (:633-652): the code is an `async` function, awaited — Success fires when it has finished, then Done answers
 *     each Run that asked. Both co-fire on a Run; a run nobody asked for (the Script, an input) fires Success alone.
 *   - A THROW (:653-721), synchronous or after an `await`: Error is the throw's message in JavaScript's own words (`String(e)` for a
 *     throw that is not an Error), and every waiting Run is answered `failure` (`function/script-threw`) — or, with none waiting,
 *     Failure pulses. Success does not fire.
 *   - A SCRIPT THAT WILL NOT COMPILE (:534-561, :818-842): Error is the engine's message, every waiting Run is answered `failure`
 *     (`function/script-not-compiled`), or Failure pulses. A Run with NO script answers Unchanged (:563-567).
 *   - ERROR IS CLEARED ON THE WIRE (v2, row C146 — the D25 / C47 / C144 family, ruled "Clear it to blank text"): a run that works
 *     after a failure, or a new Script (:771-775, clearRunDiagnostics), writes Error as blank text and sends it, once; with Error
 *     already blank nothing is sent. v1 left a working run's Error as it was, and a new Script emptied it to `undefined`, which is
 *     never sent — so a wire on Error kept the old message.
 *   - A THROW OF NOTHING (row C147, fixed in P109 ISL-051): `throw null` / `throw undefined` is a throw like any other — Error "null"
 *     or "undefined". The runtime's logger read the value's prototype inside the catch and threw, so the node reported nothing.
 *
 * THE SPEC'S AWAIT. A fixture awaits only a value that has already settled (`await null`), which resumes inside the settle's own
 * yield (the runtime target's settle: frame, yield, drain) — what comes before and after it lands in the same settle. So the spec
 * runs the body with its `await`s removed, synchronously: the same effects in the same order. A fixture must not await a timer.
 *
 * THE PLAY'S PORTS (NSP-020 §6.6, s83). At play a node has its params and its wires, never the project. The ports the project saved
 * for the instance are what the editor drew for the PLACING's params — `derived.outputs(params)` — and the headless runtime reads
 * them, never re-drawn, off `model.outputPorts`: the signal ports the code may call are the placing's (:600-618), so a Script set
 * mid-play that calls a signal the placing's Script never named throws, as it does in a loaded project. A signal is SENT only when
 * a wire asks for it (`hasOutput`, :609 — `onWire`); a value output is brought into being by a wire or by the code's own write
 * (`registerOutputIfNeeded`, :298 — `discoverOutput`). What a play wires is the scenario's `wiredOutputs`, and a generated
 * sequence draws them from `outputCandidates`. FUNCTION_FIXTURES are the Scripts a play may set (`examples`), never the ports.
 *
 * Not in v1: Uses (the project's script files — a graph seam, ISL-005), Component (the component's state objects), Noodl's globals
 * (`Noodl.Variables` …), a write to an output no fixture names (`Outputs[key]`), and the editor's warnings (not on the wire).
 */

import { defineNode, type InputDecl, type OutputDecl, type ValueType } from '../spec';
import { valueDidChange } from './condition';
import { functionScriptPortNames } from './function-ports';

/** javascriptnodeparser.js :492-495 — in front of every body. */
const CODE_PREFIX = "const Script = (typeof Node !== 'undefined')?Node:undefined;\n";
/** :822-829 — the parameters, in order. */
const PARAMETERS = ['Inputs', 'Outputs', 'Noodl', 'Component', 'Scripts'] as const;

const RUN_ON_CHANGE = 'runOnChange-';

/**
 * THE FIXTURES (NSP-017 §3, AC2) — one script per rule of the contract, each the Script a play may set. A planted break of the rule
 * it names turns its scenario red (tests/batch-escape.test.ts, "each contract rule has a fixture").
 */
export const FUNCTION_FIXTURES = {
  /** inputs arrive by name and re-run the code when they change */
  sum: 'Outputs.sum = Inputs.a + Inputs.b',
  /** `this` is kept across runs — and counts them: one per frame, one per changed input, none for the same value */
  count: 'this.n = (this.n || 0) + 1;\nOutputs.count = this.n',
  /** a signal output is a function the code calls; it fires at once, before Success */
  signal: 'Outputs.count = Inputs.a;\nOutputs.ping()',
  /** a synchronous throw: Error, Failure (or a Run's failure), no Success */
  throws: 'throw new Error("boom " + Inputs.a)',
  /** a throw after an await, and a write before it: the write lands, then the failure — the same settle */
  late: 'await null;\nOutputs.late = Inputs.a;\nif (Inputs.b) throw new Error("late")',
  /** a throw that is not an Error: Error is its text (`throw null` too — row C147, fixed in P109 ISL-051) */
  bare: 'throw "bare " + Inputs.a',
  /** a script that will not compile */
  broken: 'Outputs.sum = (',
  /** an empty script compiles and runs: Success, and nothing else */
  empty: '',
  /** a fresh object every run: on the wire only when its content moves (the lone node's trace); every run downstream (the graph) */
  fresh: 'Outputs.o = { a: Inputs.a }',
  /** the code writes to Inputs: the next arrival is compared with what the code wrote */
  rewrite: 'Inputs.a = "seen";\nthis.n = (this.n || 0) + 1;\nOutputs.count = this.n'
} as const;

const FIXTURE_TEXTS: readonly string[] = Object.values(FUNCTION_FIXTURES);

/** :978-1009 `inputTypeEnums`, and Signal for an output (:1013-1018). */
const INPUT_TYPES = ['string', 'boolean', 'number', 'object', 'date', 'array', 'color'] as const;
// P109-S20-LISTDEFAULTTYPE: an output's select starts on Any (`*`), what its port is until a type is picked
const OUTPUT_TYPES = ['*', ...INPUT_TYPES, 'signal'] as const;

type Row = { label?: unknown };
const labelsOf = (list: unknown): string[] =>
  Array.isArray(list) ? list.map((r: Row) => r && r.label).filter((l): l is string => typeof l === 'string' && l.length > 0) : [];

export type FunctionState = {
  /** :361-387 — the text set last, or `undefined` (no script). */
  script: string | undefined;
  /** :88 `func` — whether the text compiled. */
  compiled: boolean;
  /** :98 `parseError` — the engine's message for a text that did not compile. */
  parseError: string | undefined;
  /** :64 `inputValues` — `Inputs`, by script name (no `in-`), as the code last left it. */
  inputs: Readonly<Record<string, unknown>>;
  /** :65 `outputValues` — what each value output last wrote, by script name. */
  outputs: Readonly<Record<string, unknown>>;
  /** :87 `_this` — the code's receiver, kept across runs. */
  self: Readonly<Record<string, unknown>>;
  /** node.ts `_runOnValueChange` — a checkbox's answer by the port it governs (`in-a`); absent is ticked. */
  unticked: Readonly<Record<string, true>>;
  /** :90 `lastError` — what the Error getter reads. */
  lastError: string | undefined;
  /** :109 `runScheduled` */
  scheduled: boolean;
  /** :106 `pendingRunOutcomes` — Runs waiting for the frame's run. */
  tokens: number;
  /** :600-618 — the signal ports the node has (`model.outputPorts`), the placing's for the whole play: THE PLAY'S PORTS. */
  signals: readonly string[];
};

/** :818-842 `parseScript` — compiled by the same constructor, so a failure carries the engine's own words. */
function parse(text: string): string | undefined {
  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (...args: string[]) => unknown;
    new AsyncFunction(...PARAMETERS, CODE_PREFIX + text);
    return undefined;
  } catch (e) {
    return e && (e as Error).message ? String((e as Error).message) : String(e);
  }
}

/** THE SPEC'S AWAIT (header): the body with its `await`s removed, compiled as a plain function over the same parameters. */
function bodyOf(text: string): (...args: unknown[]) => unknown {
  return new Function(...PARAMETERS, CODE_PREFIX + text.replace(/\bawait\b/g, '')) as (...args: unknown[]) => unknown;
}

/** A value port the code reads (:855-868) — no conversion. */
const valuePort = (): InputDecl => ({ type: '*', coerce: 'none' });
/** :1062-1068, :961-968 — a value port as the editor draws it: a written row typed by its picker (`string` unset), a name in the code `*`. */
const drawnValuePort = (label: string, type: ValueType): InputDecl => ({ type, coerce: 'none', displayName: label, group: 'Inputs' });
/** run-on-value-change.ts — `default: true`, and only an explicit `false` unticks. */
const checkboxPort = (): InputDecl => ({ type: 'boolean', default: true, coerce: 'not-false', editOnly: true });
/** run-on-value-change.ts `runOnChangeDynamicPorts` — drawn under the port's label, in its own group. */
const drawnCheckboxPort = (label: string): InputDecl => ({ ...checkboxPort(), displayName: label, group: 'Run On Value Change' });
/** :1049-1062, :1019-1031 — a written row's type picker; nothing reads it at run time (:870-892). */
const typePort = (): InputDecl => ({ type: 'string', default: 'string', coerce: 'none', editOnly: true });
/** The picker as the editor draws it: an enum named Type, Signal among an output's choices. */
const drawnTypePort = (enums: readonly string[], drawnDefault = 'string'): InputDecl => ({ type: 'enum', enums, default: drawnDefault, coerce: 'none', editOnly: true, displayName: 'Type' });
/** :903-920 — a value output the code's write (or a wire) brings into being; it reads what the code last wrote. */
const valueOutput = (name: string): OutputDecl<FunctionState> => ({ type: '*', from: (s: Readonly<FunctionState>) => s.outputs[name] });

/** The signal and value outputs `params` give the node — the written list's rows, then the script's names (:1013-1042, :953-962). */
function outputNames(params: Readonly<Record<string, unknown>>, script: unknown): { signals: string[]; values: string[] } {
  const signals: string[] = [];
  const values: string[] = [];
  for (const label of labelsOf(params.scriptOutputs)) {
    if (params['outtype-' + label] === 'signal') signals.push(label);
    else values.push(label);
  }
  const named = functionScriptPortNames(script);
  for (const n of named.signals) if (!signals.includes(n) && !values.includes(n)) signals.push(n);
  for (const n of named.outputs) if (!signals.includes(n) && !values.includes(n)) values.push(n);
  return { signals, values };
}


type RunResult = {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  self: Record<string, unknown>;
  /** derived value outputs sent, as `out-<name>` */
  sent: string[];
  /** derived signals fired, in order, as `out-<name>` */
  fired: string[];
  /** the throw's message, when the code threw */
  threw?: string;
};

/** :597-652 — one run of compiled code: what it wrote, what it fired, and whether it threw. */
function runCode(s: Readonly<FunctionState>, signals: readonly string[]): RunResult {
  const inputs: Record<string, unknown> = { ...s.inputs };
  const outputs: Record<string, unknown> = { ...s.outputs };
  const self: Record<string, unknown> = { ...s.self };
  const sent: string[] = [];
  const fired: string[] = [];
  // :600-618 — every signal port the node has is a function the code may call (or `.send`)
  for (const name of signals) {
    const fire = () => {
      fired.push('out-' + name);
    };
    (fire as typeof fire & { send: () => void }).send = fire;
    outputs[name] = fire;
  }
  // :275-308 — a write sends only when the value is not the one last written
  const proxy = new Proxy(outputs, {
    set: (obj, prop: string, value) => {
      if (value !== obj[prop]) {
        obj[prop] = value;
        if (!sent.includes('out-' + prop)) sent.push('out-' + prop);
      }
      return true;
    }
  });
  // :623-625 — no page Noodl here: a fresh `{}`, with the two objects on it
  const noodl = { Inputs: inputs, Outputs: proxy };
  try {
    bodyOf(s.script as string).apply(self, [inputs, proxy, noodl, {}, {}]);
  } catch (e) {
    // :656
    const threw = e && (e as Error).message ? String((e as Error).message) : String(e);
    return { inputs, outputs, self, sent, fired, threw };
  }
  return { inputs, outputs, self, sent, fired };
}

/** :493-511 — schedule the frame's run (one per frame, however many asked). */
const schedule = { scheduled: true } as const;

export const JavaScriptFunction = defineNode({
  type: 'JavaScriptFunction',
  // v2 (P109 ISL-051, s33): Error cleared to blank text and sent by a run that works and by a new Script (row C146)
  version: 2,
  source: 'packages/noodl-runtime/src/nodes/std-library/simplejavascript.ts',
  contract:
    'ports from the code and the written lists; when the code runs (the Script — only while Run is not wired, P107-C155 —, Run, a changed ticked input; once a frame); Inputs, this and Noodl as the code sees them; publish on change; signal outputs; Success and Done after an await; a throw, sync or async; a compile failure; no script — FUNCTION_FIXTURES, one per rule',

  state: {
    script: undefined,
    compiled: false,
    parseError: undefined,
    inputs: {},
    outputs: {},
    self: {},
    unticked: {},
    lastError: undefined,
    scheduled: false,
    tokens: 0,
    signals: []
  } as FunctionState,
  // THE PLAY'S PORTS (header) — the signal ports the model carries: the placing's, wired or not (:600-618)
  init: (_w, params) => ({ signals: outputNames(params, params.functionScript).signals }),
  // :312-322
  inspect: (s) => JSON.stringify({ inputs: s.inputs, outputs: s.outputs }),
  // :468-471 (outcomeOutputs: done, unchanged) and :449-454 (Failure, pulsed on its own too)
  outcomes: ['done', 'unchanged', 'failure'],

  inputs: {
    // :324-334 — panel only; each row is an input port (derived, below)
    scriptInputs: {
      type: 'proplist',
      coerce: 'none',
      editOnly: true,
      group: 'Script Inputs',
      description: 'Names of the values the script reads from Inputs, each becoming an input port'
    },
    // :335-345
    scriptOutputs: {
      type: 'proplist',
      coerce: 'none',
      editOnly: true,
      group: 'Script Outputs',
      description: 'Names of the values the script writes to Outputs, each becoming an output port'
    },
    // :346-388
    functionScript: {
      type: 'string',
      coerce: 'none',
      editOnly: true,
      displayName: 'Script',
      group: 'General',
      description: 'JavaScript run when Run fires, reading Inputs.name and writing Outputs.name',
      examples: [...FIXTURE_TEXTS]
    },
    // :389-416
    uses: {
      type: 'stringlist',
      coerce: 'none',
      editOnly: true,
      displayName: 'Uses',
      group: 'General',
      description:
        "The project's script files this Function uses. Each one is ready in the code as Scripts.<file name>, so engine/world.js is Scripts.world",
      undriven: "v2: the project's script files are a graph seam (ISL-005) — a lone node has no files, so every run with Uses set fails as missing"
    },
    // :417-431
    run: {
      type: 'signal',
      outcome: true,
      displayName: 'Run',
      group: 'Actions',
      description:
        'Runs the script now. This is additional to the inputs that re-run it; untick an input under Run On Value Change to stop that one triggering a run'
    }
  },

  outputs: {
    // :443-448
    success: { type: 'signal', displayName: 'Success', group: 'Events', description: 'Fires once the script has finished, waiting for an async script to resolve first' },
    // :472-482
    error: { type: 'string', from: (s) => s.lastError, displayName: 'Error', group: 'Error', description: "What the script went wrong with, in JavaScript's own words" }
  }
}).on(
  {
    // :361-388 — the text: the diagnostics cleared, the code compiled (or its failure kept), a run asked for
    functionScript: (s, v, _i, w) => {
      // :771-775 clearRunDiagnostics — a message cleared to blank text and sent (v2, row C146); blank already: nothing
      const cleared: Partial<FunctionState> = s.lastError ? { lastError: '' } : {};
      if (v === undefined)
        return {
          says: 'no code: nothing to run, and a later Run is answered Unchanged (a message on Error is cleared)',
          set: { ...cleared, script: undefined, compiled: false, parseError: undefined },
          send: s.lastError ? ['error'] : []
        };
      const text = v as string;
      const parseError = parse(text);
      // :386 `if (!this.isInputConnected('run')) this.scheduleRun()` — NDA-017 §2's one surviving guard: the code is compiled either
      // way, and asked to run only while Run is not wired (P107-C155: `w.wired`, the port a scenario names under `wired`)
      if (w.wired('run'))
        return {
          says: 'new code, with Run wired: compiled, and nothing runs until Run or a changed ticked input — a message on Error is cleared',
          set: { ...cleared, script: text, compiled: parseError === undefined, parseError },
          send: s.lastError ? ['error'] : []
        };
      return {
        says: 'new code, with Run not wired: compiled and run at the end of the frame — Success, or Error and Failure if it does not compile or throws',
        set: {
          ...cleared,
          script: text,
          compiled: parseError === undefined,
          parseError,
          ...schedule
        },
        send: s.lastError ? ['error'] : []
      };
    },
    // :425-430, :493-498 — a token, and the frame's run
    run: (s) => ({
      says: 'always: one run at the end of the frame, however many Runs arrived — Success, and Done for each Run; Error, and Failure for each Run, if the code does not compile or throws; Unchanged for each Run when there is no code',
      set: { tokens: s.tokens + 1, ...schedule },
      outcome: 'deferred',
      send: []
    })
  },
  {
    // :504-722 — the one run of the frame
    afterInputs: (s, _i, w) => {
      if (!s.scheduled) return { set: {}, send: [] };
      const n = s.tokens;
      const done = { scheduled: false, tokens: 0 } as const;
      if (!s.compiled) {
        // :534-561 — a text that did not compile: Error, each Run answered `failure`, or Failure (the editor's report, once per
        // message — `lastReportedError` :100, :542-547, :833 — is not on the wire, so the spec keeps no state for it)
        if (s.parseError !== undefined) {
          return {
            set: { ...done, lastError: s.parseError },
            send: ['error'],
            emit: n === 0 ? ['failure'] : [],
            outcomes: Array.from({ length: n }, () => ({ port: 'run' as const, outcome: 'failure' as const, error: 'function/script-not-compiled' }))
          };
        }
        // :563-567 — no script: Unchanged for each Run, nothing otherwise
        return { set: done, send: [], outcomes: Array.from({ length: n }, () => ({ port: 'run' as const, outcome: 'unchanged' as const })) };
      }
      // :609 — a signal the code calls is SENT only when a wire asks for it; the call itself always happens
      const r = runCode(s, s.signals);
      const set: Partial<FunctionState> = { ...done, inputs: r.inputs, outputs: r.outputs, self: r.self };
      if (r.threw !== undefined) {
        // :653-721 — Error in JavaScript's words; each Run answered `failure`, or Failure
        return {
          set: { ...set, lastError: r.threw },
          send: ['error'],
          sendDerived: r.sent,
          emitDerived: r.fired.filter((name) => w.hasOutput(name)),
          emit: n === 0 ? ['failure'] : [],
          outcomes: Array.from({ length: n }, () => ({ port: 'run' as const, outcome: 'failure' as const, error: 'function/script-threw' }))
        };
      }
      // :645-652 — a message on Error cleared to blank text and sent (v2, row C146), then Success, then Done for each Run
      return {
        set: s.lastError ? { ...set, lastError: '' } : set,
        send: s.lastError ? ['error'] : [],
        sendDerived: r.sent,
        emitDerived: r.fired.filter((name) => w.hasOutput(name)),
        emit: ['success'],
        outcomes: Array.from({ length: n }, () => ({ port: 'run' as const, outcome: 'done' as const }))
      };
    },

    derived: {
      // :1013-1073, :946-962 — what the editor draws: the written rows with their type pickers, then each name the code reads
      inputs: (params) => {
        const ports: Record<string, InputDecl> = {};
        for (const label of labelsOf(params.scriptOutputs)) ports['outtype-' + label] = drawnTypePort(OUTPUT_TYPES, '*');
        for (const label of labelsOf(params.scriptInputs)) {
          ports['intype-' + label] = drawnTypePort(INPUT_TYPES);
          ports['in-' + label] = drawnValuePort(label, ((params['intype-' + label] as string) || 'string') as ValueType);
        }
        for (const name of functionScriptPortNames(params.functionScript).inputs) if (!ports['in-' + name]) ports['in-' + name] = drawnValuePort(name, '*');
        // :1091-1109 — a checkbox for every value input, however it was named
        for (const name of Object.keys(ports)) if (name.startsWith('in-')) ports[RUN_ON_CHANGE + name] = drawnCheckboxPort(name.slice('in-'.length));
        return ports;
      },
      // THE PLAY'S PORTS (header) — what the editor draws for the placing's params (:1033-1041, :961-968); at play each exists only
      // when wired (`onWire`), or, for a value, once the code writes it (`discoverOutput`)
      outputs: (params) => {
        const typed = new Set(labelsOf(params.scriptOutputs));
        const { signals, values } = outputNames(params, params.functionScript);
        const out: Record<string, OutputDecl<FunctionState>> = {};
        for (const name of values) {
          const type = (typed.has(name) && (params['outtype-' + name] as OutputDecl<FunctionState>['type'])) || '*';
          out['out-' + name] = { ...valueOutput(name), type, displayName: name, group: 'Outputs', onWire: true } as OutputDecl<FunctionState>;
        }
        for (const name of signals) out['out-' + name] = { type: 'signal', displayName: name, group: 'Outputs', onWire: true };
        return out;
      },
      // :298, :903-920 — any `out-<name>`, as a value: a wire to it, or the code writing it
      discoverOutput: (port) => (port.startsWith('out-') ? valueOutput(port.slice('out-'.length)) : undefined),
      // the fixtures' outputs a generated sequence may wire: the signal (wired and unwired, :609), and two values
      outputCandidates: ['out-ping', 'out-sum', 'out-count'],
      on: (s, port, value) => {
        // nodedefinition.ts — a checkbox, whether or not its port exists yet
        if (port.startsWith(RUN_ON_CHANGE)) {
          const governed = port.slice(RUN_ON_CHANGE.length);
          const unticked: Record<string, true> = { ...s.unticked };
          if (value === false) unticked[governed] = true;
          else delete unticked[governed];
          return { set: { unticked }, send: [] };
        }
        // :870-892 — a type picker: nothing at run time
        if (!port.startsWith('in-')) return { set: {}, send: [] };
        // :784-799 — read before write; a change on a ticked port runs the code
        const name = port.slice('in-'.length);
        const previous = s.inputs[name];
        const inputs = { ...s.inputs, [name]: value };
        const runs = valueDidChange(previous, value) && !s.unticked[port];
        return { set: runs ? { inputs, ...schedule } : { inputs }, send: [] };
      },
      // :847-892 — the runtime takes any `in-`, `intype-` or `outtype-` name on first write, and any checkbox
      discover: (port) =>
        port.startsWith(RUN_ON_CHANGE) ? checkboxPort() : port.startsWith('in-') ? valuePort() : port.startsWith('intype-') || port.startsWith('outtype-') ? typePort() : undefined,
      candidates: ['in-a', 'in-b', 'runOnChange-in-a', 'runOnChange-in-b', 'in-z']
    }
  }
);
