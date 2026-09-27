#!/usr/bin/env node
/**
 * P88 GAM-014 AC1 — the browser half: does a component whose root is a kit's React node draw on a deployed page?
 *
 * The page is `tests/gam-014-…test.ts`'s fixture, deployed with `nodegx-deploy.cjs`: a marker Text, then `/Kit/Face`
 * (a root `game-kit.Avatar`, seed `Ada`), then `/Kit/Wrapped face` (the same Avatar inside a Group root, seed `Bea`).
 * The Avatar draws an `<img alt="<seed>">`, so each placement is read by its own seed.
 *
 * Readings, each beside its known-firing half:
 *   marker      — the page itself drew (a blank page fails every clause together)
 *   groupRooted — Bea's `<img>` is on the page: the kit registered and draws inside a Group
 *   kitRooted   — Ada's `<img>` is on the page. This is the person sentence.
 * Plus what the page says about the kit: `window.__noodl_modules` react node names, and console errors.
 *
 * Usage: drive-gam014-kit-root.js <deploy-dir> [--json out.json]
 * Exits 0 after printing its readings; 1 when the drive could not run; 2 on a usage error.
 */
const fs = require('fs');
const { withDeployedSite } = require('./drive-deployed.js');

const DIR = process.argv[2];
const jsonFlag = process.argv.indexOf('--json');
const JSON_OUT = jsonFlag === -1 ? null : process.argv[jsonFlag + 1];
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-gam014-kit-root.js <deploy-dir> [--json out.json]');
  process.exit(2);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const READ = `(() => {
  const imgs = [...document.querySelectorAll('img')];
  const bySeed = (seed) => imgs.filter((i) => i.alt === seed).map((i) => {
    const r = i.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  const modules = (window.__noodl_modules || []).map((m) => ({
    name: m && m.name,
    reactNodes: ((m && m.reactNodes) || []).map((n) => n && n.name)
  }));
  return {
    marker: document.body.innerText.includes('gam014 page drew'),
    ada: bySeed('Ada'),
    bea: bySeed('Bea'),
    imgCount: imgs.length,
    modules
  };
})()`;

withDeployedSite({ dir: DIR }, async ({ evaluate, consoleErrors }) => {
  let read = await evaluate(READ);
  for (let i = 0; i < 20 && !(read.marker && read.bea.length > 0); i++) {
    await wait(250);
    read = await evaluate(READ);
  }
  // A late draw would still count: read once more after the known-firing half has landed.
  await wait(500);
  read = await evaluate(READ);
  return {
    dir: DIR,
    read,
    consoleErrors: consoleErrors.slice(),
    clauses: {
      marker: read.marker,
      groupRooted: read.bea.length > 0,
      kitRooted: read.ada.length > 0
    }
  };
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
