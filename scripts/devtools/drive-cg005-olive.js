#!/usr/bin/env node
/**
 * CG-005 — drive Olive in the game on the STUB, prepared in lane C (session 2) and run by the orchestrator.
 *
 * Two parts. Part R needs no browser: it starts `garden-desktop/shell/olive-stub.js serve` (the shell's real route,
 * checks and exam in front of the stub model) and drives it over HTTP. Part P needs CG-003's pages (lane A, this
 * session): the deployed `templates/bot-garden` served BY THE STUB, one origin, driven headless through
 * `drive-deployed.js` (`origin` mode, so what is graded is exactly what the stub serves).
 *
 *   node scripts/devtools/drive-cg005-olive.js route [--json <file>]
 *   node scripts/devtools/drive-cg005-olive.js pages <deploy-dir> [--shots <dir>] [--json <file>]
 *
 * 🔴 No Electron here. Should a later version launch the shell instead of the stub server, launch it through
 * `garden-desktop/drive-lib.js` `launch()` (on darwin it passes `-ApplePersistenceIgnoreState YES`; without it the third
 * launch hangs in AppKit's "reopen windows?" prompt before `ready`) with `GARDEN_OLIVE_STUB=1` (or `=mutant`).
 *
 * Clauses (each beside a known-firing half):
 *   R-AC3  mutant on → voice-hint answers {fallback, reason:'blocklist'}; mutant off → the stub's "Hou hou ! …" line
 *   R-AC5  exam with read switched to fail → status withholds it; switched to pass, exam re-run → offered (IG-006)
 *   R-AC2  a hung rung → the shell's timeout (--timeout 1500) answers {fallback, reason:'timeout'} in 1.5–4 s
 *   R-AC6  a 41-character text slot and a listed word are refused by the route and the stub's call log does not grow
 *   R-IG006 read answers one of the plot's things (the enum the page sends); a scripted vote comes back in turn
 * P106 IG-006 (session 2, lane C) re-cut the page part to the three blocks (olive:<rung>): P-AC6 an is-it-a block with
 * its kind unset; P-IG6-AC2 Mamie's note through the real route; P-IG6-AC3 the vote; P-IG6-AC6 the five lessons on
 * Skills through the route (the stub's readout answers); every first palette tap opens its card (Got it, then place).
 * Part P (session 3, lane HOOKS: the pages now carry CG-005's hooks) makes a band 10–12 player through the Profiles
 * form, then enters FREE PLAY from the island for each clause (free play offers every rung the exam passed; a reload of
 * /workshop has no request and goes to the island, CG-003 AC8). The owl's line is `.bg-owl-say`, the row `.bg-owl`.
 *   P-AC6  a new ask block says "Fill in every slot first."; the text field's maxLength is 40 and 41 characters leave
 *          40; a listed word shows the refusal under the block list (`.bg-slot-msg`); Play sends nothing to the model
 *          (the stub's calls, the hint voicings apart, do not grow) and the owl does not claim she is resting
 *   P-AC1  words-to-blocks: her blocks come as a card (`.bg-proposal`, Use them / No thanks) and are not in the
 *          program; Use them places them; a new run proposes again; No thanks changes nothing
 *   P-AC3  mutant on: the owl's line keeps the WRITTEN line, silently; mutant off: the voiced line ("Hoo hoo") replaces it
 *   P-AC2  a hung rung, Play: the row says thinking; the page keeps animating while parked (the robot walked first,
 *          ≥ 20 animation frames in 600 ms, the thinking dots' animation advances), then after the page's 12 s: resting.
 *          (A sprite mid-transition WHILE parked is unreachable by construction: the park comes a tick, 420 ms, after the
 *          last move, and the glide is 380 ms.)
 *   P-AC5  exam fail → no [data-pal="olive:read"] (is it a…? still offered) and Skills' `.bg-olive-held` says
 *          "can't do this here yet: words into blocks"; pass + re-run → the block is back and Skills says nothing
 *   P-390  free play at 390×844: Play and the owl on screen at scroll 0, no sideways scroll
 *   P-S3-R5 the hooks' words (slot line, card, buttons, the owl's line and tags) ≥ 4.5:1 on their ground
 * A page clause whose hook is not on the page is reported SKIP with the hook it looked for, never PASS.
 * Exits 0 when nothing FAILED (SKIPs are listed — session 3 expects none), 1 when a clause failed, 2 on a usage error.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const REPO = path.join(__dirname, '..', '..');
const SHELL = path.join(REPO, 'dev-docs', 'tasks', 'phase-105-the-coding-garden', 'garden-desktop', 'shell');
const templates = require(path.join(SHELL, 'olive-templates.json'));
const HEADER = 'x-garden';

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
};
const MODE = process.argv[2];
const JSON_OUT = arg('--json');
const SHOTS = arg('--shots');
if (MODE !== 'route' && MODE !== 'pages') {
  console.error('usage: drive-cg005-olive.js route | pages <deploy-dir> [--shots <dir>] [--json <file>]');
  process.exit(2);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, saw) => {
  results.push({ name, status: ok ? 'PASS' : 'FAIL', saw });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${typeof saw === 'string' ? saw : JSON.stringify(saw)}`}`);
};
const skip = (name, hook) => {
  results.push({ name, status: 'SKIP', saw: `no hook: ${hook}` });
  console.log(`SKIP  ${name}\n        no hook on the page: ${hook}`);
};

function req(port, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const r = http.request({ host: '127.0.0.1', port, method, path: urlPath, headers: body !== undefined ? { [HEADER]: '1', 'content-type': 'application/json' } : {} }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        let json = null;
        try {
          json = raw ? JSON.parse(raw) : null;
        } catch {
          /* not json */
        }
        resolve({ status: res.statusCode, body: json, ms: Date.now() - t0 });
      });
    });
    r.on('error', reject);
    if (body !== undefined) r.write(JSON.stringify(body));
    r.end();
  });
}

