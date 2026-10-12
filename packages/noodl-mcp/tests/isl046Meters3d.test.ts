/**
 * P109 ISL-046 · P108-S7-METERS3D — in Garden 3D, no two meter chips over a plot's things cover each other.
 *
 * A building's parts stand on neighbouring tiles (the spa: stones at (3, 1), planks at (4, 1)); at the Workshop's camera
 * each part's chip was placed over its own tile, and the stones' covered the planks'. `chipLifts` says how far up each
 * chip goes: the lowest on screen first, a chip that meets one already placed goes just over it. Read from the BUILT
 * kits, loaded the way a page loads them (garden-kit first: the 3D kit `requires` it).
 *
 * P109-S43-SECONDVISIT (s45): the flat Garden had no such pass, and a tablet that falls back to it (Too Slow) drew the
 * spa's chips over each other in the Workshop. `chipLifts` now lives in garden-kit (its `exports`) and both kits place
 * their plot chips with it. The drive half is `drive-iw007-touch.js` (METERS), in both modes: under software GL the
 * island falls back to flat, so `--mode 3d`'s second Workshop is the flat Garden's.
 *
 * @module noodl-mcp/tests/isl046Meters3d.test
 */
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import * as React from 'react';

const LIBRARY = path.join(__dirname, '..', '..', '..', 'library', 'modules');

function kits(): { garden: any; garden3d: any } {
  const modules: any[] = [];
  let folder = '';
  const context: Record<string, any> = {
    Noodl: {
      defineModule: (m: any) => modules.push(Object.assign(m, { folder })),
      getModule: (id: string) => {
        for (let i = modules.length - 1; i >= 0; i--) if (modules[i] && modules[i].folder === id) return modules[i].exports;
      }
    },
    React,
    console,
    setTimeout,
    clearTimeout
  };
  vm.createContext(context);
  for (const d of ['garden-kit', 'garden-3d-kit']) {
    folder = d;
    vm.runInContext(fs.readFileSync(path.join(LIBRARY, d, 'project', 'noodl_modules', d, 'index.js'), 'utf8'), context, { filename: `${d}/index.js` });
  }
  return {
    garden: modules.find((m: any) => m.folder === 'garden-kit'),
    garden3d: modules[modules.length - 1].reactNodes.find((n: any) => n.name === 'garden-3d-kit.Garden3D')
  };
}

interface Chip {
  x: number;
  bottom: number;
  w: number;
  h: number;
}

const loaded = kits();
const chipLifts = loaded.garden.exports.chipLifts as (items: Chip[]) => number[];
const box = (c: Chip, lift: number) => ({ l: c.x - c.w / 2, r: c.x + c.w / 2, t: c.bottom - lift - c.h, b: c.bottom - lift });
const meets = (chips: Chip[], lifts: number[]): number => {
  const bs = chips.map((c, i) => box(c, lifts[i] || 0));
  let n = 0;
  for (let i = 0; i < bs.length; i++)
    for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i], b = bs[j];
      if (a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b) n++;
    }
  return n;
};

/**
 * The spa at the Workshop's camera, in the shape s7's shot showed: the stones' chip ("0/6" and six pips, the wider) over
 * (3, 1), the planks' ("0/4") over (4, 1), a little lower on the screen and most of it under the stones'.
 */
const SPA: Chip[] = [
  { x: 610, bottom: 402, w: 96, h: 18 },
  { x: 664, bottom: 410, w: 74, h: 18 }
];

describe('P108-S7-METERS3D — Garden 3D’s meter chips never cover each other (chipLifts)', () => {
  it('one copy: Garden 3D places its chips with garden-kit’s chipLifts (the flat Garden’s own)', () => {
    expect(typeof chipLifts).toBe('function');
    expect(loaded.garden3d.overlay.chipLifts).toBe(chipLifts);
  });

  it('🔴 control: the spa’s two chips, placed where their tiles are, cover each other', () => {
    expect(meets(SPA, [0, 0])).toBe(1);
  });

  it('the spa: the lower chip (the planks’) stays over its thing, the stones’ goes just over it', () => {
    const lifts = chipLifts(SPA);
    expect(meets(SPA, lifts)).toBe(0);
    expect(lifts[1]).toBe(0);
    // Just over: its bottom 2 px above the planks' top (410 − 18 − 2 = 390), from 402.
    expect(lifts[0]).toBe(12);
  });

  it('chips that do not meet stay where they are', () => {
    const apart: Chip[] = [
      { x: 100, bottom: 300, w: 60, h: 18 },
      { x: 200, bottom: 300, w: 60, h: 18 },
      { x: 100, bottom: 200, w: 60, h: 18 }
    ];
    expect(chipLifts(apart)).toEqual([0, 0, 0]);
  });

  it('three in a row, each over the last: none covers another, and each goes up only as far as it must', () => {
    const row: Chip[] = [
      { x: 300, bottom: 300, w: 80, h: 18 },
      { x: 330, bottom: 305, w: 80, h: 18 },
      { x: 360, bottom: 310, w: 80, h: 18 }
    ];
    const lifts = chipLifts(row);
    expect(meets(row, lifts)).toBe(0);
    expect(lifts).toEqual([30, 15, 0]);
  });

  it('a chip lifted over one is lifted again over the next it would then meet', () => {
    const stack: Chip[] = [
      { x: 300, bottom: 310, w: 80, h: 18 },
      { x: 300, bottom: 290, w: 80, h: 18 },
      { x: 300, bottom: 300, w: 80, h: 18 }
    ];
    const lifts = chipLifts(stack);
    expect(meets(stack, lifts)).toBe(0);
    expect(lifts[0]).toBe(0);
  });

  it('a chip with no width (nothing drawn yet) takes no room and is not moved', () => {
    const chips: Chip[] = [
      { x: 300, bottom: 300, w: 0, h: 18 },
      { x: 300, bottom: 298, w: 80, h: 18 }
    ];
    expect(chipLifts(chips)).toEqual([0, 0]);
    expect(chipLifts([] as Chip[])).toEqual([]);
  });

  it('ARM: the source’s lift taken out (a chip never moves) leaves the spa’s chips covering each other', () => {
    const src = fs.readFileSync(path.join(LIBRARY, 'garden-kit', 'src', 'kit.js'), 'utf8');
    const from = src.indexOf('  function chipLifts(items) {');
    const end = '\n    return out;\n  }\n';
    const body = src.slice(from, src.indexOf(end, from) + end.length);
    const cut = 'if (!hit) break;';
    expect(body).toContain(cut);
    const mutant = new Function(`${body.replace(cut, 'break;')}; return chipLifts;`)() as typeof chipLifts;
    expect(meets(SPA, mutant(SPA))).toBe(1);
  });
});
