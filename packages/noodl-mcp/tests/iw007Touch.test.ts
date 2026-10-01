/**
 * P108 IW-007 (session 6) — her land by touch: a second robot onto her land, and teaching on the land.
 *
 * Measured before building (2026-10-01, on the merged tree `47929a133`, the page's own scripts): a Workshop win on the
 * land needed the WHOLE job (`job_done`), so one program had to carry both materials (10 blocks, 194 ticks); the land's
 * card showed no robots (the crew row asked for the plot's kind and a won plot) and a tap had nowhere to go ("Cobble
 * can't do this job": the land is not in the catalogue's requests); a second robot sent with a COPY of the first's
 * program stood still (one rock, one tree: the source reserved by the first robot) — 183 ticks against 181 alone —
 * while two robots on two materials built the spa in 131. So the land is taught robot by robot:
 *
 * - **The land's goal is a part finished** (`part_done`, the targets not full when the run began, the robot home): Pip
 *   learns the stones, Cobble the planks, a robot the carrots — feeding wins while a building is still going up.
 * - **Her robots of ANY kind on the land's card**; a tap CHOOSES who learns there (`gardenLandBot`); Go and help reads
 *   "Teach Cobble here" and the Workshop's robot is the one chosen.
 * - **A second win on the land makes a helper**: the robot at work there keeps it, the winner helps with its own
 *   program; a helper there before goes home with its program. The land is never in `done` (it is never won).
 *
 * Each rule has an arm: the source mutated at one anchor, the row red (asserted here).
 *
 * @module noodl-mcp/tests/iw007Touch.test
 */
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import * as React from 'react';
import { LAND_ID, REQUESTS } from './cg002Content';
import { ADD_PROFILE_SCRIPT, BRING_HOME_SCRIPT, COMPLETE_REQUEST_SCRIPT, ENGINE, PALETTE_SCRIPT, helper, runScript } from './cg002Scripts';
import { ALL_WORDS_JSON, ASSIGN_ROBOT_SCRIPT, PICK_THING_SCRIPT, REQUEST_CARD_SCRIPT, CREW_CHIPS_SCRIPT, FAMILY_SCRIPT, ISLAND_CHOOSE_SCRIPT, ISLAND_WORLD_SCRIPT, JOB_ROBOT_SCRIPT, START_WORLD_SCRIPT } from './cg003Scripts';
import { ISLAND_TICK_SCRIPT } from './ig004Island';
import { LAND_REQUEST_SCRIPT } from './iw007Building';

