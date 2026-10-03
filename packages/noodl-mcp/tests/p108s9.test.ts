/**
 * P108 session 9 — what Richard found when the children played on the Windows tablets (2026-10-03), gated here:
 *
 * 1. "The framerate on the kids' tablets is low, so it auto switches to 2D. I tried to switch it back to 3D in the grown
 *    ups tab, but it went back to 2D again. I'd like a manual override" — a grown-up's 3D survives Too Slow
 *    (P108-S9-3D; the Renderer choice rows live in cg003Template.test.ts beside the rule's other rows).
 * 2. "the hints are still showing the old pre-blockly style actions" — the blocks first, Teach second (P108-S9-HINTS;
 *    the Drive-mode row in cg002Engine.test.ts, the tulips line in cg003Template.test.ts).
 * 5. "when you get the robots to build a building, it doesn't show as built until you go back to the island and return to
 *    the plot of land. And sometimes it even goes back to being unbuilt … Once built, they should be permanent and out
 *    of the game modes." — the Workshop writes each part the moment it is delivered, starts from what her save holds,
 *    and a kept island lifts its land to it (P108-S9-BUILT, `p108s9Land.ts`).
 *
 * (3 and 4 — select several blocks, delete them, fold them into a repeat — are the Blocks node's: iw004Blocks.test.ts.)
 *
 * Each rule has an arm: the source mutated at one anchor, the row red.
 *
 * @module noodl-mcp/tests/p108s9.test
 */
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import { LAND_ID, REQUESTS } from './cg002Content';
import { ADD_PROFILE_SCRIPT, ENGINE, helper, runScript } from './cg002Scripts';
import { FAMILY_SCRIPT, ISLAND_WORLD_SCRIPT, START_WORLD_SCRIPT } from './cg003Scripts';
import { ISLAND_TICK_SCRIPT } from './ig004Island';
import { LAND_REQUEST_SCRIPT } from './iw007Building';
import { LAND_KEEP_HERE_SCRIPT, LAND_START_SCRIPT } from './p108s9Land';

const compiled = new Map<string, vm.Script>();
/** A page script run as the runtime runs it: its own context, inputs and outputs through JSON. */
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
/** A source mutated at one anchor (exactly one), for an arm. */
function arm(src: string, anchor: string, by: string): string {
  expect(src.split(anchor).length).toBe(2);
  return src.replace(anchor, by);
}
const TEMPLATE = path.resolve(__dirname, '..', '..', '..', 'templates', 'bot-garden', 'components');
const component = (dir: string) => ({
  nodes: JSON.parse(fs.readFileSync(path.join(TEMPLATE, dir, 'nodes.json'), 'utf8')).nodes as Array<{ id: string; type: string }>,
  wires: (JSON.parse(fs.readFileSync(path.join(TEMPLATE, dir, 'connections.json'), 'utf8')).connections as Array<{ fromId: string; fromProperty: string; toId: string; toProperty: string }>).map((c) => `${c.fromId}.${c.fromProperty}>${c.toId}.${c.toProperty}`)
});

const kid = () => runScript(ADD_PROFILE_SCRIPT, { model: null, name: 'Ada', band: 2, lang: 'en', robotName: 'Pip' }).model;
const active = (m: any) => m.profiles.find((p: any) => p.id === m.island.activeId);
const spa = (stone = 0, plank = 0) => ({ buildings: [{ id: 'b1', bp: 'spa', x: 3, y: 1, have: { stone, plank } }], animals: [] as any[] });
const withLand = (land: unknown) => {
  const m = kid();
  active(m).island.land = land;
  return m;
};
/** The Workshop's start on her land, as Pages/Workshop builds it: Land request (her land as text) → Start world. */
const landStart = (land: unknown) => {
  const requests = bare(LAND_REQUEST_SCRIPT, { requests: REQUESTS, land: JSON.stringify(land) }).requests;
  return bare(START_WORLD_SCRIPT, { requests, requestId: LAND_ID, seed: 1 }).world;
};
const part = (world: any, id: string) => world.things.find((t: any) => t.id === id);

