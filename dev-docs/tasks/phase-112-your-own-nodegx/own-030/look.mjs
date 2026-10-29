// OWN-030 — the same Chrome look at every lane (§4): full-page shots at 1280 and 390, and the objective checks.
// The graph lane is the real NodeGX render (render-report.js's withRenderedPage serves the project); an HTML lane is
// opened in that same Chrome by file URL, so every lane meets one browser and one script.
//
//   node look.mjs <graph project dir> <out dir> [--html <file>]
// Writes <out>/desktop.png, <out>/phone.png and <out>/checks.json:
//   { desktop: CHECKS, phone: CHECKS }, CHECKS = { blank, words, overflowX, smallText[], lowContrast[], clipped[],
//     brokenImages[], sections }
// The thresholds: text under 12 px; contrast under 4.5 (3 for text ≥ 24 px, or ≥ 18.66 px bold), read against the
// first opaque background up the tree, and skipped (counted as `unknownGround`) over a picture or a gradient, which no
// script can read honestly.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const { withRenderedPage } = require(path.join(REPO, 'scripts/devtools/render-report.js'));

export const CHECKS = `(() => {
  const shown = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
  const rgb = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const v = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ground = (e) => { for (let x = e; x; x = x.parentElement) { const s = getComputedStyle(x); if (s.backgroundImage && s.backgroundImage !== 'none') return 'picture'; const c = rgb(s.backgroundColor); if (c && c.a > 0.9) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
  // text leaves: elements with their own text
  const leaves = [...document.body.querySelectorAll('*')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && shown(e));
  const say = (e) => e.textContent.trim().replace(/\\s+/g, ' ').slice(0, 50);
  const smallText = [], lowContrast = [], clipped = []; let unknownGround = 0;
  for (const e of leaves) {
    const s = getComputedStyle(e), px = parseFloat(s.fontSize);
    if (px < 12) smallText.push({ text: say(e), px });
    const g = ground(e), fg = rgb(s.color);
    if (g === 'picture') unknownGround++;
    else if (fg) { const a = lum(fg), b = lum(g), ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); const large = px >= 24 || (px >= 18.66 && +s.fontWeight >= 700); if (ratio < (large ? 3 : 4.5)) lowContrast.push({ text: say(e), ratio: +ratio.toFixed(2) }); }
    if (e.scrollWidth > e.clientWidth + 1 && /hidden|clip/.test(s.overflowX + s.overflow)) clipped.push({ text: say(e) });
  }
  // horizontal overflow: the widest scroller, or anything drawn past the window's right edge
  let overflowX = 0;
  for (const e of [document.scrollingElement, ...document.body.querySelectorAll('*')]) { if (!e) continue; const s = e === document.scrollingElement ? null : getComputedStyle(e);
    if (e === document.scrollingElement || /auto|scroll/.test(s.overflowX)) overflowX = Math.max(overflowX, e.scrollWidth - e.clientWidth); }
  const brokenImages = [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src'));
  const words = leaves.map((e) => e.textContent.trim()).join(' ').split(/\\s+/).filter(Boolean).length;
  // the address proves which page was read: a file lane that silently stayed on the project's server reads as graph
  return { url: location.href, blank: words < 5, words, overflowX, smallText, lowContrast, unknownGround, clipped, brokenImages, sections: document.querySelectorAll('section, header, footer').length };
})()`;

// the tallest scrollHeight in the tree: a viewer page's body has no height (its root is fixed), drive-page.js §shot
const HEIGHT = `(() => { let h = innerHeight; for (const e of [document.body, ...document.body.querySelectorAll('*')]) if (e.scrollHeight > h) h = e.scrollHeight; return Math.min(h, 16000); })()`;

export async function look(projectDir, outDir, { html } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const result = {};
  await withRenderedPage({ projectDir }, async (page) => {
    for (const [name, width] of [['desktop', 1280], ['phone', 390]]) {
      await page.setViewport({ name, width, height: 900, mobile: name === 'phone' });
      // page.navigate prefixes the project server's address; a file goes to CDP as it is
      if (html) await page.client.send('Page.navigate', { url: pathToFileURL(html).href });
      await new Promise((r) => setTimeout(r, 1200));
      result[name] = await page.evaluate(CHECKS);
      const h = await page.evaluate(HEIGHT);
      let shot;
      if (html) {
        // a plain document scrolls itself: capture past the 900 px window. Growing the window to the page's height
        // instead (below) makes every 100vh section as tall as the page, and the shot shows that, not the page.
        shot = await page.client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: h, scale: 1 } });
      } else {
        // the NodeGX viewer's root is fixed and scrolls inside: only a window as tall as the content shows all of it
        await page.client.send('Emulation.setDeviceMetricsOverride', { width, height: h, deviceScaleFactor: 1, mobile: name === 'phone' });
        await new Promise((r) => setTimeout(r, 600));
        shot = await page.client.send('Page.captureScreenshot', { format: 'png' });
        await page.client.send('Emulation.clearDeviceMetricsOverride', {});
      }
      fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(shot.data, 'base64'));
    }
  });
  fs.writeFileSync(path.join(outDir, 'checks.json'), JSON.stringify(result, null, 1));
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2), i = argv.indexOf('--html');
  const r = await look(argv[0], argv[1], { html: i >= 0 ? argv[i + 1] : undefined });
  console.log(JSON.stringify({ desktop: { ...r.desktop, smallText: r.desktop.smallText.length, lowContrast: r.desktop.lowContrast.length }, phone: { ...r.phone, smallText: r.phone.smallText.length, lowContrast: r.phone.lowContrast.length } }));
}
