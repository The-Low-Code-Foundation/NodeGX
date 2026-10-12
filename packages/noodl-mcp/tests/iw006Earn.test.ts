/**
 * P108 IW-006 (session 4, lane E) — the gate over earning: AC1 (the earnings table, a done-and-unworn job earns nothing
 * more, the cap per run), AC2 (the wallet never goes down on earning; `spent` untouched; the balance across a save), and
 * the island's live job kept in the save across an app restart (IW-002 AC3 across a restart, the brief's §4.2).
 *
 * Every script is run as the page runs it (`Inputs` in, `Outputs` out): Win pay → Complete request in the Workshop; the
 * island built by Island world, stepped by Island tick, and written by Island keep — over the REAL island (every request
 * on its plot of R6's 55 × 22).
 *
 * @module noodl-mcp/tests/iw006Earn.test
 */
import { JOB_BONUS, REQUESTS, SHELLS_RUN_CAP, WEAR } from './cg002Content';
import { ADD_PROFILE_SCRIPT, BRING_HOME_SCRIPT, COMPLETE_REQUEST_SCRIPT, DECODE_SAVE_SCRIPT, ENCODE_SAVE_SCRIPT, SAVE_HELPERS, helper, runScript } from './cg002Scripts';
import { ALL_WORDS_JSON, FAMILY_SCRIPT, ISLAND_WORLD_SCRIPT, WIN_PAY_SCRIPT } from './cg003Scripts';
import { PAGE_WORDS } from './cg003Content';
import { ISLAND_ENGINE, ISLAND_TICK_SCRIPT } from './ig004Island';
import { EARN_ENGINE, ISLAND_KEEP_SCRIPT, winPayScript } from './iw006Earn';

const WORD_ROWS = JSON.parse(ALL_WORDS_JSON);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const req = (id: string) => REQUESTS.find((r) => r.id === id)!;
const JOBS = REQUESTS.filter((r) => r.job);
const NOW = 1759300000000;

/**
 * THE EARNINGS TABLE (AC1), measured 2026-09-30 on the island's own laying of each plot: the steps a first win fills (its
 * targets' lack at the start — bowl-if starts with one bowl of three full). A mission that changes its job changes its
 * row here: read the new lack, write it, and say so.
 */
const STEPS: Readonly<Record<string, number>> = {
  'path-postbox': 1,
  'tulip-door': 3,
  'tulips-three': 9,
  'path-stones': 16,
  'bowl-if': 2,
  'letter-say': 1,
  'wall-until': 1,
  'meow-when': 2,
  'eggs-count': 4,
  'rows-trick': 6,
  'sami-bench': 8,
  'mamie-note': 3,
  'rock-flower': 2,
  'sami-thanks': 1,
  envelopes: 3
};
const firstWin = (id: string) => Math.min(STEPS[id], SHELLS_RUN_CAP) + JOB_BONUS[id];

