#!/usr/bin/env node
/**
 * P109 ISL-012 AC1/AC3 — does a kit draw a three.js cube, and does a drag turn it?
 *
 * The site is a `nodegx deploy` of a one-page project whose kit (`cube-kit`, the docs' "A library ships only as modern
 * modules" sample plus a reading on `window.__cube`) lists its three.js in `manifest.dependencies`. Three builds of it
 * were graded in session 17: three.js 0.186's own ES-module files (AC1 red), the vendored 0.158 `three.min.js` (AC1's
 * known-firing control) and the docs recipe's esbuild bundle of 0.186 + OrbitControls (AC3).
 *
 * Readings: console errors and warnings from a reload made AFTER this drive's own listener is on (a deprecation warning
 * fires while the script loads, before any helper listens); `window.__cube` (the library's REVISION, whether
 * OrbitControls exist, frames drawn); the cube's pixels, read off a CDP screenshot of the 320 px host (sharp), before and
 * after a drag across it: how many are not the white clear colour, and how many changed. Chrome runs software WebGL.
 *
 * Usage: drive-isl012-cube.js <deploy-dir> [--json out.json] [--png prefix]
 * Exits 0 after printing; 1 when the drive could not run; 2 on a usage error.
 */
const fs = require('fs');
const sharp = require('sharp');
const { withDeployedSite } = require('./drive-deployed.js');

const DIR = process.argv[2];
const arg = (name) => {
  const at = process.argv.indexOf(name);
  return at === -1 ? null : process.argv[at + 1];
};
const JSON_OUT = arg('--json');
const PNG = arg('--png');
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-isl012-cube.js <deploy-dir> [--json out.json] [--png prefix]');
  process.exit(2);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Software WebGL, as IG-007's 3D mode: the reading is about the page, not this Mac's GPU.
const CHROME = { gpu: true, chromeArgs: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };

withDeployedSite({ dir: DIR, ...CHROME }, async (page) => {
  const { client } = page;
  const messages = [];
  client.on((msg) => {
    if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'warning' || msg.params.type === 'error')) {
      messages.push(`${msg.params.type}: ` + msg.params.args.map((a) => String(a.value !== undefined ? a.value : a.description || '')).join(' ').slice(0, 240));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails || {};
      messages.push('exception: ' + String((d.exception && d.exception.description) || d.text || '').slice(0, 240));
    }
  });
  await page.setViewport({ width: 800, height: 700 });
  await client.send('Page.reload', {});
  await wait(4000);

  const box = await page.evaluate(
    `(() => { const e = document.querySelector('[data-testid="cube"]'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, canvas: !!e.querySelector('canvas') }; })()`
  );
  const cube = await page.evaluate('window.__cube || null');
  const marker = await page.evaluate(`document.body.innerText.includes('isl012 page drew')`);

  const shot = async () => {
    if (!box) return null;
    const { data } = await client.send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 1 }
    });
    const png = Buffer.from(data, 'base64');
    const { data: px, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    return { png, px, channels: info.channels };
  };
  const inked = (s) => {
    let n = 0;
    for (let i = 0; i < s.px.length; i += s.channels) if (s.px[i] < 240 || s.px[i + 1] < 240 || s.px[i + 2] < 240) n++;
    return n;
  };
  const changed = (a, b) => {
    let n = 0;
    for (let i = 0; i < a.px.length; i += a.channels)
      if (Math.abs(a.px[i] - b.px[i]) + Math.abs(a.px[i + 1] - b.px[i + 1]) + Math.abs(a.px[i + 2] - b.px[i + 2]) > 30) n++;
    return n;
  };

  const before = await shot();
  let after = null;
  if (box) {
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const mouse = (type, x, buttons) => client.send('Input.dispatchMouseEvent', { type, x, y: cy, button: 'left', buttons, clickCount: 1 });
    await mouse('mousePressed', cx - 60, 1);
    for (let i = 1; i <= 12; i++) {
      await mouse('mouseMoved', cx - 60 + i * 10, 1);
      await wait(16);
    }
    await mouse('mouseReleased', cx + 60, 0);
    await wait(600);
    after = await shot();
  }
  if (PNG && before) fs.writeFileSync(`${PNG}-before.png`, before.png);
  if (PNG && after) fs.writeFileSync(`${PNG}-after.png`, after.png);

  const report = {
    marker,
    box,
    cube,
    inkedBefore: before ? inked(before) : null,
    pixelsTotal: before ? before.px.length / before.channels : null,
    changedByDrag: before && after ? changed(before, after) : null,
    messages: messages.slice(0, 12),
    consoleErrors: page.consoleErrors.slice(0, 6)
  };
  console.log(JSON.stringify(report, null, 1));
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 1));
}).catch((e) => {
  console.error(e && e.stack ? e.stack : String(e));
  process.exit(1);
});
