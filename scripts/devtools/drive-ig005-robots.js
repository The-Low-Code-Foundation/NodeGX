#!/usr/bin/env node
/**
 * IG-005 (P106 s4, lane B) — drive robots for the job on the DEPLOYED template (the page drive's deploy:
 * `drive-pages.sh` assembles a copy of `templates/bot-garden` and deploys it to `$OUT/deploy`).
 *
 * Usage:
 *   node scripts/devtools/drive-ig005-robots.js <deploy-dir> --project <assembled-project> [--shots <dir>] [--json <file>] [--mode 2d|3d]
 *
 * --mode 2d (default) headless Chrome, no GPU (the flat renderer). For each size (1368×912, 390×844) and each language
 *   (EN, FR), a fresh family, one player at 10–12:
 *   - AC5: the stones' plot is padlocked; its card says, in one line, the robot it needs, what that robot does, who lends
 *     it and after which request — and offers no way in;
 *   - AC2: that request is won the only way the brief allows (Teach → pad keys → Play); the win card says who lends
 *     whom; My robots shows the lent robot's card, unnamed by the child — its catalogue name in her language — lent by
 *     its islander, wearing its accessory; the robots not lent yet are locked cards that say who lends them;
 *   - the stones open now, in the Workshop, with THAT robot: its name on the world, its accessory drawn, its colour,
 *     and the palette band × request × robot (read from the request data and the catalogue);
 *   - AC4: the stones won by the lent robot too — two robots on the island at once, each on its own plot, each in its
 *     own colour with its own accessory (the kit's elements), a screenshot to look at;
 *   - 1368 EN only: the lent robot renamed on its My robots card is the name on the island; AC6's save code round-trips
 *     through the Grown-ups box with three robots (the third written into the store, as a lend writes it);
 *   - AC3 (1368 EN and 390 FR): the tulips' can holds 3 before Mamie's bigger can and 6 after — one fill, then six pours
 *     that water, the seventh dry (the upgrade written into the store as its win writes it);
 *   - 0 console errors, 0 network errors.
 * --mode 3d  Chrome with software GL (swiftshader): the island with Pip and the lent robot at work, and the Workshop with
 *   the lent robot — screenshots to look at (the 3D accessories are gated in ig007Garden3d.test.ts).
 *
 * Every request, robot, name and count a clause compares is read from the deployed project (the requests' data, the
 * catalogue in Logic/Job robot, the word table): nothing here hard-codes another lane's content.
 * Exits 0 when every clause passed, 1 when any failed, 2 on a usage error.
 */
const fs = require('fs');
const path = require('path');
const { withDeployedSite } = require('./drive-deployed.js');

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
};
const DIR = process.argv[2];
const PROJECT = arg('--project');
const SHOTS = arg('--shots');
const JSON_OUT = arg('--json');
const MODE = arg('--mode') || '2d';
if (!DIR || DIR.startsWith('--') || !PROJECT || !['2d', '3d'].includes(MODE)) {
  console.error('usage: drive-ig005-robots.js <deploy-dir> --project <assembled-project> [--shots <dir>] [--json <file>] [--mode 2d|3d]');
  process.exit(2);
}
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