const WORDS = JSON.parse(ALL_WORDS_JSON);
const W = (key: string, lang: 'en' | 'fr' = 'en'): string => WORDS.find((w: any) => w.key === key)[lang];
const J = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const bare = (s: string, i: Record<string, unknown>) => J(runScript(s, J(i)));
const blk = (id: number, t: string, extra: Record<string, unknown> = {}) => ({ id, t, ...extra });
const is = (thing: Record<string, unknown>, state: string) => ({ op: 'is', thing, state });
const carry = (part: Record<string, unknown>, source: string, base = 1) => [
  blk(base, 'until', { slots: { cond: is(part, 'done') }, body: [blk(base + 1, 'go_nearest', { slots: { kind: source } }), blk(base + 2, 'pick'), blk(base + 3, 'go_to', { slots: { thing: part } }), blk(base + 4, 'put')] })
];
const STONE = { id: 'b1-stone', kind: 'site', x: 3, y: 1 };
const PLANK = { id: 'b1-plank', kind: 'site', x: 4, y: 1 };
const STONES = carry(STONE, 'rock', 1);
const PLANKS = carry(PLANK, 'tree', 10);
const kid = () => runScript(ADD_PROFILE_SCRIPT, { model: null, name: 'Ada', band: 2, lang: 'en', robotName: 'Pip' }).model;
const active = (m: any) => m.profiles.find((p: any) => p.id === m.island.activeId);
const spa = (stone = 0, plank = 0) => ({ buildings: [{ id: 'b1', bp: 'spa', x: 3, y: 1, have: { stone, plank } }], animals: [] as any[] });
const cobble = () => ({ id: 'cobble', kind: 'cobble', name: 'Cobble', color: '#7A8CA3', eye: 'round', hat: 'none' });
const echo = () => ({ id: 'echo', kind: 'echo', name: 'Echo', color: '#5B8DEF', eye: 'round', hat: 'none' });
/** A source mutated at one anchor (exactly one), for an arm. */
function arm(src: string, anchor: string, by: string): string {
  expect(src.split(anchor).length).toBe(2);
  return src.replace(anchor, by);
}
/** A family with Cobble lent and the spa placed on her land (nothing delivered). */
function family(land: unknown = spa()) {
  const m = kid();
  const p = active(m);
  p.island.robots.push(cobble());
  p.island.land = land;
  return m;
}
/** The Workshop on her land: its request (Land request), the world Start world lays, a program run to its end, judged. */
function workshop(model: any, program: unknown[], requestScript = LAND_REQUEST_SCRIPT, engine = ENGINE) {
  const f = runScript(FAMILY_SCRIPT, { model });
  const reqs = bare(requestScript, { requests: REQUESTS, land: f.land }).requests;
  const land = reqs.find((r: any) => r.id === LAND_ID);
  const s = bare(START_WORLD_SCRIPT, { requests: reqs, requestId: LAND_ID, seed: 1 });
  const end: any = helper(engine, 'runToEnd', program, s.world, 'r1', 'en');
  return { land, end, goal: helper<any>(engine, 'goalMet', end.world, end.run, program, land.goal) };
}
const win = (model: any, program: unknown[], robotId: string, script = COMPLETE_REQUEST_SCRIPT) =>
  bare(script, { model, requestId: LAND_ID, program: JSON.stringify(program), robotId, now: 1759300000000 });
function isle(model: any) {
  const f = runScript(FAMILY_SCRIPT, { model });
  return { f, w: bare(ISLAND_WORLD_SCRIPT, { requests: REQUESTS, plots: f.plots, robots: f.robots, done: f.done, band: f.band, pins: [], land: f.land }) };
}
/** Island ticks until the spa stands (every part full), or -1. */
function ticksToBuild(model: any, max = 600) {
  let state = isle(model).w.state;
  for (let t = 1; t <= max; t++) {
    state = bare(ISLAND_TICK_SCRIPT, { state, built: state }).state;
    const parts = state.live[LAND_ID]?.things?.filter((x: any) => x.of === 'b1') ?? [];
    if (parts.length && parts.every((x: any) => x.have >= x.need)) return t;
  }
  return -1;
}

