/**
 * P108 IW-006 (session 5, lane O `iw006-owed`) — the gate over what session 4 owed (IW-006 §5 "Session 4 merge"):
 *
 *   O1  My robots' upgrade slot never sends her to an islander: it names the upgrade, the island's shop, SHOP's price, and
 *       (not on the shelf yet) the request that puts it there; filled, it says where it came from.
 *   O2  The prices, retuned from lane E's earnings table: each rule of the retune is a row here, read from SHOP and from
 *       what the engine pays (Win pay, the island's ticks) — never a literal price.
 *   O3  "Now in the shop" under the win card's thanks when THIS first win puts an upgrade on the shop's shelf.
 *   O4  A robot sent to a job from its card on My robots, by the crew's assign rule; said on that robot's card.
 *
 * Every family is made the game's way (Add profile, Win pay → Complete request, buyItem, Assign robot); every script is
 * run as the page runs it. Arms at the end: each rule mutated, and the row that kills it.
 *
 * @module noodl-mcp/tests/iw006Owed.test
 */
import { REQUESTS, SHOP, UPGRADES, WORDS } from './cg002Content';
import { ADD_PROFILE_SCRIPT, COMPLETE_REQUEST_SCRIPT, SAVE_HELPERS, helper, runScript } from './cg002Scripts';
import { ISLANDERS, PAGE_WORDS } from './cg003Content';
import { ALL_WORDS_JSON, ASSIGN_ROBOT_SCRIPT, FAMILY_SCRIPT, ISLAND_WORLD_SCRIPT, ROBOT_CARDS_SCRIPT, SEND_ROBOT_SCRIPT, SHOP_NEWS_SCRIPT, WIN_PAY_SCRIPT } from './cg003Scripts';
import { CG003_COMPONENTS, LOGIC_SPECS } from './cg003Components';
import { ISLAND_TICK_SCRIPT } from './ig004Island';
import { ISLAND_KEEP_SCRIPT } from './iw006Earn';
import { SHOP_ROWS_SCRIPT, SHOP_IDS } from './iw006Shop';

const WORD_ROWS = JSON.parse(ALL_WORDS_JSON);
const REQ_ROWS = JSON.parse(JSON.stringify(REQUESTS));
const NOW = 1759300000000;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const req = (id: string) => REQUESTS.find((r) => r.id === id)!;
type Lang = 'en' | 'fr';
const word = (lang: Lang, key: string) => String((PAGE_WORDS as any)[key]?.[lang] ?? (WORDS as any)[key]?.[lang] ?? '');
const fill = (t: string, vars: Record<string, unknown>) => Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), t);
const price = (id: string) => SHOP.find((i) => i.id === id)!.price;
const titleOf = (lang: Lang, id: string) => word(lang, req(id).copyKeys.title);
/** Every islander's name, both languages: what an upgrade slot must never send her to. */
const ISLANDER_NAMES = Object.values(ISLANDERS).flatMap((i) => [word('en', i.nameKey), word('fr', i.nameKey)]).filter(Boolean);

