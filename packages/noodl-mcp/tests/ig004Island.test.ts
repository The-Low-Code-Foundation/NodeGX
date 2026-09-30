/**
 * P106 IG-004 — the gate over the island as a world: the island tick in the BARE `vm` (AC2), the island built from the
 * requests' maps and her save (AC4, AC5), the plot card (AC3's words), run the way the Function node runs them
 * (`Inputs` in, `Outputs` out) — in a fresh `vm` context with nothing but the script's own globals.
 *
 * - **AC2** two pinned runs step in turn on one island without touching each other's robot (each plot's trace is the
 *   trace of the same program run alone, as the Workshop runs it); a pinned run that ends holds its plot done, resets
 *   the plot's things and its robot, and restarts; 200 ticks with three pinned runs stay under 5 ms a tick.
 *
 * @module noodl-mcp/tests/ig004Island.test
 */
import * as vm from 'vm';

import { FREE_PLAY_PLOT, ISLAND_HOME, REQUESTS, GardenRequest, WORDS } from './cg002Content';
import { ADD_PROFILE_SCRIPT, APPLY_DELTA_SCRIPT, BRING_HOME_SCRIPT, COMPLETE_REQUEST_SCRIPT, NEW_RUN_SCRIPT, STEP_SCRIPT, runScript } from './cg002Scripts';
import { ALL_WORDS_JSON, DRAW_WORLD_SCRIPT, FAMILY_SCRIPT, FREE_PLAY, ISLAND_CHOOSE_SCRIPT, ISLAND_PINS_SCRIPT, ISLAND_ROWS_SCRIPT, ISLAND_WORLD_SCRIPT, START_WORLD_SCRIPT } from './cg003Scripts';
import { PAGE_WORDS } from './cg003Content';
import { ISLAND_HOLD_TICKS, ISLAND_TICK_SCRIPT, PLOT_AT_SCRIPT, islandWorldScript } from './ig004Island';
// P108 IW-003 (lane S): the island's own plot seed and layout, for the job plots.
import { ISLAND_ENGINE } from './ig004Island';
import { helper } from './cg002Scripts';
// P108 IW-002 (lane J): the job tick — the wear clock it runs.
import { WEAR } from './cg002Content';

/** Run a script in a bare vm context — no jest, no Buffer, no window: only what the script brings. */
const compiled = new Map<string, vm.Script>();
function bare(script: string, inputs: Record<string, unknown>): Record<string, any> {
  let s = compiled.get(script);
  if (!s) {
    s = new vm.Script(`(function (Inputs, Outputs) {\n${script}\n})(Inputs, Outputs);`);
    compiled.set(script, s);
  }
  const Outputs: Record<string, any> = {};
  s.runInNewContext({ Inputs: JSON.parse(JSON.stringify(inputs)), Outputs });
  // Out of the vm's realm, so toEqual compares values, not realms.
  return JSON.parse(JSON.stringify(Outputs));
}

const req = (id: string) => REQUESTS.find((r) => r.id === id)!;
const ref = (id: string) => JSON.parse(JSON.stringify(req(id).referenceProgram));

// ── A synthetic island for the engine rows (the real one, its base map and every request's plot, is AC4's) ──
const BASE_W = 28;
const BASE_H = 15;
const SYN_BASE = Array.from({ length: BASE_H }, (_, y) => (y === 7 || y === 0 || y === BASE_H - 1 ? 'P'.repeat(BASE_W) : 'G'.repeat(BASE_W)));
const SYN_PLOTS: Record<string, { x: number; y: number }> = { 'tulips-three': { x: 1, y: 1 }, 'path-stones': { x: 10, y: 1 }, 'path-postbox': { x: 19, y: 1 }, 'tulip-door': { x: 1, y: 8 } };
const SYN_REQUESTS = REQUESTS.filter((r) => SYN_PLOTS[r.id]).map((r) => ({ ...JSON.parse(JSON.stringify(r)), plot: SYN_PLOTS[r.id] }));
const SYN_WORLD = islandWorldScript({ free: FREE_PLAY, base: SYN_BASE, home: { x: 12, y: 10 }, freePlot: { x: 19, y: 8 }, plotW: 8, plotH: 6 });

// P106 IG-005: the stones need Cobble — r2 is a Cobble (a plot needing a robot she lacks is padlocked, never worked).
function island(plots: Record<string, unknown>, robots: Array<{ id: string; kind?: string }> = [{ id: 'r1' }, { id: 'r2', kind: 'cobble' }, { id: 'r3' }], extra: Record<string, unknown> = {}) {
  return bare(SYN_WORLD, { requests: SYN_REQUESTS, plots, robots, done: Object.keys(plots), band: 2, pins: [], ...extra });
}
const pinned = (program: unknown, robotId: string) => ({ program, robotId, wonAt: 1 });

/** The same program run alone, the way the Workshop runs it: Start world's world, New run, Step + Apply per tick. */
function solo(r: GardenRequest, program: unknown, robotId: string, ticks: number) {
  // P108 IW-003 (lane S): a seeded request is laid from the seed the island lays its plot with (its id's djb2).
  const start = runScript(START_WORLD_SCRIPT, { requests: [r], requestId: r.id, nonce: 0, ...(r.seeded ? { seed: helper<number>(ISLAND_ENGINE, 'islSeedOf', r.id) } : {}) }).world;
  start.robots[0].id = robotId;
  let run = runScript(NEW_RUN_SCRIPT, { program, robotId, lang: 'en', runId: 'solo' }).run;
  let world = start;
  const trace: Array<{ x: number; y: number; d: number; things: string }> = [];
  for (let t = 0; t < ticks; t++) {
    let st = runScript(STEP_SCRIPT, { run, world });
    if (st.waiting) st = runScript(STEP_SCRIPT, { run: st.run, world, answer: { seq: st.request.seq, ok: false, fallback: true } });
    run = st.run;
    world = runScript(APPLY_DELTA_SCRIPT, { world, delta: st.delta }).world;
    const rb = world.robots[0];
    trace.push({ x: rb.x, y: rb.y, d: rb.d, things: JSON.stringify(world.things) });
    if (st.done) break;
  }
  return trace;
}

