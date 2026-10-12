/**
 * NSP-016 AC4 step 5 — the layout check (R18): the model's boxes (`layoutChildren` over `layoutOf`, src/layout.ts and
 * src/layout-map.ts) against the boxes a real browser measured on the runtime, for every fixture in `layout-fixtures/`.
 *
 * The browser half is RECORDED, as a scenario is: `node scripts/node-spec/layout-measure.js --record
 * packages/nodegx-node-spec/layout-fixtures` measures each fixture on headless Chrome (heavy: one browser at a time) and
 * writes `layout-fixtures/measured/<name>.json`. This test reads the recordings — no browser — so CI runs it.
 *
 * What is graded: every fixture node that has children, as a parent. Its own outer size is the measured one (its size is
 * graded one level up, as a child); each child's `content` is its measured size (the model does not measure text, and a
 * hugging group's size is its children's — `hugSize`, graded below on its own). A child's layout box is compared with
 * the measured box in the parent's padding box (`inParent`, the measured size); a transformed one's drawn box with the
 * measured bounding box. A node whose `layoutOf(...).outside` is not empty is REPORTED and not graded (§8 step 4).
 *
 * A mismatch is a row like any other (R16: the runtime's fix is P109's) and stays listed in KNOWN until it is fixed: the
 * test fails on a new mismatch, and on a KNOWN one that stopped mismatching (close its row).
 */

import * as fs from 'fs';
import * as path from 'path';
import { hugSize, layoutChildren, layoutOf, specs, type LayoutAxis, type LayoutChild, type Rect } from '../src';

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
  nodes: FixtureNode[];
}
interface Measured {
  id: string;
  parent?: string;
  box?: { x: number; y: number; w: number; h: number };
  size?: { w: number; h: number };
  inParent?: { x: number; y: number };
  transformed?: boolean;
  hit?: boolean;
  /** A Group with Native platform scroll off: its inner box, which is as far as the scroller scrolls. */
  inner?: { w: number; h: number };
}
interface Recording {
  viewports: Record<string, { viewport: { width: number; height: number }; nodes: Measured[]; missing?: string[]; consoleErrors: string[] }>;
}

/**
 * Mismatches measured and not yet fixed — `<fixture>/<viewport>/<child>` → the row. Each is a defect in the runtime or a
 * named limit of the model; this list is what step 5 found.
 */
const FLOOR = "named limit (layout.ts header): flexbox's automatic minimum — a shrinking fill stops at its min-content, the model's floor is 0";
const KNOWN: Record<string, string> = {
  'min-content-floor/1280x800/g1': FLOOR,
  'min-content-floor/390x844/g1': FLOOR
};

const fixtures: Fixture[] = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) as Fixture);

const round = (n: number) => Math.round(n * 100) / 100;
const show = (r: Rect) => `${round(r.x)},${round(r.y)} ${round(r.width)}×${round(r.height)}`;
const near = (a: Rect, b: Rect) => Math.abs(a.x - b.x) <= TOLERANCE && Math.abs(a.y - b.y) <= TOLERANCE && Math.abs(a.width - b.width) <= TOLERANCE && Math.abs(a.height - b.height) <= TOLERANCE;

interface Graded {
  mismatches: Record<string, string>;
  matched: string[];
  reported: string[];
}

