#!/usr/bin/env node
/**
 * P109 ISL-004 ruling 2 (s18) — does a Component Object keep its value when its component is unmounted and mounted again?
 *
 * The project is built through the door by `packages/noodl-mcp/tests/isl004Remount.ts` and deployed with `nodegx deploy`.
 * On Page A: tap the hideable Tally's + three times, the first For Each row's twice, the second row's once, the app-wide
 * counter twice. Then, reading after each: Hide and Show (the Group's `mounted` off and on), Rewrite (the For Each gets a
 * fresh array of the same two ids), Refresh (the For Each rebuilds), Filter then Rewrite (row 1 leaves the list and comes
 * back), and a round trip A → B → A through the app's own Router
 * (never a reload, which resets everything). Every press is a CDP mouse event at the element's centre after
 * `elementFromPoint` says it is what a finger would hit.
 *
 * Readings: each count, the app counter (the known-firing control: app-wide state survives every step), and whether the
 * element on screen is the SAME DOM element as before the step (a mark set on it before), which tells "kept" from
 * "rebuilt with the value put back".
 *
 * Usage: drive-isl004-remount.js <deploy-dir> [--json out.json]
 * Exits 0 after printing; 1 when the drive could not run; 2 on a usage error.
 */
const fs = require('fs');
const { withDeployedSite } = require('./drive-deployed.js');

const DIR = process.argv[2];
const at = process.argv.indexOf('--json');
const JSON_OUT = at === -1 ? null : process.argv[at + 1];
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-isl004-remount.js <deploy-dir> [--json out.json]');
  process.exit(2);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Element expressions, evaluated in the page.
const HIDE_COUNT = `document.querySelector('[data-testid="hide-tally"] [data-testid="count"]')`;
const HIDE_PLUS = `document.querySelector('[data-testid="hide-tally"] [data-testid="plus"]')`;
const ROW_COUNT = (i) => `document.querySelectorAll('[data-testid="rows"] [data-testid="count"]')[${i}]`;
const ROW_PLUS = (i) => `document.querySelectorAll('[data-testid="rows"] [data-testid="plus"]')[${i}]`;
const BY_ID = (id) => `document.querySelector('[data-testid="${id}"]')`;

withDeployedSite({ dir: DIR }, async (page) => {
  const { client } = page;
  await page.setViewport({ width: 390, height: 844, mobile: true });
  const ev = (expr) => page.evaluate(expr);
  const until = async (expr, ms = 5000) => {
    for (let t = 0; t < ms; t += 100) {
      if (await ev(`!!(${expr})`)) return true;
      await wait(100);
    }
    throw new Error(`never appeared: ${expr}`);
  };
  const tap = async (expr) => {
    const box = await ev(`(() => { const e = ${expr}; if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const hit = document.elementFromPoint(x, y); return { x, y, ok: !!hit && (e === hit || e.contains(hit)) }; })()`);
    if (!box || !box.ok) throw new Error(`not tappable: ${expr}`);
    const base = { x: box.x, y: box.y, button: 'left', clickCount: 1 };
    await client.send('Input.dispatchMouseEvent', { ...base, type: 'mousePressed', buttons: 1 });
    await client.send('Input.dispatchMouseEvent', { ...base, type: 'mouseReleased', buttons: 0 });
    await wait(200);
  };
  // A mark on each count element before a step; after it, `same` says whether that element survived the step.
  const mark = () => ev(`[${HIDE_COUNT}, ${ROW_COUNT(0)}, ${ROW_COUNT(1)}].forEach((e) => { if (e) e.__isl004 = 1; })`);
  const one = (expr) => `(() => { const e = ${expr}; return e ? { n: e.innerText.trim(), same: e.__isl004 === 1 } : null; })()`;
  const read = async () => ({
    hidden: await ev(one(HIDE_COUNT)),
    row1: await ev(one(ROW_COUNT(0))),
    row2: await ev(one(ROW_COUNT(1))),
    rows: await ev(`document.querySelectorAll('[data-testid="rows"] [data-testid="count"]').length`),
    app: await ev(`(() => { const e = ${BY_ID('app-count')}; return e ? e.innerText.trim() : null; })()`)
  });

  await until(ROW_PLUS(1));
  for (let i = 0; i < 3; i++) await tap(HIDE_PLUS);
  for (let i = 0; i < 2; i++) await tap(ROW_PLUS(0));
  await tap(ROW_PLUS(1));
  for (let i = 0; i < 2; i++) await tap(BY_ID('app-plus'));
  const steps = [{ step: 'before', ...(await read()) }];

  await mark();
  await tap(BY_ID('hide'));
  const whileHidden = await ev(`!!document.querySelector('[data-testid="hide-tally"]')`);
  await tap(BY_ID('show'));
  await until(HIDE_COUNT);
  steps.push({ step: 'hide, show', wrapperOnScreenWhileHidden: whileHidden, ...(await read()) });

  await mark();
  await tap(BY_ID('rewrite'));
  await wait(300);
  steps.push({ step: 'rewrite (same ids)', ...(await read()) });

  await mark();
  await tap(BY_ID('refresh'));
  await wait(300);
  steps.push({ step: 'refresh', ...(await read()) });

  // Tap again so the round trip has something to lose on every Tally.
  await tap(ROW_PLUS(0));
  steps.push({ step: 'row 1 tapped once more', ...(await read()) });

  await mark();
  await tap(BY_ID('filter'));
  await wait(300);
  steps.push({ step: 'filter (row 1 out)', ...(await read()) });
  await tap(BY_ID('rewrite'));
  await wait(300);
  steps.push({ step: 'rewrite (row 1 back)', ...(await read()) });

  await mark();
  await tap(BY_ID('to-b'));
  await until(BY_ID('page-b'));
  await wait(500);
  await tap(BY_ID('to-a'));
  await until(ROW_COUNT(1));
  await wait(300);
  steps.push({ step: 'round trip A → B → A', ...(await read()) });

  const report = { steps, url: await ev('location.pathname'), consoleErrors: page.consoleErrors.slice(0, 10) };
  console.log(JSON.stringify(report, null, 1));
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 1));
}).catch((e) => {
  console.error(e && e.stack ? e.stack : String(e));
  process.exit(1);
});
