#!/usr/bin/env node
/**
 * CG-003 / CG-007 — drive Olive's Island's six pages (template slug bot-garden) in a headless Chrome, on the DEPLOYED template.
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
 * Session 3 (lane LOOK): S3-R8 one island per kid (a sibling's win is not on yours; your robot only), S3-R6 the island is
 * the mockup's sea with pins at 1368×912 and 390×844 (no sideways overflow, innerWidth = the viewport) and a pin opens
 * its request, S3-R5 every text ≥ 4.5:1 measured live with getComputedStyle (with a known-firing probe), S3-RENAME the
 * robot renamed on My robot is the name on its pin and in the Workshop's line, S3-LOOK screenshots (look-*.png).
 * P106 IG-002 (s2): the tulips are fetch-and-return (the pond at the left edge, an empty can of three, a nine-block dance
 * folded to repeat 3) and win with "Perfect!"; the can shows 0, then 3/2/1/0 drops as the robot fills and pours, and a
 * pour from the empty can says it; the stones' rock shrinks big/big/medium/small/gone as it is mined, the stone rides on
 * the robot's back from the first pick until the last put, and the stones win with "Perfect!" after two folds — both
 * sizes, EN and FR (shots ig002-*.png).
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
/** The requests, from the project's own Data/Requests, so a pin's expected request is computed, not typed. */
function loadRequests(projectDir) {
  const nodes = JSON.parse(fs.readFileSync(path.join(projectDir, 'components', 'Data', 'Requests', 'nodes.json'), 'utf8'));
  const list = Array.isArray(nodes) ? nodes : nodes.nodes || Object.values(nodes);
  return JSON.parse(list.find((n) => n.type === 'Static Data').parameters.json);
}
const REQUESTS = loadRequests(PROJECT);
// IG-005: the robots' names (the catalogue the page ships, in Logic/Job robot), in both languages.
const ROBOT_NAMES = (() => {
  const nodes = JSON.parse(fs.readFileSync(path.join(PROJECT, 'components', 'Logic', 'Job robot', 'nodes.json'), 'utf8'));
  const list = Array.isArray(nodes) ? nodes : nodes.nodes || Object.values(nodes);
  const robots = JSON.parse(/var ROBOTS = (\[.*?\]);\n/.exec(String(list.find((n) => n.type === 'JavaScriptFunction').parameters.functionScript))[1]);
  return robots.flatMap((r) => [r.defaultName.en, r.defaultName.fr]);
})();
const titleOf = (lang, id) => w(lang, (REQUESTS.find((r) => r.id === id) || { copyKeys: {} }).copyKeys.title);
/** The hint lines, from the project's own Data/Hints (IG-002 reads "Perfect!" in both languages). */
function loadHints(projectDir) {
  const nodes = JSON.parse(fs.readFileSync(path.join(projectDir, 'components', 'Data', 'Hints', 'nodes.json'), 'utf8'));
  return JSON.parse((Array.isArray(nodes) ? nodes : nodes.nodes || Object.values(nodes)).find((n) => n.type === 'Static Data').parameters.json);
}
const HINT_ROWS = loadHints(PROJECT);
const hintIn = (lang, key, name = 'Pip') => String((HINT_ROWS.find((r) => r.key === key) || {})[lang] || '').split('{b}').join(name);
/** IG-001 D10 / IG-002: the pad's keys for a request — the pad's own order (cg003Content PAD_KEYS), filtered by the request's blocks. */
const PAD_ORDER = ['fwd', 'left', 'water', 'right', 'fill', 'pick', 'put'];
const padFor = (id) => PAD_ORDER.filter((op) => ((REQUESTS.find((r) => r.id === id) || { palette: [] }).palette || []).includes(op));
/** IG-002: the tulips' fetch-and-return dance, one pass (fill, turn round, walk, water, step down a row, walk back). */
const TULIP_DANCE = ['fill', 'left', 'left', 'fwd', 'water', 'right', 'fwd', 'right', 'fwd'];

/**
 * S3-R5: every text a person reads, on the ground under it, from getComputedStyle. For each visible text node: its
 * colour (alpha × the opacity of every element between it and its ground) over the first ancestor ground that is
 * opaque once the translucent ones above it are composited. A ground that is a picture or a gradient (the world's
 * tiles, the sea) with no opaque colour under the text is counted apart, never guessed. Exempt, and counted: a disabled
 * control, a hat still to earn (.bg-chip-lock), anything aria-hidden — WCAG 1.4.3's inactive components.
 */
