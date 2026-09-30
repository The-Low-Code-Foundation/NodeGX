/**
 * P108 IW-006 / IW-008 — the session-4 base's gate: save v5 and the one purchase rule.
 *
 * What the base fixes for the four lanes (E earning, H the shop, C the crew, L the look), and nothing else:
 * - **save v5** — a profile's `shells: { earned, spent }` (D4: earned only grows, spent is a second number) and `owned`
 *   (what she bought and still has); a plot's `live` (its job as the island left it — IW-002 AC3 across an app
 *   restart); a robot row's `brain` (16 or 20, only once bigger than BRAIN_SIZE); robot rows of any id (copies, IW-008).
 *   A v4 family decodes with no shells and nothing bought, says `migrated`, and the page writes it at once (IW-006 AC5).
 * - **`buyItem`** (SAVE_HELPERS) — the purchase card's Buy: the only place `spent` rises. `earnShells` — the only place
 *   `earned` rises.
 *
 * The v4 codes in `fixtures/iw006-v4-saves.json` were written by the v4 encoder itself (cg002Scripts.ts at 98f5d92fe):
 * two families, pinned plots, three lent robots (one renamed), the three upgrades, hats, stickers and cards seen.
 */
import { BRAIN_SIZE, BRAIN_SIZES, CREW_CAP, REQUESTS, SHOP, SHOP_TABS, UPGRADES } from './cg002Content';
import { ADD_PROFILE_SCRIPT, COMPLETE_REQUEST_SCRIPT, DECODE_SAVE_SCRIPT, ENCODE_SAVE_SCRIPT, SAVE_HELPERS, SAVE_VERSION, helper, runScript } from './cg002Scripts';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const V4 = require('./fixtures/iw006-v4-saves.json') as Record<'band1' | 'band2', { code: string; model: any }>;

const packedOf = (code: string) => JSON.parse(Buffer.from(code.slice(4), 'base64url').toString('utf8'));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const req = (id: string) => REQUESTS.find((r) => r.id === id)!;
const kid = (lang = 'en') => runScript(ADD_PROFILE_SCRIPT, { model: null, name: 'Ada', band: 2, lang, robotName: 'Pip' }).model;
const win = (model: any, id: string, robotId?: string) =>
  runScript(COMPLETE_REQUEST_SCRIPT, { model, requestId: id, tricks: req(id).tricks, reward: req(id).reward, program: clone(req(id).referenceProgram), robotId, now: 1759300000000 }).model;
/** A profile run through buyItem: the helper mutates the profile it is handed, as a script's model does. */
const buy = (p: any, id: string, opts?: Record<string, unknown>) => helper<any>(SAVE_HELPERS, 'buyItem', p, id, opts);
const earn = (p: any, n: unknown) => helper<number>(SAVE_HELPERS, 'earnShells', p, n);
const balance = (p: any) => helper<number>(SAVE_HELPERS, 'balanceOf', p);

