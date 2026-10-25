/**
 * NSP-023 AC4 — the guard, measured: each shape of React-made state the sort found (NSP-023 §8) is PLANTED in a copy of
 * a converted spec (the copy is made in memory from the source text, transpiled and loaded; the real file is never
 * touched), and the guard must go red however the planted key is classified — left out of the model, called the node's,
 * called an attribute that follows its source, or called something the browser holds. If a plant ever goes green, the
 * guard has a hole shaped like that defect.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import type { AnyNodeSpec } from '../src';
import { formatWorldKinds, guardFindings, PAGE_MODELS, WORLD_KINDS, type PageModel } from './page-model.helper';

const SEEDS = [13];
const N = 200;
const NODES = path.join(__dirname, '..', 'src', 'nodes');

/** A copy of a spec file with textual changes, compiled in memory. Each `find` must occur exactly once. */
function plantedSpec(file: string, edits: ReadonlyArray<readonly [string, string]>): AnyNodeSpec {
  let source = fs.readFileSync(path.join(NODES, file), 'utf8');
  for (const [find, replace] of edits) {
    const n = source.split(find).length - 1;
    if (n !== 1) throw new Error(`${file}: ${JSON.stringify(find.slice(0, 80))} occurs ${n} times — re-read the file`);
    source = source.replace(find, replace);
  }
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText;
  const module = { exports: {} as Record<string, unknown> };
  const localRequire = (spec: string) => (spec.startsWith('.') ? require(path.resolve(NODES, spec)) : require(spec));
  new Function('require', 'module', 'exports', js)(localRequire, module, module.exports);
  const name = /export const (\w+) = defineNode/.exec(source)![1];
  return module.exports[name] as AnyNodeSpec;
}

/** The model with the planted key added in one class. */
function classified(type: string, key: string, as: 'node' | 'attr' | 'held', follows?: (s: Readonly<Record<string, unknown>>) => unknown): PageModel {
  const m = PAGE_MODELS[type];
  if (as === 'node') return { ...m, node: [...m.node, key] };
  // held, saying what it shows — its source, the claim the plant's author would make
  if (as === 'held') return { ...m, held: { ...m.held, [key]: { shows: follows! } } };
  return { ...m, attr: { ...m.attr, [key]: { follows: follows! } } };
}

interface Plant {
  shape: string;
  type: string;
  file: string;
  key: string;
  follows: (s: Readonly<Record<string, unknown>>) => unknown;
  edits: ReadonlyArray<readonly [string, string]>;
}