// ── A family, the game's way ──
const kid = (lang: Lang = 'en', band = 2) => runScript(ADD_PROFILE_SCRIPT, { model: null, name: 'Ada', band, lang, robotName: 'Pip' }).model;
const active = (m: any) => m.profiles.find((p: any) => p.id === m.island.activeId);
const fam = (m: any) => runScript(FAMILY_SCRIPT, { model: clone(m) });
const robotFor = (m: any, id: string) => helper<string>(SAVE_HELPERS, 'jobRobotId', active(m), req(id).needs || 'pip');
/** A win in the Workshop as Pages/Workshop wires it: Win pay (her island before) → Complete request → Shop news. */
function workshopWin(m: any, id: string, lang: Lang = 'en', news = SHOP_NEWS_SCRIPT) {
  const f = fam(m);
  const pay = runScript(WIN_PAY_SCRIPT, { requestId: id, requests: REQ_ROWS, plots: f.plots, done: f.done, words: WORD_ROWS, lang });
  const r = req(id);
  const done = runScript(COMPLETE_REQUEST_SCRIPT, { model: m, requestId: id, profileId: f.profileId, tricks: r.tricks, reward: r.reward, program: clone(r.referenceProgram), robotId: robotFor(m, id), now: NOW, pay: pay.pay, jobLive: pay.jobLive });
  const shop = runScript(news, { model: done.model, profileId: f.profileId, requestId: id, newlyDone: done.newlyDone, words: WORD_ROWS, lang });
  return { pay, done, shop, model: done.model };
}
const wins = (m: any, ids: string[]) => ids.reduce((acc, id) => workshopWin(acc, id).model, m);
/** Every robot kind lent (as their islanders lend them), so no job is padlocked for want of one. */
function crewed(m: any) {
  const p = active(m);
  for (const k of ['cobble', 'pocket', 'echo']) if (!p.island.robots.some((r: any) => r.id === k)) p.island.robots.push({ id: k, kind: k });
  return helper<any>(SAVE_HELPERS, 'modelOf', m);
}
function buy(m: any, id: string, opts: Record<string, unknown> = {}) {
  const p = active(m);
  helper<number>(SAVE_HELPERS, 'earnShells', p, price(id));
  const out = helper<any>(SAVE_HELPERS, 'buyItem', p, id, opts);
  if (!out.ok) throw new Error(`buy ${id}: ${out.error}`);
  return out;
}
/** My robots' cards as Pages/My robot wires Robot cards (Read family's robots, hats, band, lang, stickers, done). */
function cards(m: any, lang: Lang = 'en', script = ROBOT_CARDS_SCRIPT, told: unknown = null) {
  const f = fam(m);
  return runScript(script, { robots: f.robots, hats: f.hats, band: f.band, lang, botName: f.botName, words: WORD_ROWS, requests: REQ_ROWS, stickers: f.stickers, done: f.done, told }).cards as any[];
}
const cardOf = (cs: any[], kind: string) => cs.find((c) => c.kind === kind)!;
const upWord = (lang: Lang, upId: string) => word(lang, ({ 'can+': 'ig5UpCan', 'basket+': 'ig5UpBasket', boots: 'ig5UpBoots' } as Record<string, string>)[upId]);
/** The shop's own name for an upgrade, first letter small — what the slot and the win card call it (she finds it by that name). */
const shopWord = (lang: Lang, upId: string) => { const n = SHOP.find((i) => i.id === upId)!.name[lang]; return n.charAt(0).toLowerCase() + n.slice(1); };

// ── O1: the slot ──
/** The slot of every card, for a fresh kid: the upgrade, the shop, SHOP's price, the request that shelves it, never an islander. */
function slotsOfAFreshKid(script = ROBOT_CARDS_SCRIPT) {
  const out: Array<{ kind: string; lang: Lang; text: string; ok: Record<string, boolean> }> = [];
  for (const lang of ['en', 'fr'] as Lang[]) {
    for (const c of cards(kid(lang), lang, script)) {
      const up = UPGRADES.find((u) => u.id === ({ pip: 'can+', cobble: 'basket+', pocket: 'boots', echo: 'can+' } as Record<string, string>)[c.kind])!;
      const t = String(c.upgradeText);
      out.push({ kind: c.kind, lang, text: t, ok: { names: t.includes(shopWord(lang, up.id)), shop: t.includes(lang === 'en' ? 'shop' : 'boutique'), price: t.includes(`🐚 ${price(up.id)}`), after: t.includes(titleOf(lang, up.unlockedBy)), noIslander: !ISLANDER_NAMES.some((n) => t.includes(n)) } });
    }
  }
  return out;
}

