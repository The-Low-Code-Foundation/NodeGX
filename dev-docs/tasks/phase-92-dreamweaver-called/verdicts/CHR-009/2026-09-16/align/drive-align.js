// CHR-009 slice 5 — the alignment ports as rows of the label column.
//
// Same rig, node (`app_root`) and crops as slice 4's `box/props-group-{top,lower}-*.png` (scrollTop 0 and
// 560), so each pair is a same-crop before/after. Then a crop with the alignment rows in view.
//
// Reads (both themes): each align row's label, label x, height; the segment's height and width; each
// segment's width, pressed state and whether its glyph draws at a visible size; labels cut by the column.
// Then (dark), real input only — CDP mouse at an `elementFromPoint`-verified point — and the MODEL after each act:
//   1. `Align Items` → Stretch (the value the strip never offered); one undo → back.
//   2. press the segment already in effect → the model is unchanged.
//   3. `Justify Content` → Space Between; the row's reset dot → unset; undo → Space Between; undo → unset.
//
// 🔴 Refuses to run against anything but the scratch copy.
//
//   NOODL_REMOTE_DEBUG_PORT=9333 node drive-align.js --expect=<scratch copy dir>
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const outDir = opt('out', __dirname);
const EXPECT = opt('expect', '');
const NODE = 'app_root';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ROW = (comp) => `document.querySelector('.sidebar-property-editor [data-test="align-row-${comp}"]')`;
const SEG = (comp, value) => `document.querySelector('.sidebar-property-editor [data-align-comp="${comp}"][data-align-value="${value}"]')`;

