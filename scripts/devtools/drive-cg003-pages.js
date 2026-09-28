#!/usr/bin/env node
/**
 * CG-003 / CG-007 — drive Bot Garden's six pages in a headless Chrome, on the DEPLOYED template.
 *
 * The project is `templates/bot-garden/` exactly as `npm run template:garden` writes it, copied (opening a project
 * writes into it — drive a COPY), deployed with `nodegx-deploy.cjs`, served by `drive-deployed.js`. Every press is a
 * real CDP mouse event at the element's centre, after `elementFromPoint` says the element is what a finger would hit
 * (RECT ≠ VISIBLE). Words are read from the project's own `Data/Words`, so a word lane B changes is still found.
 *
 * 🔴 A stub Olive answers `/__garden/*` inside Chrome (CDP `Fetch`), deterministic by door: status → a ready model
 * with a 20/20 exam; `POST /__garden/olive` → a fixed line per rung. The drive never waits on a model, and a missing
 * shell is not a network error. (Lane C's `olive-stub.js serve` is the shell-side stub for the Electron drive.)
 *
 * Usage:
 *   node scripts/devtools/drive-cg003-pages.js assemble <project-dir>
 *   node packages/noodl-preview/dist/nodegx-deploy.cjs <project-dir> <deploy-dir> --allow-development-engine
 *   node scripts/devtools/drive-cg003-pages.js <deploy-dir> --project <project-dir> [--shots <dir>] [--json <file>] [--mockup]
 *
 * 🔴 The deploy exits 0 EVEN WHEN IT REFUSES TO WRITE: check <deploy-dir>/index.html's mtime before believing a drive.
 *
 * Clauses — CG-003: AC3 (the whole path, EN then FR, 1368×912 then 390×844), AC4, AC5, AC6, AC7, AC8, AC9, AC10;
 * CG-007: AC1 (the six screens at 1368×912, and with --mockup the mockup's own screens beside them), AC3 (fonts
 * loaded, nothing fetched from Google), AC5 (face ≥ 20 px at 390×844; two robots apart), AC7 (reduced motion).
 * Exits 0 when every clause passed, 1 when any failed, 2 on a usage error.
 */
const fs = require('fs');
const path = require('path');
const { withDeployedSite } = require('./drive-deployed.js');

const REPO = path.join(__dirname, '..', '..');
const TEMPLATE = path.join(REPO, 'templates', 'bot-garden');
const MOCKUP = path.join(REPO, 'dev-docs', 'tasks', 'phase-78-the-templates', 'tpl-012-mockups', 'bot-garden.html');

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
};

if (process.argv[2] === 'assemble') {
  const out = process.argv[3];
  if (!out) {
    console.error('usage: drive-cg003-pages.js assemble <project-dir>');
    process.exit(2);
  }
  fs.rmSync(out, { recursive: true, force: true });
  fs.cpSync(TEMPLATE, out, { recursive: true });
  const modules = fs.readdirSync(path.join(out, 'noodl_modules')).sort();
  console.log(JSON.stringify({ assembled: out, modules, components: fs.readdirSync(path.join(out, 'components')).length }, null, 1));
  process.exit(['bot-garden-fonts', 'game-kit', 'garden-kit'].every((m) => modules.includes(m)) ? 0 : 1);
}

const DIR = process.argv[2];
const PROJECT = arg('--project') || TEMPLATE;
const SHOTS = arg('--shots');
const JSON_OUT = arg('--json');
const WITH_MOCKUP = process.argv.includes('--mockup');
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-cg003-pages.js <deploy-dir> --project <project-dir> [--shots <dir>] [--json <file>] [--mockup]  |  assemble <project-dir>');
  process.exit(2);
}
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

