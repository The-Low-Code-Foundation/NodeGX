// CHR-008 §3.2 — does FB-017 AC4's structural hint still draw, now that it is a post-commit pass?
//
// 🔴 This is the one shipped behaviour this slice MOVED. `PropertyRow` only marks the row with
// `data-hint-ports`; the note itself is drawn by `applyPortHint`, called from a `setTimeout(0)` after
// React commits. Two paths can break independently:
//
//   RENDER path — select a node that already qualifies: the note must be there after the panel draws.
//   LIVE path   — type a radius while the panel is open: `Ports.refreshHints` hears `parametersChanged`
//                 and must add the note IN PLACE, without rebuilding the row (FB-017's whole reason).
//
// A hint needs all three (`propertyPanelHints.ts`): a non-zero corner radius, at least one child, and
// the children NOT clipped. `psWrap` is a Group with children and no radius, so the census read zero
// hints correctly — and never exercised this at all.
//
// The write must go through the PANEL, not `NodeGraphNode.setParameter`: a direct model write does not
// reach the rows (measured in §8.2), so it would grade nothing.
//
//   NOODL_REMOTE_DEBUG_PORT=9333 node hint.js <outDir>
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const outDir = process.argv.slice(2).find((a) => !a.startsWith('--'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HELPERS = `
  window.__h = window.__h || {};
  __h.sel = '.sidebar-property-editor';
  __h.group = (name) => [...document.querySelectorAll(__h.sel + ' .property-group')].find((x) => {
    const n = x.querySelector(':scope > .property-group-label .property-group-name');
    return n && n.textContent.trim() === name; });
  __h.expand = (name) => { const g = __h.group(name); if (!g) return 'no group';
    const l = g.querySelector(':scope > .property-group-label');
    if (l.getAttribute('aria-expanded') !== 'true') l.click();
    return l.getAttribute('aria-expanded'); };
  __h.node = () => { const n = window.__nodeGraphEditor.findNodeWithId('psWrap'); return n ? (n.model || n) : null; };
  __h.state = () => ({
    hints: document.querySelectorAll(__h.sel + ' .property-structural-hint').length,
    hintTexts: [...document.querySelectorAll(__h.sel + ' .property-structural-hint')].map((h) => h.textContent.trim().slice(0, 60)),
    marked: document.querySelectorAll(__h.sel + ' [data-hint-ports]').length,
    hintedHosts: document.querySelectorAll(__h.sel + ' .property-structural-hint-host').length,
    rows: document.querySelectorAll(__h.sel + ' .properties > *').length,
    radius: JSON.stringify(__h.node().parameters.borderRadius),
    clip: JSON.stringify(__h.node().parameters.clip),
    children: (window.__nodeGraphEditor.findNodeWithId('psWrap').children || []).length
  });
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
    while (Date.now() - t0 < ms) { try { if ((await ev(expr)) === true) return true; } catch (e) {} await sleep(400); }
    return false;
  };
  const key = async (k, code, vk, text) => {
    await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, text });
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk });
  };
  const shoot = async (name) => {
    const { data } = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(data, 'base64'));
  };
  const select = (id) => ev(`(() => { const ed = window.__nodeGraphEditor;
    const c = ed.getActiveComponent().owner.getComponentWithName('/Story/Passage'); if (!c) return 'no component';
    if (ed.getActiveComponent() !== c) ed.switchToComponent(c, { pushHistory: false });
    const n = ed.findNodeWithId(${JSON.stringify(id)}); if (!n) return 'no node';
    ed.selectNode(n); return 'selected ' + (n.model || n).type.name; })()`);

  await waitFor(`!!window.__nodeGraphEditor && !!window.__nodeGraphEditor.getActiveComponent()`);
  await ev(HELPERS);
  console.log('select:', await select('psWrap'));
  await waitFor(`!!document.querySelector('.sidebar-property-editor .property-group')`, 20000);
  await sleep(1500);

  const results = { instrument: await ev('location.href') };
  results.baseline = JSON.parse(await ev(`JSON.stringify(__h.state())`));
  console.log('baseline:', JSON.stringify(results.baseline));

  if (results.baseline.children === 0) {
    console.log('🔴 psWrap has no children — a hint can never apply here; this drive would grade nothing.');
    fs.writeFileSync(path.join(outDir, 'hint-results.json'), JSON.stringify({ ...results, aborted: 'no children' }, null, 2));
    process.exit(1);
  }

  // ---- LIVE path: type a radius into the panel and watch for the note, in place.
  console.log('expand Corner Radius:', await ev(`__h.expand('Corner Radius')`));
  await sleep(800);
  const field = await ev(`(() => { const g = __h.group('Corner Radius'); if (!g) return null;
    const i = g.querySelector('input[type=text]'); if (!i) return null;
    i.scrollIntoView({ block: 'center' }); const r = i.getBoundingClientRect();
    return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2, value: i.value }); })()`);
  if (!field) {
    console.log('🔴 no radius field found — not grading the live path rather than reporting a false pass');
    results.live = { skipped: 'no radius field' };
  } else {
    console.log('radius field:', field);
    // Mark the row so a REBUILD (which would defeat FB-017's in-place refresh) is visible.
    await ev(`(() => { const g = __h.group('Corner Radius'); __h.rowMark = g.querySelector('.properties > *'); return !!__h.rowMark; })()`);
    await ev(`(() => { const g = __h.group('Corner Radius'); const i = g.querySelector('input[type=text]'); i.focus(); i.select(); })()`);
    await client.send('Input.insertText', { text: '40' });
    await key('Enter', 'Enter', 13, '\r');
    await sleep(900);
    results.live = JSON.parse(await ev(`JSON.stringify({ ...__h.state(),
      rowMarkStillConnected: !!(__h.rowMark && __h.rowMark.isConnected) })`));
    console.log('live:', JSON.stringify(results.live));
    await shoot('hint-live');
  }

  // ---- RENDER path: leave the node and come back; the note must be drawn by the fresh render.
  console.log('away:', await select('psTitle'));
  await sleep(1200);
  console.log('back:', await select('psWrap'));
  await waitFor(`!!document.querySelector('.sidebar-property-editor .property-group')`, 20000);
  await sleep(1800);
  results.render = JSON.parse(await ev(`JSON.stringify(__h.state())`));
  console.log('render:', JSON.stringify(results.render));
  await shoot('hint-render');

  // ---- The note must also GO when the condition clears (FB-017's "takes it away" case).
  const clipField = await ev(`(() => { const g = __h.group('Layout') || __h.group('General'); return !!g; })()`);
  await ev(`__h.expand('Corner Radius')`);
  await sleep(500);
  const cleared = await ev(`(() => { const g = __h.group('Corner Radius'); const i = g && g.querySelector('input[type=text]');
    if (!i) return 'no field'; i.focus(); i.select(); return 'ok'; })()`);
  if (cleared === 'ok') {
    await client.send('Input.insertText', { text: '0' });
    await key('Enter', 'Enter', 13, '\r');
    await sleep(1000);
    results.cleared = JSON.parse(await ev(`JSON.stringify(__h.state())`));
    console.log('cleared:', JSON.stringify(results.cleared));
  }

  // Put the fixture back.
  await ev(`(() => { __h.node().setParameter('borderRadius', undefined, { undo: true, label: 'drive restore' }); return 'ok'; })()`);
  await sleep(500);
  results.end = JSON.parse(await ev(`JSON.stringify(__h.state())`));
  console.log('end:', JSON.stringify(results.end));

  await client.send('Emulation.clearDeviceMetricsOverride');
  fs.writeFileSync(path.join(outDir, 'hint-results.json'), JSON.stringify(results, null, 2));
  console.log('done');
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
