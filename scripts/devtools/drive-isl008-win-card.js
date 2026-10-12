#!/usr/bin/env node
/**
 * P109 ISL-008 AC1–AC3 — does a Group go where an ordinary stylesheet says, on a deployed page?
 *
 * The page is `dev-docs/tasks/phase-109-the-defects-the-island-found/isl008-win-card`, deployed with `nodegx deploy`.
 * A CSS Definition says `.win, .win-set { position: fixed; inset: 0; display: flex; align-items: center;
 * justify-content: center }` with NO `!important`, and `.win-imp` the same with every declaration forced. Four Groups,
 * each wearing `data-isl008` and holding a 200×100 card (`data-isl008-card`):
 *
 *   bare    — no class: what a Group draws on its own (nothing here may move)
 *   forced  — `.win-imp`: the known-firing control, the way five templates had to write it
 *   set     — `.win-set` AND Align Items set to Start in the panel: the panel value must win (ruling 2)
 *   plain   — `.win`: the person sentence. Last in the tree, so it is on top where the overlays overlap
 *
 * Readings per Group: computed position / display / align-items / justify-content, the inline style attribute, and the
 * card's box centre against the viewport's (390 × 844). `hitAtCentre` is `elementFromPoint` at the viewport centre —
 * which card a finger on the centre of the screen lands on (RECT ≠ VISIBLE).
 *
 * 🔴 The values graded are ones a Group never has by default (`fixed`, `center`), so a default cannot pass for the rule.
 *
 * Usage: drive-isl008-win-card.js <deploy-dir> [--shot out.png] [--json out.json]
 * Exits 0 after printing; 1 when the drive could not run; 2 on a usage error.
 */
const fs = require('fs');
const { withDeployedSite } = require('./drive-deployed.js');

const DIR = process.argv[2];
const flag = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
};
const JSON_OUT = flag('--json');
const SHOT = flag('--shot');
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-isl008-win-card.js <deploy-dir> [--shot out.png] [--json out.json]');
  process.exit(2);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const READ = `(() => {
  const vw = window.innerWidth, vh = window.innerHeight;
  const out = { marker: document.body.innerText.includes('isl008 page drew'), viewport: { w: vw, h: vh } };
  for (const el of document.querySelectorAll('[data-isl008]')) {
    const cs = getComputedStyle(el);
    const card = el.querySelector('[data-isl008-card]');
    const r = card ? card.getBoundingClientRect() : null;
    out[el.getAttribute('data-isl008')] = {
      position: cs.position,
      display: cs.display,
      alignItems: cs.alignItems,
      justifyContent: cs.justifyContent,
      inline: el.getAttribute('style'),
      className: el.className,
      card: r && { cx: Math.round((r.left + r.width / 2) * 10) / 10, cy: Math.round((r.top + r.height / 2) * 10) / 10,
                   offX: Math.round((r.left + r.width / 2 - vw / 2) * 10) / 10, offY: Math.round((r.top + r.height / 2 - vh / 2) * 10) / 10 }
    };
  }
  const hit = document.elementFromPoint(vw / 2, vh / 2);
  const holder = hit && hit.closest('[data-isl008-card]');
  out.hitAtCentre = holder ? holder.getAttribute('data-isl008-card') : (hit ? hit.tagName : null);
  return out;
})()`;

withDeployedSite({ dir: DIR }, async ({ evaluate, consoleErrors, setViewport, screenshot }) => {
  await setViewport({ width: 390, height: 844, mobile: true });
  let read = await evaluate(READ);
  for (let i = 0; i < 20 && !(read.marker && read.plain); i++) {
    await wait(250);
    read = await evaluate(READ);
  }
  await wait(300);
  read = await evaluate(READ);
  if (SHOT) await screenshot(SHOT);
  return { dir: DIR, ...read, consoleErrors: consoleErrors.slice(0, 10) };
})
  .then((result) => {
    const text = JSON.stringify(result, null, 2);
    console.log(text);
    if (JSON_OUT) fs.writeFileSync(JSON_OUT, text);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e && e.stack ? e.stack : String(e));
    process.exit(1);
  });
