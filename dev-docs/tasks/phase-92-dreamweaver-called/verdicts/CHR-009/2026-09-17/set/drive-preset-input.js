// CHR-009 §2 (s23) — the `Preset` and `Size` rows, driven with a real mouse on the Button added by drive-set.js.
//
// Open Preset: the list must sit under the FIELD (not the label) and be reachable; pick the 2nd option: `_variant` and
// the field text change; Escape on a re-opened list closes it. Press Size `lg`: `_size` changes and `lg` is pressed.
// Undo twice: both back. Screenshot the open list.
//
//   NOODL_REMOTE_DEBUG_PORT=9333 node drive-preset-input.js --expect=<scratch copy dir> [--out=<dir>]
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const outDir = opt('out', path.join(__dirname, 'preset'));
const EXPECT = opt('expect', '');
const ID = 'chr009-set-button-popout';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const client = await connect(await appTarget());
  await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1368, height: 900, deviceScaleFactor: 2, mobile: false });
  const ev = (e) => evaluate(client, e);
  const mod = (suffix) => `(() => { let r; window.webpackChunknoodl_editor.push([['drv-' + Math.floor(Math.random() * 1e9)], {}, (x) => { r = x; }]); return r(Object.keys(r.m).find((k) => k.endsWith('${suffix}'))); })()`;
  const dir = await ev(`${mod('models/projectmodel.ts')}.ProjectModel.instance._retainedProjectDirectory`);
  if (!EXPECT || dir !== EXPECT) throw new Error('refusing to drive a project that is not the scratch copy: ' + dir);
  await ev(`document.documentElement.setAttribute('data-theme', 'dark')`);
  await ev(`(() => { const ed = window.__nodeGraphEditor; ed.selectNode(ed.findNodeWithId('${ID}')); })()`);
  await sleep(2500);

  const model = `window.__nodeGraphEditor.findNodeWithId('${ID}').model`;
  const params = async () => JSON.parse(await ev(`JSON.stringify({ variant: ${model}.parameters._variant ?? null, size: ${model}.parameters._size ?? null })`));
  const P = `document.querySelector('.sidebar-property-editor')`;
  const trigger = `${P}.querySelector('[class*="VariantSelector-module__VariantSelector-trigger"]')`;
  const press = async (expr) => {
    const pt = JSON.parse(await ev(`(() => { const el = ${expr}; if (!el) return JSON.stringify({ missing: true }); const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const hit = document.elementFromPoint(x, y); return JSON.stringify({ x, y, reachable: !!hit && (hit === el || el.contains(hit)) }); })()`));
    if (!pt.reachable) throw new Error('not reachable ' + expr + ' ' + JSON.stringify(pt));
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await client.send('Input.dispatchMouseEvent', { type, x: pt.x, y: pt.y, button: 'left', clickCount: type === 'mouseMoved' ? 0 : 1 });
    }
    await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
    await sleep(700);
  };
  const r = { before: await params() };
  r.fieldBefore = await ev(`${trigger}.textContent.trim()`);

  await press(trigger);
  r.open = JSON.parse(await ev(`(() => { const l = ${P}.querySelector('[role="listbox"]'); const t = ${trigger}.getBoundingClientRect(); const lab = ${P}.querySelector('[class*="VariantSelector-module__VariantSelector-label"]').getBoundingClientRect(); if (!l) return 'null'; const b = l.getBoundingClientRect(); return JSON.stringify({ options: [...l.querySelectorAll('[role=option]')].map((o) => o.textContent.trim()), listLeft: Math.round(b.left), listRight: Math.round(b.right), fieldLeft: Math.round(t.left), fieldRight: Math.round(t.right), labelRight: Math.round(lab.right), listTop: Math.round(b.top), fieldBottom: Math.round(t.bottom) }); })()`));
  const box = JSON.parse(await ev(`(() => { const r = ${P}.getBoundingClientRect(); return JSON.stringify({ x: r.x, y: 140, w: r.width }); })()`));
  const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { x: box.x, y: box.y, width: box.w, height: 320, scale: 2 } });
  fs.writeFileSync(path.join(outDir, 'preset-open-dark.png'), Buffer.from(data, 'base64'));
  await press(`${P}.querySelectorAll('[role="listbox"] [role=option]')[1]`);
  r.afterPick = { params: await params(), field: await ev(`${trigger}.textContent.trim()`), listOpen: await ev(`!!${P}.querySelector('[role="listbox"]')`) };

  await press(trigger);
  const openedAgain = await ev(`!!${P}.querySelector('[role="listbox"]')`);
  for (const type of ['keyDown', 'keyUp']) await client.send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(500);
  r.escape = { openedAgain, openAfterEscape: await ev(`!!${P}.querySelector('[role="listbox"]')`) };

  await press(`[...${P}.querySelectorAll('[class*="SizePicker-module__SizePicker-option"]')].find((b) => b.textContent.trim() === 'lg')`);
  r.afterSize = { params: await params(), pressed: await ev(`[...${P}.querySelectorAll('[class*="SizePicker-module__SizePicker-option"]')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.textContent.trim()).join(',')`), groupHeight: await ev(`Math.round(${P}.querySelector('[class*="SizePicker-module__SizePicker-group"]').getBoundingClientRect().height)`) };

  await ev(`window.__nodeGraphEditor.undo()`);
  await sleep(900);
  r.undo1 = await params();
  await ev(`window.__nodeGraphEditor.undo()`);
  await sleep(900);
  r.undo2 = { params: await params(), field: await ev(`${trigger}.textContent.trim()`) };

  console.log(JSON.stringify(r, null, 1));
  fs.writeFileSync(path.join(outDir, 'preset-input-results.json'), JSON.stringify(r, null, 2));
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