// ── The words, from the project's own table ─────────────────────────────────
function loadWords(projectDir) {
  const file = path.join(projectDir, 'components', 'Data', 'Words', 'nodes.json');
  const nodes = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = Array.isArray(nodes) ? nodes : nodes.nodes || Object.values(nodes);
  const data = list.find((n) => n.type === 'Static Data');
  const rows = JSON.parse(data.parameters.json);
  const out = { en: {}, fr: {} };
  for (const r of rows) {
    out.en[r.key] = r.en;
    out.fr[r.key] = r.fr;
  }
  return out;
}
const WORDS = loadWords(PROJECT);
const w = (lang, key, name = 'Pip') => String(WORDS[lang][key] || '').split('{b}').join(name);

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
  const requests = [];
  const stubCalls = [];
  client.on((msg) => {
    if (msg.method === 'Network.requestWillBeSent') requests.push(msg.params.request.url);
    if (msg.method === 'Fetch.requestPaused') {
      const { requestId, request } = msg.params;
      let body = {};
      try {
        body = JSON.parse(request.postData || '{}');
      } catch {
        body = {};
      }
      const answer = /\/__garden\/olive\/status/.test(request.url) ? STUB.status : STUB.olive(body);
      stubCalls.push({ url: request.url, method: request.method, body });
      client.send('Fetch.fulfillRequest', {
        requestId,
        responseCode: 200,
        responseHeaders: [{ name: 'content-type', value: 'application/json' }],
        body: Buffer.from(JSON.stringify(answer)).toString('base64')
      });
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
  const text = () => evaluate('document.body.innerText');
  const path0 = () => evaluate('location.pathname');

  /** The element a finger would hit: a JS finder expression returning an element; its centre; elementFromPoint inside it. */
  const where = (finder) =>
    evaluate(`(() => { const el = (${finder}); if (!el) return { found: false };
      el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const at = document.elementFromPoint(x, y);
      return { found: true, x, y, w: r.width, h: r.height, hit: !!at && (el === at || el.contains(at)) }; })()`);
  const tap = async (finder, label) => {
    let p = await where(finder);
    for (let i = 0; i < 20 && !p.found; i++) {
      await wait(150);
      p = await where(finder);
    }
    if (!p.found || !p.hit) {
      check(`tap ${label}`, false, p);
      return false;
    }
    for (const type of ['mousePressed', 'mouseReleased']) await client.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
    await wait(250);
    return true;
  };
  /** Finders: by class, by text inside a scope. */
  const byText = (selector, needle) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null && e.innerText.trim().includes(${JSON.stringify(needle)}))`;
  const first = (selector) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null)`;
  const typeInto = async (finder, value) => {
    await evaluate(`(() => { const el = (${finder}); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); })()`);
    await wait(250);
  };
  const blocks = () => evaluate(`document.querySelectorAll('.gd-prog .gd-blk[data-id]').length`);
  const tab = (i) => tap(`document.querySelectorAll('.bg-tabs .bg-tab')[${i}]`, `tab ${i}`);
  const seg = (label) => tap(byText('.bg-top .bg-seg-btn', label), `seg ${label}`);
  const control = (icon) => tap(first(`.bg-controls .bg-i-${icon}`), `control ${icon}`);
  const key = (op) => tap(first(`.bg-pad .bg-key-${op}`), `key ${op}`);

  /** Everything a person reads, for the language clause: visible text nodes, trimmed. */
  const words = () => evaluate(`(() => { const out = []; const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = walk.nextNode())) { const t = n.textContent.trim(); const el = n.parentElement; if (t.length > 2 && el && el.offsetParent !== null && !/^[0-9 ×✕+−…•·🌷○]*$/.test(t)) out.push(t); } return out; })()`);

  const langClause = async (screen, from, to) => {
    await evaluate('window.__gardenMarker = 42');
    const before = await words();
    await seg(to === 'fr' ? 'FR' : 'EN');
    await wait(600);
    const after = await words();
    const same = before.filter((t) => after.includes(t) && !/Bot Garden|Olive|Pip|Ada|Bo|Mamie Rose|Sami|Biscuit|EN|FR|7–9|10–12|Ok/.test(t));
    const marker = await evaluate('window.__gardenMarker');
    check(`AC9 ${screen}: ${from}→${to} changes every string, no reload`, marker === 42 && after.length > 0 && same.length === 0, { unchanged: same.slice(0, 8), marker });
  };

  // ── AC3 + friends, per viewport and language ──
  const VIEWPORTS = [
    { name: '1368', width: 1368, height: 912, mobile: false },
    { name: '390', width: 390, height: 844, mobile: true }
  ];
  const LANGS = ['en', 'fr'];

  for (const vp of VIEWPORTS) {
    for (const lang of LANGS) {
      const tag = `${vp.name}-${lang}`;
      await page.setViewport(vp);
      await evaluate('localStorage.clear()');
      await page.navigate('/');
      await wait(800);
      // Profiles, in the language asked for (AC9 on the Profiles screen, before anyone is chosen).
      if (lang === 'fr') await seg('FR');
      const who = await until('document.body.innerText', (t) => t.includes(w(lang, 'whoIsPlaying')));
      check(`AC3 ${tag}: Profiles says "${w(lang, 'whoIsPlaying')}"`, who.includes(w(lang, 'whoIsPlaying')), who.slice(0, 200));
      await shot(`ac3-${tag}-01-profiles`);
      await tap(byText('button.bg-btn', w(lang, 'newProfile')), 'new player');
      await typeInto(first('input'), 'Ada');
      await tap(byText('.bg-seg-btn', '10–12'), 'band 10–12 in the form');
      await tap(byText('button.bg-btn', w(lang, 'create')), 'create');
      const island = await until('location.pathname', (p) => p === '/island');
      check(`AC3 ${tag}: a new profile lands on the island`, island === '/island', island);
      await wait(600);
      await shot(`ac3-${tag}-02-island`);

      // AC8: a reload lands on the island with the profile kept.
      await page.navigate('/island');
      await wait(900);
      const kept = await text();
      check(`AC8 ${tag}: reload /island keeps the island and the profile`, (await path0()) === '/island' && kept.includes('Ada'), { path: await path0(), hasName: kept.includes('Ada') });

      // The tulip request.
      await tap(byText('.bg-quest', w(lang, 'rqTulipsTitle')), 'the tulip request');
      const ws = await until('location.pathname', (p) => p === '/workshop');
      check(`AC3 ${tag}: the tulip request opens the workshop`, ws === '/workshop', ws);
      await wait(900);
      await shot(`ac3-${tag}-03-workshop`);

      if (vp.name === '390') {
        // AC4: world, controls and owl without scrolling to find Play; the steps scroll in their own box.
        await evaluate('window.scrollTo(0, 0)');
        const r = await evaluate(`(() => { const box = (s) => { const e = [...document.querySelectorAll(s)].find((x) => x.offsetParent !== null); if (!e) return null; const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
          return { play: box('.bg-controls .bg-i-play'), world: box('.bg-stage .gd-world'), owl: box('.bg-owl'), vh: innerHeight, vw: innerWidth, sx: document.scrollingElement.scrollWidth }; })()`);
        readings[`ac4-${lang}`] = r;
        check(`AC4 ${lang}: Play is on screen at scroll 0 (bottom ≤ 844)`, r.play && r.play.bottom <= r.vh, r);
        check(`AC4 ${lang}: the world is on screen`, r.world && r.world.top < r.vh && r.world.bottom > 0, r.world);
        check(`AC4 ${lang}: the owl starts on screen`, r.owl && r.owl.top < r.vh, r.owl);
        check(`AC4 ${lang}: no horizontal scroll`, r.sx <= r.vw, r);
      }

      // Teach four steps, see four blocks.
      await control('rec');
      const padShown = await until(`!!document.querySelector('.bg-pad .bg-key-fwd')`, Boolean);
      check(`AC3 ${tag}: Teach shows the pad`, padShown, padShown);
      const taught = ['fwd', 'fwd', 'left', 'water', 'right'];
      for (let k = 0; k < 4; k++) await key(taught[k]);
      const four = await until(`document.querySelectorAll('.gd-prog .gd-blk[data-id]').length`, (n) => n === 4);
      check(`AC3 ${tag}: four pad presses, four blocks`, four === 4, four);
      if (vp.name === '1368' && lang === 'en') {
        const keys = await evaluate(`[...document.querySelectorAll('.bg-pad .bg-key')].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })`);
        check('AC5: the pad keys are ≥ 56 px', keys.length === 4 && keys.every(([a, b]) => a >= 56 && b >= 56), keys);
      }
      await shot(`ac3-${tag}-04-four-blocks`);
      for (let k = 4; k < 15; k++) await key(taught[k % 5]);
      check(`AC3 ${tag}: fifteen presses, fifteen blocks`, (await blocks()) === 15, await blocks());
      // The fold, offered in words, taken by the child.
      const tidy = await until(`(() => { const e = document.querySelector('.bg-tidy'); return e && e.offsetParent !== null ? e.innerText : ''; })()`, Boolean);
      check(`AC3 ${tag}: the fold is offered`, !!tidy, tidy);
      if (vp.name === '390') {
        const box = await evaluate(`(() => { const e = document.querySelector('.bg-blocks-box'); return e ? { sh: e.scrollHeight, ch: e.clientHeight, oy: getComputedStyle(e).overflowY } : null; })()`);
        check(`AC4 ${lang}: fifteen blocks scroll in their own box`, box && box.sh > box.ch && box.oy === 'auto', box);
      }
      await tap(first('.bg-tidy .bg-i-tidy'), 'Fold it');
      const folded = await until(`(() => { const r = document.querySelector('.gd-prog .gd-blk[data-t="repeat"]'); return r ? document.querySelectorAll('.gd-prog .gd-blk[data-id]').length : 0; })()`, (n) => n === 6);
      check(`AC3 ${tag}: folded to one repeat holding five (6 blocks drawn)`, folded === 6, folded);
      await shot(`ac3-${tag}-05-folded`);
      // Play to the win.
      await control('play');
      const won = await until(`(() => { const e = document.querySelector('.bg-win-card'); return !!e && e.offsetParent !== null; })()`, Boolean, 20000);
      check(`AC3 ${tag}: play waters the three tulips and the win card shows`, won, won);
      if (won) {
        const card = await evaluate(`(() => { const r = document.querySelector('.bg-win-card').getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, vw: innerWidth, vh: innerHeight, text: document.querySelector('.bg-win-card').innerText, pos: getComputedStyle(document.querySelector('.bg-win')).position }; })()`);
        readings[`win-${tag}`] = card;
        check(`AC3 ${tag}: the hat is on the win card`, card.text.includes(w(lang, 'hatSun')), card.text);
        // AC7: fixed and centred, even with the block list scrolled.
        await evaluate(`(() => { const b = document.querySelector('.bg-blocks-box'); if (b) b.scrollTop = b.scrollHeight; window.scrollTo(0, document.scrollingElement.scrollHeight); })()`);
        await wait(300);
        const again = await evaluate(`(() => { const r = document.querySelector('.bg-win-card').getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, vw: innerWidth, vh: innerHeight, pos: getComputedStyle(document.querySelector('.bg-win')).position }; })()`);
        check(`AC7 ${tag}: the win card is fixed and centred after scrolling`, again.pos === 'fixed' && Math.abs(again.cx - again.vw / 2) < 4 && Math.abs(again.cy - again.vh / 2) < 40, again);
        await shot(`ac3-${tag}-06-win`);
        await tap(byText('.bg-win-card button', w(lang, 'winIsland')), 'back to the island');
        const back = await until('location.pathname', (p) => p === '/island');
        check(`AC3 ${tag}: back on the island in one tap from the win card`, back === '/island', back);
        await wait(600);
        const done = await evaluate(`(() => { const c = [...document.querySelectorAll('.bg-quest')].find((e) => e.innerText.includes(${JSON.stringify(w(lang, 'rqTulipsTitle'))})); return c ? c.innerText : null; })()`);
        check(`AC3 ${tag}: the tulip request is done on the island`, !!done && done.includes(w(lang, 'done')), done);
      }
      // My robot: the hat, owned, worn.
      await tab(2);
      await until('location.pathname', (p) => p === '/robot');
      await wait(700);
      const hat = await evaluate(`(() => { const c = [...document.querySelectorAll('.bg-chip')].find((e) => e.innerText.includes(${JSON.stringify(w(lang, 'hatSun'))})); return c ? { text: c.innerText, opacity: getComputedStyle(c).opacity } : null; })()`);
      check(`AC3 ${tag}: My robot offers the sunflower hat, earned (not faded)`, !!hat && Number(hat.opacity) === 1, hat);
      if (hat) await tap(byText('.bg-chip', w(lang, 'hatSun')), 'wear the hat');
      await shot(`ac3-${tag}-07-robot`);
      // Skills: Repeat blooms.
      await tab(3);
      await until('location.pathname', (p) => p === '/skills');
      await wait(700);
      const bloom = await evaluate(`(() => { const c = [...document.querySelectorAll('.bg-notion')].find((e) => e.innerText.includes(${JSON.stringify(w(lang, 'n2p'))})); return c ? c.className : null; })()`);
      check(`AC3 ${tag}: Skills shows Repeat blooming`, !!bloom && bloom.includes('bg-notion-bloom'), bloom);
      await shot(`ac3-${tag}-08-skills`);
      check(`AC3 ${tag}: 0 console errors so far`, page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
      check(`AC3 ${tag}: 0 network errors so far`, page.networkErrors.length === 0, page.networkErrors.slice(0, 5));
    }
  }

  // ── The rest at 1368×912, EN ──
  await page.setViewport(VIEWPORTS[0]);
  await page.navigate('/island');
  await wait(900);
  await seg('EN');

  // AC8: a reload of the workshop, with no request in hand, lands on the island.
  await page.navigate('/workshop');
  const bounced = await until('location.pathname', (p) => p === '/island', 5000);
  check('AC8: reload /workshop → the island, the profile kept', bounced === '/island' && (await text()).includes('Ada'), bounced);

  // AC9 on every screen.
  const SCREENS = [
    [0, 'island', '/island'],
    [2, 'robot', '/robot'],
    [3, 'skills', '/skills'],
    [4, 'grown-ups', '/grown-ups']
  ];
  for (const [i, name, p] of SCREENS) {
    await tab(i);
    await until('location.pathname', (x) => x === p);
    await wait(700);
    await langClause(name, 'en', 'fr');
    await langClause(name, 'fr', 'en');
  }
  await tab(0);
  await wait(600);
  await tap(byText('.bg-quest', w('en', 'rqTulipsTitle')), 'the tulip request again');
  await until('location.pathname', (x) => x === '/workshop');
  await wait(900);
  await langClause('workshop', 'en', 'fr');
  await langClause('workshop', 'fr', 'en');

  // AC6 (band 10–12): Predict, a wrong tap shows the real end and a hint, never a score; a right tap plays.
  await control('rec');
  for (const op of ['fwd', 'fwd']) await key(op);
  await control('rec'); // Done teaching
  await control('predict');
  const asked = await until(`document.body.innerText.includes(${JSON.stringify(w('en', 'predictAsk'))})`, Boolean);
  check('AC6: Predict asks where the robot will end', asked, asked);
  await tap(`document.querySelector('.gd-cell[data-x="5"][data-y="3"]')`, 'a wrong tile');
  const miss = await until(`(() => { const f = [...document.querySelectorAll('.gd-label')].find((e) => e.innerText.includes('🏁')); const say = document.querySelector('.bg-owl-say'); return { flag: f ? f.closest('.gd-cell').getAttribute('data-x') + ',' + f.closest('.gd-cell').getAttribute('data-y') : null, say: say ? say.innerText : '' }; })()`, (r) => !!r.flag);
  check('AC6: a wrong tap marks the real end (2,3)', miss.flag === '2,3', miss);
  check('AC6: … and says the Predict hint, with no score in it', miss.say === w('en', 'hintPredictMiss').replace(/\{b\}/g, 'Pip') || miss.say.includes(w('en', 'hintPredictMiss').split('{b}')[0].trim()), miss.say);
  check('AC6: … and no number is shown as a score', !/\b\d+\s*(\/|%|points?|pts)\b/.test(miss.say), miss.say);
  await shot('ac6-miss');
  await control('predict');
  await tap(`document.querySelector('.gd-cell[data-x="2"][data-y="3"]')`, 'the right tile');
  // A hit plays from the start: the robot is put back at (0,3) and walks through (1,3) to (2,3).
  const via = await until(`document.querySelector('.gd-bot').getAttribute('data-x')`, (x) => x === '1', 4000);
  const moved = await until(`document.querySelector('.gd-bot').getAttribute('data-x')`, (x) => x === '2', 6000);
  check('AC6: a right tap plays the program from the start', via === '1' && moved === '2', { via, moved });

  // AC5 (band 7–9): no count, no Predict, captions only.
  await seg('7–9');
  await wait(700);
  const young = await evaluate(`(() => { const vis = (s) => [...document.querySelectorAll(s)].some((e) => e.offsetParent !== null); const n = [...document.querySelectorAll('.gd-prog .gd-n, .gd-palette .gd-n')].map((e) => parseFloat(getComputedStyle(e).fontSize)); return { predict: vis('.bg-controls .bg-i-predict'), band: document.querySelector('.gd-blocks') && document.querySelector('.gd-blocks').getAttribute('data-band'), maxCaption: Math.max(0, ...n), heads: [...document.querySelectorAll('h2')].map((h) => h.parentElement.innerText.replace(h.innerText, '').trim()).filter((t) => /\\d/.test(t)) }; })()`);
  check('AC5: band 7–9 — no Predict, blocks at band 1, captions ≤ 12 px, no count', !young.predict && young.band === '1' && young.maxCaption <= 12 && young.heads.length === 0, young);
  await shot('ac5-band1');
  await seg('10–12');
  await wait(500);

  // CG-007 AC5 at 390×844: the face ≥ 20 px on the world.
  await page.setViewport(VIEWPORTS[1]);
  await wait(600);
  const face = await evaluate(`(() => { const f = document.querySelector('.bg-stage [data-face]'); if (!f) return null; const r = f.getBoundingClientRect(); return Math.min(r.width, r.height); })()`);
  readings.face390 = face;
  check('CG-007 AC5: the robot’s face ≥ 20 px on the world at 390×844', face >= 20, face);
  await page.setViewport(VIEWPORTS[0]);

  // AC10: a second profile sees the first one's robot, and the request done by either is done.
  await page.navigate('/');
  await wait(800);
  await tap(byText('button.bg-btn', w('en', 'newProfile')), 'new player');
  await typeInto(first('input'), 'Bo');
  await tap(byText('button.bg-btn', w('en', 'create')), 'create Bo');
  await until('location.pathname', (p) => p === '/island');
  await wait(900);
  const two = await evaluate(`(() => { const bots = [...document.querySelectorAll('.bg-map .gd-bot')]; const boxes = bots.map((b) => { const r = b.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, name: b.innerText }; }); return boxes; })()`);
  const apart = two.length === 2 && !(two[0].x < two[1].x + two[1].w && two[1].x < two[0].x + two[0].w && two[0].y < two[1].y + two[1].h && two[1].y < two[0].y + two[0].h);
  check('AC10: two profiles, two robots on the island, each named', two.length === 2, two);
  check('CG-007 AC5: the two robots do not overlap', apart, two);
  const doneForBo = await evaluate(`(() => { const c = [...document.querySelectorAll('.bg-quest')].find((e) => e.innerText.includes(${JSON.stringify(w('en', 'rqTulipsTitle'))})); return c ? c.innerText : null; })()`);
  check('AC10: the tulip request Ada did is done for Bo too', !!doneForBo && doneForBo.includes(w('en', 'done')), doneForBo);
  await shot('ac10-two-robots');

  // Grown-ups: the stub Olive is awake; Try Olive answers.
  await tab(4);
  await until('location.pathname', (p) => p === '/grown-ups');
  await wait(1200);
  const gu = await text();
  check('Grown-ups: the stub shell says Olive is awake, and her exam here', gu.includes(w('en', 'guHereOn')) && /20/.test(gu), gu.slice(0, 400));
  await tap(first('.bg-panel .bg-i-owl'), 'Try Olive');
  const reply = await until('document.body.innerText', (t) => t.includes('(stub)'), 6000);
  check('Grown-ups: Try Olive shows her reply', reply.includes('(stub)'), stubCalls.slice(-2));

  // CG-007 AC3: both faces loaded, from the deploy, nothing from Google.
  const fonts = await evaluate(`(async () => { await document.fonts.ready; return [...document.fonts].map((f) => ({ family: f.family.replace(/["']/g, ''), status: f.status })); })()`);
  readings.fonts = fonts;
  check('CG-007 AC3: a Fredoka face is loaded', fonts.some((f) => f.family === 'Fredoka' && f.status === 'loaded'), fonts);
  check('CG-007 AC3: a Nunito face is loaded', fonts.some((f) => f.family === 'Nunito' && f.status === 'loaded'), fonts);
  check('CG-007 AC3: nothing asked of fonts.googleapis.com or any other host', !requests.some((u) => /googleapis|gstatic/.test(u)) && requests.every((u) => /^(http:\/\/127\.0\.0\.1|data:|blob:|about:)/.test(u)), requests.filter((u) => !/^http:\/\/127\.0\.0\.1/.test(u)).slice(0, 5));

  // CG-007 AC7: reduced motion stills the animations; the tulips still read by opacity and pose.
  await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await tab(0);
  await wait(500);
  await tap(byText('.bg-quest', w('en', 'rqTulipsTitle')), 'the tulip request (reduced motion)');
  await until('location.pathname', (x) => x === '/workshop');
  await wait(900);
  await control('rec');
  for (const op of ['fwd', 'fwd', 'left', 'water']) await key(op);
  const still = await evaluate(`(() => { const all = [...document.querySelectorAll('*')].filter((e) => { const s = getComputedStyle(e); return s.animationName !== 'none' && s.animationPlayState === 'running' && parseFloat(s.animationDuration) > 0.01; }).map((e) => e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className); const wet = document.querySelector('.gd-wet'), dry = document.querySelector('.gd-dry'); return { animated: all.slice(0, 8), wet: wet && getComputedStyle(wet).opacity, dry: dry && getComputedStyle(dry).opacity }; })()`);
  check('CG-007 AC7: under reduced motion nothing animates', still.animated.length === 0, still);
  check('CG-007 AC7: … and a watered tulip still reads apart from a dry one', still.wet !== null && still.dry !== null && still.wet !== still.dry, still);
  await shot('cg007-ac7-reduced');
  await client.send('Emulation.setEmulatedMedia', { features: [] });

  // CG-007 AC1: the six screens at 1368×912 for the side-by-side.
  const SIX = [
    ['profiles', '/'],
    ['island', '/island'],
    ['robot', '/robot'],
    ['skills', '/skills'],
    ['grown-ups', '/grown-ups']
  ];
  for (const [name, p] of SIX) {
    await page.navigate(p);
    await wait(1100);
    await shot(`cg007-ac1-${name}`);
  }
  await tab(0);
  await wait(600);
  await tap(byText('.bg-quest', w('en', 'rqTulipsTitle')), 'the workshop for the look');
  await wait(1100);
  await shot('cg007-ac1-workshop');

  check('0 console errors through the whole drive', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
  check('0 network errors through the whole drive', page.networkErrors.length === 0, page.networkErrors.slice(0, 5));
  readings.stubCalls = stubCalls.length;
  return { dir: DIR, results, readings, consoleErrors: page.consoleErrors.slice(), networkErrors: page.networkErrors.slice() };
})
  .then(async (out) => {
    if (WITH_MOCKUP && SHOTS) await mockupShots();
    if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 1));
    const failed = out.results.filter((r) => !r.ok).length;
    console.log(`\n${out.results.length - failed}/${out.results.length} clauses passed`);
    process.exit(failed ? 1 : 0);
  })
  .catch((e) => {
    console.error(e && e.stack ? e.stack : String(e));
    process.exit(1);
  });

/** CG-007 AC1: the mockup's own screens at 1368×912, served from the repo, for the side-by-side (it fetches its Google font). */
async function mockupShots() {
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'cg007-mockup-'));
  fs.copyFileSync(MOCKUP, path.join(dir, 'index.html'));
  await withDeployedSite({ dir }, async (page) => {
    await page.setViewport({ width: 1368, height: 912, mobile: false });
    for (const screen of ['island', 'workshop', 'robot', 'notions', 'grownups']) {
      await page.evaluate(`go(${JSON.stringify(screen)})`);
      await wait(500);
      await page.screenshot(path.join(SHOTS, `mockup-${screen}.png`));
    }
  });
}