// ── The page's scripts, as the pages wire them ──
const kid = (band = 2, lang = 'en') => runScript(ADD_PROFILE_SCRIPT, { model: null, name: 'Ada', band, lang, robotName: 'Pip' }).model;
const fam = (model: any) => runScript(FAMILY_SCRIPT, { model });
const active = (model: any) => model.profiles.find((p: any) => p.id === model.island.activeId);
/** Every robot kind lent, so no plot is padlocked for want of one. */
function crewed(model: any) {
  const p = active(model);
  for (const k of ['cobble', 'pocket', 'echo']) if (!p.island.robots.some((r: any) => r.id === k)) p.island.robots.push({ id: k, kind: k });
  return helper<any>(SAVE_HELPERS, 'modelOf', model);
}
const robotFor = (model: any, id: string) => helper<string>(SAVE_HELPERS, 'jobRobotId', active(model), req(id).needs || 'pip');
/** A win in the Workshop, wired as Pages/Workshop wires it: Win pay (her island BEFORE the win) → Complete request. */
function workshopWin(model: any, id: string, lang = 'en') {
  const f = fam(model);
  const pay = runScript(WIN_PAY_SCRIPT, { requestId: id, requests: REQUESTS, plots: f.plots, done: f.done, words: WORD_ROWS, lang });
  const r = req(id);
  const done = runScript(COMPLETE_REQUEST_SCRIPT, { model, requestId: id, profileId: f.profileId, tricks: r.tricks, reward: r.reward, program: clone(r.referenceProgram), robotId: robotFor(model, id), now: NOW, pay: pay.pay, jobLive: pay.jobLive });
  return { pay, model: done.model };
}
/** Her island as the Island page builds it (Island world), from the family as Read family gives it. */
function build(model: any, kept?: unknown) {
  const f = fam(model);
  return runScript(ISLAND_WORLD_SCRIPT, { requests: REQUESTS, plots: f.plots, robots: f.robots, done: f.done, band: f.band, pins: [], kept });
}
/**
 * The Island page running for `ticks` ticks, as Island/World wires it: the tick, then Island keep after every tick; a
 * write lands in the store and the island is built again from it, going on from the state held (the same build).
 */
function play(model: any, ticks: number, opts: { keep?: string } = {}) {
  let m = model;
  let built = build(m).state;
  let state = built;
  const writes: Array<{ tick: number; paid: number; text: string }> = [];
  const earned: number[] = [];
  for (let t = 0; t < ticks; t++) {
    const next = runScript(ISLAND_TICK_SCRIPT, { state, built });
    state = next.state;
    const k = runScript(opts.keep ?? ISLAND_KEEP_SCRIPT, { state, model: m, robots: fam(m).robots, words: WORD_ROWS, lang: 'en' });
    if (k.due) {
      m = k.model;
      writes.push({ tick: state.tick, paid: k.paid, text: k.text });
      // The store written → Read family → Island world again, the held state as Kept.
      built = build(m, state).state;
      if (built.build === state.build) state = built;
    }
    earned.push(active(m).shells.earned);
  }
  return { model: m, state, writes, earned };
}
const liveOn = (s: any, id: string) => s.live[id];
const meters = (things: any[], kind: string) => things.filter((t) => t.kind === kind).map((t) => t.have ?? t.count ?? 0);

