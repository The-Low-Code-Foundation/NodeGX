/**
 * OWN-012 step 2 — the drawer (src/draw.ts) graded top-down against the boxes a real browser measured, no browser here.
 *
 * tests/layout-check.test.ts grades one level at a time: each parent's size comes from the recording and only its
 * children's boxes are the model's. Here the drawer gets what a home-made editor has — the files, the viewport, and the
 * leaves' content sizes (the recording's, standing in for a text measurer) — and every other box is its own: the App
 * Group, the Router, the Page and every fixture node, in viewport px, compared with `measured/<fixture>.json`'s `box`.
 * The project around each fixture is the one `scripts/node-spec/layout-measure.js` builds (an App Group of 100% × 100%
 * holding a Router whose start page is the fixture's Page), so the Router's and the Page's two rules (draw.ts header 4)
 * are graded with the rest.
 *
 * A mismatch is a row like any other and stays in KNOWN with its reason until it is fixed: the test fails on a new one and
 * on a known one that stopped. The tolerance is the layout check's and is never loosened to make a row pass. Two mutant
 * arms must go red: the drawer alone losing every gap, and a spec table whose Group has no axis.
 */

import * as fs from 'fs';
import * as path from 'path';
import { canvasTextMeasurer, createDrawer, draw, drawSpecTable, isVisualType, specs, type DrawnBox, type FileComponent, type FileNode, type Rect } from '../src';
import { DRAW_SPECS } from '../src/draw-specs.generated';

const DIR = path.join(__dirname, '..', 'layout-fixtures');
const TOLERANCE = 0.5;

interface FixtureNode {
  id: string;
  type: string;
  parameters?: Record<string, unknown>;
  children?: FixtureNode[];
}
interface Fixture {
  name: string;
  rule: string;
  page?: Record<string, unknown>;
  nodes: FixtureNode[];
}
interface Measured {
  id: string;
  box?: { x: number; y: number; w: number; h: number };
  transformed?: boolean;
}
interface Recording {
  viewports: Record<string, { viewport: { width: number; height: number }; nodes: Measured[] }>;
}

/**
 * Mismatches measured and not yet fixed — `<fixture>/<viewport>/<node>` → why. Each is a named limit of the model or a
 * defect; this list is what step 2 found.
 */
const FLOOR = "named limit (layout.ts header): flexbox's automatic minimum — a shrinking fill stops at its min-content, the model's floor is 0";
const TALL_PAGE =
  "named limit (the same automatic minimum, on the Page): the fixture's content is taller than the viewport (1600 / 1200 px), so the browser keeps the Page — a fill in the Router's column — at its content height and the document scrolls; the model shrinks it to the window. Every box inside it still matches: a column stacks from the top either way";
const KNOWN: Record<string, string> = {
  'min-content-floor/1280x800/g1': FLOOR,
  'min-content-floor/390x844/g1': FLOOR,
  'scroll-align/1280x800/page': TALL_PAGE,
  'scroll-align/390x844/page': TALL_PAGE,
  'scroll-slides/1280x800/page': TALL_PAGE,
  'scroll-slides/390x844/page': TALL_PAGE
};

const fixtures: Fixture[] = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) as Fixture);
const recordingOf = (name: string) => JSON.parse(fs.readFileSync(path.join(DIR, 'measured', `${name}.json`), 'utf8')) as Recording;

/** Nested fixture nodes → the flat file shape (`parent` and `children` by id), as layout-measure.js writes them. */
function flatten(nodes: FixtureNode[] | undefined, parent: string): FileNode[] {
  const out: FileNode[] = [];
  for (const n of nodes ?? []) {
    out.push({ id: n.id, type: n.type, parent, parameters: n.parameters ?? {}, ...(n.children?.length ? { children: n.children.map((c) => c.id) } : {}) });
    out.push(...flatten(n.children, n.id));
  }
  return out;
}

/** The project layout-measure.js builds around a fixture: an App Group of 100% × 100%, a Router, the fixture's Page. */
function projectOf(fixture: Fixture, mutate: (n: FileNode) => FileNode = (n) => n): { root: FileComponent; components: Record<string, FileComponent> } {
  const app: FileComponent = {
    nodes: [
      { id: 'app-root', type: 'Group', children: ['router'], parameters: { sizeMode: 'explicit', width: { value: 100, unit: '%' }, height: { value: 100, unit: '%' } } },
      { id: 'router', type: 'Router', parent: 'app-root', parameters: { name: 'Main', pages: { startPage: '/Fixture', routes: ['/Fixture'] } } }
    ],
    visualRoots: ['app-root']
  };
  const page: FileComponent = {
    nodes: [{ id: 'page', type: 'Page', children: fixture.nodes.map((n) => n.id), parameters: { title: 'Fixture', urlPath: '', ...(fixture.page ?? {}) } }, ...flatten(fixture.nodes, 'page').map(mutate)],
    visualRoots: ['page']
  };
  return { root: app, components: { '/App': app, '/Fixture': page } };
}

