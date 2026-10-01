/**
 * P108 IW-008 (lane C) — the crew's gate: robot copies named and sent to plots by touch, a program copied between two
 * robots (a refusal names the first block the target cannot do, or says its brain is too small), a second robot on a
 * plot and reservation across the crew (no two robots on one egg), the island with the crew at CREW_CAP (home spots,
 * every pinned run ticked, the tick's time), My robots with a crew, and the 3D kit redrawing by robot, not the scene.
 *
 * Every family here is made the game's way: Add profile, Complete request (the Workshop's win), the base's `buyItem`
 * (the shop's one purchase rule), `Logic/Assign robot` and `Logic/Copy program` (this lane's) — never hand-written rows.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

import * as React from 'react';

import { BRAIN_SIZE, CREW_CAP, FREE_PLAY_PLOT, ISLAND_BASE, ISLAND_HOME, ISLAND_HOME_PLOT, PLOT_H, PLOT_W, REQUESTS, SHOP, WORDS } from './cg002Content';
import { ADD_PROFILE_SCRIPT, BRING_HOME_SCRIPT, COMPLETE_REQUEST_SCRIPT, DECODE_SAVE_SCRIPT, ENCODE_SAVE_SCRIPT, SAVE_HELPERS, helper, runScript } from './cg002Scripts';
import { PAGE_WORDS } from './cg003Content';
import { ALL_WORDS_JSON, ASSIGN_ROBOT_SCRIPT, COPY_PROGRAM_SCRIPT, CREW_CHIPS_SCRIPT, FAMILY_SCRIPT, ISLAND_CHOOSE_SCRIPT, ISLAND_ROWS_SCRIPT, ISLAND_WORLD_SCRIPT, JOB_ROBOT_SCRIPT, ROBOT_CARDS_SCRIPT } from './cg003Scripts';
import { ISLAND_TICK_SCRIPT } from './ig004Island';
import { CREW_CAN, CREW_RULES } from './iw008Crew';

const WORD_ROWS = JSON.parse(ALL_WORDS_JSON);
const REQ_ROWS = JSON.parse(JSON.stringify(REQUESTS));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const req = (id: string) => REQUESTS.find((r) => r.id === id)!;
const w = (lang: 'en' | 'fr', key: string) => String((PAGE_WORDS as any)[key]?.[lang] ?? (WORDS as any)[key]?.[lang] ?? '');
const fill = (t: string, vars: Record<string, unknown>) => Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), t);

// ── A family, the game's way ──
const kid = (lang = 'en', band = 2) => runScript(ADD_PROFILE_SCRIPT, { model: null, name: 'Ada', band, lang, robotName: 'Pip' }).model;
const win = (model: any, id: string, robotId = 'r1', program: unknown = clone(req(id).referenceProgram)) =>
  runScript(COMPLETE_REQUEST_SCRIPT, { model, requestId: id, tricks: req(id).tricks, reward: req(id).reward, program: JSON.stringify(program), robotId, now: 1759300000000 }).model;
const profile = (m: any) => m.profiles[0];
/** Buy a copy through the base's buyItem (earned first, as a run would pay): its new row's id. */
function buyCopy(m: any, kind: string, name: string) {
  const p = profile(m);
  // P108 IW-006 owed (lane O): the copy's price is SHOP's (was the literal 30).
  helper<number>(SAVE_HELPERS, 'earnShells', p, SHOP.find((i) => i.id === `robot:${kind}`)!.price);
  const out = helper<any>(SAVE_HELPERS, 'buyItem', p, `robot:${kind}`, { name });
  if (!out.ok) throw new Error(`buy ${kind}: ${out.error}`);
  return out.robotId as string;
}
const assign = (m: any, robotId: string, requestId: string, lang = 'en') => runScript(ASSIGN_ROBOT_SCRIPT, { model: m, robotId: `crew|${robotId}`, requestId, requests: REQ_ROWS, words: WORD_ROWS, lang, now: 1759300000001 });
const copy = (m: any, from: string, to: string, lang = 'en', band = 2) => runScript(COPY_PROGRAM_SCRIPT, { model: m, from, to: `x|copy|${to}`, words: WORD_ROWS, lang, band });
const rowOf = (m: any, id: string) => profile(m).island.robots.find((r: any) => r.id === id);
const nameOf = (m: any, id: string) => helper<any>(SAVE_HELPERS, 'robotRow', profile(m), rowOf(m, id)).name as string;

/** What the Island page computes from the stored family (Read family → Island world). */
function islandOf(model: any) {
  const fam = runScript(FAMILY_SCRIPT, { model: clone(model) });
  const world = runScript(ISLAND_WORLD_SCRIPT, { requests: REQ_ROWS, plots: fam.plots, robots: fam.robots, done: fam.done, band: fam.band, pins: [] });
  return { fam, world };
}
const inPlot = (t: { x: number; y: number }, p: { x: number; y: number }) => t.x >= p.x && t.x < p.x + PLOT_W && t.y >= p.y && t.y < p.y + PLOT_H;
/** Where a robot at home may stand: grass or path of the island's base, on the home slot or off every slot (a path, the shore). */
const SLOTS = [...REQUESTS.map((r) => r.plot!), FREE_PLAY_PLOT];
for (let sy = 1; sy + PLOT_H < 22; sy += PLOT_H + 1) for (let sx = 1; sx + PLOT_W < ISLAND_BASE[0].length; sx += PLOT_W + 1) SLOTS.push({ x: sx, y: sy });
const homeTile = (x: number, y: number) => /^[GP]$/.test((ISLAND_BASE[y] || '').charAt(x)) && (inPlot({ x, y }, ISLAND_HOME_PLOT) || !SLOTS.some((p) => inPlot({ x, y }, p)));

/** Pip's four jobs won by Pip in turn (he moves each time; each plot he leaves keeps the program that won it). */
const PIP_WINS = ['wall-until', 'tulip-door', 'path-postbox', 'tulips-three'];
function pipFamily() {
  let m = kid();
  for (const id of PIP_WINS) m = win(m, id);
  const ids = ['Bubbles', 'Sprout', 'Nimbus'].map((n) => buyCopy(m, 'pip', n));
  return { m, ids };
}