describe('O1 — My robots’ upgrade slot: the shop, never an islander', () => {
  it('🔴 an empty slot names the upgrade, the island’s shop, its price (SHOP’s) and the request that puts it on the shelf — never an islander (EN, FR; every card, hers and the ones still to be lent)', () => {
    const slots = slotsOfAFreshKid();
    expect(slots.length).toBe(8);
    for (const s of slots) expect({ kind: s.kind, lang: s.lang, ...s.ok }).toEqual({ kind: s.kind, lang: s.lang, names: true, shop: true, price: true, after: true, noIslander: true });
    // The words, whole: Pip's slot in both languages.
    const pip = (lang: Lang) => slots.find((s) => s.kind === 'pip' && s.lang === lang)!.text;
    expect(pip('en')).toBe(fill(word('en', 'iw6oUpLater'), { up: shopWord('en', 'can+'), q: titleOf('en', 'rows-trick'), n: price('can+') }));
    expect(pip('fr')).toBe(fill(word('fr', 'iw6oUpLater'), { up: shopWord('fr', 'can+'), q: titleOf('fr', 'rows-trick'), n: price('can+') }));
    // Known-firing beside the absence: the old slot said "from Mamie Rose" — the islander check reads it.
    const old = fill(word('en', 'ig5UpEmpty'), { up: upWord('en', 'can+'), who: word('en', 'islMamie') });
    expect(ISLANDER_NAMES.some((n) => old.includes(n))).toBe(true);
  });

  it('🔴 on the shelf the moment the shop shows it (its request done, a robot of hers it fits): the slot says the island’s shop and its price, as the shop’s Upgrades tab lists it', () => {
    for (const lang of ['en', 'fr'] as Lang[]) {
      const before = kid(lang);
      const shelf = (m: any) => runScript(SHOP_ROWS_SCRIPT, { model: m, words: WORD_ROWS, lang, tab: SHOP_IDS.tab + 'upgrades' }).items.map((i: any) => i.id);
      expect(shelf(before)).not.toContain(SHOP_IDS.item + 'can+');
      expect(cardOf(cards(before, lang), 'pip').upgradeText).toContain(titleOf(lang, 'rows-trick'));
      const after = wins(before, ['rows-trick']);
      expect(shelf(after)).toContain(SHOP_IDS.item + 'can+');
      expect(cardOf(cards(after, lang), 'pip').upgradeText).toBe(fill(word(lang, 'iw6oUpShop'), { up: shopWord(lang, 'can+'), n: price('can+') }));
    }
  });

  it('🔴 a filled slot says where it came from: bought → the shop; an islander’s gift from before the shop (a sticker) → her, which is true', () => {
    const won = wins(kid(), ['rows-trick']);
    buy(won, 'can+');
    expect(cardOf(cards(won), 'pip').upgradeText).toBe(fill(word('en', 'iw6oUpMine'), { up: upWord('en', 'can+') }));
    const gifted = kid('fr');
    active(gifted).stickers.push('can+');
    expect(cardOf(cards(gifted, 'fr'), 'pip').upgradeText).toBe(fill(word('fr', 'ig5UpHas'), { up: upWord('fr', 'can+'), who: word('fr', 'islMamie') }));
  });
});

// ── O2: the prices ──
/** What a first win of each job pays, as Win pay pays it (the engine's steps, the cap, the bonus) — lane E's table, measured. */
function firstWins() {
  const out: Record<string, number> = {};
  for (const r of REQUESTS.filter((x) => x.job)) out[r.id] = workshopWin(crewed(kid('en', 2)), r.id).pay.pay;
  return out;
}
/**
 * The island at work for ten minutes (a tick is two steps of 380 ms), as Island/World runs it: the tick, Island keep
 * after every tick, the store written at its moments and the island built again from it (lane E's loop).
 */