describe('IW-006 AC1 — the earnings table: every mission, both bands', () => {
  it('the table covers every job (both bands: 7–9 and 10–12), and each bonus is 5–10; the cap is whole and positive', () => {
    expect(Object.keys(STEPS).sort()).toEqual(JOBS.map((r) => r.id).sort());
    expect(Object.keys(JOB_BONUS).sort()).toEqual(JOBS.map((r) => r.id).sort());
    expect(new Set(JOBS.map((r) => r.band))).toEqual(new Set([1, 2]));
    for (const id of Object.keys(JOB_BONUS)) expect([id, JOB_BONUS[id] >= 5 && JOB_BONUS[id] <= 10 && Number.isInteger(JOB_BONUS[id])]).toEqual([id, true]);
    expect(Number.isInteger(SHELLS_RUN_CAP) && SHELLS_RUN_CAP > 0).toBe(true);
  });

  for (const r of JOBS) {
    it(`🔴 ${r.id} (band ${r.band === 1 ? '7–9' : '10–12'}): a first win pays ${STEPS[r.id]} step${STEPS[r.id] === 1 ? '' : 's'}${STEPS[r.id] > SHELLS_RUN_CAP ? ` (capped at ${SHELLS_RUN_CAP})` : ''} + the bonus ${JOB_BONUS[r.id]} = ${firstWin(r.id)} 🐚, in EN and FR; the plot starts done; a replay earns nothing more`, () => {
      for (const lang of ['en', 'fr']) {
        const m0 = crewed(kid(r.band, lang));
        const a = workshopWin(m0, r.id, lang);
        expect([a.pay.pay, a.pay.has, active(a.model).shells]).toEqual([firstWin(r.id), true, { earned: firstWin(r.id), spent: 0 }]);
        expect(a.pay.text).toBe(PAGE_WORDS.iw6eWinPay[lang as 'en' | 'fr'].split('{n}').join(String(firstWin(r.id))));
        // The plot starts done: its live job is the finish line crossed (every target full), its wear clock at 0.
        const lv = active(a.model).island.plots[r.id].live;
        const laid = helper<any>(ISLAND_ENGINE, 'islLaidOf', r);
        const w = helper<any>(ISLAND_ENGINE, 'worldOf', { map: laid.map, things: lv.things, robots: [], job: laid.job, seed: laid.seed });
        expect([helper<boolean>(ISLAND_ENGINE, 'jobDone', w), lv.age]).toEqual([true, 0]);
        // A replay (Keep tinkering, Play again): done and not worn — nothing more, and no "+N" line.
        const b = workshopWin(a.model, r.id, lang);
        expect([b.pay.pay, b.pay.has, b.pay.text, active(b.model).shells.earned]).toEqual([0, false, '', firstWin(r.id)]);
      }
    });
  }

  it('🔴 the table as the Notes print it (every mission: band, steps, cap, bonus, a first win)', () => {
    const rows = JOBS.map((r) => ({ id: r.id, band: r.band === 1 ? '7–9' : '10–12', steps: STEPS[r.id], paid: Math.min(STEPS[r.id], SHELLS_RUN_CAP), bonus: JOB_BONUS[r.id], first: firstWin(r.id) }));
    // Measured with the engine, never typed: each row's steps are the plot's lack at the island's own laying.
    for (const row of rows) expect([row.id, helper<number>(ISLAND_ENGINE, 'iw6Lack', helper<any>(ISLAND_ENGINE, 'islLaidOf', req(row.id)))]).toEqual([row.id, row.steps]);
    expect(rows.reduce((n, r) => n + r.first, 0)).toBe(173);
    expect(rows.filter((r) => r.band === '7–9').reduce((n, r) => n + r.first, 0)).toBe(46);
  });
});

describe('IW-006 AC1 — a done-and-unworn job earns nothing more; a worn one earns what it lacks; the cap per run', () => {
  it('🔴 done, its robot brought home (no live job: drawn won) → nothing; done and worn (a live job one drink short) → 1 step + the bonus', () => {
    const r = req('tulips-three');
    const m = workshopWin(crewed(kid()), r.id).model;
    // Brought home: the plot keeps its win and nothing lives on it.
    const home = runScript(BRING_HOME_SCRIPT, { model: m, robotId: 'r1' }).model;
    expect(active(home).island.plots[r.id].live).toBeUndefined();
    expect(workshopWin(home, r.id).pay.pay).toBe(0);
    // Worn: the saved live job has one tulip at 2 of 3.
    const worn = clone(m);
    const lv = active(worn).island.plots[r.id].live;
    lv.things.find((t: any) => t.id === 't2').have = 2;
    const again = workshopWin(helper<any>(SAVE_HELPERS, 'modelOf', worn), r.id);
    expect([again.pay.pay, active(again.model).shells.earned]).toEqual([1 + JOB_BONUS[r.id], firstWin(r.id) + 1 + JOB_BONUS[r.id]]);
    // …and the plot starts done again.
    expect(meters(active(again.model).island.plots[r.id].live.things, 'tulip')).toEqual([3, 3, 3]);
  });

  it('🔴 the cap per run holds: path-stones fills 16 steps and pays 10 for them (+ its bonus); the island’s lap is capped the same', () => {
    expect(helper<any>(ISLAND_ENGINE, 'iw6Pay', 'path-stones', 16, 16, true)).toEqual({ shells: SHELLS_RUN_CAP + JOB_BONUS['path-stones'], steps: SHELLS_RUN_CAP, bonus: JOB_BONUS['path-stones'] });
    // An island lap: the bonus's share by the steps it filled; nothing filled, nothing paid; a lap short of the finish no bonus.
    expect(helper<any>(ISLAND_ENGINE, 'iw6Pay', 'tulips-three', 1, 9, true)).toEqual({ shells: 2, steps: 1, bonus: 1 });
    expect(helper<any>(ISLAND_ENGINE, 'iw6Pay', 'tulips-three', 0, 9, true)).toEqual({ shells: 0, steps: 0, bonus: 0 });
    expect(helper<any>(ISLAND_ENGINE, 'iw6Pay', 'tulips-three', 4, 9, false)).toEqual({ shells: 4, steps: 4, bonus: 0 });
    expect(helper<any>(ISLAND_ENGINE, 'iw6Pay', 'free', 3, 3, true)).toEqual({ shells: 3, steps: 3, bonus: 0 });
  });

  it('free play and a request with no job earn nothing (no finish line to pay for)', () => {
    const m = crewed(kid());
    const f = fam(m);
    expect(runScript(WIN_PAY_SCRIPT, { requestId: 'free', requests: REQUESTS, plots: f.plots, done: f.done, words: WORD_ROWS, lang: 'en' })).toMatchObject({ pay: 0, jobLive: null, has: false });
    const noJob = { ...clone(req('tulips-three')), id: 'nojob' } as any;
    delete noJob.job;
    delete noJob.seeded;
    expect(runScript(WIN_PAY_SCRIPT, { requestId: 'nojob', requests: [noJob], plots: {}, done: [], words: WORD_ROWS, lang: 'en' }).pay).toBe(0);
  });
});

