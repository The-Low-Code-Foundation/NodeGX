#!/usr/bin/env node
/**
 * P108 IW-006 (session 4, lane E) — shells earned by jobs, driven the way a child meets them on the DEPLOYED template
 * (the deploy `drive-pages.sh` makes: `drive-cg003-pages.js assemble` + `nodegx-deploy.cjs`).
 *
 * What is graded is what a child sees — the win card's "+N 🐚" line under the thanks, the island's "+N 🐚" chip after the
 * meter fills — and the save the page writes (localStorage, the store's own model) beside it. The numbers are never
 * typed here: the bonus table and the cap are read from the deployed project's own Logic/Win pay, a job's steps from its
 * request's targets.
 *
 * Clauses:
 *   E1  Workshop, EN, 1024 × 768: path-postbox built from the drawer and played → the win card; after the thanks, the line
 *       "+N 🐚 shells for the job" (N = the steps + the bonus), SMALLER than the thanks and BELOW it (principle 2); the save:
 *       earned N, spent 0, the plot's live job done (the door 1/1).
 *   E2  Keep tinkering, Play again: the same win, no "+N" line, earned unchanged (AC1: done and not worn earns nothing more).
 *   E3  Workshop, FR, 1368 × 900: tulip-door → "+N 🐚 coquillages pour le travail"; earned adds it.
 *   E4  The island (FR → EN): the save's tulip-door live job worn (the tulip 2/3) and the page opened fresh: Pip leaves
 *       home, waters, the tulip is drawn 3/3, THEN the chip "Pip +N 🐚" (1 step + the bonus's third); the save: earned
 *       +N, spent 0, the live job's tulip 3/3.
 *   E5  An app restart (the page loaded again: nothing held in memory): the island goes on from the save — the tulip drawn
 *       3/3 at once and Pip waiting at home (the held state says wait); control: the same save without its live job
 *       starts from the job's start (the tulip 0/3, Pip at work).
 *   E6  AC5, the v4 → v5 migration on a page: each v4 family of the fixture (written by the v4 encoder) put in the page's
 *       storage and the app opened — written back at once as v5, every profile whole (only shells {0, 0} and owned []
 *       added), the Profiles page drawing each kid; band 7–9 (Léa, FR) and band 10–12 (Sam EN active, Noa FR), each
 *       kid's island opened in her own language.
 *   E7  0 console errors, 0 network errors.
 *
 * Usage: node scripts/devtools/drive-iw006-earn.js <deploy-dir> --project <project-dir> [--shots <dir>] [--json <file>]
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
const PROJECT = arg('--project') || path.join(__dirname, '..', '..', 'templates', 'bot-garden');
const SHOTS = arg('--shots');
const JSON_OUT = arg('--json');
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-iw006-earn.js <deploy-dir> --project <project-dir> [--shots <dir>] [--json <file>]');
  process.exit(2);
}
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const nodesOfComponent = (dir) => {
  const nodes = JSON.parse(fs.readFileSync(path.join(PROJECT, 'components', ...dir.split('/'), 'nodes.json'), 'utf8'));
  return Array.isArray(nodes) ? nodes : nodes.nodes || Object.values(nodes);
};
const tableOf = (component) => JSON.parse(nodesOfComponent(`Data/${component}`).find((n) => n.type === 'Static Data').parameters.json);
const scriptOf = (component) => String(nodesOfComponent(component).find((n) => n.type === 'JavaScriptFunction').parameters.functionScript);
const WORD_ROWS = tableOf('Words');
const REQUESTS = tableOf('Requests');
const PAY_SCRIPT = scriptOf('Logic/Win pay');
const JOB_BONUS = JSON.parse(/var JOB_BONUS = (\{.*?\});\n/.exec(PAY_SCRIPT)[1]);
const CAP = Number(/var SHELLS_RUN_CAP = (\d+);/.exec(PAY_SCRIPT)[1]);
const SAVE_V = Number(/var SAVE_VERSION = (\d+);/.exec(scriptOf('Logic/Encode save code'))[1]);
const V4 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'packages', 'noodl-mcp', 'tests', 'fixtures', 'iw006-v4-saves.json'), 'utf8'));
const w = (lang, key, vars = {}) => {
  let t = String((WORD_ROWS.find((r) => r.key === key) || {})[lang] || '');
  for (const k of Object.keys(vars)) t = t.split(`{${k}}`).join(String(vars[k]));
  return t;
};
const req = (id) => REQUESTS.find((r) => r.id === id);
const titleOf = (lang, id) => w(lang, req(id).copyKeys.title);
/** A job's steps from its start: each target's need less what it has (a tulip's drinks, a door's letters). */
const stepsOf = (id) => req(id).job.targets.reduce((n, tid) => {
  const t = req(id).things.find((x) => x.id === tid);
  if (!t) return n;
  if (t.kind === 'tulip') return n + Math.max(0, (t.need || 1) - (t.have || 0));
  return n + Math.max(0, (t.capacity || 0) - (t.count || 0));
}, 0);
const firstWin = (id) => Math.min(stepsOf(id), CAP) + JOB_BONUS[id];
const totalOf = stepsOf;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const readings = {};
const check = (name, ok, saw) => {
  results.push({ name, ok: !!ok, saw });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${typeof saw === 'string' ? saw : JSON.stringify(saw)}`}`);
};

