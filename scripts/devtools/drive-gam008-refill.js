#!/usr/bin/env node
/**
 * P88 GAM-008 AC5 — a countdown bar refills for every question, and then glides.
 *
 * The page is a minimal deploy with one "Next question" button and two 300 px bars off the same press:
 *   door  — an Animate To Value with Target Value 0 and a 3,000 ms linear glide; the press fires its Jump To
 *           (Jump Value 100). This is the person sentence.
 *   chain — the pre-build-2 Rocket School chain, left as it was: Set Variable Duration 0 → Target 100 →
 *           Duration 3000 → Target 0, all off the same press, in one pass. It is the known-firing half: its
 *           first press refills (the first target is adopted outright), and the documented collapse means later
 *           presses do not. It moves in every arm, so an arm that shows no refill still shows the press arrived.
 *
 * Every press is a real CDP mouse event, aimed with `elementFromPoint`. The page records its own clock: a
 * capture-phase `pointerdown` listener stamps each press, and a `requestAnimationFrame` loop samples both fill
 * widths, so every reading is dated from the press, in the page's own `performance.now()`.
 *
 * Per press:
 *   fullMs     — ms from the press to the first frame the door bar is ≥ 297 px (null: never, within the gap)
 *   before     — the door bar's width on the last frame before the press
 *   at600      — the door bar's width on the frame nearest 600 ms after the press (a glide reads ~240)
 *   chainMax   — the chain bar's widest frame within 400 ms of the press
 *
 * It grades nothing alone. Run it over deploy folders that differ only in `noodl.deploy.js` and compare arms.
 *
 * Usage: drive-gam008-refill.js <deploy-dir> [--json out.json]
 * Exits 0 after printing its readings; 1 when the drive could not run; 2 on a usage error.
 */
const fs = require('fs');
const { withDeployedSite } = require('./drive-deployed.js');

const DIR = process.argv[2];
const argOf = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
};
const JSON_OUT = argOf('--json');
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-gam008-refill.js <deploy-dir> [--json out.json]');
  process.exit(2);
}

const VIEWPORTS = [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '390x844', width: 390, height: 844, mobile: true }
];
const PRESSES = 3;
const GAP_MS = 1200;
const FULL_PX = 297;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const RECORDER = `(() => {
  const rec = { samples: [], presses: [] };
  window.__gam008 = rec;
  const w = (sel) => { const e = document.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().width * 10) / 10 : null; };
  document.addEventListener('pointerdown', () => rec.presses.push(performance.now()), true);
  const tick = () => { rec.samples.push([performance.now(), w('.gam008-door-fill'), w('.gam008-chain-fill')]); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  return { door: w('.gam008-door-fill'), chain: w('.gam008-chain-fill'), doorTrack: w('.gam008-door-track'), button: !!document.querySelector('.gam008-next') };
})()`;

const AIM = `(() => {
  const el = document.querySelector('.gam008-next') || document.querySelector('button');
  if (!el) return { found: false };
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const hit = document.elementFromPoint(x, y);
  return { found: true, x, y, reach: !!hit && (hit === el || el.contains(hit)), hit: hit ? hit.tagName : null };
})()`;

async function press(client, evaluate) {
  const aim = await evaluate(AIM);
  if (!aim.found || !aim.reach) return aim;
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
    await client.send('Input.dispatchMouseEvent', { type, x: aim.x, y: aim.y, button: 'left', clickCount: 1 });
  }
  return aim;
}

function summarise(rec) {
  const { samples, presses } = rec;
  return presses.map((tp, i) => {
    const next = presses[i + 1] ?? Infinity;
    const after = samples.filter((s) => s[0] >= tp && s[0] < next);
    const beforeFrame = samples.filter((s) => s[0] < tp).pop();
    const full = after.find((s) => s[1] !== null && s[1] >= FULL_PX);
    const near600 = after.reduce((best, s) => (best === null || Math.abs(s[0] - tp - 600) < Math.abs(best[0] - tp - 600) ? s : best), null);
    const chainWindow = after.filter((s) => s[0] <= tp + 400).map((s) => s[2] ?? 0);
    return {
      press: i + 1,
      framesSampled: after.length,
      before: beforeFrame ? beforeFrame[1] : null,
      fullMs: full ? Math.round(full[0] - tp) : null,
      at600: near600 ? near600[1] : null,
      chainMax: chainWindow.length ? Math.max(...chainWindow) : null
    };
  });
}

withDeployedSite({ dir: DIR }, async ({ client, evaluate, consoleErrors, setViewport, navigate }) => {
  const out = { dir: DIR, runs: [] };
  for (const vp of VIEWPORTS) {
    await setViewport(vp);
    await navigate('/');
    const run = { viewport: vp.name, boot: await evaluate(RECORDER), aims: [] };
    if (run.boot.door === null || run.boot.chain === null || !run.boot.button) {
      throw new Error('the page did not draw both bars and the button: ' + JSON.stringify(run.boot));
    }
    await wait(500);
    for (let i = 0; i < PRESSES; i++) {
      run.aims.push(await press(client, evaluate));
      await wait(GAP_MS);
    }
    const rec = await evaluate('window.__gam008');
    run.pressesRecorded = rec.presses.length;
    run.presses = summarise(rec);
    const later = run.presses.slice(1);
    run.clauses = {
      everyPressReached: run.aims.every((a) => a.reach) && rec.presses.length === PRESSES,
      chainRefilledOnFirst: run.presses[0] && run.presses[0].chainMax >= FULL_PX,
      chainCollapsedLater: later.every((p) => p.chainMax !== null && p.chainMax < FULL_PX),
      doorWasDownBeforeLaterPresses: later.every((p) => p.before !== null && p.before < FULL_PX),
      doorFullWithin150Every: run.presses.every((p) => p.fullMs !== null && p.fullMs <= 150),
      doorGlidesAfterEvery: run.presses.every((p) => p.at600 !== null && p.at600 < FULL_PX && p.at600 > 150)
    };
    out.runs.push(run);
  }
  out.consoleErrors = consoleErrors.slice();
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
