import { execFileSync } from 'child_process';
import * as path from 'path';

import { Catalog, loadCatalog } from '../src/catalog';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { ComponentIR, ExportIR, NodeIR, ParamValue } from '../src/ir/types';
import { withoutAnnouncement } from './helpers/fieldMount';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * P18-S116-FIELDMOUNT — an exported text input announces its Value as it mounts, as the running app's does.
 *
 * In the running app `TextInput.tsx` `componentDidMount` calls `setText(startValue)`, which sends `onTextChanged` with
 * `outwardValueForFieldType(type, text)` and, through the output's `onChange`, Value Changed. So every sink of the Value
 * and every chain on Value Changed runs once as the field appears: a Variable holds `""` from the first frame, and a
 * filter reading it keeps its condition. HEAD's export wrote only on `onChange`, so the Variable held nothing until the
 * first keystroke (s116's drive, step S0).
 *
 * §A the announced value, case by case, against the runtime's own Text Input mounted in a child process (its node built
 * as GAM-009's suite builds it, its component's `componentDidMount` run by a real `createRoot`). §B what is emitted: one
 * guarded mount effect per field, after the page's other effects, nothing for a field with no chain, the typecheck.
 * §C the refusals: a field not there at mount, a Number field, a wired Type.
 */

const SEARCH = path.join(__dirname, 'fixtures', 'search-desk');
const CHEER = path.join(__dirname, 'fixtures', 'cheer');
const HOME = 'Pages/Home';
const HOME_FILE = 'src/pages/Home.tsx';
const METER = 'Components/CheerMeter';
const METER_FILE = 'src/components/CheerMeter.tsx';
const catalog: Catalog = loadCatalog();
const searchIr = parseProject(SEARCH, catalog);
const cheerIr = parseProject(CHEER, catalog);

type Wire = unknown;
const UNSET: Wire = { $undefined: true };

const componentOf = (ir: ExportIR, p: string): ComponentIR => ir.components.find((c) => c.path === p)!;
const nodeIn = (ir: ExportIR, p: string, id: string): NodeIR => componentOf(ir, p).nodes.find((n) => n.id === id)!;
const literal = (value: string | number | boolean): ParamValue => ({ kind: 'literal', value });

const setParams = (node: NodeIR, params: Record<string, ParamValue | undefined>) => {
  for (const [name, value] of Object.entries(params)) {
    node.parameters = node.parameters.filter((p) => p.name !== name);
    if (value !== undefined) node.parameters.push({ name, value });
  }
};
const wire = (ir: ExportIR, p: string, fromId: string, fromProperty: string, toId: string, toProperty: string) =>
  componentOf(ir, p).connections.push({ key: `${fromId}:${fromProperty}->${toId}:${toProperty}`, fromId, fromProperty, toId, toProperty, kind: 'value' });
const unwire = (ir: ExportIR, p: string, key: string) => {
  const component = componentOf(ir, p);
  component.connections = component.connections.filter((c) => c.key !== key);
};
const addVariable = (ir: ExportIR, p: string, id: string, name: string) =>
  componentOf(ir, p).nodes.push({ id, type: 'Variable2', catalogRef: 'Variable2', parameters: [{ name: 'name', value: literal(name) }], declaredPorts: [], portKnowledge: 'complete' } as unknown as NodeIR);

/** search-desk with the Search box's own parameters as given. */
const searchWith = (params: Record<string, ParamValue | undefined>, edit: (ir: ExportIR) => void = () => undefined): ExportIR => {
  const ir = structuredClone(searchIr);
  setParams(nodeIn(ir, HOME, 'searchInput'), params);
  edit(ir);
  return ir;
};

/** The field's mount effect: the ref it guards with and the statements after the guard. */
const mountEffects = (file: string) =>
  [...file.matchAll(/\n {2}\/\/ (.*) announces its Value as it mounts.*\n {2}const (\w+) = useRef\(false\);\n {2}useEffect\(\(\) => \{\n((?: {4}.*\n)*?) {2}\}, \[\]\);\n/g)].map((m) => {
    const lines = m[3].split('\n').filter((l) => l.trim() !== '' && !l.includes(`${m[2]}.current`) && !l.includes('eslint-disable'));
    return { label: m[1], guard: m[2], body: lines.map((l) => l.trim()) };
  });

/** Runs a mount effect's statements with `store.set` recording, and `source` bound where the field's Value is wired. */
const evaluate = (body: string[], store: string, source?: { name: string; value: unknown }): unknown[] => {
  const calls: unknown[] = [];
  const names = [store, ...(source ? [source.name] : [])];
  const values = [{ set: (v: unknown) => calls.push(v) }, ...(source ? [source.value === UNSET || (source.value as { $undefined?: true })?.$undefined ? undefined : source.value] : [])];
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function(...names, body.join('\n'))(...values);
  return calls;
};

