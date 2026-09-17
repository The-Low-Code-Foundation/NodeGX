// CHR-009 s28 — a wired padding edge (FB-018, slice 15).
//
// Group `chr009-set-group`, String `chr009-s27-src` wired `savedValue` → `paddingLeft`. Read the Padding row and
// the Margin row (the control) before the wire, on the LIVE path right after `addConnection` (no reselect), after a
// reselect, the bound field's click (selects the source), and after `removeConnection` + reselect (pairs back).
// Docked and wide, dark. Also: a typed value on the other edges still writes while one edge is wired.
//
// 🔴 Refuses to run against anything but the scratch copy.
//   NOODL_REMOTE_DEBUG_PORT=9333 node drive-s28.js --expect=<scratch copy dir> [--out=<dir>]
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const outDir = opt('out', path.join(__dirname, 's28'));
const EXPECT = opt('expect', '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const P = `document.querySelector('.sidebar-property-editor')`;
const GROUP = 'chr009-set-group';
const SRC = 'chr009-s27-src';

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
  const fresh = await ev(`(() => { let r; window.webpackChunknoodl_editor.push([['drv-' + Math.floor(Math.random() * 1e9)], {}, (x) => { r = x; }]); const k = Object.keys(r.m).find((k) => k.endsWith('components/MarginPaddingInput.tsx')); return !!k && String(r.m[k]).includes('BoundField'); })()`);
  console.log('renderer runs the s28 MarginPaddingInput:', fresh);
  if (!fresh) throw new Error('renderer does not run the s28 MarginPaddingInput');

  await ev(`(() => { const ed = window.__nodeGraphEditor; ed.switchToComponent(ed.getActiveComponent().owner.getComponentWithName('/App'), { pushHistory: false }); })()`);
  await sleep(3000);
  await ev(`document.documentElement.setAttribute('data-theme', 'dark')`);
  await ev(`(() => { const ed = window.__nodeGraphEditor; const c = ed.getActiveComponent().owner.getComponentWithName('/App'); const { NodeGraphNode } = ${mod('models/nodegraphmodel/NodeGraphNode.ts')};
    if (!c.graph.findNodeWithId('${GROUP}')) c.graph.addRoot(NodeGraphNode.fromJSON({ type: 'Group', id: '${GROUP}', x: 900, y: 40 }));
    if (!c.graph.findNodeWithId('${SRC}')) c.graph.addRoot(NodeGraphNode.fromJSON({ type: 'String', id: '${SRC}', x: 700, y: 40 })); })()`);
  await must(`!!window.__nodeGraphEditor.findNodeWithId('${GROUP}') && !!window.__nodeGraphEditor.findNodeWithId('${SRC}')`, 20000, 'nodes');

  const rowExpr = (side) => `${P}.querySelector('[data-test="marginpadding-row-${side}"]')`;
  const readRows = () => ev(`JSON.stringify(Object.fromEntries(['margin', 'padding'].map((side) => {
    const row = ${P}.querySelector('[data-test="marginpadding-row-' + side + '"]');
    if (!row) return [side, null];
    const fields = [...row.querySelectorAll('[class*="MarginPaddingInput-module__Field"]')].map((f) => {
      const src = f.querySelector('[class*="MarginPaddingInput-module__BoundSource"]');
      return { comp: f.getAttribute('data-comp'), bound: f.getAttribute('data-bound') === 'true', input: !!f.querySelector('input'), text: src ? src.textContent : null, cut: src ? src.scrollWidth > src.clientWidth : null, width: Math.round(f.getBoundingClientRect().width), height: Math.round(f.getBoundingClientRect().height), title: f.title };
    });
    const exp = row.querySelector('[data-test="marginpadding-expand-' + side + '"]');
    return [side, { fields, expander: exp ? { disabled: exp.disabled, pressed: exp.getAttribute('aria-expanded'), title: exp.title } : null, resetDot: !!row.querySelector('[class*="ResetDot"], [data-test="gutter-reset"]'), height: Math.round(row.getBoundingClientRect().height) }];
  })))`);
  const graph = `window.__nodeGraphEditor.getActiveComponent().owner.getComponentWithName('/App').graph`;
  const conn = `{ fromId: '${SRC}', fromProperty: 'savedValue', toId: '${GROUP}', toProperty: 'paddingLeft' }`;
  const unwire = `(() => { const g = ${graph}; g.connections.filter((c) => c.toId === '${GROUP}' && c.toProperty === 'paddingLeft').forEach((c) => g.removeConnection(c)); })()`;
  const nodeModel = `window.__nodeGraphEditor.findNodeWithId('${GROUP}').model`;
  await ev(unwire);
  const results = {};

  for (const wide of [false, true]) {
    const key = wide ? 'wide' : 'docked';
    const R = (results[key] = {});
    await select(GROUP);
    R.width = await setWide(wide);
    await ev(`${rowExpr('padding')}.scrollIntoView({ block: 'center' })`);
    await sleep(600);
    R.before = JSON.parse(await readRows());
    if (!wide) await shotEl(`${rowExpr('margin')}.parentElement`, `padding-before-${key}-dark.png`);

    await ev(`${graph}.addConnection(${conn})`);
    R.liveBoundWithin5s = await waitFor(`!!${rowExpr('padding')} && !!${rowExpr('padding')}.querySelector('[data-bound="true"]')`, 5000);
    R.live = JSON.parse(await readRows());

    await select(SRC);
    await select(GROUP);
    R.width2 = await setWide(wide);
    await ev(`${rowExpr('padding')}.scrollIntoView({ block: 'center' })`);
    await sleep(600);
    R.reselected = JSON.parse(await readRows());
    await shotEl(`${rowExpr('margin')}.parentElement`, `padding-wired-${key}-dark.png`);

    // An unwired edge on the wired side still takes a typed value.
    if (!wide) {
      const top = `${rowExpr('padding')}.querySelector('[data-comp="padding-top"] input')`;
      await clickEl(top, 'padding-top input');
      await sleep(300);
      await ev(`(() => { const i = ${top}; i.select(); })()`);
      await client.send('Input.insertText', { text: '7' });
      await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
      await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
      await sleep(800);
      R.typedTop = await ev(`JSON.stringify(${nodeModel}.parameters.paddingTop)`);
      R.leftAfterTyping = await ev(`JSON.stringify(${nodeModel}.parameters.paddingLeft)`);
    }

    await clickEl(`${rowExpr('padding')}.querySelector('[data-bound="true"]')`, 'bound field');
    await sleep(1200);
    R.boundClickSelected = await ev(`(() => { const s = window.__nodeGraphEditor.getSelectedNodes ? window.__nodeGraphEditor.getSelectedNodes() : null; return s ? s.map((n) => n.model.id).join(',') : null; })()`);

    await ev(unwire);
    await select(GROUP);
    await setWide(wide);
    await ev(`${rowExpr('padding')}.scrollIntoView({ block: 'center' })`);
    await sleep(600);
    R.unwired = JSON.parse(await readRows());
    console.log(key, JSON.stringify(R));
  }
  await ev(`${nodeModel}.setParameter('paddingTop', undefined)`);
  results.restoredTop = await ev(`String(${nodeModel}.parameters.paddingTop)`);

  fs.writeFileSync(path.join(outDir, 's28-results.json'), JSON.stringify(results, null, 2));
  console.log('wrote', outDir);
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
