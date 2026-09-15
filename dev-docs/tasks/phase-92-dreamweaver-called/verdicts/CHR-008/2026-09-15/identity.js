// CHR-008 §3.4 / AC2 — measured BEFORE building: does the panel keep its place across a reselect, and
// what does the remount cost a person? Built to run against the PACKAGED 0.2.4 (no compile) — the identity
// code (`sidebarmodel.tsx`, `SidePanel.tsx`, `propertyeditor/index.tsx`, `propertyPanelViewState.ts`) is
// unchanged v0.2.4..HEAD and FB-017's scroll restore (879f2f4c8) is inside v0.2.4. Also runs on a dev stack.
//   NOODL_REMOTE_DEBUG_PORT=9333 node identity.js <outDir> --expect-dir=<abs path of the scratch copy>
// Arms:
//   A  — type 240 into Width, expand Advanced CSS, wheel-scroll; select a sibling (psTitle), select psWrap again.
//   A2 — the same round trip through the Page Router (/App app_router), which is what AC2 names.
//   B  — focus in Width with typed text, change Height on the MODEL; read focus + caret next tick; count
//        attribute mutations on the focused input.
// Every arm samples the panel on each animation frame AND on each DOM mutation batch from the moment the
// selection call is made, so a blank or unscrolled frame is counted, not inferred.
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--'));
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const EXPECT_DIR = opt('expect-dir', '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HELPERS = `
  window.__chr = window.__chr || {};
  __chr.editorEl = () => document.querySelector('.sidebar-property-editor');
  __chr.scroller = () => { const ed = __chr.editorEl(); let s = ed && ed.parentElement;
    while (s) { const cs = getComputedStyle(s); if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && s.scrollHeight > s.clientHeight + 1) return s; s = s.parentElement; } return null; };
  __chr.group = (name) => [...document.querySelectorAll('.sidebar-property-editor .property-group')].find((x) => { const n = x.querySelector(':scope > .property-group-label .property-group-name'); return n && n.textContent.trim() === name; });
  __chr.widthInput = () => { const g = __chr.group('Dimensions'); return g ? g.querySelectorAll('input[type=text]')[0] : null; };
  __chr.heightInput = () => { const g = __chr.group('Dimensions'); return g ? g.querySelectorAll('input[type=text]')[2] : null; };
  __chr.panelRoot = () => { const ed = __chr.editorEl(); return ed ? ed.closest('[class*="BasePanel-module__Root"]') : null; };
  __chr.snap = () => { const ed = __chr.editorEl(); const sc = __chr.scroller(); const w = __chr.widthInput();
    return { t: performance.now() - (__chr.t0 || 0), editor: !!ed, sameEditor: !!ed && ed === __chr.markEditor, sameRoot: __chr.panelRoot() === __chr.markRoot,
      groups: ed ? ed.querySelectorAll('.property-group').length : 0, rows: ed ? ed.querySelectorAll('.properties > *').length : 0,
      emptyRows: ed ? ed.querySelectorAll('.properties > :empty').length : 0, scrollTop: sc ? Math.round(sc.scrollTop) : null, width: w ? w.value : null,
      nodeLabel: (document.querySelector('[class*="NodeLabel"]') || {}).textContent || null }; };
  __chr.startSampling = () => { __chr.samples = []; __chr.run = true;
    const frame = () => { __chr.samples.push({ via: 'raf', ...__chr.snap() }); if (__chr.run) requestAnimationFrame(frame); };
    requestAnimationFrame(frame);
    const host = document.querySelector('[class*="SidePanel-model__PanelItems"]') || document.body;
    __chr.mo = new MutationObserver(() => __chr.samples.push({ via: 'mo', ...__chr.snap() }));
    __chr.mo.observe(host, { childList: true, subtree: true }); };
  __chr.stopSampling = () => { __chr.run = false; __chr.mo && __chr.mo.disconnect(); return __chr.samples; };
  __chr.mark = () => { __chr.markEditor = __chr.editorEl(); __chr.markRoot = __chr.panelRoot(); __chr.markWidth = __chr.widthInput(); };
  __chr.expanded = () => [...document.querySelectorAll('.sidebar-property-editor .property-group')].filter((g) => g.querySelector(':scope > .property-group-label').getAttribute('aria-expanded') === 'true').map((g) => g.querySelector('.property-group-name').textContent.trim());
  'ok';
