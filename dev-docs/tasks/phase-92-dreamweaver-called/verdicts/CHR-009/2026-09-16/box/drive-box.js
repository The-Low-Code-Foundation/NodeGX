// CHR-009 slice 4 — Margin and Padding as paired rows with a per-edge expander (AC4).
//
// Same rig, node (`app_root`) and crops as slice 3's `rows/props-group-{top,lower}-*.png` (scrollTop 0
// and 560), so each pair is a same-crop before/after. Then a crop with the rows in view.
//
// Reads (both themes): each row's height, label x against every other label, each field's height,
// whether any value is clipped (`scrollWidth > clientWidth`), the old 150px box's absence.
// Then (dark), real input only — CDP mouse at an `elementFromPoint`-verified point, `Input.insertText`,
// CDP Enter — and the MODEL read after each act:
//   1. `↕` padding: type 12, Enter → top+bottom 12, left/right untouched; ONE undo → both back.
//   2. expander → four fields; `↑` top: type 8, Enter; collapse → `↕` reads `mixed`, model holds four.
//   3. `50%` typed into `↔` → left/right in %; undo.
//   4. drag on `↔` → both sides move together; one undo → back.
//
// 🔴 Refuses to run against anything but the scratch copy.
//
//   NOODL_REMOTE_DEBUG_PORT=9333 node drive-box.js --expect=<scratch copy dir>
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const outDir = opt('out', __dirname);
const EXPECT = opt('expect', '');
const NODE = 'app_root';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SIDES = ['Top', 'Bottom', 'Left', 'Right'];

const ROW = (side) => `document.querySelector('.sidebar-property-editor [data-test="marginpadding-row-${side}"]')`;

