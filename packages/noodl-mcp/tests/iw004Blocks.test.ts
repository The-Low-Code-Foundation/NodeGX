/**
 * P108 IW-004 — the block gate: Blockly is a view, the engine program is the program.
 *
 * `garden-kit.Blocks` (library/modules/garden-kit/src/blocks.js) translates the engine program to Blockly JSON and back.
 * This spec grades the translator exported on the node, twice over:
 *
 * - **pure** — `toEngine(toBlockly(p))` is `p`, byte for byte (`JSON.stringify` equal), with no Blockly at all;
 * - **through Blockly** — the same programs loaded into a real headless Blockly 12.3.1 workspace (the VENDORED
 *   `blockly_compressed.js`, the file a project installs) with the kit's own block definitions, saved again by Blockly,
 *   and translated back: still `p`. So every field, input and extraState the translator writes is one Blockly accepts.
 *
 * The programs: every reference program of the 13 requests in both bands (band 7–9 records primitives: the reference
 * program unrolled, as cg002Engine's gate plays it), the same programs as a stored v4 save holds them (the shape
 * Block List emits: keys id, t, n, body, slots; slot values as text), the stored-program fixtures of the engine spec
 * (the v4 plots), and fixture programs that use every new statement and expression of the P108 brief §4.3 (`slots.cond`,
 * `go_nearest`, `go_to`, `set`, `change`, `if` + `else`). Lane J runs those new ops in the engine; here they only have
 * to survive the round trip.
 *
 * @module noodl-mcp/tests/iw004Blocks.test
 */
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { BLOCK_TYPES, Block, REQUESTS } from './cg002Content';
import { FOLD_SCRIPT, UNFOLD_SCRIPT, runScript } from './cg002Scripts';

const KIT_DIR = path.join(__dirname, '..', '..', '..', 'library', 'modules', 'garden-kit');
const MODULE_DIR = path.join(KIT_DIR, 'project', 'noodl_modules', 'garden-kit');
const BUILT = path.join(MODULE_DIR, 'index.js');
const BLOCKLY_FILE = path.join(MODULE_DIR, 'blockly_compressed.js');

type Program = unknown[];
interface Translate {
  toBlockly: (p: unknown) => { blocks: { languageVersion: number; blocks: Array<Record<string, any>> } };
  toEngine: (state: unknown) => Program;
  refsIn: (p: unknown) => Array<Record<string, unknown>>;
  countStatements: (p: unknown) => number;
  TYPE_OF: Record<string, string>;
  T_OF: Record<string, string>;
  STATES: Record<string, string[]>;
}

/** The built kit in a bare context (no window, no document, no Blockly): what it handed Noodl.defineModule. */
function loadKit(extra: Record<string, unknown> = {}) {
  let captured: any = null;
  const context: Record<string, any> = {
    Noodl: {
      defineModule(m: any) {
        captured = m;
      }
    },
    React,
    console,
    setTimeout,
    clearTimeout,
    ...extra
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(BUILT, 'utf8'), context, { filename: 'garden-kit/index.js' });
  return { kit: captured, context };
}

const { kit } = loadKit();
const blocksNode = () => kit.reactNodes.find((n: any) => n.name === 'garden-kit.Blocks');
const T = (): Translate => blocksNode().translate;
const round = (p: unknown) => JSON.stringify(T().toEngine(T().toBlockly(p)));

/** Block List's emitted shape (a stored v4 program): the kit's own normalizer, run on the program. */
const blockListNode = () => kit.reactNodes.find((n: any) => n.name === 'garden-kit.BlockList');
const asStored = (p: unknown): Program => JSON.parse(blockListNode().program.emit(p));
/**
 * P108 IW-003 (lane M): could a v4 save hold it? Block List wrote every slot as a picker's string, so a program with an
 * object slot (a cond, a chip — eggs-count's `until count of 🥚 in [basket] = 4`) was never stored by it: its "as
 * stored" twin would be Block List's `[object Object]`, a shape no save holds. Those rows run raw only.
 */