describe('IG-004 — the island as a world', () => {
  describe('AC2 — the island tick, in the bare vm', () => {
    it('🔴 two pinned runs step in turn on ONE island and never touch each other’s robot: each plot’s trace is its program run alone', () => {
      const built = island({ 'tulips-three': pinned(ref('tulips-three'), 'r1'), 'path-stones': pinned(ref('path-stones'), 'r2') });
      expect(built.working).toBe(2);
      // Two robots at work, each with its own id, on its own plot; the third robot is at home.
      expect(built.world.robots.map((r: any) => [r.id, r.plot || 'home'])).toEqual([['r1', 'tulips-three'], ['r2', 'path-stones'], ['r3', 'home']]);
      const aloneT = solo(req('tulips-three'), ref('tulips-three'), 'r1', 400);
      const aloneS = solo(req('path-stones'), ref('path-stones'), 'r2', 400);
      let state = built.state;
      // P108 IW-003 (lane S): path-stones is a job plot now, and the island wears it (a rock regrows every WEAR.rock ticks,
      // which the Workshop never does): the traces are the same up to the first wear tick.
      const n = Math.min(aloneT.length, aloneS.length, WEAR.rock - 1);
      for (let t = 0; t < n; t++) {
        const out = bare(ISLAND_TICK_SCRIPT, { state });
        state = out.state;
        const [a, b] = ['tulips-three', 'path-stones'].map((id) => state.live[id]);
        expect({ t, id: 'tulips', at: { x: a.robot.x, y: a.robot.y, d: a.robot.d, things: JSON.stringify(a.things) } }).toEqual({ t, id: 'tulips', at: aloneT[t] });
        expect({ t, id: 'stones', at: { x: b.robot.x, y: b.robot.y, d: b.robot.d, things: JSON.stringify(b.things) } }).toEqual({ t, id: 'stones', at: aloneS[t] });
        // The composed world: each robot on its own plot, in island coordinates, by its own id.
        const rs = out.world.robots;
        expect(rs.find((r: any) => r.id === 'r1')).toMatchObject({ x: a.robot.x + SYN_PLOTS['tulips-three'].x, y: a.robot.y + SYN_PLOTS['tulips-three'].y });
        expect(rs.find((r: any) => r.id === 'r2')).toMatchObject({ x: b.robot.x + SYN_PLOTS['path-stones'].x, y: b.robot.y + SYN_PLOTS['path-stones'].y });
      }
      // Known-firing beside the equality: the two traces are not the same trace (each robot really moved its own way).
      expect(JSON.stringify(aloneT.slice(0, n))).not.toBe(JSON.stringify(aloneS.slice(0, n)));
      expect(new Set(aloneT.map((p) => `${p.x},${p.y}`)).size).toBeGreaterThan(3);
    });

    it('🔴 a pinned run that ends holds its plot done, then the plot resets (its things and its robot back to the start) and the run restarts', () => {
      let state = island({ 'tulips-three': pinned(ref('tulips-three'), 'r1') }).state;
      const start = JSON.parse(JSON.stringify(state.plots.find((p: any) => p.id === 'tulips-three').start));
      const alone = solo(req('tulips-three'), ref('tulips-three'), 'r1', 400);
      const wet = (s: any) => s.live['tulips-three'].things.filter((t: any) => t.kind === 'tulip' && t.watered).length;
      // Run to the end: the last solo tick is the done tick.
      for (let t = 0; t < alone.length; t++) state = bare(ISLAND_TICK_SCRIPT, { state }).state;
      const cur = state.live['tulips-three'];
      expect([cur.hold, cur.lap, wet(state)]).toEqual([ISLAND_HOLD_TICKS, 0, 3]);
      // Held: the plot is seen done, the robot still where it ended.
      for (let h = 1; h < ISLAND_HOLD_TICKS; h++) {
        state = bare(ISLAND_TICK_SCRIPT, { state }).state;
        expect([state.live['tulips-three'].hold, wet(state), state.live['tulips-three'].robot.x]).toEqual([ISLAND_HOLD_TICKS - h, 3, alone[alone.length - 1].x]);
      }
      // The reset: things and robot back to the request's start, a fresh run (lap 1, its own id), nothing watered.
      state = bare(ISLAND_TICK_SCRIPT, { state }).state;
      const reset = state.live['tulips-three'];
      expect([reset.hold, reset.lap, reset.run.pc, reset.run.runId]).toEqual([0, 1, 0, 'island-tulips-three-1']);
      expect({ things: reset.things, robot: reset.robot }).toEqual({ things: start.things, robot: start.robot });
      expect(wet(state)).toBe(0);
      // …and it works again: the next ticks follow the same trace from the top.
      for (let t = 0; t < 12; t++) {
        state = bare(ISLAND_TICK_SCRIPT, { state }).state;
        const r = state.live['tulips-three'].robot;
        expect({ t, at: { x: r.x, y: r.y, d: r.d } }).toEqual({ t, at: { x: alone[t].x, y: alone[t].y, d: alone[t].d } });
      }
    });

    it('🔴 an ask on the island takes the fallback (no Olive on the tick), as runToEnd does — the run never parks', () => {
      const program = [{ id: 1, t: 'olive:say-thanks' }, { id: 2, t: 'fwd' }];
      let state = island({ 'path-postbox': pinned(program, 'r1') }).state;
      const seen: number[] = [];
      for (let t = 0; t < 4; t++) {
        state = bare(ISLAND_TICK_SCRIPT, { state }).state;
        seen.push(state.live['path-postbox'].robot.x);
        expect(state.live['path-postbox'].run.waiting).toBe(false);
      }
      expect(seen).toEqual([0, 1, 1, 1]);
    });

    it('🔴 a held state from an OLDER build (a tick’s write landing after a rebuild’s) is dropped for the latest build: a robot brought home stays home', () => {
      const pinnedIsland = island({ 'tulips-three': pinned(ref('tulips-three'), 'r1') }, [{ id: 'r1' }]);
      let old = pinnedIsland.state;
      for (let t = 0; t < 3; t++) old = bare(ISLAND_TICK_SCRIPT, { state: old, built: pinnedIsland.state }).state;
      // Same build: the held state goes on (the robot keeps working).
      expect(old.live['tulips-three'].run.pc).toBeGreaterThan(0);
      // Rebuilt with the robot home; the variable still holds the old build's state.
      const homeIsland = island({ 'tulips-three': { program: null, robotId: '', wonAt: 1 } }, [{ id: 'r1' }]);
      expect(homeIsland.state.build).not.toBe(pinnedIsland.state.build);
      const next = bare(ISLAND_TICK_SCRIPT, { state: old, built: homeIsland.state });
      expect(Object.keys(next.state.live)).toEqual([]);
      expect(next.world.robots.map((r: any) => [r.id, !!r.home])).toEqual([['r1', true]]);
      // Known-firing: with no build handed in, the old state would have gone on with the robot at work.
      expect(Object.keys(bare(ISLAND_TICK_SCRIPT, { state: old }).state.live)).toEqual(['tulips-three']);
    });

    describe('arms: the tick mutated, and the row that kills it', () => {
      const mutate = (script: string, from: string, to: string) => {
        if (script.split(from).length !== 2) throw new Error(`the arm's anchor must occur exactly once: ${from}`);
        return script.replace(from, to);
      };
      it('every plot steps the FIRST plot’s run and robot (one shared run, the gardenRun trap) → the two-runs row fails', () => {
        const m = mutate(ISLAND_TICK_SCRIPT, 'live[plot.id] = islStepPlot(plot, live[plot.id]);', 'live[plot.id] = islStepPlot(plot, live[Object.keys(live)[0]]);');
        let state = island({ 'tulips-three': pinned(ref('tulips-three'), 'r1'), 'path-stones': pinned(ref('path-stones'), 'r2') }).state;
        const aloneS = solo(req('path-stones'), ref('path-stones'), 'r2', 400);
        for (let t = 0; t < 6; t++) state = bare(m, { state }).state;
        const b = state.live['path-stones'].robot;
        expect({ x: b.x, y: b.y, d: b.d }).not.toEqual({ x: aloneS[5].x, y: aloneS[5].y, d: aloneS[5].d });
      });
      it('the reset keeps what the run left (the tulips stay watered on the next lap) → the reset row fails', () => {
        const m = mutate(ISLAND_TICK_SCRIPT, 'var st = islClone(plot.start);', 'var st = { things: cur.things, robot: islClone(plot.start).robot };');
        let state = island({ 'tulips-three': pinned(ref('tulips-three'), 'r1') }).state;
        const n = solo(req('tulips-three'), ref('tulips-three'), 'r1', 400).length + ISLAND_HOLD_TICKS;
        for (let t = 0; t < n; t++) state = bare(m, { state }).state;
        expect(state.live['tulips-three'].lap).toBe(1);
        expect(state.live['tulips-three'].things.filter((t: any) => t.kind === 'tulip' && t.watered).length).toBe(3);
      });
    });

    it(`🔴 200 ticks with three pinned runs stay under 5 ms a tick (the tick is on the tablet’s CPU beside Olive)`, () => {
      let state = island({ 'tulips-three': pinned(ref('tulips-three'), 'r1'), 'path-stones': pinned(ref('path-stones'), 'r2'), 'path-postbox': pinned(ref('path-postbox'), 'r3') }).state;
      expect(Object.keys(state.live).sort()).toEqual(['path-postbox', 'path-stones', 'tulips-three']);
      // The node compiles its script once and runs it per tick; the state goes in and out as the page passes it.
      const script = new vm.Script(`(function (Inputs, Outputs) {\n${ISLAND_TICK_SCRIPT}\n})(Inputs, Outputs);`);
      const ctx = vm.createContext({ Inputs: {}, Outputs: {} });
      for (let w = 0; w < 20; w++) {
        ctx.Inputs = { state };
        ctx.Outputs = {};
        script.runInContext(ctx);
      }
      const ms: number[] = [];
      let laps = 0;
      for (let t = 0; t < 200; t++) {
        ctx.Inputs = { state };
        ctx.Outputs = {};
        const t0 = process.hrtime.bigint();
        script.runInContext(ctx);
        ms.push(Number(process.hrtime.bigint() - t0) / 1e6);
        state = ctx.Outputs.state;
        expect(ctx.Outputs.world.robots.filter((r: any) => r.plot).length).toBe(3);
        laps = Math.max(laps, ...Object.values(state.live).map((l: any) => l.lap));
      }
      const sorted = [...ms].sort((a, b) => a - b);
      const mean = ms.reduce((a, b) => a + b, 0) / ms.length;
      const p95 = sorted[Math.floor(ms.length * 0.95)];
      // eslint-disable-next-line no-console
      console.log(`IG-004 AC2 tick: 200 ticks × 3 pinned runs — mean ${mean.toFixed(3)} ms, p95 ${p95.toFixed(3)} ms, max ${sorted[sorted.length - 1].toFixed(3)} ms, laps ${laps}`);
      expect(mean).toBeLessThan(5);
      expect(p95).toBeLessThan(5);
      // The runs really ran round: the path is 7 ticks long, so in 200 ticks it has reset many times.
      expect(laps).toBeGreaterThan(5);
    });
  });
  describe('AC3 / AC4 / AC5 — the island as the page reads it: a win pins the robot, another plot says where it works, home frees it, a locked plot says why', () => {
    const WORD_ROWS = JSON.parse(ALL_WORDS_JSON);
    const REQ_ROWS = JSON.parse(JSON.stringify(REQUESTS));
    const w = (lang: 'en' | 'fr', key: string, name = 'Pip') => String((WORDS as any)[key]?.[lang] ?? (PAGE_WORDS as any)[key]?.[lang] ?? '').split('{b}').join(name);
    /** What the Island page computes from the stored family: Read family → Island pins → Island world, rows, a card. */
    function islandOf(model: any, lang: 'en' | 'fr' = 'en') {
      const fam = runScript(FAMILY_SCRIPT, { model: JSON.parse(JSON.stringify(model)) });
      const pins = runScript(ISLAND_PINS_SCRIPT, { requests: REQ_ROWS, band: fam.band, done: fam.done, words: WORD_ROWS, lang, botName: fam.botName }).pins;
      const world = runScript(ISLAND_WORLD_SCRIPT, { requests: REQ_ROWS, plots: fam.plots, robots: fam.robots, done: fam.done, band: fam.band, pins });
      const rows = runScript(ISLAND_ROWS_SCRIPT, { requests: REQ_ROWS, band: fam.band, done: fam.done, plots: fam.plots, robots: fam.robots, words: WORD_ROWS, lang, botName: fam.botName }).rows;
      const card = (requestId: string) => runScript(ISLAND_CHOOSE_SCRIPT, { requestId, cards: world.cards, requests: REQ_ROWS, plots: fam.plots, robots: fam.robots, words: WORD_ROWS, lang, botName: fam.botName });
      return { fam, pins, world, rows, card };
    }
    const TULIPS = REQ_ROWS.find((r: any) => r.id === 'tulips-three');
    const kid = (band = 2) => runScript(ADD_PROFILE_SCRIPT, { model: null, name: 'Ada', band, lang: 'en', robotName: 'Pip' }).model;
    /** The Workshop's win: Complete request with the program the block list holds (gardenProgram is JSON text). */
    const winTulips = (model: any) => runScript(COMPLETE_REQUEST_SCRIPT, { model, requestId: 'tulips-three', tricks: TULIPS.tricks, reward: TULIPS.reward, program: JSON.stringify(TULIPS.referenceProgram) }).model;
    const inPlot = (t: { x: number; y: number }, p: { x: number; y: number }) => t.x >= p.x && t.x < p.x + 8 && t.y >= p.y && t.y < p.y + 6;
    const wetOn = (things: any[], p: { x: number; y: number }) => things.filter((t) => t.kind === 'tulip' && t.watered && inPlot(t, p)).length;

    it('🔴 AC3: win the tulips → the robot is ON the tulips’ plot (island coordinates) and stepping; the other plots are there, the robot is not at home', () => {
      const is = islandOf(winTulips(kid()));
      expect(is.fam.plots['tulips-three'].robotId).toBe('r1');
      const card = is.world.cards.find((c: any) => c.id === 'tulips-three');
      expect([card.status, card.robotId]).toEqual(['working', 'r1']);
      expect(is.world.working).toBe(1);
      const bot = is.world.world.robots.find((r: any) => r.id === 'r1');
      expect([bot.plot, bot.x, bot.y]).toEqual(['tulips-three', TULIPS.plot.x + TULIPS.robotStart.x, TULIPS.plot.y + TULIPS.robotStart.y]);
      expect(is.world.world.robots).toHaveLength(1);
      // Stepping: two reads a few ticks apart differ (the drive's clause, here on the engine's world).
      let state = is.world.state;
      const seen = new Set<string>();
      for (let t = 0; t < 8; t++) {
        const out = runScript(ISLAND_TICK_SCRIPT, { state });
        state = out.state;
        const r = out.world.robots.find((x: any) => x.id === 'r1');
        seen.add(`${r.x},${r.y},${r.d}`);
        expect(inPlot(r, TULIPS.plot)).toBe(true);
      }
      expect(seen.size).toBeGreaterThan(3);
    });

    // P106 IG-005: "another plot" is another of PIP's jobs (the door's tulip): the stones need Cobble, a robot she has
    // not been lent yet, so they are padlocked whether Pip works or not (IG-005 AC5, its own clause).
    it('🔴 AC3: open the tulip by the door while Pip works the tulips → “at work on the tulips” and “bring Pip home”; home → the robot is free, the tulips STAY watered', () => {
      const pinned = winTulips(kid());
      const before = islandOf(pinned);
      const stonesRow = before.rows.find((r: any) => r.id === 'tulip-door');
      expect(stonesRow.blocked).toBe(true);
      expect(before.rows.find((r: any) => r.id === 'tulips-three')).toMatchObject({ blocked: false, isDone: true });
      expect(before.rows.find((r: any) => r.id === 'tulips-three').doneWord).toBe('✓ ' + w('en', 'done') + ' · ' + w('en', 'ig4Working'));
      for (const lang of ['en', 'fr'] as const) {
        const c = islandOf(pinned, lang).card('tulip-door');
        expect({ lang, open: c.canOpen, blocked: c.blocked, home: c.showHome, where: c.workingAt }).toEqual({ lang, open: false, blocked: true, home: true, where: 'tulips-three' });
        expect(c.line).toBe(w(lang, 'ig4AtWork').split('{plot}').join(w(lang, 'rqTulipsTitle')));
        expect(c.line).toContain(w(lang, 'rqTulipsTitle'));
        expect(c.homeText).toBe(w(lang, 'ig4Home'));
      }
      // The tulips' own card opens (teach it again) and offers home too; free play always opens.
      expect(before.card('tulips-three')).toMatchObject({ canOpen: true, showHome: true, line: w('en', 'ig4WorksHere') });
      expect(before.card('free')).toMatchObject({ canOpen: true, showHome: false });
      // Bring Pip home.
      const home = runScript(BRING_HOME_SCRIPT, { model: pinned });
      expect(home.freed).toBe('tulips-three');
      const after = islandOf(home.model);
      expect(after.world.cards.find((c: any) => c.id === 'tulips-three').status).toBe('won');
      expect(after.world.working).toBe(0);
      expect(wetOn(after.world.world.things, TULIPS.plot)).toBe(3);
      const bot = after.world.world.robots.find((r: any) => r.id === 'r1');
      expect([bot.x, bot.y, bot.home]).toEqual([ISLAND_HOME.x, ISLAND_HOME.y, true]);
      expect(after.rows.find((r: any) => r.id === 'tulip-door').blocked).toBe(false);
      expect(after.card('tulip-door')).toMatchObject({ canOpen: true, showHome: false, blocked: false });
      // Known-firing beside "stay watered": before the win nothing on the tulips' plot is watered.
      expect(wetOn(islandOf(kid()).world.world.things, TULIPS.plot)).toBe(0);
    });

    it('🔴 AC5: a plot the band cannot do is fenced, padlocked, and says why in one line — EN and FR; it never opens', () => {
      const young = islandOf(kid(1));
      const bowl = REQ_ROWS.find((r: any) => r.id === 'bowl-if');
      expect(young.world.cards.find((c: any) => c.id === 'bowl-if').status).toBe('locked');
      const deco = young.world.world.things.filter((t: any) => (t.kind === 'fence' || t.kind === 'padlock') && inPlot(t, bowl.plot));
      expect(deco).toEqual([{ kind: 'fence', x: bowl.plot.x, y: bowl.plot.y, w: 8, h: 6 }, { kind: 'padlock', x: bowl.plot.x + 4, y: bowl.plot.y + 3 }]);
      // Every band-2 request is locked at 7–9 (fenced); P106 IG-005: so is every request whose robot she has not been
      // lent yet (a new kid has Pip only) — at 10–12 those are the only fences.
      const lacks = (r: any) => (r.needs || 'pip') !== 'pip';
      expect(young.world.world.things.filter((t: any) => t.kind === 'fence').length).toBe(REQ_ROWS.filter((r: any) => r.band === 2 || lacks(r)).length);
      expect(islandOf(kid(2)).world.world.things.filter((t: any) => t.kind === 'fence').length).toBe(REQ_ROWS.filter(lacks).length);
      expect(islandOf(kid(2)).world.cards.filter((c: any) => c.status === 'locked').map((c: any) => [c.id, c.lock])).toEqual(REQ_ROWS.filter(lacks).map((r: any) => [r.id, 'robot']));
      const lines = (['en', 'fr'] as const).map((lang) => islandOf(kid(1), lang).card('bowl-if'));
      for (const [i, lang] of (['en', 'fr'] as const).entries()) {
        expect(lines[i]).toMatchObject({ canOpen: false, blocked: true, showHome: false, status: 'locked' });
        expect(lines[i].line).toBe(w(lang, 'ig4Locked').split('{who}').join(w(lang, 'islBiscuit')).split('{trick}').join(w(lang, 'rqBowlBlurb')));
        expect(lines[i].line.split('\n')).toHaveLength(1);
      }
      expect(lines[0].line).not.toBe(lines[1].line);
    });

    it('🔴 Draw world hands the kits the island’s own kinds: an islander with her request’s title as her bubble (in the language), a fence with its size, a padlock', () => {
      const is = islandOf(kid(1));
      for (const lang of ['en', 'fr'] as const) {
        const drawn = runScript(DRAW_WORLD_SCRIPT, { world: is.world.world, words: WORD_ROWS, lang, botName: 'Pip' }).things;
        const people = drawn.filter((t: any) => t.kind === 'islander');
        expect(people.map((p: any) => [p.who, p.say])).toEqual([['sami', w(lang, 'rqPathTitle')], ['mamie', w(lang, 'rqDoorTitle')], ['biscuit', '']]);
        const fences = drawn.filter((t: any) => t.kind === 'fence');
        // IG-005: the band's locks and the stones' (Cobble is not lent yet).
        expect(fences.length).toBe(REQ_ROWS.filter((r: any) => r.band === 2 || (r.needs || 'pip') !== 'pip').length);
        expect(fences.every((f: any) => f.w === 8 && f.h === 6)).toBe(true);
        expect(drawn.filter((t: any) => t.kind === 'padlock').length).toBe(fences.length);
      }
      // The robot at home is drawn with her look and name, like any robot. IG-005: its OWN look (the family's robot row),
      // whatever name the page hands Draw world — Pip, with his can.
      expect(runScript(DRAW_WORLD_SCRIPT, { world: is.world.world, words: WORD_ROWS, lang: 'en', botName: 'Rosie' }).robots).toMatchObject([{ x: ISLAND_HOME.x, y: ISLAND_HOME.y, name: 'Pip', accessory: 'can' }]);
    });

    it('AC4: every plot is drawn — open plots their start things, the garden its dry tulips; the islanders stand by their next plot, a bubble while it is open; a tap names the plot', () => {
      const is = islandOf(kid(2));
      const things = is.world.world.things;
      for (const r of REQ_ROWS) {
        // P108 IW-003 (lane S): a job plot is drawn as the island lays it (its seed's layout, a site's stage).
        const laid = r.job || r.seeded ? helper<any>(ISLAND_ENGINE, 'worldOf', helper<any>(ISLAND_ENGINE, 'seedWorld', { map: [...r.map], things: JSON.parse(JSON.stringify(r.things)), robots: [] }, r, helper<number>(ISLAND_ENGINE, 'islSeedOf', r.id))) : null;
        const want = (laid ? laid.things : r.things).map((t: any) => ({ ...t, x: t.x + r.plot.x, y: t.y + r.plot.y }));
        expect({ id: r.id, things: things.filter((t: any) => inPlot(t, r.plot) && t.kind !== 'islander' && t.kind !== 'fence' && t.kind !== 'padlock') }).toEqual({ id: r.id, things: want });
      }
      expect(things.filter((t: any) => inPlot(t, FREE_PLAY_PLOT)).map((t: any) => t.kind)).toEqual(['tulip', 'tulip', 'tulip']);
      const people = things.filter((t: any) => t.kind === 'islander');
      expect(people.map((p: any) => [p.who, p.requestId, p.sayKey])).toEqual([
        ['sami', 'path-postbox', 'rqPathTitle'],
        ['mamie', 'tulip-door', 'rqDoorTitle'],
        ['biscuit', 'bowl-if', 'rqBowlTitle']
      ]);
      // At 7–9 Biscuit has nothing open for this kid: she stands by her (locked) plot, no bubble.
      expect(islandOf(kid(1)).world.world.things.find((t: any) => t.kind === 'islander' && t.who === 'biscuit')).toMatchObject({ sayKey: '', requestId: 'bowl-if' });
      // A tap: a tile of the tulips' plot, the tile Mamie stands on, a path tile.
      const at = (x: number, y: number) => runScript(PLOT_AT_SCRIPT, { cards: is.world.cards, x, y }).requestId;
      const mamie = people.find((p: any) => p.who === 'mamie');
      expect([at(TULIPS.plot.x + 3, TULIPS.plot.y + 2), at(mamie.x, mamie.y), at(TULIPS.plot.x - 1, TULIPS.plot.y), at(FREE_PLAY_PLOT.x, FREE_PLAY_PLOT.y)]).toEqual(['tulips-three', 'tulip-door', '', 'free']);
    });
  });
  describe('IG-005 (P106 s4) — robots for the job on the island: each at work on its plot in its own look; a plot padlocked for the robot it needs', () => {
    const WORD_ROWS = JSON.parse(ALL_WORDS_JSON);
    const REQ_ROWS = JSON.parse(JSON.stringify(REQUESTS));
    const w = (lang: 'en' | 'fr', key: string) => String((WORDS as any)[key]?.[lang] ?? (PAGE_WORDS as any)[key]?.[lang] ?? '');
    const fill = (s: string, v: Record<string, string>) => Object.entries(v).reduce((a, [k, x]) => a.split('{' + k + '}').join(x), s);
    const kid = (lang: 'en' | 'fr' = 'en', band = 2) => runScript(ADD_PROFILE_SCRIPT, { model: null, name: 'Ada', band, lang, robotName: 'Pip' }).model;
    const win = (model: any, id: string, robotId = 'r1') => runScript(COMPLETE_REQUEST_SCRIPT, { model, requestId: id, tricks: req(id).tricks, reward: req(id).reward, program: JSON.stringify(req(id).referenceProgram), robotId }).model;
    function islandOf(model: any, lang: 'en' | 'fr' = 'en') {
      const fam = runScript(FAMILY_SCRIPT, { model: JSON.parse(JSON.stringify(model)) });
      const pins = runScript(ISLAND_PINS_SCRIPT, { requests: REQ_ROWS, band: fam.band, done: fam.done, words: WORD_ROWS, lang, botName: fam.botName }).pins;
      const world = runScript(ISLAND_WORLD_SCRIPT, { requests: REQ_ROWS, plots: fam.plots, robots: fam.robots, done: fam.done, band: fam.band, pins });
      const rows = runScript(ISLAND_ROWS_SCRIPT, { requests: REQ_ROWS, band: fam.band, done: fam.done, plots: fam.plots, robots: fam.robots, words: WORD_ROWS, lang, botName: fam.botName }).rows;
      const card = (requestId: string) => runScript(ISLAND_CHOOSE_SCRIPT, { requestId, cards: world.cards, requests: REQ_ROWS, plots: fam.plots, robots: fam.robots, words: WORD_ROWS, lang, botName: fam.botName });
      return { fam, world, rows, card };
    }

    it('🔴 AC5: the stones are padlocked until Sami lends Cobble; the line names Cobble, what he does, Sami and the request — EN and FR; the post-box walk opens them', () => {
      for (const band of [1, 2]) {
        for (const lang of ['en', 'fr'] as const) {
          const is = islandOf(kid(lang, band), lang);
          const c = is.card('path-stones');
          expect({ band, lang, status: c.status, open: c.canOpen, blocked: c.blocked, home: c.showHome }).toEqual({ band, lang, status: 'locked', open: false, blocked: true, home: false });
          expect(c.line).toBe(fill(w(lang, 'ig5Locked'), { r: 'Cobble', does: w(lang, 'ig5DoesCobble'), who: w(lang, 'islSami'), q: w(lang, 'rqPathTitle') }));
          expect(c.line).not.toMatch(/[{}]/);
          expect(is.rows.find((r: any) => r.id === 'path-stones').blocked).toBe(true);
          expect(is.world.world.things.filter((x: any) => x.kind === 'padlock' && x.x === req('path-stones').plot.x + 4 && x.y === req('path-stones').plot.y + 3)).toHaveLength(1);
        }
      }
      // Known-firing beside the lock: after the post-box walk (Cobble lent) the stones open, no fence on them.
      const lent = islandOf(win(kid(), 'path-postbox'));
      expect(lent.card('path-stones')).toMatchObject({ status: 'open', canOpen: true, blocked: false });
      expect(lent.rows.find((r: any) => r.id === 'path-stones').blocked).toBe(false);
      // The band's own lock keeps its line where the band is the reason (the bowl at 7–9).
      expect(islandOf(kid('en', 1)).card('bowl-if').line).toBe(fill(w('en', 'ig4Locked'), { who: w('en', 'islBiscuit'), trick: w('en', 'rqBowlBlurb') }));
    });

    it('🔴 AC4: two robots on the island at once, each on its own plot, each in its colour with its accessory — and each brought home by its own card', () => {
      // The post box won first (Cobble lent; Pip then taught the tulips and works there), then Cobble wins the stones.
      let m = win(kid(), 'path-postbox');
      m = win(m, 'tulips-three');
      m = runScript(COMPLETE_REQUEST_SCRIPT, { model: m, requestId: 'path-stones', tricks: req('path-stones').tricks, reward: req('path-stones').reward, program: JSON.stringify(req('path-stones').referenceProgram), robotId: 'cobble' }).model;
      const is = islandOf(m);
      expect(is.world.working).toBe(2);
      const drawn = runScript(DRAW_WORLD_SCRIPT, { world: is.world.world, words: WORD_ROWS, lang: 'en', botName: 'Pip' }).robots;
      const at = (p: { x: number; y: number }) => drawn.find((r: any) => r.x >= p.x && r.x < p.x + 8 && r.y >= p.y && r.y < p.y + 6);
      expect(at(req('tulips-three').plot)).toMatchObject({ name: 'Pip', colour: '#FF7A59', accessory: 'can' });
      expect(at(req('path-stones').plot)).toMatchObject({ name: 'Cobble', colour: '#7A8CA3', accessory: 'hod' });
      // Each ticks on its own plot.
      let state = is.world.state;
      for (let t = 0; t < 6; t++) state = runScript(ISLAND_TICK_SCRIPT, { state }).state;
      expect(Object.keys(state.live).sort()).toEqual(['path-stones', 'tulips-three']);
      // Biscuit's bowl is Cobble's job too: its card says Cobble is at work on the stones, and bringing home is HIS.
      const bowl = is.card('bowl-if');
      expect({ home: bowl.showHome, where: bowl.workingAt, robot: bowl.robotId, text: bowl.homeText }).toEqual({ home: true, where: 'path-stones', robot: 'cobble', text: 'Bring Cobble home' });
      const home = runScript(BRING_HOME_SCRIPT, { model: m, robotId: bowl.robotId });
      expect(home.freed).toBe('path-stones');
      expect(islandOf(home.model).world.working).toBe(1);
      // Known-firing: the tulips' card names Pip, and his home is Pip's.
      expect(is.card('tulip-door')).toMatchObject({ robotId: 'r1', workingAt: 'tulips-three', homeText: 'Bring Pip home' });
    });

    it('🔴 the robots at home stand apart (their names never cover one another on a phone’s 16 px tiles); an islander stands below her own plot, her bubble over it', () => {
      let m = kid();
      for (const id of ['path-postbox', 'bowl-if', 'mamie-note']) m = runScript(COMPLETE_REQUEST_SCRIPT, { model: m, requestId: id, tricks: [], reward: null }).model;
      const is = islandOf(m);
      const home = is.world.world.robots.filter((r: any) => r.home);
      expect(home.map((r: any) => r.id)).toEqual(['r1', 'cobble', 'pocket', 'echo']);
      expect([home[0].x, home[0].y]).toEqual([ISLAND_HOME.x, ISLAND_HOME.y]);
      // Two names on one row are 3 tiles (48 px) apart at least; on rows 2 apart they cannot touch.
      for (let i = 0; i < home.length; i++)
        for (let j = i + 1; j < home.length; j++) expect({ a: home[i].id, b: home[j].id, apart: Math.abs(home[i].x - home[j].x) >= 3 || Math.abs(home[i].y - home[j].y) >= 2 }).toEqual({ a: home[i].id, b: home[j].id, apart: true });
      // Each islander stands below her plot's third tile (her bubble, drawn to her right, lies over her own plot).
      for (const p of is.world.world.things.filter((t: any) => t.kind === 'islander')) {
        const at = REQUESTS.find((r) => r.id === p.requestId)!;
        expect({ who: p.who, x: p.x, y: p.y }).toEqual({ who: p.who, x: at.plot.x + 2, y: at.plot.y + 6 });
      }
    });
  });
});