const leavesOf = (fixture: Fixture): Set<string> => {
  const out = new Set<string>();
  const walk = (n: FixtureNode) => (n.children?.length ? n.children.forEach(walk) : out.add(n.id));
  fixture.nodes.forEach(walk);
  return out;
};

const round = (n: number) => Math.round(n * 100) / 100;
const show = (r: Rect) => `${round(r.x)},${round(r.y)} ${round(r.width)}×${round(r.height)}`;
const near = (a: Rect, b: Rect) => Math.abs(a.x - b.x) <= TOLERANCE && Math.abs(a.y - b.y) <= TOLERANCE && Math.abs(a.width - b.width) <= TOLERANCE && Math.abs(a.height - b.height) <= TOLERANCE;

interface Graded {
  mismatches: Record<string, string>;
  matched: string[];
  reported: string[];
}

type Drawer = typeof draw;

/** Draws one fixture at one viewport top-down and grades every box the recording has. */
function grade(fixture: Fixture, vpName: string, rec: Recording['viewports'][string], drawer: Drawer = draw, mutate?: (n: FileNode) => FileNode): Graded {
  const out: Graded = { mismatches: {}, matched: [], reported: [] };
  const measured = new Map(rec.nodes.map((n) => [n.id, n]));
  const leaves = leavesOf(fixture);
  const { root, components } = projectOf(fixture, mutate);
  // only a LEAF's content comes from outside (the recording stands in for a text measurer); a parent's is its children's
  const measure = (node: FileNode) => {
    const m = measured.get(node.id);
    if (!leaves.has(node.id) || !m?.box) return undefined;
    return { size: { width: m.box.w, height: m.box.h } };
  };
  const { boxes } = drawer({ nodes: root, components, viewport: rec.viewport, measure });
  const byPath = new Map(boxes.map((b) => [b.path, b]));
  const tainted = (b: DrawnBox): boolean => {
    for (let at: DrawnBox | undefined = b; at; at = at.parent ? byPath.get(at.parent) : undefined) if (at.outside.length > 0) return true;
    return false;
  };
  for (const b of boxes) {
    const m = measured.get(b.id);
    if (!b.present || !m?.box) continue;
    const key = `${fixture.name}/${vpName}/${b.id}`;
    if (tainted(b)) {
      out.reported.push(`${key} not graded — ${b.outside.join('; ') || 'an ancestor is outside the model'}`);
      continue;
    }
    const model: Rect = m.transformed && b.drawn ? b.drawn : b;
    const seen: Rect = { x: m.box.x, y: m.box.y, width: m.box.w, height: m.box.h };
    if (near(model, seen)) out.matched.push(key);
    else out.mismatches[key] = `model ${show(model)}, measured ${show(seen)}`;
  }
  return out;
}

function gradeAll(drawer: Drawer = draw, mutate?: (n: FileNode) => FileNode): Graded {
  const all: Graded = { mismatches: {}, matched: [], reported: [] };
  for (const f of fixtures) {
    const rec = recordingOf(f.name);
    for (const [vp, m] of Object.entries(rec.viewports)) {
      const g = grade(f, vp, m, drawer, mutate);
      Object.assign(all.mismatches, g.mismatches);
      all.matched.push(...g.matched);
      all.reported.push(...g.reported);
    }
  }
  return all;
}

