// Walk the Position select's ancestors vs a number field's at wide.
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXPECT = process.argv[2];
const P = `document.querySelector('.sidebar-property-editor')`;
(async () => {
  const target = await appTarget();
  const client = await connect(target);
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1368, height: 900, deviceScaleFactor: 1, mobile: false });
  const ev = (e) => evaluate(client, e);
  const waitFor = async (expr, ms = 120000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if ((await ev(expr)) === true) return true; } catch (e) {} await sleep(300); } return false; };
  const mod = (suffix) => `(() => { let r; window.webpackChunknoodl_editor.push([['drv-' + Math.floor(Math.random() * 1e9)], {}, (x) => { r = x; }]); return r(Object.keys(r.m).find((k) => k.endsWith('${suffix}'))); })()`;
  if (!(await ev(`!!(window.__nodeGraphEditor && window.__nodeGraphEditor.getActiveComponent && window.__nodeGraphEditor.getActiveComponent())`))) {
    if (!(await waitFor(`[...document.querySelectorAll('[class*="LauncherCard-module__Card"]')].some((x) => x.innerText.includes('Story engine'))`, 600000))) throw new Error('no card');
    await sleep(2500);
    await ev(`[...document.querySelectorAll('[class*="LauncherCard-module__Card"]')].find((x) => x.innerText.includes('Story engine')).click()`);
  }
  if (!(await waitFor(`!!window.__nodeGraphEditor && !!window.__nodeGraphEditor.getActiveComponent()`))) throw new Error('no editor');
  await sleep(4000);
  const dir = await ev(`${mod('models/projectmodel.ts')}.ProjectModel.instance._retainedProjectDirectory`);
  if (dir !== EXPECT) throw new Error('not scratch: ' + dir);
  await ev(`(() => { const ed = window.__nodeGraphEditor; ed.switchToComponent(ed.getActiveComponent().owner.getComponentWithName('/App'), { pushHistory: false }); })()`);
  await sleep(3000);
  const id = 'chr009-set-group';
  await ev(`(() => { const ed = window.__nodeGraphEditor; const c = ed.getActiveComponent().owner.getComponentWithName('/App');
    if (!c.graph.findNodeWithId('${id}')) { const { NodeGraphNode } = ${mod('models/nodegraphmodel/NodeGraphNode.ts')}; c.graph.addRoot(NodeGraphNode.fromJSON({ type: 'Group', id: '${id}', x: 900, y: 40 })); } })()`);
  await waitFor(`!!window.__nodeGraphEditor.findNodeWithId('${id}')`, 20000);
  await ev(`window.__nodeGraphEditor.selectNode(window.__nodeGraphEditor.findNodeWithId('${id}'))`);
  await waitFor(`!!${P} && !!${P}.querySelector('.property-panel-row, [class*="PropertyPanelInput-module__Root"]')`, 30000);
  await sleep(2500);
  const w = await ev(`Math.round(${P}.getBoundingClientRect().width)`);
  if (w < 400) { await ev(`document.querySelector('[data-test="side-panel-wide-toggle"]').click()`); await sleep(1500); }
  console.log('panel width', await ev(`Math.round(${P}.getBoundingClientRect().width)`));
  const WALK = (label) => `(() => {
    const labels = [...${P}.querySelectorAll('*')].filter((el) => el.childElementCount === 0 && el.textContent.trim() === '${label}' && el.getBoundingClientRect().width > 0);
    if (!labels.length) return JSON.stringify({ error: 'no label ${label}' });
    let row = labels[0]; while (row && !row.querySelector('input, select, [class*="SelectInput-module__Root"]')) row = row.parentElement;
    const ctl = row.querySelector('[class*="SelectInput-module__Root"], input, select');
    const out = []; let el = ctl;
    while (el && el !== ${P}) {
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      out.push([el.tagName.toLowerCase() + '.' + String(el.className).split(' ').map((c) => c.replace(/-module__/, ':').slice(0, 40)).join('.'), Math.round(r.width), cs.display, cs.width, cs.flex, cs.maxWidth, cs.minWidth, el.getAttribute('style') || ''].join(' | '));
      el = el.parentElement;
    }
    return JSON.stringify(out, null, 1);
  })()`;
  for (const l of ['Position', 'Layout', 'Box Sizing', 'Vertical Gap']) { console.log('==', l); console.log(await ev(WALK(l))); }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
