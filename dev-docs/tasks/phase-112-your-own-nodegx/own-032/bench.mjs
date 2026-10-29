// OWN-032 — the bench: one section rendered on its own, fast enough to look after every turn.
//
// A bench project is a copy of an OWN-029 round's project (its theme, tokens and imagery) whose Home page holds ONE
// section instance, `/Sections/S1Hero`. A turn rewrites that component's nodes.json from a node list (the tree.json
// shape: type, role, parent index, params) and reloads the page in a Chrome that stays open, so a turn costs a reload
// and two shots, not a server and a browser.
//
//   node bench.mjs make <source project> <bench project>     copy, and strip Home down to the hero
//   node bench.mjs time <bench project> <tree.json> [n]      render the tree's first section n times, report ms
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { kidsOf } from './outline.mjs';
const require = createRequire(import.meta.url);
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const { withRenderedPage } = require(path.join(REPO, 'scripts/devtools/render-report.js'));

const HERO = 'components/Sections/S1Hero';

export function makeBench(src, dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.cpSync(src, dir, { recursive: true, filter: (p) => !p.includes(`${path.sep}.previews`) });
  const homeFile = path.join(dir, 'components/Pages/Home/nodes.json');
  const home = JSON.parse(fs.readFileSync(homeFile, 'utf8'));
  const page = home.nodes.find((n) => n.type === 'Page');
  home.nodes = [{ ...page, children: ['home-s1'] }, home.nodes.find((n) => n.id === 'home-s1')];
  fs.writeFileSync(homeFile, JSON.stringify(home, null, 2));
}

// tree.json nodes → nodes-v2. Ids are positional (`b<i>`), labels are the roles.
export function writeHero(dir, nodes) {
  const file = path.join(dir, HERO, 'nodes.json');
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  doc.nodes = nodes.map((n, i) => ({
    id: `b${i}`, type: n.type, label: (n.role || n.type).slice(0, 60), ...(n.parent >= 0 ? { parent: `b${n.parent}` } : {}),
    parameters: n.params || {}, children: kidsOf(nodes, i).map((j) => `b${j}`), x: 40 + 60 * depth(nodes, i), y: 40 + 120 * i
  }));
  doc.visualRoots = nodes.length ? ['b0'] : [];
  fs.writeFileSync(file, JSON.stringify(doc, null, 2));
}
const depth = (nodes, i) => { let d = 0; for (let p = nodes[i].parent; p >= 0; p = nodes[p].parent) d++; return d; };