function islandTenMinutes(model: any) {
  let m = model;
  const build = (mm: any, kept?: unknown) => {
    const f = fam(mm);
    return runScript(ISLAND_WORLD_SCRIPT, { requests: REQ_ROWS, plots: f.plots, robots: f.robots, done: f.done, band: f.band, pins: [], kept }).state;
  };
  let built = build(m);
  let state = built;
  const ticks = Math.round((10 * 60 * 1000) / (2 * 380));
  const start = active(m).shells.earned;
  for (let t = 0; t < ticks; t++) {
    state = runScript(ISLAND_TICK_SCRIPT, { state, built }).state;
    const k = runScript(ISLAND_KEEP_SCRIPT, { state, model: m, robots: fam(m).robots, words: WORD_ROWS, lang: 'en' });
    if (k.due) {
      m = k.model;
      built = build(m, state);
      if (built.build === state.build) state = built;
    }
  }
  return { perMinute: (active(m).shells.earned - start) / 10, earned: active(m).shells.earned - start };
}
/** The band 7–9 family: her four jobs won (Pip moves to each in turn; Cobble lent after the post box takes the stones). */
const BAND1 = ['path-postbox', 'tulip-door', 'tulips-three', 'path-stones'];
const BAND2_FOUR = ['tulips-three', 'path-stones', 'eggs-count', 'rock-flower'];

/**
 * THE RETUNE (IW-006 §5, lane O's notes print the table): each rule is a relation between a price (SHOP) and what the
 * engine pays — a first win (F, Win pay), band 7–9's four first wins (F7), a minute of her robots at work on the island.
 */
function priceRules(shop: ReadonlyArray<{ id: string; kind: string; price: number }>, F: Record<string, number>, rate7: number) {
  const p = (id: string) => shop.find((i) => i.id === id)!.price;
  const ids = Object.keys(F);
  const avg = ids.reduce((n, id) => n + F[id], 0) / ids.length;
  const F7 = BAND1.reduce((n, id) => n + F[id], 0);
  const of = (kind: string) => shop.filter((i) => i.kind === kind);
  return {
    // A helper helps ONE job: it costs less than the average first win.
    helpersUnderAWin: of('helper').every((i) => i.price < avg),
    // The three upgrades one price (a rule a child can learn), between one and one and a half first wins.
    upgradesOnePrice: new Set(of('upgrade').map((i) => i.price)).size === 1 && of('upgrade').every((i) => i.price >= avg && i.price <= 1.5 * avg),
    // A copy is earned, not handed out: two to three first wins (it doubles a job's laps).
    copyTwoToThreeWins: of('robot').every((i) => i.price >= 2 * avg && i.price <= 3 * avg),
    // The bigger brain before the biggest; the biggest under four first wins.
    brainsInOrder: p('brain16') < p('brain20') && p('brain20') < 4 * avg,
    // Band 7–9's four first wins buy the refuge (the animals' door) on their own.
    refugeFromBand1Wins: p('refuge') <= F7,
    // ...and the refuge AND the cheaper animal take her two robots on the island at most three more minutes.
    firstAnimalWithin3Min: Math.max(0, p('refuge') + Math.min(p('rabbit'), p('sheep')) - F7) / rate7 <= 3,
    // The spa (rest, not built yet) under the refuge; an animal under the blueprint that houses it.
    spaUnderRefuge: p('spa') < p('refuge') && p('rabbit') < p('refuge') && p('sheep') < p('refuge') && p('rabbit') < p('sheep')
  };
}
const ALL_RULES = { helpersUnderAWin: true, upgradesOnePrice: true, copyTwoToThreeWins: true, brainsInOrder: true, refugeFromBand1Wins: true, firstAnimalWithin3Min: true, spaUnderRefuge: true };