/** Grades one recording of one fixture at one viewport. */
function grade(fixture: Fixture, vpName: string, rec: Recording['viewports'][string]): Graded {
  const out: Graded = { mismatches: {}, matched: [], reported: [] };
  const measured = new Map(rec.nodes.map((n) => [n.id, n]));
  const viewport = { width: rec.viewport.width, height: rec.viewport.height };
  // A node's content: a LEAF's is its measured box (the model does not measure text); a node with children of its own
  // has the content its children give it (`hugSize`), never its own measured box — that box is the answer being graded,
  // and a `fill` or a percent the model reads as "its content" would match it whatever the browser did (s71: a percent
  // child in a scroll measured 140 high round 40 px of content, and matched).
  const contentOf = (node: FixtureNode, parentAxis: LayoutAxis | undefined): { width: number; height: number } => {
    const m = measured.get(node.id);
    if (!m?.box) throw new Error(`${fixture.name}/${vpName}: ${node.id} was not measured`);
    const self = layoutOf(specs[node.type], node.parameters ?? {}, { parentAxis, viewport });
    const kids = (node.children ?? []).filter((c) => layoutOf(specs[c.type], c.parameters ?? {}, { viewport }).present);
    if (kids.length === 0 || !self.parent) return { width: m.box.w, height: m.box.h };
    const axis = self.parent.axis;
    return hugSize(
      self.parent,
      kids.map((c) => ({ ...layoutOf(specs[c.type], c.parameters ?? {}, { parentAxis: axis, viewport }).child, content: contentOf(c, axis) }))
    );
  };
  const visit = (node: FixtureNode, parentAxis: LayoutAxis | undefined) => {
    const spec = specs[node.type];
    if (!spec) throw new Error(`${fixture.name}: no spec for ${node.type}`);
    const self = layoutOf(spec, node.parameters ?? {}, { parentAxis, viewport });
    const kids = node.children ?? [];
    if (kids.length === 0 || !self.parent) return;
    const m = measured.get(node.id);
    if (!m?.box) throw new Error(`${fixture.name}/${vpName}: ${node.id} was not measured`);
    const placed = kids.map((c) => ({ c, l: layoutOf(specs[c.type], c.parameters ?? {}, { parentAxis: self.parent!.axis, viewport }), m: measured.get(c.id) }));
    const outside = [...self.outside.map((w) => `${node.id}: ${w}`), ...placed.flatMap((p) => p.l.outside.map((w) => `${p.c.id}: ${w}`))];
    if (outside.length > 0) {
      out.reported.push(`${fixture.name}/${vpName}/${node.id} not graded — ${outside.join('; ')}`);
    } else {
      const present = placed.filter((p) => p.l.present);
      const children: LayoutChild[] = present.map((p) => {
        if (!p.m?.box) throw new Error(`${fixture.name}/${vpName}: ${p.c.id} was not measured`);
        return { ...p.l.child, content: contentOf(p.c, self.parent!.axis) };
      });
      const result = layoutChildren({ ...self.parent, width: m.box.w, height: m.box.h }, children);
      present.forEach((p, i) => {
        const key = `${fixture.name}/${vpName}/${p.c.id}`;
        const model = p.m!.transformed ? result.children[i].drawn : result.children[i];
        const box = p.m!.box!;
        const seen: Rect = { x: p.m!.inParent!.x, y: p.m!.inParent!.y, width: box.w, height: box.h };
        if (near(model, seen)) out.matched.push(key);
        else out.mismatches[key] = `model ${show(model)}, measured ${show(seen)}`;
      });
    }
    for (const c of kids) visit(c, self.parent.axis);
  };
  for (const n of fixture.nodes) visit(n, 'column');
  return out;
}

const recorded = fixtures.filter((f) => fs.existsSync(path.join(DIR, 'measured', `${f.name}.json`)));

describe('NSP-016 AC4 — the model against the measured runtime, fixture by fixture', () => {
  test('every fixture has a recording, and every recording measured every node it placed, with no console error', () => {
    expect(recorded.map((f) => f.name)).toEqual(fixtures.map((f) => f.name));
    for (const f of recorded) {
      const rec = JSON.parse(fs.readFileSync(path.join(DIR, 'measured', `${f.name}.json`), 'utf8')) as Recording;
      for (const [vp, m] of Object.entries(rec.viewports)) {
        expect([f.name, vp, m.missing ?? []]).toEqual([f.name, vp, []]);
        expect([f.name, vp, m.consoleErrors]).toEqual([f.name, vp, []]);
      }
    }
  });

  const all: Graded = { mismatches: {}, matched: [], reported: [] };
  for (const f of recorded) {
    const rec = JSON.parse(fs.readFileSync(path.join(DIR, 'measured', `${f.name}.json`), 'utf8')) as Recording;
    for (const [vp, m] of Object.entries(rec.viewports)) {
      const g = grade(f, vp, m);
      Object.assign(all.mismatches, g.mismatches);
      all.matched.push(...g.matched);
      all.reported.push(...g.reported);
    }
  }

  test('the mismatches are the KNOWN rows — a new one fails, and so does a known one that stopped', () => {
    if (process.env.NSP_LAYOUT_SHOW) console.log([...Object.entries(all.mismatches).map(([k, v]) => `MISMATCH ${k}: ${v}`), ...all.reported.map((r) => `REPORTED ${r}`), `matched ${all.matched.length}`].join('\n'));
    expect(Object.keys(all.mismatches).sort()).toEqual(Object.keys(KNOWN).sort());
  });

  test('something was graded, beside the mismatches', () => {
    expect(all.matched.length).toBeGreaterThan(20);
  });
});

describe('hugSize — a group sized to its content against its measured size', () => {
  test('the hug fixture', () => {
    const rec = JSON.parse(fs.readFileSync(path.join(DIR, 'measured', 'hug.json'), 'utf8')) as Recording;
    const fixture = fixtures.find((f) => f.name === 'hug')!;
    const hugger = fixture.nodes[0].children!.find((c) => c.id === 'hugger')!;
    for (const [vp, m] of Object.entries(rec.viewports)) {
      const byId = new Map(m.nodes.map((n) => [n.id, n]));
      const self = layoutOf(specs.Group, hugger.parameters ?? {}, { parentAxis: 'column', viewport: m.viewport });
      const kids = hugger.children!.map((c) => ({ ...layoutOf(specs.Group, c.parameters ?? {}, { parentAxis: self.parent!.axis, viewport: m.viewport }).child, content: { width: byId.get(c.id)!.box!.w, height: byId.get(c.id)!.box!.h } }));
      const size = hugSize(self.parent!, kids);
      expect([vp, round(size.width), round(size.height)]).toEqual([vp, byId.get('hugger')!.box!.w, byId.get('hugger')!.box!.h]);
    }
  });
});

