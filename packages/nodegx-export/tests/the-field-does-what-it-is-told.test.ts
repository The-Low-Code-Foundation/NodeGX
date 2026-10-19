import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { ComponentPlan, planProject } from '../src/analyze/plan';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { writeFieldDesk } from './helpers/field-desk';
import { Desk } from './helpers/root-desk';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * The field does what it is told (P18 session 129, BOARD lane 6, EXP-011 §97, P18-S128-FIELDSET and P18-S127-CLEAROUT).
 *
 * Before: a text field's Set, Focus and Blur were not triggers ("drives no translatable action"), so a chain holding one
 * was refused whole (35 Set and 34 Focus/Blur template wires; rocket-school's Lists Editor, Moon Adopt and New player form,
 * todo-list's Note dialog and rows, nightbook's Field). A Clear emptied the exported field and sent nothing on.
 *
 * Now a Set writes the field's row with the Value as the runtime's `_internal.text` holds it, read where the handler is,
 * then runs the field's own change chain with that text, and does nothing while the field has focus; a Clear writes `''`
 * and runs the chain too; Focus and Blur call the `<input>`'s own `focus()` / `blur()` through a ref; a field's On Enter
 * is its Enter key. Read from `text-input.ts` and `TextInput.tsx`, measured on the runtime's own nodes first
 * (`dev-docs/tasks/phase-18-code-export-v2/s129-fieldset/EXPECTED.md`, where one prediction was wrong).
 *
 * §A the emitted app rendered by real React under StrictMode (`helpers/export-react-arm.js`, settled) against the
 * runtime's own nodes rendered by real React with the viewer's own focus tracker (`helpers/runtime-mounted-arm.js`), step
 * by step, over the Field Desk (`helpers/field-desk.ts`, built in a temporary folder) and its variants, a control among
 * them; both read each field's text and the focused field (`fields: true`). §B what is emitted. §C the plan. §D typecheck.
 */

const catalog: Catalog = loadCatalog();
type Readings = string[][];