describe('the Workshop on her land wins a PART finished (part_done)', () => {
  it('a one-material program wins on a fresh spa (the stones); its goal names the targets not full; a program that finishes nothing loses', () => {
    const { land, goal, end } = workshop(family(), STONES);
    expect(land.goal).toEqual({ name: 'part_done', args: ['b1-stone', 'b1-plank'] });
    expect([end.known, goal.met, goal.done, goal.total]).toEqual([true, true, 1, 1]);
    // One stone and stop: no part finished.
    const one = [blk(1, 'go_nearest', { slots: { kind: 'rock' } }), blk(2, 'pick'), blk(3, 'go_to', { slots: { thing: STONE } }), blk(4, 'put')];
    expect(workshop(family(), one).goal.met).toBe(false);
    // A part already full is not one to finish: the planks are in, so only the stones count.
    expect(workshop(family(spa(0, 4)), STONES).land.goal.args).toEqual(['b1-stone']);
    expect(workshop(family(spa(0, 4)), PLANKS).goal.met).toBe(false);
  });

  it('ARM: the land judged by the whole job again (job_done) — the stones alone lose', () => {
    const A = arm(LAND_REQUEST_SCRIPT, "if (req.job) req.goal = { name: 'part_done'", "if (false) req.goal = { name: 'part_done'");
    const r = workshop(family(), STONES, A);
    expect([r.land.goal, r.goal.met]).toEqual([{ name: 'job_done' }, false]);
  });

  it('ARM: the engine without part_done — the stones alone lose', () => {
    const A = arm(ENGINE, "else if (g.name === 'part_done')", "else if (g.name === 'part_done_x')");
    expect(workshop(family(), STONES, LAND_REQUEST_SCRIPT, A).goal.met).toBe(false);
  });

  it('feeding wins on her land while a building is still going up (AC2: before, the unfinished spa kept it from winning)', () => {
    const m = family({
      buildings: [{ id: 'r1b', bp: 'refuge', x: 3, y: 3, have: { plank: 6, stone: 4 } }, { id: 'b1', bp: 'spa', x: 3, y: 1, have: { stone: 2, plank: 0 } }],
      animals: [{ id: 'a1', kind: 'rabbit', name: 'Hazel', at: 'r1b', slot: 0, fed: 0 }]
    });
    const bowl = { id: 'a1', kind: 'bowl', x: 3, y: 4 };
    const feed = [blk(1, 'until', { slots: { cond: is(bowl, 'full') }, body: [blk(2, 'go_nearest', { slots: { kind: 'patch' } }), blk(3, 'pick'), blk(4, 'go_to', { slots: { thing: bowl } }), blk(5, 'put')] })];
    const r = workshop(m, feed);
    expect(r.land.goal.args).toEqual(['b1-stone', 'b1-plank', 'a1']);
    expect(r.goal.met).toBe(true);
    expect(r.end.world.things.find((t: any) => t.id === 'a1').count).toBe(3);
  });
});

