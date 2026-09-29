#!/usr/bin/env node
/**
 * P106 IG-003 (session 3, lane B) — Drive · Teach · Play and the islander's Predict challenge, driven on the DEPLOYED
 * template (the deploy `drive-pages.sh` makes: `drive-cg003-pages.js assemble` + `nodegx-deploy.cjs`).
 *
 * Every press is a CDP mouse event at an element's centre after `elementFromPoint` says it is what a finger would hit.
 * A stub Olive answers `/__garden/*` inside Chrome (as the page drive's). Words, hints and requests are read from the
 * deployed project's own tables at run time, never typed here. Both languages, 1368×912 and 390×844, 0 console errors.
 *
 * Clauses (IG-003 §3):
 *   AC1  free play opens in Drive: the bar is Drive · Teach · Play · One step · Start over (no Predict), Drive is ringed,
 *        the pad shows, the steps sit on the paper with the note; four pad presses move the robot four tiles, the
 *        program stays [] and the count reads "0 blocks".
 *   AC5  a bump while driving is the bump animation, not a hint (the owl's line does not change on a Drive press).
 *   AC2  Drive → Teach puts the robot back at the start and says so; the first hint is hintEmpty; the same four presses
 *        record four blocks and end on the same tile; Play replays from the start and ends there.
 *   AC3  Teach → Drive keeps the program; driving does not change it; Play still runs it.
 *   AC5  after a run (free play's "did what you said"), Teach's first hint is the pattern hint, never the run's line.
 *   AC4  the tulips at band 10–12: a program not yet played → the islander's card asks "Before you press Play, tap where
 *        {b} will stop."; a wrong tap flags the real end and says the miss hint; a right tap says "You were right!",
 *        puts the tick on the tile, then plays; One step cancels it; at band 7–9 nothing shows.
 *   IG-006 dev. 2 (P108 IW-001 F4): the ? on a DRAWER block opens that block's card.
 *
 * Usage: node scripts/devtools/drive-ig003-modes.js <deploy-dir> --project <project-dir> [--shots <dir>] [--json <file>]
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
  console.error('usage: drive-ig003-modes.js <deploy-dir> --project <project-dir> [--shots <dir>] [--json <file>]');
  process.exit(2);
}
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const tableOf = (component) => {
  const nodes = JSON.parse(fs.readFileSync(path.join(PROJECT, 'components', 'Data', component, 'nodes.json'), 'utf8'));
  return JSON.parse((Array.isArray(nodes) ? nodes : nodes.nodes || Object.values(nodes)).find((n) => n.type === 'Static Data').parameters.json);
};
const WORD_ROWS = tableOf('Words');
const HINT_ROWS = tableOf('Hints');
const REQUESTS = tableOf('Requests');
const w = (lang, key, name = 'Pip', vars = {}) => {
  let t = String((WORD_ROWS.find((r) => r.key === key) || {})[lang] || '').split('{b}').join(name);
  for (const k of Object.keys(vars)) t = t.split(`{${k}}`).join(String(vars[k]));
  return t;
};
const hint = (lang, key, name = 'Pip') => String((HINT_ROWS.find((r) => r.key === key) || {})[lang] || '').split('{b}').join(name);
const TULIPS = REQUESTS.find((r) => r.challenge === 'predict' && r.copyKeys && r.copyKeys.title === 'rqTulipsTitle');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const readings = {};
const check = (name, ok, saw) => {
  results.push({ name, ok: !!ok, saw });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${typeof saw === 'string' ? saw : JSON.stringify(saw)}`}`);
};

const STUB = {
  status: { model: 'ready', reason: '', gpu: false, loadMs: 1, lastMs: 1, asked: 0, fallbacks: 0, busy: false, queued: 0, exam: { at: '2026-09-28T00:00:00.000Z', ms: 1, passed: 20, failed: 0, rungs: {} } },
  olive: (body) => ({ ok: true, text: body && body.lang === 'fr' ? 'Merci, Mamie Rose ! (stub)' : 'Thank you, Mamie Rose! (stub)', ms: 5 })
};

withDeployedSite({ dir: DIR }, async (page) => {
  const { client } = page;
  const evaluate = (expr) => page.evaluate(expr);
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
  const key = (op) => tap(first(`.bg-pad .bg-key-${op}`), `key ${op}`);
  const seg = (label) => tap(byText('.bg-top .bg-seg-btn', label), `seg ${label}`);
  const tab = (i) => tap(`document.querySelectorAll('.bg-tabs .bg-tab')[${i}]`, `tab ${i}`);
  const cell = (x, y) => `document.querySelector('.bg-stage .gd-cell[data-x="${x}"][data-y="${y}"]')`;

  /** What a child sees on the Workshop, read off the page in one go. */
  const SEEN = `(() => {
    const vis = (e) => !!e && e.offsetParent !== null;
    const txt = (s) => { const e = [...document.querySelectorAll(s)].find(vis); return e ? e.innerText.trim() : ''; };
    const bot = document.querySelector('.bg-stage .gd-bot');
    const turn = bot && bot.querySelector('.gd-turn');
    const W = window.Noodl && Noodl.Variables && Noodl.Variables.gardenWorld;
    const r0 = W && W.robots && W.robots[0];
    const prog = window.Noodl && Noodl.Variables ? Noodl.Variables.gardenProgram : null;
    let progLen = null; try { const p = typeof prog === 'string' ? JSON.parse(prog || '[]') : prog; progLen = Array.isArray(p) ? p.length : null; } catch (e) { progLen = -1; }
    const box = document.querySelector('.bg-blocks-box .gd-prog');
    return {
      bar: [...document.querySelectorAll('.bg-controls .bg-btn')].filter(vis).map((b) => ((b.className.match(/bg-i-(\\w+)/) || [])[1] || '?')),
      ringed: [...document.querySelectorAll('.bg-controls .bg-mode-on')].filter(vis).map((b) => ((b.className.match(/bg-i-(\\w+)/) || [])[1] || '?')),
      pad: vis(document.querySelector('.bg-pad .bg-key')),
      tag: txt('.bg-rec'),
      line: txt('.bg-mode-line'),
      note: txt('.bg-steps-note'),
      card: txt('.bg-ws .bg-grow'),
      owl: txt('.bg-owl-say'),
      blocks: document.querySelectorAll('.bg-blocks-box .gd-prog .gd-blk[data-id]').length,
      ids: [...document.querySelectorAll('.bg-blocks-box .gd-prog .gd-blk[data-id]')].map((b) => b.getAttribute('data-id')).join(','),
      progLen,
      bodyText: document.body.innerText,
      drawn: bot ? { x: +bot.getAttribute('data-x'), y: +bot.getAttribute('data-y'), d: +bot.getAttribute('data-d'), bump: turn ? +(turn.getAttribute('data-bump') || 0) : 0 } : null,
      engine: r0 ? { x: r0.x, y: r0.y, d: r0.d } : null,
      driving: !!document.querySelector('.bg-blocks-box.bg-driving'),
      progGround: box ? getComputedStyle(box).backgroundColor : '',
      progOpacity: box ? getComputedStyle(box).opacity : '',
      flag: (() => { const f = document.querySelector('.bg-stage svg.gd-thing.gd-flag[data-sprite="flag"]'); return f ? f.closest('.gd-cell').getAttribute('data-x') + ',' + f.closest('.gd-cell').getAttribute('data-y') : null; })(),
      tick: (() => { const f = document.querySelector('.bg-stage svg.gd-thing.gd-tick[data-sprite="tick"]'); return f ? f.closest('.gd-cell').getAttribute('data-x') + ',' + f.closest('.gd-cell').getAttribute('data-y') : null; })(),
      locked: !!document.querySelector('.bg-blocks-box .gd-locked'),
      sx: document.scrollingElement.scrollWidth, vw: innerWidth
    };
  })()`;
  const seen = () => evaluate(SEEN);
  const at = (s) => (s && s.drawn && s.engine ? `${s.engine.x},${s.engine.y}|${s.drawn.x},${s.drawn.y}` : 'none');
  const both = (x, y) => `${x},${y}|${x},${y}`;
  const openQuest = async (needle, label) => {
    await tab(0);
    await until('location.pathname', (p) => p === '/island');
    await wait(700);
    await tap(byText('.bg-quest', needle), label);
    await until('location.pathname', (p) => p === '/workshop');
    await until(`!!document.querySelector('.bg-blocks-box .gd-palette [data-pal="fwd"]')`, Boolean, 6000);
    await wait(900);
  };
  const runOver = () => until(`!document.querySelector('.bg-blocks-box .gd-locked')`, Boolean, 15000);

  const VIEWPORTS = [
    { name: '1368', width: 1368, height: 912, mobile: false },
    { name: '390', width: 390, height: 844, mobile: true }
  ];
  for (const vp of VIEWPORTS) {
    for (const lang of ['en', 'fr']) {
      const tag = `${vp.name}-${lang}`;
      const shots = tag === '1368-en' || tag === '390-fr';
      await page.setViewport(vp);
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

      // ── AC1: free play opens in Drive; four presses move the robot four tiles and record nothing ──
      await openQuest(w(lang, 'sandP').slice(0, 10), `free play (${tag})`);
      const s0 = await seen();
      readings[`open-${tag}`] = { ...s0, bodyText: undefined };
      check(`AC1 ${tag}: the bar is Drive · Teach · Play · One step · Start over (no Predict), and it opens in Drive (Drive ringed, the pad up)`, JSON.stringify(s0.bar) === JSON.stringify(['drive', 'rec', 'play', 'step', 'reset']) && JSON.stringify(s0.ringed) === JSON.stringify(['drive']) && s0.pad, { bar: s0.bar, ringed: s0.ringed, pad: s0.pad });
      check(`AC1 ${tag}: Drive says so — the tag "${w(lang, 'ig3DrivingTag')}", the line "${w(lang, 'ig3Driving')}", and the steps on the paper (not faded) with "${w(lang, 'ig3StepsDriving')}"`, s0.tag === w(lang, 'ig3DrivingTag') && s0.line === w(lang, 'ig3Driving') && s0.note === w(lang, 'ig3StepsDriving') && s0.driving && s0.progGround === 'rgb(255, 240, 211)' && s0.progOpacity === '1', { tag: s0.tag, line: s0.line, note: s0.note, driving: s0.driving, ground: s0.progGround, opacity: s0.progOpacity });
      if (shots) await shot(`ig003-${tag}-01-drive`);
      const owl0 = s0.owl;
      const start = s0.engine;
      for (let k = 0; k < 4; k++) await key('fwd');
      await wait(1100);
      const s1 = await seen();
      const zero = w(lang, 'blocks', 'Pip', { n: 0 });
      check(`AC1 ${tag}: four Drive presses move the robot four tiles (${start && start.x},${start && start.y} → ${start && start.x + 4},${start && start.y}, the engine and the drawn robot), the program stays [] and the count reads "${zero}"`, !!start && at(s1) === both(start.x + 4, start.y) && s1.blocks === 0 && s1.progLen === 0 && s1.bodyText.includes(zero), { at: at(s1), blocks: s1.blocks, progLen: s1.progLen, zero, hasZero: s1.bodyText.includes(zero) });
      check(`AC5 ${tag}: a Drive press does not fire the hint table (the owl says what it said before the presses)`, s1.owl === owl0 && owl0 !== '', { before: owl0, after: s1.owl });
      // AC5: drive into the edge: three more steps and a bump — the robot shakes, the owl says nothing new.
      for (let k = 0; k < 4; k++) await key('fwd');
      await wait(1100);
      const s2 = await seen();
      check(`AC5 ${tag}: a bump while driving is the bump animation (data-bump ${s2.drawn && s2.drawn.bump}), not a hint (the owl unchanged)`, !!s2.drawn && s2.drawn.bump >= 1 && s2.owl === owl0 && s2.blocks === 0 && at(s2) === both(7, start.y), { drawn: s2.drawn, owl: s2.owl, blocks: s2.blocks });
      if (shots) await shot(`ig003-${tag}-02-drive-bump`);

      // ── AC2: Drive → Teach: back to the start, said; the same four presses record four blocks to the same tile ──
      await control('rec');
      await wait(900);
      const t0 = await seen();
      check(`AC2 ${tag}: Teach puts the robot back at the start (${start.x},${start.y}) and says "${w(lang, 'ig3TeachOn')}"; Teach is ringed; the steps are off the paper`, at(t0) === both(start.x, start.y) && t0.drawn.d === start.d && t0.line === w(lang, 'ig3TeachOn') && t0.tag === w(lang, 'recording') && JSON.stringify(t0.ringed) === JSON.stringify(['rec']) && !t0.driving && t0.note === '', { at: at(t0), line: t0.line, tag: t0.tag, ringed: t0.ringed });
      const firstHint = await until(`(document.querySelector('.bg-owl-say') || {}).innerText || ''`, (t) => t.length > 0, 2000);
      check(`AC5 ${tag}: the first hint after Teach begins is hintEmpty ("${hint(lang, 'hintEmpty').slice(0, 30)}…"), never the bump`, firstHint.includes(hint(lang, 'hintEmpty').slice(0, 24)) && !firstHint.includes(hint(lang, 'hintBump').slice(0, 16)), { firstHint, want: hint(lang, 'hintEmpty') });
      if (shots) await shot(`ig003-${tag}-03-teach`);
      for (let k = 0; k < 4; k++) await key('fwd');
      await wait(1100);
      const t1 = await seen();
      const fourIds = t1.ids;
      check(`AC2 ${tag}: the same four presses record four blocks, and the robot is on the same end tile as in Drive (${start.x + 4},${start.y})`, t1.blocks === 4 && t1.progLen === 4 && at(t1) === both(start.x + 4, start.y) && t1.bodyText.includes(w(lang, 'blocks', 'Pip', { n: 4 })) && t1.line === '', { blocks: t1.blocks, at: at(t1), line: t1.line });
      await control('play');
      const via = await until(SEEN, (s) => !!s.engine && s.engine.x === start.x, 3000);
      await runOver();
      await wait(600);
      const t2 = await seen();
      check(`AC2 ${tag}: Play replays from the start (seen at ${start.x},${start.y}) and ends on ${start.x + 4},${start.y}; the pad goes away`, !!via.engine && via.engine.x === start.x && at(t2) === both(start.x + 4, start.y) && !t2.pad && t2.ringed.length === 0, { via: at(via), end: at(t2), pad: t2.pad });

      // ── AC3: Teach → Drive keeps the program; driving does not change it; Play still runs it ──
      await control('drive');
      await wait(600);
      for (const op of ['right', 'fwd']) await key(op);
      await wait(1100);
      const d1 = await seen();
      check(`AC3 ${tag}: Drive keeps the four blocks (the same ids), the robot moves (to ${start.x + 4},${start.y + 1}), and the program does not change`, d1.ids === fourIds && d1.blocks === 4 && at(d1) === both(start.x + 4, start.y + 1) && d1.driving, { ids: d1.ids, fourIds, at: at(d1) });
      await control('play');
      await runOver();
      await wait(600);
      const d2 = await seen();
      check(`AC3 ${tag}: Play still runs it — from the start to ${start.x + 4},${start.y}, the same four blocks`, at(d2) === both(start.x + 4, start.y) && d2.ids === fourIds, { at: at(d2), ids: d2.ids });
      // Teach again with the four blocks there: the robot waits where they end, and the line says so.
      await control('rec');
      await wait(900);
      const r0 = await seen();
      check(`AC2 ${tag}: Teach with blocks already there puts the robot where they end (${start.x + 4},${start.y}) and says "${w(lang, 'ig3TeachGoOn')}"`, at(r0) === both(start.x + 4, start.y) && r0.line === w(lang, 'ig3TeachGoOn'), { at: at(r0), line: r0.line });
      // AC5: a run that bumps (up three, left, forward: no run of four, so no fold nudge) says the bump; Teach after it
      // never repeats the run's line.
      await control('reset');
      await wait(700);
      await control('rec');
      for (const op of ['left', 'fwd', 'fwd', 'fwd', 'left', 'fwd']) await key(op);
      await control('play');
      const bumpLine = await until(`(document.querySelector('.bg-owl-say') || {}).innerText || ''`, (t) => t.includes(hint(lang, 'hintBump').slice(0, 16)), 9000);
      await runOver();
      await control('rec');
      await wait(1000);
      const r1 = await seen();
      check(`AC5 ${tag}: after a run that bumped (the owl said so), Teach’s first hint is about the program — the start line — never the bump`, bumpLine.includes(hint(lang, 'hintBump').slice(0, 16)) && !r1.owl.includes(hint(lang, 'hintBump').slice(0, 16)) && r1.owl.includes(hint(lang, 'hintStart').slice(0, 20)), { bumpLine, owl: r1.owl });

      // ── IG-006 deviation 2, as P108 IW-001 F4 moved it: the ? on the DRAWER's forward block opens its card ──
      await tap(first('.bg-blocks-box .gd-palette .gd-pal-item[data-pal-item="fwd"] .gd-help[data-help]'), 'the ? on the drawer’s forward');
      const card = await until(`(() => { const e = document.querySelector('.bg-card-help'); return e && e.offsetParent !== null ? (e.querySelector('.bg-card-title') || {}).innerText || '' : ''; })()`, Boolean, 2500);
      const after = await seen();
      check(`IG-003 / IG-006 dev. 2 ${tag} (IW-001 F4): the ? on the drawer’s forward opens its card ("${w(lang, 'bFwd')}") and edits nothing`, card.trim() === w(lang, 'bFwd') && after.ids === r1.ids && after.blocks === 6, { card, ids: after.ids, before: r1.ids });
      if (shots) await shot(`ig003-${tag}-04-help`);
      await tap(first('.bg-card-help .bg-card-ok'), 'Got it');
      await wait(300);

      // ── AC4: the islander's challenge on the tulips (band 10–12) ──
      if (!TULIPS) {
        check('AC4: the tulips carry the challenge in the deployed requests', false, REQUESTS.map((r) => [r.id, r.challenge]));
        continue;
      }
      await openQuest(w(lang, TULIPS.copyKeys.title), `the tulips (${tag})`);
      const ownLine = w(lang, TULIPS.copyKeys.line);
      const ask = w(lang, 'ig3PredictAsk');
      const c0 = await seen();
      check(`AC4 ${tag}: the tulips open in Drive with the islander’s own line (no program, no challenge)`, c0.card.includes(ownLine.slice(0, 20)) && !c0.card.includes(ask) && JSON.stringify(c0.ringed) === JSON.stringify(['drive']), { card: c0.card, ringed: c0.ringed });
      const S = TULIPS.robotStart;
      await control('rec');
      for (const op of ['left', 'left', 'fwd']) await key(op);
      await wait(700);
      const end = (await seen()).engine;
      await control('drive');
      const c1 = await until(SEEN, (s) => s.card.includes(ask), 3000);
      check(`AC4 ${tag}: with a program not yet played the islander asks "${ask}", and Drive puts the robot back at the start (${S.x},${S.y})`, c1.card.includes(ask) && at(c1) === both(S.x, S.y), { card: c1.card, at: at(c1) });
      if (shots) await shot(`ig003-${tag}-05-challenge`);
      // A wrong tile away from the pad and the tag (at 390 the pad covers the world's right half).
      const wrong = { x: 0, y: 5 };
      await tap(cell(wrong.x, wrong.y), 'a wrong tile');
      const m = await until(SEEN, (s) => !!s.flag, 3000);
      const missOwl = await until(`(document.querySelector('.bg-owl-say') || {}).innerText || ''`, (t) => t.includes(hint(lang, 'hintPredictMiss').slice(0, 16)), 3000);
      check(`AC4 ${tag}: a wrong tap (${wrong.x},${wrong.y}) shows the flag on the real end (${end.x},${end.y}) and the miss hint; the card goes back to the islander’s line; no tick`, m.flag === `${end.x},${end.y}` && missOwl.includes(hint(lang, 'hintPredictMiss').slice(0, 16)) && !m.card.includes(ask) && m.card.includes(ownLine.slice(0, 20)) && !m.tick, { flag: m.flag, missOwl, card: m.card, tick: m.tick });
      if (shots) await shot(`ig003-${tag}-06-miss`);
      // One more block (a turn: the end tile stays): asked again; the right tile.
      await control('rec');
      await key('left');
      await control('drive');
      await until(SEEN, (s) => s.card.includes(ask), 3000);
      await tap(cell(end.x, end.y), 'the right tile');
      const h1 = await until(SEEN, (s) => !!s.tick, 1500);
      check(`AC4 ${tag}: a right tap says "${w(lang, 'ig3PredictRight')}" on the islander’s card with the tick on ${end.x},${end.y}, the flag gone`, h1.card.includes(w(lang, 'ig3PredictRight')) && h1.tick === `${end.x},${end.y}` && !h1.flag, { card: h1.card, tick: h1.tick, flag: h1.flag });
      if (shots) await shot(`ig003-${tag}-07-hit`);
      const played = await until(SEEN, (s) => s.locked || (!!s.engine && s.engine.x === S.x && !s.pad), 3000);
      await runOver();
      await wait(600);
      const h2 = await seen();
      check(`AC4 ${tag}: … then it plays: from the start to ${end.x},${end.y}, the tick and the line still there`, (played.locked || !played.pad) && at(h2) === both(end.x, end.y) && h2.tick === `${end.x},${end.y}` && h2.card.includes(w(lang, 'ig3PredictRight')), { played: at(played), end: at(h2), tick: h2.tick });
      if (shots) await shot(`ig003-${tag}-08-hit-played`);
      // One step cancels it for that run: a changed program asks, One step, and a tap is no guess any more.
      await control('rec');
      await key('right');
      await until(SEEN, (s) => s.card.includes(ask), 3000);
      await control('step');
      await wait(700);
      const o1 = await seen();
      await tap(cell(wrong.x, wrong.y), 'a tile after One step');
      await wait(900);
      const o2 = await seen();
      check(`AC4 ${tag}: One step cancels the challenge for that run (the islander’s line again; a tap flags nothing, ticks nothing)`, !o1.card.includes(ask) && o1.card.includes(ownLine.slice(0, 20)) && !o2.flag && !o2.tick, { card: o1.card, flag: o2.flag, tick: o2.tick });
      await control('reset');
      await wait(700);
      // Band 7–9: nothing shows, however the program stands.
      await seg('7–9');
      await wait(700);
      await control('rec');
      for (const op of ['left', 'left', 'fwd']) await key(op);
      await control('drive');
      await wait(900);
      const y1 = await seen();
      await tap(cell(wrong.x, wrong.y), 'a tile at band 7–9');
      await wait(900);
      const y2 = await seen();
      check(`AC4 ${tag}: at band 7–9 the challenge never shows (the islander’s line; a tap flags nothing)`, y1.blocks === 3 && !y1.card.includes(ask) && !y2.flag && !y2.tick, { blocks: y1.blocks, card: y1.card, flag: y2.flag });
      if (shots) await shot(`ig003-${tag}-09-band1`);
      await seg('10–12');
      await wait(600);
      const fin = await seen();
      check(`AC6 ${tag}: nothing wider than the screen; 0 console errors so far`, fin.sx <= fin.vw && page.consoleErrors.length === 0, { sx: fin.sx, vw: fin.vw, errors: page.consoleErrors.slice(0, 5) });
    }
  }
  check('AC6: 0 console errors through the whole drive', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
  check('AC6: 0 network errors through the whole drive', page.networkErrors.length === 0, page.networkErrors.slice(0, 5));
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