const storable = (list: ReadonlyArray<any>): boolean => list.every((b) => Object.values(b.slots ?? {}).every((v) => v === null || typeof v !== 'object') && storable(b.body ?? []) && storable(b.else ?? []));

/**
 * The program a band-1 child records (cg002Engine's `unrolled`): repeats unrolled, tricks inlined, primitives only —
 * and every block numbered afresh, bodies too. (The engine spec's copy keeps an unrolled `if`'s body ids, so its band-1
 * bowl-if holds id 34 twice; a program a child builds never does — a Blockly workspace cannot hold one id twice, and the
 * engine's own findBlock would find the first. Measured: the three band-1 programs with an `if` are the only ones.)
 */
function unrolled(list: ReadonlyArray<Block>, tricks: Record<string, ReadonlyArray<Block>> = {}, next = { n: 1000 }): Block[] {
  const out: Block[] = [];
  const renumber = (b: Block): Block => ({ ...b, id: next.n++, ...(b.body ? { body: b.body.map(renumber) } : {}) });
  for (const b of list) if (b.t === 'trick') tricks[String(b.slots?.name)] = b.body ?? [];
  for (const b of list) {
    if (b.t === 'repeat') for (let k = 0; k < (b.n ?? 0); k++) out.push(...unrolled(b.body ?? [], tricks, next));
    else if (b.t === 'do') out.push(...unrolled(tricks[String(b.slots?.name)] ?? [], tricks, next));
    else if (b.t === 'trick') continue;
    else out.push(renumber(b));
  }
  return out;
}

/** The engine spec's stored v4 plots (cg002Engine "IG-004 AC1") and a v4 family's plot programs as the save decodes them. */
const V4_PLOTS: Program[] = [[{ id: 1, t: 'fwd' }], [{ id: 1, t: 'left' }]];

