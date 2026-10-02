#!/usr/bin/env node
/**
 * P108 IW-004 (session 2, lane B) — real blocks: the Workshop's program on Blockly (garden-kit.Blocks), driven the way a
 * child does it on the DEPLOYED template (the deploy `drive-pages.sh` makes: `drive-cg003-pages.js assemble` +
 * `nodegx deploy`).
 *
 * Every press is a CDP mouse (or, on the phone, touch) event at an element's centre after `elementFromPoint` says it is
 * what a finger would hit; a drag is a press, a walk of small moves, a lift. The program is read from the page's own
 * `gardenProgram` Variable (the engine program the node emits). A stub Olive answers `/__garden/*` inside Chrome.
 *
 * Clauses (IW-004 §3), `--mode 2d` (the default):
 *   AC2  1024 × 768, mouse: a block dragged out of the drawer lands under ▶; a tap on a drawer block adds it at the end;
 *        a repeat dragged in, and a block dropped into its mouth, is in its body; a block dragged back onto the drawer is
 *        gone. The same four on a touch-emulated phone (390 × 844: the drawer is a strip along the workspace's top).
 *   AC3  a thing picked on the 2D world becomes the chip (a tap on the chip arms Picking; a tap on the tulip's tile); the
 *        state list follows the kind (tulip: thirsty / drunk; the tile ahead: wall / clear / has); the band 7–9 drawer has
 *        no value block, the 10–12 drawer has them.
 *   AC5  a 13th block on a 12-block brain is refused, with the line that says why (and the drawer greys).
 *   AC6  Teach records into the workspace — into the selected repeat.
 *   AC7  the ? on a drawer block opens its card and places nothing; no placed block carries a ?.
 *   AC9  EN / FR: the blocks' words and Blockly's own (the menu: Help + Duplicate / Aide + Dupliquer, nothing else);
 *        0 console errors, 0 network errors.
 * `--mode 3d` (swiftshader): AC3 on the 3D world — the chip picked by a tap on the tulip's tile of Garden 3D.
 *
 * Usage: node scripts/devtools/drive-iw004-blocks.js <deploy-dir> --project <project-dir> [--mode 2d|3d] [--shots <dir>] [--json <file>]
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
const MODE = arg('--mode') || '2d';
if (!DIR || DIR.startsWith('--') || !['2d', '3d'].includes(MODE)) {
  console.error('usage: drive-iw004-blocks.js <deploy-dir> --project <project-dir> [--mode 2d|3d] [--shots <dir>] [--json <file>]');
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

// 3D: Chrome with SOFTWARE WebGL (swiftshader), as drive-ig007-workshop.js --mode 3d.
const CHROME = MODE === '3d' ? { gpu: true, chromeArgs: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {};

withDeployedSite({ dir: DIR, ...CHROME }, async (page) => {
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

  /** The program as the page holds it (the engine program Blocks emitted). */
  const PROGRAM = `(() => { const p = Noodl.Variables.gardenProgram; const l = typeof p === 'string' ? JSON.parse(p || '[]') : p; return Array.isArray(l) ? l : []; })()`;
  const program = () => evaluate(PROGRAM);
  const shape = (list) => (Array.isArray(list) ? list : []).map((b) => b.t + (b.n ? ' ' + b.n : '') + (b.slots && b.slots.sensor ? ' ' + b.slots.sensor : '') + (b.slots && b.slots.cond ? ' ?' + JSON.stringify(b.slots.cond) : '') + (b.body ? ' { ' + shape(b.body) + ' }' : '')).join(', ');
  const nbsp = (s) => String(s || '').replace(/ /g, ' ').trim();
  /** A press, a walk of small moves (a finger's drag), a lift — mouse, or touch on the phone. */
  /**
   * The screen point of a placed block's connection: `<id|start>:next` (under it) or `<id>:DO` (its mouth) — the block's
   * live origin plus the connection's offset inside it (a connection's own x/y can be stale after a tap-add moved it).
   */
  const connScreen = (spec) => `(() => { const r = document.querySelector('.bg-blocks-box .gd-bk'); const ws = r.__gardenBlocks.workspace(); const parts = ${JSON.stringify(spec)}.split(':'); const b = parts[0] === 'start' ? ws.getTopBlocks(false).find((x) => x.type === 'garden_start') : ws.getBlockById(parts[0]); if (!b) return null; const c = parts[1] === 'next' ? b.nextConnection : b.getInput(parts[1]).connection; const o = b.getRelativeToSurfaceXY(), off = c.getOffsetInBlock(); const s = Blockly.utils.svgMath.wsToScreenCoordinates(ws, new Blockly.utils.Coordinate(o.x + off.x, o.y + off.y)); return { x: s.x, y: s.y }; })()`;
  /** Where the dragged block is drawn now (its path's top-left: its top connection), mid-drag. */
  const DRAGGED = `(() => { const s = Blockly.getSelected && Blockly.getSelected(); if (!s || !s.previousConnection) return null; const pr = s.getSvgRoot().querySelector(':scope > .blocklyPath').getBoundingClientRect(); return { x: pr.left, y: pr.top }; })()`;
  /**
   * A press, a walk of small moves (a finger's drag), a lift — mouse, or touch on the phone. `to` is an element (its
   * centre), `POINT:<expr>` (a point on the screen), or `CONN:<id>:next|DO` — a connection of a placed block: halfway
   * there the drive reads where the dragged block's own top connection is under the finger, and carries it the rest of
   * the way onto that connection (as a child lines a block up with the gap it wants).
   */
  const dragTo = async (finder, to, label, touch = false) => {
    // The workspace on the screen from its top (on the phone the drawer strip and the program both have to be in view).
    if (touch) {
      await evaluate(`document.querySelector('.bg-blocks-box').scrollIntoView({ block: 'start' })`);
      await wait(300);
    }
    // The source: an element (its centre), or a point expression that says itself whether a finger there hits the block.
    const p = finder.startsWith('POINT:') ? (await evaluate(finder.slice(6))) || { found: false } : await where(finder);
    if (!p.found || !p.hit) {
      check(`drag ${label}`, false, p);
      return false;
    }
    const conn = to.startsWith('CONN:') ? to.slice(5) : null;
    let tgt = conn ? { found: true, ...(await evaluate(connScreen(conn))) } : to.startsWith('POINT:') ? { found: true, ...(await evaluate(to.slice(6))) } : await where(to, false);
    if (!tgt.found || typeof tgt.x !== 'number' || typeof tgt.y !== 'number') {
      check(`drag ${label}: where to`, false, tgt);
      return false;
    }
    const steps = 14;
    const send = (type, x, y) =>
      touch
        ? client.send('Input.dispatchTouchEvent', { type: type === 'down' ? 'touchStart' : type === 'move' ? 'touchMove' : 'touchEnd', touchPoints: type === 'up' ? [] : [{ x, y }] })
        : client.send('Input.dispatchMouseEvent', { type: type === 'down' ? 'mousePressed' : type === 'move' ? 'mouseMoved' : 'mouseReleased', x, y, button: 'left', buttons: type === 'up' ? 0 : 1, clickCount: 1 });
    await send('down', p.x, p.y);
    let at = { x: p.x, y: p.y };
    const walk = async (from, dest, n) => {
      for (let i = 1; i <= n; i++) {
        at = { x: from.x + ((dest.x - from.x) * i) / n, y: from.y + ((dest.y - from.y) * i) / n };
        await send('move', at.x, at.y);
        await wait(30);
      }
    };
    await walk(at, { x: (p.x + tgt.x) / 2, y: (p.y + tgt.y) / 2 }, steps / 2);
    if (conn) {
      // Read both in the same moment, mid-drag: where the gap is now, and where the dragged block's top is under the finger.
      const both = await evaluate(`({ c: ${connScreen(conn)}, d: ${DRAGGED} })`);
      if (both && both.c && both.d) tgt = { found: true, x: both.c.x + (at.x - both.d.x), y: both.c.y + (at.y - both.d.y) };
    }
    await walk(at, tgt, steps / 2);
    await wait(150);
    await send('up', tgt.x, tgt.y);
    await wait(500);
    // A first block of its kind opens its card (IW-001 F3): Got it, as a child does, before the next move.
    if (await evaluate(CARD_UP)) {
      await tap(first('.bg-card-help .bg-card-ok'), `Got it (after ${label})`);
      await until(CARD_UP, (v) => v === false, 2000);
    }
    return true;
  };
  const touchTap = async (finder, label) => {
    const p = await where(finder);
    if (!p.found || !p.hit) {
      check(`touch ${label}`, false, p);
      return false;
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] });
    await wait(60);
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await wait(400);
    return true;
  };
  const drawerHead = (id) => `document.querySelector('.bg-blocks-box .gd-palette [data-pal-head="${id}"]')`;
  /** A drag takes a drawer block by its icon, at its left edge (where its top connection is), as a finger holds it. */
  const drawerGrip = (id) => `POINT:(() => { const b = document.querySelector('.bg-blocks-box .gd-palette [data-pal="${id}"]'); const i = b && b.querySelector('.gd-icon'); if (!i) return { found: false }; const c = i.getBoundingClientRect(); const x = c.left + c.width / 2, y = c.top + c.height / 2; const at = document.elementFromPoint(x, y); return { found: true, x, y, hit: !!at && b.contains(at) }; })()`;
  const headOfId = (id) => `document.querySelector('.bg-blocks-box .gd-prog [data-head="${id}"]')`;
  /** A placed block held by its icon (its left, where a finger takes it; its word can sit past a narrow workspace's edge). */
  const blockGrip = (id) => `POINT:(() => { const b = document.querySelector('.bg-blocks-box .gd-prog .gd-blk[data-id="${id}"]'); const i = b && b.querySelector('.gd-icon'); if (!i) return { found: false }; const c = i.getBoundingClientRect(); const x = c.left + c.width / 2, y = c.top + c.height / 2; const at = document.elementFromPoint(x, y); return { found: true, x, y, hit: !!at && b.contains(at) }; })()`;
  const lastOf = (t) => evaluate(`(() => { const b = [...document.querySelectorAll('.bg-blocks-box .gd-prog .gd-blk[data-t="${t}"]')].pop(); return b ? b.getAttribute('data-id') : ''; })()`);
  const pickerOpts = () => evaluate(`[...document.querySelectorAll('.bg-blocks-box .gd-picker .gd-opt')].map((o) => o.getAttribute('data-opt'))`);
  const closePicker = async () => {
    if ((await pickerOpts()).length) await tap(`document.querySelector('.bg-owl-say') || document.querySelector('.bg-ws-title')`, 'away (the picker closes)');
  };

  await page.setViewport({ width: 1368, height: 912, mobile: false });
  await freshFamily();
  await newPlayer('Ada');

  if (MODE === '3d') {
    // ── AC3 on Garden 3D: the chip picked by a tap on the tulip's tile of the 3D world ──
    const ROOT = `document.querySelector('.bg-stage [data-gd3-world]')`;
    await openQuest('en', 'free');
    const ready = await until(`(() => { const e = ${ROOT}; return e ? e.getAttribute('data-ready') : null; })()`, (v) => v === 'true', 15000);
    const tulip = await evaluate(`(() => { const W = Noodl.Variables.gardenWorld; const t = (W.things || []).find((x) => x.kind === 'tulip'); return t ? { x: t.x, y: t.y } : null; })()`);
    await palTap('until');
    await palTap('is');
    await tap(`document.querySelector('.bg-blocks-box .gd-prog .gd-val[data-v="thing"]')`, 'the chip (pick on the island)');
    const picking = await until(`!!document.querySelector('.bg-blocks-box .gd-bk.gd-picking')`, Boolean, 2000);
    const pt = await evaluate(`(() => { const r = ${ROOT}; const c = r.querySelector('[data-gd3-canvas]').getBoundingClientRect(); const s = r.gd3.screenOfTile(${tulip ? tulip.x : 0}, ${tulip ? tulip.y : 0}); const x = c.left + s.sx, y = c.top + s.sy; const at = document.elementFromPoint(x, y); return { x, y, top: at ? (at.getAttribute('data-gd3-canvas') ? 'canvas' : at.className) : null }; })()`);
    for (const type of ['mousePressed', 'mouseReleased']) await client.send('Input.dispatchMouseEvent', { type, x: Math.round(pt.x), y: Math.round(pt.y), button: 'left', clickCount: 1 });
    const cond = await until(`(() => { const l = ${PROGRAM}; const u = l.find((b) => b.t === 'until'); return u && u.slots && u.slots.cond ? u.slots.cond : null; })()`, (c) => !!c && !!c.thing, 4000);
    await shot('iw004-ac3-3d-picked');
    check(`AC3 (3D): a tap on the chip arms Picking; a tap on the tulip's tile of Garden 3D (${tulip && tulip.x},${tulip && tulip.y}; the canvas on top there) makes it the chip — { kind: tulip, x, y } — and the state list is the tulip's`, ready === 'true' && picking && pt.top === 'canvas' && !!cond && !!cond.thing && cond.thing.kind === 'tulip' && cond.thing.x === tulip.x && cond.thing.y === tulip.y && cond.state === 'thirsty', { ready, picking, pt, cond, tulip });
  } else {
    // ── AC2 at 1024 × 768, by mouse ──
    await page.setViewport({ width: 1024, height: 768, mobile: false });
    await openQuest('en', 'free');
    await evaluate(`window.scrollTo(0, document.querySelector('.bg-blocks-box').getBoundingClientRect().top + scrollY - 8)`);
    await wait(500);
    await dragTo(drawerGrip('fwd'), 'CONN:start:next', 'forward out of the drawer to under ▶');
    const a1 = await program();
    check('AC2 1024 (mouse): a block dragged out of the drawer lands under ▶ — the program is [forward]', shape(a1) === 'fwd', shape(a1));
    await palTap('left');
    const a2 = await program();
    check('AC2 1024 (mouse): a tap on a drawer block adds it at the end — [forward, turn left]', shape(a2) === 'fwd, left', shape(a2));
    await reveal('repeat');
    await wait(200);
    const leftId = await lastOf('left');
    await dragTo(drawerGrip('repeat'), `CONN:${leftId}:next`, 'repeat out of the drawer to under turn left');
    const repId = await lastOf('repeat');
    await reveal('water');
    await wait(200);
    await dragTo(drawerGrip('water'), `CONN:${repId}:DO`, 'water into the repeat’s mouth');
    const a3 = await program();
    check('AC2 1024 (mouse): a repeat dragged in under turn left, and water dropped into its mouth, is its body — [forward, turn left, repeat 3 { water }]', shape(a3) === 'fwd, left, repeat 3 { water }', shape(a3));
    await shot('iw004-ac2-1024-built');
    const waterId = await lastOf('water');
    await dragTo(blockGrip(waterId), `document.querySelector('.bg-blocks-box .gd-palette')`, 'water back onto the drawer');
    const a4 = await program();
    check('AC2 1024 (mouse): the block dragged back onto the drawer is gone — [forward, turn left, repeat 3 { }]', shape(a4) === 'fwd, left, repeat 3 {  }', shape(a4));
    await shot('iw004-ac2-1024-deleted');

    // ── AC2 on a touch-emulated phone (390 × 844) ──
    await page.setViewport({ width: 390, height: 844, mobile: true });
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await openQuest('en', 'free');
    await evaluate(`document.querySelector('.bg-blocks-box').scrollIntoView({ block: 'start' })`);
    await wait(700);
    const strip = await evaluate(`(() => { const r = document.querySelector('.bg-blocks-box .gd-bk'); const p = r.querySelector('.gd-palette').getBoundingClientRect(), b = r.getBoundingClientRect(); return { narrow: !!r.__gardenBlocks && r.__gardenBlocks.narrow, pal: [Math.round(p.left), Math.round(p.top), Math.round(p.width), Math.round(p.height)], root: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)], sx: document.scrollingElement.scrollWidth, vw: innerWidth }; })()`);
    check('AC2 390 (touch): on the phone the drawer is a strip along the workspace’s foot (the program keeps the width), nothing wider than the phone', strip.narrow && strip.pal[2] >= strip.root[2] - 4 && strip.pal[3] < strip.root[3] / 2 && strip.pal[1] > strip.root[1] + strip.root[3] / 2 && strip.sx <= strip.vw, strip);
    await touchTap(drawerHead('fwd'), 'forward (a finger’s tap on the drawer)');
    if (await evaluate(CARD_UP)) await tap(first('.bg-card-help .bg-card-ok'), 'Got it (forward)');
    const t1 = await program();
    check('AC2 390 (touch): a finger’s tap on a drawer block adds it — [forward]', shape(t1) === 'fwd', shape(t1));
    await reveal('repeat');
    await wait(200);
    const f1 = await lastOf('fwd');
    await dragTo(drawerGrip('repeat'), `CONN:${f1}:next`, 'repeat by touch to under forward', true);
    const t2 = await program();
    check('AC2 390 (touch): a repeat dragged by a finger out of the drawer lands under forward — [forward, repeat 3 { }]', shape(t2) === 'fwd, repeat 3 {  }', shape(t2));
    const rep2 = await lastOf('repeat');
    await reveal('left');
    await wait(200);
    await dragTo(drawerGrip('left'), `CONN:${rep2}:DO`, 'turn left by touch into the repeat', true);
    const t3 = await program();
    check('AC2 390 (touch): turn left dropped by a finger into the repeat’s mouth is its body — [forward, repeat 3 { turn left }]', shape(t3) === 'fwd, repeat 3 { left }', shape(t3));
    await shot('iw004-ac2-390-touch-built');
    const l2 = await lastOf('left');
    await dragTo(blockGrip(l2), `document.querySelector('.bg-blocks-box .gd-palette')`, 'turn left by touch back onto the drawer', true);
    const t4 = await program();
    check('AC2 390 (touch): a block dragged by a finger back onto the drawer is gone — [forward, repeat 3 { }]', shape(t4) === 'fwd, repeat 3 {  }', shape(t4));
    await shot('iw004-ac2-390-touch-deleted');
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await page.setViewport({ width: 1368, height: 912, mobile: false });

    // ── AC7: the ? on the drawer opens the card and places nothing; placed blocks carry none ──
    await openQuest('en', 'free');
    const n0 = (await program()).length;
    await tap(`document.querySelector('.bg-blocks-box .gd-palette .gd-help[data-help="fwd"]')`, 'the ? on the drawer’s forward');
    const card = await until(CARD, (c) => c.up, 2500);
    await palTap('left');
    const helps = await evaluate(`({ drawer: document.querySelectorAll('.bg-blocks-box .gd-palette .gd-help').length, placed: document.querySelectorAll('.bg-blocks-box .gd-prog .gd-help').length })`);
    check(`AC7: the ? on the drawer’s forward opens its card ("${w('en', 'bFwd')}") and places nothing; the drawer’s blocks carry ${helps.drawer} ?, the placed one none`, card.up && card.title === w('en', 'bFwd') && n0 === 0 && (await program()).length === 1 && helps.drawer > 5 && helps.placed === 0, { card, n0, helps });
    await shot('iw004-ac7-card');
    if (await evaluate(CARD_UP)) await tap(first('.bg-card-help .bg-card-ok'), 'Got it');

    // ── AC3 on the 2D world: the chip, the state list by kind; the drawer by band ──
    await control('reset');
    await wait(600);
    const tulip = await evaluate(`(() => { const W = Noodl.Variables.gardenWorld; const t = (W.things || []).find((x) => x.kind === 'tulip'); return t ? { x: t.x, y: t.y } : null; })()`);
    const drawer2 = await evaluate(`[...document.querySelectorAll('.bg-blocks-box .gd-palette [data-pal]')].map((e) => e.getAttribute('data-pal'))`);
    await palTap('until');
    await palTap('is');
    await tap(`document.querySelector('.bg-blocks-box .gd-prog .gd-val[data-v="thing"]')`, 'the chip (pick on the island)');
    const armed = await evaluate(`({ picking: !!document.querySelector('.bg-blocks-box .gd-bk.gd-picking'), line: ((document.querySelector('.bg-blocks-box .gd-bk-line[data-line="pick"]') || {}).textContent || '').trim() })`);
    await shot('iw004-ac3-picking');
    await tap(`document.querySelector('.bg-stage .gd-cell[data-x="${tulip.x}"][data-y="${tulip.y}"]')`, `the tulip on the island (${tulip.x},${tulip.y})`);
    const c1 = await until(`(() => { const l = ${PROGRAM}; const u = l.find((b) => b.t === 'until'); return u && u.slots && u.slots.cond ? u.slots.cond : null; })()`, (c) => !!c && !!c.thing, 3000);
    const untilId = await lastOf('until');
    await tap(`document.querySelector('.bg-blocks-box .gd-prog [data-rep="${untilId}"] .gd-slot[data-slot="state"]')`, 'the tulip’s states');
    const tulipStates = await pickerOpts();
    await closePicker();
    await shot('iw004-ac3-2d-chip');
    check(`AC3 (2D): a tap on the chip arms Picking ("${w('en', 'iw4PickLine')}"); a tap on the tulip's tile (${tulip.x},${tulip.y}) makes it the chip { kind: tulip, x, y }; its states are thirsty / drunk`, armed.picking && armed.line.startsWith(w('en', 'iw4PickLine')) && !!c1 && c1.thing.kind === 'tulip' && c1.thing.x === tulip.x && c1.thing.y === tulip.y && JSON.stringify(tulipStates) === JSON.stringify(['thirsty', 'drunk']), { armed, c1, tulipStates });
    // The tile ahead: another list.
    await tap(headOfId(untilId), 'the until again (a second tap lets it go)');
    await palTap('if');
    await palTap('is');
    const ifId = await lastOf('if');
    await tap(headOfId(ifId), 'the if (selected)');
    await palTap('thing:ahead');
    await tap(`document.querySelector('.bg-blocks-box .gd-prog [data-rep="${ifId}"] .gd-slot[data-slot="state"]')`, 'the ahead’s states');
    const aheadStates = await pickerOpts();
    await closePicker();
    const ifCond = (await program()).find((b) => b.t === 'if');
    check('AC3: the state list follows the kind — the tile ahead offers wall / clear / has, not the tulip’s', JSON.stringify(aheadStates) === JSON.stringify(['wall', 'nothing', 'has']) && JSON.stringify(aheadStates) !== JSON.stringify(tulipStates) && !!ifCond && !!ifCond.slots && !!ifCond.slots.cond && ifCond.slots.cond.thing && ifCond.slots.cond.thing.ref === 'ahead', { aheadStates, ifCond });
    // The drawer by band.
    const VALUES = ['sensor', 'is', 'thing', 'thing:ahead', 'count', 'level', 'compare', 'number', 'logic', 'not', 'if:else'];
    await seg('7–9');
    await wait(900);
    const drawer1 = await evaluate(`[...document.querySelectorAll('.bg-blocks-box .gd-palette [data-pal]')].map((e) => e.getAttribute('data-pal'))`);
    await shot('iw004-ac3-band1-drawer');
    await seg('10–12');
    await wait(900);
    check(`AC3: band 7–9’s drawer has no value block (${drawer1.join(' ')}); 10–12’s has them all (${VALUES.filter((v) => drawer2.includes(v)).length} of ${VALUES.length})`, drawer1.length > 0 && drawer1.every((id) => !VALUES.includes(id)) && VALUES.every((v) => drawer2.includes(v)), { drawer1, drawer2 });

    // ── AC5: a 13th block on a 12-block brain ──
    await openQuest('en', 'free');
    for (let k = 0; k < 12; k++) await palTap(k % 2 ? 'left' : 'fwd');
    const twelve = (await program()).length;
    await palPress('fwd', 'forward (the 13th)');
    await wait(400);
    const full = await evaluate(`({ line: ((document.querySelector('.bg-blocks-box .gd-bk-line[data-line="full"]') || {}).textContent || '').trim(), off: document.querySelectorAll('.bg-blocks-box .gd-palette .gd-off').length })`);
    const thirteen = (await program()).length;
    await shot('iw004-ac5-brain-full');
    const fullLine = w('en', 'iw4Full', 'Pip', { n: 12 });
    check(`AC5: the brain holds 12 — the 13th tap places nothing and says "${fullLine}"; the drawer greys (${full.off} blocks)`, twelve === 12 && thirteen === 12 && full.line === fullLine && full.off > 0, { twelve, thirteen, full });

    // ── AC6: Teach records into the workspace, into the selected repeat ──
    await openQuest('en', 'free');
    await palTap('repeat');
    const rep6 = await lastOf('repeat');
    const sel6 = await evaluate(`(document.querySelector('.bg-blocks-box .gd-prog [data-rep="${rep6}"]') || { getAttribute: () => '' }).getAttribute('data-sel')`);
    await control('rec');
    await key('fwd');
    await key('left');
    await wait(600);
    const taught = await program();
    const drawnIn = await evaluate(`(() => { const r = document.querySelector('.bg-blocks-box .gd-prog [data-rep="${rep6}"]'); return r ? [...r.querySelectorAll('.gd-blk[data-t]')].map((b) => b.getAttribute('data-t')).join(' ') : ''; })()`);
    await shot('iw004-ac6-teach-into-repeat');
    check('AC6: Teach, with a repeat selected, records each pad press INTO it, and the workspace draws it there — [repeat 3 { forward, turn left }]', sel6 === '1' && shape(taught) === 'repeat 3 { fwd, left }' && drawnIn === 'fwd left', { sel6, taught: shape(taught), drawnIn });
    await control('drive');

    // ── AC9: EN / FR — the blocks' words and Blockly's own; the menu is Help and Duplicate only ──
    const menuOf = async (id) => {
      const p = await where(headOfId(id));
      await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'right', buttons: 2, clickCount: 1 });
      await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'right', buttons: 0, clickCount: 1 });
      await wait(500);
      const items = await evaluate(`[...document.querySelectorAll('.blocklyContextMenu .blocklyMenuItem')].map((e) => e.textContent.trim())`);
      await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await wait(300);
      return items;
    };
    const en = await menuOf(rep6);
    const enWords = await evaluate(`[...document.querySelectorAll('.bg-blocks-box .gd-palette [data-pal-head]')].slice(0, 3).map((e) => e.textContent)`);
    await seg('FR');
    await wait(1200);
    const rep6fr = await lastOf('repeat');
    const fr = await menuOf(rep6fr);
    const frWords = await evaluate(`[...document.querySelectorAll('.bg-blocks-box .gd-palette [data-pal-head]')].slice(0, 3).map((e) => e.textContent)`);
    await shot('iw004-ac9-fr');
    check(`AC9: the menu on a placed block is exactly Help + Duplicate in English (${en.join(', ')}) and Aide + Dupliquer in French (${fr.join(', ')} — Blockly’s own word for Duplicate)`, JSON.stringify(en) === JSON.stringify(['Help', 'Duplicate']) && JSON.stringify(fr) === JSON.stringify(['Aide', 'Dupliquer']), { en, fr });
    check(`AC9: the drawer's words follow the language (${enWords.map(nbsp).join(' / ')} → ${frWords.map(nbsp).join(' / ')})`, nbsp(enWords[0]) === w('en', 'bFwd') && nbsp(frWords[0]) === w('fr', 'bFwd') && shape(await program()) === 'repeat 3 { fwd, left }', { enWords, frWords });
    await seg('EN');
    await wait(800);
  }

  check('AC9: 0 console errors through the whole drive', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
  check('AC9: 0 network errors through the whole drive', page.networkErrors.length === 0, page.networkErrors.slice(0, 5));
  return { dir: DIR, mode: MODE, results, readings, consoleErrors: page.consoleErrors.slice(), networkErrors: page.networkErrors.slice() };
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
