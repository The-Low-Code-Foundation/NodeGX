#!/usr/bin/env node
/**
 * P109 ISL-003 AC5 — three cards whose lines are all numbered `l0…l2` each show their own lines, read on a DEPLOYED page.
 *
 * The project is `dev-docs/tasks/phase-109-the-defects-the-island-found/isl003-three-cards` (built through the door by
 * `packages/noodl-mcp/tests/isl003ThreeCards.ts`): three cards, each a Repeater over its own Static Data, every table
 * numbering its lines from `l0`. Deployed with `nodegx deploy`. Each card's text is read by `[data-testid="card-N"]`.
 *
 * Graded beside a known-firing reading in both modes: every card draws three lines (the rows render at all).
 *  - treatment: card N reads `card N line 0…2`, and no two cards read alike;
 *  - `--control` (a deploy built on the engine from before the fix): all three cards read ONE card's lines.
 *
 * Usage: drive-isl003-three-cards.js <deploy-dir> [--control] [--json <file>]. Exits 0 when the mode's expectations
 * hold, 1 otherwise, 2 on a usage error.
 */
const fs = require('fs');
const { withDeployedSite } = require('./drive-deployed.js');

const DIR = process.argv[2];
const CONTROL = process.argv.includes('--control');
const JSON_OUT = process.argv.indexOf('--json') === -1 ? null : process.argv[process.argv.indexOf('--json') + 1];
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-isl003-three-cards.js <deploy-dir> [--control] [--json <file>]');
  process.exit(2);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CARDS = [1, 2, 3];
const READ = `(() => Object.fromEntries(${JSON.stringify(CARDS)}.map((n) => {
  const el = document.querySelector('[data-testid="card-' + n + '"]');
  return [n, el ? el.innerText.split('\\n').map((s) => s.trim()).filter(Boolean) : null];
})))()`;

withDeployedSite({ dir: DIR }, async (page) => {
  await page.setViewport({ width: 1024, height: 768, mobile: false });
  await page.client.send('Page.reload', {});
  await wait(2500);
  const cards = await page.evaluate(READ);

  const checks = [];
  const check = (name, ok, got) => checks.push({ name, ok: !!ok, got });
  check('known-firing: every card draws three lines', CARDS.every((n) => cards[n] && cards[n].length === 3), cards);
  const distinct = new Set(CARDS.map((n) => JSON.stringify(cards[n]))).size;
  if (!CONTROL) {
    for (const n of CARDS) {
      const want = [0, 1, 2].map((i) => `card ${n} line ${i}`);
      check(`card ${n} shows its own lines`, JSON.stringify(cards[n]) === JSON.stringify(want), cards[n]);
    }
    check('no two cards read alike', distinct === CARDS.length, distinct);
  } else {
    check('CONTROL: the three cards read one card\'s lines', distinct === 1, cards);
  }
  check('no console errors', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 3));

  console.log('cards', JSON.stringify(cards));
  for (const c of checks) console.log(c.ok ? '  ok  ' : '  FAIL', c.name, c.ok ? '' : JSON.stringify(c.got));
  console.log(`${CONTROL ? 'control' : 'treatment'}: ${checks.filter((c) => c.ok).length}/${checks.length}`);
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ cards, checks }, null, 2));
  process.exitCode = checks.every((c) => c.ok) ? 0 : 1;
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