describe('IW-006 D3 — the island pays a pinned robot’s laps; its live job goes into her save at the moments that matter', () => {
  it('🔴 a plot won in the Workshop starts done: its robot waits at home; wear reopens it (a moment, written); the lap that refills it pays 1 step + its bonus share, written with the live job', () => {
    const r = req('tulip-door');
    const m = workshopWin(crewed(kid()), r.id).model;
    const s0 = build(m).state;
    expect([liveOn(s0, r.id).phase, liveOn(s0, r.id).robot.x, liveOn(s0, r.id).robot.y]).toEqual(['wait', r.job!.home.x, r.job!.home.y]);
    const run = play(m, WEAR.tulip + 40);
    // Two writes: wear reopened the job (nothing paid), the lap refilled it (1 step, the bonus's third, rounded: 5/3 → 2).
    expect(run.writes.map((w) => [w.tick, w.paid])).toEqual([[WEAR.tulip, 0], [expect.any(Number), 1 + Math.round(JOB_BONUS[r.id] / 3)]]);
    expect(run.writes[1].text).toBe(`Pip +${1 + Math.round(JOB_BONUS[r.id] / 3)} 🐚`);
    const p = active(run.model);
    expect(p.shells).toEqual({ earned: firstWin(r.id) + 1 + Math.round(JOB_BONUS[r.id] / 3), spent: 0 });
    // The save holds the island as the lap left it: the tulip full again, the wear clock where the island is.
    expect(meters(p.island.plots[r.id].live.things, 'tulip')).toEqual([3]);
    expect(p.island.plots[r.id].live.age).toBe(run.writes[1].tick);
  });

  it('🔴 a pinned plot with no live job (a v4 save) works from the island’s start: its first lap pays the whole job (capped) and the whole bonus', () => {
    const r = req('tulips-three');
    const m = crewed(kid());
    active(m).island.done.push(r.id);
    active(m).island.plots[r.id] = { program: clone(r.referenceProgram), robotId: 'r1', wonAt: 1 };
    const run = play(helper<any>(SAVE_HELPERS, 'modelOf', m), 80);
    // Its first write is the lap that filled the bed (then wear reopens it at WEAR.tulip: a write that pays nothing).
    expect(run.writes.map((w) => w.paid)).toEqual([Math.min(9, SHELLS_RUN_CAP) + JOB_BONUS[r.id], 0]);
    // The save holds the bed as the last moment left it: wear took one drink (8 of 9), the robot about to go back.
    const saved = meters(active(run.model).island.plots[r.id].live.things, 'tulip');
    expect([saved.reduce((a, b) => a + b, 0), saved.filter((h) => h === 2).length]).toEqual([8, 1]);
  });

  it('🔴 AC2: over a long island session (four robots on four plots, ten minutes of island ticks) earned only grows, spent never moves, and writes happen only at moments — never every tick', () => {
    let m = crewed(kid());
    const PLOTS = ['tulips-three', 'path-stones', 'eggs-count', 'rock-flower'];
    for (const id of PLOTS) m = workshopWin(m, id).model;
    expect(PLOTS.map((id) => active(m).island.plots[id].robotId)).toEqual(['r1', 'cobble', 'pocket', 'echo']);
    const start = clone(active(m).shells);
    const TICKS = Math.round((10 * 60 * 1000) / (2 * 380));
    const run = play(m, TICKS);
    expect(run.earned.every((e, i) => i === 0 || e >= run.earned[i - 1])).toBe(true);
    expect(active(run.model).shells.spent).toBe(start.spent);
    expect(active(run.model).shells.earned).toBeGreaterThan(start.earned);
    expect(run.writes.length).toBeGreaterThan(0);
    expect(run.writes.length).toBeLessThan(TICKS / 10);
    // A reading for the Notes: what four robots at work pay over ten minutes of the Island page open (a tick is two steps of 380 ms).
    // eslint-disable-next-line no-console
    console.log(`IW-006 reading: ${PLOTS.join(' + ')}, ${TICKS} island ticks (10 min): +${active(run.model).shells.earned - start.earned} 🐚 in ${run.writes.length} writes (${run.writes.filter((w) => w.paid > 0).length} paid laps: ${run.writes.filter((w) => w.paid > 0).map((w) => w.paid).join(' ')})`);
  });

  it('🔴 a robot brought home meanwhile: the moment writes nothing for its plot (still hers, but no longer pinned)', () => {
    const r = req('tulip-door');
    const m = workshopWin(crewed(kid()), r.id).model;
    const s = build(m).state;
    const moment = clone(s);
    moment.live[r.id].moment = true;
    moment.live[r.id].paid = { shells: 3, steps: 1, bonus: 2 };
    const home = runScript(BRING_HOME_SCRIPT, { model: m, robotId: 'r1' }).model;
    const k = runScript(ISLAND_KEEP_SCRIPT, { state: moment, model: home, robots: fam(home).robots, words: WORD_ROWS, lang: 'en' });
    expect([k.due, k.paid, 'model' in k]).toEqual([false, 0, false]);
    // Known-firing: the same moment on the pinned save writes and pays.
    const k2 = runScript(ISLAND_KEEP_SCRIPT, { state: moment, model: m, robots: fam(m).robots, words: WORD_ROWS, lang: 'en' });
    expect([k2.due, k2.paid, active(k2.model).shells.earned - active(m).shells.earned]).toEqual([true, 3, 3]);
  });
});

