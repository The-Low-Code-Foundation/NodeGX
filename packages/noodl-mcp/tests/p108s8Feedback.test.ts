/**
 * P108 session 8 — what Richard found playing the island (2026-10-02), each fixed and gated here:
 *
 * 1. "In 'Water my tulips' there appears to be no can to pick up" — ruled: EVERY watering mission lays the can down
 *    (P108-S8-CAN). The can a robot's upgrade made bigger is the one lying there.
 * 2. "after Cobble arrives at whatever the nearest rock is, the fixed list of movements won't apply to just any rock" and
 *    "it's a bit sad that the robot jumps to the rock" — the pad offers go to the nearest SQUARE (and her land's tree and
 *    patch) so the walk back is taught by driving (P108-S8-PADGO); a go press keeps the tiles it walked (`via`) and the
 *    kits draw them a tile at a time (P108-S8-PADJUMP; the kits' half is in ig007Garden3d / cg001GardenKit).
 * 3. The steps column too wide — a divider (garden-kit.Divider) sizes it, the world takes the rest (P108-S8-WIDTH).
 * 4. The Workshop tab with nothing chosen — no Workshop tab (P108-S8-WSTAB).
 * 5. "I can't seem to put it down on the refuge build site … not enough rock" — a put on the wrong part says what the
 *    part wants (P108-S8-WRONGPART); a spent source that grows back says so and its chip wears a sprout
 *    (P108-S8-ROCKWAIT, ruled "keep the wait, but show it"); the Workshop's land shows the island's real amounts
 *    (P108-S8-LANDLEFT).
 *
 * Each rule has an arm: the source mutated at one anchor, the row red.
 *
 * @module noodl-mcp/tests/p108s8Feedback.test
 */
import * as fs from 'fs';
import * as path from 'path';
import { BLUEPRINTS, LAND_ID, LAND_SOURCES, REQUESTS } from './cg002Content';
import { ENGINE, helper, runScript, SAVE_HELPERS } from './cg002Scripts';
import { PAD_GO } from './cg003Content';
import { GARDEN_CSS } from './cg007Look';
import { ALL_WORDS_JSON, DRAW_WORLD_SCRIPT, PAD_KEYS_SCRIPT, RECORD_STEP_SCRIPT, START_WORLD_SCRIPT } from './cg003Scripts';
import { ISLAND_ENGINE } from './ig004Island';
import { LAND_PALETTE, LAND_REQUEST_SCRIPT } from './iw007Building';
import { LAND_SCRIPT } from './iw007Land';

const WORDS = JSON.parse(ALL_WORDS_JSON) as Array<{ key: string; en: string; fr: string }>;
const word = (key: string) => WORDS.find((w) => w.key === key);
const J = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const run = (s: string, i: Record<string, unknown>) => J(runScript(s, J(i)));
const TEMPLATE = path.resolve(__dirname, '..', '..', '..', 'templates', 'bot-garden', 'components');
/** A source mutated at one anchor (exactly one), for an arm. */
function arm(src: string, anchor: string, by: string): string {
  expect(src.split(anchor).length).toBe(2);
  return src.replace(anchor, by);
}
const req = (id: string) => REQUESTS.find((r) => r.id === id)!;
const start = (id: string, extra: Record<string, unknown> = {}, script = START_WORLD_SCRIPT) => run(script, { requests: REQUESTS, requestId: id, seed: 1, ...extra });
const press = (op: string, world: unknown, program = '[]', script = RECORD_STEP_SCRIPT) => run(script, { op, program, world, selected: '', lang: 'en', bumps: 0, words: WORDS, botName: 'Pip' });

