/**
 * EXP-003's purity gate (EXP-003-JS-TARGET-OUTPUT.md §3) — the per-body half: does this
 * Function/Expression body qualify for the re-host slice at all. Everything graph-shaped
 * (input sourcing, output landing, run-model fit) lives in plan.ts; this module only ever
 * looks at the script text, exactly the way the runtime's own parsers do.
 *
 * A Function's ports are read with `@nodegx/project-contract/function-ports`, the reader the runtime's
 * Function node imports (P109 ISL-006), and an Expression's with `expression-ports.ts`, a copy of
 * the runtime's — the port set the runtime mints is the port set this gate reasons about.
 */

import { functionScriptPortNames, stripScriptComments } from '@nodegx/project-contract/function-ports';

import { NodeIR } from '../ir/types';
import { EXPRESSION_MATH_ALIASES as RUNTIME_MATH_ALIASES, expressionPorts, expressionReferences } from './expression-ports';

export const JS_FUNCTION = 'JavaScriptFunction';
export const JS_EXPRESSION = 'Expression';
/**
 * The Visual Function node — the third script host, and the reason it belongs in this family.
 *
 * Its type id is still `Logic Builder` (frozen: it is the string in every saved `project.json`);
 * `Visual Function` is the label LGC-001 §3 gave it. The runtime compiles its `generatedCode`
 * parameter with `new Function`, exactly as it compiles a Function body — so the re-host
 * machinery here is the same machinery. What differs is where its *ports* come from and which
 * gate decides it: see `logicbuilder.ts`, and EXP-002-LOGIC-BUILDER-TARGET-OUTPUT.md §1.
 */
export const JS_VISUAL = 'Logic Builder';

export type JsNodeKind = 'function' | 'expression' | 'visual';

export function jsNodeKindOf(type: string): JsNodeKind | null {
  if (type === JS_FUNCTION) return 'function';
  if (type === JS_EXPRESSION) return 'expression';
  if (type === JS_VISUAL) return 'visual';
  return null;
}

/** The node's verbatim script text, from the parameter the runtime compiles. */
export function jsBodyOf(node: NodeIR, kind: JsNodeKind): string | undefined {
  const name = kind === 'function' ? 'functionScript' : kind === 'expression' ? 'expression' : 'generatedCode';
  const value = node.parameters.find((p) => p.name === name)?.value;
  if (value?.kind === 'script') return value.source;
  if (value?.kind === 'literal' && typeof value.value === 'string') return value.value;
  return undefined;
}

/**
 * The Expression preamble's Math aliases (expression.ts `functionPreamble`). A referenced name
 * emits as a destructured alias above the return; `pi` is the one non-member spelling.
 */
export const EXPRESSION_MATH_ALIASES: ReadonlySet<string> = new Set(RUNTIME_MATH_ALIASES);

export interface ExpressionIdentifiers {
  /** Names that become input ports, in first-appearance order (the runtime's `expressionPorts`). */
  ports: string[];
  /** Preamble Math aliases the expression references — destructured in the wrapper. */
  mathAliases: string[];
  /** Every name the expression reads as a variable, reserved ones included — the Noodl-globals check reads this. */
  raw: Set<string>;
}

/**
 * The runtime's port set, with the reserved names left visible so the gate can see behind them.
 * GAM-002: `expression-ports.ts` is a byte-identical copy of the runtime's, so `String(n)` mints
 * only `n` here too, and a method name after `)` is no port in either.
 */
export function expressionIdentifiersOf(expression: string): ExpressionIdentifiers {
  const mathAliases: string[] = [];
  const raw = new Set<string>();
  for (const ref of expressionReferences(expression)) {
    raw.add(ref.name);
    if (EXPRESSION_MATH_ALIASES.has(ref.name) && !mathAliases.includes(ref.name)) mathAliases.push(ref.name);
  }
  return { ports: expressionPorts(expression), mathAliases, raw };
}

export interface FunctionMinedPorts {
  /** Names read as `Inputs.x` / `Inputs["x"]` — the runtime mints `in-x` for each. */
  inputs: string[];
  /** Names assigned as `Outputs.x` / `Outputs["x"]` — the runtime mints `out-x`. */
  outputs: string[];
  /** Names called as `Outputs.x()` / `Outputs["x"]()` / `Outputs.x.send()` — signal ports. */
  signals: string[];
}

