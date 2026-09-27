const fs = require('fs');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = process.argv[2];
(async () => { const c = await connect(await appTarget()); const ev = (e) => evaluate(c, e);
 await c.send('Emulation.setDeviceMetricsOverride', { width: 1368, height: 900, deviceScaleFactor: 1, mobile: false });
 const pick = async () => { await ev(`window.__nodeGraphEditor.selectNode(window.__nodeGraphEditor.findNodeWithId('chr009-set-group'))`); await sleep(1500); await ev(`window.__nodeGraphEditor.selectNode(window.__nodeGraphEditor.findNodeWithId('chr009-set-text'))`); await sleep(2500); };
 const read = () => ev(`(() => { const P = document.querySelector('.sidebar-property-editor'); const t = P.querySelector('textarea'); const row = t.closest('[class*="PropertyPanelInput-module__Root"]'); const lab = row.querySelector('[class*="Label"]').getBoundingClientRect(); const tr = t.getBoundingClientRect(); const cs = getComputedStyle(t); return JSON.stringify({ ta: tr.height, row: row.getBoundingClientRect().height, lh: cs.lineHeight, pad: cs.paddingTop, value: t.value, sh: t.scrollHeight, labelMidMinusTaMid: Math.round((lab.top + lab.height / 2) - (tr.top + tr.height / 2)) }); })()`);
 const shoot = async (name) => { const r = JSON.parse(await ev(`JSON.stringify(document.querySelector('.sidebar-property-editor textarea').closest('.property-group, [class*="CollapsableSection"]').getBoundingClientRect())`)); const { data } = await c.send('Page.captureScreenshot', { format: 'png', clip: { x: r.x - 16, y: r.y - 8, width: r.width + 32, height: r.height + 16, scale: 2 } }); fs.writeFileSync(OUT + '/' + name + '.png', Buffer.from(data, 'base64')); };
 const node = `window.__nodeGraphEditor.findNodeWithId('chr009-set-text').model`;
 for (const theme of ['dark', 'light']) {
  await ev(`document.documentElement.setAttribute('data-theme', '${theme}')`);
  for (const [name, val] of [['one-line', undefined], ['three-lines', ['First line', 'Second line', 'Third line'].join(String.fromCharCode(10))]]) {
   await ev(`${node}.setParameter('text', ${val === undefined ? 'undefined' : JSON.stringify(val)})`); await pick(); await pick();
   console.log(theme, name, await read()); await shoot(`textarea-${name}-${theme}`);
  }
 }
 await ev(`${node}.setParameter('text', undefined)`); await ev(`document.documentElement.setAttribute('data-theme', 'dark')`);
 process.exit(0); })().catch((e) => { console.error(e); process.exit(1); });
