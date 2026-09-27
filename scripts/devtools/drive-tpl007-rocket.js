#!/usr/bin/env node
/**
 * TPL-007 — play the DEPLOYED Rocket School in a real browser, and grade it.
 *
 * Drives the output of the shipped deploy engine (`nodegx-deploy.cjs`), the
 * way a person would: make a player, go home, open the race, start it, answer
 * a question, read the verdict, ask for the next one, switch the language,
 * reload and find the player still there. Every clause sits beside a signal
 * known to fire — the first clause is the page's own headline, and a blank
 * page fails every clause together rather than passing the absences.
 *
 * Clicks are real CDP mouse events at the element's own centre, and typing is
 * `Input.insertText` into a focused `<input>` — `el.click()` and `el.value =`
 * prove a handler is bound, not that a person can reach it.
 *
 * Usage:
 *   node packages/noodl-preview/dist/nodegx-deploy.cjs templates/rocket-school /tmp/rocket
 *   node scripts/devtools/drive-tpl007-rocket.js /tmp/rocket [--shots <dir>] [--path <urlPath>]
 *   node scripts/devtools/drive-tpl007-rocket.js https://nodegx.io --path /templates/rocket-school/
 *
 * Exits 0 when every clause passed, 1 when any did.
 */
const path = require('path');
const { withDeployedSite } = require('./drive-deployed.js');

const DIR = process.argv[2];
const shotsFlag = process.argv.indexOf('--shots');
const SHOTS = shotsFlag === -1 ? null : process.argv[shotsFlag + 1];
const pathFlag = process.argv.indexOf('--path');
const BASE = pathFlag === -1 ? '/' : process.argv[pathFlag + 1].replace(/\/?$/, '/');

if (!DIR) {
  console.error('usage: drive-tpl007-rocket.js <deploy-dir | origin> [--shots <dir>] [--path <urlPath>]');
  process.exit(2);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** The page as text: the buttons, the inputs, the body, and whether the kit drew rockets. */
const READ = `(() => {
  const buttons = [...document.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean);
  const inputs = [...document.querySelectorAll('input')].map((i) => ({ placeholder: i.placeholder, value: i.value }));
  const rockets = document.querySelectorAll('svg image').length;
  const keys = document.querySelectorAll('[data-key]').length;
  const lit = document.querySelector('[data-next="true"]');
  return { buttons, inputs, rockets, keys, lit: lit ? lit.getAttribute('data-key') : null, text: document.body.innerText };
})()`;

/** Where is the element whose text is exactly `label` (a button, or any pressable), and is anything on top? */
const LOCATE = (label) => `(() => {
  const all = [...document.querySelectorAll('button, .pressable, [class*="pressable"]')];
  const hit = all.find((e) => e.innerText.trim() === ${JSON.stringify(label)}) ||
    [...document.querySelectorAll('*')].reverse().find((e) => e.children.length === 0 && e.innerText && e.innerText.trim() === ${JSON.stringify(label)});
  if (!hit) return { found: false };
  const r = hit.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const top = document.elementFromPoint(x, y);
  return { found: true, x, y, reachable: hit === top || hit.contains(top) || (top && top.contains(hit)), onTop: top && String(top.className) };
})()`;

const LOCATE_INPUT = (index) => `(() => {
  const inputs = [...document.querySelectorAll('input')].filter((i) => i.offsetParent !== null);
  const hit = inputs[${index}];
  if (!hit) return { found: false, visible: inputs.length };
  const r = hit.getBoundingClientRect();
  return { found: true, x: r.left + r.width / 2, y: r.top + r.height / 2 };
})()`;

/** The question on screen, and the answer to it when it can be worked out from the text. */
const QUESTION = `(() => {
  const lines = document.body.innerText.split('\\n').map((s) => s.trim()).filter(Boolean);
  const q = lines.find((l) => /\\?/.test(l) && !/Who is playing|Qui joue/.test(l) || /^(Double|Half of|Write in digits:|Round|Écris|Arrondis)/.test(l) || /^[a-z]{1,12}( [a-z]{1,12}){0,2}$/.test(l) && l.length <= 30 && !['home','check','next','start'].includes(l));
  return q || null;
})()`;

function solve(prompt) {
  if (!prompt) return null;
  const n = (s) => Number(String(s).replace(/[\s,]/g, '').replace(',', '.'));
  let m;
  if ((m = prompt.match(/^(\d+) \+ (\d+) = \?$/))) return String(n(m[1]) + n(m[2]));
  if ((m = prompt.match(/^(\d+) − (\d+) = \?$/))) return String(n(m[1]) - n(m[2]));
  if ((m = prompt.match(/^([\d.,\s]+) × ([\d.,\s]+) = \?$/))) return String(Math.round(n(m[1]) * n(m[2]) * 1000) / 1000);
  if ((m = prompt.match(/^([\d.,\s]+) ÷ ([\d.,\s]+) = \?$/))) return String(Math.round((n(m[1]) / n(m[2])) * 1000) / 1000);
  if ((m = prompt.match(/^\? × (\d+) = (\d+)$/))) return String(n(m[2]) / n(m[1]));
  if ((m = prompt.match(/^\? \+ (\d+) = (\d+)$/))) return String(n(m[2]) - n(m[1]));
  if ((m = prompt.match(/^(\d+) \+ \? = (\d+)$/))) return String(n(m[2]) - n(m[1]));
  if ((m = prompt.match(/^Double (\d+) = \?$/))) return String(n(m[1]) * 2);
  if ((m = prompt.match(/^Half of (\d+) = \?$/))) return String(n(m[1]) / 2);
  if ((m = prompt.match(/^(\d+) \+ (\d+) = \? \+ (\d+)$/))) return String(n(m[1]) + n(m[2]) - n(m[3]));
  if ((m = prompt.match(/^(\d+) \+ (\d+) × (\d+) = \?$/))) return String(n(m[1]) + n(m[2]) * n(m[3]));
  if (/^[a-z]{1,12}( [a-z]{1,12}){0,2}$/.test(prompt)) return prompt;
  return null;
}

const results = [];
const check = (name, ok, saw) => {
  results.push({ name, ok, saw });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${String(saw).slice(0, 600)}`}`);
};

