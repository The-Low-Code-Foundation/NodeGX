// CHR-009 slice 2 — the head, measured on the rendered panel, both themes, then USED.
//
// Same rig, node and crop as slice 1's `after/props-group-top-*.png`, so the two are a same-crop
// before/after (s12's lesson: never two differently-framed shots).
//
// Reads: where the first property row starts (the head's whole cost, in px from the panel top),
// each head zone's height, the tab strip, label x of the Variant/State rows against the property
// rows, and AC2's font sizes / fills / radii over the visible part.
// Then drives with REAL input (CDP mouse at an `elementFromPoint`-verified point, `Input.insertText`):
// the Comment tab (write → marker on, model holds it; undo → marker off), the State row (pick a
// state → field says it, list closes), the Variant row (opens its picker).
//
// 🔴 Refuses to run against anything but the scratch copy.
//
//   NOODL_REMOTE_DEBUG_PORT=9333 node drive-head.js --expect=<scratch copy dir>
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
  const sizes = {};
  for (const el of shown) if (ownText(el)) { const s = getComputedStyle(el).fontSize; sizes[s] = (sizes[s] || 0) + 1; }
  const fills = {}; const radii = {};
  for (const el of shown) {
    const cs = getComputedStyle(el);
    if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') fills[cs.backgroundColor] = (fills[cs.backgroundColor] || 0) + 1;
    if (cs.borderTopLeftRadius !== '0px') radii[cs.borderTopLeftRadius] = (radii[cs.borderTopLeftRadius] || 0) + 1;
  }
  const box = (sel) => { const el = base.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top - top0), height: Math.round(r.height), left: Math.round(r.left - left0), width: Math.round(r.width) }; };
  const propLabels = [...panel.querySelectorAll('[class*="PropertyPanelInput-module__Label"], .property-label')].filter(visible);
  const headLabels = [...panel.querySelectorAll('.panel-head-row-label')].filter(visible);
  const lefts = (els) => [...new Set(els.map((l) => Math.round(l.getBoundingClientRect().left - left0)))];
  const firstGroup = panel.querySelector('.property-group');
  const firstProp = propLabels[0];
  const tabs = [...base.querySelectorAll('.property-editor-tabs [role=tab]')].map((t) => {
    const r = t.getBoundingClientRect();
    return { text: t.textContent.trim(), selected: t.getAttribute('aria-selected'), width: Math.round(r.width), height: Math.round(r.height), marker: !!t.querySelector('[aria-label="has content"]'), clipped: (() => { const p = t.querySelector('p'); return p ? p.scrollWidth > p.clientWidth + 1 : null; })() };
  });
  const headControls = [...panel.querySelectorAll('.panel-head-row-field, .panel-head-row-action, input.property-filter-input')].filter(visible).map((c) => Math.round(c.getBoundingClientRect().height));
  return JSON.stringify({
    zones: {
      nodeRow: box('.property-header-bar'),
      tabStrip: box('.property-editor-tabs [role=tablist]'),
      variant: box('.variants-editor'),
      state: box('.property-editor-visual-states'),
      filter: box('.property-filter'),
      filterField: box('input.property-filter-input'),
      comment: box('.property-comment-bar')
    },
    firstGroupHeaderTop: firstGroup ? Math.round(firstGroup.getBoundingClientRect().top - top0) : null,
    firstPropertyLabel: firstProp ? { text: firstProp.textContent.trim(), top: Math.round(firstProp.getBoundingClientRect().top - top0) } : null,
    propertyLabelLefts: lefts(propLabels),
    headRowLabelLefts: lefts(headLabels),
    headRowLabels: headLabels.map((l) => l.textContent.trim()),
    headControlHeights: headControls,
    nodeName: (base.querySelector('.property-header-name') || {}).textContent,
    eyebrow: (base.querySelector('.property-type-chip') || {}).textContent,
    tabs,
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

  // A real click: centre of the element, and only if that point hits the element (or inside it).
  const click = async (selectorExpr, what) => {
    const pt = JSON.parse(await ev(`(() => { const el = ${selectorExpr}; if (!el) return JSON.stringify({ miss: 'no element' }); el.scrollIntoView({ block: 'nearest' }); const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const hit = document.elementFromPoint(x, y); return JSON.stringify({ x, y, reachable: !!hit && (hit === el || el.contains(hit)), hit: hit && (hit.className || hit.tagName) + '' }); })()`));
    if (pt.miss || !pt.reachable) throw new Error(`${what}: not reachable ${JSON.stringify(pt)}`);
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await client.send('Input.dispatchMouseEvent', { type, x: pt.x, y: pt.y, button: 'left', clickCount: type === 'mouseMoved' ? 0 : 1 });
    }
    return pt;
  };
  const tab = (name) => `[...document.querySelectorAll('.property-editor-tabs [role=tab]')].find((t) => t.textContent.trim() === ${JSON.stringify(name)})`;
  const model = `window.__nodeGraphEditor.findNodeWithId(${JSON.stringify(NODE)}).model`;

  if (!(await ev(`!!(window.__nodeGraphEditor && window.__nodeGraphEditor.getActiveComponent())`))) {
    await must(`!!document.querySelector('nav[aria-label="Launcher sections"]')`, 180000, 'launcher');
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
  await must(`!!document.querySelector('.sidebar-property-editor .property-group')`, 30000, 'rows');
  await sleep(2500);

  const results = { measured: {}, interaction: {} };
  const shot = async (name) => {
    const box = JSON.parse(await ev(`(() => { const p = [...document.querySelectorAll('[class*="BasePanel-module__Root"]')].find((x) => x.offsetParent !== null && x.querySelector('.property-editor-tabs')); const r = p.getBoundingClientRect(); return JSON.stringify({ x: Math.max(0, r.x), width: r.width }); })()`));
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { x: box.x, y: 0, width: box.width, height: 900, scale: 1 } });
    fs.writeFileSync(path.join(outDir, name), Buffer.from(data, 'base64'));
  };

  for (const theme of ['dark', 'light']) {
    await ev(`document.documentElement.setAttribute('data-theme', '${theme}')`);
    await sleep(800); // a theme write is not visible in the same eval
    await ev(`(() => { const s = document.querySelector('.sidebar-property-editor'); let p = s; while (p && p.scrollHeight <= p.clientHeight) p = p.parentElement; if (p) p.scrollTop = 0; })()`);
    await sleep(400);
    const m = JSON.parse(await ev(MEASURE));
    results.measured[theme] = m;
    console.log(theme, JSON.stringify(m));
    await shot(`props-group-top-${theme}.png`);
  }

  // ── Interaction, dark ───────────────────────────────────────────────────────────────────────
  await ev(`document.documentElement.setAttribute('data-theme', 'dark')`);
  await sleep(600);
  const I = results.interaction;
  I.commentBefore = await ev(`${model}.getComment() ?? null`);
  I.markerBefore = await ev(`!!${tab('Comment')}.querySelector('[aria-label="has content"]')`);

  await click(tab('Comment'), 'Comment tab');
  I.commentTabShows = await waitFor(`(() => { const t = document.querySelector('.property-comment-input'); return !!t && t.getBoundingClientRect().height > 0; })()`, 5000);
  await click(`document.querySelector('.property-comment-input')`, 'comment field');
  await sleep(200);
  await client.send('Input.insertText', { text: 'Drive note: why this group fills the page' });
  await click(tab('Properties'), 'Properties tab (blur commits)');
  I.modelAfterWrite = (await waitFor(`${model}.getComment() === 'Drive note: why this group fills the page'`, 4000)) ? await ev(`${model}.getComment()`) : await ev(`${model}.getComment() ?? null`);
  I.markerAfterWrite = await waitFor(`!!${tab('Comment')}.querySelector('[aria-label="has content"]')`, 4000);
  I.rowsBackOnProperties = await waitFor(`!!document.querySelector('.sidebar-property-editor .property-group') && document.querySelector('.sidebar-property-editor').getBoundingClientRect().height > 0`, 4000);
  await shot('props-group-top-dark-marker.png');

  await ev(`window.__nodeGraphEditor.undo()`);
  await waitFor(`!${tab('Comment')}.querySelector('[aria-label="has content"]')`, 4000);
  I.markerAfterUndo = await ev(`!!${tab('Comment')}.querySelector('[aria-label="has content"]')`);
  I.modelAfterUndo = await ev(`${model}.getComment() ?? null`);

  // State row: open, pick the second state, the field says it and the list is gone.
  const stateField = `document.querySelector('.property-editor-visual-states .panel-head-row-field')`;
  I.stateFieldBefore = await ev(`${stateField} && ${stateField}.textContent.trim()`);
  if (I.stateFieldBefore) {
    await click(stateField, 'State field');
    I.stateListOpens = await waitFor(`!!document.querySelector('.visual-states-popup')`, 3000);
    I.stateOptions = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('.property-editor-visual-state-item')].map((x) => x.textContent.trim()))`));
    await click(`document.querySelectorAll('.property-editor-visual-state-item-label')[1]`, 'second state');
    I.stateListClosed = await waitFor(`!document.querySelector('.visual-states-popup')`, 3000);
    I.stateFieldAfter = await ev(`${stateField}.textContent.trim()`);
    await click(stateField, 'State field again');
    await waitFor(`!!document.querySelector('.visual-states-popup')`, 3000);
    await click(`document.querySelectorAll('.property-editor-visual-state-item-label')[0]`, 'first state');
    I.stateFieldRestored = await ev(`${stateField}.textContent.trim()`);
  }

  // Variant row: opens its picker popout.
  const variantField = `document.querySelector('.variants-editor .panel-head-row-field')`;
  I.variantFieldText = await ev(`${variantField} && ${variantField}.textContent.trim()`);
  if (I.variantFieldText) {
    const popouts = `document.querySelectorAll('.popup-layer-popout').length`;
    I.popoutsBefore = await ev(popouts);
    await click(variantField, 'Variant field');
    I.variantPickerOpens = await waitFor(`${popouts} > ${I.popoutsBefore}`, 3000);
    await shot('props-group-variant-picker-dark.png');
    await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sleep(500);
    if ((await ev(popouts)) > I.popoutsBefore) {
      // The popout puts a blocker over the panel; a press on the blocker is the dismiss.
      I.escapeDismissed = false;
      await click(`document.querySelector('.popup-layer-blocker')`, 'popout blocker (dismiss)');
      await sleep(500);
    } else {
      I.escapeDismissed = true;
    }
    I.popoutsAfterDismiss = await ev(popouts);
  }

  console.log('interaction', JSON.stringify(I, null, 1));
  fs.writeFileSync(path.join(outDir, 'head-results.json'), JSON.stringify(results, null, 2));
  console.log('wrote', outDir);
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
