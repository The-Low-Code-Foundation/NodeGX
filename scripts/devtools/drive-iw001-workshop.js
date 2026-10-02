#!/usr/bin/env node
/**
 * P108 IW-001 (session 1, lane A) — the Workshop fixes, driven on the DEPLOYED template (the deploy `drive-pages.sh`
 * makes: `drive-cg003-pages.js assemble` + `nodegx deploy`).
 *
 * Every press is a CDP mouse event at an element's centre after `elementFromPoint` says it is what a finger would hit.
 * A stub Olive answers `/__garden/*` inside Chrome (as the page drive's), scripted per rung and able to hold one rung's
 * reply (so a drive can watch "Olive is thinking"). Words, hints, requests and the run cap are read from the deployed
 * project's own tables and scripts at run time, never typed here.
 *
 * Clauses (IW-001 §3):
 *   AC1  F1 — free play: Teach three steps to a tile with nothing ahead in any direction, then repeat 9 { until
 *        wall_ahead { left } } built from the drawer; Play: Stop shows in Play's place; Stop: the robot stops within one
 *        tick, the bar is idle again (Play back, Stop gone, Drive/Teach/One step/Start over enabled); Start over works.
 *        The trap (IW-001 §5): Stop while "Olive is thinking" (Mamie's note, the read held) clears the tag, and her late
 *        answer moves nothing.
 *   AC2  F2 — a run with no end reaches the cap and stops by itself with the loop line (EN, then FR). The cap is the
 *        engine's MAX_TICKS (read from the deployed Run cap): at 420 ms a tick a real 2000-tick run is fourteen minutes,
 *        so the drive plays the run and then moves its tick counter (gardenRun.tick) to a few ticks short of the cap —
 *        a seam it names; the ticks that follow, the stop, the bar and the line are the page's own. The AC's own program
 *        (AC1's) ENDS by the until guard at 742 ticks (cg003Template "F2, measured"): the cap is for a run with no end.
 *   AC3  F3 — a fresh profile's first tap on `fill` (the tulips) places it AND opens its card; Got it closes the card
 *        and the block stays.
 *   AC4  F4/F5 — the drawer's blocks carry a ? each, the placed ones none; a tap on a placed forward leaves the program
 *        unchanged (it selects it: the ring), and its cross still removes it.
 *   AC5  F6 — the drawer and the program are two boxes; with the Workshop scrolled to the top of the screen, 12 blocks at
 *        1024 × 768 and 20 at 1368 × 900 are all inside the program box and on screen with no scroll inside the box.
 *        Screenshots at both sizes; at 390 × 844 the drawer sits over the program box.
 *   AC6  F7 — letter-say (Pocket, lent through the store as a lend writes it) has pick, put and say on the pad; mamie-note
 *        has read; say says Sami's thank-you (Drive) and records say with it (Teach); pick takes the letter and put puts
 *        it back; read asks Olive once and her answer is over the robot.
 *   AC7  F8 — a card seen survives a reload (no card on the second first-tap), is in her saved profile, and a sibling
 *        still sees it.
 *   AC8  0 console errors, 0 network errors.
 *
 * Usage: node scripts/devtools/drive-iw001-workshop.js <deploy-dir> --project <project-dir> [--shots <dir>] [--json <file>]
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
  console.error('usage: drive-iw001-workshop.js <deploy-dir> --project <project-dir> [--shots <dir>] [--json <file>]');
  process.exit(2);
}
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

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
const titleOf = (lang, id) => w(lang, (REQUESTS.find((r) => r.id === id) || { copyKeys: {} }).copyKeys.title);
/** The cap the page's Runner applies: the deployed Run cap's own constant. */
const MAX_TICKS = (() => {
  const fn = nodesOfComponent('Logic/Run cap').find((n) => n.parameters && n.parameters.functionScript);
  const m = fn && /var MAX = (\d+);/.exec(fn.parameters.functionScript);
  return m ? Number(m[1]) : NaN;
})();

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const readings = {};
const check = (name, ok, saw) => {
  results.push({ name, ok: !!ok, saw });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${typeof saw === 'string' ? saw : JSON.stringify(saw)}`}`);
};

const STUB = {
  status: { model: 'ready', reason: '', gpu: false, loadMs: 1, lastMs: 1, asked: 0, fallbacks: 0, busy: false, queued: 0, exam: { at: '2026-09-28T00:00:00.000Z', ms: 1, passed: 20, failed: 0, rungs: {} } },
  plan: { delayMs: 0, delayRung: '' },
  shaped: { read: 1, 'is-it-a': 1 },
  olive: (body) => {
    if (body && body.rung === 'read') return { ok: true, value: body.lang === 'fr' ? 'tulipe rouge' : 'red tulip', ms: 5 };
    return { ok: true, text: body && body.lang === 'fr' ? 'Merci ! (stub)' : 'Thank you! (stub)', ms: 5 };
  }
};