// The facts a person sees in a hero, measured from the DOM. Each is a yes/no with the evidence that decided it; these
// are the ground truth the reviewer's picture answers are graded against (§4 s0).
//   touching   two blocks of words (or words and a button) stacked with under 4 px between them
//   atEdge     words within 8 px of the left or right edge of the screen
//   photoCut   a photo drawn partly past the screen's edge
//   buttonWide a button more than 2.5 × as wide as its words
//   unaligned  the stacked words and the button share neither a left edge (4 px) nor a centre (12 px: the box of a
//              centred three-line headline sits up to 8 px off its button's centre, and nobody sees that)
//   lowContrast words hard to read on what is behind them (over a gradient: its worst colour stop)
//   overflowX  the page scrolls sideways
export const FACTS = `(() => {
  const shown = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
  const W = document.documentElement.clientWidth;
  const say = (e) => e.textContent.trim().replace(/\\s+/g, ' ').slice(0, 40);
  const textLeaves = [...document.body.querySelectorAll('*')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && shown(e));
  // a text leaf's own box can be wider than its words: measure the words with a range
  // how many lines a block of words wraps to: the distinct tops of its line boxes (w5-t16a: a display-lg headline in
  // half a desktop broke one word to a line, and nothing measured it)
  const linesOf = (e) => { const r = document.createRange(); r.selectNodeContents(e); return new Set([...r.getClientRects()].filter((x) => x.width > 1).map((x) => Math.round(x.top))).size || 1; };
  const inkOf = (e) => { const r = document.createRange(); r.selectNodeContents(e); const b = r.getBoundingClientRect(); return b.width ? b : e.getBoundingClientRect(); };
  const buttons = [...document.querySelectorAll('button')].filter(shown);
  const blocks = [...textLeaves.filter((e) => !e.closest('button')).map((e) => ({ kind: 'words', el: e, r: e.getBoundingClientRect(), ink: inkOf(e), text: say(e) })),
    ...buttons.map((e) => ({ kind: 'button', el: e, r: e.getBoundingClientRect(), ink: e.getBoundingClientRect(), text: say(e) }))].sort((a, b) => a.r.top - b.r.top);
  const touching = [];
  for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
    const a = blocks[i].ink, b = blocks[j].ink;
    const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    if (overlapX <= 0) continue;
    const gap = b.top - a.bottom;
    if (gap < 4 && gap > -a.height / 2) touching.push({ a: blocks[i].text, b: blocks[j].text, gap: Math.round(gap) });
  }
  const atEdge = blocks.filter((b) => b.ink.left < 8 || b.ink.right > W - 8).map((b) => ({ text: b.text, left: Math.round(b.ink.left), right: Math.round(W - b.ink.right) }));
  const photoCut = [...document.querySelectorAll('img')].filter(shown).map((e) => e.getBoundingClientRect()).filter((r) => r.left < -1 || r.right > W + 1).map((r) => ({ left: Math.round(r.left), right: Math.round(W - r.right) }));
  const buttonWide = buttons.map((e) => { const r = document.createRange(); r.selectNodeContents(e); return { text: say(e), w: Math.round(e.getBoundingClientRect().width), words: Math.round(r.getBoundingClientRect().width) }; }).filter((b) => b.words && b.w > 2.5 * b.words);
  // alignment: the words and buttons in the same column (their boxes overlap horizontally with the first one)
  const col = blocks.filter((b) => b.ink.left < blocks[0]?.ink.right && b.ink.right > blocks[0]?.ink.left);
  const lefts = col.map((b) => b.ink.left), mids = col.map((b) => (b.ink.left + b.ink.right) / 2);
  const spread = (xs) => (xs.length ? Math.max(...xs) - Math.min(...xs) : 0);
  const unaligned = col.length >= 2 && spread(lefts) > 4 && spread(mids) > 12 ? [{ lefts: lefts.map(Math.round), mids: mids.map(Math.round) }] : [];
  // contrast, including over a gradient: the WORST of the gradient's colour stops (look.mjs skips any gradient, so a
  // dark line on the dark hero ground was never reported). A photo ground is still skipped: no script reads it honestly.
  const rgb = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const v = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const grounds = (e) => { for (let x = e; x; x = x.parentElement) { const s = getComputedStyle(x);
    if (/url\\(/.test(s.backgroundImage)) return null;
    if (/gradient/.test(s.backgroundImage)) return (s.backgroundImage.match(/rgba?\\([^)]+\\)/g) || []).map(rgb);
    const c = rgb(s.backgroundColor); if (c && c.a > 0.9) return [c]; } return [{ r: 255, g: 255, b: 255, a: 1 }]; };
  const lowContrast = [];
  for (const b of blocks) { const s = getComputedStyle(b.el), fg = rgb(s.color), gs = grounds(b.el); if (!fg || !gs || !gs.length) continue;
    const px = parseFloat(s.fontSize), large = px >= 24 || (px >= 18.66 && +s.fontWeight >= 700), worst = Math.min(...gs.map((g) => ratio(fg, g)));
    if (worst < (large ? 3 : 4.5)) lowContrast.push({ text: b.text, ratio: +worst.toFixed(2) }); }
  const overflowX = Math.max(0, document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth, ...[...document.body.querySelectorAll('*')].filter((e) => /auto|scroll/.test(getComputedStyle(e).overflowX)).map((e) => e.scrollWidth - e.clientWidth));
  return { width: W, touching, atEdge, photoCut, buttonWide, unaligned, lowContrast, overflowX, blocks: blocks.map((b) => ({ kind: b.kind, text: b.text, x: Math.round(b.ink.left), y: Math.round(b.ink.top), w: Math.round(b.ink.width), h: Math.round(b.ink.height), lines: b.kind === 'words' ? linesOf(b.el) : 1 })) };
})()`;

// the bottom of what is drawn: the lowest element with a background, a picture, words or a control. The window is
// 900 px tall, and a short hero would otherwise come with a band of empty white below it in every shot.
const HEIGHT = `(() => { let h = 0; for (const e of document.body.querySelectorAll('*')) { const s = getComputedStyle(e), r = e.getBoundingClientRect();
  if (!r.height || s.display === 'none' || s.visibility === 'hidden') continue;
  const painted = (s.backgroundColor && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(s.backgroundColor)) || s.backgroundImage !== 'none' || /^(IMG|BUTTON|INPUT|TEXTAREA|SELECT)$/.test(e.tagName) || [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    // a section with no ground still owns its bottom padding: cropping at the last painted part cut it off (w6: Richard saw
    // "Adopt Now" on the bottom edge, as if the hero had no padding, though it had space-24)
    || parseFloat(s.paddingBottom) > 0;
  if (painted) h = Math.max(h, r.bottom + scrollY); }
  return Math.min(Math.max(Math.ceil(h), 120), 6000); })()`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// A bench that stays open. `shoot(outDir)` reloads the page and writes desktop.png / phone.png, returning the facts