// ── The new ops and expressions (brief §4.3), in the contract's key order ──────────────────────────────────────
const BASKET = { id: 't3', kind: 'basket', x: 5, y: 2 };
const CAN = { kind: 'can', x: 1, y: 4 };
const FIXTURES: Record<string, Program> = {
  'until the basket is full (a chip picked on the world)': [{ id: 1, t: 'until', slots: { cond: { op: 'is', thing: BASKET, state: 'full' } }, body: [{ id: 2, t: 'go_nearest', slots: { kind: 'egg' } }, { id: 3, t: 'pick' }, { id: 4, t: 'go_to', slots: { thing: BASKET } }, { id: 5, t: 'put' }] }],
  'until count of eggs in the basket = 4': [{ id: 1, t: 'until', slots: { cond: { op: 'cmp', cmp: 'eq', a: { op: 'count', what: 'egg', thing: BASKET }, b: { op: 'num', n: 4 } } }, body: [{ id: 2, t: 'go_nearest', slots: { kind: 'egg' } }, { id: 3, t: 'pick' }] }],
  'if the can has 2 / else (and, or, not, level)': [
    {
      id: 7,
      t: 'if',
      slots: { cond: { op: 'and', a: { op: 'is', thing: CAN, state: 'has', n: 2 }, b: { op: 'not', a: { op: 'or', a: { op: 'is', thing: { ref: 'ahead' }, state: 'wall' }, b: { op: 'cmp', cmp: 'lt', a: { op: 'level', thing: { ref: 'held' } }, b: { op: 'num', n: 1 } } } } } },
      body: [{ id: 8, t: 'water' }],
      else: [{ id: 9, t: 'go_to', slots: { thing: CAN } }, { id: 10, t: 'fill' }]
    }
  ],
  'if the tile ahead has a tulip; if here is clear': [{ id: 1, t: 'if', slots: { cond: { op: 'is', thing: { ref: 'ahead' }, state: 'has', what: 'tulip' } }, body: [{ id: 2, t: 'water' }] }, { id: 3, t: 'if', slots: { cond: { op: 'is', thing: { ref: 'here' }, state: 'nothing' } }, body: [], else: [] }],
  'set and change a variable; compare it; a legacy sensor inside an expression': [
    { id: 1, t: 'set', slots: { name: 'eggs', value: { op: 'num', n: 0 } } },
    { id: 2, t: 'until', slots: { cond: { op: 'or', a: { op: 'cmp', cmp: 'gt', a: { op: 'var', name: 'eggs' }, b: { op: 'num', n: 3 } }, b: { op: 'sensor', sensor: 'wall_ahead' } } }, body: [{ id: 3, t: 'change', slots: { name: 'eggs', by: { op: 'num', n: 1 } } }, { id: 4, t: 'fwd' }] }
  ],
  'a lone sensor written as an expression stays an expression': [{ id: 1, t: 'until', slots: { cond: { op: 'sensor', sensor: 'count_is', arg: 3 } }, body: [{ id: 2, t: 'count_inc' }] }],
  'go to what Olive read; if what she read = "red tulip"': [
    { id: 1, t: 'olive:read' },
    { id: 2, t: 'go_to', slots: { thing: { ref: 'read' } } },
    { id: 3, t: 'if', slots: { cond: { op: 'cmp', cmp: 'eq', a: { op: 'read' }, b: { op: 'text', s: 'red tulip' } } }, body: [{ id: 4, t: 'water' }] }
  ],
  'change by a count; an unknown op rides whole': [
    { id: 1, t: 'change', slots: { name: 'stones', by: { op: 'count', what: 'stone', thing: { ref: 'held' } } } },
    { id: 2, t: 'if', slots: { cond: { op: 'someday', x: [1, 2] } }, body: [] },
    { id: 3, t: 'set', slots: { name: 'n', value: { op: 'later', k: 'v' } } }
  ],
  'an is with no thing yet (an empty chip)': [{ id: 1, t: 'until', slots: { cond: { op: 'is', thing: null, state: 'full' } }, body: [{ id: 2, t: 'put' }] }],
  'every BLOCK_TYPES entry, once': [
    { id: 1, t: 'fwd' },
    { id: 2, t: 'left' },
    { id: 3, t: 'right' },
    { id: 4, t: 'water' },
    { id: 5, t: 'fill' },
    { id: 6, t: 'pick' },
    { id: 7, t: 'put' },
    { id: 8, t: 'say', slots: { text: 'thanksMamie' } },
    { id: 9, t: 'repeat', n: 2, body: [{ id: 10, t: 'fwd' }] },
    { id: 11, t: 'until', slots: { sensor: 'wall_ahead' }, body: [{ id: 12, t: 'fwd' }] },
    { id: 13, t: 'if', slots: { sensor: 'tulip_ahead' }, body: [{ id: 14, t: 'water' }] },
    { id: 15, t: 'when', slots: { event: 'meow' }, body: [{ id: 16, t: 'fwd' }] },
    { id: 17, t: 'count_inc' },
    { id: 18, t: 'trick', slots: { name: 'row' }, body: [{ id: 19, t: 'fwd' }] },
    { id: 20, t: 'do', slots: { name: 'row' } },
    { id: 21, t: 'ask', slots: { rung: 'maths', args: '2+3', shape: 'number', dial: 1 } },
    { id: 22, t: 'repeat', n: 3, slots: { n: 'olive' }, body: [{ id: 23, t: 'right' }] }
  ],
  "Olive's ask blocks, filled and not": [
    { id: 1, t: 'olive:say-thanks', slots: { to: 'Mamie Rose', deed: 'carried her letter' } },
    { id: 2, t: 'olive:is-it-a', slots: { kind: 'a flower', times: '3' } },
    { id: 3, t: 'olive:is-it-a' },
    { id: 4, t: 'olive:read' }
  ],
  'string ids, odd keys and a type this kit does not know': [{ id: 'a', t: 'fwd', note: 'kept' }, { t: 'left', id: 12 }, { id: 13, t: 'someday', slots: { x: 1 }, body: [{ id: 14, t: 'fwd' }] }],
  'an empty program': []
};