describe('a win on her land — the first robot works it, the next one helps with its own program', () => {
  it('Pip wins the stones: pinned on the land, the land never in done; Cobble wins the planks: he HELPS, Pip keeps the land', () => {
    const a = win(family(), STONES, 'r1');
    const pa = active(a.model);
    expect([pa.island.plots[LAND_ID].robotId, pa.island.plots[LAND_ID].program, pa.island.done.includes(LAND_ID), a.newlyDone, a.pinned]).toEqual(['r1', STONES, false, false, 'r1']);
    const b = win(a.model, PLANKS, 'cobble');
    const pb = active(b.model);
    const cob = pb.island.robots.find((r: any) => r.id === 'cobble');
    expect([pb.island.plots[LAND_ID].robotId, pb.island.plots[LAND_ID].program, cob.helps, cob.program, b.pinned]).toEqual(['r1', STONES, LAND_ID, PLANKS, 'cobble']);
    // Cobble taught again: still the helper, his new program.
    const again = active(win(b.model, STONES, 'cobble').model).island.robots.find((r: any) => r.id === 'cobble');
    expect([again.helps, again.program]).toEqual([LAND_ID, STONES]);
    // Pip taught again: still at work there, his new program; Cobble still helps.
    const pip = active(win(b.model, PLANKS, 'r1').model);
    expect([pip.island.plots[LAND_ID].robotId, pip.island.plots[LAND_ID].program, pip.island.robots.find((r: any) => r.id === 'cobble').helps]).toEqual(['r1', PLANKS, LAND_ID]);
  });

  it('a third robot wins there: it helps, and the helper before goes home with the program it ran; a robot at work elsewhere leaves that plot', () => {
    const m = family();
    active(m).island.robots.push(echo());
    let x = win(win(m, STONES, 'r1').model, PLANKS, 'cobble').model;
    // Echo at work on another plot first.
    active(x).island.done.push('path-postbox');
    active(x).island.plots['path-postbox'] = { program: STONES, robotId: 'echo', wonAt: 1 };
    x = win(x, PLANKS, 'echo').model;
    const p = active(x);
    const [cob, ech] = ['cobble', 'echo'].map((id) => p.island.robots.find((r: any) => r.id === id));
    expect([cob.helps, cob.program, ech.helps, p.island.plots['path-postbox'].robotId, p.island.plots[LAND_ID].robotId]).toEqual([undefined, PLANKS, LAND_ID, '', 'r1']);
  });

  it('Pip brought home from the land: the save drops Cobble’s help (nobody to help); Cobble winning there then works it', () => {
    const m = win(win(family(), STONES, 'r1').model, PLANKS, 'cobble').model;
    const home = bare(BRING_HOME_SCRIPT, { model: m, robotId: 'r1' }).model;
    const h = active(bare(COMPLETE_REQUEST_SCRIPT, { model: home }).model);
    expect([h.island.plots[LAND_ID].robotId, h.island.robots[1].helps]).toEqual(['', undefined]);
    const q = active(win(home, PLANKS, 'cobble').model);
    expect([q.island.plots[LAND_ID].robotId, q.island.plots[LAND_ID].program, q.island.robots[1].helps]).toEqual(['cobble', PLANKS, undefined]);
  });

  it('a request is still won as before (known-firing): in done, its robot pinned, no helper', () => {
    const m = family();
    const rq = REQUESTS.find((r) => r.id === 'path-postbox')!;
    const o = bare(COMPLETE_REQUEST_SCRIPT, { model: m, requestId: rq.id, program: JSON.stringify(rq.referenceProgram), robotId: 'r1', now: 1 });
    const p = active(o.model);
    expect([p.island.done.includes(rq.id), p.island.plots[rq.id].robotId, o.newlyDone]).toEqual([true, 'r1', true]);
  });

  it('ARM: without the land branch Cobble’s win takes the land from Pip (one robot there), and the land is put in done', () => {
    const A = arm(COMPLETE_REQUEST_SCRIPT, '&& iw7tLead && iw7tLead !== robotId', '&& false');
    const p = active(win(win(family(), STONES, 'r1', A).model, PLANKS, 'cobble', A).model);
    expect([p.island.plots[LAND_ID].robotId, p.island.robots[1].helps]).toEqual(['cobble', undefined]);
    const B = arm(COMPLETE_REQUEST_SCRIPT, 'if (requestId && !iw7tLand && p.island', 'if (requestId && p.island');
    expect(active(win(family(), STONES, 'r1', B).model).island.done).toContain(LAND_ID);
  });

  it('on the island the two robots taught there build the spa together — faster than one robot carrying both', () => {
    const two = win(win(family(), STONES, 'r1').model, PLANKS, 'cobble').model;
    const one = win(family(), [...STONES, ...PLANKS], 'r1').model;
    const [t2, t1] = [ticksToBuild(two), ticksToBuild(one)];
    expect(t2).toBeGreaterThan(0);
    expect(t1).toBeGreaterThan(t2);
  });
});

