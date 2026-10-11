#!/usr/bin/env node
/**
 * P109 ISL-007 AC1 / AC4 — the island's words, read on the DEPLOYED template: a new player, then on each of five pages
 * (Island, Workshop by free play, My robots, Skills, Grown-ups) every visible text read in English, the top bar's FR
 * pressed (live, no reload), and read again. Each text is keyed by its DOM path, so "changed" means the same element
 * now says something else.
 *
 *     node scripts/devtools/drive-isl007-words.js <deploy-dir> [--json <file>]
 *
 * Reports, per page: texts read in both languages, how many changed, the ones that did not (names, symbols, the band and
 * language buttons are expected there). Across pages: every string that still shows a `{…}` placeholder, and the
 * known-firing control: the robot's name (Pip, a `{b}` word) on screen in BOTH languages.
 * Every press is checked with `elementFromPoint` first; a miss fails the run (an unpressed switch reads "0 changed").
 * ARIA (P109-S11-ARIALABELWORDS, s45): what a screen reader calls each world and divider on the page (its aria-label,
 * which READ never sees) changes on FR too — on every page that draws one.
 *
 * Exits 0 when every page changed at least one text, no `{…}` reached the screen, Pip shows in both languages on
 * at least one page and no press missed; 1 otherwise; 2 on a usage error.
 */