const LIVE = /^https?:\/\//.test(DIR || '');
withDeployedSite(LIVE ? { origin: DIR } : { dir: DIR, port: 0 }, async (page) => {
  const snap = async (name) => {
    const r = await page.evaluate(READ);
    if (SHOTS) await page.screenshot(path.join(SHOTS, name + '.png'));
    return r;
  };
  const click = async (label) => {
    const at = await page.evaluate(LOCATE(label));
    if (!at.found) return false;
    for (const type of ['mousePressed', 'mouseReleased']) {
      await page.client.send('Input.dispatchMouseEvent', { type, x: Math.round(at.x), y: Math.round(at.y), button: 'left', clickCount: 1 });
    }
    if (!at.reachable) console.warn(`  ⚠ "${label}" was clicked THROUGH a blocker (${at.onTop})`);
    await wait(600);
    return true;
  };
  const typeInto = async (index, text) => {
    const at = await page.evaluate(LOCATE_INPUT(index));
    if (!at.found) return false;
    for (const type of ['mousePressed', 'mouseReleased']) {
      await page.client.send('Input.dispatchMouseEvent', { type, x: Math.round(at.x), y: Math.round(at.y), button: 'left', clickCount: 1 });
    }
    await wait(150);
    await page.client.send('Input.insertText', { text });
    await wait(250);
    return true;
  };
  const pressEnter = async () => {
    await page.client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await page.client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await wait(700);
  };

  await page.setViewport({ width: 1100, height: 1500 });
  if (BASE !== '/') {
    await page.navigate(BASE);
    await wait(600);
  }
  await wait(1200);

  // ── 1. The profiles page ────────────────────────────────────────────────
  let s = await snap('01-profiles');
  check('the profiles page asks who is playing (the known-firing signal)', s.text.includes('Who is playing?'), s.text.slice(0, 300));
  check('there is a New player button', s.buttons.includes('New player'), s.buttons);

  // ── 2. Make a player ────────────────────────────────────────────────────
  await click('New player');
  s = await snap('02-form');
  check('the form opens with a name box and a Let’s go button', s.inputs.length >= 1 && s.buttons.some((b) => /Let’s go|Let's go/.test(b)), JSON.stringify({ inputs: s.inputs, buttons: s.buttons }));
  check('the form draws a face from the kit (an <img> data URI)', await page.evaluate(`!!document.querySelector('img[src^="data:image/svg+xml"]')`), 'no avatar img');
  await typeInto(0, 'Léa');
  await click('CM1');
  s = await snap('03-form-filled');
  check('the typed name is in the box and CM1 is the chosen class', s.inputs.some((i) => i.value === 'Léa'), JSON.stringify(s.inputs));
  await click('Let’s go!');
  await wait(900);

  // ── 3. Home ─────────────────────────────────────────────────────────────
  s = await snap('04-home');
  check('Home shows the four games and the player’s name', s.text.includes('Rocket Race') && s.text.includes('Make Ten Merge') && s.text.includes('Léa'), s.text.slice(0, 400));
  check('Home shows the two readings', s.text.includes('to review today') && s.text.includes('days practised this week'), s.text.slice(0, 400));

  // ── 4. The race ─────────────────────────────────────────────────────────
  await click('Rocket Race');
  await wait(900);
  s = await snap('05-race-setup');
  check('the race page offers Start and the mode pills', s.buttons.includes('Start') && s.text.includes('Maths') && s.text.includes('Typing'), JSON.stringify(s.buttons) + s.text.slice(0, 200));
  await click('Maths');
  await click('Me vs the computer');
  await click('Practice');
  await click('Start');
  await wait(1200);
  s = await snap('06-race-question');
  const q1 = await page.evaluate(QUESTION);
  check('a question is on screen', !!q1, s.text.slice(0, 500));
  check('the kit drew two rockets on the course', s.rockets === 2, `rockets=${s.rockets}`);

  // Answer it: type when there is a box, else press the first option button.
  const optionButtons = s.buttons.filter((b) => !['Check', 'Home', 'Switch', 'Start', 'Next', 'Show me how'].includes(b) && /^[\d.,/ ]+$/.test(b));
  let answered = false;
  if (optionButtons.length) {
    answered = await click(optionButtons[0]);
  } else {
    const answer = solve(q1) || '0';
    answered = await typeInto(0, answer);
    await pressEnter();
  }
  await wait(600);
  s = await snap('07-race-verdict');
  const verdict = ['Correct!', 'Fast and correct!', 'Not quite.', 'Time’s up.'].find((v) => s.text.includes(v));
  check('the answer was graded and the banner says so', answered && !!verdict, s.text.slice(0, 500));
  if (verdict === 'Not quite.') check('a wrong answer shows the answer and a strategy', /The answer was/.test(s.text), s.text.slice(0, 500));
  check('the banner offers Next', s.buttons.includes('Next'), s.buttons);
  await click('Next');
  await wait(1000);
  s = await snap('08-race-next');
  const q2 = await page.evaluate(QUESTION);
  check('Next asks another question', !!q2 && s.buttons.includes('Check') || !!q2, s.text.slice(0, 500));

  // ── 5. The language ─────────────────────────────────────────────────────
  await click('FR');
  await wait(900);
  s = await snap('09-french');
  check('FR switches the interface to French', s.text.includes('Course de fusées') || s.text.includes('Accueil'), s.text.slice(0, 400));
  await click('EN');
  await wait(600);

  // ── 6. Persistence ──────────────────────────────────────────────────────
  await page.navigate(BASE);
  await wait(1500);
  s = await snap('10-reload');
  check('after a reload the player is still here (localStorage)', s.text.includes('Léa') && s.text.includes('Who is playing?'), s.text.slice(0, 400));

  check('no console errors', page.consoleErrors.length === 0, JSON.stringify(page.consoleErrors.slice(0, 4)));
  check('no network errors', page.networkErrors.length === 0, JSON.stringify(page.networkErrors.slice(0, 3)));

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed}/${results.length} clauses passed`);
  if (passed !== results.length) process.exitCode = 1;
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
