// CHR-009 slice 2 — the head on paths the Group drive does not take: the Comment tab's own content,
// and a node of another category (glyph, eyebrow, no State row). Scratch copy only.
const fs = require('fs'); const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXPECT = (process.argv.find((a) => a.startsWith('--expect=')) || '').slice(9);
(async () => {
  const client = await connect(await appTarget());
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1368, height: 900, deviceScaleFactor: 2, mobile: false });
  const ev = (e) => evaluate(client, e);
  const dir = await ev(`(() => { let r; window.webpackChunknoodl_editor.push([['x' + Math.random()], {}, (x) => { r = x; }]); return r.c['./src/editor/src/models/projectmodel.ts'].exports.ProjectModel.instance._retainedProjectDirectory; })()`);
  if (dir !== EXPECT) throw new Error('not the scratch copy: ' + dir);
  const shot = async (name, h = 520) => {
    const box = JSON.parse(await ev(`(() => { const p = [...document.querySelectorAll('[class*="BasePanel-module__Root"]')].find((x) => x.offsetParent !== null && x.querySelector('.property-editor-tabs')); const r = p.getBoundingClientRect(); return JSON.stringify({ x: r.x, width: r.width }); })()`));
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { x: box.x, y: 0, width: box.width, height: h, scale: 1 } });
    fs.writeFileSync(path.join(__dirname, name), Buffer.from(data, 'base64'));
  };
  const out = {};
  await ev(`document.documentElement.setAttribute('data-theme', 'dark')`);
  // 1. Comment tab content on the Group.
  await ev(`[...document.querySelectorAll('.property-editor-tabs [role=tab]')].find((t) => t.textContent.trim() === 'Comment').click()`);
  await sleep(800);
  out.commentTab = JSON.parse(await ev(`JSON.stringify((() => { const f = document.querySelector('.property-comment-input'); const r = f.getBoundingClientRect(); return { fieldTop: Math.round(r.top), fieldHeight: Math.round(r.height), fieldWidth: Math.round(r.width), placeholder: f.placeholder }; })())`));
  await shot('comment-tab-dark.png', 360);
  await ev(`[...document.querySelectorAll('.property-editor-tabs [role=tab]')].find((t) => t.textContent.trim() === 'Properties').click()`);
  await sleep(500);
  // 2. The first node of a non-visual category anywhere in the project.
  const picked = await ev(`(() => { const ed = window.__nodeGraphEditor; const project = ed.getActiveComponent().owner; for (const c of project.getComponents()) { let hit; c.graph.forEachNode((n) => { if (!hit && n.type && n.type.color && n.type.color !== 'visual' && n.type.color !== 'component') hit = n; }); if (hit) { ed.switchToComponent(c, { pushHistory: false }); return JSON.stringify({ component: c.name, id: hit.id, type: hit.type.name, color: hit.type.color }); } } return 'none'; })()`);
  out.picked = picked;
  const p = JSON.parse(picked);
  await sleep(2500);
  out.select = await ev(`(() => { const ed = window.__nodeGraphEditor; const n = ed.findNodeWithId(${JSON.stringify(p.id)}); if (!n) return 'no view node'; ed.selectNode(n); return 'ok'; })()`);
  await sleep(2500);
  out.other = JSON.parse(await ev(`JSON.stringify({ eyebrow: (document.querySelector('.property-type-chip') || {}).textContent, glyphColor: getComputedStyle(document.querySelector('.property-node-glyph')).color, rows: [...document.querySelectorAll('.panel-head-row-label')].map((l) => l.textContent), tabs: [...document.querySelectorAll('.property-editor-tabs [role=tab]')].map((t) => t.textContent.trim()), firstLabelTop: (() => { const l = document.querySelector('.sidebar-property-editor [class*="PropertyPanelInput-module__Label"], .sidebar-property-editor .property-label'); return l && Math.round(l.getBoundingClientRect().top); })() })`));
  await shot('other-node-dark.png');
  console.log(JSON.stringify(out, null, 1));
  fs.writeFileSync(path.join(__dirname, 'extra-paths-results.json'), JSON.stringify(out, null, 2));
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
