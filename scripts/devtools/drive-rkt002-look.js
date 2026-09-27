#!/usr/bin/env node
/**
 * P87 RKT-002 — is the ruled Sticker book look actually on the DEPLOYED Rocket School?
 *
 * A token gate proves the project asks for the look; only a browser proves it arrives. s1 named
 * Nunito and never loaded it — every screen Richard played was the platform fallback, and no gate
 * could see that. So this drive asks the page itself:
 *
 *   fonts   — `document.fonts.check` for Grandstander 800 and Nunito, after `document.fonts.ready`,
 *             AND the headline's computed family names Grandstander (a check can pass on a face
 *             that nothing uses)
 *   ground  — the body is paper (#f6ecd9), not white
 *   sticker — a button carries the 3px ink edge and the hard 4px/5px ink shadow
 *   verdicts— a wrong answer's banner is the card surface; a right one's is sunshine (when one is
 *             answered right — the solver only knows some prompts, and says so)
 *   quiet   — no console errors, no failed network requests (a missing face is a failed request)
 *
 * The profile headline is the known-firing signal beside every absence.
 *
 * Usage: node scripts/devtools/drive-rkt002-look.js <deploy-dir> [--shots <dir>]
 * Exits 0 when every clause passed.
 */
const path = require('path');
const fs = require('fs');
const { withDeployedSite } = require('./drive-deployed.js');

const DIR = process.argv[2];
const shotsFlag = process.argv.indexOf('--shots');
const SHOTS = shotsFlag === -1 ? null : process.argv[shotsFlag + 1];
if (!DIR) {
  console.error('usage: drive-rkt002-look.js <deploy-dir> [--shots <dir>]');
  process.exit(2);
}
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const LAPTOP = { width: 1366, height: 768, mobile: false };
const PHONE = { width: 390, height: 844, mobile: true };

const LOCATE = (label) => `(() => {
  const all = [...document.querySelectorAll('button, .pressable, [class*="pressable"]')].filter((e) => e.getClientRects().length);
  const hit = all.find((e) => e.innerText.trim() === ${JSON.stringify(label)}) ||
    [...document.querySelectorAll('*')].reverse().find((e) => e.children.length === 0 && e.getClientRects().length && e.innerText && e.innerText.trim() === ${JSON.stringify(label)});
  if (!hit) return { found: false };
  hit.scrollIntoView({ block: 'center', behavior: 'instant' });
  const r = hit.getBoundingClientRect();
  return { found: true, x: r.left + r.width / 2, y: r.top + r.height / 2 };
})()`;

const LOOK = `(async () => {
  await document.fonts.ready;
  const headline = [...document.querySelectorAll('.ndl-visual-text')].find((e) => e.innerText.trim() === 'Who is playing?');
  const button = [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'New player');
  const bs = button ? getComputedStyle(button) : null;
  return {
    signal: !!headline,
    grandstander: document.fonts.check('800 24px "Grandstander"'),
    nunito: document.fonts.check('400 16px "Nunito"'),
    headlineFamily: headline ? getComputedStyle(headline).fontFamily : null,
    ground: getComputedStyle(document.body).backgroundColor,
    buttonEdge: bs ? bs.borderTopWidth + ' ' + bs.borderTopColor : null,
    buttonShadow: bs ? bs.boxShadow : null,
    buttonFamily: bs ? bs.fontFamily : null
  };
})()`;

/** The banner card holding a verdict word, and its ground. */
const BANNER = (words) => `(() => {
  const words = ${JSON.stringify(words)};
  const title = [...document.querySelectorAll('.ndl-visual-text')].find((e) => words.includes(e.innerText.trim()) && e.getClientRects().length);
  if (!title) return null;
  return { word: title.innerText.trim(), ground: getComputedStyle(title.parentElement).backgroundColor, ink: getComputedStyle(title).color };
})()`;

const QUESTION = `(() => {
  const lines = document.body.innerText.split('\\n').map((s) => s.trim()).filter(Boolean);
  return lines.find((l) => /= \\?$|^\\? [×+] [\\d\\s]+ = [\\d\\s]+$/.test(l)) || null;
})()`;

function solve(prompt) {
  if (!prompt) return null;
  const n = (s) => Number(String(s).replace(/[\s\u00a0]/g, '').replace(',', '.'));
  let m;
  if ((m = prompt.match(/^([\d\s]+) \+ ([\d\s]+) = \?$/))) return String(n(m[1]) + n(m[2]));
  if ((m = prompt.match(/^([\d\s]+) − ([\d\s]+) = \?$/))) return String(n(m[1]) - n(m[2]));
  if ((m = prompt.match(/^([\d\s]+) × ([\d\s]+) = \?$/))) return String(n(m[1]) * n(m[2]));
  if ((m = prompt.match(/^\? × ([\d\s]+) = ([\d\s]+)$/))) return String(n(m[2]) / n(m[1]));
  if ((m = prompt.match(/^\? \+ ([\d\s]+) = ([\d\s]+)$/))) return String(n(m[2]) - n(m[1]));
  if ((m = prompt.match(/^Double ([\d\s]+) = \?$/))) return String(n(m[1]) * 2);
  if ((m = prompt.match(/^Half of ([\d\s]+) = \?$/))) return String(n(m[1]) / 2);
  return null;
}

const results = [];
const check = (name, ok, saw) => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${String(saw).slice(0, 400)}`}`);
};