const runtimeArm = (cases: Array<{ parameters: Record<string, unknown>; wired?: Wire }>): Array<{ writes: unknown[]; changed: number; field: string | null }> =>
  JSON.parse(
    execFileSync(process.execPath, [path.join(__dirname, 'helpers', 'runtime-field-arm.js')], {
      input: JSON.stringify(cases),
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024
    })
  );

// ---- §A ------------------------------------------------------------------------------------------------------------

/** Authored Values, the field's Value unwired (search-desk's Search box writing the Variable `search`). */
const AUTHORED: Array<{ name: string; parameters: Record<string, string | number> }> = [
  { name: 'an empty Text field', parameters: {} },
  { name: 'a typed-in Value', parameters: { startValue: 'Berlin' } },
  { name: 'a Value with spaces kept', parameters: { startValue: '  two words ' } },
  { name: 'a number typed into Value', parameters: { startValue: 42 } },
  { name: 'a Text Area', parameters: { type: 'textArea', startValue: 'a\nb' } },
  { name: 'an Email field, empty', parameters: { type: 'email' } },
  { name: 'a Password field', parameters: { type: 'password', startValue: 'hunter2' } },
  { name: 'a URL field', parameters: { type: 'url', startValue: 'https://x.test' } }
];
const AUTHORED_APPS = AUTHORED.map((c) => emitApp(searchWith(Object.fromEntries(Object.entries(c.parameters).map(([k, v]) => [k, literal(v)]))), catalog));

/** Wired Values (CheerMeter: the Variable `name` into the field's Value), what the wire holds as the node is made. */
const WIRED: Array<{ name: string; wired: Wire; startValue?: string }> = [
  { name: 'a wired text', wired: 'Oslo' },
  { name: 'a wired empty string', wired: '' },
  { name: 'a wired null (cleared)', wired: null, startValue: 'kept?' },
  { name: 'a wired number', wired: 42 },
  { name: 'a wired boolean', wired: true },
  { name: 'nothing delivered, the start value stands', wired: UNSET, startValue: 'start' },
  { name: 'nothing delivered, no start value', wired: UNSET }
];
const WIRED_APPS = WIRED.map((c) => {
  const ir = structuredClone(cheerIr);
  setParams(nodeIn(ir, METER, 'meterInput'), { startValue: c.startValue === undefined ? undefined : literal(c.startValue) });
  return emitApp(ir, catalog);
});

const READINGS = runtimeArm([
  ...AUTHORED.map((c) => ({ parameters: c.parameters })),
  ...WIRED.map((c) => ({ parameters: c.startValue === undefined ? {} : { startValue: c.startValue }, wired: c.wired }))
]);

describe('§A the value announced at mount, against the runtime', () => {
  test('(known-firing) the runtime arm announces once at mount in every case, and Value Changed with it', () => {
    expect(READINGS).toHaveLength(AUTHORED.length + WIRED.length);
    for (const r of READINGS) {
      expect(r.writes).toHaveLength(1);
      expect(r.changed).toBe(1);
    }
  });

  test.each(AUTHORED.map((c, i) => [c.name, i] as const))('authored: %s', (_name, i) => {
    const effects = mountEffects(AUTHORED_APPS[i].files[HOME_FILE]);
    expect(effects).toHaveLength(1);
    expect(evaluate(effects[0].body, 'search')).toEqual(READINGS[i].writes);
  });

  test.each(WIRED.map((c, i) => [c.name, i] as const))('wired: %s', (_name, i) => {
    const effects = mountEffects(WIRED_APPS[i].files[METER_FILE]);
    expect(effects).toHaveLength(1);
    // The field's Value change runs Set Variable `draftCopy` (its Do on Value Changed, its value the field's Value).
    expect(evaluate(effects[0].body, 'draftCopy', { name: 'name', value: WIRED[i].wired })).toEqual(READINGS[AUTHORED.length + i].writes);
  });
});

// ---- §B ------------------------------------------------------------------------------------------------------------