describe('P108 s8 (1) — every watering mission lays the can on the grass', () => {
  const WATERING = REQUESTS.filter((r) => r.palette.includes('fill'));

  it('🔴 every request with fill has a can lying on the plot and a robot with empty hands; the reference program picks it first', () => {
    // Known-firing beside the rule: tulip-door was the one mission that did this before s8.
    expect(WATERING.map((r) => r.id).sort()).toEqual(['mamie-note', 'rock-flower', 'rows-trick', 'tulip-door', 'tulips-three']);
    for (const r of WATERING) {
      const cans = r.things.filter((t) => t.kind === 'can') as Array<Record<string, unknown>>;
      expect({ id: r.id, cans: cans.map((c) => [c.level, c.max]), hand: r.robotStart.can ?? null, pick: r.palette.includes('pick'), first: r.referenceProgram[0]?.t }).toEqual({ id: r.id, cans: [[0, 3]], hand: null, pick: true, first: 'pick' });
      // Home is where it starts, so a lap on the island (the can already in hand) runs the same program from there.
      expect({ id: r.id, home: r.job ? [r.job.home.x, r.job.home.y, r.job.home.d] : null }).toEqual({ id: r.id, home: [r.robotStart.x, r.robotStart.y, r.robotStart.d] });
    }
  });

  it('🔴 a robot’s bigger can (Mamie’s can+, 6) is the one lying there — in the Workshop (Start world) and on the island (islStart)', () => {
    const pip6 = { id: 'pip', kind: 'pip', name: 'Pip', color: '#FF7A59', eye: 'round', hat: 'none', canMax: 6, accessory: 'can' };
    const w = start('tulips-three', { robot: pip6, robotKey: 'k' }).world;
    expect(w.things.find((t: any) => t.kind === 'can').max).toBe(6);
    const held = press('pick', w).world.robots[0];
    expect([held.holds, held.can, held.canMax]).toEqual(['can', 0, 6]);
    const isl = helper<any>(ISLAND_ENGINE, 'islStart', J(req('tulips-three')), 'pip', pip6);
    expect(isl.things.find((t: any) => t.kind === 'can').max).toBe(6);
    // A robot without the upgrade picks up the can of three; the request's own row is never changed.
    expect(start('tulips-three').world.things.find((t: any) => t.kind === 'can').max).toBe(3);
    expect(req('tulips-three').things.find((t) => t.kind === 'can')).toMatchObject({ max: 3 });
    // Arm: the rule gone → the upgrade is lost the moment Pip picks the can up.
    const A = arm(START_WORLD_SCRIPT, "startThings[sc].max = robot.canMax;", 'void 0;');
    expect(press('pick', start('tulips-three', { robot: pip6, robotKey: 'k' }, A).world).world.robots[0].canMax).toBe(3);
  });
});