describe('IW-006 — the live job across an app restart (the save, not the page’s memory)', () => {
  it('🔴 the island’s build name does not move with a live job (the write would rebuild the island and drop the state it keeps)', () => {
    const r = req('tulip-door');
    const m = workshopWin(crewed(kid()), r.id).model;
    const other = clone(m);
    active(other).island.plots[r.id].live.age = 55;
    active(other).island.plots[r.id].live.things.find((t: any) => t.kind === 'tulip').have = 1;
    expect(build(helper<any>(SAVE_HELPERS, 'modelOf', other)).state.build).toBe(build(m).state.build);
    // Known-firing: the program changing does move it.
    const moved = clone(m);
    active(moved).island.plots[r.id].program = [{ id: 1, t: 'fwd' }];
    expect(build(helper<any>(SAVE_HELPERS, 'modelOf', moved)).state.build).not.toBe(build(m).state.build);
  });

  it('🔴 restarted (the save encoded, decoded, the island built with nothing kept): each pinned job plot goes on from its live job — a worn one works, a done one waits at home — its wear clock where its last moment left it', () => {
    let m = crewed(kid());
    for (const id of ['tulip-door', 'eggs-count']) m = workshopWin(m, id).model;
    // The island ran: the door's tulip was reopened by wear and not refilled yet (the page closed mid-lap).
    const run = play(m, WEAR.tulip + 2);
    // One write: the door's tulip reopened at WEAR.tulip (the eggs' basket wears later, at WEAR.basket).
    expect(run.writes.map((w) => w.tick)).toEqual([WEAR.tulip]);
    const code = runScript(ENCODE_SAVE_SCRIPT, { model: run.model }).code;
    const back = runScript(DECODE_SAVE_SCRIPT, { code });
    expect([back.ok, back.migrated]).toEqual([true, false]);
    const s = build(back.model).state;
    const door = liveOn(s, 'tulip-door'), eggs = liveOn(s, 'eggs-count');
    expect([door.phase, meters(door.things, 'tulip'), door.age]).toEqual(['work', [2], WEAR.tulip]);
    // The can Pip held at home is back where the job lays it (the save has no robot in it): his program picks it up.
    expect(door.things.filter((t: any) => t.kind === 'can').map((t: any) => [t.x, t.y])).toEqual(req('tulip-door').things.filter((t) => t.kind === 'can').map((t) => [t.x, t.y]));
    // The eggs' basket is full and its robot waits at home; its clock is its last moment's (the win: 0).
    expect([eggs.phase, meters(eggs.things, 'basket'), eggs.age]).toEqual(['wait', [4], 0]);
    expect([door.robot.x, door.robot.y, eggs.robot.x, eggs.robot.y]).toEqual([req('tulip-door').job!.home.x, req('tulip-door').job!.home.y, req('eggs-count').job!.home.x, req('eggs-count').job!.home.y]);
    // …and it goes on: the door's lap pays once it refills (nothing paid twice for the steps the page never paid).
    const after = play(back.model, 40);
    expect(after.writes.filter((w) => w.paid > 0).map((w) => w.paid)).toEqual([1 + Math.round(JOB_BONUS['tulip-door'] / 3)]);
  });
});