/**
 * The crew at its cap (CREW_CAP = 12), every robot at work: Pip's seven jobs won by Pip, Cobble's three by Cobble,
 * Pocket's eggs by Pocket, Echo's flowers by Echo; five Pip copies, two Cobble copies and one Pocket copy bought and
 * sent — Pocket 2 to HELP Pocket on the eggs (the second robot on a plot, AC3).
 */
function capFamily() {
  let m = kid();
  for (const id of ['path-postbox', 'tulip-door', 'tulips-three', 'wall-until', 'meow-when', 'rows-trick', 'mamie-note']) m = win(m, id);
  for (const id of ['path-stones', 'bowl-if', 'sami-bench']) m = win(m, id, 'cobble');
  for (const id of ['letter-say', 'eggs-count']) m = win(m, id, 'pocket');
  m = win(m, 'rock-flower', 'echo');
  const sends: Array<[string, string, string]> = [
    ['pip', 'Pip 2', 'path-postbox'], ['pip', 'Pip 3', 'tulip-door'], ['pip', 'Pip 4', 'tulips-three'], ['pip', 'Pip 5', 'wall-until'], ['pip', 'Pip 6', 'meow-when'],
    ['cobble', 'Cobble 2', 'path-stones'], ['cobble', 'Cobble 3', 'bowl-if'], ['pocket', 'Pocket 2', 'eggs-count']
  ];
  for (const [kind, name, plot] of sends) {
    const id = buyCopy(m, kind, name);
    const a = assign(m, id, plot);
    if (!a.ok) throw new Error(`send ${name} → ${plot}: ${a.error}`);
    m = a.model;
  }
  return m;
}

describe('IW-008 — the crew: save fields (a robot row’s program and the plot it helps on)', () => {
  it('🔴 a robot’s program and the plot it helps on round-trip through the save code, byte-stable; a family with neither packs exactly as the base did', () => {
    const { m: m0, ids } = pipFamily();
    let m = assign(m0, ids[0], 'tulip-door').model;
    m = assign(m, ids[1], 'tulips-three').model;
    const bubbles = rowOf(m, ids[0]);
    const sprout = rowOf(m, ids[1]);
    expect([profile(m).island.plots['tulip-door'].robotId, bubbles.helps, sprout.helps, Array.isArray(sprout.program)]).toEqual([ids[0], undefined, 'tulips-three', true]);
    const back = runScript(BRING_HOME_SCRIPT, { model: m, robotId: 'r1' }).model;
    expect(rowOf(back, 'r1').program).toEqual(req('tulips-three').referenceProgram);
    const enc = runScript(ENCODE_SAVE_SCRIPT, { model: m });
    const dec = runScript(DECODE_SAVE_SCRIPT, { code: enc.code });
    expect([dec.ok, dec.migrated, dec.model]).toEqual([true, false, helper<any>(SAVE_HELPERS, 'modelOf', clone(m))]);
    expect(runScript(ENCODE_SAVE_SCRIPT, { model: dec.model }).code).toBe(enc.code);
    // r1 carrying a program is a row (8 fields: brain null); a helper's row has 9.
    const encBack = JSON.parse(Buffer.from(runScript(ENCODE_SAVE_SCRIPT, { model: back }).code.slice(4), 'base64url').toString('utf8'));
    expect(encBack.p[0][14][0]).toEqual(['r1', '', '', '', '', '', null, req('tulips-three').referenceProgram]);
    const packed = JSON.parse(Buffer.from(enc.code.slice(4), 'base64url').toString('utf8'));
    expect(packed.p[0][14].find((r: any) => Array.isArray(r) && r[0] === ids[1]).slice(6)).toEqual([null, req('tulips-three').referenceProgram, 'tulips-three']);
    // Known-firing beside the absence: a family with no crew field packs rows of 6 (no trailing nulls), as the base did.
    const plain = JSON.parse(Buffer.from(runScript(ENCODE_SAVE_SCRIPT, { model: pipFamily().m }).code.slice(4), 'base64url').toString('utf8'));
    expect(plain.p[0][14].map((r: any) => (Array.isArray(r) ? r.length : r))).toEqual(['r1', 6, 6, 6, 6]);
  });

  it('🔴 a hand-edited crew is made sound: a helper only beside a robot pinned there, with a program, one per plot, never while pinned itself; a program of no blocks dropped', () => {
    const raw = {
      v: 5,
      profiles: [{ id: 'p', name: 'A', island: {
        done: ['a', 'b'],
        plots: { a: { program: [{ id: 1, t: 'fwd' }], robotId: 'r1', wonAt: 1 }, b: { program: [{ id: 1, t: 'fwd' }], robotId: '', wonAt: 2 } },
        robots: [
          { id: 'r1', helps: 'a', program: [{ id: 1, t: 'left' }] },
          { id: 'x1', kind: 'pip', helps: 'a', program: [{ id: 1, t: 'left' }] },
          { id: 'x2', kind: 'pip', helps: 'a', program: [{ id: 1, t: 'right' }] },
          { id: 'x3', kind: 'pip', helps: 'b', program: [{ id: 1, t: 'left' }] },
          { id: 'x4', kind: 'pip', helps: 'a' },
          { id: 'x5', kind: 'pip', helps: 'free', program: [] }
        ]
      } }],
      island: { activeId: 'p' }
    };
    const m = helper<any>(SAVE_HELPERS, 'modelOf', raw);
    expect(m.island.robots.map((r: any) => [r.id, r.helps || '', (r.program || []).length])).toEqual([['r1', '', 1], ['x1', 'a', 1], ['x2', '', 1], ['x3', '', 1], ['x4', '', 0], ['x5', '', 0]]);
  });

  it('bring home: a robot at work keeps the program it ran; a helper leaves the plot it helped on (the plot and its robot stay)', () => {
    const { m: m0, ids } = pipFamily();
    const m = assign(m0, ids[1], 'tulips-three').model;
    const home = runScript(BRING_HOME_SCRIPT, { model: m, robotId: ids[1] });
    expect([home.freed, rowOf(home.model, ids[1]).helps, profile(home.model).island.plots['tulips-three'].robotId]).toEqual(['tulips-three', undefined, 'r1']);
    expect(rowOf(home.model, ids[1]).program).toEqual(req('tulips-three').referenceProgram);
  });
});

