#!/usr/bin/env node
/**
 * P109 ISL-008 AC4 — "nothing else moves": photograph every routed page of every shipped template, so a runtime
 * change can be pixel-diffed against the runtime before it.
 *
 *   isl008-template-shots.js shoot <out-dir> [template…]   every page of each template (default: all of templates/)
 *   isl008-template-shots.js diff <before-dir> <after-dir>  per image: how many pixels differ, and where
 *
 * It renders with THIS checkout's viewer bundle (`render-report.js` resolves `packages/noodl-editor/src/external/
 * viewer` from the checkout the script lives in). So a before/after pair is two runs from a worktree, with the viewer
 * rebuilt between them, never one run against the shared bundle peers drive with.
 *
 * Each template is copied to a temporary folder first: rendering reads a project, but the rule here is never to hand
 * a shipped template to anything that might write into it.
 *
 * 🔴 A page whose picture differs between two BEFORE runs is noisy (a clock, an animation, a random value), and a
 * difference on it after the change grades nothing. Shoot `before` twice and diff those first.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const [, , mode, ...rest] = process.argv;

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800, mobile: false },
  { name: 'phone', width: 390, height: 844, mobile: true }
];

async function shoot(outDir, names) {
  const { renderReport } = require('./render-report.js');
  const templates = names.length
    ? names
    : fs.readdirSync(path.join(ROOT, 'templates')).filter((n) => fs.existsSync(path.join(ROOT, 'templates', n, 'nodegx.project.json')));
  fs.mkdirSync(outDir, { recursive: true });
  const summary = {};
  for (const name of templates) {
    const copy = fs.mkdtempSync(path.join(os.tmpdir(), `isl008-${name}-`));
    fs.cpSync(path.join(ROOT, 'templates', name), copy, { recursive: true });
    try {
      const { screenshots } = await renderReport({
        projectDir: copy,
        viewports: VIEWPORTS,
        screenshot: 'viewport',
        screenshotPages: 'all',
        deviceScaleFactor: 1
      });
      for (const shot of screenshots) {
        const file = `${name}__${String(shot.page).replace(/[^A-Za-z0-9]+/g, '_')}__${shot.name}.png`;
        fs.writeFileSync(path.join(outDir, file), Buffer.from(shot.base64, 'base64'));
      }
      summary[name] = screenshots.length;
      console.log(`${name}: ${screenshots.length} pictures`);
    } catch (e) {
      summary[name] = `failed: ${e && e.message ? e.message.split('\n')[0] : e}`;
      console.log(`${name}: ${summary[name]}`);
    } finally {
      fs.rmSync(copy, { recursive: true, force: true });
    }
  }
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
}

async function diff(beforeDir, afterDir) {
  const sharp = require('sharp');
  const files = fs.readdirSync(beforeDir).filter((f) => f.endsWith('.png')).sort();
  const rows = [];
  for (const file of files) {
    const after = path.join(afterDir, file);
    if (!fs.existsSync(after)) {
      rows.push({ file, differs: 'missing after' });
      continue;
    }
    const a = await sharp(path.join(beforeDir, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const b = await sharp(after).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
      rows.push({ file, differs: `size ${a.info.width}x${a.info.height} → ${b.info.width}x${b.info.height}` });
      continue;
    }
    let count = 0;
    let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
    const w = a.info.width;
    for (let i = 0; i < a.data.length; i += 4) {
      if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2] || a.data[i + 3] !== b.data[i + 3]) {
        count++;
        const p = i / 4;
        const x = p % w, y = Math.floor(p / w);
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    rows.push({ file, differs: count, box: count ? [minX, minY, maxX, maxY] : undefined });
  }
  const changed = rows.filter((r) => r.differs !== 0);
  console.log(JSON.stringify({ images: rows.length, changed: changed.length, rows: changed }, null, 2));
}

(async () => {
  if (mode === 'shoot' && rest[0]) return shoot(path.resolve(rest[0]), rest.slice(1));
  if (mode === 'diff' && rest[0] && rest[1]) return diff(path.resolve(rest[0]), path.resolve(rest[1]));
  console.error('usage: isl008-template-shots.js shoot <out-dir> [template…] | diff <before-dir> <after-dir>');
  process.exit(2);
})().catch((e) => {
  console.error(e && e.stack ? e.stack : String(e));
  process.exit(1);
});