describe('O2 — the prices, retuned from what a job pays', () => {
  const F = firstWins();
  const band1 = islandTenMinutes(wins(kid('en', 1), BAND1));
  const band2 = islandTenMinutes(wins(crewed(kid('en', 2)), BAND2_FOUR));

  it('the measurements the rules read: every first win (Win pay), band 7–9’s four, her two robots and four robots of band 10–12 on the island for ten minutes', () => {
    const F7 = BAND1.reduce((n, id) => n + F[id], 0);
    expect(F7).toBe(BAND1.reduce((n, id) => n + F[id], 0));
    expect(Object.keys(F).length).toBe(REQUESTS.filter((r) => r.job).length);
    expect(band1.earned).toBeGreaterThan(0);
    expect(band2.earned).toBeGreaterThan(band1.earned);
    const avg = Object.values(F).reduce((a, b) => a + b, 0) / Object.keys(F).length;
    // The reading the Notes print (the table: each price in first wins and in minutes of island at both bands).
    const table = SHOP.map((i) => `${i.id} ${i.price} = ${(i.price / avg).toFixed(1)} wins · ${(i.price / band1.perMinute).toFixed(1)} min (7–9) · ${(i.price / band2.perMinute).toFixed(1)} min (10–12)`);
    // eslint-disable-next-line no-console
    console.log(`IW-006 owed (lane O) reading: every first win ${Object.values(F).reduce((a, b) => a + b, 0)} 🐚 (avg ${avg.toFixed(1)}), band 7–9's four ${F7}; island ten minutes: band 7–9 (Pip + Cobble) +${band1.earned} (${band1.perMinute.toFixed(1)}/min), band 10–12 (four robots) +${band2.earned} (${band2.perMinute.toFixed(1)}/min)\n${table.join('\n')}`);
  });

  it('🔴 every price keeps the retune’s rules (each read from SHOP and from what the engine pays)', () => {
    expect(priceRules(SHOP, F, band1.perMinute)).toEqual(ALL_RULES);
  });

  it('🔴 the base’s guesses broke them — the rules can fail (known-firing): refuge 50, boots 20, rabbit 20, sheep 25, spa 40', () => {
    const base = SHOP.map((i) => ({ ...i, price: ({ refuge: 50, boots: 20, rabbit: 20, sheep: 25, spa: 40 } as Record<string, number>)[i.id] ?? i.price }));
    const r = priceRules(base, F, band1.perMinute);
    expect([r.upgradesOnePrice, r.refugeFromBand1Wins]).toEqual([false, false]);
  });
});

// ── O3: now in the shop ──
describe('O3 — “Now in the shop” under the win card’s thanks', () => {
  it('🔴 a first win that puts an upgrade on the shelf says so, with SHOP’s name and price (EN, FR): rows-trick → the bigger can', () => {
    for (const lang of ['en', 'fr'] as Lang[]) {
      const w = workshopWin(kid(lang), 'rows-trick', lang);
      const nm = SHOP.find((i) => i.id === 'can+')!.name[lang];
      expect([w.done.newlyDone, w.shop.has, w.shop.text]).toEqual([true, true, fill(word(lang, 'iw6oNews'), { what: fill(word(lang, 'iw6oNewsItem'), { up: nm.charAt(0).toLowerCase() + nm.slice(1), n: price('can+') }) })]);
    }
    // path-stones shelves Cobble's hod (Cobble is hers: the post box lent him).
    const stones = workshopWin(wins(kid(), ['path-postbox']), 'path-stones');
    expect([stones.shop.has, stones.shop.text.includes(`🐚 ${price('basket+')}`)]).toEqual([true, true]);
  });

  it('🔴 nothing when the win shelves nothing: a replay, an upgrade she has (given or bought), no robot of hers it fits, a job that unlocks none', () => {
    const once = workshopWin(kid(), 'rows-trick');
    const replay = workshopWin(once.model, 'rows-trick');
    expect([replay.done.newlyDone, replay.shop.has, replay.shop.text]).toEqual([false, false, '']);
    const gifted = kid();
    active(gifted).stickers.push('can+');
    expect(workshopWin(gifted, 'rows-trick').shop.has).toBe(false);
    const bought = kid();
    active(bought).owned.push('can+');
    expect(workshopWin(bought, 'rows-trick').shop.has).toBe(false);
    // wall-until unlocks Pocket's boots; a kid with no Pocket has no robot they fit (the shop does not show them either).
    const noPocket = workshopWin(kid(), 'wall-until');
    expect([noPocket.done.newlyDone, noPocket.shop.has]).toEqual([true, false]);
    expect(workshopWin(kid(), 'tulip-door').shop.has).toBe(false);
  });

  it('🔴 wired as the page runs it: Complete request ran → Shop news (her model after the win, Newly Done) → Play → the win card, a line AFTER the thanks and the pay, smaller than the thanks', () => {
    const comp = (p: string) => CG003_COMPONENTS.find((c) => c.path === p)! as any;
    const has = (c: any, w: [string, string, string, string]) => c.connections.some((x: any) => x.fromId === w[0] && x.fromProperty === w[1] && x.toId === w[2] && x.toProperty === w[3]);
    const ws = comp('Pages/Workshop');
    const news = ws.nodes.find((n: any) => n.type === '/Logic/Shop news');
    expect(!!news).toBe(true);
    for (const w of [['wsComplete', 'ran', news.id, 'go'], ['wsComplete', 'model', news.id, 'model'], ['wsComplete', 'newlyDone', news.id, 'newlyDone'], ['wsPlay', 'wonRequest', news.id, 'requestId'], [news.id, 'text', 'wsPlay', 'shopText'], [news.id, 'has', 'wsPlay', 'hasShop']] as Array<[string, string, string, string]>) expect({ w, ok: has(ws, w) }).toEqual({ w, ok: true });
    const play = comp('Workshop/Play');
    expect([has(play, ['plIn', 'shopText', 'plWin', 'shopText']), has(play, ['plIn', 'hasShop', 'plWin', 'hasShop'])]).toEqual([true, true]);
    const win = comp('Workshop/Win card');
    expect([has(win, ['wnIn', 'shopText', 'wnShop', 'text']), has(win, ['wnIn', 'hasShop', 'wnShop', 'mounted'])]).toEqual([true, true]);
    const card = win.nodes.find((n: any) => n.id === 'wnCard');
    const order = card.children as string[];
    expect(order.indexOf('wnShop')).toBeGreaterThan(order.indexOf('wnPay'));
    expect(order.indexOf('wnPay')).toBeGreaterThan(order.indexOf('wnThanks'));
    const size = (id: string) => win.nodes.find((n: any) => n.id === id).parameters.fontSize.value;
    expect(size('wnShop')).toBeLessThan(size('wnThanks'));
    expect(LOGIC_SPECS.find((s) => s.path === '/Logic/Shop news' || s.path === 'Logic/Shop news')?.go).toBe(true);
  });
});