describe('her land’s card by touch — her robots of any kind, the one chosen learns there', () => {
  const card = (model: any, landBot = '', lang: 'en' | 'fr' = 'en', script = CREW_CHIPS_SCRIPT) => {
    const { f, w } = isle(model);
    return bare(script, { requestId: LAND_ID, requests: REQUESTS, cards: w.cards, plots: f.plots, robots: f.robots, words: WORDS, lang, landBot });
  };
  const choose = (model: any, landBot = '', lang: 'en' | 'fr' = 'en') => {
    const { f, w } = isle(model);
    return bare(ISLAND_CHOOSE_SCRIPT, { requestId: LAND_ID, cards: w.cards, requests: REQUESTS, plots: f.plots, robots: f.robots, words: WORDS, lang, botName: 'Pip', landBot });
  };
  const job = (model: any, requestId: string, landBot = '', script = JOB_ROBOT_SCRIPT) => {
    const f = runScript(FAMILY_SCRIPT, { model });
    const reqs = bare(LAND_REQUEST_SCRIPT, { requests: REQUESTS, land: f.land }).requests;
    return bare(script, { requests: reqs, requestId, robots: f.robots, plots: f.plots, lang: 'en', landBot });
  };

  it('the card shows Pip and Cobble (another kind), Pip ringed; its line says a tap chooses; one robot alone shows none', () => {
    const c = card(family());
    expect([c.show, c.rows.map((r: any) => [r.label, r.selected]), c.label, c.line]).toEqual([true, [['Pip', true], ['Cobble', false]], W('iw7tCrewL'), W('iw7tCrewTap')]);
    expect(card(family(), '', 'fr').line).toBe(W('iw7tCrewTap', 'fr'));
    expect(card(kid()).show).toBe(false);
  });

  it('a tap on Cobble chooses him (nothing written); the card then rings him, says “Teach Cobble here”, and the Workshop’s robot is Cobble', () => {
    const m = family();
    const a = bare(ASSIGN_ROBOT_SCRIPT, { model: m, requestId: LAND_ID, requests: REQUESTS, robotId: 'crew|cobble', words: WORDS, lang: 'en', now: 1 });
    expect([a.chose, a.chosen, a.ok, a.told.text]).toEqual([true, 'cobble', false, '']);
    expect([active(a.model).island.plots, active(a.model).island.robots]).toEqual([active(m).island.plots, active(m).island.robots]);
    expect(card(m, a.chosen).rows.map((r: any) => r.selected)).toEqual([false, true]);
    const ch = choose(m, 'cobble');
    expect([ch.robotId, ch.openText, ch.canOpen]).toEqual(['cobble', W('iw7tTeach').split('{b}').join('Cobble'), true]);
    expect(choose(m, 'cobble', 'fr').openText).toBe(W('iw7tTeach', 'fr').split('{b}').join('Cobble'));
    expect([job(m, LAND_ID, 'cobble').robotId, job(m, LAND_ID, 'cobble').botName]).toEqual(['cobble', 'Cobble']);
    // Nobody chosen: the one at work there (Pip after his win), else Pip.
    expect(job(m, LAND_ID).robotId).toBe('r1');
  });

  it('a request plot is as before (known-firing): a tap there sends, the chooser is not read, Job robot by the kind', () => {
    const a = bare(ASSIGN_ROBOT_SCRIPT, { model: family(), requestId: 'path-postbox', requests: REQUESTS, robotId: 'crew|cobble', words: WORDS, lang: 'en', now: 1 });
    expect([a.chose, a.chosen]).toEqual([false, '']);
    expect(job(family(), 'path-stones', 'cobble').robotId).toBe(job(family(), 'path-stones').robotId);
  });

  it('Cobble helping there: chosen, the card says he helps and offers to teach him again or bring him home', () => {
    const m = win(win(family(), STONES, 'r1').model, PLANKS, 'cobble').model;
    const ch = choose(m, 'cobble');
    expect([ch.line, ch.showHome, ch.canOpen, ch.robotId]).toEqual([W('iw7tHelpsHere').split('{b}').join('Cobble'), true, true, 'cobble']);
    expect(card(m).hereText).toBe(`${W('iw8cWorks').replace('{r}', 'Pip')} · ${W('iw8cHelps').replace('{r}', 'Cobble')}`);
  });

  it('ARM: the crew row by kind on the land again — Cobble is not on the card', () => {
    const A = arm(CREW_CHIPS_SCRIPT, '(!isLand && crewKindOf(m) !== kind)', '(crewKindOf(m) !== kind)');
    expect([card(family(), '', 'en', A).show, card(family()).show]).toEqual([false, true]);
  });

  it('ARM: Job robot without the land pick — Cobble chosen, Pip taught', () => {
    const A = arm(JOB_ROBOT_SCRIPT, 'if (id === IW7T_LAND) row =', 'if (false) row =');
    expect(job(family(), LAND_ID, 'cobble', A).robotId).toBe('r1');
  });
});