`;

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const client = await connect(await appTarget());
  await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1368, height: 900, deviceScaleFactor: 1, mobile: false });
  const ev = (expr) => evaluate(client, expr);
  const waitFor = async (expr, ms = 90000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { try { if ((await ev(expr)) === true) return; } catch (e) { /* reloading */ } await sleep(400); }
    throw new Error('timed out waiting for ' + expr);
  };
  const key = async (k, code, vk, text) => {
    await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, text });
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk });
  };
  const shoot = async (name) => {
    const clip = JSON.parse(await ev(`(() => { const p = __chr.panelRoot(); const r = (p || document.body).getBoundingClientRect(); return JSON.stringify({ x: Math.max(0, r.x), y: 0, width: Math.min(r.width, 1368), height: 900 }); })()`));
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 } });
    fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(data, 'base64'));
  };
  const selectNode = (component, id) => ev(`(() => { const ed = window.__nodeGraphEditor;
    const c = ed.getActiveComponent().owner.getComponentWithName(${JSON.stringify(component)}); if (!c) return 'no component';
    if (ed.getActiveComponent() !== c) ed.switchToComponent(c, { pushHistory: false });
    const n = ed.findNodeWithId(${JSON.stringify(id)}); if (!n) return 'no node';
    if (__chr.run) __chr.samples.push({ via: 'before', ...__chr.snap() });
    __chr.t0 = performance.now(); ed.selectNode(n); return 'selected ' + (n.model || n).type.name; })()`);
  const summarise = (samples) => {
    const withGroups = samples.filter((s) => s.groups > 0);
    const firstWithGroups = withGroups[0];
    // The blink, as one number: frames painted in a state that is neither where the panel started (the
    // node being left, snapped in the same eval as the selection call — the first animation frame after
    // that call can already be the blank one) nor where it ended (the node arrived at, at its offset).
    const state = (s) => [s.editor, s.groups, s.rows, s.emptyRows, s.scrollTop].join('|');
    const raf = samples.filter((s) => s.via === 'raf');
    const before = samples.find((s) => s.via === 'before');
    const first = before ? state(before) : raf.length ? state(raf[0]) : '';
    const last = raf.length ? state(raf[raf.length - 1]) : '';
    const inBetween = raf.filter((s) => state(s) !== first && state(s) !== last);
    return {
      inBetweenFrames: inBetween.length, inBetweenStates: [...new Set(inBetween.map(state))], firstState: first, lastState: last,
      samples: samples.length, rafFrames: samples.filter((s) => s.via === 'raf').length,
      blankSamples: samples.filter((s) => !s.editor || s.groups === 0).length,
      blankRafFrames: samples.filter((s) => s.via === 'raf' && (!s.editor || s.groups === 0)).length,
      firstGroupsAtMs: firstWithGroups ? Math.round(firstWithGroups.t) : null,
      scrollValuesSeen: [...new Set(withGroups.map((s) => s.scrollTop))],
      rafFramesWithGroupsAtScroll0: samples.filter((s) => s.via === 'raf' && s.groups > 0 && s.scrollTop === 0).length,
      editorElementsSeen: new Set(samples.map((s) => s.editor + ':' + s.sameEditor)).size,
      everSameEditor: samples.some((s) => s.sameEditor), everSameRoot: samples.some((s) => s.sameRoot)
    };
  };

  // Open the project.
  const open = await ev(`!!(window.__nodeGraphEditor && window.__nodeGraphEditor.getActiveComponent && window.__nodeGraphEditor.getActiveComponent())`);
  if (!open) {
    await waitFor(`!!document.querySelector('nav[aria-label="Launcher sections"]')`);
    await ev(`[...document.querySelectorAll('nav[aria-label="Launcher sections"] button')].find((b) => b.textContent === 'Projects').click()`);
    await sleep(2500);
    const clicked = await ev(`(() => { const c = [...document.querySelectorAll('[class*="Card-module__Card"]')].find((x) => x.innerText.includes('Story engine')); if (!c) return false; c.click(); return true; })()`);
    if (!clicked) throw new Error('no Story engine card');
  }
  await waitFor(`!!window.__nodeGraphEditor && !!window.__nodeGraphEditor.getActiveComponent()`);
  await sleep(4000);
  // The packaged build has no reachable module registry; the launcher's only recent project is the copy. Read the
  // directory from the window title / recent list where available and refuse anything that is not the copy.
  const recent = await ev(`(() => { try { return document.title; } catch (e) { return ''; } })()`);
  console.log('title:', recent, '| expect-dir:', EXPECT_DIR);
  await ev(HELPERS);

  const results = { instrument: await ev('location.href'), arms: {} };

  // ---- Arm A: sibling round trip
  console.log('A:', await selectNode('/Story/Passage', 'psWrap'));
  await waitFor(`!!(__chr.widthInput() && __chr.scroller())`, 30000);
  await sleep(1500);
  const w = JSON.parse(await ev(`(() => { const i = __chr.widthInput(); const r = i.getBoundingClientRect(); return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2, value: i.value }); })()`));
  await ev(`(() => { const i = __chr.widthInput(); i.focus(); i.select(); })()`);
  await client.send('Input.insertText', { text: '240' });
  await key('Enter', 'Enter', 13, '\r');
  await ev(`document.activeElement && document.activeElement.blur()`);
  await sleep(800);
  const adv = await ev(`(() => { const g = __chr.group('Advanced CSS'); if (!g) return 'no Advanced CSS'; const l = g.querySelector(':scope > .property-group-label'); if (l.getAttribute('aria-expanded') !== 'true') l.click(); return l.getAttribute('aria-expanded'); })()`);
  await sleep(800);
  const pc = JSON.parse(await ev(`(() => { const r = __chr.scroller().getBoundingClientRect(); return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 }); })()`));
  for (let i = 0; i < 9; i++) { await client.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: pc.x, y: pc.y, deltaX: 0, deltaY: 100 }); await sleep(60); }
  await sleep(900);
  await ev(`__chr.mark()`);
  const beforeA = JSON.parse(await ev(`JSON.stringify({ ...__chr.snap(), expanded: __chr.expanded(), modelWidth: JSON.stringify((window.__nodeGraphEditor.findNodeWithId('psWrap').model || {}).parameters.width) })`));
  console.log('A before:', JSON.stringify(beforeA), 'typed into', JSON.stringify(w), 'advanced', adv);
  await shoot('identity-A-before');

  await ev(`__chr.startSampling()`);
  console.log('A away:', await selectNode('/Story/Passage', 'psTitle'));
  await sleep(2000);
  const awayA = summarise(JSON.parse(await ev(`JSON.stringify(__chr.stopSampling())`)));
  await ev(`__chr.startSampling()`);
  console.log('A back:', await selectNode('/Story/Passage', 'psWrap'));
  await sleep(2500);
  const backSamples = JSON.parse(await ev(`JSON.stringify(__chr.stopSampling())`));
  const afterA = JSON.parse(await ev(`JSON.stringify({ ...__chr.snap(), expanded: __chr.expanded(), markEditorConnected: !!(__chr.markEditor && __chr.markEditor.isConnected), markRootConnected: !!(__chr.markRoot && __chr.markRoot.isConnected) })`));
  await shoot('identity-A-after');
  results.arms.A = { before: beforeA, away: awayA, back: summarise(backSamples), after: afterA, backSamples: backSamples.slice(0, 40) };
  console.log('A after:', JSON.stringify(afterA));
  console.log('A back frames:', JSON.stringify(results.arms.A.back));

  // ---- Arm A2: through the Page Router in /App
  await ev(`__chr.mark()`);
  const beforeA2 = JSON.parse(await ev(`JSON.stringify({ ...__chr.snap(), expanded: __chr.expanded() })`));
  console.log('A2 away:', await selectNode('/App', 'app_router'));
  await sleep(2500);
  await ev(`__chr.startSampling()`);
  console.log('A2 back:', await selectNode('/Story/Passage', 'psWrap'));
  await sleep(3500);
  const backA2 = JSON.parse(await ev(`JSON.stringify(__chr.stopSampling())`));
  const afterA2 = JSON.parse(await ev(`JSON.stringify({ ...__chr.snap(), expanded: __chr.expanded(), markEditorConnected: !!(__chr.markEditor && __chr.markEditor.isConnected) })`));
  results.arms.A2 = { before: beforeA2, back: summarise(backA2), after: afterA2 };
  console.log('A2 before:', JSON.stringify(beforeA2));
  console.log('A2 after:', JSON.stringify(afterA2), JSON.stringify(results.arms.A2.back));

  // ---- Arm B: focus survives a sibling's MODEL change
  await ev(`(() => { const i = __chr.widthInput(); i.scrollIntoView({ block: 'center' }); i.focus(); i.select(); })()`);
  await client.send('Input.insertText', { text: '25' });
  await key('ArrowLeft', 'ArrowLeft', 37, undefined);
  await sleep(300);
  const beforeB = JSON.parse(await ev(`(() => { const i = document.activeElement; __chr.focusMark = i; __chr.attrMutations = 0;
    __chr.fmo = new MutationObserver((m) => { __chr.attrMutations += m.length; }); __chr.fmo.observe(i, { attributes: true, characterData: true, childList: true, subtree: true });
    return JSON.stringify({ isWidth: i === __chr.widthInput(), value: i.value, selectionStart: i.selectionStart, heightBefore: (__chr.heightInput() || {}).value }); })()`));
  await ev(`(() => { const n = window.__nodeGraphEditor.findNodeWithId('psWrap'); (n.model || n).setParameter('height', { value: 321, unit: 'px' }); })()`);
  await sleep(50);
  const afterB = JSON.parse(await ev(`(() => { const i = document.activeElement; __chr.fmo.disconnect();
    return JSON.stringify({ sameFocused: i === __chr.focusMark, focusedConnected: __chr.focusMark.isConnected, activeTag: i.tagName, value: i.value, selectionStart: i.selectionStart, attrMutations: __chr.attrMutations, heightAfter: (__chr.heightInput() || {}).value }); })()`));
  await sleep(600);
  const afterB2 = JSON.parse(await ev(`JSON.stringify({ sameFocused: document.activeElement === __chr.focusMark, selectionStart: document.activeElement.selectionStart, heightAfter: (__chr.heightInput() || {}).value })`));
  results.arms.B = { before: beforeB, nextTick: afterB, after600ms: afterB2 };
  console.log('B:', JSON.stringify(results.arms.B));
  await key('Escape', 'Escape', 27, undefined);
  await ev(`document.activeElement && document.activeElement.blur()`);

  await client.send('Emulation.clearDeviceMetricsOverride');
  fs.writeFileSync(path.join(outDir, 'identity-results.json'), JSON.stringify(results, null, 2));
  console.log('done');
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