describe('P108 s8 (2) — the pad teaches the walk back, and a go press keeps the tiles it walked', () => {
  const keysOf = (allowed: ReadonlyArray<string>, world: unknown, script = PAD_KEYS_SCRIPT) => run(script, { allowed: [...allowed], world, words: WORDS, lang: 'en' }).keys as Array<{ op: string; cls: string; label: string }>;

  it('🔴 path-stones: go to the nearest rock AND the nearest square (the reference program’s two seeks), each labelled', () => {
    const s = start('path-stones');
    const go = keysOf(s.allowed, s.world).filter((k) => k.op.startsWith('go_'));
    expect(go.map((k) => k.op)).toEqual(['go_nearest:rock', 'go_nearest:site']);
    expect(go[1].label).toBe(`${word('bGoNearest')!.en} ${word('iw4K_site')!.en}`);
    // The reference program's seeks are exactly the pad's go keys: what the child drives is what wins.
    const seeks = JSON.stringify(req('path-stones').referenceProgram).match(/"kind":"[a-z]+"/g)!.map((k) => 'go_nearest:' + k.slice(8, -1));
    expect(seeks).toEqual(go.map((k) => k.op));
    // Every key has its own place on the pad (a fifth row for her land).
    const places = keysOf(s.allowed, s.world).map((k) => k.cls.split(' ').find((c) => /^bg-key-(fwd|left|right|mid|r[345][abc])$/.test(c)));
    expect(new Set(places).size).toBe(places.length);
  });

  it('🔴 her land: the tree, the rock and the patch as nearest keys; a square and a bowl only as go to (one key per place)', () => {
    const land = { buildings: [{ id: 'b1', bp: 'refuge', x: 3, y: 3, have: { plank: 0, stone: 0 } }], animals: [{ id: 'a1', kind: 'rabbit', name: 'Rosie', at: 'b1', slot: 0, fed: 0 }] };
    const reqs = run(LAND_REQUEST_SCRIPT, { requests: REQUESTS, land: JSON.stringify(land) }).requests;
    const w = run(START_WORLD_SCRIPT, { requests: reqs, requestId: LAND_ID }).world;
    const go = keysOf(LAND_PALETTE, w).filter((k) => k.op.startsWith('go_')).map((k) => k.op);
    expect(go).toEqual(['go_nearest:rock', 'go_nearest:tree', 'go_nearest:patch', 'go_to:bowl', 'go_to:site']);
    const all = keysOf(LAND_PALETTE, w);
    expect(all.find((k) => k.op === 'go_nearest:tree')!.label).toBe(`${word('bGoNearest')!.en} ${word('iw7aK_tree')!.en}`);
    const places = all.map((k) => k.cls.split(' ').find((c) => /^bg-key-(mid|r[345][abc])$/.test(c))).filter(Boolean);
    expect(new Set(places).size).toBe(places.length);
    // Arm: without the one-key-per-place rule the square and the bowl get two keys each.
    const A = arm(PAD_KEYS_SCRIPT, '!(hasTo && GO.to.indexOf(GO.nearest[gn]) !== -1)', 'true');
    expect(keysOf(LAND_PALETTE, w, A).filter((k) => k.op.startsWith('go_')).length).toBe(7);
    // Every nearest kind has a face on the pad.
    for (const k of PAD_GO.nearest) expect({ k, face: typeof PAD_GO.emoji[k] }).toEqual({ k, face: 'string' });
  });

  it('🔴 a go press walks the engine’s route and keeps it as the robot row’s via — one step at a time, ending where the robot is; any other press clears it; Draw world hands it on', () => {
    // A rock four tiles off, round a pond (the route turns): one tile would be an ordinary glide, so no via is kept.
    const s = { world: { map: ['GGGGG', 'GWWGG', 'GGGGG'], things: [{ kind: 'rock', id: 'r1', x: 4, y: 2, left: 8, max: 8 }], robots: [{ id: 'me', x: 0, y: 0, d: 2, carry: [] }] } };
    const r0 = s.world.robots[0];
    const went = press('go_nearest:rock', s.world);
    const r = went.world.robots[0];
    expect(Array.isArray(r.via)).toBe(true);
    expect(r.via.length).toBeGreaterThan(1);
    let at = [r0.x, r0.y];
    for (const t of r.via) {
      expect(Math.abs(t[0] - at[0]) + Math.abs(t[1] - at[1])).toBe(1);
      at = t;
    }
    expect(at).toEqual([r.x, r.y]);
    // The world itself changed once, as before: the robot stands at the rock, facing it.
    expect(JSON.parse(went.program)).toEqual([{ id: 1, t: 'go_nearest', slots: { kind: 'rock' } }]);
    const drawn = run(DRAW_WORLD_SCRIPT, { world: went.world, words: WORDS, lang: 'en', botName: 'Cobble', color: '#7A8CA3' }).robots[0];
    expect(drawn.via).toEqual(r.via);
    const turned = press('left', went.world, went.program).world.robots[0];
    expect(turned.via).toBeUndefined();
    // Arm: the route not kept → no via (the kits glide the robot in one step, through whatever is between).
    const A = arm(RECORD_STEP_SCRIPT, 'if (st.delta.move && w.robots[0]) via.push([w.robots[0].x, w.robots[0].y]);', '');
    expect(press('go_nearest:rock', s.world, '[]', A).world.robots[0].via).toBeUndefined();
    // A one-tile walk keeps none (the kits' glide is already that tile).
    expect(press('go_nearest:rock', { ...s.world, robots: [{ id: 'me', x: 4, y: 0, d: 2, carry: [] }] }).world.robots[0].via).toBeUndefined();
  });
});

describe('P108 s8 (4) — no Workshop tab', () => {
  it('🔴 the top bar has four tabs (Island, My robot, Skills, Grown-ups); the Workshop page is still in the router', () => {
    const bar = JSON.parse(fs.readFileSync(path.join(TEMPLATE, 'Garden', 'Top bar', 'nodes.json'), 'utf8')).nodes as Array<{ id: string; children?: string[] }>;
    expect(bar.find((n) => n.id === 'brTabs')!.children).toEqual(['brTab_island', 'brTab_robot', 'brTab_skills', 'brTab_grown']);
    const app = fs.readFileSync(path.join(TEMPLATE, 'App', 'nodes.json'), 'utf8');
    expect(app).toContain('/Pages/Workshop');
  });
});