describe('IW-008 AC1 — buy, name and send three copies; each works its own plot; the save round-trips', () => {
  it('🔴 three named copies sent by touch (the plot card’s crew chips) each work a plot Pip won — the program that won it — while Pip works his', () => {
    const { m: m0, ids } = pipFamily();
    expect(ids.map((id) => nameOf(m0, id))).toEqual(['Bubbles', 'Sprout', 'Nimbus']);
    let m = m0;
    const plan: Array<[string, string]> = [[ids[0], 'tulip-door'], [ids[1], 'path-postbox'], [ids[2], 'wall-until']];
    for (const [id, plot] of plan) {
      const a = assign(m, id, plot);
      expect([a.ok, a.role, a.told.text]).toEqual([true, 'works', fill(w('en', 'iw8cSent'), { r: nameOf(m, id) })]);
      m = a.model;
    }
    const plots = profile(m).island.plots;
    expect(plan.map(([id, plot]) => [plots[plot].robotId, plots[plot].program])).toEqual(plan.map(([id, plot]) => [id, req(plot).referenceProgram]));
    expect(plots['tulips-three'].robotId).toBe('r1');
    // On the island: four robots at work, each drawn on its own plot on every tick for 120 ticks, each one moving.
    const is = islandOf(m);
    expect(is.world.working).toBe(4);
    let state = is.world.state;
    const seen: Record<string, Set<string>> = {};
    const where = { r1: 'tulips-three', ...Object.fromEntries(plan.map(([id, plot]) => [id, plot])) } as Record<string, string>;
    for (let t = 0; t < 120; t++) {
      const out = runScript(ISLAND_TICK_SCRIPT, { state });
      state = out.state;
      for (const r of out.world.robots.filter((x: any) => !x.home)) {
        expect(inPlot(r, req(where[r.id]).plot!)).toBe(true);
        (seen[r.id] = seen[r.id] || new Set()).add(`${r.x},${r.y},${r.d}`);
      }
    }
    expect(Object.keys(where).map((id) => seen[id] && seen[id].size > 3)).toEqual([true, true, true, true]);
    // The save code round-trips the crew.
    const back = runScript(DECODE_SAVE_SCRIPT, { code: runScript(ENCODE_SAVE_SCRIPT, { model: m }).code }).model;
    expect(back).toEqual(helper<any>(SAVE_HELPERS, 'modelOf', clone(m)));
  });

  it('🔴 the Workshop’s robot for a job is the one at work there, else one of that kind at home — a free copy opens a plot Pip’s being busy used to block', () => {
    const { m: m0, ids } = pipFamily();
    const m = assign(m0, ids[0], 'tulip-door').model;
    const fam = runScript(FAMILY_SCRIPT, { model: m });
    const job = (id: string) => runScript(JOB_ROBOT_SCRIPT, { requests: REQ_ROWS, requestId: id, robots: fam.robots, plots: fam.plots, lang: 'en' }).robotId;
    expect([job('tulip-door'), job('tulips-three'), job('rows-trick')]).toEqual([ids[0], 'r1', ids[1]]);
    const rows = runScript(ISLAND_ROWS_SCRIPT, { requests: REQ_ROWS, band: 2, done: fam.done, plots: fam.plots, robots: fam.robots, words: WORD_ROWS, lang: 'en', botName: 'Pip' }).rows;
    expect(rows.find((r: any) => r.id === 'rows-trick').blocked).toBe(false);
    // Known-firing beside it: with no Pip at home (every copy sent), the same request is blocked, as IG-004 says.
    let busy = m;
    busy = assign(busy, ids[1], 'path-postbox').model;
    busy = assign(busy, ids[2], 'wall-until').model;
    const fam2 = runScript(FAMILY_SCRIPT, { model: busy });
    const rows2 = runScript(ISLAND_ROWS_SCRIPT, { requests: REQ_ROWS, band: 2, done: fam2.done, plots: fam2.plots, robots: fam2.robots, words: WORD_ROWS, lang: 'en', botName: 'Pip' }).rows;
    expect(rows2.find((r: any) => r.id === 'rows-trick').blocked).toBe(true);
    // The plot card: a copy at home opens the plot; the robot at work there is the one it offers home.
    const is = islandOf(m);
    const card = (id: string) => runScript(ISLAND_CHOOSE_SCRIPT, { requestId: id, cards: is.world.cards, requests: REQ_ROWS, plots: fam.plots, robots: fam.robots, words: WORD_ROWS, lang: 'en', botName: 'Pip' });
    expect([card('tulip-door').robotId, card('tulip-door').showHome, card('rows-trick').canOpen, card('rows-trick').robotId]).toEqual([ids[0], true, true, ids[1]]);
  });

  it('🔴 the send rules: a job of another kind, a plot not won, nothing to run are refused in words; tapped where it works it comes home with the program; a robot moved on leaves its plot’s program for the next', () => {
    const { m, ids } = pipFamily();
    let mm = m;
    // Cobble came with path-postbox's win: a copy of him cannot take Pip's job.
    const cobble2 = buyCopy(mm, 'cobble', 'Rubble');
    expect(assign(mm, cobble2, 'tulip-door')).toMatchObject({ ok: false, error: 'kind' });
    expect(assign(mm, ids[0], 'rows-trick')).toMatchObject({ ok: false, error: 'open' });
    const teachMe = helper<any>(SAVE_HELPERS, 'modelOf', clone(mm));
    profile(teachMe).island.plots['tulip-door'].program = null;
    profile(teachMe).island.plots['tulip-door'].robotId = '';
    const t = assign(teachMe, ids[0], 'tulip-door');
    expect([t.ok, t.error, t.told.text]).toEqual([false, 'teach', fill(w('en', 'iw8cTeach'), { r: 'Bubbles' })]);
    // Sent, then moved: tulip-door keeps its program for the next robot; wall-until runs ITS program (the one that won it).
    mm = assign(mm, ids[0], 'tulip-door').model;
    const moved = assign(mm, ids[0], 'wall-until');
    expect([moved.role, profile(moved.model).island.plots['tulip-door'].robotId, profile(moved.model).island.plots['tulip-door'].program, profile(moved.model).island.plots['wall-until'].program]).toEqual(['works', '', req('tulip-door').referenceProgram, req('wall-until').referenceProgram]);
    // Tapped again where it works: home, the program it ran kept on it, the plot kept as won.
    const home = assign(moved.model, ids[0], 'wall-until');
    expect([home.role, home.told.text, profile(home.model).island.plots['wall-until'].robotId, rowOf(home.model, ids[0]).program]).toEqual(['home', fill(w('en', 'iw8cGoneHome'), { r: 'Bubbles' }), '', req('wall-until').referenceProgram]);
    // A plot with nobody on it and no program of its own takes the program the robot carries (the person sentence).
    const bare = helper<any>(SAVE_HELPERS, 'modelOf', clone(home.model));
    profile(bare).island.plots['tulip-door'].program = null;
    const carried = assign(bare, ids[0], 'tulip-door');
    expect([carried.role, profile(carried.model).island.plots['tulip-door'].program]).toEqual(['works', req('wall-until').referenceProgram]);
  });
});

