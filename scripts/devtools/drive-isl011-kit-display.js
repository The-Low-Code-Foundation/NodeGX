#!/usr/bin/env node
/**
 * P109 ISL-011 AC1 — the browser half: what `display` does a kit node's root COMPUTE to on a deployed page when the
 * kit's own stylesheet says `grid` on the root's class and `defaultCss` says `block`?
 *
 * The page is `packages/nodegx-export/tests/fixtures/isl011-kit-grid`, deployed with `nodegx deploy`: a marker Text,
 * `isl011.World` (defaultCss `{ display: 'block' }`, root class `.isl011-k{display:grid;…}`), and `isl011.WorldBare` —
 * the same component with no `defaultCss`, the known-firing control. Each root wears `data-isl011`; each of its four
 * cells `data-isl011-cell`.
 *
 * Readings (the task's §8 grades them; this prints):
 *   marker        — the page itself drew
 *   with-default  — computed display, grid-template-columns, inline display, the cells' boxes
 *   bare          — the same for the control (must read grid, four columns side by side)
 * Plus console errors and the kit's registration (`window.__noodl_modules`).
 *
 * Usage: drive-isl011-kit-display.js <deploy-dir> [--json out.json]
 * Exits 0 after printing its readings; 1 when the drive could not run; 2 on a usage error.
 */
const fs = require('fs');
const { withDeployedSite } = require('./drive-deployed.js');

const DIR = process.argv[2];
const jsonFlag = process.argv.indexOf('--json');
const JSON_OUT = jsonFlag === -1 ? null : process.argv[jsonFlag + 1];
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-isl011-kit-display.js <deploy-dir> [--json out.json]');
  process.exit(2);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const READ = `(() => {
  const roots = [...document.querySelectorAll('[data-isl011]')];
  const one = (el) => {
    const cs = getComputedStyle(el);
    const cells = [...el.querySelectorAll('[data-isl011-cell]')].map((c) => {
      const r = c.getBoundingClientRect();
      return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
    });
    const rows = new Set(cells.map((c) => c.y)).size;
    return {
      computedDisplay: cs.display,
      gridTemplateColumns: cs.gridTemplateColumns,
      inlineDisplay: el.style.display,
      cells: cells.length,
      rows,
      cellBoxes: cells
    };
  };
  const out = { marker: document.body.innerText.includes('isl011 page drew'), roots: roots.length };
  for (const el of roots) out[el.getAttribute('data-isl011')] = one(el);
  out.modules = (window.__noodl_modules || []).map((m) => ({ name: m && m.name, reactNodes: ((m && m.reactNodes) || []).map((n) => n && n.name) }));
  return out;
})()`;

withDeployedSite({ dir: DIR }, async ({ evaluate, consoleErrors }) => {
  let read = await evaluate(READ);
  for (let i = 0; i < 20 && !(read.marker && read.roots === 2); i++) {
    await wait(250);
    read = await evaluate(READ);
  }
  await wait(500);
  read = await evaluate(READ);
  return { dir: DIR, ...read, consoleErrors: consoleErrors.slice(0, 10) };
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
