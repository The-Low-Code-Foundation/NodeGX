import { execFileSync } from 'child_process';
import * as path from 'path';
import * as ts from 'typescript';

import { Catalog, loadCatalog } from '../src/catalog';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { FUNCTION_RUN_LIB_PATH, functionRunLibSource } from '../src/emit/functionRunLib';
import { parseProject } from '../src/parse/parseProject';
import { ComponentIR, ExportIR, NodeIR, ParamValue } from '../src/ir/types';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * EXP-011 §86 — a Function's own signals as chains.
 *
 * A Function run by an event (`Run` wired) and sending a signal of its own (`Outputs.go()`) into an action was refused
 * whole: its outputs were "consumed outside the Run chain by an unrendered sink", because only `done` continued a run.
 * Measured on this machine (s119): 130 such Functions in 28 projects, 76 of them with every value read on their own
 * signal's targets. Most of the corpus's "Function-chain gap" was this.
 *
 * In the runtime a signal call publishes the run's held writes and sends a pulse; the pulse's targets act after the
 * body, in C7 lockstep (the k-th pulse reads the k-th value each output published since the run began). The export now
 * runs the body against a recording `Outputs` (`src/lib/functionRun.ts`) and then each pulse's chain, reading the
 * outputs as that pulse.
 *
 * §A grades the emitted helper against the runtime's OWN Function node (`helpers/runtime-function-arm.js`), body by body,
 * and the emitted fixture's wrapper through it. §B pins what the fixture emits. §C pins the refusals. §D a Cloud
 * Function called from a pulse earns its export (the attach scan had no case for a Function's chains at all).
 */

const FIXTURE = path.join(__dirname, 'fixtures', 'pulse-desk');
const HOME = 'Pages/Home';
const PAGE = 'src/pages/Home.tsx';
const catalog: Catalog = loadCatalog();
const baseIr = parseProject(FIXTURE, catalog);

const literal = (value: string | number | boolean): ParamValue => ({ kind: 'literal', value });
const componentOf = (ir: ExportIR): ComponentIR => ir.components.find((c) => c.path === HOME)!;
const nodeOf = (ir: ExportIR, id: string): NodeIR => componentOf(ir).nodes.find((n) => n.id === id)!;
const wire = (ir: ExportIR, fromId: string, fromProperty: string, toId: string, toProperty: string, kind: 'signal' | 'value' = 'signal') =>
  componentOf(ir).connections.push({ key: `${fromId}:${fromProperty}->${toId}:${toProperty}`, fromId, fromProperty, toId, toProperty, kind });
const unwire = (ir: ExportIR, key: string) => {
  const component = componentOf(ir);
  component.connections = component.connections.filter((c) => c.key !== key);
};
const addNode = (ir: ExportIR, node: Partial<NodeIR> & { id: string; type: string }) =>
  componentOf(ir).nodes.push({ catalogRef: node.type, parameters: [], declaredPorts: [], portCompleteness: 'complete', children: [], ...node } as unknown as NodeIR);
const setParam = (ir: ExportIR, id: string, name: string, value: ParamValue) => {
  const node = nodeOf(ir, id);
  node.parameters = [...node.parameters.filter((p) => p.name !== name), { name, value }];
};
const emit = (mutate?: (ir: ExportIR) => void): EmittedApp => {
  const ir = structuredClone(baseIr);
  mutate?.(ir);
  return emitApp(ir, catalog);
};

// ---- the two arms -----------------------------------------------------------------------------------------------

type Values = Record<string, unknown>;
type RunReading = Record<string, Values[]>;
interface Case {
  name: string;
  body: string;
  outputs: string[];
  signals: string[];
  runs: Array<Record<string, unknown>>;
}

const UNSET = { $undefined: true };
const marked = (v: unknown) => (v === undefined ? UNSET : v);

/** The runtime's own Function, in a child process. */
const runtimeArm = (cases: Case[]): RunReading[][] =>
  JSON.parse(
    execFileSync(process.execPath, [path.join(__dirname, 'helpers', 'runtime-function-arm.js')], {
      input: JSON.stringify(cases.map(({ body, outputs, signals, runs }) => ({ body, outputs, signals, runs }))),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 16 * 1024 * 1024
    })
  );

type AnyModule = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** The emitted `src/lib/functionRun.ts`, compiled as the app compiles it. */
const transpile = (source: string): AnyModule => {
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports: AnyModule = {};
  new Function('exports', js)(exports);
  return exports;
};
const lib = transpile(functionRunLibSource());

/** A body the way the emitted wrapper hosts it: verbatim, inside an arrow, a throw caught. */
const wrapperOf = (body: string) => new Function('Inputs', 'Outputs', `try {\n(() => {\n${body}\n})();\n} catch (e) {}\nreturn Outputs;`);

/** The export's arm: one `functionNode` across the runs, each run through `runFunction`, the pulses grouped by signal. */
const exportArm = (c: Case, fn: (inputs: Values, outputs: Values) => unknown = wrapperOf(c.body) as never): RunReading[] => {
  const node = lib.functionNode(c.signals);
  return c.runs.map((inputs) => {
    const run = lib.runFunction(fn, inputs, node);
    const bySignal: RunReading = Object.fromEntries(c.signals.map((s) => [s, []]));
    for (const pulse of run.pulses) bySignal[pulse.signal].push(Object.fromEntries(c.outputs.map((o) => [o, marked(pulse.values[o])])));
    return bySignal;
  });
};

/** The control model a reader would guess: every pulse reads the run's final values. */
const lastValueArm = (c: Case): RunReading[] => {
  const outputs: Values = {};
  return c.runs.map((inputs) => {
    const sent: string[] = [];
    const sender = (signal: string) => Object.assign(() => sent.push(signal), { send: () => sent.push(signal) });
    const record: Values = new Proxy(outputs, { get: (t, k) => (c.signals.includes(String(k)) ? sender(String(k)) : t[String(k)]) });
    wrapperOf(c.body)(inputs, record);
    const bySignal: RunReading = Object.fromEntries(c.signals.map((s) => [s, []]));
    for (const s of sent) bySignal[s].push(Object.fromEntries(c.outputs.map((o) => [o, marked(outputs[o])])));
    return bySignal;
  });
};

const CASES: Case[] = [
  { name: 'writes, then one signal', body: 'Outputs.a = 1; Outputs.b = "x"; Outputs.go();', outputs: ['a', 'b'], signals: ['go'], runs: [{}] },
  { name: 'a write after the signal (the pulse reads the first)', body: 'Outputs.a = 1; Outputs.go(); Outputs.a = 2;', outputs: ['a'], signals: ['go'], runs: [{}] },
  { name: 'a signal sent twice, a write before each', body: 'Outputs.a = 1; Outputs.go(); Outputs.a = 2; Outputs.go();', outputs: ['a'], signals: ['go'], runs: [{}] },
  { name: 'two signals, a write between them (the second still reads the first)', body: 'Outputs.a = 1; Outputs.go(); Outputs.a = 2; Outputs.go2();', outputs: ['a'], signals: ['go', 'go2'], runs: [{}] },
  { name: 'the signal before the write', body: 'Outputs.go(); Outputs.a = 3;', outputs: ['a'], signals: ['go'], runs: [{}] },
  { name: 'one output written twice before the signal (P18-S119-FIRSTWRITE)', body: "Outputs.a = ''; Outputs.a = 'Please fill it in'; Outputs.go();", outputs: ['a'], signals: ['go'], runs: [{}] },
  { name: 'the same value in a second run (the held write goes with the signal)', body: 'Outputs.a = 1; Outputs.go();', outputs: ['a'], signals: ['go'], runs: [{}, {}] },
  {
    name: 'a held write queues ahead of a later one (the first pulse reads the held value)',
    body: 'Outputs.a = 1; Outputs.go(); if (Inputs.twice) { Outputs.a = 2; Outputs.go(); }',
    outputs: ['a'],
    signals: ['go'],
    runs: [{ twice: false }, { twice: true }]
  },
  { name: 'an output this run does not write keeps the last run', body: 'if (Inputs.first) Outputs.a = 5; Outputs.go();', outputs: ['a'], signals: ['go'], runs: [{ first: true }, { first: false }] },
  { name: 'undefined is never sent (C3)', body: 'Outputs.a = Inputs.n === 1 ? 5 : undefined; Outputs.go();', outputs: ['a'], signals: ['go'], runs: [{ n: 1 }, { n: 2 }] },
  { name: 'the body reads its own output back (a count across runs)', body: 'Outputs.count = (Outputs.count || 0) + 1; Outputs.go();', outputs: ['count'], signals: ['go'], runs: [{}, {}, {}] },
  { name: 'an early return sends nothing', body: "if (Inputs.name === '') return; Outputs.a = Inputs.name; Outputs.go();", outputs: ['a'], signals: ['go'], runs: [{ name: '' }, { name: 'Ada' }] },
  { name: 'a throw after the signal (the pulse was sent)', body: "Outputs.a = 1; Outputs.go(); throw new Error('late');", outputs: ['a'], signals: ['go'], runs: [{}] },
  { name: 'the .send() form', body: 'Outputs.a = 2; Outputs.go.send();', outputs: ['a'], signals: ['go'], runs: [{}] },
  { name: 'one write, three pulses', body: 'Outputs.a = 7; Outputs.go(); Outputs.go(); Outputs.go();', outputs: ['a'], signals: ['go'], runs: [{}] },
  {
    name: 'the fixture body: a name sends go, none sends refused',
    body: [
      "const name = String(Inputs.name || '').trim();",
      "if (name === '') { Outputs.problem = 'Type a name first'; Outputs.refused(); return; }",
      "Outputs.problem = '';",
      "Outputs.greeting = 'Hello, ' + name;",
      'Outputs.sends = (Outputs.sends || 0) + 1;',
      'Outputs.go();'
    ].join('\n'),
    outputs: ['problem', 'greeting', 'sends'],
    signals: ['refused', 'go'],
    runs: [{ name: '' }, { name: 'Ada' }, { name: 'Ada' }, { name: '  ' }, { name: 'Grace' }]
  }
];

const RUNTIME = runtimeArm(CASES);

describe('§A — a pulse reads what the runtime\'s own Function hands its target', () => {
  it.each(CASES.map((c, i) => [c.name, i] as const))('%s', (_name, i) => {
    expect(exportArm(CASES[i])).toEqual(RUNTIME[i]);
  });

  it('control: the cases tell lockstep from "the run\'s last values" — that model is wrong on exactly the six lockstep cases', () => {
    const differ = CASES.filter((c, i) => JSON.stringify(lastValueArm(c)) !== JSON.stringify(RUNTIME[i])).map((c) => c.name);
    expect(differ).toEqual([
      'a write after the signal (the pulse reads the first)',
      'a signal sent twice, a write before each',
      'two signals, a write between them (the second still reads the first)',
      'one output written twice before the signal (P18-S119-FIRSTWRITE)',
      'a held write queues ahead of a later one (the first pulse reads the held value)',
      'undefined is never sent (C3)'
    ]);
  });

  it('control: the runtime arm saw pulses (an arm that recorded nothing would pass every row above with an empty export)', () => {
    expect(RUNTIME.flat().reduce((n, run) => n + Object.values(run).reduce((m, pulses) => m + pulses.length, 0), 0)).toBe(31);
  });

  it("the fixture's emitted wrapper, run by the emitted helper, agrees with the runtime over the fixture's five runs", () => {
    const page = emit().files[PAGE];
    const start = page.indexOf('function Hold_the_name_until_Send(');
    const end = page.indexOf('\n  return Outputs;\n}\n', start) + '\n  return Outputs;\n}'.length;
    const wrapper = transpile(`export ${page.slice(start, end)}`);
    const i = CASES.findIndex((c) => c.name.startsWith('the fixture body'));
    expect(exportArm(CASES[i], wrapper.Hold_the_name_until_Send)).toEqual(RUNTIME[i]);
  });
});

describe('§B — what the fixture emits', () => {
  const app = emit();
  const page = app.files[PAGE];

  it('ships src/lib/functionRun.ts as the helper source, and the page imports its two helpers', () => {
    expect(app.files[FUNCTION_RUN_LIB_PATH]).toContain(functionRunLibSource());
    expect(page).toContain("import { functionNode, runFunction } from '../lib/functionRun';");
  });

  it('the wrapper takes its Outputs record as a parameter, the signals seeded, and declares no record of its own', () => {
    expect(page).toContain(
      'function Hold_the_name_until_Send(__inputs: { name: string | undefined }, Outputs: { problem?: any; greeting?: any; sends?: any; refused: () => void; go: () => void } = { refused: () => {}, go: () => {} })'
    );
    const wrapper = page.slice(page.indexOf('function Hold_the_name_until_Send('), page.indexOf('/** Home. */'));
    expect(wrapper).not.toContain('const Outputs');
  });

  it('the node keeps its values across runs in one ref per instance, its signals listed', () => {
    expect(page).toContain("const holdTheNameUntilSendNode = useRef(functionNode<NonNullable<Parameters<typeof Hold_the_name_until_Send>[1]>>(['refused', 'go'])).current;");
    expect(page).toMatch(/^import \{ useRef, useState \} from 'react';$/m);
  });

  it('Send runs the body through runFunction, then one loop over the pulses, each arm its signal\'s chain reading that pulse', () => {
    expect(page).toContain(
      [
        '          const holdTheNameUntilSendRun = runFunction(Hold_the_name_until_Send, { name: yourName }, holdTheNameUntilSendNode);',
        '          for (const holdTheNameUntilSendPulse of holdTheNameUntilSendRun.pulses) {',
        "            if (holdTheNameUntilSendPulse.signal === 'refused') {",
        '              problem.set(holdTheNameUntilSendPulse.values.problem);',
        "            } else if (holdTheNameUntilSendPulse.signal === 'go') {",
        '              greeting.set(holdTheNameUntilSendPulse.values.greeting);',
        '              sends.set(holdTheNameUntilSendPulse.values.sends);',
        '            }',
        '          }'
      ].join('\n')
    );
  });

  it("Done runs after the pulses and reads the node's values after the run, kept across runs (not a fresh re-run of the body)", () => {
    const page = emit((ir) => {
      addNode(ir, { id: 'lastSet', type: 'Set Variable', parameters: [{ name: 'name', value: literal('lastSends') }] });
      wire(ir, 'hold', 'out-sends', 'lastSet', 'value', 'value');
      wire(ir, 'hold', 'done', 'lastSet', 'do');
    }).files[PAGE];
    expect(page).toContain(['            }', '          }', '          lastSends.set(holdTheNameUntilSendRun.outputs.sends);'].join('\n'));
    expect(page).not.toContain('Hold_the_name_until_Send({');
  });

  it('the name field earns its state row: the Function reads it from Send\'s handler (the eleventh family)', () => {
    expect(page).toContain("const [yourName, setYourName] = useState<string>('');");
    expect(page).toContain('onChange={(event) => setYourName(event.target.value)}');
  });

  it("control: run from the field's own Text Changed alone, the field keeps no state and the run reads the event's text", () => {
    const own = emit((ir) => {
      unwire(ir, 'sendBtn:onClick->hold:run');
      wire(ir, 'nameInput', 'textChanged', 'hold', 'run');
    }).files[PAGE];
    expect(own).not.toContain('useState');
    expect(own).toContain('runFunction(Hold_the_name_until_Send, { name: event.target.value }, holdTheNameUntilSendNode)');
  });

  it('nothing on the page is reported dropped', () => {
    expect(app.notes.filter((n) => n.startsWith('Pages/Home'))).toEqual([]);
  });

  it('the emitted app typechecks', () => {
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  it('a project with no pulsed run ships no helper and imports none (the corpus fixture, byte for byte where it was)', () => {
    const other = emitApp(parseProject(path.join(__dirname, 'fixtures', 'action-desk'), catalog), catalog);
    expect(other.files[FUNCTION_RUN_LIB_PATH]).toBeUndefined();
    expect(Object.values(other.files).some((f) => f.includes('functionRun'))).toBe(false);
  });
});

describe('§C — refused by name: the signals, not the run', () => {
  // A run whose signals are refused compiles as it did before §86; here every read sits on a signal's target, so the run
  // falls to the old stray-read reason, and each signal wire says why it is not chained.
  const STRAY = "Pages/Home: wire sendBtn:onClick->hold:run dropped: its out-greeting output is consumed outside the Run chain by an unrendered sink — the last run's value is not statically expressible there";

  it('a ticked value box: a new value runs the Function and sends its signals again, where the export runs it on Run alone', () => {
    const app = emit((ir) => setParam(ir, 'hold', 'runOnChange-in-name', literal(true)));
    const ticked = 'its "name" input is ticked under Run On Value Change, so a new value runs it and sends its signals again — the export runs it on Run alone';
    expect(app.notes).toEqual(
      expect.arrayContaining([
        STRAY,
        `Pages/Home: wire hold:out-go->greetingSet:do dropped: ${ticked}`,
        `Pages/Home: wire hold:out-go->sendsSet:do dropped: ${ticked}`,
        `Pages/Home: wire hold:out-refused->problemSet:do dropped: ${ticked}`
      ])
    );
    expect(app.files[PAGE]).not.toContain('runFunction');
    expect(app.files[FUNCTION_RUN_LIB_PATH]).toBeUndefined();
  });

  it('an unset box is ticked (absent means ticked)', () => {
    const app = emit((ir) => {
      const node = nodeOf(ir, 'hold');
      node.parameters = node.parameters.filter((p) => p.name !== 'runOnChange-in-name');
    });
    expect(app.notes.some((n) => n.startsWith('Pages/Home: wire hold:out-go->greetingSet:do dropped: its "name" input is ticked under Run On Value Change'))).toBe(true);
  });

  it('one port fed by two of its signals', () => {
    const app = emit((ir) => wire(ir, 'hold', 'out-refused', 'greetingSet', 'do'));
    expect(app.notes).toContain(
      'Pages/Home: wire hold:out-refused->greetingSet:do dropped: two of its signals ("go", "refused") drive Set Variable.do — which value each pulse reads there is not translated'
    );
  });

  it("a signal into something that is no action is that signal's refusal: the other signal still chains", () => {
    const app = emit((ir) => wire(ir, 'hold', 'out-go', 'greetingText', 'text'));
    expect(app.notes).toEqual(
      expect.arrayContaining([
        'Pages/Home: wire hold:out-go->greetingSet:do dropped: its "go" signal drives no translatable action',
        'Pages/Home: wire hold:out-go->sendsSet:do dropped: its "go" signal drives no translatable action',
        // go's targets now read the Function outside any chain, so the run falls to the old reason.
        STRAY
      ])
    );
  });

  it("control: go's only wire into a rendered Text (a stray read the run materializes), the refused signal still chains", () => {
    const app = emit((ir) => {
      for (const key of ['hold:out-go->greetingSet:do', 'hold:out-go->sendsSet:do', 'hold:out-greeting->greetingSet:value', 'hold:out-sends->sendsSet:value']) unwire(ir, key);
      wire(ir, 'hold', 'out-go', 'greetingText', 'text', 'value');
    });
    expect(app.files[PAGE]).toContain("if (holdTheNameUntilSendPulse.signal === 'refused') {");
    expect(app.files[PAGE]).not.toContain("signal === 'go'");
  });

  it('an output read by a logic node no signal of its own fires stays refused, as before', () => {
    const app = emit((ir) => {
      addNode(ir, { id: 'otherSet', type: 'Set Variable', parameters: [{ name: 'name', value: literal('other') }] });
      wire(ir, 'hold', 'out-greeting', 'otherSet', 'value', 'value');
      wire(ir, 'sendBtn', 'onClick', 'otherSet', 'do');
    });
    expect(app.notes).toContain(STRAY);
  });
});

describe('§D — a Cloud Function called from a pulse', () => {
  const withCall = (ir: ExportIR) => {
    ir.project.cloudservices = ir.project.cloudservices ?? { endpoint: 'http://localhost:8581', appId: 'backend_pulsedesk' };
    addNode(ir, { id: 'greetFn', type: 'CloudFunction2', parameters: [{ name: 'function', value: literal('greet') }] });
    wire(ir, 'hold', 'out-greeting', 'greetFn', 'in-greeting', 'value');
    wire(ir, 'hold', 'out-go', 'greetFn', 'call');
  };

  it('earns its export in src/api/functions.ts, and the go arm calls it with the pulse\'s value', () => {
    const app = emit(withCall);
    expect(app.files['src/api/functions.ts']).toContain('export async function callGreet(');
    expect(app.files[PAGE]).toContain('greeting: holdTheNameUntilSendPulse.values.greeting');
    expect(app.files[PAGE]).toMatch(/onClick=\{async \(\) => \{/);
  });

  it('the emitted app typechecks', () => {
    expect(typecheckEmittedApp(emit(withCall))).toEqual([]);
  });
});
