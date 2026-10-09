/**
 * Expression — read from `packages/noodl-runtime/src/nodes/std-library/expression.ts` on 2026-10-09 (NSP-017, s64), with
 * `expression-ports.ts` (which names become ports), node.ts `shouldRunOnValueChanged` / `registerRunOnValueChangeInput` and
 * nodedefinition.ts's `registerInputIfNeeded` wrapper beside it. Every rule below was measured on the runtime target before it
 * was written (the s64 probe, 29 cases).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * NOT A GRAMMAR OF OURS. NSP-017 §3 expected "the grammar and the coercions" — measured, there is none: the node compiles the
 * author's text as JAVASCRIPT, `new Function(<ports>…, 'Noodl', preamble + 'return (' + text + ');')` (:504, :455-477, :783-791).
 * `expression-evaluator.ts` and `expression-type-coercion.ts` belong to a different feature — an expression typed into ANY node's
 * port (node.ts :340-343) — not to this node. So this spec does what the Repeater's Script and Array Map do: it compiles and runs
 * the same text with the same `Function` in the same engine, and writes down everything AROUND it — which names become ports, when
 * the text runs, what each output says before and after, what a compile failure and a throw do, and what Run owes.
 *
 * THE RULES:
 *   - PORTS (:502-535, expression-ports.ts): every name the text reads as a variable, once, in order, except JavaScript's own
 *     globals, the Math shortcuts the preamble declares (`min`, `pi`, `round` …), the Noodl names and keywords — the runtime's
 *     lexer, carried here as a byte-identical copy (`./expression-ports.ts`, held by tests/expression-ports-parity.test.ts). Each
 *     port has a `runOnChange-<name>` checkbox, ticked unless a `false` is written (run-on-value-change.ts :121-139). A name the
 *     text stops reading loses its port, its value and its checkbox's answer (:514-518, node.ts :235-239) — it comes back ticked.
 *   - ANY OTHER NAME is accepted on first write (`registerInputIfNeeded` :186-214): a reserved one as a port that does nothing, a
 *     `runOnChange-<x>` one as the checkbox for `x` (nodedefinition.ts :519-527), any other as an input the text does not read
 *     (a STRAY) — its value is kept, an arrival re-runs the node like any other, and it joins the compiled function's parameters
 *     the next time the text is set.
 *   - WHEN IT RUNS — once per frame at most (:255-258), at the frame's end: a value that CHANGED (run-on-value-change.ts
 *     `valueDidChange`) on a ticked port (:215-228); Run, always (:599-603); the text being set (:587 — `Run` is never wired in a
 *     lone node). The text being set while no port it reads has ever had a value is the LOAD evaluation (:234-244): it runs over
 *     the unset ports (they read `undefined`) unless Evaluate At Load is unticked, and an answer it cannot give — a compile
 *     failure, a throw, `NaN` — is no answer: nothing is sent, nothing fires, nothing is reported (:437-454, :269-277).
 *   - WHAT IT SENDS (:278-307): Result, Is True, Is False and the three typed results when the answer is not the same JavaScript
 *     value as the last one (`!==`, so `NaN` and every new object count as new) or this is the first answer; then On True or On
 *     False, every evaluation. Before the first answer Result / Is True / Is False read `null`; the typed results read the cached
 *     `null` (`''`, `0`, `false`).
 *   - FAILURE (:346-424): a text that will not compile (`expression/compile-failed`, "The expression could not be compiled: " +
 *     the engine's message) or that throws (`expression/threw`, "The expression threw: " + the message) answers `0`, writes
 *     Error, and — per distinct message until an evaluation works — pulses Failure, unless Run asked: then every waiting Run is
 *     answered `failure` with the code and Failure is not pulsed separately. Done answers every other Run, after On True / On False.
 *   - ERROR IS NEVER CLEARED ON THE WIRE (row C144): a working evaluation empties the node's error (:413-414) without sending it,
 *     so a wire on Error keeps the last failure. Modelled as the runtime does it: `error` reads the node's error, and only a
 *     failure names it in `send`.
 *
 * Not in v1: an expression reading `Variables`, `Objects` or `Arrays` re-runs when the global moves (:537-563 — the world's
 * REGISTRY seam carries it, v2), and Run wired at load (:587 — a graph rule; the lone node's Run is never wired).
 */

