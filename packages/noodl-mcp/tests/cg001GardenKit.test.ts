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
// P106 s3 (lane F, item b): the dry tulip's colour as it reaches the screen.
import { deltaE, dryLook, hexToRgb, hue, hueGap } from './dryTulipLook';

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
  setSlot: (list: Block[], id: unknown, key: string, value: unknown, max?: number) => Block[];
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

    it('registers exactly garden-kit.BlockList and garden-kit.Garden (and, P108 IW-004, garden-kit.Blocks), each documented, in a context with no window and no document', () => {
      const names = [...kit.nodes, ...kit.reactNodes].map((n) => n.name).sort();
      expect(names).toEqual(['garden-kit.BlockList', 'garden-kit.Blocks', 'garden-kit.Garden']);
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
      // Typed text is cut to the field's limit (never past 40); a value picked from the options is kept whole (P105 s3:
      // a 45-character flower list cut to 40 was no longer on the list, so Olive could never be asked with it).
      expect(P.find(P.setSlot(program, 4, 'to', 'x'.repeat(60), 40), 4)!.slots!.to).toHaveLength(40);
      expect(P.find(P.setSlot(program, 4, 'to', 'x'.repeat(60), 99), 4)!.slots!.to).toHaveLength(40);
      expect(P.find(P.setSlot(program, 4, 'to', 'x'.repeat(60), 2), 4)!.slots!.to).toHaveLength(2);
      const option = 'Biscuit meows: "I\'m so hungry, my bowl is empty, bring me some kibble!"';
      expect(P.find(P.setSlot(program, 4, 'to', option), 4)!.slots!.to).toBe(option);
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
      // P106 (IG-006's red and yellow rows): a tulip with colour yellow draws the yellow sprite; red or none, the pink one.
      const rows = render('garden-kit.Garden', { map: MOCKUP, things: [{ kind: 'tulip', x: 2, y: 2, colour: 'yellow' }, { kind: 'tulip', x: 4, y: 2, colour: 'red', watered: true }] });
      expect(rows.match(/gd-tulip gd-dry gd-yellow"[^>]*data-sprite="tulipYellow"/g)).toHaveLength(1);
      expect(rows.match(/gd-tulip gd-wet"[^>]*data-sprite="tulip"/g)).toHaveLength(1);
      expect(rows.match(/data-sprite="tulip"/g)).toHaveLength(2); // the red one and the mockup bed's own at 6,2
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
      // P106 IG-003: the ? on a placed block publishes Help Block (the block's kind), then Help.
      expect(types(blocks, 'outputProps')).toEqual({ onProgram: 'string', onChanged: 'signal', onSelected: 'string', onHelpBlock: 'string', onHelp: 'signal' });
      expect(types(world, 'inputProps')).toMatchObject({ map: 'object', things: 'object', robots: 'object', bubble: 'object', stepMs: 'number', celebrate: 'signal' });
      expect(types(world, 'outputProps')).toEqual({ onTileX: 'number', onTileY: 'number', onTileTapped: 'signal', onReady: 'signal' });
      for (const def of [blocks, world]) {
        for (const [k, p] of Object.entries(def.inputProps as Record<string, { displayName?: string }>)) expect({ node: def.name, port: k, named: !!p.displayName }).toEqual({ node: def.name, port: k, named: true });
      }
    });
  });

  describe('IG-001 (P106 s1) — D5 the running ring; D9 the stone, the post box and the flag as sprites', () => {
    it('🔴 D5: the running block wears a 3 px ring in the Running Ring colour (ink by default), a 4 px white halo and scale(1.04); the drop-line has a colour of its own', () => {
      const css = node('garden-kit.BlockList').css as string;
      const ring = (css.match(/\.gd-blk\.gd-run\{[^}]*\}/) ?? [''])[0];
      expect(ring).toContain('outline:3px solid var(--gd-run)');
      expect(ring).toContain('box-shadow:0 0 0 4px #fff');
      expect(ring).toContain('scale(1.04)');
      const drop = (css.match(/\.gd-dropline\{[^}]*\}/) ?? [''])[0];
      expect(drop).toContain('var(--gd-drop)');
      expect(drop).not.toContain('--gd-run');
      const props = node('garden-kit.BlockList').inputProps as Record<string, { default?: unknown }>;
      expect([props.runColor.default, props.dropColor.default]).toEqual(['#2E2A3D', '#FFD166']);
      const html = render('garden-kit.BlockList', { program: '[{"id":1,"t":"fwd"}]', runningId: '1', runColor: '#123456', dropColor: '#ABCDEF' });
      expect(html).toContain('--gd-run:#123456');
      expect(html).toContain('--gd-drop:#ABCDEF');
      expect(html).toMatch(/data-id="1"[^>]*data-run="true"/);
    });

    it('🔴 D9: stone, post box, flag (and egg, food) are inline sprites; a B tile is a post box drawn on path; nothing is a label pill', () => {
      const sprites = (node('garden-kit.Garden').sprite as { sprites: Record<string, unknown> }).sprites;
      for (const k of ['stone', 'postbox', 'flag', 'egg', 'food']) expect({ k, has: !!sprites[k] }).toEqual({ k, has: true });
      const html = render('garden-kit.Garden', { map: { rows: ['PPB'], legend: { B: 'postbox' } }, things: [{ kind: 'stone', x: 0, y: 0 }, { kind: 'food', x: 0, y: 0 }, { kind: 'flag', x: 1, y: 0 }, { kind: 'egg', x: 1, y: 0 }] });
      const cell = (x: number, y: number) => {
        const at = html.indexOf(`data-x="${x}" data-y="${y}"`);
        return html.slice(html.lastIndexOf('<button', at), html.indexOf('</button>', at));
      };
      expect(cell(2, 0)).toMatch(/class="gd-cell gd-postbox"[\s\S]*data-sprite="postbox"/);
      expect(cell(0, 0)).toContain('class="gd-sprite gd-thing gd-stone" data-sprite="stone"');
      expect(cell(0, 0)).toContain('data-sprite="food"');
      expect(cell(1, 0)).toContain('class="gd-sprite gd-thing gd-flag" data-sprite="flag"');
      expect(cell(1, 0)).toContain('data-sprite="egg"');
      // No pill drawn (the sheet still carries the rule; an ELEMENT is what a child would see).
      expect(html).not.toContain('class="gd-label"');
      // The kit's own legend knows B; the post box's ground is the path's.
      const world = node('garden-kit.Garden').world as { DEFAULT_LEGEND: Record<string, string>; KINDS: string[] };
      expect([world.DEFAULT_LEGEND.B, world.KINDS.includes('postbox')]).toEqual(['postbox', true]);
      const css = node('garden-kit.Garden').css as string;
      const bg = (kind: string) => (new RegExp(`\\.gd-${kind}\\{background:([^;}]+)`).exec(css) || [])[1];
      expect(bg('postbox')).toBe(bg('path'));
      // A label still draws (the port's contract), so an older page is not broken; the pages just send none any more.
      expect(render('garden-kit.Garden', { map: ['G'], things: [{ kind: 'label', x: 0, y: 0, text: 'hi' }] })).toContain('class="gd-label"');
    });
  });

  describe('IG-002 (P106 s2) — the rock by what is left, the sign, the note, the can’s level and the load on the back', () => {
    const cellOf = (html: string, x: number, y: number) => {
      const at = html.indexOf(`data-x="${x}" data-y="${y}"`);
      return html.slice(html.lastIndexOf('<button', at), html.indexOf('</button>', at));
    };
    const robotOf = (html: string) => {
      const at = html.indexOf('data-robot="0"');
      return html.slice(html.lastIndexOf('<div', at), html.indexOf('class="gd-name"', at) === -1 ? html.length : html.indexOf('class="gd-name"', at));
    };

    it('🔴 parseRobots carries can, canMax and carry exactly as the s2 brief §4 writes them (the 3D kit copies the same lines)', () => {
      const parse = (node('garden-kit.Garden').world as { parseRobots: (v: unknown) => Array<Record<string, unknown>> }).parseRobots;
      const pick = (r: Record<string, unknown>) => ({ can: r.can, canMax: r.canMax, carry: r.carry });
      expect(pick(parse({ x: 1, y: 1, can: 2, canMax: 3, carry: ['stone'] })[0])).toEqual({ can: 2, canMax: 3, carry: ['stone'] });
      expect(pick(parse({})[0])).toEqual({ can: null, canMax: 3, carry: [] });
      expect(parse([{ can: null }, { can: '' }, { can: '1' }, { can: -2 }, { can: 2.7 }, { can: 'x' }]).map((r) => r.can)).toEqual([null, null, 1, 0, 2, null]);
      expect(parse([{ canMax: 0 }, { canMax: 5 }, { canMax: '4' }, { canMax: -1 }]).map((r) => r.canMax)).toEqual([3, 5, 4, 3]);
      expect(parse([{ carry: 'stone' }, { carry: ['letter', 7] }]).map((r) => r.carry)).toEqual([[], ['letter', '7']]);
      const src = fs.readFileSync(path.join(KIT_DIR, 'src', 'kit.js'), 'utf8');
      for (const line of [
        "          can: isFinite(Number(r.can)) && r.can !== null && r.can !== '' ? Math.max(0, Math.floor(Number(r.can))) : null,",
        '          canMax: isFinite(Number(r.canMax)) && Number(r.canMax) > 0 ? Math.floor(Number(r.canMax)) : 3,',
        '          carry: Array.isArray(r.carry) ? r.carry.map(String) : [],'
      ])
        expect({ line: line.trim().slice(0, 12), present: src.includes(line + '\n') }).toEqual({ line: line.trim().slice(0, 12), present: true });
    });

    it('🔴 a rock is an inline sprite at three sizes by what is left — ≥ 3 big, 2 medium, 1 small, 0 nothing; a sign and a note are sprites and their text is not drawn', () => {
      const sprites = (node('garden-kit.Garden').sprite as { sprites: Record<string, unknown> }).sprites;
      for (const k of ['rockBig', 'rockMid', 'rockSmall', 'sign', 'note', 'parcel']) expect({ k, has: !!sprites[k] }).toEqual({ k, has: true });
      const things = [4, 3, 2, 1, 0].map((left, x) => ({ kind: 'rock', x, y: 0, left }));
      const html = render('garden-kit.Garden', { map: { rows: ['GGGGGGG'] }, things: [...things, { kind: 'sign', x: 5, y: 0, text: 'Tulips this way' }, { kind: 'note', x: 6, y: 0, text: 'The red ones' }] });
      expect(cellOf(html, 0, 0)).toContain('class="gd-sprite gd-thing gd-boulder gd-boulder-big" data-sprite="rockBig"');
      expect(cellOf(html, 1, 0)).toContain('gd-boulder-big');
      expect(cellOf(html, 2, 0)).toContain('class="gd-sprite gd-thing gd-boulder gd-boulder-mid" data-sprite="rockMid"');
      expect(cellOf(html, 3, 0)).toContain('class="gd-sprite gd-thing gd-boulder gd-boulder-small" data-sprite="rockSmall"');
      expect(cellOf(html, 4, 0)).not.toContain('gd-boulder');
      expect(cellOf(html, 0, 0)).toContain('data-left="4"');
      expect(cellOf(html, 5, 0)).toContain('class="gd-sprite gd-thing gd-sign" data-sprite="sign"');
      expect(cellOf(html, 6, 0)).toContain('class="gd-sprite gd-thing gd-note" data-sprite="note"');
      for (const text of ['Tulips this way', 'The red ones']) expect(html).not.toContain(text);
      expect(html).not.toContain('class="gd-label"');
      // A rock that names no count is a whole one; the map's R tile is still the decorative rock sprite.
      expect(cellOf(render('garden-kit.Garden', { map: { rows: ['GR'] }, things: [{ kind: 'rock', x: 0, y: 0 }] }), 0, 0)).toContain('gd-boulder-big');
      expect(cellOf(render('garden-kit.Garden', { map: { rows: ['GR'] }, things: [] }), 1, 0)).toContain('data-sprite="rock"');
    });

    it('🔴 the can’s level on the robot: canMax drops, can of them full; 3, 2, 1, 0 as it pours; none when the robot has no can', () => {
      const gauge = (robot: Record<string, unknown>) => {
        const html = robotOf(render('garden-kit.Garden', { map: { rows: ['GGG'] }, things: [], robots: [{ x: 1, y: 0, d: 1, name: 'Pip', ...robot }] }));
        return { can: (/class="gd-can" data-can="(\d+)" data-can-max="(\d+)"/.exec(html) || []).slice(1).join('/'), full: (html.match(/gd-drop gd-drop-full/g) || []).length, empty: (html.match(/gd-drop gd-drop-empty/g) || []).length };
      };
      expect([3, 2, 1, 0].map((can) => gauge({ can }))).toEqual([
        { can: '3/3', full: 3, empty: 0 },
        { can: '2/3', full: 2, empty: 1 },
        { can: '1/3', full: 1, empty: 2 },
        { can: '0/3', full: 0, empty: 3 }
      ]);
      expect(gauge({ can: 4, canMax: 5 })).toEqual({ can: '4/5', full: 4, empty: 1 });
      expect(gauge({})).toEqual({ can: '', full: 0, empty: 0 });
      expect(gauge({ can: null })).toEqual({ can: '', full: 0, empty: 0 });
    });

    it('🔴 the load the robot carries is the last thing in carry — a stone, a letter as themselves, anything else a parcel — and nothing when it carries nothing', () => {
      const load = (carry: unknown) => {
        const html = robotOf(render('garden-kit.Garden', { map: { rows: ['GGG'] }, things: [], robots: [{ x: 1, y: 0, d: 2, carry }] }));
        const m = /class="gd-load gd-load-(\w+)" data-load="\w+"[^>]*><svg[^>]*data-sprite="(\w+)"/.exec(html);
        return m ? `${m[1]}:${m[2]}` : null;
      };
      expect(load(['stone'])).toBe('stone:stone');
      expect(load(['stone', 'stone', 'letter'])).toBe('letter:letter');
      expect(load(['letter', 'stone'])).toBe('stone:stone');
      expect(load(['widget'])).toBe('parcel:parcel');
      expect(load([])).toBeNull();
      expect(load(undefined)).toBeNull();
      // Both stay upright beside the robot (outside .gd-turn): the gauge at its left, the load at its right — on the literal
      // back (turning with it) the load hid under the name tag whenever the robot faced up (the s2 page drive's shots).
      const html = render('garden-kit.Garden', { map: { rows: ['GGG'] }, things: [], robots: [{ x: 1, y: 0, d: 0, carry: ['stone'], can: 1, name: 'Pip' }] });
      expect(html).toMatch(/<\/svg><\/div><div class="gd-can"[\s\S]*?<\/div><div class="gd-load gd-load-stone"[\s\S]*?<span class="gd-name">Pip<\/span>/);
      expect(html.slice(html.indexOf('class="gd-turn"'), html.indexOf('class="gd-can"'))).not.toContain('gd-load');
      const css = node('garden-kit.Garden').css as string;
      for (const rule of ['.gd-can{', '.gd-load{', '.gd-load>svg{']) expect(css).toContain(rule);
    });

    it('the fill block has its own icon (a drop into the can)', () => {
      const html = render('garden-kit.BlockList', { palette: [{ id: 'fill', kind: 'action', icon: 'fill', label: 'fill the can', hasBody: false, hasCount: false, slots: [] }], program: '[{"id":1,"t":"fill"}]' });
      expect(html).toContain('data-icon="fill"');
    });
  });

  describe('P106 s3 lane F (b) — a dry red and a dry yellow tulip stay apart (Mamie asks for the red row BEFORE the watering)', () => {
    it('🔴 the dry look droops and fades, it does not desaturate: dry red stays red, dry yellow stays yellow, far apart', () => {
      const garden = node('garden-kit.Garden');
      const look = dryLook(garden.css as string, (garden.sprite as { sprites: Record<string, any> }).sprites);
      // The droop and the fade stay (the reduced-motion page clause reads a dry tulip apart from a wet one by opacity).
      expect(look.rule).toMatch(/transform:rotate\(\d+deg\)/);
      expect(look.opacity).toBeGreaterThan(0);
      expect(look.opacity).toBeLessThan(1);
      // No filter that pulls the hue family toward grey or brown.
      expect({ filters: look.filters.filter((f) => /^(saturate|grayscale|sepia|hue-rotate)/.test(f)) }).toEqual({ filters: [] });
      const [dryRed, dryYellow] = [hexToRgb(look.dry.red), hexToRgb(look.dry.yellow)];
      // Each dry petal within 30° of its own wet hue; the two dry petals a different colour (CIE76 ΔE ≥ 40; s2's look: 20.0).
      expect({ red: hueGap(hue(dryRed), hue(hexToRgb(look.wet.red))) <= 30, yellow: hueGap(hue(dryYellow), hue(hexToRgb(look.wet.yellow))) <= 30 }).toEqual({ red: true, yellow: true });
      expect(deltaE(dryRed, dryYellow)).toBeGreaterThanOrEqual(40);
      // And dry still reads apart from wet on the bed, beside the droop.
      expect(deltaE(dryRed, hexToRgb(look.wet.red))).toBeGreaterThanOrEqual(10);
      expect(deltaE(dryYellow, hexToRgb(look.wet.yellow))).toBeGreaterThanOrEqual(10);
      // The known-firing half: the class names and the data attributes are the ones the drives and the page read.
      const html = render('garden-kit.Garden', { map: { rows: ['GGFGFGFG'] }, things: [{ kind: 'tulip', x: 2, y: 0, colour: 'yellow' }, { kind: 'tulip', x: 4, y: 0, colour: 'red' }] });
      expect(html.match(/gd-tulip gd-dry gd-yellow"[^>]*data-sprite="tulipYellow"/g)).toHaveLength(1);
      expect(html.match(/gd-tulip gd-dry"[^>]*data-sprite="tulip"/g)).toHaveLength(2); // the red one and the bed's own at 6,0
    });
  });

  describe('IG-003 (P106 s3) — the tick on the predicted tile; the ? on a placed block', () => {
    it('🔴 a tick is an inline sprite on its tile (the challenge hit); a kind with no sprite draws nothing', () => {
      const sprites = (node('garden-kit.Garden').sprite as { sprites: Record<string, unknown> }).sprites;
      expect(!!sprites.tick).toBe(true);
      const html = render('garden-kit.Garden', { map: ['GGG'], things: [{ kind: 'tick', x: 1, y: 0 }, { kind: 'nosuchkind', x: 2, y: 0 }] });
      const cell = (x: number) => {
        const at = html.indexOf(`data-x="${x}" data-y="0"`);
        return html.slice(html.lastIndexOf('<button', at), html.indexOf('</button>', at));
      };
      expect(cell(1)).toContain('class="gd-sprite gd-thing gd-tick" data-sprite="tick"');
      expect(cell(2)).not.toContain('gd-sprite');
      expect(cell(2)).not.toContain('nosuchkind');
    });

    it('🔴 P108 IW-001 F4: Show Help puts a ? on every PALETTE block and none on a placed one (it was backwards); off by default', () => {
      const program = '[{"id":1,"t":"fwd"},{"id":2,"t":"repeat","n":3,"body":[{"id":3,"t":"water"}]}]';
      const palette = [{ id: 'fwd', kind: 'motion', icon: 'fwd', label: { en: 'forward', fr: 'avance' } }, { id: 'repeat', kind: 'control', icon: 'loop', label: { en: 'repeat', fr: 'répète' }, hasBody: true, hasCount: true }];
      const on = render('garden-kit.BlockList', { program, palette, showHelp: true });
      const helps = [...on.matchAll(/<button[^>]*class="gd-help"[^>]*data-help="([^"]+)"[^>]*>/g)].map((m) => m[1]);
      expect(helps).toEqual(['fwd', 'repeat']);
      // Each ? beside its own drawer block (a button inside a button is not a button), and nothing on the placed list.
      expect(on).toMatch(/<span class="gd-pal-item" data-pal-item="fwd"><button[^>]*data-pal="fwd"[^>]*>.*?<\/button><button[^>]*class="gd-help"[^>]*data-help="fwd"/);
      expect(on.slice(on.indexOf('class="gd-prog"'))).not.toContain('data-help');
      // Its words, for a screen reader, in the list's language, naming the block.
      expect(on).toMatch(/class="gd-help"[^>]*aria-label="what does it do\? forward"/);
      expect(render('garden-kit.BlockList', { program, palette, showHelp: true, language: 'fr' })).toMatch(/class="gd-help"[^>]*aria-label="que fait ce bloc \? avance"/);
      expect(render('garden-kit.BlockList', { program, palette })).not.toContain('data-help');
      // The card's example list has no palette, so no ? at all.
      expect(render('garden-kit.BlockList', { program, palette, showHelp: true, showPalette: false })).not.toContain('data-help');
      const props = node('garden-kit.BlockList').inputProps as Record<string, { type: string; default?: unknown }>;
      expect([props.showHelp.type, props.showHelp.default]).toEqual(['boolean', false]);
      const src = fs.readFileSync(SOURCE, 'utf8');
      expect(src).toMatch(/t\.closest\('\[data-x\],\[data-help\],/);
      expect(node('garden-kit.BlockList').css as string).toContain('.gd-help{');
      expect(node('garden-kit.BlockList').css as string).toContain('.gd-pal-item .gd-help{margin-left:-4px;');
    });

    it('🔴 P108 IW-001 F5: a tap on a placed simple block selects it (a second tap lets go) and never removes it — only the cross removes', () => {
      const src = fs.readFileSync(SOURCE, 'utf8');
      const tap = src.slice(src.indexOf('if (!g.moved) {'), src.indexOf('// A drag. Inside the list it moves'));
      expect(tap).toContain("select(String(g.id) === live.current.sel ? '' : g.id);");
      expect(tap).not.toMatch(/\bremove\(/);
      // Removal is the cross's onClick alone.
      expect([...src.matchAll(/\bremove\(([^)]*)\)/g)].map((m) => m[1])).toEqual(['b.id']);
      // A selected simple block wears the control ring (data-sel on its row).
      const html = render('garden-kit.BlockList', { program: '[{"id":1,"t":"fwd"}]' });
      expect(html).toContain('class="gd-row" data-sel="0"');
      expect(node('garden-kit.BlockList').css as string).toContain('.gd-row[data-sel="1"]>.gd-blk{outline:3px solid var(--gd-control)');
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
  describe('IG-004 (P106 s3) — the island’s vocabulary: an islander (with her bubble), a fence round a locked plot, its padlock', () => {
    const cellOf = (html: string, x: number, y: number) => {
      const at = html.indexOf(`data-x="${x}" data-y="${y}"`);
      return html.slice(html.lastIndexOf('<button', at), html.indexOf('</button>', at));
    };
    it('🔴 each islander is her own sprite on her tile; her bubble is her line, only when she has one; an unknown one draws nothing', () => {
      const html = render('garden-kit.Garden', { map: { rows: ['GGGG'] }, things: [{ kind: 'islander', who: 'mamie', x: 0, y: 0, say: 'Water my three tulips' }, { kind: 'islander', who: 'sami', x: 1, y: 0 }, { kind: 'islander', who: 'biscuit', x: 2, y: 0, say: '' }, { kind: 'islander', who: 'nobody', x: 3, y: 0 }] });
      expect(cellOf(html, 0, 0)).toContain('class="gd-sprite gd-thing gd-islander gd-islander-mamie" data-sprite="islMamie"');
      expect(cellOf(html, 0, 0)).toContain('<span class="gd-isl-say" data-who="mamie">Water my three tulips</span>');
      expect(cellOf(html, 1, 0)).toContain('data-sprite="islSami"');
      expect(cellOf(html, 2, 0)).toContain('data-sprite="islBiscuit"');
      expect((html.match(/class="gd-isl-say"/g) || []).length).toBe(1);
      expect(cellOf(html, 3, 0)).not.toContain('gd-islander');
    });
    it('🔴 a fence spans w × h tiles from (x, y) as ONE element over the grid; the padlock is a sprite on its tile; neither is a label', () => {
      const html = render('garden-kit.Garden', { map: { rows: ['GGGGGGGGGG', 'GGGGGGGGGG', 'GGGGGGGGGG', 'GGGGGGGGGG'] }, things: [{ kind: 'fence', x: 1, y: 1, w: 8, h: 3 }, { kind: 'padlock', x: 5, y: 2 }] });
      const fence = /<div class="gd-fence" data-fence="1,1,8,3" style="([^"]*)"/.exec(html);
      expect(fence).not.toBeNull();
      expect(fence![1]).toContain('left:10.0000%;top:25.0000%;width:80.0000%;height:75.0000%');
      expect((html.match(/class="gd-fence"/g) || []).length).toBe(1);
      expect(cellOf(html, 5, 2)).toContain('class="gd-sprite gd-thing gd-padlock" data-sprite="padlock"');
      expect(html).not.toContain('class="gd-label"');
      const css = node('garden-kit.Garden').css as string;
      for (const rule of ['.gd-fence{', '.gd-isl-say{', '.gd-cell>.gd-islander{', '.gd-cell>.gd-padlock{']) expect({ rule, has: css.includes(rule) }).toEqual({ rule, has: true });
    });
  });
  describe('IG-005 (P106 s4) — robots for the job: each robot wears its accessory, in its own colour', () => {
    it('🔴 the can, the hod, the satchel and the bell are each an element on the robot (its kind on it); \'\' draws none; a robot with no field keeps the can', () => {
      const html = render('garden-kit.Garden', {
        map: { rows: ['GGGGGG'] },
        robots: [
          { x: 0, y: 0, d: 1, name: 'Pip', colour: '#FF7A59', accessory: 'can' },
          { x: 1, y: 0, d: 1, name: 'Cobble', colour: '#7A8CA3', accessory: 'hod' },
          { x: 2, y: 0, d: 1, name: 'Pocket', colour: '#FFB347', accessory: 'satchel' },
          { x: 3, y: 0, d: 1, name: 'Echo', colour: '#8F6BFF', accessory: 'bell' },
          { x: 4, y: 0, d: 1, name: 'Bare', accessory: '' },
          { x: 5, y: 0, d: 1, name: 'Old' }
        ]
      });
      const bots = html.split('class="gd-bot"').slice(1);
      expect(bots).toHaveLength(6);
      const acc = bots.map((b) => (/class="gd-acc gd-acc-(\w+)" data-accessory="(\w+)"/.exec(b) || [])[1] || null);
      expect(acc).toEqual(['can', 'hod', 'satchel', 'bell', null, 'can']);
      // Each in its colour: the body is the robot's own paint.
      expect(bots.slice(0, 4).map((b) => (/<rect x="10" y="8" width="44" height="48" rx="16" fill="([^"]+)"/.exec(b) || [])[1])).toEqual(['#FF7A59', '#7A8CA3', '#FFB347', '#8F6BFF']);
      expect(bots[1]).toContain('data-accessory="hod"');
      const W = node('garden-kit.Garden').world;
      expect(W.parseRobots([{ accessory: 'hod' }, { accessory: 'jetpack' }, { accessory: '' }, {}, { accessory: null }]).map((r: any) => r.accessory)).toEqual(['hod', '', '', 'can', 'can']);
    });
    it('an islander’s bubble is at most seven tiles wide (a share of her cell), so on a phone it stays over her own plot', () => {
      const css = node('garden-kit.Garden').css as string;
      expect(/\.gd-isl-say\{[^}]*max-width:min\(170px,700%\)/.test(css)).toBe(true);
    });
  });
});

// ── P108 IW-004 (lane B): Blocks — Blockly 12.3.1 vendored beside the kit, the way garden-3d-kit vendors three.js ──────
describe('P108 IW-004 — garden-kit.Blocks: Blockly vendored, pinned, licensed, credited; the node loads with or without it', () => {
  const MODULE = path.join(KIT_DIR, 'project', 'noodl_modules', 'garden-kit');
  const NOTICE_FILE = path.join(__dirname, '..', '..', '..', 'dev-docs', 'tasks', 'phase-105-the-coding-garden', 'garden-desktop', 'licenses', 'NOTICE.txt');
  const BLOCKLY_BYTES = 967598;

  it('the manifest loads Blockly, its French messages, the keep line, its English messages — in that order — before index.js', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(MODULE, 'manifest.json'), 'utf8'));
    expect(manifest.main).toBe('index.js');
    expect(manifest.dependencies).toEqual(['blockly_compressed.js', 'blockly-msg-fr.js', 'blockly-msg-keep.js', 'blockly-msg-en.js']);
    expect(fs.readdirSync(MODULE).sort()).toEqual(['LICENSE.txt', 'README.md', 'blockly-msg-en.js', 'blockly-msg-fr.js', 'blockly-msg-keep.js', 'blockly_compressed.js', 'index.js', 'manifest.json', 'types']);
  });

  it('🔴 the vendored files are Blockly 12.3.1 byte for byte (the npm package the repo pins), unmodified', () => {
    const pkg = path.join(__dirname, '..', '..', '..', 'node_modules', 'blockly');
    expect(fs.statSync(path.join(MODULE, 'blockly_compressed.js')).size).toBe(BLOCKLY_BYTES);
    expect(fs.readFileSync(path.join(MODULE, 'blockly_compressed.js'), 'utf8')).toContain('VERSION$$module$build$src$core$blockly="12.3.1"');
    if (fs.existsSync(path.join(pkg, 'package.json')) && JSON.parse(fs.readFileSync(path.join(pkg, 'package.json'), 'utf8')).version === '12.3.1') {
      for (const [ours, theirs] of [['blockly_compressed.js', 'blockly_compressed.js'], ['blockly-msg-fr.js', 'msg/fr.js'], ['blockly-msg-en.js', 'msg/en.js']]) {
        expect({ ours, same: fs.readFileSync(path.join(MODULE, ours)).equals(fs.readFileSync(path.join(pkg, theirs))) }).toEqual({ ours, same: true });
      }
    }
    expect(fs.readFileSync(path.join(MODULE, 'blockly-msg-fr.js'), 'utf8')).toContain('Msg["DUPLICATE_BLOCK"] = "Dupliquer"');
  });

  it('the Apache licence sits beside it; the README and the shell NOTICE credit it; nothing from a CDN', () => {
    const licence = fs.readFileSync(path.join(MODULE, 'LICENSE.txt'), 'utf8');
    for (const words of ['Blockly 12.3.1', 'Google LLC', 'Apache License', 'Version 2.0']) expect(licence).toContain(words);
    const readme = fs.readFileSync(README, 'utf8');
    for (const words of ['Blockly 12.3.1', 'Apache-2.0', 'LICENSE.txt', '967,598', 'never from a CDN', 'garden-kit.Blocks', 'Brain Size']) expect(readme).toContain(words);
    const notice = fs.readFileSync(NOTICE_FILE, 'utf8');
    expect(notice).toContain('Blockly 12.3.1');
    expect(notice).toContain('LICENSE-Apache-2.0.txt');
  });

  it('🔴 the keep line keeps French: with Blockly loaded as the page loads it, French is kept and English is what Blockly holds', () => {
    const ctx: Record<string, any> = {};
    ctx.window = ctx;
    vm.createContext(ctx);
    for (const f of ['blockly_compressed.js', 'blockly-msg-fr.js', 'blockly-msg-keep.js', 'blockly-msg-en.js']) vm.runInContext(fs.readFileSync(path.join(MODULE, f), 'utf8'), ctx, { filename: f });
    expect(ctx.Blockly.gardenMsgFr.DUPLICATE_BLOCK).toBe('Dupliquer');
    expect(ctx.Blockly.Msg.DUPLICATE_BLOCK).toBe('Duplicate');
  });

  it('the Blocks node renders its box on the server with the markers a drive reads, one stylesheet, scoped under .gd-bk', () => {
    const blocks = loadKit().kit.reactNodes.find((n) => n.name === 'garden-kit.Blocks')!;
    const html = renderToStaticMarkup(React.createElement(blocks.getReactComponent(), { band: 1, language: 'fr' }));
    expect(html).toContain('data-gd-blocks="true"');
    expect(html).toContain('data-band="1"');
    expect(html).toContain('data-lang="fr"');
    expect(html.match(/<style>/g)).toHaveLength(1);
    // Blockly's own CSS is global; every rule of ours is under the node's root class, so the editor's chrome is untouched.
    const css = blocks.css as string;
    const selectors = css.replace(/@media[^{]*\{/g, '').split('}').map((r: string) => r.split('{')[0].trim()).filter((sel: string) => sel && !sel.startsWith('@'));
    const loose = selectors.flatMap((sel: string) => sel.split(',').map((x) => x.trim())).filter((x: string) => x && !x.startsWith('.gd-bk'));
    expect(loose).toEqual([]);
    expect(reducedMotionReport(css).unstilled).toEqual([]);
  });
});
