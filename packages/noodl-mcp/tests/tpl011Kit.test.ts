/**
 * TPL-011 — the gate over `library/modules/nightbook-kit` (the page a child decorates) and the
 * spike's save script.
 *
 * The kit is plain JS the browser runs as-is, so this runs the BUILT file inside a `vm` context
 * with the two globals the runtime provides (`Noodl`, `React`) and nothing else — the server-render
 * arm, where every browser API is absent. The gestures themselves are driven with real input
 * elsewhere (`library/modules/nightbook-kit/harness/drive-harness.js`, and inside the Nightbook
 * shell by `nightbook-desktop/drive-page-designer.js`); this grades the geometry they call and
 * what a page draws from its items.
 *
 * @module noodl-mcp/tests/tpl011Kit.test
 */
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { SAVE_SCRIPT, tonight } from './tpl011Spike';

const KIT_DIR = path.join(__dirname, '..', '..', '..', 'library', 'modules', 'nightbook-kit');
const BUILT = path.join(KIT_DIR, 'project', 'noodl_modules', 'nightbook-kit', 'index.js');
const SOURCE = path.join(KIT_DIR, 'src', 'kit.js');
const FONTS = path.join(KIT_DIR, 'fonts');

function loadKit(): { nodes: unknown[]; reactNodes: Array<Record<string, any>> } {
  let captured: any = null;
  const context: Record<string, unknown> = {
    Noodl: {
      defineModule(m: unknown) {
        captured = m;
      }
    },
    React,
    console
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(BUILT, 'utf8'), context, { filename: 'nightbook-kit/index.js' });
  if (!captured) throw new Error('index.js never called Noodl.defineModule');
  return captured;
}

const kit = loadKit();
const Page = kit.reactNodes[0];
const L = Page.logic;
const PAGE = { w: 1000, h: 700 };

function item(fields: Record<string, unknown>) {
  return L.normaliseItems([fields])[0];
}

function render(props: Record<string, unknown>): string {
  return renderToStaticMarkup(React.createElement(Page.getReactComponent(), props));
}

describe('the built kit', () => {
  test('carries src/kit.js verbatim (index.js is generated; the source is what a person edits)', () => {
    expect(fs.readFileSync(BUILT, 'utf8')).toContain(fs.readFileSync(SOURCE, 'utf8'));
  });

  test('registers exactly one React node, by the name the graph uses', () => {
    expect(kit.nodes).toEqual([]);
    expect(kit.reactNodes.map((n) => n.name)).toEqual(['nightbook-kit.Page']);
  });

  test('declares every port the spike wires to it', () => {
    const { connections } = tonight();
    const touched = connections.flatMap((c) => [c.toId === 'tnJournal' ? c.toProperty : null, c.fromId === 'tnJournal' ? c.fromProperty : null]).filter(Boolean) as string[];
    const ports = new Set([...Object.keys(Page.inputProps), ...Object.keys(Page.outputProps)]);
    expect(touched.filter((p) => !ports.has(p))).toEqual([]);
    // The control: the census is not empty, so an empty "missing" list is a measurement.
    expect(new Set(touched).size).toBeGreaterThanOrEqual(14);
  });
});

describe('what a page draws (server render, no DOM)', () => {
  const items = [
    { id: 's', kind: 'sticker', text: '★', x: 100, y: 100, w: 120, h: 120, rot: 20, z: 1 },
    { id: 't', kind: 'text', text: 'Swim!', x: 300, y: 300, w: 420, h: 150, z: 2, style: { font: 'Chewy', effect: 'rainbow' } },
    { id: 'p', kind: 'photo', src: 'data:image/jpeg;base64,AAAA', x: 600, y: 100, w: 300, h: 200, z: 3 }
  ];

  test('each item where its fields say, turned about its centre', () => {
    const html = render({ items });
    expect(html).toContain('data-nb-item="s"');
    expect(html).toMatch(/data-nb-item="s"[^>]*style="left:100px;top:100px;width:120px;height:120px;z-index:1;transform:rotate\(20deg\)"/);
    expect(html).toContain('src="data:image/jpeg;base64,AAAA"');
  });

  test('rainbow words are drawn a letter at a time, in the chosen font', () => {
    const html = render({ items });
    expect(html).toContain('font-family:Chewy');
    expect((html.match(/<span style="color:#[0-9A-F]{6};display:inline-block;white-space:pre">/g) || []).length).toBe(5);
  });

  test('a closed page draws the same items and no handles, and cannot be focused to edit', () => {
    const open = render({ items });
    const closed = render({ items, editable: false });
    expect(closed).not.toContain('data-nb-handle');
    expect(closed).toContain('data-editable="0"');
    expect(closed).toContain('tabindex="-1"');
    expect(open).toContain('tabindex="0"');
    // Nothing is picked on a first render either, so neither draws handles: the control that the
    // absence above is about editability and not about "nothing ever draws handles" is the harness drive.
    expect(open).not.toContain('data-nb-handle');
  });

  test('an empty or broken Items draws an empty page, never a throw', () => {
    for (const v of [undefined, null, 'not an array', 42, [null, 7, 'x']]) {
      expect(() => render({ items: v })).not.toThrow();
    }
    expect(render({ items: [null, 7] }).match(/data-nb-item=/g)?.length).toBe(2);
  });
});