describe('OWN-012 — the drawer against the measured runtime, top-down, fixture by fixture', () => {
  const all = gradeAll();

  test('the mismatches are the KNOWN rows — a new one fails, and so does a known one that stopped', () => {
    if (process.env.OWN012_SHOW) console.log([...Object.entries(all.mismatches).map(([k, v]) => `MISMATCH ${k}: ${v}`), ...all.reported.map((r) => `REPORTED ${r}`), `matched ${all.matched.length}`].join('\n'));
    expect(Object.keys(all.mismatches).sort()).toEqual(Object.keys(KNOWN).sort());
  });

  test('the Page is drawn at the viewport on every fixture (the Router and Page rules hold), and more than the layout check graded', () => {
    const pages = all.matched.filter((k) => k.endsWith('/page'));
    const tallPages = Object.keys(KNOWN).filter((k) => k.endsWith('/page')).length;
    expect(pages.length).toBe(fixtures.length * 2 - tallPages);
    // the layout check grades 150-odd child boxes; the drawer grades those and every page above them
    expect(all.matched.length).toBeGreaterThan(150);
  });

  test('the drawer over the generated table draws the same boxes as the drawer over the full specs', () => {
    const small = createDrawer(DRAW_SPECS);
    for (const f of fixtures) {
      const rec = recordingOf(f.name);
      for (const m of Object.values(rec.viewports)) {
        const { root, components } = projectOf(f);
        const leaves = leavesOf(f);
        const measured = new Map(m.nodes.map((n) => [n.id, n]));
        const measure = (node: FileNode) => (leaves.has(node.id) && measured.get(node.id)?.box ? { size: { width: measured.get(node.id)!.box!.w, height: measured.get(node.id)!.box!.h } } : undefined);
        const a = draw({ nodes: root, components, viewport: m.viewport, measure });
        const b = small.draw({ nodes: root, components, viewport: m.viewport, measure });
        expect([f.name, b.boxes]).toEqual([f.name, a.boxes]);
      }
    }
    expect(small.isVisualType('Group')).toBe(true);
    expect(small.isVisualType('Condition')).toBe(false);
  });
});

describe('OWN-012 — two mutant arms that must go red', () => {
  test('the drawer alone losing every gap: new mismatches on the gapped fixtures', () => {
    const nogap = gradeAll(draw, (n) => {
      const p = { ...n.parameters };
      delete p.rowGap;
      delete p.columnGap;
      return { ...n, parameters: p };
    });
    const fresh = Object.keys(nogap.mismatches).filter((k) => !(k in KNOWN));
    expect(fresh.length).toBeGreaterThan(10);
    expect(fresh).toEqual(expect.arrayContaining(['column-gap/1280x800/b', 'text-row/1280x800/grow', 'button-row/390x844/b2']));
  });

  /** The live table with one of the Group's roles taken off: what a wrong or missing stamp in a spec would do. */
  const without = (role: string) => {
    const table = drawSpecTable(specs);
    const inputs = { ...table.Group.inputs };
    for (const [name, decl] of Object.entries(inputs)) if (decl.layout === role) inputs[name] = { ...decl, layout: undefined };
    for (const d of Object.values(inputs)) if (d.layout === undefined) delete (d as { layout?: string }).layout;
    return createDrawer({ ...table, Group: { inputs } });
  };

  test("a spec table whose Group has no axis: every Group is a leaf, so nothing below the App Group is drawn — the Page's box is lost", () => {
    const mutant = without('axis');
    const g = gradeAll((input) => mutant.draw(input));
    expect(g.matched.filter((k) => k.endsWith('/page'))).toEqual([]);
    expect(g.matched.length).toBeLessThan(10);
  });

  test('a spec table whose Group has no cross alignment: the centred and the right-aligned boxes go off', () => {
    const mutant = without('cross-align');
    const g = gradeAll((input) => mutant.draw(input));
    const fresh = Object.keys(g.mismatches).filter((k) => !(k in KNOWN));
    expect(fresh.length).toBeGreaterThan(5);
    // the row's centred words and the space-between row's items lose their cross position
    expect(fresh).toEqual(expect.arrayContaining(['header-row/1280x800/when', 'justify-space-between/390x844/j1']));
  });
});