withDeployedSite({ dir: DIR }, async (page) => {
  const { client } = page;
  const evaluate = (expr) => page.evaluate(expr);
  const stubCalls = [];
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
      stubCalls.push({ url: request.url, body, at: Date.now() });
      const fulfil = () => client.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: 'application/json' }], body: Buffer.from(JSON.stringify(answer)).toString('base64') });
      if (STUB.plan.delayMs > 0 && body && body.rung === STUB.plan.delayRung) setTimeout(fulfil, STUB.plan.delayMs);
      else fulfil();
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
  const CARD = `(() => { const e = document.querySelector('.bg-card-help'); if (!e || e.offsetParent === null) return { up: false }; const t = (s) => { const x = e.querySelector(s); return x ? x.innerText.trim() : ''; }; return { up: true, title: t('.bg-card-title') }; })()`;
  const PROG = `[...document.querySelectorAll('.bg-blocks-box .gd-prog .gd-blk[data-id]')].map((b) => b.getAttribute('data-t') + '#' + b.getAttribute('data-id')).join(',')`;
  const blocks = () => evaluate(`document.querySelectorAll('.bg-blocks-box .gd-prog .gd-blk[data-id]').length`);
  /**
   * P108 IW-004: the program is Blockly (garden-kit.Blocks). A drawer block is tapped on its word (a C-block's middle is
   * its empty mouth) after the drawer is scrolled to it (the node's reveal, as a finger scrolls it); a block is thrown
   * away by dragging it back onto the drawer; a placed block is tapped on its word; a slot opens the node's picker.
   */
  const BK = `document.querySelector('.bg-blocks-box .gd-bk')`;
  const reveal = (id) => evaluate(`(() => { const r = ${BK}; return !!r && !!r.__gardenBlocks && r.__gardenBlocks.reveal(${JSON.stringify(id)}); })()`);
  const palPress = async (id, label) => {
    await reveal(id);
    await wait(150);
    return tap(first(`.bg-blocks-box .gd-palette [data-pal-head="${id}"]`), label || `palette ${id}`);
  };
  const dragToDrawer = async (finder, label) => {
    const p = await where(finder);
    const d = await where(`document.querySelector('.bg-blocks-box .gd-palette')`, false);
    if (!p.found || !p.hit || !d.found) {
      check(`drag ${label} to the drawer`, false, { p, d });
      return false;
    }
    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', buttons: 1, clickCount: 1 });
    for (let i = 1; i <= 12; i++) {
      await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x + ((d.x - p.x) * i) / 12, y: p.y + ((d.y - p.y) * i) / 12, button: 'left', buttons: 1 });
      await wait(25);
    }
    await wait(120);
    await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: d.x, y: d.y, button: 'left', buttons: 0, clickCount: 1 });
    await wait(400);
    return true;
  };
  const palTap = async (id) => {
    await palPress(id);
    await wait(200);
    if (await evaluate(CARD_UP)) {
      await tap(first('.bg-card-help .bg-card-ok'), `Got it (${id})`);
      await until(CARD_UP, (v) => v === false, 2000);
    }
  };
  /** What the Workshop shows, read off the page in one go. */
  const SEEN = `(() => {
    const vis = (e) => !!e && e.offsetParent !== null;
    const W = window.Noodl && Noodl.Variables && Noodl.Variables.gardenWorld;
    const R = window.Noodl && Noodl.Variables && Noodl.Variables.gardenRun;
    const r0 = W && W.robots && W.robots[0];
    const btns = [...document.querySelectorAll('.bg-controls .bg-btn')];
    return {
      bar: btns.filter(vis).map((b) => ((b.className.match(/bg-i-(\\w+)/) || [])[1] || '?')),
      disabled: btns.filter(vis).filter((b) => b.disabled || b.getAttribute('aria-disabled') === 'true' || b.hasAttribute('disabled')).map((b) => ((b.className.match(/bg-i-(\\w+)/) || [])[1] || '?')),
      engine: r0 ? { x: r0.x, y: r0.y, d: r0.d, carry: (r0.carry || []).slice() } : null,
      things: W && W.things ? W.things.map((t) => t.kind + '@' + t.x + ',' + t.y) : [],
      tick: R ? Number(R.tick) || 0 : null,
      runDone: R ? !!R.done : null,
      owl: ((document.querySelector('.bg-owl-say') || {}).innerText || '').trim(),
      thinking: vis(document.querySelector('.bg-owl-thinking')),
      locked: !!document.querySelector('.bg-blocks-box .gd-locked'),
      bubble: [...document.querySelectorAll('.bg-stage .gd-bubble')].map((e) => (e.classList.contains('gd-olive') ? 'olive:' : '') + e.innerText.trim()).join(' | ')
    };
  })()`;
  const seen = () => evaluate(SEEN);
  /** A press whose "before" is read in the same breath as the press (no settle between them): the state at the press. */
  const pressNow = async (finder, label) => {
    const p = await where(finder);
    if (!p.found || !p.hit) {
      check(`tap ${label}`, false, p);
      return null;
    }
    await wait(150);
    const at = await evaluate(`(() => { const el = (${finder}); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: ${SEEN} }; })()`);
    for (const type of ['mousePressed', 'mouseReleased']) await client.send('Input.dispatchMouseEvent', { type, x: at.x, y: at.y, button: 'left', clickCount: 1 });
    return at.s;
  };
  const storedProfiles = () => evaluate(`(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); if (!k) return null; const v = JSON.parse(localStorage.getItem(k)); const m = v.model || v; return { active: m.island && m.island.activeId, profiles: (m.profiles || []).map((p) => ({ id: p.id, name: p.name, cardsSeen: p.cardsSeen || null })) }; })()`);
  const lend = (kind) => evaluate(`(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); const v = JSON.parse(localStorage.getItem(k)); const m = v.model || v; const a = m.profiles.find((p) => p.id === m.island.activeId); a.island.robots = a.island.robots || [{ id: 'r1' }]; if (!a.island.robots.some((r) => (r.kind || r.id) === ${JSON.stringify(kind)})) a.island.robots.push({ id: ${JSON.stringify(kind)}, kind: ${JSON.stringify(kind)} }); localStorage.setItem(k, JSON.stringify(v)); })()`);

  const freshFamily = async () => {
    const origin = await evaluate('location.origin');
    await client.send('Storage.clearDataForOrigin', { origin, storageTypes: 'local_storage,indexeddb,cache_storage,service_workers' });
    await page.navigate('/');
    await wait(900);
  };
  const newPlayer = async (name, lang = 'en') => {
    await tap(first('button.bg-profile-new'), `new player ${name}`);
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
    await tap(byText('.bg-quest', id === 'free' ? w(lang, 'sandP').slice(0, 10) : titleOf(lang, id)), `open ${id}`);
    await until('location.pathname', (p) => p === '/workshop');
    await until(`!!document.querySelector('.bg-blocks-box .gd-palette [data-pal="fwd"]')`, Boolean, 6000);
    await wait(900);
  };
  const runOver = () => until(`!document.querySelector('.bg-blocks-box .gd-locked')`, Boolean, 15000);
  const barIdle = (s) => JSON.stringify(s.bar) === JSON.stringify(['drive', 'rec', 'play', 'step', 'reset']) && s.disabled.length === 0;

  /** AC1's program: three steps (Teach, the pad) to a tile with nothing ahead in any direction, then the loop, from the drawer. */
  const buildSpinner = async (reps = 9) => {
    await control('rec');
    for (let k = 0; k < 3; k++) await key('fwd');
    await palTap('repeat');
    const rep = await evaluate(`(() => { const r = [...document.querySelectorAll('.bg-blocks-box .gd-prog .gd-rep[data-t="repeat"]')].pop(); return r ? r.getAttribute('data-rep') : ''; })()`);
    // IW-004: the count is the repeat's slot — a tap opens the picker, a tap on the number sets it (no − / + any more).
    await tap(first(`.bg-blocks-box .gd-rep[data-rep="${rep}"] .gd-slot[data-slot="n"]`), 'repeat: its count');
    await tap(first(`.bg-blocks-box .gd-picker .gd-opt[data-opt="${reps}"]`), `repeat: ${reps}`);
    await palTap('until');
    const un = await evaluate(`(() => { const r = [...document.querySelectorAll('.bg-blocks-box .gd-rep[data-rep="${rep}"] .gd-rep')].pop(); return r ? r.getAttribute('data-rep') : ''; })()`);
    await tap(first(`.bg-blocks-box .gd-rep[data-rep="${un}"] .gd-slot[data-slot="sensor"]`), 'until: its sensor');
    await tap(first('.bg-blocks-box .gd-picker .gd-opt[data-opt="wall_ahead"]'), 'until: the wall is ahead');
    await palTap('left');
    const prog = await evaluate(`JSON.parse(typeof Noodl.Variables.gardenProgram === 'string' ? Noodl.Variables.gardenProgram : JSON.stringify(Noodl.Variables.gardenProgram))`);
    return prog;
  };
  const shape = (list) => (Array.isArray(list) ? list : []).map((b) => b.t + (b.n ? ' ' + b.n : '') + (b.slots && b.slots.sensor ? ' ' + b.slots.sensor : '') + (b.body ? ' { ' + shape(b.body) + ' }' : '')).join(', ');

  await page.setViewport({ width: 1368, height: 912, mobile: false });
  await freshFamily();
  await newPlayer('Ada');
  check(`setup: the deployed Run cap carries the engine's MAX_TICKS (${MAX_TICKS})`, Number.isFinite(MAX_TICKS) && MAX_TICKS >= 100, MAX_TICKS);

  // ── AC3 (F3) first, on the fresh profile: the tulips' first tap on fill places it AND opens its card ──
  await openQuest('en', 'tulips-three');
  const n0 = await blocks();
  await palPress('fill', 'fill (first tap)');
  const card = await until(CARD, (c) => c.up, 2500);
  const n1 = await blocks();
  check(`AC3: a fresh profile's first tap on "fill" places it (${n0} → ${n1} blocks) AND opens its card ("${w('en', 'bFill')}")`, card.up && card.title === w('en', 'bFill') && n1 === n0 + 1 && (await evaluate(PROG)).startsWith('fill#'), { card, n0, n1, prog: await evaluate(PROG) });
  await shot('iw001-ac3-card');
  await tap(first('.bg-card-help .bg-card-ok'), 'Got it');
  const closed = await until(CARD, (c) => !c.up, 2000);
  check('AC3: "Got it" closes the card; the block stays', !closed.up && (await blocks()) === n1 && (await evaluate(PROG)).startsWith('fill#'), { closed, prog: await evaluate(PROG) });

  // ── AC4 (F4/F5): the ? on the drawer, none placed; a tap on a placed forward changes nothing ──
  await palTap('fwd');
  await palTap('fwd');
  const q = await evaluate(`({ drawer: document.querySelectorAll('.bg-blocks-box .gd-palette .gd-pal-item').length, drawerHelps: document.querySelectorAll('.bg-blocks-box .gd-palette .gd-pal-item .gd-help').length, placedHelps: document.querySelectorAll('.bg-blocks-box .gd-prog .gd-help').length, placed: document.querySelectorAll('.bg-blocks-box .gd-prog .gd-blk[data-id]').length })`);
  check(`AC4 (F4): every drawer block carries a ? (${q.drawerHelps} of ${q.drawer}); none of the ${q.placed} placed blocks does`, q.drawer > 0 && q.drawerHelps === q.drawer && q.placedHelps === 0 && q.placed === 3, q);
  const before = await evaluate(PROG);
  const fwd1 = await evaluate(`document.querySelector('.bg-blocks-box .gd-prog .gd-blk[data-t="fwd"]').getAttribute('data-id')`);
  await tap(`document.querySelector('.bg-blocks-box .gd-prog [data-head="${fwd1}"]')`, 'a placed forward (its word)');
  await wait(500);
  const after = await evaluate(PROG);
  const sel = await evaluate(`(document.querySelector('.bg-blocks-box .gd-prog .gd-blk[data-id="${fwd1}"]') || { getAttribute: () => null }).getAttribute('data-sel')`);
  check('AC4 (F5): a tap on a placed forward leaves the program unchanged (it selects it: the ring)', after === before && sel === '1', { before, after, sel });
  await shot('iw001-ac4-selected');
  // IW-004: the kit has no cross — a block goes back to the drawer to be thrown away (Blockly drags the blocks under it
  // too, as Scratch does, so the LAST forward goes).
  await dragToDrawer(`(() => { const b = [...document.querySelectorAll('.bg-blocks-box .gd-prog .gd-blk[data-t="fwd"]')].pop(); return b && b.querySelector('[data-head="' + b.getAttribute('data-id') + '"]'); })()`, 'the last forward');
  await wait(400);
  check('AC4 (F5, IW-004): dragged back to the drawer, it is taken away', (await blocks()) === 2 && (await evaluate(PROG)).split(',').length === 2, await evaluate(PROG));

  // ── AC1 (F1): Stop ──
  await openQuest('en', 'free');
  const spin = await buildSpinner(9);
  check(`AC1: the program is built through the kit — ${shape(spin)}`, shape(spin) === 'fwd, fwd, fwd, repeat 9 { until wall_ahead { left } }', shape(spin));
  const s0 = await seen();
  check('AC1: taught to a tile with nothing ahead in any direction (3,3)', !!s0.engine && s0.engine.x === 3 && s0.engine.y === 3, s0.engine);
  await control('play');
  const playing = await until(SEEN, (s) => s.bar.includes('stop') && !!s.engine && s.engine.x === 3 && (s.tick || 0) > 8, 9000);
  check('AC1: while the run plays, Stop is on the bar in Play’s place (Play hidden)', playing.bar.includes('stop') && !playing.bar.includes('play') && playing.bar.indexOf('stop') === 2, playing.bar);
  await shot('iw001-ac1-playing');
  const atPress = await pressNow(first('.bg-controls .bg-i-stop'), 'Stop');
  const justAfter = await seen();
  await wait(1500);
  const settled = await seen();
  await wait(1300);
  const later = await seen();
  const turned = (a, b) => (a && b ? (b.d - a.d + 4) % 4 : -1);
  readings.ac1 = { atPress, justAfter, settled, later };
  check(`AC1: Stop — the robot stops within one tick (turns after the press: ${turned(atPress.engine, settled.engine)} of at most one; none in the next 1.3 s)`, turned(atPress.engine, settled.engine) >= 0 && [0, 3].includes(turned(atPress.engine, settled.engine)) && JSON.stringify(settled.engine) === JSON.stringify(later.engine), { atPress: atPress.engine, settled: settled.engine, later: later.engine });
  check('AC1: the bar is idle again — Drive · Teach · Play · One step · Start over, none disabled, no Stop', barIdle(settled) && !settled.locked, { bar: settled.bar, disabled: settled.disabled, locked: settled.locked });
  await shot('iw001-ac1-stopped');
  await control('reset');
  const reset = await until(SEEN, (s) => !!s.engine && s.engine.x === 0 && s.engine.y === 3, 3000);
  check('AC1: Start over works after Stop (the robot back at 0,3 facing east, the bar idle)', !!reset.engine && reset.engine.x === 0 && reset.engine.y === 3 && reset.engine.d === 1 && barIdle(reset), { engine: reset.engine, bar: reset.bar });

  // The trap: Stop while Olive is thinking (Mamie's note, the read held 4 s) clears the tag; her late answer moves nothing.
  await openQuest('en', 'mamie-note');
  await palTap('olive:read');
  await palTap('fwd');
  STUB.plan.delayMs = 4000;
  STUB.plan.delayRung = 'read';
  const asked0 = stubCalls.filter((c) => c.body && c.body.rung === 'read').length;
  await control('play');
  const thinking = await until(SEEN, (s) => s.thinking, 4000);
  check('AC1 trap: "Olive is thinking" while the read is out (the stub holds it)', thinking.thinking && thinking.bar.includes('stop'), { thinking: thinking.thinking, bar: thinking.bar });
  await control('stop');
  const t1 = await until(SEEN, (s) => !s.thinking, 1500);
  check('AC1 trap: Stop clears "Olive is thinking" at once, and the bar is idle', !t1.thinking && barIdle(t1), { thinking: t1.thinking, bar: t1.bar });
  await wait(4500);
  const t2 = await seen();
  check('AC1 trap: her late answer moves nothing (the robot where Stop left it, no tag, no run)', !t2.thinking && JSON.stringify(t2.engine) === JSON.stringify(t1.engine) && barIdle(t2) && stubCalls.filter((c) => c.body && c.body.rung === 'read').length === asked0 + 1, { t1: t1.engine, t2: t2.engine, bar: t2.bar, asks: stubCalls.filter((c) => c.body && c.body.rung === 'read').length - asked0 });
  STUB.plan.delayMs = 0;

  // ── AC2 (F2): the cap — EN, then FR ──
  for (const lang of ['en', 'fr']) {
    if (lang === 'fr') {
      await seg('FR');
      await wait(700);
    }
    await openQuest(lang, 'free');
    await buildSpinner(9);
    await control('play');
    await until(SEEN, (s) => s.bar.includes('stop') && (s.tick || 0) > 5, 9000);
    const jump = MAX_TICKS - 4;
    await evaluate(`(() => { const r = JSON.parse(JSON.stringify(Noodl.Variables.gardenRun)); r.tick = ${jump}; Noodl.Variables.gardenRun = r; })()`);
    const capped = await until(SEEN, (s) => !s.bar.includes('stop') && (s.tick || 0) >= MAX_TICKS, 9000);
    const line = hint(lang, 'iw1Loop');
    const owl = await until(`((document.querySelector('.bg-owl-say') || {}).innerText || '').trim()`, (t) => t === line, 4000);
    await wait(1300);
    const still = await seen();
    readings[`ac2-${lang}`] = { capped, still, owl };
    check(`AC2 ${lang}: the run reaches the cap (${MAX_TICKS} ticks) and stops by itself — the bar idle, the run kept at tick ${capped.tick}`, capped.tick >= MAX_TICKS && capped.tick <= MAX_TICKS + 1 && barIdle(capped) && !capped.runDone && still.tick === capped.tick && JSON.stringify(still.engine) === JSON.stringify(capped.engine), { tick: capped.tick, bar: capped.bar, still: still.tick });
    check(`AC2 ${lang}: Olive says "${line}"`, owl === line && line.includes('Pip'), { owl, line });
    await shot(`iw001-ac2-cap-${lang}`);
    await control('reset');
  }
  await seg('EN');
  await wait(700);

  // ── AC5 (F6): the program box ──
  const SEQ = ['fwd', 'left', 'fwd', 'fwd', 'right', 'water', 'fwd', 'left', 'left', 'fwd', 'right', 'fill', 'fwd', 'fwd', 'fwd', 'right', 'water', 'left', 'fwd', 'right'];
  for (const vp of [{ name: '1024', width: 1024, height: 768, n: 12 }, { name: '1368x900', width: 1368, height: 900, n: 20 }]) {
    await page.setViewport({ width: vp.width, height: vp.height, mobile: false });
    await openQuest('en', 'free');
    await control('rec');
    // IW-004: the drawer stops at the robot's brain (12 blocks); Teach records past it (the fold makes the room back), so
    // the long program is taught with the pad, as a child teaches it.
    for (let i = 0; i < vp.n; i++) await key(SEQ[i % SEQ.length]);
    await evaluate(`window.scrollTo(0, document.querySelector('.bg-ws').getBoundingClientRect().top + scrollY - 12)`);
    await wait(600);
    // IW-004: the program box is Blockly's workspace, the drawer inside it on its left. Every block's box must be inside
    // the workspace (right of the drawer) and on the screen, the page no wider than the screen.
    const MEASURE = `(() => { const R = (e) => { const r = e.getBoundingClientRect(); return { t: Math.round(r.top), b: Math.round(r.bottom), l: Math.round(r.left), r: Math.round(r.right) }; };
      const root = document.querySelector('.bg-blocks-box .gd-bk'), pal = root.querySelector('.gd-palette');
      const blks = [...root.querySelectorAll('.gd-prog .gd-blk[data-id]')]; const rr = root.getBoundingClientRect(), fr = pal.getBoundingClientRect();
      return { n: blks.length, prog: { t: Math.round(rr.top), b: Math.round(rr.bottom), l: Math.round(fr.right), r: Math.round(rr.right) }, pal: R(pal), vh: innerHeight, sx: document.scrollingElement.scrollWidth, vw: innerWidth,
        allIn: blks.every((b) => { const r = b.getBoundingClientRect(); return r.top >= Math.max(0, rr.top) - 1 && r.bottom <= Math.min(innerHeight, rr.bottom) + 1 && r.left >= fr.right - 1 && r.right <= rr.right + 1; }),
        steps: R(document.querySelector('.bg-steps')), world: R(document.querySelector('.bg-stage .gd-world')), bar: R(document.querySelector('.bg-controls')) }; })()`;
    let m = await evaluate(MEASURE);
    let fit = false;
    if (!m.allIn) {
      // A long program: the child presses ⤢ (the workspace's own "see all the steps"), as the mockup's.
      await tap(first('.bg-blocks-box .gd-bk-zoom [data-zoom="fit"]'), 'see all the steps (⤢)');
      await wait(700);
      m = await evaluate(MEASURE);
      fit = true;
    }
    readings[`ac5-${vp.name}`] = { ...m, fit };
    check(`AC5 ${vp.width}×${vp.height} (IW-004): the drawer and the program side by side in one workspace (drawer ${m.pal.l}–${m.pal.r}, program ${m.prog.l}–${m.prog.r})`, m.pal.r <= m.prog.l + 1 && m.prog.l < m.prog.r, { pal: m.pal, prog: m.prog });
    // IW-004: every block's box inside the workspace AND inside the screen (allIn); the workspace itself may run past the
    // fold (it is as tall as the world's column beside it) — the blocks are what must be seen.
    check(`AC5 ${vp.width}×${vp.height} (IW-004): ${vp.n} blocks all visible in the workspace${fit ? ' after ⤢' : ''}, and on screen with the Workshop at the top (the workspace ${m.prog.t}–${m.prog.b}, the screen 0–${m.vh})`, m.n === vp.n && m.allIn && m.prog.t >= 0 && m.sx <= m.vw, m);
    await shot(`iw001-ac5-${vp.name}`);
  }
  await page.setViewport({ width: 390, height: 844, mobile: true });
  await openQuest('en', 'free');
  const phone = await evaluate(`(() => { const R = (e) => { const r = e.getBoundingClientRect(); return { t: Math.round(r.top), b: Math.round(r.bottom), l: Math.round(r.left), r: Math.round(r.right) }; }; const root = document.querySelector('.bg-blocks-box .gd-bk'); return { pal: R(root.querySelector('.gd-palette')), prog: R(root), sx: document.scrollingElement.scrollWidth, vw: innerWidth }; })()`);
  check('AC5 390×844 (IW-004): the drawer is a strip along the workspace’s foot (the program keeps the width), nothing wider than the phone', phone.pal.b >= phone.prog.b - 1 && phone.pal.t > phone.prog.t && phone.pal.r - phone.pal.l >= phone.prog.r - phone.prog.l - 4 && phone.sx <= phone.vw, phone);
  await evaluate(`document.querySelector('.bg-blocks-box').scrollIntoView({ block: 'start' })`);
  await wait(400);
  await shot('iw001-ac5-390');
  await page.setViewport({ width: 1368, height: 912, mobile: false });

  // ── AC6 (F7): the pad is the drawer's actions ──
  await lend('pocket');
  await page.navigate('/island');
  await wait(1100);
  await openQuest('en', 'letter-say');
  const padOf = () => evaluate(`[...document.querySelectorAll('.bg-pad .bg-key')].filter((e) => e.offsetParent !== null).map((e) => ((e.className.match(/bg-key-([a-z-]+)/) || [])[1] || '?'))`);
  const drawerActs = await evaluate(`[...document.querySelectorAll('.bg-blocks-box .gd-palette [data-pal]')].map((e) => e.getAttribute('data-pal')).filter((id) => ['water', 'fill', 'pick', 'put', 'say', 'olive:read'].includes(id))`);
  const lp = await padOf();
  check(`AC6: letter-say's pad has pick, put and say — every action in its drawer (${drawerActs.join(' ')})`, JSON.stringify(lp) === JSON.stringify(['fwd', 'left', 'right', 'pick', 'put', 'say']) && JSON.stringify(lp.slice(3)) === JSON.stringify(drawerActs), { pad: lp, drawer: drawerActs });
  await shot('iw001-ac6-letter-pad');
  // Drive: say says Sami's thank-you over the robot; pick takes the letter ahead; put puts it back.
  const sami = w('en', 'thanksSami', 'Pocket');
  await key('say');
  const said = await until(SEEN, (s) => s.bubble.includes(sami), 2500);
  check(`AC6: the say key says "${sami}" over the robot (Drive: nothing recorded)`, said.bubble.includes(sami) && (await blocks()) === 0, { bubble: said.bubble, blocks: await blocks() });
  await shot('iw001-ac6-say');
  // P108 IW-003 (lane P): the letter waits in the post box now (1,4), south of the path: a step and a turn to face it.
  await key('fwd');
  await key('right');
  await key('pick');
  const picked = await until(SEEN, (s) => !!s.engine && s.engine.carry.includes('letter'), 2500);
  check('AC6: the pick key takes the letter from the post box ahead (on the robot, out of the box)', picked.engine.carry.includes('letter') && !picked.things.includes('letter@1,4'), { carry: picked.engine.carry, things: picked.things });
  // The post box blocks: turn to the free path tile ahead and put it down there.
  await key('left');
  await key('put');
  const put = await until(SEEN, (s) => !!s.engine && !s.engine.carry.includes('letter'), 2500);
  check('AC6: the put key puts it down on the tile ahead', !put.engine.carry.includes('letter') && put.things.includes('letter@2,3'), { carry: put.engine.carry, things: put.things });
  // Teach: say is recorded as a say block with Sami's thank-you.
  await control('rec');
  await key('say');
  await wait(600);
  const sayBlk = await evaluate(`(() => { const p = Noodl.Variables.gardenProgram; const l = typeof p === 'string' ? JSON.parse(p || '[]') : p; return l[l.length - 1]; })()`);
  check('AC6: in Teach the say key records say with Sami’s thank-you', !!sayBlk && sayBlk.t === 'say' && sayBlk.slots && sayBlk.slots.text === 'thanksSami', sayBlk);
  // Mamie's note: the read key. (P108 IW-003, lane M: the note is the day's — the red ones or the yellow ones.)
  await openQuest('en', 'mamie-note');
  const np = await padOf();
  check('AC6: mamie-note’s pad has read (Olive’s, where her drawer has it)', np.includes('olive-read') && (await evaluate(`!!document.querySelector('.bg-blocks-box .gd-palette [data-pal="olive:read"]')`)), np);
  const reads0 = stubCalls.filter((c) => c.body && c.body.rung === 'read').length;
  await key('olive:read');
  const heard = await until(SEEN, (s) => s.bubble.includes(w('en', 'oliveReadSay').replace('{x}', 'red tulip')), 4000);
  const readCalls = stubCalls.filter((c) => c.body && c.body.rung === 'read').slice(reads0);
  check(`AC6: the read key asks Olive once (the note on the plot) and her answer is over the robot ("${w('en', 'oliveReadSay').replace('{x}', 'red tulip')}")`, readCalls.length === 1 && readCalls[0].body.slots && ['The red ones, not the yellow.', 'The yellow ones, not the red.'].includes(readCalls[0].body.slots.note) && heard.bubble.startsWith('olive:') && (await blocks()) === 0, { bubble: heard.bubble, calls: readCalls.map((c) => c.body) });
  await shot('iw001-ac6-read');
  await control('rec');
  await key('olive:read');
  await wait(900);
  check('AC6: in Teach the read key records Olive’s read block', (await evaluate(PROG)).startsWith('olive:read#'), await evaluate(PROG));

  // ── AC7 (F8): the cards seen are saved per profile ──
  await openQuest('en', 'free');
  // count +1: a kind Ada has not tapped in the drawer yet in this drive (the pad's keys never pass the card gate).
  await palPress('count_inc', 'count +1 (Ada, first tap)');
  const rc = await until(CARD, (c) => c.up, 2500);
  await tap(first('.bg-card-help .bg-card-ok'), 'Got it (count +1)');
  await until(CARD_UP, (v) => v === false, 2000);
  await wait(600);
  const saved = await storedProfiles();
  const ada = saved && saved.profiles.find((p) => p.name === 'Ada');
  check('AC7: Got it saves the card on HER profile (the store holds it, with the ones before)', rc.up && rc.title === w('en', 'bCountInc') && !!ada && Array.isArray(ada.cardsSeen) && ada.cardsSeen.includes('count_inc') && ada.cardsSeen.includes('fill'), { rc, ada });
  await page.navigate('/island');
  await wait(1200);
  await openQuest('en', 'free');
  const k0 = await blocks();
  await palPress('count_inc', 'count +1 (Ada, after a reload)');
  await wait(900);
  check('AC7: after a reload the card is still seen — the tap places count +1, no card', !(await evaluate(CARD_UP)) && (await blocks()) === k0 + 1, { card: await evaluate(CARD_UP), blocks: await blocks() });
  // A sibling still sees it.
  await tap(first('.bg-top .bg-who'), 'who is playing');
  await until('location.pathname', (p) => p === '/', 3000);
  await wait(600);
  await newPlayer('Bo');
  await openQuest('en', 'free');
  await palPress('count_inc', 'count +1 (Bo, first tap)');
  const bc = await until(CARD, (c) => c.up, 2500);
  check('AC7: her sibling still sees the card (per profile)', bc.up && bc.title === w('en', 'bCountInc'), bc);
  await shot('iw001-ac7-sibling-card');
  await tap(first('.bg-card-help .bg-card-ok'), 'Got it (Bo)');
  await wait(600);
  const both = await storedProfiles();
  check('AC7: each kid’s cards are her own in the store', !!both && (both.profiles.find((p) => p.name === 'Bo').cardsSeen || []).join() === 'count_inc' && both.profiles.find((p) => p.name === 'Ada').cardsSeen.includes('fill'), both);

  check('AC8: 0 console errors through the whole drive', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
  check('AC8: 0 network errors through the whole drive', page.networkErrors.length === 0, page.networkErrors.slice(0, 5));
  return { dir: DIR, maxTicks: MAX_TICKS, results, readings, consoleErrors: page.consoleErrors.slice(), networkErrors: page.networkErrors.slice() };
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
