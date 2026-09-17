// CHR-009 s27 — three arms, one stack.
//
// A. A wired align row draws the binding chip (FB-018), the unwired row beside it keeps its segments.
//    Group `chr009-set-group`, a String node `chr009-s27-src` wired `savedValue` → `alignX`. Read before the wire, on
//    the LIVE path right after `addConnection` (no reselect), after a reselect (fresh render), the chip's click
//    (selects the source), and after `removeConnection` (segments back). Docked and wide, dark.
// B. A token in a pair field: Text Input `chr009-s27-textinput` with TextInputConfig's paddings
//    (`var(--space-2)` top/bottom, `var(--space-3)` left/right). Field text, cut or not, widths. Docked and wide.
// C. The colour picker's opacity field on an opaque hex (`#FBF8F3`) vs an alpha hex (`#FBF8F366`): value + placeholder.
//
// 🔴 Refuses to run against anything but the scratch copy.
//   NOODL_REMOTE_DEBUG_PORT=9333 node drive-s27.js --expect=<scratch copy dir> [--out=<dir>]
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const outDir = opt('out', path.join(__dirname, 's27'));
const EXPECT = opt('expect', '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const P = `document.querySelector('.sidebar-property-editor')`;
const GROUP = 'chr009-set-group';
const SRC = 'chr009-s27-src';
const TI = 'chr009-s27-textinput';

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const client = await connect(await appTarget());
  await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1368, height: 900, deviceScaleFactor: 2, mobile: false });
  const ev = (e) => evaluate(client, e);
  const waitFor = async (expr, ms = 120000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { try { if ((await ev(expr)) === true) return true; } catch (e) { /* reloading */ } await sleep(250); }
    return false;
  };
  const must = async (expr, ms, what) => { if (!(await waitFor(expr, ms))) throw new Error('timed out: ' + (what || expr)); };
  const mod = (suffix) => `(() => { let r; window.webpackChunknoodl_editor.push([['drv-' + Math.floor(Math.random() * 1e9)], {}, (x) => { r = x; }]); return r(Object.keys(r.m).find((k) => k.endsWith('${suffix}'))); })()`;
  const press = async (x, y) => {
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await client.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: type === 'mouseMoved' ? 0 : 1 });
    }
    await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
  };
  const clickEl = async (expr, what) => {
    const pt = JSON.parse(await ev(`(() => { const el = ${expr}; if (!el) return JSON.stringify({ miss: true }); el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const hit = document.elementFromPoint(x, y); return JSON.stringify({ x, y, reachable: !!hit && (hit === el || el.contains(hit)) }); })()`));
    if (pt.miss || !pt.reachable) throw new Error(`${what}: not reachable ${JSON.stringify(pt)}`);
    await sleep(300);
    await press(pt.x, pt.y);
  };
  const shotEl = async (expr, name, pad = 6) => {
    const r = JSON.parse(await ev(`JSON.stringify((${expr}).getBoundingClientRect())`));
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: r.width + pad * 2, height: r.height + pad * 2, scale: 2 } });
    fs.writeFileSync(path.join(outDir, name), Buffer.from(data, 'base64'));
  };
  const select = async (id) => {
    await ev(`window.__nodeGraphEditor.selectNode(window.__nodeGraphEditor.findNodeWithId('${id}'))`);
    await must(`!!${P} && !!${P}.querySelector('[class*="PropertyPanelInput-module__Root"]')`, 30000, 'panel for ' + id);
    await sleep(1500);
  };
  const setWide = async (wide) => {
    const w = await ev(`Math.round(${P}.getBoundingClientRect().width)`);
    if (w >= 400 !== wide) { await ev(`document.querySelector('[data-test="side-panel-wide-toggle"]').click()`); await sleep(1500); }
    return ev(`Math.round(${P}.getBoundingClientRect().width)`);
  };

  // ---- open the scratch copy
  if (!(await ev(`!!(window.__nodeGraphEditor && window.__nodeGraphEditor.getActiveComponent && window.__nodeGraphEditor.getActiveComponent())`))) {
    await must(`[...document.querySelectorAll('[class*="LauncherCard-module__Card"]')].some((x) => x.innerText.includes('Story engine'))`, 600000, 'launcher card');
    await sleep(2500);
    await ev(`[...document.querySelectorAll('[class*="LauncherCard-module__Card"]')].find((x) => x.innerText.includes('Story engine')).click()`);
  }
  await must(`!!window.__nodeGraphEditor && !!window.__nodeGraphEditor.getActiveComponent()`, 120000, 'editor');
  await sleep(4000);
  const dir = await ev(`${mod('models/projectmodel.ts')}.ProjectModel.instance._retainedProjectDirectory`);
  console.log('project:', dir);
  if (!EXPECT || dir !== EXPECT) throw new Error('refusing to drive a project that is not the scratch copy: ' + dir);
  // 🔴 s17: the served bundle can carry the change while the renderer still runs the old module.
  const fresh = await ev(`(() => { let r; window.webpackChunknoodl_editor.push([['drv-' + Math.floor(Math.random() * 1e9)], {}, (x) => { r = x; }]); const k = Object.keys(r.m).find((k) => k.endsWith('AlignTools/AlignToolsType.ts')); return !!k && String(r.m[k]).includes('getConnectionSourceLabel'); })()`);
  console.log('renderer runs the s27 AlignToolsType:', fresh);
  if (!fresh) throw new Error('renderer does not run the s27 AlignToolsType');

  await ev(`(() => { const ed = window.__nodeGraphEditor; ed.switchToComponent(ed.getActiveComponent().owner.getComponentWithName('/App'), { pushHistory: false }); })()`);
  await sleep(3000);
  await ev(`document.documentElement.setAttribute('data-theme', 'dark')`);
  await ev(`(() => { const ed = window.__nodeGraphEditor; const c = ed.getActiveComponent().owner.getComponentWithName('/App'); const { NodeGraphNode } = ${mod('models/nodegraphmodel/NodeGraphNode.ts')};
    if (!c.graph.findNodeWithId('${GROUP}')) c.graph.addRoot(NodeGraphNode.fromJSON({ type: 'Group', id: '${GROUP}', x: 900, y: 40 }));
    if (!c.graph.findNodeWithId('${SRC}')) c.graph.addRoot(NodeGraphNode.fromJSON({ type: 'String', id: '${SRC}', x: 700, y: 40 }));
    if (!c.graph.findNodeWithId('${TI}')) c.graph.addRoot(NodeGraphNode.fromJSON({ type: 'net.noodl.controls.textinput', id: '${TI}', x: 900, y: 300,
      parameters: { paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-2)', paddingLeft: 'var(--space-3)', paddingRight: 'var(--space-3)' } })); })()`);
  await must(`!!window.__nodeGraphEditor.findNodeWithId('${GROUP}') && !!window.__nodeGraphEditor.findNodeWithId('${SRC}') && !!window.__nodeGraphEditor.findNodeWithId('${TI}')`, 20000, 'nodes');
  const results = { align: {}, pair: {}, opacity: {} };

  // ---- A. align chip
  const readAlign = () => ev(`JSON.stringify(Object.fromEntries(['horizontal', 'vertical'].map((c) => {
    const row = ${P}.querySelector('[data-test="align-row-' + c + '"]');
    return [c, row ? { segments: row.querySelectorAll('[data-align-value]').length, chip: (row.querySelector('[class*="BindingChip-module__Root"]') || {}).textContent || null, gutterConnected: !!row.querySelector('[data-test="gutter-connected"]'), height: Math.round(row.getBoundingClientRect().height) } : null];
  })))`);
  const alignRowExpr = (comp) => `${P}.querySelector('[data-test="align-row-${comp}"]')`;
  const graph = `window.__nodeGraphEditor.getActiveComponent().owner.getComponentWithName('/App').graph`;
  const conn = `{ fromId: '${SRC}', fromProperty: 'savedValue', toId: '${GROUP}', toProperty: 'alignX' }`;
  // A connection left behind by an aborted run would make "before" read wired.
  await ev(`(() => { const g = ${graph}; g.connections.filter((c) => c.toId === '${GROUP}' && c.toProperty === 'alignX').forEach((c) => g.removeConnection(c)); })()`);
  for (const wide of [false, true]) {
    const key = wide ? 'wide' : 'docked';
    const A = (results.align[key] = {});
    await select(GROUP);
    A.width = await setWide(wide);
    await ev(`${alignRowExpr('horizontal')}.scrollIntoView({ block: 'center' })`);
    await sleep(600);
    A.before = JSON.parse(await readAlign());
    await ev(`${graph}.addConnection(${conn})`);
    // Live path: the panel must hear the connection without a reselect (s14's bindModel fix).
    const live = await waitFor(`!!${alignRowExpr('horizontal')} && !!${alignRowExpr('horizontal')}.querySelector('[class*="BindingChip-module__Root"]')`, 5000);
    A.liveChipWithin5s = live;
    A.live = JSON.parse(await readAlign());
    await select(SRC);
    await select(GROUP);
    A.width2 = await setWide(wide);
    await ev(`${alignRowExpr('horizontal')}.scrollIntoView({ block: 'center' })`);
    await sleep(600);
    A.reselected = JSON.parse(await readAlign());
    await shotEl(`${alignRowExpr('horizontal')}.parentElement`, `align-wired-${key}-dark.png`);
    await clickEl(`${alignRowExpr('horizontal')}.querySelector('[class*="BindingChip-module__Root"]')`, 'chip');
    await sleep(1200);
    A.chipClickSelected = await ev(`(() => { const s = window.__nodeGraphEditor.getSelectedNodes ? window.__nodeGraphEditor.getSelectedNodes() : null; return s ? s.map((n) => n.model.id).join(',') : (${P} && ${P}.innerText.split(String.fromCharCode(10)).slice(0, 3).join(' | ')); })()`);
    await ev(`(() => { const g = ${graph}; g.connections.filter((c) => c.toId === '${GROUP}' && c.toProperty === 'alignX').forEach((c) => g.removeConnection(c)); })()`);
    await select(GROUP);
    await setWide(wide);
    await ev(`${alignRowExpr('horizontal')}.scrollIntoView({ block: 'center' })`);
    await sleep(600);
    A.unwired = JSON.parse(await readAlign());
    console.log('align', key, JSON.stringify(A));
  }

  // ---- B. token in a pair field
  for (const wide of [false, true]) {
    const key = wide ? 'wide' : 'docked';
    await select(TI);
    const width = await setWide(wide);
    await ev(`${P}.querySelector('[data-test="marginpadding-row-padding"]').scrollIntoView({ block: 'center' })`);
    await sleep(600);
    const fields = JSON.parse(await ev(`JSON.stringify([...${P}.querySelectorAll('[data-test="marginpadding-row-padding"] [class*="MarginPaddingInput-module__Field"]')].map((f) => { const v = f.querySelector('[class*="MarginPaddingInput-module__Value"]'); const inner = v && (v.tagName === 'INPUT' ? v : v); return { title: f.title, text: v ? (v.value !== undefined && v.tagName === 'INPUT' ? v.value : v.textContent) : null, cut: v ? v.scrollWidth > v.clientWidth : null, field: Math.round(f.getBoundingClientRect().width), value: v ? Math.round(v.getBoundingClientRect().width) : null, need: v ? v.scrollWidth : null }; }))`));
    results.pair[key] = { width, fields };
    await shotEl(`${P}.querySelector('[data-test="marginpadding-row-padding"]')`, `pair-token-${key}-dark.png`);
    console.log('pair', key, width, JSON.stringify(fields));
  }

  // ---- C. opacity field, opaque vs alpha
  const nodeModel = `window.__nodeGraphEditor.findNodeWithId('${GROUP}').model`;
  const field = `${P}.querySelector('input[data-identifier="backgroundColor"]').closest('[class*="ColorInput-module__Field"]')`;
  for (const [key, value] of [['opaque', '#FBF8F3'], ['alpha', '#FBF8F366']]) {
    await ev(`${nodeModel}.setParameter('backgroundColor', '${value}')`);
    await select(SRC);
    await select(GROUP);
    await setWide(false);
    await must(`!!${P}.querySelector('input[data-identifier="backgroundColor"]')`, 10000, 'bg colour field');
    await clickEl(`${field}.querySelector('button')`, 'swatch');
    await sleep(900);
    const O = JSON.parse(await ev(`(() => { const p = document.querySelector('.color-picker-popup'); if (!p || p.offsetParent === null) return JSON.stringify({ open: false }); return JSON.stringify({ open: true, inputs: [...p.querySelectorAll('input')].map((i) => ({ value: i.value, placeholder: i.placeholder, color: getComputedStyle(i).color, placeholderShown: i.matches(':placeholder-shown') })) }); })()`));
    O.model = await ev(`String(${nodeModel}.parameters.backgroundColor)`);
    results.opacity[key] = O;
    if (O.open) await shotEl(`document.querySelector('.color-picker-popup')`, `picker-${key}-dark.png`, 2);
    console.log('opacity', key, JSON.stringify(O));
    // 🔴 s24: Escape does not close a popout; a real press on the blocker does.
    const blocker = await ev(`(() => { const b = document.querySelector('.popup-layer-blocker'); if (!b) return null; const r = b.getBoundingClientRect(); return JSON.stringify({ x: r.left + 10, y: r.top + 10 }); })()`);
    if (blocker) { const b = JSON.parse(blocker); await press(b.x, b.y); await sleep(700); }
  }
  await ev(`${nodeModel}.setParameter('backgroundColor', undefined)`);
  results.opacity.restored = await ev(`String(${nodeModel}.parameters.backgroundColor)`);

  fs.writeFileSync(path.join(outDir, 's27-results.json'), JSON.stringify(results, null, 2));
  console.log('wrote', outDir);
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