describe('OWN-012 — placed components, a For Each and a missing component', () => {
  const card: FileComponent = {
    nodes: [
      { id: 'cardRoot', type: 'Group', children: ['cardText'], parameters: { sizeMode: 'contentSize', paddingLeft: { value: 10, unit: 'px' }, paddingTop: { value: 5, unit: 'px' } } },
      { id: 'cardText', type: 'Text', parent: 'cardRoot', parameters: { text: 'Hi', sizeMode: 'contentSize' } },
      { id: 'cardIn', type: 'Component Inputs', parameters: {} }
    ],
    visualRoots: ['cardRoot']
  };
  const app: FileComponent = {
    nodes: [
      { id: 'root', type: 'Group', children: ['a', 'b', 'rows', 'ghost'], parameters: { sizeMode: 'explicit', width: { value: 100, unit: '%' }, height: { value: 100, unit: '%' }, rowGap: { value: 4, unit: 'px' } } },
      { id: 'a', type: '/Card', parent: 'root', parameters: {} },
      { id: 'b', type: '/Card', parent: 'root', parameters: {} },
      { id: 'rows', type: 'For Each', parent: 'root', parameters: { template: '/Card' } },
      { id: 'ghost', type: '/Nowhere', parent: 'root', parameters: {} }
    ],
    visualRoots: ['root']
  };
  const measure = (node: FileNode) => (node.type === 'Text' ? { size: { width: 30, height: 20 } } : undefined);
  const drawing = draw({ nodes: app, components: { '/Card': card }, viewport: { width: 200, height: 100 }, measure });
  const at = (p: string) => drawing.boxes.find((b) => b.path === p)!;

  test("a placed component's roots stand in its place, each on its own path, in the parent's stack", () => {
    // a path is the placed components' ids, then the node's own: `a/cardText`, not every ancestor
    expect(drawing.boxes.filter((b) => b.present).map((b) => b.path)).toEqual(['root', 'a/cardRoot', 'a/cardText', 'b/cardRoot', 'b/cardText']);
    expect([at('a/cardRoot').x, at('a/cardRoot').y, at('a/cardRoot').width, at('a/cardRoot').height]).toEqual([0, 0, 40, 25]);
    expect([at('b/cardRoot').y, at('b/cardText').x, at('b/cardText').y]).toEqual([29, 10, 34]);
    expect(at('a/cardRoot').parent).toBe('root');
    expect(at('a/cardText').parent).toBe('a/cardRoot');
  });

  test('a value by path reaches one placing and not the other; a value by id reaches both', () => {
    const d = draw({ nodes: app, components: { '/Card': card }, viewport: { width: 200, height: 100 }, measure, values: { 'b/cardText': { mounted: false } } });
    expect(d.boxes.find((b) => b.path === 'b/cardText')!.present).toBe(false);
    expect(d.boxes.find((b) => b.path === 'a/cardText')!.present).toBe(true);
    const e = draw({ nodes: app, components: { '/Card': card }, viewport: { width: 200, height: 100 }, measure, values: { cardText: { mounted: false } } });
    expect(e.boxes.filter((b) => b.id === 'cardText').map((b) => b.present)).toEqual([false, false]);
  });

  test('a For Each and a component not among the files draw nothing and say so', () => {
    expect(at('rows').present).toBe(false);
    expect(at('rows').needs[0]).toMatch(/one row per item/);
    expect(at('ghost').needs[0]).toMatch(/\/Nowhere is not among the files given/);
    expect(drawing.needs).toHaveLength(2);
  });

  test('the files with children lists only (no parent field) draw the same tree', () => {
    const noParent: FileComponent = { nodes: app.nodes.map(({ parent: _p, ...n }) => n), visualRoots: ['root'] };
    const d = draw({ nodes: noParent, components: { '/Card': { nodes: card.nodes.map(({ parent: _p, ...n }) => n), visualRoots: ['cardRoot'] } }, viewport: { width: 200, height: 100 }, measure });
    expect(d.boxes.filter((b) => b.present).map((b) => b.path)).toEqual(['root', 'a/cardRoot', 'a/cardText', 'b/cardRoot', 'b/cardText']);
  });

  test("Body Scroll on: a root's percent height is its content, the root element at least the viewport (the todo template's first page, s2)", () => {
    const tall: FileComponent = {
      nodes: [
        { id: 'root', type: 'Group', children: ['c'], parameters: { sizeMode: 'explicit', width: { value: 100, unit: '%' }, height: { value: 100, unit: '%' } } },
        { id: 'c', type: 'Group', parent: 'root', parameters: { sizeMode: 'explicit', width: { value: 100, unit: '%' }, height: { value: 150, unit: 'px' } } }
      ],
      visualRoots: ['root']
    };
    const off = draw({ nodes: tall, viewport: { width: 200, height: 100 } });
    const on = draw({ nodes: tall, viewport: { width: 200, height: 100 }, bodyScroll: true });
    expect(off.boxes.find((b) => b.id === 'root')!.height).toBe(100);
    expect(on.boxes.find((b) => b.id === 'root')!.height).toBe(150);
    expect(on.needs[0]).toMatch(/Body Scroll on/);
    // a root shorter than the viewport is its content too; the root element's minimum is not the root's
    const short = draw({ nodes: { ...tall, nodes: tall.nodes.map((n) => (n.id === 'c' ? { ...n, parameters: { ...n.parameters, height: { value: 40, unit: 'px' } } } : n)) }, viewport: { width: 200, height: 100 }, bodyScroll: true });
    expect(short.boxes.find((b) => b.id === 'root')!.height).toBe(40);
  });

  test('isVisualType: a spec with a layout role, not a logic node, not a Page (no spec yet)', () => {
    expect([isVisualType('Group'), isVisualType('Text'), isVisualType('Router'), isVisualType('Condition'), isVisualType('Page'), isVisualType('/Card')]).toEqual([true, true, true, false, false, false]);
  });
});

