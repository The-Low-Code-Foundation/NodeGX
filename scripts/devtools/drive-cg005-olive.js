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
 *   node scripts/devtools/drive-cg005-olive.js pages <deploy-dir> [--workshop <url-path>] [--skills <url-path>] [--shots <dir>] [--json <file>]
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
 *   P-AC6  band 10–12: the text field's maxLength is 40 and typing 41 characters leaves 40; a listed word shows the
 *          inline refusal and pressing Play sends nothing (the stub's call log does not grow). (Band 7–9's picker is
 *          graded in cg005Olive.test.ts; a page drive of it needs a band-1 profile hook from CG-003.)
 *   P-AC3  mutant on, a hint shown: the owl row keeps the WRITTEN line (never "Hou hou"); mutant off: the voiced line
 *   P-AC2  a hung rung, Play: the owl row shows thinking; the robot sprite's left/top still change while parked
 *          (a sprite moved by an earlier block is mid-transition), then after the page's 12 s the row says resting
 *   P-AC5  exam fail → the palette has no [data-pal="ask:words-to-blocks"] and Skills says "can't do this here yet";
 *          pass + re-run + reload → the block is back
 * A page clause whose hook is not on the page is reported SKIP with the hook it looked for, never PASS.
 * Exits 0 when nothing FAILED (SKIPs are listed), 1 when a clause failed, 2 on a usage error.
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
  console.error('usage: drive-cg005-olive.js route | pages <deploy-dir> [--workshop <path>] [--skills <path>] [--shots <dir>] [--json <file>]');
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
  const WORKSHOP = arg('--workshop') || '/workshop';
  const SKILLS = arg('--skills') || '/skills';
  const stub = await startStub(path.resolve(DIR), []);
  const port = stub.port;
  try {
    await withDeployedSite({ origin: `http://127.0.0.1:${port}` }, async (page) => {
      const ev = (e) => page.evaluate(e);
      const shot = async (n) => SHOTS && page.screenshot(path.join(SHOTS, `${n}.png`));
      const has = (sel) => ev(`!!document.querySelector(${JSON.stringify(sel)})`);
      const text = (sel) => ev(`(document.querySelector(${JSON.stringify(sel)}) || {}).textContent || ''`);
      const bodyText = () => ev('document.body.innerText');
      const click = (sel) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.click(); return true; })()`);
      const clickText = (t) => ev(`(() => { const e = [...document.querySelectorAll('button,[role=button]')].find((b) => b.textContent.trim() === ${JSON.stringify(t)}); if (!e) return false; e.click(); return true; })()`);
      const OWL = '[data-owl-row]';

      await page.navigate(WORKSHOP);
      await wait(1500);
      await shot('workshop');

      // P-AC6 band 10–12
      if (!(await has('[data-pal="ask:poem"]'))) skip('P-AC6 band 10–12 text slot', '[data-pal="ask:poem"] in the Workshop palette (a request offering the poem rung, band 2)');
      else {
        await click('[data-pal="ask:poem"]');
        await wait(300);
        await click('.gd-prog .gd-slot[data-slot="flower"]');
        await wait(300);
        const max = await ev(`(document.querySelector('.gd-slot-text') || {}).maxLength`);
        await ev(`document.querySelector('.gd-slot-text') && document.querySelector('.gd-slot-text').focus()`);
        await page.client.send('Input.insertText', { text: 'T'.repeat(41) });
        await wait(300);
        const len = await ev(`(document.querySelector('.gd-slot-text') || { value: '' }).value.length`);
        check('P-AC6 the text field holds 40 and refuses the 41st', max === 40 && len === 40, { max, len });
        await ev(`(() => { const i = document.querySelector('.gd-slot-text'); if (!i) return; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, ''); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
        await page.client.send('Input.insertText', { text: 'Tulla la stupide' });
        await wait(400);
        const inline = (await bodyText()).includes('Olive ne peut pas utiliser ce mot.') || (await bodyText()).includes('Olive can’t use that word.');
        const before = await calls(port);
        const played = (await clickText('Play')) || (await clickText('Jouer'));
        await wait(1500);
        const after = await calls(port);
        await shot('ac6-listed-word');
        check('P-AC6 a listed word is refused inline and Play sends nothing', inline && played && after === before, { inline, played, before, after });
      }

      // P-AC3
      if (!(await has(OWL))) skip('P-AC3 the voiced hint', `${OWL} (the owl row)`);
      else {
        await setStub(port, { mutant: true });
        await page.navigate(WORKSHOP);
        await wait(3000);
        const mutantRow = await text(OWL);
        await setStub(port, { mutant: false });
        await page.navigate(WORKSHOP);
        await wait(3000);
        const cleanRow = await text(OWL);
        await shot('ac3-owl-row');
        check('P-AC3 mutant: the written line stays; clean: the voiced line replaces it', !/Hou hou|Hoo hoo/.test(mutantRow) && mutantRow.trim().length > 0 && /Hou hou|Hoo hoo/.test(cleanRow), { mutantRow, cleanRow });
      }

      // P-AC2
      if (!(await has('[data-pal="ask:count-tulips"]')) || !(await has('.gd-bot[data-robot="0"]'))) skip('P-AC2 thinking, the world keeps animating, then resting', '[data-pal="ask:count-tulips"] and .gd-bot[data-robot="0"]');
      else {
        await setStub(port, { hang: ['count-tulips'] });
        await page.navigate(WORKSHOP);
        await wait(1500);
        await click('[data-pal="fwd"]');
        await click('[data-pal="ask:count-tulips"]');
        await wait(300);
        const played = (await clickText('Play')) || (await clickText('Jouer'));
        const samples = [];
        for (let i = 0; i < 8; i++) {
          samples.push(await ev(`(() => { const b = document.querySelector('.gd-bot[data-robot="0"]'); const c = getComputedStyle(b); return c.left + ',' + c.top; })()`));
          await wait(60);
        }
        const thinking = await text(OWL);
        await wait(13000);
        const resting = await text(OWL);
        await setStub(port, { hang: [] });
        await shot('ac2-resting');
        check('P-AC2 parked: thinking, the sprite still moving; after 12 s: resting', played && new Set(samples).size > 1 && /réfléchit|thinking/i.test(thinking) && /se repose|resting/i.test(resting), { played, samples, thinking, resting });
      }

      // P-AC5
      await setStub(port, { exam: { 'words-to-blocks': 'fail' } });
      await req(port, 'POST', '/__garden/olive/exam', {});
      await page.navigate(WORKSHOP);
      await wait(1500);
      const heldPal = await has('[data-pal="ask:words-to-blocks"]');
      await page.navigate(SKILLS);
      await wait(1500);
      const skillsText = await bodyText();
      await shot('ac5-skills');
      await setStub(port, { exam: { 'words-to-blocks': 'pass' } });
      await req(port, 'POST', '/__garden/olive/exam', {});
      await page.navigate(WORKSHOP);
      await wait(1500);
      const backPal = await has('[data-pal="ask:words-to-blocks"]');
      if (!backPal && !heldPal) skip('P-AC5 the exam gate on the page', '[data-pal="ask:words-to-blocks"] (a request offering rung 3)');
      else check('P-AC5 withheld after a failed exam, offered after a passing re-run; Skills says so', heldPal === false && backPal === true && /can’t do this here yet|ne sait pas encore faire ça ici/.test(skillsText), { heldPal, backPal, skills: skillsText.slice(0, 200) });

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
