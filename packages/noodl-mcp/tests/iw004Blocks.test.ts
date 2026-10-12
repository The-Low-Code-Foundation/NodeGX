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
 * P108 IW-003 (lane P): a v4 save was written by Block List, whose slots are strings — a program with a chip (an OBJECT
 * slot: go_to [post box], go_to [what Olive read]) was never stored that way (no palette offered go_to before IW-003), and
 * Block List's emit flattens it to "[object Object]". The "as stored" half is for the programs a v4 save can hold.
 */
const v4Storable = (list: ReadonlyArray<any>): boolean => list.every((b) => Object.values(b.slots ?? {}).every((v) => v === null || typeof v !== 'object') && v4Storable(b.body ?? []) && v4Storable(b.else ?? []));

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
    expect(names).toEqual(['garden-kit.BlockList', 'garden-kit.Blocks', 'garden-kit.Divider', 'garden-kit.Garden']); // P108 s8: + Divider
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
          if (!v4Storable(program)) return;
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
    // P108 IW-003 (lane P): the envelopes' drawer — go to and Olive's read, no until/if — offers the read chip alone.
    it('band 2 with go to and Olive’s read but no until/if (the envelopes): the “what Olive read” chip, and no other value block', () => {
      const withRead = blocksNode().toolbox({ band: 2, lang: 'en', palette: {}, paletteList: palette(['fwd', 'pick', 'put', 'go_to', 'repeat', 'olive:read']), words: {}, showHelp: false }).contents.filter((c: any) => c.kind === 'block');
      const chips = withRead.filter((c: any) => c.type === 'garden_thing');
      expect(chips.map((c: any) => c.extraState)).toEqual([{ ref: 'read' }]);
      expect(withRead.map((c: any) => c.type).filter((x: string) => /garden_(sensor|is|count|level|compare|number|logic|not|read|if_else)$/.test(x))).toEqual([]);
      // Known-firing beside the absence: without Olive's read (or without go to) there is no chip.
      expect(types(2, ['fwd', 'pick', 'put', 'go_to', 'repeat'])).not.toContain('garden_thing');
      expect(types(2, ['fwd', 'pick', 'put', 'repeat', 'olive:read'])).not.toContain('garden_thing');
      expect(types(1, ['fwd', 'pick', 'put', 'go_to', 'olive:read'])).not.toContain('garden_thing');
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
          if (!v4Storable(program)) continue;
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

  /**
   * P108 s9 (Richard, 2026-10-03, after the kids played on Windows tablets): "you can't shift select a group of blockly nodes
   * to delete" — and "when you shift select a group of the same node multiple times you can condense them into a repeat".
   *
   * The node's own editor (`createEditor`) on a real Blockly 12.3.1 workspace (headless: `Bk.inject` hands back a
   * `Blockly.Workspace`), driven the way the page drives it: a press on the node's box (`pointerdown`, its modifier keys),
   * then the events Blockly fires for a click (SELECTED, CLICK); the keys on the document; the bar's buttons; the block
   * menu's item from Blockly's own registry (a long press on a tablet opens that menu: Blockly 12.3.1's Touch.longStart).
   */
  describe('🔴 [s9-select] several blocks at once — select (shift / ⌘ / ctrl-click, or “Select several” on a tablet), delete, fold into a repeat', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Blockly = require(BLOCKLY_FILE);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM('<!DOCTYPE html><body></body>');
    Blockly.utils.xml.injectDependencies(dom.window);
    const doc = dom.window.document;
    const { kit: bk, context } = loadKit({ Blockly, document: doc });
    const node = bk.reactNodes.find((n: any) => n.name === 'garden-kit.Blocks');
    // This kit's blocks and menu (the describe above defined its own kit's on the same Blockly; a page loads one kit). In a
    // beforeAll, so the describe above has run its rows on its own definitions first.
    beforeAll(() => {
      delete Blockly.__gardenKit;
      node.defineBlocks(Blockly);
    });
    const pal = (ids: string[]) => ids.map((id) => ({ id, kind: 'motion', icon: 'fwd', label: id, hasBody: id === 'repeat', hasCount: id === 'repeat', slots: [] }));
    const PALETTE = pal(['fwd', 'left', 'right', 'water', 'repeat']);
    const tick = () => new Promise((r) => setTimeout(r, 40));
    const F = (id: number) => ({ id, t: 'fwd' });
    const L = (id: number) => ({ id, t: 'left' });
    const R = (id: number) => ({ id, t: 'right' });
    const open: Array<() => void> = [];
    afterEach(() => {
      while (open.length) open.pop()!();
    });

    async function editor(program: unknown[], props: Record<string, unknown> = {}) {
      const Bk = Object.create(Blockly);
      Bk.inject = () => new Blockly.Workspace();
      const root = doc.createElement('div');
      const host = doc.createElement('div');
      root.appendChild(host);
      doc.body.appendChild(root);
      const emits: string[] = [];
      const p: Record<string, unknown> = { program: JSON.stringify(program), palette: PALETTE, language: 'en', band: 2, onProgram: (t: string) => emits.push(t), ...props };
      const made = context.gardenKitBlocks.createEditor(Bk, root, host, { props: () => p });
      const ed = made.api;
      const ws = ed.workspace();
      open.push(() => {
        made.destroy();
        root.remove();
      });
      const press = (mods: Record<string, boolean>) => root.dispatchEvent(new dom.window.MouseEvent('pointerdown', { bubbles: true, cancelable: true, ...mods }));
      /** A click on a placed block as Blockly reports it: the press on the box, Blockly's SELECTED, then its CLICK. */
      const click = async (id: string, mods: Record<string, boolean> = {}) => {
        press(mods);
        Blockly.Events.fire(new (Blockly.Events.get(Blockly.Events.SELECTED))(null, id, ws.id));
        Blockly.Events.fire(new (Blockly.Events.get(Blockly.Events.CLICK))(ws.getBlockById(id), ws.id, 'block'));
        await tick();
      };
      const clickEmpty = async () => {
        press({});
        Blockly.Events.fire(new (Blockly.Events.get(Blockly.Events.CLICK))(null, ws.id, 'workspace'));
        await tick();
      };
      const key = async (k: string) => {
        root.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
        await tick();
      };
      const barEl = () => root.querySelector('[data-sel-bar]');
      const bar = () => (barEl() ? [...barEl()!.querySelectorAll('button')].map((b: any) => `${b.getAttribute('data-sel-act')}: ${b.textContent}`) : null);
      const pressBar = async (act: string) => {
        const b = root.querySelector(`[data-sel-bar] [data-sel-act="${act}"]`);
        if (!b) throw new Error(`no ${act} on the bar: ${JSON.stringify(bar())}`);
        b.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
        await tick();
      };
      const set = (): string[] => (typeof ed.multiIds === 'function' ? ed.multiIds() : []);
      await tick();
      return { ed, ws, root, emits, p, update: () => made.update(), click, clickEmpty, key, bar, pressBar, set, program: () => ed.program() as string };
    }
    const selectAll = async (e: Awaited<ReturnType<typeof editor>>, ids: string[]) => {
      for (const id of ids) await e.click(id, { shiftKey: true });
    };

    it('[s9-select] shift-click toggles a block in the set (⌘- and ctrl-click too); the block selected before joins it; the ▶ hat never does; no emit', async () => {
      const e = await editor([F(1), L(2), F(3)]);
      await e.click('2');
      expect([e.ed.selected, e.set()]).toEqual(['2', []]);
      await e.click('3', { shiftKey: true });
      expect([e.set(), e.ed.selected]).toEqual([['2', '3'], '']);
      await e.click('1', { metaKey: true });
      expect(e.set()).toEqual(['2', '3', '1']);
      await e.click('3', { ctrlKey: true });
      expect(e.set()).toEqual(['2', '1']);
      await e.click('start', { shiftKey: true });
      expect(e.set()).toEqual(['2', '1']);
      expect(e.bar()).toEqual(['delete: Delete 2 blocks', 'done: Done']);
      expect(e.emits).toEqual([]);
    });

    it('[s9-select] a plain click on a block, or on the empty workspace, clears the set — and is today’s single selection (tap-to-add still goes into the selected repeat)', async () => {
      const e = await editor([F(1), { id: 2, t: 'repeat', n: 3, body: [] }, F(3)]);
      await selectAll(e, ['1', '3']);
      expect(e.set()).toEqual(['1', '3']);
      await e.click('2');
      expect([e.set(), e.ed.selected, e.bar()]).toEqual([[], '2', null]);
      // Today's tap-to-add: the drawer's forward goes into the selected repeat.
      const fly = new Blockly.Workspace();
      try {
        const fb = Blockly.serialization.blocks.append({ type: 'garden_forward' }, fly);
        e.ed.tapAdd(fb);
      } finally {
        fly.dispose();
      }
      expect(JSON.parse(e.program())[1]).toEqual({ id: 2, t: 'repeat', n: 3, body: [{ id: 4, t: 'fwd' }] });
      await selectAll(e, ['1', '3']);
      expect(e.set()).toEqual(['2', '1', '3']);
      await e.clickEmpty();
      expect([e.set(), e.ed.selected, e.bar()]).toEqual([[], '', null]);
    });

    it('[s9-select] Delete deletes every block in the set — one emit; a block from the middle of a stack heals it', async () => {
      const e = await editor([F(1), L(2), F(3)]);
      await e.click('2', { shiftKey: true });
      await e.key('Delete');
      expect(e.program()).toBe(JSON.stringify([F(1), F(3)]));
      expect(e.emits).toEqual([JSON.stringify([F(1), F(3)])]);
      expect([e.set(), e.bar()]).toEqual([[], null]);
    });

    it('[s9-select] Backspace too; a selected container goes with its body; two apart in one go', async () => {
      const e = await editor([F(1), { id: 2, t: 'repeat', n: 2, body: [F(3), L(4)] }, R(5)]);
      await e.click('2', { shiftKey: true });
      await e.key('Backspace');
      expect(e.program()).toBe(JSON.stringify([F(1), R(5)]));
      expect(e.emits.length).toBe(1);
      expect(e.ws.getBlockById('3')).toBeNull();
      const two = await editor([F(1), L(2), F(3), R(4)]);
      await selectAll(two, ['1', '3']);
      await two.key('Delete');
      expect(two.program()).toBe(JSON.stringify([L(2), R(4)]));
      expect(two.emits.length).toBe(1);
    });

    it('[s9-select] the ▶ hat is never selected or deleted; Delete with nothing selected deletes nothing (no emit)', async () => {
      const e = await editor([F(1)]);
      await e.click('start', { shiftKey: true });
      expect(e.set()).toEqual([]);
      await e.key('Delete');
      expect([e.program(), e.emits.length, !!e.ws.getBlockById('start')]).toEqual([JSON.stringify([F(1)]), 0, true]);
      // Known-firing beside the absence: the same key with forward selected deletes it.
      await e.click('1', { shiftKey: true });
      await e.key('Delete');
      expect([e.program(), e.emits.length, !!e.ws.getBlockById('start')]).toEqual(['[]', 1, true]);
    });

    it('[s9-select] the bar: “Delete 1 block” / “Delete N blocks”, Done — and in French; its Delete deletes, its Done lets go', async () => {
      const e = await editor([F(1), F(2), F(3), L(4)]);
      await e.click('4', { shiftKey: true });
      expect(e.bar()).toEqual(['delete: Delete 1 block', 'done: Done']);
      await e.pressBar('done');
      expect([e.set(), e.bar()]).toEqual([[], null]);
      await selectAll(e, ['1', '2', '3']);
      expect(e.bar()).toEqual(['delete: Delete 3 blocks', 'fold: Fold into repeat ×3', 'done: Done']);
      await e.pressBar('delete');
      expect([e.program(), e.emits.length, e.bar()]).toEqual([JSON.stringify([L(4)]), 1, null]);
      const fr = await editor([F(1), F(2), F(3), L(4)], { language: 'fr' });
      await fr.click('4', { shiftKey: true });
      expect(fr.bar()).toEqual(['delete: Supprimer 1 bloc', 'done: Fini']);
      await fr.click('4', { shiftKey: true });
      await selectAll(fr, ['1', '2', '3']);
      expect(fr.bar()).toEqual(['delete: Supprimer 3 blocs', 'fold: Plier en « répéter ×3 »', 'done: Fini']);
      // The page's own word rows (Words) win over the node's, as for every iw4 word.
      const own = await editor([F(1)], { words: [{ key: 'iw4SelDone', en: 'All done', fr: 'Tout fini' }] });
      await own.click('1', { shiftKey: true });
      expect(own.bar()).toEqual(['delete: Delete 1 block', 'done: All done']);
    });

    it('[s9-select] fold: forward forward forward → repeat 3 { forward } — the first copy keeps its id, the repeat gets the next whole number; one emit', async () => {
      const e = await editor([F(1), F(2), F(3)]);
      await selectAll(e, ['1', '2', '3']);
      await e.pressBar('fold');
      const want = JSON.stringify([{ id: 4, t: 'repeat', n: 3, body: [F(1)] }]);
      expect(e.program()).toBe(want);
      expect(e.emits).toEqual([want]);
      expect([e.ws.getBlockById('2'), e.ws.getBlockById('3'), e.set(), e.bar()]).toEqual([null, null, [], null]);
    });

    it('[s9-select] fold: forward left forward left → repeat 2 { forward, left }; at the run’s place in the stack; inside a body', async () => {
      const e = await editor([F(1), L(2), F(3), L(4)]);
      await selectAll(e, ['1', '2', '3', '4']);
      expect(e.bar()).toContain('fold: Fold into repeat ×2');
      await e.pressBar('fold');
      expect(e.program()).toBe(JSON.stringify([{ id: 5, t: 'repeat', n: 2, body: [F(1), L(2)] }]));
      expect(e.emits.length).toBe(1);
      const mid = await editor([L(1), F(2), F(3), R(4)]);
      await selectAll(mid, ['3', '2']);
      await mid.pressBar('fold');
      expect(mid.program()).toBe(JSON.stringify([L(1), { id: 5, t: 'repeat', n: 2, body: [F(2)] }, R(4)]));
      const inner = await editor([{ id: 1, t: 'repeat', n: 2, body: [F(2), F(3), F(4)] }, L(5)]);
      await selectAll(inner, ['2', '3', '4']);
      await inner.pressBar('fold');
      expect(inner.program()).toBe(JSON.stringify([{ id: 1, t: 'repeat', n: 2, body: [{ id: 6, t: 'repeat', n: 3, body: [F(2)] }] }, L(5)]));
    });

    it('[s9-select] fold picks the SMALLEST copy (the higher count): six forwards → ×6, not 2 × 3; inside the repeat’s own count (1–9): twelve forwards → ×6 of two', async () => {
      const six = await editor([1, 2, 3, 4, 5, 6].map(F));
      await selectAll(six, ['1', '2', '3', '4', '5', '6']);
      expect(six.ed.foldPlan()).toMatchObject({ k: 6, p: 1 });
      const fl = await editor([F(1), L(2), F(3), L(4), F(5), L(6)]);
      await selectAll(fl, ['1', '2', '3', '4', '5', '6']);
      expect(fl.ed.foldPlan()).toMatchObject({ k: 3, p: 2 });
      const twelve = await editor([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(F));
      await selectAll(twelve, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
      expect(twelve.ed.foldPlan()).toMatchObject({ k: 6, p: 2 });
      await twelve.pressBar('fold');
      expect(twelve.program()).toBe(JSON.stringify([{ id: 13, t: 'repeat', n: 6, body: [F(1), F(2)] }]));
      // Copies are the page's fold's "same": a say with another text is not a copy.
      const says = await editor([{ id: 1, t: 'say', slots: { text: 'a' } }, { id: 2, t: 'say', slots: { text: 'b' } }]);
      await selectAll(says, ['1', '2']);
      expect(says.ed.foldPlan()).toBeNull();
    });

    it('[s9-select] fold is NOT offered for forward left forward, a set with a gap, a set across two lists, one block — or where the drawer has no repeat', async () => {
      const none = async (program: unknown[], ids: string[], props: Record<string, unknown> = {}) => {
        const e = await editor(program, props);
        await selectAll(e, ids);
        const before = e.program();
        const out = { ids: e.set(), plan: e.ed.foldPlan(), bar: e.bar(), folded: e.ed.multiFold(), same: e.program() === before, emits: e.emits.length };
        return out;
      };
      expect(await none([F(1), L(2), F(3)], ['1', '2', '3'])).toEqual({ ids: ['1', '2', '3'], plan: null, bar: ['delete: Delete 3 blocks', 'done: Done'], folded: false, same: true, emits: 0 });
      expect((await none([F(1), F(2), F(3)], ['1', '3'])).plan).toBeNull();
      expect((await none([F(1), { id: 2, t: 'repeat', n: 2, body: [F(3)] }], ['1', '3'])).plan).toBeNull();
      const loose = await editor([F(1)]);
      Blockly.serialization.blocks.append({ type: 'garden_forward', id: '9', x: 400, y: 40 }, loose.ws);
      await selectAll(loose, ['1', '9']);
      expect([loose.set(), loose.ed.foldPlan()]).toEqual([['1', '9'], null]);
      expect((await none([F(1)], ['1'])).plan).toBeNull();
      expect((await none([F(1), F(2)], ['1', '2'], { palette: pal(['fwd', 'left']) })).bar).toEqual(['delete: Delete 2 blocks', 'done: Done']);
      // Known-firing beside the absences: the same two forwards with repeat in the drawer fold.
      expect((await none([F(1), F(2)], ['1', '2'])).plan).toMatchObject({ k: 2, p: 1 });
    });

    it('[s9-select] the brain cap blocks neither: a full brain still folds (it never grows) and still deletes', async () => {
      const e = await editor([F(1), F(2), F(3)], { brainSize: 3 });
      await selectAll(e, ['1', '2', '3']);
      await e.pressBar('fold');
      expect(e.program()).toBe(JSON.stringify([{ id: 4, t: 'repeat', n: 3, body: [F(1)] }]));
      const two = await editor([F(1), F(2)], { brainSize: 2 });
      await selectAll(two, ['1', '2']);
      await two.pressBar('fold');
      expect(two.program()).toBe(JSON.stringify([{ id: 3, t: 'repeat', n: 2, body: [F(1)] }]));
      await two.click('3', { shiftKey: true });
      await two.key('Delete');
      expect(two.program()).toBe('[]');
    });

    it('[s9-select] one undo puts a fold back, and one undo puts a delete back (the events are one group)', async () => {
      const e = await editor([F(1), F(2), L(3)]);
      await selectAll(e, ['1', '2']);
      await e.pressBar('fold');
      expect(e.program()).toBe(JSON.stringify([{ id: 4, t: 'repeat', n: 2, body: [F(1)] }, L(3)]));
      e.ws.undo(false);
      await tick();
      expect(e.program()).toBe(JSON.stringify([F(1), F(2), L(3)]));
      await selectAll(e, ['1', '3']);
      await e.key('Delete');
      expect(e.program()).toBe(JSON.stringify([F(2)]));
      e.ws.undo(false);
      await tick();
      expect(e.program()).toBe(JSON.stringify([F(1), F(2), L(3)]));
    });

    it('[s9-select] a tablet has no shift key: the block menu’s “Select several” (a long press opens it) — then each tap toggles; Done, or a tap on the empty workspace, ends it', async () => {
      const reg = Blockly.ContextMenuRegistry.registry;
      const e = await editor([F(1), L(2), { id: 3, t: 'repeat', n: 2, body: [] }]);
      const b2 = e.ws.getBlockById('2');
      const menu = (b: any) => reg.getContextMenuOptions({ block: b, focusedNode: b }, null).map((o: any) => o.text);
      expect(menu(b2)).toEqual(['Help', 'Duplicate', 'Select several']);
      const item = reg.getItem('gardenSelectSeveral');
      expect(item.preconditionFn({ block: e.ws.getBlockById('start') })).toBe('hidden');
      expect(item.preconditionFn({ block: b2 })).toBe('enabled');
      item.callback({ block: b2 });
      await tick();
      expect([e.set(), e.root.classList.contains('gd-several'), e.bar()]).toEqual([['2'], true, ['delete: Delete 1 block', 'done: Done']]);
      await e.click('1');
      expect(e.set()).toEqual(['2', '1']);
      await e.click('2');
      expect(e.set()).toEqual(['1']);
      // A tap on a slot of a block (the repeat's count) toggles it too, and opens no picker.
      e.ws.getBlockById('3').getField('N').showEditor_();
      await tick();
      expect([e.set(), e.root.querySelector('.gd-picker')]).toEqual([['1', '3'], null]);
      await e.pressBar('done');
      expect([e.set(), e.root.classList.contains('gd-several'), e.bar()]).toEqual([[], false, null]);
      // After Done a tap is today's tap again.
      await e.click('2');
      expect([e.set(), e.ed.selected]).toEqual([[], '2']);
      // The empty workspace ends it too.
      item.callback({ block: e.ws.getBlockById('1') });
      await tick();
      await e.clickEmpty();
      expect([e.set(), e.root.classList.contains('gd-several'), e.bar()]).toEqual([[], false, null]);
      expect(e.emits).toEqual([]);
      // In French, in Blockly's menu (Duplicate is Blockly's own word: its French messages file is not loaded here).
      const fr = await editor([F(1)], { language: 'fr' });
      const frm = menu(fr.ws.getBlockById('1'));
      expect([frm.length, frm[0], frm[2]]).toEqual([3, 'Aide', 'Choisir plusieurs']);
    });

    it('[s9-select] while a run plays (Locked) nothing can be selected or deleted, and the menu item is gone', async () => {
      const e = await editor([F(1), F(2)]);
      await selectAll(e, ['1', '2']);
      e.p.locked = true;
      // The node hands every render's props to the editor's update().
      e.update();
      await tick();
      expect([e.set(), e.bar()]).toEqual([[], null]);
      await e.click('1', { shiftKey: true });
      await e.key('Delete');
      expect([e.set(), e.program()]).toEqual([[], JSON.stringify([F(1), F(2)])]);
      expect(Blockly.ContextMenuRegistry.registry.getItem('gardenSelectSeveral').preconditionFn({ block: e.ws.getBlockById('1') })).toBe('hidden');
    });

    it('[s9-select] the look: the set is marked on Blockly’s own path (the Zelos renderer’s .blocklyPath), the bar sits inside the node’s box; the words are the node’s own, EN and FR', () => {
      expect(node.css).toMatch(/\.gd-multi>\.blocklyPath\{[^}]*stroke:/);
      expect(node.css).toMatch(/\.gd-bk-sel\{position:absolute/);
      const sw = node.selWords as Record<string, { en: string; fr: string }>;
      expect(sw).toEqual({
        iw4SelSeveral: { en: 'Select several', fr: 'Choisir plusieurs' },
        iw4SelDel1: { en: 'Delete 1 block', fr: 'Supprimer 1 bloc' },
        iw4SelDelN: { en: 'Delete {n} blocks', fr: 'Supprimer {n} blocs' },
        iw4SelFold: { en: 'Fold into repeat ×{k}', fr: 'Plier en « répéter ×{k} »' },
        iw4SelDone: { en: 'Done', fr: 'Fini' }
      });
    });
  });
});
