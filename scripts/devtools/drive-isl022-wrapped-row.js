#!/usr/bin/env node
/**
 * P109 ISL-022 AC1 — the render half: does a `contentSize` Group set to wrap ever wrap, inside a row parent, on a phone?
 *
 * ISL-022 §2 INFERRED from `layout.ts` (a `contentSize` node gets no width, every node gets `flexShrink: 0`) that such a
 * Group is as wide as its unwrapped content, so its `flexWrap` never takes effect — the shape of the island's `brTabs`,
 * which made the page 506 px wide at 390 (CG-003 §7.2). This drive confirms or strikes that.
 *
 * The page is `dev-docs/tasks/phase-109-the-defects-the-island-found/isl022-wrapped-row`, deployed with `nodegx deploy`:
 * `rowA` is brTabs' shape (`contentSize`, `flexWrap: wrap`, five 110 px items, inside a full-width wrapping row parent);
 * `rowB` is the control beside it — the same row given the page's width (`contentHeight`, 100 %), which must wrap.
 *
 * Usage: drive-isl022-wrapped-row.js <deploy-dir> [--width 390] [--height 844] [--shot out.png] [--json out.json]
 * Exits 0 after printing its readings; 1 when the drive could not run; 2 on a usage error.
 */
const fs = require('fs');
const { withDeployedSite } = require('./drive-deployed.js');

const args = process.argv.slice(2);
const flagValue = (name) => (args.indexOf(name) === -1 ? null : args[args.indexOf(name) + 1]);
const DIR = args[0];
const WIDTH = Number(flagValue('--width') || 390);
const HEIGHT = Number(flagValue('--height') || 844);
const SHOT = flagValue('--shot');
const JSON_OUT = flagValue('--json');
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-isl022-wrapped-row.js <deploy-dir> [--width 390] [--height 844] [--shot out.png] [--json out.json]');
  process.exit(2);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const READ = `(() => {
  const row = (cls) => {
    const el = document.querySelector('.' + cls);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const items = [...el.children].map((c) => c.getBoundingClientRect());
    return {
      width: Math.round(r.width),
      right: Math.round(r.right),
      lines: new Set(items.map((i) => Math.round(i.top))).size,
      items: items.length,
      computed: { width: getComputedStyle(el).width, flexWrap: getComputedStyle(el).flexWrap, flexShrink: getComputedStyle(el).flexShrink }
    };
  };
  return {
    marker: document.body.innerText.includes('isl022 page drew'),
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    rowA: row('rowA'),
    rowB: row('rowB')
  };
})()`;

withDeployedSite({ dir: DIR }, async ({ evaluate, setViewport, screenshot, consoleErrors }) => {
  await setViewport({ width: WIDTH, height: HEIGHT, mobile: true });
  let read = await evaluate(READ);
  for (let i = 0; i < 20 && !(read.marker && read.rowA && read.rowB); i++) {
    await wait(250);
    read = await evaluate(READ);
  }
  if (SHOT) await screenshot(SHOT);
  return { dir: DIR, viewport: `${WIDTH}x${HEIGHT}`, ...read, consoleErrors: consoleErrors.slice(0, 10) };
})
  .then((result) => {
    const text = JSON.stringify(result, null, 2);
    console.log(text);
    if (JSON_OUT) fs.writeFileSync(JSON_OUT, text);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
  });
