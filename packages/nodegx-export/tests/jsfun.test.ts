import * as fs from 'fs';
import * as path from 'path';

import { Catalog, loadCatalog } from '../src/catalog';
import { emitApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { jsHostTraitsOf, jsPurityDefer } from '../src/analyze/jsfun';
import { ComponentIR, ExportIR, NodeIR, ParamValue } from '../src/ir/types';

const FIXTURE = path.join(__dirname, 'fixtures', 'cheer');

const catalog: Catalog = loadCatalog();
const ir = parseProject(FIXTURE, catalog);
const app = emitApp(ir, catalog);

const cloneIr = (): ExportIR => structuredClone(ir);
const componentOf = (source: ExportIR, componentPath: string): ComponentIR =>
  source.components.find((c) => c.path === componentPath)!;
const nodeOf = (source: ExportIR, componentPath: string, id: string): NodeIR =>
  componentOf(source, componentPath).nodes.find((n) => n.id === id)!;
const setParam = (node: NodeIR, name: string, value: ParamValue) => {
  const existing = node.parameters.find((p) => p.name === name);
  if (existing) existing.value = value;
  else {
    node.parameters.push({ name, value });
    node.parameters.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  }
};
const wire = (
  source: ExportIR,
  componentPath: string,
  fromId: string,
  fromProperty: string,
  toId: string,
  toProperty: string,
  kind: 'value' | 'signal' = 'value'
) => {
  componentOf(source, componentPath).connections.push({
    key: `${fromId}:${fromProperty}->${toId}:${toProperty}`,
    fromId,
    fromProperty,
    toId,
    toProperty,
    kind
  });
};
const unwire = (source: ExportIR, componentPath: string, key: string) => {
  const component = componentOf(source, componentPath);
  component.connections = component.connections.filter((c) => c.key !== key);
};
/** A fresh Function/Expression node on Home, script attached, label naming the wrapper. */
const addJsNode = (source: ExportIR, id: string, type: 'JavaScriptFunction' | 'Expression', script: string) => {
  const home = componentOf(source, 'Pages/Home');
  home.nodes.push({
    id,
    type,
    catalogRef: type,
    authoredLabel: id,
    parameters: [
      {
        name: type === 'JavaScriptFunction' ? 'functionScript' : 'expression',
        value: { kind: 'script', source: script }
      }
    ],
    declaredPorts: [],
    portKnowledge: type === 'JavaScriptFunction' ? 'unknown' : 'partial'
  });
};

// ---------------------------------------------------------------------------------------------
// Session 14 (EXP-003-JS-TARGET-OUTPUT §3–§4): the pure re-host slice. A Function/Expression
// body that touches nothing but Inputs/Outputs emits verbatim inside a typed wrapper —
// correctness by construction, no LLM, no traces. Every §3 failure is a named defer.
// ---------------------------------------------------------------------------------------------

describe('the purity gate over bodies (EXP-003 §3.1–§3.4)', () => {
  test('a syntax error is a first-class defer — the corpus junk body, verbatim', () => {
    expect(jsPurityDefer('function', 'Script.Signal.runOnce = function')).toContain('does not compile');
  });

  test('an expression that does not compile defers with the message', () => {
    expect(jsPurityDefer('expression', 'count ===')).toContain('does not compile');
  });

  test('a body that only compiles sloppy defers — the emitted module is strict TS', () => {
    expect(jsPurityDefer('function', 'var mask = 010;\nOutputs.x = mask;')).toContain('compiles only in sloppy mode');
  });

  test('the Noodl API is the runtime-coupled tier', () => {
    expect(jsPurityDefer('function', "Noodl.Events.emit('go');")).toContain('EXP-003 Tier B');
  });

  test('the Component scope is the Filters family — per-component rewrites', () => {
    expect(jsPurityDefer('function', 'Component.UpdateCondition();')).toContain('controlled-state slice');
  });

  // EXP-019 (s132, Richard's ruling of 2026-10-21): these six are HOST TRAITS for a Function body now — it travels as
  // written and runs once per Run with a kept node (`the-script-travels-as-written.test.ts`). They stay gates for an
  // Expression, which runs wherever it is read.
  test.each([
    ['`this`', 'this.count = (this.count || 0) + 1;', 'keeps state on `this` across runs'],
    ['new Date()', 'Outputs.now = new Date().toISOString();', 'reads the clock (Date)'],
    ['Math.random', 'Outputs.n = Math.random();', 'draws randomness (Math.random)'],
    ['fetch', "fetch('/api');", 'reaches the network'],
    ['setTimeout', 'setTimeout(() => {}, 100);', 'schedules timers'],
    ['window', 'Outputs.w = window.innerWidth;', 'touches the browser environment']
  ])('%s is a host trait of a Function body, not a defer', (_label, body, trait) => {
    expect(jsPurityDefer('function', body)).toBeNull();
    expect(jsHostTraitsOf(body)).toEqual([trait]);
  });

  test.each([
    ['new Date()', 'Date.now()', 'clock'],
    ['random', 'random() * 2', 'randomness']
  ])('%s is still a named defer for an Expression', (_label, body, fragment) => {
    expect(jsPurityDefer('expression', body)).toContain(fragment);
  });

  test.each([
    ['dynamic import', "import('lodash');", 'dynamically'],
    ['async/await', 'await Promise.resolve();', 'asynchronous'],
    ['arguments', 'Outputs.n = arguments.length;', 'arguments']
  ])('%s is a named defer (not a host trait: EXP-019 slice 1b for async; the wrapper\'s own `arguments`; a module question)', (_label, body, fragment) => {
    expect(jsPurityDefer('function', body)).toContain(fragment);
    expect(jsHostTraitsOf(body)).toEqual([]);
  });

  test('a marker inside a comment or a quoted string does not defer', () => {
    expect(jsPurityDefer('function', "// window.fetch would be bad\nOutputs.x = 'not a setTimeout';")).toBeNull();
  });

  test('an Expression reading a bare Noodl global defers — reactively subscribed at runtime', () => {
    expect(jsPurityDefer('expression', 'Variables.count + 1')).toContain('Noodl Variables global');
  });

  test('the Expression preamble alias `random` is the same randomness defer', () => {
    expect(jsPurityDefer('expression', 'random() > 0.5')).toContain('randomness');
  });

  test('the corpus junk bodies that do compile pass the body gate — the graph decides their fate', () => {
    expect(jsPurityDefer('function', 'zzzUndefinedThing;')).toBeNull();
    expect(jsPurityDefer('function', 'const total = pri')).toBeNull();
  });
});

describe('the fixture translation (EXP-003 §4 A1 — asserted piecewise; the byte golden lives in stores-events)', () => {
  const home = app.files['src/pages/Home.tsx'];
  // P18-S122-TPLBUILD (Richard's ruling, 2026-10-19): a Function's wrapper is in a file of its own, as a Script's code is.
  const formatShoutFile = app.files['src/functions/pages/Home/formatShout.ts'];

  test('the Function body is re-hosted verbatim in a typed wrapper, in its own file the component imports', () => {
    // HLS-004. `name` is wire-fed, so the property always arrives and the value may still be
    // undefined; the body then reads it through the runtime's own untyped scope, which is what
    // lets an author's arithmetic compile (issue #24). The three input classes and the reason
    // they type differently are `hls004-an-export-that-builds.test.ts`.
    expect(formatShoutFile).toContain('export function formatShout(__inputs: { name: string | undefined }): { text?: any } {');
    expect(formatShoutFile).toContain('const Inputs = __inputs as { [K in keyof typeof __inputs]: any };');
    expect(formatShoutFile).toContain("const name = Inputs.name || 'friend';\nOutputs.text = name.toUpperCase() + '!';");
    expect(formatShoutFile).toContain('return Outputs;');
    expect(formatShoutFile.startsWith('// @ts-nocheck\n')).toBe(true);
    expect(home).toContain("import { formatShout } from '../functions/pages/Home/formatShout';");
    expect(home).not.toContain('function formatShout(');
  });

  test('the wrapper catches like the runtime catches — a throw publishes what was written', () => {
    expect(formatShoutFile).toContain("console.error('Function node formatShout threw:', e);");
    expect(home).toContain("console.error('Expression node hasLongName threw:', e);\n    return 0;");
  });

  test('one render local per instance; the children sink folds the maybe-undefined output', () => {
    expect(home).toContain('const formatShoutOut = formatShout({ name });');
    expect(home).toContain("{formatShoutOut.text ?? ''}");
  });

  test('the Expression collapses to a return; Is True gates the truthiness sink', () => {
    // P18-S110-EVALATLOAD: `name` is wire-fed from a Variable that may be unset, so until it
    // arrives this is the load's evaluation, which keeps null for a throw or a NaN (GAM-001).
    expect(home).toContain('const __unset = name === undefined;');
    expect(home).toContain("const __value = ((name || '').length > 1);");
    expect(home).toContain('return __unset && Number.isNaN(__value) ? null : __value;');
    expect(home).toContain('disabled={!hasLongNameOut}');
  });

  test('a member name after a paren is no port in the runtime, so the wrapper carries only `name`', () => {
    // 🔴 GAM-002 (P78 D54). This row used to pin the opposite: the old regex scan matched `length`
    // in `(name || '').length` as a fresh identifier, the runtime registered an unfed `length`
    // port, and faithfulness meant carrying it as `length?: any`. The runtime's lexer now reads a
    // name after `.` as a member, and the export mints from a byte-identical copy of it, so the
    // faithful wrapper has one input. `name` arrives by wire, so it is required and merely
    // possibly-undefined in value (HLS-004).
    expect(home).toContain('function hasLongName(__inputs: { name: string | undefined }) {');
    expect(home).toContain('const { name } = __inputs as { [K in keyof typeof __inputs]: any };');
    expect(home).not.toContain('length?: any');
  });

  test('both nodes collapse — no JS deferral notes on the untouched fixture', () => {
    expect(app.notes.filter((n) => /formatShout|hasLongName/.test(n))).toEqual([]);
  });
});

describe('the graph-side gate (EXP-003 §3.5–§3.7), each a named defer', () => {
  test('an unticked Run On Value Change input is a stale snapshot — deferred', () => {
    const mutated = cloneIr();
    setParam(nodeOf(mutated, 'Pages/Home', 'formatShout'), 'runOnChange-in-name', { kind: 'literal', value: false });
    const result = emitApp(mutated, catalog);
    expect(result.notes.join('\n')).toContain('input "name" is unticked under Run On Value Change');
  });

  test('an input fed by a deferred node defers as collateral, naming the feeder', () => {
    const mutated = cloneIr();
    unwire(mutated, 'Pages/Home', 'visitorVar:value->formatShout:in-name');
    wire(mutated, 'Pages/Home', 'greetingCard', 'Anything', 'formatShout', 'in-name');
    const result = emitApp(mutated, catalog);
    expect(result.notes.join('\n')).toContain('input "name" is fed by /Components/GreetingCard');
  });

  test('a JS node feeding a JS node is a chain — deferred whole in this slice', () => {
    const mutated = cloneIr();
    unwire(mutated, 'Pages/Home', 'visitorVar:value->formatShout:in-name');
    wire(mutated, 'Pages/Home', 'hasLongName', 'asString', 'formatShout', 'in-name');
    const result = emitApp(mutated, catalog);
    expect(result.notes.join('\n')).toContain('JS-node chains are not translated in this slice');
  });

  test('two wires into one input defer — last-writer-wins is not statically ordered', () => {
    const mutated = cloneIr();
    wire(mutated, 'Pages/Home', 'previewFormat', 'formatted', 'formatShout', 'in-name');
    const result = emitApp(mutated, catalog);
    expect(result.notes.join('\n')).toContain('two wires feed input "name"');
  });

  test('a consumed per-run pulse defers the node (§3.6): success', () => {
    const mutated = cloneIr();
    wire(mutated, 'Pages/Home', 'formatShout', 'success', 'cheerSend', 'sendEvent', 'signal');
    const result = emitApp(mutated, catalog);
    expect(result.notes.join('\n')).toContain('its success output is consumed — per-run pulses have no render analogue');
  });

  test('a consumed isTrueEv defers — it fires per evaluation', () => {
    const mutated = cloneIr();
    wire(mutated, 'Pages/Home', 'hasLongName', 'isTrueEv', 'cheerSend', 'sendEvent', 'signal');
    const result = emitApp(mutated, catalog);
    expect(result.notes.join('\n')).toContain('its isTrueEv pulse fires per evaluation');
  });

  test('a consumed author signal output defers the Function', () => {
    const mutated = cloneIr();
    const node = nodeOf(mutated, 'Pages/Home', 'formatShout');
    setParam(node, 'functionScript', {
      kind: 'script',
      source: "const name = Inputs.name || 'friend';\nOutputs.text = name.toUpperCase() + '!';\nOutputs.done();"
    });
    wire(mutated, 'Pages/Home', 'formatShout', 'out-done', 'cheerSend', 'sendEvent', 'signal');
    const result = emitApp(mutated, catalog);
    expect(result.notes.join('\n')).toContain('its signal output "done" is consumed');
  });

  test('an unconsumed mined signal seeds a no-op callable — Outputs.done() cannot throw', () => {
    const mutated = cloneIr();
    setParam(nodeOf(mutated, 'Pages/Home', 'formatShout'), 'functionScript', {
      kind: 'script',
      source: "const name = Inputs.name || 'friend';\nOutputs.text = name.toUpperCase() + '!';\nOutputs.done();"
    });
    const result = emitApp(mutated, catalog);
    const wrapper = result.files['src/functions/pages/Home/formatShout.ts'];
    expect(wrapper).toContain('{ text?: any; done: () => void }');
    expect(wrapper).toContain('const Outputs: { text?: any; done: () => void } = { done: () => {} };');
  });

  test('done with Run unwired never pulses — the wire drops with the note', () => {
    const mutated = cloneIr();
    wire(mutated, 'Pages/Home', 'formatShout', 'done', 'cheerSend', 'sendEvent', 'signal');
    const result = emitApp(mutated, catalog);
    expect(result.notes.join('\n')).toContain('done is invocation-only and Run is not wired');
    // The node itself still translates — the value read landed.
    expect(result.files['src/pages/Home.tsx']).toContain('const formatShoutOut');
  });

  test('a run-wired output feeding a render sink materializes the record (§3.7, CONTROLLED-STATE §4f)', () => {
    const mutated = cloneIr();
    wire(mutated, 'Pages/Home', 'cheerButton', 'onClick', 'formatShout', 'run', 'signal');
    const result = emitApp(mutated, catalog);
    const home = result.files['src/pages/Home.tsx'];
    // The output record becomes a state var written where the chain runs; render reads are
    // maybe-undefined until the first invocation — the runtime's own pre-first-run contract.
    expect(home).toContain('const [formatShoutOut, setFormatShoutOut] = useState<{ text?: any } | undefined>();');
    // P18-S121-FRESHOUTPUTS: the run keeps its node, so an output a later run does not write keeps the last value.
    expect(home).toContain('const formatShoutRun = runFunction(formatShout, ');
    expect(home).toContain('setFormatShoutOut({ ...formatShoutRun.outputs })');
    expect(home).toContain("{formatShoutOut?.text ?? ''}");
  });

  test('outputs feeding nothing statically translatable defer — the corpus junk fate', () => {
    const mutated = cloneIr();
    addJsNode(mutated, 'junk', 'JavaScriptFunction', 'const total = pri');
    const result = emitApp(mutated, catalog);
    expect(result.notes.join('\n')).toContain('node junk (JavaScriptFunction) deferred: its outputs feed nothing statically translatable');
  });

  test('an Expression whose inputs never arrive still evaluates at load, over them (GAM-001, P18-S110-EVALATLOAD)', () => {
    // This row used to pin a refusal ("never evaluates"), the rule from before GAM-001. Ticked —
    // the default — the runtime evaluates over the unset inputs and keeps null for a throw or NaN.
    const mutated = cloneIr();
    unwire(mutated, 'Pages/Home', 'visitorVar:value->hasLongName:name');
    const result = emitApp(mutated, catalog);
    expect(result.notes.join('\n')).not.toContain('hasLongName (Expression) deferred');
    const home = result.files['src/pages/Home.tsx'];
    expect(home).toContain('function hasLongName(__inputs: { name?: any }) {');
    expect(home).toContain('  } catch {\n    return null;\n  }');
    expect(home).toContain('const hasLongNameOut = hasLongName({});');
  });

  test('unticked Evaluate At Load over inputs nothing feeds never evaluates — deferred by name', () => {
    const mutated = cloneIr();
    unwire(mutated, 'Pages/Home', 'visitorVar:value->hasLongName:name');
    setParam(nodeOf(mutated, 'Pages/Home', 'hasLongName'), 'evaluateAtLoad', { kind: 'literal', value: false });
    const result = emitApp(mutated, catalog);
    expect(result.notes.join('\n')).toContain(
      'Evaluate At Load is unticked and none of its inputs is ever delivered — the expression never evaluates'
    );
  });

  test('unticked Evaluate At Load over a wire-fed input publishes nothing until it arrives', () => {
    const mutated = cloneIr();
    setParam(nodeOf(mutated, 'Pages/Home', 'hasLongName'), 'evaluateAtLoad', { kind: 'literal', value: false });
    const home = emitApp(mutated, catalog).files['src/pages/Home.tsx'];
    expect(home).toContain('  if (name === undefined) return null;\n  try {\n    return ((name || \'\').length > 1);');
  });

  test('a literal on any input arrives at load, so the box changes nothing (P18-S110-EVALATLOAD)', () => {
    const ticked = cloneIr();
    setParam(nodeOf(ticked, 'Pages/Home', 'hasLongName'), 'name', { kind: 'literal', value: 'Ada' });
    unwire(ticked, 'Pages/Home', 'visitorVar:value->hasLongName:name');
    const unticked = cloneIr();
    setParam(nodeOf(unticked, 'Pages/Home', 'hasLongName'), 'name', { kind: 'literal', value: 'Ada' });
    unwire(unticked, 'Pages/Home', 'visitorVar:value->hasLongName:name');
    setParam(nodeOf(unticked, 'Pages/Home', 'hasLongName'), 'evaluateAtLoad', { kind: 'literal', value: false });
    const a = emitApp(ticked, catalog).files['src/pages/Home.tsx'];
    expect(emitApp(unticked, catalog).files['src/pages/Home.tsx']).toBe(a);
    expect(a).toContain("    return ((name || '').length > 1);");
    expect(a).not.toContain('__unset');
  });

  test('a boolean output lands only in the truthiness sink — a text sink defers named', () => {
    const mutated = cloneIr();
    unwire(mutated, 'Pages/Home', 'hasLongName:isTrue->aboutButton:enabled');
    unwire(mutated, 'Pages/Home', 'previewFormat:formatted->cheerPreview:text');
    wire(mutated, 'Pages/Home', 'hasLongName', 'isTrue', 'cheerPreview', 'text');
    const result = emitApp(mutated, catalog);
    expect(result.notes.join('\n')).toContain('its isTrue feeds Text.text, which has no static binding in this slice');
  });
});

describe('dead wires — the runtime never delivers a bare-named Function port (nodescope catches the connect)', () => {
  test('an input wire without the in- prefix drops with the registration note', () => {
    const mutated = cloneIr();
    unwire(mutated, 'Pages/Home', 'visitorVar:value->formatShout:in-name');
    wire(mutated, 'Pages/Home', 'visitorVar', 'value', 'formatShout', 'name');
    const result = emitApp(mutated, catalog);
    expect(result.notes.join('\n')).toContain('a Function input registers as "in-<name>"');
    // The input then reads undefined, faithfully: the wrapper still translates with the
    // body's own fallback ('friend'), because the read landed.
    expect(result.files['src/pages/Home.tsx']).toContain('const formatShoutOut = formatShout({});');
  });

  test('an output wire without the out- prefix drops with the registration note', () => {
    const mutated = cloneIr();
    unwire(mutated, 'Pages/Home', 'formatShout:out-text->shoutText:text');
    wire(mutated, 'Pages/Home', 'formatShout', 'text', 'shoutText', 'text');
    const result = emitApp(mutated, catalog);
    expect(result.notes.join('\n')).toContain('registers no output named "text"');
    expect(result.notes.join('\n')).toContain('its outputs feed nothing statically translatable');
  });

  test("an Expression input that is not one of the expression's identifiers is unobservable", () => {
    const mutated = cloneIr();
    wire(mutated, 'Pages/Home', 'visitorVar', 'value', 'hasLongName', 'ghost');
    const result = emitApp(mutated, catalog);
    expect(result.notes.join('\n')).toContain('does not reference an identifier "ghost"');
  });
});

describe('A2h — invocation-pure, inside the handler chain (EXP-003 §4)', () => {
  const withA2h = () => {
    const mutated = cloneIr();
    addJsNode(mutated, 'shoutOnce', 'JavaScriptFunction', "Outputs.text = (Inputs.name || 'friend').toUpperCase() + '?';");
    const home = componentOf(mutated, 'Pages/Home');
    home.nodes.push({
      id: 'saveShout',
      type: 'Set Variable',
      catalogRef: 'Set Variable',
      parameters: [{ name: 'name', value: { kind: 'literal', value: 'visitorName' } }],
      declaredPorts: [],
      portKnowledge: 'partial'
    });
    wire(mutated, 'Pages/Home', 'visitorVar', 'value', 'shoutOnce', 'in-name');
    wire(mutated, 'Pages/Home', 'cheerButton', 'onClick', 'shoutOnce', 'run', 'signal');
    wire(mutated, 'Pages/Home', 'shoutOnce', 'out-text', 'saveShout', 'value');
    wire(mutated, 'Pages/Home', 'shoutOnce', 'done', 'saveShout', 'do', 'signal');
    return mutated;
  };

  test('the done-chain compiles into the handler; the output read inlines the call', () => {
    const result = emitApp(withA2h(), catalog);
    const home = result.files['src/pages/Home.tsx'];
    expect(home).toContain(
      "onClick={() => { celebrate.emit({ message: visitorName.get() }); visitorName.set(shoutOnce({ name: visitorName.get() }).text); }}"
    );
    // No render local — the invoked node lives only in its chain.
    expect(home).not.toContain('shoutOnceOut');
  });

  test('an invoked node read outside its chain materializes the record as state (§4f)', () => {
    const mutated = withA2h();
    wire(mutated, 'Pages/Home', 'shoutOnce', 'out-text', 'shoutText', 'text');
    const result = emitApp(mutated, catalog);
    const home = result.files['src/pages/Home.tsx'];
    // P18-S121-FRESHOUTPUTS: through the kept node, as a pulsed run's.
    expect(home).toContain('setShoutOnceOut({ ...shoutOnceRun.outputs })');
    expect(home).toContain("{shoutOnceOut?.text ?? ''}");
  });

  test('a Run whose chain drives nothing defers with the note', () => {
    const mutated = cloneIr();
    addJsNode(mutated, 'idle', 'JavaScriptFunction', 'Outputs.text = 1;');
    wire(mutated, 'Pages/Home', 'cheerButton', 'onClick', 'idle', 'run', 'signal');
    const result = emitApp(mutated, catalog);
    expect(result.notes.join('\n')).toContain('its Run drives nothing this slice translates');
  });
});

describe('the typed Expression getters fold exactly as the runtime getters (expression.ts)', () => {
  test("asString folds null/undefined to '' at its sink", () => {
    const mutated = cloneIr();
    unwire(mutated, 'Pages/Home', 'previewFormat:formatted->cheerPreview:text');
    wire(mutated, 'Pages/Home', 'hasLongName', 'asString', 'cheerPreview', 'text');
    const result = emitApp(mutated, catalog);
    expect(result.files['src/pages/Home.tsx']).toContain("String(hasLongNameOut ?? '')");
  });
});
