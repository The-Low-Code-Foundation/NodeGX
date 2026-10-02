#!/usr/bin/env node
/**
 * P108 IW-003 (session 3, lane M, Mamie Rose) — Mamie's five missions as jobs, driven the way a child plays them on the
 * DEPLOYED template (the deploy `drive-pages.sh` makes: `drive-cg003-pages.js assemble` + `nodegx deploy`), and the
 * island's job clauses this lane owns.
 *
 * Every press is a CDP mouse event at an element's centre after `elementFromPoint` says it is what a finger would hit.
 * Programs are made the child's way: Teach with the pad (tulip-door, tulips-three and its two folds), taps on the drawer
 * and chips picked on the world (eggs-count's `until [count of 🥚 in [basket]] = 4`), taps and one drag (mamie-note's
 * else, rows-trick's trick). What is graded is what a child sees: the meters on the world (`.gd-meter`'s data-meter),
 * the robot's tile, the ring, the win card. A stub Olive answers `/__garden/*` inside Chrome — and reads the note the
 * way Olive does (the red ones / the yellow ones), since the page lays the day's note from its own seed.
 *
 * `--part workshop` (the default; `--mode 2d`):
 *   M1 tulip-door: the can lies on the grass (a thing, not in Pip's hand) and the tulip wears 0/3; the pad has pick, fill
 *      and water; taught (pick, turn, fill, turn, walk, water ×3) and played — the meter 1/3 → 2/3 → 3/3, Pip holding
 *      the can, then Pip walks home to his start and the win card; EN at 1368 and FR at 1024.
 *   M2 tulips-three (the graded look, IW-000's first job): three tulips 0/3, Pip with an empty can; taught (33 presses),
 *      folded twice (the passes, then the pours: 11 blocks), played — each tulip 3/3 in turn, Pip home, the win card
 *      "Perfect!". Screenshots beside the mockup's 01 / 04 / 05.
 *   M3 eggs-count (the graded look, IW-000's third job; IW-004 AC4 on a page): the hen's pen with the day's eggs, the
 *      basket by the door with yesterday's eggs; the pad has "go to the nearest 🥚" and "go to the 🧺"; the program built
 *      from the drawer — until, compare, count (its chip picked on the BASKET on the world), 4, go to nearest egg, pick up,
 *      go to (chip: the basket), put — emits `until count of egg in [basket] = 4`; the basket is watched (a ring); played:
 *      the basket's number goes up one egg at a time to 4/4, Pocket walks home, the win card. Screenshot beside 12 / 13.
 *   M4 rows-trick: the trick made from the drawer (fill, turn round, repeat 3 { forward, left, water, right }), used twice;
 *      played — six tulips 1/1, Pip home at the pond he started at, the win card.
 *   M5 mamie-note: the day's note (red or yellow); read, fill, if Olive read "red tulip" { left } else { right }, repeat 3
 *      { forward, left, water, right } — played, the day's row watered and not the other, Pip home, the win card.
 *   Each: 0 console errors; the phone (390) look of the eggs.
 * `--part island` (`--mode 2d`): IW-002 AC5, IW-005 AC5 and IW-002 AC3 on Mamie's plots (a family written into the store as
 *   a win writes it: tulip-door pinned to Pip, eggs-count to Pocket):
 *   - IW-005 AC5: Pocket SEEN seeking — his drawn tile walks into the hen's pen, eggs drawn there go, the basket's number
 *     on the island rises to 4/4;
 *   - IW-002 AC5: each robot SEEN walking home when its job is done (its drawn tile ends on its home), the plot NEVER reset
 *     (its meter never falls back to the start while the robot works), and SEEN going back after wear (the tulip's meter
 *     drops, Pip leaves home again);
 *   - IW-002 AC3: the Island page closed (another page) for longer than a wear period, then reopened — the meters as left.
 * `--part island --mode 3d` (swiftshader): IW-005 AC5 in 3D — Pocket's name chip seen moving into the pen, the basket's
 *   3D meter chip rising.
 * `--part look3d --mode 3d` (swiftshader): the three graded jobs' Workshop in Garden 3D — the tulips' chips 0/3, the can
 *   on the grass, the eggs in the pen and the basket's chip; screenshots beside the mockup's 3D shots; the job card.
 *
 * Usage: node scripts/devtools/drive-iw003-mamie.js <deploy-dir> --project <project-dir> [--part workshop|island]
 *        [--mode 2d|3d] [--shots <dir>] [--json <file>]
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
const PART = arg('--part') || 'workshop';
/** --only M1,M5: run just those missions of the workshop part (every one when absent). */
const ONLY = arg('--only') ? new Set(arg('--only').split(',')) : null;
const runs = (m) => !ONLY || ONLY.has(m);
if (!DIR || DIR.startsWith('--') || !PROJECT || !['2d', '3d'].includes(MODE) || !['workshop', 'island', 'look3d'].includes(PART) || (PART === 'look3d' && MODE !== '3d')) {
  console.error('usage: drive-iw003-mamie.js <deploy-dir> --project <project-dir> [--part workshop|island|look3d] [--mode 2d|3d] [--only M1,M3] [--shots <dir>] [--json <file>]  (look3d needs --mode 3d)');
  process.exit(2);
}
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

// ── What the deployed project says (never typed here) ──
const nodesOfComponent = (dir) => {
  const nodes = JSON.parse(fs.readFileSync(path.join(PROJECT, 'components', ...dir.split('/'), 'nodes.json'), 'utf8'));
  return Array.isArray(nodes) ? nodes : nodes.nodes || Object.values(nodes);
};
const tableOf = (component) => JSON.parse(nodesOfComponent(`Data/${component}`).find((n) => n.type === 'Static Data').parameters.json);
const WORD_ROWS = tableOf('Words');
const HINT_ROWS = tableOf('Hints');
const REQUESTS = tableOf('Requests');
const w = (lang, key, name = 'Pip', vars = {}) => {
  let t = String((WORD_ROWS.find((r) => r.key === key) || {})[lang] || '').split('{b}').join(name);
  for (const k of Object.keys(vars)) t = t.split(`{${k}}`).join(String(vars[k]));
  return t;
};
const hint = (lang, key, name = 'Pip') => String((HINT_ROWS.find((r) => r.key === key) || {})[lang] || '').split('{b}').join(name);
const REQ = (id) => REQUESTS.find((r) => r.id === id);
const titleOf = (lang, id) => w(lang, REQ(id).copyKeys.title);
/** A program as the pad presses that record it: a repeat laid out n times. */
const layOut = (blocks) => blocks.flatMap((b) => (b.t === 'repeat' ? Array.from({ length: Number(b.n) || 0 }, () => layOut(b.body || [])).flat() : [b.t]));
const WORLD_SCRIPT = (() => {
  const fn = nodesOfComponent('Logic/Island world').find((n) => n.type === 'JavaScriptFunction');
  return String(fn.parameters.functionScript);
})();
const PLOT_W = Number(/var PW = (\d+)/.exec(WORLD_SCRIPT)[1]);
const PLOT_H = Number(/PH = (\d+);/.exec(WORLD_SCRIPT)[1]);
/** The wear clock, read from the deployed engine (the Step function's text). */
const WEAR = (() => {
  const fn = nodesOfComponent('Logic/Step').find((n) => n.type === 'JavaScriptFunction');
  return JSON.parse(/var WEAR = (\{[^}]*\});/.exec(String(fn.parameters.functionScript))[1]);
})();
const STEP_MS = 380;
const ISLAND_TICK_MS = STEP_MS * 2;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const readings = {};
const check = (name, ok, saw) => {
  results.push({ name, ok: !!ok, saw });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${typeof saw === 'string' ? saw : JSON.stringify(saw)}`}`);
};