describe('P108 s9 (5) — on her land, the Workshop writes each part the moment it is delivered', () => {
  it('🔴 a run world with stones in the spa → her save holds them at once; a later, lower world never takes one back; another request writes nothing', () => {
    const w = landStart(spa(0, 0));
    part(w, 'b1-stone').have = 4;
    const a = bare(LAND_KEEP_HERE_SCRIPT, { model: withLand(spa(0, 0)), requestId: LAND_ID, world: w });
    expect(a.wrote).toBe(true);
    expect(active(a.model).island.land.buildings[0].have).toEqual({ stone: 4, plank: 0 });
    // A run started again (the old start, before s9) and fewer stones in: nothing is written, nothing falls.
    part(w, 'b1-stone').have = 1;
    const b = bare(LAND_KEEP_HERE_SCRIPT, { model: a.model, requestId: LAND_ID, world: w });
    expect([b.wrote, b.model]).toEqual([false, undefined]);
    // Not her land: the same world writes nothing.
    part(w, 'b1-stone').have = 6;
    expect(bare(LAND_KEEP_HERE_SCRIPT, { model: a.model, requestId: 'tulips-three', world: w }).wrote).toBe(false);
  });

  it('arm: a keep that writes any change (not only a rise) → the lower world takes the stones back', () => {
    const A = arm(LAND_KEEP_HERE_SCRIPT, 'if (h > was) { bs[b].have[t.item] = Math.min(h, Number(t.need) || h); rose = true; }', 'if (h !== was) { bs[b].have[t.item] = h; rose = true; }');
    const w = landStart(spa(0, 0));
    part(w, 'b1-stone').have = 1;
    const b = bare(A, { model: withLand(spa(4, 0)), requestId: LAND_ID, world: w });
    expect(active(b.model).island.land.buildings[0].have.stone).toBe(1);
  });

  it('🔴 the Workshop starts from what her save holds: every part lifted, its stage and the building’s with it; never lowered; any other request as it came', () => {
    const before = landStart(spa(0, 0));
    expect([part(before, 'b1-stone').have, part(before, 'b1-plank').have]).toEqual([0, 0]);
    // Start world is fed the land AS IT WAS when the Workshop opened (a write must not re-run it); Land start lifts it.
    const built = bare(LAND_START_SCRIPT, { world: before, requestId: LAND_ID, land: spa(6, 4) }).world;
    expect([part(built, 'b1-stone').have, part(built, 'b1-plank').have]).toEqual([6, 4]);
    // Its stages are the engine's for those counts (Start world leaves stages to the engine; worldOf writes them).
    const fresh = helper<any>(ENGINE, 'worldOf', landStart(spa(6, 4)));
    for (const id of ['b1-stone', 'b1-plank']) expect([part(built, id).stage, part(built, id).bstage]).toEqual([part(fresh, id).stage, part(fresh, id).bstage]);
    expect(part(built, 'b1-stone').stage).not.toBe(part(before, 'b1-stone').stage);
    // Never lowered: a run world ahead of the save keeps its parts.
    const ahead = JSON.parse(JSON.stringify(before));
    part(ahead, 'b1-stone').have = 5;
    expect(part(bare(LAND_START_SCRIPT, { world: ahead, requestId: LAND_ID, land: spa(2, 0) }).world, 'b1-stone').have).toBe(5);
    // Another request: byte for byte the world it was given.
    const tulips = bare(START_WORLD_SCRIPT, { requests: REQUESTS, requestId: 'tulips-three', seed: 1 }).world;
    expect(bare(LAND_START_SCRIPT, { world: tulips, requestId: 'tulips-three', land: spa(6, 4) }).world).toEqual(tulips);
  });

  it('arm: a start that does not lift → the Workshop opens the spa empty after it was built (the reported defect)', () => {
    const A = arm(LAND_START_SCRIPT, 'iw9LiftLand(w.things, Inputs.land);', 'false;');
    expect(part(bare(A, { world: landStart(spa(0, 0)), requestId: LAND_ID, land: spa(6, 4) }).world, 'b1-stone').have).toBe(0);
  });
});

