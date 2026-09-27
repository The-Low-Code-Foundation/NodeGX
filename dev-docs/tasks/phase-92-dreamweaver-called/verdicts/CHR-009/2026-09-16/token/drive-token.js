// CHR-009 s20 — a project token in a colour field paints the token's colour (Richard: "fix it now").
// Built on color/drive-color.js (slice 8). Measures the same crops, then on Background Color = var(--background)
// reads the swatch fill (story-engine's --background is #fbf8f3 = rgb(251, 248, 243)) and opens the picker to
// read the colour it starts on. No typing.
//
// ---- slice 8's header, kept:
// CHR-009 slice 8 — the colour field as ONE field: swatch inside, hex in mono, alpha as the suffix.
//
// Was a 26px text field plus a separate 30px `.color-thumbnail` box, and the alpha of a #RRGGBBAA value
// was shown nowhere. This drive measures every colour field on the Group at slice 7's bottom crop
// (scrollTop 1120), both themes, and shoots it; then (dark) real input on Background Color: type
// #00000066 (field #000000, suffix 40%), type #FF0000 over it (model keeps the 66 alpha), open the picker
// from the swatch (its opacity field agrees), close it, undo both.
//
// 🔴 Refuses to run against anything but the scratch copy.
//
//   NOODL_REMOTE_DEBUG_PORT=9333 node drive-token.js --expect=<scratch copy dir> [--out=<dir>] [--no-input]
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const outDir = opt('out', path.join(__dirname, 'after'));
const EXPECT = opt('expect', '');
const NO_INPUT = args.includes('--no-input');
const NODE = 'app_root';
const PORT = 'backgroundColor';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MEASURE = `(() => {
  const panel = document.querySelector('.sidebar-property-editor');
  if (!panel) return JSON.stringify({ error: 'no panel' });
  const base = [...document.querySelectorAll('[class*="BasePanel-module__Root"]')].find((x) => x.offsetParent !== null && x.querySelector('.sidebar-property-editor'));
  const top0 = base.getBoundingClientRect().top, left0 = base.getBoundingClientRect().left;
  const rel = (r) => ({ top: Math.round(r.top - top0), left: Math.round(r.left - left0), width: Math.round(r.width * 10) / 10, height: Math.round(r.height * 10) / 10 });
  const inside = (a, b) => a.left >= b.left && a.right <= b.right && a.top >= b.top && a.bottom <= b.bottom;
  const fields = [...panel.querySelectorAll('input[data-type="color"], input[data-identifier]')].filter((i) => i.closest('[class*="ColorInput-module__Field"]')).map((input) => {
    const field = input.closest('[class*="ColorInput-module__Field"]');
    const row = field.closest('[class*="PropertyPanelInput-module__Root"]');
    const label = row && row.querySelector('[class*="PropertyPanelInput-module__Label"]');
    const swatch = field.querySelector('[class*="ColorInput-module__Swatch"]');
    const alpha = field.querySelector('[class*="ColorInput-module__Alpha"]');
    const fr = field.getBoundingClientRect(), sr = swatch.getBoundingClientRect();
    return {
      label: label && label.textContent.trim(), visible: field.offsetParent !== null && fr.height > 0,
      field: rel(fr), swatch: rel(sr), swatchInsideField: inside(sr, fr), swatchFill: getComputedStyle(swatch.firstElementChild).backgroundColor,
      text: input.value, textCut: input.scrollWidth > input.clientWidth, font: getComputedStyle(input).fontFamily.split(',')[0] + ' ' + getComputedStyle(input).fontSize,
      alpha: alpha ? alpha.textContent : null, inputHeight: Math.round(input.getBoundingClientRect().height * 10) / 10
    };
  });
  return JSON.stringify({
    fields,
    oldThumbnails: panel.querySelectorAll('.color-thumbnail').length,
    labelLefts: [...new Set([...panel.querySelectorAll('[class*="PropertyPanelInput-module__Label"], .property-label')].filter((l) => l.offsetParent !== null).map((l) => Math.round(l.getBoundingClientRect().left - left0)))]
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
  const key = async (k, code, vk) => {
    await client.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk });
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk });
  };
  const model = `window.__nodeGraphEditor.findNodeWithId(${JSON.stringify(NODE)}).model`;
  const param = async (name) => JSON.parse(await ev(`JSON.stringify(${model}.parameters[${JSON.stringify(name)}] ?? null)`));
  const scroller = `(() => { const s = document.querySelector('.sidebar-property-editor'); let p = s; while (p && p.scrollHeight <= p.clientHeight) p = p.parentElement; return p; })()`;
  const shot = async (name) => {
    const box = JSON.parse(await ev(`(() => { const p = [...document.querySelectorAll('[class*="BasePanel-module__Root"]')].find((x) => x.offsetParent !== null && x.querySelector('.property-editor-tabs')); const r = p.getBoundingClientRect(); return JSON.stringify({ x: Math.max(0, r.x), width: r.width }); })()`));
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { x: box.x, y: 0, width: box.width, height: 900, scale: 1 } });
    fs.writeFileSync(path.join(outDir, name), Buffer.from(data, 'base64'));
  };
  const zoom = async (selectorExpr, name) => {
    const r = JSON.parse(await ev(`JSON.stringify((${selectorExpr}).getBoundingClientRect())`));
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { x: r.x - 4, y: r.y - 4, width: r.width + 8, height: r.height + 8, scale: 4 } });
    fs.writeFileSync(path.join(outDir, name), Buffer.from(data, 'base64'));
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
  // 🔴 s17: the served bundle can carry the change while the renderer still runs the old module.
  const fresh = await ev(`(() => { let r; window.webpackChunknoodl_editor.push([['drv-' + Math.floor(Math.random() * 1e9)], {}, (x) => { r = x; }]); const k = Object.keys(r.m).find((k) => k.endsWith('propertyeditor/model/colorField.ts')); const c = Object.keys(r.m).find((k) => k.endsWith('propertyeditor/components/ColorInput.tsx')); const p = Object.keys(r.m).find((k) => k.endsWith('src/models/projectmodel.ts')); return !!k && String(r.m[k]).includes('toString(16)') && !!c && String(r.m[c]).includes('parentElement') && !!p && String(r.m[p]).includes('resolveProjectTokenValue'); })()`);
  console.log('renderer runs colorField:', fresh);
  if (!fresh) throw new Error('renderer does not run the s20 projectmodel module');
  if (!EXPECT || dir !== EXPECT) throw new Error('refusing to drive a project that is not the scratch copy: ' + dir);

  await ev(`(() => { const ed = window.__nodeGraphEditor; ed.switchToComponent(ed.getActiveComponent().owner.getComponentWithName('/App'), { pushHistory: false }); })()`);
  await sleep(3000);
  console.log(await ev(`(() => { const ed = window.__nodeGraphEditor; const n = ed.findNodeWithId(${JSON.stringify(NODE)}); if (!n) return 'no node'; ed.selectNode(n); return 'selected ' + n.model.type.name; })()`));
  await must(`!!document.querySelector('.sidebar-property-editor [class*="ColorInput-module__Field"]')`, 30000, 'colour fields');
  await sleep(1500);

  const results = { measured: {}, interaction: {} };
  for (const theme of ['dark', 'light']) {
    await ev(`document.documentElement.setAttribute('data-theme', '${theme}')`);
    await sleep(800); // a theme write is not visible in the same eval
    await ev(`(() => { const p = ${scroller}; if (p) p.scrollTop = 1120; })()`);
    await sleep(600);
    const m = JSON.parse(await ev(MEASURE));
    results.measured[theme + 'Bottom'] = m;
    await shot(`props-group-bottom-${theme}.png`);
    console.log(theme, JSON.stringify({ old: m.oldThumbnails, lefts: m.labelLefts, fields: m.fields.map((f) => ({ label: f.label, vis: f.visible, h: f.field.height, sw: f.swatch.width + 'x' + f.swatch.height, in: f.swatchInsideField, text: f.text, cut: f.textCut, font: f.font, alpha: f.alpha })) }));
    // 🔴 s19: "the first visible field" caught one scrolled under the filter. Name the row.
    const borderField = `[...document.querySelectorAll('.sidebar-property-editor [class*="ColorInput-module__Field"]')].find((f) => { const l = f.closest('[class*="PropertyPanelInput-module__Root"]').querySelector('[class*="PropertyPanelInput-module__Label"]'); return f.offsetParent !== null && l && l.textContent.trim() === 'Border Color'; })`;
    if (await ev(`!!${borderField}`)) await zoom(borderField, `zoom-field-${theme}.png`);
  }

  {
    // s20: the token's swatch, dark, then the picker opened on it.
    await ev(`document.documentElement.setAttribute('data-theme', 'dark')`);
    await sleep(600);
    const T = (results.token = {});
    const field = `document.querySelector('.sidebar-property-editor input[data-identifier="${PORT}"]').closest('[class*="ColorInput-module__Field"]')`;
    await ev(`(() => { const p = ${scroller}; const f = ${field}; if (p && f) p.scrollTop += f.getBoundingClientRect().top - 400; })()`);
    await sleep(600);
    T.field = JSON.parse(await ev(`(() => { const f = ${field}; return JSON.stringify({ text: f.querySelector('input').value, fill: getComputedStyle(f.querySelector('[class*="ColorInput-module__SwatchFill"]')).backgroundColor, fillInline: f.querySelector('[class*="ColorInput-module__SwatchFill"]').style.backgroundColor }); })()`));
    T.model = await param(PORT);
    T.expectedFill = 'rgb(251, 248, 243)';
    T.pass = T.model === 'var(--background)' && T.field.fill === T.expectedFill;
    await shot('props-group-token-dark.png');
    await zoom(field, 'zoom-token-dark.png');
    await click(`${field}.querySelector('button')`, 'swatch');
    await sleep(900);
    T.picker = JSON.parse(await ev(`(() => { const p = document.querySelector('.color-picker-popup'); if (!p || p.offsetParent === null) return JSON.stringify({ open: false }); return JSON.stringify({ open: true, inputs: [...p.querySelectorAll('input')].map((i) => i.value) }); })()`));
    T.pickerModel = await param(PORT);
    await shot('props-group-token-picker-dark.png');
    await key('Escape', 'Escape', 27);
    await sleep(500);
    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 700, y: 60, button: 'left', clickCount: 1 });
    await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 700, y: 60, button: 'left', clickCount: 1 });
    await sleep(600);
    T.afterClose = { open: await ev(`!!document.querySelector('.color-picker-popup') && document.querySelector('.color-picker-popup').offsetParent !== null`), model: await param(PORT) };
    console.log('token', JSON.stringify(T));
  }

  if (!NO_INPUT) {
    await ev(`document.documentElement.setAttribute('data-theme', 'dark')`);
    await sleep(600);
    const I = results.interaction;
    const field = `document.querySelector('.sidebar-property-editor input[data-identifier="${PORT}"]').closest('[class*="ColorInput-module__Field"]')`;
    const read = async () => JSON.parse(await ev(`(() => { const f = ${field}; const a = f.querySelector('[class*="ColorInput-module__Alpha"]'); return JSON.stringify({ text: f.querySelector('input').value, alpha: a ? a.textContent : null, fill: getComputedStyle(f.querySelector('[class*="ColorInput-module__SwatchFill"]')).backgroundColor, hexFont: getComputedStyle(f.querySelector('input')).fontFamily.split(',')[0] }); })()`));
    const typeInto = async (text) => {
      await click(`${field}.querySelector('input')`, 'colour text');
      await sleep(400);
      await ev(`document.activeElement && document.activeElement.select && document.activeElement.select()`);
      await client.send('Input.insertText', { text });
      await key('Enter', 'Enter', 13);
      await sleep(800);
      await ev(`document.activeElement && document.activeElement.blur()`);
      await sleep(500);
    };
    await ev(`(() => { const p = ${scroller}; const f = ${field}; if (p && f) p.scrollTop += f.getBoundingClientRect().top - 400; })()`);
    await sleep(600);

    I.before = { model: await param(PORT), ...(await read()) };
    await typeInto('#00000066');
    I.typedAlpha = { model: await param(PORT), ...(await read()) };
    await typeInto('#FF0000');
    I.typedHexOver = { model: await param(PORT), ...(await read()) };
    await shot('props-group-color-typed-dark.png');
    await zoom(field, 'zoom-typed-dark.png');

    await click(`${field}.querySelector('button')`, 'swatch');
    await sleep(900);
    // the popout must not cover the field it edits
    I.pickerOpen = JSON.parse(await ev(`(() => { const p = document.querySelector('.color-picker-popup'); if (!p || p.offsetParent === null) return JSON.stringify({ open: false }); const f = ${field}.getBoundingClientRect(); const pr = p.getBoundingClientRect(); return JSON.stringify({ open: true, inputs: [...p.querySelectorAll('input')].map((i) => i.value), fieldRight: Math.round(f.right), popupLeft: Math.round(pr.left), coversField: pr.left < f.right - 1 && pr.right > f.left && pr.top < f.bottom && pr.bottom > f.top }); })()`));
    I.pickerOpen.model = await param(PORT);
    await shot('props-group-color-picker-dark.png');
    await key('Escape', 'Escape', 27);
    await sleep(500);
    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 700, y: 60, button: 'left', clickCount: 1 });
    await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 700, y: 60, button: 'left', clickCount: 1 });
    await sleep(600);
    I.pickerClosed = { open: await ev(`!!document.querySelector('.color-picker-popup') && document.querySelector('.color-picker-popup').offsetParent !== null`), model: await param(PORT) };

    await ev(`window.__nodeGraphEditor.undo()`);
    await sleep(800);
    I.undo1 = { model: await param(PORT), ...(await read()) };
    await ev(`window.__nodeGraphEditor.undo()`);
    await sleep(800);
    I.undo2 = { model: await param(PORT), ...(await read()) };
    console.log('interaction', JSON.stringify(I));
  }

  fs.writeFileSync(path.join(outDir, 'token-results.json'), JSON.stringify(results, null, 2));
  console.log('wrote', outDir);
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