const childArm = (helper: string, input: Array<{ dir: string; scenarios: string[][]; settled?: boolean; fields?: boolean }>): Readings[][] => {
  try {
    return JSON.parse(
      execFileSync(process.execPath, [path.join(__dirname, 'helpers', helper)], {
        input: JSON.stringify(input),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120000,
        maxBuffer: 16 * 1024 * 1024
      })
    );
  } catch (e) {
    const said = String((e as { stderr?: unknown }).stderr ?? e).split('\n')[0];
    return input.map((project) => project.scenarios.map(() => [[`the ${helper} arm threw: ${said}`]]));
  }
};
const writeApp = (app: EmittedApp): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'field-desk-app-'));
  for (const [file, text] of Object.entries(app.files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
  return dir;
};
const emitDir = (dir: string): EmittedApp => emitApp(parseProject(dir, catalog), catalog);
const planOf = (dir: string, legacy: string): ComponentPlan =>
  planProject(parseProject(dir, catalog), new CatalogIndex(catalog)).byLegacyPath.get(legacy)!;

/** One reading: the Texts, then the fields by placeholder, then the focused one. */
interface Seen {
  typed: string;
  blurred: string;
  formName: string;
  name: string;
  form: string;
  focus: string;
}
const LOAD: Seen = { typed: '', blurred: 'blurred never', formName: 'Cleo', name: '', form: 'Cleo', focus: '[note]' };
const reading = (s: Seen): string[] => [
  s.typed,
  'changed yes',
  '',
  s.blurred,
  s.formName,
  `[name]=${s.name}`,
  '[note]=',
  '[title]=a title',
  `[form]=${s.form}`,
  `focus=${s.focus}`
];
/** Readings after each step, each step a change to the one before. */
const walk = (changes: Array<Partial<Seen>>): Readings => {
  let at = LOAD;
  const out = [reading(at)];
  for (const c of changes) {
    at = { ...at, ...c };
    out.push(reading(at));
  }
  return out;
};

const STEPS = ['Fill', 'type:name:Zed', 'Reset', 'Wipe', 'Focus', 'Reset', 'Blur', 'Reset', 'Fill', 'Focus title', 'enter:title', 'Form fill', 'type:form:Dee', 'Form fill', 'Form focus'];
/** Measured on the runtime arm before the export was changed (EXPECTED.md). */
const BASE = walk([
  { typed: 'Bob', name: 'Bob' }, // a Set Variable's Done sends the Set (the Value arrives too: P18-S129-VALUEARRIVAL)
  { typed: 'Zed', name: 'Zed', focus: 'none' }, // typed, and left
  { typed: 'Bob', name: 'Bob' }, // Set: the Value put back over the typing
  { typed: '', name: '' }, // Clear: the empty text goes on
  { focus: '[name]' },
  {}, // Set while focused: nothing
  { focus: 'none' },
  {}, // Set after a Clear, nothing written since: ''
  { typed: 'Bob', name: 'Bob' }, // the same value written again is delivered (forceChange), so the Set has it
  { focus: '[title]' },
  { blurred: 'title blurred', focus: 'none' }, // Enter blurs the title; its Blurred runs
  {}, // the Form's Set from its signal input: Cleo, as it was
  { formName: 'Dee', form: 'Dee', focus: 'none' },
  { formName: 'Cleo', form: 'Cleo' }, // Cleo put back
  { focus: '[form]' }
]);

const UNTICKED_STEPS = ['Fill', 'type:name:Zed', 'Reset', 'Wipe', 'Reset', 'Fill Eve', 'Reset', 'Focus', 'Fill', 'Reset', 'Blur', 'Reset'];
/** Predicted in EXPECTED.md before it ran, and matched: the Set alone carries the Value. */
const UNTICKED = walk([
  { typed: 'Bob', name: 'Bob' },
  { typed: 'Zed', name: 'Zed', focus: 'none' },
  { typed: 'Bob', name: 'Bob' },
  { typed: '', name: '' },
  {}, // cleared, nothing delivered since
  {}, // Eve delivered, not applied (unticked, no Set)
  { typed: 'Eve', name: 'Eve' }, // delivered after the Clear
  { focus: '[name]' },
  {}, // Bob delivered; the Set is absorbed (focused)
  {}, // focused
  { focus: 'none' },
  { typed: 'Bob', name: 'Bob' }
]);

const CONTROL_STEPS = ['Fill', 'Reset', 'type:form:Dee', 'Form fill'];
const CONTROL = walk([{}, {}, { formName: 'Dee', form: 'Dee', focus: 'none' }, {}]);

const untick = (d: Desk): void => {
  d.components['Pages/Home'].nodes.find((n) => n.id === 'nameField')!.parameters['runOnChange-startValue'] = false;
};

const VARIANTS: Array<{ name: string; edit?: (d: Desk) => void; steps: string[] }> = [
  { name: 'the desk', steps: STEPS },
  { name: 'the name field unticked: only its Set puts the Value in', edit: untick, steps: UNTICKED_STEPS },
  {
    name: 'the control: unticked, and no wire into any Set',
    edit: (d) => {
      untick(d);
      for (const graph of Object.values(d.components)) graph.connections = graph.connections.filter((c) => c.toProperty !== 'set');
    },
    steps: CONTROL_STEPS
  }
];

const desks = VARIANTS.map((v) => writeFieldDesk(v.edit));
const apps = desks.map((d) => emitDir(d.dir));
const runtime = childArm(
  'runtime-mounted-arm.js',
  desks.map((d, i) => ({ dir: d.dir, scenarios: [VARIANTS[i].steps], fields: true }))
);
const exported = childArm(
  'export-react-arm.js',
  apps.map((a, i) => ({ dir: writeApp(a), scenarios: [VARIANTS[i].steps], settled: true, fields: true }))
);
const at = (readings: Readings, step: number): string[] => readings[step + 1];

describe('§A the emitted app does what the runtime does, step by step', () => {
  it('A1 the desk: the runtime reads what EXPECTED.md says (the arm grades the runtime first)', () => {
    expect(runtime[0][0]).toEqual(BASE);
  });

  it('A2 the desk: the export reads exactly what the runtime reads', () => {
    expect(exported[0][0]).toEqual(runtime[0][0]);
  });

  it('A3 a Set Variable\'s Done sends the Set: the Value is in the field and goes on to what it feeds', () => {
    expect(at(exported[0][0], 0)).toEqual(at(BASE, 0));
  });

  it('A4 a Set puts the Value back over what was typed', () => {
    expect(at(exported[0][0], 2).slice(0, 6)).toEqual(['Bob', 'changed yes', '', 'blurred never', 'Cleo', '[name]=Bob']);
  });

  it('A5 a Clear sends the empty text on (P18-S127-CLEAROUT)', () => {
    expect(at(exported[0][0], 3)[0]).toBe('');
  });

  it('A6 Focus and Blur move the focus', () => {
    expect([at(exported[0][0], 4)[9], at(exported[0][0], 6)[9]]).toEqual(['focus=[name]', 'focus=none']);
  });

  it('A7 a focused field takes no Set', () => {
    expect(at(exported[0][0], 5)).toEqual(at(exported[0][0], 4));
  });

  it('A8 a Set after a Clear writes nothing back until the Value is written again, the same value too', () => {
    expect([at(exported[0][0], 7)[5], at(exported[0][0], 8)[5]]).toEqual(['[name]=', '[name]=Bob']);
  });

  it('A9 a field\'s own Did Mount Clears it (its text goes on) and Focuses it', () => {
    expect(exported[0][0][0]).toEqual(reading(LOAD));
  });

  it('A10 a field\'s Enter sends its own Blur, and its Blurred runs', () => {
    expect(at(exported[0][0], 10).slice(3, 4).concat(at(exported[0][0], 10)[9])).toEqual(['title blurred', 'focus=none']);
  });

  it('A11 a signal input sends the Set and the Focus of a field inside a placed component', () => {
    expect([at(exported[0][0], 13)[8], at(exported[0][0], 14)[9]]).toEqual(['[form]=Cleo', 'focus=[form]']);
  });

  it('A12 unticked: the runtime reads what EXPECTED.md predicted, and the export reads the same', () => {
    expect(runtime[1][0]).toEqual(UNTICKED);
    expect(exported[1][0]).toEqual(runtime[1][0]);
  });

  it('A13 the control: with no Set wired, both arms read the control', () => {
    expect(runtime[2][0]).toEqual(CONTROL);
    expect(exported[2][0]).toEqual(CONTROL);
  });
});

describe('§B what is emitted', () => {
  const home = apps[0].files['src/pages/Home.tsx'];
  const form = apps[0].files['src/components/Form.tsx'];

  it('B1 the Set Variable\'s write, then the Set behind the focus test: the row, then the field\'s chain with the text', () => {
    expect(home).toContain(
      [
        '        onClick={() => {',
        "          draft.set('Bob');",
        '          if (nameField.current !== document.activeElement) {',
        '            const nameValue = draft.get();',
        "            const nameText = nameCleared.current ? '' : String(nameValue ?? '');",
        '            setName(nameText);',
        "            changed.set('changed yes');",
        '            typed.set(nameText);',
        '          }',
        '        }}'
      ].join('\n')
    );
  });

  it('B2 a Clear writes the row, marks the field cleared, and runs its chain with the empty text', () => {
    expect(home).toContain(["          setName('');", '          nameCleared.current = true;', "          changed.set('changed yes');", "          typed.set('');"].join('\n'));
  });

  it('B3 the field holds its element; Focus and Blur call it', () => {
    expect(home).toContain('  const nameField = useRef<HTMLInputElement>(null);');
    expect(home).toContain('        ref={nameField}');
    expect(home).toContain('<button onClick={() => nameField.current?.focus()}>Focus</button>');
    expect(home).toContain('<button onClick={() => nameField.current?.blur()}>Blur</button>');
  });

  it('B4 the cleared mark is lifted by every write of the Variable the Value reads', () => {
    expect(home).toContain('  useEffect(() => draft.subscribe(() => { nameCleared.current = false; }), []);');
  });

  it('B5 the note\'s Did Mount: the Clear and its chain, then the Focus', () => {
    expect(home).toContain(["    setNote('');", "    noted.set('');", '    noteField.current?.focus();'].join('\n'));
  });

  it('B6 the title\'s Enter is its Enter key', () => {
    expect(home).toContain(["        onKeyDown={(event) => {", "          if (event.key !== 'Enter') return;", '          titleField.current?.blur();', '        }}'].join('\n'));
  });

  it('B7 inside the Form: the signal input\'s Set reads the prop', () => {
    expect(form).toContain(['    if (formField.current !== document.activeElement) {', '      const formValue = name0;', "      const formText = String(formValue ?? '');", '      setForm(formText);', '    }'].join('\n'));
  });
});

/** The desk with the shapes the compile refuses or rules on. */
const ruledDesk = (): string =>
  writeFieldDesk((d) => {
    const home = d.components['Pages/Home'];
    home.nodes.push(
      { id: 'numField', type: 'net.noodl.controls.textinput', label: 'number', parent: 'shell', parameters: { placeholder: 'number', type: 'number' }, x: 100, y: 2000 },
      { id: 'numBtn', type: 'net.noodl.controls.button', label: 'Number', parent: 'shell', parameters: { label: 'Number' }, x: 100, y: 2080 },
      { id: 'readBtn', type: 'net.noodl.controls.button', label: 'Read', parent: 'shell', parameters: { label: 'Read' }, x: 100, y: 2160 },
      { id: 'sdRead', type: 'Set Variable', label: 'Read the name', parameters: { name: 'typed' }, x: 700, y: 2000 },
      { id: 'sdOutcome', type: 'Set Variable', label: 'Focused it', parameters: { name: 'blurred', value: 'focused' }, x: 700, y: 2080 }
    );
    home.nodes.find((n) => n.id === 'shell')!.children!.push('numField', 'numBtn', 'readBtn');
    home.connections.push(
      { fromId: 'numBtn', fromProperty: 'onClick', toId: 'numField', toProperty: 'set' },
      // The name's Set, then a read of the name's text in the same chain.
      { fromId: 'readBtn', fromProperty: 'onClick', toId: 'nameField', toProperty: 'set' },
      { fromId: 'readBtn', fromProperty: 'onClick', toId: 'sdRead', toProperty: 'do' },
      { fromId: 'nameField', fromProperty: 'onTextChanged', toId: 'sdRead', toProperty: 'value' },
      // The title's Focus outcome consumed.
      { fromId: 'titleField', fromProperty: 'done', toId: 'sdOutcome', toProperty: 'do' }
    );
  }).dir;

describe('§C the plan', () => {
  it('C1 every wire into a field\'s action is carried: the chains collapse, no such wire is named dropped', () => {
    const plan = planOf(desks[0].dir, '/Pages/Home');
    expect(plan.dispositions['sdFill']).toEqual({ kind: 'collapsed', into: 'fillBtn' });
    expect(plan.notes.filter((n) => /->\w+Field:(set|clear|focus|blur) /.test(n))).toEqual([]);
    expect(plan.handlers['fillBtn']?.['onClick']).toEqual([
      {
        kind: 'store-set',
        variableName: 'draft',
        expr: { kind: 'literal', value: 'Bob' },
        then: [{ kind: 'state-set', name: 'name', expr: { kind: 'store-get', variableName: 'draft' }, field: { inputId: 'nameField', port: 'set', start: '' } }]
      }
    ]);
    expect(plan.handlers['focusBtn']?.['onClick']).toEqual([{ kind: 'field-focus', inputId: 'nameField', focus: true }]);
    expect(plan.handlers['wipeBtn']?.['onClick']).toEqual([{ kind: 'state-set', name: 'name', expr: { kind: 'literal', value: '' }, field: { inputId: 'nameField', port: 'clear' } }]);
  });

  it('C2 inside the Form: a signal input sends the Set and the Focus', () => {
    const plan = planOf(desks[0].dir, '/Components/Form');
    expect(plan.notes.filter((n) => /fmField:(set|focus)/.test(n))).toEqual([]);
  });

  it('C3 a Number field\'s Set is refused by name', () => {
    expect(planOf(ruledDesk(), '/Pages/Home').notes).toContain(
      "wire numBtn:onClick->numField:set dropped: a Number field's Set sends a number or null, and the exported field carries text (P18-S118-NUMBERFIELD)"
    );
  });

  it('C4 a read of the field\'s text after its Set in the same chain is refused by name (a focused field keeps its own)', () => {
    const plan = planOf(ruledDesk(), '/Pages/Home');
    expect(plan.dispositions['sdRead']).toMatchObject({ kind: 'deferred' });
    expect(String((plan.dispositions['sdRead'] as { reason?: unknown }).reason)).toContain('after a functional update earlier in the chain');
  });

  it('C5 a Focus whose outcome is consumed is refused by name', () => {
    expect(planOf(ruledDesk(), '/Pages/Home').notes).toContain(
      'wire titleFocusBtn:onClick->titleField:focus dropped: its done outcome is consumed — change-conditional pulses are not translated in this slice'
    );
  });

  it('C6 an unticked Value says it reaches the field through its Set', () => {
    expect(planOf(desks[1].dir, '/Pages/Home').notes).toContain(
      'wire draftVar:value->nameField:startValue dropped: Value is unticked under Run On Value Change — it reaches the field only when its Set is sent (P18-S128-FIELDSET)'
    );
  });
});

describe('§D the emitted apps typecheck', () => {
  it.each(VARIANTS.map((v, i) => [v.name, i] as const))('D %s', (_name, i) => {
    expect(typecheckEmittedApp(apps[i])).toEqual([]);
  });

  it('D the ruled desk', () => {
    expect(typecheckEmittedApp(emitDir(ruledDesk()))).toEqual([]);
  });
});