describe('the Workshop on her land keeps her program when the family is read again (found by the touch drive, s6)', () => {
  it('Read family gives her land as TEXT, the same text on every read of the same save (an object is new each read); Land request reads the text', () => {
    const m = family();
    const [a, b] = [runScript(FAMILY_SCRIPT, { model: m }), runScript(FAMILY_SCRIPT, { model: m })];
    expect(a.land).not.toBe(b.land);
    expect(typeof a.landText).toBe('string');
    expect(a.landText).toBe(b.landText);
    const fromText = bare(LAND_REQUEST_SCRIPT, { requests: REQUESTS, land: a.landText }).requests;
    const fromObject = bare(LAND_REQUEST_SCRIPT, { requests: REQUESTS, land: a.land }).requests;
    expect(fromText).toEqual(fromObject);
    expect(fromText.find((r: any) => r.id === LAND_ID).things.filter((t: any) => t.of === 'b1').length).toBe(2);
    // No land: an empty text, and the land with nothing on it.
    expect(runScript(FAMILY_SCRIPT, { model: kid() }).landText).toBe('');
    expect(bare(LAND_REQUEST_SCRIPT, { requests: REQUESTS, land: '' }).requests.find((r: any) => r.id === LAND_ID).job).toBeUndefined();
  });
});

describe('the Workshop’s card on her land names her land (seen on the touch drive’s screenshots, s6)', () => {
  it('“Your land” and its blurb — not “Free play” and “’s request”; a request keeps its islander (known-firing)', () => {
    const f = runScript(FAMILY_SCRIPT, { model: family() });
    const reqs = bare(LAND_REQUEST_SCRIPT, { requests: REQUESTS, land: f.landText }).requests;
    for (const lang of ['en', 'fr'] as const) {
      const c = bare(REQUEST_CARD_SCRIPT, { requests: reqs, requestId: LAND_ID, words: WORDS, lang, botName: 'Pip' });
      expect([c.who, c.eyebrow]).toEqual([W('iw7bLandTitle', lang), W('iw7bLandBlurb', lang)]);
    }
    const r = bare(REQUEST_CARD_SCRIPT, { requests: reqs, requestId: 'path-stones', words: WORDS, lang: 'en', botName: 'Pip' });
    expect([r.who, r.eyebrow]).toEqual([W('islSami'), W('wsEyebrowReq').replace('{who}', W('islSami'))]);
  });
});

describe('Cobble’s drawer on her land (found by the touch drive, s6: it was empty)', () => {
  it('Start world says her land needs no kind; the palette gives Cobble the land’s blocks; a request still refuses another kind (known-firing)', () => {
    const f = runScript(FAMILY_SCRIPT, { model: family() });
    const reqs = bare(LAND_REQUEST_SCRIPT, { requests: REQUESTS, land: f.landText }).requests;
    const s = bare(START_WORLD_SCRIPT, { requests: reqs, requestId: LAND_ID, seed: 1 });
    expect(s.needs).toBe('');
    const cob = f.robots.find((r: any) => r.id === 'cobble');
    const pal = bare(PALETTE_SCRIPT, { band: 2, allowed: s.allowed, needs: s.needs, robot: cob, words: WORDS, lang: 'en', request: s.request }).palette.map((b: any) => b.id);
    expect(pal).toEqual(expect.arrayContaining(['until', 'go_nearest', 'go_to', 'pick', 'put']));
    const pipReq = REQUESTS.find((r: any) => (!r.needs || r.needs === 'pip') && r.id !== 'free')!;
    const ps = bare(START_WORLD_SCRIPT, { requests: reqs, requestId: pipReq.id, seed: 1 });
    expect(bare(PALETTE_SCRIPT, { band: 2, allowed: ps.allowed, needs: ps.needs, robot: cob, words: WORDS, lang: 'en', request: ps.request }).palette).toEqual([]);
    const A = arm(START_WORLD_SCRIPT, `req.id === 'free' || req.id === "land"`, `req.id === 'free'`);
    expect(bare(A, { requests: reqs, requestId: LAND_ID, seed: 1 }).needs).toBe('pip');
  });
});