describe('P108 s9 (5) — the island never draws a part her save holds as unbuilt', () => {
  const STONE = { id: 'b1-stone', kind: 'site', x: 3, y: 1 };
  const carry = [{ id: 1, t: 'until', slots: { cond: { op: 'is', thing: STONE, state: 'done' } }, body: [{ id: 2, t: 'go_nearest', slots: { kind: 'rock' } }, { id: 3, t: 'pick' }, { id: 4, t: 'go_to', slots: { thing: STONE } }, { id: 5, t: 'put' }] }];
  const pinned = (land: unknown) => {
    const m = withLand(land);
    active(m).island.plots[LAND_ID] = { program: carry, robotId: 'r1', wonAt: 1 };
    return m;
  };
  const isle = (model: any, kept?: unknown, script = ISLAND_WORLD_SCRIPT) => {
    const f = runScript(FAMILY_SCRIPT, { model });
    return bare(script, { requests: REQUESTS, plots: f.plots, robots: f.robots, done: f.done, band: f.band, pins: [], land: f.land, kept });
  };
  const liveStone = (state: any) => state.live[LAND_ID].things.find((t: any) => t.id === 'b1-stone');

  it('🔴 a kept island (the same build: have never moves it) is lifted to what her save gained in the Workshop', () => {
    let state = isle(pinned(spa(0, 0))).state;
    for (let t = 0; t < 3; t++) state = bare(ISLAND_TICK_SCRIPT, { state, built: state }).state;
    // Known-firing beside the rule: the Island page opened again goes on from the island it left (the same build).
    const again = isle(pinned(spa(0, 0)), state).state;
    expect([again.build, again.tick]).toEqual([state.build, state.tick]);
    // The Workshop then built the stones in: the same build, and the kept island draws them.
    const lifted = isle(pinned(spa(6, 0)), state).state;
    expect(lifted.build).toBe(state.build);
    expect(liveStone(lifted).have).toBe(6);
  });

  it('arm: no lift → the kept island draws the stones the save holds as not there (the reported defect)', () => {
    let state = isle(pinned(spa(0, 0))).state;
    for (let t = 0; t < 3; t++) state = bare(ISLAND_TICK_SCRIPT, { state, built: state }).state;
    const A = arm(ISLAND_WORLD_SCRIPT, 'if (state.live[IW9_LAND_ID] && Inputs.land) iw9LiftLand(state.live[IW9_LAND_ID].things, Inputs.land);', '');
    expect(liveStone(isle(pinned(spa(6, 0)), state, A).state).have).toBeLessThan(6);
  });
});

describe('P108 s9 (5) — the wiring: no save write can reset the Workshop', () => {
  it('🔴 Read family’s land text (the Workshop’s Land request reads it) does not move when a part is delivered — only when what stands there does', () => {
    const text = (land: unknown) => runScript(FAMILY_SCRIPT, { model: withLand(land) }).landText;
    expect(text(spa(6, 4))).toBe(text(spa(0, 0)));
    // Known-firing beside it: a building placed elsewhere is a different text.
    expect(text({ ...spa(0, 0), buildings: [{ ...spa().buildings[0], x: 4 }] })).not.toBe(text(spa(0, 0)));
    const A = arm(FAMILY_SCRIPT, 'delete iw9Shape.buildings[iw9b].have;', '0;');
    expect(runScript(A, { model: withLand(spa(6, 4)) }).landText).not.toBe(runScript(A, { model: withLand(spa(0, 0)) }).landText);
  });

  it('🔴 Play: the drawn start comes from Land start after Start world; the runner, the pad and Teach start from Land lift; nothing reads Start world’s world directly', () => {
    const { nodes, wires } = component(path.join('Workshop', 'Play'));
    expect(nodes.filter((n) => ['plLandStart', 'plLandLift'].includes(n.id)).map((n) => n.id).sort()).toEqual(['plLandLift', 'plLandStart']);
    for (const w of ['plStart.ran>plLandStart.go', 'plLandStart.world>plSetWorld.value', 'plLandStart.ran>plSetWorld.do', 'plLandLift.world>plRunner.start', 'plLandLift.world>plPad.world', 'plLandLift.world>plTeachStart.start', 'plIn.land>plLandStart.land', 'plIn.land>plLandLift.land', 'plRunner.world>plOut.runWorld', 'plRunner.ticked>plOut.ticked', 'plRecord.world>plOut.runWorld', 'plRecord.ran>plOut.ticked']) expect(wires).toContain(w);
    // The Predict challenge's two readers stay on Start world: her land never has a challenge (Start world: challenge '').
    expect(wires.filter((w) => w.startsWith('plStart.world>')).sort()).toEqual(['plStart.world>plGuessEnd.world', 'plStart.world>plLandLift.world', 'plStart.world>plLandStart.world', 'plStart.world>plSetWorldAsk.value']);
    // Start world itself is not fed her land (a write would re-run it, and its Ran clears her program).
    expect(wires.filter((w) => w.endsWith('>plStart.land'))).toEqual([]);
  });

  it('🔴 Pages/Workshop: each tick on her land → Land keep here → (a part rose) the store’s write; her land into Play', () => {
    const { wires } = component(path.join('Pages', 'Workshop'));
    for (const w of ['wsPlay.ticked>wsLandKeep.go', 'wsPlay.runWorld>wsLandKeep.world', 'wsStore.model>wsLandKeep.model', 'wsReqVar.value>wsLandKeep.requestId', 'wsLandKeep.wrote>wsLandKeepDue.condition', 'wsLandKeep.ran>wsLandKeepDue.eval', 'wsLandKeep.model>wsStore.model', 'wsLandKeepDue.ontrue>wsStore.write', 'wsFam.land>wsPlay.land']) expect(wires).toContain(w);
    // The Land request still takes her land as TEXT (a write that leaves it as it was publishes nothing, s6; s9: nor a part delivered).
    expect(wires).toContain('wsFam.landText>wsLandReqs.land');
  });
});