// ── What the deployed project says (never typed here) ──
function nodesOf(component) {
  const nodes = JSON.parse(fs.readFileSync(path.join(PROJECT, 'components', ...component.split('/'), 'nodes.json'), 'utf8'));
  return Array.isArray(nodes) ? nodes : nodes.nodes || Object.values(nodes);
}
const staticRows = (component) => JSON.parse(nodesOf(component).find((n) => n.type === 'Static Data').parameters.json);
const functionScript = (component) => String(nodesOf(component).find((n) => n.type === 'JavaScriptFunction').parameters.functionScript);
const WORD_ROWS = staticRows('Data/Words');
const WORDS = { en: {}, fr: {} };
for (const r of WORD_ROWS) {
  WORDS.en[r.key] = r.en;
  WORDS.fr[r.key] = r.fr;
}
const w = (lang, key, name = 'Pip') => String(WORDS[lang][key] || '').split('{b}').join(name);
const fill = (text, vars) => Object.entries(vars).reduce((t, [k, v]) => t.split(`{${k}}`).join(String(v)), text);
const REQUESTS = staticRows('Data/Requests');
const byTitle = (key) => REQUESTS.find((r) => r.copyKeys && r.copyKeys.title === key);
const byId = (id) => REQUESTS.find((r) => r.id === id);
const titleOf = (lang, r) => w(lang, r.copyKeys.title);
const needsOf = (r) => r.needs || 'pip';
// The catalogue, as the page ships it (Job robot's script), and the upgrades (Gift line's).
const ROBOTS = JSON.parse(/var ROBOTS = (\[.*?\]);\n/.exec(functionScript('Logic/Job robot'))[1]);
const UPGRADES = JSON.parse(/var UPGRADES = (\[.*?\]);\n/.exec(functionScript('Logic/Gift line'))[1]);
const specOf = (kind) => ROBOTS.find((r) => r.id === kind);
const islanderWord = (who) => ({ mamie: 'islMamie', sami: 'islSami', biscuit: 'islBiscuit' })[who];
const kindWord = (prefix, kind) => prefix + kind.charAt(0).toUpperCase() + kind.slice(1);
const ACC_WORD = { can: 'ig5WearsCan', hod: 'ig5WearsHod', satchel: 'ig5WearsSatchel', bell: 'ig5WearsBell' };
const TULIPS = byTitle('rqTulipsTitle');
const STONES = byTitle('rqStonesTitle');
const LENT = specOf(needsOf(STONES)); // the robot the stones need (Cobble)
const LENDER_REQ = byId(LENT.unlockedBy); // the request whose win lends it (Sami's post-box walk)
const CAN_UP = UPGRADES.find((u) => u.canMax && u.fits.includes(needsOf(TULIPS))); // Mamie's bigger can
const WORLD_SCRIPT = functionScript('Logic/Island world');
const PLOT_W = Number(/var PW = (\d+)/.exec(WORLD_SCRIPT)[1]);
const PLOT_H = Number(/PH = (\d+);/.exec(WORLD_SCRIPT)[1]);
const inPlot = (x, y, r) => x >= r.plot.x && x < r.plot.x + PLOT_W && y >= r.plot.y && y < r.plot.y + PLOT_H;
/** A program as the pad presses that record it: a repeat laid out n times. */
const layOut = (blocks) => blocks.flatMap((b) => (b.t === 'repeat' ? Array.from({ length: Number(b.n) || 0 }, () => layOut(b.body || [])).flat() : [b.t]));
const nameOf = (lang, kind) => specOf(kind).defaultName[lang] || specOf(kind).defaultName.en;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const readings = {};
const check = (name, ok, saw) => {
  results.push({ name, ok: !!ok, saw });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${typeof saw === 'string' ? saw : JSON.stringify(saw)}`}`);
};

