#!/usr/bin/env node
/**
 * P109 ISL-004 AC1/AC2 — does a page someone leaves come back as they left it?
 *
 * The project is `dev-docs/tasks/phase-109-the-defects-the-island-found/isl004-keep-page` (built through the door by
 * `packages/noodl-mcp/tests/isl004KeepPage.ts`), deployed with `nodegx deploy`. On Page A: tap the first Tally's +
 * three times, the second's once, the app-wide counter twice; then three round trips A → B → A through the app's own
 * Router (never a reload, which resets everything). Every press is a CDP mouse event at the element's centre after
 * `elementFromPoint` says it is what a finger would hit.
 *
 * Readings: the two tallies and the app counter before leaving and after each return (AC1: today 0/0 after a return,
 * the app counter kept — the known-firing control); the Repeat's count before leaving, after the time on B, and after
 * each return (AC2's clock rule: a kept page's clock does not tick while hidden).
 *
 * Usage: drive-isl004-keep-page.js <deploy-dir> [--json out.json]
 * Exits 0 after printing; 1 when the drive could not run; 2 on a usage error.
 */
const fs = require('fs');
const { withDeployedSite } = require('./drive-deployed.js');

const DIR = process.argv[2];
const at = process.argv.indexOf('--json');
const JSON_OUT = at === -1 ? null : process.argv[at + 1];
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-isl004-keep-page.js <deploy-dir> [--json out.json]');
  process.exit(2);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ON_B_MS = 1500;

withDeployedSite({ dir: DIR }, async (page) => {
  const { client } = page;
  await page.setViewport({ width: 390, height: 844, mobile: true });
  const ev = (expr) => page.evaluate(expr);
  const text = (sel) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); return e ? e.innerText.trim() : null; })()`);
  const until = async (sel, ms = 5000) => {
    for (let t = 0; t < ms; t += 100) {
      if (await ev(`!!document.querySelector(${JSON.stringify(sel)})`)) return true;
      await wait(100);
    }
    throw new Error(`never appeared: ${sel}`);
  };
  const tap = async (sel) => {
    const box = await ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const hit = document.elementFromPoint(x, y); return { x, y, ok: !!hit && (e === hit || e.contains(hit)) }; })()`);
    if (!box || !box.ok) throw new Error(`not tappable: ${sel}`);
    const base = { x: box.x, y: box.y, button: 'left', clickCount: 1 };
    await client.send('Input.dispatchMouseEvent', { ...base, type: 'mousePressed', buttons: 1 });
    await client.send('Input.dispatchMouseEvent', { ...base, type: 'mouseReleased', buttons: 0 });
    await wait(150);
  };
  const read = async () => ({
    tally1: await text('[data-testid="tally-1"] [data-testid="count"]'),
    tally2: await text('[data-testid="tally-2"] [data-testid="count"]'),
    app: await text('[data-testid="app-count"]'),
    ticks: Number(await text('[data-testid="ticks"]'))
  });

  await until('[data-testid="tally-1"] [data-testid="plus"]');
  for (let i = 0; i < 3; i++) await tap('[data-testid="tally-1"] [data-testid="plus"]');
  await tap('[data-testid="tally-2"] [data-testid="plus"]');
  for (let i = 0; i < 2; i++) await tap('[data-testid="app-plus"]');
  const before = await read();

  const trips = [];
  for (let trip = 1; trip <= 3; trip++) {
    const leaving = await read();
    await tap('[data-testid="to-b"]');
    await until('[data-testid="page-b"]');
    const leftAt = Date.now();
    await wait(ON_B_MS);
    await tap('[data-testid="to-a"]');
    await until('[data-testid="tally-1"] [data-testid="count"]');
    const back = await read();
    trips.push({ trip, ticksLeaving: leaving.ticks, msAway: Date.now() - leftAt, ...back });
  }

  const report = {
    before,
    trips,
    url: await ev('location.pathname'),
    consoleErrors: page.consoleErrors.slice(0, 10)
  };
  console.log(JSON.stringify(report, null, 1));
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 1));
}).catch((e) => {
  console.error(e && e.stack ? e.stack : String(e));
  process.exit(1);
});