describe('IW-006 — save v5 (session-4 base)', () => {
  it('the version is 5; the catalogue is sound (every tab known, every price a whole positive number, every id once, each kind carries what buying it needs)', () => {
    expect(SAVE_VERSION).toBe(5);
    expect(new Set(SHOP.map((i) => i.id)).size).toBe(SHOP.length);
    for (const it of SHOP) {
      expect({ id: it.id, tab: SHOP_TABS.includes(it.tab), price: Number.isInteger(it.price) && it.price > 0, name: !!it.name.en && !!it.name.fr, line: !!it.line.en && !!it.line.fr }).toEqual({ id: it.id, tab: true, price: true, name: true, line: true });
      if (it.kind === 'robot') expect(it.robot).toBeTruthy();
      if (it.kind === 'upgrade') expect(UPGRADES.map((u) => u.id)).toContain(it.upgrade);
      if (it.kind === 'brain') expect(BRAIN_SIZES.slice(1)).toContain(it.size as 16 | 20);
      if (it.kind === 'helper') expect(['rain', 'selfcan', 'barrow']).toContain(it.helper);
    }
    expect(BRAIN_SIZES[0]).toBe(BRAIN_SIZE);
  });

  for (const band of ['band1', 'band2'] as const) {
    it(`🔴 AC5: a v4 code (${band === 'band1' ? 'band 7–9, one kid' : 'band 10–12, two kids, three lent robots, pinned plots'}) decodes whole, says migrated, and gains an empty wallet; the v5 code it becomes does not migrate`, () => {
      const fx = V4[band];
      expect(packedOf(fx.code).v).toBe(4);
      const dec = runScript(DECODE_SAVE_SCRIPT, { code: fx.code });
      expect([dec.ok, dec.error, dec.migrated, dec.profiles]).toEqual([true, '', true, fx.model.profiles.length]);
      expect(dec.model.v).toBe(SAVE_VERSION);
      // Every field of every v4 profile survives, exactly; the only new fields are the empty wallet and nothing bought.
      for (const [i, want] of fx.model.profiles.entries()) expect(dec.model.profiles[i]).toEqual({ ...want, shells: { earned: 0, spent: 0 }, owned: [] });
      expect(dec.model.island.activeId).toBe(fx.model.island.activeId);
      const again = runScript(ENCODE_SAVE_SCRIPT, { model: dec.model });
      expect(packedOf(again.code).v).toBe(SAVE_VERSION);
      const back = runScript(DECODE_SAVE_SCRIPT, { code: again.code });
      expect([back.migrated, back.model]).toEqual([false, dec.model]);
    });
  }

  it('🔴 AC5: the band 10–12 fixture really carries what a migration could lose (known-firing beside each "survives")', () => {
    const noa = V4.band2.model.profiles[0];
    expect(Object.values(noa.island.plots).filter((p: any) => p.robotId).length).toBe(3);
    expect(noa.island.robots.map((r: any) => r.id)).toEqual(['r1', 'cobble', 'pocket', 'echo']);
    expect(noa.island.robots[1].name).toBe('Caillou');
    expect(noa.stickers).toEqual(expect.arrayContaining(['can+', 'basket+', 'boots']));
    expect(noa.cardsSeen).toEqual(['fwd', 'repeat', 'go_nearest']);
    expect(noa.lang).toBe('fr');
  });

  it('🔴 AC5: a STORED v4 model (what the page holds today) is due its migration; it loads as v5 with an empty wallet; written back, it is not due', () => {
    const stored = clone(V4.band2.model);
    expect(helper<boolean>(SAVE_HELPERS, 'migrationDue', stored)).toBe(true);
    const model = helper<any>(SAVE_HELPERS, 'modelOf', stored);
    expect(model.v).toBe(SAVE_VERSION);
    expect(model.profiles.map((p: any) => [p.shells, p.owned])).toEqual([[{ earned: 0, spent: 0 }, []], [{ earned: 0, spent: 0 }, []]]);
    const written = clone(model);
    expect(helper<boolean>(SAVE_HELPERS, 'migrationDue', written)).toBe(false);
    expect(helper<any>(SAVE_HELPERS, 'modelOf', written)).toEqual(model);
  });

  it('🔴 a v5 family round-trips whole: shells, owned, a plot’s live job, brains (r1’s and a copy’s), a copy’s row; the code is byte-stable', () => {
    let m = win(win(kid(), 'path-postbox'), 'tulips-three', 'r1');
    const p = m.profiles[0];
    earn(p, 90);
    expect(buy(p, 'robot:pip').ok).toBe(true);
    expect(buy(p, 'brain16', { robotId: 'r1' }).ok).toBe(true);
    const copy = p.island.robots[p.island.robots.length - 1];
    expect(buy(p, 'rain').ok).toBe(true);
    p.island.plots['tulips-three'].live = { things: clone(req('tulips-three').things), age: 17, seed: 12345, spent: [{ kind: 'stone', x: 1, y: 1 }], helper: 'selfcan' };
    p.island.robots[p.island.robots.indexOf(copy)].brain = 20;
    m = helper<any>(SAVE_HELPERS, 'modelOf', m);
    expect(m.profiles[0].shells).toEqual({ earned: 90, spent: 30 + 25 + 6 });
    expect(m.profiles[0].owned).toEqual(['rain']);
    expect(m.island.robots.map((r: any) => r.brain)).toEqual([16, undefined, 20]);
    expect([m.island.plots['tulips-three'].live.age, m.island.plots['tulips-three'].live.helper]).toEqual([17, 'selfcan']);
    const enc = runScript(ENCODE_SAVE_SCRIPT, { model: m });
    const dec = runScript(DECODE_SAVE_SCRIPT, { code: enc.code });
    expect([dec.ok, dec.migrated, dec.model]).toEqual([true, false, m]);
    expect(runScript(ENCODE_SAVE_SCRIPT, { model: dec.model }).code).toBe(enc.code);
  });

  it('a hand-edited save is made sound: spent never above earned, whole non-negative shells, owned only text ids once each, a brain that is not a size dropped, a live job without things dropped', () => {
    const raw = {
      v: 5,
      profiles: [{ id: 'p', name: 'A', shells: { earned: 10.7, spent: 50 }, owned: ['rain', 'gold-bar', 7, 'rain'], island: { robots: [{ id: 'r1', brain: 13 }, { id: 'rx', kind: 'pip', brain: 16 }], plots: { a: { program: [{ id: 1, t: 'fwd' }], robotId: 'r1', wonAt: 1, live: { age: 3 } }, b: { program: null, robotId: '', wonAt: 1, live: { things: [], age: -4, seed: 'x' } } } } }],
      island: { activeId: 'p' }
    };
    const m = helper<any>(SAVE_HELPERS, 'modelOf', raw);
    expect(m.profiles[0].shells).toEqual({ earned: 10, spent: 10 });
    expect(m.profiles[0].owned).toEqual(['rain', 'gold-bar']);
    expect(m.island.robots).toEqual([{ id: 'r1' }, { id: 'rx', kind: 'pip', brain: 16 }]);
    expect('live' in m.island.plots.a).toBe(false);
    expect(m.island.plots.b.live).toEqual({ things: [], age: 0, seed: 0 });
    expect(helper<any>(SAVE_HELPERS, 'modelOf', { v: 5, profiles: [{ id: 'q', shells: { earned: -3, spent: -1 } }] }).profiles[0].shells).toEqual({ earned: 0, spent: 0 });
  });
});

