// CHR-009 slice 1 — the merged Width field still does what the four boxes did.
//
// Real input only: a CDP mouse click on `Fixed`, CDP `Input.insertText` into Width (a synthetic
// `input` event commits nothing through a controlled field that commits on blur — CHR-008 §10.9),
// each read back from the MODEL and then undone. Bounded retries, never a single snapshot.
//
//   NOODL_REMOTE_DEBUG_PORT=9333 node interact.js   (after drive.js has selected the Group)
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const client = await connect(await appTarget());
  await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1368, height: 900, deviceScaleFactor: 2, mobile: false });
  const ev = (e) => evaluate(client, e);
  const until = async (expr, ms = 3000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v; try { v = await ev(expr); } catch (e) { v = false; /* the row is mid-rebuild */ } if (v === true) return Date.now() - t0; await sleep(100); } return null; };
  const model = `window.__nodeGraphEditor.findNodeWithId('app_root').model`;
  const row = (label) => `[...document.querySelectorAll('.sidebar-property-editor [class*="PropertyPanelInput-module__Label"]')].find((l) => l.textContent.trim() === '${label}').parentElement`;
  const click = async (expr) => {
    const r = JSON.parse(await ev(`(() => { const el = ${expr}; el.scrollIntoView({ block: 'center' }); const b = el.getBoundingClientRect(); const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return JSON.stringify({ x: b.x + b.width / 2, y: b.y + b.height / 2, reachable: el === hit || el.contains(hit) }); })()`));
    await sleep(300);
    for (const type of ['mousePressed', 'mouseReleased']) await client.send('Input.dispatchMouseEvent', { type, x: r.x, y: r.y, button: 'left', clickCount: 1 });
    return r;
  };
  const out = {};

  await ev(`window.__nodeGraphEditor.selectNode(window.__nodeGraphEditor.findNodeWithId('app_root'))`);
  await sleep(1500);

  // Arm 1 — Fixed.
  const fixedBtn = `[...${row('Width')}.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Fixed')`;
  out.fixedBefore = JSON.parse(await ev(`JSON.stringify({ pressed: ${fixedBtn}.getAttribute('aria-pressed'), params: Object.fromEntries(Object.entries(${model}.parameters).filter(([k]) => /fixed|sizing|width/i.test(k))) })`));
  out.fixedClick = await click(fixedBtn);
  out.fixedPressedMs = await until(`${fixedBtn}.getAttribute('aria-pressed') === 'true'`);
  out.fixedAfter = JSON.parse(await ev(`JSON.stringify({ pressed: ${fixedBtn}.getAttribute('aria-pressed'), params: Object.fromEntries(Object.entries(${model}.parameters).filter(([k]) => /fixed|sizing|width/i.test(k))) })`));
  await ev(`window.__nodeGraphEditor.undo()`);
  out.fixedUndoMs = await until(`${fixedBtn}.getAttribute('aria-pressed') === 'false'`);

  // Arm 2 — type into Width, blur, read the model; then undo re-seeds the field.
  const widthInput = `${row('Width')}.querySelector('input')`;
  out.widthBefore = await ev(`JSON.stringify(${model}.parameters.width)`);
  await click(widthInput);
  await ev(`(() => { const i = ${widthInput}; i.focus(); i.select(); return true; })()`);
  await client.send('Input.insertText', { text: '64' });
  await sleep(200);
  await ev(`${widthInput}.blur()`);
  out.widthCommitMs = await until(`JSON.stringify(${model}.parameters.width || '').indexOf('64') !== -1`);
  out.widthAfter = await ev(`JSON.stringify(${model}.parameters.width)`);
  out.widthFieldAfter = await ev(`${widthInput}.value`);
  await ev(`window.__nodeGraphEditor.undo()`);
  out.widthUndoModelMs = await until(`JSON.stringify(${model}.parameters.width) === ${JSON.stringify(out.widthBefore)}`);
  out.widthUndoFieldMs = await until(`${widthInput}.value === '100'`);
  out.widthFieldAfterUndo = await ev(`${widthInput}.value`);

  console.log(JSON.stringify(out, null, 2));
  fs.writeFileSync(path.join(__dirname, 'after', 'interact-results.json'), JSON.stringify(out, null, 2));
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