describe('her land’s parts and her bowl named on a chip (seen on the touch drive’s screenshots, s6: “square … is path”, “bowl 1”)', () => {
  const BUILT = path.join(__dirname, '..', '..', '..', 'library', 'modules', 'garden-kit', 'project', 'noodl_modules', 'garden-kit', 'index.js');
  const blocksNode = () => {
    const modules: any[] = [];
    const context: Record<string, any> = { Noodl: { defineModule: (m: any) => modules.push(m) }, React, console, setTimeout, clearTimeout };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(BUILT, 'utf8'), context, { filename: 'garden-kit/index.js' });
    return modules[0].reactNodes.find((n: any) => n.name === 'garden-kit.Blocks');
  };
  const ctx = (lang: 'en' | 'fr') => ({ lang, words: Object.fromEntries(WORDS.map((r: any) => [r.key, r[lang]])) });
  const world = {
    things: [
      { kind: 'site', id: 'b1-stone', of: 'b1', build: 'spa', item: 'stone', x: 3, y: 1 },
      { kind: 'bowl', id: 'a1', animal: 'rabbit', name: 'Hazel', x: 3, y: 4 },
      { kind: 'site', id: 'bench', build: 'bench', item: 'stone', x: 4, y: 2 },
      { kind: 'site', id: 's2', item: 'stone', x: 5, y: 2 }
    ],
    robots: []
  };
  const pick = (x: number, y: number) => bare(PICK_THING_SCRIPT, { picking: true, tapX: x, tapY: y, world }).pick.ref;

  it('Pick thing: a land part carries its building and material, her bowl her name; Sami’s bench (no building of hers) and a path square do not', () => {
    expect(pick(3, 1)).toEqual({ id: 'b1-stone', kind: 'site', x: 3, y: 1, build: 'spa', item: 'stone' });
    expect(pick(3, 4)).toEqual({ id: 'a1', kind: 'bowl', x: 3, y: 4, name: 'Hazel' });
    expect(pick(4, 2)).toEqual({ id: 'bench', kind: 'site', x: 4, y: 2 });
    expect(pick(5, 2)).toEqual({ id: 's2', kind: 'site', x: 5, y: 2 });
  });

  it('the kit names them: “the spa’s stone part”, “Hazel’s bowl” (EN + FR); the bench keeps its own word and a square its path word (known-firing)', () => {
    const node = blocksNode();
    for (const lang of ['en', 'fr'] as const) {
      expect(node.chipLabel(ctx(lang), pick(3, 1))).toBe(W('iw7tK_spa_stone', lang));
      expect(node.chipLabel(ctx(lang), pick(3, 4))).toBe(W('iw7tK_bowl', lang).replace('{name}', 'Hazel'));
      expect(node.chipLabel(ctx(lang), pick(4, 2))).toBe(W('iw3sK_bench', lang));
      expect(node.chipLabel(ctx(lang), pick(5, 2))).toBe(`${W('iw4K_site', lang)} 2`);
    }
    // Before (s5): the land part was a square, her bowl a numbered bowl.
    expect(node.chipLabel(ctx('en'), { id: 'b1-stone', kind: 'site', x: 3, y: 1 })).toBe(W('iw4K_site'));
    expect(node.chipLabel(ctx('en'), { id: 'a1', kind: 'bowl', x: 3, y: 4 })).toBe(`${W('iw4K_bowl')} 1`);
  });
});