describe('P108 s8 (3) — the Workshop’s divider', () => {
  it('🔴 the divider stands between the world and the steps, sizes --bg-steps-w on the grid, and the CSS reads it', () => {
    const play = JSON.parse(fs.readFileSync(path.join(TEMPLATE, 'Workshop', 'Play', 'nodes.json'), 'utf8')).nodes as Array<{ id: string; type: string; children?: string[]; parameters?: Record<string, unknown> }>;
    expect(play.find((n) => n.id === 'plWs')!.children).toEqual(['plLeft', 'plSplit', 'plRight']);
    expect(play.find((n) => n.id === 'plSplit')).toMatchObject({ type: 'garden-kit.Divider', parameters: { variable: '--bg-steps-w', hostClass: 'bg-ws' } });
    expect(GARDEN_CSS).toContain('var(--bg-steps-w, clamp(440px, 44vw, 780px))');
    expect(GARDEN_CSS).toContain('.bg-ws > .gd-divider { display: none !important; }');
    // The world is no longer held to 640 px beside a dragged divider: the window's height bounds it.
    expect(GARDEN_CSS).toContain('.bg-stage .gd-world, .bg-stage .gd3-world { max-width: var(--bg-world-max, 640px) !important; }');
  });

  it('the width stays between Min and Max and always leaves Min Other to the world', () => {
    const kitSrc = fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'library', 'modules', 'garden-kit', 'src', 'kit.js'), 'utf8');
    const from = kitSrc.indexOf('function dividerClamp');
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const clamp = new Function(kitSrc.slice(from, kitSrc.indexOf('/** @type', from)) + '; return dividerClamp;')() as (w: number, host: number, min: number, max: number, other: number) => number;
    expect([clamp(200, 1400, 360, 1000, 420), clamp(600, 1400, 360, 1000, 420), clamp(1200, 1400, 360, 1000, 420), clamp(900, 1100, 360, 1000, 420)]).toEqual([360, 600, 980, 680]);
    // A host too narrow for both: the steps keep their Min.
    expect(clamp(500, 600, 360, 1000, 420)).toBe(360);
  });
});

