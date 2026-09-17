// CHR-009 slice 12 (s25) — the list rows' actions as one control, driven with a real mouse and real typing on the
// States (string list) and Function (prop list) nodes that drive-set.js added.
//
// Per node: press `+`, type a name, Enter ⇒ the entry is stored on the model and drawn with its rename/delete icons;
// press the rename icon ⇒ the name field opens, type a new name, Enter ⇒ the model renames it; press `</>` ⇒ the JSON
// editor opens; close it; press delete ⇒ the entry leaves the model. Screenshots of the populated list, both themes.
//
//   NOODL_REMOTE_DEBUG_PORT=9333 node drive-lists.js --expect=<scratch copy dir> [--out=<dir>]
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const outDir = opt('out', path.join(__dirname, 'slice12'));
const EXPECT = opt('expect', '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TARGETS = [
  { id: 'chr009-set-states', port: 'states', label: 'states' },
  { id: 'chr009-set-function', port: 'scriptInputs', label: 'function' }
];

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

  const P = `document.querySelector('.sidebar-property-editor')`;
  const rect = async (expr) => JSON.parse(await ev(`(() => { const el = ${expr}; if (!el) return 'null'; const r = el.getBoundingClientRect(); return JSON.stringify({ left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom) }); })()`));
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
  const type = async (text) => {
    await client.send('Input.insertText', { text });
    await sleep(200);
  };
  const key = async (k, code, vk) => {
    for (const t of ['keyDown', 'keyUp']) await client.send('Input.dispatchKeyEvent', { type: t, key: k, code, windowsVirtualKeyCode: vk });
    await sleep(900);
  };
  const shoot = async (name, clip) => {
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 2 } });
    fs.writeFileSync(path.join(outDir, name), Buffer.from(data, 'base64'));
  };
  const popout = `[...document.querySelectorAll('.popup-layer-popout')].filter((e) => e.offsetParent !== null).pop()`;

  const results = {};
  for (const t of TARGETS) {
    const r = (results[t.label] = {});
    await ev(`(() => { const ed = window.__nodeGraphEditor; ed.selectNode(ed.findNodeWithId('${t.id}')); })()`);
    await sleep(2500);
    const model = `window.__nodeGraphEditor.findNodeWithId('${t.id}').model`;
    const stored = async () => ev(`JSON.stringify(${model}.parameters['${t.port}'] ?? null)`);
    const add = `${P}.querySelector('[data-test=list-add-entry]')`;
    const code = `${P}.querySelector('[data-test=list-edit-json]')`;
    const nameField = `${P}.querySelector('input.name-edit')`;
    const iconsIn = (label) => `[...${P}.querySelectorAll('.component-ports-item, .proplist-item')].find((row) => row.textContent.includes('${label}'))`;

    r.before = await stored();
    r.oldFaIcons = await ev(`${P}.querySelectorAll('.fa-plus, .fa-code, .fa-trash-o, .fa-pencil-square-o').length`);

    await press(add);
    r.fieldOpenAfterAdd = await ev(`!!(${nameField}) && document.activeElement === ${nameField}`);
    await type('Alpha');
    await key('Enter', 'Enter', 13);
    r.afterAdd = await stored();
    const row = iconsIn('Alpha');
    r.rowDrawn = await ev(`!!(${row})`);
    r.rowButtons = await ev(`(() => { const row = ${row}; return row ? [...row.querySelectorAll('button')].map((b) => b.className.includes('IconButton') ? 'IconButton' : b.className) : null; })()`);
    // The entry's HEADER (a prop list item also hosts its child rows): its height, and how far the name's centre sits
    // from the icons' centre — the first build drew the name 9px below the icons, which only the PNG showed.
    r.entry = JSON.parse(await ev(`(() => { const row = ${row}; if (!row) return 'null'; const head = row.querySelector('.proplist-header') || row; const c = (el) => { const b = el.getBoundingClientRect(); return b.top + b.height / 2; }; const label = head.querySelector('.component-ports-label'); const btn = head.querySelector('button'); const range = document.createRange(); range.selectNodeContents(label); const tb = range.getBoundingClientRect(); return JSON.stringify({ height: Math.round(head.getBoundingClientRect().height), textCentreMinusIconCentre: Math.round(tb.top + tb.height / 2 - c(btn)), textInsideRow: tb.top >= head.getBoundingClientRect().top && tb.bottom <= head.getBoundingClientRect().bottom }); })()`));
    r.actions = await rect(`${add}.closest('[class*="ListInputRow-module__Actions"]')`);

    const p = await rect(P);
    const g = await rect(`${add}.closest('.property-group')`);
    for (const theme of ['dark', 'light']) {
      await ev(`document.documentElement.setAttribute('data-theme', '${theme}')`);
      await sleep(800);
      await shoot(`${t.label}-one-entry-${theme}.png`, { x: p.left, y: Math.max(0, g.top - 40), width: p.right - p.left, height: g.bottom - g.top + 80 });
    }
    await ev(`document.documentElement.setAttribute('data-theme', 'dark')`);
    await sleep(500);

    // Rename through the row's pencil (the first icon in its bar).
    await press(`${iconsIn('Alpha')}.querySelectorAll('button')[0]`);
    r.renameFieldOpen = await ev(`!!(${nameField})`);
    await ev(`(${nameField}) && (${nameField}).select()`);
    await type('Beta');
    await key('Enter', 'Enter', 13);
    r.afterRename = await stored();

    await press(code);
    r.jsonEditorOpen = await ev(`!!(${popout})`);
    r.jsonEditorBox = await rect(popout);
    await shoot(`${t.label}-json-open-dark.png`, { x: 0, y: 0, width: 1368, height: 900 });
    await key('Escape', 'Escape', 27);
    if (await ev(`!!(${popout})`)) await press(`document.querySelector('.popup-layer-blocker')`);
    r.jsonEditorClosed = !(await ev(`!!(${popout})`));
    r.afterJson = await stored();

    // Delete through the row's trash (the last icon in its bar).
    await press(`[...${iconsIn('Beta')}.querySelectorAll('button')].pop()`);
    r.afterDelete = await stored();
    console.log(t.label, JSON.stringify(r));
  }
  fs.writeFileSync(path.join(outDir, 'lists-results.json'), JSON.stringify(results, null, 1));
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