import { defineNode, type InputDecl } from '../spec';
import { valueDidChange } from './condition';
import { expressionPorts, isReservedExpressionName } from './expression-ports';

/** :753-778 — declared in front of every expression. */
const PREAMBLE = [
  'var min = Math.min,' +
    '    max = Math.max,' +
    '    cos = Math.cos,' +
    '    sin = Math.sin,' +
    '    tan = Math.tan,' +
    '    sqrt = Math.sqrt,' +
    '    pi = Math.PI,' +
    '    round = Math.round,' +
    '    floor = Math.floor,' +
    '    ceil = Math.ceil,' +
    '    abs = Math.abs,' +
    '    random = Math.random,' +
    '    pow = Math.pow,' +
    '    log = Math.log,' +
    '    exp = Math.exp;' +
    'try {' +
    '  var NoodlContext = (typeof Noodl !== "undefined") ? Noodl : (typeof global !== "undefined" && global.Noodl) || {};' +
    '  var Variables = NoodlContext.Variables || {};' +
    '  var Objects = NoodlContext.Objects || {};' +
    '  var Arrays = NoodlContext.Arrays || {};' +
    '} catch (e) {' +
    '  var Variables = {}, Objects = {}, Arrays = {};' +
    '}'
].join('');

const RUN_ON_CHANGE = 'runOnChange-';
/** The node's declared inputs — `hasInput` is true for them, so the text naming one mints no port (:521, row C145). */
const DECLARED: ReadonlySet<string> = new Set(['expression', 'run', 'evaluateAtLoad']);

/**
 * :432-435 — the Noodl API handed as the last argument. v1's examples read no Noodl global, so the handle is an empty stand-in; v2
 * (the registry) hands the world's.
 */
const NOODL_API = Object.freeze({});

type Failure = { code: 'expression/compile-failed' | 'expression/threw'; message: string };

export type ExpressionState = {
  /** :504 — the function body: the preamble and `return (<text>);`. `''` until the text is set (:163), which compiles to a function returning `undefined`. */
  body: string;
  /** :508 `referencedPorts` — the names the CURRENT text reads. */
  referenced: readonly string[];
  /** :46 `scope` — every input's value by name, in registration order: the text's ports, then strays. */
  scope: Readonly<Record<string, unknown>>;
  /** :565 `inputNames` — `Object.keys(scope)` as it stood when the text was last set: the order values are handed in. */
  names: readonly string[];
  /** The parameter names the function was compiled with (`Object.keys(scope)` then, :457), or `undefined` until it compiles. */
  compiledWith: readonly string[] | undefined;
  /** node.ts `_runOnValueChange` — a checkbox's answer; absent is ticked. */
  unticked: Readonly<Record<string, true>>;
  /** :72 `anyInputArrived` — never reset. */
  arrived: boolean;
  /** :110 `pendingLoadEvaluation`. */
  pendingLoad: boolean;
  /** :108 */
  evaluateAtLoad: boolean;
  scheduled: boolean;
  /** :106 — Runs waiting for the frame's evaluation. */
  tokens: number;
  /** :48 `cachedValue` — `null` until the first answer (:157). */
  cached: unknown;
  /** :54 `hasEvaluated` */
  evaluated: boolean;
  /** :98 `lastError` — what the Error getter reads. */
  lastError: string | undefined;
  /** :100 `lastReportedError` */
  lastReported: string | undefined;
};