const MEASURE = `(() => {
  const panel = document.querySelector('.sidebar-property-editor');
  if (!panel) return JSON.stringify({ error: 'no panel' });
  const base = [...document.querySelectorAll('[class*="BasePanel-module__Root"]')].find((x) => x.offsetParent !== null && x.querySelector('.sidebar-property-editor'));
  const top0 = base.getBoundingClientRect().top, left0 = base.getBoundingClientRect().left, vh = window.innerHeight;
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > top0 && r.top < vh; };
  const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const shown = [...base.querySelectorAll('*')].filter(visible);
  const sizes = {}, fills = {};
  for (const el of shown) {
    const cs = getComputedStyle(el);
    if (ownText(el) || (el.tagName === 'INPUT' && el.value)) sizes[cs.fontSize] = (sizes[cs.fontSize] || 0) + 1;
    if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') fills[cs.backgroundColor] = (fills[cs.backgroundColor] || 0) + 1;
  }
  const labels = [...panel.querySelectorAll('[class*="PropertyPanelInput-module__Label"], .property-label')].filter(visible);
  const row = (side) => {
    const el = panel.querySelector('[data-test="marginpadding-row-' + side + '"]');
    if (!el) return null;
    const box = el.getBoundingClientRect();
    const label = el.querySelector('[class*="PropertyPanelInput-module__Label"]');
    return {
      top: Math.round(box.top - top0), height: Math.round(box.height), visible: visible(el),
      label: label && label.textContent, labelLeft: label && Math.round(label.getBoundingClientRect().left - left0),
      fields: [...el.querySelectorAll('[data-comp]')].map((f) => {
        const input = f.querySelector('input');
        const unit = f.querySelector('[class*="Unit"]');
        return { comp: f.dataset.comp, height: Math.round(f.getBoundingClientRect().height), width: Math.round(f.getBoundingClientRect().width),
          value: input.value, placeholder: input.placeholder, title: f.title, unit: unit && unit.textContent,
          clipped: input.scrollWidth > input.clientWidth + 1, font: getComputedStyle(input).fontSize };
      }),
      expander: (() => { const b = el.querySelector('[data-test^="marginpadding-expand"]'); return b && { expanded: b.getAttribute('aria-expanded'), height: Math.round(b.getBoundingClientRect().height) }; })(),
      mark: (() => { const d = el.querySelector('[class*="ResetDot"], [class*="ConnectedDot"]'); return d ? Math.round(d.getBoundingClientRect().left + d.getBoundingClientRect().width / 2 - left0) : null; })()
    };
  };
  return JSON.stringify({
    oldBoxPresent: !!panel.querySelector('.marginpadding-outer, .marginpadding-label'),
    margin: row('margin'), padding: row('padding'),
    labelLefts: [...new Set(labels.map((l) => Math.round(l.getBoundingClientRect().left - left0)))],
    groupHeaders: [...panel.querySelectorAll('.property-group-label')].filter(visible).map((h) => ({ name: h.textContent.trim(), top: Math.round(h.getBoundingClientRect().top - top0) })),
    visibleTextSizes: sizes, fills
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
    return pt;
  };
  const enter = async () => {
    await client.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await client.send('Input.dispatchKeyEvent', { type: 'char', key: 'Enter', code: 'Enter', text: '\r' });
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  };
  const selectAll = async () => {
    await client.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 4, commands: ['selectAll'] });
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 4 });
  };
  const typeInto = async (selectorExpr, text, what) => {
    await click(selectorExpr, what);
    await sleep(150);
    await selectAll();
    await client.send('Input.insertText', { text });
    await sleep(100);
    await enter();
  };
  const model = `window.__nodeGraphEditor.findNodeWithId(${JSON.stringify(NODE)}).model`;
  const params = async (side) => JSON.parse(await ev(`JSON.stringify(Object.fromEntries(${JSON.stringify(SIDES)}.map((e) => ['${side}' + e, ${model}.getParameter('${side}' + e) ?? null])))`));
  const field = (side, comp) => `document.querySelector('.sidebar-property-editor [data-test="marginpadding-row-${side}"] [data-comp="${comp}"] input')`;
  const scroller = `(() => { const s = document.querySelector('.sidebar-property-editor'); let p = s; while (p && p.scrollHeight <= p.clientHeight) p = p.parentElement; return p; })()`;
  const shot = async (name) => {
    const box = JSON.parse(await ev(`(() => { const p = [...document.querySelectorAll('[class*="BasePanel-module__Root"]')].find((x) => x.offsetParent !== null && x.querySelector('.property-editor-tabs')); const r = p.getBoundingClientRect(); return JSON.stringify({ x: Math.max(0, r.x), width: r.width }); })()`));
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { x: box.x, y: 0, width: box.width, height: 900, scale: 1 } });
    fs.writeFileSync(path.join(outDir, name), Buffer.from(data, 'base64'));
  };
  const scrollRowsIntoView = async () => {
    await ev(`(() => { const p = ${scroller}; const r = ${ROW('margin')}; if (p && r) p.scrollTop += r.getBoundingClientRect().top - 420; })()`);
    await sleep(500);
  };

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
  await must(`!!${ROW('padding')}`, 30000, 'padding row');
  // Fixture setup, not a graded act: the drag arm needs margin UNSET at its start (the s15 first run's
  // failed undo left 24 in the scratch copy). No undo recorded.
  await ev(`(() => { const m = ${JSON.stringify('')} || window.__nodeGraphEditor.findNodeWithId(${JSON.stringify(NODE)}).model; ['marginLeft', 'marginRight'].forEach((n) => m.setParameter(n, undefined)); })()`);
  await sleep(2500);

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
    await shot(`props-group-box-${theme}.png`);
  }

  // ── Interaction, dark ───────────────────────────────────────────────────────────────────────
  await ev(`document.documentElement.setAttribute('data-theme', 'dark')`);
  await sleep(600);
  await scrollRowsIntoView();
  const I = results.interaction;
  const undo = async () => { await ev(`window.__nodeGraphEditor.undo()`); await sleep(500); };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  I.paddingBefore = await params('padding');
  I.marginBefore = await params('margin');

  // 1. ↕ padding
  await typeInto(field('padding', 'padding-vertical'), '120', '↕ padding');
  await waitFor(`JSON.stringify(${model}.getParameter('paddingTop')) === '{"value":120,"unit":"px"}'`, 4000);
  I.pairTyped = { padding: await params('padding'), focusAfterEnter: await ev(`document.activeElement && document.activeElement.tagName`) };
  await sleep(400);
  I.pairTyped.fieldShows = await ev(`${field('padding', 'padding-vertical')}.value`);
  // The px suffix draws on hover, and CDP never sends a mouse-leave: park the pointer off the panel first.
  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
  await sleep(200);
  I.pairTyped.unitDrawnAtRest = await ev(`(() => { return !!${ROW('padding')}.querySelector('[data-comp="padding-vertical"] [class*="Unit"]'); })()`);
  // 🔴 s15: the first drive typed `12` and read "not clipped" while a field had ~16px for its value.
  I.pairTyped.clipped = await ev(`(() => { const i = ${field('padding', 'padding-vertical')}; return i.scrollWidth > i.clientWidth + 1; })()`);
  await shot('props-group-box-120-dark.png');
  await undo();
  await waitFor(`JSON.stringify(${model}.getParameter('paddingTop') ?? null) === ${JSON.stringify(JSON.stringify(I.paddingBefore.paddingTop))}`, 4000);
  I.pairAfterOneUndo = { padding: await params('padding') };
  I.pairAfterOneUndo.restored = same(I.pairAfterOneUndo.padding, I.paddingBefore);

  // 2. expander, per-edge top, collapse
  await scrollRowsIntoView();
  await click(`${ROW('padding')}.querySelector('[data-test="marginpadding-expand-padding"]')`, 'padding expander');
  await waitFor(`${ROW('padding')}.querySelectorAll('[data-comp]').length === 4`, 4000);
  I.expanded = { fields: await ev(`[...${ROW('padding')}.querySelectorAll('[data-comp]')].map((f) => f.dataset.comp).join(',')`), rowHeight: await ev(`Math.round(${ROW('padding')}.getBoundingClientRect().height)`), writes: await params('padding') };
  await shot('props-group-box-expanded-dark.png');
  await typeInto(field('padding', 'padding-top'), '8', '↑ padding top');
  await waitFor(`JSON.stringify(${model}.getParameter('paddingTop')) === '{"value":8,"unit":"px"}'`, 4000);
  I.edgeTyped = { padding: await params('padding') };
  await click(`${ROW('padding')}.querySelector('[data-test="marginpadding-expand-padding"]')`, 'padding collapse');
  await waitFor(`!!${field('padding', 'padding-vertical')}`, 4000);
  await sleep(300);
  I.collapsedMixed = JSON.parse(await ev(`(() => { const i = ${field('padding', 'padding-vertical')}; const h = ${field('padding', 'padding-horizontal')}; const cs = getComputedStyle(i, '::placeholder'); const ctx = document.createElement('canvas').getContext('2d'); ctx.font = cs.fontSize + ' ' + cs.fontFamily; const room = i.clientWidth - parseFloat(getComputedStyle(i).paddingLeft) - parseFloat(getComputedStyle(i).paddingRight); return JSON.stringify({ placeholderWidth: Math.round(ctx.measureText(i.placeholder).width), placeholderRoom: Math.round(room), unitDrawn: !!i.closest('[data-comp]').querySelector('[class*="Unit"]'), value: i.value, placeholder: i.placeholder, title: i.closest('[data-comp]').title, horizontal: h.value }); })()`));
  I.collapsedMixed.model = await params('padding');
  await shot('props-group-box-mixed-dark.png');
  await undo();
  await waitFor(`JSON.stringify(${model}.getParameter('paddingTop') ?? null) === ${JSON.stringify(JSON.stringify(I.paddingBefore.paddingTop))}`, 4000);
  I.edgeAfterUndo = { restored: same(await params('padding'), I.paddingBefore) };

  // 3. unit, typed: `50%` into ↔ (the rows have no unit control — s15's hover toggle took value clicks)
  await scrollRowsIntoView();
  await typeInto(field('padding', 'padding-horizontal'), '50%', '↔ padding 50%');
  await waitFor(`(${model}.getParameter('paddingLeft') || {}).unit === '%'`, 4000);
  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
  await sleep(300);
  I.unitSwitched = { padding: await params('padding'), unitShows: await ev(`(() => { const u = ${ROW('padding')}.querySelector('[data-comp="padding-horizontal"] [class*="Unit"]'); return u ? u.textContent : null; })()`), fieldShows: await ev(`${field('padding', 'padding-horizontal')}.value`) };
  await shot('props-group-box-percent-dark.png');
  await undo();
  I.unitAfterUndo = { restored: same(await params('padding'), I.paddingBefore) };

  // 4. drag on ↔ margin
  await scrollRowsIntoView();
  const pt = await pointOf(field('margin', 'margin-horizontal'), '↔ margin (drag)');
  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt.x, y: pt.y });
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
  for (let dx = 4; dx <= 24; dx += 4) {
    await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt.x + dx, y: pt.y, button: 'left', buttons: 1 });
    await sleep(40);
  }
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x + 24, y: pt.y, button: 'left', clickCount: 1 });
  await sleep(500);
  I.dragged = { margin: await params('margin') };
  await undo();
  I.dragAfterOneUndo = { margin: await params('margin') };
  I.dragAfterOneUndo.restored = same(I.dragAfterOneUndo.margin, I.marginBefore);
  await ev(`document.activeElement && document.activeElement.blur && document.activeElement.blur()`);

  console.log('interaction', JSON.stringify(I, null, 1));
  fs.writeFileSync(path.join(outDir, 'box-results.json'), JSON.stringify(results, null, 2));
  console.log('wrote', outDir);
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