describe('IW-008 AC2 — copy a program between two robots; a refusal names the block, or the brain', () => {
  it('🔴 Pip’s program onto a copy at home: the copy knows it (its row); onto a robot at work: its plot runs it at once', () => {
    const { m, ids } = pipFamily();
    const a = copy(m, 'r1', ids[2]);
    expect([a.ok, a.told.robotId, a.told.text]).toEqual([true, ids[2], fill(w('en', 'iw8cCopied'), { r: 'Nimbus', f: 'Pip' })]);
    expect(rowOf(a.model, ids[2]).program).toEqual(req('tulips-three').referenceProgram);
    const atWork = assign(a.model, ids[0], 'tulip-door').model;
    const b = copy(atWork, 'r1', ids[0]);
    expect([b.ok, profile(b.model).island.plots['tulip-door'].program]).toEqual([true, req('tulips-three').referenceProgram]);
    const fr = copy(m, 'r1', ids[2], 'fr');
    expect(fr.told.text).toBe(fill(w('fr', 'iw8cCopied'), { r: 'Nimbus', f: 'Pip' }));
  });

  it('🔴 refused: a block the target’s kind cannot place is NAMED (the first in reading order, in her words, EN and FR, both bands); a brain too small says both numbers; nothing to copy says so; nothing changes', () => {
    let m = win(kid(), 'path-postbox'); // lends Cobble
    m = win(m, 'tulips-three');
    const before = clone(helper<any>(SAVE_HELPERS, 'modelOf', clone(m)));
    // tulips-three: repeat { fill … water … } — Cobble can move and pick, but not fill the can: fill comes first.
    const en = copy(m, 'r1', 'cobble');
    expect([en.ok, en.error, en.told.robotId]).toEqual([false, 'block', 'cobble']);
    expect(en.told.text).toBe(fill(w('en', 'iw8cNoBlock'), { r: 'Cobble', f: 'Pip', blk: w('en', 'bFill') }));
    expect(copy(m, 'r1', 'cobble', 'fr').told.text).toBe(fill(w('fr', 'iw8cNoBlock'), { r: 'Cobble', f: 'Pip', blk: (WORDS as any).bFill.fr }));
    expect(copy(m, 'r1', 'cobble', 'en', 1).told.text).toContain(`“${(WORDS as any).cFill.en}”`);
    expect(en.model).toEqual(before);
    // The brain: a program of 14 blocks onto a robot of BRAIN_SIZE (12); the same onto one whose brain is 16 goes.
    const long = [{ id: 1, t: 'repeat', n: 2, body: Array.from({ length: 13 }, (_, i) => ({ id: 10 + i, t: i % 2 ? 'left' : 'fwd' })) }];
    const b = win(kid(), 'tulip-door', 'r1', long);
    const small = buyCopy(b, 'pip', 'Tiny');
    const big = buyCopy(b, 'pip', 'Big');
    helper<number>(SAVE_HELPERS, 'earnShells', profile(b), SHOP.find((i) => i.id === 'brain16')!.price);
    expect(helper<any>(SAVE_HELPERS, 'buyItem', profile(b), 'brain16', { robotId: big }).ok).toBe(true);
    const tooSmall = copy(b, 'r1', small);
    expect([tooSmall.ok, tooSmall.error, tooSmall.told.text]).toEqual([false, 'brain', fill(w('en', 'iw8cNoBrain'), { f: 'Pip', r: 'Tiny', k: 14, n: BRAIN_SIZE })]);
    expect(copy(b, 'r1', big).ok).toBe(true);
    // Nothing to copy: a copy that knows nothing; and a robot onto itself.
    const none = copy(b, small, big);
    expect([none.ok, none.error, none.told.robotId, none.told.text]).toEqual([false, 'none', small, fill(w('en', 'iw8cNoProgram'), { f: 'Tiny' })]);
    expect(copy(b, 'r1', 'r1').error).toBe('same');
  });

  it('what each kind can place is the moves, the controls and its own blocks — Pip cannot say, Cobble cannot water, Pocket reads with Olive, Echo says thanks', () => {
    const can = (k: string, t: string) => CREW_CAN[k].includes(t);
    expect([can('pip', 'say'), can('cobble', 'water'), can('cobble', 'pick'), can('pocket', 'olive:read'), can('echo', 'olive:say-thanks'), can('pip', 'go_nearest'), can('cobble', 'repeat')]).toEqual([false, false, true, true, true, true, true]);
    // An ask by rung reads as its olive block.
    const chk = (prog: unknown, kind: string) => helper<any>(SAVE_HELPERS + CREW_RULES, 'crewCheck', prog, kind, 12);
    expect(chk([{ id: 1, t: 'ask', slots: { rung: 'say-thanks' } }], 'pip')).toMatchObject({ ok: false, block: 'olive:say-thanks' });
    expect(chk([{ id: 1, t: 'if', slots: {}, body: [{ id: 2, t: 'fwd' }], else: [{ id: 3, t: 'say' }] }], 'cobble')).toMatchObject({ ok: false, block: 'say', n: 3 });
  });
});