/** :455-477 `_compileFunction` — the function, or the engine's message. */
function compile(names: readonly string[], body: string): { fn?: (...args: unknown[]) => unknown; error?: string } {
  try {
    return { fn: new Function(...names, 'Noodl', body) as (...args: unknown[]) => unknown };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** :425-436 — the values in `names` order, then the API, handed positionally to a function compiled with `compiledWith`. */
const argumentsFor = (s: Readonly<ExpressionState>): unknown[] => [...s.names.map((n) => s.scope[n]), NOODL_API];

/** The compiled function (compiling with the scope's names now when it has not compiled since the text was set) and the names it took. */
function compiled(s: Readonly<ExpressionState>): { fn?: (...args: unknown[]) => unknown; error?: string; compiledWith: readonly string[] | undefined } {
  const names = s.compiledWith ?? Object.keys(s.scope);
  const c = compile(names, s.body);
  return { ...c, compiledWith: c.fn ? names : undefined };
}

const NOT_EVALUATED = Symbol('not evaluated');

/** :437-454 `_evaluateOverUnsetInputs` — the answer over ports that have not arrived, or none. */
function overUnset(s: Readonly<ExpressionState>): { value: unknown; compiledWith: readonly string[] | undefined } {
  const c = compiled(s);
  if (!c.fn) return { value: NOT_EVALUATED, compiledWith: undefined };
  let value: unknown;
  try {
    value = c.fn(...argumentsFor(s));
  } catch {
    return { value: NOT_EVALUATED, compiledWith: c.compiledWith };
  }
  return { value: value !== value ? NOT_EVALUATED : value, compiledWith: c.compiledWith };
}

/** :379-424 `_calculateExpression` — the answer (`0` on a failure) and the failure. */
function calculate(s: Readonly<ExpressionState>): { value: unknown; failure?: Failure; compiledWith: readonly string[] | undefined } {
  const c = compiled(s);
  if (!c.fn) return { value: 0, failure: { code: 'expression/compile-failed', message: 'The expression could not be compiled: ' + (c.error || 'syntax error') }, compiledWith: undefined };
  try {
    return { value: c.fn(...argumentsFor(s)), compiledWith: c.compiledWith };
  } catch (e) {
    return { value: 0, failure: { code: 'expression/threw', message: 'The expression threw: ' + (e as Error).message }, compiledWith: c.compiledWith };
  }
}

const VALUES = ['result', 'isTrue', 'isFalse', 'asString', 'asNumber', 'asBoolean'] as const;

/** A port the text reads, as `registerInput` makes it (:525-530) — no type, no conversion. */
const valuePort = (): InputDecl => ({ type: '*', coerce: 'none' });
/** run-on-value-change.ts :121-139 — `default: true`, and only an explicit `false` unticks. */
const checkboxPort = (): InputDecl => ({ type: 'boolean', default: true, coerce: 'not-false', editOnly: true });

/** :255-258 — schedule the frame's evaluation (one per frame, however many asked). */
const schedule = { scheduled: true } as const;

export const Expression = defineNode({
  type: 'Expression',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/expression.ts',

  state: {
    body: '',
    referenced: [],
    scope: {},
    names: [],
    compiledWith: undefined,
    unticked: {},
    arrived: false,
    pendingLoad: false,
    evaluateAtLoad: true,
    scheduled: false,
    tokens: 0,
    cached: null,
    evaluated: false,
    lastError: undefined,
    lastReported: undefined
  } as ExpressionState,
  // :479-482
  inspect: (s) => String(s.cached),
  // :698-703, :710 — Done for a Run, Failure both a Run's answer and a plain pulse
  outcomes: ['done', 'failure'],

  inputs: {
    // :484-589 — panel only: a value reaches it from the property panel, never a wire
    expression: {
      type: 'string',
      coerce: 'none',
      editOnly: true,
      displayName: 'Expression',
      group: 'General',
      description:
        "JavaScript expression whose value becomes Result. Every name it reads becomes an input port, except JavaScript's own (String, Number, JSON, Date, parseInt, Math and the rest), the Math shortcuts (round, min, pi…) and keywords such as typeof; a port can never be called one of those",
      examples: [
        'a + b',
        'a * 2',
        'a !== false',
        '2 + 2',
        'a.b.c',
        'a +',
        '',
        'max(a, b) + pi',
        "a + ''",
        'String(a) + typeof b',
        '`${a}!`',
        'a ? b : null',
        '({ v: a })',
        'b',
        // a name that is a declared port: not in the scope, so the compiled function reads the global (row C145)
        'run'
      ]
    },
    // :590-604
    run: {
      type: 'signal',
      outcome: true,
      displayName: 'Run',
      group: 'Actions',
      description:
        'Evaluates the expression now. This is additional to the inputs that re-run it; untick an input under Run On Value Change to stop that one triggering a run'
    },
    // :611-621 — `value !== false`
    evaluateAtLoad: {
      type: 'boolean',
      default: true,
      coerce: 'not-false',
      editOnly: true,
      displayName: 'Evaluate At Load',
      group: 'Run On Value Change',
      description:
        'Whether the expression runs when the page loads even though an input it reads has not arrived yet. Those inputs read as undefined, so `m !== false` is true and `m === true` is false. An expression that throws or gives NaN over them waits for its inputs instead. Untick to wait for an input to arrive'
    }
  },

  outputs: {
    // :639-651
    result: { type: '*', from: (s) => (s.evaluated ? s.cached : null), displayName: 'Result', group: 'Result', description: 'What the expression evaluated to; null until it has been evaluated at least once' },
    // :652-664
    isTrue: { type: 'boolean', from: (s) => (s.evaluated ? !!s.cached : null), displayName: 'Is True', group: 'Result', description: 'Whether Result is truthy; null until the expression has been evaluated at least once' },
    // :665-677
    isFalse: { type: 'boolean', from: (s) => (s.evaluated ? !s.cached : null), displayName: 'Is False', group: 'Result', description: 'Whether Result is falsy; null until the expression has been evaluated at least once' },
    isTrueEv: { type: 'signal', displayName: 'On True', group: 'Events', description: 'Fires after an evaluation whose Result is truthy' },
    isFalseEv: { type: 'signal', displayName: 'On False', group: 'Events', description: 'Fires after an evaluation whose Result is falsy' },
    // :711-719 — the getter; sent only by a failure (row C144)
    error: { type: 'string', from: (s) => s.lastError, displayName: 'Error', group: 'Error', description: "The compile or evaluation error, in JavaScript's own words" },
    // :721-749 — the cached value, read before the first answer too
    asString: { type: 'string', from: (s) => (s.cached !== undefined && s.cached !== null ? String(s.cached) : ''), displayName: 'As String', group: 'Typed Results', description: 'Result rendered as text, and blank when it is null or undefined' },
    asNumber: { type: 'number', from: (s) => (typeof s.cached === 'number' ? s.cached : Number(s.cached) || 0), displayName: 'As Number', group: 'Typed Results', description: 'Result read as a number, falling back to 0 when it is not one' },
    asBoolean: { type: 'boolean', from: (s) => !!s.cached, displayName: 'As Boolean', group: 'Typed Results', description: 'Whether Result is truthy, for wiring straight to a boolean input' }
  }
}).on(
  {
    // :502-588 — the text: ports re-derived, the function forgotten, the load evaluation asked for
    expression: (s, v) => {
      const text = v as string;
      const ports = expressionPorts(text);
      const scope: Record<string, unknown> = { ...s.scope };
      const unticked: Record<string, true> = { ...s.unticked };
      // :514-518 — a port the last text's names held and this one does not read: gone, with its checkbox's answer
      for (const name of s.names) {
        if (ports.includes(name)) continue;
        delete scope[name];
        delete unticked[name];
      }
      // :520-535 — a new port, unless one by that name is already there (a stray, or a declared input: row C145)
      for (const name of ports) if (!(name in scope) && !DECLARED.has(name)) scope[name] = undefined;
      const referenced = ports;
      // :234-244 `_scheduleLoadEvaluation`
      const pendingLoad = referenced.length > 0 && !s.arrived ? true : s.pendingLoad;
      return {
        set: { body: PREAMBLE + 'return (' + text + ');', referenced, scope, names: Object.keys(scope), compiledWith: undefined, unticked, pendingLoad, ...schedule },
        send: []
      };
    },
    // :599-603 — a token, and the frame's evaluation
    run: (s) => ({ set: { tokens: s.tokens + 1, ...schedule }, outcome: 'deferred', send: [] }),
    // :618-620
    evaluateAtLoad: (_s, v) => ({ set: { evaluateAtLoad: v }, send: [] })
  },
  {
    // :258-320 — the one evaluation of the frame
    afterInputs: (s) => {
      if (!s.scheduled) return { set: {}, send: [] };
      const n = s.tokens;
      const last = s.cached;
      const had = s.evaluated;
      // :269-277 — the load's evaluation over ports that never arrived
      if (s.pendingLoad && n === 0 && !s.arrived) {
        const answer = s.evaluateAtLoad ? overUnset(s) : { value: NOT_EVALUATED, compiledWith: s.compiledWith };
        if (answer.value === NOT_EVALUATED) return { set: { scheduled: false, pendingLoad: false, compiledWith: answer.compiledWith }, send: [] };
        const value = answer.value;
        return {
          set: { scheduled: false, pendingLoad: false, compiledWith: answer.compiledWith, cached: value, evaluated: true },
          send: !had || last !== value ? [...VALUES] : [],
          emit: [value ? 'isTrueEv' : 'isFalseEv']
        };
      }
      const r = calculate(s);
      const changed = !had || last !== r.value;
      const send: Array<(typeof VALUES)[number] | 'error'> = changed ? [...VALUES] : [];
      if (r.failure) {
        // :346-378 `_reportFailure` — Error written, the report once per message, every Run answered `failure`
        const repeat = s.lastReported === r.failure.message;
        const set: Partial<ExpressionState> = { scheduled: false, pendingLoad: false, compiledWith: r.compiledWith, cached: r.value, evaluated: true, tokens: 0, lastError: r.failure.message };
        if (!repeat) set.lastReported = r.failure.message;
        const verdict = r.value ? 'isTrueEv' : 'isFalseEv';
        const failure = r.failure;
        return {
          set,
          send: [...send, 'error'],
          emit: n === 0 && !repeat ? ['failure', verdict] : [verdict],
          outcomes: Array.from({ length: n }, () => ({ port: 'run' as const, outcome: 'failure' as const, error: failure.code }))
        };
      }
      // :411-415 — a working evaluation re-arms the report and empties the error, without sending it (row C144)
      return {
        set: { scheduled: false, pendingLoad: false, compiledWith: r.compiledWith, cached: r.value, evaluated: true, tokens: 0, lastError: undefined, lastReported: undefined },
        send,
        emit: [r.value ? 'isTrueEv' : 'isFalseEv'],
        outcomes: Array.from({ length: n }, () => ({ port: 'run' as const, outcome: 'done' as const }))
      };
    },

    derived: {
      // updatePorts :795-815 — what the editor draws: each port the text reads, and its checkbox
      inputs: (params) => {
        const ports: Record<string, InputDecl> = {};
        if (typeof params.expression !== 'string') return ports;
        for (const name of expressionPorts(params.expression)) {
          // row C145 — the editor draws a port for a declared input's name too, but the runtime's port by that name is the declared
          // one (a value never reaches the text), and a derived port may not shadow a declared input (spec.ts DerivedPorts)
          if (DECLARED.has(name)) continue;
          ports[name] = valuePort();
          ports[RUN_ON_CHANGE + name] = checkboxPort();
        }
        return ports;
      },
      on: (s, port, value) => {
        // nodedefinition.ts :519-527 — a checkbox, whether or not its port exists yet
        if (port.startsWith(RUN_ON_CHANGE)) {
          const governed = port.slice(RUN_ON_CHANGE.length);
          const unticked: Record<string, true> = { ...s.unticked };
          if (value === false) unticked[governed] = true;
          else delete unticked[governed];
          return { set: { unticked }, send: [] };
        }
        // :194-197 — a reserved name: a port that does nothing
        if (isReservedExpressionName(port)) return { set: {}, send: [] };
        // :215-228 — read before write; a change on a ticked port runs the node (a stray's first write is registered at :205-213)
        const previous = s.scope[port];
        const scope = { ...s.scope, [port]: value };
        const runs = valueDidChange(previous, value) && !s.unticked[port];
        return { set: runs ? { scope, arrived: true, ...schedule } : { scope, arrived: true }, send: [] };
      },
      // :186-214 — the runtime takes any name on first write
      discover: (port) => (port.startsWith(RUN_ON_CHANGE) ? checkboxPort() : valuePort()),
      candidates: ['a', 'b', 'z', 'String', 'runOnChange-z']
    }
  }
);

