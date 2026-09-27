#!/usr/bin/env node
/**
 * P88 GAM-009 AC2 — someone types into a field, the field is hidden and shown again, and what they typed is
 * still in it.
 *
 * The page is a minimal deploy: a Checkbox wired to a Text Input's `Mounted`, and a Text showing the field's
 * Value output. Everything a person does here is a real CDP event: a mouse click on the field, one key event
 * per character, and a mouse click on the checkbox to hide the field and another to show it. Each click target
 * is checked with `elementFromPoint` first, because a rendered element is not always the one under the pointer.
 *
 * Readings, in order, each with its known-firing half:
 *   typed   — the box and the Value text both read the typed word (the keys reached the field)
 *   hidden  — no text box is on the page (the hide really unmounted it)
 *   shown   — a text box is back, and what it and the Value text read. This is the person sentence.
 *
 * It grades nothing alone. Run it over deploy folders that differ only in `noodl.deploy.js` and compare arms.
 *
 * Usage: drive-gam009-remount.js <deploy-dir> [--word Tom] [--json out.json]
 * Exits 0 after printing its readings; 1 when the drive could not run; 2 on a usage error.
 */
const fs = require('fs');
const { withDeployedSite } = require('./drive-deployed.js');

const DIR = process.argv[2];
const argOf = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
};
const WORD = argOf('--word') || 'Tom';
const JSON_OUT = argOf('--json');
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-gam009-remount.js <deploy-dir> [--word Tom] [--json out.json]');
  process.exit(2);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** The page, as a person would read it. */
const READ = `(() => {
  const box = document.querySelector('input:not([type=checkbox])');
  const check = document.querySelector('input[type=checkbox]');
  const texts = [...document.querySelectorAll('p, span, div')].filter((e) => e.children.length === 0 && !e.closest('label'));
  const valueText = texts.map((e) => e.innerText).filter((t) => t && t.trim()).pop() || '';
  return { box: box ? box.value : null, checked: check ? check.checked : null, valueText, active: document.activeElement ? document.activeElement.tagName + (document.activeElement.type ? ':' + document.activeElement.type : '') : null };
})()`;

/** Centre of an element, and whether that element (or its own subtree) is what the pointer would hit there. */
const AIM = (selector) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return { found: false };
  let r = el.getBoundingClientRect();
  let target = el;
  // A checkbox's real <input> can be sized to nothing; aim at the wrapper it sits in, and still require the hit to land in it.
  if (r.width < 2 || r.height < 2) { target = el.parentElement; r = target.getBoundingClientRect(); }
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const hit = document.elementFromPoint(x, y);
  return { found: true, x, y, w: r.width, h: r.height, reach: !!hit && (hit === target || target.contains(hit) || hit.contains(el)), hit: hit ? hit.tagName : null };
})()`;

async function click(client, evaluate, selector) {
  const aim = await evaluate(AIM(selector));
  if (!aim.found || !aim.reach) return aim;
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
    await client.send('Input.dispatchMouseEvent', { type, x: aim.x, y: aim.y, button: 'left', clickCount: 1 });
  }
  await wait(250);
  return aim;
}

async function typeWord(client, word) {
  for (const ch of word) {
    await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ch, text: ch, unmodifiedText: ch });
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch });
  }
  await wait(250);
}

withDeployedSite({ dir: DIR }, async ({ client, evaluate, consoleErrors }) => {
  const out = { dir: DIR, word: WORD };
  out.boot = await evaluate(READ);
  if (out.boot.box === null) throw new Error('no text box on the page at boot: ' + JSON.stringify(out.boot));

  out.aimField = await click(client, evaluate, 'input:not([type=checkbox])');
  await typeWord(client, WORD);
  out.typed = await evaluate(READ);

  out.aimHide = await click(client, evaluate, 'input[type=checkbox]');
  out.hidden = await evaluate(READ);

  out.aimShow = await click(client, evaluate, 'input[type=checkbox]');
  out.shown = await evaluate(READ);

  out.consoleErrors = consoleErrors.slice();
  out.clauses = {
    keysReached: out.typed.box === WORD && out.typed.valueText === WORD,
    hideUnmounted: out.hidden.box === null && out.hidden.checked === false,
    showRemounted: out.shown.box !== null && out.shown.checked === true,
    boxKeptWord: out.shown.box === WORD,
    valueKeptWord: out.shown.valueText === WORD
  };
  return out;
})
  .then((out) => {
    const text = JSON.stringify(out, null, 1);
    console.log(text);
    if (JSON_OUT) fs.writeFileSync(JSON_OUT, text);
    process.exit(0);
  })
  .catch((e) => {
    console.error('DRIVE FAILED:', e && e.stack ? e.stack : e);
    process.exit(1);
  });