const fs = require('fs');
const { withDeployedSite } = require('./drive-deployed.js');
const DIR = process.argv[2];
const JSON_OUT = process.argv.indexOf('--json') === -1 ? null : process.argv[process.argv.indexOf('--json') + 1];
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-isl007-words.js <deploy-dir> [--json <file>]');
  process.exit(2);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const READ = `(() => {
  const pathOf = (e) => { const p = []; for (let n = e; n && n !== document.body; n = n.parentElement) p.unshift(n.tagName + ':' + [...n.parentElement.children].indexOf(n)); return p.join('>'); };
  const out = {};
  for (const e of document.querySelectorAll('body *')) {
    if (e.offsetParent === null && getComputedStyle(e).position !== 'fixed') continue;
    if (e.closest('svg, .gd-world, .gd-cell')) continue;
    const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    if (!own) continue;
    out[pathOf(e)] = own;
  }
  return out;
})()`;
const ARIA = `(() => [...document.querySelectorAll('.gd-world, .gd3-world, .gd-divider')].filter((e) => e.offsetParent !== null && e.hasAttribute('aria-label')).map((e) => e.className.split(' ')[0] + ': ' + e.getAttribute('aria-label')))()`;
withDeployedSite({ dir: DIR }, async (page) => {
  const { client } = page;
  const ev = (x) => page.evaluate(x);
  client.on((msg) => { if (msg.method === 'Fetch.requestPaused') client.send('Fetch.fulfillRequest', { requestId: msg.params.requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: 'application/json' }], body: Buffer.from('{"model":"ready","ok":true,"text":"stub"}').toString('base64') }); });
  await client.send('Fetch.enable', { patterns: [{ urlPattern: '*/__garden/*', requestStage: 'Request' }] });
  await page.setViewport({ width: 1368, height: 912, mobile: false });
  const presses = [];
  const click = async (finder) => { const p = await ev(`(() => { const el = (${finder}); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const at = document.elementFromPoint(x, y); return { x, y, hit: el === at || el.contains(at) }; })()`); presses.push({ finder: finder.slice(0, 90), p }); if (!p || !p.hit) return false; for (const type of ['mousePressed', 'mouseReleased']) await client.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 }); await wait(400); return true; };
  const first = (s) => `[...document.querySelectorAll(${JSON.stringify(s)})].find((e) => e.offsetParent !== null)`;
  const byText = (s, t) => `[...document.querySelectorAll(${JSON.stringify(s)})].find((e) => e.offsetParent !== null && e.innerText.trim().includes(${JSON.stringify(t)}))`;
  const origin = await ev('location.origin');
  await client.send('Storage.clearDataForOrigin', { origin, storageTypes: 'local_storage,indexeddb' });
  await page.navigate('/'); await wait(1200);
  await click(first('button.bg-profile-new'));
  await ev(`(() => { const el = ${first('input')}; el.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, 'Ada'); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await click(byText('.bg-seg-btn', '10–12'));
  await click(byText('button.bg-btn', 'Let’s go!'));
  await wait(1500);
  const landed = await ev('location.pathname');
  const report = { landed, pages: {}, braces: [], pip: {}, presses, aria: {} };
  const visit = async (name, go) => {
    await go(); await wait(1500);
    const seg = async (l) => { await click(byText('.bg-top .bg-seg-btn', l)); await wait(900); };
    await seg('EN');
    const en = await ev(READ);
    const ariaEn = await ev(ARIA);
    await seg('FR');
    const fr = await ev(READ);
    const ariaFr = await ev(ARIA);
    report.aria[name] = { en: ariaEn, fr: ariaFr };
    const keys = Object.keys(en).filter((k) => k in fr);
    const changed = keys.filter((k) => en[k] !== fr[k]);
    const same = keys.filter((k) => en[k] === fr[k]).map((k) => en[k]);
    const brace = [...Object.values(en), ...Object.values(fr)].filter((t) => /\{[A-Za-z0-9_]+\}/.test(t));
    report.braces.push(...brace.map((t) => `${name}: ${t}`));
    report.pip[name] = { en: Object.values(en).filter((t) => t.includes('Pip')).length, fr: Object.values(fr).filter((t) => t.includes('Pip')).length };
    report.pages[name] = { path: await ev('location.pathname'), enTexts: Object.keys(en).length, frTexts: Object.keys(fr).length, both: keys.length, changed: changed.length, unchanged: same.length, unchangedSample: [...new Set(same)].slice(0, 25), onlyEn: Object.keys(en).filter((k) => !(k in fr)).length, onlyFr: Object.keys(fr).filter((k) => !(k in en)).length };
  };
  await visit('island', () => page.navigate('/island'));
  await visit('workshop', async () => { await page.navigate('/island'); await wait(1200); await click(byText('.bg-quest', 'Pip')); });
  await visit('my robots', async () => { await page.navigate('/island'); await wait(1200); await click("document.querySelectorAll('.bg-tabs .bg-tab')[1]"); });
  await visit('skills', () => page.navigate('/skills'));
  await visit('grown-ups', () => page.navigate('/grown-ups'));
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 1));
  let failed = 0;
  const check = (name, ok, saw) => {
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${JSON.stringify(saw)}`}`);
  };
  check('a new player lands on the island', landed === '/island', landed);
  check('every press hit what it aimed at', presses.every((x) => x.p && x.p.hit), presses.filter((x) => !x.p || !x.p.hit));
  for (const [name, v] of Object.entries(report.pages)) {
    check(`${name} (${v.path}): ${v.changed} of ${v.both} texts change on FR; unchanged: ${JSON.stringify(v.unchangedSample)}`, v.changed > 0, v);
  }
  check('no {…} placeholder reaches the screen, in either language', report.braces.length === 0, report.braces);
  // s45: a world or divider whose screen-reader name stays the same in French (a robot's own name may: it is a name).
  const ariaSame = Object.entries(report.aria).flatMap(([name, a]) => a.en.filter((l, i) => a.fr[i] === l && !/: (Pip|Cobble|Ada)$/.test(l)).map((l) => `${name}: ${l}`));
  const ariaSeen = Object.values(report.aria).reduce((n, a) => n + a.en.length, 0);
  check(`ARIA: every world and divider a screen reader names (${ariaSeen} read) is named in French on FR`, ariaSeen > 0 && ariaSame.length === 0, { ariaSame, aria: report.aria });
  check('control: Pip (a {b} word) is on screen in both languages', Object.values(report.pip).some((p) => p.en > 0 && p.fr > 0), report.pip);
  const total = Object.values(report.pages).reduce((a, v) => [a[0] + v.changed, a[1] + v.both], [0, 0]);
  console.log(`${total[0]} of ${total[1]} texts changed; ${failed ? `${failed} FAILED` : 'all passed'}`);
  return failed;
}).then((failed) => process.exit(failed ? 1 : 0)).catch((e) => { console.error(e); process.exit(1); });