describe('IW-008 AC3 — reservation across the crew: two robots on one pen never go for the same egg', () => {
  function eggsIsland() {
    let m = win(kid(), 'path-postbox');
    m = win(m, 'bowl-if', 'cobble'); // lends Pocket
    m = win(m, 'eggs-count', 'pocket');
    const p2 = buyCopy(m, 'pocket', 'Pocket 2');
    const a = runScript(ASSIGN_ROBOT_SCRIPT, { model: m, robotId: `crew|${p2}`, requestId: 'eggs-count', requests: REQ_ROWS, words: WORD_ROWS, lang: 'en' });
    return { a, p2 };
  }
  const targetOf = (run: any) => {
    const s = run && Array.isArray(run.steps) ? run.steps[run.pc] : null;
    return s && s.op === 'seek' && s.target ? String(s.target.id) : '';
  };
  function drive(tickScript: string, ticks: number, model: any) {
    let state = islandOf(model).world.state;
    const out = { clash: 0, picks: { pocket: 0, mate: 0 }, reservedBy: new Set<string>(), bothWalked: 0, outside: 0 };
    const plot = req('eggs-count').plot!;
    for (let t = 0; t < ticks; t++) {
      const next = runScript(tickScript, { state });
      state = next.state;
      const live = state.live['eggs-count'];
      const a = targetOf(live.run);
      const b = live.mate ? targetOf(live.mate.run) : '';
      if (a && b) out.bothWalked++;
      if (a && b && a === b) out.clash++;
      for (const k of Object.keys(live.reserved || {})) out.reservedBy.add(String(live.reserved[k]));
      if (live.delta && live.delta.pick) out.picks.pocket++;
      if (live.mate && live.mate.delta && live.mate.delta.pick) out.picks.mate++;
      for (const r of next.world.robots.filter((x: any) => x.plot === 'eggs-count')) if (!inPlot(r, plot)) out.outside++;
    }
    return { out, state };
  }

  it('🔴 Pocket 2 sent to Pocket’s eggs HELPS (its own copy of the plot’s program): both on the pen, both picking, never both walking to one egg, never off the plot', () => {
    const { a, p2 } = eggsIsland();
    expect([a.ok, a.role, a.told.text]).toEqual([true, 'helps', fill(w('en', 'iw8cHelping'), { r: 'Pocket 2', m: 'Pocket' })]);
    const is = islandOf(a.model);
    const plot = is.world.state.plots.find((p: any) => p.id === 'eggs-count');
    expect([plot.robotId, plot.mate && plot.mate.robotId]).toEqual(['pocket', p2]);
    const { out } = drive(ISLAND_TICK_SCRIPT, 400, a.model);
    console.log(`IW-008 AC3: 400 ticks, Pocket + Pocket 2 on the eggs — picks ${out.picks.pocket} + ${out.picks.mate}, ticks both walking ${out.bothWalked}, clashes ${out.clash}, reserved by ${[...out.reservedBy].join(', ')}`);
    expect(out.clash).toBe(0);
    expect(out.bothWalked).toBeGreaterThan(5);
    expect(out.picks.pocket).toBeGreaterThan(0);
    expect(out.picks.mate).toBeGreaterThan(0);
    expect([...out.reservedBy].sort()).toEqual(['pocket', p2].sort());
    expect(out.outside).toBe(0);
  });

  it('arm: a seek that ignores another robot’s reservation → the two robots walk to one egg (the clash row fails)', () => {
    const anchor = 'if (isSet(t.id) && res[String(t.id)] && res[String(t.id)] !== r.id) continue;';
    expect(ISLAND_TICK_SCRIPT.split(anchor)).toHaveLength(2);
    const { a } = eggsIsland();
    const { out } = drive(ISLAND_TICK_SCRIPT.replace(anchor, ''), 400, a.model);
    expect(out.clash).toBeGreaterThan(0);
  });

  it('a third robot on the same plot is refused ("two robots already work here"), and the helper tapped again comes home', () => {
    const { a, p2 } = eggsIsland();
    const m = a.model;
    const p3 = buyCopy(m, 'pocket', 'Pocket 3');
    const third = assign(m, p3, 'eggs-count');
    expect([third.ok, third.error, third.told.text]).toEqual([false, 'full', w('en', 'iw8cFull')]);
    const home = assign(m, p2, 'eggs-count');
    expect([home.role, rowOf(home.model, p2).helps]).toEqual(['home', undefined]);
    expect(islandOf(home.model).world.state.plots.find((p: any) => p.id === 'eggs-count').mate).toBeUndefined();
  });
});

describe('IW-008 AC4 / AC5 — the island with the crew at its cap', () => {
  it(`🔴 ${CREW_CAP} robots at home stand on ${CREW_CAP} different tiles round home, each grass or path (never the house, the pond, a tree, a rock or another plot), the four IG-005 spots first`, () => {
    const m = kid();
    for (let i = 1; i < CREW_CAP; i++) buyCopy(m, 'pip', `P${i}`);
    expect(helper<any>(SAVE_HELPERS, 'buyItem', profile(m), 'robot:pip').error).toBe('cap');
    const is = islandOf(m);
    const at = is.world.world.robots.filter((r: any) => r.home);
    expect(at.length).toBe(CREW_CAP);
    expect(new Set(at.map((r: any) => `${r.x},${r.y}`)).size).toBe(CREW_CAP);
    expect(at.filter((r: any) => !homeTile(r.x, r.y)).map((r: any) => [r.x, r.y])).toEqual([]);
    expect(at.slice(0, 4).map((r: any) => [r.x - ISLAND_HOME.x, r.y - ISLAND_HOME.y])).toEqual([[0, 0], [3, 2], [5, 0], [-1, 2]]);
    // Spread: every robot at home at least two tiles (Chebyshev) from every other.
    const near = at.flatMap((a: any, i: number) => at.slice(i + 1).filter((b: any) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) < 2).map((b: any) => [a.x, a.y, b.x, b.y]));
    expect(near).toEqual([]);
  });

  it(`🔴 the crew at its cap (${CREW_CAP}): every robot at work on its own plot (one helping), every pinned run stepped each tick, 300 ticks under 5 ms a tick (p95), each robot moving`, () => {
    const m = capFamily();
    expect(profile(m).island.robots.length).toBe(CREW_CAP);
    const { world } = islandOf(m);
    expect(world.world.robots.filter((r: any) => !r.home).length).toBe(CREW_CAP);
    let state = world.state;
    const ctx = vm.createContext({});
    const s = new vm.Script(`(function (Inputs, Outputs) {\n${ISLAND_TICK_SCRIPT}\n})(Inputs, Outputs);`);
    const ms: number[] = [];
    const seen: Record<string, Set<string>> = {};
    for (let t = 0; t < 300; t++) {
      const Outputs: Record<string, any> = {};
      const t0 = process.hrtime.bigint();
      ctx.Inputs = { state };
      ctx.Outputs = Outputs;
      s.runInContext(ctx);
      ms.push(Number(process.hrtime.bigint() - t0) / 1e6);
      state = Outputs.state;
      for (const r of Outputs.world.robots.filter((x: any) => !x.home)) {
        const plot = req(r.plot).plot!;
        if (!inPlot(r, plot)) throw new Error(`${r.id} off its plot ${r.plot} at tick ${t}`);
        (seen[r.id] = seen[r.id] || new Set()).add(`${r.x},${r.y},${r.d}`);
      }
    }
    const sorted = [...ms].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(ms.length * 0.95)];
    console.log(`IW-008 AC4 tick: 300 ticks × ${CREW_CAP} robots at work (11 plots, one with two) — p95 ${p95.toFixed(3)} ms, max ${sorted[sorted.length - 1].toFixed(3)} ms`);
    expect(p95).toBeLessThan(5);
    expect(Object.keys(seen).length).toBe(CREW_CAP);
    expect(Object.values(seen).every((v) => v.size > 1)).toBe(true);
    // The save code round-trips the whole crew.
    expect(runScript(DECODE_SAVE_SCRIPT, { code: runScript(ENCODE_SAVE_SCRIPT, { model: m }).code }).model).toEqual(helper<any>(SAVE_HELPERS, 'modelOf', clone(m)));
  });
});