describe('§B what is emitted', () => {
  const page = AUTHORED_APPS[0].files[HOME_FILE];

  test('one mount effect, guarded by a ref, after the effects that read what it writes', () => {
    const effects = mountEffects(page);
    expect(effects).toEqual([{ label: '"Search"', guard: 'announced', body: ["search.set('');"] }]);
    expect(page.indexOf('announces its Value as it mounts')).toBeGreaterThan(page.indexOf('fetchContacts().then(setContacts)'));
    expect(page).toMatch(/import \{[^}]*\buseEffect\b[^}]*\buseRef\b[^}]*\} from 'react';/);
  });

  test('(control) the helper neighbouring specs read pages through removes the announcement, and only it', () => {
    const stripped = withoutAnnouncement(page);
    expect(stripped).not.toContain('announces its Value');
    expect(stripped).not.toContain('announced');
    expect(page.split('\n').length - stripped.split('\n').length).toBe(8);
    expect(stripped).toContain('fetchContacts().then(setContacts)');
  });

  test('typing still runs the same chain from the event', () => {
    expect(page).toMatch(/onChange=\{\(event\) => search\.set\(event\.target\.value\)\}/);
  });

  test('a field whose Value reaches nothing announces nothing', () => {
    const app = emitApp(searchWith({}, (ir) => unwire(ir, HOME, 'searchInput:onTextChanged->searchVar:value')), catalog);
    expect(mountEffects(app.files[HOME_FILE])).toEqual([]);
    expect(app.files[HOME_FILE]).not.toContain('announces its Value');
  });

  test('a Value Changed chain runs at mount too (a Global Store Set on Value Changed, cheer\'s Mood page)', () => {
    const app = emitApp(cheerIr, catalog);
    expect(mountEffects(app.files['src/pages/Mood.tsx']).map((e) => e.body)).toEqual([["mood.set({ note: '' });"]]);
  });

  test('a wired Value is read where the effect runs, with the sync effect\'s coercion', () => {
    const effects = mountEffects(WIRED_APPS[0].files[METER_FILE]);
    expect(effects[0].body).toEqual([
      'const arrival = name;',
      "const mountValue = arrival === undefined ? '' : arrival === null ? '' : String(arrival);",
      'draftCopy.set(mountValue);'
    ]);
  });

  test.each([
    ['search-desk', AUTHORED_APPS[0]],
    ['search-desk, a typed-in Value', AUTHORED_APPS[1]],
    ['cheer', WIRED_APPS[0]]
  ] as Array<[string, EmittedApp]>)('the app typechecks: %s', (_name, app) => {
    expect(typecheckEmittedApp(app)).toEqual([]);
  });
});

// ---- §C ------------------------------------------------------------------------------------------------------------

describe('§C refused by name, and never announced where the runtime would not', () => {
  const refusal = (app: EmittedApp) => app.notes.filter((n) => n.includes('its Value at mount is not announced'));

  test('a Number field: refused by name (the export carries its Value as text)', () => {
    const app = emitApp(searchWith({ type: literal('number') }), catalog);
    expect(mountEffects(app.files[HOME_FILE])).toEqual([]);
    expect(refusal(app)).toEqual([expect.stringContaining('P18-S118-NUMBERFIELD')]);
    // Typing still writes, as before.
    expect(app.files[HOME_FILE]).toContain('search.set(event.target.value)');
  });

  test('a wired Type: refused by name', () => {
    const app = emitApp(searchWith({}, (ir) => {
      addVariable(ir, HOME, 'typeVar', 'fieldType');
      wire(ir, HOME, 'typeVar', 'value', 'searchInput', 'type');
    }), catalog);
    expect(mountEffects(app.files[HOME_FILE])).toEqual([]);
    expect(refusal(app)).toEqual([expect.stringContaining('its Type is wired')]);
  });

  test('the field\'s own Mounted wired: it announces the first time that wire draws it', () => {
    // P18 session 126 (EXP-011 §93): refused by name until then; graded against the runtime's own Text Input in
    // `the-root-is-mounted-when-it-says`.
    const app = emitApp(searchWith({}, (ir) => {
      addVariable(ir, HOME, 'showVar', 'show');
      wire(ir, HOME, 'showVar', 'value', 'searchInput', 'mounted');
    }), catalog);
    expect(refusal(app)).toEqual([]);
    expect(app.files[HOME_FILE]).toMatch(/announces its Value the first time it mounts.*\n {2}const (\w+) = useRef\(false\);\n {2}useEffect\(\(\) => \{\n {4}if \(\1\.current\) return;\n {4}if \(!\(\w+ === undefined \|\| !!\w+\)\) return;\n/);
  });

  test('the page\'s own Group mounted from a wire: it announces the first time that wire draws it (P18-S126-PAGEGROUP, fixed)', () => {
    // P18 session 126 (EXP-011 §93) refused it by name: `shell`, the page's sole Group, was folded into the page div, which
    // cannot carry a Mounted. Since session 136 a Group whose Mounted is wired is not folded, and gates as the row above.
    const app = emitApp(searchWith({}, (ir) => {
      addVariable(ir, HOME, 'showVar', 'show');
      wire(ir, HOME, 'showVar', 'value', 'shell', 'mounted');
    }), catalog);
    expect(refusal(app)).toEqual([]);
    expect(app.files[HOME_FILE]).toMatch(/announces its Value the first time it mounts.*\n {2}const (\w+) = useRef\(false\);\n {2}useEffect\(\(\) => \{\n {4}if \(\1\.current\) return;\n {4}if \(!\(\w+ === undefined \|\| !!\w+\)\) return;\n/);
  });

  test('authored Mounted false: never on the page, so nothing announced and nothing to refuse', () => {
    const app = emitApp(searchWith({ mounted: literal(false) }), catalog);
    expect(mountEffects(app.files[HOME_FILE])).toEqual([]);
    expect(refusal(app)).toEqual([]);
  });

  test('(control) Visible false still mounts, so it still announces', () => {
    const app = emitApp(searchWith({ visible: literal(false) }), catalog);
    expect(mountEffects(app.files[HOME_FILE])).toHaveLength(1);
  });
});