/**
 * What the measuring found on the path the check does not grade: Native platform scroll is `web-only` (R10), so a scroller with it
 * off is reported, not graded. So each row is held here against the native path, where the same reading is the product's. A
 * fixed row reads the same on both paths (P109 ISL-052); an open row still fires (re-record, then flip it when it is fixed).
 */
describe('the runtime defects the measuring found', () => {
  const read = (name: string) => {
    const rec = JSON.parse(fs.readFileSync(path.join(DIR, 'measured', `${name}.json`), 'utf8')) as Recording;
    return new Map(rec.viewports['1280x800'].nodes.map((n) => [n.id, n]));
  };
  const iscroll = read('scroll-iscroll');
  const native = read('scroll-native');

  test('P107-C152 (fixed, ISL-052) — with Native platform scroll off, a scrolling Group keeps its gap: the children sit 110 px apart, as natively', () => {
    const step = (m: Map<string, Measured>) => m.get('s2')!.inParent!.y - m.get('s1')!.inParent!.y;
    expect([step(native), step(iscroll)]).toEqual([110, 110]);
  });

  test('P107-C153 (fixed, ISL-052) — with Native platform scroll off, a scrolling Group clips: a child below its box is hidden and takes no press, as natively', () => {
    // s3 lies at 220–320, below the 200 px scroller, on both paths
    const outside = (m: Map<string, Measured>) => m.get('s3')!.inParent!.y >= m.get('scroller')!.box!.h;
    expect([outside(native), native.get('s3')!.hit, outside(iscroll), iscroll.get('s3')!.hit]).toEqual([true, false, true, false]);
  });

  test('P109-S37-ISCROLLALIGN (fixed, ISL-052) — with Native platform scroll off, a scrolling Group keeps Align Items and Justify Content: column and row, with and without wrap, every child where its native twin is', () => {
    // `n<dir>[w]` is native, `i<dir>[w]` the same Group with Native platform scroll off; before the fix the axis the inner box
    // fills lost its alignment (the cross axis; the main axis when it wraps) and every arrangement lost its 10 px gap
    const m = read('scroll-align');
    const at = (id: string) => `${m.get(id)!.inParent!.x},${m.get(id)!.inParent!.y}`;
    const pairs = ['c', 'cw', 'r', 'rw'].flatMap((k) => ['a', 'b'].map((c) => [`${k}${c}`, at(`n${k}${c}`), at(`i${k}${c}`)]));
    expect(pairs.filter(([, n, i]) => n !== i)).toEqual([]);
    // and the arrangement is the centred one, not two equally wrong ones
    expect([at('nca'), at('ncb'), at('nra'), at('nrb')]).toEqual(['120,35', '120,105', '85,70', '155,70']);
  });

  test('P109-S37-SCROLLROOM (ruled, ISL-052) — the room inside a scroll is the window unless the content is longer: a share fills what is left and is never shorter than its content, a Fixed percentage is of the window, a long list starts at the top — and the two paths agree', () => {
    const at = (name: string) => {
      const m = read(name);
      return (id: string) => {
        const n = m.get(id)!;
        return `${n.inParent!.x},${n.inParent!.y} ${n.size!.w}x${n.size!.h}`;
      };
    };
    const fill = at('scroll-fill');
    const slides = at('scroll-slides');
    const centre = at('scroll-centre-long');
    const percent = at('scroll-percent-content');
    // P107-C154: the share fills what the window leaves (the native path's reading, now the rule)
    expect(percent('pct')).toBe('0,0 100x140');
    for (const p of ['n', 'i']) {
      // a share with little content fills to the footer (130); with 300 px it is 300, the footer after it (P109-S37-FILLCAP)
      expect([fill(`${p}sb`), fill(`${p}sf`), fill(`${p}lb`), fill(`${p}lf`)]).toEqual(['0,40 100x130', '0,170 100x30', '0,40 100x300', '0,340 100x30']);
      // Fixed 100% is one window each; not Fixed they share it; Fixed 50% is half (P109-S37-ISCROLLPERCENT on the i… path)
      expect([slides(`${p}f0`), slides(`${p}f2`), slides(`${p}s0`), slides(`${p}s2`), slides(`${p}h0`)]).toEqual([
        '0,0 300x100',
        '600,0 300x100',
        '0,0 100x100',
        '200,0 100x100',
        '0,0 150x100'
      ]);
      // centred, 300 px in 200: the first item starts at the top, not 50 px above it (P109-S37-CENTRECUT)
      expect(centre(`${p}0`)).toBe('100,0 100x100');
    }
    // with Native platform scroll off a person scrolls as far as the inner box reaches: all three Fixed slides (900), and
    // a short page's whole window (200) — a box one window wide would hold the slides in place and never reach them
    const box = (name: string, id: string) => read(name).get(id)!.inner;
    expect([box('scroll-slides', 'if'), box('scroll-slides', 'is'), box('scroll-fill', 'is'), box('scroll-fill', 'il')]).toEqual([
      { w: 900, h: 200 },
      { w: 300, h: 200 },
      { w: 300, h: 200 },
      { w: 300, h: 370 }
    ]);
  });
});
