/**
 * CG-001 — the gate over `library/modules/garden-kit`.
 *
 * The kit is plain JS the browser runs as-is, so this spec runs the BUILT file
 * (`project/noodl_modules/garden-kit/index.js`) — the artefact a project installs —
 * inside a `vm` context with the two globals the runtime provides (`Noodl`, `React`)
 * and nothing else. No `window`, no `document`: the server-render arm, which is also
 * the arm where every browser API has to be absent without a throw. `tpl007GameKit`
 * is the precedent.
 *
 * What it grades (the ACs of CG-001 §3 a lane can grade without a browser):
 *
 * - **AC1** the built file carries the source verbatim and registers exactly the two
 *   nodes by the names the graph will use.
 * - **AC2** the program round-trips: 20 seeded edit sequences through the kit's own
 *   pure helpers (add / move / remove / setCount / setSlot), the emitted JSON read back
 *   and emitted again byte-identical, and the rendered list in the program's own order
 *   and nesting.
 * - **AC4** Running Id glows exactly one block, including one inside a nested container
 *   on its third iteration.
 * - **AC5** band 1 and band 2 render the same element tree — only the root's band changes —
 *   and the stylesheet makes band 1's word a caption.
 * - **AC6 (the part without pixels)** the mockup's 8×6 map and a 12×8 map produce the right
 *   cells, and the robot sprite carries a face drawn at ≥ 20 px at the size floor.
 * - **AC8** two robots draw as two labelled sprites, and two on one tile are offset.
 * - **AC10** the README credits what it bundles and the licences; the built file fetches nothing.
 *
 * @module noodl-mcp/tests/cg001GardenKit.test
 */
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { reducedMotionReport } from './reducedMotion';

const KIT_DIR = path.join(__dirname, '..', '..', '..', 'library', 'modules', 'garden-kit');
const BUILT = path.join(KIT_DIR, 'project', 'noodl_modules', 'garden-kit', 'index.js');
const SOURCE = path.join(KIT_DIR, 'src', 'kit.js');
const README = path.join(KIT_DIR, 'project', 'noodl_modules', 'garden-kit', 'README.md');

interface KitModule {
  nodes: Array<Record<string, any>>;
  reactNodes: Array<Record<string, any>>;
}

interface Block {
  id: number | string;
  t: string;
  n?: number;
  body?: Block[];
  slots?: Record<string, string>;
}

interface PaletteEntry {
  id: string;
  kind: string;
  icon: string;
  hasBody: boolean;
  hasCount: boolean;
  slots: Array<{ key: string; options: Array<{ value: string }> }>;
}

interface ProgramHelpers {
  parse: (v: unknown) => Block[];
  emit: (list: Block[]) => string;
  find: (list: Block[], id: unknown) => Block | null;
  contains: (list: Block[], insideId: unknown, id: unknown) => boolean;
  walk: (list: Block[]) => Array<number | string>;
  count: (list: Block[]) => number;
  nextId: (list: Block[]) => number;
  newBlock: (entry: PaletteEntry, id: number) => Block;
  add: (list: Block[], block: Block, containerId: unknown) => Block[];
  move: (list: Block[], id: unknown, containerId: unknown, index: number) => Block[];
  remove: (list: Block[], id: unknown) => Block[];
  setCount: (list: Block[], id: unknown, n: unknown) => Block[];
  setSlot: (list: Block[], id: unknown, key: string, value: unknown) => Block[];
  parsePalette: (v: unknown) => PaletteEntry[];
  DEFAULT_PALETTE: PaletteEntry[];
  COUNT_MIN: number;
  COUNT_MAX: number;
  TEXT_SLOT_MAX: number;
}

