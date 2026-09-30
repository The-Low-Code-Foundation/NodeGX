#!/usr/bin/env node
/**
 * P108 IW-003 (session 3, lane P) — the post missions as jobs, driven the way a child does it on the DEPLOYED template
 * (the deploy `drive-pages.sh` makes: `drive-cg003-pages.js assemble` + `nodegx-deploy.cjs`).
 *
 * Every program is built from the drawer (a tap on a drawer block adds it; a chip is picked by a tap on the world), then
 * played. What is graded is what a child sees: the door's plate and its letter chip (0/1 → 1/1, green), the letter gone
 * from the post box, the robot walking home, Olive's bubble naming the name she read, the win card — and the engine's
 * own world (`Noodl.Variables.gardenWorld`) beside it. A stub Olive answers `/__garden/*` inside Chrome: her read of an
 * envelope answers the name on it (the shell's written answer), anything else as the pages drive's stub does.
 *
 * Clauses, `--mode 2d` (the default):
 *   P1  path-postbox (band 7–9, EN, 1024 × 768): Sami's door wears its plate and a 0/1 letter chip, the letter peeks from
 *       the post box; the ten blocks tapped from the drawer ARE the reference program; Play → the letter through the door
 *       (1/1, green, the door shows it), gone from the box, Pip home facing east, the win card.
 *   P2  letter-say (Pocket, band 10–12, FR, 1368 × 900): the same through Sami's door, and the kind words said there.
 *   P3  envelopes (Pocket, band 10–12, EN then FR, 1368 × 900): repeat 3 { go to [post box] (the chip picked on the
 *       world), pick, Olive reads, go to [what Olive read] (the drawer's chip), put } built from the drawer; Play → Olive's
 *       bubble names each envelope's name, each letter lands in THAT door (never a wrong door), three doors 1/1, Pocket
 *       home, the win card ("Perfect!"); with put dragged back onto the drawer, the run that ends with the job open says
 *       the envelope's after-run line (iw3pRead), not Mamie's note's "the right row".
 *   P4  sami-thanks (Pocket, the phone 390 × 844): its start drawn — Mamie Rose's door with her plate and 0/1, the post
 *       box with the letter, the note — nothing wider than the phone.
 *   P5  0 console errors, 0 network errors.
 * `--mode 3d` (swiftshader): P3's street in Garden 3D — three doors built, three plates in the overlay in the owners'
 *   names, a 0/1 chip each; the program played to 1/1 × 3 and home.
 *
 * Usage: node scripts/devtools/drive-iw003-post.js <deploy-dir> --project <project-dir> [--mode 2d|3d] [--shots <dir>] [--json <file>]
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
  console.error('usage: drive-iw003-post.js <deploy-dir> --project <project-dir> [--mode 2d|3d] [--shots <dir>] [--json <file>]');
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
const req = (id) => REQUESTS.find((r) => r.id === id);
const titleOf = (lang, id) => w(lang, req(id).copyKeys.title);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const readings = {};
const check = (name, ok, saw) => {
  results.push({ name, ok: !!ok, saw });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${typeof saw === 'string' ? saw : JSON.stringify(saw)}`}`);
};

/** The stub Olive: an envelope's read answers its name (the written answer's own); the rest as the pages drive's stub. */
const ENVELOPE = /^(?:For|Pour) (.+)\.$/;
const STUB = {
  status: { model: 'ready', reason: '', gpu: false, loadMs: 1, lastMs: 1, asked: 0, fallbacks: 0, busy: false, queued: 0, exam: { at: '2026-09-28T00:00:00.000Z', ms: 1, passed: 20, failed: 0, rungs: {} } },
  olive: (body) => {
    if (body && body.rung === 'read') {
      const m = ENVELOPE.exec(String((body.slots || {}).note || ''));
      if (m) return { ok: true, value: m[1], ms: 5 };
      return { ok: true, value: body.lang === 'fr' ? 'tulipe rouge' : 'red tulip', ms: 5 };
    }
    return { ok: true, text: body && body.lang === 'fr' ? 'Merci, Mamie Rose ! (stub)' : 'Thank you, Mamie Rose! (stub)', ms: 5 };
  }
};

