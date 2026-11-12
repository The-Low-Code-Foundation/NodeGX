import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Catalog, loadCatalog } from '../src/catalog';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { writeFieldDesk } from './helpers/field-desk';
import { Desk } from './helpers/root-desk';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * P18-S120-TEXTAREA (P18 session 140, EXP-021 AC4) — a Text Input whose Type is Text Area keeps its lines.
 *
 * The running app draws that field as a `<textarea>` (TextInput.tsx). HEAD's export printed `<input type="textArea">`: a
 * browser knows no such type, draws a one-line field, and drops every line break typed or delivered into it. Driven on
 * rocket-school's Lists page (`dev-docs/tasks/phase-18-code-export-v2/s140-lists-drive/`), a list of three questions
 * saved as one.
 *
 * §A the Field Desk's `name` field (rocket-school's Lists Editor shape: its Value from a Variable, its Set sent by a Set
 * Variable's Done, its text into another Variable), Type Text Area, against the runtime's own nodes, both arms in jsdom
 * (which sanitizes an `<input>`'s value as Chrome does); a control with the Type unset, where both arms lose the break.
 * Predicted first: `s140-lists-drive/EXPECTED.md`, "The desk". §B what is emitted. §C typecheck.
 */

const catalog: Catalog = loadCatalog();
type Readings = string[][];

const LINES = 'France = Paris\nSpain = Madrid';
const FILLED = 'Bob\nAnn';
const STEPS = [`type:name:${LINES}`, 'Fill'];

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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'text-area-app-'));
  for (const [file, text] of Object.entries(app.files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
  return dir;
};

/** Fill's value has a line break in it; `area` makes the name field a Text Area. */
const variant = (area: boolean) => (desk: Desk) => {
  const home = desk.components['Pages/Home'];
  home.nodes.find((n) => n.id === 'sdFill')!.parameters.value = FILLED;
  if (area) home.nodes.find((n) => n.id === 'nameField')!.parameters.type = 'textArea';
};
const VARIANTS = [
  { name: 'area', edit: variant(true) },
  { name: 'control', edit: variant(false) }
];
const desks = VARIANTS.map((v) => writeFieldDesk(v.edit));
const apps = desks.map((d) => emitApp(parseProject(d.dir, catalog), catalog));
const runtime = childArm(
  'runtime-mounted-arm.js',
  desks.map((d) => ({ dir: d.dir, scenarios: [STEPS], fields: true }))
);
const exported = childArm(
  'export-react-arm.js',
  apps.map((a) => ({ dir: writeApp(a), scenarios: [STEPS], settled: true, fields: true }))
);

/** After step `step` (0-based): the name field's text and the first Text (it reads `typed`). */
const seen = (readings: Readings, step: number) => {
  const r = readings[step + 1] ?? [];
  return { name: r.find((line) => line.startsWith('[name]=')) ?? `(no reading: ${r.join(' | ')})`, typed: r[0] };
};
const HOME = 'src/pages/Home.tsx';

describe('§A the lines arrive as the runtime keeps them', () => {
  it('A1 the runtime keeps a Text Area\'s lines, typed and delivered by a Set (the arm grades the runtime first)', () => {
    expect(seen(runtime[0][0], 0)).toEqual({ name: `[name]=${LINES}`, typed: LINES });
    expect(seen(runtime[0][0], 1)).toEqual({ name: `[name]=${FILLED}`, typed: FILLED });
  });

  it('A2 the export reads exactly what the runtime reads, at load and after each step', () => {
    expect(exported[0][0]).toEqual(runtime[0][0]);
  });

  it('A3 control: a one-line field loses the break in both arms, so the desk can tell the two apart', () => {
    const one = LINES.replace('\n', '');
    expect(seen(runtime[1][0], 0)).toEqual({ name: `[name]=${one}`, typed: one });
    expect(seen(runtime[1][0], 1)).toEqual({ name: `[name]=${FILLED.replace('\n', '')}`, typed: FILLED });
    expect(exported[1][0]).toEqual(runtime[1][0]);
  });
});

describe('§B what is emitted', () => {
  const area = apps[0].files[HOME];
  const control = apps[1].files[HOME];
  /** The name field's element: from the last tag opened before its placeholder to the `/>` that closes it. */
  const element = (file: string) => {
    const at = file.indexOf('placeholder="name"');
    const open = file.lastIndexOf('<', at);
    return file.slice(open, file.indexOf('/>', at) + 2);
  };
  const tagOfName = (file: string) => /^<(\w+)/.exec(element(file))?.[1];
  const attrs = (file: string) => [...element(file).matchAll(/\n\s+(\w+)=/g)].map((m) => m[1]);

  it('B1 the Text Area is a <textarea>, with no type: a browser knows no input type "textArea"', () => {
    expect(tagOfName(area)).toBe('textarea');
    expect(area).not.toContain('type="textArea"');
  });

  it('B2 its ref holds a textarea; the control\'s an input', () => {
    expect(area).toMatch(/const nameField = useRef<HTMLTextAreaElement>\(null\);/);
    expect(control).toMatch(/const nameField = useRef<HTMLInputElement>\(null\);/);
    expect(tagOfName(control)).toBe('input');
  });

  it('B3 the field keeps every attribute the input had: its placeholder, value, ref and change handler', () => {
    expect(attrs(area)).toEqual(attrs(control));
    expect(attrs(area)).toEqual(['placeholder', 'value', 'ref', 'onChange']);
  });

  it('B4 base.css turns resizing off, as the running app\'s control does', () => {
    expect(apps[0].files['src/styles/base.css']).toContain('textarea {\n  resize: none;\n}');
  });
});

describe('§C typecheck', () => {
  it('C1 both variants typecheck under the app\'s own strict options', () => {
    expect(typecheckEmittedApp(apps[0])).toEqual([]);
    expect(typecheckEmittedApp(apps[1])).toEqual([]);
  });
});
