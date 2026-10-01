#!/usr/bin/env node
/**
 * P108 IW-007 (session 5, lane A) — her animals on the DEPLOYED template (the page drive's deploy: `drive-cg003-pages.js
 * assemble` + `nodegx-deploy.cjs`, as `drives/drive-all.sh` makes it).
 *
 * Usage:
 *   node scripts/devtools/drive-iw007-animals.js <deploy-dir> --project <assembled-project> [--shots <dir>] [--json <file>] [--mode 2d|3d] [--perf]
 *
 * Seams the drive names (what is SEEDED into the saved family, as the crew drive seeds its programs, and why):
 *   - shells (lane E earns them; this drive spends them through the shop's Buy, the one purchase rule);
 *   - a FINISHED refuge on her land (lane B's drives build one by two robots; here it stands already);
 *   - the feeding robot pinned on the land: `plots.land = { program, robotId }` written into the store — the program a
 *     child teaches (until [her bowl] is full { go to nearest 🥕 patch, pick up, go to [her bowl], put down }), not taught
 *     in the Workshop on the land by this drive (the Workshop on the land is lane B's; its request is `Logic/Land request`).
 * Everything else is a child's tap on what she sees (a tap lands only where `elementFromPoint` finds the thing), and every
 * word, price, place and number is read from the deployed project.
 *
 * --mode 2d (default) headless Chrome, no GPU (the flat island):
 *   SHUT <tag>     the Animals tab, no refuge: "Build the refuge first…" and nothing to buy (1368 EN, 390 FR)
 *   OPEN <tag>     a finished refuge on her land: the rabbit and the sheep, each with its picture, price and name
 *   CARD <tag>     the rabbit's card: You have · It costs · Left after; the name box with the default name in it; Buy
 *   BUY <tag>      named "Flopsy" (EN) / left empty (FR → the default name): Buy → "{name} is waiting by her bowl…" on the
 *                  card; the store holds her (rabbit, her name, at the refuge's pen, fed 0) and spent = her price
 *   APPEARS <tag>  the shop closed, at once (no reload): on the island, by her bowl at the pen, she sits waiting, her
 *                  name pill, her bowl's meter 0/3 (screenshots: the island and a close-up of her land)
 *   FEED           (1368 EN) a feeding robot pinned on her land: a MutationObserver on her tile (installed before the
 *                  island starts) records her mood and her bowl: waiting 0/3 → carrots land → happy (hopping) and 3/3
 *   WEAR           then wear takes a carrot (WEAR.bowl island ticks), and the robot goes back: 3/3 again — she never
 *                  leaves her tile (every record has her) (screenshot at full, after the refill)
 *   RELOAD         a reload keeps her, her name and her bowl as the island last wrote it (the store's land.animals)
 * --mode 3d  software GL (swiftshader): the same family fed — Garden 3D draws her name pill and her mood in its overlay
 *            (waiting, then happy once a carrot lands), or, under software GL, hands the island to the flat one (IG-007's
 *            Too Slow) where she is drawn the same; screenshots.
 * --perf (2d): IW-007 AC4's frame gate — her land with TWO finished buildings (the spa, the refuge) and TWO animals (a
 *            rabbit and a sheep), a feeding robot at work there, beside Pip's tulips; CPU ×4; 20 s of frames by
 *            requestAnimationFrame: p95 ≤ 50 ms (P106 IG-004 AC6's gate; s4 read 16.7 ms with the crew at its cap).
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
const PERF = process.argv.includes('--perf');
if (!DIR || DIR.startsWith('--') || !PROJECT || !['2d', '3d'].includes(MODE)) {
  console.error('usage: drive-iw007-animals.js <deploy-dir> --project <assembled-project> [--shots <dir>] [--json <file>] [--mode 2d|3d] [--perf]');
  process.exit(2);
}
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

// ── What the deployed project says (never typed here) ──
const nodesOf = (component) => {
  const nodes = JSON.parse(fs.readFileSync(path.join(PROJECT, 'components', ...component.split('/'), 'nodes.json'), 'utf8'));
  return Array.isArray(nodes) ? nodes : nodes.nodes || Object.values(nodes);
};
const staticRows = (c) => JSON.parse(nodesOf(c).find((n) => n.type === 'Static Data').parameters.json);
const fnScript = (c) => String(nodesOf(c).find((n) => n.type === 'JavaScriptFunction').parameters.functionScript);
const constOf = (script, name) => JSON.parse(new RegExp(`var ${name} = (.*?);\\n`).exec(script)[1]);
const WORD_ROWS = staticRows('Data/Words');
const w = (lang, key, vars = {}) => Object.entries(vars).reduce((t, [k, v]) => t.split(`{${k}}`).join(String(v)), String((WORD_ROWS.find((r) => r.key === key) || {})[lang] || ''));
const ISLAND = fnScript('Logic/Island world');
const LAND_PLOT = constOf(ISLAND, 'LAND_PLOT');
const LAND_ID = constOf(ISLAND, 'LAND_ID');
const WEAR = constOf(ISLAND, 'WEAR');
const ANIMALS = constOf(ISLAND, 'ANIMALS');
const BLUEPRINTS = constOf(ISLAND, 'BLUEPRINTS');
const SHOP = constOf(fnScript('Logic/Shop rows'), 'SHOP');
const DEFAULT_NAMES = constOf(fnScript('Logic/Shop card'), 'IW7A_DEFAULT_NAMES');
const REQUESTS = staticRows('Data/Requests');
const req = (id) => REQUESTS.find((r) => r.id === id);
const shop = (id) => SHOP.find((s) => s.id === id);
const cap = (kind) => ANIMALS.find((a) => a.id === kind).capacity;
const REFUGE = BLUEPRINTS.find((b) => b.id === 'refuge');
const SPA = BLUEPRINTS.find((b) => b.id === 'spa');
const full = (bp) => Object.fromEntries(bp.parts.map((p) => [p.item, p.need]));
/** Her land: a finished refuge at its spot (the pen the row below it); with `spa`, a finished spa at its spot too. */
const landOf = (spa, animals = []) => ({
  buildings: [{ id: 'b2', bp: 'refuge', x: REFUGE.spot.x, y: REFUGE.spot.y, have: full(REFUGE) }, ...(spa ? [{ id: 'b1', bp: 'spa', x: SPA.spot.x, y: SPA.spot.y, have: full(SPA) }] : [])],
  animals
});
/** A pen place in island coordinates (slot 0, 1 … under the refuge). */
const penAt = (slot) => ({ x: LAND_PLOT.x + REFUGE.spot.x + slot, y: LAND_PLOT.y + REFUGE.spot.y + 1 });
const penLocal = (slot) => ({ x: REFUGE.spot.x + slot, y: REFUGE.spot.y + 1 });
/** The feeding job as a child teaches it (her bowl a chip picked on the island; plot coordinates, as the Workshop records). */
const feeding = (id, at, base = 1) => [
  { id: base, t: 'until', slots: { cond: { op: 'is', thing: { id, kind: 'bowl', x: at.x, y: at.y }, state: 'full' } }, body: [{ id: base + 1, t: 'go_nearest', slots: { kind: 'patch' } }, { id: base + 2, t: 'pick' }, { id: base + 3, t: 'go_to', slots: { thing: { id, kind: 'bowl', x: at.x, y: at.y } } }, { id: base + 4, t: 'put' }] }
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const readings = {};
const check = (name, ok, saw) => {
  results.push({ name, ok: !!ok, saw });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${typeof saw === 'string' ? saw : JSON.stringify(saw).slice(0, 1500)}`}`);
};
const STUB = { status: { model: 'ready', reason: '', gpu: false, busy: false, queued: 0, exam: { at: '2026-09-28T00:00:00.000Z', ms: 1, passed: 20, failed: 0, rungs: {} } }, olive: { ok: true, text: 'stub', ms: 5 } };
const CHROME = MODE === '3d' ? { gpu: true, chromeArgs: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {};

withDeployedSite({ dir: DIR, ...CHROME }, async (page) => {
  const { client } = page;
  const evaluate = (expr) => page.evaluate(expr);
  client.on((msg) => {
    if (msg.method === 'Fetch.requestPaused') {
      const { requestId, request } = msg.params;
      const answer = /\/__garden\/olive\/status/.test(request.url) ? STUB.status : STUB.olive;
      client.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: 'application/json' }], body: Buffer.from(JSON.stringify(answer)).toString('base64') });
    }
  });
  await client.send('Fetch.enable', { patterns: [{ urlPattern: '*/__garden/*', requestStage: 'Request' }] });
  const until = async (expr, ok, ms = 8000, every = 150) => {
    const end = Date.now() + ms;
    let last = await evaluate(expr);
    while (!ok(last) && Date.now() < end) {
      await wait(every);
      last = await evaluate(expr);
    }
    return last;
  };
  const shot = async (name) => {
    if (SHOTS) await page.screenshot(path.join(SHOTS, `${name}.png`));
  };
  /** A close-up of her land (the 8 × 6 plot's cells, measured on the page), three times larger. */
  const landShot = async (name) => {
    if (!SHOTS) return;
    const r = await evaluate(`(() => { const a = document.querySelector('.bg-isle .gd-cell[data-x="${LAND_PLOT.x}"][data-y="${LAND_PLOT.y}"]'); const b = document.querySelector('.bg-isle .gd-cell[data-x="${LAND_PLOT.x + 7}"][data-y="${LAND_PLOT.y + 5}"]'); if (!a || !b) return null; a.scrollIntoView({ block: 'center', inline: 'center' }); const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return { x: ra.left - 4 + scrollX, y: ra.top - 14 + scrollY, width: rb.right - ra.left + 8, height: rb.bottom - ra.top + 30, seen: !!document.elementFromPoint((ra.left + rb.right) / 2, (ra.top + rb.bottom) / 2) && a.closest('.bg-isle').contains(document.elementFromPoint((ra.left + rb.right) / 2, (ra.top + rb.bottom) / 2)) }; })()`);
    if (!r) return;
    readings[`landShot-${name}`] = r;
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { x: r.x, y: r.y, width: r.width, height: r.height, scale: 3 } });
    fs.writeFileSync(path.join(SHOTS, `${name}.png`), Buffer.from(data, 'base64'));
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
    await wait(300);
    return true;
  };
  const byText = (selector, needle) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null && e.innerText.trim().includes(${JSON.stringify(needle)}))`;
  const first = (selector) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null)`;
  const seg = (label) => tap(byText('.bg-top .bg-seg-btn', label), `seg ${label}`);
  const STORE_KEY = `Object.keys(localStorage).find((x) => /bot-garden/.test(x))`;
  const active = () => evaluate(`(() => { const k = ${STORE_KEY}; const m = JSON.parse(localStorage.getItem(k)).model; return m.profiles.find((p) => p.id === m.island.activeId); })()`);
  /** A write into the saved family (the active profile as `a`), then the island again. */
  const writeStore = async (fnBody, to = '/island') => {
    await evaluate(`(() => { const k = ${STORE_KEY}; const v = JSON.parse(localStorage.getItem(k)); const m = v.model; const a = m.profiles.find((p) => p.id === m.island.activeId); ${fnBody}; localStorage.setItem(k, JSON.stringify(v)); })()`);
    await page.navigate(to);
    await wait(1500);
  };
  const freshFamily = async (lang) => {
    const origin = await evaluate('location.origin');
    await client.send('Storage.clearDataForOrigin', { origin, storageTypes: 'local_storage,indexeddb,cache_storage,service_workers' });
    await page.navigate('/');
    await wait(900);
    if (lang === 'fr') {
      await seg('FR');
      await wait(600);
    }
    await tap(first('button.bg-profile-new'), `new player (${lang})`);
    await evaluate(`(() => { const el = [...document.querySelectorAll('input')].find((e) => e.offsetParent !== null); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, 'Ada'); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); })()`);
    await wait(250);
    await tap(byText('.bg-seg-btn', '10–12'), 'band 10–12 in the form');
    await tap(byText('button.bg-btn', w(lang, 'create')), 'create');
    return (await until('location.pathname', (p) => p === '/island')) === '/island';
  };
  // ── The shop, as a child taps it ──
  const SHEET = `(() => { const s = document.querySelector('.bg-shop-panel'); return !!s && s.offsetParent !== null; })()`;
  const openShop = async (tag) => {
    await tap(first('.bg-shop-open'), `the shop's button (${tag})`);
    return until(SHEET, Boolean, 3000);
  };
  const closeShop = async (tag) => {
    if (await evaluate(SHEET)) await tap(first('.bg-shop-close'), `close the shop (${tag})`);
  };
  const tabTap = (lang) => tap(byText('.bg-shop-tabs .bg-chip', w(lang, 'iw6hTabAnimals')), `the Animals tab (${lang})`);
  const TAB_READ = `(() => { const items = [...document.querySelectorAll('.bg-shop-items .bg-shop-item')].filter((e) => e.offsetParent !== null); const later = document.querySelector('.bg-shop-later');
    return { items: items.map((e) => ({ pic: (e.querySelector('.bg-shop-pic') || {}).innerText, price: (e.querySelector('.bg-shop-price') || {}).innerText, name: (e.querySelector('.bg-shop-name') || {}).innerText })), later: later && later.offsetParent !== null ? later.innerText.trim() : '', sw: document.documentElement.scrollWidth, vw: innerWidth }; })()`;
  const CARD = `(() => { const c = document.querySelector('.bg-shop-card'); if (!c || c.offsetParent === null) return null; const t = (s) => { const e = c.querySelector(s); return e && e.offsetParent !== null ? e.innerText.trim() : ''; };
    const vis = (s) => { const e = c.querySelector(s); return !!e && e.offsetParent !== null; };
    return { name: t('.bg-shop-card-name'), figs: [...c.querySelectorAll('.bg-shop-fig')].filter((e) => e.offsetParent !== null).map((e) => e.innerText.trim()), done: t('.bg-shop-done'), none: t('.bg-shop-none'), buy: vis('.bg-shop-buy'), nameBox: vis('input'), placeholder: (c.querySelector('input') || {}).placeholder || '' }; })()`;
  /** Her tile on the island (2D): her animal, mood, the bowl's meter, her name pill, the hop's animation. */
  const PET = (x, y) => `(() => { const c = document.querySelector('.bg-isle .gd-cell[data-x="${x}"][data-y="${y}"]'); if (!c) return null; const a = c.querySelector('[data-animal]'); const m = c.querySelector('.gd-meter'); const n = c.querySelector('.gd-pet-name'); const b = c.querySelector('.gd-pet-bowl');
    return { animal: a ? a.getAttribute('data-animal') : null, mood: a ? a.getAttribute('data-mood') : null, sprite: a ? a.getAttribute('data-sprite') : null, hop: a ? getComputedStyle(a).animationName : null, name: n ? n.innerText.trim() : null, meter: m ? m.getAttribute('data-meter') : null, bowl: b ? b.getAttribute('data-sprite') : null, h: a ? Math.round(a.getBoundingClientRect().height) : 0 }; })()`;

  if (PERF) {
    // ── IW-007 AC4: the frame gate with two buildings and two animals on her land, a feeding robot at work ──
    await page.setViewport({ width: 1368, height: 912, mobile: false });
    const ok = await freshFamily('en');
    check('PERF: a new player lands on the island', ok, await evaluate('location.pathname'));
    const tulips = req('tulips-three');
    const animals = [{ id: 'a1', kind: 'rabbit', name: 'Flopsy', at: 'b2', slot: 0, fed: 0 }, { id: 'a2', kind: 'sheep', name: 'Bramble', at: 'b2', slot: 1, fed: 0 }];
    const program = [...feeding('a1', penLocal(0), 1), ...feeding('a2', penLocal(1), 10)];
    await writeStore(`a.island.land = ${JSON.stringify(landOf(true, animals))};
      a.island.robots.push({ id: 'cobble', kind: 'cobble', name: 'Cobble', color: '#7A8CA3', eye: 'round', hat: 'none' });
      a.island.done = [${JSON.stringify(tulips.id)}];
      a.island.plots = { ${JSON.stringify(LAND_ID)}: { program: ${JSON.stringify(program)}, robotId: 'cobble', wonAt: 1 }, ${JSON.stringify(tulips.id)}: { program: ${JSON.stringify(tulips.referenceProgram)}, robotId: a.island.robots[0].id, wonAt: 2 } }`);
    await wait(2500);
    const drawn = await evaluate(`(() => { const isle = document.querySelector('.bg-isle'); return { pets: [...isle.querySelectorAll('[data-animal]')].map((e) => e.getAttribute('data-animal')), sites: isle.querySelectorAll('.gd-cell[data-x="${LAND_PLOT.x + SPA.spot.x}"][data-y="${LAND_PLOT.y + SPA.spot.y}"] .gd-meter, .gd-cell[data-x="${LAND_PLOT.x + REFUGE.spot.x}"][data-y="${LAND_PLOT.y + REFUGE.spot.y}"] .gd-meter').length, bots: isle.querySelectorAll('.gd-bot').length }; })()`);
    const st = await evaluate(`(() => { const s = Noodl.Variables.gardenIsland; const live = s && s.live && s.live[${JSON.stringify(LAND_ID)}]; return live ? { parts: live.things.filter((t) => t.of).map((t) => t.of + ':' + t.bstage), bowls: live.things.filter((t) => t.animal).map((t) => t.animal) } : null; })()`);
    readings.perfLand = { drawn, st };
    check('PERF: her land holds two finished buildings (spa, refuge) and two animals (a rabbit, a sheep), drawn on the island; a robot works the land beside Pip on the tulips', drawn.pets.length === 2 && drawn.pets.includes('rabbit') && drawn.pets.includes('sheep') && drawn.bots >= 2 && !!st && st.bowls.length === 2 && st.parts.length === 4, readings.perfLand);
    await shot('iw7a-perf-island-1368');
    await landShot('iw7a-perf-land-1368');
    const LOOP = `(() => { const t = performance.now(); let x = 0; for (let i = 0; i < 3e7; i++) x = (x + i * 7) % 1000003; return performance.now() - t + (x < 0 ? 1 : 0); })()`;
    const loop1 = await evaluate(LOOP);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await wait(1500);
    const loop4 = await evaluate(LOOP);
    readings.throttle = { loop1, loop4, ratio: loop4 / loop1 };
    check(`PERF: the CPU throttle is on (a fixed loop ${loop1.toFixed(0)} ms → ${loop4.toFixed(0)} ms, ×${(loop4 / loop1).toFixed(1)})`, loop4 / loop1 > 2.5, readings.throttle);
    const perf = await evaluate(`new Promise((resolve) => {
      const frames = []; const moves = { n: 0 }; const fed = { n: 0 }; let last = performance.now(); const t0 = last;
      const seen = () => [...document.querySelectorAll('.bg-isle .gd-bot')].map((b) => b.getAttribute('data-x') + ',' + b.getAttribute('data-y') + ',' + b.getAttribute('data-d')).join('|');
      let prev = seen();
      const obs = new MutationObserver((list) => { for (const m of list) if (m.attributeName === 'data-mood') fed.n++; const now = seen(); if (now !== prev) { moves.n++; prev = now; } });
      obs.observe(document.querySelector('.bg-isle'), { attributes: true, subtree: true, childList: true, attributeFilter: ['data-x', 'data-y', 'data-d', 'data-mood'] });
      const tick = (t) => { frames.push(t - last); last = t; if (t - t0 < 20000) requestAnimationFrame(tick); else { obs.disconnect(); const s = frames.slice(1).sort((a, b) => a - b); resolve({ frames: s.length, p50: s[Math.floor(s.length * 0.5)], p95: s[Math.floor(s.length * 0.95)], p99: s[Math.floor(s.length * 0.99)], max: s[s.length - 1], over50: s.filter((v) => v > 50).length, moves: moves.n, hidden: document.hidden }); } };
      requestAnimationFrame(tick);
    })`);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const after = await evaluate(`(() => { const s = Noodl.Variables.gardenIsland; const live = s && s.live && s.live[${JSON.stringify(LAND_ID)}]; return live ? live.things.filter((t) => t.animal).map((t) => t.animal + ' ' + t.count + '/' + t.capacity) : null; })()`);
    readings.ac4 = { ...perf, bowlsAfter: after };
    console.log(`IW-007 AC4 readout: CPU ×4, 2D island, two buildings + two animals + a feeding robot: ${JSON.stringify(readings.ac4)}`);
    check(`IW-007 AC4 (the Mac, 2D, CPU ×4, two buildings and two animals on her land, a feeding robot at work): p95 frame ${perf && perf.p95 !== undefined ? perf.p95.toFixed(1) : '?'} ms ≤ 50 ms (${perf ? perf.frames : 0} frames, ${perf ? perf.moves : 0} robot moves in 20 s)`, !!perf && perf.frames > 100 && perf.moves >= 5 && perf.p95 <= 50, readings.ac4);
    await shot('iw7a-perf-island-after');
    check('PERF: 0 console errors', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
    return finish();
  }

  if (MODE === '3d') {
    // ── 3D: her name and her mood in Garden 3D's overlay — waiting, then happy once the robot brings a carrot ──
    await page.setViewport({ width: 1368, height: 912, mobile: false });
    const ok = await freshFamily('en');
    check('3D: a new player lands on the island', ok, await evaluate('location.pathname'));
    const at = penLocal(0);
    await writeStore(`a.island.land = ${JSON.stringify(landOf(false, [{ id: 'a1', kind: 'rabbit', name: 'Flopsy', at: 'b2', slot: 0, fed: 0 }]))};
      a.island.plots = { ${JSON.stringify(LAND_ID)}: { program: ${JSON.stringify(feeding('a1', at))}, robotId: a.island.robots[0].id, wonAt: 1 } }`);
    const gl = await until(`(() => { const e = document.querySelector('.bg-isle [data-gd3-world]'); return e ? { meshes: e.getAttribute('data-meshes'), slow: e.getAttribute('data-too-slow') } : null; })()`, (r) => !!r && !!r.meshes, 15000);
    const PILL = `(() => { const p = [...document.querySelectorAll('.bg-isle .gd3-pet')]; const flat = document.querySelectorAll('.bg-isle [data-animal]').length; return { pills: p.map((e) => [e.innerText, e.getAttribute('data-mood'), e.getAttribute('data-animal')]), flat, flatMood: (document.querySelector('.bg-isle [data-animal]') || { getAttribute: () => null }).getAttribute('data-mood') }; })()`;
    const firstLook = await evaluate(PILL);
    await shot('iw7a-3d-island-first');
    // The 3D overlay records every mood it shows from now on (a MutationObserver, not a sampler: the hop is short).
    await evaluate(`(() => { window.__moods = []; const rec = () => { const p = document.querySelector('.bg-isle .gd3-pet'); const f = document.querySelector('.bg-isle [data-animal]'); const m = p ? '3d:' + p.getAttribute('data-mood') : f ? '2d:' + f.getAttribute('data-mood') : 'none'; if (window.__moods[window.__moods.length - 1] !== m) window.__moods.push(m); }; rec(); new MutationObserver(rec).observe(document.querySelector('.bg-isle'), { subtree: true, childList: true, attributes: true, attributeFilter: ['data-mood'] }); })()`);
    const happy = await until(`window.__moods.slice()`, (m) => m.some((x) => /happy/.test(x)), 90000, 500);
    const later = await evaluate(PILL);
    readings.gl3d = { gl, firstLook, moods: happy, later };
    await shot('iw7a-3d-island-fed');
    const named3d = firstLook.pills.length === 1 && firstLook.pills[0][0] === 'Flopsy' && firstLook.pills[0][2] === 'rabbit' && firstLook.pills[0][1] === 'waiting';
    check('3D: Garden 3D draws her (her name "Flopsy" a pill in its overlay, waiting by her empty bowl) — or, under software GL, the flat island draws her', !!gl && (named3d || firstLook.flat === 1), readings.gl3d);
    check('3D: a feeding robot pinned on her land brings a carrot and she is happy (recorded as it happened, 3D or flat)', happy.some((x) => /happy/.test(x)) && happy.some((x) => /waiting/.test(x)), happy);
    check('3D: 0 console errors', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
    return finish();
  }

  // ── 2D: the shop's Animals tab, a rabbit bought and named, she appears; then (1368 EN) fed, worn, fed again, reloaded ──
  const PASSES = [
    ['1368', 'en', { width: 1368, height: 900, mobile: false }, 'Flopsy'],
    ['390', 'fr', { width: 390, height: 844, mobile: true }, '']
  ];
  for (const [vp, lang, size, typed] of PASSES) {
    const tag = `${vp}-${lang}`;
    await page.setViewport(size);
    if (!(await freshFamily(lang))) {
      check(`${tag}: a new player lands on the island`, false, await evaluate('location.pathname'));
      continue;
    }
    await writeStore(`a.shells = { earned: 100, spent: 0 }`);
    // SHUT: no refuge yet.
    await openShop(tag);
    await tabTap(lang);
    await wait(400);
    const shut = await evaluate(TAB_READ);
    readings[`shut-${tag}`] = shut;
    await shot(`iw7a-${tag}-01-shut`);
    check(`SHUT ${tag}: no refuge on her land — the Animals tab says "${w(lang, 'iw7aShut')}" and sells nothing; inside the page`, shut.later === w(lang, 'iw7aShut') && shut.items.length === 0 && shut.sw <= shut.vw + 1, shut);
    await closeShop(tag);
    // OPEN: a finished refuge (seeded — lane B's drives build one).
    await writeStore(`a.island.land = ${JSON.stringify(landOf(false))}`);
    await openShop(tag);
    await tabTap(lang);
    await wait(400);
    const open = await evaluate(TAB_READ);
    readings[`open-${tag}`] = open;
    await shot(`iw7a-${tag}-02-open`);
    const want = ['rabbit', 'sheep'].map(shop);
    check(`OPEN ${tag}: a finished refuge — the rabbit and the sheep, each with its picture, price and name; no "build first" line`, open.items.length === 2 && want.every((s, i) => open.items[i].pic === s.icon && open.items[i].price === `🐚 ${s.price}` && open.items[i].name === s.name[lang]) && open.later === '', open);
    // CARD and BUY.
    await tap(byText('.bg-shop-items .bg-shop-item', shop('rabbit').name[lang]), `the rabbit (${tag})`);
    const card = await until(CARD, Boolean, 3000);
    readings[`card-${tag}`] = card;
    await shot(`iw7a-${tag}-03-card`);
    check(`CARD ${tag}: the rabbit's card — ${w(lang, 'iw6hHave', { n: 100 })} · ${w(lang, 'iw6hCost', { n: shop('rabbit').price })} · ${w(lang, 'iw6hLeft', { n: 100 - shop('rabbit').price })}; the name box shows "${DEFAULT_NAMES.rabbit[lang]}"; Buy`, !!card && card.nameBox && card.placeholder === DEFAULT_NAMES.rabbit[lang] && card.buy && JSON.stringify(card.figs) === JSON.stringify([w(lang, 'iw6hHave', { n: 100 }), w(lang, 'iw6hCost', { n: shop('rabbit').price }), w(lang, 'iw6hLeft', { n: 100 - shop('rabbit').price })]), card);
    if (typed) await evaluate(`(() => { const el = document.querySelector('.bg-shop-card input'); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, ${JSON.stringify(typed)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await wait(300);
    await tap(first('.bg-shop-buy'), `Buy (${tag})`);
    const name = typed || DEFAULT_NAMES.rabbit[lang];
    const bought = await until(CARD, (c) => !!c && !!c.done, 3000);
    await shot(`iw7a-${tag}-04-bought`);
    const p = await active();
    readings[`bought-${tag}`] = { card: bought, animals: p.island.land.animals, shells: p.shells };
    check(`BUY ${tag}: ${typed ? `named "${typed}"` : 'the name box left empty'} — the card says "${w(lang, 'iw7aBought_rabbit', { name })}"; the store holds her (rabbit, ${name}, at the refuge's pen, fed 0); spent ${shop('rabbit').price}`,
      !!bought && bought.done === w(lang, 'iw7aBought_rabbit', { name }) && !bought.buy && p.island.land.animals.length === 1 && p.island.land.animals[0].kind === 'rabbit' && p.island.land.animals[0].name === name && p.island.land.animals[0].at === 'b2' && p.island.land.animals[0].fed === 0 && p.shells.spent === shop('rabbit').price, readings[`bought-${tag}`]);
    await closeShop(tag);
    // APPEARS: at once, no reload.
    const pen = penAt(p.island.land.animals[0].slot);
    const seen = await until(PET(pen.x, pen.y), (r) => !!r && r.animal === 'rabbit', 5000);
    readings[`appears-${tag}`] = seen;
    await shot(`iw7a-${tag}-05-island`);
    await landShot(`iw7a-${tag}-05-land`);
    check(`APPEARS ${tag}: the shop closed, at once (no reload), she is on her land by her bowl at the pen (${pen.x}, ${pen.y}): sitting, waiting (never sad), her name "${name}" a pill, her bowl 0/${cap('rabbit')}, empty; drawn at least 20 px tall on the island`, !!seen && seen.mood === 'waiting' && seen.sprite === 'rabbitWait' && seen.name === name && seen.meter === `0/${cap('rabbit')}` && seen.bowl === 'bowl' && seen.h >= 20, seen);

    if (vp !== '1368') continue;
    // FEED and WEAR: a feeding robot pinned on her land; her tile recorded from before the island starts.
    const robotId = p.island.robots[0].id;
    await evaluate(`(() => { const k = ${STORE_KEY}; const v = JSON.parse(localStorage.getItem(k)); const m = v.model; const a = m.profiles.find((q) => q.id === m.island.activeId); a.island.plots = Object.assign(a.island.plots || {}, { ${JSON.stringify(LAND_ID)}: { program: ${JSON.stringify(feeding(p.island.land.animals[0].id, penLocal(p.island.land.animals[0].slot)))}, robotId: ${JSON.stringify(robotId)}, wonAt: 1 } }); localStorage.setItem(k, JSON.stringify(v)); })()`);
    await page.navigate('/island');
    const t0 = Date.now();
    await until(PET(pen.x, pen.y), (r) => !!r && !!r.animal, 6000);
    await evaluate(`(() => { window.__pet = []; const t0 = performance.now(); const rec = () => { const c = document.querySelector('.bg-isle .gd-cell[data-x="${pen.x}"][data-y="${pen.y}"]'); const a = c && c.querySelector('[data-animal]'); const m = c && c.querySelector('.gd-meter'); const r = { t: Math.round(performance.now() - t0), mood: a ? a.getAttribute('data-mood') : 'GONE', meter: m ? m.getAttribute('data-meter') : null }; const l = window.__pet[window.__pet.length - 1]; if (!l || l.mood !== r.mood || l.meter !== r.meter) window.__pet.push(r); }; rec(); new MutationObserver(rec).observe(document.querySelector('.bg-isle'), { subtree: true, childList: true, attributes: true, attributeFilter: ['data-mood', 'data-meter'] }); })()`);
    const fullMeter = `${cap('rabbit')}/${cap('rabbit')}`;
    const fed = await until(PET(pen.x, pen.y), (r) => !!r && r.meter === fullMeter, 120000, 500);
    const fedLook = await evaluate(PET(pen.x, pen.y));
    readings.fed = { at: Date.now() - t0, look: fedLook };
    await shot('iw7a-1368-en-06-fed');
    await landShot('iw7a-1368-en-06-fed-land');
    const live = await evaluate(`(() => { const s = Noodl.Variables.gardenIsland; const c = s && s.live && s.live[${JSON.stringify(LAND_ID)}]; return c ? { phase: c.phase, robot: c.robot ? [c.robot.x, c.robot.y] : null } : null; })()`);
    readings.liveFed = live;
    check(`FEED: a feeding robot pinned on her land fills her bowl from the patch — ${fullMeter}, she stands happy and hops (animation ${fedLook && fedLook.hop}); her name still "${name}"`, !!fed && fed.meter === fullMeter && fedLook.mood === 'happy' && fedLook.sprite === 'rabbitHappy' && fedLook.hop === 'gd-hop' && fedLook.bowl === 'bowlCarrots' && fedLook.name === name, { fed, fedLook, live });
    // WEAR: a carrot gone after WEAR.bowl island ticks, then the robot goes back and fills it again.
    const ms = WEAR.bowl * 760 * 2 + 60000;
    const refilled = await until(`window.__pet.slice()`, (rec) => {
      const i = rec.findIndex((r) => r.meter === fullMeter);
      const dip = rec.findIndex((r, k) => k > i && r.meter !== fullMeter);
      return i !== -1 && dip !== -1 && rec.slice(dip).some((r) => r.meter === fullMeter);
    }, ms, 1000);
    readings.pet = refilled;
    await shot('iw7a-1368-en-07-refilled');
    await landShot('iw7a-1368-en-07-refilled-land');
    const iFull = refilled.findIndex((r) => r.meter === fullMeter);
    const iDip = refilled.findIndex((r, k) => k > iFull && r.meter !== fullMeter);
    check(`WEAR: wear takes a carrot from her full bowl (${fullMeter} → ${iDip !== -1 ? refilled[iDip].meter : '?'} at ${iDip !== -1 ? (refilled[iDip].t / 1000).toFixed(0) : '?'} s), the pinned robot goes back and fills it again (${fullMeter}); recorded as it happened`, iFull !== -1 && iDip > iFull && refilled.slice(iDip).some((r) => r.meter === fullMeter), refilled);
    check('WEAR + AC3: she never left — every record of her tile, from the island starting to the refill, has her there (never GONE), and never anything but waiting or happy', refilled.length > 2 && refilled.every((r) => r.mood === 'waiting' || r.mood === 'happy'), refilled);
    // RELOAD: she, her name, her bowl as the island last wrote it.
    const before = await active();
    await page.navigate('/island');
    const back = await until(PET(pen.x, pen.y), (r) => !!r && !!r.animal, 6000);
    const after = await active();
    readings.reload = { before: before.island.land.animals, after: after.island.land.animals, back };
    check(`RELOAD: a reload keeps her — the store's land has "${name}" the rabbit (fed ${after.island.land.animals[0] ? after.island.land.animals[0].fed : '?'}), drawn by her bowl with her name`, after.island.land.animals.length === 1 && after.island.land.animals[0].name === name && after.island.land.animals[0].kind === 'rabbit' && !!back && back.name === name && back.animal === 'rabbit', readings.reload);
  }
  check('0 console errors through the whole drive', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
  check('0 network errors through the whole drive', page.networkErrors.length === 0, page.networkErrors.slice(0, 5));
  return finish();

  function finish() {
    return { dir: DIR, mode: MODE, perf: PERF, results, readings, consoleErrors: page.consoleErrors.slice(), networkErrors: page.networkErrors.slice() };
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
