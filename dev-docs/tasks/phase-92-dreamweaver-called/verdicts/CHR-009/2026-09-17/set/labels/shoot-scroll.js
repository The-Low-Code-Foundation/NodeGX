// CHR-009 R6 — a PICTURE of the renamed rows. The census only counts cuts; s12/s15/s25 each had
// numbers pass while the picture was broken, so the four renamed labels are read off a PNG.
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const P = `document.querySelector('.sidebar-property-editor')`;
(async () => {
  const client = await connect(await appTarget());
  const ev = (e) => evaluate(client, e); // evaluate() already unwraps to the value (drive-set.js)
  const dir = await ev(`(() => { let r; window.webpackChunknoodl_editor.push([['shoot-' + Math.floor(Math.random() * 1e9)], {}, (x) => { r = x; }]); const m = r(Object.keys(r.m).find((k) => k.endsWith('models/projectmodel.ts'))); return m.ProjectModel.instance._retainedProjectDirectory; })()`);
  if (dir !== process.argv[2]) throw new Error('not the scratch copy: ' + dir);
  await ev(`(() => { const ed = window.__nodeGraphEditor; const n = ed.findNodeWithId('chr009-set-group'); ed.selectNode(n); })()`);
  await sleep(2500);
  // Open every collapsed section so the scroll groups are drawn, then park each one at the top.
  await ev(`[...${P}.querySelectorAll('button.property-group-label[aria-expanded="false"]')].forEach((h) => h.click())`);
  await sleep(1500);
  for (const name of ['Scroll To Element', 'Scroll To Index', 'Style']) {
    const y = await ev(`(() => { const h = [...${P}.querySelectorAll('button.property-group-label')].find((b) => b.querySelector('.property-group-name').textContent.trim() === '${name}'); if (!h) return -1; let p = ${P}; while (p && p.scrollHeight <= p.clientHeight) p = p.parentElement; p.scrollTop += h.getBoundingClientRect().top - p.getBoundingClientRect().top - 8; return 1; })()`);
    if (y !== 1) { console.log('no section', name); continue; }
    await sleep(900);
    const box = JSON.parse(await ev(`(() => { const r = ${P}.getBoundingClientRect(); return JSON.stringify({ x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.width, height: Math.min(r.height, 420) }); })()`));
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { ...box, scale: 2 } });
    fs.writeFileSync(path.join(__dirname, `${name.toLowerCase().replace(/ /g, '-')}.png`), Buffer.from(data, 'base64'));
    console.log('shot', name, JSON.stringify(box));
  }
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
