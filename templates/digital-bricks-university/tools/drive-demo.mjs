#!/usr/bin/env node
/**
 * THE DEMO, DRIVEN (DBU-11): every flow from DBU-04 to DBU-10 (a check-in answered too), as Camille and as Richard, in a real Chrome
 * against the browser-only demo, with no backend anywhere.
 *
 *   node tools/build-demo.mjs && node tools/serve-demo.mjs     (in another terminal)
 *   node tools/drive-demo.mjs [--url http://127.0.0.1:8602/] [--shots <dir>]
 *
 * --url can be the published demo (https://nodegx.io/templates/<x>/). Each run starts from a fresh browser
 * profile, so from the example world. Real mouse clicks and key input (tools/lib/cdp.mjs). It fails on any
 * console error, and on any request that leaves the demo's own origin: nothing may leave the browser.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './lib/cdp.mjs';
import { arg } from './lib/local.mjs';

const URL_ = (arg('url') || 'http://127.0.0.1:8602/').replace(/\/?$/, '/');
const SHOTS = arg('shots');
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** The runtime ignores a second press of a saving button within half a second of the answer (CONVENTIONS). */
const beat = () => wait(900);

const b = await launch({ width: 1280, height: 900 });
let passed = 0;
const failures = [];
let seenErrors = 0;
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok   ${name}`);
    const fresh = b.errors.slice(seenErrors).filter((e) => !/favicon\.ico/.test(e));
    seenErrors = b.errors.length;
    fresh.forEach((e) => console.log(`       console: ${e.slice(0, 200)}`));
  } catch (e) {
    failures.push(name);
    console.log(`  FAIL ${name}: ${e.message}`);
    const t = await b.text().catch(() => '');
    console.log('       on screen: ' + t.replace(/\s+/g, ' ').slice(0, 400));
  }
}
const shot = async (name) => { if (SHOTS) await b.screenshot(join(SHOTS, `${name}.png`)); };
const expectText = async (s) => { if (!(await b.text()).includes(s)) throw new Error(`"${s}" is not on screen`); };
const expectNoText = async (s) => { if ((await b.text()).includes(s)) throw new Error(`"${s}" is still on screen`); };
const section = (s) => console.log(`\n${s}`);

/** A file for the picker: the next file input that opens gets it (DBU-06's stub). */
async function nextFile(name, type, content) {
  await b.evaluate(`(() => {
    window.__nextFile = new File([new TextEncoder().encode(${JSON.stringify(content)})], ${JSON.stringify(name)}, { type: ${JSON.stringify(type)} });
    if (window.__pickerStubbed) return;
    window.__pickerStubbed = true;
    const orig = HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click = function () {
      if (this.type === 'file' && window.__nextFile) {
        const dt = new DataTransfer();
        dt.items.add(window.__nextFile);
        this.files = dt.files;
        this.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
      return orig.call(this);
    };
  })()`);
}

console.log(`drive-demo: ${URL_}`);

section('The way in');
await b.goto(URL_);
await check('the service worker takes the page', () => b.waitFor('navigator.serviceWorker.controller', { what: 'the demo backend' }));
await check('the intro: the pitch, two doors, the template link, no email form', async () => {
  await b.waitForText("You're learning AI and NodeGX on a platform built with NodeGX.");
  await expectText('Look as Camille, the learner');
  await expectText('Look as Richard, her coach');
  await expectText('Get the template');
  await expectNoText('Email me a sign-in link');
});
await shot('dbu11-intro');

section('Camille, the learner');
await check('Look as Camille opens her Home, with the demo line above the app', async () => {
  await b.reloadingBy(() => b.click('Look as Camille, the learner'));
  await b.waitForText('Welcome, Camille');
  await expectText('Demo with made-up people. Nothing leaves this browser.');
  await expectText('Look as Richard');
  await expectText('Reset demo');
});
await shot('dbu11-camille-home');

await check('homework: a resource PDF shows in the page, served by the demo', async () => {
  await b.click('Open homework');
  await b.waitForText('Hand in version 2');
  await b.click('Show it here', { nth: 0 });
  const src = await b.waitFor(`(() => { const f = document.querySelector('iframe'); return f && f.src; })()`, { what: 'a preview frame' });
  if (!/\/demo-api\/files\/[0-9a-f]{16}_activity-example\.pdf/.test(src)) throw new Error('preview frame src ' + src);
  const status = await b.evaluate(`fetch(${JSON.stringify('')} + document.querySelector('iframe').src).then((r) => r.status + ' ' + r.headers.get('content-type'))`);
  if (status !== '200 application/pdf') throw new Error('the file answered ' + status);
});

await check('hand in version 2: a PDF and a note (DBU-06)', async () => {
  await nextFile('vocab-activity-v2.pdf', 'application/pdf', '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
  await b.click('Add a file', { nth: 0 });
  await b.waitForText('vocab-activity-v2.pdf');
  await b.type('textarea', 'Rewrote the two sentences and added the answer key.', { nth: 0 });
  await b.click('Hand in');
  // The words say the coach's name from Settings (DBU-11's {coach} tag): Richard, in the example world.
  await b.waitForText('Version 2 is handed in. Richard will look at it and tell you what they think.');
  await expectText('Waiting for Richard');
});
await shot('dbu11-camille-handed-in');

await check('a message to Richard (DBU-07)', async () => {
  await beat();
  await b.click('Messages', { within: 'nav, header, div' });
  await b.waitForText('Your conversation with Richard');
  await b.type('textarea', 'Is one page enough for the answer key?', { nth: 0 });
  await b.click('Send');
  await b.waitFor(`document.body.innerText.split('Is one page enough for the answer key?').length > 1 && !document.querySelector('textarea').value`, { what: 'the message in the thread' });
});

await check('My creations: the hand-in is kept there, and an interactive page opens in its frame (DBU-09)', async () => {
  await b.click('My creations');
  await b.waitForText('Everything you’ve made while learning'.replace('’', "'"));
  await expectText('All (7)');
  await b.click('Interactive pages (2)');
  await b.click('Open', { nth: 1 });
  await b.click('Show it here');
  const src = await b.waitFor(`(() => { const f = [...document.querySelectorAll('iframe')].find((x) => /\\.html/.test(x.src)); return f && f.src; })()`, { what: 'an HTML frame' });
  const r = await b.evaluate(`fetch(${JSON.stringify(src)}).then(async (r) => r.status + ' ' + r.headers.get('content-type') + ' ' + r.headers.get('content-security-policy'))`);
  if (!r.startsWith('200 text/html') || !r.includes('sandbox')) throw new Error('the page answered ' + r);
});
await shot('dbu11-camille-creations');

await check('a check-in that went out yesterday: she answers it (DBU-10)', async () => {
  await b.click('Home');
  await b.waitForText('After session 2');
  await b.click('Answer');
  await b.waitForText('How useful was the session for your teaching?');
  await b.click('4', { within: '[data-testid="checkin-q-useful"]' });
  await b.type('textarea', 'More time on feedback for student writing.', { nth: 0 });
  await beat();
  await b.click('Send my answers');
  await b.waitForText('Thank you!');
  await expectText('Richard has your answers. This is what you sent.');
  await expectText('More time on feedback for student writing.');
});
await shot('dbu11-camille-checkin');

section('Richard, the coach');
await check('the demo line switches to Richard: his Learners page', async () => {
  await b.reloadingBy(() => b.click('Look as Richard'));
  await b.waitForText('The people you coach, and each one');
  await expectText('Look as Camille');
});
await check('the inbox has her version 2 and her question (DBU-08)', async () => {
  await b.click(/^Inbox/);
  await b.waitForText('Waiting for you');
  await expectText('Is one page enough for the answer key?');
  const t = await b.text();
  if (!/Camille Laurent[\s\S]{0,80}Handed in “Build a vocabulary activity with Claude”/.test(t)) throw new Error('no "To review" row for Camille');
  if (!/Camille Laurent[\s\S]{0,80}Answered “After session 2”/.test(t)) throw new Error('no "Check-in answered" row for Camille');
});
await shot('dbu11-richard-inbox');
await check('he approves version 2 with a note (DBU-06)', async () => {
  await b.clickRow('Camille Laurent', 'Handed in “Build a vocabulary activity with Claude”');
  await b.waitForText('vocab-activity-v2.pdf');
  await b.type('textarea', 'Ready for class. Well done.', { nth: 0 });
  await b.click('Approve');
  await b.waitFor(`!/Camille Laurent[\\s\\S]{0,80}Handed in “Build a vocabulary activity with Claude”/.test(document.body.innerText)`, { what: 'the review gone from the inbox' });
});
await check('he answers her question', async () => {
  await beat();
  await b.clickRow('Camille Laurent', 'Is one page enough for the answer key?');
  await b.waitForText('Your message to Camille');
  await b.typeLabelled('Your message to Camille', 'Yes, one page is plenty.');
  await b.click('Send');
  // Answered, the question leaves his inbox (DBU-08); she reads the reply below, back as Camille.
  await b.waitFor(`!document.body.innerText.includes('Is one page enough for the answer key?')`, { what: 'the question gone from the inbox' });
});

await check("her plan: add homework from the library and share it (DBU-04)", async () => {
  await beat();
  await b.click(/^Learners/);
  await b.waitForText('Camille Laurent');
  await b.click('Open plan', { nth: 1 });
  await b.waitForText("Camille Laurent's plan");
  const unshared = await b.count('Share');
  await b.click('Pick from homework library');
  await b.waitForText('Turn a lesson into an interactive page');
  const row = await b.evaluate(`[...document.querySelectorAll('button')].filter((x) => x.getBoundingClientRect().width > 0 && x.innerText.trim() === 'Add').findIndex((x) => { let p = x; for (let i = 0; i < 4 && p; i++) p = p.parentElement; return p && p.innerText.includes('Turn a lesson into an interactive page'); })`);
  await b.click('Add', { nth: Math.max(0, row) });
  await b.waitFor(`[...document.querySelectorAll('button')].filter((x) => x.getBoundingClientRect().width > 0 && x.innerText.trim() === 'Share').length === ${unshared + 1}`, { what: 'the new step, not shared yet' });
  await expectText('Turn a lesson into an interactive page');
  await beat();
  await b.click("Share everything that's ready");
  await b.waitFor(`[...document.querySelectorAll('button')].filter((x) => x.getBoundingClientRect().width > 0 && x.innerText.trim() === 'Share').length < ${unshared + 1}`, { what: 'the new step shared' });
});
await shot('dbu11-richard-plan');

await check('the homework library: a new piece of homework (DBU-03)', async () => {
  await b.click(/^Homework library/);
  await b.waitForText('Homework you write once and reuse with any learner.');
  await b.click('New homework');
  await b.typeLabelled('Title', 'Record a two-minute listening activity');
  await b.click('Save');
  await b.waitForText('Record a two-minute listening activity');
});

await check('plan templates open (DBU-04)', async () => {
  await b.click(/^Plan templates/);
  await b.waitForText('AI for language trainers');
});

section('Back to Camille');
await check('she sees the approval, the new homework and his reply', async () => {
  await b.reloadingBy(() => b.click('Look as Camille'));
  await b.waitForText('Welcome, Camille');
  await expectText('Turn a lesson into an interactive page');
  await b.click(/^Messages/);
  await b.waitForText('Yes, one page is plenty.');
  await b.click('Homework');
  await b.waitForText('Build a vocabulary activity with Claude');
  await expectText('Approved');
});
await check('a reload keeps everything', async () => {
  await b.reloadingBy(() => b.evaluate('location.reload()'));
  await b.waitForText('Build a vocabulary activity with Claude');
  await b.click(/^Messages/);
  await b.waitForText('Yes, one page is plenty.');
});
await check('Reset demo puts the example world back', async () => {
  await b.reloadingBy(() => b.click('Reset demo'));
  await b.waitForText('Welcome, Camille');
  await b.waitForText('Richard asked for a few changes. Read the note, then hand it in again.');
  if (!(await b.count('Answer'))) throw new Error('the check-in is answered still: no Answer to press');
  await b.click(/^Messages/);
  await b.waitForText("Thanks! I'll send version 2 on Monday.");
  await expectNoText('Yes, one page is plenty.');
  await b.click('Home');
  await b.click('Open homework');
  await b.waitForText('Hand in version 2');
});

section('Nothing left the browser');
await check('every request stayed on the demo origin, and no console errors', async () => {
  const origin = new URL(URL_).origin;
  const away = await b.evaluate(`performance.getEntriesByType('resource').map((e) => e.name).filter((n) => !n.startsWith(${JSON.stringify(origin)}) && !n.startsWith('data:') && !n.startsWith('blob:'))`);
  if (away.length) throw new Error('requests elsewhere: ' + away.slice(0, 5).join(', '));
  const errors = b.errors.filter((e) => !/favicon\.ico/.test(e));
  if (errors.length) throw new Error(errors.slice(0, 5).join(' | '));
});

await b.close();
console.log(`\ndrive-demo: ${passed} passed, ${failures.length} failed${failures.length ? ': ' + failures.join('; ') : ''}`);
process.exit(failures.length ? 1 : 0);