describe('IW-008 AC5 — My robots with a crew; the plot card’s crew row', () => {
  const cards = (m: any, told: unknown = null, band = 2) => {
    const fam = runScript(FAMILY_SCRIPT, { model: m });
    return runScript(ROBOT_CARDS_SCRIPT, { robots: fam.robots, hats: fam.hats, band, lang: 'en', words: WORD_ROWS, requests: REQ_ROWS, told }).cards;
  };
  it('🔴 a card per robot she has (copies beside their kind’s first), a locked card per kind not lent yet; every card and every chip id unique; its brain, what it knows, where it works or helps', () => {
    const { m: m0, ids } = pipFamily();
    let m = assign(m0, ids[0], 'tulip-door').model;
    m = assign(m, ids[1], 'tulips-three').model;
    const cs = cards(m);
    expect(cs.map((c: any) => [c.id, c.name, c.owned])).toEqual([['pip', 'Pip', true], [ids[0], 'Bubbles', true], [ids[1], 'Sprout', true], [ids[2], 'Nimbus', true], ['cobble', 'Cobble', true], ['pocket', 'Pocket', false], ['echo', 'Echo', false]]);
    const allIds = cs.flatMap((c: any) => [c.id, ...c.paints.map((x: any) => x.id), ...c.hats.map((x: any) => x.id), ...c.abilities.map((x: any) => x.id), ...c.copyChips.map((x: any) => x.id)]);
    expect(new Set(allIds).size).toBe(allIds.length);
    const byId = (id: string) => cs.find((c: any) => c.id === id);
    const tulipsTitle = w('en', req('tulips-three').copyKeys.title);
    expect(byId('pip').brainText).toBe(fill(w('en', 'iw8cBrainText'), { n: BRAIN_SIZE, knows: fill(w('en', 'iw8cKnows'), { k: 11 }) }));
    expect(byId(ids[2]).brainText).toBe(fill(w('en', 'iw8cBrainText'), { n: BRAIN_SIZE, knows: w('en', 'iw8cKnowsNone') }));
    expect(byId(ids[1]).whereText).toBe(fill(w('en', 'iw8cHelpsOn'), { plot: tulipsTitle }));
    expect([byId('pip').hasCopy, byId('pip').copyChips.length, byId(ids[2]).hasCopy, byId(ids[2]).copyChips.length]).toEqual([true, 4, false, 0]);
    expect(byId('cobble').tag).toBe(fill(w('en', 'ig5LentBy'), { who: w('en', 'islSami') }));
    expect(byId(ids[0]).tag).toBe(w('en', 'ig5Yours'));
    // What a copy said rides on the card it was said on, and only there.
    const said = cards(m, { robotId: ids[2], text: 'hello', ok: true });
    expect(said.filter((c: any) => c.hasSaid).map((c: any) => [c.id, c.saidText])).toEqual([[ids[2], 'hello']]);
  });

  it('🔴 the plot card’s crew row: her robots of the job’s kind (the ones here ringed, who works and who helps in words), only on a plot she won and only with two of that kind; a tap’s line on that plot’s card only', () => {
    const { m: m0, ids } = pipFamily();
    const m = assign(m0, ids[1], 'tulips-three').model;
    const { fam, world } = islandOf(m);
    const chips = (id: string, told: unknown = null) => runScript(CREW_CHIPS_SCRIPT, { requestId: id, requests: REQ_ROWS, cards: world.cards, plots: fam.plots, robots: fam.robots, words: WORD_ROWS, lang: 'en', told });
    const t = chips('tulips-three');
    expect([t.show, t.rows.map((r: any) => [r.label, r.selected]), t.hereText]).toEqual([true, [['Pip', true], ['Bubbles', false], ['Sprout', true], ['Nimbus', false]], `${fill(w('en', 'iw8cWorks'), { r: 'Pip' })} · ${fill(w('en', 'iw8cHelps'), { r: 'Sprout' })}`]);
    expect(chips('rows-trick').show).toBe(false); // not won
    expect(chips('path-stones').show).toBe(false); // not won, and one Cobble
    expect(chips('tulips-three', { requestId: 'tulips-three', text: 'hi' }).saidText).toBe('hi');
    expect(chips('tulip-door', { requestId: 'tulips-three', text: 'hi' }).saidText).toBe('');
    // Known-firing beside "two of that kind": Pip alone on his plot shows no crew row.
    const alone = islandOf(win(kid(), 'tulips-three'));
    expect(runScript(CREW_CHIPS_SCRIPT, { requestId: 'tulips-three', requests: REQ_ROWS, cards: alone.world.cards, plots: alone.fam.plots, robots: alone.fam.robots, words: WORD_ROWS, lang: 'en' }).show).toBe(false);
  });
});