/** Start the stub server; resolves with its port once it prints its ready line. */
function startStub(appDir, extra = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [path.join(SHELL, 'olive-stub.js'), 'serve', '--app', appDir, ...extra], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    const timer = setTimeout(() => reject(new Error(`stub never said ready: ${out}`)), 10000);
    proc.stdout.on('data', (c) => {
      out += c;
      const line = out.split('\n').find((l) => l.startsWith('{'));
      if (line) {
        clearTimeout(timer);
        resolve({ proc, ...JSON.parse(line) });
      }
    });
    proc.stderr.on('data', (c) => (out += c));
    proc.on('exit', (code) => reject(new Error(`stub exited ${code}: ${out}`)));
  });
}

const olive = (port, body) => req(port, 'POST', '/__garden/olive', body).then((r) => r.body);
const setStub = (port, body) => req(port, 'POST', '/__stub/set', body).then((r) => r.body);
const calls = (port) => req(port, 'GET', '/__stub/calls').then((r) => r.body.calls.length);
const withheldOf = (exam) => Object.entries((exam && exam.rungs) || {}).filter(([, r]) => r.pass === false).map(([id]) => id).sort();

async function routePart() {
  const appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg005-route-app-'));
  fs.writeFileSync(path.join(appDir, 'index.html'), '<html><body>stub</body></html>');
  const stub = await startStub(appDir, ['--timeout', '1500']);
  const port = stub.port;
  try {
    // R-AC3
    await setStub(port, { mutant: true });
    const bad = await olive(port, { rung: 'voice-hint', slots: { key: 'hintWet', b: 'Pip' }, lang: 'fr' });
    await setStub(port, { mutant: false });
    const good = await olive(port, { rung: 'voice-hint', slots: { key: 'hintWet', b: 'Pip' }, lang: 'fr' });
    check('R-AC3 mutant → blocklist refusal; clean → the voiced line', bad.ok === false && bad.reason === 'blocklist' && bad.text === undefined && good.ok === true && good.text === 'Hou hou ! ' + templates.hints.hintWet.fr.replace(/\{b\}/g, 'Pip'), { bad, good });
    // R-AC5
    await setStub(port, { exam: { read: 'fail' } });
    const e1 = await req(port, 'POST', '/__garden/olive/exam', {});
    const s1 = (await req(port, 'GET', '/__garden/olive/status')).body.exam;
    await setStub(port, { exam: { read: 'pass' } });
    await req(port, 'POST', '/__garden/olive/exam', {});
    const s2 = (await req(port, 'GET', '/__garden/olive/status')).body.exam;
    check('R-AC5 exam fail withholds read (its count under 5 of 6); pass + re-run offers it', e1.status === 200 && withheldOf(s1).includes('read') && !withheldOf(s2).includes('read') && s1.at !== s2.at && s2.rungs.read.score.met >= 5, { first: withheldOf(s1), second: withheldOf(s2), score: s2.rungs.read.score });
    // R-AC2
    await setStub(port, { hang: ['count-tulips'] });
    const t0 = Date.now();
    const hung = await olive(port, { rung: 'count-tulips', slots: { list: templates.lists.flowerlists.fr[0] }, lang: 'fr' });
    const took = Date.now() - t0;
    await setStub(port, { hang: [] });
    check('R-AC2 a hung rung → timeout fallback in 1.5–4 s', hung.fallback === true && hung.reason === 'timeout' && took >= 1400 && took < 4000, { hung, took });
    // R-AC6
    const before = await calls(port);
    // IG-006: no block has a text slot; the one left is the hint voicing's robot name.
    const long = await olive(port, { rung: 'voice-hint', slots: { key: 'hintWet', b: 'T'.repeat(41) }, lang: 'fr' });
    const word = await olive(port, { rung: 'voice-hint', slots: { key: 'hintWet', b: 'Tulla la stupide' }, lang: 'fr' });
    const after = await calls(port);
    const ok40 = await olive(port, { rung: 'voice-hint', slots: { key: 'hintWet', b: 'T'.repeat(40) }, lang: 'fr' });
    check('R-AC6 41 chars and a listed word refused, nothing reached the model; 40 chars answered', long.reason === 'too-long' && word.reason === 'blocklist' && after === before && ok40.ok === true && (await calls(port)) === after + 1, { long, word, before, after, ok40 });
    // R-IG006: read picks one of the things the page sends (the enum); a scripted vote comes back in turn.
    const read = await olive(port, { rung: 'read', slots: { note: templates.lists.notes_read.en[0] }, lang: 'en', options: ['yellow tulip', 'red tulip'] });
    const notOnPlot = await olive(port, { rung: 'read', slots: { note: 'Water the rock.' }, lang: 'en' });
    await setStub(port, { answers: { 'is-it-a': ['yes', 'no', 'yes'] } });
    const vote = [];
    for (let i = 0; i < 3; i++) vote.push((await olive(port, { rung: 'is-it-a', slots: { thing: 'a rock', kind: 'a flower' }, lang: 'en' })).value);
    await setStub(port, { answers: {} });
    check('R-IG006 read answers the thing the note names, from the plot’s own list; a note not on the table never reaches her; the vote comes back in turn', read.ok && read.value === 'red tulip' && notOnPlot.reason === 'not-in-list' && JSON.stringify(vote) === JSON.stringify(['yes', 'no', 'yes']), { read, notOnPlot, vote });
  } finally {
    stub.proc.kill();
  }
}

