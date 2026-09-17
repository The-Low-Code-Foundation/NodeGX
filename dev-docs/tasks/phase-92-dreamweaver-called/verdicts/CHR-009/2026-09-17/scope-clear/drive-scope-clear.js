// CHR-009 s23 — scope-segment set-mark after a CLEAR (copied from inherited/drive-inherited.js, whose header follows).
// CHR-009 §12.4 (Richard, s21: "show it greyed") — an unset per-side border field shows the all-sides value as a muted
// placeholder.
//
// Group `app_root` on the scratch copy. Setup (the copy only): Border Style solid, Border Color #FF0000, Border Width
// 3px, Corner Radius 8px on ALL sides; the Border Style heading folded and opened once to redraw (a setup write is
// invisible to an open panel). Then real mouse: press the Left edge and read the three left fields (value,
// placeholder, placeholder colour, swatch); press the Top left corner and read its radius field. Then click into
// Border Width (Left), type 5 + Enter: the placeholder must give way to the value; undo: it must come back.
// Both themes shot at 2x on the Border Style and Corner Radius groups.
//
// 🔴 Refuses to run against anything but the scratch copy.
//
//   NOODL_REMOTE_DEBUG_PORT=9333 node drive-inherited.js --expect=<scratch copy dir> [--out=<dir>]
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const outDir = opt('out', path.join(__dirname, 'after'));
const EXPECT = opt('expect', '');
const NODE = 'app_root';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const P = `document.querySelector('.sidebar-property-editor')`;
// A select row carries no data-identifier: find it through its port view (the row whose label is the port's editorName
// and is visible) when the attribute lookup misses.
const inputFor = (port) => `(${P}.querySelector('input[data-identifier="${port}"]') || ${P}.querySelector('[data-property="${port}"] input') || (() => { const label = ${JSON.stringify({ borderLeftStyle: 'Border Style' })}['${port}']; if (!label) return null; const rows = [...${P}.querySelectorAll('[class*="PropertyPanelInput-module__Root"]')].filter((r) => r.offsetParent !== null && r.querySelector('[class*="PropertyPanelInput-module__Label"]')?.textContent.trim() === label); return rows.length ? rows[rows.length - 1].querySelector('input') : null; })())`;
const seg = (tab) => `${P}.querySelector('[data-test="scope-row"] button[data-tab="${tab}"]')`;
const headingOf = (name) => `[...${P}.querySelectorAll('.property-group-label')].find((h) => h.querySelector('.property-group-name').textContent.trim() === '${name}')`;

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
  const mod = (suffix) => `(() => { let r; window.webpackChunknoodl_editor.push([['drv-' + Math.floor(Math.random() * 1e9)], {}, (x) => { r = x; }]); return r(Object.keys(r.m).find((k) => k.endsWith('${suffix}'))); })()`;
  const src = (suffix, needle) => `(() => { let r; window.webpackChunknoodl_editor.push([['drv-' + Math.floor(Math.random() * 1e9)], {}, (x) => { r = x; }]); const k = Object.keys(r.m).find((k) => k.endsWith('${suffix}')); return !!k && String(r.m[k]).includes('${needle}'); })()`;

  if (!(await ev(`!!(window.__nodeGraphEditor && window.__nodeGraphEditor.getActiveComponent && window.__nodeGraphEditor.getActiveComponent())`))) {
    await must(`[...document.querySelectorAll('[class*="LauncherCard-module__Card"]')].some((x) => x.innerText.includes('Story engine'))`, 600000, 'launcher card');
    await sleep(2500);
    const clicked = await ev(`(() => { const c = [...document.querySelectorAll('[class*="LauncherCard-module__Card"]')].find((x) => x.innerText.includes('Story engine')); if (!c) return false; c.click(); return true; })()`);
    if (!clicked) throw new Error('no Story engine card');
  }
  await must(`!!window.__nodeGraphEditor && !!window.__nodeGraphEditor.getActiveComponent()`, 120000, 'editor');
  await sleep(4000);
  const dir = await ev(`${mod('models/projectmodel.ts')}.ProjectModel.instance._retainedProjectDirectory`);
  console.log('project:', dir);
  const results = { fresh: {}, setup: {}, read: {} };
  for (const [file, needle] of [['DataTypes/EnumType.ts', 'inheritedSideValue'], ['DataTypes/NumberWithUnits.ts', 'inheritedNumberText'], ['ColorPicker/ColorType.ts', 'inheritedSideValue'], ['PropertyPanelSelectInput.tsx', 'placeholder']]) {
    results.fresh[file] = await ev(src(file, needle));
  }
  console.log('renderer runs the change:', JSON.stringify(results.fresh));
  if (Object.values(results.fresh).some((v) => !v)) throw new Error('renderer does not run the change');
  if (!EXPECT || dir !== EXPECT) throw new Error('refusing to drive a project that is not the scratch copy: ' + dir);

  await ev(`(() => { const ed = window.__nodeGraphEditor; ed.switchToComponent(ed.getActiveComponent().owner.getComponentWithName('/App'), { pushHistory: false }); })()`);
  await sleep(3000);
  console.log(await ev(`(() => { const ed = window.__nodeGraphEditor; const n = ed.findNodeWithId(${JSON.stringify(NODE)}); if (!n) return 'no node'; ed.selectNode(n); return 'selected ' + n.model.type.name; })()`));
  await must(`!!${headingOf('Border Style')}`, 30000, 'Border Style heading');
  await sleep(1200);

  const model = `window.__nodeGraphEditor.findNodeWithId(${JSON.stringify(NODE)}).model`;
  results.setup.before = JSON.parse(await ev(`JSON.stringify(Object.fromEntries(['borderStyle','borderColor','borderWidth','borderRadius','borderLeftStyle','borderLeftWidth','borderLeftColor','borderTopLeftRadius'].map((k) => [k, ${model}.parameters[k] === undefined ? '<undefined>' : ${model}.parameters[k]])))`));
  await ev(`(() => { const m = ${model}; m.setParameter('borderStyle', 'solid'); m.setParameter('borderColor', '#FF0000'); m.setParameter('borderWidth', { value: 3, unit: 'px' }); m.setParameter('borderRadius', { value: 8, unit: 'px' }); })()`);
  await sleep(600);

  const press = async (expr) => {
    await ev(`(${expr}).scrollIntoView({ block: 'center' })`);
    await sleep(400);
    const pt = JSON.parse(await ev(`(() => { const el = ${expr}; const r = el.getBoundingClientRect(); const x = r.left + Math.min(20, r.width / 2), y = r.top + r.height / 2; const hit = document.elementFromPoint(x, y); return JSON.stringify({ x, y, reachable: !!hit && (hit === el || el.contains(hit)) }); })()`));
    if (!pt.reachable) throw new Error('not reachable ' + expr + ' ' + JSON.stringify(pt));
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await client.send('Input.dispatchMouseEvent', { type, x: pt.x, y: pt.y, button: 'left', clickCount: type === 'mouseMoved' ? 0 : 1 });
    }
    await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
    await sleep(800);
  };
  // Redraw: fold and open the Border Style group (a toggle clears the ports hash).
  if ((await ev(`${headingOf('Border Style')}.getAttribute('aria-expanded')`)) === 'true') await press(headingOf('Border Style'));
  await press(headingOf('Border Style'));
  results.setup.borderOpen = await ev(`${headingOf('Border Style')}.getAttribute('aria-expanded')`);
  if ((await ev(`${headingOf('Corner Radius')}.getAttribute('aria-expanded')`)) !== 'true') await press(headingOf('Corner Radius'));

  const readPort = (port) => `(() => { const i = ${inputFor(port)}; if (!i) return null; const row = i.closest('[data-property]') || i.parentElement; const sw = row && row.querySelector('[class*="SwatchFill"]'); return { value: i.value, placeholder: i.getAttribute('placeholder'), placeholderColor: getComputedStyle(i, '::placeholder').color, valueColor: getComputedStyle(i).color, visible: i.offsetParent !== null, swatch: sw ? getComputedStyle(sw).backgroundColor : undefined }; })()`;
  const readAll = async (ports) => JSON.parse(await ev(`JSON.stringify({ ${ports.map((p) => `${p}: ${readPort(p)}`).join(', ')} })`));
  const zoomGroup = async (name, file) => {
    await ev(`${headingOf(name)}.scrollIntoView({ block: 'start' })`);
    await sleep(400);
    const r = JSON.parse(await ev(`JSON.stringify(${headingOf(name)}.parentElement.getBoundingClientRect())`));
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { x: r.x, y: Math.max(0, r.y), width: r.width, height: Math.min(r.height, 400), scale: 2 } });
    fs.writeFileSync(path.join(outDir, file), Buffer.from(data, 'base64'));
  };

  // Control beside the hint: the all-sides fields read their own values.
  results.read.allEdges = await readAll(['borderStyle', 'borderWidth', 'borderColor']);
  await press(seg('borders-left'));
  results.read.leftPressed = await ev(`${seg('borders-left')}.getAttribute('aria-pressed')`);
  results.read.leftEdge = await readAll(['borderLeftStyle', 'borderLeftWidth', 'borderLeftColor']);
  console.log('left edge', JSON.stringify(results.read.leftEdge));
  await press(seg('corners-top-left'));
  results.read.topLeft = await readAll(['borderTopLeftRadius']);
  console.log('top left', JSON.stringify(results.read.topLeft));

  // CHR-009 s23 — handoff item 4: `scopeRows.ts` marks a segment set with `!== undefined`. A cleared field may
  // store `''`. Known-firing control first (type a value ⇒ the Left edge segment must mark), then clear the SAME
  // field and read the stored value and the mark. Width (number+unit) and Color (text) arms.
  await press(seg('borders-left'));
  const mark = () => ev(`${seg('borders-left')}.getAttribute('data-set')`);
  const key = async (k, code, vk) => { for (const type of ['keyDown', 'keyUp']) await client.send('Input.dispatchKeyEvent', { type, key: k, code, windowsVirtualKeyCode: vk }); };
  const arm = async (port, text) => {
    const out = { before: { mark: await mark(), stored: await ev(`JSON.stringify(${model}.parameters.${port})`) } };
    await press(inputFor(port));
    out.focused = await ev(`document.activeElement === ${inputFor(port)}`);
    await client.send('Input.insertText', { text });
    await key('Enter', 'Enter', 13);
    await sleep(900);
    out.typed = { mark: await mark(), stored: await ev(`JSON.stringify(${model}.parameters.${port})`), field: JSON.parse(await ev(`JSON.stringify(${readPort(port)})`)) };
    await press(inputFor(port));
    await ev(`${inputFor(port)}.select()`);
    await key('Backspace', 'Backspace', 8);
    await key('Enter', 'Enter', 13);
    await sleep(900);
    out.cleared = { mark: await mark(), stored: await ev(`(() => { const v = ${model}.parameters.${port}; return v === undefined ? '<undefined>' : JSON.stringify(v); })()`), field: JSON.parse(await ev(`JSON.stringify(${readPort(port)})`)) };
    // A toggle redraws the tabs from scratch, so a stale mark cannot hide behind a missed re-render.
    await press(headingOf('Border Style'));
    await press(headingOf('Border Style'));
    if ((await ev(`${seg('borders-left')}.getAttribute('aria-pressed')`)) !== 'true') await press(seg('borders-left'));
    out.clearedAfterRedraw = { mark: await mark() };
    console.log(port, JSON.stringify(out));
    return out;
  };
  results.read.width = await arm('borderLeftWidth', '5');
  results.read.color = await arm('borderLeftColor', '#00FF00');
  await ev(`document.documentElement.setAttribute('data-theme', 'dark')`);

  fs.writeFileSync(path.join(outDir, 'scope-clear-results.json'), JSON.stringify(results, null, 2));
  console.log('wrote', outDir);
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