const CONTRAST_JS = `(() => {
  const parse = (c) => { const m = String(c).match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  function ground(el) {
    let stack = [], opacity = 1, e = el;
    while (e && e.nodeType === 1) {
      const cs = getComputedStyle(e);
      const bg = parse(cs.backgroundColor);
      if (bg && bg.a > 0) { stack.push(bg); if (bg.a >= 0.999) { let g = stack.pop(); while (stack.length) g = over(stack.pop(), g); return { ground: g, opacity }; } }
      else if (cs.backgroundImage && cs.backgroundImage !== 'none' && !/^url\\("data:image\\/svg/.test(cs.backgroundImage)) return { picture: true };
      opacity *= Number(cs.opacity);
      e = e.parentElement;
    }
    let g = { r: 255, g: 255, b: 255, a: 1 }; while (stack.length) g = over(stack.pop(), g); return { ground: g, opacity };
  }
  function measure(el) {
    const cs = getComputedStyle(el);
    const fg = parse(cs.color); const at = ground(el);
    if (!fg || at.picture) return { picture: true };
    const ink = over({ ...fg, a: fg.a * at.opacity }, at.ground);
    return { ratio: Math.round(ratio(ink, at.ground) * 100) / 100, fg: hex(ink), bg: hex(at.ground), size: parseFloat(cs.fontSize), weight: cs.fontWeight };
  }
  // Known-firing: the mockup's own control orange under white words must read under 4.5 with this very instrument.
  const probe = document.createElement('div'); probe.textContent = 'probe'; probe.style.cssText = 'position:fixed;left:0;top:0;background:#FF9F1C;color:#fff'; document.body.appendChild(probe);
  const known = measure(probe); probe.remove();
  const out = { known: known.ratio, checked: 0, pictures: 0, exempt: 0, fails: [] };
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walk.nextNode())) {
    const t = n.textContent.trim();
    const el = n.parentElement;
    if (!t || !el || !/[A-Za-zÀ-ÿ0-9]/.test(t)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || (el.offsetParent === null && cs.position !== 'fixed')) continue;
    if (el.closest('[disabled], :disabled, .bg-chip-lock, [aria-hidden="true"], style, script')) { out.exempt++; continue; }
    const m = measure(el);
    if (m.picture) { out.pictures++; continue; }
    out.checked++;
    if (m.ratio < 4.5) out.fails.push({ text: t.slice(0, 40), ratio: m.ratio, fg: m.fg, bg: m.bg, cls: String(el.className || '').slice(0, 60) });
  }
  return out;
})()`;
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
  /** IG-001 (P106 s1): a scripted reply per rung (text, or a value for a shaped rung) and a hold before ONE rung's reply (never the hint voicings, or "thinking" would be the voicing), so a drive can watch a parked run. */
  /** IG-006 (P106 s2): a LIST scripts a rung's replies in turn (the vote); `fallback` names a rung that does not answer. */
  plan: { answers: {}, delayMs: 0, delayRung: '', counts: {}, fallback: '' },
  /** The rungs whose answer is a shaped VALUE (an enum word, a number), never prose. */
  shaped: { read: 1, 'is-it-a': 1, 'count-tulips': 1, maths: 1 },
  olive: (body) => {
    if (body && STUB.plan.fallback && body.rung === STUB.plan.fallback) return { ok: false, fallback: true, reason: 'no-model', ms: 5 };
    let scripted = body && STUB.plan.answers[body.rung];
    if (Array.isArray(scripted)) {
      const k = STUB.plan.counts[body.rung] || 0;
      STUB.plan.counts[body.rung] = k + 1;
      scripted = scripted[k % scripted.length];
    }
    if (scripted !== undefined) return { ok: true, ...(typeof scripted === 'string' && !/^(yes|no|oui|non)$/.test(scripted) && !STUB.shaped[body.rung] ? { text: scripted } : { value: scripted }), ms: 5 };
    return { ok: true, text: body && body.lang === 'fr' ? 'Merci, Mamie Rose ! (stub)' : 'Thank you, Mamie Rose! (stub)', ms: 5 };
  }
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
      const fulfil = () =>
        client.send('Fetch.fulfillRequest', {
          requestId,
          responseCode: 200,
          responseHeaders: [{ name: 'content-type', value: 'application/json' }],
          body: Buffer.from(JSON.stringify(answer)).toString('base64')
        });
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
  const text = () => evaluate('document.body.innerText');
  const path0 = () => evaluate('location.pathname');

  /** The element a finger would hit: a JS finder expression returning an element; its centre; elementFromPoint inside it. */
  const where = (finder, scroll = true) =>
    evaluate(`(() => { const el = (${finder}); if (!el) return { found: false };
      if (${scroll}) el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const at = document.elementFromPoint(x, y);
      return { found: true, x, y, w: r.width, h: r.height, hit: !!at && (el === at || el.contains(at)) }; })()`);
  const tap = async (finder, label) => {
    let p = await where(finder);
    for (let i = 0; i < 20 && !p.found; i++) {
      await wait(150);
      p = await where(finder);
    }
    // Settle, then measure again WITHOUT scrolling: the press goes where the element is now (s2: a card shifted under the press).
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
  /** Finders: by class, by text inside a scope. */
  const byText = (selector, needle) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null && e.innerText.trim().includes(${JSON.stringify(needle)}))`;
  const first = (selector) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null)`;
  /**
   * IG-004 (P106 s3): a request card opens the Workshop — unless the robot is at work on ANOTHER plot (a won request pins
   * it there): then the card opens the island's plot card, which says where it works and offers "bring {name} home".
   * This takes it home and taps the card again, so a clause that only wants the Workshop still gets there; every time
   * it had to is counted (readings.broughtHome). The island's own clauses (drive-ig004-island.js) grade the card itself.
   */
  const openQuest = async (needle, label, lent = false) => {
    const ok = await tap(byText('.bg-quest', needle), label);
    if (!ok) return false;
    const where = await until('location.pathname', (p) => p === '/workshop', 1500);
    if (where === '/workshop') return true;
    const home = await evaluate(`(() => { const b = document.querySelector('.bg-bring-home'); return !!b && b.offsetParent !== null; })()`);
    // IG-005 (P106 s4): a plot padlocked for a robot she has not been lent yet (a new family has Pip only). A clause that
    // only wants the Workshop gets there: the robots the requests need (read from the request data) are written into
    // her stored island as a lent robot's row, and the island is read again; every time it had to is counted
    // (readings.lent). drive-ig005-robots.js grades the lock, the lending and the robots themselves.
    if (!home && !lent && (await evaluate(`((document.querySelector('.bg-plot-line') || {}).innerText || '').indexOf('🔒') === 0`))) {
      readings.lent = (readings.lent || 0) + 1;
      await lendRobots();
      return openQuest(needle, `${label} (robots lent)`, true);
    }
    if (!home) return true;
    readings.broughtHome = (readings.broughtHome || 0) + 1;
    await tap(first('.bg-bring-home'), `bring the robot home (for ${label})`);
    await until(`(() => { const b = document.querySelector('.bg-plot-open'); return !!b && b.offsetParent !== null; })()`, Boolean, 4000);
    await wait(300);
    return tap(byText('.bg-quest', needle), `${label} (the robot home)`);
  };
  /** IG-005: every robot a request needs (the request data's `needs`), lent to the playing kid in her stored island. */
  const NEEDED_ROBOTS = [...new Set(REQUESTS.map((r) => r.needs).filter(Boolean))];
  const lendRobots = async () => {
    await evaluate(`(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); const v = JSON.parse(localStorage.getItem(k)); const m = v.model || v; const a = m.profiles.find((p) => p.id === m.island.activeId); a.island.robots = a.island.robots || [{ id: 'r1' }]; for (const kind of ${JSON.stringify(NEEDED_ROBOTS)}) if (!a.island.robots.some((r) => (r.kind || r.id) === kind)) a.island.robots.push({ id: kind, kind }); localStorage.setItem(k, JSON.stringify(v)); })()`);
    await page.navigate('/island');
    await wait(1100);
  };
  /** Types into the input the finder names; a missing input is a FAIL line, never a crash (s2's first run threw here). */
  const typeInto = async (finder, value, label = 'an input') => {
    const found = await evaluate(`!!(${finder})`);
    if (!found) {
      check(`type into ${label}`, false, 'no such input on the page');
      return false;
    }
    await evaluate(`(() => { const el = (${finder}); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); })()`);
    await wait(250);
    return true;
  };
  /**
   * A fresh family for each pass. 🔴 s2's first run cleared localStorage from inside the live page and the EN pass's
   * profile came back on the FR pass (the page still held and re-wrote it). The origin's storage is cleared through
   * CDP, then the page is loaded; if a profile still shows, that is a FAIL line and the pass goes on through the UI
   * (the bar's who pill opens Profiles).
   */
  const freshFamily = async (tag) => {
    const origin = await evaluate('location.origin');
    await client.send('Storage.clearDataForOrigin', { origin, storageTypes: 'local_storage,indexeddb,cache_storage,service_workers' });
    await page.navigate('/');
    await wait(900);
    const left = await evaluate(`Object.keys(localStorage).filter((k) => /bot-garden/.test(k)).map((k) => localStorage.getItem(k).length)`);
    const onProfiles = (await path0()) === '/';
    check(`fresh family ${tag}: no stored family, the app opens on Profiles`, left.length === 0 && onProfiles, { left, path: await path0() });
    if (!onProfiles) await tap(first('.bg-top .bg-who'), 'who is playing (back to Profiles)');
  };
  // IG-006: scoped to the steps' own list — a block's card draws its example with a second Block List.
  const blocks = () => evaluate(`document.querySelectorAll('.bg-blocks-box .gd-prog .gd-blk[data-id]').length`);
  const CARD_UP = `(() => { const e = document.querySelector('.bg-card-help'); return !!e && e.offsetParent !== null; })()`;
  const CARD = `(() => { const e = document.querySelector('.bg-card-help'); if (!e || e.offsetParent === null) return { up: false }; const t = (s) => { const x = e.querySelector(s); return x ? x.innerText.trim() : ''; }; return { up: true, title: t('.bg-card-title'), line: t('.bg-card-line'), example: e.querySelectorAll('.bg-card-eg .gd-blk[data-id]').length, eg: [...e.querySelectorAll('.bg-card-eg .gd-blk[data-id]')].map((b) => b.getAttribute('data-t')) }; })()`;
  /** A palette tap that places the block: the first tap on a kind opens its card (IG-006 AC5) — Got it, then tap again. */
  const palTap = async (id) => {
    const n0 = await blocks();
    await tap(first(`.bg-blocks-box .gd-palette [data-pal="${id}"]`), `palette ${id}`);
    await wait(200);
    if ((await blocks()) === n0 && (await evaluate(CARD_UP))) {
      await tap(first('.bg-card-help .bg-card-ok'), `Got it (${id})`);
      await until(CARD_UP, (v) => v === false, 2000);
      await tap(first(`.bg-blocks-box .gd-palette [data-pal="${id}"]`), `palette ${id} (its card seen)`);
      await wait(200);
    }
  };
  /** S3-R5 on the screen as it stands: every text ≥ 4.5:1, and the instrument fires on the mockup's own orange. */
  const contrastClause = async (screen) => {
    const c = await evaluate(CONTRAST_JS);
    readings[`contrast-${screen}`] = c;
    check(`S3-R5 ${screen}: every text on its ground ≥ 4.5:1 (${c.checked} texts, ${c.exempt} inactive exempt, ${c.pictures} on a picture)`, c.checked > 3 && c.fails.length === 0 && c.known < 4.5, c.fails.length ? c.fails.slice(0, 6) : c);
  };
  /**
   * IG-004 (R1 + R9, supersedes S3-R6's sea with pins): the island is ONE tile world, every request's plot on it — its
   * size read from the requests (every plot inside it), drawn by the flat Garden here (this Chrome has no WebGL2), the
   * three islanders on it; the requests beside it (under it on a phone); nothing wider than the screen.
   */
  const islandClause = async (vp) => {
    const r = await evaluate(`(() => { const box = (s) => { const e = document.querySelector(s); if (!e || e.offsetParent === null) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
      const world = document.querySelector('.bg-isle .gd-world'); const scroll = document.querySelector('.bg-isle-scroll');
      return { isle: box('.bg-isle'), quests: box('.bg-quest'), w: world ? Number(world.getAttribute('data-w')) : 0, h: world ? Number(world.getAttribute('data-h')) : 0, cells: document.querySelectorAll('.bg-isle .gd-cell').length, islanders: [...document.querySelectorAll('.bg-isle .gd-islander')].map((e) => e.getAttribute('data-who')).sort(), sea: !!document.querySelector('.bg-sea'), boxW: scroll ? scroll.clientWidth : 0, boxSW: scroll ? scroll.scrollWidth : 0, vw: innerWidth, sx: document.scrollingElement.scrollWidth }; })()`);
    readings[`island-${vp.name}`] = r;
    const needW = Math.max(...REQUESTS.map((q) => (q.plot ? q.plot.x + 8 : 0)));
    const needH = Math.max(...REQUESTS.map((q) => (q.plot ? q.plot.y + 6 : 0)));
    check(`IG-004 ${vp.name}: the island is one tile world (${r.w} × ${r.h}, every plot inside it: ≥ ${needW} × ${needH}), no sea with pins`, !r.sea && r.w >= needW && r.h >= needH && r.cells === r.w * r.h, r);
    check(`IG-004 ${vp.name}: the three islanders stand on it`, JSON.stringify(r.islanders) === JSON.stringify(['biscuit', 'mamie', 'sami']), r.islanders);
    check(`IG-004 ${vp.name}: the requests ${vp.width > 980 ? 'beside the island (360 px column)' : 'under the island (one column)'}`, !!r.quests && !!r.isle && (vp.width > 980 ? r.quests.l >= r.isle.r : r.quests.t >= r.isle.b), { isle: r.isle, quests: r.quests });
    check(`IG-004 ${vp.name}: nothing wider than the screen (innerWidth ${vp.width}, no sideways page scroll${vp.width <= 600 ? '; the island scrolls in its own box' : ''})`, r.vw === vp.width && r.sx <= r.vw && (vp.width > 600 || r.boxSW > r.boxW), { vw: r.vw, sx: r.sx, box: [r.boxW, r.boxSW] });
  };
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
    // IG-005: a robot's name is a name in both languages (the catalogue's, as Pip's is), like the islanders'.
    const same = before.filter((t) => after.includes(t) && !/Bot Garden|Olive|Pip|Rosie|Ada|Bo|Mamie Rose|Sami|Biscuit|EN|FR|7–9|10–12|Ok/.test(t) && !ROBOT_NAMES.includes(t));
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
      await freshFamily(tag);
      // Profiles, in the language asked for (AC9 on the Profiles screen, before anyone is chosen).
      if (lang === 'fr') {
        await seg('FR');
        await wait(700);
        // A language tap before anyone is chosen stays on Profiles and makes nobody (s2 drive: it went to the island).
        const after = await evaluate(`(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); let n = 0; try { const v = k ? JSON.parse(localStorage.getItem(k)) : null; n = v && v.model && Array.isArray(v.model.profiles) ? v.model.profiles.length : 0; } catch (e) { n = -1; } return { path: location.pathname, profiles: n }; })()`);
        check(`AC9 ${tag}: FR on an empty Profiles stays on Profiles with 0 profiles`, after.path === '/' && after.profiles === 0, after);
      }
      const who = await until('document.body.innerText', (t) => t.includes(w(lang, 'whoIsPlaying')));
      check(`AC3 ${tag}: Profiles says "${w(lang, 'whoIsPlaying')}"`, who.includes(w(lang, 'whoIsPlaying')), who.slice(0, 200));
      await shot(`ac3-${tag}-01-profiles`);
      await tap(first('button.bg-profile-new'), 'new player (the card)');
      if (!(await typeInto(first('input'), 'Ada', 'the name box'))) continue;
      await tap(byText('.bg-seg-btn', '10–12'), 'band 10–12 in the form');
      await tap(byText('button.bg-btn', w(lang, 'create')), 'create');
      const island = await until('location.pathname', (p) => p === '/island');
      check(`AC3 ${tag}: a new profile lands on the island`, island === '/island', island);
      await wait(600);
      await shot(`ac3-${tag}-02-island`);
      if (lang === 'en') {
        await islandClause(vp);
        await shot(`look-island-${vp.name}`);
      }

      // AC8: a reload lands on the island with the profile kept.
      await page.navigate('/island');
      await wait(900);
      const kept = await text();
      check(`AC8 ${tag}: reload /island keeps the island and the profile`, (await path0()) === '/island' && kept.includes('Ada'), { path: await path0(), hasName: kept.includes('Ada') });

      // The tulip request.
      await openQuest(w(lang, 'rqTulipsTitle'), 'the tulip request');
      const ws = await until('location.pathname', (p) => p === '/workshop');
      const title = await until(`(() => { const h = [...document.querySelectorAll('h1')].find((e) => e.offsetParent !== null); return h ? h.innerText : ''; })()`, (t) => t.includes(w(lang, 'rqTulipsTitle')));
      check(`AC3 ${tag}: the tulip request opens the workshop, titled with it`, ws === '/workshop' && title.includes(w(lang, 'rqTulipsTitle')), { path: ws, title });
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
        // A page wider than the phone is shrunk to fit by mobile Chrome: innerWidth grows and nothing scrolls (s2: 506).
        check(`AC4 ${lang}: the page lays out at the phone's own width (innerWidth 390, innerHeight 844)`, r.vw === vp.width && r.vh === vp.height, { vw: r.vw, vh: r.vh });
      }

      // Teach four steps, see four blocks.
      await control('rec');
      const padShown = await until(`!!document.querySelector('.bg-pad .bg-key-fwd')`, Boolean);
      check(`AC3 ${tag}: Teach shows the pad`, padShown, padShown);
      const taught = TULIP_DANCE;
      for (let k = 0; k < 4; k++) await key(taught[k]);
      const four = await until(`document.querySelectorAll('.gd-prog .gd-blk[data-id]').length`, (n) => n === 4);
      check(`AC3 ${tag}: four pad presses, four blocks`, four === 4, four);
      if (vp.name === '1368' && lang === 'en') {
        const keys = await evaluate(`[...document.querySelectorAll('.bg-pad .bg-key')].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })`);
        check(`AC5: the pad keys are ≥ 56 px (the tulips' ${padFor('tulips-three').length}: ${padFor('tulips-three').join(' ')})`, keys.length === padFor('tulips-three').length && keys.every(([a, b]) => a >= 56 && b >= 56), keys);
      }
      await shot(`ac3-${tag}-04-four-blocks`);
      for (let k = 4; k < taught.length * 3; k++) await key(taught[k % taught.length]);
      check(`AC3 ${tag}: ${taught.length * 3} presses (the fetch-and-return dance ×3), ${taught.length * 3} blocks`, (await blocks()) === taught.length * 3, await blocks());
      // The fold, offered in words, taken by the child.
      const tidy = await until(`(() => { const e = document.querySelector('.bg-tidy'); return e && e.offsetParent !== null ? e.innerText : ''; })()`, Boolean);
      check(`AC3 ${tag}: the fold is offered`, !!tidy, tidy);
      if (vp.name === '390') {
        const box = await evaluate(`(() => { const e = document.querySelector('.bg-blocks-box'); return e ? { sh: e.scrollHeight, ch: e.clientHeight, oy: getComputedStyle(e).overflowY } : null; })()`);
        check(`AC4 ${lang}: ${taught.length * 3} blocks scroll in their own box`, box && box.sh > box.ch && box.oy === 'auto', box);
      }
      if (tag === '1368-en') await contrastClause('workshop, the fold offered');
      await tap(first('.bg-tidy .bg-i-tidy'), 'Fold it');
      const folded = await until(`(() => { const r = document.querySelector('.gd-prog .gd-blk[data-t="repeat"]'); return r ? document.querySelectorAll('.gd-prog .gd-blk[data-id]').length : 0; })()`, (n) => n === taught.length + 1);
      check(`AC3 ${tag}: folded to one repeat holding the ${taught.length}-block dance (${taught.length + 1} blocks drawn)`, folded === taught.length + 1, folded);
      await shot(`ac3-${tag}-05-folded`);
      // Play to the win.
      await control('play');
      const won = await until(`(() => { const e = document.querySelector('.bg-win-card'); return !!e && e.offsetParent !== null; })()`, Boolean, 20000);
      check(`AC3 ${tag}: play waters the three tulips and the win card shows`, won, won);
      if (won) {
        const card = await evaluate(`(() => { const r = document.querySelector('.bg-win-card').getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, vw: innerWidth, vh: innerHeight, text: document.querySelector('.bg-win-card').innerText, pos: getComputedStyle(document.querySelector('.bg-win')).position }; })()`);
        readings[`win-${tag}`] = card;
        check(`AC3 ${tag}: the hat is on the win card`, card.text.includes(w(lang, 'hatSun')), card.text);
        // IG-002 AC3: the tulips' reference program (ten blocks, over MANY_BLOCKS) is "Perfect!", and the card says Neat.
        const owlNow = await until(`(document.querySelector('.bg-owl-say') || {}).innerText || ''`, (t) => t.includes(hintIn(lang, 'hintPerfect')), 4000);
        const neat = w(lang, 'winFew').split('{k}').join(String(taught.length + 1));
        check(`IG-002 AC3 ${tag}: the tulips won with their reference program say "${hintIn(lang, 'hintPerfect')}" and the card "${neat}"`, owlNow.includes(hintIn(lang, 'hintPerfect')) && card.text.includes(neat), { owlNow, card: card.text });
        // AC7: fixed and centred, even with the block list scrolled.
        await evaluate(`(() => { const b = document.querySelector('.bg-blocks-box'); if (b) b.scrollTop = b.scrollHeight; window.scrollTo(0, document.scrollingElement.scrollHeight); })()`);
        await wait(300);
        const again = await evaluate(`(() => { const r = document.querySelector('.bg-win-card').getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, vw: innerWidth, vh: innerHeight, pos: getComputedStyle(document.querySelector('.bg-win')).position }; })()`);
        check(`AC7 ${tag}: the win card is fixed and centred after scrolling`, again.pos === 'fixed' && Math.abs(again.cx - again.vw / 2) < 4 && Math.abs(again.cy - again.vh / 2) < 40, again);
        await shot(`ac3-${tag}-06-win`);
        if (tag === '1368-en') await contrastClause('the win card');
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
      // IG-006 (R7): Olive's FIVE lessons as cards (band 10–12), each with a title, its lesson, its question and Ask Olive.
      const lessonCards = await evaluate(`[...document.querySelectorAll('.bg-lesson')].filter((e) => e.offsetParent !== null).map((e) => ({ lines: e.innerText.trim().split('\\n').length, ask: !!e.querySelector('.bg-lesson-ask') }))`);
      check(`IG-006 AC6 ${tag}: Skills shows Olive’s 5 lessons, each with a title, a lesson, a question and Ask Olive`, lessonCards.length === 5 && lessonCards.every((c) => c.lines >= 4 && c.ask), lessonCards);
      await shot(`ac3-${tag}-08-skills`);
      check(`AC3 ${tag}: 0 console errors so far`, page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
      check(`AC3 ${tag}: 0 network errors so far`, page.networkErrors.length === 0, page.networkErrors.slice(0, 5));
    }
  }

  // ── IG-002 (P106 s2): resources, driven by hand at both sizes, EN and FR, on the family made above (band 10–12). ──
  // The tulips: the can is empty at the start (0 of 3 drops), full after fill, and 2, 1, 0 as the robot waters; a fourth
  // pour from the empty can says so and leaves no puddle. The stones: the rock beside the start is big, big, medium,
  // small, gone as it is mined; the stone rides on the robot's back from the first pick until the last put; two folds make
  // the reference program and Play wins with "Perfect!". Every reading is an element a child sees (the kit's classes).
  {
    const gaugeExpr = `(() => { const g = document.querySelector('.bg-stage .gd-bot .gd-can'); return g ? { can: g.getAttribute('data-can'), max: g.getAttribute('data-can-max'), full: g.querySelectorAll('svg.gd-drop-full').length, empty: g.querySelectorAll('svg.gd-drop-empty').length } : null; })()`;
    const rockExpr = (x, y) => `(() => { const c = document.querySelector('.bg-stage .gd-cell[data-x="${x}"][data-y="${y}"]'); const r = c && c.querySelector('svg.gd-thing.gd-boulder'); return r ? { size: ((r.getAttribute('class') || '').match(/gd-boulder-(big|mid|small)/) || [])[1], left: r.getAttribute('data-left'), sprite: r.getAttribute('data-sprite') } : null; })()`;
    const loadExpr = `(() => { const l = document.querySelector('.bg-stage .gd-bot .gd-load'); return l ? { load: l.getAttribute('data-load'), carry: l.getAttribute('data-carry'), svg: !!l.querySelector('svg.gd-sprite[data-sprite]') } : null; })()`;
    const bubbleExpr = `(() => { const b = document.querySelector('.bg-stage .gd-bubble'); return b ? b.innerText : ''; })()`;
    const owlExpr = `(document.querySelector('.bg-owl-say') || {}).innerText || ''`;
    const padOpsNow = () => evaluate(`[...document.querySelectorAll('.bg-pad .bg-key')].filter((e) => e.offsetParent !== null).map((e) => (e.className.match(/bg-key-(fwd|left|right|water|pick|put|fill)/) || [])[1])`);
    const tidyShown = `(() => { const e = document.querySelector('.bg-tidy'); return !!e && e.offsetParent !== null; })()`;
    const SHOT_TAGS = ['1368-en', '390-fr'];
    for (const vp of VIEWPORTS) {
      for (const lang of LANGS) {
        const tag = `${vp.name}-${lang}`;
        await page.setViewport(vp);
        await wait(400);
        await seg(lang === 'fr' ? 'FR' : 'EN');
        await wait(500);
        const openRequest = async (key, label) => {
          await tab(0);
          await until('location.pathname', (p) => p === '/island');
          await wait(600);
          await openQuest(w(lang, key), label);
          await until('location.pathname', (p) => p === '/workshop');
          await wait(900);
        };

        // The tulips: the can.
        await openRequest('rqTulipsTitle', `the tulips (IG-002 ${tag})`);
        const g0 = await until(gaugeExpr, Boolean, 3000);
        await control('rec');
        await until(`!!document.querySelector('.bg-pad .bg-key-fill')`, Boolean, 3000);
        const tulipPad = await padOpsNow();
        check(`IG-002 ${tag}: the tulips’ pad has fill beside water (${padFor('tulips-three').join(' ')})`, JSON.stringify(tulipPad) === JSON.stringify(padFor('tulips-three')), tulipPad);
        // Teach: fill, turn round, step, water three times — the gauge read after each press (the Teach world).
        const pours = [];
        await key('fill');
        pours.push(await until(gaugeExpr, (g) => !!g && g.can === '3', 2500));
        if (SHOT_TAGS.includes(tag)) await shot(`ig002-${tag}-can-3`);
        for (const op of ['left', 'left', 'fwd']) await key(op);
        for (let k = 0; k < 3; k++) {
          await key('water');
          pours.push(await until(gaugeExpr, (g) => !!g && g.can === String(2 - k), 2500));
        }
        const wetTulip = await evaluate(`!!document.querySelector('.bg-stage .gd-cell[data-x="3"][data-y="1"] .gd-wet')`);
        if (SHOT_TAGS.includes(tag)) await shot(`ig002-${tag}-can-0`);
        // The fourth pour, from the empty can, onto the grass above (turn first: four waters in a row would be the fold
        // nudge, which outranks every other hint by the ladder's design). A can with water in it would make a puddle there.
        await key('left');
        await key('water');
        await control('rec'); // done teaching: nine blocks, the last a pour from the empty can
        check(`IG-002 AC4 ${tag}: the can is empty at the start (0 of 3 drops) and shows 3, 2, 1, 0 drops as the robot fills and waters`, !!g0 && g0.can === '0' && g0.full === 0 && g0.empty === 3 && pours.map((g) => (g ? g.full : -1)).join(',') === '3,2,1,0' && pours.every((g) => !!g && g.full + g.empty === 3 && g.max === '3') && wetTulip, { g0, pours, wetTulip });
        // Play: the Runner speaks each step (a Teach press speaks nothing — the page's Record step has no bubble wire).
        await control('play');
        const fullSaid = await until(bubbleExpr, (t) => t === w(lang, 'sayFill'), 5000);
        const played = [];
        for (const want of ['2', '1', '0']) played.push(await until(gaugeExpr, (g) => !!g && g.can === want, 6000));
        const drySaid = await until(bubbleExpr, (t) => t === w(lang, 'sayDry'), 5000);
        if (SHOT_TAGS.includes(tag)) await shot(`ig002-${tag}-dry`);
        const afterDry = await evaluate(gaugeExpr);
        const puddles = await evaluate(`document.querySelectorAll('.bg-stage [data-puddle]').length`);
        const dryHint = await until(owlExpr, (t) => t.includes(hintIn(lang, 'hintDry')), 6000);
        readings[`ig002-can-${tag}`] = { g0, pours, played, afterDry, fullSaid, drySaid, puddles, dryHint };
        check(`IG-002 AC1 ${tag}: played, fill says "${w(lang, 'sayFill')}", the can pours 2, 1, 0, and the fourth pour from the empty can says "${w(lang, 'sayDry')}", stays 0, makes no puddle, and the owl says "${hintIn(lang, 'hintDry')}"`, fullSaid === w(lang, 'sayFill') && played.map((g) => (g ? g.full : -1)).join(',') === '2,1,0' && drySaid === w(lang, 'sayDry') && !!afterDry && afterDry.can === '0' && puddles === 0 && dryHint.includes(hintIn(lang, 'hintDry')), { fullSaid, played, drySaid, afterDry, puddles, dryHint });
        await until(`!document.querySelector('.gd-locked')`, Boolean, 8000);
        await wait(300);

        // The stones: the rock mined, the load on the back, the reference program, Perfect.
        await openRequest('rqStonesTitle', `the stones (IG-002 ${tag})`);
        const rocks = [await until(rockExpr(2, 2), Boolean, 3000)];
        const noCan = await evaluate(gaugeExpr);
        await control('rec');
        await until(`!!document.querySelector('.bg-pad .bg-key-pick')`, Boolean, 3000);
        const stonesPad = await padOpsNow();
        check(`IG-002 ${tag}: the stones’ pad has pick and put, no water, no fill (${padFor('path-stones').join(' ')}); the robot has no can here (no drops)`, JSON.stringify(stonesPad) === JSON.stringify(padFor('path-stones')) && noCan === null, { stonesPad, noCan });
        await key('left');
        const loads = [];
        for (let k = 0; k < 4; k++) {
          await key('pick');
          const want = [3, 2, 1, 0][k];
          rocks.push(await until(rockExpr(2, 2), (r) => (want >= 1 ? !!r && r.left === String(want) : r === null), 2000));
          loads.push(await until(loadExpr, (l) => !!l && l.carry === String(k + 1), 2000));
          if (k === 1 && SHOT_TAGS.includes(tag)) await shot(`ig002-${tag}-rock-mid`);
        }
        if (SHOT_TAGS.includes(tag)) await shot(`ig002-${tag}-mined`);
        check(`IG-002 AC4 ${tag}: the rock shrinks as it is mined — big (4), big (3), medium (2), small (1), then gone`, rocks.map((r) => (r ? r.size : 'gone')).join(',') === 'big,big,mid,small,gone' && rocks[0].left === '4', rocks);
        check(`IG-002 AC4 ${tag}: after pick a stone is on the robot’s back (an svg, the kit’s class), carrying 1, 2, 3, 4`, loads.every((l, i) => !!l && l.load === 'stone' && l.svg && l.carry === String(i + 1)), loads);
        await key('right');
        const puts = [];
        for (let k = 0; k < 4; k++) {
          await key('put');
          puts.push(await until(loadExpr, (l) => (k < 3 ? !!l && l.carry === String(3 - k) : l === null), 2000));
          await key('fwd');
        }
        const laid = await evaluate(`document.querySelectorAll('.bg-stage svg.gd-thing.gd-stone[data-sprite="stone"]').length`);
        if (SHOT_TAGS.includes(tag)) await shot(`ig002-${tag}-laid`);
        check(`IG-002 AC4 ${tag}: put by put the load goes down (3, 2, 1) and after the fourth the back is empty; four stone sprites on the path`, puts.slice(0, 3).map((l) => (l ? l.carry : '-')).join(',') === '3,2,1' && puts[3] === null && laid === 4, { puts, laid });
        for (let f = 0; f < 2; f++) {
          await until(tidyShown, Boolean, 3000);
          await tap(first('.bg-tidy .bg-i-tidy'), `Fold it (the stones ${f + 1}, ${tag})`);
          await wait(300);
        }
        const seven = await until(`document.querySelectorAll('.gd-prog .gd-blk[data-id]').length`, (n) => n === 7, 3000);
        await control('play');
        const perfect = await until(owlExpr, (t) => t.includes(hintIn(lang, 'hintPerfect')), 15000);
        const won = await until(`(() => { const e = document.querySelector('.bg-win-card'); return !!e && e.offsetParent !== null; })()`, Boolean, 6000);
        if (SHOT_TAGS.includes(tag)) await shot(`ig002-${tag}-stones-perfect`);
        check(`IG-002 AC3 ${tag}: path-stones mined, laid, folded twice to the reference (7 blocks) wins with "${hintIn(lang, 'hintPerfect')}"`, seven === 7 && won && perfect.includes(hintIn(lang, 'hintPerfect')), { seven, won, perfect });
        if (won) await tap(byText('.bg-win-card button', w(lang, 'winStay')), 'Keep tinkering');
        await wait(400);
        check(`IG-002 ${tag}: 0 console errors so far`, page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
      }
    }
  }

  // ── IG-006 (P106 s2): Olive reads — AC1 the palette, AC5 the cards, AC2 Mamie's note, AC3 the vote, AC7 the after-run
  // line, AC6 the lessons; at both sizes, in both languages, on the stub (the page's in-Chrome one, scripted per rung). ──
  {
    const oliveIds = () => evaluate(`[...document.querySelectorAll('.bg-blocks-box .gd-palette [data-pal^="olive:"]')].filter((e) => e.offsetParent !== null).map((e) => [e.getAttribute('data-pal'), e.innerText.trim()])`);
    const owlSay = () => evaluate(`(document.querySelector('.bg-owl-say') || {}).innerText || ''`);
    const openReq = async (lang, id) => {
      await tab(0);
      await until('location.pathname', (p) => p === '/island');
      await wait(700);
      await openQuest(id === 'free' ? w(lang, 'sandP').slice(0, 10) : titleOf(lang, id), `open ${id}`);
      await until('location.pathname', (p) => p === '/workshop');
      await until(`!!document.querySelector('.bg-blocks-box .gd-palette [data-pal="fwd"]')`, Boolean, 6000);
      await wait(700);
    };
    /** The id of the last top-level container of a kind in the steps' list. */
    const lastRep = (t) => evaluate(`(() => { const r = [...document.querySelectorAll('.bg-blocks-box .gd-prog > .gd-rep')].filter((e) => { const b = e.querySelector(':scope > .gd-hd .gd-blk'); return b && b.getAttribute('data-t') === ${JSON.stringify(t)}; }); return r.length ? r[r.length - 1].getAttribute('data-rep') : ''; })()`);
    /** Tap a container's icon: the kit takes it as the place new blocks go (tap again to let go). */
    const pickRep = (id, label) => tap(`document.querySelector('.bg-blocks-box .gd-rep[data-rep="${id}"] > .gd-hd .gd-blk > svg')`, label);
    const repSelected = (id) => evaluate(`(document.querySelector('.bg-blocks-box .gd-rep[data-rep="${id}"]') || {}).getAttribute ? document.querySelector('.bg-blocks-box .gd-rep[data-rep="${id}"]').getAttribute('data-sel') : ''`);
    const slotOn = async (blockSel, key, value, label) => {
      await tap(first(`${blockSel} .gd-slot[data-slot="${key}"]`), `${label}: slot ${key}`);
      await tap(first(`.bg-blocks-box .gd-picker .gd-opt[data-opt="${value}"]`), `${label}: ${value}`);
    };
    const ifInto = async (sensor, body, label) => {
      await palTap('if');
      const id = await lastRep('if');
      await slotOn(`.bg-blocks-box .gd-rep[data-rep="${id}"] > .gd-hd`, 'sensor', sensor, label);
      await pickRep(id, `${label}: take the if`);
      if ((await repSelected(id)) !== '1') await pickRep(id, `${label}: take the if (again)`);
      for (const op of body) await palTap(op);
      await pickRep(id, `${label}: let the if go`);
      return id;
    };
    const cellTulip = (x, y) => evaluate(`(() => { const t = document.querySelector('.bg-stage .gd-cell[data-x="${x}"][data-y="${y}"] .gd-tulip'); return t ? (t.getAttribute('class').includes('gd-wet') ? 'wet' : 'dry') : 'none'; })()`);
    const bubbleAfterPlay = async (want, ms = 9000) => {
      await control('play');
      const b = await until(`[...document.querySelectorAll('.bg-stage .gd-bubble.gd-olive')].map((e) => e.innerText.trim()).join(' | ')`, (t) => t.includes(want), ms);
      await until(`!document.querySelector('.bg-blocks-box .gd-locked')`, Boolean, 15000);
      await wait(900);
      return b;
    };
    for (const vp of VIEWPORTS) {
      for (const lang of LANGS) {
        const tag = `IG-006 ${vp.name}-${lang}`;
        const shots = (vp.name === '1368' && lang === 'en') || (vp.name === '390' && lang === 'fr');
        await page.setViewport(vp);
        // A reload: the cards a child has seen are this session's, so each pass starts with none seen.
        await page.navigate('/island');
        await wait(1100);
        await seg(lang === 'fr' ? 'FR' : 'EN');
        await wait(600);
        // AC1 — free play at 10–12: exactly the three, labelled, the owl's colour; 7–9: none.
        await openReq(lang, 'free');
        const olive = await oliveIds();
        const want = [['olive:say-thanks', w(lang, 'rungSayThanks')], ['olive:read', w(lang, 'rungRead')], ['olive:is-it-a', w(lang, 'rungIsItA')]];
        check(`${tag} AC1: band 10–12 lists exactly say, read, is it a…? under Olive`, JSON.stringify(olive) === JSON.stringify(want), { olive, want });
        const anyAsk = await evaluate(`[...document.querySelectorAll('[data-pal], [data-t]')].map((e) => e.getAttribute('data-pal') || e.getAttribute('data-t')).filter((v) => /^ask:/.test(v))`);
        check(`${tag} AC1: no ask:<rung> block anywhere on the page`, anyAsk.length === 0, anyAsk);
        await seg('7–9');
        await wait(700);
        const young = await oliveIds();
        await seg('10–12');
        await wait(700);
        check(`${tag} AC1: band 7–9 lists no Olive block`, young.length === 0, young);
        // AC5 — the first tap opens the card and places nothing; Got it; the next tap places it; its ? reopens it.
        const n0 = await blocks();
        await tap(first('.bg-blocks-box .gd-palette [data-pal="olive:read"]'), 'read (first tap)');
        const card = await until(CARD, (c) => c.up, 2500);
        check(`${tag} AC5: the first tap on “read” opens its card — title, line, the example as blocks — and places nothing`, card.up && card.title === w(lang, 'rungRead') && card.line === w(lang, 'cdOliveRead') && JSON.stringify(card.eg) === JSON.stringify(['olive:read', 'if', 'water']) && (await blocks()) === n0, card);
        if (shots) await shot(`ig006-ac5-card-${vp.name}-${lang}`);
        await tap(first('.bg-card-help .bg-card-ok'), 'Got it');
        const closed = await until(CARD, (c) => !c.up, 2000);
        check(`${tag} AC5: “Got it” closes the card and places nothing`, !closed.up && (await blocks()) === n0, closed);
        await tap(first('.bg-blocks-box .gd-palette [data-pal="olive:read"]'), 'read (next tap)');
        const placed = await until(`document.querySelectorAll('.bg-blocks-box .gd-prog .gd-blk[data-t="olive:read"]').length`, (n) => n === 1, 2000);
        check(`${tag} AC5: the next tap places the block, no card`, placed === 1 && !(await evaluate(CARD_UP)), placed);
        const chips = await until(`[...document.querySelectorAll('.bg-help-chip')].filter((e) => e.offsetParent !== null).map((e) => e.innerText.trim())`, (l) => l.length > 0, 2000);
        await tap(byText('.bg-help-chip', w(lang, 'rungRead')), 'the ? of read');
        const again = await until(CARD, (c) => c.up, 2000);
        check(`${tag} AC5: a ? beside the placed kind reopens its card`, chips.includes('? ' + w(lang, 'rungRead')) && again.up && again.title === w(lang, 'rungRead'), { chips, again });
        await tap(first('.bg-card-help .bg-card-ok'), 'Got it (again)');
        await until(CARD_UP, (v) => v === false, 2000);
        await tap(first('.bg-blocks-box .gd-palette [data-pal="fwd"]'), 'forward (first tap)');
        const fwdCard = await until(CARD, (c) => c.up, 2000);
        check(`${tag} AC5: a plain block has its card too — forward’s`, fwdCard.up && fwdCard.title === w(lang, 'bFwd') && fwdCard.line === w(lang, 'cdFwd') && (await blocks()) === 1, fwdCard);
        await tap(first('.bg-card-help .bg-card-ok'), 'Got it (forward)');
        await until(CARD_UP, (v) => v === false, 2000);

        // AC2 — Mamie's note: read; forward twice; if Olive read the red tulip { left, water, right }; if the yellow { right,
        // water, left }. The stub says "red tulip": the red one is watered, the yellow one not; the bubble says what she read.
        STUB.plan.answers.read = lang === 'fr' ? 'tulipe rouge' : 'red tulip';
        await openReq(lang, 'mamie-note');
        const note = await evaluate(`({ things: document.querySelectorAll('.bg-stage .gd-thing').length, tulips: document.querySelectorAll('.bg-stage .gd-tulip').length })`);
        readings[`ig006-note-world-${vp.name}-${lang}`] = note;
        // The merge (IG-006 × IG-002): the rows the note names are the colours a child sees, and the note itself is drawn.
        const colours = await evaluate(`(() => { const s = (x, y) => { const e = document.querySelector('.bg-stage .gd-cell[data-x="' + x + '"][data-y="' + y + '"] .gd-tulip'); return e ? e.getAttribute('data-sprite') : null; }; return { red: [s(2, 2), s(4, 2), s(6, 2)], yellow: [s(2, 4), s(4, 4), s(6, 4)], note: document.querySelectorAll('.bg-stage svg[data-sprite="note"]').length }; })()`);
        check(`${tag} merge: the red row draws red and the yellow row yellow, and the note is drawn on the plot`, colours.red.every((v) => v === 'tulip') && colours.yellow.every((v) => v === 'tulipYellow') && colours.note === 1, colours);
        for (const op of ['olive:read', 'fwd', 'fwd']) await palTap(op);
        await ifInto('olive_read:red_tulip', ['left', 'water', 'right'], 'if red');
        await ifInto('olive_read:yellow_tulip', ['right', 'water', 'left'], 'if yellow');
        const prog = await evaluate(`[...document.querySelectorAll('.bg-blocks-box .gd-prog .gd-blk[data-id]')].map((b) => b.getAttribute('data-t')).join(' ')`);
        const readsBefore = stubCalls.filter((c) => c.body && c.body.rung === 'read').length;
        const readBubble = await bubbleAfterPlay(w(lang, 'oliveReadSay').replace('{x}', STUB.plan.answers.read));
        const readCall = stubCalls.filter((c) => c.body && c.body.rung === 'read').slice(readsBefore);
        const rows = { red: await cellTulip(2, 2), yellow: await cellTulip(2, 4) };
        if (shots) await shot(`ig006-ac2-note-${vp.name}-${lang}`);
        check(`${tag} AC2: the program is built through the kit (read, forward ×2, two ifs)`, prog === 'olive:read fwd fwd if left water right if right water left', prog);
        check(`${tag} AC2: read sends the note on the plot, in the language, with the plot’s two tulips as the choices — once`, readCall.length === 1 && readCall[0].body.slots.note === (lang === 'fr' ? 'Les rouges, pas les jaunes.' : 'The red ones, not the yellow.') && JSON.stringify(readCall[0].body.options) === JSON.stringify(lang === 'fr' ? ['tulipe rouge', 'tulipe jaune'] : ['red tulip', 'yellow tulip']), readCall.map((c) => c.body));
        check(`${tag} AC2: the bubble says “${w(lang, 'oliveReadSay').replace('{x}', STUB.plan.answers.read)}”`, readBubble.includes(w(lang, 'oliveReadSay').replace('{x}', STUB.plan.answers.read)), readBubble);
        check(`${tag} AC2: “if Olive read the red tulip” — the red row is watered and the yellow one is not`, rows.red === 'wet' && rows.yellow === 'dry', rows);
        const noteLine = await owlSay();
        check(`${tag} AC7: after the run the owl names the block asked (read the note)`, noteLine.includes(lang === 'fr' ? 'Olive a lu le mot' : 'Olive read the note'), noteLine);
        delete STUB.plan.answers.read;

        // AC3 — the rock and the flowers: forward, left, is it a…? (a flower, 3 times), if Olive says yes { water }. The
        // stub says yes, no, yes: three asks about the red tulip the ENGINE names, "2 of 3 said yes", and the tulip drinks.
        const yes = lang === 'fr' ? 'oui' : 'yes', no = lang === 'fr' ? 'non' : 'no';
        STUB.plan.answers['is-it-a'] = [yes, no, yes];
        STUB.plan.counts['is-it-a'] = 0;
        await openReq(lang, 'rock-flower');
        for (const op of ['fwd', 'left', 'olive:is-it-a']) await palTap(op);
        const isa = '.bg-blocks-box .gd-prog .gd-blk[data-t="olive:is-it-a"]';
        await slotOn(isa, 'kind', lang === 'fr' ? 'une fleur' : 'a flower', 'is it a…?');
        await slotOn(isa, 'times', '3', 'is it a…?');
        await ifInto('olive_says:yes', ['water'], 'if Olive says yes');
        const asked0 = stubCalls.filter((c) => c.body && c.body.rung === 'is-it-a').length;
        const vote = await bubbleAfterPlay(w(lang, 'oliveVote').replace('{n}', '2').replace('{of}', '3').replace('{x}', yes));
        const votes = stubCalls.filter((c) => c.body && c.body.rung === 'is-it-a').slice(asked0).map((c) => c.body.slots);
        const flower = await cellTulip(1, 2);
        if (shots) await shot(`ig006-ac3-vote-${vp.name}-${lang}`);
        check(`${tag} AC3: ask 3 times — three asks, each about the thing the engine names ahead (${lang === 'fr' ? 'une tulipe rouge' : 'a red tulip'}), never a slot`, votes.length === 3 && votes.every((v) => v.thing === (lang === 'fr' ? 'une tulipe rouge' : 'a red tulip') && v.kind === (lang === 'fr' ? 'une fleur' : 'a flower')), votes);
        check(`${tag} AC3: the robot shows “${w(lang, 'oliveVote').replace('{n}', '2').replace('{of}', '3').replace('{x}', yes)}”, and the majority waters`, vote.includes(w(lang, 'oliveVote').replace('{n}', '2').replace('{of}', '3').replace('{x}', yes)) && flower === 'wet', { vote, flower });
        const isaLine = await owlSay();
        check(`${tag} AC7: after the run the owl names the block asked (is it a…?)`, isaLine.includes(lang === 'fr' ? 'Olive a dit si ce qui est devant' : 'Olive said whether the thing ahead'), isaLine);
        STUB.plan.answers['is-it-a'] = [yes, no, no];
        STUB.plan.counts['is-it-a'] = 0;
        const one = await bubbleAfterPlay(w(lang, 'oliveVote1').replace('{n}', '1').replace('{of}', '3').replace('{x}', yes));
        check(`${tag} AC3: 1 of 3 said yes — the majority is no, the tulip stays dry`, one.includes(w(lang, 'oliveVote1').replace('{n}', '1').replace('{of}', '3').replace('{x}', yes)) && (await cellTulip(1, 2)) === 'dry', { one });
        // AC7 — she does not answer (the fallback): the line says she was resting, and names the block.
        STUB.plan.fallback = 'is-it-a';
        await control('play');
        await until(`!document.querySelector('.bg-blocks-box .gd-locked')`, Boolean, 15000);
        const rest = await until(`(document.querySelector('.bg-owl-say') || {}).innerText || ''`, (t) => /resting|repose/.test(t), 4000);
        check(`${tag} AC7: when the written answer stood in, the owl says she was resting — and names “${w(lang, 'rungIsItA')}”`, /resting|repose/.test(rest) && rest.includes(w(lang, 'rungIsItA')), rest);
        STUB.plan.fallback = '';
        delete STUB.plan.answers['is-it-a'];
        if (shots) await shot(`ig006-ac7-resting-${vp.name}-${lang}`);

        // AC6 — Olive's lessons on Skills: each card asks its canned question; the check sits under her answer.
        STUB.plan.answers['count-tulips'] = 6;
        STUB.plan.answers.maths = 14;
        STUB.plan.answers['no-letter-e'] = lang === 'fr' ? 'La tulipe est une belle fleur rouge.' : 'The tulip is a lovely red flower.';
        STUB.plan.answers['tall-tales'] = lang === 'fr' ? 'Sydney !' : 'Sydney!';
        STUB.plan.answers.translate = 'Les tulipes sont vif.';
        await tab(3);
        await until('location.pathname', (p) => p === '/skills');
        await wait(900);
        const cards = await evaluate(`[...document.querySelectorAll('.bg-lesson')].filter((e) => e.offsetParent !== null).length`);
        for (let i = 0; i < 5; i++) await tap(`[...document.querySelectorAll('.bg-lesson')].filter((e) => e.offsetParent !== null)[${i}].querySelector('.bg-lesson-ask')`, `Ask Olive (lesson ${i + 1})`);
        await wait(900);
        const lessons = await evaluate(`[...document.querySelectorAll('.bg-lesson')].filter((e) => e.offsetParent !== null).map((e) => ({ text: e.innerText, marked: [...e.querySelectorAll('.bg-letter')].filter((x) => x.offsetParent !== null && getComputedStyle(x).backgroundColor !== 'rgba(0, 0, 0, 0)').map((x) => x.innerText.trim()) }))`);
        const hasAll = (i, needles) => !!lessons[i] && needles.every((n) => lessons[i].text.includes(n));
        const saysX = (x) => w(lang, 'oliveSaysBubble').replace('{x}', x);
        check(`${tag} AC6: five lessons, each answered by Ask Olive`, cards === 5 && lessons.length === 5, { cards, n: lessons.length });
        check(`${tag} AC6: count the tulips — Olive says 6, the program counts 4`, hasAll(0, [saysX('6'), w(lang, 'lsCheck7').replace('{n}', '4')]), lessons[0] && lessons[0].text);
        check(`${tag} AC6: 14 + 9 — Olive says 14, the rule says 23`, hasAll(1, [saysX('14'), w(lang, 'lsCheck8').replace('{n}', '23')]), lessons[1] && lessons[1].text);
        const eWant = [...STUB.plan.answers['no-letter-e']].filter((c) => c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() === 'e').length;
        check(`${tag} AC6: no letter e — the page marks EVERY e in her sentence (${eWant}) and says so`, !!lessons[2] && lessons[2].marked.length === eWant && lessons[2].marked.every((c) => /^[eéèêëE]$/.test(c)) && lessons[2].text.includes(w(lang, 'lsCheck9').replace('{n}', String(eWant))), lessons[2]);
        check(`${tag} AC6: tall tales — three questions, each with the book’s answer under hers`, hasAll(3, [w(lang, 'lsTrue1'), w(lang, 'lsTrue2'), w(lang, 'lsTrue3')]) && (lessons[3].text.match(new RegExp(saysX('Sydney').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length === 3, lessons[3] && lessons[3].text);
        check(`${tag} AC6: the direction — French → English and English → French, each with a person’s translation`, hasAll(4, ['Les tulipes ont soif.', 'The tulips are thirsty.']), lessons[4] && lessons[4].text);
        if (shots) await shot(`ig006-ac6-lessons-${vp.name}-${lang}`);
        await seg('7–9');
        await wait(700);
        const none = await evaluate(`[...document.querySelectorAll('.bg-lesson')].filter((e) => e.offsetParent !== null).length`);
        await seg('10–12');
        await wait(600);
        check(`${tag} AC6: no lesson at band 7–9`, none === 0, none);
        for (const k of ['count-tulips', 'maths', 'no-letter-e', 'tall-tales', 'translate']) delete STUB.plan.answers[k];
        check(`${tag}: 0 console errors so far`, page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
      }
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
  await openQuest(w('en', 'rqTulipsTitle'), 'the tulip request again');
  await until('location.pathname', (x) => x === '/workshop');
  await wait(900);
  await langClause('workshop', 'en', 'fr');
  await langClause('workshop', 'fr', 'en');

  // AC6 (band 10–12), IG-003 (P106 s3): Predict is the islander's challenge now, not a button (R5). A wrong tap shows the
  // real end and a hint, never a score; a right tap plays. The tulips carry the challenge; a program not yet played is it.
  await control('rec');
  // IG-002: the tulips start at (1,1) facing the pond; turn round and step once: the end is (2,1).
  for (const op of ['left', 'left', 'fwd']) await key(op);
  // Drive while the challenge is asked: the robot goes back to the start, where Play will begin.
  await control('drive');
  const asked = await until(`document.body.innerText.includes(${JSON.stringify(w('en', 'ig3PredictAsk'))})`, Boolean);
  check('AC6: the islander asks where the robot will end (IG-003: the challenge line, no Predict button)', asked && !(await evaluate(`!!document.querySelector('.bg-controls .bg-i-predict')`)), asked);
  await tap(`document.querySelector('.gd-cell[data-x="5"][data-y="3"]')`, 'a wrong tile');
  // IG-001 D9: the real end is the kit's flag sprite on its tile (it was a 🏁 in a label pill).
  const miss = await until(`(() => { const f = document.querySelector('.bg-stage svg.gd-thing.gd-flag[data-sprite="flag"]'); const say = document.querySelector('.bg-owl-say'); return { flag: f ? f.closest('.gd-cell').getAttribute('data-x') + ',' + f.closest('.gd-cell').getAttribute('data-y') : null, pills: document.querySelectorAll('.bg-stage .gd-label').length, say: say ? say.innerText : '' }; })()`, (r) => !!r.flag);
  check('AC6: a wrong tap marks the real end (2,1) with the flag sprite, no pill (IG-001 D9)', miss.flag === '2,1' && miss.pills === 0, miss);
  check('AC6: … and says the Predict hint, with no score in it', miss.say === w('en', 'hintPredictMiss').replace(/\{b\}/g, 'Pip') || miss.say.includes(w('en', 'hintPredictMiss').split('{b}')[0].trim()), miss.say);
  check('AC6: … and no number is shown as a score', !/\b\d+\s*(\/|%|points?|pts)\b/.test(miss.say), miss.say);
  await shot('ac6-miss');
  // A miss settles the challenge for that program: one more block (a turn: the end tile stays 2,1) asks it again.
  await control('rec');
  await key('left');
  await control('drive');
  await until(`document.body.innerText.includes(${JSON.stringify(w('en', 'ig3PredictAsk'))})`, Boolean);
  await tap(`document.querySelector('.gd-cell[data-x="2"][data-y="1"]')`, 'the right tile');
  // A hit plays from the start: the robot is put back at (1,1), turns round and walks to (2,1).
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

  // S3-R8 (ruling 8, supersedes AC10's D2): one island per kid. Bo is new: Ada's tulips are not done on Bo's island,
  // only Bo's robot is on it, and Mamie's pin offers Bo her first request.
  const doneOf = () => evaluate(`(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); try { const v = JSON.parse(localStorage.getItem(k)); const m = v.model || v; const a = m.profiles.find((p) => p.id === m.island.activeId); return { v: m.v, name: a && a.name, robot: a && a.robot.name, done: a && a.island ? a.island.done : null, band: a && a.band }; } catch (e) { return { error: String(e) }; } })()`);
  const firstOpen = (islander, st) => (REQUESTS.find((r) => r.islander === islander && Number(r.band) <= Number(st.band) && !(st.done || []).includes(r.id)) || {}).id;
  await page.navigate('/');
  await wait(800);
  await tap(first('button.bg-profile-new'), 'new player (Bo)');
  await typeInto(first('input'), 'Bo', 'the name box (Bo)');
  await tap(byText('button.bg-btn', w('en', 'create')), 'create Bo');
  await until('location.pathname', (p) => p === '/island');
  await wait(900);
  const bo = await doneOf();
  readings.boStored = bo;
  // IG-004: the family is stored as v4 (it was v3).
  check('S3-R8: the family is stored as v4, each kid with her own island (Bo: nothing done)', bo.v === 4 && Array.isArray(bo.done) && bo.done.length === 0, bo);
  const boIsland = await evaluate(`(() => { const c = [...document.querySelectorAll('.bg-quest')].find((e) => e.innerText.includes(${JSON.stringify(w('en', 'rqTulipsTitle'))})); const say = document.querySelector('.bg-isle .gd-isl-say[data-who="mamie"]'); return { card: c ? c.innerText : null, bots: [...document.querySelectorAll('.bg-isle .gd-bot')].map((b) => b.innerText), mamieSays: say ? say.innerText : null }; })()`);
  check('S3-R8: the tulips Ada did are NOT done on Bo’s island', !!boIsland.card && !boIsland.card.includes(w('en', 'done')), boIsland);
  check('S3-R8: only Bo’s robot is on Bo’s island (a sibling’s robot is not)', boIsland.bots.length === 1, boIsland.bots);
  // IG-004 (was: Mamie's pin is open): Mamie stands by her next plot for Bo, her request as her bubble.
  const expectId = firstOpen('mamie', bo);
  check(`IG-004 (was S3-R8's pin): Mamie asks Bo for her first request (${expectId}) in her bubble`, boIsland.mamieSays === titleOf('en', expectId), { boIsland, expectId });
  await shot('s3-r8-bo-island');
  // IG-004 (was S3-R6's pin): a tap on Mamie opens her request's plot card; Go and help opens the Workshop on it.
  await tap(`(() => { const e = document.querySelector('.bg-isle .gd-islander[data-who="mamie"]'); return e ? e.closest('.gd-cell') : null; })()`, 'Mamie on the island');
  const mamieCard = await until(`(() => { const c = document.querySelector('.bg-plot-card'); return c && c.offsetParent !== null ? c.innerText : ''; })()`, (t) => t.length > 0, 3000);
  await tap(first('.bg-plot-open'), 'Go and help (Mamie’s card)');
  const viaPin = await until(`(() => { const h = [...document.querySelectorAll('h1')].find((e) => e.offsetParent !== null); return { path: location.pathname, title: h ? h.innerText : '' }; })()`, (r) => r.path === '/workshop' && r.title.length > 0);
  check(`IG-004 (was S3-R6's pin): a tap on Mamie opens her card (${expectId}); Go and help opens it`, mamieCard.includes(titleOf('en', expectId)) && viaPin.path === '/workshop' && viaPin.title.includes(titleOf('en', expectId)), { mamieCard, viaPin, expectId });
  // Back to Ada through Profiles: two cards, each kid's robot drawn with its own name; Ada's island still has her tulips done.
  await page.navigate('/');
  await wait(900);
  const cards = await evaluate(`[...document.querySelectorAll('.bg-profile')].map((c) => { const r = c.getBoundingClientRect(); const b = c.querySelector('.gd-bot'); return { x: r.left, y: r.top, w: r.width, h: r.height, robot: b ? b.innerText : null, fill: b ? getComputedStyle(b.querySelector('rect[fill]') || b).fill : null, text: c.innerText }; })`);
  readings.profileCards = cards;
  const disjoint = cards.length === 2 && !(cards[0].x < cards[1].x + cards[1].w && cards[1].x < cards[0].x + cards[0].w && cards[0].y < cards[1].y + cards[1].h && cards[1].y < cards[0].y + cards[0].h);
  check('S3-LOOK Profiles: a card per kid, each with her robot drawn and named, the cards apart (CG-007 AC5’s two robots)', cards.length === 2 && cards.every((c) => !!c.robot) && disjoint, cards);
  check('S3-LOOK Profiles: the new player is a card', await evaluate(`!!document.querySelector('button.bg-profile-new')`), null);
  await shot('look-profiles-1368');
  await contrastClause('Profiles');
  await tap(byText('.bg-profile h3', 'Ada'), 'Ada’s card (her name)');
  await until('location.pathname', (p) => p === '/island');
  await wait(900);
  const adaDone = await evaluate(`(() => { const c = [...document.querySelectorAll('.bg-quest')].find((e) => e.innerText.includes(${JSON.stringify(w('en', 'rqTulipsTitle'))})); return c ? c.innerText : null; })()`);
  check('S3-R8: back on Ada’s island, her tulips are still done', !!adaDone && adaDone.includes(w('en', 'done')), adaDone);
  // S4-PATH (Richard, s4): Sami's path allows forward and turns only. Five forwards taught at band 10–12 were offered a
  // fold, and the kit drew a repeat it had no palette entry for (no count, a star); a missed run said "Pip did 0 of 0".
  // The control is AC3's tulip pass above (the fold IS offered where repeat is allowed).
  await openQuest(w('en', 'rqPathTitle'), 'Sami’s path');
  await until('location.pathname', (x) => x === '/workshop');
  await wait(900);
  await control('rec');
  for (let k = 0; k < 5; k++) await key('fwd');
  await wait(900);
  const pathState = await evaluate(`(() => { const t = document.querySelector('.bg-tidy'); return { blocks: document.querySelectorAll('.gd-prog .gd-blk[data-id]').length, tidy: !!t && t.offsetParent !== null, counts: document.querySelectorAll('.gd-prog .gd-count').length, palette: [...document.querySelectorAll('.gd-palette [data-pal]')].map((e) => e.getAttribute('data-pal')) }; })()`);
  check('S4-PATH: five forwards on Sami’s path (no repeat in its palette) are NOT offered a fold', pathState.blocks === 5 && !pathState.tidy && !pathState.palette.includes('repeat'), pathState);
  await shot('s4-path-no-fold');
  await control('play');
  const pathOwl = await until(`(document.querySelector('.bg-owl-say') || {}).innerText || ''`, (t) => /Not quite yet|Pas tout à fait/.test(t), 9000);
  check('S4-PATH: the missed run says "Not quite yet…", never "0 of 0"', /Not quite yet|Pas tout à fait/.test(pathOwl) && !/0 of 0|0 sur 0/.test(pathOwl), pathOwl);
  await tab(0);
  await until('location.pathname', (p) => p === '/island');
  await wait(900);
  await contrastClause('Island');
  // S3-RENAME: the robot renamed on My robot is the name on its pin and in the Workshop's line.
  await tab(2);
  await until('location.pathname', (p) => p === '/robot');
  await wait(700);
  await typeInto(first('.bg-panel input'), 'Rosie', 'the robot’s name (My robot)');
  await wait(600);
  await contrastClause('My robot');
  await tab(0);
  await until('location.pathname', (p) => p === '/island');
  await wait(900);
  // IG-005 (P106 s4): her island can hold more than one robot (the lent ones): Pip is the one renamed, among them.
  const pinNames = await evaluate(`[...document.querySelectorAll('.bg-isle .gd-bot .gd-name')].map((n) => n.innerText)`);
  check('S3-RENAME: the robot on the island carries the new name (IG-004: on the island itself, was its pin; IG-005: among her robots)', pinNames.includes('Rosie') && !pinNames.includes('Pip'), { pinNames, stored: await doneOf() });
  await openQuest(w('en', 'rqTulipsTitle'), 'the tulip request (renamed)');
  await until('location.pathname', (x) => x === '/workshop');
  await wait(900);
  const line = await evaluate(`(() => { const e = document.querySelector('.bg-ws-sub'); return e ? e.innerText : ''; })()`);
  check('S3-RENAME + item 1: the Workshop’s line is the tulips’ own, with the new name in it', line === w('en', 'subTulipsThree', 'Rosie'), { line, want: w('en', 'subTulipsThree', 'Rosie') });
  // IG-001 D8: the bar has no Ask Olive (it was a hint refresh); the owl picture lives on the grown-ups' Try Olive (below).
  check('IG-001 D8: no Ask Olive button on the Workshop bar', !(await evaluate(`[...document.querySelectorAll('.bg-controls .bg-i-owlc, .bg-controls .bg-ask-push')].some((e) => e.offsetParent !== null)`)), null);
  await shot('look-workshop-1368');
  await contrastClause('Workshop');
  // Rename back, so the screens after read as before.
  await tab(2);
  await until('location.pathname', (p) => p === '/robot');
  await wait(600);
  await typeInto(first('.bg-panel input'), 'Pip', 'the robot’s name back to Pip');
  await wait(400);

  // Grown-ups: the stub Olive is awake; Try Olive answers.
  await tab(4);
  await until('location.pathname', (p) => p === '/grown-ups');
  await wait(1200);
  const gu = await text();
  check('Grown-ups: the stub shell says Olive is awake, and her exam here', gu.includes(w('en', 'guHereOn')) && /20/.test(gu), gu.slice(0, 400));
  await contrastClause('Grown-ups');
  const ask = await evaluate(`(() => { const b = [...document.querySelectorAll('.bg-panel .bg-i-owlc')].find((e) => e.offsetParent !== null); if (!b) return null; const s = getComputedStyle(b, '::before'); return { image: /svg/.test(s.backgroundImage), mask: s.webkitMaskImage || s.maskImage }; })()`);
  check('S3-LOOK item 2: Try Olive carries the owl picture, not a white mask', !!ask && ask.image && (!ask.mask || ask.mask === 'none'), ask);
  await tap(first('.bg-panel .bg-i-owlc'), 'Try Olive');
  const reply = await until('document.body.innerText', (t) => t.includes('(stub)'), 6000);
  check('Grown-ups: Try Olive shows her reply', reply.includes('(stub)'), stubCalls.slice(-2));

  // S4-PASTE: the paste box, the second restore path. A refused code writes nothing, and nothing it leaves behind is
  // written by the next writer on the page (the bar's language pick); a good code IS the family, read on the island.
  const stored = () => evaluate(`(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); return k ? localStorage.getItem(k) : null; })()`);
  const pasteBox = `(document.querySelector('input.bg-paste') || document.querySelector('.bg-paste input'))`;
  const shown = await evaluate(`(() => { const e = document.querySelector('.bg-code'); return e ? e.innerText.trim() : ''; })()`);
  check('S4-PASTE: the save code is shown', /^BG1\./.test(shown), shown.slice(0, 40));
  const beforeBad = await stored();
  await typeInto(pasteBox, 'BG1.this-is-not-a-save', 'the paste box (a bad code)');
  await tap(first('.bg-paste-go'), 'replace the islands (a bad code)');
  const badSaid = await until('document.body.innerText', (t) => t.includes(w('en', 'saveCodeBad')), 4000);
  check('S4-PASTE: a bad code is refused in words', badSaid.includes(w('en', 'saveCodeBad')) && !badSaid.includes(w('en', 'saveCodeDone')), badSaid.slice(-300));
  check('S4-PASTE: … and the stored family is untouched', (await stored()) === beforeBad, { before: (beforeBad || '').length, after: ((await stored()) || '').length });
  // The bar's pick after a refused code. 🔴 A regression check, NOT a proof about the null: the control (s4, Decode
  // publishing null again, GARDEN_SKIP_ENGINE_GATE=1) passed it too — the bar sends a fresh model before each write.
  // The no-null guarantee is the engine gate's (`'model' in bad` is false).
  await seg('FR');
  await wait(600);
  const afterPick = await doneOf();
  check('S4-PASTE: after a refused code, the bar’s next write still writes the family (not an empty one)', !afterPick.error && !!afterPick.name && afterPick.v === 4, afterPick);
  await seg('EN');
  await wait(600);
  // A good code: the one shown, with the playing kid's robot renamed, re-encoded as the game does.
  const packed = JSON.parse(Buffer.from(shown.slice(4).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  const row = packed.p.find((r) => r[0] === packed.a) || packed.p[0];
  const firstRobot = row[5];
  row[5] = 'Remy';
  const good = 'BG1.' + Buffer.from(JSON.stringify(packed), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await typeInto(pasteBox, good, 'the paste box (a good code)');
  await tap(first('.bg-paste-go'), 'replace the islands (a good code)');
  const doneSaid = await until('document.body.innerText', (t) => t.includes(w('en', 'saveCodeDone')), 4000);
  check('S4-PASTE: a good code says the islands are back', doneSaid.includes(w('en', 'saveCodeDone')) && !doneSaid.includes(w('en', 'saveCodeBad')), doneSaid.slice(-300));
  const restored = await doneOf();
  readings.pasteRestored = restored;
  check('S4-PASTE: … the stored family is the code’s (the robot is Remy)', restored.robot === 'Remy' && restored.v === 4, restored);
  await tab(0);
  await until('location.pathname', (p) => p === '/island');
  await wait(900);
  // IG-005: Pip (renamed Remy by the code) among her robots on the island.
  const pastedPin = await evaluate(`[...document.querySelectorAll('.bg-isle .gd-bot .gd-name')].map((n) => n.innerText)`);
  check('S4-PASTE: … and the island shows it (the robot on the island is Remy)', pastedPin.includes('Remy'), pastedPin);
  // The shown code back, so the screens after read as before.
  await tab(4);
  await until('location.pathname', (p) => p === '/grown-ups');
  await wait(900);
  await typeInto(pasteBox, shown, 'the paste box (the code shown at first)');
  await tap(first('.bg-paste-go'), 'replace the islands (back)');
  await wait(600);
  const back = await doneOf();
  check('S4-PASTE: the first code brings the first family back', back.robot === firstRobot && firstRobot !== 'Remy', { back, firstRobot });

  // ── IG-001 (P106 s1): the ten fixes, driven. EN, 1368×912, band 10–12, the first family (the robot Pip). ──
  {
    const hintNodes = JSON.parse(fs.readFileSync(path.join(PROJECT, 'components', 'Data', 'Hints', 'nodes.json'), 'utf8'));
    const hintRows = JSON.parse((Array.isArray(hintNodes) ? hintNodes : hintNodes.nodes || Object.values(hintNodes)).find((n) => n.type === 'Static Data').parameters.json);
    const hint = (key) => String((hintRows.find((r) => r.key === key) || {}).en || '').split('{b}').join('Pip');
    const owlExpr = `(document.querySelector('.bg-owl-say') || {}).innerText || ''`;
    const thinkingExpr = `(() => { const e = document.querySelector('.bg-owl-thinking'); return !!e && e.offsetParent !== null; })()`;
    const owlSay = () => evaluate(owlExpr);
    const pal = (id) => palTap(id);
    const pickSlot = async (blockSel, slot, opt) => {
      await tap(first(`${blockSel} .gd-slot[data-slot="${slot}"]`), `slot ${slot}`);
      await tap(opt ? first(`.gd-picker .gd-opt[data-opt="${opt}"]`) : first('.gd-picker .gd-opt'), `option ${opt || 'first'} for ${slot}`);
    };
    const runOver = () => until(`!document.querySelector('.gd-locked')`, Boolean, 12000);
    // IG-006: the eighteen-rung family is gone; the parked ask is the say block (Olive's thank-you).
    const poemAsks = () => stubCalls.filter((c) => c.body && c.body.rung === 'say-thanks').length;
    /** D5: the running block's ring, read live — its outline colour against the first opaque ground behind it, and the halo. */
    const ringOf = () =>
      evaluate(`(() => { const el = document.querySelector('.gd-blk.gd-run'); if (!el) return null; const cs = getComputedStyle(el);
        const parse = (c) => { const m = String(c).match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
        const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
        const ratio = (a, b) => { const x = lum(a), y = lum(b); return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100; };
        let ground = null, groundOf = '';
        for (let e = el.parentElement; e; e = e.parentElement) { const bg = parse(getComputedStyle(e).backgroundColor); if (bg && bg.a >= 0.999) { ground = bg; groundOf = String(e.className || '').slice(0, 40); break; } }
        const ring = parse(cs.outlineColor);
        return { id: el.getAttribute('data-id'), ring: cs.outlineColor, width: cs.outlineWidth, halo: cs.boxShadow, ground: cs.outlineColor && ground ? [ground.r, ground.g, ground.b] : null, groundOf, inRep: !!el.closest('.gd-rep'), ratio: ring && ground ? ratio(ring, ground) : null, transform: cs.transform }; })()`);
    const ringOk = (r) => !!r && r.ratio >= 3 && r.width === '3px' && /rgb\(255, 255, 255\) 0px 0px 0px 4px/.test(r.halo);
    const enterFree = async (label) => {
      await tab(0);
      await until('location.pathname', (p) => p === '/island');
      await wait(700);
      await openQuest('No request', label);
      await until('location.pathname', (p) => p === '/workshop');
      await until(`!!document.querySelector('.gd-palette [data-pal="fwd"]')`, Boolean, 6000);
      await wait(600);
    };

    // D8: an edit changes the hint within one step, with no press.
    await enterFree('free play (IG-001 D8)');
    const emptyLine = await until(owlExpr, (t) => t.includes(hint('hintEmpty').slice(0, 24)), 4000);
    await pal('fwd');
    const edited = await until(owlExpr, (t) => t !== emptyLine && t.length > 0, 1500);
    check('IG-001 D8: editing a block changes the hint within one step, with no press (empty → a program not run yet)', emptyLine.includes(hint('hintEmpty').slice(0, 24)) && edited.includes(hint('hintStart').slice(0, 24)), { emptyLine, edited });

    // D1 + D6 + D5 (on white): fwd, ask Olive · a poem. One step runs fwd (the ring on the white panel); One step parks
    // (thinking on); a third press while parked asks nothing more; the stub's held answer clears the tag with no press and
    // is spoken in the olive bubble.
    await pal('olive:say-thanks');
    await pickSlot('.gd-prog .gd-blk[data-t="olive:say-thanks"]', 'to');
    await pickSlot('.gd-prog .gd-blk[data-t="olive:say-thanks"]', 'deed');
    await wait(700);
    STUB.plan.answers['say-thanks'] = 'Tulla the tulip';
    STUB.plan.delayRung = 'say-thanks';
    STUB.plan.delayMs = 1500;
    const asks0 = poemAsks();
    await control('step');
    const ringWhite = await until(`!!document.querySelector('.gd-blk.gd-run')`, Boolean, 2000) ? await ringOf() : null;
    readings.ringWhite = ringWhite;
    await control('step');
    const tagOn = await until(thinkingExpr, Boolean, 2000);
    await control('step');
    await wait(300);
    const asksMid = poemAsks();
    const tagOff = await until(thinkingExpr, (v) => v === false, 6000);
    const bubble = await until(`(() => { const b = document.querySelector('.gd-bubble.gd-olive'); return b ? b.innerText : ''; })()`, Boolean, 2500);
    const asksAfter = poemAsks();
    await shot('ig001-d1-d6-olive-bubble');
    check('IG-001 D1: One step parks on Olive (the tag on); a Step while parked asks nothing more; the tag clears when she answers, with no further press; exactly one ask sent', tagOn === true && asksMid === asks0 + 1 && tagOff === false && asksAfter === asks0 + 1, { tagOn, asks0, asksMid, tagOff, asksAfter });
    check('IG-001 D6: what Olive said is on the robot, in the olive bubble', /Tulla the tulip/.test(bubble), { bubble });
    check(`IG-001 D5: the running ring on the steps panel (white) is 3 px, ≥ 3:1, over a 4 px white halo (${ringWhite && ringWhite.ratio}:1)`, ringOk(ringWhite) && !ringWhite.inRep, ringWhite);
    // Start over while parked: the tag is off within one tick.
    await control('reset');
    await wait(400);
    await pal('olive:say-thanks');
    await pickSlot('.gd-prog .gd-blk[data-t="olive:say-thanks"]', 'to');
    await pickSlot('.gd-prog .gd-blk[data-t="olive:say-thanks"]', 'deed');
    await wait(700);
    await control('step');
    const parkedAgain = await until(thinkingExpr, Boolean, 2000);
    await control('reset');
    const cleared = await until(thinkingExpr, (v) => v === false, 700);
    STUB.plan.delayMs = 0;
    delete STUB.plan.answers['say-thanks'];
    check('IG-001 D1: Start over while parked — the tag is off within one tick', parkedAgain === true && cleared === false, { parkedAgain, cleared });
    // D6: a say block shows its line, plain.
    await wait(400);
    await pal('say');
    await control('step');
    const plain = await until(`(() => { const b = document.querySelector('.gd-bubble:not(.gd-olive)'); return b ? b.innerText : ''; })()`, Boolean, 2500);
    check('IG-001 D6: a say block shows its line in the plain bubble', plain === w('en', 'thanksMamie'), { plain, want: w('en', 'thanksMamie') });
    // D4: free play — a clean run says hintFree; a run that bumps says hintBump.
    await control('reset');
    await wait(400);
    for (const op of ['fwd', 'fwd', 'left']) await pal(op);
    await control('play');
    const freeLine = await until(owlExpr, (t) => t.includes(hint('hintFree').slice(0, 20)) || /bumped/.test(t), 9000);
    check('IG-001 D4: a clean run in free play says its own line ("did what you said…")', freeLine.includes(hint('hintFree').slice(0, 20)), { freeLine, want: hint('hintFree') });
    await runOver();
    await control('reset');
    await wait(400);
    // Up three, left, forward: a bump at the map's edge with no run of four (four forwards would be the fold nudge, which
    // outranks a bump by the ladder's design).
    for (const op of ['left', 'fwd', 'fwd', 'fwd', 'left', 'fwd']) await pal(op);
    await control('play');
    const bumpLine = await until(owlExpr, (t) => t.includes(hint('hintBump').slice(0, 16)), 9000);
    check('IG-001 D4: a run that bumps in free play still says the bump line', bumpLine.includes(hint('hintBump').slice(0, 16)), { bumpLine });
    await runOver();

    // D2: request A (the tulips) driven to a bump, then request B opened and "Done teaching": never the bump line.
    await tab(0);
    await until('location.pathname', (p) => p === '/island');
    await wait(700);
    await openQuest(w('en', 'rqTulipsTitle'), 'the tulips (IG-001 D2, request A)');
    await until('location.pathname', (p) => p === '/workshop');
    await wait(900);
    await control('rec');
    // IG-002: turn round and walk into the first tulip (3,1): the second forward is the bump.
    for (const op of ['left', 'left', 'fwd', 'fwd']) await key(op);
    await control('rec');
    await control('play');
    const aBump = await until(owlExpr, (t) => t.includes(hint('hintBump').slice(0, 16)), 9000);
    await runOver();
    await tab(0);
    await until('location.pathname', (p) => p === '/island');
    await wait(700);
    await openQuest(w('en', 'rqPathTitle'), 'Sami’s path (IG-001 D2, request B)');
    await until('location.pathname', (p) => p === '/workshop');
    await wait(900);
    await control('rec');
    await control('rec');
    await wait(900);
    const bLine = await owlSay();
    check('IG-001 D2: after a bump on request A, request B’s first hint is the start/empty line, never the bump (the run is reset)', aBump.includes(hint('hintBump').slice(0, 16)) && !/bumped/.test(bLine) && (bLine.includes(hint('hintEmpty').slice(0, 24)) || bLine.includes(hint('hintStart').slice(0, 24))), { aBump, bLine });

    // D9 + D10 + D5 (inside a repeat) + D3: the stones. The post box is a sprite on its tile, no pill; the pad shows put and
    // no water; put, fwd × 4 lays four stone sprites; the fold makes the reference program; One step glows the repeat
    // inside its ground; Play wins with "Perfect!".
    await tab(0);
    await until('location.pathname', (p) => p === '/island');
    await wait(700);
    await openQuest(w('en', 'rqStonesTitle'), 'the stones (IG-001 D9/D10/D3)');
    await until('location.pathname', (p) => p === '/workshop');
    await wait(900);
    const stonesWorld = await evaluate(`(() => ({ postbox: !!document.querySelector('.bg-stage .gd-cell.gd-postbox svg[data-sprite="postbox"]'), labels: document.querySelectorAll('.bg-stage .gd-label').length, stones: document.querySelectorAll('.bg-stage .gd-thing.gd-stone').length }))()`);
    check('IG-001 D9: the stones request draws the post box as a sprite on its own tile and no label pill at all', stonesWorld.postbox && stonesWorld.labels === 0 && stonesWorld.stones === 0, stonesWorld);
    await control('rec');
    await until(`!!document.querySelector('.bg-pad .bg-key-put')`, Boolean, 3000);
    const padOps = await evaluate(`[...document.querySelectorAll('.bg-pad .bg-key')].filter((e) => e.offsetParent !== null).map((e) => (e.className.match(/bg-key-(fwd|left|right|water|pick|put|fill)/) || [])[1])`);
    check(`IG-001 D10: the stones’ pad shows ${padFor('path-stones').join(' ')} and not water (IG-002: pick, the basket starts empty)`, JSON.stringify(padOps) === JSON.stringify(padFor('path-stones')) && !padOps.includes('water'), padOps);
    // IG-002: mine the rock beside the start first (turn to it, pick four), turn back, then lay.
    await key('left');
    for (let k = 0; k < 4; k++) await key('pick');
    await key('right');
    for (let k = 0; k < 4; k++) {
      await key('put');
      await key('fwd');
    }
    const laid = await until(`document.querySelectorAll('.bg-stage .gd-thing.gd-stone').length`, (n) => n === 4, 3000);
    await shot('ig001-d9-stones');
    check('IG-001 D9: four stones laid are four stone sprites (svg, the kit’s class), no pill', laid === 4 && (await evaluate(`document.querySelectorAll('.bg-stage svg.gd-thing.gd-stone[data-sprite="stone"]').length`)) === 4 && (await evaluate(`document.querySelectorAll('.bg-stage .gd-label').length`)) === 0, { laid });
    // IG-002: two folds — (put, fwd) × 4, then pick × 4 — make the reference program, seven blocks.
    for (let f = 0; f < 2; f++) {
      await until(`(() => { const e = document.querySelector('.bg-tidy'); return !!e && e.offsetParent !== null; })()`, Boolean, 3000);
      await tap(first('.bg-tidy .bg-i-tidy'), `Fold it (the stones, ${f + 1})`);
      await wait(300);
    }
    const three = await until(`document.querySelectorAll('.gd-prog .gd-blk[data-id]').length`, (n) => n === 7, 3000);
    // The first step glows the turn; the second glows the first repeat (its ground #FFF0DA).
    await control('step');
    await control('step');
    const ringRep = await until(`!!document.querySelector('.gd-rep .gd-blk.gd-run')`, Boolean, 2000) ? await ringOf() : null;
    readings.ringRep = ringRep;
    await shot('ig001-d5-ring-in-repeat');
    check(`IG-001 D5: the running ring inside a repeat (on #FFF0DA) is 3 px, ≥ 3:1, over a 4 px white halo (${ringRep && ringRep.ratio}:1)`, three === 7 && ringOk(ringRep) && ringRep.inRep, { three, ringRep });
    await control('play');
    const perfect = await until(owlExpr, (t) => t.includes(hint('hintPerfect').slice(0, 8)), 12000);
    const wonStones = await until(`(() => { const e = document.querySelector('.bg-win-card'); return !!e && e.offsetParent !== null; })()`, Boolean, 6000);
    await shot('ig001-d3-perfect');
    check('IG-001 D3: the reference program (IG-002: left, repeat 4 pick, right, repeat 4 × (put, fwd)) wins with "Perfect!"', wonStones && perfect.includes(hint('hintPerfect').slice(0, 8)), { perfect, wonStones, want: hint('hintPerfect') });
    if (wonStones) await tap(byText('.bg-win-card button', w('en', 'winStay')), 'Keep tinkering');
    // D10: the tulips' pad shows water.
    await tab(0);
    await until('location.pathname', (p) => p === '/island');
    await wait(700);
    await openQuest(w('en', 'rqTulipsTitle'), 'the tulips (IG-001 D10)');
    await until('location.pathname', (p) => p === '/workshop');
    await wait(900);
    await control('rec');
    await until(`!!document.querySelector('.bg-pad .bg-key-fwd')`, Boolean, 3000);
    const tulipOps = await evaluate(`[...document.querySelectorAll('.bg-pad .bg-key')].filter((e) => e.offsetParent !== null).map((e) => (e.className.match(/bg-key-(fwd|left|right|water|pick|put|fill)/) || [])[1])`);
    check(`IG-001 D10: the tulips’ pad shows water (${padFor('tulips-three').join(' ')}; IG-002: fill too)`, JSON.stringify(tulipOps) === JSON.stringify(padFor('tulips-three')) && tulipOps.includes('water'), tulipOps);
    await control('rec');
    await tab(0);
    await until('location.pathname', (p) => p === '/island');
    await wait(600);
  }

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
  await openQuest(w('en', 'rqTulipsTitle'), 'the tulip request (reduced motion)');
  await until('location.pathname', (x) => x === '/workshop');
  await wait(900);
  await control('rec');
  // IG-002: fill at the pond, turn round, step, water the first tulip.
  for (const op of ['fill', 'left', 'left', 'fwd', 'water']) await key(op);
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
    if (name === 'skills') {
      await contrastClause('Skills');
      // S4 / IG-006 AC6: the lessons are band 10–12's (ruling 8): at 7–9 the section is gone, and back at 10–12 it returns.
      const visibleRungs = () => evaluate(`[...document.querySelectorAll('.bg-lesson')].filter((e) => e.offsetParent !== null).length`);
      const older = await visibleRungs();
      await seg('7–9');
      await wait(700);
      const younger = await visibleRungs();
      await seg('10–12');
      await wait(700);
      check('S4 / IG-006 AC6: Olive’s lessons show at 10–12 (5), not at 7–9 (0), and come back', older === 5 && younger === 0 && (await visibleRungs()) === 5, { older, younger });
    }
  }
  // S3-LOOK: the island and Profiles at a phone's width, for the side-by-side.
  await page.setViewport(VIEWPORTS[1]);
  // Profiles first: it has no tabs (a player is being chosen), and the next step taps tab 0 (s3 drive: 2 reds from ending there).
  for (const [name, p] of [['profiles', '/'], ['island', '/island']]) {
    await page.navigate(p);
    await wait(1100);
    await shot(`look-${name}-390`);
    if (name === 'island') {
      // IG-004 (was the sea's pin labels): the words on the island at a phone's width — the islanders' bubbles and the
      // robot's name — no two overlap.
      const r = await evaluate(`(() => {
        const els = [...document.querySelectorAll('.bg-isle .gd-isl-say, .bg-isle .gd-name')].filter((e) => e.offsetParent);
        const bs = els.map((e) => { const b = e.getBoundingClientRect(); return { e, t: e.textContent.trim(), l: b.left, r: b.right, t0: b.top, b: b.bottom }; });
        const hits = [];
        for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
          const a = bs[i], c = bs[j];
          if (a.e.contains(c.e) || c.e.contains(a.e)) continue;
          if (a.l < c.r - 1 && c.l < a.r - 1 && a.t0 < c.b - 1 && c.t0 < a.b - 1) hits.push(a.t + ' × ' + c.t);
        }
        return { labels: bs.map((x) => x.t), hits };
      })()`);
      check('S3-LOOK Island 390: no two words on the island overlap (the islanders’ bubbles, the robot’s name)', r.labels.length >= 3 && r.hits.length === 0, r);
    }
    if (name === 'profiles') {
      const r = await evaluate(`({ vw: innerWidth, sx: document.scrollingElement.scrollWidth })`);
      check('S3-LOOK Profiles 390: nothing wider than the screen', r.vw === 390 && r.sx <= 390, r);
      await contrastClause('Profiles 390');
    }
  }
  await page.setViewport(VIEWPORTS[0]);
  await tab(0);
  await wait(600);
  await openQuest(w('en', 'rqTulipsTitle'), 'the workshop for the look');
  await wait(1100);
  await shot('cg007-ac1-workshop');

  check('0 console errors through the whole drive', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
  check('0 network errors through the whole drive', page.networkErrors.length === 0, page.networkErrors.slice(0, 5));
  readings.stubCalls = stubCalls.length;
  return { dir: DIR, results, readings, consoleErrors: page.consoleErrors.slice(), networkErrors: page.networkErrors.slice() };
})
  .then(async (out) => {
    // P106 s4 (f): the side-step is a clause of its own — a failure there is recorded, and never loses the drive's JSON.
    if (WITH_MOCKUP && SHOTS) {
      const name = 'CG-007 AC1 (--mockup): the mockup’s own five screens shot beside the pages';
      try {
        await mockupShots();
        out.results.push({ name, ok: true, saw: { shots: 5 } });
      } catch (e) {
        out.results.push({ name, ok: false, saw: String((e && e.message) || e) });
      }
      console.log(`${out.results[out.results.length - 1].ok ? 'PASS' : 'FAIL'} ${name}`);
    }
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
    // P106 s4 (f): the mockup's Google font is a render-blocking stylesheet, so its script (and `go`) can arrive after the
    // fixed boot wait — s3's merge run threw "go is not defined" here. Wait for it, up to 30 s, and say so if it never comes.
    let ready = false;
    for (let i = 0; i < 60 && !ready; i++) {
      ready = (await page.evaluate(`typeof go === 'function' && document.querySelectorAll('.screen').length > 0`)) === true;
      if (!ready) await wait(500);
    }
    if (!ready) throw new Error('the mockup page never defined go() in 30 s (its Google font stylesheet blocks its script)');
    await page.setViewport({ width: 1368, height: 912, mobile: false });
    for (const screen of ['island', 'workshop', 'robot', 'notions', 'grownups']) {
      await page.evaluate(`go(${JSON.stringify(screen)})`);
      await wait(500);
      await page.screenshot(path.join(SHOTS, `mockup-${screen}.png`));
    }
  });
}