describe('the geometry', () => {
  test('normalising: unknown kinds become text, duplicate ids are split, a Noodl Object reads through .data', () => {
    const out = L.normaliseItems([{ id: 'a', kind: 'dragon' }, { id: 'a', kind: 'sticker' }, { data: { id: 'b', kind: 'photo' }, get: () => undefined }]);
    expect(out.map((i: any) => [i.id, i.kind])).toEqual([
      ['a', 'text'],
      ['a-1', 'sticker'],
      ['b', 'photo']
    ]);
  });

  test('a FileList-like (length, no forEach) is read — without this a picked photo was dropped', () => {
    expect(L.toArray({ length: 2, 0: 'x', 1: 'y' })).toEqual(['x', 'y']);
    expect(L.toArray('abc')).toEqual([]);
  });

  test('moving keeps the centre on the page', () => {
    const it = item({ kind: 'sticker', x: 0, y: 0, w: 100, h: 100 });
    const far = L.moved(it, 5000, -5000, PAGE);
    expect([far.x + far.w / 2, far.y + far.h / 2]).toEqual([1000, 0]);
  });

  test('scaling keeps the shape, and neither side goes under the minimum', () => {
    const it = item({ kind: 'photo', x: 0, y: 0, w: 300, h: 200 });
    const big = L.scaled(it, 2, PAGE);
    expect([big.w, big.h]).toEqual([600, 400]);
    const tiny = L.scaled(it, 0.01, PAGE);
    expect(tiny.h).toBe(L.MIN_SIZE);
    expect(tiny.w / tiny.h).toBeCloseTo(1.5);
  });

  test('pinching words grows the letters with the box', () => {
    const it = item({ kind: 'text', w: 400, h: 100, style: { size: 30 } });
    expect(L.scaled(it, 1.5, PAGE).style.size).toBe(45);
  });

  test('the corner of a text box re-wraps it (width and height free), even turned', () => {
    const it = item({ kind: 'text', x: 0, y: 0, w: 200, h: 100, rot: 90 });
    // Turned a quarter, the box's own +x points down the page: a point 150 below and 50 left of the
    // centre is 150 along its width and 50 along its height.
    const c = { x: 100, y: 50 };
    const r = L.resized(it, it, c, { x: c.x - 50, y: c.y + 150 }, PAGE);
    expect(Math.round(r.w)).toBe(300);
    expect(Math.round(r.h)).toBe(100);
    expect(r.x + r.w / 2).toBeCloseTo(100);
  });

  test('turning lands on a right angle within 4°, and never stores -0 or -180', () => {
    expect(L.snapAngle(92)).toBe(90);
    expect(L.snapAngle(95)).toBe(95);
    expect(L.snapAngle(-2)).toBe(0);
    expect(Object.is(L.snapAngle(-0.5), -0)).toBe(false);
    expect(L.snapAngle(-179)).toBe(180);
    expect(L.snapAngle(270)).toBe(-90);
  });

  test('two fingers: twice as far apart and a 30° sweep is twice the size, 30° more turn, following the middle', () => {
    const it = item({ kind: 'sticker', x: 440, y: 290, w: 120, h: 120, rot: 10 });
    const out = L.pinched(it, { x: 470, y: 350 }, { x: 530, y: 350 }, { x: 500 - 60 * Math.cos(Math.PI / 6) + 10, y: 350 - 60 * Math.sin(Math.PI / 6) }, { x: 500 + 60 * Math.cos(Math.PI / 6) + 10, y: 350 + 60 * Math.sin(Math.PI / 6) }, PAGE);
    expect(out.w).toBeCloseTo(240);
    expect(out.rot).toBeCloseTo(40);
    expect(out.x + out.w / 2).toBeCloseTo(510);
  });

  test('to the front: on top alone changes nothing; sharing the top moves it up', () => {
    const items = L.normaliseItems([{ id: 'a', z: 1 }, { id: 'b', z: 2 }]);
    expect(L.toFront(items, 'b')).toBe(items);
    expect(L.toFront(items, 'a').find((i: any) => i.id === 'a').z).toBe(3);
    const tied = L.normaliseItems([{ id: 'a', z: 2 }, { id: 'b', z: 2 }]);
    expect(L.toFront(tied, 'a').find((i: any) => i.id === 'a').z).toBe(3);
  });

  test('a photo is shrunk to its long edge and never grown', () => {
    expect(L.fitWithin(3000, 2000, 1600)).toEqual({ w: 1600, h: 1067 });
    expect(L.fitWithin(800, 600, 1600)).toEqual({ w: 800, h: 600 });
    expect(L.photoBox(1600, 1067)).toEqual({ w: 300, h: 200 });
  });

  test('words count typed words only; a record holds tenths, not float noise', () => {
    expect(L.wordCount(L.normaliseItems([{ kind: 'text', text: ' I did  it ' }, { kind: 'bubble', text: '2nd!' }, { kind: 'sticker', text: '★ ★' }]))).toBe(4);
    const t = L.tidy(item({ x: 1.23456, rot: 119.99998872013782, style: { size: 36.04 } }));
    expect([t.x, t.rot, t.style.size]).toEqual([1.2, 120, 36]);
  });
});

