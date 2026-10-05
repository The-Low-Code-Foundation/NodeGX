#!/usr/bin/env node
/**
 * P108 session 9 — what Richard found when the children played on the Windows tablets (2026-10-03), driven on the
 * DEPLOYED template (the deploy drive-all.sh makes: drive-cg003-pages.js assemble + nodegx deploy).
 *
 * Clauses (--mode 3d runs REND; --mode 2d runs HINTS and BUILT):
 *   REND    (3d, the CPU throttled ×8 so Garden 3D is too slow here) CONTROL: nothing chosen, Pip at work on the island —
 *           Too Slow fires (gd3.tooSlow) and the island goes flat (renderer {2d, slow}). Then Grown-ups → "3D island": the
 *           choice is {3d, grown-up} and the panel says it stays even if slow. The island again, throttled: Too Slow
 *           fires (seen on gd3) and the renderer is STILL {3d, grown-up}, Garden 3D still on the stage, no flat garden.
 *   HINTS   Water my three tulips, nothing placed: the owl's line is the blocks-first hint (no "arrows", no "press
 *           Teach"); the request's own line puts the blocks first.
 *   BUILT   her land with the spa placed, one stone short (5/6 stones, 4/4 planks), Pip taught there by the pad (Teach):
 *           go to the nearest rock, pick, go to the spa's stones, put — the save holds 6/6 AT ONCE (before any Play or
 *           page change); Start over: the spa's parts still 6/6 and 4/4 in the Workshop's world; Play the taught steps:
 *           nothing falls; the island at once: the spa drawn finished (no part short); back on her land: still finished.
 *           A second land (refuge, 0/4 planks): one plank by the pad in Drive → saved 1/4 at once; Start over keeps it.
 *   0 console errors.
 *
 * Usage: node scripts/devtools/drive-p108s9.js <deploy-dir> --project <assembled-project> [--mode 2d|3d] [--shots <dir>] [--json <file>]
 * Exits 0 when every clause passed, 1 when any failed, 2 on a usage error.
 */
const fs = require('fs');
const path = require('path');
const { withDeployedSite } = require('./drive-deployed.js');
const { functionText, runFunction } = require('./garden-functions.js'); // P109 ISL-005: shared code lives in scripts/

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
  console.error('usage: drive-p108s9.js <deploy-dir> --project <assembled-project> [--mode 2d|3d] [--shots <dir>] [--json <file>]');
  process.exit(2);
}
const CHROME = MODE === '3d' ? { gpu: true, chromeArgs: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {};
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

// ── What the deployed project says (never typed here) ──
function nodesOf(component) {
  const nodes = JSON.parse(fs.readFileSync(path.join(PROJECT, 'components', ...component.split('/'), 'nodes.json'), 'utf8'));
  return Array.isArray(nodes) ? nodes : nodes.nodes || Object.values(nodes);
}
const staticRows = (c) => JSON.parse(nodesOf(c).find((n) => n.type === 'Static Data').parameters.json);
const functionScript = (c) => functionText(PROJECT, c);
const pageRun = (c, inputs, tail = '') => {
  const out = {};
  runFunction(PROJECT, c, inputs, tail, out);
  return out;
};
const WORDS = { en: {}, fr: {} };
for (const r of staticRows('Data/Words')) {
  WORDS.en[r.key] = r.en;
  WORDS.fr[r.key] = r.fr;
}
const HINTS = {};
for (const r of staticRows('Data/Hints')) HINTS[r.key] = r;
const w = (lang, key, name = 'Pip') => String(WORDS[lang][key] || '').split('{b}').join(name);
const REQUESTS = staticRows('Data/Requests');
const req = (id) => REQUESTS.find((r) => r.id === id);
const titleOf = (lang, id) => w(lang, req(id).copyKeys.title);
const LAND = pageRun('Logic/Land card', { model: {} }, '\n;Outputs.LAND_PLOT = LAND_PLOT; Outputs.LAND_ID = LAND_ID;');
const LP = LAND.LAND_PLOT;
const win = (model, id, robotId = 'r1') => pageRun('Logic/Complete request', { model, requestId: id, tricks: req(id).tricks, reward: req(id).reward, program: JSON.stringify(req(id).referenceProgram), robotId, now: 1759300000000 }).model;
const STEP_MS = Number((nodesOf('Workshop/Play').find((n) => n.id === 'plGarden') || { parameters: {} }).parameters.stepMs) || 380;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const readings = { mode: MODE, stepMs: STEP_MS };
const check = (name, ok, saw) => {
  results.push({ name, ok: !!ok, saw });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${typeof saw === 'string' ? saw : JSON.stringify(saw)}`}`);
};
const STUB = {
  status: { model: 'ready', reason: '', gpu: false, loadMs: 1, lastMs: 1, asked: 0, fallbacks: 0, busy: false, queued: 0, exam: { at: '2026-09-28T00:00:00.000Z', ms: 1, passed: 20, failed: 0, rungs: {} } },
  olive: () => ({ ok: true, text: 'Thank you! (stub)', ms: 5 })
};

