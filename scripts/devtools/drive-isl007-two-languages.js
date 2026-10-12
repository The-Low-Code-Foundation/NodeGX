#!/usr/bin/env node
/**
 * P109 ISL-007 AC2 / AC3 / AC5 — a new project speaks two languages with no script, read on a DEPLOYED page.
 *
 * The project is `dev-docs/tasks/phase-109-the-defects-the-island-found/isl007-two-languages` (built through the door by
 * `packages/noodl-mcp/tests/isl007TwoLanguages.ts`), deployed with `nodegx deploy`. A browser in English (`--lang=en-GB`)
 * with nothing stored; then:
 *
 *   1. a name is typed into the field: `Tom & <Jerry>` (real key input, the field reached by `elementFromPoint`);
 *   2. read in English; FR pressed (a real mouse press, reachability checked first); read in French, and the page is
 *      the same document (a marker set before the press is still there: no reload);
 *   3. the page reloaded: still French (the person's choice is kept); EN pressed: English again.
 *
 * Each read takes the four words by `[data-testid]` and `<html lang>`. Graded: the words, the typed name shown as typed
 * in both languages, no `{` or `}` anywhere, `&amp;` / `&lt;` nowhere, and `<html lang>` following the switch.
 *
 * `--control` grades a deploy of the module AS IMPORTED (v1.0.4): the run then passes only if that module shows the
 * defects (the name escaped as `&amp;`, `<html lang>` not following) — the known-firing arm beside the treatment.
 *
 * Usage: drive-isl007-two-languages.js <deploy-dir> [--control] [--json <file>]. Exits 0 when the mode's expectations
 * hold, 1 otherwise, 2 on a usage error.
 */
const fs = require('fs');
const { withDeployedSite } = require('./drive-deployed.js');

const DIR = process.argv[2];
const CONTROL = process.argv.includes('--control');
const JSON_OUT = process.argv.indexOf('--json') === -1 ? null : process.argv[process.argv.indexOf('--json') + 1];
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-isl007-two-languages.js <deploy-dir> [--control] [--json <file>]');
  process.exit(2);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const NAME = 'Tom & <Jerry>';
const READ = `(() => {
  const t = (id) => { const e = document.querySelector('[data-testid="' + id + '"]'); return e ? e.innerText.trim() : null; };
  return { title: t('title'), greet: t('greet'), isle: t('isle'), bare: t('bare'), lang: document.documentElement.getAttribute('lang'),
           marker: window.__isl007 || null, stored: (() => { try { return localStorage.getItem('i18nextLng'); } catch (e) { return 'n/a'; } })() };
})()`;
const EXPECT = {
  en: { title: 'My garden', greet: 'Hello ' + NAME, isle: 'the island & <sea>', bare: 'Hello' },
  fr: { title: 'Mon jardin', greet: 'Bonjour ' + NAME, isle: "l'île & <mer>", bare: 'Bonjour' }
};

withDeployedSite({ dir: DIR, chromeArgs: ['--lang=en-GB'] }, async (page) => {
  const { client } = page;
  const ev = (x) => page.evaluate(x);
  await page.setViewport({ width: 1024, height: 768, mobile: false });
  const origin = await ev('location.origin');
  await client.send('Storage.clearDataForOrigin', { origin, storageTypes: 'local_storage,cookies' });
  await client.send('Page.reload', {});
  await wait(2500);

  const presses = [];
  const reach = async (testid) => {
    const p = await ev(`(() => { const el = document.querySelector('[data-testid="${testid}"]'); if (!el) return null; const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const at = document.elementFromPoint(x, y); return { x, y, hit: el === at || el.contains(at) }; })()`);
    presses.push({ testid, hit: !!(p && p.hit) });
    return p && p.hit ? p : null;
  };
  const press = async (testid) => {
    const p = await reach(testid);
    if (!p) return false;
    for (const type of ['mousePressed', 'mouseReleased']) await client.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
    await wait(600);
    return true;
  };

  const steps = {};
  steps.start = await ev(READ);
  steps.browser = await ev('navigator.language');
  // 1. the name, typed by a person
  if (await press('name')) {
    await ev(`(() => { const i = document.querySelector('[data-testid="name"] input, input[data-testid="name"]') || document.querySelector('input'); i && i.focus(); })()`);
    await client.send('Input.insertText', { text: NAME });
    await wait(600);
  }
  steps.en = await ev(READ);
  // 2. FR, live
  await ev('window.__isl007 = "same document"');
  await press('fr');
  steps.fr = await ev(READ);
  // 3. a reload keeps the choice; EN brings English back (the name is gone after a reload: the field is empty)
  await client.send('Page.reload', {});
  await wait(2500);
  steps.reloaded = await ev(READ);
  await press('en');
  steps.backToEn = await ev(READ);

  const checks = [];
  const check = (name, ok, got) => checks.push({ name, ok: !!ok, got });
  const all = [steps.en, steps.fr, steps.reloaded, steps.backToEn];
  const words = (r) => [r.title, r.greet, r.isle, r.bare].join(' | ');
  if (!CONTROL) {
    for (const k of ['title', 'greet', 'isle', 'bare']) check(`EN ${k}`, steps.en[k] === EXPECT.en[k], steps.en[k]);
    for (const k of ['title', 'greet', 'isle', 'bare']) check(`FR ${k}`, steps.fr[k] === EXPECT.fr[k], steps.fr[k]);
    check('FR without a reload', steps.fr.marker === 'same document', steps.fr.marker);
    check('<html lang> en, then fr', /^en/.test(steps.en.lang || '') && steps.fr.lang === 'fr', `${steps.en.lang} → ${steps.fr.lang}`);
    check('reload keeps French', steps.reloaded.title === EXPECT.fr.title && steps.reloaded.lang === 'fr', `${steps.reloaded.title} / ${steps.reloaded.lang} / stored ${steps.reloaded.stored}`);
    check('EN after the reload', steps.backToEn.title === EXPECT.en.title && /^en/.test(steps.backToEn.lang || ''), `${steps.backToEn.title} / ${steps.backToEn.lang}`);
    check('no braces anywhere', all.every((r) => !/[{}]/.test(words(r))), all.map(words));
    check('no &amp; / &lt; anywhere', all.every((r) => !/&(amp|lt|gt);/.test(words(r))), '');
  } else {
    check('CONTROL: the typed name is escaped on screen', /&amp;|&lt;/.test(steps.en.greet || ''), steps.en.greet);
    check('CONTROL: the switch itself works (FR title)', steps.fr.title === EXPECT.fr.title, steps.fr.title);
    check('CONTROL: <html lang> does not follow', steps.fr.lang !== 'fr', steps.fr.lang);
  }
  check('every press reached its element', presses.every((p) => p.hit), presses);
  check('no console errors', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 3));

  for (const [k, r] of Object.entries(steps)) console.log(k.padEnd(9), typeof r === 'string' ? r : JSON.stringify(r));
  for (const c of checks) console.log(c.ok ? '  ok  ' : '  FAIL', c.name, c.ok ? '' : JSON.stringify(c.got));
  const ok = checks.every((c) => c.ok);
  console.log(`${CONTROL ? 'control' : 'treatment'}: ${checks.filter((c) => c.ok).length}/${checks.length}`);
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ steps, checks, presses }, null, 2));
  process.exitCode = ok ? 0 : 1;
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