withDeployedSite({ dir: DIR, port: 0 }, async (page) => {
  const shoot = async (name, vp) => {
    if (!SHOTS) return;
    await page.setViewport(vp);
    await page.evaluate('window.scrollTo(0, 0)');
    await wait(500);
    await page.screenshot(path.join(SHOTS, `${name}-${vp.width}x${vp.height}.png`));
    await page.setViewport(LAPTOP);
    await wait(300);
  };
  const click = async (label) => {
    const at = await page.evaluate(LOCATE(label));
    if (!at.found) return false;
    for (const type of ['mousePressed', 'mouseReleased']) {
      await page.client.send('Input.dispatchMouseEvent', { type, x: Math.round(at.x), y: Math.round(at.y), button: 'left', clickCount: 1 });
    }
    await wait(700);
    return true;
  };
  const typeInto = async (text, enter) => {
    const at = await page.evaluate(`(() => { const i = [...document.querySelectorAll('input')].find((i) => i.offsetParent !== null && !i.disabled); if (!i) return null; i.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = i.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    if (!at) return false;
    for (const type of ['mousePressed', 'mouseReleased']) {
      await page.client.send('Input.dispatchMouseEvent', { type, x: Math.round(at.x), y: Math.round(at.y), button: 'left', clickCount: 1 });
    }
    await wait(150);
    await page.client.send('Input.insertText', { text });
    await wait(200);
    if (!enter) return true;
    await page.client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await page.client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await wait(900);
    return true;
  };

  await page.setViewport(LAPTOP);
  await wait(1500);

  // ── The look, measured on Profiles ─────────────────────────────────────────
  const look = await page.evaluate(LOOK);
  check('the profiles headline is on the page (the known-firing signal)', look.signal, JSON.stringify(look));
  check('Grandstander 800 is loaded', look.grandstander, JSON.stringify(look));
  check('Nunito is loaded', look.nunito, JSON.stringify(look));
  check('the headline is set in Grandstander', /Grandstander/.test(look.headlineFamily || ''), look.headlineFamily);
  check('a button is set in Grandstander', /Grandstander/.test(look.buttonFamily || ''), look.buttonFamily);
  check('the ground is paper, not white', look.ground === 'rgb(246, 236, 217)', look.ground);
  check('a button carries the 3px ink edge', look.buttonEdge === '3px rgb(42, 33, 27)', look.buttonEdge);
  check('a button carries the hard ink shadow (4px 5px, no blur)', /rgb\(42, 33, 27\) 4px 5px 0px/.test(look.buttonShadow || ''), look.buttonShadow);
  await shoot('01-profiles', LAPTOP);
  await shoot('01-profiles', PHONE);

  // ── A player, Home, the race ───────────────────────────────────────────────
  await click('New player');
  await typeInto('Léa', false);
  await click('CM1');
  await shoot('02-form', PHONE);
  await click('Let’s go!');
  await wait(900);
  const home = await page.evaluate('document.body.innerText');
  check('Home is reached', home.includes('Rocket Race'), home.slice(0, 200));
  await shoot('03-home', LAPTOP);
  await shoot('03-home', PHONE);
  await click('Rocket Race');
  await wait(900);
  await shoot('04-setup', PHONE);
  await click('Start');
  await wait(1200);

  // ── Two answers: one as right as the solver can make it, one deliberately wrong ──
  const seen = {};
  for (let round = 0; round < 4 && !(seen.good && seen.bad); round++) {
    const q = await page.evaluate(QUESTION);
    const wantGood = !seen.good && solve(q) !== null;
    // Two kinds of question: a box to type in, or option buttons. Any option press is graded, right or wrong.
    const typed = await typeInto(wantGood ? solve(q) : '1', true);
    if (!typed) {
      const option = await page.evaluate(`(() => { const b = [...document.querySelectorAll('button')].find((b) => b.getClientRects().length && /^[\\d\\s.,/−-]+$/.test(b.innerText.trim())); return b ? b.innerText.trim() : null; })()`);
      if (option) await click(option);
    }
    const VERDICTS = ['Correct!', 'Fast and correct!', 'Not quite.', 'Time’s up.'];
    let banner = await page.evaluate(BANNER(VERDICTS));
    // Enter does not always commit (the wrap drive met the same): press Check, as a person would.
    if (!banner && (await click('Check'))) banner = await page.evaluate(BANNER(VERDICTS));
    if (!banner) console.log(`NOTE  round ${round}: no verdict after "${q}" — body: ${(await page.evaluate('document.body.innerText')).replace(/\s+/g, ' ').slice(0, 200)}`);
    if (banner) {
      const good = /Correct|Fast/.test(banner.word);
      if (good && !seen.good) { seen.good = banner; await shoot('05-verdict-right', LAPTOP); await shoot('05-verdict-right', PHONE); }
      if (!good && !seen.bad) { seen.bad = banner; await shoot('06-verdict-wrong', LAPTOP); await shoot('06-verdict-wrong', PHONE); }
    }
    await click('Next');
    await wait(900);
  }
  check('a wrong answer was graded (the known-firing signal for the banners)', !!seen.bad, JSON.stringify(seen));
  if (seen.bad) check('a wrong answer’s banner is the card surface, with a berry headline', seen.bad.ground === 'rgb(255, 253, 247)' && seen.bad.ink === 'rgb(179, 38, 30)', JSON.stringify(seen.bad));
  if (seen.good) check('a right answer’s banner is sunshine, with an ink headline', seen.good.ground === 'rgb(255, 215, 106)' && seen.good.ink === 'rgb(42, 33, 27)', JSON.stringify(seen.good));
  else console.log('NOTE  no right answer was graded — the solver did not know these prompts; the sunshine banner was not measured');

  check('no console errors', page.consoleErrors.length === 0, JSON.stringify(page.consoleErrors.slice(0, 4)));
  check('no failed network requests (a missing face is one)', page.networkErrors.length === 0, JSON.stringify(page.networkErrors.slice(0, 4)));

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed}/${results.length} clauses passed`);
  if (passed !== results.length) process.exitCode = 1;
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
