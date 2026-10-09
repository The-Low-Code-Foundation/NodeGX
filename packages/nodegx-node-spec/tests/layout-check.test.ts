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
}
interface Recording {
  viewports: Record<string, { viewport: { width: number; height: number }; nodes: Measured[]; missing?: string[]; consoleErrors: string[] }>;
}

/**
 * Mismatches measured and not yet fixed — `<fixture>/<viewport>/<child>` → the row. Each is a defect in the runtime or a
 * named limit of the model; this list is what step 5 found.
 */
const KNOWN: Record<string, string> = {};

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
        return { ...p.l.child, content: { width: p.m.box.w, height: p.m.box.h } };
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
    expect(all.mismatches).toEqual(KNOWN);
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
 * off is reported, not graded. The two rows still fire while they are open, each beside the native path, where the same reading
 * comes out the other way. A fix changes the recording: re-record `scroll-iscroll`, then close the row and flip its assertion.
 */
describe('the runtime defects the measuring found (open rows, still firing)', () => {
  const read = (name: string) => {
    const rec = JSON.parse(fs.readFileSync(path.join(DIR, 'measured', `${name}.json`), 'utf8')) as Recording;
    return new Map(rec.viewports['1280x800'].nodes.map((n) => [n.id, n]));
  };
  const iscroll = read('scroll-iscroll');
  const native = read('scroll-native');

  test('P107-C152 — with Native platform scroll off, a scrolling Group drops its gap: the children sit 100 px apart, not 110', () => {
    const step = (m: Map<string, Measured>) => m.get('s2')!.inParent!.y - m.get('s1')!.inParent!.y;
    expect([step(native), step(iscroll)]).toEqual([110, 100]);
  });

  test('P107-C153 — with Native platform scroll off, a scrolling Group clips nothing: a child below its box is drawn and takes a press', () => {
    // s3 lies at 200–300 (220–320 natively), below the 200 px scroller: the native path hides it, this path draws it
    const outside = (m: Map<string, Measured>) => m.get('s3')!.inParent!.y >= m.get('scroller')!.box!.h;
    expect([outside(native), native.get('s3')!.hit, outside(iscroll), iscroll.get('s3')!.hit]).toEqual([true, false, true, true]);
  });
});
