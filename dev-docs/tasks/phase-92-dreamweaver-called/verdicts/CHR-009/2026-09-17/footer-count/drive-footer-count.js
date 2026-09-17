// CHR-009 §15.3 / FB-017 AC2 — does a REAL edit made inside `Advanced CSS` update the folded count?
//
// Group `app_root` on the scratch copy. Real mouse and keyboard throughout, no setParameter:
//   1. read the folded count (baseline);
//   2. press the footer open, click into `CSS Class`, type a class, press the footer shut — read the count;
//   3. press it open, select the field's text, Backspace, press it shut — read the count and the stored value;
//   4. type the class again and fold, then undo with the section FOLDED — read the count (an edit the panel did not make).
// Each step shoots a 4x zoom of the footer.
//
// 🔴 Refuses to run against anything but the scratch copy.
//
//   NOODL_REMOTE_DEBUG_PORT=9333 node drive-footer-count.js --expect=<scratch copy dir> [--out=<dir>]
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const outDir = opt('out', path.join(__dirname, 'after'));
const EXPECT = opt('expect', '');
const NODE = 'app_root';
const CLASS = 'drive-count';
const results0 = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FOOTER = `document.querySelector('.sidebar-property-editor .property-group--advanced > .property-group-label')`;
// The `CSS Class` row's text input, found by its label inside the Advanced section.
const FIELD = `(() => {
  const adv = document.querySelector('.sidebar-property-editor .property-group--advanced');
  if (!adv) return null;
  const label = [...adv.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent.trim() === 'CSS Class');
  if (!label) return null;
  let row = label.parentElement;
  while (row && row !== adv && !row.querySelector('input')) row = row.parentElement;
  return row && row !== adv ? row.querySelector('input') : null;
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
  const zoom = async (name) => {
    const r = JSON.parse(await ev(`JSON.stringify(${FOOTER}.getBoundingClientRect())`));
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { x: r.x - 4, y: r.y - 12, width: r.width + 8, height: r.height + 16, scale: 4 } });
    fs.writeFileSync(path.join(outDir, name), Buffer.from(data, 'base64'));
  };
  const req = (m) => `(() => { let r; window.webpackChunknoodl_editor.push([['drv-' + Math.floor(Math.random() * 1e9)], {}, (x) => { r = x; }]); return r(Object.keys(r.m).find((k) => k.endsWith('${m}'))); })()`;

  if (!(await ev(`!!(window.__nodeGraphEditor && window.__nodeGraphEditor.getActiveComponent && window.__nodeGraphEditor.getActiveComponent())`))) {
    await must(`[...document.querySelectorAll('[class*="LauncherCard-module__Card"]')].some((x) => x.innerText.includes('Story engine'))`, 600000, 'launcher card');
    await sleep(2500);
    const clicked = await ev(`(() => { const c = [...document.querySelectorAll('[class*="LauncherCard-module__Card"]')].find((x) => x.innerText.includes('Story engine')); if (!c) return false; c.click(); return true; })()`);
    if (!clicked) throw new Error('no Story engine card');
  }
  await must(`!!window.__nodeGraphEditor && !!window.__nodeGraphEditor.getActiveComponent()`, 120000, 'editor');
  await sleep(4000);
  const dir = await ev(`${req('models/projectmodel.ts')}.ProjectModel.instance._retainedProjectDirectory`);
  console.log('project:', dir);
  const fresh = await ev(`(() => { let r; window.webpackChunknoodl_editor.push([['drv-' + Math.floor(Math.random() * 1e9)], {}, (x) => { r = x; }]); const k = Object.keys(r.m).find((k) => k.endsWith('propertyeditor/components/PropertyGroups.tsx')); return !!k && String(r.m[k]).includes('property-group-label--footer'); })()`);
  console.log('renderer runs slice 9:', fresh);
  if (!fresh) throw new Error('renderer does not run the slice-9 PropertyGroups');
  results0.fix = await ev(`(() => { let r; window.webpackChunknoodl_editor.push([['drv-' + Math.floor(Math.random() * 1e9)], {}, (x) => { r = x; }]); const k = Object.keys(r.m).find((k) => k.endsWith('propertyeditor/propertyPanelTiers.ts')); return !!k && String(r.m[k]).includes('isParameterSet'); })()`);
  console.log('renderer runs the empty-string fix:', results0.fix);
  if (!EXPECT || dir !== EXPECT) throw new Error('refusing to drive a project that is not the scratch copy: ' + dir);

  await ev(`(() => { const ed = window.__nodeGraphEditor; ed.switchToComponent(ed.getActiveComponent().owner.getComponentWithName('/App'), { pushHistory: false }); })()`);
  await sleep(3000);
  console.log(await ev(`(() => { const ed = window.__nodeGraphEditor; const n = ed.findNodeWithId(${JSON.stringify(NODE)}); if (!n) return 'no node'; ed.selectNode(n); return 'selected ' + n.model.type.name; })()`));
  await must(`!!${FOOTER}`, 30000, 'Advanced CSS heading');
  await sleep(1200);

  const read = async () => JSON.parse(await ev(`(() => { const f = ${FOOTER}; const b = f.querySelector('.property-group-badge'); const m = window.__nodeGraphEditor.findNodeWithId(${JSON.stringify(NODE)}).model; const v = m.parameters.cssClassName; return JSON.stringify({ expanded: f.getAttribute('aria-expanded'), count: b ? b.textContent : null, stored: v === undefined ? '<undefined>' : JSON.stringify(v) }); })()`));
  const scrollToFooter = () => ev(`${FOOTER}.scrollIntoView({ block: 'center' })`);
  const press = async (expr, dx = 60) => {
    await scrollToFooter();
    await sleep(300);
    const pt = JSON.parse(await ev(`(() => { const el = ${expr}; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); const x = r.left + Math.min(${dx}, r.width / 2), y = r.top + r.height / 2; const hit = document.elementFromPoint(x, y); return JSON.stringify({ x, y, reachable: !!hit && (hit === el || el.contains(hit)) }); })()`));
    if (!pt.reachable) throw new Error('not reachable ' + expr + ' ' + JSON.stringify(pt));
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await client.send('Input.dispatchMouseEvent', { type, x: pt.x, y: pt.y, button: 'left', clickCount: type === 'mouseMoved' ? 0 : 1 });
    }
    await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
    await sleep(800);
  };
  const setOpen = async (open) => {
    if ((await ev(`${FOOTER}.getAttribute('aria-expanded')`)) !== String(open)) await press(FOOTER);
    if ((await ev(`${FOOTER}.getAttribute('aria-expanded')`)) !== String(open)) await press(FOOTER); // a blocker can spend the press
    if ((await ev(`${FOOTER}.getAttribute('aria-expanded')`)) !== String(open)) throw new Error('footer would not go ' + open);
  };
  const openField = async () => {
    await setOpen(true);
    if (!(await ev(`!!${FIELD}`))) throw new Error('no CSS Class input under Advanced CSS');
    // A nested group may be folded: open the heading of the group holding the field.
    const hidden = await ev(`${FIELD}.offsetParent === null`);
    if (hidden) {
      await press(`${FIELD}.closest('.property-group').querySelector('.property-group-label')`);
      if (await ev(`${FIELD}.offsetParent === null`)) throw new Error('CSS Class input still hidden');
    }
    await press(FIELD, 20);
    return ev(`document.activeElement === ${FIELD}`);
  };

  const results = { rendererRunsFix: results0.fix, steps: {} };
  await setOpen(false);
  results.steps.baseline = await read();
  await zoom('zoom-count-0-baseline.png');
  console.log('baseline', JSON.stringify(results.steps.baseline));
  if (!['<undefined>', '""'].includes(results.steps.baseline.stored)) throw new Error('cssClassName already set on the copy; baseline is not clean');

  // 2. type, fold
  results.steps.typeFocused = await openField();
  await client.send('Input.insertText', { text: CLASS });
  await sleep(300);
  await setOpen(false);
  await sleep(500);
  results.steps.afterType = await read();
  await zoom('zoom-count-1-typed.png');
  console.log('afterType', JSON.stringify(results.steps.afterType));

  // 3. clear, fold
  results.steps.clearFocused = await openField();
  results.steps.fieldBeforeClear = await ev(`${FIELD}.value`);
  await ev(`${FIELD}.select()`); // CDP Cmd+A selects nothing on macOS
  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  await sleep(300);
  results.steps.fieldAfterClear = await ev(`${FIELD}.value`);
  await setOpen(false);
  await sleep(500);
  results.steps.afterClear = await read();
  await zoom('zoom-count-2-cleared.png');
  console.log('afterClear', JSON.stringify(results.steps.afterClear), 'field', results.steps.fieldBeforeClear, '->', results.steps.fieldAfterClear);

  // 4. type again, fold, then undo with the section folded
  await openField();
  await client.send('Input.insertText', { text: CLASS });
  await sleep(300);
  await setOpen(false);
  await sleep(500);
  results.steps.retyped = await read();
  results.steps.undo = await ev(`(() => { const u = ${req('models/undo-queue-model.ts')}; const q = (u.UndoQueue || u.default).instance; const label = q.getUndoLabel ? q.getUndoLabel() : null; q.undo(); return String(label); })()`);
  await sleep(800);
  results.steps.afterFoldedUndo = await read();
  await zoom('zoom-count-3-folded-undo.png');
  console.log('retyped', JSON.stringify(results.steps.retyped), 'undo', results.steps.undo, 'afterFoldedUndo', JSON.stringify(results.steps.afterFoldedUndo));

  fs.writeFileSync(path.join(outDir, 'footer-count-results.json'), JSON.stringify(results, null, 2));
  console.log('wrote', outDir);
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