describe('P108 s8 (5) — the refuge: a wrong part says what it wants; an empty source says it grows back; the Workshop shows the island’s amounts', () => {
  const site = (item: string) => ({ kind: 'site', id: 'b1-' + item, of: 'b1', build: 'refuge', keep: true, item, need: 4, have: 0, x: 1, y: 0 });
  const facing = (things: unknown[], carry: string[]) => ({ map: ['GGG'], things, robots: [{ id: 'r1', x: 0, y: 0, d: 1, carry }] });

  it('🔴 stones put on the refuge’s plank part stay carried, and the robot says "This part wants planks." (EN, FR); the right item still goes in', () => {
    const wrong = press('put', facing([site('plank')], ['stone']));
    expect([wrong.world.robots[0].carry, wrong.world.things[0].have]).toEqual([['stone'], 0]);
    expect(wrong.bubble.text).toBe(word('sayWantsPlank')!.en);
    expect(word('sayWantsPlank')!.fr).toBe('Ici, il faut des planches.');
    const right = press('put', facing([site('stone')], ['stone']));
    expect([right.world.robots[0].carry, right.world.things[0].have]).toEqual([[], 1]);
    // A bowl too: a stone for the rabbit's carrots.
    const bowl = press('put', facing([{ kind: 'bowl', id: 'a1', item: 'carrot', capacity: 3, count: 0, animal: 'rabbit', x: 1, y: 0 }], ['stone']));
    expect([bowl.world.robots[0].carry, bowl.bubble.text]).toEqual([['stone'], word('sayWantsCarrot')!.en]);
    // Every item a place can want has its line, in both languages.
    for (const item of ['stone', 'plank', 'egg', 'food', 'ball', 'carrot']) {
      const k = 'sayWants' + item[0].toUpperCase() + item.slice(1);
      expect({ k, en: !!word(k)?.en, fr: !!word(k)?.fr }).toEqual({ k, en: true, fr: true });
    }
    // Arm: as before s8 — nothing said.
    const A = arm(RECORD_STEP_SCRIPT, "delta.sayKey = WANTS_SAID[want] ? 'sayWants' + want.charAt(0).toUpperCase() + want.slice(1) : 'sayWrongItem'; return; }", 'return; }');
    expect(press('put', facing([site('plank')], ['stone']), '[]', A).bubble).toBeUndefined();
  });

  it('🔴 a pick at a spent rock that grows back says so; one that never grows back is a plain bump', () => {
    const grows = press('pick', facing([{ kind: 'rock', id: 'rock', x: 1, y: 0, left: 0, max: 8 }], []));
    expect([grows.bumps, grows.bubble.text]).toEqual([1, word('sayGrowsRock')!.en]);
    const tree = press('pick', facing([{ kind: 'tree', id: 'tree', x: 1, y: 0, left: 0, max: 8 }], []));
    expect(tree.bubble.text).toBe(word('sayGrowsTree')!.en);
    const gone = press('pick', { ...facing([], []), spent: ['1,0'] });
    expect(gone.bubble.text).toBe(word('sayBump')!.en);
  });

  it('🔴 the island writes each source’s left onto her land; the Workshop’s land lays it (not a fresh 6); a land from before s8 is as first laid', () => {
    const land: any = { buildings: [{ id: 'b1', bp: 'spa', x: 3, y: 1, have: { stone: 6, plank: 4 } }], animals: [] };
    const things = helper<any[]>(LAND_SCRIPT, 'landThings', J(land));
    expect(things.filter((t) => t.kind === 'rock' || t.kind === 'tree').map((t) => [t.id, t.left])).toEqual(LAND_SOURCES.filter((t) => t.kind !== 'patch').map((t) => [t.id, t.left]));
    // The island mined the rock to 0 and the tree to 2: the keep writes both.
    const mined = things.map((t) => (t.id === 'rock' ? { ...t, left: 0 } : t.id === 'tree' ? { ...t, left: 2 } : t));
    const kept = J(land);
    expect(helper<boolean>(LAND_SCRIPT, 'landKeep', kept, mined)).toBe(true);
    expect(kept.left).toEqual({ tree: 2, rock: 0, patch: LAND_SOURCES.find((t) => t.id === 'patch')!.left });
    expect(helper<boolean>(LAND_SCRIPT, 'landKeep', kept, mined)).toBe(false);
    // The save keeps it (bounded by each source's max), and the Workshop's land request lays it.
    expect(helper<any>(SAVE_HELPERS, 'landOf', { ...kept, left: { rock: 99, tree: -3, patch: 'x' } }).left).toEqual({ rock: 8, tree: 0 });
    const reqs = run(LAND_REQUEST_SCRIPT, { requests: REQUESTS, land: JSON.stringify(kept) }).requests;
    const ws = reqs.find((r: any) => r.id === LAND_ID).things;
    expect(ws.filter((t: any) => ['rock', 'tree'].includes(t.kind)).map((t: any) => [t.id, t.left])).toEqual([['tree', 2], ['rock', 0]]);
    // Arm: landThings ignoring land.left → the Workshop shows a full rock the island has emptied.
    const A = arm(LAND_SCRIPT, 'out[sl].left = land.left[out[sl].id];', 'void 0;');
    expect(helper<any[]>(A, 'landThings', kept).find((t) => t.id === 'rock').left).toBe(LAND_SOURCES.find((t) => t.id === 'rock')!.left);
  });

  it('the refuge needs more than a fresh land holds after the spa — the wait the chip and the line now show (the amounts as ruled)', () => {
    const need = (item: string) => BLUEPRINTS.reduce((n, b) => n + b.parts.filter((p) => p.item === item).reduce((m, p) => m + p.need, 0), 0);
    const has = (kind: string) => LAND_SOURCES.find((t) => t.kind === kind)!.left!;
    expect([need('stone'), has('rock'), need('plank'), has('tree')]).toEqual([10, 6, 10, 6]);
  });
});

// The engine is shared by every page script: the new say keys are words of the page.
it('every say key the engine can now raise is a word', () => {
  for (const k of ENGINE.match(/'say(Wants|Grows)[A-Z][a-z]+'|'sayWrongItem'/g) ?? []) expect({ k, word: !!word(k.slice(1, -1)) }).toEqual({ k, word: true });
});
