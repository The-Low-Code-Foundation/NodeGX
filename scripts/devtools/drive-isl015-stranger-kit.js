#!/usr/bin/env node
/**
 * P109 ISL-015 AC5 — the stranger round's kit, graded on a deployed page.
 *
 * A fresh agent (no memory of the phase; only `docs-site/docs/custom-nodes.md`, the MCP door with
 * `create_node_kit`, and a small library, PixelPad) wrapped the library as a kit node, inked from the
 * project's `--primary` token, and placed it as a component's whole content on the Home page. This drive reads
 * what a person would meet, on the `nodegx deploy` output:
 *
 *  1. **The theme paints the token's colour.** A cell is pressed with a real pointer at its centre (reach
 *     checked by `elementFromPoint`), and the canvas pixel there is read: it must be the token's colour
 *     (read off a probe on the page, not hard-coded), and not PixelPad's fallback ink `#222`.
 *  2. **An edit survives three re-renders.** The kit node's own `noodlNode` (found by walking the React fiber up
 *     from the canvas) is `forceUpdate`d three times, the graph's value unchanged; the pressed cell is read after
 *     each. Known-firing beside it: `Noodl.Variables.<var>` set to a NEW drawing does repaint (a graph value
 *     loads), so the pixel read can see a change.
 *  3. **The kit's CSS reaches nothing outside its root.** The Home page's Go button and title, outside the kit's
 *     root, read the same computed style as on `--baseline <deploy-dir>` (the same project before the kit).
 *
 * The fourth clause (the node is a component's root, no wrapper) is read from the project files, not here.
 *
 * Usage: drive-isl015-stranger-kit.js <deploy-dir> --baseline <deploy-dir> [--var Drawing] [--shot prefix]
 * Exits 0 when every clause reads as expected, 1 when one does not or the drive could not run, 2 on usage.
 */
const { withDeployedSite } = require('./drive-deployed.js');

const args = process.argv.slice(2);
const flagValue = (name) => (args.indexOf(name) === -1 ? null : args[args.indexOf(name) + 1]);
const SRC = args[0];
const BASE = flagValue('--baseline');
const VAR = flagValue('--var') || 'Drawing';
const SHOT = flagValue('--shot');
if (!SRC || SRC.startsWith('--') || !BASE) {
  console.error('usage: drive-isl015-stranger-kit.js <deploy-dir> --baseline <deploy-dir> [--var Drawing] [--shot prefix]');
  process.exit(2);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Computed style of the elements OUTSIDE the kit: the Go button and the page title. */
const OUTSIDE = `(() => {
  const pick = (el) => { if (!el) return null; const s = getComputedStyle(el);
    return { fontFamily: s.fontFamily, fontSize: s.fontSize, borderRadius: s.borderRadius, borderTopWidth: s.borderTopWidth,
      borderTopColor: s.borderTopColor, paddingLeft: s.paddingLeft, backgroundColor: s.backgroundColor, display: s.display, color: s.color }; };
  const buttons = [...document.querySelectorAll('button')].filter((b) => !b.closest('.pixelpad'));
  const go = buttons.find((b) => b.textContent.trim() === 'Go');
  const title = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent.trim() === 'Welcome home');
  const card = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent.trim() === 'I am a card');
  return { go: pick(go), title: pick(title), card: pick(card) };
})()`;

const TOKEN = `(() => { const p = document.createElement('span'); p.style.color = 'var(--primary)'; document.body.appendChild(p);
  const c = getComputedStyle(p).color; p.remove(); return c; })()`;

/** The pad's canvas, a cell's centre in page coordinates, and whether a person can reach it. */
const CELL = (cx, cy) => `(() => {
  const cv = document.querySelector('canvas'); if (!cv) return null;
  const r = cv.getBoundingClientRect();
  const size = 16; const x = r.left + (${cx} + 0.5) * r.width / size, y = r.top + (${cy} + 0.5) * r.height / size;
  const hit = document.elementFromPoint(x, y);
  return { x, y, reachable: hit === cv, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] };
})()`;

const PIXEL = (cx, cy) => `(() => {
  const cv = document.querySelector('canvas'); const px = cv.width / 16;
  const d = cv.getContext('2d').getImageData(Math.floor((${cx} + 0.5) * px), Math.floor((${cy} + 0.5) * px), 1, 1).data;
  return 'rgb(' + d[0] + ', ' + d[1] + ', ' + d[2] + ')';
})()`;

/** The kit node: the first fiber above the canvas whose props carry a noodlNode. */
const RERENDER = `(() => {
  const cv = document.querySelector('canvas');
  let el = cv, fiber = null;
  while (el && !fiber) { const k = Object.keys(el).find((k) => k.startsWith('__reactFiber$')); if (k) fiber = el[k]; el = el.parentElement; }
  while (fiber && !(fiber.memoizedProps && fiber.memoizedProps.noodlNode)) fiber = fiber.return;
  if (!fiber) return { found: false };
  const node = fiber.memoizedProps.noodlNode;
  node.forceUpdate();
  return { found: true, type: node.type && (node.type.name || node.type), name: node.name || null };
})()`;

async function pressCell(client, evaluate, cx, cy) {
  const at = await evaluate(CELL(cx, cy));
  if (!at || !at.reachable) throw new Error('cell ' + cx + ',' + cy + ' is not reachable: ' + JSON.stringify(at));
  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y });
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: at.x, y: at.y, button: 'left', clickCount: 1 });
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: at.x, y: at.y, button: 'left', clickCount: 1 });
  return at;
}

