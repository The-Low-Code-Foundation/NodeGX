// CHR-008 R8, Richard's condition: no "same error repeated on 5 lines successively".
//   NOODL_REMOTE_DEBUG_PORT=9333 node lines.js <outDir>
// On the live panel, for each target node: every group's printed gate texts (group lines + per-row sentences),
// and a screenshot per theme scrolled to the groups the first build repeated in. One connection.
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const outDir = process.argv[2];
const TARGETS = [
  { component: '/Story/Passage', node: 'psWrap', label: 'group', shoot: ['Scroll', 'Box Shadow', 'Border Style'] },
  { component: '/Story/Paster', node: 'paPlay', label: 'button', shoot: ['Icon'] }
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const READ = `(() => {
  const panel = document.querySelector('.sidebar-property-editor');
  if (!panel) return JSON.stringify(null);
  const out = [];
  for (const g of panel.querySelectorAll('.property-group')) {
    const nameEl = g.querySelector(':scope > .property-group-label .property-group-name');
    const lines = [...g.querySelectorAll(':scope > .property-group-gate')].map((l) => l.innerText.replace(/\\s+/g, ' ').trim());
    const own = [...g.querySelectorAll(':scope > .properties .property-port-gate-reason')].map((r) => r.innerText.replace(/\\s+/g, ' ').trim());
    const dimmed = g.querySelectorAll(':scope > .properties .property-port-gated-control').length;
    if (lines.length || own.length || dimmed) out.push({ group: nameEl && nameEl.textContent.trim(), expanded: g.querySelector(':scope > .property-group-label').getAttribute('aria-expanded'), lines, own, dimmed, printed: lines.length + own.length });
  }
  return JSON.stringify(out);
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

  if (!(await ev(`!!(window.__nodeGraphEditor && window.__nodeGraphEditor.getActiveComponent())`))) {
    await waitFor(`!!document.querySelector('nav[aria-label="Launcher sections"]')`);
    await ev(`[...document.querySelectorAll('nav[aria-label="Launcher sections"] button')].find((b) => b.textContent === 'Projects').click()`);
    await sleep(2500);
    const clicked = await ev(`(() => { const c = [...document.querySelectorAll('[class*="LauncherCard-module__Card"]')].find((x) => x.innerText.includes('Story engine')); if (!c) return false; c.click(); return true; })()`);
    if (!clicked) throw new Error('no Story engine card');
  }
  await waitFor(`!!window.__nodeGraphEditor && !!window.__nodeGraphEditor.getActiveComponent()`);
  await sleep(4000);
  const dir = await ev(`(() => { let r; window.webpackChunknoodl_editor.push([['drv-' + Math.floor(Math.random() * 1e9)], {}, (x) => { r = x; }]); const m = r.c['./src/editor/src/models/projectmodel.ts']; return m ? m.exports.ProjectModel.instance._retainedProjectDirectory : 'unknown'; })()`);
  console.log('project:', dir);
  if (!/scratchpad\/chr012\/story-engine$/.test(dir)) throw new Error('refusing to drive a project that is not the scratch copy: ' + dir);

  const results = {};
  for (const t of TARGETS) {
    await ev(`(() => { const ed = window.__nodeGraphEditor; ed.switchToComponent(ed.getActiveComponent().owner.getComponentWithName(${JSON.stringify(t.component)}), { pushHistory: false }); })()`);
    await sleep(3000);
    const sel = await ev(`(() => { const ed = window.__nodeGraphEditor; const n = ed.findNodeWithId(${JSON.stringify(t.node)}); if (!n) return 'no node'; ed.selectNode(n); return 'selected ' + (n.model || n).type.name; })()`);
    console.log(t.node, sel);
    await waitFor(`!!document.querySelector('.sidebar-property-editor .property-group')`, 30000);
    await sleep(2000);
    for (const theme of ['dark', 'light']) {
      await ev(`document.documentElement.setAttribute('data-theme', '${theme}')`);
      await sleep(900);
      const groups = JSON.parse(await ev(READ));
      results[`${t.label}-${theme}`] = groups;
      console.log(t.label, theme, JSON.stringify(groups.map((g) => ({ group: g.group, printed: g.printed, dimmed: g.dimmed, text: g.lines[0] || g.own[0] }))));
      for (const name of t.shoot) {
        const box = JSON.parse(await ev(`(() => { const g = [...document.querySelectorAll('.sidebar-property-editor .property-group')].find((x) => { const n = x.querySelector(':scope > .property-group-label .property-group-name'); return n && n.textContent.trim() === ${JSON.stringify(name)}; });
          if (!g) return JSON.stringify(null); g.scrollIntoView({ behavior: 'auto', block: 'start' });
          const p = [...document.querySelectorAll('[class*="BasePanel-module__Root"]')].find((x) => x.offsetParent !== null && x.querySelector('.sidebar-property-editor')); const r = p.getBoundingClientRect();
          return JSON.stringify({ x: Math.max(0, r.x), width: r.width }); })()`));
        if (!box) { console.log('  no group', name); continue; }
        await sleep(500);
        const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { x: box.x, y: 0, width: box.width, height: 900, scale: 1 } });
        fs.writeFileSync(path.join(outDir, `lines-${t.label}-${name.replace(/\s+/g, '-').toLowerCase()}-${theme}.png`), Buffer.from(data, 'base64'));
      }
    }
  }
  await client.send('Emulation.clearDeviceMetricsOverride');
  fs.writeFileSync(path.join(outDir, 'lines-results.json'), JSON.stringify(results, null, 2));
  const worst = Math.max(...Object.values(results).flat().map((g) => g.printed));
  console.log('most gate texts printed in any one group:', worst);
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