const PLANTS: Plant[] = [
  {
    // the Slider v1's C73: React's effect keyed on the Value it last rendered drops a word equal to it
    shape: 'a last-rendered copy (the Slider: the author Value the last paint drew, and a word equal to it dropped)',
    type: 'net.noodl.controls.range',
    file: 'slider.ts',
    key: 'paintedValue',
    follows: (s) => s.authorValue,
    edits: [
      ['  grow: string | null;\n};', '  grow: string | null;\n  paintedValue: number;\n};'],
      ['shown: 0, pending: true', 'shown: 0, pending: true, paintedValue: undefined'],
      // v3 (P109 ISL-031): the paint draws the handle at every frame — the plant drops a word equal to the one it last drew
      [
        '  const shown = Number(rangeValue(s, s.pending ? s.authorValue : s.shown));',
        '  const word = s.pending && !Object.is(s.authorValue, s.paintedValue);\n  const shown = Number(rangeValue(s, word ? s.authorValue : s.shown));'
      ],
      ['set: { ...set, shown, pending: false, out: shown,', 'set: { ...set, shown, pending: false, paintedValue: s.pending ? s.authorValue : s.paintedValue, out: shown,']
    ]
  },
  {
    // the Dropdown v1's `shown`: the component's own copy of the selection, taken from Value when it is made and moved
    // only by a pick after that — a later Value from the graph never reaches the element
    shape: "a component's copy of a value the node holds (the Dropdown: the selection, copied at the making)",
    type: 'net.noodl.controls.options',
    file: 'dropdown.ts',
    key: 'selected',
    follows: (s) => s.value,
    edits: [
      ['  grow: string | null;\n};', '  grow: string | null;\n  selected: string | undefined;\n};'],
      ["items: DEFAULT_ITEMS, domSelected: ''", "items: DEFAULT_ITEMS, domSelected: '', selected: undefined"],
      ["    set.onPage = true;\n    emit.push('didMount');\n  }\n  const value = s.value;", "    set.onPage = true;\n    set.selected = s.value;\n    emit.push('didMount');\n  }\n  const value = fresh ? s.value : s.selected;"],
      // BETA-S7-DROPDOWNSTALE / DROPDOWNFIRSTPICK added `seeded: false` to this line: the plant keeps it.
      ['{ set: { value: picked, domSelected: picked, seeded: false }', '{ set: { value: picked, domSelected: picked, seeded: false, selected: picked }']
    ]
  },
  {
    // the Radio Button v1's D37: "a person made it", set at the click and read at the paint, which fires Changed
    shape: "a 'who made it' flag read at a paint (the Radio Button: Changed fired by the paint after a click)",
    type: 'net.noodl.controls.radiobutton',
    file: 'radiobutton.ts',
    key: 'byPerson',
    follows: () => false,
    edits: [
      ['  gValue: unknown;\n};', '  gValue: unknown;\n  byPerson: boolean;\n};'],
      ['value: undefined, inGroup: false, gValue: undefined', 'value: undefined, inGroup: false, gValue: undefined, byPerson: false'],
      [
        '          return then(p, up, (q) => select(q, q.value, true));',
        "          const r = then(p, up, (q) => select(q, q.value, true));\n          const { checked: _c, ...rest } = r.set ?? {};\n          return { ...r, set: { ...rest, byPerson: true }, send: r.send.filter((x) => x !== 'checked'), emit: (r.emit ?? []).filter((e) => e !== 'onChange') };"
      ],
      ["      set.checked = c;\n      send.push('checked');", "      set.checked = c;\n      send.push('checked');\n      if (s.byPerson) {\n        emit.push('onChange');\n        set.byPerson = false;\n      }"]
    ]
  },
  {
    // the Text Input v1's C69: a write reads the field as React last committed it, not as the write before left it
    shape: 'a commit-pending field (the Text Input: an edit reads the field as the last paint committed it)',
    type: 'net.noodl.controls.textinput',
    file: 'text-input.ts',
    key: 'committed',
    follows: (s) => s.field,
    edits: [
      ['  queue: Array<\'set\' | \'insert\'>;', "  queue: Array<'set' | 'insert'>;\n  committed: string;"],
      ["    field: '',\n", "    field: '',\n    committed: '',\n"],
      ['    const value = s.field; // :331', '    const value = s.committed; // :331'],
      [
        'function painted(s: Readonly<State>): { set: Partial<State>; send: ValueOut[]; emit: Pulse[] } {',
        'function painted(s: Readonly<State>): { set: Partial<State>; send: ValueOut[]; emit: Pulse[] } {\n  const r = paintedNow(s);\n  return { ...r, set: { ...r.set, committed: { ...s, ...r.set }.field } };\n}\nfunction paintedNow(s: Readonly<State>): { set: Partial<State>; send: ValueOut[]; emit: Pulse[] } {'
      ]
    ]
  }
];

describe.each(PLANTS)('$shape', (plant) => {
  const spec = plantedSpec(plant.file, plant.edits);

  test('the copy plays (a control: the planted key is really in its state)', () => {
    expect(spec.type).toBe(plant.type);
    expect(Object.keys(spec.state)).toContain(plant.key);
  });

  test.each([
    ['left out of the model', () => PAGE_MODELS[plant.type]],
    ["called the node's", () => classified(plant.type, plant.key, 'node')],
    ['called an attribute that follows its source', () => classified(plant.type, plant.key, 'attr', plant.follows)],
    ['called something the browser holds that shows its source', () => classified(plant.type, plant.key, 'held', plant.follows)]
  ] as const)('%s: the guard goes red', async (_how, model) => {
    const out = await guardFindings(spec, model(), SEEDS, N);
    console.log(`${plant.type} ${plant.key} ${_how}:\n  ${out.slice(0, 4).join('\n  ')}`);
    expect(out.length).toBeGreaterThan(0);
  }, 600_000);
});

describe('a turn-like hook (React commits a component\'s own update at a turn of the event loop)', () => {
  test('in a spec: a world handler the format does not have goes red', async () => {
    const spec = plantedSpec('slider.ts', [['    world: { place: (s, i, w) => withGrow(s, painted(s), undefined, i.position, w) },', '    world: { place: (s, i, w) => withGrow(s, painted(s), undefined, i.position, w), turn: (s) => ({ set: {}, send: [] }) },']]);
    expect(Object.keys(spec.world ?? {})).toContain('turn');
    const out = await guardFindings(spec, PAGE_MODELS[spec.type], SEEDS, N);
    expect(out).toEqual(['G8 world.turn: not a kind of the format']);
  });

  test('in the format: a new kind in WorldHandlers no longer matches the pinned list', () => {
    const text = fs.readFileSync(path.join(__dirname, '..', 'src', 'spec.ts'), 'utf8');
    const planted = text.replace('export interface WorldHandlers<S, I, O> {\n', 'export interface WorldHandlers<S, I, O> {\n  turn?: (state: Readonly<S>, inputs: Inputs<I>, world: WorldView) => AfterInputsPatch<S, I, O>;\n');
    expect(planted).not.toBe(text);
    expect(formatWorldKinds(text)).toEqual([...WORLD_KINDS]);
    expect(formatWorldKinds(planted)).not.toEqual([...WORLD_KINDS]);
  });
});
