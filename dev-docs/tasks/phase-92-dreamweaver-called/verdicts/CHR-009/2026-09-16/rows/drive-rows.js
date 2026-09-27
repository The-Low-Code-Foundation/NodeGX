// CHR-009 slice 3 — Size Mode as a row, the gutter mark, the section rhythm. Measured on the rendered
// panel in both themes, then USED with real input.
//
// Same rig, node (`app_root`) and crop as slice 2's `head/props-group-top-*.png`, so the pair is a
// same-crop before/after.
//
// Reads: the Size Mode row (height, label x against every other label, its four buttons' heights and
// pressed state), each visible gutter mark's centre x and which kind it is, the vertical position of
// every group header, and AC2's sizes/fills/radii over the visible panel.
// Then (dark): CDP clicks on `W fits` and `H fits` → model `sizeMode` and whether the Width/Height
// rows are drawn; undo ×2 → back. A wire into `width` (model `addConnection` with undo — the panel
// listens to `connectionAdded`) → the gutter mark on Width becomes the connected dot; undo → back.
//
// 🔴 Refuses to run against anything but the scratch copy.
//
//   NOODL_REMOTE_DEBUG_PORT=9333 node drive-rows.js --expect=<scratch copy dir>
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const outDir = opt('out', __dirname);
const EXPECT = opt('expect', '');
const NODE = 'app_root';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MEASURE = `(() => {
  const panel = document.querySelector('.sidebar-property-editor');
  if (!panel) return JSON.stringify({ error: 'no panel' });
  const base = [...document.querySelectorAll('[class*="BasePanel-module__Root"]')].find((x) => x.offsetParent !== null && x.querySelector('.sidebar-property-editor'));
  const top0 = base.getBoundingClientRect().top;
  const left0 = base.getBoundingClientRect().left;
  const vh = window.innerHeight;
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > top0 && r.top < vh; };
  const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const all = [...base.querySelectorAll('*')];
  const shown = all.filter(visible);
  const sizes = {}; const fills = {}; const radii = {};
  for (const el of shown) {
    const cs = getComputedStyle(el);
    if (ownText(el)) sizes[cs.fontSize] = (sizes[cs.fontSize] || 0) + 1;
    if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') fills[cs.backgroundColor] = (fills[cs.backgroundColor] || 0) + 1;
    if (cs.borderTopLeftRadius !== '0px') radii[cs.borderTopLeftRadius] = (radii[cs.borderTopLeftRadius] || 0) + 1;
  }
  const rel = (r) => ({ top: Math.round(r.top - top0), height: Math.round(r.height), left: Math.round(r.left - left0), width: Math.round(r.width) });
  const labels = [...panel.querySelectorAll('[class*="PropertyPanelInput-module__Label"], .property-label, .panel-head-row-label')].filter(visible);
  const size = panel.querySelector('[data-test="size-mode"]');
  const sizeRow = size && size.closest('[class*="PropertyPanelInput-module__Root"]');
  const marks = [...panel.querySelectorAll('[class*="PropertyPanelInput-module__ResetDot"], [class*="PropertyPanelInput-module__ConnectedDot"]')].filter(visible).map((d) => {
    const r = d.getBoundingClientRect();
    const row = d.closest('[class*="PropertyPanelInput-module__Root"]');
    const label = row && row.querySelector('[class*="PropertyPanelInput-module__Label"]');
    const lr = label && label.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { kind: /ConnectedDot/.test(d.className) ? 'connected' : 'reset', label: label && label.textContent.trim(), centreX: Math.round(r.left + r.width / 2 - left0), size: Math.round(r.width), gapToLabel: lr ? Math.round(lr.left - r.right) : null, rowCentreDelta: row ? Math.round((r.top + r.height / 2) - (row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2)) : null, reachable: !!hit && (hit === d || d.contains(hit)) };
  });
  const legacyMarks = [...panel.querySelectorAll('.property-changed-dot, .property-changed-dot-noreset')].filter(visible).map((d) => rel(d.getBoundingClientRect()));
  return JSON.stringify({
    sizeRow: sizeRow ? {
      box: rel(sizeRow.getBoundingClientRect()),
      label: (sizeRow.querySelector('[class*="PropertyPanelInput-module__Label"]') || {}).textContent,
      buttons: [...sizeRow.querySelectorAll('button')].map((b) => ({ axis: b.dataset.sizeAxis, fits: b.dataset.sizeFits, pressed: b.getAttribute('aria-pressed'), height: Math.round(b.getBoundingClientRect().height), title: b.title })),
      segmentHeights: [...sizeRow.querySelectorAll('[class*="SizeModeInput-module__Segment"]')].map((s) => Math.round(s.getBoundingClientRect().height)),
      overflows: size.scrollWidth > size.clientWidth + 1
    } : null,
    oldStripPresent: !!panel.querySelector('.size-icon'),
    labelLefts: [...new Set(labels.map((l) => Math.round(l.getBoundingClientRect().left - left0)))],
    labelsShown: labels.map((l) => l.textContent.trim()),
    marks,
    legacyMarks,
    groupHeaders: [...panel.querySelectorAll('.property-group-label')].filter(visible).map((h) => ({ name: h.textContent.trim(), top: Math.round(h.getBoundingClientRect().top - top0) })),
    rowHeights: [...panel.querySelectorAll('[class*="PropertyPanelInput-module__Root"]')].filter(visible).map((r) => Math.round(r.getBoundingClientRect().height)),
    visibleTextSizes: sizes, fills, radii,
    elements: all.length
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
    while (Date.now() - t0 < ms) { try { if ((await ev(expr)) === true) return true; } catch (e) { /* reloading, or a row mid-rebuild */ } await sleep(250); }
    return false;
  };
  const must = async (expr, ms, what) => { if (!(await waitFor(expr, ms))) throw new Error('timed out: ' + (what || expr)); };
  const click = async (selectorExpr, what) => {
    const pt = JSON.parse(await ev(`(() => { const el = ${selectorExpr}; if (!el) return JSON.stringify({ miss: 'no element' }); el.scrollIntoView({ block: 'nearest' }); const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const hit = document.elementFromPoint(x, y); return JSON.stringify({ x, y, reachable: !!hit && (hit === el || el.contains(hit)), hit: hit && (hit.className || hit.tagName) + '' }); })()`));
    if (pt.miss || !pt.reachable) throw new Error(`${what}: not reachable ${JSON.stringify(pt)}`);
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await client.send('Input.dispatchMouseEvent', { type, x: pt.x, y: pt.y, button: 'left', clickCount: type === 'mouseMoved' ? 0 : 1 });
    }
    return pt;
  };
  const model = `window.__nodeGraphEditor.findNodeWithId(${JSON.stringify(NODE)}).model`;

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
  await must(`!!document.querySelector('.sidebar-property-editor [data-test="size-mode"]')`, 30000, 'size mode row');
  await sleep(2500);

  const results = { measured: {}, interaction: {} };
  const scroller = `(() => { const s = document.querySelector('.sidebar-property-editor'); let p = s; while (p && p.scrollHeight <= p.clientHeight) p = p.parentElement; return p; })()`;
  const shot = async (name) => {
    const box = JSON.parse(await ev(`(() => { const p = [...document.querySelectorAll('[class*="BasePanel-module__Root"]')].find((x) => x.offsetParent !== null && x.querySelector('.property-editor-tabs')); const r = p.getBoundingClientRect(); return JSON.stringify({ x: Math.max(0, r.x), width: r.width }); })()`));
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { x: box.x, y: 0, width: box.width, height: 900, scale: 1 } });
    fs.writeFileSync(path.join(outDir, name), Buffer.from(data, 'base64'));
  };

  for (const theme of ['dark', 'light']) {
    await ev(`document.documentElement.setAttribute('data-theme', '${theme}')`);
    await sleep(800); // a theme write is not visible in the same eval
    await ev(`(() => { const p = ${scroller}; if (p) p.scrollTop = 0; })()`);
    await sleep(400);
    const m = JSON.parse(await ev(MEASURE));
    results.measured[theme] = m;
    console.log(theme, JSON.stringify(m));
    await shot(`props-group-top-${theme}.png`);
    // A second crop further down (Layout, Style) — `scrollTop` directly; smooth scroll reads 0.
    await ev(`(() => { const p = ${scroller}; if (p) p.scrollTop = 560; })()`);
    await sleep(600);
    results.measured[theme + 'Scrolled'] = JSON.parse(await ev(MEASURE));
    await shot(`props-group-lower-${theme}.png`);
    await ev(`(() => { const p = ${scroller}; if (p) p.scrollTop = 0; })()`);
    await sleep(400);
  }

  // ── Interaction, dark ───────────────────────────────────────────────────────────────────────
  await ev(`document.documentElement.setAttribute('data-theme', 'dark')`);
  await sleep(600);
  const I = results.interaction;
  const sizeBtn = (axis, fits) => `document.querySelector('.sidebar-property-editor [data-test="size-mode"] button[data-size-axis="${axis}"][data-size-fits="${fits}"]')`;
  // A switched-off row is not removed: FB-021/R8 keeps it drawn, dimmed, under the group's one gate line.
  // So "drawn" is three states, read off the row: live, gated (inside `.property-port-gated`), absent.
  const rowState = (label) => `(() => { const l = [...document.querySelectorAll('.sidebar-property-editor [class*="PropertyPanelInput-module__Label"]')].find((x) => x.textContent.trim() === '${label}' && x.getBoundingClientRect().height > 0); if (!l) return 'absent'; return l.closest('.property-port-gated') ? 'gated' : 'live'; })()`;
  const rowDrawn = (label) => `(${rowState(label)} !== 'absent')`;
  I.sizeModeBefore = await ev(`${model}.getParameter('sizeMode') ?? null`);
  I.widthRowBefore = await ev(rowState('Width'));

  await click(sizeBtn('width', true), 'W fits');
  I.afterWFits = { model: (await waitFor(`${model}.getParameter('sizeMode') === 'contentWidth'`, 4000)) ? 'contentWidth' : await ev(`${model}.getParameter('sizeMode') ?? null`) };
  await waitFor(`${rowState('Width')} === 'gated'`, 4000);
  I.afterWFits.widthRow = await ev(rowState('Width'));
  I.afterWFits.heightRow = await ev(rowState('Height'));
  I.afterWFits.pressed = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('.sidebar-property-editor [data-test="size-mode"] button[aria-pressed="true"]')].map((b) => b.dataset.sizeAxis + ':' + b.dataset.sizeFits))`));

  await click(sizeBtn('height', true), 'H fits');
  I.afterHFits = { model: (await waitFor(`${model}.getParameter('sizeMode') === 'contentSize'`, 4000)) ? 'contentSize' : await ev(`${model}.getParameter('sizeMode') ?? null`) };
  await waitFor(`${rowState('Height')} === 'gated'`, 4000);
  I.afterHFits.widthRow = await ev(rowState('Width'));
  I.afterHFits.heightRow = await ev(rowState('Height'));
  await shot('props-group-fit-both-dark.png');

  await ev(`window.__nodeGraphEditor.undo()`);
  await sleep(400);
  await ev(`window.__nodeGraphEditor.undo()`);
  await waitFor(`${model}.getParameter('sizeMode') === ${JSON.stringify(I.sizeModeBefore)} && ${rowState('Width')} === 'live'`, 4000);
  I.afterUndo = { model: await ev(`${model}.getParameter('sizeMode') ?? null`), widthRow: await ev(rowState('Width')), heightRow: await ev(rowState('Height')), pressed: JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('.sidebar-property-editor [data-test="size-mode"] button[aria-pressed="true"]')].map((b) => b.dataset.sizeAxis + ':' + b.dataset.sizeFits))`)) };

  // FB-021's reveal now has a real control on the row: focus the first button.
  // (Graded by `revealGateTarget`'s own spec; here only that the row HAS a focusable.)
  I.sizeRowFocusables = await ev(`document.querySelector('.sidebar-property-editor [data-test="size-mode"]').closest('[class*="PropertyPanelInput-module__Root"]').querySelectorAll('input, select, textarea, button').length`);

  // A wire into Width. The source is another node in /App with an output port; its type is recorded.
  const markOn = (label) => `(() => { const l = [...document.querySelectorAll('.sidebar-property-editor [class*="PropertyPanelInput-module__Label"]')].find((x) => x.textContent.trim() === '${label}'); const row = l && l.closest('[class*="PropertyPanelInput-module__Root"]'); if (!row) return 'no row'; const d = row.querySelector('[class*="ConnectedDot"], [class*="ResetDot"]'); if (!d) return 'none'; const r = d.getBoundingClientRect(); return (/ConnectedDot/.test(d.className) ? 'connected' : 'reset') + '@' + Math.round(r.left + r.width / 2) + ',' + getComputedStyle(d).backgroundColor + ',' + getComputedStyle(d).boxShadow; })()`;
  I.widthMarkBefore = await ev(markOn('Width'));
  const source = JSON.parse(await ev(`(() => {
    const graph = window.__nodeGraphEditor.getActiveComponent().graph;
    let found = null;
    graph.forEachNode((n) => {
      if (found || n.id === ${JSON.stringify(NODE)}) return;
      const outs = (n.getPorts ? n.getPorts('output') : []).filter((p) => p.type === 'number' || (p.type && p.type.name === 'number'));
      if (outs.length) found = { id: n.id, type: n.type.name, port: outs[0].name };
    });
    return JSON.stringify(found);
  })()`));
  I.wireSource = source;
  if (source) {
    await ev(`(() => { const g = window.__nodeGraphEditor.getActiveComponent().graph; window.__chr009Wire = { fromId: ${JSON.stringify(source.id)}, fromProperty: ${JSON.stringify(source.port)}, toId: ${JSON.stringify(NODE)}, toProperty: 'width' }; g.addConnection(window.__chr009Wire, { undo: true, label: 'chr-009 drive' }); })()`);
    const c0 = Date.now();
    await waitFor(`${markOn('Width')}.startsWith('connected')`, 4000);
    I.widthMarkConnectedMs = Date.now() - c0;
    I.widthMarkConnected = await ev(markOn('Width'));
    I.bindingChip = await ev(`[...document.querySelectorAll('.sidebar-property-editor [class*="PropertyPanelInput-module__Root"]')].some((r) => /Width/.test(r.textContent) && /Bound to/.test(r.textContent))`);
    await shot('props-group-width-connected-dark.png');
    await ev(`window.__nodeGraphEditor.undo()`);
    // Bounded retry on the END state, not "not connected": a read mid-rebuild finds no row at all
    // (first run read 'no row' here), which is neither the defect nor the fix.
    const t0 = Date.now();
    const seen = [];
    while (Date.now() - t0 < 4000) { const m = await ev(markOn('Width')); if (seen[seen.length - 1] !== m) seen.push(m); if (m.startsWith('reset')) break; await sleep(100); }
    I.widthMarkAfterUndo = await ev(markOn('Width'));
    I.widthMarkAfterUndoSequence = seen;
    I.widthMarkAfterUndoMs = Date.now() - t0;
    I.chipAfterUndo = await ev(`[...document.querySelectorAll('.sidebar-property-editor [class*="PropertyPanelInput-module__Root"]')].some((r) => /Width/.test(r.textContent) && /Bound to/.test(r.textContent))`);
    I.connectionsLeft = await ev(`window.__nodeGraphEditor.getActiveComponent().graph.connections.filter((c) => c.toId === ${JSON.stringify(NODE)} && c.toProperty === 'width').length`);
  }

  console.log('interaction', JSON.stringify(I, null, 1));
  fs.writeFileSync(path.join(outDir, 'rows-results.json'), JSON.stringify(results, null, 2));
  console.log('wrote', outDir);
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