/** Olive's read, as the model reads Mamie's note: the colour the note names (either language). */
const STUB = {
  status: { model: 'ready', reason: '', gpu: false, loadMs: 1, lastMs: 1, asked: 0, fallbacks: 0, busy: false, queued: 0, exam: { at: '2026-09-28T00:00:00.000Z', ms: 1, passed: 20, failed: 0, rungs: {} } },
  olive: (body) => {
    if (body && body.rung === 'read') {
      const note = String((body.slots && body.slots.note) || '');
      const yellow = /^The yellow|^Les jaunes/.test(note);
      return { ok: true, value: body.lang === 'fr' ? (yellow ? 'tulipe jaune' : 'tulipe rouge') : yellow ? 'yellow tulip' : 'red tulip', ms: 5 };
    }
    return { ok: true, text: body && body.lang === 'fr' ? 'Merci ! (stub)' : 'Thank you! (stub)', ms: 5 };
  }
};
const CHROME = MODE === '3d' ? { gpu: true, chromeArgs: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {};

withDeployedSite({ dir: DIR, ...CHROME }, async (page) => {
  const { client } = page;
  const evaluate = (expr) => page.evaluate(expr);
  const reads = [];
  client.on((msg) => {
    if (msg.method === 'Fetch.requestPaused') {
      const { requestId, request } = msg.params;
      let body = {};
      try {
        body = JSON.parse(request.postData || '{}');
      } catch {
        body = {};
      }
      const answer = /\/__garden\/olive\/status/.test(request.url) ? STUB.status : STUB.olive(body);
      if (body && body.rung === 'read') reads.push({ note: body.slots && body.slots.note, answer: answer.value });
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
  const key = (op) => tap(first(`.bg-pad .bg-key-${op.replace(/[^a-z0-9]+/gi, '-')}`), `key ${op}`);
  const seg = (label) => tap(byText('.bg-top .bg-seg-btn', label), `seg ${label}`);
  const tab = (i) => tap(`document.querySelectorAll('.bg-tabs .bg-tab')[${i}]`, `tab ${i}`);
  const CARD_UP = `(() => { const e = document.querySelector('.bg-card-help'); return !!e && e.offsetParent !== null; })()`;
  const WON = `(() => { const e = document.querySelector('.bg-win-card'); return !!e && e.offsetParent !== null; })()`;
  const BK = `document.querySelector('.bg-blocks-box .gd-bk')`;
  const reveal = (id) => evaluate(`(() => { const r = ${BK}; return !!r && !!r.__gardenBlocks && r.__gardenBlocks.reveal(${JSON.stringify(id)}); })()`);
  const gotIt = async (label) => {
    if (await evaluate(CARD_UP)) {
      await tap(first('.bg-card-help .bg-card-ok'), `Got it (${label})`);
      await until(CARD_UP, (v) => v === false, 2000);
    }
  };
  const palTap = async (id) => {
    await reveal(id);
    await wait(150);
    await tap(first(`.bg-blocks-box .gd-palette [data-pal-head="${id}"]`), `drawer ${id}`);
    await wait(250);
    await gotIt(id);
  };
  const lastOf = (t) => evaluate(`(() => { const b = [...document.querySelectorAll('.bg-blocks-box .gd-prog .gd-blk[data-t="${t}"]')].pop(); return b ? b.getAttribute('data-id') : ''; })()`);
  const headOfId = (id) => `document.querySelector('.bg-blocks-box .gd-prog [data-head="${id}"]')`;
  const pickerOpts = () => evaluate(`[...document.querySelectorAll('.bg-blocks-box .gd-picker .gd-opt')].map((o) => o.getAttribute('data-opt'))`);
  const pick = async (slotFinder, value, label) => {
    await tap(slotFinder, `${label} (its picker)`);
    await until(`document.querySelectorAll('.bg-blocks-box .gd-picker .gd-opt').length`, (n) => n > 0, 2000);
    const opts = await pickerOpts();
    await tap(`document.querySelector(${JSON.stringify(`.bg-blocks-box .gd-picker .gd-opt[data-opt="${String(value)}"]`)})`, `${label} = ${value} (of ${opts.join(' ')})`);
    await wait(300);
    return opts;
  };
  const selOf = (id) => evaluate(`(document.querySelector('.bg-blocks-box .gd-prog [data-rep="${id}"]') || { getAttribute: () => '' }).getAttribute('data-sel')`);
  /** Make a container the place tapped blocks go (a tap on its word takes it; a second tap would let it go). */
  const ensureSelected = async (id, label) => {
    for (let i = 0; i < 3 && (await selOf(id)) !== '1'; i++) {
      await tap(headOfId(id), `${label} (selected)`);
      await wait(250);
    }
  };
  /** Let a container go (so tapped blocks go to the end of the program). */
  const letGo = async (id, label) => {
    for (let i = 0; i < 3 && (await selOf(id)) === '1'; i++) {
      await tap(headOfId(id), `${label} (let go)`);
      await wait(250);
    }
  };
  const PROGRAM = `(() => { const p = Noodl.Variables.gardenProgram; const l = typeof p === 'string' ? JSON.parse(p || '[]') : p; return Array.isArray(l) ? l : []; })()`;
  const program = () => evaluate(PROGRAM);
  const shape = (list) => (Array.isArray(list) ? list : []).map((b) => b.t + (b.n ? ' ' + b.n : '') + (b.slots && b.slots.sensor ? ' ' + b.slots.sensor : '') + (b.slots && b.slots.kind ? ' ' + b.slots.kind : '') + (b.slots && b.slots.name ? ' ' + b.slots.name : '') + (b.slots && b.slots.thing ? ' [' + (b.slots.thing.kind || b.slots.thing.ref) + ']' : '') + (b.slots && b.slots.cond ? ' ?' + JSON.stringify(b.slots.cond) : '') + (b.body ? ' { ' + shape(b.body) + ' }' : '') + (Array.isArray(b.else) ? ' else { ' + shape(b.else) + ' }' : '')).join(', ');
  /** The engine's world as the page holds it (the Workshop's gardenWorld): the robot and the job things. */
  const ENGINE_WORLD = `(() => { const W = Noodl.Variables.gardenWorld || {}; const r = (W.robots || [])[0] || {}; return { robot: { x: r.x, y: r.y, d: r.d, holds: r.holds || '', can: r.can, carry: (r.carry || []).slice() }, things: (W.things || []).map((t) => ({ kind: t.kind, id: t.id, x: t.x, y: t.y, have: t.have, need: t.need, count: t.count, capacity: t.capacity, text: t.text, color: t.color })), job: W.job || null }; })()`;
  const world = () => evaluate(ENGINE_WORLD);
  /** Every meter drawn on the Workshop's world (2D): kind, the numbers, full or not, and the tile it sits on. */
  const METERS = `[...document.querySelectorAll('.bg-stage .gd-cell .gd-meter')].filter((m) => m.offsetParent !== null).map((m) => { const c = m.closest('.gd-cell'); return { at: c.getAttribute('data-x') + ',' + c.getAttribute('data-y'), kind: m.getAttribute('data-kind'), meter: m.getAttribute('data-meter'), full: m.classList.contains('gd-full'), watch: m.classList.contains('gd-watch') }; })`;
  const meters = () => evaluate(METERS);
  const BOT = `(() => { const b = document.querySelector('.bg-stage .gd-bot'); return b ? { x: Number(b.getAttribute('data-x')), y: Number(b.getAttribute('data-y')), d: Number(b.getAttribute('data-d')), can: (b.querySelector('.gd-can') || { getAttribute: () => null }).getAttribute('data-can') } : null; })()`;
  const PAD = `[...document.querySelectorAll('.bg-pad .bg-key')].filter((e) => e.offsetParent !== null).map((e) => (e.className.match(/bg-key-(go-nearest-[a-z]+|go-to-[a-z]+|fwd|left|right|water|pick|put|fill|say|olive-read)/) || [])[1])`;
  const lend = (kind) => evaluate(`(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); const v = JSON.parse(localStorage.getItem(k)); const m = v.model || v; const a = m.profiles.find((p) => p.id === m.island.activeId); a.island.robots = a.island.robots || [{ id: 'r1' }]; if (!a.island.robots.some((r) => (r.kind || r.id) === ${JSON.stringify(kind)})) a.island.robots.push({ id: ${JSON.stringify(kind)}, kind: ${JSON.stringify(kind)} }); localStorage.setItem(k, JSON.stringify(v)); })()`);
  const freshFamily = async (lang = 'en') => {
    const origin = await evaluate('location.origin');
    await client.send('Storage.clearDataForOrigin', { origin, storageTypes: 'local_storage,indexeddb,cache_storage,service_workers' });
    await page.navigate('/');
    await wait(900);
    if (lang === 'fr') {
      await seg('FR');
      await wait(600);
    }
    await tap(first('button.bg-profile-new'), 'new player');
    await evaluate(`(() => { const el = [...document.querySelectorAll('input')].find((e) => e.offsetParent !== null); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, 'Ada'); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); })()`);
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
    await wait(1000);
  };
  const teach = async (ops) => {
    await control('rec');
    await until(`!!document.querySelector('.bg-pad .bg-key-fwd')`, Boolean, 4000);
    for (const op of ops) await key(op);
    await wait(500);
  };
  /**
   * Play to the end, reading what a child sees every 150 ms: the meters (their text by tile), the robot's drawn tile.
   * Returns the distinct meter texts per tile in the order they showed, the robot's path after the job was done, and whether
   * the win card came up.
   */
  const playAndWatch = async (ms = 60000) => {
    await control('play');
    const seenMeters = {};
    const path = [];
    let won = false;
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const s = await evaluate(`({ m: ${METERS}, b: ${BOT}, won: ${WON} })`);
      for (const m of s.m) {
        const key = m.kind + '@' + m.at;
        seenMeters[key] = seenMeters[key] || [];
        if (seenMeters[key][seenMeters[key].length - 1] !== m.meter) seenMeters[key].push(m.meter);
      }
      if (s.b && (!path.length || path[path.length - 1] !== `${s.b.x},${s.b.y}`)) path.push(`${s.b.x},${s.b.y}`);
      if (s.won) {
        won = true;
        break;
      }
      await wait(150);
    }
    return { seenMeters, path, won };
  };
  const backToIsland = async (lang) => {
    if (await evaluate(WON)) await tap(byText('.bg-win-card button', w(lang, 'winIsland')), 'back to the island');
    await until('location.pathname', (p) => p === '/island');
    await wait(600);
  };
  const homeOf = (id) => REQ(id).job.home;

  if (PART === 'workshop') {
    // ── M1 tulip-door: the can on the grass, picked up, filled, the tulip's meter to 3/3, Pip home ──
    for (const [lang, vp] of runs('M1') ? [['en', { width: 1368, height: 912 }], ['fr', { width: 1024, height: 768 }]] : []) {
      const tag = `${vp.width}-${lang}`;
      await page.setViewport({ ...vp, mobile: false });
      await freshFamily(lang);
      const r = REQ('tulip-door');
      await openQuest(lang, 'tulip-door');
      const w0 = await world();
      const m0 = await meters();
      const canOnGrass = await evaluate(`!!document.querySelector('.bg-stage .gd-canthing')`);
      const pad = await evaluate(PAD);
      const line = await evaluate(`document.body.innerText.includes(${JSON.stringify(w(lang, r.copyKeys.line))})`);
      check(`M1 ${tag}: tulip-door opens on its job — the can lies on the grass (drawn, not in Pip's hand), the tulip by the door wears 0/3, Mamie's line says why ("${w(lang, r.copyKeys.line).slice(0, 48)}…")`, canOnGrass && !w0.robot.holds && m0.some((m) => m.kind === 'tulip' && m.meter === '0/3') && line, { canOnGrass, robot: w0.robot, m0, line });
      check(`M1 ${tag}: the pad has pick, fill and water (the drawer's actions) — ${pad.join(' ')}`, ['pick', 'fill', 'water'].every((k) => pad.includes(k)), pad);
      if (lang === 'en') await shot(`m1-${tag}-01-start`);
      await teach(layOut(r.referenceProgram));
      const taught = await world();
      check(`M1 ${tag}: taught with the pad (${layOut(r.referenceProgram).join(' ')}) — Pip holds the can and the tulip is full in the Teach world`, taught.robot.holds === 'can' && taught.things.some((t) => t.kind === 'tulip' && t.have === 3), taught);
      // Play from here: a fresh run from the start world (Start over would clear what was taught).
      const played = await playAndWatch(40000);
      const tt = r.things.find((t) => t.kind === 'tulip');
      const tulipSeen = played.seenMeters[`tulip@${tt.x},${tt.y}`] || [];
      const home = homeOf('tulip-door');
      const end = await world();
      check(`M1 ${tag}: played — the tulip's meter showed ${tulipSeen.join(' → ')} (0/3 to 3/3 one drink at a time), Pip walked home to ${home.x},${home.y} and the win card came up`, played.won && JSON.stringify(tulipSeen) === JSON.stringify(['0/3', '1/3', '2/3', '3/3']) && end.robot.x === home.x && end.robot.y === home.y && end.robot.d === home.d && played.path[played.path.length - 1] === `${home.x},${home.y}`, { played, end: end.robot });
      await shot(`m1-${tag}-02-won`);
      await backToIsland(lang);
    }

    // ── M2 tulips-three: 33 presses, two folds, Play: each tulip 3/3, Pip home, Perfect ──
    if (runs('M2')) {
      const lang = 'en';
      const tag = '1368-en';
      await page.setViewport({ width: 1368, height: 912, mobile: false });
      await freshFamily(lang);
      const r = REQ('tulips-three');
      await openQuest(lang, 'tulips-three');
      const m0 = await meters();
      const b0 = await evaluate(BOT);
      check(`M2 ${tag}: the tulips wear 0/3 each (three drinks, and the can holds three), Pip's can is empty`, m0.filter((m) => m.kind === 'tulip' && m.meter === '0/3').length === 3 && b0 && b0.can === '0', { m0, b0 });
      await shot('m2-1368-en-01-start');
      await evaluate(`(() => { const j = document.querySelector('.bg-job'); if (j) j.scrollIntoView({ block: 'center' }); })()`);
      await wait(400);
      await shot('m2-1368-en-01b-jobcard');
      await evaluate('window.scrollTo(0, 0)');
      await wait(300);
      const presses = layOut(r.referenceProgram);
      await teach(presses);
      const n = (await program()).length;
      const tidy1 = await until(`(() => { const e = document.querySelector('.bg-tidy'); return e && e.offsetParent !== null ? e.innerText : ''; })()`, Boolean, 4000);
      await tap(first('.bg-tidy .bg-i-tidy'), 'Fold it (the passes)');
      await wait(900);
      const once = await program();
      const tidy2 = await until(`(() => { const e = document.querySelector('.bg-tidy'); return e && e.offsetParent !== null ? e.innerText : ''; })()`, Boolean, 4000);
      await tap(first('.bg-tidy .bg-i-tidy'), 'Fold it (the pours)');
      await wait(900);
      const twice = await program();
      check(`M2 ${tag}: ${presses.length} presses → the fold offers the pass ×3 (${shape(once)}), then the pours ×3 inside it — the reference, ${shape(twice)}`, n === presses.length && !!tidy1 && !!tidy2 && shape(twice) === shape(r.referenceProgram), { n, once: shape(once), twice: shape(twice), want: shape(r.referenceProgram) });
      await shot('m2-1368-en-02-program');
      const played = await playAndWatch(60000);
      const each = ['3,1', '3,2', '3,3'].map((t) => (played.seenMeters['tulip@' + t] || []).join(' → '));
      const home = homeOf('tulips-three');
      const end = await world();
      const owl = ((await evaluate(`(document.querySelector('.bg-owl-say') || {}).innerText || ''`)) || '').trim();
      check(`M2 ${tag}: played — each tulip 0/3 → 1/3 → 2/3 → 3/3 in turn (${each.join(' | ')}), Pip home at ${home.x},${home.y}, the win card`, played.won && each.every((s) => s === '0/3 → 1/3 → 2/3 → 3/3') && end.robot.x === home.x && end.robot.y === home.y, { each, end: end.robot, path: played.path.slice(-6) });
      check(`M2 ${tag}: the owl says "${hint(lang, 'hintPerfect')}" (the folded program IS the reference)`, owl.includes(hint(lang, 'hintPerfect')), owl);
      await shot('m2-1368-en-03-won');
      await backToIsland(lang);
    }

    // ── M3 eggs-count: built from the drawer, chips picked on the basket; watched; played to 4/4; Pocket home ──
    // (1368 in both languages: at 1024 the drawer crowds the program's right edge off the screen — lane B's look fix.)
    for (const [lang, vp] of runs('M3') ? [['en', { width: 1368, height: 912 }], ['fr', { width: 1368, height: 912 }]] : []) {
      const tag = `${vp.width}-${lang}`;
      await page.setViewport({ ...vp, mobile: false });
      await freshFamily(lang);
      await lend('pocket');
      await page.navigate('/island');
      await wait(900);
      const r = REQ('eggs-count');
      await openQuest(lang, 'eggs-count');
      const w0 = await world();
      const basket = w0.things.find((t) => t.kind === 'basket');
      const eggs0 = w0.things.filter((t) => t.kind === 'egg');
      const m0 = await meters();
      const pad = await evaluate(PAD);
      check(`M3 ${tag}: eggs-count opens on its job — the hen in her pen with ${eggs0.length} eggs, the basket by the door at ${basket.count}/${basket.capacity} drawn "${(m0.find((m) => m.kind === 'basket') || {}).meter}"`, !!basket && basket.capacity === 4 && eggs0.length === 4 && w0.things.some((t) => t.kind === 'hen') && m0.some((m) => m.kind === 'basket' && m.meter === `${basket.count}/4`), { basket, eggs0, m0 });
      check(`M3 ${tag}: the pad walks to things (IW-003 §2.5): "go to the nearest 🥚" and "go to the 🧺" beside pick and put — ${pad.join(' ')}`, pad.includes('go-nearest-egg') && pad.includes('go-to-basket') && pad.includes('pick') && pad.includes('put'), pad);
      if (lang === 'en') {
        // The pad's walk, taught: one press records go to the nearest 🥚 and Pocket stands facing an egg; Start over clears it.
        await control('rec');
        await until(`!!document.querySelector('.bg-pad .bg-key-go-nearest-egg')`, Boolean, 4000);
        await key('go-nearest-egg');
        await wait(700);
        const taught = await program();
        const at = await world();
        const f = { x: at.robot.x + [0, 1, 0, -1][at.robot.d], y: at.robot.y + [-1, 0, 1, 0][at.robot.d] };
        const faces = at.things.some((t) => t.kind === 'egg' && t.x === f.x && t.y === f.y);
        await shot(`m3-${tag}-00-pad-go`);
        check(`M3 ${tag}: in Teach, the pad's "go to the nearest 🥚" records its block (${shape(taught)}) and walks Pocket the whole way — he stands facing an egg (${f.x},${f.y})`, shape(taught) === 'go_nearest egg' && faces, { taught: shape(taught), robot: at.robot, f });
        await control('reset');
        await wait(600);
        await control('drive');
        await wait(500);
      }
      // The program, from the drawer: until [ count of 🥚 in [🧺] = 4 ] { go to nearest 🥚, pick up, go to [🧺], put }.
      await palTap('until');
      const untilId = await lastOf('until');
      await palTap('compare');
      await palTap('count');
      await pick(`document.querySelector('.bg-blocks-box .gd-prog .gd-val[data-v="count"] .gd-slot[data-slot="what"]')`, 'egg', 'what the count counts');
      await tap(`document.querySelector('.bg-blocks-box .gd-prog .gd-val[data-v="count"] .gd-val[data-v="thing"]') || document.querySelector('.bg-blocks-box .gd-prog .gd-val[data-v="thing"]')`, 'the count’s chip (pick on the island)');
      const picking = await until(`!!document.querySelector('.bg-blocks-box .gd-bk.gd-picking')`, Boolean, 2000);
      await tap(`document.querySelector('.bg-stage .gd-cell[data-x="${basket.x}"][data-y="${basket.y}"]')`, `the basket on the world (${basket.x},${basket.y})`);
      await wait(600);
      // The number: the compare's right side, 4.
      const numSlot = `document.querySelector('.bg-blocks-box .gd-prog .gd-val[data-v="compare"] .gd-slot[data-slot="n"]') || document.querySelector('.bg-blocks-box .gd-prog .gd-val[data-v="number"] .gd-slot')`;
      const hasNum = await evaluate(`!!(${numSlot})`);
      if (!hasNum) await palTap('number');
      const numNow = await evaluate(`(() => { const s = ${numSlot}; return s ? s.getAttribute('data-value') : null; })()`);
      if (numNow !== '4') await pick(numSlot, '4', 'the number');
      // The body, into the selected until.
      await ensureSelected(untilId, 'the until');
      await palTap('go_nearest');
      await palTap('pick');
      await palTap('go_to');
      const goToId = await lastOf('go_to');
      await tap(`document.querySelector('.bg-blocks-box .gd-prog .gd-blk[data-id="${goToId}"] .gd-val[data-v="thing"]')`, 'go to’s chip (pick on the island)');
      await until(`!!document.querySelector('.bg-blocks-box .gd-bk.gd-picking')`, Boolean, 2000);
      await tap(`document.querySelector('.bg-stage .gd-cell[data-x="${basket.x}"][data-y="${basket.y}"]')`, `the basket again (${basket.x},${basket.y})`);
      await wait(600);
      await ensureSelected(untilId, 'the until');
      await palTap('put');
      const built = await program();
      readings[`m3-${tag}-program`] = built;
      const u = built[0] || {};
      const cond = u.slots && u.slots.cond;
      const bodyShape = shape(u.body || []);
      check(`M3 ${tag}: the program built from the drawer, the chips picked on the basket — until count of egg in [basket] = 4 { ${bodyShape} } (IW-004 AC4's own)`, picking && built.length === 1 && u.t === 'until' && !!cond && cond.op === 'cmp' && cond.cmp === 'eq' && cond.a && cond.a.op === 'count' && cond.a.what === 'egg' && cond.a.thing && cond.a.thing.kind === 'basket' && cond.b && Number(cond.b.n) === 4 && bodyShape === 'go_nearest egg, pick, go_to [basket], put', { built: shape(built), cond });
      // The watch: the basket the program counts is ringed on the world.
      const ringed = await until(`[...document.querySelectorAll('.bg-stage .gd-ring')].map((r) => { const c = r.closest('.gd-cell'); return c ? c.getAttribute('data-x') + ',' + c.getAttribute('data-y') : 'robot'; })`, (l) => l.includes(`${basket.x},${basket.y}`), 3000);
      check(`M3 ${tag}: the basket the program counts is WATCHED — a ring on it on the world (${ringed.join(' ')})`, ringed.includes(`${basket.x},${basket.y}`), ringed);
      if (lang === 'en') await shot(`m3-${tag}-01-program`);
      // The morning Play starts from (Start over lays a new day: the basket's count and the eggs may differ from the first).
      const day = await world();
      const basketNow = day.things.find((t) => t.kind === 'basket');
      const played = await (async () => {
        await control('play');
        const counts = [];
        const path = [];
        let won = false;
        let shotRun = false;
        const end = Date.now() + 90000;
        while (Date.now() < end) {
          const s = await evaluate(`({ m: ${METERS}, b: ${BOT}, won: ${WON} })`);
          const bm = s.m.find((m) => m.kind === 'basket');
          if (bm && counts[counts.length - 1] !== bm.meter) counts.push(bm.meter);
          if (s.b && (!path.length || path[path.length - 1] !== `${s.b.x},${s.b.y}`)) path.push(`${s.b.x},${s.b.y}`);
          if (!shotRun && lang === 'en' && bm && bm.meter === `${basketNow.count + 1}/4`) {
            await shot(`m3-${tag}-02-running`);
            shotRun = true;
          }
          if (s.won) {
            won = true;
            break;
          }
          await wait(150);
        }
        return { counts, path, won };
      })();
      const want = [];
      for (let c = basketNow.count; c <= 4; c++) want.push(`${c}/4`);
      const home = homeOf('eggs-count');
      const end = await world();
      const pen = (p) => { const [x, y] = p.split(',').map(Number); const hen = w0.things.find((t) => t.kind === 'hen'); return !!hen && x >= 0 && y >= 0 && x <= 4 && y <= 3; };
      check(`M3 ${tag}: played — the basket's number went ${played.counts.join(' → ')} (one egg at a time, to 4/4), Pocket walked into the pen for the eggs and home to ${home.x},${home.y}; the win card`, played.won && JSON.stringify(played.counts) === JSON.stringify(want) && played.path.some(pen) && end.robot.x === home.x && end.robot.y === home.y, { played, want, end: end.robot });
      await shot(`m3-${tag}-03-won`);
      await backToIsland(lang);
    }

    // ── M3 on the phone (390): the look ──
    if (runs('M3')) {
      await page.setViewport({ width: 390, height: 844, mobile: true });
      await freshFamily('en');
      await lend('pocket');
      await page.navigate('/island');
      await wait(900);
      await openQuest('en', 'eggs-count');
      const look = await evaluate(`(() => { const s = document.querySelector('.bg-stage .gd-world'); const r = s ? s.getBoundingClientRect() : null; return { sx: document.scrollingElement.scrollWidth, vw: innerWidth, world: r ? [Math.round(r.width), Math.round(r.height)] : null, meters: ${METERS}.length }; })()`);
      await shot('m3-390-en-01-open');
      check('M3 390: the eggs on the phone — the world whole on screen with its meters, nothing wider than the phone', look.sx <= look.vw && !!look.world && look.world[0] <= look.vw && look.meters >= 1, look);
      await page.setViewport({ width: 1368, height: 912, mobile: false });
    }

    // ── M4 rows-trick: the trick from the drawer, used twice ──
    if (runs('M4')) {
      const lang = 'en';
      const tag = '1368-en';
      await freshFamily(lang);
      const r = REQ('rows-trick');
      await openQuest(lang, 'rows-trick');
      await palTap('trick');
      const trickId = await lastOf('trick');
      await pick(`document.querySelector('.bg-blocks-box .gd-prog [data-rep="${trickId}"] .gd-slot[data-slot="name"]')`, 'row', 'the trick’s name');
      await ensureSelected(trickId, 'the trick');
      await palTap('fill');
      await palTap('left');
      await palTap('left');
      await palTap('repeat');
      const repId = await lastOf('repeat');
      await ensureSelected(repId, 'the repeat');
      for (const op of ['fwd', 'left', 'water', 'right']) await palTap(op);
      // Let the repeat and the trick go (a second tap on a selected block lets it go), then the two uses at the end.
      await letGo(repId, 'the repeat');
      await letGo(trickId, 'the trick');
      for (let k = 0; k < 2; k++) {
        await palTap('do');
        const doId = await lastOf('do');
        await pick(`document.querySelector('.bg-blocks-box .gd-prog .gd-blk[data-id="${doId}"] .gd-slot[data-slot="name"]')`, 'row', 'the do’s name');
      }
      const built = await program();
      readings['m4-program'] = built;
      check(`M4 ${tag}: the trick made from the drawer and used twice — ${shape(built)}`, shape(built) === shape(r.referenceProgram), { built: shape(built), want: shape(r.referenceProgram) });
      await shot('m4-1368-en-01-program');
      const played = await playAndWatch(60000);
      const rows = Object.entries(played.seenMeters).filter(([k]) => k.startsWith('tulip@')).map(([k, v]) => `${k}:${v.join('>')}`);
      const home = homeOf('rows-trick');
      const end = await world();
      check(`M4 ${tag}: played — the six tulips each 0/1 → 1/1 (${rows.length} seen), Pip home at the pond he started at (${home.x},${home.y}); the win card`, played.won && rows.length === 6 && rows.every((s) => s.endsWith('0/1>1/1')) && end.robot.x === home.x && end.robot.y === home.y, { rows, end: end.robot });
      await shot('m4-1368-en-02-won');
      await backToIsland(lang);
    }

    // ── M5 mamie-note: Olive reads the day's note; one if turns Pip to that row ──
    for (const lang of runs('M5') ? ['en', 'fr'] : []) {
      const tag = `1368-${lang}`;
      await freshFamily(lang);
      const r = REQ('mamie-note');
      await openQuest(lang, 'mamie-note');
      const w0 = await world();
      const note = w0.things.find((t) => t.kind === 'note');
      const day = /^The yellow|^Les jaunes/.test(String(note && note.text)) ? 'yellow' : 'red';
      const targets = (w0.job && w0.job.targets) || [];
      const rowColours = [...new Set(targets.map((id) => (w0.things.find((t) => t.id === id) || {}).color))];
      check(`M5 ${tag}: today's note says the ${day} ones and the job is that row (targets ${targets.join(' ')}: ${rowColours.join('')})`, rowColours.length === 1 && rowColours[0] === day, { note, targets, rowColours });
      await palTap('olive:read');
      await palTap('fill');
      await palTap('if:else');
      const ifId = await lastOf('if');
      await pick(`document.querySelector('.bg-blocks-box .gd-prog [data-rep="${ifId}"] .gd-slot[data-slot="sensor"]')`, 'olive_read:red_tulip', 'the if’s question');
      // The else: its own mouth — the node puts a tapped block in the first mouth, so the else's right goes by a drag.
      await evaluate(`(() => { const r = ${BK}; const ws = r.__gardenBlocks.workspace(); const b = ws.getBlockById(${JSON.stringify(ifId)}); const c = b.getInput('ELSE') || b.getInput('ELSE_DO') || b.getInput('DO2'); window.__elseInput = c ? c.name : ''; })()`);
      const elseName = await evaluate('window.__elseInput');
      await reveal('right');
      await wait(200);
      const drag = async (fromId, spec) => {
        const p = await evaluate(`(() => { const b = document.querySelector('.bg-blocks-box .gd-palette [data-pal="${fromId}"]'); const i = b && b.querySelector('.gd-icon'); if (!i) return { found: false }; const c = i.getBoundingClientRect(); return { found: true, x: c.left + c.width / 2, y: c.top + c.height / 2 }; })()`);
        const conn = `(() => { const r = ${BK}; const ws = r.__gardenBlocks.workspace(); const parts = ${JSON.stringify(spec)}.split(':'); const b = ws.getBlockById(parts[0]); if (!b) return null; const c = parts[1] === 'next' ? b.nextConnection : b.getInput(parts[1]).connection; const o = b.getRelativeToSurfaceXY(), off = c.getOffsetInBlock(); const s = Blockly.utils.svgMath.wsToScreenCoordinates(ws, new Blockly.utils.Coordinate(o.x + off.x, o.y + off.y)); return { x: s.x, y: s.y }; })()`;
        const DRAGGED = `(() => { const s = Blockly.getSelected && Blockly.getSelected(); if (!s || !s.previousConnection) return null; const pr = s.getSvgRoot().querySelector(':scope > .blocklyPath').getBoundingClientRect(); return { x: pr.left, y: pr.top }; })()`;
        let tgt = await evaluate(conn);
        if (!p.found || !tgt) return false;
        const send = (type, x, y) => client.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
        await send('mousePressed', p.x, p.y);
        let at = { x: p.x, y: p.y };
        const walk = async (to, n) => {
          const from = { ...at };
          for (let i = 1; i <= n; i++) {
            at = { x: from.x + ((to.x - from.x) * i) / n, y: from.y + ((to.y - from.y) * i) / n };
            await send('mouseMoved', at.x, at.y);
            await wait(30);
          }
        };
        await walk({ x: (p.x + tgt.x) / 2, y: (p.y + tgt.y) / 2 }, 7);
        const both = await evaluate(`({ c: ${conn}, d: ${DRAGGED} })`);
        if (both && both.c && both.d) tgt = { x: both.c.x + (at.x - both.d.x), y: both.c.y + (at.y - both.d.y) };
        await walk(tgt, 7);
        await wait(150);
        await send('mouseReleased', tgt.x, tgt.y);
        await wait(500);
        await gotIt('after a drag');
        return true;
      };
      // The else first, while the if's first mouth is empty (a drop near a filled mouth can take its next instead).
      await drag('right', `${ifId}:${elseName || 'ELSE'}`);
      await ensureSelected(ifId, 'the if');
      await palTap('left');
      // Let the if go, then the walk-and-pour at the end.
      await letGo(ifId, 'the if');
      await palTap('repeat');
      const repId = await lastOf('repeat');
      await ensureSelected(repId, 'the repeat');
      for (const op of ['fwd', 'left', 'water', 'right']) await palTap(op);
      const built = await program();
      readings[`m5-${tag}-program`] = built;
      check(`M5 ${tag}: read, fill, if Olive read "red tulip" { left } else { right }, repeat 3 { forward, left, water, right } — ${shape(built)}`, shape(built) === shape(r.referenceProgram), { built: shape(built), want: shape(r.referenceProgram), elseName });
      if (lang === 'en') await shot('m5-1368-en-01-program');
      const played = await playAndWatch(60000);
      const end = await world();
      const wet = (c) => end.things.filter((t) => t.kind === 'tulip' && t.color === c && t.have >= t.need).length;
      const home = homeOf('mamie-note');
      check(`M5 ${tag}: played on the ${day} day — Olive read "${(reads[reads.length - 1] || {}).answer}", the ${day} row watered (${wet(day)}/3) and not the other (${wet(day === 'red' ? 'yellow' : 'red')}), Pip home; the win card`, played.won && wet(day) === 3 && wet(day === 'red' ? 'yellow' : 'red') === 0 && end.robot.x === home.x && end.robot.y === home.y, { reads: reads.slice(-2), end, day });
      await shot(`m5-${tag}-02-won`);
      await backToIsland(lang);
    }
  }

  if (PART === 'look3d') {
    // The Workshop in Garden 3D (swiftshader): the graded jobs' things and chips, and the job card beside them.
    await page.setViewport({ width: 1368, height: 912, mobile: false });
    await freshFamily('en');
    await lend('pocket');
    await page.navigate('/island');
    await wait(900);
    const ROOT = `document.querySelector('.bg-stage [data-gd3-world]')`;
    const CHIPS = `[...document.querySelectorAll('.bg-stage .gd3-meter')].map((c) => c.getAttribute('data-kind') + ':' + c.getAttribute('data-meter'))`;
    const JOB = `(() => { const j = document.querySelector('.bg-job'); return j && j.offsetParent !== null ? j.innerText.split(String.fromCharCode(10)).map((x) => x.trim()).filter(Boolean) : null; })()`;
    for (const [id, want] of [['tulips-three', ['tulip:0/3', 'tulip:0/3', 'tulip:0/3']], ['tulip-door', ['tulip:0/3', 'can:0/3']], ['eggs-count', ['basket:']]]) {
      await openQuest('en', id);
      const ready = await until(`(() => { const e = ${ROOT}; return e ? e.getAttribute('data-ready') : null; })()`, (v) => v === 'true', 20000);
      await wait(2500);
      const chips = await evaluate(CHIPS);
      const job = await evaluate(JOB);
      await shot(`look3d-${id}`);
      const got = want.every((c) => chips.some((x) => x.startsWith(c)));
      check(`LOOK 3D ${id}: Garden 3D draws the job with its chips (${chips.join(' ')}) and the job card beside it (${job ? job[0] : 'none'})`, ready === 'true' && got && !!job && job.length >= 6, { ready, chips, job });
    }
    // IW-005 AC5 in 3D (the Workshop's 8 × 6 world, where software GL keeps up): taught with the pad — go to the nearest 🥚,
    // pick up, go to the 🧺, put — and played: Pocket's name chip SEEN walking to the egg tile by tile, the basket's chip up one.
    // The eggs where the hen laid them this morning (read before Teach, whose own walk picks one in the Teach world).
    const w0 = await evaluate(`(() => { const W = Noodl.Variables.gardenWorld || {}; return (W.things || []).filter((t) => t.kind === 'egg').map((t) => t.x + ',' + t.y); })()`);
    await control('rec');
    await until(`!!document.querySelector('.bg-pad .bg-key-go-nearest-egg')`, Boolean, 4000);
    for (const k of ['go-nearest-egg', 'pick', 'go-to-basket', 'put']) await key(k);
    await wait(600);
    await control('play');
    const NAME = `(() => { const n = document.querySelector('.bg-stage .gd3-name'); return n ? n.getAttribute('data-x') + ',' + n.getAttribute('data-y') : null; })()`;
    const path3d = [];
    const basket3d = [];
    let fell = false;
    const endAt = Date.now() + 30000;
    while (Date.now() < endAt) {
      const r = await evaluate(`({ n: ${NAME}, b: (${CHIPS}).filter((c) => c.startsWith('basket:')), gl: !!${ROOT}, idle: !document.querySelector('.bg-blocks-box .gd-locked') })`);
      if (!r.gl) {
        fell = true;
        break;
      }
      if (r.n && path3d[path3d.length - 1] !== r.n) path3d.push(r.n);
      if (r.b[0] && basket3d[basket3d.length - 1] !== r.b[0]) basket3d.push(r.b[0]);
      if (r.idle && path3d.length > 1) break;
      await wait(150);
    }
    await shot('look3d-eggs-played');
    readings.seekWorkshop3d = { path3d, basket3d, eggs: w0, fellBackToFlat: fell };
    console.log(`IW-005 AC5 readout (Workshop 3D, swiftshader): ${fell ? 'Garden 3D handed back to the flat world (Too Slow) mid-run' : 'Garden 3D throughout'}; the basket's chip ${basket3d.join(' → ')}`);
    const adj = (a, b) => { const [ax, ay] = a.split(',').map(Number); const [bx, by] = b.split(',').map(Number); return Math.abs(ax - bx) + Math.abs(ay - by) === 1; };
    const reached = path3d.some((p) => w0.some((e) => adj(p, e)));
    check(`IW-005 AC5 (3D, the Workshop, swiftshader): Pocket's name chip SEEN walking tile by tile in Garden 3D (${path3d.join(' → ')}) to stand by an egg where the hen laid it (${w0.join(' ')})`, path3d.length >= 3 && reached, readings.seekWorkshop3d);
  }

  if (PART === 'island') {
    // A family whose Mamie plots are won and pinned, as a win writes it: tulip-door to Pip, eggs-count to Pocket.
    await page.setViewport({ width: 1368, height: 912, mobile: false });
    await freshFamily('en');
    const DOOR = REQ('tulip-door');
    const EGGS = REQ('eggs-count');
    await evaluate(`(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); const v = JSON.parse(localStorage.getItem(k)); const m = v.model; const a = m.profiles.find((p) => p.id === m.island.activeId);
      a.island.robots = [{ id: 'r1' }, { id: 'pocket', kind: 'pocket', name: 'Pocket' }];
      a.island.done = ${JSON.stringify([DOOR.id, EGGS.id])};
      a.island.plots = { ${JSON.stringify(DOOR.id)}: { program: ${JSON.stringify(DOOR.referenceProgram)}, robotId: 'r1', wonAt: 1 }, ${JSON.stringify(EGGS.id)}: { program: ${JSON.stringify(EGGS.referenceProgram)}, robotId: 'pocket', wonAt: 2 } };
      localStorage.setItem(k, JSON.stringify(v)); })()`);
    await page.navigate('/island');
    await wait(1500);
    const inPlot = (x, y, r) => x >= r.plot.x && x < r.plot.x + PLOT_W && y >= r.plot.y && y < r.plot.y + PLOT_H;
    const HOME_OF = (r) => ({ x: r.plot.x + r.job.home.x, y: r.plot.y + r.job.home.y });
    const PEN = (() => { const hen = EGGS.things.find((t) => t.kind === 'hen'); return { x0: EGGS.plot.x + hen.pen[0], y0: EGGS.plot.y + hen.pen[1], x1: EGGS.plot.x + hen.pen[2], y1: EGGS.plot.y + hen.pen[3] }; })();
    const inPen = (p) => p.x >= PEN.x0 && p.x <= PEN.x1 && p.y >= PEN.y0 && p.y <= PEN.y1;
    const BASKET = (() => { const b = EGGS.things.find((t) => t.kind === 'basket'); return { x: EGGS.plot.x + b.x, y: EGGS.plot.y + b.y }; })();
    const TULIP = (() => { const t = DOOR.things.find((x) => x.kind === 'tulip'); return { x: DOOR.plot.x + t.x, y: DOOR.plot.y + t.y }; })();
    /** What the island shows: each robot by name and tile; the meters on the two plots; the eggs drawn in the pen. */
    const ISLE = MODE === '3d'
      ? `(() => { const root = document.querySelector('.bg-isle [data-gd3-world]'); const names = [...document.querySelectorAll('.bg-isle .gd3-name')].map((e) => ({ name: e.innerText.trim(), x: Number(e.getAttribute('data-x')), y: Number(e.getAttribute('data-y')) })); const chips = [...document.querySelectorAll('.bg-isle .gd3-meter')].map((c) => ({ kind: c.getAttribute('data-kind'), meter: c.getAttribute('data-meter'), x: Number(c.getAttribute('data-x')), y: Number(c.getAttribute('data-y')) })); return { gl: !!root, names, chips }; })()`
      : `(() => { const bots = [...document.querySelectorAll('.bg-isle .gd-bot')].map((b) => ({ name: ((b.querySelector('.gd-name') || {}).innerText || '').trim(), x: Number(b.getAttribute('data-x')), y: Number(b.getAttribute('data-y')), d: Number(b.getAttribute('data-d')) })); const meter = (x, y) => { const c = document.querySelector('.bg-isle .gd-cell[data-x="' + x + '"][data-y="' + y + '"]'); const m = c && c.querySelector('.gd-meter'); return m ? m.getAttribute('data-meter') : null; }; const eggs = [...document.querySelectorAll('.bg-isle .gd-cell')].filter((c) => c.querySelector('[data-sprite="egg"], .gd-egg')).map((c) => c.getAttribute('data-x') + ',' + c.getAttribute('data-y')); return { bots, basket: meter(${BASKET.x}, ${BASKET.y}), tulip: meter(${TULIP.x}, ${TULIP.y}), eggs }; })()`;
    const isle = () => evaluate(ISLE);
    const bot = (s, name) => (MODE === '3d' ? s.names : s.bots).find((b) => b.name === name);
    const HELD = `(() => { const s = Noodl.Variables.gardenIsland; if (!s || !s.live) return null; const out = {}; for (const k of Object.keys(s.live)) { const c = s.live[k]; out[k] = { phase: c.phase, lap: c.lap, age: c.age, robot: c.robot ? { x: c.robot.x, y: c.robot.y, d: c.robot.d } : null, basket: (c.things || []).filter((t) => t.kind === 'basket').map((t) => t.count)[0], tulip: (c.things || []).filter((t) => t.kind === 'tulip').map((t) => t.have)[0] }; } return { build: s.build, live: out }; })()`;
    const held = () => evaluate(HELD);

    if (MODE === '3d') {
      // Under software GL the whole island in 3D is slow: its Too Slow rule may put the flat island back after a while
      // (IG-007). So the seek is read from the first frames: Pocket's name chip into the hen's pen and the basket's chip
      // rising, while the 3D world is still the one on screen (each read says whether it still is).
      const gl = await until(`!!document.querySelector('.bg-isle [data-gd3-world]') && document.querySelector('.bg-isle [data-gd3-world]').getAttribute('data-ready') === 'true'`, Boolean, 20000);
      const seen = [];
      const chips = [];
      let still3d = true;
      let shot3d = false;
      const end = Date.now() + 60000;
      while (Date.now() < end) {
        const s = await isle();
        if (!s.gl) {
          still3d = false;
          break;
        }
        const p = bot(s, 'Pocket');
        if (p && (!seen.length || seen[seen.length - 1].x !== p.x || seen[seen.length - 1].y !== p.y)) seen.push({ x: p.x, y: p.y });
        const bc = s.chips.find((c) => c.kind === 'basket');
        if (bc && chips[chips.length - 1] !== bc.meter) chips.push(bc.meter);
        if (!shot3d && p && inPen(p)) {
          await shot('iw003-3d-eggs-seek');
          shot3d = true;
        }
        if (seen.some(inPen) && chips.length >= 2) break;
        await wait(200);
      }
      readings.seek3d = { gl, still3d, seen, chips };
      if (!shot3d) await shot('iw003-3d-eggs-seek');
      // A readout, not the gate (the gate is the Workshop's 3D seek, --part look3d): under swiftshader the whole island in 3D
      // hands back to the flat island within a few ticks (Too Slow), so a lap is not seen through here.
      console.log(`IW-005 AC5 readout (3D island, swiftshader): ${still3d ? 'still 3D after 60 s' : 'fell back to the flat island'} after ${seen.length} tiles of Pocket's (${seen.map((q) => q.x + ',' + q.y).join(' ')}), basket chip ${chips.join(' → ')}`);
      const near = (q) => q.x >= PEN.x0 - 1 && q.x <= PEN.x1 + 1 && q.y >= PEN.y0 - 1 && q.y <= PEN.y1 + 1;
      check(`IW-005 AC5 (3D island, swiftshader): Garden 3D draws the island with Pocket at work — his name chip seen moving toward the hen's pen (${seen.map((q) => q.x + ',' + q.y).join(' → ')}) and the basket's 3D chip (${chips[0]})`, gl && seen.length >= 2 && seen.some(near) && chips.length >= 1, readings.seek3d);
    } else {
      // IW-005 AC5 + IW-002 AC5 (lap 0): Pocket seeks the eggs, fills the basket, walks home; Pip does the tulip and walks home.
      const pocketPath = [];
      const basketSeen = [];
      const eggsSeen = [];
      const pipPath = [];
      const tulipSeen = [];
      let shotSeek = false;
      const t0 = Date.now();
      const doneBoth = (s) => { const p = bot(s, 'Pocket'); const q = bot(s, 'Pip'); return s.basket === '4/4' && s.tulip === '3/3' && p && q && p.x === HOME_OF(EGGS).x && p.y === HOME_OF(EGGS).y && q.x === HOME_OF(DOOR).x && q.y === HOME_OF(DOOR).y; };
      let s = await isle();
      while (Date.now() - t0 < 90000 && !doneBoth(s)) {
        const p = bot(s, 'Pocket');
        const q = bot(s, 'Pip');
        if (p && (!pocketPath.length || pocketPath[pocketPath.length - 1].x !== p.x || pocketPath[pocketPath.length - 1].y !== p.y)) pocketPath.push({ x: p.x, y: p.y });
        if (q && (!pipPath.length || pipPath[pipPath.length - 1].x !== q.x || pipPath[pipPath.length - 1].y !== q.y)) pipPath.push({ x: q.x, y: q.y });
        if (basketSeen[basketSeen.length - 1] !== s.basket) basketSeen.push(s.basket);
        if (tulipSeen[tulipSeen.length - 1] !== s.tulip) tulipSeen.push(s.tulip);
        if (eggsSeen[eggsSeen.length - 1] !== s.eggs.length) eggsSeen.push(s.eggs.length);
        if (!shotSeek && p && inPen(p)) {
          await shot('iw003-2d-eggs-seek');
          shotSeek = true;
        }
        await wait(200);
        s = await isle();
      }
      // The last look (the one that ended the loop) counts too.
      if (basketSeen[basketSeen.length - 1] !== s.basket) basketSeen.push(s.basket);
      if (tulipSeen[tulipSeen.length - 1] !== s.tulip) tulipSeen.push(s.tulip);
      if (eggsSeen[eggsSeen.length - 1] !== s.eggs.length) eggsSeen.push(s.eggs.length);
      readings.lap0 = { pocketPath, basketSeen, eggsSeen, pipPath, tulipSeen, ms: Date.now() - t0 };
      await shot('iw003-2d-both-home');
      check(`IW-005 AC5 (2D): Pocket SEEN seeking the eggs — his drawn tile walked into the hen's pen (${pocketPath.filter(inPen).length} of ${pocketPath.length} tiles), the eggs drawn there went ${eggsSeen.join(' → ')}, the basket's number on the island rose ${basketSeen.join(' → ')}`, pocketPath.some(inPen) && basketSeen[basketSeen.length - 1] === '4/4' && basketSeen.length >= 2 && eggsSeen[eggsSeen.length - 1] < eggsSeen[0], readings.lap0);
      const monotone = (l) => l.every((v, i) => i === 0 || v === null || l[i - 1] === null || Number(String(v).split('/')[0]) >= Number(String(l[i - 1]).split('/')[0]));
      check(`IW-002 AC5 (2D): both jobs done and both robots SEEN walking home to their start tiles (Pocket ${HOME_OF(EGGS).x},${HOME_OF(EGGS).y}; Pip ${HOME_OF(DOOR).x},${HOME_OF(DOOR).y}); the plots never reset — the meters only rose (tulip ${tulipSeen.join(' → ')})`, doneBoth(s) && monotone(basketSeen) && monotone(tulipSeen) && pocketPath.length > 2 && pipPath.length > 2, { s, basketSeen, tulipSeen });
      // Waiting at home: the robots stand still until the wear (once each has turned to face the way it started).
      const h0 = await until(HELD, (h) => !!h && Object.values(h.live).every((v) => v.phase === 'wait'), 10000);
      await wait(3 * ISLAND_TICK_MS);
      const s2 = await isle();
      const h1 = await held();
      // Still waiting: nobody moved. A plot whose target wore in those ticks (its age reached its wear period) may have
      // started again — that is the wear's clause below, not a robot that could not wait.
      const WEAR_OF = { [DOOR.id]: WEAR.tulip, [EGGS.id]: WEAR.basket };
      const waited = !!h1 && Object.entries(h1.live).every(([k, v]) => v.phase === 'wait' || v.age >= WEAR_OF[k]);
      const stillAll = !!h1 && Object.values(h1.live).every((v) => v.phase === 'wait');
      check(`IW-002 AC5 (2D): waiting — the held plots say wait (${Object.entries((h0 && h0.live) || {}).map(([k, v]) => k + ':' + v.phase + '@' + v.age).join(' ')}); 3 island ticks later ${stillAll ? 'the two robots still stand at home' : 'only a plot whose wear came has started again'} (Pip ${JSON.stringify(bot(s2, 'Pip'))}, Pocket ${JSON.stringify(bot(s2, 'Pocket'))})`, !!h0 && Object.values(h0.live).every((v) => v.phase === 'wait') && waited && (!stillAll || doneBoth(s2)), { s2, h0, h1 });

      // IW-002 AC3: the island page closed for longer than the tulip's wear, then opened — the meters as left. The island
      // held as the page closed (a tick already in flight may land as it closes) is read twice while it is closed: it must
      // not move; opened again, the island goes on from it (never from a fresh build: age 1, the tulip dry).
      const before = await held();
      await tab(2);
      await until('location.pathname', (p) => p === '/robot');
      const away = (WEAR.tulip + 10) * ISLAND_TICK_MS;
      await wait(3000);
      const closed1 = await held();
      await wait(away - 3000);
      const closed2 = await held();
      await tab(0);
      await until('location.pathname', (p) => p === '/island');
      await wait(1200);
      const back = await isle();
      const backHeld = await held();
      readings.ac3 = { before, closed1, closed2, backHeld, back, awayMs: away };
      await shot('iw003-2d-reopened');
      const plotOf = (h, id) => (h && h.live && h.live[id] ? h.live[id] : {});
      const same = JSON.stringify(closed1) === JSON.stringify(closed2);
      const d = plotOf(closed2, DOOR.id), e = plotOf(closed2, EGGS.id), bd = plotOf(backHeld, DOOR.id);
      check(`IW-002 AC3 (2D): the Island page closed for ${Math.round(away / 1000)} s (longer than the tulip's wear, ${WEAR.tulip} ticks) — nothing ticked while it was closed (the held island the same at 3 s and at ${Math.round(away / 1000)} s: age ${plotOf(closed1, DOOR.id).age} → ${d.age}); opened again it goes on from it (age ${bd.age}, not 1) with the meters as left — the tulip ${back.tulip}, the basket ${back.basket}`, same && d.age - plotOf(before, DOOR.id).age <= 1 && bd.age >= d.age && back.tulip === `${d.tulip}/3` && back.basket === `${e.basket}/4`, readings.ac3);

      // IW-002 AC5: going back after wear — the tulip loses a drink at WEAR.tulip island ticks; Pip leaves home and waters it.
      const tulipAfter = [];
      const pipAfter = [];
      const t1 = Date.now();
      let left = false;
      let refilled = false;
      while (Date.now() - t1 < (WEAR.tulip + 45) * ISLAND_TICK_MS) {
        const x = await isle();
        const q = bot(x, 'Pip');
        if (tulipAfter[tulipAfter.length - 1] !== x.tulip) tulipAfter.push(x.tulip);
        if (q && (!pipAfter.length || pipAfter[pipAfter.length - 1].x !== q.x || pipAfter[pipAfter.length - 1].y !== q.y)) pipAfter.push({ x: q.x, y: q.y });
        if (q && (q.x !== HOME_OF(DOOR).x || q.y !== HOME_OF(DOOR).y)) {
          if (!left) await shot('iw003-2d-goes-back');
          left = true;
        }
        if (left && x.tulip === '3/3' && q && q.x === HOME_OF(DOOR).x && q.y === HOME_OF(DOOR).y) {
          refilled = true;
          break;
        }
        await wait(300);
      }
      readings.goesBack = { tulipAfter, pipAfter };
      check(`IW-002 AC5 (2D): after wear the tulip's meter dropped (${tulipAfter.join(' → ')}) and Pip was SEEN going back — he left home (${pipAfter.length} tiles walked) and came home again with the tulip full`, tulipAfter.includes('2/3') && left && refilled, readings.goesBack);
    }
  }

  check('0 console errors through the whole drive', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
  check('0 network errors through the whole drive', page.networkErrors.length === 0, page.networkErrors.slice(0, 5));
  return { dir: DIR, part: PART, mode: MODE, results, readings, consoleErrors: page.consoleErrors.slice(), networkErrors: page.networkErrors.slice() };
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