describe('IW-008 — arms: each crew rule mutated, and the row that kills it', () => {
  const mutate = (script: string, from: string, to: string) => {
    if (script.split(from).length !== 2) throw new Error(`the arm's anchor must occur exactly once: ${from}`);
    return script.replace(from, to);
  };
  it('the copy ignores what the target’s kind can place → Pip’s watering program lands on Cobble (the refusal row fails)', () => {
    const m = win(win(kid(), 'path-postbox'), 'tulips-three');
    const bad = mutate(COPY_PROGRAM_SCRIPT, 'if (can.indexOf(t) === -1) { first = t; return; }', '');
    expect(runScript(bad, { model: m, from: 'r1', to: 'x|copy|cobble', words: WORD_ROWS, lang: 'en' }).ok).toBe(true);
  });
  it('the copy ignores the brain → a 14-block program lands in a 12-block brain (the brain row fails)', () => {
    const long = [{ id: 1, t: 'repeat', n: 2, body: Array.from({ length: 13 }, (_, i) => ({ id: 10 + i, t: 'fwd' })) }];
    const b = win(kid(), 'tulip-door', 'r1', long);
    const small = buyCopy(b, 'pip', 'Tiny');
    const bad = mutate(COPY_PROGRAM_SCRIPT, 'if (n > brain) return', 'if (false) return');
    expect(runScript(bad, { model: b, from: 'r1', to: `x|copy|${small}`, words: WORD_ROWS, lang: 'en' }).ok).toBe(true);
  });
  it('the save keeps any helper → two helpers on one plot (the hand-edit row fails)', () => {
    const bad = mutate(SAVE_HELPERS, '  crewHelps(robots, plots);\n', '');
    const raw = { v: 5, profiles: [{ id: 'p', island: { done: ['a'], plots: { a: { program: [{ id: 1, t: 'fwd' }], robotId: 'r1', wonAt: 1 } }, robots: [{ id: 'x1', kind: 'pip', helps: 'a', program: [{ id: 1, t: 'fwd' }] }, { id: 'x2', kind: 'pip', helps: 'a', program: [{ id: 1, t: 'fwd' }] }] } }], island: { activeId: 'p' } };
    expect(helper<any>(bad, 'modelOf', raw).island.robots.filter((r: any) => r.helps === 'a').length).toBe(2);
  });
  it('the job’s robot ignores a copy at home → a busy Pip blocks the plot again (the Workshop-robot row fails)', () => {
    const { m: m0, ids } = pipFamily();
    const m = assign(m0, ids[0], 'tulip-door').model;
    const fam = runScript(FAMILY_SCRIPT, { model: m });
    const bad = mutate(JOB_ROBOT_SCRIPT, 'return here || free || any;', 'return here || any;');
    expect(runScript(bad, { requests: REQ_ROWS, requestId: 'rows-trick', robots: fam.robots, plots: fam.plots, lang: 'en' }).robotId).toBe('r1');
  });
  it('the home slot keeps its four spots → the fifth robot at home stands off the home slot (the home-spots row fails)', () => {
    const bad = mutate(ISLAND_WORLD_SCRIPT, 'HOME_SPOTS.push(', 'void (');
    const m = kid();
    for (let i = 1; i < CREW_CAP; i++) buyCopy(m, 'pip', `P${i}`);
    const fam = runScript(FAMILY_SCRIPT, { model: m });
    const at = runScript(bad, { requests: REQ_ROWS, plots: fam.plots, robots: fam.robots, done: fam.done, band: 2, pins: [] }).world.robots.filter((r: any) => r.home);
    expect(at.some((r: any) => !homeTile(r.x, r.y))).toBe(true);
  });
  it('the save code drops a robot’s program → the round-trip row fails', () => {
    const bad = mutate(ENCODE_SAVE_SCRIPT, 'if ((rb.program || rb.helps) && Array.isArray(rr)) rr.push(rb.program || null);', '');
    const { m: m0, ids } = pipFamily();
    const m = copy(m0, 'r1', ids[2]).model;
    expect(runScript(DECODE_SAVE_SCRIPT, { code: runScript(bad, { model: m }).code }).model).not.toEqual(helper<any>(SAVE_HELPERS, 'modelOf', clone(m)));
  });
  it('the tick never steps the second robot → Pocket 2 picks nothing (the AC3 row fails)', () => {
    let m = win(kid(), 'path-postbox');
    m = win(m, 'bowl-if', 'cobble');
    m = win(m, 'eggs-count', 'pocket');
    const p2 = buyCopy(m, 'pocket', 'Pocket 2');
    m = assign(m, p2, 'eggs-count').model;
    // Merge (s4): the mate line now wraps lane H's islHelped (the helper rides the first robot's step).
    const bad = mutate(ISLAND_TICK_SCRIPT, '  if (plot.job && plot.mate) return islWithMate(plot, cur, islHelped(plot, cur));\n', '');
    let state = islandOf(m).world.state;
    let picks = 0;
    for (let t = 0; t < 400; t++) {
      state = runScript(bad, { state }).state;
      const mate = state.live['eggs-count'].mate;
      if (mate && mate.delta && mate.delta.pick) picks++;
    }
    expect(picks).toBe(0);
  });
});

// ── The 3D kit: redraw by robot, not the scene (IW-008 §4) ──
const LIBRARY = path.join(__dirname, '..', '..', '..', 'library', 'modules');
const BUILT_3D = path.join(LIBRARY, 'garden-3d-kit', 'project', 'noodl_modules', 'garden-3d-kit', 'index.js');
const BUILT_2D = path.join(LIBRARY, 'garden-kit', 'project', 'noodl_modules', 'garden-kit', 'index.js');

