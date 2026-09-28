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
 *   R-AC5  exam with words-to-blocks switched to fail → status withholds it; switched to pass, exam re-run → offered
 *   R-AC2  a hung rung → the shell's timeout (--timeout 1500) answers {fallback, reason:'timeout'} in 1.5–4 s
 *   R-AC6  a 41-character text slot and a listed word are refused by the route and the stub's call log does not grow
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
 *   P-AC5  exam fail → no [data-pal="ask:words-to-blocks"] (poem still offered) and Skills' `.bg-olive-held` says
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
    await setStub(port, { exam: { 'words-to-blocks': 'fail' } });
    const e1 = await req(port, 'POST', '/__garden/olive/exam', {});
    const s1 = (await req(port, 'GET', '/__garden/olive/status')).body.exam;
    await setStub(port, { exam: { 'words-to-blocks': 'pass' } });
    await req(port, 'POST', '/__garden/olive/exam', {});
    const s2 = (await req(port, 'GET', '/__garden/olive/status')).body.exam;
    check('R-AC5 exam fail withholds words-to-blocks; pass + re-run offers it', e1.status === 200 && withheldOf(s1).includes('words-to-blocks') && !withheldOf(s2).includes('words-to-blocks') && s1.at !== s2.at, { first: withheldOf(s1), second: withheldOf(s2) });
    // R-AC2
    await setStub(port, { hang: ['count-tulips'] });
    const t0 = Date.now();
    const hung = await olive(port, { rung: 'count-tulips', slots: { list: templates.lists.flowerlists.fr[0] }, lang: 'fr' });
    const took = Date.now() - t0;
    await setStub(port, { hang: [] });
    check('R-AC2 a hung rung → timeout fallback in 1.5–4 s', hung.fallback === true && hung.reason === 'timeout' && took >= 1400 && took < 4000, { hung, took });
    // R-AC6
    const before = await calls(port);
    const long = await olive(port, { rung: 'poem', slots: { flower: 'T'.repeat(41) }, lang: 'fr' });
    const word = await olive(port, { rung: 'poem', slots: { flower: 'Tulla la stupide' }, lang: 'fr' });
    const after = await calls(port);
    const ok40 = await olive(port, { rung: 'poem', slots: { flower: 'T'.repeat(40) }, lang: 'fr' });
    check('R-AC6 41 chars and a listed word refused, nothing reached the model; 40 chars answered', long.reason === 'too-long' && word.reason === 'blocklist' && after === before && ok40.ok === true && (await calls(port)) === after + 1, { long, word, before, after, ok40 });
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
        if (p.found) p = await ev(`(() => { const el = (${finder}); const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const at = document.elementFromPoint(x, y); return { found: true, x, y, hit: !!at && (el === at || el.contains(at)) }; })()`);
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
      const blocks = () => ev(`document.querySelectorAll('.gd-prog .gd-blk[data-id]').length`);
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
        await tap(byText('.bg-quest', 'Free play', 'Jeu libre'), `free play (${tag})`);
        await until('location.pathname', (p) => p === '/workshop');
        return until(`!!document.querySelector('.gd-palette [data-pal="fwd"]')`, Boolean, 6000);
      };
      /** Add a rung's block and fill its first slot with the first word offered. */
      const addAsk = async (rung, slot) => {
        await tap(first(`.gd-palette [data-pal="ask:${rung}"]`), `palette ask:${rung}`);
        if (!slot) return;
        await tap(first(`.gd-prog .gd-slot[data-slot="${slot}"]`), `slot ${slot}`);
        await tap(first('.gd-picker .gd-opt'), `the first word for ${slot}`);
      };
      const play = () => tap(first('.bg-controls .bg-i-play'), 'Play');

      // ── P-AC6: band 10–12's text slot: 40 characters, the 41st refused; a listed word refused inline; Play sends nothing ──
      await enterFree('P-AC6');
      await shot('workshop-free');
      if (!(await has('.gd-palette [data-pal="ask:poem"]'))) skip('P-AC6 band 10–12 text slot', '[data-pal="ask:poem"] in free play at band 10–12');
      else {
        await addAsk('poem');
        const missing = await until(`(document.querySelector('.bg-slot-msg') || {}).innerText || ''`, Boolean, 3000);
        await tap(first('.gd-prog .gd-slot[data-slot="flower"]'), 'the flower slot');
        const max = await ev(`(document.querySelector('.gd-slot-text') || {}).maxLength`);
        await ev(`document.querySelector('.gd-slot-text') && document.querySelector('.gd-slot-text').focus()`);
        await client.send('Input.insertText', { text: 'T'.repeat(41) });
        await wait(300);
        const len = await ev(`(document.querySelector('.gd-slot-text') || { value: '' }).value.length`);
        check('P-AC6 the text field holds 40 and refuses the 41st', max === 40 && len === 40, { max, len });
        await ev(`(() => { const i = document.querySelector('.gd-slot-text'); if (!i) return; i.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, ''); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
        await client.send('Input.insertText', { text: 'Tulla la stupide' });
        const line = await until(`(document.querySelector('.bg-slot-msg') || {}).innerText || ''`, (t) => /can’t use that word|ne peut pas utiliser ce mot/.test(t), 3000);
        const beside = await ev(`(() => { const m = document.querySelector('.bg-slot-msg'), b = document.querySelector('.bg-blocks-box'); if (!m || !b) return null; const r = m.getBoundingClientRect(), q = b.getBoundingClientRect(); return { gap: Math.round(r.top - q.bottom), left: Math.round(r.left - q.left) }; })()`);
        const before = await asked();
        const pressed = await play();
        await wait(2000);
        const after = await asked();
        const row = await text(OWL);
        await shot('ac6-listed-word');
        check('P-AC6 a new ask block says what it needs first ("Fill in every slot first.")', /Fill in every slot first|Remplis d’abord toutes les cases/.test(missing), missing);
        check('P-AC6 a listed word is refused inline, under the block list', /can’t use that word|ne peut pas utiliser ce mot/.test(line) && !!beside && beside.gap >= 0 && beside.gap < 40, { line, beside });
        check('P-AC6 … and Play sends nothing to Olive (the stub’s calls, the voicings apart, do not grow); the owl does not claim she is resting', pressed && after === before && !/resting|se repose/i.test(row), { before, after, row });
      }

      // ── P-AC1: Olive's blocks are a proposal: "Use them" places them, "No thanks" leaves the program alone ──
      await enterFree('P-AC1');
      if (!(await has('.gd-palette [data-pal="ask:words-to-blocks"]'))) skip('P-AC1 the proposal card', '[data-pal="ask:words-to-blocks"] in free play');
      else {
        await addAsk('words-to-blocks', 'route');
        const n0 = await blocks();
        await play();
        const card = await until(`(() => { const c = document.querySelector('.bg-proposal'); return c && c.offsetParent !== null ? c.innerText : ''; })()`, Boolean, 8000);
        const n1 = await blocks();
        await shot('ac1-proposal');
        check('P-AC1 Olive’s blocks come as a card in her row — "Use them" / "No thanks" — and are NOT in the program yet', !!card && /Use them|Je les prends/.test(card) && /No thanks|Non merci/.test(card) && n1 === n0, { card, n0, n1 });
        await tap(first('.bg-proposal .bg-prop-use'), 'Use them');
        const n2 = await until(`document.querySelectorAll('.gd-prog .gd-blk[data-id]').length`, (n) => n > n0, 4000);
        const gone = !(await has('.bg-proposal'));
        check('P-AC1 "Use them" places her blocks after the ask, and the card goes', n2 > n0 && gone, { n0, n2, gone });
        await play();
        const again = await until(`(() => { const c = document.querySelector('.bg-proposal'); return !!c && c.offsetParent !== null; })()`, Boolean, 8000);
        const n3 = await blocks();
        if (again) await tap(first('.bg-proposal .bg-prop-no'), 'No thanks');
        await wait(500);
        const n4 = await blocks();
        check('P-AC1 a new run proposes again; "No thanks" hides it and changes nothing', again && n4 === n3 && !(await has('.bg-proposal')), { again, n3, n4 });
      }

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
      await setStub(port, { hang: ['count-tulips'] });
      await enterFree('P-AC2');
      if (!(await has('.gd-palette [data-pal="ask:count-tulips"]'))) skip('P-AC2 thinking, the page alive, then resting', '[data-pal="ask:count-tulips"] in free play');
      else {
        await tap(first('.gd-palette [data-pal="fwd"]'), 'palette fwd');
        await addAsk('count-tulips', 'list');
        const x0 = await ev(`(document.querySelector('.bg-stage .gd-bot') || { getAttribute: () => null }).getAttribute('data-x')`);
        await play();
        const thinking = await until(`(document.querySelector(${JSON.stringify(OWL)}) || {}).innerText || ''`, (t) => /réfléchit|thinking/i.test(t), 4000);
        // Ends on a timer, never on a frame: a throttled rAF must read as few frames, not hang the drive.
        const live = await ev(`new Promise((done) => { let frames = 0; const dots = document.getAnimations().filter((a) => a.animationName === 'bg-dots'); const c0 = dots.map((a) => a.currentTime); const tick = () => { frames++; requestAnimationFrame(tick); }; requestAnimationFrame(tick); setTimeout(() => done({ frames, dots: dots.length, moved: dots.some((a, i) => a.currentTime !== c0[i]) }), 600); })`);
        const x1 = await ev(`(document.querySelector('.bg-stage .gd-bot') || { getAttribute: () => null }).getAttribute('data-x')`);
        const stillParked = /réfléchit|thinking/i.test(await text(OWL));
        const resting = await until(`(document.querySelector(${JSON.stringify(OWL)}) || {}).innerText || ''`, (t) => /se repose|resting/i.test(t), 16000);
        await setStub(port, { hang: [] });
        await shot('ac2-resting');
        check('P-AC2 parked: the owl says she is thinking; the page keeps animating (the robot walked first, ≥ 20 frames in 600 ms, the dots move)', /réfléchit|thinking/i.test(thinking) && stillParked && x1 !== x0 && live.frames >= 20 && live.dots > 0 && live.moved, { thinking, x0, x1, live, stillParked });
        check('P-AC2 after the page’s 12 s: the run resumes on the written answer and the owl says she is resting', /se repose|resting/i.test(resting), { resting });
      }

      // ── P-AC5: the exam gate on the page ──
      await setStub(port, { exam: { 'words-to-blocks': 'fail' } });
      await req(port, 'POST', '/__garden/olive/exam', {});
      await enterFree('P-AC5 failed');
      await wait(800);
      const heldPal = await has('.gd-palette [data-pal="ask:words-to-blocks"]');
      const otherPal = await has('.gd-palette [data-pal="ask:poem"]');
      await page.navigate('/skills');
      const skillsLine = await until(`(document.querySelector('.bg-olive-held') || {}).innerText || ''`, Boolean, 5000);
      await shot('ac5-skills');
      await setStub(port, { exam: { 'words-to-blocks': 'pass' } });
      await req(port, 'POST', '/__garden/olive/exam', {});
      await enterFree('P-AC5 passed');
      await wait(800);
      const backPal = await has('.gd-palette [data-pal="ask:words-to-blocks"]');
      await page.navigate('/skills');
      await wait(1500);
      const skillsAfter = await has('.bg-olive-held');
      check('P-AC5 withheld after a failed exam (the other rungs still offered), offered after a passing re-run; Skills says so, then stops saying it', heldPal === false && otherPal === true && backPal === true && /can’t do this here yet|ne sait pas encore faire ça ici/.test(skillsLine) && /words into blocks|des mots en blocs/.test(skillsLine) && skillsAfter === false, { heldPal, otherPal, backPal, skillsLine, skillsAfter });

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
      await addAsk('words-to-blocks', 'route');
      await play();
      await until(`!!document.querySelector('.bg-proposal')`, Boolean, 8000);
      await tap(first('.gd-palette [data-pal="ask:poem"]'), 'palette ask:poem (for the slot line)');
      await wait(600);
      const ratios = await ev(`(() => {
        const parse = (c) => { const m = String(c).match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
        const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
        const ground = (el) => { for (let e = el; e; e = e.parentElement) { const bg = parse(getComputedStyle(e).backgroundColor); if (bg && bg.a >= 0.999) return bg; } return { r: 255, g: 255, b: 255, a: 1 }; };
        const out = {};
        for (const sel of ['.bg-slot-msg', '.bg-proposal', '.bg-prop-blocks', '.bg-prop-use', '.bg-prop-no', '.bg-owl-say', '.bg-owl-tag']) {
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
      const measured = Object.entries(ratios).filter(([, r]) => r !== null);
      check(`P-S3-R5 the hooks’ words ≥ 4.5:1 on their ground (${measured.length} measured)`, measured.length >= 5 && measured.every(([, r]) => r >= 4.5), ratios);

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
