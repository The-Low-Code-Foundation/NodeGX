// CHR-008 §3.2 — WHY does the structural hint survive a live edit but not a fresh render?
//
// Measured: typing a radius draws the note (live path, in place, no rebuild); selecting away and back
// with the radius still set draws NOTHING. Two candidate causes, and they need different fixes:
//
//   WIPED   — the deferred `refreshHints` runs and adds the note, then a LATER React render of the
//             same tree removes it (React owns the row div's children). Fix: React must draw it.
//   NEVER   — the deferred pass never adds it on a fresh render at all (ran too early, or
//             `structuralHints()` was empty at that moment, or the marked row was not reachable).
//
// This watches the note across a render rather than sampling after it, so the two are distinguishable.
//   NOODL_REMOTE_DEBUG_PORT=9333 node hintwhy.js
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HELPERS = `
  window.__w = window.__w || {};
  __w.sel = '.sidebar-property-editor';
  __w.group = (name) => [...document.querySelectorAll(__w.sel + ' .property-group')].find((x) => {
    const n = x.querySelector(':scope > .property-group-label .property-group-name');
    return n && n.textContent.trim() === name; });
  __w.hints = () => document.querySelectorAll(__w.sel + ' .property-structural-hint').length;
  __w.marked = () => document.querySelectorAll(__w.sel + ' [data-hint-ports]').length;
  __w.node = () => { const n = window.__nodeGraphEditor.findNodeWithId('psWrap'); return n ? (n.model || n) : null; };

  // Sample the note on every animation frame AND every mutation, so "added then removed" is visible
  // as a sequence rather than inferred from an end state.
  __w.watch = () => { __w.trace = []; __w.run = true; __w.t0 = performance.now();
    const snap = (via) => __w.trace.push({ via, t: Math.round(performance.now() - __w.t0), hints: __w.hints(), marked: __w.marked() });
    const frame = () => { snap('raf'); if (__w.run) requestAnimationFrame(frame); };
    requestAnimationFrame(frame);
    const host = document.querySelector(__w.sel);
    __w.mo = new MutationObserver(() => snap('mo'));
    if (host) __w.mo.observe(host, { childList: true, subtree: true });
    snap('start'); };
  __w.stop = () => { __w.run = false; __w.mo && __w.mo.disconnect();
    // Collapse the trace to the transitions, which is the whole question.
    const t = __w.trace; const out = []; let last = null;
    for (const s of t) { const k = s.hints + '/' + s.marked; if (k !== last) { out.push(s); last = k; } }
    return JSON.stringify({ transitions: out, samples: t.length, endHints: __w.hints(), endMarked: __w.marked() }); };
  'ok';
`;

(async () => {
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
  const select = (id) => ev(`(() => { const ed = window.__nodeGraphEditor;
    const c = ed.getActiveComponent().owner.getComponentWithName('/Story/Passage');
    if (ed.getActiveComponent() !== c) ed.switchToComponent(c, { pushHistory: false });
    const n = ed.findNodeWithId(${JSON.stringify(id)}); if (!n) return 'no node';
    ed.selectNode(n); return 'ok'; })()`);

  await waitFor(`!!window.__nodeGraphEditor && !!window.__nodeGraphEditor.getActiveComponent()`);
  await ev(HELPERS);
  await select('psWrap');
  await waitFor(`!!document.querySelector('.sidebar-property-editor .property-group')`, 20000);
  await sleep(1200);

  // Put the node back into the state where a hint MUST apply: radius set, children present, unclipped.
  await ev(`__w.group('Corner Radius') && (() => { const l = __w.group('Corner Radius').querySelector(':scope > .property-group-label');
    if (l.getAttribute('aria-expanded') !== 'true') l.click(); })()`);
  await sleep(700);
  await ev(`(() => { const i = __w.group('Corner Radius').querySelector('input[type=text]'); i.focus(); i.select(); })()`);
  await client.send('Input.insertText', { text: '40' });
  await key('Enter', 'Enter', 13, '\r');
  await sleep(1000);
  console.log('after the live edit:', await ev(`JSON.stringify({ hints: __w.hints(), marked: __w.marked(), radius: JSON.stringify(__w.node().parameters.borderRadius) })`));

  // ---- Q1: does a plain re-render of the SAME node keep the note? (toggling a group clears the
  // hash and calls renderGroups — no node change, no view rebuild from a selection.)
  await ev(`__w.watch()`);
  await ev(`(() => { const l = __w.group('Style').querySelector(':scope > .property-group-label'); l.click(); return 'toggled'; })()`);
  await sleep(2500);
  console.log('Q1 re-render (group toggle):', await ev(`__w.stop()`));

  // ---- Q2: the render path proper — away and back, watching across the whole transition.
  await select('psTitle');
  await sleep(1200);
  await ev(`__w.watch()`);
  await select('psWrap');
  await sleep(3000);
  console.log('Q2 reselect:', await ev(`__w.stop()`));
  console.log('Q2 end state:', await ev(`JSON.stringify({ hints: __w.hints(), marked: __w.marked(), radius: JSON.stringify(__w.node().parameters.borderRadius) })`));

  // Restore the fixture.
  await ev(`__w.node().setParameter('borderRadius', undefined, { undo: true, label: 'probe restore' })`);
  await client.send('Emulation.clearDeviceMetricsOverride');
  console.log('done');
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
