// CHR-009 slice 11 (s24) — the icon row and the popout button as fields, driven with a real mouse on the Button added
// by drive-set.js.
//
// Turn the Icon group on through its gate line; the Icon Source field reads `None`; press it: the picker opens and does
// not cover the field; pick a glyph: the model and the field name change. Press the popout's `Edit`: it opens. The
// named state is set on the model (the copy has no icon set to pick from). Undo the turn-on; clear the value. Screenshots of each state, both themes for the rows.
//
//   NOODL_REMOTE_DEBUG_PORT=9333 node drive-icon.js --expect=<scratch copy dir> [--out=<dir>] [--explore]
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const outDir = opt('out', path.join(__dirname, 'slice11'));
const EXPECT = opt('expect', '');
const EXPLORE = args.includes('--explore');
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
  const params = async () => JSON.parse(await ev(`JSON.stringify({ useIcon: ${model}.parameters.useIcon ?? null, iconIconSource: ${model}.parameters.iconIconSource ?? null })`));
  const P = `document.querySelector('.sidebar-property-editor')`;
  const field = `${P}.querySelector('[class*="IconInput-module__IconField"]')`;
  const rect = async (expr) => JSON.parse(await ev(`(() => { const el = ${expr}; if (!el) return 'null'; const r = el.getBoundingClientRect(); return JSON.stringify({ left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), height: Math.round(r.height) }); })()`));
  const press = async (expr) => {
    await ev(`(() => { const el = ${expr}; if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' }); })()`);
    await sleep(400);
    const pt = JSON.parse(await ev(`(() => { const el = ${expr}; if (!el) return JSON.stringify({ missing: true }); const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const hit = document.elementFromPoint(x, y); return JSON.stringify({ x, y, reachable: !!hit && (hit === el || el.contains(hit)) }); })()`));
    if (!pt.reachable) throw new Error('not reachable ' + expr + ' ' + JSON.stringify(pt));
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await client.send('Input.dispatchMouseEvent', { type, x: pt.x, y: pt.y, button: 'left', clickCount: type === 'mouseMoved' ? 0 : 1 });
    }
    await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
    await sleep(900);
  };
  const shoot = async (name, clip) => {
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 2 } });
    fs.writeFileSync(path.join(outDir, name), Buffer.from(data, 'base64'));
  };
  const rowCrop = async (name) => {
    const f = await rect(field);
    const p = await rect(P);
    for (const theme of ['dark', 'light']) {
      await ev(`document.documentElement.setAttribute('data-theme', '${theme}')`);
      await sleep(800);
      await shoot(`${name}-${theme}.png`, { x: p.left, y: Math.max(0, f.top - 150), width: p.right - p.left, height: 320 });
    }
    await ev(`document.documentElement.setAttribute('data-theme', 'dark')`);
    await sleep(500);
  };
  const popout = `[...document.querySelectorAll('.popup-layer-popout')].filter((e) => e.offsetParent !== null).pop()`;

  const r = { before: await params() };
  await press(`[...${P}.querySelectorAll('a, button, [role=button]')].find((b) => b.textContent.trim() === 'Turn on' && b.closest('.property-group-body, .property-group, [class]') && b.parentElement.textContent.includes('Icon Source'))`);
  r.turnedOn = { params: await params(), fieldText: await ev(`${field} && ${field}.textContent.trim()`), field: await rect(field) };
  await rowCrop('icon-on-none');

  await press(field);
  r.picker = { open: await ev(`!!(${popout})`), box: await rect(popout), field: await rect(field) };
  if (EXPLORE) console.log(await ev(`(${popout}) ? (${popout}).outerHTML.slice(0, 3000) : 'no popout'`));
  await shoot('icon-picker-open-dark.png', { x: 0, y: 0, width: 1368, height: 900 });
  const closePopout = async () => {
    for (const type of ['keyDown', 'keyUp']) await client.send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sleep(700);
    if (await ev(`!!(${popout})`)) {
      // 🔴 Neither Escape nor `.popup-layer-blocker.click()` closes the icon picker; a real press on the blocker does.
      for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
        await client.send('Input.dispatchMouseEvent', { type, x: 1300, y: 60, button: 'left', clickCount: type === 'mouseMoved' ? 0 : 1 });
      }
      await sleep(900);
    }
    return ev(`!!(${popout})`);
  };
  // The picker must not cover the field it edits (s19's trap: a popout opens right of its anchor).
  r.picker.coversField = !!(r.picker.box && r.picker.field && r.picker.box.left < r.picker.field.right && r.picker.box.right > r.picker.field.left && r.picker.box.top < r.picker.field.bottom && r.picker.box.bottom > r.picker.field.top);
  r.picker.openAfterClose = await closePopout();

  // 🔴 The scratch copy has NO icon set installed, so the picker offers nothing to pick. The named state is set on the
  // model (a lucide value as the templates store it) and the node reselected so the panel redraws — a setup write is
  // invisible to an open panel — and removed again at the end.
  const reselect = async () => {
    await ev(`(() => { const ed = window.__nodeGraphEditor; const other = ed.getActiveComponent().graph.roots.find((n) => n.id !== '${ID}'); ed.selectNode(ed.findNodeWithId(other.id)); })()`);
    await sleep(1200);
    await ev(`(() => { const ed = window.__nodeGraphEditor; ed.selectNode(ed.findNodeWithId('${ID}')); })()`);
    await sleep(2000);
  };
  await ev(`${model}.setParameter('iconIconSource', { class: 'lucide', code: 'icon-star', codeAsClass: true })`);
  await reselect();
  r.named = { params: await params(), fieldText: await ev(`${field}.textContent.trim()`), glyph: await ev(`!!${field}.querySelector('[class*="IconInput-module__Glyph"]')`), field: await rect(field) };
  await rowCrop('icon-named');

  const edit = `[...${P}.querySelectorAll('[class*="PropertyPanelButton-module__Button"]')].find((b) => b.textContent.trim() === 'Edit')`;
  r.edit = { box: await rect(edit) };
  await press(edit);
  r.edit.open = await ev(`!!(${popout})`);
  r.edit.popout = await rect(popout);
  await shoot('edit-popout-open-dark.png', { x: 0, y: 0, width: 1368, height: 900 });
  r.edit.coversButton = !!(r.edit.popout && r.edit.box && r.edit.popout.left < r.edit.box.right && r.edit.popout.right > r.edit.box.left && r.edit.popout.top < r.edit.box.bottom && r.edit.popout.bottom > r.edit.box.top);
  r.edit.openAfterClose = await closePopout();
  const editRow = await rect(edit);
  const p = await rect(P);
  for (const theme of ['dark', 'light']) {
    await ev(`document.documentElement.setAttribute('data-theme', '${theme}')`);
    await sleep(800);
    await shoot(`edit-row-${theme}.png`, { x: p.left, y: Math.max(0, editRow.top - 150), width: p.right - p.left, height: 320 });
  }
  await ev(`document.documentElement.setAttribute('data-theme', 'dark')`);

  await ev(`${model}.setParameter('iconIconSource', undefined)`);
  await ev(`window.__nodeGraphEditor.undo()`);
  await sleep(1000);
  await reselect();
  r.undone = { params: await params(), fieldText: await ev(`${field} && ${field}.textContent.trim()`) };

  console.log(JSON.stringify(r, null, 1));
  fs.writeFileSync(path.join(outDir, 'icon-input-results.json'), JSON.stringify(r, null, 2));
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