function threeStub() {
  const vec = () => ({ x: 0, y: 0, z: 0, set(this: any, x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; } });
  const cls = (name: string) =>
    function (this: any) {
      this.type = name;
      this.position = vec();
      this.rotation = vec();
      this.scale = vec();
      this.scale.set(1, 1, 1);
      this.children = [];
      this.userData = {};
      this.matrix = {};
      this.instanceMatrix = {};
      this.add = (...kids: any[]) => kids.forEach((k) => this.children.push(k));
      this.remove = (k: any) => { const i = this.children.indexOf(k); if (i !== -1) this.children.splice(i, 1); };
      this.traverse = (f: (o: any) => void) => { f(this); this.children.forEach((c: any) => c.traverse && c.traverse(f)); };
      this.updateMatrix = () => {};
      this.setMatrixAt = () => {};
      this.setColorAt = () => { this.instanceColor = {}; };
      this.lookAt = () => {};
      this.updateProjectionMatrix = () => {};
      this.dispose = () => {};
      this.info = { render: { calls: 0 } };
      this.setPixelRatio = () => {};
      this.setSize = () => {};
      this.render = () => {};
    };
  const THREE: Record<string, any> = {};
  for (const n of ['Group', 'Object3D', 'Mesh', 'InstancedMesh', 'Scene', 'PerspectiveCamera', 'DirectionalLight', 'HemisphereLight', 'WebGLRenderer']) THREE[n] = cls(n);
  for (const n of ['BoxGeometry', 'ConeGeometry', 'CylinderGeometry', 'IcosahedronGeometry', 'SphereGeometry', 'PlaneGeometry', 'MeshLambertMaterial', 'Color']) THREE[n] = cls(n);
  return THREE;
}
function fakeDom() {
  const mk = (): any => ({
    style: {}, attrs: {} as Record<string, string>, children: [] as any[], textContent: '',
    setAttribute(k: string, v: string) { this.attrs[k] = v; },
    getAttribute(k: string) { return this.attrs[k]; },
    appendChild(c: any) { this.children.push(c); return c; },
    removeChild(c: any) { this.children.splice(this.children.indexOf(c), 1); },
    get firstChild() { return this.children[0] || null; }
  });
  const doc = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {}, createElement: () => mk(), createTextNode: (t: string) => ({ text: t }) };
  const root = Object.assign(mk(), { clientWidth: 600, clientHeight: 450 });
  const canvas = { getContext: () => ({}), addEventListener() {}, removeEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0 }), setPointerCapture() {} };
  return { doc, root, canvas, overlay: mk() };
}
function kit3d(text = fs.readFileSync(BUILT_3D, 'utf8')) {
  const modules: any[] = [];
  const context: Record<string, any> = { Noodl: { defineModule: (m: any) => modules.push(m) }, React, console, setTimeout, clearTimeout };
  context.__noodl_modules = modules;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(BUILT_2D, 'utf8'), context);
  vm.runInContext(text, context);
  return modules[modules.length - 1].reactNodes.find((n: any) => n.name === 'garden-3d-kit.Garden3D');
}

describe('IW-008 §4 — the 3D kit redraws by robot, not the scene', () => {
  const MAP = { rows: ['GGGGGGGGGGGG', 'GGGGGGGGGGGG', 'GGGFGGGGGGGG', 'PPPPPPPPPPPP', 'GGGGGGGGGGGG', 'GGGGGGGGGGGG'] };
  const crew = (n: number, over: Record<number, Record<string, unknown>> = {}) => Array.from({ length: n }, (_, i) => ({ x: i % 12, y: i < 12 ? 4 : 5, d: 1, name: `R${i}`, can: 0, canMax: 3, carry: [], ...(over[i] || {}) }));
  function engineOn(text?: string) {
    const node = kit3d(text);
    const dom = fakeDom();
    const eng = node.engine.create({ THREE: threeStub(), root: dom.root, canvas: dom.canvas, overlay: dom.overlay, doc: dom.doc, now: () => 0, raf: () => 1, caf: () => {} });
    const W = node.world;
    const set = (robots: any[], things: any[] = [{ kind: 'tulip', x: 3, y: 2 }]) => eng.setWorld({ map: W.parseMap(MAP), things: W.parseThings(things), robots: W.parseRobots(robots) });
    return { eng, set, dom };
  }

  it(`🔴 ${CREW_CAP} robots: one fills its can → THAT robot is redrawn (one new group), the scene and the other ${CREW_CAP - 1} kept; the things change → the things redrawn alone; the map changes → the scene`, () => {
    const { eng, set, dom } = engineOn();
    set(crew(CREW_CAP));
    const built = eng.built;
    const groups = [...built.robots];
    const meshes = eng.meshCount;
    const scenes = eng.sceneBuilds;
    set(crew(CREW_CAP, { 5: { can: 3 } }));
    expect(eng.built).toBe(built);
    expect(eng.sceneBuilds).toBe(scenes);
    expect(eng.built.robots.map((g: any, i: number) => (g === groups[i] ? 'kept' : 'new'))).toEqual(groups.map((_, i) => (i === 5 ? 'new' : 'kept')));
    expect(eng.meshCount).toBe(meshes);
    expect(dom.root.attrs['data-robot-builds']).toBe('1');
    // A pick: the tulip watered and robot 2 carrying — the things redrawn and robot 2, the tiles untouched.
    const tiles = eng.built.tiles;
    set(crew(CREW_CAP, { 5: { can: 3 }, 2: { carry: ['stone'] } }), [{ kind: 'tulip', x: 3, y: 2, watered: true }]);
    expect([eng.built.tiles, eng.sceneBuilds, eng.thingBuilds, eng.robotBuilds]).toEqual([tiles, scenes, 1, 2]);
    // Known-firing: a thirteenth robot (how many changed) or a new map builds the scene whole.
    set(crew(CREW_CAP + 1));
    expect(eng.sceneBuilds).toBe(scenes + 1);
  });

  it('arm: the partial redraw switched off → a can filled rebuilds the scene (the row above fails)', () => {
    const src = fs.readFileSync(BUILT_3D, 'utf8');
    const anchor = 'var partly = !first && !mapChanged && (thingsChanged || robotsChanged) && redrawParts(previous, world, thingsChanged);';
    expect(src.split(anchor)).toHaveLength(2);
    const { eng, set } = engineOn(src.replace(anchor, 'var partly = false;'));
    set(crew(CREW_CAP));
    const built = eng.built;
    set(crew(CREW_CAP, { 5: { can: 3 } }));
    expect(eng.built).not.toBe(built);
  });
});