/** Load the built kit into a bare context and return what it handed `Noodl.defineModule`. */
function loadKit(source: string = fs.readFileSync(BUILT, 'utf8')): { kit: KitModule; context: Record<string, any> } {
  let captured: KitModule | null = null;
  const context: Record<string, any> = {
    Noodl: {
      defineModule(m: KitModule) {
        captured = m;
      }
    },
    React,
    console,
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
    clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id)
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'garden-kit/index.js' });
  if (!captured) throw new Error('index.js never called Noodl.defineModule');
  return { kit: captured, context };
}

/** A small seeded generator, so a failing sequence can be re-run by its index. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The list's shape as the markup shows it: `blk:<id>` for every block in draw order, `open:<id>` where a container's
 * body starts and `close` where it ends. Only <div>s are stacked (a block is a <span>; its ✕ a <button>), and React
 * writes balanced HTML, so a body closes on the </div> that pops it.
 */
function markupShape(html: string): string[] {
  const out: string[] = [];
  const stack: boolean[] = [];
  const re = /<div\b([^>]*)>|<\/div>|<span\b([^>]*)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[0] === '</div>') {
      if (stack.pop()) out.push('close');
    } else if (m[0].startsWith('<div')) {
      const body = /data-body="([^"]+)"/.exec(m[1] || '');
      if (body) out.push(`open:${body[1]}`);
      stack.push(!!body);
    } else {
      const id = /class="gd-blk[^"]*"[^>]*data-id="([^"]+)"/.exec(m[0]);
      if (id) out.push(`blk:${id[1]}`);
    }
  }
  return out;
}

function programShape(list: Block[], out: string[] = []): string[] {
  for (const b of list) {
    out.push(`blk:${b.id}`);
    if (b.body) {
      out.push(`open:${b.id}`);
      programShape(b.body, out);
      out.push('close');
    }
  }
  return out;
}