// ── O4: send from My robots ──
const sendFrom = (m: any, robotId: string, plotId: string, lang: Lang = 'en', script = SEND_ROBOT_SCRIPT) =>
  runScript(script, { model: m, robotId, sendTo: `${robotId}|send|${plotId}`, requests: REQ_ROWS, words: WORD_ROWS, lang, now: NOW + 1 });
/** Pip's three jobs won, two copies bought (home, carrying nothing). */
function crewFamily(lang: Lang = 'en') {
  const m = wins(kid(lang), ['tulip-door', 'tulips-three', 'wall-until']);
  const a = buy(m, 'robot:pip', { name: 'Bubbles' }).robotId as string;
  const b = buy(m, 'robot:pip', { name: 'Sprout' }).robotId as string;
  return { m, a, b };
}

describe('O4 — a crew robot sent to a job from My robots', () => {
  it('🔴 each card of hers lists the jobs she has WON that need its kind (her band), ringed where it works or helps; a card still to be lent lists none', () => {
    const { m, a } = crewFamily();
    const cs = cards(m);
    const pipCard = cs.find((c) => c.robotId === 'r1')!;
    const copyCard = cs.find((c) => c.robotId === a)!;
    const won = ['tulip-door', 'tulips-three', 'wall-until'];
    expect(pipCard.sendChips.map((c: any) => [c.label, c.selected])).toEqual(REQUESTS.filter((r) => won.includes(r.id)).map((r) => [titleOf('en', r.id), active(m).island.plots[r.id].robotId === 'r1']));
    expect(copyCard.sendChips.map((c: any) => c.selected)).toEqual([false, false, false]);
    expect([copyCard.hasSend, copyCard.sendWord]).toEqual([true, fill(word('en', 'iw6oSendTo'), { r: 'Bubbles' })]);
    // Cobble's card (not lent: locked) and a kind with no won job: nothing to send.
    expect([cardOf(cs, 'cobble').hasSend, cardOf(cs, 'cobble').sendChips]).toEqual([false, []]);
    // Every chip id is its card's own (a repeater's row is global by id).
    const ids = cs.flatMap((c) => c.sendChips.map((x: any) => x.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('🔴 a tap is the crew’s assign rule exactly: works a plot nobody works, helps the robot there, home when tapped where it is; refused when two already work there — said on THAT robot’s card, with the job’s title (EN, FR)', () => {
    for (const lang of ['en', 'fr'] as Lang[]) {
      const { m, a, b } = crewFamily(lang);
      // tulip-door: Pip left it for tulips-three, then wall-until — nobody works it.
      const free = REQUESTS.find((r) => ['tulip-door', 'tulips-three', 'wall-until'].includes(r.id) && active(m).island.plots[r.id].robotId === '')!.id;
      const s1 = sendFrom(clone(m), a, free, lang);
      const ref = runScript(ASSIGN_ROBOT_SCRIPT, { model: clone(m), robotId: `crew|${a}`, requestId: free, requests: REQ_ROWS, words: WORD_ROWS, lang, now: NOW + 1 });
      expect([s1.ok, s1.role, s1.model]).toEqual([true, 'works', ref.model]);
      expect(s1.told).toMatchObject({ robotId: a, text: fill(word(lang, 'iw6oSentTo'), { r: 'Bubbles', plot: titleOf(lang, free) }) });
      // The line lands on Bubbles's card (Robot cards' Told), nowhere else.
      const said = cards(s1.model, lang, ROBOT_CARDS_SCRIPT, s1.told).filter((c) => c.hasSaid);
      expect(said.map((c) => [c.robotId, c.saidText])).toEqual([[a, s1.told.text]]);
      // Sprout to the same plot: he helps Bubbles; a third (Pip) is refused — two already work there.
      const s2 = sendFrom(s1.model, b, free, lang);
      expect([s2.ok, s2.role, s2.told.text]).toEqual([true, 'helps', fill(word(lang, 'iw6oHelpsOn'), { r: 'Sprout', m: 'Bubbles', plot: titleOf(lang, free) })]);
      const s3 = sendFrom(s2.model, 'r1', free, lang);
      expect([s3.ok, s3.error, s3.told.text, s3.model]).toEqual([false, 'full', fill(word(lang, 'iw6oFull'), { plot: titleOf(lang, free) }), s2.model]);
      // Bubbles tapped again where he works: home (the crew's words), his helper home with him (lane C's rule).
      const s4 = sendFrom(s2.model, a, free, lang);
      expect([s4.ok, s4.role, s4.told.text]).toEqual([true, 'home', fill(word(lang, 'iw8cGoneHome'), { r: 'Bubbles' })]);
      const cardsAfter = cards(s1.model, lang);
      expect(cardsAfter.find((c) => c.robotId === a).sendChips.find((c: any) => c.id.endsWith('|' + free)).selected).toBe(true);
    }
  });

  it('🔴 wired as the page runs it: a card’s chip → Send robot (its robot, the chip) → the store written when it went; Told → Robot cards; Robot cards reads her stickers and her requests done', () => {
    const comp = (p: string) => CG003_COMPONENTS.find((c) => c.path === p)! as any;
    const has = (c: any, w: [string, string, string, string]) => c.connections.some((x: any) => x.fromId === w[0] && x.fromProperty === w[1] && x.toId === w[2] && x.toProperty === w[3]);
    const rb = comp('Pages/My robot');
    const send = rb.nodes.find((n: any) => n.type === '/Logic/Send robot');
    expect(!!send).toBe(true);
    for (const w of [
      ['rbFleetEach', 'itemOutput-robotId', send.id, 'robotId'],
      ['rbFleetEach', 'itemOutput-sendTo', send.id, 'sendTo'],
      ['rbFleetEach', 'itemOutputSignal-sent', send.id, 'go'],
      ['rbStore', 'model', send.id, 'model'],
      [send.id, 'told', 'rbCards', 'told'],
      [send.id, 'model', 'rbStore', 'model'],
      ['rbFam', 'stickers', 'rbCards', 'stickers'],
      ['rbFam', 'done', 'rbCards', 'done']
    ] as Array<[string, string, string, string]>) expect({ w, ok: has(rb, w) }).toEqual({ w, ok: true });
    expect(rb.repeats.rowFields).toEqual(expect.arrayContaining(['sendWord', 'sendChips', 'hasSend']));
    const card = comp('Robot/Card');
    for (const w of [['rcIn', 'sendChips', 'rcSendEach', 'items'], ['rcIn', 'hasSend', 'rcSend', 'mounted'], ['rcSendEach', 'itemOutput-id', 'rcOut', 'sendTo'], ['rcSendEach', 'itemOutputSignal-picked', 'rcOut', 'sent']] as Array<[string, string, string, string]>) expect({ w, ok: has(card, w) }).toEqual({ w, ok: true });
  });
});

// ── Arms ──
describe('arms: each rule mutated, and the row that kills it', () => {
  const mutate = (src: string, from: string, to: string) => {
    if (!src.includes(from)) throw new Error(`arm anchor not found: ${from.slice(0, 80)}`);
    return src.split(from).join(to);
  };
  it('the slot back to "from {who}" → the never-an-islander row fails', () => {
    const s = mutate(ROBOT_CARDS_SCRIPT, 'iw6oUpText(up, upWord, upWho, has, look.upgraded, kinds)', "fill(has && look.upgraded ? w.ig5UpHas : w.ig5UpEmpty, { up: upWord, who: upWho })");
    expect(slotsOfAFreshKid(s).every((x) => x.ok.noIslander && x.ok.shop)).toBe(false);
  });
  it('the shelf rule dropped (always "in the island’s shop") → the not-on-the-shelf-yet row fails', () => {
    const s = mutate(ROBOT_CARDS_SCRIPT, "if (iw6oDone.indexOf(up.unlockedBy) !== -1 && fits) return", 'if (true) return');
    expect(slotsOfAFreshKid(s).every((x) => x.ok.after)).toBe(false);
  });
  it('the price not read from SHOP → the price row fails', () => {
    const s = mutate(ROBOT_CARDS_SCRIPT, 'price = item ? item.price : 0', 'price = 0');
    expect(slotsOfAFreshKid(s).every((x) => x.ok.price)).toBe(false);
  });
  it('Shop news without Newly Done → a replay says "now in the shop" again', () => {
    const s = mutate(SHOP_NEWS_SCRIPT, 'fresh = Inputs.newlyDone === true', 'fresh = true');
    const once = workshopWin(kid(), 'rows-trick', 'en', s);
    expect(workshopWin(once.model, 'rows-trick', 'en', s).shop.has).toBe(true);
  });
  it('Shop news without the fit check → wall-until without Pocket shelves the boots', () => {
    const s = mutate(SHOP_NEWS_SCRIPT, 'if (!fits) continue;', '');
    expect(workshopWin(kid(), 'wall-until', 'en', s).shop.has).toBe(true);
  });
  it('Send robot’s told left as the plot card’s (no robotId) → nothing is said on the robot’s card', () => {
    const s = mutate(SEND_ROBOT_SCRIPT, 'Outputs.told = { robotId: rid,', 'Outputs.told = { gone: rid,');
    const { m, a } = crewFamily();
    const out = sendFrom(clone(m), a, 'tulip-door', 'en', s);
    expect(cards(out.model, 'en', ROBOT_CARDS_SCRIPT, out.told).some((c) => c.hasSaid)).toBe(false);
  });
  it('the send list not filtered by kind → Cobble’s jobs on Pip’s card', () => {
    const s = mutate(ROBOT_CARDS_SCRIPT, "if ((rq.needs ? String(rq.needs) : 'pip') !== kind || Number(rq.band) > band) continue;", 'if (Number(rq.band) > band) continue;');
    const m = crewed(wins(kid(), ['tulip-door', 'path-stones']));
    const pip = cards(m, 'en', s).find((c) => c.robotId === 'r1');
    expect(pip.sendChips.map((c: any) => c.id)).toContain('pip|send|path-stones');
  });
});
