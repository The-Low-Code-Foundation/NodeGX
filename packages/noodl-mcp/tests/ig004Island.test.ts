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

import { REQUESTS, GardenRequest } from './cg002Content';
import { APPLY_DELTA_SCRIPT, NEW_RUN_SCRIPT, STEP_SCRIPT, runScript } from './cg002Scripts';
import { FREE_PLAY, START_WORLD_SCRIPT } from './cg003Scripts';
import { ISLAND_HOLD_TICKS, ISLAND_TICK_SCRIPT, islandWorldScript } from './ig004Island';

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

function island(plots: Record<string, unknown>, robots: Array<{ id: string }> = [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }], extra: Record<string, unknown> = {}) {
  return bare(SYN_WORLD, { requests: SYN_REQUESTS, plots, robots, done: Object.keys(plots), band: 2, pins: [], ...extra });
}
const pinned = (program: unknown, robotId: string) => ({ program, robotId, wonAt: 1 });

/** The same program run alone, the way the Workshop runs it: Start world's world, New run, Step + Apply per tick. */
function solo(r: GardenRequest, program: unknown, robotId: string, ticks: number) {
  const start = runScript(START_WORLD_SCRIPT, { requests: [r], requestId: r.id, nonce: 0 }).world;
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
      const n = Math.min(aloneT.length, aloneS.length);
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
});
