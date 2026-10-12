/**
 * P108 session 4 (merge) — the seams between the lanes that no lane could see alone.
 *
 * - H × E: a helper used in the shop (lane H) rides a job on the island tick and leaves it at the finish line; lane E's
 *   `Island keep` writes the plot's live job into the save at that moment — so the save must drop the helper too
 *   (lane H could not verify it: its branch had no live write; lane E's keep reads `'helper' in` the tick state).
 * - H × C: a robot copy bought through the shop's Buy (lane H) is sent to a plot she won by the crew's rule (lane C),
 *   and the island works that plot with it.
 */
import * as vm from 'vm';
import { REQUESTS, SHOP } from './cg002Content';
import { ADD_PROFILE_SCRIPT, COMPLETE_REQUEST_SCRIPT, SAVE_HELPERS, helper, runScript } from './cg002Scripts';
import { ALL_WORDS_JSON, ASSIGN_ROBOT_SCRIPT, FAMILY_SCRIPT, ISLAND_WORLD_SCRIPT } from './cg003Scripts';
import { ISLAND_TICK_SCRIPT } from './ig004Island';
import { ISLAND_KEEP_SCRIPT } from './iw006Earn';
import { BUY_SCRIPT, SHOP_IDS, USE_HELPER_SCRIPT } from './iw006Shop';

const compiled = new Map<string, vm.Script>();
/** A page script run as the runtime runs it: its own context, its inputs and outputs through JSON (no shared objects). */
function bare(script: string, inputs: Record<string, unknown>): Record<string, any> {
  let s = compiled.get(script);
  if (!s) {
    s = new vm.Script(`(function (Inputs, Outputs) {\n${script}\n})(Inputs, Outputs);`);
    compiled.set(script, s);
  }
  const Outputs: Record<string, any> = {};
  s.runInNewContext({ Inputs: JSON.parse(JSON.stringify(inputs)), Outputs });
  return JSON.parse(JSON.stringify(Outputs));
}
const WORDS = JSON.parse(ALL_WORDS_JSON);
const REQ_ROWS = REQUESTS;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const req = (id: string) => REQUESTS.find((r) => r.id === id)!;
const kid = () => runScript(ADD_PROFILE_SCRIPT, { model: null, name: 'Ada', band: 2, lang: 'en', robotName: 'Pip' }).model;
const win = (model: any, id: string, robotId?: string) =>
  runScript(COMPLETE_REQUEST_SCRIPT, { model, requestId: id, tricks: req(id).tricks, reward: req(id).reward, program: clone(req(id).referenceProgram), robotId, now: 1759300000000 }).model;
const active = (m: any) => m.profiles.find((p: any) => p.id === m.island.activeId);
const funded = (m: any, n: number) => { helper(SAVE_HELPERS, 'earnShells', active(m), n); return m; };
function isle(model: any) {
  const f = runScript(FAMILY_SCRIPT, { model });
  return bare(ISLAND_WORLD_SCRIPT, { requests: REQUESTS, plots: f.plots, robots: f.robots, done: f.done, band: f.band, pins: [] });
}

/** The self-filling can bought and used on the tulips, then the island ticked, every moment kept as the page keeps it. */
function helperRun(tickScript = ISLAND_TICK_SCRIPT) {
  const fam = funded(win(kid(), 'tulips-three', 'r1'), 20);
  const bought = bare(BUY_SCRIPT, { model: fam, itemId: SHOP_IDS.item + 'selfcan' });
  const used = bare(USE_HELPER_SCRIPT, { model: bought.model, itemId: SHOP_IDS.item + 'selfcan', plotId: SHOP_IDS.plot + 'tulips-three', state: isle(bought.model).state });
  let model = used.model;
  let state = used.state;
  const saved: Array<string | undefined> = [];
  let reachedWait = false;
  for (let t = 0; t < 400 && !reachedWait; t++) {
    state = bare(tickScript, { state, built: state }).state;
    const cur = state.live['tulips-three'];
    if (cur.moment) {
      const k = bare(ISLAND_KEEP_SCRIPT, { state, model, robots: [], words: WORDS, lang: 'en' });
      if (k.due) model = k.model;
      saved.push(active(model).island.plots['tulips-three'].live?.helper);
    }
    if (cur.phase === 'wait') reachedWait = true;
  }
  return { bought, used, model, saved, reachedWait };
}

describe('P108 s4 join — lane H × lane E: a helper leaves the save at its finish line', () => {
  it('🔴 a self-filling can used on the tulips: it leaves owned at once, rides the save while the job runs, and the save drops it when the job is done', () => {
    const r = helperRun();
    expect([r.bought.ok, active(r.used.model).owned, active(r.used.model).island.plots['tulips-three'].live?.helper]).toEqual([true, [], 'selfcan']);
    expect(r.reachedWait).toBe(true);
    // Known-firing beside the absence: the save written by Use it has the helper riding (above); the job is one lap, so
    // the only moment the island keeps is its finish line — where the save has the job done and no helper.
    expect(r.saved[r.saved.length - 1]).toBeUndefined();
    expect(active(r.model).island.plots['tulips-three'].live.things.filter((t: any) => t.kind === 'tulip').every((t: any) => t.have === t.need)).toBe(true);
  });

  it('arm: the finish line leaves the helper absent instead of cleared (lane H’s tick before the merge) → the save keeps it (the row above fails)', () => {
    const anchor = "    out.helper = '';\n";
    expect(ISLAND_TICK_SCRIPT.split(anchor).length).toBe(2);
    const r = helperRun(ISLAND_TICK_SCRIPT.replace(anchor, ''));
    expect(r.saved[r.saved.length - 1]).toBe('selfcan');
  });
});

describe('P108 s4 join — lane H × lane C: a copy bought in the shop is sent to a plot and works it', () => {
  it('🔴 Buy "a new Pip" named Sprout → the crew sends Sprout to the tulips Pip won → the island works the tulips with Sprout', () => {
    // Pip wins the tulips, then the door: he works the door; the tulips keep their program, nobody on them.
    let m = win(win(kid(), 'tulips-three', 'r1'), 'tulip-door', 'r1');
    // P108 IW-006 owed (lane O): the copy's price is SHOP's (was the literal 40 = 30 + 10).
    m = funded(m, SHOP.find((i) => i.id === 'robot:pip')!.price + 10);
    const b = bare(BUY_SCRIPT, { model: m, itemId: SHOP_IDS.item + 'robot:pip', name: 'Sprout' });
    expect([b.ok, b.left]).toEqual([true, 10]);
    const sprout = b.robotId;
    const a = runScript(ASSIGN_ROBOT_SCRIPT, { model: b.model, robotId: `crew|${sprout}`, requestId: 'tulips-three', requests: REQ_ROWS, words: WORDS, lang: 'en', now: 1759300000001 });
    expect(active(a.model).island.plots['tulips-three'].robotId).toBe(sprout);
    const s = isle(a.model).state;
    const plot = s.plots.find((p: any) => p.id === 'tulips-three');
    expect([plot.status, plot.robotId, s.live['tulips-three'].robot.id]).toEqual(['working', sprout, sprout]);
    // Pip still works the door, beside her.
    expect(s.plots.find((p: any) => p.id === 'tulip-door').robotId).toBe('r1');
  });
});
