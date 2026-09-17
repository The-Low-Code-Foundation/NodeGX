const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TYPES = [['group','Group'],['text','Text'],['image','Image'],['function','JavaScriptFunction'],['query-records','DbCollection2'],['columns','net.noodl.visual.columns'],['states','States'],['button-popout','net.noodl.controls.button']];
(async () => {
  const client = await connect(await appTarget());
  const ev = (e) => evaluate(client, e);
  const mod = (suffix) => `(() => { let r; window.webpackChunknoodl_editor.push([['drv-' + Math.floor(Math.random() * 1e9)], {}, (x) => { r = x; }]); return r(Object.keys(r.m).find((k) => k.endsWith('${suffix}'))); })()`;
  const agg = {};
  for (const [label, type] of TYPES) {
    const id = 'chr009-set-' + label;
    await ev(`(() => { const ed = window.__nodeGraphEditor; const c = ed.getActiveComponent().owner.getComponentWithName('/App');
      if (!c.graph.findNodeWithId('${id}')) { const { NodeGraphNode } = ${mod('models/nodegraphmodel/NodeGraphNode.ts')}; c.graph.addRoot(NodeGraphNode.fromJSON({ type: '${type}', id: '${id}', x: 900, y: 40 })); } })()`);
    await sleep(1500);
    await ev(`window.__nodeGraphEditor.selectNode(window.__nodeGraphEditor.findNodeWithId('${id}'))`);
    await sleep(2500);
    // open every collapsed section
    await ev(`[...document.querySelectorAll('.sidebar-property-editor .property-group-header, .sidebar-property-editor [class*="CollapsableSection-module__Header"]')].forEach((h) => { const g = h.parentElement; if (g && !g.querySelector('.property-panel-row, [class*="PropertyPanelInput-module__Root"]')) h.click(); })`);
    await sleep(1500);
    if (await ev(`document.querySelector('.sidebar-property-editor').getBoundingClientRect().width < 400`)) { await ev(`document.querySelector('[data-test="side-panel-wide-toggle"]').click()`); await sleep(1500); }
    console.log(label, 'width', await ev(`Math.round(document.querySelector('.sidebar-property-editor').getBoundingClientRect().width)`));
    const rows = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('.sidebar-property-editor [class*="PropertyPanelInput-module__InputContainer"] > div')].filter((w) => w.getBoundingClientRect().width > 0).map((w) => {
      const kids = [...w.children]; const c = kids[0];
      const cls = String(c.className).split(' ')[0].replace(/-module__.*/, '') || c.tagName;
      const used = kids.reduce((s, k) => s + k.getBoundingClientRect().width, 0) + 4 * (kids.length - 1);
      return { label: w.closest('[class*="PropertyPanelInput-module__Root"]').querySelector('[class*="Label"]').textContent, cls, w: Math.round(c.getBoundingClientRect().width), slack: Math.round(w.getBoundingClientRect().width - used) };
    }))`));
    for (const r of rows) { const k = r.cls + (r.slack > 2 ? ' SLACK' : ' full'); (agg[k] = agg[k] || []).push(label + ':' + r.label + '(' + r.w + '/+' + r.slack + ')'); }
  }
  for (const [k, v] of Object.entries(agg)) console.log(k, v.length, v.slice(0, 12).join(', '));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
