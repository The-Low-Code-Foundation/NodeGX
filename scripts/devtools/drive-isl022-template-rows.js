#!/usr/bin/env node
/**
 * P109 ISL-022 AC4 — the render half of the census: does each row `row-cannot-wrap` names actually overflow a phone?
 *
 * The new code fires on a wrapping row Group sized to its own content inside a row parent. Its wrap is inert by
 * construction (ISL-022 §8 s3: 566 px on one line at 390). Whether that HURTS depends on how wide the row's children
 * are, which the validator cannot read for component instances and text. This drive reads it off the deployed page.
 *
 * The deploy folder is a scratch copy of a template whose flagged nodes were given a `cssClassName` of
 * `isl022-<nodeId>` (a class with no rule: it changes no layout). Per class it reads every element carrying it (a
 * component placed twice is two rows): its width, its right edge, how many lines its children sit on, and its parent's
 * width. Plus the page's `innerWidth` and `scrollWidth`, because mobile Chrome zooms a too-wide page out rather than
 * scrolling it (ISL-022 §7).
 *
 * Usage: drive-isl022-template-rows.js <deploy-dir> <class,class,...> [--path /route] [--width 390] [--height 844]
 *        [--shot out.png] [--json out.json]
 * Exits 0 after printing its readings; 1 when the drive could not run; 2 on a usage error.
 */
const fs = require('fs');
const { withDeployedSite } = require('./drive-deployed.js');

const args = process.argv.slice(2);
const flagValue = (name) => (args.indexOf(name) === -1 ? null : args[args.indexOf(name) + 1]);
const DIR = args[0];
const CLASSES = (args[1] || '').split(',').filter(Boolean);
const ROUTE = flagValue('--path');
const WIDTH = Number(flagValue('--width') || 390);
const HEIGHT = Number(flagValue('--height') || 844);
const SHOT = flagValue('--shot');
const JSON_OUT = flagValue('--json');
if (!DIR || DIR.startsWith('--') || CLASSES.length === 0) {
  console.error('usage: drive-isl022-template-rows.js <deploy-dir> <class,...> [--path /route] [--width 390] [--shot out.png] [--json out.json]');
  process.exit(2);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const READ = (classes) => `(() => {
  const read = (el) => {
    const r = el.getBoundingClientRect();
    const items = [...el.children].map((c) => c.getBoundingClientRect()).filter((i) => i.width > 0);
    const parent = el.parentElement.getBoundingClientRect();
    return {
      width: Math.round(r.width),
      left: Math.round(r.left),
      right: Math.round(r.right),
      lines: new Set(items.map((i) => Math.round(i.top))).size,
      items: items.length,
      itemsRight: items.length ? Math.round(Math.max(...items.map((i) => i.right))) : null,
      parentWidth: Math.round(parent.width),
      visible: r.width > 0 && r.height > 0
    };
  };
  const rows = {};
  for (const cls of ${JSON.stringify(classes)}) rows[cls] = [...document.querySelectorAll('.' + cls)].map(read);
  return { innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth, location: location.pathname, rows };
})()`;

withDeployedSite({ dir: DIR }, async ({ evaluate, setViewport, screenshot, consoleErrors, navigate }) => {
  await setViewport({ width: WIDTH, height: HEIGHT, mobile: true });
  if (ROUTE && navigate) await navigate(ROUTE);
  let read = await evaluate(READ(CLASSES));
  for (let i = 0; i < 40 && !Object.values(read.rows).some((r) => r.length > 0); i++) {
    await wait(250);
    read = await evaluate(READ(CLASSES));
  }
  await wait(750); // fonts and late rows
  read = await evaluate(READ(CLASSES));
  if (SHOT) await screenshot(SHOT);
  return { dir: DIR, viewport: `${WIDTH}x${HEIGHT}`, ...read, consoleErrors: consoleErrors.slice(0, 5) };
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