withDeployedSite({ dir: DIR }, async (page) => {
  const { client } = page;
  const evaluate = (expr) => page.evaluate(expr);
  // A stub Olive (none of these missions asks her; the status call is answered so the page is quiet).
  client.on((msg) => {
    if (msg.method === 'Fetch.requestPaused') {
      const { requestId } = msg.params;
      const body = { model: 'ready', reason: '', gpu: false, loadMs: 1, lastMs: 1, asked: 0, fallbacks: 0, busy: false, queued: 0, exam: { at: '2026-09-28T00:00:00.000Z', ms: 1, passed: 20, failed: 0, rungs: {} }, ok: true, text: 'stub', ms: 1 };
      client.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: 'application/json' }], body: Buffer.from(JSON.stringify(body)).toString('base64') });
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
  const where = (finder, scroll = true) =>
    evaluate(`(() => { const el = (${finder}); if (!el) return { found: false };
      if (${scroll}) el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const at = document.elementFromPoint(x, y);
      return { found: true, x, y, hit: !!at && (el === at || el.contains(at)) }; })()`);
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
  const control = (icon) => tap(first(`.bg-controls .bg-i-${icon}`), `control ${icon}`);
  const seg = (label) => tap(byText('.bg-top .bg-seg-btn', label), `seg ${label}`);
  const tab = (i) => tap(`document.querySelectorAll('.bg-tabs .bg-tab')[${i}]`, `tab ${i}`);
  const CARD_UP = `(() => { const e = document.querySelector('.bg-card-help'); return !!e && e.offsetParent !== null; })()`;
  const BK = `document.querySelector('.bg-blocks-box .gd-bk')`;
  const reveal = (id) => evaluate(`(() => { const r = ${BK}; return !!r && !!r.__gardenBlocks && r.__gardenBlocks.reveal(${JSON.stringify(id)}); })()`);
  const palTap = async (id) => {
    await reveal(id);
    await wait(150);
    await tap(first(`.bg-blocks-box .gd-palette [data-pal-head="${id}"]`), `palette ${id}`);
    await wait(200);
    if (await evaluate(CARD_UP)) {
      await tap(first('.bg-card-help .bg-card-ok'), `Got it (${id})`);
      await until(CARD_UP, (v) => v === false, 2000);
    }
  };
  const storeKey = `Object.keys(localStorage).find((x) => /bot-garden/.test(x))`;
  const stored = () => evaluate(`(() => { const k = ${storeKey}; if (!k) return null; try { const v = JSON.parse(localStorage.getItem(k)); return v.model || v; } catch (e) { return null; } })()`);
  const activeOf = (m) => (m && Array.isArray(m.profiles) ? m.profiles.find((p) => p.id === (m.island || {}).activeId) : null);
  /** Write into the stored family (the active kid) and keep the rest as it was. */
  const editActive = (fnBody) => evaluate(`(() => { const k = ${storeKey}; const v = JSON.parse(localStorage.getItem(k)); const m = v.model || v; const a = m.profiles.find((p) => p.id === m.island.activeId); (function (a) { ${fnBody} })(a); localStorage.setItem(k, JSON.stringify(v)); return true; })()`);
  const freshFamily = async () => {
    const origin = await evaluate('location.origin');
    await client.send('Storage.clearDataForOrigin', { origin, storageTypes: 'local_storage,indexeddb,cache_storage,service_workers' });
    await page.navigate('/');
    await wait(900);
  };
  const newPlayer = async (name, lang = 'en') => {
    await tap(first('button.bg-profile-new'), `new player ${name}`);
    await until(`[...document.querySelectorAll('input')].some((e) => e.offsetParent !== null)`, Boolean, 6000);
    await evaluate(`(() => { const el = [...document.querySelectorAll('input')].find((e) => e.offsetParent !== null); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, ${JSON.stringify(name)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); })()`);
    await wait(250);
    await tap(byText('.bg-seg-btn', '10–12'), 'band 10–12 in the form');
    await tap(byText('button.bg-btn', w(lang, 'create')), 'create');
    await until('location.pathname', (p) => p === '/island');
    await wait(700);
  };
  const openQuest = async (lang, id) => {
    await tab(0);
    await until('location.pathname', (p) => p === '/island');
    await wait(700);
    await tap(byText('.bg-quest', titleOf(lang, id)), `open ${id}`);
    await until('location.pathname', (p) => p === '/workshop');
    await until(`!!document.querySelector('.bg-blocks-box .gd-palette [data-pal="fwd"]')`, Boolean, 6000);
    await wait(900);
  };
  const runOver = () => until(`!document.querySelector('.bg-blocks-box .gd-locked')`, Boolean, 60000);
  const WIN_UP = `(() => { const e = document.querySelector('.bg-win-card'); return !!e && e.offsetParent !== null; })()`;
  const winUp = () => until(WIN_UP, Boolean, 60000);
  /** The win card as a child sees it: the thanks (its biggest words), the "+N" line, their sizes and where each sits. */
  const WIN = `(() => { const c = document.querySelector('.bg-win-card'); if (!c || c.offsetParent === null) return { up: false };
    const texts = [...c.querySelectorAll('*')].filter((e) => e.offsetParent !== null && e.children.length === 0 && e.innerText && e.innerText.trim());
    const big = texts.map((e) => ({ t: e.innerText.trim(), fs: parseFloat(getComputedStyle(e).fontSize), top: e.getBoundingClientRect().top })).sort((a, b) => b.fs - a.fs)[0] || null;
    const p = c.querySelector('.bg-win-pay'); const shown = !!p && p.offsetParent !== null;
    return { up: true, thanks: big, pay: shown ? { t: p.innerText.trim(), fs: parseFloat(getComputedStyle(p).fontSize), top: p.getBoundingClientRect().top } : null }; })()`;
  const stay = async (lang) => {
    if (await evaluate(WIN_UP)) await tap(byText('.bg-win-card button', w(lang, 'winStay')), 'Keep tinkering');
    await wait(500);
  };
  const program = async (id) => {
    for (const b of req(id).referenceProgram) await palTap(b.t);
  };

  // ── E1: path-postbox won in the Workshop (EN, 1024 × 768) ──
  await page.setViewport({ width: 1024, height: 768, mobile: false });
  await freshFamily();
  await newPlayer('Ada');
  const KEY = await evaluate(storeKey);
  readings.storeKey = KEY;
  await openQuest('en', 'path-postbox');
  await program('path-postbox');
  await control('play');
  await runOver();
  const won1 = await winUp();
  const e1 = await until(WIN, (v) => !!v.pay, 4000);
  await wait(300);
  const m1 = await stored();
  const a1 = activeOf(m1) || {};
  readings.e1 = { e1, shells: a1.shells, live: a1.island && a1.island.plots['path-postbox'] ? a1.island.plots['path-postbox'].live : null };
  await shot('iw006e-e1-win-pay-1024-en');
  const n1 = firstWin('path-postbox');
  check(`E1 (EN, 1024): path-postbox won → the win card says “${w('en', 'iw6eWinPay', { n: n1 })}” (${stepsOf('path-postbox')} step + the bonus ${JOB_BONUS['path-postbox']}) under the thanks, smaller than it (principle 2)`, !!won1 && !!e1.pay && e1.pay.t === w('en', 'iw6eWinPay', { n: n1 }) && !!e1.thanks && e1.pay.fs < e1.thanks.fs && e1.pay.top > e1.thanks.top, e1);
  const door1 = readings.e1.live && readings.e1.live.things.find((t) => t.kind === 'door');
  check(`E1: the save — earned ${n1}, spent 0; the plot starts done (its live job: the door 1/1, its clock 0)`, !!a1.shells && a1.shells.earned === n1 && a1.shells.spent === 0 && !!door1 && door1.count === 1 && readings.e1.live.age === 0, readings.e1);

  // ── E2: Play again — done and not worn: nothing more ──
  await stay('en');
  await control('play');
  await runOver();
  const won2 = await winUp();
  await wait(1500);
  const e2 = await evaluate(WIN);
  const a2 = activeOf(await stored()) || {};
  await shot('iw006e-e2-replay-no-pay-1024-en');
  check(`E2: Keep tinkering → Play again → the win card again, and NO “+N” line; earned still ${n1} (AC1: a job done and not worn earns nothing more)`, !!won2 && e2.up && e2.pay === null && !!a2.shells && a2.shells.earned === n1, { e2, shells: a2.shells });
  await stay('en');

  // ── E3: tulip-door won in the Workshop (FR, 1368 × 900) ──
  await page.setViewport({ width: 1368, height: 900, mobile: false });
  await seg('FR');
  await wait(800);
  // Pip works the post box's plot now: the tulip's card says so and offers to bring him home — as a child does, then Go and help.
  await tab(0);
  await until('location.pathname', (p) => p === '/island');
  await wait(900);
  await tap(byText('.bg-quest', titleOf('fr', 'tulip-door')), 'open tulip-door (Pip is at work elsewhere: its card)');
  await tap(first('.bg-bring-home'), 'bring Pip home');
  await until(`(() => { const b = document.querySelector('.bg-plot-open'); return !!b && b.offsetParent !== null; })()`, Boolean, 4000);
  await tap(first('.bg-plot-open'), 'Go and help (tulip-door)');
  await until('location.pathname', (p) => p === '/workshop');
  await until(`!!document.querySelector('.bg-blocks-box .gd-palette [data-pal="fwd"]')`, Boolean, 6000);
  await wait(900);
  await program('tulip-door');
  await control('play');
  await runOver();
  const won3 = await winUp();
  const e3 = await until(WIN, (v) => !!v.pay, 4000);
  await wait(300);
  const a3 = activeOf(await stored()) || {};
  const n3 = firstWin('tulip-door');
  await shot('iw006e-e3-win-pay-1368-fr');
  check(`E3 (FR, 1368): tulip-door won → “${w('fr', 'iw6eWinPay', { n: n3 })}” under the thanks, smaller; earned ${n1} + ${n3}`, !!won3 && !!e3.pay && e3.pay.t === w('fr', 'iw6eWinPay', { n: n3 }) && e3.pay.fs < e3.thanks.fs && e3.pay.top > e3.thanks.top && a3.shells.earned === n1 + n3 && a3.shells.spent === 0, { e3, shells: a3.shells });
  await stay('fr');
  await seg('EN');
  await wait(800);

  // ── E4: the island pays Pip's lap on a worn job (the tulip 2/3 in the save), then shows "+N 🐚" ──
  const DOOR = req('tulip-door');
  const TULIP = DOOR.things.find((t) => t.kind === 'tulip');
  const TX = DOOR.plot.x + TULIP.x, TY = DOOR.plot.y + TULIP.y;
  const HOME = { x: DOOR.plot.x + DOOR.job.home.x, y: DOOR.plot.y + DOOR.job.home.y };
  await editActive(`const lv = a.island.plots['tulip-door'].live; lv.things.find((t) => t.kind === 'tulip').have = 2; lv.things.find((t) => t.kind === 'tulip').watered = false;`);
  const before4 = activeOf(await stored());
  // At 1024 × 768, the tightest desktop island (the chip between the tap line and Find my robots).
  await page.setViewport({ width: 1024, height: 768, mobile: false });
  await page.navigate('/island');
  await wait(1200);
  const ISLE = `(() => { const c = document.querySelector('.bg-isle .gd-cell[data-x="${TX}"][data-y="${TY}"]'); const m = c && c.querySelector('.gd-meter'); const pip = [...document.querySelectorAll('.bg-isle .gd-bot')].map((b) => ({ x: Number(b.getAttribute('data-x')), y: Number(b.getAttribute('data-y')), name: ((b.querySelector('.gd-name') || {}).innerText || '').trim() })).find((b) => b.x >= ${DOOR.plot.x} && b.x < ${DOOR.plot.x + 8} && b.y >= ${DOOR.plot.y} && b.y < ${DOOR.plot.y + 6});
    const chip = document.querySelector('.bg-isle-pay'); return { meter: m ? m.getAttribute('data-meter') : null, pip: pip || null, chip: chip && chip.offsetParent !== null ? chip.innerText.trim() : null }; })()`;
  const seen4 = [];
  let fullAt = -1, chipAt = -1, left = false, chipShot = false;
  const t4 = Date.now();
  while (Date.now() - t4 < 45000) {
    const s = await evaluate(ISLE);
    const i = seen4.length;
    seen4.push(s);
    if (s.pip && (s.pip.x !== HOME.x || s.pip.y !== HOME.y)) left = true;
    if (fullAt < 0 && s.meter === '3/3') fullAt = i;
    if (chipAt < 0 && s.chip) chipAt = i;
    if (s.chip && !chipShot) {
      await shot('iw006e-e4-island-pay-chip-1024-en');
      chipShot = true;
    }
    if (chipAt >= 0 && Date.now() - t4 > 1000 && i > chipAt + 2) break;
    await wait(200);
  }
  const after4 = activeOf(await stored());
  const lapPay = 1 + Math.round(JOB_BONUS['tulip-door'] / totalOf('tulip-door'));
  const liveTulip4 = after4 && after4.island.plots['tulip-door'].live ? after4.island.plots['tulip-door'].live.things.find((t) => t.kind === 'tulip') : null;
  readings.e4 = { first: seen4[0], fullAt, chipAt, chip: chipAt >= 0 ? seen4[chipAt].chip : null, left, earnedBefore: before4.shells.earned, earnedAfter: after4.shells.earned, spent: after4.shells.spent, liveTulip: liveTulip4, looks: seen4.length };
  check(`E4 (the island): the save's worn tulip drawn 2/3, Pip SEEN leaving home to water it, the tulip drawn 3/3 — THEN the chip “${w('en', 'iw6eIslePay', { r: 'Pip', n: lapPay })}” (1 step + the bonus's share ${lapPay - 1}), after the meter (principle 2)`, seen4[0].meter === '2/3' && left && fullAt >= 0 && chipAt >= fullAt && seen4[chipAt].chip === w('en', 'iw6eIslePay', { r: 'Pip', n: lapPay }), readings.e4);
  check(`E4: the save — earned +${lapPay} (${before4.shells.earned} → ${after4.shells.earned}), spent 0, the live job's tulip 3/3 (written at the lap's end)`, after4.shells.earned - before4.shells.earned === lapPay && after4.shells.spent === 0 && !!liveTulip4 && liveTulip4.have === 3, readings.e4);

  // The chip where a child reads it: inside the island's frame, nothing it covers but the island's own edge (no islander's
  // bubble, the tap line, Find my robots); at 390 under the island, the page no wider than the phone.
  const CHIP_BOX = `(() => { const c = document.querySelector('.bg-isle-pay'); if (!c || c.offsetParent === null) return null; const r = c.getBoundingClientRect(); const hits = [...document.querySelectorAll('.bg-isle .gd-isl-say, .bg-isle-tap, .bg-isle-find')].filter((e) => e.offsetParent !== null).map((e) => e.getBoundingClientRect()).filter((q) => q.left < r.right && r.left < q.right && q.top < r.bottom && r.top < q.bottom).length; const isle = document.querySelector('.bg-isle').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, covers: hits, inside: r.left >= isle.left && r.right <= isle.right && r.top >= isle.top - 1 && r.bottom <= isle.bottom + 60, sx: document.scrollingElement.scrollWidth, vw: innerWidth }; })()`;
  const chip1024 = readings.e4.chipBox = await (async () => { await editActive(`const lv = a.island.plots['tulip-door'].live; lv.things.find((t) => t.kind === 'tulip').have = 2; lv.things.find((t) => t.kind === 'tulip').watered = false;`); await page.navigate('/island'); return until(CHIP_BOX, Boolean, 40000); })();
  await shot('iw006e-e4-island-pay-chip-1024-en-2');
  await page.setViewport({ width: 390, height: 844, mobile: true });
  await editActive(`const lv = a.island.plots['tulip-door'].live; lv.things.find((t) => t.kind === 'tulip').have = 2; lv.things.find((t) => t.kind === 'tulip').watered = false;`);
  await page.navigate('/island');
  const chip390 = readings.e4.chipBox390 = await until(CHIP_BOX, Boolean, 40000);
  if (chip390) await evaluate(`document.querySelector('.bg-isle-pay').scrollIntoView({ block: 'center' })`);
  await shot('iw006e-e4-island-pay-chip-390-en');
  check('E4 (the look): the chip covers no islander’s bubble, the tap line or Find my robots — at 1024 over the island’s top, at 390 under the island, the page no wider than the phone', !!chip1024 && chip1024.covers === 0 && chip1024.inside && !!chip390 && chip390.covers === 0 && chip390.sx <= chip390.vw, { chip1024, chip390 });
  await page.setViewport({ width: 1368, height: 900, mobile: false });

  // ── E5: an app restart — the island goes on from the save, never from the job's start ──
  await wait(1500);
  await page.navigate('/island');
  await wait(1000);
  const HELD = `(() => { const s = Noodl.Variables.gardenIsland; const c = s && s.live ? s.live['tulip-door'] : null; return c ? { phase: c.phase, age: c.age, robot: c.robot ? [c.robot.x, c.robot.y] : null, tulip: (c.things || []).filter((t) => t.kind === 'tulip').map((t) => t.have)[0] } : null; })()`;
  const r5 = await evaluate(ISLE);
  const h5 = await until(HELD, Boolean, 3000);
  await shot('iw006e-e5-restart-waits-1368-en');
  const saved5 = activeOf(await stored()).island.plots['tulip-door'].live;
  // Control: the same save without its live job starts from the job's start.
  await editActive(`delete a.island.plots['tulip-door'].live;`);
  await page.navigate('/island');
  await wait(1000);
  const c5 = await evaluate(ISLE);
  const hc5 = await until(HELD, Boolean, 3000);
  readings.e5 = { restart: { drawn: r5, held: h5, savedAge: saved5 ? saved5.age : null }, control: { drawn: c5, held: hc5 } };
  check(`E5 (an app restart): the page loaded again goes on from the save — the tulip drawn 3/3 at once, Pip at home (${HOME.x},${HOME.y}), the held plot waiting; control: the save without its live job starts at the job's start (the tulip 0/3, Pip at work)`, r5.meter === '3/3' && !!h5 && h5.phase === 'wait' && h5.tulip === 3 && r5.pip && r5.pip.x === HOME.x && r5.pip.y === HOME.y && c5.meter === '0/3' && !!hc5 && hc5.phase === 'work', readings.e5);

  // ── E6: AC5 — a v4 family in the page's storage, the app opened: written back as v5 at once, nothing lost ──
  const without = (p) => { const q = JSON.parse(JSON.stringify(p)); delete q.shells; delete q.owned; return q; };
  /** Two values alike whatever order their keys were written in. */
  const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((q) => [q, x[q]])) : x));
  for (const band of ['band1', 'band2']) {
    const fx = V4[band].model;
    await freshFamily();
    await evaluate(`localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(JSON.stringify({ model: fx }))})`);
    const seeded = await stored();
    await page.navigate('/');
    await wait(1500);
    const back = await until(`(() => { const k = ${JSON.stringify(KEY)}; const v = JSON.parse(localStorage.getItem(k) || 'null'); return v && (v.model || v); })()`, (m) => !!m && m.v === SAVE_V, 5000);
    const names = await evaluate(`[...document.querySelectorAll('.bg-profile h3')].map((e) => e.innerText.trim())`);
    await shot(`iw006e-e6-migrated-${band}-profiles`);
    const whole = !!back && back.profiles.length === fx.profiles.length && fx.profiles.every((p, i) => canon(without(back.profiles[i])) === canon(p) && JSON.stringify(back.profiles[i].shells) === JSON.stringify({ earned: 0, spent: 0 }) && JSON.stringify(back.profiles[i].owned) === '[]');
    readings[`e6${band}`] = { seededV: seeded && seeded.v, backV: back && back.v, names, activeId: back && back.island.activeId };
    check(`E6 AC5 (${band === 'band1' ? 'band 7–9: Léa' : 'band 10–12: Noa and Sam'}): the stored v4 family (v ${seeded && seeded.v}) is written back as v${SAVE_V} the moment the app opens — every profile whole, only shells {0, 0} and owned [] added; the Profiles page draws ${fx.profiles.map((p) => p.name).join(', ')}`, !!seeded && seeded.v === 4 && whole && back.island.activeId === fx.island.activeId && fx.profiles.every((p) => names.includes(p.name)), readings[`e6${band}`]);
    // Each kid's island in her own language: her card → the island, its requests' heading in her words.
    for (const p of fx.profiles) {
      await page.navigate('/');
      await wait(900);
      await tap(byText('.bg-profile h3', p.name), `${p.name}’s card`);
      await until('location.pathname', (x) => x === '/island');
      await wait(1200);
      // The eyebrow is drawn in capitals (its CSS): innerText reads it as drawn, so it is compared without case.
      const heads = await evaluate(`[...document.querySelectorAll('.bg-quest, .bg-island *')].filter((e) => e.offsetParent !== null && e.children.length === 0).map((e) => String(e.innerText || '').trim()).filter(Boolean)`);
      const doneIds = p.island.done;
      const titles = doneIds.map((id) => titleOf(p.lang, id));
      const again = activeOf(await stored());
      await shot(`iw006e-e6-migrated-${band}-${p.name.normalize('NFD').replace(/[^\w]/g, '')}-island-${p.lang}`);
      check(`E6 AC5 (${band}, ${p.name}, ${p.lang.toUpperCase()}): her island opens in ${p.lang === 'fr' ? 'French' : 'English'} (“${w(p.lang, 'isReq')}”), her requests done in it (${doneIds.length}) listed by their ${p.lang.toUpperCase()} titles; still v${SAVE_V}, her wallet ${JSON.stringify(again && again.shells)}`, heads.some((h) => h.toLowerCase() === w(p.lang, 'isReq').toLowerCase()) && titles.every((t) => heads.some((h) => h.includes(t))) && !!again && again.name === p.name && JSON.stringify(again.shells) === JSON.stringify({ earned: 0, spent: 0 }), { name: p.name, lang: p.lang, heads: heads.slice(0, 12), titles, again: again && { name: again.name, shells: again.shells } });
    }
  }

  check('E7: 0 console errors through the whole drive', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
  check('E7: 0 network errors through the whole drive', page.networkErrors.length === 0, page.networkErrors.slice(0, 5));
  return { dir: DIR, results, readings, consoleErrors: page.consoleErrors.slice(), networkErrors: page.networkErrors.slice() };
})
  .then((out) => {
    if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 1));
    const failed = out.results.filter((r) => !r.ok).length;
    console.log(`\n${out.results.length - failed}/${out.results.length} clauses passed`);
    process.exit(failed ? 1 : 0);
  })
  .catch((e) => {
    console.error(e && e.stack ? e.stack : String(e));
    process.exit(1);
  });