describe('IW-006 — Complete request (the Workshop’s win recorded): earning only', () => {
  it('🔴 AC2: the pay Win pay said is earned (never spent); none said, none earned; the plot’s live job is the one Win pay laid', () => {
    const r = req('path-postbox');
    const m = crewed(kid());
    const plain = runScript(COMPLETE_REQUEST_SCRIPT, { model: m, requestId: r.id, tricks: r.tricks, reward: r.reward, program: clone(r.referenceProgram), now: NOW });
    expect([active(plain.model).shells, 'live' in active(plain.model).island.plots[r.id]]).toEqual([{ earned: 0, spent: 0 }, false]);
    const paid = runScript(COMPLETE_REQUEST_SCRIPT, { model: m, requestId: r.id, tricks: r.tricks, reward: r.reward, program: clone(r.referenceProgram), now: NOW, pay: 6, jobLive: { things: [{ kind: 'door', id: 'door-sami', x: 7, y: 3, count: 1, capacity: 1 }], age: 0, seed: 7 } });
    expect(active(paid.model).shells).toEqual({ earned: 6, spent: 0 });
    expect(active(paid.model).island.plots[r.id].live).toEqual({ things: [{ kind: 'door', id: 'door-sami', x: 7, y: 3, count: 1, capacity: 1 }], age: 0, seed: 7 });
    // A negative or broken pay never takes anything away.
    const bad = runScript(COMPLETE_REQUEST_SCRIPT, { model: paid.model, requestId: r.id, tricks: r.tricks, reward: r.reward, program: clone(r.referenceProgram), now: NOW, pay: -40 });
    expect(active(bad.model).shells).toEqual({ earned: 6, spent: 0 });
  });
});