// ── P108 IW-002 (lane J): the island tick for a plot whose request carries a job — work, done, home, wait, wear, again ──
describe('IW-002 (P108 s1) — the job tick: a job plot is never reset; its robot works, walks home, waits, and goes back when wear reopens the job', () => {
  /** Two tulips of two drinks at 3,1 and 3,2; the robot starts (and lives) at 1,1 facing them. Free water (no can). */
  const BED_MAP = ['GGTGGGTH', 'GGGGGGGG', 'GGGGGGGG', 'PPPPPPPP', 'GWWGGRGG', 'GGGGGTGG'];
  const BED_THINGS = [
    { kind: 'tulip', id: 'ta', x: 3, y: 1, need: 2, have: 0, watered: false },
    { kind: 'tulip', id: 'tb', x: 3, y: 2, need: 2, have: 0, watered: false }
  ];
  const prog = (...t: string[]) => t.map((x, i) => ({ id: i + 1, t: x }));
  /** Forward, two drinks, down a row, two drinks: the job is done on its last pour. */
  const BED_PROGRAM = prog('fwd', 'water', 'water', 'right', 'fwd', 'left', 'water', 'water');
  const jobReq = (id: string, plot: { x: number; y: number }, program = BED_PROGRAM) => ({
    id,
    islander: 'mamie',
    band: 1,
    plot,
    tricks: [2],
    map: BED_MAP,
    things: BED_THINGS,
    robotStart: { x: 1, y: 1, d: 1 },
    goal: { name: 'job_done' },
    palette: ['fwd', 'left', 'right', 'water'],
    reward: { kind: 'hat', id: 'sun', from: 'mamie' },
    copyKeys: { title: 'rqTulipsTitle', blurb: 'rqTulipsBlurb', line: 'rqTulipsLine', reward: 'hatSun', gift: 'giftSun' },
    referenceProgram: program,
    job: { targets: ['ta', 'tb'], home: { x: 1, y: 1, d: 1 } }
  });
  const JOB_PLOT = { x: 10, y: 8 };
  /** The synthetic island with the fixtures on it (a fixture takes the slot of the synthetic request it sits on). */
  const built = (reqs: Array<{ plot: { x: number; y: number } }>, plots: Record<string, unknown>) => bare(SYN_WORLD, { requests: [...SYN_REQUESTS.filter((r) => !reqs.some((q) => q.plot.x === r.plot.x && q.plot.y === r.plot.y)), ...reqs], plots, robots: [{ id: 'r1' }, { id: 'r2', kind: 'cobble' }, { id: 'r3' }], done: Object.keys(plots), band: 2, pins: [] });
  const drinks = (cur: any) => cur.things.filter((t: any) => t.kind === 'tulip').map((t: any) => t.have);
  const pose = (cur: any) => ({ x: cur.robot.x, y: cur.robot.y, d: cur.robot.d });

  it('🔴 AC5 work → done → the robot walks home and waits; the plot is never reset; wear takes a drink at WEAR.tulip and the robot starts its program again on the plot as it stands', () => {
    const is = built([jobReq('job-bed', JOB_PLOT)], { 'job-bed': pinned(BED_PROGRAM, 'r1') });
    let state = is.state;
    expect(state.plots.find((p: any) => p.id === 'job-bed').job).toEqual({ targets: ['ta', 'tb'], home: { x: 1, y: 1, d: 1 } });
    const seen: any[] = [];
    let t = 0;
    for (; t < 60 && state.live['job-bed'].phase !== 'wait'; t++) {
      const out = bare(ISLAND_TICK_SCRIPT, { state });
      state = out.state;
      seen.push({ ...pose(state.live['job-bed']), drinks: drinks(state.live['job-bed']), jobDone: !!(state.live['job-bed'].delta || {}).jobDone, home: !!(state.live['job-bed'].delta || {}).home });
      // The composed world: the robot on its plot, in island coordinates.
      expect(out.world.robots.find((r: any) => r.id === 'r1')).toMatchObject({ x: state.live['job-bed'].robot.x + JOB_PLOT.x, y: state.live['job-bed'].robot.y + JOB_PLOT.y, plot: 'job-bed' });
    }
    const cur = state.live['job-bed'];
    // Done and home: both tulips full, the robot back on its home tile facing its start, lap 0 (nothing was reset).
    expect({ phase: cur.phase, lap: cur.lap, drinks: drinks(cur), at: pose(cur) }).toEqual({ phase: 'wait', lap: 0, drinks: [2, 2], at: { x: 1, y: 1, d: 1 } });
    // Seen walking home: after the jobDone tick the robot left the tulips (2,2) for home (1,1) through 2,1; then the home event once.
    const done = seen.findIndex((s) => s.jobDone);
    expect(done).toBeGreaterThan(0);
    expect(seen.slice(done).map((s) => `${s.x},${s.y}`).filter((p, i, a) => i === 0 || a[i - 1] !== p)).toEqual(['2,2', '2,1', '1,1']);
    expect(seen.filter((s) => s.home)).toHaveLength(1);
    // Waiting: nothing moves and nothing wears until WEAR.tulip island ticks have passed on this plot.
    const waitedAt = cur.age;
    for (let a = waitedAt + 1; a < WEAR.tulip; a++) {
      state = bare(ISLAND_TICK_SCRIPT, { state }).state;
      const w = state.live['job-bed'];
      expect({ a, phase: w.phase, at: pose(w), drinks: drinks(w) }).toEqual({ a, phase: 'wait', at: { x: 1, y: 1, d: 1 }, drinks: [2, 2] });
    }
    // The wear tick: one tulip loses a drink and droops; the job is open again; the robot starts its program (lap 1): its first step.
    state = bare(ISLAND_TICK_SCRIPT, { state }).state;
    const again = state.live['job-bed'];
    expect(again.age).toBe(WEAR.tulip);
    expect(again.worn.filter((d: any) => d.wear)).toHaveLength(1);
    expect([again.phase, again.lap, again.run.runId, pose(again)]).toEqual(['work', 1, 'island-job-bed-1', { x: 2, y: 1, d: 1 }]);
    expect(drinks(again).sort()).toEqual([1, 2]);
    expect(again.things.filter((x: any) => x.droop)).toHaveLength(1);
    // Never reset: the other tulip keeps its two drinks (the start had none) — and it goes back to work until both are full again.
    for (t = 0; t < 60 && state.live['job-bed'].phase !== 'wait'; t++) state = bare(ISLAND_TICK_SCRIPT, { state }).state;
    const back = state.live['job-bed'];
    expect({ phase: back.phase, lap: back.lap, drinks: drinks(back), droop: back.things.filter((x: any) => x.droop).length, at: pose(back) }).toEqual({ phase: 'wait', lap: 1, drinks: [2, 2], droop: 0, at: { x: 1, y: 1, d: 1 } });
  });

  it('🔴 beside it, a plot with no job keeps today’s hold-and-reset (the island drive’s ISLAND_HOLD_TICKS): the job plot’s drinks never go back to the start', () => {
    const is = built([jobReq('job-bed', JOB_PLOT)], { 'job-bed': pinned(BED_PROGRAM, 'r1'), 'tulips-three': pinned(ref('tulips-three'), 'r3') });
    let state = is.state;
    let resets = 0;
    let everStart = 0;
    let drank = false;
    for (let t = 0; t < 3 * WEAR.tulip; t++) {
      const lapBefore = state.live['tulips-three'].lap;
      state = bare(ISLAND_TICK_SCRIPT, { state }).state;
      if (state.live['tulips-three'].lap > lapBefore) resets++;
      const d = drinks(state.live['job-bed']);
      if (d.some((x: number) => x > 0)) drank = true;
      if (drank && d.every((x: number) => x === 0)) everStart++;
      expect(state.live['job-bed'].hold).toBe(0);
    }
    // Known-firing: the plot with no job was reset many times; the job plot never once went back to its start.
    expect(resets).toBeGreaterThan(3);
    // One lap per wear of a tulip in the window (each reopened the job).
    expect([drank, everStart, state.live['job-bed'].lap]).toEqual([true, 0, Math.floor((3 * WEAR.tulip) / WEAR.tulip)]);
  });

  it('🔴 a program that ends with the job NOT done walks home and starts again (lap after lap), never resetting what it did', () => {
    // Only the first tulip: the job is never done, so the robot goes home and again.
    const half = prog('fwd', 'water', 'water');
    let state = built([jobReq('job-half', JOB_PLOT, half)], { 'job-half': pinned(half, 'r1') }).state;
    const phases: string[] = [];
    for (let t = 0; t < 40; t++) {
      state = bare(ISLAND_TICK_SCRIPT, { state }).state;
      const c = state.live['job-half'];
      if (phases[phases.length - 1] !== c.phase) phases.push(c.phase);
    }
    const c = state.live['job-half'];
    expect(phases.slice(0, 4)).toEqual(['work', 'return', 'work', 'return']);
    expect(c.lap).toBeGreaterThanOrEqual(3);
    expect(drinks(c)).toEqual([2, 0]);
  });

  it('🔴 AC3 (engine side): an island left with no tick does not wear; the held state handed back to the tick (same build) goes on with its meters as left', () => {
    const is = built([jobReq('job-bed', JOB_PLOT)], { 'job-bed': pinned(BED_PROGRAM, 'r1') });
    let state = is.state;
    for (let t = 0; t < 30; t++) state = bare(ISLAND_TICK_SCRIPT, { state, built: is.state }).state;
    const left = JSON.parse(JSON.stringify(state.live['job-bed']));
    expect([left.phase, drinks(left)]).toEqual(['wait', [2, 2]]);
    // "The page closed": no tick for as long as you like — the state is data; nothing runs it. Then one tick with the same build:
    const next = bare(ISLAND_TICK_SCRIPT, { state, built: is.state }).state.live['job-bed'];
    expect([next.age, next.phase, drinks(next), next.lap]).toEqual([left.age + 1, 'wait', [2, 2], 0]);
  });

  it('arm: the tick ignores the job (a job plot held and reset like any other) → the never-reset row fails', () => {
    const anchor = '  if (plot.job) return islStepJob(plot, cur);\n';
    expect(ISLAND_TICK_SCRIPT.split(anchor)).toHaveLength(2);
    const m = ISLAND_TICK_SCRIPT.replace(anchor, '');
    let state = built([jobReq('job-bed', JOB_PLOT)], { 'job-bed': pinned(BED_PROGRAM, 'r1') }).state;
    let backToStart = 0;
    let drank = false;
    for (let t = 0; t < 40; t++) {
      state = bare(m, { state }).state;
      const d = drinks(state.live['job-bed']);
      if (d.some((x: number) => x > 0)) drank = true;
      if (drank && d.every((x: number) => x === 0)) backToStart++;
    }
    expect([drank, backToStart > 0]).toEqual([true, true]);
  });

  it(`🔴 the tick with two job plots and a hold-and-reset plot stays under 5 ms (p95), 300 ticks`, () => {
    let state = built([jobReq('job-bed', JOB_PLOT), jobReq('job-two', { x: 1, y: 8 })], { 'job-bed': pinned(BED_PROGRAM, 'r1'), 'job-two': pinned(BED_PROGRAM, 'r2'), 'tulips-three': pinned(ref('tulips-three'), 'r3') }).state;
    const script = new vm.Script(`(function (Inputs, Outputs) {\n${ISLAND_TICK_SCRIPT}\n})(Inputs, Outputs);`);
    const ctx = vm.createContext({ Inputs: {}, Outputs: {} });
    const ms: number[] = [];
    for (let t = 0; t < 300; t++) {
      ctx.Inputs = { state };
      ctx.Outputs = {};
      const t0 = process.hrtime.bigint();
      script.runInContext(ctx);
      ms.push(Number(process.hrtime.bigint() - t0) / 1e6);
      state = ctx.Outputs.state;
    }
    const sorted = [...ms].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(ms.length * 0.95)];
    // eslint-disable-next-line no-console
    console.log(`IW-002 job tick: 300 ticks × (2 job plots + 1 reset plot) — p95 ${p95.toFixed(3)} ms, max ${sorted[sorted.length - 1].toFixed(3)} ms, job laps ${state.live['job-bed'].lap}/${state.live['job-two'].lap}`);
    expect(p95).toBeLessThan(5);
    expect(state.live['job-bed'].lap).toBeGreaterThanOrEqual(3);
  });
});