describe('the fonts ship with the app', () => {
  test('every @font-face points at a file that is there, and each face has its licence beside it', () => {
    const css = fs.readFileSync(path.join(FONTS, 'styles.css'), 'utf8');
    const files = [...css.matchAll(/url\(\.\/([^)]+)\)/g)].map((m) => m[1]);
    expect(files.length).toBe(13);
    for (const f of files) expect(fs.existsSync(path.join(FONTS, f))).toBe(true);
    const families = new Set([...css.matchAll(/font-family: '([^']+)'/g)].map((m) => m[1]));
    expect([...families].sort()).toEqual(['Bungee', 'Caveat', 'Cherry Bomb One', 'Chewy', 'Pacifico', 'Rubik Doodle Shadow']);
    for (const fam of families) expect(fs.existsSync(path.join(FONTS, `LICENSE-${fam.toLowerCase().replace(/ /g, '-')}.txt`))).toBe(true);
    expect(css).not.toMatch(/https?:\/\//);
  });
});

describe('the spike writes the page once per change', () => {
  function saver() {
    const self: Record<string, unknown> = {};
    const run = (inputs: Record<string, unknown>) => {
      const fired: string[] = [];
      const outputs: Record<string, unknown> = new Proxy({} as Record<string, unknown>, {
        get: (t, k: string) => (k in t ? t[k] : () => fired.push(k)),
        set: (t, k: string, v) => ((t[k] = v), true)
      });
      new Function('Inputs', 'Outputs', SAVE_SCRIPT).call(self, inputs, outputs);
      return { fired, outputs };
    };
    return run;
  }

  test('no record: create once; a second change while creating waits; the create’s Done writes the newest as an update', () => {
    const run = saver();
    expect(run({ items: [{ id: 'a' }], day: '2026-09-26', background: '' }).fired).toEqual(['create']);
    expect(run({ items: [{ id: 'a' }, { id: 'b' }], day: '2026-09-26' }).fired).toEqual([]);
    const after = run({ items: [{ id: 'a' }, { id: 'b' }], id: 'r1', day: '2026-09-26' });
    expect(after.fired).toEqual(['update']);
    expect(after.outputs.id).toBe('r1');
  });

  test('the create’s Done with nothing new writes nothing; a new background is a change', () => {
    const run = saver();
    run({ items: [{ id: 'a' }], day: 'd' });
    expect(run({ items: [{ id: 'a' }], id: 'r1', day: 'd' }).fired).toEqual([]);
    expect(run({ items: [{ id: 'a' }], id: 'r1', day: 'd', background: 'pink' }).fired).toEqual(['update']);
  });
});
