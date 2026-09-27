#!/usr/bin/env node
/**
 * P88 GAM-015 AC3 — the browser half: does a kit node draw the size it was sent, on a deployed page?
 *
 * The page holds a marker Text and six faces from a one-file kit: `gam015.NumberFace` reads its Size with `Number()`
 * (D65's read), `gam015.DocFace` reads it with the `readPx` the kit scaffold emits (the read the docs now show). Each is
 * placed three times: Size wired from an Expression `40`, Size typed as 40, and Size unset (default 64).
 * Every face stamps `data-face`, `data-size` (the prop it was handed) and `data-size-type`.
 *
 * Readings, each beside its known-firing half:
 *   marker        — the page drew
 *   <kind>-unset  — draws 64: the face rendered, and its fallback is visible
 *   <kind>-wired / <kind>-typed — the width drawn, and the prop the component received
 *
 * Usage: drive-gam015-kit-size.js <deploy-dir> [--json out.json]
 * Exits 0 after printing its readings; 1 when the drive could not run; 2 on a usage error.
 */
const fs = require('fs');
const { withDeployedSite } = require('./drive-deployed.js');

const DIR = process.argv[2];
const jsonFlag = process.argv.indexOf('--json');
const JSON_OUT = jsonFlag === -1 ? null : process.argv[jsonFlag + 1];
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-gam015-kit-size.js <deploy-dir> [--json out.json]');
  process.exit(2);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const READ = `(() => {
  const faces = {};
  for (const el of document.querySelectorAll('[data-face]')) {
    const r = el.getBoundingClientRect();
    faces[el.getAttribute('data-face')] = {
      width: Math.round(r.width),
      prop: el.getAttribute('data-size'),
      propType: el.getAttribute('data-size-type')
    };
  }
  return { marker: document.body.innerText.includes('gam015 page drew'), faces };
})()`;

withDeployedSite({ dir: DIR }, async ({ evaluate, consoleErrors }) => {
  let read = await evaluate(READ);
  for (let i = 0; i < 20 && !(read.marker && Object.keys(read.faces).length >= 6); i++) {
    await wait(250);
    read = await evaluate(READ);
  }
  // A wire lands a frame after mount: read again once the known-firing half is on screen.
  await wait(500);
  read = await evaluate(READ);
  return { dir: DIR, read, consoleErrors: consoleErrors.slice() };
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
