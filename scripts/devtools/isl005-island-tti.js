#!/usr/bin/env node
/**
 * P109 ISL-005 AC6 — how long Olive's Island's island page takes to be ready, on a DEPLOYED garden.
 *
 *     node scripts/devtools/drive-cg003-pages.js assemble <project-dir>
 *     node node_modules/.bin/nodegx deploy <project-dir> <deploy-dir> --allow-development-engine
 *     node scripts/devtools/isl005-island-tti.js <deploy-dir> --project <project-dir> [--runs 7] [--json <file>]
 *
 * One new player is made through the Profiles screen (as `drive-ig004-island.js` does), which lands on `/island`. Then
 * `/island` is loaded cold (cache off) `--runs` times at each CPU rate (1× and 4×, `Emulation.setCPUThrottlingRate`).
 * "Ready" is the island's grid drawn AND her robot on it: the robot's tile comes out of `Logic/Island world`, the
 * biggest engine user, so the engine's load is inside the number. The time is the page's own `performance.now()` at
 * the first poll that sees both (polled every 20 ms), so it counts from the navigation's start.
 *
 * Exits 0 when every run reached ready, 1 when any did not, 2 on a usage error.
 */
const fs = require('fs');

const { withDeployedSite } = require('./drive-deployed.js');

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
};
const DIR = process.argv[2];
const PROJECT = arg('--project');
const RUNS = Number(arg('--runs') || 7);
const JSON_OUT = arg('--json');
if (!DIR || DIR.startsWith('--') || !PROJECT) {
  console.error('usage: isl005-island-tti.js <deploy-dir> --project <project-dir> [--runs 7] [--json <file>]');
  process.exit(2);
}

/** The Profiles screen's "create" button carries the project's own word for it (Data/Words). */
const CREATE = (() => {
  const raw = JSON.parse(fs.readFileSync(require('path').join(PROJECT, 'components', 'Data', 'Words', 'nodes.json'), 'utf8'));
  const nodes = Array.isArray(raw) ? raw : raw.nodes || Object.values(raw);
  return JSON.parse(nodes.find((n) => n.type === 'Static Data').parameters.json).find((r) => r.key === 'create').en;
})();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const STUB = {
  status: { model: 'ready', reason: '', gpu: false, loadMs: 1, lastMs: 1, asked: 0, fallbacks: 0, busy: false, queued: 0, exam: { at: '2026-09-28T00:00:00.000Z', ms: 1, passed: 20, failed: 0, rungs: {} } },
  olive: () => ({ ok: true, text: 'Thank you, Mamie Rose! (stub)', ms: 5 })
};
const READY = `(() => document.querySelectorAll('.bg-isle .gd-cell').length > 0 && !!document.querySelector('.bg-isle .gd-bot') ? performance.now() : 0)()`;
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

withDeployedSite({ dir: DIR }, async (page) => {
  const { client, evaluate } = page;
  client.on((msg) => {
    if (msg.method === 'Fetch.requestPaused') {
      const { requestId, request } = msg.params;
      const answer = /\/__garden\/olive\/status/.test(request.url) ? STUB.status : STUB.olive();
      client.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: 'application/json' }], body: Buffer.from(JSON.stringify(answer)).toString('base64') });
    }
  });
  await client.send('Fetch.enable', { patterns: [{ urlPattern: '*/__garden/*', requestStage: 'Request' }] });
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1368, height: 912, deviceScaleFactor: 1, mobile: false });

  const until = async (expr, ok, ms = 15000) => {
    const end = Date.now() + ms;
    let last = await evaluate(expr);
    while (!ok(last) && Date.now() < end) {
      await wait(20);
      last = await evaluate(expr);
    }
    return last;
  };
  const tap = async (finder) => {
    const p = await until(
      `(() => { const el = (${finder}); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const at = document.elementFromPoint(x, y); return at && (el === at || el.contains(at)) ? { x, y } : null; })()`,
      Boolean,
      5000
    );
    if (!p) throw new Error(`cannot press ${finder}`);
    for (const type of ['mousePressed', 'mouseReleased']) await client.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
    await wait(250);
  };
  const first = (selector) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null)`;
  const byText = (selector, needle) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null && e.innerText.trim().includes(${JSON.stringify(needle)}))`;

  // A new player, through the Profiles screen.
  await page.navigate('/');
  await tap(first('button.bg-profile-new'));
  await evaluate(`(() => { const el = document.querySelector('input'); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, 'Ada'); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); })()`);
  await wait(250);
  await tap(byText('.bg-seg-btn', '10–12'));
  await tap(byText('button.bg-btn', CREATE));
  const landed = await until('location.pathname', (p) => p === '/island');
  if (landed !== '/island') throw new Error(`a new player did not land on /island (at ${landed})`);
  if (!(await until(READY, Boolean))) throw new Error('the island never drew her robot after making a player');

  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  const out = { dir: DIR, runs: RUNS, rates: {} };
  let failed = 0;
  for (const rate of [1, 4]) {
    await client.send('Emulation.setCPUThrottlingRate', { rate });
    const ms = [];
    for (let i = 0; i < RUNS; i++) {
      await client.send('Page.navigate', { url: 'about:blank' });
      await wait(200);
      const origin = page.servePort ? `http://127.0.0.1:${page.servePort}` : null;
      await client.send('Page.navigate', { url: `${origin}/island` });
      const at = await until(READY, Boolean, 60000);
      if (!at) failed++;
      ms.push(at ? Math.round(at) : null);
      await wait(300);
    }
    const got = ms.filter((x) => x !== null);
    out.rates[`${rate}x`] = { ms, median: got.length ? Math.round(median(got)) : null, min: Math.min(...got), max: Math.max(...got) };
    console.log(`CPU ${rate}×: ready at ${ms.join(', ')} ms — median ${out.rates[`${rate}x`].median}`);
  }
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  out.consoleErrors = page.consoleErrors.slice(0, 20);
  if (out.consoleErrors.length) console.log(`console errors (${page.consoleErrors.length}):\n  ${out.consoleErrors.join('\n  ')}`);
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 1));
  return failed;
})
  .then((failed) => process.exit(failed ? 1 : 0))
  .catch((e) => {
    console.error(e && e.stack ? e.stack : e);
    process.exit(1);
  });
