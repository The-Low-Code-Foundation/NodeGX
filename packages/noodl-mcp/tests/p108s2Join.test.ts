/**
 * P108 session 2 — the join between lane B (the Blockly view, `garden-kit.Blocks`' translator) and lane J (the engine's
 * `evalCond` and seek ops). Neither lane could run this alone: B's worktree had no evaluator, J's had no Blockly.
 *
 * IW-004 AC4 at the engine: "until [eggs in basket] = 4" and "until [basket] is full", BUILT AS BLOCKLY BLOCKS, both win
 * the eggs job on the engine. Two traps the round-trip gate cannot see, because every block the translator writes carries
 * a memo of its engine block (`extraState.src`):
 *
 * - a block a child drags out fresh has NO memo — so the program is also run with every memo stripped;
 * - a child who edits a field (the 4 in `= 4`, the state in `is full`) must change the program even though the memo
 *   still says the old value — so the edited field must win over the memo.
 *
 * @module noodl-mcp/tests/p108s2Join.test
 */
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

import * as React from 'react';

import { ENGINE } from './cg002Scripts';

const BUILT = path.join(__dirname, '..', '..', '..', 'library', 'modules', 'garden-kit', 'project', 'noodl_modules', 'garden-kit', 'index.js');

function loadTranslate() {
  let kit: any = null;
  const ctx: Record<string, any> = { Noodl: { defineModule: (m: any) => (kit = m) }, React, console, setTimeout, clearTimeout };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(BUILT, 'utf8'), ctx, { filename: 'garden-kit/index.js' });
  return kit.reactNodes.find((n: any) => n.name === 'garden-kit.Blocks').translate;
}

const T = loadTranslate();
const E = new Function(`${ENGINE}; return { runToEnd: runToEnd };`)() as { runToEnd: (p: unknown, w: unknown, r: string, l: string) => any };

const BK = { id: 'bk', kind: 'basket', x: 0, y: 1 };
const G = (w: number, h: number) => Array.from({ length: h }, () => 'G'.repeat(w));
const EGG = (x: number, y: number) => ({ kind: 'egg', x, y });
const EGGS = () => ({ map: G(7, 3), things: [{ kind: 'basket', id: 'bk', x: 0, y: 1, count: 0, capacity: 4, item: 'egg' }, EGG(6, 0), EGG(6, 2), EGG(4, 0), EGG(4, 2), EGG(2, 2)], robots: [{ id: 'pip', x: 1, y: 1, d: 1 }] });
const body = () => [{ id: 2, t: 'go_nearest', slots: { kind: 'egg' } }, { id: 3, t: 'pick' }, { id: 4, t: 'go_to', slots: { thing: BK } }, { id: 5, t: 'put' }];
const COUNT4 = { op: 'cmp', cmp: 'eq', a: { op: 'count', what: 'egg', thing: BK }, b: { op: 'num', n: 4 } };
const FULL = { op: 'is', thing: BK, state: 'full' };
const program = (cond: unknown) => [{ id: 1, t: 'until', slots: { cond }, body: body() }];

/** Every block in a Blockly JSON state, wherever it sits (next, inputs). */
function blocksIn(node: any, out: any[] = []): any[] {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const n of node) blocksIn(n, out);
    return out;
  }
  if (typeof node.type === 'string') out.push(node);
  for (const k of Object.keys(node)) if (k !== 'extraState' && k !== 'fields') blocksIn(node[k], out);
  return out;
}
/** A child's program: the same blocks, dragged out fresh — no memo on any of them. */
function fresh(state: any) {
  const s = JSON.parse(JSON.stringify(state));
  for (const b of blocksIn(s)) if (b.extraState && 'src' in b.extraState) delete b.extraState.src;
  return s;
}
const play = (engineProgram: unknown, lang = 'en') => {
  const end = E.runToEnd(engineProgram, EGGS(), 'pip', lang);
  return { count: end.world.things.find((t: any) => t.id === 'bk').count, guard: end.run.guardHits, done: end.known };
};

describe('P108 s2 join — conditions built in Blockly run on the engine (IW-004 AC4, lanes B × J)', () => {
  it('the known-firing half: the engine program itself fills the basket to 4, both conditions, EN and FR', () => {
    for (const cond of [COUNT4, FULL]) for (const lang of ['en', 'fr']) expect(play(program(cond), lang)).toEqual({ count: 4, guard: 0, done: true });
  });

  it('🔴 dragged out fresh (no memo on any block): the Blockly program translates to a cond the engine evaluates, and the basket fills to 4', () => {
    for (const cond of [COUNT4, FULL]) {
      const state = fresh(T.toBlockly(program(cond)));
      expect(blocksIn(state).filter((b) => b.extraState && 'src' in b.extraState)).toEqual([]);
      const types = blocksIn(state).map((b) => b.type);
      expect(types).toEqual(expect.arrayContaining(['garden_until', 'garden_thing', 'garden_go_nearest', 'garden_go_to']));
      const back = T.toEngine(state);
      expect(back[0].slots.cond).toEqual(cond);
      expect(play(back)).toEqual({ count: 4, guard: 0, done: true });
    }
  });

  it('🔴 a child edits the number: `= 4` changed to `= 3` in the field wins over the memo, and Pip stops at 3', () => {
    const state = T.toBlockly(program(COUNT4));
    const nums = blocksIn(state).filter((b) => b.type === 'garden_number');
    expect(nums.map((b) => b.fields.NUM)).toEqual(['4']);
    nums[0].fields.NUM = '3';
    const back = T.toEngine(state);
    expect(back[0].slots.cond.b).toEqual({ op: 'num', n: 3 });
    expect(play(back)).toEqual({ count: 3, guard: 0, done: true });
  });

  it('🔴 a child edits the state: `is full` changed to `is empty` wins over the memo (the loop ends at once, nothing carried)', () => {
    const state = T.toBlockly(program(FULL));
    const iss = blocksIn(state).filter((b) => b.type === 'garden_is');
    expect(iss.map((b) => b.fields.STATE)).toEqual(['full']);
    iss[0].fields.STATE = 'empty';
    const back = T.toEngine(state);
    expect(back[0].slots.cond.state).toBe('empty');
    expect(play(back)).toEqual({ count: 0, guard: 0, done: true });
  });
});
