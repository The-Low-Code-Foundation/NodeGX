#!/usr/bin/env node
/**
 * P88 GAM-013 AC2 — the browser half: a Repeat ticks a Counter once a second, and leaving its page stops it.
 *
 * The page (built through the MCP door): Home holds a Repeat (Interval 1000) started by its layout's Did Mount, its
 * Tick → Counter Increase, the count into a Text reading `gam013-count:<n>`, and a button `gam013-away` to a second
 * page, Away, whose button `gam013-back` returns. Navigation is the app's own router (a click), not a page reload.
 *
 * Readings, each with the page clock (`performance.now()`):
 *   first   — the count 5.0 s after the count first shows (AC2: 5 ± 1)
 *   trips   — three Away/Back round trips, each confirmed by the Away marker being on screen
 *   after   — the count read at t0 and t0 + 3.0 s after the last return: +3 is one beat; a stacked interval reads +6 or more
 *   hidden  — `document.visibilityState` at every read (headless Chrome, not an occluded window: §7)
 *
 * Usage: drive-gam013-repeat.js <deploy-dir> [--json out.json]
 * Exits 0 after printing its readings; 1 when the drive could not run; 2 on a usage error.
 */
const fs = require('fs');
const { withDeployedSite } = require('./drive-deployed.js');

const DIR = process.argv[2];
const jsonFlag = process.argv.indexOf('--json');
const JSON_OUT = jsonFlag === -1 ? null : process.argv[jsonFlag + 1];
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-gam013-repeat.js <deploy-dir> [--json out.json]');
  process.exit(2);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const READ = `(() => {
  const text = document.body.innerText;
  const m = text.match(/gam013-count:(-?\\d+)/);
  return {
    at: Math.round(performance.now()),
    count: m ? Number(m[1]) : null,
    away: text.includes('gam013-away-page'),
    visibility: document.visibilityState
  };
})()`;

const click = (label) => `(() => {
  const el = [...document.querySelectorAll('button, [role=button]')].find((b) => b.innerText.trim() === ${JSON.stringify(label)});
  if (!el) return false;
  el.click();
  return true;
})()`;

withDeployedSite({ dir: DIR }, async ({ evaluate, consoleErrors }) => {
  const until = async (predicate, tries = 40) => {
    let read = await evaluate(READ);
    for (let i = 0; i < tries && !predicate(read); i++) {
      await wait(100);
      read = await evaluate(READ);
    }
    return read;
  };

  // The router's start page is whichever page the door registered first; begin on Home either way.
  const opened = await until((r) => r.away || r.count !== null);
  if (opened.away) await evaluate(click('gam013-back'));
  const shown = await until((r) => r.count !== null && r.count >= 0);
  await wait(5000);
  const first = await evaluate(READ);

  const trips = [];
  for (let i = 0; i < 3; i++) {
    const clickedAway = await evaluate(click('gam013-away'));
    const away = await until((r) => r.away);
    const clickedBack = await evaluate(click('gam013-back'));
    const home = await until((r) => !r.away && r.count !== null);
    trips.push({ clickedAway, awayShown: away.away, clickedBack, homeShown: !home.away, countOnReturn: home.count, at: home.at });
  }

  await wait(1000);
  const t0 = await evaluate(READ);
  await wait(3000);
  const t1 = await evaluate(READ);

  return {
    dir: DIR,
    openedOn: opened.away ? 'Away' : 'Home',
    shown,
    first,
    trips,
    after: { t0, t1, advanced: t0.count !== null && t1.count !== null ? t1.count - t0.count : null, ms: t1.at - t0.at },
    consoleErrors: consoleErrors.slice()
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