const STUB = {
  status: { model: 'ready', reason: '', gpu: false, loadMs: 1, lastMs: 1, asked: 0, fallbacks: 0, busy: false, queued: 0, exam: { at: '2026-09-28T00:00:00.000Z', ms: 1, passed: 20, failed: 0, rungs: {} } },
  olive: () => ({ ok: true, text: 'Thank you, Mamie Rose! (stub)', ms: 5 })
};
const CHROME = MODE === '3d' ? { gpu: true, chromeArgs: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {};

withDeployedSite({ dir: DIR, ...CHROME }, async (page) => {
  const { client } = page;
  const evaluate = (expr) => page.evaluate(expr);
  client.on((msg) => {
    if (msg.method === 'Fetch.requestPaused') {
      const { requestId, request } = msg.params;
      const answer = /\/__garden\/olive\/status/.test(request.url) ? STUB.status : STUB.olive();
      client.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: 'application/json' }], body: Buffer.from(JSON.stringify(answer)).toString('base64') });
    }
  });
  await client.send('Fetch.enable', { patterns: [{ urlPattern: '*/__garden/*', requestStage: 'Request' }] });

  const until = async (expr, ok, ms = 8000) => {
    const end = Date.now() + ms;
    let last = await evaluate(expr);
    while (!ok(last) && Date.now() < end) {
      await wait(150);
      last = await evaluate(expr);
    }
    return last;
  };
  const shot = async (name) => {
    if (SHOTS) await page.screenshot(path.join(SHOTS, `${name}.png`));
  };
  const path0 = () => evaluate('location.pathname');
  const where = (finder, scroll = true) =>
    evaluate(`(() => { const el = (${finder}); if (!el) return { found: false };
      if (${scroll}) el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const at = document.elementFromPoint(x, y);
      return { found: true, x, y, hit: !!at && (el === at || el.contains(at)), at: at ? String(at.className && at.className.baseVal !== undefined ? at.className.baseVal : at.className).slice(0, 60) : null }; })()`);
  const tap = async (finder, label) => {
    let p = await where(finder);
    for (let i = 0; i < 20 && !p.found; i++) {
      await wait(150);
      p = await where(finder);
    }
    if (p.found) {
      await wait(200);
      p = await where(finder, false);
    }
    if (!p.found || !p.hit) {
      check(`tap ${label}`, false, p);
      return false;
    }
    for (const type of ['mousePressed', 'mouseReleased']) await client.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
    await wait(250);
    return true;
  };
  const byText = (selector, needle) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null && e.innerText.trim().includes(${JSON.stringify(needle)}))`;
  const first = (selector) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null)`;
  const typeInto = async (finder, value) => {
    await evaluate(`(() => { const el = (${finder}); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); })()`);
    await wait(250);
  };
  const tab = (i) => tap(`document.querySelectorAll('.bg-tabs .bg-tab')[${i}]`, `tab ${i}`);
  // 🔴 The brief's §4.2: a drive wins a request ONLY as Teach → pad keys → Play.
  const control = (icon) => tap(first(`.bg-controls .bg-i-${icon}`), `control ${icon}`);
  const key = (op) => tap(first(`.bg-pad .bg-key-${op}`), `key ${op}`);
  const stored = () => evaluate(`(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); try { const v = JSON.parse(localStorage.getItem(k)); return v.model || null; } catch (e) { return null; } })()`);
  const active = async () => {
    const m = await stored();
    return m ? m.profiles.find((p) => p.id === m.island.activeId) : null;
  };
  /** Writes into the stored family (as the game writes it), then reads the page again. */
  const writeStore = async (fnBody, path1 = '/island') => {
    await evaluate(`(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); const v = JSON.parse(localStorage.getItem(k)); const m = v.model; const a = m.profiles.find((p) => p.id === m.island.activeId); ${fnBody}; localStorage.setItem(k, JSON.stringify(v)); })()`);
    await page.navigate(path1);
    await wait(1400);
  };
  /** The robots drawn on the flat island (or a Workshop stage): tile, name, accessory, body colour. */
  const botsIn = (scope) =>
    evaluate(`[...document.querySelectorAll('${scope} .gd-bot')].map((b) => { const body = b.querySelector('svg.gd-robot rect[width="44"]'); const acc = b.querySelector('.gd-acc'); return { x: Number(b.getAttribute('data-x')), y: Number(b.getAttribute('data-y')), name: (b.querySelector('.gd-name') || {}).innerText || '', accessory: b.getAttribute('data-accessory') || '', drawn: acc ? acc.getAttribute('data-accessory') : null, colour: body ? body.getAttribute('fill') : null }; })`);
  const CARD = `(() => { const c = document.querySelector('.bg-plot-card'); if (!c || c.offsetParent === null) return { up: false }; const t = (s) => { const e = c.querySelector(s); return e && e.offsetParent !== null ? e.innerText.trim() : null; }; return { up: true, who: t('.bg-plot-who'), title: t('.bg-plot-title'), line: t('.bg-plot-line'), open: t('.bg-plot-open'), home: t('.bg-bring-home') }; })()`;
  const freshFamily = async (tag, lang) => {
    const origin = await evaluate('location.origin');
    await client.send('Storage.clearDataForOrigin', { origin, storageTypes: 'local_storage,indexeddb,cache_storage,service_workers' });
    await page.navigate('/');
    await wait(900);
    if (lang === 'fr') {
      await tap(byText('.bg-top .bg-seg-btn', 'FR'), 'FR');
      await wait(600);
    }
    await tap(first('button.bg-profile-new'), `new player (${tag})`);
    await typeInto(first('input'), 'Ada');
    await tap(byText('.bg-seg-btn', '10–12'), `band 10–12 (${tag})`);
    await tap(byText('button.bg-btn', w(lang, 'create')), `create (${tag})`);
    const at = await until('location.pathname', (p) => p === '/island');
    await wait(900);
    return at === '/island';
  };
  /** Win a request from the island the brief's way: its card, Teach, the reference laid out on the pad, Play. */
  const winRequest = async (r, lang, tag) => {
    await tap(byText('.bg-quest', titleOf(lang, r)), `${r.id} (${tag})`);
    const inWs = await until('location.pathname', (p) => p === '/workshop', 5000);
    if (inWs !== '/workshop') return { won: false, why: 'not in the Workshop', card: await evaluate(CARD) };
    await wait(900);
    await control('rec');
    await until(`!!document.querySelector('.bg-pad .bg-key-fwd')`, Boolean, 4000);
    for (const op of layOut(r.referenceProgram)) await key(op);
    await control('play');
    const won = await until(`(() => { const e = document.querySelector('.bg-win-card'); return !!e && e.offsetParent !== null; })()`, Boolean, 40000);
    const gift = await until(`(() => { const e = document.querySelector('.bg-win-lent'); return e && e.offsetParent !== null ? e.innerText.trim() : ''; })()`, (t) => t.length > 0, 2500);
    return { won, gift };
  };
  const toIsland = async (lang) => {
    const b = await evaluate(`!!(${byText('.bg-win-card button', w(lang, 'winIsland'))})`);
    if (b) await tap(byText('.bg-win-card button', w(lang, 'winIsland')), 'back to the island');
    else await tab(0);
    await until('location.pathname', (p) => p === '/island');
    await wait(1400);
  };

  if (MODE === '3d') {
    // ── The 3D look: Pip and the lent robot at work on the island, then the lent robot in the Workshop ──
    await page.setViewport({ name: '1368', width: 1368, height: 912, mobile: false });
    check('3D: a new player lands on the island', await freshFamily('3d', 'en'), await path0());
    await writeStore(`a.island.robots = [{ id: 'r1' }, { id: ${JSON.stringify(LENT.id)}, kind: ${JSON.stringify(LENT.id)}, name: ${JSON.stringify(LENT.defaultName.en)}, color: ${JSON.stringify(LENT.colour)}, eye: 'round', hat: 'none' }]; a.island.done = [${JSON.stringify(TULIPS.id)}, ${JSON.stringify(STONES.id)}, ${JSON.stringify(LENDER_REQ.id)}]; a.island.plots = { ${JSON.stringify(TULIPS.id)}: { program: ${JSON.stringify(TULIPS.referenceProgram)}, robotId: 'r1', wonAt: 1 }, ${JSON.stringify(STONES.id)}: { program: ${JSON.stringify(STONES.referenceProgram)}, robotId: ${JSON.stringify(LENT.id)}, wonAt: 2 } }`);
    const gl = await until(`(() => { const e = document.querySelector('.bg-isle [data-gd3-world]'); return e ? { meshes: e.getAttribute('data-meshes'), camera: e.getAttribute('data-camera') } : null; })()`, (r) => !!r && !!r.meshes, 15000);
    await wait(3500);
    const names = await evaluate(`[...document.querySelectorAll('.bg-isle .gd3-name')].map((e) => [e.innerText, Number(e.getAttribute('data-x')), Number(e.getAttribute('data-y'))])`);
    readings.gl = { gl, names };
    await shot('ig005-3d-island-two-robots');
    check(`3D AC4: Garden 3D draws the island with two robots named on their own plots (Pip on the tulips, ${LENT.defaultName.en} on the stones)`, !!gl && names.length === 2 && names.some(([n, x, y]) => n === 'Pip' && inPlot(x, y, TULIPS)) && names.some(([n, x, y]) => n === LENT.defaultName.en && inPlot(x, y, STONES)), { gl, names });
    // The lent robot in the Workshop, in 3D (bring him home first: the stones are his plot and he works there).
    await tap(byText('.bg-quest', titleOf('en', STONES)), 'the stones (3D)');
    await until('location.pathname', (p) => p === '/workshop', 5000);
    await until(`!!document.querySelector('.bg-stage [data-gd3-world]')`, Boolean, 15000);
    await wait(3000);
    const wsName = await evaluate(`[...document.querySelectorAll('.bg-stage .gd3-name')].map((e) => e.innerText)`);
    await shot('ig005-3d-workshop-lent');
    check(`3D: the stones’ Workshop draws ${LENT.defaultName.en} (his name over him)`, wsName.includes(LENT.defaultName.en), wsName);
    check('3D: 0 console errors', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
    return finish();
  }

  const VIEWPORTS = [
    { name: '1368', width: 1368, height: 912, mobile: false },
    { name: '390', width: 390, height: 844, mobile: true }
  ];
  for (const vp of VIEWPORTS) {
    for (const lang of ['en', 'fr']) {
      const tag = `${vp.name}-${lang}`;
      const shots = tag === '1368-en' || tag === '390-fr';
      await page.setViewport(vp);
      if (!(await freshFamily(tag, lang))) {
        check(`${tag}: a new player lands on the island`, false, await path0());
        continue;
      }
      const lentName = nameOf(lang, LENT.id);
      const lender = w(lang, islanderWord(LENT.lentBy));

      // AC5: the stones are padlocked until the robot they need is lent; the card says why in one line.
      await tap(byText('.bg-quest', titleOf(lang, STONES)), `the stones (${tag})`);
      await wait(700);
      const stay = await path0();
      const lock = await until(CARD, (c) => c.up, 3000);
      const lockLine = fill(w(lang, 'ig5Locked'), { r: lentName, does: w(lang, kindWord('ig5Does', LENT.id)), who: lender, q: titleOf(lang, LENDER_REQ) });
      readings[`lock-${tag}`] = lock;
      check(`IG-005 AC5 ${tag}: the stones stay padlocked on the island — "${lockLine}" — one line, no way in`, stay === '/island' && lock.up && lock.line === lockLine && !lock.line.includes('\n') && lock.open === null && lock.home === null, { stay, lock, want: lockLine });
      const fenced = await evaluate(`[...document.querySelectorAll('.bg-isle .gd-fence')].map((f) => f.getAttribute('data-fence'))`);
      check(`IG-005 AC5 ${tag}: the stones’ plot is fenced (a padlock over it) while ${lentName} is not lent`, fenced.includes(`${STONES.plot.x},${STONES.plot.y},${PLOT_W},${PLOT_H}`), fenced);
      if (shots) await shot(`ig005-${tag}-01-locked`);
      await tap(first('.bg-plot-close'), 'close the card');

      // AC2: win the request that lends him; the win card says so.
      const w1 = await winRequest(LENDER_REQ, lang, tag);
      const lends = fill(w(lang, 'ig5Lends'), { who: lender, r: lentName, does: w(lang, kindWord('ig5Does', LENT.id)) });
      readings[`lend-${tag}`] = w1;
      check(`IG-005 AC2 ${tag}: ${LENDER_REQ.id} won (Teach, the pad, Play) and the win card says "${lends}"`, w1.won && w1.gift === lends, { ...w1, want: lends });
      if (shots) await shot(`ig005-${tag}-02-lent`);
      await toIsland(lang);
      const saved = await active();
      const row = saved && saved.island.robots.find((r) => r.id === LENT.id);
      check(`IG-005 AC2 ${tag}: the save has ${lentName} in island.robots, the catalogue’s name in her language, not named by the child`, !!row && row.kind === LENT.id && row.name === lentName && row.color === LENT.colour, saved && saved.island.robots);

      // My robots: a card per robot; the lent one named, lent by its islander, wearing its accessory; the others locked.
      await tab(2);
      await until('location.pathname', (p) => p === '/robot');
      await wait(1200);
      const cards = await evaluate(`[...document.querySelectorAll('.bg-robot-card')].filter((c) => c.offsetParent !== null).map((c) => { const t = (s) => { const e = c.querySelector(s); return e && e.offsetParent !== null ? e.innerText.trim() : null; }; const inp = c.querySelector('input'); return { cls: c.className, name: inp && inp.offsetParent !== null ? inp.value : t('.bg-robot-card h3'), tag: t('.bg-robot-tag'), wears: t('.bg-robot-wears'), where: t('.bg-robot-where'), blocks: [...c.querySelectorAll('.bg-ability')].map((a) => a.innerText.trim()), drawn: (c.querySelector('.gd-bot') || { getAttribute: () => null }).getAttribute('data-accessory'), locked: c.className.includes('bg-robot-locked') }; })`);
      readings[`cards-${tag}`] = cards;
      const lentCard = cards.find((c) => c.cls.includes(`bg-robot-${LENT.id}`));
      check(`IG-005 AC2 ${tag}: My robots has a card per robot of the catalogue (${ROBOTS.length}), Pip’s first`, cards.length === ROBOTS.length && cards[0].cls.includes('bg-robot-pip'), cards.map((c) => c.cls));
      check(`IG-005 AC2 ${tag}: ${lentName}’s card — named "${lentName}", "${fill(w(lang, 'ig5LentBy'), { who: lender })}", "${w(lang, ACC_WORD[LENT.accessory])}", drawn with his ${LENT.accessory}, at home`, !!lentCard && lentCard.name === lentName && lentCard.tag === fill(w(lang, 'ig5LentBy'), { who: lender }) && lentCard.wears === w(lang, ACC_WORD[LENT.accessory]) && lentCard.drawn === LENT.accessory && lentCard.where === w(lang, 'ig5AtHome') && !lentCard.locked, lentCard);
      const notLent = cards.filter((c) => c.locked);
      check(`IG-005 ${tag}: the robots not lent yet (${ROBOTS.length - 2}) are locked cards that say who lends them and after what`, notLent.length === ROBOTS.length - 2 && notLent.every((c) => c.tag === w(lang, 'ig5LockedTag') && /“|«/.test(c.where || '')), notLent);
      check(`IG-005 ${tag}: each card shows what its robot can do as block chips (${lentName}: his own blocks among them)`, !!lentCard && lentCard.blocks.includes(w(lang, 'bPick')) && lentCard.blocks.includes(w(lang, 'bPut')) && !lentCard.blocks.includes(w(lang, 'bWater')), lentCard && lentCard.blocks);
      if (shots) await shot(`ig005-${tag}-03-my-robots`);

      // The stones open now, with the lent robot: his name, accessory, colour; the palette band × request × robot.
      await tab(0);
      await until('location.pathname', (p) => p === '/island');
      await wait(900);
      await tap(byText('.bg-quest', titleOf(lang, STONES)), `the stones, lent (${tag})`);
      const ws = await until('location.pathname', (p) => p === '/workshop', 5000);
      await wait(1100);
      const wsBots = await botsIn('.bg-stage');
      const pal = await evaluate(`[...document.querySelectorAll('.bg-blocks-box .gd-palette [data-pal]')].filter((e) => e.offsetParent !== null).map((e) => e.getAttribute('data-pal'))`);
      const wantPal = STONES.palette.filter((id) => ['fwd', 'left', 'right', ...LENT.palette, 'repeat', 'until', 'if', 'when', 'count_inc', 'trick', 'do'].includes(id));
      readings[`ws-${tag}`] = { wsBots, pal };
      check(`IG-005 ${tag}: the stones open in the Workshop with ${lentName} — his name, his ${LENT.accessory}, his colour`, ws === '/workshop' && wsBots.length === 1 && wsBots[0].name === lentName && wsBots[0].accessory === LENT.accessory && wsBots[0].drawn === LENT.accessory && wsBots[0].colour === LENT.colour, wsBots);
      check(`IG-005 AC1 ${tag}: the palette is band × request × robot (${wantPal.join(' ')})`, JSON.stringify(pal) === JSON.stringify(wantPal), { pal, wantPal });
      if (shots) await shot(`ig005-${tag}-04-workshop-lent`);

      // AC4: he wins the stones too — two robots on the island at once, each on its plot, each in its colour and accessory.
      await tab(0);
      await until('location.pathname', (p) => p === '/island');
      await wait(700);
      const w2 = await winRequest(STONES, lang, tag);
      check(`IG-005 ${tag}: the stones won by ${lentName} (Teach, the pad, Play)`, w2.won, w2);
      await toIsland(lang);
      const two = await botsIn('.bg-isle');
      readings[`two-${tag}`] = two;
      const pip = two.find((b) => inPlot(b.x, b.y, LENDER_REQ));
      const him = two.find((b) => inPlot(b.x, b.y, STONES));
      check(`IG-005 AC4 ${tag}: two robots at work at once — Pip on ${LENDER_REQ.id} (coral, the can), ${lentName} on the stones (his colour, his ${LENT.accessory})`, two.length === 2 && !!pip && !!him && pip.name === 'Pip' && pip.drawn === 'can' && pip.colour === specOf('pip').colour && him.name === lentName && him.drawn === LENT.accessory && him.colour === LENT.colour, two);
      if (shots) await shot(`ig005-${tag}-05-two-robots`);

      if (tag === '1368-en') {
        // The lent robot renamed on his card is the name on the island.
        await tab(2);
        await until('location.pathname', (p) => p === '/robot');
        await wait(1000);
        await typeInto(`document.querySelector('.bg-robot-${LENT.id} input')`, 'Rocky');
        await wait(700);
        const afterRename = await active();
        await tab(0);
        await until('location.pathname', (p) => p === '/island');
        await wait(1500);
        const renamed = (await botsIn('.bg-isle')).find((b) => inPlot(b.x, b.y, STONES));
        check(`IG-005 ${tag}: ${lentName} renamed "Rocky" on his card — stored on his row, and the island names him so`, !!renamed && renamed.name === 'Rocky' && afterRename.island.robots.find((r) => r.id === LENT.id).name === 'Rocky', { renamed, robots: afterRename.island.robots });

        // AC6: the save code round-trips with three robots (the third written as a lend writes it).
        const third = ROBOTS.find((r) => r.id !== 'pip' && r.id !== LENT.id);
        await writeStore(`a.island.robots.push({ id: ${JSON.stringify(third.id)}, kind: ${JSON.stringify(third.id)}, name: ${JSON.stringify(third.defaultName.en)}, color: '#3FA66B', eye: 'wink', hat: 'none' })`, '/grown-ups');
        const code = await evaluate(`(() => { const e = document.querySelector('.bg-code'); return e ? e.innerText.trim() : ''; })()`);
        let packed = null;
        try {
          packed = JSON.parse(Buffer.from(code.slice(4).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
        } catch {
          packed = null;
        }
        const prow = packed && (packed.p.find((r) => r[0] === packed.a) || packed.p[0]);
        readings.code = prow && prow[14];
        check('IG-005 AC6: the Grown-ups save code (v4) carries three robots — Pip as his id, the two lent as [id, kind, name, colour, eyes, hat]', !!packed && packed.v === 4 && Array.isArray(prow[14]) && prow[14].length === 3 && prow[14][0] === 'r1' && Array.isArray(prow[14][1]) && prow[14][1][2] === 'Rocky' && Array.isArray(prow[14][2]) && prow[14][2][3] === '#3FA66B', prow && prow[14]);
        const before = await stored();
        const pasteBox = `(document.querySelector('input.bg-paste') || document.querySelector('.bg-paste input'))`;
        await typeInto(pasteBox, code);
        await tap(first('.bg-paste-go'), 'replace the islands (the same code)');
        const said = await until('document.body.innerText', (t) => t.includes(w('en', 'saveCodeDone')), 4000);
        const after = await stored();
        const strip = (m) => m && JSON.stringify(m.profiles.map((p) => ({ robot: p.robot, robots: p.island.robots, plots: p.island.plots, stickers: p.stickers })));
        check('IG-005 AC6: pasted back through the Grown-ups box, the code restores the same three robots (their names, colours, eyes), and their plots', said.includes(w('en', 'saveCodeDone')) && !!after && strip(after) === strip(before), { before: strip(before), after: strip(after) });
        await tab(0);
        await until('location.pathname', (p) => p === '/island');
        await wait(1500);
        const three = await botsIn('.bg-isle');
        check(`IG-005 AC6: … and the island shows the three: two at work, ${third.defaultName.en} at home in its colour and ${third.accessory}`, three.length === 3 && three.some((b) => b.name === third.defaultName.en && b.drawn === third.accessory && b.colour === '#3FA66B'), three);
        if (shots) await shot(`ig005-${tag}-06-three-robots`);
      }

      if (tag === '1368-en' || tag === '390-fr') {
        // AC3: the tulips' can — 3 before Mamie's bigger can, 6 after: one fill, then pours until it is dry.
        const gauge = `(() => { const g = document.querySelector('.bg-stage .gd-bot .gd-can'); return g ? { can: Number(g.getAttribute('data-can')), max: Number(g.getAttribute('data-can-max')) } : null; })()`;
        const pours = async () => {
          await tab(0);
          await until('location.pathname', (p) => p === '/island');
          await wait(800);
          // Pip works the post box: his card on the tulips offers Bring home first (a robot works one plot).
          await tap(byText('.bg-quest', titleOf(lang, TULIPS)), `the tulips (${tag})`);
          if ((await until('location.pathname', (p) => p === '/workshop', 1500)) !== '/workshop') {
            await tap(first('.bg-bring-home'), 'bring Pip home');
            await until(`(() => { const b = document.querySelector('.bg-plot-open'); return !!b && b.offsetParent !== null; })()`, Boolean, 4000);
            await tap(first('.bg-plot-open'), 'Go and help (the tulips)');
          }
          await until('location.pathname', (p) => p === '/workshop', 5000);
          await wait(1000);
          await control('rec');
          await until(`!!document.querySelector('.bg-pad .bg-key-fill')`, Boolean, 4000);
          await key('fill');
          const full = await until(gauge, (g) => !!g && g.can > 0, 2500);
          for (const op of ['left', 'left', 'fwd']) await key(op);
          const seen = [];
          for (let k = 0; k < (full ? full.max : 0) + 1; k++) {
            await key('water');
            seen.push(await evaluate(gauge));
          }
          return { full, seen, wet: seen.filter((g, i) => i === 0 ? full && g.can === full.max - 1 : seen[i - 1] && g.can === seen[i - 1].can - 1).length };
        };
        const before = await pours();
        await writeStore(`if (a.stickers.indexOf(${JSON.stringify(CAN_UP.id)}) === -1) a.stickers.push(${JSON.stringify(CAN_UP.id)})`);
        const after = await pours();
        readings[`can-${tag}`] = { before, after };
        check(`IG-005 AC3 ${tag}: before ${CAN_UP.id} one fill gives ${specOf('pip').canMax} and pours ${specOf('pip').canMax} waters, the next dry; after it one fill gives ${CAN_UP.canMax} and pours ${CAN_UP.canMax}`, !!before.full && before.full.max === specOf('pip').canMax && before.full.can === specOf('pip').canMax && before.wet === specOf('pip').canMax && !!after.full && after.full.max === CAN_UP.canMax && after.full.can === CAN_UP.canMax && after.wet === CAN_UP.canMax && after.seen[after.seen.length - 1].can === 0, { before, after });
        if (shots) await shot(`ig005-${tag}-07-bigger-can`);
      }
      check(`IG-005 ${tag}: 0 console errors, 0 network errors so far`, page.consoleErrors.length === 0 && page.networkErrors.length === 0, { console: page.consoleErrors.slice(0, 5), network: page.networkErrors.slice(0, 5) });
    }
  }
  check('0 console errors through the whole drive', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
  check('0 network errors through the whole drive', page.networkErrors.length === 0, page.networkErrors.slice(0, 5));
  return finish();

  function finish() {
    return { dir: DIR, mode: MODE, results, readings, consoleErrors: page.consoleErrors.slice(), networkErrors: page.networkErrors.slice() };
  }
})
  .then((out) => {
    const failed = out.results.filter((r) => !r.ok).length;
    console.log(`\n${out.results.length - failed}/${out.results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
    if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 2));
    process.exit(failed ? 1 : 0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
