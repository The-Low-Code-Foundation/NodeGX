// CHR-008 §3.5 — take 2. What happens to a focused field and its caret when the panel rebuilds
// its rows?
//
// 🔴 Take 1 and the probe both graded NOTHING, and it is worth writing down why: every candidate
// wrote through `NodeGraphNode.setParameter` directly. The value lands in `parameters` (take 1's
// end reading proves it) and the panel never hears about it — the rows are bound to a `ModelProxy`,
// and `Ports.bindModel` listens for `instancePortsChanged` / `modelParameterUndo`, not for a raw
// model write. So `rows`, `gatedWrappers` and the marked element were IDENTICAL in all four arms.
// An arm that reads the same as its own control grades nothing.
//
// The two controls below are person's gestures that genuinely reach the panel:
//   P  a real click on the `Shadow Enabled` checkbox — the write goes through the row, so through
//      ModelProxy. Establishes whether a port-list change rebuilds at all on this build.
//   U  `__nodeGraphEditor.undo()` — a Cmd+Z. `modelParameterUndo` CLEARS `_portsHash` and rebuilds
//      every row, by construction (`Ports.bindModel`). This is the firing control §3.5 needs.
//   N  (negative) a direct model write while focused — known inert, kept so the reading has a floor.
//
// Every arm records whether the rebuild ACTUALLY happened (marked element disconnected, row
// elements replaced) BEFORE anything is claimed about focus.
//   NOODL_REMOTE_DEBUG_PORT=9333 node focus2.js <outDir>
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const outDir = process.argv.slice(2).find((a) => !a.startsWith('--'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HELPERS = `
  window.__chr = window.__chr || {};
  __chr.sel = '.sidebar-property-editor';
  __chr.group = (name) => [...document.querySelectorAll(__chr.sel + ' .property-group')].find((x) => {
    const n = x.querySelector(':scope > .property-group-label .property-group-name');
    return n && n.textContent.trim() === name; });
  __chr.widthInput = () => { const g = __chr.group('Dimensions'); return g ? g.querySelectorAll('input[type=text]')[0] : null; };
  __chr.heightInput = () => { const g = __chr.group('Dimensions'); return g ? g.querySelectorAll('input[type=text]')[2] : null; };
  __chr.scroller = () => { const ed = document.querySelector(__chr.sel); let s = ed && ed.parentElement;
    while (s) { const cs = getComputedStyle(s); if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && s.scrollHeight > s.clientHeight + 1) return s; s = s.parentElement; } return null; };
  __chr.node = () => { const n = window.__nodeGraphEditor.findNodeWithId('psWrap'); return n ? (n.model || n) : null; };
  __chr.state = () => ({ rows: document.querySelectorAll(__chr.sel + ' .properties > *').length,
    gatedWrappers: document.querySelectorAll(__chr.sel + ' .property-port-gated').length,
    groups: document.querySelectorAll(__chr.sel + ' .property-group').length,
    scrollTop: Math.round((__chr.scroller() || {}).scrollTop || 0) });

  // Arm: mark the focused element and the first row element, and watch the rows for replacement.
  __chr.arm = () => {
    const i = document.activeElement;
    __chr.focusMark = i;
    __chr.rowMark = document.querySelector(__chr.sel + ' .properties > *');
    __chr.rowMutations = 0;
    const groups = document.querySelector(__chr.sel + ' .groups');
    __chr.rmo = new MutationObserver((m) => m.forEach((r) => { if (r.type === 'childList') __chr.rowMutations += r.addedNodes.length + r.removedNodes.length; }));
    if (groups) __chr.rmo.observe(groups, { childList: true, subtree: true });
    return JSON.stringify({ focusedIsWidth: i === __chr.widthInput(), tag: i.tagName, value: i.value,
      caret: i.selectionStart, ...__chr.state(), heightValue: (__chr.heightInput() || {}).value,
      params: JSON.stringify(__chr.node().parameters) });
  };
  __chr.readBack = () => {
    const a = document.activeElement;
    return JSON.stringify({
      // ——— did the rebuild fire? read this BEFORE believing anything below it ———
      REBUILT: !(__chr.rowMark && __chr.rowMark.isConnected) || __chr.rowMutations > 0,
      rowMarkStillConnected: !!(__chr.rowMark && __chr.rowMark.isConnected),
      focusedStillConnected: !!(__chr.focusMark && __chr.focusMark.isConnected),
      rowMutations: __chr.rowMutations,
      // ——— what it cost the person ———
      sameElementFocused: a === __chr.focusMark, activeTag: a ? a.tagName : null,
      activeIsBody: a === document.body, widthIsFocused: __chr.widthInput() === a,
      caret: a && a.selectionStart !== undefined ? a.selectionStart : null,
      widthValue: (__chr.widthInput() || {}).value, heightValue: (__chr.heightInput() || {}).value,
      ...__chr.state() });
  };
  __chr.disarm = () => { __chr.rmo && __chr.rmo.disconnect(); return 'ok'; };
  'ok';
`;

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const client = await connect(await appTarget());
  await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1368, height: 900, deviceScaleFactor: 1, mobile: false });
  const ev = (e) => evaluate(client, e);
  const waitFor = async (expr, ms = 60000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { try { if ((await ev(expr)) === true) return; } catch (e) {} await sleep(400); }
    throw new Error('timed out waiting for ' + expr);
  };
  const key = async (k, code, vk, text) => {
    await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, text });
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk });
  };
  const shoot = async (name) => {
    const { data } = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(data, 'base64'));
  };
  const clickAt = async (x, y) => {
    const base = { x, y, clickCount: 1 };
    await client.send('Input.dispatchMouseEvent', { ...base, type: 'mouseMoved', button: 'none', buttons: 0 });
    await client.send('Input.dispatchMouseEvent', { ...base, type: 'mousePressed', button: 'left', buttons: 1 });
    await client.send('Input.dispatchMouseEvent', { ...base, type: 'mouseReleased', button: 'left', buttons: 0 });
  };

  await waitFor(`!!window.__nodeGraphEditor && !!window.__nodeGraphEditor.getActiveComponent()`);
  await ev(HELPERS);
  console.log('select:', await ev(`(() => { const ed = window.__nodeGraphEditor;
    const c = ed.getActiveComponent().owner.getComponentWithName('/Story/Passage'); if (!c) return 'no component';
    if (ed.getActiveComponent() !== c) ed.switchToComponent(c, { pushHistory: false });
    const n = ed.findNodeWithId('psWrap'); if (!n) return 'no node';
    ed.selectNode(n); return 'selected ' + (n.model || n).type.name; })()`));
  await waitFor(`!!(__chr.widthInput() && __chr.scroller())`, 30000);
  await sleep(1500);

  const results = { instrument: await ev('location.href'), note: 'packaged 0.2.4, no compile', arms: {} };
  results.baseline = JSON.parse(await ev(`JSON.stringify({ ...__chr.state(), params: JSON.stringify(__chr.node().parameters) })`));
  console.log('baseline:', JSON.stringify(results.baseline));

  // Put the caret mid-text in Width, as someone part-way through an edit has it.
  const focusWidthMidEdit = async () => {
    await ev(`(() => { const i = __chr.widthInput(); i.scrollIntoView({ block: 'center' }); i.focus(); i.select(); })()`);
    await client.send('Input.insertText', { text: '250' });
    await key('ArrowLeft', 'ArrowLeft', 37, undefined);
    await sleep(250);
    return JSON.parse(await ev(`__chr.arm()`));
  };

  // ---- P: a real click on a checkbox in the panel — does a ModelProxy write rebuild the rows?
  const box = await ev(`(() => { const g = __chr.group('Box Shadow') || __chr.group('Shadow');
    const cb = (g || document.querySelector(__chr.sel)).querySelector('input[type=checkbox]');
    if (!cb) return null; const r = cb.getBoundingClientRect();
    return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }); })()`);
  if (box) {
    const p = JSON.parse(box);
    await ev(`(() => { document.activeElement && document.activeElement.blur(); __chr.focusMark = document.body; return 1; })()`);
    await ev(`__chr.arm()`);
    const beforeP = JSON.parse(await ev(`JSON.stringify(__chr.state())`));
    await clickAt(p.x, p.y);
    await sleep(700);
    const afterP = JSON.parse(await ev(`__chr.readBack()`));
    await ev(`__chr.disarm()`);
    results.arms.P = { control: 'a real click on a panel checkbox (ModelProxy write)', point: p, before: beforeP, after: afterP };
    console.log('P:', JSON.stringify(results.arms.P));
  } else {
    results.arms.P = { skipped: 'no checkbox found in the panel' };
  }

  // ---- U: the firing control. An undoable edit exists first, then Cmd+Z while Width is focused.
  await ev(`document.activeElement && document.activeElement.blur()`);
  await sleep(300);
  // A real, undoable edit through the UI: type into Height and commit it.
  await ev(`(() => { const i = __chr.heightInput(); i.scrollIntoView({ block: 'center' }); i.focus(); i.select(); })()`);
  await client.send('Input.insertText', { text: '321' });
  await key('Enter', 'Enter', 13, '\r');
  await ev(`document.activeElement && document.activeElement.blur()`);
  await sleep(700);
  const heightSet = JSON.parse(await ev(`JSON.stringify({ height: JSON.stringify(__chr.node().parameters.height), shown: (__chr.heightInput() || {}).value })`));
  console.log('U setup — height now:', JSON.stringify(heightSet));

  const beforeU = await focusWidthMidEdit();
  await shoot('focus-U-before');
  await ev(`window.__nodeGraphEditor.undo()`);
  await sleep(60);
  const uTick = JSON.parse(await ev(`__chr.readBack()`));
  await sleep(700);
  const uSettled = JSON.parse(await ev(`__chr.readBack()`));
  await ev(`__chr.disarm()`);
  await shoot('focus-U-after');
  results.arms.U = { control: 'undo (Cmd+Z) — modelParameterUndo clears the hash and rebuilds every row',
    setup: heightSet, before: beforeU, nextTick: uTick, after700ms: uSettled };
  console.log('U:', JSON.stringify(results.arms.U));

  // ---- N: the negative control — a write the panel does not hear.
  await ev(`document.activeElement && document.activeElement.blur()`);
  await sleep(300);
  const beforeN = await focusWidthMidEdit();
  await ev(`__chr.node().setParameter('opacity', 0.5, { undo: true, label: 'drive inert' })`);
  await sleep(60);
  const nTick = JSON.parse(await ev(`__chr.readBack()`));
  await ev(`__chr.disarm()`);
  results.arms.N = { control: 'a direct model write — the panel never hears it (floor)', before: beforeN, nextTick: nTick };
  console.log('N:', JSON.stringify(results.arms.N));

  await ev(`document.activeElement && document.activeElement.blur()`);
  results.end = JSON.parse(await ev(`JSON.stringify({ ...__chr.state(), params: JSON.stringify(__chr.node().parameters) })`));
  console.log('end:', JSON.stringify(results.end));

  await client.send('Emulation.clearDeviceMetricsOverride');
  fs.writeFileSync(path.join(outDir, 'focus-results.json'), JSON.stringify(results, null, 2));
  console.log('done');
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