withDeployedSite({ dir: DIR, ...CHROME }, async (page) => {
  const { client } = page;
  const evaluate = (expr) => page.evaluate(expr);
  const errors = [];
  client.on((msg) => {
    if (msg.method === 'Fetch.requestPaused') {
      const { requestId, request } = msg.params;
      const answer = /\/__garden\/olive\/status/.test(request.url) ? STUB.status : STUB.olive();
      client.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: 'application/json' }], body: Buffer.from(JSON.stringify(answer)).toString('base64') });
    }
    if (msg.method === 'Runtime.exceptionThrown') errors.push(String((msg.params.exceptionDetails && (msg.params.exceptionDetails.exception || {}).description) || msg.params.exceptionDetails.text).slice(0, 300));
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 300));
  });
  await client.send('Runtime.enable');
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
    if (SHOTS) await page.screenshot(path.join(SHOTS, `s9-${MODE}-${name}.png`));
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
  const hasText = (selector, needle) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null && e.innerText.trim().includes(${JSON.stringify(needle)}))`;
  const first = (selector) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null)`;
  const typeInto = async (finder, value) => {
    await evaluate(`(() => { const el = (${finder}); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); })()`);
    await wait(250);
  };
  const tab = (i) => tap(`document.querySelectorAll('.bg-tabs .bg-tab')[${i}]`, `tab ${i}`);
  const STORE_KEY = `Object.keys(localStorage).find((x) => /bot-garden/.test(x))`;
  const stored = () => evaluate(`(() => { const k = ${STORE_KEY}; try { return JSON.parse(localStorage.getItem(k)).model || null; } catch (e) { return null; } })()`);
  const storedRenderer = () => evaluate(`(() => { const k = ${STORE_KEY}; try { return JSON.parse(localStorage.getItem(k)).renderer || null; } catch (e) { return null; } })()`);
  const store = (model) => evaluate(`(() => { const k = ${STORE_KEY}; const v = JSON.parse(localStorage.getItem(k)); v.model = ${JSON.stringify(model)}; delete v.renderer; localStorage.setItem(k, JSON.stringify(v)); return true; })()`);
  const resetRenderer = () => evaluate(`(() => { const k = ${STORE_KEY}; if (!k) return; const v = JSON.parse(localStorage.getItem(k)); delete v.renderer; localStorage.setItem(k, JSON.stringify(v)); })()`);
  const CARD_UP = `(() => { const e = document.querySelector('.bg-card-help'); return !!e && e.offsetParent !== null; })()`;
  const gotIt = async (label) => {
    if (await evaluate(CARD_UP)) {
      await tap(first('.bg-card-help .bg-card-ok'), `Got it (${label})`);
      await until(CARD_UP, (v) => v === false, 2000);
    }
  };
  const WORLD = `(() => { const W = Noodl.Variables.gardenWorld; return W ? JSON.parse(JSON.stringify({ things: W.things || [], robots: W.robots || [] })) : null; })()`;
  const key = (slug) => first(`.bg-pad .bg-key-${slug}`);
  const press = async (slug, label, settle = STEP_MS + 150) => {
    await tap(key(slug), label || `the pad's ${slug}`);
    await wait(settle);
  };
  const activeOf = (m) => m && m.profiles.find((p) => p.id === m.island.activeId);
  const landHave = async () => {
    const m = await stored();
    const p = activeOf(m);
    return p && p.island.land ? p.island.land.buildings.map((b) => [b.bp, b.have]) : null;
  };
  const parts = async () => ((await evaluate(WORLD)) || { things: [] }).things.filter((t) => t.kind === 'site' && t.of).map((t) => [t.id, t.have, t.need]);

  const freshFamily = async (tag) => {
    const origin = await evaluate('location.origin');
    await client.send('Storage.clearDataForOrigin', { origin, storageTypes: 'local_storage,indexeddb,cache_storage,service_workers' });
    await page.navigate('/');
    await wait(900);
    await tap(first('button.bg-profile-new'), `new player (${tag})`);
    await typeInto(first('input'), 'Ada');
    await tap(hasText('.bg-seg-btn', '10–12'), `band 10–12 (${tag})`);
    await tap(hasText('button.bg-btn', w('en', 'create')), `create (${tag})`);
    await until('location.pathname', (p) => p === '/island');
    await wait(900);
  };
  /** Cobble lent (path-postbox won) and Pip home, then whatever the clause needs. */
  const seeded = async (more) => {
    let m = win(await stored(), 'path-postbox');
    for (const p of m.profiles) for (const k of Object.keys(p.island.plots)) if (p.island.plots[k].robotId === 'r1') p.island.plots[k] = { program: null, robotId: '', wonAt: p.island.plots[k].wonAt };
    if (more) m = more(m) || m;
    await store(m);
    await page.navigate('/island');
    await wait(1800);
  };
  const openQuest = async (id) => {
    await tab(0);
    await until('location.pathname', (p) => p === '/island');
    await wait(700);
    await tap(hasText('.bg-quest', titleOf('en', id)), `open ${id}`);
    await until('location.pathname', (p) => p === '/workshop', 4000);
    await until(`!!document.querySelector('.bg-blocks-box .gd-palette [data-pal="fwd"]')`, Boolean, 8000);
    await wait(900);
    await gotIt(id);
  };
  const openLand = async () => {
    await tab(0);
    await until('location.pathname', (p) => p === '/island', 3000);
    await wait(700);
    let opened = false;
    for (const [dx, dy] of [[2, 4], [1, 3], [5, 2], [6, 4], [1, 1], [2, 2]]) {
      await tap(`document.querySelector('.bg-isle .gd-cell[data-x="${LP.x + dx}"][data-y="${LP.y + dy}"]')`, 'her land');
      await wait(500);
      if (await evaluate(`(() => { const e = document.querySelector('.bg-plot-open'); return !!e && e.offsetParent !== null; })()`)) {
        opened = true;
        break;
      }
    }
    if (!opened) return false;
    await tap(first('.bg-plot-open'), 'Teach Pip here');
    await until('location.pathname', (p) => p === '/workshop', 4000);
    await until(`!!document.querySelector('.bg-blocks-box .gd-palette [data-pal="fwd"]')`, Boolean, 8000);
    await wait(900);
    await gotIt('her land');
    return true;
  };

  await page.setViewport({ name: '1420', width: 1420, height: 900, mobile: false });
  await freshFamily('s9');

  if (MODE === '3d') {
    // ── REND ──
    const ROOT3 = `document.querySelector('.bg-isle [data-gd3-world]')`;
    const islandIn3d = async (label, ms) => {
      await page.navigate('/island');
      const ready = await until(`(() => { const e = ${ROOT3}; return e ? e.getAttribute('data-ready') : null; })()`, (v) => v === 'true', 20000);
      check(`REND (${label}): Garden 3D is on the island`, ready === 'true', ready);
      const read = () => evaluate(`(() => { const e = ${ROOT3}; const k = ${STORE_KEY}; let r = null; try { r = JSON.parse(localStorage.getItem(k)).renderer || null; } catch (x) {}
          return { on3d: !!e, slow: !!(e && e.gd3 && e.gd3.tooSlow), flat: !!document.querySelector('.bg-isle .gd-world'), renderer: r }; })()`);
      // Until Too Slow has fired (or the island went flat), then 3 s more for its write to land — read AFTER that wait.
      const end = Date.now() + ms;
      let last = await read();
      while (Date.now() < end && !last.slow && !(last.renderer && last.renderer.mode === '2d')) {
        await wait(400);
        last = await read();
      }
      await wait(3000);
      last = await read();
      return last;
    };
    // Pip at work on the island (moving: a still scene counts no slow time).
    await store(win(await stored(), 'tulips-three'));
    await client.send('Emulation.setCPUThrottlingRate', { rate: 8 });
    await resetRenderer();
    const ctl = await islandIn3d('control, nothing chosen', 25000);
    readings.control = ctl;
    check('REND control: with nothing chosen, Too Slow fires here and the island goes flat ({2d, slow})', !!ctl && ctl.renderer && ctl.renderer.mode === '2d' && ctl.renderer.why === 'slow', ctl);
    await shot('control-flat');
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await tab(3);
    await until('location.pathname', (p) => p === '/grown-ups', 4000);
    await wait(800);
    await tap(hasText('.bg-renderer-switch .bg-seg-btn', w('en', 'guRend3d')), 'Grown-ups: 3D island');
    await wait(600);
    const chosen = await storedRenderer();
    const line = await evaluate(`(() => { const e = document.querySelector('.bg-renderer-line'); return e ? e.innerText.trim() : null; })()`);
    check('REND: Grown-ups → 3D island is kept as {3d, grown-up}', !!chosen && chosen.mode === '3d' && chosen.why === 'grown-up', chosen);
    check('REND: the panel says 3D stays even if this computer is slow', line === w('en', 'guRend3dKept'), line);
    await shot('grown-ups-3d-kept');
    await client.send('Emulation.setCPUThrottlingRate', { rate: 8 });
    const kept = await islandIn3d('grown-up 3D', 25000);
    readings.kept = kept;
    check('REND: Too Slow fired again on the island (known-firing beside the rule)', !!kept && kept.slow, kept);
    check('REND: … and the renderer is STILL {3d, grown-up}: Garden 3D on the stage, no flat garden', !!kept && kept.renderer && kept.renderer.mode === '3d' && kept.renderer.why === 'grown-up' && kept.on3d && !kept.flat, kept);
    await shot('grown-up-3d-held');
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  } else {
    // ── HINTS ──
    await openQuest('tulips-three');
    const owl = await evaluate(`(() => { const e = document.querySelector('[data-testid="owl-say"]'); return e ? e.innerText.trim() : null; })()`);
    const sub = await evaluate(`(() => { const e = ${first('.bg-ws-sub')}; return e ? e.innerText.trim() : null; })()`);
    readings.owl = owl;
    // The project's own hint (the page shows what Data/Hints says) — and, discriminating, what that line says: a block.
    const blocksFirst = [HINTS.hintEmpty, HINTS.hintStart].map((h) => String(h.en).split('{b}').join('Pip'));
    check('HINTS: the owl shows the project’s empty-program hint', blocksFirst.includes(owl), { owl, blocksFirst });
    check('HINTS: … and it leads with a block — no "arrows", no "press Teach"', !!owl && /block/i.test(owl) && !/arrows|press teach/i.test(owl), owl);
    check('HINTS: the request’s own line starts with the blocks, not "Drive Pip yourself first"', !!sub && /^Build Pip’s steps from the blocks/.test(sub), sub);
    await shot('hints');

    // ── BUILT ──
    await seeded((m) => {
      const p = activeOf(m);
      p.owned = Array.from(new Set([...(p.owned || []), 'spa']));
      p.island.land = { buildings: [{ id: 'b1', bp: 'spa', x: 3, y: 1, have: { stone: 5, plank: 4 } }], animals: [] };
      return m;
    });
    check('BUILT: her land’s card opens and Teach Pip here opens the Workshop on her land', await openLand(), 'not opened');
    const p0 = await parts();
    readings.partsAtOpen = p0;
    check('BUILT: the Workshop opens on what her save holds (5/6 stones, 4/4 planks)', JSON.stringify(p0) === JSON.stringify([['b1-stone', 5, 6], ['b1-plank', 4, 4]]), p0);
    await tap(first('.bg-controls .bg-i-rec'), 'Teach');
    await wait(500);
    await press('go-nearest-rock', 'go to the nearest rock', STEP_MS * 16);
    await press('pick', 'pick a stone');
    await press('go-to-site', 'go to the spa’s stones', STEP_MS * 16);
    await press('put', 'put the stone down');
    const afterPut = await parts();
    const savedNow = await landHave();
    readings.afterPut = { afterPut, savedNow };
    check('BUILT: the stone is in (6/6) and her save holds it AT ONCE — no Play, no page change', JSON.stringify(afterPut[0]) === JSON.stringify(['b1-stone', 6, 6]) && JSON.stringify(savedNow) === JSON.stringify([['spa', { stone: 6, plank: 4 }]]), readings.afterPut);
    await shot('built-put');
    const program = await evaluate('JSON.stringify(Noodl.Variables.gardenProgram || [])');
    await tap(first('.bg-controls .bg-i-reset'), 'Start over');
    await wait(1200);
    const afterReset = await parts();
    readings.afterReset = afterReset;
    check('BUILT: Start over — the spa is still 6/6 and 4/4 in the Workshop’s world', JSON.stringify(afterReset) === JSON.stringify([['b1-stone', 6, 6], ['b1-plank', 4, 4]]), afterReset);
    await shot('built-after-start-over');
    readings.programTaught = program;
    const savedAfterReset = await landHave();
    check('BUILT: … and her save still holds it', JSON.stringify(savedAfterReset) === JSON.stringify([['spa', { stone: 6, plank: 4 }]]), savedAfterReset);
    await tab(0);
    await until('location.pathname', (p) => p === '/island', 3000);
    await wait(1500);
    const isle = await evaluate(`(() => { const S = Noodl.Variables.gardenIsland; const L = S && S.live && S.live[${JSON.stringify(LAND.LAND_ID)}];
      const drawn = [...document.querySelectorAll('.bg-isle .gd-meter')].filter((e) => /^(b1-)/.test(e.getAttribute('data-id') || '') || e.getAttribute('data-kind') === 'site').map((e) => [e.getAttribute('data-id'), e.getAttribute('data-meter')]);
      const things = L ? L.things.filter((t) => t.kind === 'site').map((t) => [t.id, t.have, t.need, t.bstage]) : null;
      return { things, drawn }; })()`);
    readings.island = isle;
    const islandParts = (isle.things || []).map((t) => t.slice(0, 3));
    // The island's land plot: drawn from the save (no robot pinned there: its laid things) or its live job.
    const laid = await evaluate(`(() => { const W = Noodl.Variables.gardenIsland; if (!W) return null; const P = W.plots.find((p) => p.id === ${JSON.stringify(LAND.LAND_ID)}); const things = (P && P.start && P.start.things) || (P && P.things) || []; return things.filter((t) => t.kind === 'site').map((t) => [t.id, t.have, t.need]); })()`);
    readings.islandLaid = laid;
    const onIsland = islandParts.length ? islandParts : laid || [];
    check('BUILT: the island at once — the spa with every part full (6/6, 4/4)', JSON.stringify(onIsland) === JSON.stringify([['b1-stone', 6, 6], ['b1-plank', 4, 4]]), { live: isle, laid });
    await shot('built-island');
    check('BUILT: back on her land, still finished', (await openLand()) && JSON.stringify(await parts()) === JSON.stringify([['b1-stone', 6, 6], ['b1-plank', 4, 4]]), await parts());

    // A second building, by the pad in Drive (nothing remembered — but a part put down is built).
    await seeded((m) => {
      const p = activeOf(m);
      p.owned = Array.from(new Set([...(p.owned || []), 'refuge']));
      p.island.land = { buildings: [{ id: 'b2', bp: 'refuge', x: 3, y: 3, have: { plank: 0, stone: 0 } }], animals: [] };
      return m;
    });
    check('BUILT (Drive): the Workshop on her land with the refuge', await openLand(), 'not opened');
    await press('go-nearest-tree', 'go to the nearest tree', STEP_MS * 16);
    await press('pick', 'pick a plank');
    await press('go-to-site', 'go to the refuge (its planks)', STEP_MS * 16);
    await press('put', 'put the plank down');
    const d1 = await landHave();
    const dParts = await parts();
    readings.drive = { d1, dParts };
    check('BUILT (Drive): one plank in, saved at once', !!d1 && d1[0][1].plank === 1 && dParts.find((t) => t[0] === 'b2-plank')[1] === 1, readings.drive);
    await tap(first('.bg-controls .bg-i-reset'), 'Start over (Drive)');
    await wait(1200);
    const dReset = await parts();
    check('BUILT (Drive): Start over keeps the plank', (dReset.find((t) => t[0] === 'b2-plank') || [])[1] === 1, dReset);
    await shot('built-drive');
  }

  check('0 console errors', errors.length === 0, errors.slice(0, 5));
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} clauses passed`);
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ results, readings, errors }, null, 2));
  return failed;
})
  .then((failed) => process.exit(failed ? 1 : 0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