// ── P108 IW-005 (lane J) ────────────────────────────────────────────────────

describe('IW-005 (P108 s2) — seek on the island: a pinned robot goes to the nearest egg wherever the hen laid it, inside its own plot; the reservation rides the tick', () => {
  /** An open plot: the hen at 6,1 lays in her pen (4..7 × 2..5); Mamie's basket (2 eggs) at 0,1; the robot lives at 1,1 facing it. No egg at the start. */
  const HEN_MAP = ['GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG'];
  const BK = { id: 'bk', kind: 'basket', x: 0, y: 1 };
  const SEEK = [{ id: 1, t: 'repeat', n: 2, body: [{ id: 2, t: 'go_nearest', slots: { kind: 'egg' } }, { id: 3, t: 'pick' }, { id: 4, t: 'go_to', slots: { thing: BK } }, { id: 5, t: 'put' }] }];
  const henReq = (id: string, plot: { x: number; y: number }) => ({
    id,
    islander: 'mamie',
    band: 2,
    plot,
    tricks: [2],
    map: HEN_MAP,
    things: [{ kind: 'hen', id: 'hn', x: 6, y: 1, pen: [4, 2, 7, 5] }, { kind: 'basket', id: 'bk', x: 0, y: 1, count: 0, capacity: 2, item: 'egg' }],
    robotStart: { x: 1, y: 1, d: 3 },
    goal: { name: 'job_done' },
    palette: ['fwd', 'left', 'right', 'pick', 'put', 'repeat'],
    reward: { kind: 'hat', id: 'sun', from: 'mamie' },
    copyKeys: { title: 'rqTulipsTitle', blurb: 'rqTulipsBlurb', line: 'rqTulipsLine', reward: 'hatSun', gift: 'giftSun' },
    referenceProgram: SEEK,
    job: { targets: ['bk'], home: { x: 1, y: 1, d: 3 } }
  });
  const HEN_PLOT = { x: 10, y: 8 };
  const built = (reqs: Array<{ plot: { x: number; y: number } }>, plots: Record<string, unknown>) => bare(SYN_WORLD, { requests: [...SYN_REQUESTS.filter((r) => !reqs.some((q) => q.plot.x === r.plot.x && q.plot.y === r.plot.y)), ...reqs], plots, robots: [{ id: 'r1' }, { id: 'r2', kind: 'cobble' }, { id: 'r3' }], done: Object.keys(plots), band: 2, pins: [] });

  it('🔴 no egg yet: go to nearest says none; the hen lays on ticks; the robot then walks to each egg where it was laid, picks it once, fills the basket, walks home and waits — never outside its plot', () => {
    let state = built([henReq('hen-plot', HEN_PLOT)], { 'hen-plot': pinned(SEEK, 'r1') }).state;
    const laid: string[] = [];
    const picked: string[] = [];
    let nones = 0;
    let firstLay = -1;
    let noneBeforeLay = 0;
    let heldWhileWalking = 0;
    let doneAt = -1;
    for (let t = 0; t < 8 * WEAR.hen && doneAt < 0; t++) {
      const out = bare(ISLAND_TICK_SCRIPT, { state });
      state = out.state;
      const cur = state.live['hen-plot'];
      for (const d of cur.worn || []) if (d.lay) { laid.push(`${d.lay.x},${d.lay.y}`); if (firstLay < 0) firstLay = t; }
      const d = cur.delta || {};
      if (d.none) { nones++; if (firstLay < 0) noneBeforeLay++; expect(d).toMatchObject({ none: { id: 'r1', kind: 'egg' }, sayKey: 'sayNone' }); }
      // (A pick facing the basket after a none takes one back out: the program's own doing, IW-002's container rule — not a seek.)
      if (d.pick && !d.pick.box) picked.push(`${d.pick.x},${d.pick.y}`);
      // The robot walking to an egg holds it reserved in the plot's live state (the tick carries it from tick to tick).
      const s = cur.run.steps[cur.run.pc];
      if (s && s.op === 'seek' && s.target) { expect((cur.reserved || {})[s.target.id]).toBe('r1'); heldWhileWalking++; }
      // Never outside the plot: its tiles in island coordinates.
      const rb = out.world.robots.find((r: any) => r.id === 'r1');
      expect(rb.x >= HEN_PLOT.x && rb.x < HEN_PLOT.x + 8 && rb.y >= HEN_PLOT.y && rb.y < HEN_PLOT.y + 6).toBe(true);
      if (cur.phase === 'wait') doneAt = t;
    }
    const cur = state.live['hen-plot'];
    // The first lay is at WEAR.hen; before it, every go to nearest found nothing and said so.
    expect([firstLay, noneBeforeLay > 0, nones >= noneBeforeLay]).toEqual([WEAR.hen - 1, true, true]);
    // Each egg picked from the ground where the hen laid it, and each once; the job done, home, waiting.
    expect(picked.length).toBeGreaterThanOrEqual(2);
    for (const p of picked) expect(laid).toContain(p);
    expect(new Set(picked).size).toBe(picked.length);
    expect(heldWhileWalking).toBeGreaterThan(0);
    expect({ phase: cur.phase, count: cur.things.find((x: any) => x.id === 'bk').count, at: [cur.robot.x, cur.robot.y, cur.robot.d], lap: cur.lap > 0, reserved: cur.reserved || {} }).toEqual({ phase: 'wait', count: 2, at: [1, 1, 3], lap: true, reserved: {} });
  });

  it(`🔴 the tick with two seek plots and a hold-and-reset plot stays under 5 ms (p95), 300 ticks — a search per walk, not per tick`, () => {
    let state = built([henReq('hen-a', HEN_PLOT), henReq('hen-b', { x: 1, y: 8 })], { 'hen-a': pinned(SEEK, 'r1'), 'hen-b': pinned(SEEK, 'r2'), 'tulips-three': pinned(ref('tulips-three'), 'r3') }).state;
    const script = new vm.Script(`(function (Inputs, Outputs) {\n${ISLAND_TICK_SCRIPT}\n})(Inputs, Outputs);`);
    const ctx = vm.createContext({ Inputs: {}, Outputs: {} });
    const ms: number[] = [];
    let moves = 0;
    let searches = 0;
    for (let t = 0; t < 300; t++) {
      ctx.Inputs = { state };
      ctx.Outputs = {};
      const t0 = process.hrtime.bigint();
      script.runInContext(ctx);
      ms.push(Number(process.hrtime.bigint() - t0) / 1e6);
      state = JSON.parse(JSON.stringify(ctx.Outputs.state));
      for (const id of ['hen-a', 'hen-b']) {
        const c = state.live[id];
        if (c.delta && c.delta.move && (c.delta.op === 'go_nearest' || c.delta.op === 'go_to')) moves++;
        if (c.delta && c.delta.aim) searches++;
      }
    }
    const sorted = [...ms].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(ms.length * 0.95)];
    // eslint-disable-next-line no-console
    console.log(`IW-005 seek tick: 300 ticks × (2 seek plots + 1 reset plot) — p95 ${p95.toFixed(3)} ms, max ${sorted[sorted.length - 1].toFixed(3)} ms, walk moves ${moves}, searches that found ${searches}`);
    expect(p95).toBeLessThan(5);
    // A search per walk: far fewer searches than walking steps.
    expect(moves).toBeGreaterThan(searches);
  });
});