describe('P108 IW-004 — the block gate (garden-kit.Blocks, the translator)', () => {
  it('the kit registers garden-kit.Blocks beside Block List and Garden; it draws an empty box on the server and throws nothing without Blockly', () => {
    const names = kit.reactNodes.map((n: any) => n.name).sort();
    expect(names).toEqual(['garden-kit.BlockList', 'garden-kit.Blocks', 'garden-kit.Garden']);
    const node = blocksNode();
    expect(node.ssr).toEqual({ compat: 'safe' });
    expect(typeof node.translate.toBlockly).toBe('function');
    const html = renderToStaticMarkup(React.createElement(node.getReactComponent(), { program: '[{"id":1,"t":"fwd"}]', band: 1 }));
    expect(html).toContain('data-gd-blocks="true"');
    expect(html).toContain('data-bk="blockly"');
    expect(html).toContain('class="gd-bk-host"');
    // Block List's ports, and the node's own.
    const ins = Object.keys(node.inputProps);
    for (const p of ['palette', 'program', 'band', 'language', 'runningId', 'locked', 'showPalette', 'showHelp', 'motionColor', 'actionColor', 'controlColor', 'askColor', 'runColor', 'dropColor', 'words', 'brainSize', 'pick', 'botName']) expect({ p, in: ins.includes(p) }).toEqual({ p, in: true });
    const outs = Object.keys(node.outputProps);
    for (const p of ['onProgram', 'onChanged', 'onSelected', 'onHelpBlock', 'onHelp', 'onPicking', 'onPickArm', 'onWatch', 'onFull', 'onBlocks']) expect({ p, out: outs.includes(p) }).toEqual({ p, out: true });
  });

  it('every BLOCK_TYPES entry has a Blockly block (IW-000 §7’s names), and Olive’s rungs are one block type', () => {
    for (const t of BLOCK_TYPES) expect({ t, type: T().TYPE_OF[t] }).toEqual({ t, type: expect.stringMatching(/^garden_/) });
    expect([T().TYPE_OF.fwd, T().TYPE_OF.left, T().TYPE_OF.right, T().TYPE_OF.repeat, T().TYPE_OF.until, T().TYPE_OF.if]).toEqual(['garden_forward', 'garden_turn_left', 'garden_turn_right', 'garden_repeat', 'garden_until', 'garden_if']);
    for (const t of ['go_nearest', 'go_to', 'set', 'change']) expect(T().TYPE_OF[t]).toBe('garden_' + t);
    const olive = T().toBlockly([{ id: 1, t: 'olive:read' }]).blocks.blocks[0].next.block;
    expect([olive.type, olive.extraState.rung, olive.id]).toEqual(['garden_olive', 'read', '1']);
  });

  it('🔴 the ids ARE the engine ids; the program hangs under ▶; Blockly JSON never reaches the engine program', () => {
    const state = T().toBlockly([{ id: 5, t: 'repeat', n: 2, body: [{ id: 6, t: 'fwd' }] }]);
    const start = state.blocks.blocks[0];
    expect([start.type, start.next.block.id, start.next.block.inputs.DO.block.id]).toEqual(['garden_start', '5', '6']);
    const back = JSON.stringify(T().toEngine(state));
    expect(back).toBe('[{"id":5,"t":"repeat","n":2,"body":[{"id":6,"t":"fwd"}]}]');
    expect(back).not.toMatch(/"type"|"inputs"|"fields"|"extraState"|garden_/);
    // A block left loose beside ▶ is not in the program.
    state.blocks.blocks.push({ type: 'garden_forward', id: '99', x: 400, y: 10 });
    expect(T().toEngine(state)).toEqual([{ id: 5, t: 'repeat', n: 2, body: [{ id: 6, t: 'fwd' }] }]);
  });

  describe('pure: engine → Blockly JSON → engine, byte-identical', () => {
    for (const r of REQUESTS) {
      for (const band of [1, 2] as const) {
        const program = band === 1 ? unrolled(r.referenceProgram) : r.referenceProgram;
        it(`${r.id}, band ${band === 1 ? '7–9' : '10–12'}: the reference program, and the same as a stored v4 save holds it`, () => {
          expect(round(program)).toBe(JSON.stringify(program));
          if (!storable(program)) return;
          const stored = asStored(program);
          expect(round(stored)).toBe(JSON.stringify(stored));
        });
      }
    }
    it('the engine spec’s stored v4 plots', () => {
      for (const p of V4_PLOTS) expect(round(p)).toBe(JSON.stringify(p));
    });
    for (const [name, p] of Object.entries(FIXTURES)) {
      it(`fixture: ${name}`, () => {
        expect(round(p)).toBe(JSON.stringify(p));
      });
    }
    it('🔴 known-firing: the memo is what keeps a stored shape — without it, a stored `arg: "4"` comes back in the contract’s order', () => {
      // (P108 IW-003, lane M: the eggs' old reference, as a v4 save holds it — the eggs now count with a cond.)
      const stored = asStored([{ id: 1, t: 'until', slots: { sensor: 'count_is', arg: 4 }, body: [{ id: 2, t: 'pick' }, { id: 3, t: 'count_inc' }, { id: 4, t: 'fwd' }] }]);
      const state = T().toBlockly(stored);
      const strip = (j: any): void => {
        if (!j || typeof j !== 'object') return;
        if (j.extraState && j.extraState.src) delete j.extraState.src;
        for (const v of Object.values(j)) strip(v);
      };
      strip(state);
      const back = JSON.stringify(T().toEngine(state));
      expect(back).not.toBe(JSON.stringify(stored));
      expect(back).toContain('"slots":{"sensor":"count_is","arg":"4"}');
    });
  });

  it('🔴 a block made in Blockly (from the drawer, no memo) is written in the contract’s order; a lone sensor as the legacy pair; any other condition as cond', () => {
    const state = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'garden_start',
            id: 'start',
            next: {
              block: {
                type: 'garden_repeat',
                id: '1',
                fields: { N: '4' },
                inputs: { DO: { block: { type: 'garden_forward', id: '2' } } },
                next: {
                  block: {
                    type: 'garden_until',
                    id: '3',
                    inputs: { COND: { shadow: { type: 'garden_sensor', fields: { SENSOR: 'count_is', ARG: '4' } } }, DO: { block: { type: 'garden_pick', id: '4' } } },
                    next: {
                      block: {
                        type: 'garden_if',
                        id: '5',
                        inputs: { COND: { shadow: { type: 'garden_sensor', fields: { SENSOR: '', ARG: '1' } }, block: { type: 'garden_is', fields: { STATE: 'full', N: '1', WHAT: '' }, inputs: { THING: { block: { type: 'garden_thing', extraState: { kind: 'basket', x: 5, y: 2 } } } } } } },
                        next: { block: { type: 'garden_until', id: '6', inputs: { COND: { shadow: { type: 'garden_sensor', fields: { SENSOR: '', ARG: '1' } } } } } }
                      }
                    }
                  }
                }
              }
            }
          }
        ]
      }
    };
    expect(T().toEngine(state)).toEqual([
      { id: 1, t: 'repeat', n: 4, body: [{ id: 2, t: 'fwd' }] },
      { id: 3, t: 'until', slots: { sensor: 'count_is', arg: '4' }, body: [{ id: 4, t: 'pick' }] },
      { id: 5, t: 'if', slots: { cond: { op: 'is', thing: { kind: 'basket', x: 5, y: 2 }, state: 'full' } }, body: [] },
      // An until whose sensor slot is still empty: today's fresh Block List until, no slots at all.
      { id: 6, t: 'until', body: [] }
    ]);
    expect(JSON.stringify(T().toEngine(state)[0])).toBe('{"id":1,"t":"repeat","n":4,"body":[{"id":2,"t":"fwd"}]}');
  });

  it('the chips a program uses are its watch list (each once); the block count is the engine’s', () => {
    const p = FIXTURES['if the can has 2 / else (and, or, not, level)'];
    expect(T().refsIn(p)).toEqual([CAN]);
    expect(T().refsIn(FIXTURES['until the basket is full (a chip picked on the world)'])).toEqual([BASKET]);
    expect(T().refsIn([{ id: 1, t: 'fwd' }])).toEqual([]);
    expect(T().countStatements(FIXTURES['every BLOCK_TYPES entry, once'])).toBe(23);
  });

  it('🔴 the fold walks an if’s else (the orchestrator’s finding, 2026-09-30): a fold never mints an id an else block holds; unfold copies the else afresh', () => {
    // Known-firing: the highest id is IN the else (9); the fold's new ids must start above it.
    const program = [
      { id: 1, t: 'fwd' },
      { id: 2, t: 'fwd' },
      { id: 3, t: 'fwd' },
      { id: 4, t: 'if', slots: { sensor: 'wall_ahead' }, body: [{ id: 5, t: 'left' }], else: [{ id: 9, t: 'right' }] }
    ];
    const folded = runScript(FOLD_SCRIPT, { program, i: 0, len: 1, count: 3, containerId: null });
    expect(folded.folded).toBe(true);
    const ids: number[] = [];
    const walk = (l: any[]) => l.forEach((b) => { ids.push(b.id); if (b.body) walk(b.body); if (b.else) walk(b.else); });
    walk(folded.program);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Math.min(...ids.filter((x) => ![4, 5, 9].includes(x)))).toBeGreaterThan(9);
    // The count includes the else: repeat, its fwd, the if, its left, its right.
    expect(folded.blocks).toBe(5);
    // Unfold a repeat that holds an if/else: every copy's else gets fresh ids too.
    const withRepeat = [{ id: 1, t: 'repeat', n: 2, body: [{ id: 2, t: 'if', slots: { sensor: 'wall_ahead' }, body: [{ id: 3, t: 'left' }], else: [{ id: 4, t: 'right' }] }] }];
    const un = runScript(UNFOLD_SCRIPT, { program: withRepeat, repeatId: 1 });
    const uids: number[] = [];
    const uwalk = (l: any[]) => l.forEach((b) => { uids.push(b.id); if (b.body) uwalk(b.body); if (b.else) uwalk(b.else); });
    uwalk(un.program);
    expect([un.unfolded, uids.length, new Set(uids).size, un.program.map((b: any) => b.else.length)]).toEqual([true, 6, 6, [1, 1]]);
  });

  describe('the drawer: band 7–9 has no value blocks, band 10–12 does (AC3)', () => {
    const palette = (ids: string[]) => ids.map((id) => ({ id, kind: 'motion', icon: 'fwd', label: id, hasBody: false, hasCount: false, slots: [] }));
    const types = (band: number, ids: string[]) => blocksNode().toolbox({ band, lang: 'en', palette: {}, paletteList: palette(ids), words: {}, showHelp: false }).contents.filter((c: any) => c.kind === 'block').map((c: any) => c.type);
    it('band 1: exactly the palette’s blocks', () => {
      expect(types(1, ['fwd', 'left', 'right', 'water', 'fill', 'pick', 'put'])).toEqual(['garden_forward', 'garden_turn_left', 'garden_turn_right', 'garden_water', 'garden_fill', 'garden_pick', 'garden_put']);
    });
    it('band 2 with until/if: + if/else, the sensor, a thing chip and its state, count, level, compare, number, and/or, not', () => {
      const t = types(2, ['fwd', 'repeat', 'until', 'if']);
      expect(t.slice(0, 5)).toEqual(['garden_forward', 'garden_repeat', 'garden_until', 'garden_if', 'garden_if_else']);
      for (const v of ['garden_sensor', 'garden_is', 'garden_thing', 'garden_count', 'garden_level', 'garden_compare', 'garden_number', 'garden_logic', 'garden_not']) expect(t).toContain(v);
      expect(t).not.toContain('garden_read');
      expect(types(2, ['fwd', 'until', 'olive:read'])).toContain('garden_read');
      // Known-firing beside the absence: band 1 given the SAME condition blocks still draws no value block.
      const one = types(1, ['fwd', 'repeat', 'until', 'if']);
      expect(one.filter((x: string) => /garden_(sensor|is|thing|count|level|compare|number|logic|not|if_else)$/.test(x))).toEqual([]);
    });
    it('band 2 without until/if: no value blocks', () => {
      expect(types(2, ['fwd', 'left', 'pick', 'put', 'say', 'repeat'])).toEqual(['garden_forward', 'garden_turn_left', 'garden_pick', 'garden_put', 'garden_say', 'garden_repeat']);
    });
  });

  describe('🔴 through a real Blockly 12.3.1 (the vendored file): load into a headless workspace, save, translate back — byte-identical', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Blockly = require(BLOCKLY_FILE);
    // Blockly's node entry (`core-node.js`) does this: XML for the delete events a disposed workspace fires.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { JSDOM } = require('jsdom');
    Blockly.utils.xml.injectDependencies(new JSDOM('<!DOCTYPE html>').window);
    const { kit: bk } = loadKit({ Blockly });
    const node = bk.reactNodes.find((n: any) => n.name === 'garden-kit.Blocks');
    node.defineBlocks(Blockly);
    const through = (p: unknown) => {
      const ws = new Blockly.Workspace();
      try {
        Blockly.serialization.workspaces.load(node.translate.toBlockly(p), ws);
        return JSON.stringify(node.translate.toEngine(Blockly.serialization.workspaces.save(ws)));
      } finally {
        ws.dispose();
      }
    };

    it('the vendored file is Blockly 12.3.1', () => {
      expect(Blockly.VERSION).toBe('12.3.1');
    });

    it('every reference program, both bands, raw and as stored', () => {
      const bad: string[] = [];
      for (const r of REQUESTS) {
        for (const band of [1, 2]) {
          const program = band === 1 ? unrolled(r.referenceProgram) : r.referenceProgram;
          if (through(program) !== JSON.stringify(program)) bad.push(`${r.id}/${band}`);
          if (!storable(program)) continue;
          const stored = asStored(program);
          if (through(stored) !== JSON.stringify(stored)) bad.push(`${r.id}/${band}/stored`);
        }
      }
      expect(bad).toEqual([]);
    });

    it('every fixture (the new ops and expressions, the odd shapes) and the v4 plots', () => {
      const bad: string[] = [];
      for (const [name, p] of Object.entries(FIXTURES)) if (through(p) !== JSON.stringify(p)) bad.push(name + ': ' + through(p));
      for (const p of V4_PLOTS) if (through(p) !== JSON.stringify(p)) bad.push('v4 plot');
      expect(bad).toEqual([]);
    });

    it('Blockly builds exactly the blocks the translator names: a chip, its state, the sensor, the olive block’s own fields', () => {
      const ws = new Blockly.Workspace();
      try {
        Blockly.serialization.workspaces.load(node.translate.toBlockly([...FIXTURES["Olive's ask blocks, filled and not"], ...FIXTURES['until the basket is full (a chip picked on the world)']]), ws);
        const byType = (t: string) => ws.getAllBlocks(false).filter((b: any) => b.type === t);
        expect(byType('garden_olive').map((b: any) => b.getFieldValue('S_to'))).toEqual(['Mamie Rose', null, null, null]);
        expect(byType('garden_olive')[1].getFieldValue('S_times')).toBe('3');
        const is = byType('garden_is')[0];
        expect([is.getFieldValue('STATE'), is.getInputTargetBlock('THING').type, is.getInputTargetBlock('THING').ref_]).toEqual(['full', 'garden_thing', BASKET]);
        expect(ws.getBlockById('1').type).toBe('garden_olive');
      } finally {
        ws.dispose();
      }
    });
  });
});