describe('CG-001 — garden-kit, the built artefact', () => {
  let kit: KitModule;

  beforeAll(() => {
    ({ kit } = loadKit());
  });

  const node = (name: string) => kit.reactNodes.find((n) => n.name === name)!;
  const defaults = (name: string) =>
    Object.fromEntries(Object.entries(node(name).inputProps as Record<string, { default?: unknown }>).map(([k, p]) => [k, p.default]));
  const render = (name: string, props: Record<string, unknown>) =>
    renderToStaticMarkup(React.createElement(node(name).getReactComponent(), { ...defaults(name), ...props }));
  const helpers = () => node('garden-kit.BlockList').program as ProgramHelpers;

  describe('AC1 — the two nodes register, from the source a person edits', () => {
    it('the built file ends with src/kit.js verbatim under its banner', () => {
      const built = fs.readFileSync(BUILT, 'utf8');
      const source = fs.readFileSync(SOURCE, 'utf8');
      expect(built.endsWith(source)).toBe(true);
      expect(built.startsWith('/* garden-kit')).toBe(true);
    });

    it('registers exactly garden-kit.BlockList and garden-kit.Garden, each documented, in a context with no window and no document', () => {
      const names = [...kit.nodes, ...kit.reactNodes].map((n) => n.name).sort();
      expect(names).toEqual(['garden-kit.BlockList', 'garden-kit.Garden']);
      for (const n of kit.reactNodes) {
        expect(typeof n.docs).toBe('string');
        expect(n.docs.length).toBeGreaterThan(40);
        expect(n.ssr).toEqual({ compat: 'safe' });
      }
      expect(kit.nodes).toEqual([]);
    });

    it('both nodes render on the server from their defaults, and the markers a drive reads are on them', () => {
      const blocks = render('garden-kit.BlockList', {});
      const world = render('garden-kit.Garden', {});
      expect(blocks).toContain('data-gd-blocks="true"');
      expect(blocks).toContain('data-pal="repeat"');
      expect(world).toContain('data-gd-world="true"');
      expect(world).toContain('data-face="true"');
      // The stylesheet travels with each node, once per node.
      expect(blocks.match(/<style>/g)).toHaveLength(1);
      expect(world.match(/<style>/g)).toHaveLength(1);
    });
  });

  describe('AC2 — the program round-trips byte-identical through 20 edit sequences', () => {
    const SEQUENCES = 20;

    /** One edit sequence: 8–14 edits over the default palette, through the kit's own helpers. */
    function runSequence(seed: number): { program: Block[]; edits: string[] } {
      const P = helpers();
      const rnd = mulberry32(seed);
      const pick = <T,>(list: T[]): T => list[Math.floor(rnd() * list.length)];
      const palette = P.DEFAULT_PALETTE;
      let program: Block[] = [];
      const edits: string[] = [];
      const containers = () => P.walk(program).filter((id) => P.find(program, id)!.body);
      const n = 8 + Math.floor(rnd() * 7);
      for (let i = 0; i < n; i++) {
        const ids = P.walk(program);
        const op = ids.length < 3 ? 'add' : pick(['add', 'add', 'move', 'remove', 'count', 'slot']);
        if (op === 'add') {
          const entry = pick(palette);
          const into = rnd() < 0.5 ? pick([null, ...containers()]) : null;
          program = P.add(program, P.newBlock(entry, P.nextId(program)), into);
          edits.push(`add ${entry.id} into ${into}`);
        } else if (op === 'move') {
          const id = pick(ids);
          const into = pick([null, null, ...containers()]);
          const index = Math.floor(rnd() * 4);
          program = P.move(program, id, into, index);
          edits.push(`move ${id} into ${into} at ${index}`);
        } else if (op === 'remove') {
          const id = pick(ids);
          program = P.remove(program, id);
          edits.push(`remove ${id}`);
        } else if (op === 'count') {
          const reps = ids.filter((id) => P.find(program, id)!.t === 'repeat');
          if (!reps.length) continue;
          const id = pick(reps);
          const value = Math.floor(rnd() * 12) - 1;
          program = P.setCount(program, id, value);
          edits.push(`count ${id} = ${value}`);
        } else {
          const says = ids.filter((id) => P.find(program, id)!.t === 'say');
          if (!says.length) continue;
          const id = pick(says);
          const value = pick(['mamie-rose', 'sami', 'biscuit']);
          program = P.setSlot(program, id, 'to', value);
          edits.push(`slot ${id} to = ${value}`);
        }
      }
      return { program, edits };
    }

    it('🔴 emit(parse(emit(P))) is emit(P) for every sequence, and the list draws P in its own order and nesting', () => {
      const P = helpers();
      const failures: string[] = [];
      let blocksSeen = 0;
      let nested = 0;
      for (let seed = 1; seed <= SEQUENCES; seed++) {
        const { program, edits } = runSequence(seed);
        const text = P.emit(program);
        const back = P.emit(P.parse(text));
        const again = P.emit(P.parse(JSON.parse(text)));
        if (back !== text || again !== text) failures.push(`seq ${seed}: not byte-identical\n  ${edits.join('\n  ')}`);
        const html = render('garden-kit.BlockList', { program: text });
        const shape = markupShape(html);
        const want = programShape(program);
        if (JSON.stringify(shape) !== JSON.stringify(want)) failures.push(`seq ${seed}: drawn ${shape.join(' ')} wanted ${want.join(' ')}\n  ${edits.join('\n  ')}`);
        for (const id of P.walk(program)) {
          const b = P.find(program, id)!;
          if (b.t === 'repeat' && !html.includes(`data-count="${b.n}"`)) failures.push(`seq ${seed}: repeat ${id} count ${b.n} not drawn`);
          if (b.slots && b.slots.to && !html.includes(`data-slot="to" data-value="${b.slots.to}"`)) failures.push(`seq ${seed}: slot of ${id} not drawn`);
          if (b.body) nested++;
        }
        blocksSeen += P.count(program);
      }
      expect(failures).toEqual([]);
      // The sequences exercised the thing under test: blocks were made, and containers were nested.
      expect(blocksSeen).toBeGreaterThan(60);
      expect(nested).toBeGreaterThan(10);
    });

    it('the canonical shape: key order, whole counts, sorted slots, no empty slots — whatever the engine wrote', () => {
      const P = helpers();
      const messy = [{ slots: { b: 1, a: 'x' }, body: [{ t: 'fwd', id: 2, extra: true }], n: 2.6, t: 'repeat', id: 1 }, { id: 3, t: 'say', slots: {} }];
      const text = P.emit(messy as unknown as Block[]);
      expect(text).toBe('[{"id":1,"t":"repeat","n":3,"body":[{"id":2,"t":"fwd"}],"slots":{"a":"x","b":"1"}},{"id":3,"t":"say"}]');
      expect(P.emit(P.parse(text))).toBe(text);
      expect(P.parse('{not json')).toEqual([]);
      expect(P.parse({ not: 'a list' })).toEqual([]);
    });

    it('🔴 a container never moves into itself or its own body; the count clamps 1..9; an unknown id changes nothing', () => {
      const P = helpers();
      const program = P.parse('[{"id":1,"t":"repeat","n":3,"body":[{"id":2,"t":"until","body":[{"id":3,"t":"fwd"}]}]},{"id":4,"t":"water"}]');
      const text = P.emit(program);
      expect(P.emit(P.move(program, 1, 1, 0))).toBe(text);
      expect(P.emit(P.move(program, 1, 2, 0))).toBe(text);
      // 🔴 At a non-zero index too: without the guard the block would come back at the top, at the END, and read as a move.
      expect(P.emit(P.move(program, 1, 1, 1))).toBe(text);
      expect(P.emit(P.move(program, 1, 2, 1))).toBe(text);
      expect(P.emit(P.move(program, 4, 2, 0))).toBe('[{"id":1,"t":"repeat","n":3,"body":[{"id":2,"t":"until","body":[{"id":4,"t":"water"},{"id":3,"t":"fwd"}]}]}]');
      expect(P.emit(P.move(program, 4, null, 0))).toBe('[{"id":4,"t":"water"},{"id":1,"t":"repeat","n":3,"body":[{"id":2,"t":"until","body":[{"id":3,"t":"fwd"}]}]}]');
      expect(P.emit(P.move(program, 3, null, 99))).toBe('[{"id":1,"t":"repeat","n":3,"body":[{"id":2,"t":"until","body":[]}]},{"id":4,"t":"water"},{"id":3,"t":"fwd"}]');
      expect([P.find(P.setCount(program, 1, 0), 1)!.n, P.find(P.setCount(program, 1, 42), 1)!.n, P.find(P.setCount(program, 1, 'x'), 1)!.n, P.find(P.setCount(program, 1, 4.4), 1)!.n]).toEqual([1, 9, 1, 4]);
      expect([P.COUNT_MIN, P.COUNT_MAX, P.TEXT_SLOT_MAX]).toEqual([1, 9, 40]);
      expect(P.emit(P.remove(program, 'nope'))).toBe(text);
      expect(P.emit(P.setCount(program, 'nope', 5))).toBe(text);
      expect(P.nextId(program)).toBe(5);
      expect(P.find(P.setSlot(program, 4, 'to', 'x'.repeat(60)), 4)!.slots!.to).toHaveLength(40);
      // The input is never mutated.
      expect(P.emit(program)).toBe(text);
    });
  });

  describe('AC4 — Running Id glows exactly the right block, nested, on its third iteration', () => {
    const PROGRAM = '[{"id":1,"t":"fwd"},{"id":2,"t":"repeat","n":3,"body":[{"id":3,"t":"left"},{"id":4,"t":"water"}]}]';
    /** The ids an engine sends while it runs the program: the repeat, then its body three times. */
    const RUN = [1, 2, 3, 4, 3, 4, 3, 4];

    it('🔴 the seventh step is water on its third pass: one glow, on id 4', () => {
      const glows: Array<[number, number, string | null]> = RUN.map((id, step) => {
        const html = render('garden-kit.BlockList', { program: PROGRAM, runningId: String(id) });
        const lit = html.match(/data-id="([^"]+)"[^>]*data-run="true"/g) ?? [];
        const on = lit.length ? (/data-id="([^"]+)"/.exec(lit[0]) || [])[1] : null;
        return [step, lit.length, on];
      });
      expect(glows[7]).toEqual([7, 1, '4']);
      expect(glows.map((g) => g[1])).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
      expect(glows.map((g) => g[2])).toEqual(RUN.map(String));
    });

    it('no Running Id, or an id the program does not have, glows nothing', () => {
      expect(render('garden-kit.BlockList', { program: PROGRAM, runningId: '' })).not.toContain('data-run');
      expect(render('garden-kit.BlockList', { program: PROGRAM, runningId: '99' })).not.toContain('data-run');
      expect(render('garden-kit.BlockList', { program: PROGRAM })).not.toContain('data-run');
    });
  });

  describe('AC5 — band 1 and band 2 are the same elements, restyled', () => {
    const PROGRAM = '[{"id":1,"t":"fwd"},{"id":2,"t":"repeat","n":2,"body":[{"id":3,"t":"say","slots":{"to":"sami"}}]}]';
    const unband = (html: string) => html.replace(/gd-band[12]/g, 'gd-bandX').replace(/data-band="[12]"/g, 'data-band="X"');

    it('🔴 the markup differs only in the root band; the switch needs no remount', () => {
      const one = render('garden-kit.BlockList', { program: PROGRAM, band: 1 });
      const two = render('garden-kit.BlockList', { program: PROGRAM, band: 2 });
      expect(one).not.toBe(two);
      expect(one).toContain('class="gd-blocks gd-band1"');
      expect(two).toContain('class="gd-blocks gd-band2"');
      expect(unband(one)).toBe(unband(two));
      // The word is still in the tree in band 1 — as a caption, not as nothing.
      expect(one).toContain('<span class="gd-n">forward</span>');
    });

    it('the stylesheet makes band 1 a caption (≤ 12px) and band 2 a word (≥ 14px), and the French word is drawn when asked', () => {
      const css = node('garden-kit.BlockList').css as string;
      const one = /\.gd-band1 \.gd-blk \.gd-n\{font-size:(\d+)px/.exec(css);
      const two = /\.gd-band2 \.gd-blk \.gd-n\{font-size:(\d+)px/.exec(css);
      expect(Number(one && one[1])).toBeLessThanOrEqual(12);
      expect(Number(two && two[1])).toBeGreaterThanOrEqual(14);
      const fr = render('garden-kit.BlockList', { program: PROGRAM, language: 'fr' });
      expect(fr).toContain('<span class="gd-n">avancer</span>');
      expect(fr).toContain('>fois</span>');
      expect(fr).toContain('data-value="sami"');
    });
  });

  describe('AC6 — the map draws its cells, and the face is big enough to be a face', () => {
    const MOCKUP = { rows: ['GGTGGGTH', 'GGGGGGGG', 'GGFGFGFG', 'PPPPPPPP', 'GWWGGRGG', 'GGGGGTGG'] };
    const world = () => node('garden-kit.Garden').world as { parseMap: (v: unknown) => { w: number; h: number; cells: Array<{ kind: string }> } };
    const kinds = (cells: Array<{ kind: string }>) =>
      cells.reduce<Record<string, number>>((acc, c) => ((acc[c.kind] = (acc[c.kind] || 0) + 1), acc), {});

    it('🔴 the mockup’s 8×6 map is 48 cells of the right kinds, and a 12×8 map is 96', () => {
      const { parseMap } = world();
      const m = parseMap(MOCKUP);
      expect([m.w, m.h, m.cells.length]).toEqual([8, 6, 48]);
      expect(kinds(m.cells)).toEqual({ grass: 30, tree: 3, house: 1, bed: 3, path: 8, water: 2, rock: 1 });
      const big = parseMap({ rows: Array.from({ length: 8 }, (_, y) => (y === 3 ? 'PPPPPPPPPPPP' : 'GGFGGTGGRGGH')) });
      expect([big.w, big.h, big.cells.length]).toEqual([12, 8, 96]);
      // Junk is an empty world, a ragged row is padded with grass, the rows may come as text, and a legend of its own is honoured.
      expect(parseMap(null).cells).toEqual([]);
      expect(parseMap({ not: 'rows' }).cells).toEqual([]);
      // Text that is not JSON is rows: junk draws as one row of grass rather than nothing.
      expect(kinds(parseMap('{bad').cells)).toEqual({ grass: 4 });
      expect(parseMap(['GG', 'GGGG']).cells.length).toBe(8);
      expect(parseMap('GG\nGG').cells.length).toBe(4);
      expect(kinds(parseMap({ rows: ['ab'], legend: { a: 'water', b: 'not-a-kind' } }).cells)).toEqual({ water: 1, grass: 1 });
    });

    it('the rendered world has one cell per tile, in reading order, with the tulips dry until a Thing waters one', () => {
      const html = render('garden-kit.Garden', { map: MOCKUP });
      expect(html.match(/class="gd-cell /g)).toHaveLength(48);
      expect(html).toContain('data-w="8"');
      expect(html).toContain('data-h="6"');
      expect(html).toContain('grid-template-columns:repeat(8, minmax(0, 1fr))');
      expect(html.match(/gd-tulip gd-dry/g)).toHaveLength(3);
      expect(html).not.toContain('gd-wet');
      const watered = render('garden-kit.Garden', { map: MOCKUP, things: [{ kind: 'tulip', x: 2, y: 2, watered: true }, { kind: 'puddle', x: 1, y: 1 }] });
      expect(watered.match(/gd-tulip gd-dry/g)).toHaveLength(2);
      expect(watered.match(/gd-tulip gd-wet/g)).toHaveLength(1);
      expect(watered).toContain('data-puddle="true"');
      // The first cell is 0,0 and the last is 7,5.
      expect(html.indexOf('data-x="0" data-y="0"')).toBeLessThan(html.indexOf('data-x="7" data-y="5"'));
      const big = render('garden-kit.Garden', { map: { rows: Array.from({ length: 8 }, () => 'GGGGGGGGGGGG') } });
      expect(big.match(/class="gd-cell /g)).toHaveLength(96);
    });

    it('🔴 the robot is floored at a size whose face is ≥ 20 px WHICHEVER WAY IT FACES — read off the rendered visor, not a constant', () => {
      const sprite = node('garden-kit.Garden').sprite as { minPx: number; svgPct: number; faceFraction: number };
      const html = render('garden-kit.Garden', { map: MOCKUP, robots: [{ x: 0, y: 3, d: 1, colour: '#FF7A59', eyes: 'happy', hat: 'sun', name: 'Pip' }] });
      // The visor as rendered: the drive reads the same rect through getBoundingClientRect, rotated with the robot.
      const visor = /<rect[^>]*data-face="true"[^>]*width="(\d+)"[^>]*height="(\d+)"/.exec(html);
      expect(visor).not.toBeNull();
      const [w, hgt] = [Number(visor![1]), Number(visor![2])];
      const svgTag = html.slice(html.lastIndexOf('<svg', html.indexOf('data-robot-svg')), html.indexOf('>', html.indexOf('data-robot-svg')));
      const box = /viewBox="0 0 (\d+) (\d+)"/.exec(svgTag)!;
      const units = Number(box[1]);
      const css = node('garden-kit.Garden').css as string;
      expect(css).toContain(`.gd-turn>svg{width:${sprite.svgPct}%;height:${sprite.svgPct}%`);
      // 🔴 Session 1’s drive: Pip faces right, so the visor’s HEIGHT is its width on screen. The smaller side is what counts.
      const onScreenAtFloor = (Math.min(w, hgt) / units) * (sprite.svgPct / 100) * sprite.minPx;
      expect(onScreenAtFloor).toBeGreaterThanOrEqual(20);
      expect(Math.round(onScreenAtFloor * 10) / 10).toBe(Math.round(sprite.minPx * sprite.faceFraction * 10) / 10);
      expect(Math.round(onScreenAtFloor)).toBe(23);
      // The FIRST visor, for contrast: 28 × 16 at 86% on a 56px box was 12px when rotated (measured 12.0 in the drive).
      expect((16 / 64) * 0.86 * 56).toBeLessThan(13);
      expect(html).toContain(`max(12.5000%, ${sprite.minPx}px)`);
      expect(html).toContain('rotate(90deg)');
      expect(html).toContain('<span class="gd-name">Pip</span>');
      // The world at a phone’s width: 12 columns of ~30px each would give a 12px face; the floor makes it 23.
      expect(Math.round((358 / 12) * sprite.faceFraction)).toBeLessThan(20);
    });

    it('🔴 the look: the grid survives the bridge’s inline display:block, and each tile kind draws its own art', () => {
      // The bridge seeds props.style from defaultCss; session 1’s drive saw display:block win over the class and 48 zero-size cells.
      const bridged = render('garden-kit.Garden', { map: MOCKUP, style: { display: 'block', width: '100%' } });
      expect(bridged).toMatch(/class="gd-world"[^>]*style="[^"]*display:grid/);
      expect(bridged).toContain('width:100%');
      expect(render('garden-kit.Garden', { map: MOCKUP, style: { display: 'none' } })).toMatch(/style="[^"]*display:none/);
      expect(node('garden-kit.Garden').defaultCss).toEqual({ display: 'grid' });
      // Per kind: a tree, a rock and a house cell carry their sprite; grass, path and water carry none; a bed carries a tulip.
      const cell = (x: number, y: number) => {
        const at = bridged.indexOf(`data-x="${x}" data-y="${y}"`);
        const open = bridged.lastIndexOf('<button', at);
        return bridged.slice(open, bridged.indexOf('</button>', at));
      };
      expect(cell(2, 0)).toMatch(/class="gd-cell gd-tree"[\s\S]*data-sprite="tree"/);
      expect(cell(5, 4)).toMatch(/class="gd-cell gd-rock"[\s\S]*data-sprite="rock"/);
      expect(cell(7, 0)).toMatch(/class="gd-cell gd-house"[\s\S]*data-sprite="house"/);
      expect(cell(2, 2)).toMatch(/class="gd-cell gd-bed"[\s\S]*data-sprite="tulip"/);
      expect(cell(0, 0)).toContain('class="gd-cell gd-grass"');
      expect(cell(0, 0)).not.toContain('data-sprite');
      expect(cell(0, 3)).toContain('class="gd-cell gd-path"');
      expect(cell(1, 4)).toContain('class="gd-cell gd-water"');
      // And the stylesheet paints them apart: path and water and bed each have a background of their own, distinct from grass.
      const bg = (kind: string) => (new RegExp(`\\.gd-${kind}\\{background:([^;}]+)`).exec(node('garden-kit.Garden').css as string) || [])[1];
      expect(new Set([bg('grass'), bg('path'), bg('water'), bg('bed')].map(String)).size).toBe(4);
      expect(bg('path')).toBeTruthy();
    });
  });

  describe('AC8 — two robots, each labelled, never on top of each other', () => {
    const MOCKUP = { rows: ['GGTGGGTH', 'GGGGGGGG', 'GGFGFGFG', 'PPPPPPPP', 'GWWGGRGG', 'GGGGGTGG'] };

    it('on two tiles: two sprites at two places, two names', () => {
      const html = render('garden-kit.Garden', { map: MOCKUP, robots: [{ x: 0, y: 3, d: 1, name: 'Pip' }, { x: 5, y: 1, d: 2, name: 'Bo', colour: '#8F6BFF' }] });
      expect(html.match(/class="gd-bot"/g)).toHaveLength(2);
      expect(html).toContain('<span class="gd-name">Pip</span>');
      expect(html).toContain('<span class="gd-name">Bo</span>');
      expect(html).not.toContain('data-share');
      expect(html).toContain('left:6.2500%;top:58.3333%');
      expect(html).toContain('left:68.7500%;top:25.0000%');
    });

    it('🔴 on ONE tile: both are marked as sharing, drawn smaller, and offset in different directions', () => {
      const html = render('garden-kit.Garden', { map: MOCKUP, robots: [{ x: 2, y: 2, name: 'Pip' }, { x: 2, y: 2, name: 'Bo' }] });
      expect(html).toContain('data-share="0"');
      expect(html).toContain('data-share="1"');
      const transforms = [...html.matchAll(/class="gd-bot"[^>]*transform:([^;"]+)/g)].map((m) => m[1]);
      expect(transforms).toHaveLength(2);
      expect(transforms[0]).not.toBe(transforms[1]);
      expect(transforms.every((t) => /scale\(\.78\)/.test(t))).toBe(true);
    });
  });

  describe('the motion is stilled for a child who asked for reduced motion, and the ports are documented', () => {
    it('every animation the world starts is stilled', () => {
      expect(reducedMotionReport(node('garden-kit.Garden').css as string)).toEqual({ animated: ['gd-bump', 'gd-puddle', 'gd-turn'], unstilled: [] });
      expect(reducedMotionReport(node('garden-kit.BlockList').css as string)).toEqual({ animated: [], unstilled: [] });
    });

    it('the ports CG-001 §2 names exist with the types the engine will wire', () => {
      const blocks = node('garden-kit.BlockList');
      const world = node('garden-kit.Garden');
      const types = (def: Record<string, any>, side: 'inputProps' | 'outputProps') =>
        Object.fromEntries(Object.entries(def[side] as Record<string, { type: unknown }>).map(([k, p]) => [k, typeof p.type === 'string' ? p.type : 'enum']));
      expect(types(blocks, 'inputProps')).toMatchObject({ palette: 'object', program: 'object', band: 'number', language: 'enum', runningId: 'string', locked: 'boolean' });
      expect(types(blocks, 'outputProps')).toEqual({ onProgram: 'string', onChanged: 'signal', onSelected: 'string' });
      expect(types(world, 'inputProps')).toMatchObject({ map: 'object', things: 'object', robots: 'object', bubble: 'object', stepMs: 'number', celebrate: 'signal' });
      expect(types(world, 'outputProps')).toEqual({ onTileX: 'number', onTileY: 'number', onTileTapped: 'signal', onReady: 'signal' });
      for (const def of [blocks, world]) {
        for (const [k, p] of Object.entries(def.inputProps as Record<string, { displayName?: string }>)) expect({ node: def.name, port: k, named: !!p.displayName }).toEqual({ node: def.name, port: k, named: true });
      }
    });
  });

  describe('AC10 — what the kit bundles is written down, and nothing is fetched', () => {
    it('the README credits the source of the sprites, the licence, the borrowed icon, and says nothing is fetched', () => {
      const readme = fs.readFileSync(README, 'utf8');
      for (const words of ['bot-garden.html', 'GPL-3.0', 'icon.png', "game-kit's icon", 'Nothing external', 'fetched at runtime', 'DiceBear']) expect(readme).toContain(words);
    });

    it('🔴 the built file carries no fetch, no URL, no image element and no url() — beside its known-firing inline SVG', () => {
      const built = fs.readFileSync(BUILT, 'utf8');
      expect(built).toContain("'svg'");
      expect(built).toContain('viewBox');
      for (const forbidden of ['fetch(', 'http://', 'https://', '<img', 'url(', 'XMLHttpRequest', '@import', "'img'"]) {
        expect({ forbidden, found: built.includes(forbidden) }).toEqual({ forbidden, found: false });
      }
    });
  });
});
