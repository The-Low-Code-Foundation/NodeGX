// CHR-009 §25.5 — the nested sub-groups draw their labels 11px right of every other row
// (`.property-group--advanced > .property-group-children` = 1px border + 10px padding). AC2 never
// saw it: its census reads only the rows visible near the top, which are never nested ones.
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const P = `document.querySelector('.sidebar-property-editor')`;
(async () => {
  const client = await connect(await appTarget());
  const ev = (e) => evaluate(client, e);
  for (const name of ['Advanced CSS', 'Placement', 'Pointer Events']) {
    const ok = await ev(`(() => { const h = [...${P}.querySelectorAll('button.property-group-label')].find((b) => b.querySelector('.property-group-name').textContent.trim() === '${name}'); if (!h) return -1; let p = ${P}; while (p && p.scrollHeight <= p.clientHeight) p = p.parentElement; p.scrollTop += h.getBoundingClientRect().top - p.getBoundingClientRect().top - 40; return 1; })()`);
    if (ok !== 1) { console.log('no section', name); continue; }
    await sleep(900);
    const box = JSON.parse(await ev(`(() => { const r = ${P}.getBoundingClientRect(); return JSON.stringify({ x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.width, height: 320 }); })()`));
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { ...box, scale: 2 } });
    fs.writeFileSync(path.join(__dirname, `flat-${name.toLowerCase().replace(/ /g, '-')}.png`), Buffer.from(data, 'base64'));
    console.log('shot', name);
  }
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