describe('OWN-012 — the canvas measurer, over a fake context', () => {
  const sizeOf = (font: string) => Number(/(\d+(?:\.\d+)?)px/.exec(font)![1]);
  const fake = () => {
    const ctx = {
      font: '',
      letterSpacing: '0px',
      measureText(text: string) {
        const size = sizeOf(ctx.font);
        return { width: text.length * size * 0.5, fontBoundingBoxAscent: size * 0.9, fontBoundingBoxDescent: size * 0.3 };
      }
    };
    return ctx;
  };
  const tokens: Record<string, string> = { '--text-sm': '14px', '--font-semibold': '600', '--leading-snug': '1.375', '--space-3': '12px', '--border-1': '1px' };
  const token = (name: string) => tokens[name];
  const node = (type: string, parameters: Record<string, unknown>): FileNode => ({ id: 'n', type, parameters });
  const read = (n: FileNode) => (port: string) => (n.parameters?.[port] !== undefined ? n.parameters[port] : (specs[n.type].inputs[port] as { default?: unknown } | undefined)?.default);

  test('a Text: size and weight through tokens, the line height a multiplier, the font assumed and said', () => {
    const ctx = fake();
    const m = canvasTextMeasurer({ context: ctx, token });
    const n = node('Text', { text: 'Todo list', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', lineHeight: 'var(--leading-snug)' });
    const r = m(n, read(n), { path: 'n' })!;
    expect(ctx.font).toBe('600 14px system-ui');
    expect([r.size.width, round(r.size.height)]).toEqual([9 * 7, 19.25]);
    expect(r.needs).toEqual(expect.arrayContaining([expect.stringMatching(/Font Family has no default/), expect.stringMatching(/measured by a canvas/)]));
    expect(r.limits).toEqual([]);
  });

  test("Line Height Auto is the font's own, reported; tabular numerals a limit; Case applied", () => {
    const m = canvasTextMeasurer({ context: fake(), token });
    const n = node('Text', { text: 'ab', fontSize: 20, textTransform: 'uppercase', fontVariantNumeric: 'tabular-nums' });
    const r = m(n, read(n), { path: 'n' })!;
    expect([r.size.width, r.size.height]).toEqual([20, 24]);
    expect(r.needs).toEqual(expect.arrayContaining([expect.stringMatching(/Line Height Auto/)]));
    expect(r.limits).toEqual([expect.stringMatching(/tabular-nums/)]);
  });

  test('a Button is its label plus the paddings and the border its ports name; a token with no value is a need', () => {
    const m = canvasTextMeasurer({ context: fake(), token });
    const n = node('net.noodl.controls.button', { label: 'Go', fontSize: 16, lineHeight: 1, paddingLeft: 'var(--space-3)', paddingRight: 'var(--space-3)', paddingTop: 'var(--space-1)', borderStyle: 'solid', borderWidth: 'var(--border-1)' });
    const r = m(n, read(n), { path: 'n' })!;
    expect([r.size.width, r.size.height]).toEqual([16 + 24 + 2, 16 + 0 + 0 + 2]);
    expect(r.needs).toEqual(expect.arrayContaining(['paddingTop: the token --space-1 has no value here']));
  });

  test('a Text Input with Enable Label on is the label line, its Spacing and the field (the todo sign-in fields, s2)', () => {
    const m = canvasTextMeasurer({ context: fake(), token });
    const plain = node('net.noodl.controls.textinput', { fontSize: 16, lineHeight: 1, paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)' });
    const labelled = node('net.noodl.controls.textinput', { ...plain.parameters, useLabel: true, label: 'Email', labelfontSize: 'var(--text-sm)', labellineHeight: 1, labelSpacing: 6 });
    const a = m(plain, read(plain), { path: 'n' })!;
    const b = m(labelled, read(labelled), { path: 'n' })!;
    expect(a.size.height).toBe(16 + 24);
    expect(b.size.height).toBe(14 + 6 + 16 + 24);
    expect(b.needs).toEqual(expect.arrayContaining([expect.stringMatching(/label above the field/)]));
  });

  test('a node type it does not know is left to the drawer', () => {
    const m = canvasTextMeasurer({ context: fake(), token });
    const n = node('Group', {});
    expect(m(n, read(n), { path: 'n' })).toBeUndefined();
  });
});
