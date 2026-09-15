// CHR-008 AC1 (R8): a Group with Shadow Enabled off says so ONCE, and `Turn on` brings the rows back.
//   NOODL_REMOTE_DEBUG_PORT=9333 node gate.js <outDir> [--component=/Story/Passage] [--node=psWrap]
// Precondition: the launcher lists the project (a COPY). One connection: viewport emulation, trusted clicks.
// Per theme: BEFORE (line + dimmed rows) → trusted click on the verb → AFTER (rows live, no line, model true)
// → undo → UNDONE (the line is back — the consequence runs both ways, not just once).
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--'));
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=')[1];
const COMPONENT = opt('component', '/Story/Passage');
const NODE = opt('node', 'psWrap');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const REQ = `(() => { if (!window.__drvReq) window.webpackChunknoodl_editor.push([['drv-' + Math.floor(Math.random() * 1e9)], {}, (r) => { window.__drvReq = r; }]); return window.__drvReq; })()`;

// Everything AC1 is about, read off the rendered panel.
const READ = `(() => {
  const panel = document.querySelector('.sidebar-property-editor');
  if (!panel) return JSON.stringify({ panel: false });
  const groups = [...panel.querySelectorAll('.property-group')];
  const shadow = groups.find((g) => { const n = g.querySelector(':scope > .property-group-label .property-group-name'); return n && n.textContent.trim() === 'Box Shadow'; });
  const within = (root, sel) => root ? [...root.querySelectorAll(sel)] : [];
  const lines = within(shadow, '.property-group-gate');
  const ed = window.__nodeGraphEditor;
  const node = ed && ed.findNodeWithId(${JSON.stringify(NODE)});
  return JSON.stringify({
    panel: true,
    shadowGroup: !!shadow,
    shadowExpanded: shadow ? shadow.querySelector('.property-group-label').getAttribute('aria-expanded') : null,
    lines: lines.length,
    lineText: lines.map((l) => l.innerText.replace(/\\s+/g, ' ').trim()),
    lineAction: within(shadow, '[data-test^="group-gate-action-"]').map((b) => b.textContent.trim()),
    rowSentencesInGroup: within(shadow, '.property-port-gate-reason').length,
    rowLinksInGroup: within(shadow, '.property-port-gate-link:not(.property-group-gate *)').length,
    dimmedRowsInGroup: within(shadow, '.property-port-gated-control').length,
    dimmedTitles: within(shadow, '.property-port-gated').map((w) => w.title),
    rowsInGroup: within(shadow, '.properties > *').length,
    rowSentencesOnPanel: within(panel, '.property-port-gate-reason').length,
    linesOnPanel: within(panel, '.property-group-gate').map((l) => l.getAttribute('data-test')),
    elements: panel.querySelectorAll('*').length,
    inlineStyled: panel.querySelectorAll('[style]').length,
    modelShadowEnabled: node ? (node.model || node).parameters.boxShadowEnabled : 'no node'
  });
})()`;

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const client = await connect(await appTarget());
  await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1368, height: 900, deviceScaleFactor: 1, mobile: false });
  const ev = (expr) => evaluate(client, expr);
  const waitFor = async (expr, ms = 120000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { try { if ((await ev(expr)) === true) return; } catch (e) { /* reloading */ } await sleep(500); }
    throw new Error('timed out waiting for ' + expr);
  };
  const clickAt = async (x, y) => {
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await client.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
    }
  };

  // Open the project.
  const open = await ev(`!!(window.__nodeGraphEditor && window.__nodeGraphEditor.getActiveComponent())`);
  if (!open) {
    await waitFor(`!!document.querySelector('nav[aria-label="Launcher sections"]')`);
    await ev(`[...document.querySelectorAll('nav[aria-label="Launcher sections"] button')].find((b) => b.textContent === 'Projects').click()`);
    await sleep(2500);
    const clicked = await ev(`(() => { const c = [...document.querySelectorAll('[class*="LauncherCard-module__Card"]')].find((x) => x.innerText.includes('Story engine')); if (!c) return false; c.click(); return true; })()`);
    if (!clicked) throw new Error('no Story engine card');
  }
  await waitFor(`!!window.__nodeGraphEditor && !!window.__nodeGraphEditor.getActiveComponent()`);
  await sleep(4000);
  const dir = await ev(`(() => { const r = ${REQ}; const m = r.c['./src/editor/src/models/projectmodel.ts']; return m ? m.exports.ProjectModel.instance._retainedProjectDirectory : 'unknown'; })()`);
  console.log('project:', dir);
  if (!/scratchpad\/chr012\/story-engine$/.test(dir)) throw new Error('refusing to drive a project that is not the scratch copy: ' + dir);

  // Design mode, then the node.
  await ev(`(() => { const b = document.querySelector('[aria-label="Editor mode"] button[aria-pressed="false"]'); const on = document.querySelector('[aria-label="Editor mode"] button[aria-pressed="true"]'); if (b && on && /preview/i.test(on.getAttribute('aria-label') || on.textContent)) b.click(); })()`);
  await sleep(1500);
  const selected = await ev(`(() => { const ed = window.__nodeGraphEditor; const c = ed.getActiveComponent().owner.getComponentWithName(${JSON.stringify(COMPONENT)}); if (!c) return 'no component'; ed.switchToComponent(c, { pushHistory: false }); return 'switched'; })()`);
  console.log('component:', selected);
  await sleep(3000);
  const sel = await ev(`(() => { const ed = window.__nodeGraphEditor; const n = ed.findNodeWithId(${JSON.stringify(NODE)}); if (!n) return 'no node'; ed.selectNode(n); return 'selected ' + (n.model || n).type.name; })()`);
  console.log('node:', sel);
  await waitFor(`!!document.querySelector('.sidebar-property-editor .property-group')`, 30000);
  await sleep(2000);

  const scrollToShadow = () => ev(`(() => {
    const g = [...document.querySelectorAll('.sidebar-property-editor .property-group')].find((x) => { const n = x.querySelector(':scope > .property-group-label .property-group-name'); return n && n.textContent.trim() === 'Box Shadow'; });
    if (!g) return null; g.scrollIntoView({ behavior: 'auto', block: 'start' }); const r = g.getBoundingClientRect(); return JSON.stringify({ x: r.x, y: r.y, w: r.width, h: r.height }); })()`);
  const panelClip = async () => JSON.parse(await ev(`(() => { const p = [...document.querySelectorAll('[class*="BasePanel-module__Root"]')].find((x) => x.offsetParent !== null && x.querySelector('.sidebar-property-editor')); const r = (p || document.body).getBoundingClientRect(); return JSON.stringify({ x: Math.max(0, r.x), y: 0, width: Math.min(r.width, 1368), height: 900 }); })()`));
  const shoot = async (name) => {
    const clip = await panelClip();
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 } });
    fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(data, 'base64'));
  };
  const read = async () => JSON.parse(await ev(READ));

  const results = {};
  for (const theme of ['dark', 'light']) {
    await ev(`document.documentElement.setAttribute('data-theme', '${theme}')`);
    await sleep(900);
    await scrollToShadow(); await sleep(600);
    results[`${theme}-before`] = await read();
    await shoot(`chr008-group-shadow-off-${theme}`);
    console.log(theme, 'BEFORE', JSON.stringify(results[`${theme}-before`]));

    if (theme === 'dark') {
      // The verb, by a trusted click at its rendered centre — checked with elementFromPoint first.
      const target = JSON.parse(await ev(`(() => { const b = document.querySelector('.sidebar-property-editor [data-test="group-gate-action-boxShadowEnabled"]'); if (!b) return JSON.stringify(null);
        const r = b.getBoundingClientRect(); const x = r.x + r.width / 2, y = r.y + r.height / 2; const hit = document.elementFromPoint(x, y); return JSON.stringify({ x, y, reachable: b === hit || b.contains(hit), label: b.textContent }); })()`));
      console.log('verb:', JSON.stringify(target));
      if (!target || !target.reachable) throw new Error('the Turn on verb is not reachable');
      await clickAt(target.x, target.y);
      await sleep(2500);
      await scrollToShadow(); await sleep(600);
      results['dark-after-turn-on'] = await read();
      await shoot('chr008-group-shadow-turned-on-dark');
      console.log('dark AFTER', JSON.stringify(results['dark-after-turn-on']));

      await ev(`(() => { const r = ${REQ}; const q = r('./src/editor/src/models/undo-queue-model.ts').UndoQueue.instance; (q.undo || q.undoNext).call(q); })()`);
      await sleep(2500);
      await scrollToShadow(); await sleep(600);
      results['dark-after-undo'] = await read();
      await shoot('chr008-group-shadow-undone-dark');
      console.log('dark UNDONE', JSON.stringify(results['dark-after-undo']));
    }
  }
  await client.send('Emulation.clearDeviceMetricsOverride');
  fs.writeFileSync(path.join(outDir, 'gate-results.json'), JSON.stringify(results, null, 2));
  console.log('done');
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