// and the CHECKS of look.mjs at each width. `close()` ends the Chrome and the server.
// retryBlank (s4): a page with no words on it (look.mjs `words` 0; its `blank` means fewer than 5) is measured again, up to 3 times, settleMs apart. 11 of 1003 arm
// shots had one width blank while the other had words; w11m-jazz's LAST shot was one, so endGate ended the run on a
// picture with nothing in it to find fault with (P112-OWN032-BLANKSHOT). Off by default so old runs replay unchanged.
export async function openBench(dir, { settleMs = 700, retryBlank = false } = {}) {
  const { CHECKS } = await import('../own-030/look.mjs');
  let release, ready;
  const opened = new Promise((r) => (ready = r));
  const done = withRenderedPage({ projectDir: dir }, async (page) => { ready(page); await new Promise((r) => (release = r)); });
  const page = await Promise.race([opened, done.then(() => { throw new Error('bench closed before it opened'); })]);
  // render-from-disk.js builds its page ONCE, when it starts, so a reload serves the first project it read. The bench
  // answers the page request itself, with the HTML that script prints for the project as it is on disk now.
  const origin = await page.evaluate('location.origin');
  let html = null;
  page.onEvent((msg) => {
    if (msg.method !== 'Fetch.requestPaused') return;
    const requestId = msg.params.requestId;
    if (html) page.client.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/html' }], body: Buffer.from(html).toString('base64') });
    else page.client.send('Fetch.continueRequest', { requestId });
  });
  await page.client.send('Fetch.enable', { patterns: [{ urlPattern: `${origin}/`, requestStage: 'Request' }] });
  async function shoot(outDir) {
    fs.mkdirSync(outDir, { recursive: true });
    const out = {}, t0 = Date.now();
    html = execFileSync(process.execPath, [path.join(REPO, 'scripts/devtools/render-from-disk.js'), dir, '--print-html'], { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 }).toString();
    out.htmlMs = Date.now() - t0;
    for (const [name, width] of [['desktop', 1280], ['phone', 390]]) {
      await page.setViewport({ name, width, height: 900, mobile: name === 'phone' });
      await page.client.send('Page.reload', { ignoreCache: true });
      await wait(settleMs);
      let facts = await page.evaluate(FACTS), checks = await page.evaluate(CHECKS), retries = 0;
      while (retryBlank && checks.words === 0 && retries < 3) { retries++; await wait(settleMs); facts = await page.evaluate(FACTS); checks = await page.evaluate(CHECKS); }
      const h = await page.evaluate(HEIGHT);
      await page.client.send('Emulation.setDeviceMetricsOverride', { width, height: h, deviceScaleFactor: 1, mobile: name === 'phone' });
      await wait(150);
      const shot = await page.client.send('Page.captureScreenshot', { format: 'png' });
      await page.client.send('Emulation.clearDeviceMetricsOverride', {});
      fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(shot.data, 'base64'));
      out[name] = { facts, checks, height: h, retries: retries || undefined };
    }
    out.ms = Date.now() - t0;
    fs.writeFileSync(path.join(outDir, 'facts.json'), JSON.stringify(out, null, 1));
    return out;
  }
  return { shoot, page, close: async () => { release(); await done; } };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, a, b, n] = process.argv.slice(2);
  if (cmd === 'make') { makeBench(a, b); console.log(`bench at ${b}`); }
  if (cmd === 'time') {
    const tree = JSON.parse(fs.readFileSync(b, 'utf8'));
    writeHero(a, tree.sections[0].nodes);
    const t0 = Date.now(); const bench = await openBench(a); console.log(`open ${Date.now() - t0} ms`);
    for (let i = 0; i < Number(n || 3); i++) {
      const r = await bench.shoot(path.join(path.dirname(fileURLToPath(import.meta.url)), 'runs/s0-time', `t${i}`));
      console.log(`shot ${i}: ${r.ms} ms; desktop h ${r.desktop.height}, phone h ${r.phone.height}; facts`, JSON.stringify({ d: { ...r.desktop.facts, blocks: r.desktop.facts.blocks.length }, p: { ...r.phone.facts, blocks: r.phone.facts.blocks.length } }));
    }
    await bench.close();
  }
}