async function pagesPart() {
  const { withDeployedSite } = require('./drive-deployed.js');
  const DIR = process.argv[3];
  if (!DIR || !fs.existsSync(path.join(DIR, 'index.html'))) {
    console.error('pages: <deploy-dir> must be a deploy folder (templates/bot-garden through nodegx-deploy.cjs)');
    process.exit(2);
  }
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const stub = await startStub(path.resolve(DIR), []);
  const port = stub.port;
  /** What reached the (stub) model, the hint voicings apart: a refused slot must add nothing here. */
  const asked = async () => (await req(port, 'GET', '/__stub/calls')).body.calls.filter((c) => c.rung !== 'voice-hint').length;
  try {
    await withDeployedSite({ origin: `http://127.0.0.1:${port}` }, async (page) => {
      const { client } = page;
      const ev = (e) => page.evaluate(e);
      const shot = async (n) => SHOTS && page.screenshot(path.join(SHOTS, `${n}.png`));
      const has = (sel) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && e.offsetParent !== null; })()`);
      const text = (sel) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); return e && e.offsetParent !== null ? e.innerText.trim() : ''; })()`);
      const until = async (expr, ok, ms = 8000) => {
        const end = Date.now() + ms;
        let last = await ev(expr);
        while (!ok(last) && Date.now() < end) {
          await wait(150);
          last = await ev(expr);
        }
        return last;
      };
      // A press is a real CDP mouse event at the element's centre, after elementFromPoint says a finger would hit it.
      const tap = async (finder, label) => {
        let p = null;
        for (let i = 0; i < 20; i++) {
          p = await ev(`(() => { const el = (${finder}); if (!el) return { found: false }; el.scrollIntoView({ block: 'center', inline: 'center' }); return { found: true }; })()`);
          if (p.found) break;
          await wait(150);
        }
        await wait(200);
        if (p.found) p = await ev(`(() => { const el = (${finder}); const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const at = document.elementFromPoint(x, y); return { found: true, x, y, hit: !!at && (el === at || el.contains(at)), at: at ? at.tagName + '.' + String(at.className || '').slice(0, 60) : null, locked: !!el.closest('.gd-locked') }; })()`);
        if (!p.found || !p.hit) {
          check(`tap ${label}`, false, p);
          return false;
        }
        for (const type of ['mousePressed', 'mouseReleased']) await client.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
        await wait(250);
        return true;
      };
      const first = (sel) => `[...document.querySelectorAll(${JSON.stringify(sel)})].find((e) => e.offsetParent !== null)`;
      const byText = (sel, ...needles) => `[...document.querySelectorAll(${JSON.stringify(sel)})].find((e) => e.offsetParent !== null && ${JSON.stringify(needles)}.some((n) => e.innerText.includes(n)))`;
      const CARD_UP = `(() => { const e = document.querySelector('.bg-card-help'); return !!e && e.offsetParent !== null; })()`;
      /** A palette tap that places the block. P108 IW-001 F3: a first tap on a kind places it AND opens its card — Got it closes it. */
      /**
       * P108 IW-004: the program is Blockly (garden-kit.Blocks). A drawer block is tapped on its word (a C-block's middle
       * is its empty mouth), after the drawer is scrolled to it (the node's reveal, as a finger scrolls it).
       */
      const palPress = async (id, label) => {
        await ev(`(() => { const r = document.querySelector('.bg-blocks-box .gd-bk'); return !!r && !!r.__gardenBlocks && r.__gardenBlocks.reveal(${JSON.stringify(id)}); })()`);
        await wait(150);
        return tap(first(`.bg-blocks-box .gd-palette [data-pal-head="${id}"]`), label || `palette ${id}`);
      };
      /** A placed block's own word (Blockly nests the next block inside it: its word, not its centre). */
      const headOf = (t) => `(() => { const b = document.querySelector('.bg-blocks-box .gd-prog .gd-blk[data-t="${t}"]'); return b && b.querySelector('[data-head="' + b.getAttribute('data-id') + '"]'); })()`;
      const palTap = async (id) => {
        await palPress(id);
        await wait(200);
        if (await ev(CARD_UP)) {
          await tap(first('.bg-card-help .bg-card-ok'), `Got it (${id})`);
          await until(CARD_UP, (v) => v === false, 2000);
        }
      };
      const OWL = '.bg-owl';
      const SAY = '.bg-owl-say';

      // A fresh family: one band 10–12 player (Olive's rungs are band 10–12 only, ruling 4), in English.
      await page.setViewport({ width: 1368, height: 912, mobile: false });
      const origin = await ev('location.origin');
      await client.send('Storage.clearDataForOrigin', { origin, storageTypes: 'local_storage,indexeddb,cache_storage,service_workers' });
      await page.navigate('/');
      await wait(1200);
      await tap(first('button.bg-profile-new'), 'new player (the card)');
      await ev(`(() => { const el = [...document.querySelectorAll('input')].find((e) => e.offsetParent !== null); if (!el) return; el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, 'Ada'); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); })()`);
      await wait(250);
      await tap(byText('.bg-seg-btn', '10–12'), 'band 10–12 in the form');
      await tap(byText('.bg-seg-btn', 'English'), 'English in the form');
      await tap(first('button.bg-btn.bg-i-play'), 'create (Let’s go!)');
      const landed = await until('location.pathname', (p) => p === '/island');
      check('P setup: a band 10–12 player lands on the island', landed === '/island', landed);

      /** Free play: every rung this computer's exam passed, for band 10–12. Entered from the island (a reload of /workshop has no request, AC8). */
      const enterFree = async (tag) => {
        await page.navigate('/island');
        await wait(1100);
        // The card's own line: its tag became the mockup's arrow in s4 ("Free play" is the heading above the card).
        await tap(byText('.bg-quest', 'No request', 'Sans demande'), `free play (${tag})`);
        await until('location.pathname', (p) => p === '/workshop');
        return until(`!!document.querySelector('.gd-palette [data-pal="fwd"]')`, Boolean, 6000);
      };
      /** Add an Olive block and fill its slots with the first word offered (IG-006: olive:<rung>). */
      const addAsk = async (rung, ...slots) => {
        await palTap(`olive:${rung}`);
        for (const slot of slots) {
          await tap(first(`.bg-blocks-box .gd-prog .gd-blk[data-t="olive:${rung}"] .gd-slot[data-slot="${slot}"]`), `slot ${slot}`);
          await tap(first('.bg-blocks-box .gd-picker .gd-opt'), `the first word for ${slot}`);
        }
      };
      // P106 IG-005: a request is padlocked until the robot it needs is lent (a new family has Pip only). This drive grades
      // Olive, not the lending: the robots the requests need (the template's request data) are written into her stored
      // island as lent rows, and the island read again. drive-ig005-robots.js grades the lock and the lending.
      const NEEDED = (() => {
        const nodes = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'templates', 'bot-garden', 'components', 'Data', 'Requests', 'nodes.json'), 'utf8'));
        const list = Array.isArray(nodes) ? nodes : nodes.nodes || Object.values(nodes);
        return [...new Set(JSON.parse(list.find((n) => n.type === 'Static Data').parameters.json).map((r) => r.needs).filter(Boolean))];
      })();
      const openRequest = async (title, tag) => {
        await page.navigate('/island');
        await wait(1100);
        await tap(byText('.bg-quest', title), `the request (${tag})`);
        if ((await until('location.pathname', (p) => p === '/workshop', 1500)) !== '/workshop' && (await ev(`((document.querySelector('.bg-plot-line') || {}).innerText || '').indexOf('🔒') === 0`))) {
          await ev(`(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); const v = JSON.parse(localStorage.getItem(k)); const m = v.model || v; const a = m.profiles.find((p) => p.id === m.island.activeId); a.island.robots = a.island.robots || [{ id: 'r1' }]; for (const kind of ${JSON.stringify(NEEDED)}) if (!a.island.robots.some((r) => (r.kind || r.id) === kind)) a.island.robots.push({ id: kind, kind }); localStorage.setItem(k, JSON.stringify(v)); })()`);
          await page.navigate('/island');
          await wait(1100);
          await tap(byText('.bg-quest', title), `the request (${tag}, robots lent)`);
        }
        await until('location.pathname', (p) => p === '/workshop');
        return until(`!!document.querySelector('.bg-blocks-box .gd-palette [data-pal="fwd"]')`, Boolean, 6000);
      };
      const play = () => tap(first('.bg-controls .bg-i-play'), 'Play');
      /** The block list is locked while a run plays (the kit's own rule): wait for the run to end before editing. */
      const runOver = () => until(`!document.querySelector('.gd-locked')`, Boolean, 8000);

      // ── P-AC6 (IG-006): no block has a keyboard; an is-it-a block with its kind unset says so inline, and Play sends nothing ──
      await enterFree('P-AC6');
      await shot('workshop-free');
      await addAsk('is-it-a');
      const missing = await until(`(document.querySelector('.bg-slot-msg') || {}).innerText || ''`, Boolean, 3000);
      await tap(first('.bg-blocks-box .gd-prog .gd-blk[data-t="olive:is-it-a"] .gd-slot[data-slot="kind"]'), 'the kind slot');
      const keyboard = await ev(`!!document.querySelector('.bg-blocks-box .gd-slot-text')`);
      const offered = await ev(`[...document.querySelectorAll('.bg-blocks-box .gd-picker .gd-opt')].map((o) => o.getAttribute('data-opt'))`);
      await tap(first('.bg-blocks-box .gd-prog .gd-blk[data-t="olive:is-it-a"] .gd-slot[data-slot="kind"]'), 'the kind slot (closed)');
      const beside = await ev(`(() => { const m = document.querySelector('.bg-slot-msg'), b = document.querySelector('.bg-blocks-box'); if (!m || !b) return null; const r = m.getBoundingClientRect(), q = b.getBoundingClientRect(); return { gap: Math.round(r.top - q.bottom), left: Math.round(r.left - q.left) }; })()`);
      const before6 = await asked();
      const pressed6 = await play();
      await wait(2000);
      const after6 = await asked();
      const row6 = await text(OWL);
      await shot('ac6-kind-unset');
      check('P-AC6 a new is-it-a block says what it needs first ("Fill in every slot first."), under the block list', /Fill in every slot first|Remplis d’abord toutes les cases/.test(missing) && !!beside && beside.gap >= 0 && beside.gap < 40, { missing, beside });
      check('P-AC6 IG-006: its only slot is a list — no keyboard — and it offers the four kinds (the thing ahead is the engine’s)', keyboard === false && JSON.stringify(offered) === JSON.stringify(templates.lists.kinds.en), { keyboard, offered });
      check('P-AC6 … and Play sends nothing to Olive (the stub’s calls, the voicings apart, do not grow); the owl does not claim she is resting', pressed6 && after6 === before6 && !/resting|se repose/i.test(row6), { before6, after6, row6 });
      await runOver();

      // ── P-IG6-AC2: Mamie's note through the real route: read → if Olive read the red tulip → the red row, not the yellow ──
      await openRequest('Water the flowers my note asks for', 'Mamie’s note');
      for (const op of ['read']) await addAsk(op);
      for (const op of ['fwd', 'fwd', 'if']) await palTap(op);
      await tap(first('.bg-blocks-box .gd-prog .gd-blk[data-t="if"] .gd-slot[data-slot="sensor"]'), 'the if’s sensor');
      await tap(first('.bg-blocks-box .gd-picker .gd-opt[data-opt="olive_read:red_tulip"]'), 'Olive read “red tulip”');
      await tap(headOf('if'), 'the if (the place new blocks go)');
      for (const op of ['left', 'water']) await palTap(op);
      const reads0 = (await req(port, 'GET', '/__stub/calls')).body.calls.filter((c) => c.rung === 'read').length;
      await play();
      const readBubble = await until(`[...document.querySelectorAll('.bg-stage .gd-bubble.gd-olive')].map((e) => e.innerText).join('|')`, (t) => t.includes('Olive read: red tulip'), 8000);
      await runOver();
      await wait(700);
      const readCalls = (await req(port, 'GET', '/__stub/calls')).body.calls.filter((c) => c.rung === 'read').slice(reads0);
      const tulipAt = (x, y) => ev(`(() => { const t = document.querySelector('.bg-stage .gd-cell[data-x="${x}"][data-y="${y}"] .gd-tulip'); return t ? (t.getAttribute('class').includes('gd-wet') ? 'wet' : 'dry') : 'none'; })()`);
      const rowsNote = { red: await tulipAt(2, 2), yellow: await tulipAt(2, 4) };
      const lineNote = await text(SAY);
      await shot('ig006-ac2-note-route');
      check('P-IG6-AC2 through the shell’s route: read is sent the note and the plot’s things; the bubble says “Olive read: red tulip”', readCalls.length === 1 && readCalls[0].values.note === 'The red ones, not the yellow.' && readBubble.includes('Olive read: red tulip'), { readCalls, readBubble });
      check('P-IG6-AC2 “if Olive read red tulip” waters the red row and not the yellow', rowsNote.red === 'wet' && rowsNote.yellow === 'dry', rowsNote);
      check('P-IG6-AC7 after the run, the owl names the block asked (read the note)', /Olive read the note/.test(lineNote), lineNote);

      // ── P-IG6-AC3: the rock and the flowers — ask 3 times, "2 of 3 said yes", the majority waters ──
      await openRequest('Water the flowers, not the rocks', 'the rock and the flowers');
      // P108 IW-003 (lane S): Echo carries an empty can now — turn to the pond below, fill, turn back, then as before.
      for (const op of ['right', 'fill', 'left', 'fwd', 'left']) await palTap(op);
      await addAsk('is-it-a');
      await tap(first('.bg-blocks-box .gd-prog .gd-blk[data-t="olive:is-it-a"] .gd-slot[data-slot="kind"]'), 'kind');
      await tap(first('.bg-blocks-box .gd-picker .gd-opt[data-opt="a flower"]'), 'a flower');
      await tap(first('.bg-blocks-box .gd-prog .gd-blk[data-t="olive:is-it-a"] .gd-slot[data-slot="times"]'), 'times');
      await tap(first('.bg-blocks-box .gd-picker .gd-opt[data-opt="3"]'), 'ask 3 times');
      await palTap('if');
      await tap(first('.bg-blocks-box .gd-prog .gd-blk[data-t="if"] .gd-slot[data-slot="sensor"]'), 'the if’s sensor');
      await tap(first('.bg-blocks-box .gd-picker .gd-opt[data-opt="olive_says:yes"]'), 'Olive says yes');
      await tap(headOf('if'), 'the if (the place new blocks go)');
      await palTap('water');
      await setStub(port, { answers: { 'is-it-a': ['yes', 'no', 'yes'] } });
      const isa0 = (await req(port, 'GET', '/__stub/calls')).body.calls.filter((c) => c.rung === 'is-it-a').length;
      await play();
      const voteBubble = await until(`[...document.querySelectorAll('.bg-stage .gd-bubble.gd-olive')].map((e) => e.innerText).join('|')`, (t) => t.includes('2 of 3 said yes'), 10000);
      await runOver();
      await wait(700);
      const voteCalls = (await req(port, 'GET', '/__stub/calls')).body.calls.filter((c) => c.rung === 'is-it-a').slice(isa0);
      const wetVote = await tulipAt(1, 2);
      await setStub(port, { answers: {} });
      await shot('ig006-ac3-vote-route');
      check('P-IG6-AC3 ask 3 times through the route: three asks about “a red tulip” (the engine names it), “2 of 3 said yes”, the tulip watered', voteCalls.length === 3 && voteCalls.every((c) => c.values.thing === 'a red tulip' && c.values.kind === 'a flower') && voteBubble.includes('2 of 3 said yes') && wetVote === 'wet', { voteCalls: voteCalls.map((c) => c.values), voteBubble, wetVote });

      // ── P-IG6-AC6: Olive's five lessons on Skills, through the shell's route (the stub answers as the readout did) ──
      await page.navigate('/skills');
      await wait(1500);
      const nLessons = await ev(`[...document.querySelectorAll('.bg-lesson')].filter((e) => e.offsetParent !== null).length`);
      for (let i = 0; i < nLessons; i++) await tap(`[...document.querySelectorAll('.bg-lesson')].filter((e) => e.offsetParent !== null)[${i}].querySelector('.bg-lesson-ask')`, `Ask Olive (lesson ${i + 1})`);
      await wait(1500);
      const lessonText = await ev(`[...document.querySelectorAll('.bg-lesson')].filter((e) => e.offsetParent !== null).map((e) => ({ text: e.innerText, marked: [...e.querySelectorAll('.bg-letter')].filter((x) => getComputedStyle(x).backgroundColor !== 'rgba(0, 0, 0, 0)').length }))`);
      await shot('ig006-ac6-lessons-route');
      const L = (i, ...needles) => !!lessonText[i] && needles.every((n) => lessonText[i].text.includes(n));
      check('P-IG6-AC6 five lessons through the route: 6 tulips vs the program’s 4; 14 vs 23; every e marked; the book under each tall tale; the direction both ways', nLessons === 5 && L(0, 'Olive: 6', 'counts the word “tulip”: 4') && L(1, 'Olive: 14', '14 + 9 = 23') && lessonText[2].marked > 0 && L(2, `${lessonText[2].marked} × e`) && L(3, 'Canberra', 'Karl Drais') && L(4, 'The tulips are thirsty.', 'Les tulipes sont vif.'), lessonText);

      // ── P-AC3: the voiced hint. Mutant: the written line stays, silently. Clean: Olive's voicing replaces it ──
      await setStub(port, { mutant: true });
      await enterFree('P-AC3 mutant');
      await wait(2500);
      const mutantRow = await text(SAY);
      const mutantOwl = await text(OWL);
      await setStub(port, { mutant: false });
      await enterFree('P-AC3 clean');
      const cleanRow = await until(`(document.querySelector(${JSON.stringify(SAY)}) || {}).innerText || ''`, (t) => /Hou hou|Hoo hoo/.test(t), 5000);
      await shot('ac3-owl-row');
      check('P-AC3 mutant: the written line stays and the owl does not say she is resting (dropped silently)', mutantRow.length > 0 && !/Hou hou|Hoo hoo/.test(mutantRow) && !/resting|se repose/i.test(mutantOwl), { mutantRow, mutantOwl });
      check('P-AC3 clean: the voiced line replaces the written one', /Hou hou|Hoo hoo/.test(cleanRow), { cleanRow });

      // ── P-AC2: a hung rung. Thinking while parked, the page alive (the robot moved first, animation frames, the dots); resting after the 12 s ──
      await setStub(port, { hang: ['is-it-a'] });
      await enterFree('P-AC2');
      if (!(await has('.gd-palette [data-pal="olive:is-it-a"]'))) skip('P-AC2 thinking, the page alive, then resting', '[data-pal="olive:is-it-a"] in free play');
      else {
        await palTap('fwd');
        await addAsk('is-it-a', 'kind');
        const x0 = await ev(`(document.querySelector('.bg-stage .gd-bot') || { getAttribute: () => null }).getAttribute('data-x')`);
        await play();
        // Parked = the ask block is the one running AND the owl says she is thinking (s3 run 1: the tag alone was the
        // hint's voicing, while the ask had been refused — its list cut by the kit — and never parked).
        const PARKED = `(() => { const b = document.querySelector('.bg-blocks-box .gd-prog .gd-blk[data-t="olive:is-it-a"]'); const o = document.querySelector(${JSON.stringify(OWL)}); return !!b && b.getAttribute('data-run') === 'true' && !!o && /réfléchit|thinking/i.test(o.innerText); })()`;
        await until(PARKED, Boolean, 4000);
        const thinking = await text(OWL);
        // Ends on a timer, never on a frame: a throttled rAF must read as few frames, not hang the drive.
        const live = await ev(`new Promise((done) => { let frames = 0; const dots = document.getAnimations().filter((a) => a.animationName === 'bg-dots'); const c0 = dots.map((a) => a.currentTime); const tick = () => { frames++; requestAnimationFrame(tick); }; requestAnimationFrame(tick); setTimeout(() => done({ frames, dots: dots.length, moved: dots.some((a, i) => a.currentTime !== c0[i]) }), 600); })`);
        const x1 = await ev(`(document.querySelector('.bg-stage .gd-bot') || { getAttribute: () => null }).getAttribute('data-x')`);
        const stillParked = await ev(PARKED);
        const resting = await until(`(document.querySelector(${JSON.stringify(OWL)}) || {}).innerText || ''`, (t) => /se repose|resting/i.test(t), 16000);
        await setStub(port, { hang: [] });
        await shot('ac2-resting');
        check('P-AC2 parked: the owl says she is thinking; the page keeps animating (the robot walked first, ≥ 20 frames in 600 ms, the dots move)', /réfléchit|thinking/i.test(thinking) && stillParked && x1 !== x0 && live.frames >= 20 && live.dots > 0 && live.moved, { thinking, x0, x1, live, stillParked });
        check('P-AC2 after the page’s 12 s: the run resumes on the written answer and the owl says she is resting', /se repose|resting/i.test(resting), { resting });
      }

      // ── P-AC5: the exam gate on the page ──
      await setStub(port, { exam: { read: 'fail' } });
      await req(port, 'POST', '/__garden/olive/exam', {});
      await enterFree('P-AC5 failed');
      await wait(800);
      const heldPal = await has('.gd-palette [data-pal="olive:read"]');
      const otherPal = await has('.gd-palette [data-pal="olive:is-it-a"]');
      await page.navigate('/skills');
      const skillsLine = await until(`(document.querySelector('.bg-olive-held') || {}).innerText || ''`, Boolean, 5000);
      await shot('ac5-skills');
      await setStub(port, { exam: { read: 'pass' } });
      await req(port, 'POST', '/__garden/olive/exam', {});
      await enterFree('P-AC5 passed');
      await wait(800);
      const backPal = await has('.gd-palette [data-pal="olive:read"]');
      await page.navigate('/skills');
      await wait(1500);
      const skillsAfter = await has('.bg-olive-held');
      check('P-AC5 withheld after a failed exam (the other rungs still offered), offered after a passing re-run; Skills says so, then stops saying it', heldPal === false && otherPal === true && backPal === true && /can’t do this here yet|ne sait pas encore faire ça ici/.test(skillsLine) && /read the note|lire le mot/.test(skillsLine) && skillsAfter === false, { heldPal, otherPal, backPal, skillsLine, skillsAfter });

      // ── P-390: the Workshop still fits a phone with the hooks in (Play and the owl on screen at scroll 0) ──
      await page.setViewport({ width: 390, height: 844, mobile: true });
      await enterFree('P-390');
      await wait(900);
      await ev('window.scrollTo(0, 0)');
      const fit = await ev(`(() => { const box = (s) => { const e = [...document.querySelectorAll(s)].find((x) => x.offsetParent !== null); if (!e) return null; const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }; return { play: box('.bg-controls .bg-i-play'), owl: box('.bg-owl'), vw: innerWidth, vh: innerHeight, sx: document.scrollingElement.scrollWidth }; })()`);
      await shot('workshop-free-390');
      check('P-390 free play at 390×844: Play and the owl on screen at scroll 0, nothing wider than the phone', !!fit.play && fit.play.bottom <= fit.vh && !!fit.owl && fit.owl.top < fit.vh && fit.vw === 390 && fit.sx <= 390, fit);
      await page.setViewport({ width: 1368, height: 912, mobile: false });

      // ── P-S3-R5: the new pieces' words at ≥ 4.5:1 on their ground (the slot line, the proposal card, the tags, the Skills line) ──
      await enterFree('contrast');
      await addAsk('is-it-a');
      await wait(600);
      await palPress('olive:say-thanks', 'say (its card, for the contrast)');
      await until(CARD_UP, Boolean, 2000);
      const ratios = await ev(`(() => {
        const parse = (c) => { const m = String(c).match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
        const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
        const ground = (el) => { for (let e = el; e; e = e.parentElement) { const bg = parse(getComputedStyle(e).backgroundColor); if (bg && bg.a >= 0.999) return bg; } return { r: 255, g: 255, b: 255, a: 1 }; };
        const out = {};
        for (const sel of ['.bg-slot-msg', '.bg-card-title', '.bg-card-line', '.bg-card-ok', '.bg-help-chip', '.bg-owl-say', '.bg-owl-tag']) {
          const el = [...document.querySelectorAll(sel)].find((e) => e.offsetParent !== null);
          if (!el) { out[sel] = null; continue; }
          const leaf = [...el.querySelectorAll('*')].concat([el]).find((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) || el;
          const fg = parse(getComputedStyle(leaf).color), bg = ground(leaf);
          const x = lum(fg), y = lum(bg);
          out[sel] = Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100;
        }
        return out;
      })()`);
      await shot('contrast-hooks');
      await tap(first('.bg-card-help .bg-card-ok'), 'Got it (after the contrast)');
      const measured = Object.entries(ratios).filter(([, r]) => r !== null);
      check(`P-S3-R5 the hooks’ words ≥ 4.5:1 on their ground (${measured.length} measured)`, measured.length >= 5 && measured.every(([, r]) => r >= 4.5), ratios);

      // ── IG-001 (P106 s1): AC1 the parked step, AC6 what Olive said, AC7 "if Olive says yes" — the stub scripted through the real route ──
      const owlThinking = `(() => { const e = document.querySelector('.bg-owl-thinking'); return !!e && e.offsetParent !== null; })()`;
      const asksOf = async (rung) => (await req(port, 'GET', '/__stub/calls')).body.calls.filter((c) => c.rung === rung).length;
      const step = () => tap(first('.bg-controls .bg-i-step'), 'One step');
      const reset = () => tap(first('.bg-controls .bg-i-reset'), 'Start over');
      await enterFree('IG-001');
      // IG-006: the parked block is Olive's thank-you (the poem rung was cut with the other twelve).
      await setStub(port, { answers: { 'say-thanks': 'Tulla the tulip' } });
      await addAsk('say-thanks', 'to', 'deed');
      await wait(1200);
      await setStub(port, { delayFor: { 'say-thanks': 1500 } }); // the thank-you alone is held: the hint voicings answer at once
      const poem0 = await asksOf('say-thanks');
      await step();
      const tagOn = await until(owlThinking, Boolean, 2000);
      await step(); // while parked: a no-op
      await wait(300);
      const poemMid = await asksOf('say-thanks');
      const tagOff = await until(owlThinking, (v) => v === false, 6000);
      const bubble = await until(`(() => { const b = document.querySelector('.gd-bubble.gd-olive'); return b ? b.innerText : ''; })()`, Boolean, 2500);
      const poemAfter = await asksOf('say-thanks');
      await setStub(port, { delayFor: {} });
      await shot('ig001-ac1-parked-step');
      check('IG-001 AC1: One step parks on Olive (thinking on); a Step while parked asks nothing more; the tag clears when she answers, with no further press; exactly one ask sent', tagOn === true && poemMid === poem0 + 1 && tagOff === false && poemAfter === poem0 + 1, { tagOn, poem0, poemMid, tagOff, poemAfter });
      check('IG-001 AC6: what Olive said ("Tulla the tulip") is on the robot, in the olive bubble', /Tulla the tulip/.test(bubble), { bubble });
      // Start over while parked: the tag is off within one tick.
      await reset();
      await wait(400);
      await addAsk('say-thanks', 'to', 'deed');
      await wait(1200);
      await setStub(port, { delayFor: { 'say-thanks': 1500 } });
      await step();
      const parkedAgain = await until(owlThinking, Boolean, 2000);
      const poemBeforeReset = await asksOf('say-thanks');
      await reset();
      // Through the shell the new line's voicing queues behind the held poem ask (the owl answers one at a time), so
      // the tag is the voicing's until that drains (≤ 1.5 s + the voicing); the one-tick reading is the page drive's
      // (drive-cg003-pages.js, an in-page stub with no queue). Here: it clears once the queue drains, and nothing was asked again.
      const cleared = await until(owlThinking, (v) => v === false, 3200);
      await setStub(port, { delayFor: {} });
      check('IG-001 AC1: Start over while parked — the tag clears once the held ask drains through the shell’s queue (≤ 3.2 s), and Olive is not asked again', parkedAgain === true && cleared === false && (await asksOf('say-thanks')) === poemBeforeReset, { parkedAgain, cleared });
      // AC6: a say block shows its line, plain.
      await wait(400);
      await setStub(port, { answers: {} });
      await palTap('say');
      await step();
      const plain = await until(`(() => { const b = document.querySelector('.gd-bubble:not(.gd-olive)'); return b ? b.innerText : ''; })()`, Boolean, 2500);
      check('IG-001 AC6: a say block shows its line in the plain bubble', /Mamie Rose/.test(plain) && !/Tulla/.test(plain), { plain });
      // AC7: fwd, fwd, left (facing the first tulip), ask Olive is-it-a, if Olive says yes → water. Yes waters; no does not.
      await reset();
      await wait(400);
      for (const op of ['fwd', 'fwd', 'left']) await palTap(op);
      await addAsk('is-it-a', 'kind');
      await palTap('if');
      // A tap on the block's WORD selects it (its centre is the sensor slot, a button the kit keeps out of block taps).
      await tap(headOf('if'), 'the if block’s word (select it as the place new blocks go)');
      await palTap('water');
      const sensorOpen = await ev(`(() => { const s = document.querySelector('.gd-prog .gd-blk[data-t="if"] .gd-slot[data-slot="sensor"]'); return s ? s.getAttribute('aria-expanded') : null; })()`);
      if (sensorOpen !== 'true') await tap(first('.gd-prog .gd-blk[data-t="if"] .gd-slot[data-slot="sensor"]'), 'the if’s sensor slot');
      await tap(first('.gd-picker .gd-opt[data-opt="olive_says:yes"]'), 'Olive says yes');
      // IW-004: Blockly nests the next block inside the if too — "in its body" is read off the program itself; its field
      // text writes spaces as no-break spaces.
      const shape = await ev(`(() => { const i = document.querySelector('.bg-blocks-box .gd-prog .gd-blk[data-t="if"]'); const s = i && i.querySelector('.gd-slot[data-slot="sensor"]'); const p = Noodl.Variables.gardenProgram; const l = typeof p === 'string' ? JSON.parse(p || '[]') : p || []; const b = l.find((x) => x && x.t === 'if'); return { sensor: s && s.getAttribute('data-value'), label: s && s.textContent.replace(/\u00a0/g, ' '), inBody: !!b && Array.isArray(b.body) && b.body.some((x) => x.t === 'water'), blocks: document.querySelectorAll('.bg-blocks-box .gd-prog .gd-blk[data-id]').length }; })()`);
      const wet = () => ev(`document.querySelectorAll('.bg-stage .gd-wet').length`);
      await setStub(port, { answers: { 'is-it-a': 'yes' } });
      await play();
      await runOver();
      await wait(600);
      const wetYes = await wet();
      await shot('ig001-ac7-olive-says-yes');
      await setStub(port, { answers: { 'is-it-a': 'no' } });
      await play();
      await runOver();
      await wait(600);
      const wetNo = await wet();
      await setStub(port, { answers: {} });
      check('IG-001 AC7: the picker offers "Olive says yes"; is it a…? → if Olive says yes → water waters when the stub says yes and not when it says no', shape.sensor === 'olive_says:yes' && shape.label === 'Olive says yes' && shape.inBody && shape.blocks === 6 && wetYes === 1 && wetNo === 0, { shape, wetYes, wetNo });

      check('P console: 0 errors', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
    });
  } finally {
    stub.proc.kill();
  }
}

(MODE === 'route' ? routePart() : pagesPart())
  .then(() => {
    const failed = results.filter((r) => r.status === 'FAIL').length;
    const summary = { mode: MODE, pass: results.filter((r) => r.status === 'PASS').length, fail: failed, skip: results.filter((r) => r.status === 'SKIP').length, results };
    console.log(JSON.stringify({ pass: summary.pass, fail: summary.fail, skip: summary.skip }));
    if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(summary, null, 2));
    process.exit(failed ? 1 : 0);
  })
  .catch((e) => {
    console.error(`drive-cg005-olive: ${e.stack || e.message}`);
    process.exit(1);
  });