async function outsideOf(dir) {
  return withDeployedSite({ dir }, async ({ evaluate, navigate, setViewport }) => {
    await setViewport({ width: 1024, height: 900 });
    await navigate('/');
    for (let i = 0; i < 20 && !(await evaluate(OUTSIDE)).go; i++) await wait(250);
    await wait(500);
    return evaluate(OUTSIDE);
  });
}

(async () => {
  const baseline = await outsideOf(BASE);
  const run = await withDeployedSite({ dir: SRC }, async ({ client, evaluate, navigate, setViewport, consoleErrors, screenshot }) => {
    await setViewport({ width: 1024, height: 900 });
    await navigate('/');
    for (let i = 0; i < 40 && !(await evaluate(`!!document.querySelector('canvas')`)); i++) await wait(250);
    await wait(800);
    const token = await evaluate(TOKEN);
    const blankBefore = await evaluate(PIXEL(3, 3));
    const at = await pressCell(client, evaluate, 3, 3);
    await wait(400);
    const afterPress = await evaluate(PIXEL(3, 3));
    const variableAfterPress = await evaluate(`(() => { const v = Noodl.Variables[${JSON.stringify(VAR)}]; return typeof v === 'string' ? { length: v.length, ones: (v.match(/1/g) || []).length } : v === undefined ? null : typeof v; })()`);
    const rerenders = [];
    for (let i = 0; i < 3; i++) {
      const r = await evaluate(RERENDER);
      await wait(300);
      rerenders.push({ ...r, pixel: await evaluate(PIXEL(3, 3)) });
    }
    if (SHOT) await screenshot(`${SHOT}-after-rerenders.png`);
    // Known-firing: a NEW graph value loads. Cell (5,5) only.
    const fresh = '0'.repeat(5 * 16 + 5) + '1' + '0'.repeat(256 - (5 * 16 + 5) - 1);
    await evaluate(`Noodl.Variables[${JSON.stringify(VAR)}] = ${JSON.stringify(fresh)}`);
    await wait(600);
    const loaded = { cell55: await evaluate(PIXEL(5, 5)), cell33: await evaluate(PIXEL(3, 3)) };
    const outside = await evaluate(OUTSIDE);
    return { token, blankBefore, at, afterPress, variableAfterPress, rerenders, loaded, outside, consoleErrors: consoleErrors.slice(0, 10) };
  });

  const FALLBACK = 'rgb(34, 34, 34)';
  const checks = {
    'token colour painted (not the fallback)': run.afterPress === run.token && run.afterPress !== FALLBACK && run.blankBefore !== run.token,
    'edit survives 3 re-renders': run.rerenders.length === 3 && run.rerenders.every((r) => r.found && r.pixel === run.token),
    'known-firing: a new graph value loads': run.loaded.cell55 === run.token && run.loaded.cell33 !== run.token,
    'outside the root unchanged (Go button, title, card)': JSON.stringify(run.outside) === JSON.stringify(baseline),
    'no console errors': run.consoleErrors.length === 0
  };
  console.log(JSON.stringify({ baseline, run, checks }, null, 2));
  const ok = Object.values(checks).every(Boolean);
  console.log(ok ? 'DRIVE OK' : 'DRIVE FAILED');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e && e.stack ? e.stack : String(e)); process.exit(1); });