/**
 * The Function's ports as data, from `@nodegx/project-contract/function-ports`. Signals win over values.
 *
 * One addition the runtime's reader does not make: `Outputs.x.send()` is a signal here. It is the documented second
 * spelling (simplejavascript.ts attaches `.send` to every signal value), so it is seeded and cannot throw.
 */
export function functionMinedPortsOf(body: string): FunctionMinedPorts {
  const names = functionScriptPortNames(body);
  const signals = [...names.signals];
  for (const match of stripScriptComments(body).matchAll(/Outputs\.([A-Za-z0-9_]+)\.send\s*\(/g)) {
    if (!signals.includes(match[1])) signals.push(match[1]);
  }
  const outputs = names.outputs.filter((name) => !signals.includes(name) && name !== 'send');
  return { inputs: [...names.inputs], outputs, signals };
}

/**
 * expression.ts `functionPreamble`, verbatim — the compile checks must accept exactly what the
 * runtime's compile accepts (an expression shadowing `round` compiles there, so it must here).
 */
const EXPRESSION_PREAMBLE =
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
  '}';

/**
 * §3.2/§3.3/§3.4 — the marker gates, each with its named defer. Scanned over the body with
 * comments and single/double-quoted strings stripped (the design's "after comment stripping";
 * template literals stay, their interpolations are code). Over-deferring on a marker inside an
 * odd string is the safe direction; certifying a body that reaches the network is not.
 */
const MARKER_GATES: ReadonlyArray<{ pattern: RegExp; reason: string; bodyOnly?: true }> = [
  {
    pattern: /\bComponent\s*[.\[]/,
    reason: 'reads the Component scope — the component-record tier (controlled-state slice + EXP-003 Tier B)',
    bodyOnly: true
  },
  { pattern: /\bScript\s*[.\[]/, reason: 'uses the Script-node DSL (Script.*) — a hand-written node, not a function', bodyOnly: true },
  {
    pattern: /\bthis\s*[.\[]/,
    reason: "keeps state on `this` across runs — cross-run state is EXP-003 Tier B",
    bodyOnly: true
  },
  { pattern: /\bnew\s+Date\b|\bDate\s*[.(]/, reason: 'reads the clock (Date) — not deterministic' },
  { pattern: /\bMath\.random\b/, reason: 'draws randomness (Math.random) — not deterministic' },
  { pattern: /\bfetch\s*\(|\bXMLHttpRequest\b/, reason: 'reaches the network — not translatable in this slice' },
  { pattern: /\bsetTimeout\b|\bsetInterval\b/, reason: 'schedules timers — invocation timing is real semantics' },
  {
    pattern: /\bwindow\b|\bdocument\b|\blocalStorage\b|\bsessionStorage\b|\bnavigator\b/,
    reason: 'touches the browser environment — not translatable in this slice',
    bodyOnly: true
  },
  { pattern: /\bimport\s*\(/, reason: 'loads code dynamically (import()) — not translatable in this slice' },
  {
    pattern: /\basync\b|\bawait\b|\.then\s*\(/,
    reason: 'is asynchronous — completion ordering joins the invocation tier when the trace harness exists'
  },
  { pattern: /\barguments\b/, reason: "reads the compiled function's arguments object — a host detail this wrapper does not carry", bodyOnly: true }
];

/**
 * EXP-019 (Richard's ruling of 2026-10-21: the off-ramp carries the author's script) — the **host traits**. A Function
 * body that reads the clock, draws randomness, schedules timers, touches the browser, reaches the network or keeps state
 * on `this` is no longer refused for it: the runtime hosts every one of those (`new AsyncFunction(...)`, a `_this` kept per
 * node, the browser's own clock), and so does the export, **as a run once per trigger with a kept node** (plan.ts
 * `jsFunDefOf` / the run compile: `host` forces `pulsed`, so the body never runs at a read site, where a pure body is
 * inlined). The gates stay gates for an Expression (reactive by construction: it runs wherever it is read) and for a
 * script file (`scriptFileMarkerDefer`). Asynchrony is not a host trait yet (EXP-019 slice 1b): an `await` changes when
 * the chain after the run continues, which `runFunction` does not model.
 */
const HOST_TRAIT_REASONS: ReadonlySet<string> = new Set(
  // By the reason's opening words: `arguments`' and `import()`'s reasons also contain the word "this" ("this wrapper",
  // "this slice"), and neither is a host trait — the wrapper's IIFE has its own `arguments`, and a dynamic import is a
  // module question, not a run-model one.
  MARKER_GATES.filter((g) => /^(keeps state on `this`|reads the clock|draws randomness|reaches the network|schedules timers|touches the browser environment)/.test(g.reason)).map((g) => g.reason)
);

/** The asynchrony gate's reason: still a gate for an Expression, a script file, and a Function that awaits at its top level. */
const ASYNC_GATE_REASON = MARKER_GATES.find((g) => g.reason.startsWith('is asynchronous'))!.reason;

/**
 * EXP-019 (session 133) — whether a Function body `await`s **at its top level**: it compiles as the runtime compiles it
 * (`AsyncFunction`) and not as a plain function. Such a body's run is a promise the runtime awaits before Success and Done
 * (`runScript`), which the export's run does not model yet (slice 1b). Any other asynchrony — a `.then(…)`, an inner
 * `async function` — returns at once and writes later, which is a call back (`jsCallsBackOf`, `FunctionNode.late`).
 */
export function jsAwaitsAtTopLevel(body: string): boolean {
  const AsyncFunction = Object.getPrototypeOf(async function () {
    /* prototype probe */
  }).constructor as new (...args: string[]) => unknown;
  try {
    new AsyncFunction('Inputs', 'Outputs', 'Noodl', 'Component', body);
  } catch {
    return false;
  }
  try {
    // eslint-disable-next-line no-new-func
    new Function('Inputs', 'Outputs', 'Noodl', 'Component', body);
    return false;
  } catch {
    return true;
  }
}

/** The host traits a Function body carries, as short phrases ("reads the clock (Date)"), in gate order; `[]` for a pure body. */
export function jsHostTraitsOf(body: string): string[] {
  const scanned = strippedForScan(body);
  const traits = MARKER_GATES.filter((g) => HOST_TRAIT_REASONS.has(g.reason) && g.pattern.test(scanned)).map((g) => g.reason.split(' — ')[0]);
  // EXP-019 (session 133): asynchrony that is not a top-level `await` calls back, after the run has returned.
  const asyncGate = MARKER_GATES.find((g) => g.reason === ASYNC_GATE_REASON)!;
  if (asyncGate.pattern.test(scanned) && !jsAwaitsAtTopLevel(body)) traits.push('is asynchronous (it calls back)');
  return traits;
}

/**
 * EXP-019 (session 133) — whether a Function body may write its outputs or send a signal **after its run has returned**:
 * it carries a trait that calls back later (a timer, a listener on the browser, a request) and it touches `Outputs` inside
 * a function of its own (`function tick() { Outputs.now = Date.now(); }`, `() => Outputs.close()`). The runtime's node
 * delivers such a write when it happens (its `Outputs` proxy flags the output whenever it is written); the export's kept
 * node hands it to the component (`FunctionNode.late`). Measured: todo-list's minute clock (`setInterval`, a
 * `visibilitychange` listener) and planning's "Escape closes what is over the week" (a `keydown` listener).
 *
 * Read off the text, so it can say yes for a nested function that only runs inside the run: the cost is a handler that
 * never fires. A body that hands `Outputs` itself to a helper outside it is not seen.
 */
export function jsCallsBackOf(body: string): boolean {
  const traits = jsHostTraitsOf(body);
  if (!traits.some((t) => /^(schedules timers|touches the browser environment|reaches the network|is asynchronous)/.test(t))) return false;
  const scanned = strippedForScan(body);
  const opener = /\bfunction\b[^{]*\{|=>\s*/g;
  let match: RegExpExecArray | null;
  while ((match = opener.exec(scanned)) !== null) {
    let at = match.index + match[0].length;
    let inner: string;
    if (match[0].endsWith('{') || scanned[at] === '{') {
      if (!match[0].endsWith('{')) at += 1;
      let depth = 1;
      let end = at;
      while (end < scanned.length && depth > 0) {
        if (scanned[end] === '{') depth += 1;
        else if (scanned[end] === '}') depth -= 1;
        end += 1;
      }
      inner = scanned.slice(at, end);
    } else {
      // An arrow with an expression body: up to the end of its statement.
      const rest = scanned.slice(at);
      inner = rest.slice(0, rest.search(/[;\n]|$/));
    }
    if (/\bOutputs\b/.test(inner)) return true;
  }
  return false;
}

/**
 * P109 ISL-005 — the marker gates a **script file** must pass, for a Function that uses it to re-host.
 *
 * A file's code runs inside the Function's call, so what makes a body unfit to re-host (the clock,
 * randomness, the network, timers, `import()`, anything asynchronous) makes a file it calls unfit
 * too. The `bodyOnly` gates are about the body's own host and are not read here: inside a file
 * `this` and `arguments` are ordinary JavaScript, and `Component`, `Script`, `window` and
 * `document` are `undefined` in the runtime and in the export alike (the loader passes them so).
 */
export function scriptFileMarkerDefer(source: string): string | null {
  const scanned = strippedForScan(source);
  for (const gate of MARKER_GATES) {
    if (!gate.bodyOnly && gate.pattern.test(scanned)) return gate.reason;
  }
  return null;
}

/** Comment + quoted-string stripping for the marker scan (LOGIC-TARGET's parse discipline). */
export function strippedForScan(body: string): string {
  return body
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\"([^\"\n]*)\"/g, '""')
    .replace(/\'([^\'\n]*)\'/g, "''");
}

/**
 * §3.1–§3.4 for one body. Returns the named defer, or null when the body passes. The compile
 * checks use the same constructors the runtime uses (`AsyncFunction` for Function — an `await`
 * must reach the async gate's named reason, not a compile failure), then recompile strict:
 * the emitted module is strict-mode TS and the runtime compiles non-strict, so a body that only
 * compiles sloppy would fail the emitted app's own build.
 */
export function jsPurityDefer(kind: JsNodeKind, body: string): string | null {
  if (kind === 'function') {
    const AsyncFunction = Object.getPrototypeOf(async function () {
      /* prototype probe */
    }).constructor as new (...args: string[]) => unknown;
    try {
      new AsyncFunction('Inputs', 'Outputs', 'Noodl', 'Component', body);
    } catch (e) {
      return `does not compile: ${(e as Error).message}`;
    }
    try {
      new AsyncFunction('Inputs', 'Outputs', 'Noodl', 'Component', `'use strict';\n${body}`);
    } catch (e) {
      return `compiles only in sloppy mode (${(e as Error).message}) — the emitted module is strict TS`;
    }
  } else {
    const ids = expressionIdentifiersOf(body).ports;
    try {
      // eslint-disable-next-line no-new-func
      new Function(...ids, 'Noodl', `${EXPRESSION_PREAMBLE}return (${body});`);
    } catch (e) {
      return `does not compile: ${(e as Error).message}`;
    }
    try {
      // eslint-disable-next-line no-new-func
      new Function(...ids, 'Noodl', `'use strict';return (${body});`);
    } catch (e) {
      return `compiles only in sloppy mode (${(e as Error).message}) — the emitted module is strict TS`;
    }
  }

  const scanned = strippedForScan(body);
  // Function bodies name the Noodl API explicitly; Expression reaches the same globals bare
  // (Variables/Objects/Arrays land via the preamble, detected as reactive dependencies).
  if (/\bNoodl\s*[.\[]/.test(scanned)) {
    return 'reads the Noodl API — the runtime-coupled tier (EXP-003 Tier B)';
  }
  if (kind === 'expression') {
    const raw = expressionIdentifiersOf(body).raw;
    for (const globalName of ['Variables', 'Objects', 'Arrays', 'Vars']) {
      if (raw.has(globalName)) {
        return `reads the Noodl ${globalName} global — reactively subscribed at runtime (EXP-003 Tier B)`;
      }
    }
    if (raw.has('random')) return 'draws randomness (random) — not deterministic';
  }
  for (const gate of MARKER_GATES) {
    // EXP-019: a Function carries its host traits (`jsHostTraitsOf`); an Expression is still held to every gate.
    if (kind === 'function' && HOST_TRAIT_REASONS.has(gate.reason)) continue;
    // EXP-019 (session 133): for a Function only a top-level `await` keeps the gate, and says what waits on it.
    if (kind === 'function' && gate.reason === ASYNC_GATE_REASON) {
      if (gate.pattern.test(scanned) && jsAwaitsAtTopLevel(body)) {
        return 'is asynchronous — it awaits at its top level, and a run the export awaits before Success and Done is EXP-019 slice 1b';
      }
      continue;
    }
    if (gate.pattern.test(scanned)) return gate.reason;
  }
  return null;
}