// P108 IW-008 (lane C): the crew's two optional robot-row fields — the rest of their gate is iw008Crew.test.ts.
describe('IW-008 (lane C) — save v5 with a crew: a robot row’s program and the plot it helps on', () => {
  it('🔴 a copy that carries a program and helps on a plot round-trips (8th and 9th fields of its row); r1 carrying one is a row; nothing else moves', () => {
    const m = win(kid(), 'tulips-three', 'r1');
    const p = m.profiles[0];
    earn(p, 30);
    const copy = buy(p, 'robot:pip', { name: 'Sprout' });
    const row = p.island.robots.find((r: any) => r.id === copy.robotId);
    row.program = clone(req('tulips-three').referenceProgram);
    row.helps = 'tulips-three';
    p.island.robots[0].program = clone(req('tulip-door').referenceProgram);
    const sound = helper<any>(SAVE_HELPERS, 'modelOf', m);
    expect([sound.island.robots[0].program, sound.island.robots[1].helps]).toEqual([req('tulip-door').referenceProgram, 'tulips-three']);
    const code = runScript(ENCODE_SAVE_SCRIPT, { model: sound }).code;
    const rows = packedOf(code).p[0][14];
    expect([rows[0].length, rows[1].length, rows[1][8]]).toEqual([8, 9, 'tulips-three']);
    const dec = runScript(DECODE_SAVE_SCRIPT, { code });
    expect([dec.migrated, dec.model]).toEqual([false, sound]);
  });
});

