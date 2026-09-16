// CHR-009 slice 6 — one control height.
//
// §2 says "one control height, 26px". The base input's height is not set: it is padding + border + Chromium's
// line box for an <input>, so a 12px text input (selects, text fields) reads 28 and an 11px mono one 26.
// This drive reads EVERY visible control in the Group panel's rows — its kind and rendered height — at the
// same two crops as slices 4–5 (scrollTop 0 and 560), both themes, and shoots the crops.
// Then (dark) real input on the two kinds whose box changes: a select opens and picks, a text field commits.
//
// 🔴 Refuses to run against anything but the scratch copy.
//
//   NOODL_REMOTE_DEBUG_PORT=9333 node drive-height.js --expect=<scratch copy dir> [--out=<dir>] [--no-input]
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const outDir = opt('out', __dirname);
const EXPECT = opt('expect', '');
const NO_INPUT = args.includes('--no-input');
const NODE = 'app_root';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Every control a row draws, by kind. A kind is the outermost box a person sees as "the field".
const MEASURE = `(() => {
  const panel = document.querySelector('.sidebar-property-editor');
  if (!panel) return JSON.stringify({ error: 'no panel' });
  const base = [...document.querySelectorAll('[class*="BasePanel-module__Root"]')].find((x) => x.offsetParent !== null && x.querySelector('.sidebar-property-editor'));
  const top0 = base.getBoundingClientRect().top, left0 = base.getBoundingClientRect().left, vh = window.innerHeight;
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > top0 + 1 && r.top < vh - 1; };
  const rowOf = (el) => el.closest('[class*="PropertyPanelInput-module__Root"], .property-row, [data-test^="align-row-"]');
  const labelOf = (el) => { const r = rowOf(el); const l = r && r.querySelector('[class*="PropertyPanelInput-module__Label"], .property-label'); return l ? l.textContent.trim() : null; };
  const kinds = [
    ['numberUnitField', '[class*="NumberUnitInput-module__Field"]'],
    ['fixedChip', '[class*="NumberUnitInput-module__Fixed"]'],
    ['pairField', '[class*="MarginPaddingInput-module__Field"]'],
    ['alignTrack', '[data-test^="align-row-"] [role="group"]'],
    ['sizeModeTrack', '[class*="SizeModeInput-module"][role="group"], [class*="SizeModeInput-module"] [role="group"]'],
    ['input', 'input:not([type="checkbox"]):not([type="radio"])'],
    ['textarea', 'textarea'],
    ['toggle', '[class*="Toggle-module__Root"], [class*="Switch"]'],
    ['button', 'button']
  ];
  const seen = new Set();
  const controls = [];
  for (const [kind, sel] of kinds) {
    for (const el of panel.querySelectorAll(sel)) {
      if (seen.has(el) || !visible(el)) continue;
      // an input inside a field already counted is that field's content, not a control of its own
      if (kind === 'input' && el.closest('[class*="NumberUnitInput-module__Field"], [class*="MarginPaddingInput-module__Field"]')) { seen.add(el); continue; }
      if (kind === 'button' && el.closest('[role="group"]')) { seen.add(el); continue; }
      seen.add(el);
      const r = el.getBoundingClientRect();
      const selectRoot = el.closest('[class*="PropertyPanelSelectInput-module__Root"]');
      controls.push({ kind: kind === 'input' && selectRoot ? 'select' : kind, label: labelOf(el), top: Math.round(r.top - top0), left: Math.round(r.left - left0),
        width: Math.round(r.width), height: Math.round(r.height * 10) / 10, fontSize: getComputedStyle(el).fontSize });
    }
  }
  const heightsByKind = {};
  for (const c of controls) { (heightsByKind[c.kind] = heightsByKind[c.kind] || {}); heightsByKind[c.kind][c.height] = (heightsByKind[c.kind][c.height] || 0) + 1; }
  return JSON.stringify({
    heightsByKind,
    controls,
    groupHeaders: [...panel.querySelectorAll('.property-group-label')].filter(visible).map((h) => ({ name: h.textContent.trim(), top: Math.round(h.getBoundingClientRect().top - top0) })),
    labelLefts: [...new Set([...panel.querySelectorAll('[class*="PropertyPanelInput-module__Label"], .property-label')].filter(visible).map((l) => Math.round(l.getBoundingClientRect().left - left0)))],
    // 🔴 s17: a unit picker's input at height 100% of a heightless parent collapsed to 12.5px and drew px at
    // the top of its field — every height by kind still read 26, because the kind is the FIELD. Count the inputs.
    collapsedInputs: [...panel.querySelectorAll('input:not([type="checkbox"])')].filter((i) => visible(i) && i.getBoundingClientRect().height < 20).map((i) => ({ value: i.value, height: Math.round(i.getBoundingClientRect().height * 10) / 10, label: labelOf(i) })),
    valueClipped: [...panel.querySelectorAll('input')].filter((i) => visible(i) && i.value && i.scrollWidth > i.clientWidth + 1).map((i) => i.value)
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
    while (Date.now() - t0 < ms) { try { if ((await ev(expr)) === true) return true; } catch (e) { /* reloading */ } await sleep(200); }
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
  const scroller = `(() => { const s = document.querySelector('.sidebar-property-editor'); let p = s; while (p && p.scrollHeight <= p.clientHeight) p = p.parentElement; return p; })()`;
  const shot = async (name) => {
    const box = JSON.parse(await ev(`(() => { const p = [...document.querySelectorAll('[class*="BasePanel-module__Root"]')].find((x) => x.offsetParent !== null && x.querySelector('.property-editor-tabs')); const r = p.getBoundingClientRect(); return JSON.stringify({ x: Math.max(0, r.x), width: r.width }); })()`));
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { x: box.x, y: 0, width: box.width, height: 900, scale: 1 } });
    fs.writeFileSync(path.join(outDir, name), Buffer.from(data, 'base64'));
  };
  const rowByLabel = (label) => `[...document.querySelectorAll('.sidebar-property-editor [class*="PropertyPanelInput-module__Root"]')].find((r) => { const l = r.querySelector('[class*="PropertyPanelInput-module__Label"]'); return l && l.textContent.trim() === ${JSON.stringify(label)}; })`;
  const scrollToLabel = async (label) => {
    await ev(`(() => { const p = ${scroller}; const r = ${rowByLabel(label)}; if (p && r) p.scrollTop += r.getBoundingClientRect().top - 400; })()`);
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
  await must(`!!document.querySelector('.sidebar-property-editor [data-test="align-row-align-items"]')`, 30000, 'panel rows');
  await sleep(1500);

  const results = { measured: {}, interaction: {} };
  for (const theme of ['dark', 'light']) {
    await ev(`document.documentElement.setAttribute('data-theme', '${theme}')`);
    await sleep(800); // a theme write is not visible in the same eval
    await ev(`(() => { const p = ${scroller}; if (p) p.scrollTop = 0; })()`);
    await sleep(500);
    results.measured[theme + 'Top'] = JSON.parse(await ev(MEASURE));
    await shot(`props-group-top-${theme}.png`);
    await ev(`(() => { const p = ${scroller}; if (p) p.scrollTop = 560; })()`);
    await sleep(600);
    results.measured[theme + 'Lower'] = JSON.parse(await ev(MEASURE));
    await shot(`props-group-lower-${theme}.png`);
    await ev(`(() => { const p = ${scroller}; if (p) p.scrollTop = 1120; })()`);
    await sleep(600);
    results.measured[theme + 'Bottom'] = JSON.parse(await ev(MEASURE));
    await shot(`props-group-bottom-${theme}.png`);
    for (const k of ['Top', 'Lower', 'Bottom']) console.log(theme + k, JSON.stringify(results.measured[theme + k].heightsByKind), JSON.stringify(results.measured[theme + k].groupHeaders));
  }

  if (!NO_INPUT) {
    await ev(`document.documentElement.setAttribute('data-theme', 'dark')`);
    await sleep(600);
    const I = results.interaction;
    // 1. a select: Blend Mode → Multiply, then undo
    await scrollToLabel('Blend Mode');
    I.blendBefore = await param('mixBlendMode');
    await click(`${rowByLabel('Blend Mode')}.querySelector('input')`, 'Blend Mode select');
    await sleep(600);
    const opened = await ev(`[...document.querySelectorAll('[class*="PropertyPanelSelectInput-module__Option"]')].length + ' options in the DOM'`);
    I.blendOptions = opened;
    await shot('props-group-select-open-dark.png');
    // 🔴 The select renders a measuring copy of its options: take the one the point actually hits.
    await click(`[...document.querySelectorAll('[class*="PropertyPanelSelectInput-module__Option"]')].find((o) => { if (o.textContent.trim() !== 'Multiply') return false; const r = o.getBoundingClientRect(); const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return h === o || o.contains(h); })`, 'Multiply option');
    await sleep(800);
    I.blendAfter = await param('mixBlendMode');
    I.blendShown = await ev(`${rowByLabel('Blend Mode')}.querySelector('input').value`);
    await ev(`window.__nodeGraphEditor.undo()`);
    await sleep(800);
    I.blendUndo = await param('mixBlendMode');

    // 2. a text field: Opacity ← 0.5 by real keystrokes, Enter; then undo
    await scrollToLabel('Opacity');
    I.opacityBefore = await param('opacity');
    await click(`${rowByLabel('Opacity')}.querySelector('input')`, 'Opacity field');
    // 🔴 A CDP Cmd+A selects nothing on macOS (s17: `1` + `0.5` committed 10.5) — select in the page.
    await ev(`document.activeElement && document.activeElement.select && document.activeElement.select()`);
    await client.send('Input.insertText', { text: '0.5' });
    await client.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await sleep(800);
    I.opacityAfter = await param('opacity');
    await shot('props-group-opacity-dark.png');
    await ev(`document.activeElement && document.activeElement.blur()`);
    await sleep(300);
    await ev(`window.__nodeGraphEditor.undo()`);
    await sleep(800);
    I.opacityUndo = await param('opacity');
    // 3. Fixed (Richard, s17: "only when %"): Width 100% draws the chip; Width → px draws none and the field
    //    reaches the column's right edge; undo → % and the chip is back.
    await scrollToLabel('Width');
    const widthRow = rowByLabel('Width');
    const fixedRead = async () => JSON.parse(await ev(`(() => { const r = ${widthRow}; const f = r.querySelector('[class*="NumberUnitInput-module__Field"]').getBoundingClientRect(); const c = r.querySelector('[class*="NumberUnitInput-module__Fixed"]'); const col = r.querySelector('[class*="PropertyPanelInput-module__InputContainer"]').getBoundingClientRect(); return JSON.stringify({ chip: !!c, chipText: c && c.textContent, fieldRight: Math.round(f.right), columnRight: Math.round(col.right), unit: r.querySelector('[class*="NumberUnitInput-module__UnitPicker"] input').value }); })()`));
    I.widthBefore = { model: await param('width'), ...(await fixedRead()) };
    await click(`${widthRow}.querySelector('[class*="NumberUnitInput-module__UnitPicker"] input')`, 'Width unit picker');
    await sleep(600);
    await click(`[...document.querySelectorAll('[class*="PropertyPanelSelectInput-module__Option"]')].find((o) => { if (o.textContent.trim() !== 'px') return false; const r = o.getBoundingClientRect(); const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return h === o || o.contains(h); })`, 'px option');
    await sleep(900);
    I.widthPx = { model: await param('width'), ...(await fixedRead()) };
    await shot('props-group-width-px-dark.png');
    await ev(`window.__nodeGraphEditor.undo()`);
    await sleep(900);
    I.widthUndo = { model: await param('width'), ...(await fixedRead()) };
    console.log('interaction', JSON.stringify(I));
  }

  fs.writeFileSync(path.join(outDir, 'height-results.json'), JSON.stringify(results, null, 2));
  console.log('wrote', outDir);
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