// 3D: Chrome with SOFTWARE WebGL (swiftshader), as drive-ig007-workshop.js --mode 3d.
const CHROME = MODE === '3d' ? { gpu: true, chromeArgs: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {};

withDeployedSite({ dir: DIR, ...CHROME }, async (page) => {
  const { client } = page;
  const evaluate = (expr) => page.evaluate(expr);
  const asked = [];
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
      if (!/status/.test(request.url)) asked.push({ rung: body.rung, slots: body.slots, options: body.options, answer });
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
  const seg = (label) => tap(byText('.bg-top .bg-seg-btn', label), `seg ${label}`);
  const tab = (i) => tap(`document.querySelectorAll('.bg-tabs .bg-tab')[${i}]`, `tab ${i}`);
  const CARD_UP = `(() => { const e = document.querySelector('.bg-card-help'); return !!e && e.offsetParent !== null; })()`;
  const BK = `document.querySelector('.bg-blocks-box .gd-bk')`;
  const reveal = (id) => evaluate(`(() => { const r = ${BK}; return !!r && !!r.__gardenBlocks && r.__gardenBlocks.reveal(${JSON.stringify(id)}); })()`);
  /** A tap on a drawer block (its card answered "Got it" the first time, as a child does). */
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
  const headOfId = (id) => `document.querySelector('.bg-blocks-box .gd-prog [data-head="${id}"]')`;
  /** A placed block held by its icon (its left, where a finger takes it). */
  const blockGrip = (id) => `(() => { const b = document.querySelector('.bg-blocks-box .gd-prog .gd-blk[data-id="${id}"]'); return b && b.querySelector('.gd-icon'); })()`;
  /** A press on a block, a walk of small moves onto the drawer, a lift: the block is thrown away. */
  const dragToDrawer = async (finder, label) => {
    const p = await where(finder);
    const d = await where(`document.querySelector('.bg-blocks-box .gd-palette')`, false);
    if (!p.found || !p.hit || !d.found) {
      check(`drag ${label}`, false, { p, d });
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
  const lastOf = (t) => evaluate(`(() => { const b = [...document.querySelectorAll('.bg-blocks-box .gd-prog .gd-blk[data-t="${t}"]')].pop(); return b ? b.getAttribute('data-id') : ''; })()`);
  const PROGRAM = `(() => { const p = Noodl.Variables.gardenProgram; const l = typeof p === 'string' ? JSON.parse(p || '[]') : p; return Array.isArray(l) ? l : []; })()`;
  const program = () => evaluate(PROGRAM);
  /** A program without its ids (the child's blocks get fresh ones), for comparing with the reference. */
  const bare = (list) => (Array.isArray(list) ? list : []).map((b) => { const o = { t: b.t }; if (b.n !== undefined) o.n = b.n; if (b.slots && Object.keys(b.slots).length) o.slots = b.slots; if (b.body) o.body = bare(b.body); return o; });
  const sameProgram = (a, b) => JSON.stringify(bare(a)) === JSON.stringify(bare(b));
  const storeKey = `Object.keys(localStorage).find((x) => /bot-garden/.test(x))`;
  const lend = (kind) => evaluate(`(() => { const k = ${storeKey}; const v = JSON.parse(localStorage.getItem(k)); const m = v.model || v; const a = m.profiles.find((p) => p.id === m.island.activeId); a.island.robots = a.island.robots || [{ id: 'r1' }]; if (!a.island.robots.some((r) => (r.kind || r.id) === ${JSON.stringify(kind)})) a.island.robots.push({ id: ${JSON.stringify(kind)}, kind: ${JSON.stringify(kind)} }); localStorage.setItem(k, JSON.stringify(v)); })()`);
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
    await tap(byText('.bg-quest', titleOf(lang, id)), `open ${id}`);
    await until('location.pathname', (p) => p === '/workshop');
    await until(`!!document.querySelector('.bg-blocks-box .gd-palette [data-pal="fwd"]')`, Boolean, 6000);
    await wait(900);
  };
  const runOver = () => until(`!document.querySelector('.bg-blocks-box .gd-locked')`, Boolean, 60000);
  const winUp = () => until(`(() => { const e = document.querySelector('.bg-win-card'); return !!e && e.offsetParent !== null; })()`, Boolean, 60000);
  const stay = async (lang) => {
    if (await evaluate(`(() => { const e = document.querySelector('.bg-win-card'); return !!e && e.offsetParent !== null; })()`)) await tap(byText('.bg-win-card button', w(lang, 'winStay')), 'Keep tinkering');
    await wait(500);
  };
  /** The engine's world and what the 2D world draws of it, in one breath. */
  const SEEN = `(() => {
    const W = Noodl.Variables.gardenWorld || {};
    const r0 = (W.robots || [])[0] || {};
    const cell = (x, y) => document.querySelector('.bg-stage .gd-cell[data-x="' + x + '"][data-y="' + y + '"]');
    return {
      robot: { x: r0.x, y: r0.y, d: r0.d, carry: (r0.carry || []).slice() },
      doors: (W.things || []).filter((t) => t.kind === 'door').map((t) => { const c = cell(t.x, t.y); const m = c && c.querySelector('.gd-meter[data-kind="door"]'); const p = c && c.querySelector('.gd-plate');
        return { owner: t.owner, count: t.count || 0, x: t.x, y: t.y, chip: m ? m.getAttribute('data-meter') : null, full: !!m && m.classList.contains('gd-full'), plate: p ? p.textContent : null, mail: !!(c && c.querySelector('[data-sprite="doorMail"]')) }; }),
      boxLetters: (() => { const b = (W.things || []).find((t) => t.kind === 'postbox'); return b ? (W.things || []).filter((t) => t.kind === 'letter' && t.x === b.x && t.y === b.y).length : -1; })(),
      boxPeek: (() => { const b = (W.things || []).find((t) => t.kind === 'postbox'); const c = b && cell(b.x, b.y); return !!(c && c.querySelector('.gd-letter-in')); })(),
      owl: ((document.querySelector('.bg-owl-say') || {}).innerText || '').trim(),
      bubble: [...document.querySelectorAll('.bg-stage .gd-bubble')].map((e) => (e.classList.contains('gd-olive') ? 'olive:' : '') + e.innerText.trim()).join(' | '),
      sx: document.scrollingElement.scrollWidth, vw: innerWidth
    };
  })()`;
  const seen = () => evaluate(SEEN);
  /** Every Olive bubble and wrong door while a run plays (read every 120 ms until the run is over). */
  const watchRun = async (ms = 60000) => {
    const bubbles = new Set();
    let wrong = 0;
    const end = Date.now() + ms;
    await wait(300);
    while (Date.now() < end) {
      const s = await evaluate(`({ b: [...document.querySelectorAll('.bg-stage .gd-bubble.gd-olive, .bg-stage [data-gd3-world] .gd3-bubble.gd3-olive')].map((e) => e.innerText.replace(/^Olive\\s*/, '').trim()), locked: !!document.querySelector('.bg-blocks-box .gd-locked'), wrong: (() => { const R = Noodl.Variables.gardenRun; return R ? Number(R.wrongDoors) || 0 : 0; })() })`);
      for (const b of s.b) bubbles.add(b);
      wrong = Math.max(wrong, s.wrong);
      if (!s.locked) break;
      await wait(120);
    }
    return { bubbles: [...bubbles], wrong };
  };

  const home = (id) => req(id).job.home;
  await page.setViewport({ width: 1024, height: 768, mobile: false });
  await freshFamily();
  await newPlayer('Ada');

  if (MODE === '2d') {
    // ── P1: Sami's path — the letter from the post box to his door (band 7–9, EN, 1024 × 768) ──
    const P = req('path-postbox');
    await openQuest('en', 'path-postbox');
    await seg('7–9');
    await wait(900);
    const s0 = await seen();
    await shot('iw003-p1-postbox-start-1024');
    check('P1 path-postbox: Sami’s door wears his plate and a 0/1 letter chip; the letter peeks from the post box', s0.doors.length === 1 && s0.doors[0].plate === 'Sami' && s0.doors[0].chip === '0/1' && !s0.doors[0].full && s0.boxLetters === 1 && s0.boxPeek, s0);
    for (const b of P.referenceProgram) await palTap(b.t);
    const p1 = await program();
    check(`P1: the ten blocks tapped from the band 7–9 drawer are the reference program (${P.referenceProgram.map((b) => b.t).join(' ')})`, sameProgram(p1, P.referenceProgram), bare(p1));
    await control('play');
    await runOver();
    const won1 = await winUp();
    const s1 = await seen();
    await shot('iw003-p1-postbox-won-1024');
    check(`P1: Play → the letter through Sami’s door (1/1, green, the door shows it), none left in the post box, Pip home on ${home('path-postbox').x},${home('path-postbox').y} facing east, the win card`, !!won1 && s1.doors[0].count === 1 && s1.doors[0].chip === '1/1' && s1.doors[0].full && s1.doors[0].mail && s1.boxLetters === 0 && !s1.boxPeek && s1.robot.x === home('path-postbox').x && s1.robot.y === home('path-postbox').y && s1.robot.d === home('path-postbox').d && s1.robot.carry.length === 0, { won1, s1 });
    await stay('en');
    await seg('10–12');
    await wait(600);

    // ── P2: letter-say — Pocket, band 10–12, FR, 1368 × 900 ──
    await page.setViewport({ width: 1368, height: 900, mobile: false });
    await lend('pocket');
    await page.navigate('/island');
    await wait(1200);
    await seg('FR');
    await wait(800);
    const L = req('letter-say');
    await openQuest('fr', 'letter-say');
    const s2a = await seen();
    // The drawer's own repeat holds 3: the child taps five forwards (the brain holds 12; this is 11).
    const flat = L.referenceProgram.flatMap((b) => (b.t === 'repeat' ? Array.from({ length: b.n }, () => b.body).flat() : [b]));
    for (const b of flat) await palTap(b.t);
    const p2 = await program();
    await control('play');
    await runOver();
    const won2 = await winUp();
    const s2 = await seen();
    await shot('iw003-p2-letter-say-won-1368-fr');
    check(`P2 letter-say (FR): ${flat.length} blocks from the drawer; Play → the letter through Sami’s door (0/1 → 1/1), Pocket said something kind there, home, the win card`, flat.length <= 12 && p2.length === flat.length && p2.some((b) => b.t === 'say') && s2a.doors[0].chip === '0/1' && s2a.doors[0].plate === 'Sami' && !!won2 && s2.doors[0].chip === '1/1' && s2.doors[0].full && s2.robot.x === home('letter-say').x && s2.robot.y === home('letter-say').y, { p2: bare(p2), s2a: s2a.doors, won2, s2 });
    await stay('fr');
    await seg('EN');
    await wait(800);
  }

  // ── P3: the envelopes — Olive reads the name, go to what she read (EN then FR; 2D, or Garden 3D with --mode 3d) ──
  // Each language on a new player (Pocket won letter-say above and works that plot now, and a won envelopes plot keeps
  // its program): Pocket lent.
  await page.setViewport({ width: 1368, height: 900, mobile: false });
  const E = req('envelopes');
  const ROOT3 = `document.querySelector('.bg-stage [data-gd3-world]')`;
  for (const lang of ['en', 'fr']) {
    await freshFamily();
    await newPlayer(lang === 'en' ? 'Bea' : 'Cléo');
    await lend('pocket');
    await page.navigate('/island');
    await wait(1200);
    if (lang === 'fr') {
      await seg('FR');
      await wait(800);
    }
    await openQuest(lang, 'envelopes');
    if (MODE === '3d') {
      const ready = await until(`(() => { const e = ${ROOT3}; return e ? e.getAttribute('data-ready') : null; })()`, (v) => v === 'true', 15000);
      const plates = await evaluate(`[...document.querySelectorAll('.bg-stage [data-gd3-world] .gd3-plate')].map((e) => e.getAttribute('data-owner') + '=' + e.textContent)`);
      const chips = await evaluate(`[...document.querySelectorAll('.bg-stage [data-gd3-world] .gd3-meter[data-kind="door"]')].map((e) => e.getAttribute('data-meter'))`);
      await shot(`iw003-p3-envelopes-3d-start-${lang}`);
      check(`P3 (3D, ${lang}): Garden 3D draws the street — three doors, each with its owner’s plate (${plates.join(', ')}) and a 0/1 chip`, ready === 'true' && JSON.stringify(plates) === JSON.stringify(['Mamie Rose=Mamie Rose', 'Sami=Sami', 'Biscuit=Biscuit']) && JSON.stringify(chips) === JSON.stringify(['0/1', '0/1', '0/1']), { ready, plates, chips });
    } else {
      const s3a = await seen();
      await shot(`iw003-p3-envelopes-start-${lang}`);
      check(`P3 (${lang}): the street — three doors with their plates (${s3a.doors.map((d) => d.plate).join(', ')}), each 0/1; three letters in the post box`, JSON.stringify(s3a.doors.map((d) => [d.plate, d.chip])) === JSON.stringify([['Mamie Rose', '0/1'], ['Sami', '0/1'], ['Biscuit', '0/1']]) && s3a.boxLetters === 3, s3a);
    }
    // Build it from the drawer: repeat (the new container is selected), go to, its chip picked on the world.
    await palTap('repeat');
    await palTap('go_to');
    await tap(`document.querySelector('.bg-blocks-box .gd-prog .gd-val[data-v="thing"]')`, 'go to’s chip (pick on the island)');
    const armed = await until(`!!document.querySelector('.bg-blocks-box .gd-bk.gd-picking')`, Boolean, 2000);
    const box = E.things.find((t) => t.kind === 'postbox');
    if (MODE === '3d') {
      const pt = await evaluate(`(() => { const r = ${ROOT3}; const c = r.querySelector('[data-gd3-canvas]').getBoundingClientRect(); const s = r.gd3.screenOfTile(${box.x}, ${box.y}); return { x: c.left + s.sx, y: c.top + s.sy }; })()`);
      for (const type of ['mousePressed', 'mouseReleased']) await client.send('Input.dispatchMouseEvent', { type, x: Math.round(pt.x), y: Math.round(pt.y), button: 'left', clickCount: 1 });
      await wait(500);
    } else await tap(`document.querySelector('.bg-stage .gd-cell[data-x="${box.x}"][data-y="${box.y}"]')`, `the post box on the world (${box.x},${box.y})`);
    // The chip's tap selected go to: a tap on the repeat selects it again (as a child re-selects where the next blocks go).
    const repId = await lastOf('repeat');
    await tap(headOfId(repId), 'the repeat (selected again)');
    await palTap('pick');
    await palTap('olive:read');
    await palTap('go_to');
    // The second go to selected, the drawer's "what Olive read" goes into its empty slot; then the repeat again for put.
    await tap(headOfId(await lastOf('go_to')), 'the second go to (selected)');
    await palTap('thing:read');
    await tap(headOfId(repId), 'the repeat (selected again)');
    await palTap('put');
    const p3 = await program();
    await shot(`iw003-p3-envelopes-built-${MODE}-${lang}`);
    check(`P3 (${MODE}, ${lang}): built from the drawer — the chip picked by a tap on the post box, “what Olive read” from the drawer into the second go to — it IS the reference program`, armed && sameProgram(p3, E.referenceProgram), { armed, p3: bare(p3), want: bare(E.referenceProgram) });
    const before = asked.length;
    await control('play');
    const watched = await watchRun();
    const won3 = await winUp();
    await wait(400);
    const ask = asked.slice(before).filter((a) => a.rung === 'read');
    const W3 = await evaluate(`(() => { const W = Noodl.Variables.gardenWorld; return { doors: W.things.filter((t) => t.kind === 'door').map((t) => [t.owner, t.count || 0]), robot: [W.robots[0].x, W.robots[0].y, W.robots[0].d], box: W.things.filter((t) => t.kind === 'letter').length }; })()`);
    const drawnDoors = MODE === '3d' ? await evaluate(`[...document.querySelectorAll('.bg-stage [data-gd3-world] .gd3-meter[data-kind="door"]')].map((e) => e.getAttribute('data-meter') + (e.classList.contains('gd3-full') ? ':full' : ''))`) : (await seen()).doors.map((d) => d.chip + (d.full ? ':full' : ''));
    const names = ask.map((a) => a.answer.value);
    const readSay = (n) => w(lang, 'oliveReadSay', 'Pocket', { x: n });
    await shot(`iw003-p3-envelopes-won-${MODE}-${lang}`);
    check(`P3 (${MODE}, ${lang}): Olive read three envelopes (${names.join(', ')}) — each asked with the envelope as the note and the neighbours as her choices`, ask.length === 3 && ask.every((a) => ENVELOPE.test(a.slots.note) && JSON.stringify(a.options) === JSON.stringify(['Mamie Rose', 'Sami', 'Biscuit'])) && new Set(names).size === 3, ask);
    check(`P3 (${MODE}, ${lang}): her bubble named each (“${readSay(names[0] || '?')}”…); no letter went to a wrong door; three doors 1/1 (${drawnDoors.join(' ')}); Pocket home; the win card`, names.every((n) => watched.bubbles.some((b) => b.includes(n))) && watched.wrong === 0 && JSON.stringify(W3.doors) === JSON.stringify([['Mamie Rose', 1], ['Sami', 1], ['Biscuit', 1]]) && drawnDoors.every((d) => d === '1/1:full') && drawnDoors.length === 3 && W3.robot.join() === [home('envelopes').x, home('envelopes').y, home('envelopes').d].join() && W3.box === 0 && !!won3, { watched, W3, drawnDoors, won3 });
    if (MODE === '2d') {
      await stay(lang);
      const won = (await seen()).owl;
      // The child takes put back out (dragged onto the drawer) and plays again: Olive reads, Pocket walks each letter to
      // its door and keeps it — a run that ends with the job not done names go to [what Olive read], not "the right row".
      await dragToDrawer(blockGrip(await lastOf('put')), 'put back onto the drawer');
      const noPut = await program();
      await control('play');
      await runOver();
      const owl = await until(`((document.querySelector('.bg-owl-say') || {}).innerText || '').trim()`, (t) => t.includes(hint(lang, 'iw3pRead', 'Pocket').slice(0, 30)), 6000);
      await shot(`iw003-p3-envelopes-no-put-${lang}`);
      check(`P3 (${lang}): the won run says “${hint(lang, 'hintPerfect').slice(0, 20)}…”; with put taken out the run reads three envelopes, leaves the doors 0/3 and the owl says the envelope’s line (“${hint(lang, 'iw3pRead', 'Pocket').slice(0, 40)}…”), not Mamie’s note’s “right row”`, won.includes(hint(lang, 'hintPerfect').slice(0, 12)) && !JSON.stringify(noPut).includes('"put"') && owl.includes(hint(lang, 'iw3pRead', 'Pocket').slice(0, 30)) && !owl.includes(hint(lang, 'oliveRung2', 'Pocket').slice(0, 30)), { won, noPut: bare(noPut), owl });
    } else await stay(lang);
  }
  await seg('EN');
  await wait(600);

  if (MODE === '2d') {
    // ── P4: sami-thanks on the phone — its start drawn ──
    // A new player again (Pocket works the envelopes' plot now: sami-thanks would wait for him).
    await page.setViewport({ width: 390, height: 844, mobile: true });
    await freshFamily();
    await newPlayer('Dora');
    await lend('pocket');
    await page.navigate('/island');
    await wait(1200);
    await openQuest('en', 'sami-thanks');
    await evaluate(`(() => { const e = document.querySelector('.bg-stage'); if (e) e.scrollIntoView({ block: 'start' }); })()`);
    await wait(600);
    const s4 = await seen();
    await shot('iw003-p4-sami-thanks-390');
    check('P4 sami-thanks (390): Mamie Rose’s door with her plate and a 0/1 chip, the letter in the post box; nothing wider than the phone', s4.doors.length === 1 && s4.doors[0].plate === 'Mamie Rose' && s4.doors[0].chip === '0/1' && s4.boxLetters === 1 && s4.sx <= s4.vw, s4);
    await page.setViewport({ width: 1368, height: 900, mobile: false });
  }

  check('P5: 0 console errors through the whole drive', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
  check('P5: 0 network errors through the whole drive', page.networkErrors.length === 0, page.networkErrors.slice(0, 5));
  return { dir: DIR, mode: MODE, results, readings, asked, consoleErrors: page.consoleErrors.slice(), networkErrors: page.networkErrors.slice() };
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