describe('arms: each rule mutated, and the row that kills it', () => {
  const mutate = (script: string, from: string, to: string) => {
    if (script.split(from).length !== 2) throw new Error(`the arm's anchor must occur exactly once: ${from}`);
    return script.replace(from, to);
  };
  it('no cap → path-stones pays 16 for its steps', () => {
    const m = mutate(EARN_ENGINE, 'var work = Math.min(n, SHELLS_RUN_CAP);', 'var work = n;');
    expect(helper<any>(`${ISLAND_ENGINE.replace(EARN_ENGINE, '')}${m}`, 'iw6Pay', 'path-stones', 16, 16, true).steps).toBe(16);
  });
  it('Win pay pays a done plot that never wore (drawn won) → the brought-home row fails', () => {
    const s = mutate(WIN_PAY_SCRIPT, 'else if (doneList.indexOf(id) === -1) now = laid;', 'else now = laid;');
    const f = fam(workshopWin(crewed(kid()), 'tulips-three').model);
    const plots = clone(f.plots);
    delete plots['tulips-three'].live;
    expect(runScript(s, { requestId: 'tulips-three', requests: REQUESTS, plots, done: f.done, words: WORD_ROWS, lang: 'en' }).pay).toBe(firstWin('tulips-three'));
  });
  it('the build name taken over the live jobs too → the build-name row fails', () => {
    const s = mutate(ISLAND_WORLD_SCRIPT, 'JSON.stringify([iw6Unlive(saved), done,', 'JSON.stringify([saved, done,');
    const m = workshopWin(crewed(kid()), 'tulip-door').model;
    const other = clone(m);
    active(other).island.plots['tulip-door'].live.age = 55;
    const b = (mm: any) => { const f = fam(mm); return runScript(s, { requests: REQUESTS, plots: f.plots, robots: f.robots, done: f.done, band: f.band, pins: [] }).state.build; };
    expect(b(helper<any>(SAVE_HELPERS, 'modelOf', other))).not.toBe(b(m));
  });
  it('the lap’s gain never reset → the second paid lap pays the first one’s steps again', () => {
    const tick = mutate(ISLAND_TICK_SCRIPT, 'gain = {}; moment = true; }', 'moment = true; }');
    const m = workshopWin(crewed(kid()), 'tulip-door').model;
    let state = build(m).state;
    const paid: number[] = [];
    for (let t = 0; t < WEAR.tulip * 2 + 60; t++) {
      state = runScript(tick, { state, built: state }).state;
      const c = liveOn(state, 'tulip-door');
      if (c.paid && c.paid.shells) paid.push(c.paid.steps);
    }
    expect(paid.length).toBeGreaterThanOrEqual(2);
    expect(paid[1]).toBeGreaterThan(1);
  });
  it('Island keep writes without a moment → the long session writes every tick', () => {
    const k = mutate(ISLAND_KEEP_SCRIPT, 'if (pl && pl.job && cur && cur.moment) marked.push(pl);', 'if (pl && pl.job && cur) marked.push(pl);');
    const m = workshopWin(crewed(kid()), 'tulip-door').model;
    expect(play(m, 30, { keep: k }).writes.length).toBe(30);
  });
  it('the resume dropped → a restarted island starts the worn plot from the start (its tulip dry, its clock at 0)', () => {
    const s = mutate(ISLAND_WORLD_SCRIPT, 'if (plot.job && sv.live) iw6Resume(live[req.id], plot, sv.live);', '');
    const m = workshopWin(crewed(kid()), 'tulip-door').model;
    const f = fam(m);
    const c = runScript(s, { requests: REQUESTS, plots: f.plots, robots: f.robots, done: f.done, band: f.band, pins: [] }).state.live['tulip-door'];
    expect([c.phase, meters(c.things, 'tulip'), c.age]).toEqual(['work', [0], 0]);
  });
  it('winPayScript is the page’s Win pay (the registered script is built over the island engine)', () => {
    expect(winPayScript(ISLAND_ENGINE)).toBe(WIN_PAY_SCRIPT);
  });
});