const MEASURE = `(() => {
  const panel = document.querySelector('.sidebar-property-editor');
  if (!panel) return JSON.stringify({ error: 'no panel' });
  const base = [...document.querySelectorAll('[class*="BasePanel-module__Root"]')].find((x) => x.offsetParent !== null && x.querySelector('.sidebar-property-editor'));
  const top0 = base.getBoundingClientRect().top, left0 = base.getBoundingClientRect().left, vh = window.innerHeight;
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > top0 && r.top < vh; };
  const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const shown = [...base.querySelectorAll('*')].filter(visible);
  const sizes = {};
  for (const el of shown) {
    const cs = getComputedStyle(el);
    if (ownText(el) || (el.tagName === 'INPUT' && el.value)) sizes[cs.fontSize] = (sizes[cs.fontSize] || 0) + 1;
  }
  const labels = [...panel.querySelectorAll('[class*="PropertyPanelInput-module__Label"], .property-label')].filter(visible);
  const rows = [...panel.querySelectorAll('[data-test^="align-row-"]')].map((el) => {
    const box = el.getBoundingClientRect();
    const label = el.querySelector('[class*="PropertyPanelInput-module__Label"]');
    const seg = el.querySelector('[role="group"]');
    const sr = seg.getBoundingClientRect();
    return {
      comp: el.dataset.test.slice('align-row-'.length), top: Math.round(box.top - top0), height: Math.round(box.height), visible: visible(el),
      label: label && label.textContent, labelLeft: label && Math.round(label.getBoundingClientRect().left - left0),
      labelCut: label ? label.scrollWidth > label.clientWidth + 1 : null,
      segment: { left: Math.round(sr.left - left0), right: Math.round(sr.right - left0), height: Math.round(sr.height) },
      options: [...seg.querySelectorAll('button')].map((b) => {
        const svg = b.querySelector('svg'); const g = svg && svg.getBoundingClientRect();
        return { value: b.dataset.alignValue, pressed: b.getAttribute('aria-pressed') === 'true', width: Math.round(b.getBoundingClientRect().width),
          glyph: g ? [Math.round(g.width), Math.round(g.height)] : null, color: getComputedStyle(b).color, fill: getComputedStyle(b).backgroundColor };
      }),
      mark: !!el.querySelector('[class*="ResetDot"], [class*="ConnectedDot"]')
    };
  });
  return JSON.stringify({
    oldStripPresent: !!panel.querySelector('.align-tools-seg, .align-icon'),
    rows,
    labelLefts: [...new Set(labels.map((l) => Math.round(l.getBoundingClientRect().left - left0)))],
    groupHeaders: [...panel.querySelectorAll('.property-group-label')].filter(visible).map((h) => ({ name: h.textContent.trim(), top: Math.round(h.getBoundingClientRect().top - top0) })),
    visibleTextSizes: sizes
  });
})()`;

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const client = await connect(await appTarget());
  await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1368, height: 900, deviceScaleFactor: 2, mobile: false });
  const ev = (e) => evaluate(client, e);
  const waitFor = async (expr, ms = 120000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { try { if ((await ev(expr)) === true) return true; } catch (e) { /* reloading, or a row mid-rebuild */ } await sleep(200); }
    return false;
  };
  const must = async (expr, ms, what) => { if (!(await waitFor(expr, ms))) throw new Error('timed out: ' + (what || expr)); };
  const pointOf = async (selectorExpr, what) => {
    const pt = JSON.parse(await ev(`(() => { const el = ${selectorExpr}; if (!el) return JSON.stringify({ miss: 'no element' }); const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const hit = document.elementFromPoint(x, y); return JSON.stringify({ x, y, reachable: !!hit && (hit === el || el.contains(hit)), hit: hit && (hit.className || hit.tagName) + '' }); })()`));
    if (pt.miss || !pt.reachable) throw new Error(`${what}: not reachable ${JSON.stringify(pt)}`);
    return pt;
  };
  const click = async (selectorExpr, what) => {
    const pt = await pointOf(selectorExpr, what);
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await client.send('Input.dispatchMouseEvent', { type, x: pt.x, y: pt.y, button: 'left', clickCount: type === 'mouseMoved' ? 0 : 1 });
    }
    await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
    return pt;
  };
  const model = `window.__nodeGraphEditor.findNodeWithId(${JSON.stringify(NODE)}).model`;
  const param = async (name) => JSON.parse(await ev(`JSON.stringify(${model}.parameters[${JSON.stringify(name)}] ?? null)`));
  const pressedOf = async (comp) => ev(`(() => { const r = ${ROW(comp)}; if (!r) return 'no row'; return [...r.querySelectorAll('button[aria-pressed="true"]')].map((b) => b.dataset.alignValue).join(','); })()`);
  const scroller = `(() => { const s = document.querySelector('.sidebar-property-editor'); let p = s; while (p && p.scrollHeight <= p.clientHeight) p = p.parentElement; return p; })()`;
  const shot = async (name) => {
    const box = JSON.parse(await ev(`(() => { const p = [...document.querySelectorAll('[class*="BasePanel-module__Root"]')].find((x) => x.offsetParent !== null && x.querySelector('.property-editor-tabs')); const r = p.getBoundingClientRect(); return JSON.stringify({ x: Math.max(0, r.x), width: r.width }); })()`));
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { x: box.x, y: 0, width: box.width, height: 900, scale: 1 } });
    fs.writeFileSync(path.join(outDir, name), Buffer.from(data, 'base64'));
  };
  const scrollRowsIntoView = async () => {
    await ev(`(() => { const p = ${scroller}; const r = ${ROW('horizontal')}; if (p && r) p.scrollTop += r.getBoundingClientRect().top - 300; })()`);
    await sleep(500);
  };
  const undo = async () => { await ev(`window.__nodeGraphEditor.undo()`); await sleep(600); };

  if (!(await ev(`!!(window.__nodeGraphEditor && window.__nodeGraphEditor.getActiveComponent())`))) {
    await must(`!!document.querySelector('nav[aria-label="Launcher sections"]')`, 240000, 'launcher');
    await ev(`[...document.querySelectorAll('nav[aria-label="Launcher sections"] button')].find((b) => b.textContent === 'Projects').click()`);
    await sleep(2500);
    const clicked = await ev(`(() => { const c = [...document.querySelectorAll('[class*="LauncherCard-module__Card"]')].find((x) => x.innerText.includes('Story engine')); if (!c) return false; c.click(); return true; })()`);
    if (!clicked) throw new Error('no Story engine card');
  }
  await must(`!!window.__nodeGraphEditor && !!window.__nodeGraphEditor.getActiveComponent()`, 120000, 'editor');
  await sleep(4000);
  const dir = await ev(`(() => { let r; window.webpackChunknoodl_editor.push([['drv-' + Math.floor(Math.random() * 1e9)], {}, (x) => { r = x; }]); const m = r.c['./src/editor/src/models/projectmodel.ts']; return m ? m.exports.ProjectModel.instance._retainedProjectDirectory : 'unknown'; })()`);
  console.log('project:', dir);
  if (!EXPECT || dir !== EXPECT) throw new Error('refusing to drive a project that is not the scratch copy: ' + dir);

  await ev(`(() => { const ed = window.__nodeGraphEditor; ed.switchToComponent(ed.getActiveComponent().owner.getComponentWithName('/App'), { pushHistory: false }); })()`);
  await sleep(3000);
  console.log(await ev(`(() => { const ed = window.__nodeGraphEditor; const n = ed.findNodeWithId(${JSON.stringify(NODE)}); if (!n) return 'no node'; ed.selectNode(n); return 'selected ' + n.model.type.name; })()`));
  await must(`!!${ROW('align-items')}`, 30000, 'align-items row');
  await sleep(1500);

  const results = { measured: {}, interaction: {} };
  for (const theme of ['dark', 'light']) {
    await ev(`document.documentElement.setAttribute('data-theme', '${theme}')`);
    await sleep(800); // a theme write is not visible in the same eval
    await ev(`(() => { const p = ${scroller}; if (p) p.scrollTop = 0; })()`);
    await sleep(400);
    await shot(`props-group-top-${theme}.png`);
    await ev(`(() => { const p = ${scroller}; if (p) p.scrollTop = 560; })()`);
    await sleep(600);
    results.measured[theme + 'Lower'] = JSON.parse(await ev(MEASURE));
    await shot(`props-group-lower-${theme}.png`);
    await scrollRowsIntoView();
    results.measured[theme] = JSON.parse(await ev(MEASURE));
    console.log(theme, JSON.stringify(results.measured[theme]));
    await shot(`props-group-align-${theme}.png`);
  }

  // ── Interaction, dark ───────────────────────────────────────────────────────────────────────
  await ev(`document.documentElement.setAttribute('data-theme', 'dark')`);
  await sleep(600);
  await scrollRowsIntoView();
  const I = results.interaction;
  I.before = { alignItems: await param('alignItems'), justifyContent: await param('justifyContent'), pressedItems: await pressedOf('align-items') };

  // 1. Stretch
  await click(SEG('align-items', 'stretch'), 'Align Items · Stretch');
  await waitFor(`${model}.parameters.alignItems === 'stretch'`, 4000);
  await sleep(300);
  I.stretch = { model: await param('alignItems'), pressed: await pressedOf('align-items'), mark: await ev(`!!${ROW('align-items')}.querySelector('[class*="ResetDot"]')`) };
  await shot('props-group-align-stretch-dark.png');
  await undo();
  await waitFor(`(${model}.parameters.alignItems ?? null) === ${JSON.stringify(I.before.alignItems)}`, 4000);
  I.stretchAfterUndo = { model: await param('alignItems'), pressed: await pressedOf('align-items') };

  // 2. the pressed segment again
  await scrollRowsIntoView();
  const inEffect = (await pressedOf('align-items')).split(',')[0];
  const undoDepth = async () => ev(`(() => { let r; window.webpackChunknoodl_editor.push([['drv-' + Math.floor(Math.random() * 1e9)], {}, (x) => { r = x; }]); const k = Object.keys(r.c).find((k) => k.includes('undo-queue-model')); const q = r.c[k].exports.UndoQueue.instance; return q.undos ? q.undos.length + ':' + q.ptr : JSON.stringify(Object.keys(q)); })()`);
  I.pressAgain = { value: inEffect, undoBefore: await undoDepth() };
  await click(SEG('align-items', inEffect), 'Align Items · in effect');
  await sleep(800);
  I.pressAgain.model = await param('alignItems');
  I.pressAgain.undoAfter = await undoDepth();

  // 3. set, reset by the gutter dot, undo twice
  await scrollRowsIntoView();
  await click(SEG('justify-content', 'space-between'), 'Justify Content · Space Between');
  await waitFor(`${model}.parameters.justifyContent === 'space-between'`, 4000);
  await sleep(400);
  I.justify = { model: await param('justifyContent'), pressed: await pressedOf('justify-content') };
  await click(`${ROW('justify-content')}.querySelector('[class*="ResetDot"]')`, 'Justify Content reset dot');
  await waitFor(`${model}.parameters.justifyContent === undefined`, 4000);
  await sleep(400);
  I.reset = { model: await param('justifyContent'), pressed: await pressedOf('justify-content'), mark: await ev(`!!${ROW('justify-content')}.querySelector('[class*="ResetDot"]')`) };
  await undo();
  I.resetUndo1 = { model: await param('justifyContent'), pressed: await pressedOf('justify-content') };
  await undo();
  I.resetUndo2 = { model: await param('justifyContent'), pressed: await pressedOf('justify-content') };

  console.log('interaction', JSON.stringify(I, null, 1));
  fs.writeFileSync(path.join(outDir, 'align-results.json'), JSON.stringify(results, null, 2));
  console.log('wrote', outDir);
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