describe('IW-006 / IW-008 — the purchase rule (buyItem) and the wallet (session-4 base)', () => {
  const funded = (n = 200) => { const m = win(kid(), 'path-postbox'); earn(m.profiles[0], n); return m; };

  it('🔴 AC2: earning only grows `earned`; nothing but a purchase raises `spent`; the balance is earned − spent', () => {
    const p = kid().profiles[0];
    expect([earn(p, 5), earn(p, 2.9), earn(p, -8), earn(p, 'x')]).toEqual([5, 2, 0, 0]);
    expect(p.shells).toEqual({ earned: 7, spent: 0 });
    expect(balance(p)).toBe(7);
  });

  it('🔴 AC3: a price she cannot pay says how many more shells, and changes nothing', () => {
    const m = win(kid(), 'path-postbox');
    const p = m.profiles[0];
    earn(p, 22);
    const before = clone(m);
    expect(buy(p, 'robot:pip')).toEqual({ ok: false, error: 'short', short: 8, left: 22, robotId: '' });
    expect(m).toEqual(before);
    // Known-firing: with 8 more, it buys, and what is left is what the card said.
    earn(p, 8);
    expect(buy(p, 'robot:pip')).toMatchObject({ ok: true, error: '', left: 0 });
  });

  it('🔴 IW-008: a copy is a new row of that kind with its own id, a name (hers, or the kind’s and its number), the kind’s colour; only a kind she has; never past the cap', () => {
    const m = funded(1000);
    const p = m.profiles[0];
    const a = buy(p, 'robot:pip');
    const b = buy(p, 'robot:pip', { name: '  Bubbles  ' });
    expect([a.ok, b.ok, a.robotId !== b.robotId, a.robotId.startsWith('r')]).toEqual([true, true, true, true]);
    const rows = p.island.robots;
    expect(rows.slice(-2)).toEqual([
      { id: a.robotId, kind: 'pip', name: 'Pip 2', color: '#FF7A59', eye: 'round', hat: 'none' },
      { id: b.robotId, kind: 'pip', name: 'Bubbles', color: '#FF7A59', eye: 'round', hat: 'none' }
    ]);
    // Cobble came with path-postbox; Echo did not: a copy of a kind she does not have is refused.
    expect(buy(p, 'robot:cobble').ok).toBe(true);
    expect(buy(p, 'robot:echo')).toMatchObject({ ok: false, error: 'kind' });
    while (p.island.robots.length < CREW_CAP) expect(buy(p, 'robot:pip').ok).toBe(true);
    const spent = p.shells.spent;
    expect(buy(p, 'robot:pip')).toMatchObject({ ok: false, error: 'cap' });
    expect(p.shells.spent).toBe(spent);
    // The copies survive the save and read as their kind on My robots: the crew is r1, Cobble, one Cobble copy and Pips.
    const back = runScript(DECODE_SAVE_SCRIPT, { code: runScript(ENCODE_SAVE_SCRIPT, { model: m }).code }).model;
    const kinds = helper<any[]>(SAVE_HELPERS, 'robotRowsOf', back.profiles[0]).map((r) => r.kind);
    expect([kinds.length, kinds.filter((k) => k === 'cobble').length, kinds.filter((k) => k === 'pip').length]).toEqual([CREW_CAP, 2, CREW_CAP - 2]);
  });

  it('🔴 a brain is bought for ONE robot, 12 → 16 → 20 in order; robotRow reads it (absent = BRAIN_SIZE)', () => {
    const p = funded().profiles[0];
    expect(buy(p, 'brain20', { robotId: 'r1' })).toMatchObject({ ok: false, error: 'size' });
    expect(buy(p, 'brain16')).toMatchObject({ ok: false, error: 'robot' });
    expect(buy(p, 'brain16', { robotId: 'r1' }).ok).toBe(true);
    expect(buy(p, 'brain16', { robotId: 'r1' })).toMatchObject({ ok: false, error: 'size' });
    expect(buy(p, 'brain20', { robotId: 'r1' }).ok).toBe(true);
    const rows = helper<any[]>(SAVE_HELPERS, 'robotRowsOf', p);
    expect(rows.map((r) => [r.id, r.brain])).toEqual([['r1', 20], ['cobble', BRAIN_SIZE]]);
  });

  it('🔴 an upgrade bought counts as one given (robotRow applies it); one she has already — bought or given — is refused; a helper is held once until used', () => {
    const p = funded().profiles[0];
    expect(helper<any[]>(SAVE_HELPERS, 'robotRowsOf', p)[0].canMax).toBe(3);
    expect(buy(p, 'can+').ok).toBe(true);
    expect(helper<any[]>(SAVE_HELPERS, 'robotRowsOf', p)[0]).toMatchObject({ canMax: 6, upgraded: true });
    expect(buy(p, 'can+')).toMatchObject({ ok: false, error: 'owned' });
    p.stickers.push('basket+');
    expect(buy(p, 'basket+')).toMatchObject({ ok: false, error: 'owned' });
    expect(buy(p, 'barrow').ok).toBe(true);
    expect(buy(p, 'barrow')).toMatchObject({ ok: false, error: 'held' });
    expect(p.owned).toEqual(['can+', 'barrow']);
    expect(buy(p, 'gold-bar')).toMatchObject({ ok: false, error: 'unknown' });
  });

  describe('arms: each rule mutated, and the row that kills it', () => {
    const mutate = (script: string, from: string, to: string) => {
      if (script.split(from).length !== 2) throw new Error(`the arm's anchor must occur exactly once: ${from}`);
      return script.replace(from, to);
    };
    it('buyItem skips the balance check → the short-price row fails', () => {
      const m = mutate(SAVE_HELPERS, "if (balanceOf(p) < it.price) { out.error = 'short';", "if (false) { out.error = 'short';");
      const p = win(kid(), 'path-postbox').profiles[0];
      expect(helper<any>(m, 'buyItem', p, 'robot:pip').ok).toBe(true);
    });
    it('decode drops a v5 row’s shells → the round-trip row fails', () => {
      const m = mutate(DECODE_SAVE_SCRIPT, "shells: v5 && Array.isArray(a[16])", 'shells: false && Array.isArray(a[16])');
      const model = funded(40);
      expect(runScript(m, { code: runScript(ENCODE_SAVE_SCRIPT, { model }).code }).model).not.toEqual(model);
    });
    it('migrationDue stops at v4 → the stored-v4 row fails', () => {
      const m = mutate(SAVE_HELPERS, '!(Number(raw.v) >= SAVE_VERSION);\n}', '!(Number(raw.v) >= 4);\n}');
      expect(helper<boolean>(m, 'migrationDue', clone(V4.band2.model))).toBe(false);
    });
    it('shellsOf lets spent pass earned → the hand-edit row fails', () => {
      const m = mutate(SAVE_HELPERS, 'spent: Math.min(earned, Math.max(0, Math.floor(Number(r.spent)) || 0))', 'spent: Math.max(0, Math.floor(Number(r.spent)) || 0)');
      expect(helper<any>(m, 'shellsOf', { earned: 10, spent: 50 })).toEqual({ earned: 10, spent: 50 });
    });
  });
});
