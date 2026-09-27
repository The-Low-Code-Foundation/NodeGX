// CHR-009 slice 1 — the row geometry, measured on the rendered panel, both themes.
//
// Grades what AC2 names (font sizes, label left edges, control heights, fills, radii) over the
// VISIBLE, text-bearing part of the panel (CHR-001 §6.2), plus R6's trial number: how many labels
// the 116px column actually cuts, over EVERY row of the node (scrolled or not).
//
// 🔴 Refuses to run against anything but the scratch copy — the drive selects nodes, and opening a
// project writes into it.
//
//   NOODL_REMOTE_DEBUG_PORT=9333 node drive.js --out=<dir> --expect=<scratch copy dir> [--tag=after]
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const outDir = opt('out', path.join(__dirname, 'after'));
const EXPECT = opt('expect', '');
const TAG = opt('tag', 'after');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TARGETS = [
  { label: 'group', component: '/App', node: 'app_root' }
];

const MEASURE = `(() => {
  const panel = document.querySelector('.sidebar-property-editor');
  if (!panel) return JSON.stringify({ error: 'no panel' });
  const pr = panel.getBoundingClientRect();
  const vh = window.innerHeight;
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > Math.max(pr.top, 0) && r.top < vh; };
  const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const all = [...panel.querySelectorAll('*')];
  const shown = all.filter(visible);
  const sizes = {};
  for (const el of shown) if (ownText(el)) { const s = getComputedStyle(el).fontSize; sizes[s] = (sizes[s] || 0) + 1; }
  const fills = {}; const radii = {};
  for (const el of shown) {
    const cs = getComputedStyle(el);
    if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') fills[cs.backgroundColor] = (fills[cs.backgroundColor] || 0) + 1;
    if (cs.borderTopLeftRadius !== '0px') radii[cs.borderTopLeftRadius] = (radii[cs.borderTopLeftRadius] || 0) + 1;
  }
  const labels = all.filter((el) => /PropertyPanelInput-module__Label/.test(el.className) || el.classList.contains('property-label'));
  const labelLefts = {};
  for (const l of labels.filter(visible)) { const x = Math.round(l.getBoundingClientRect().left); labelLefts[x] = (labelLefts[x] || 0) + 1; }
  const cut = labels.filter((l) => l.getBoundingClientRect().width > 0 && l.scrollWidth > l.clientWidth + 1).map((l) => l.textContent.trim());
  const controls = shown.filter((el) => el.matches('input:not([type=checkbox]):not([type=radio]):not([type=range]), select, [class*="SelectInput-module__Root"], [class*="BaseInput-module__Root"]'));
  const heights = {};
  for (const c of controls) { const h = Math.round(c.getBoundingClientRect().height); heights[h] = (heights[h] || 0) + 1; }
  const chevron = panel.querySelector('.property-group-chevron');
  // 🔴 Slice 1's first run read "2 font sizes, 30px headers" while Width drew \`1(\` — the numbers
  // could not see a clipped value. Read the value field itself: does its text fit its box?
  const dimRows = labels.filter((l) => /^(Width|Height)$/.test(l.textContent.trim())).map((l) => {
    const row = l.parentElement; const input = row && row.querySelector('input');
    const fixed = row && [...row.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Fixed');
    return { label: l.textContent.trim(), value: input && input.value, clipped: input ? input.scrollWidth > input.clientWidth + 1 : null,
      inputWidth: input && Math.round(input.getBoundingClientRect().width), rowHeight: row && Math.round(row.getBoundingClientRect().height),
      fixedChip: fixed ? { pressed: fixed.getAttribute('aria-pressed'), disabled: fixed.disabled, height: Math.round(fixed.getBoundingClientRect().height) } : null };
  });
  return JSON.stringify({
    elements: all.length,
    visibleTextSizes: sizes,
    fills, radii, labelLefts,
    labels: labels.length, labelsDrawn: labels.filter((l) => l.getBoundingClientRect().width > 0).length,
    cut: cut.length, cutLabels: cut,
    controlHeights: heights,
    chevronIsSvg: !!(chevron && chevron.querySelector('svg')),
    dimRows,
    groupHeaderHeight: (() => { const h = panel.querySelector('.property-group-label'); return h && Math.round(h.getBoundingClientRect().height); })()
  });
})()`;

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const client = await connect(await appTarget());
  await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1368, height: 900, deviceScaleFactor: 2, mobile: false });
  const ev = (e) => evaluate(client, e);
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
  if (!EXPECT || dir !== EXPECT) throw new Error('refusing to drive a project that is not the scratch copy: ' + dir);

  const results = {};
  for (const t of TARGETS) {
    await ev(`(() => { const ed = window.__nodeGraphEditor; ed.switchToComponent(ed.getActiveComponent().owner.getComponentWithName(${JSON.stringify(t.component)}), { pushHistory: false }); })()`);
    await sleep(3000);
    const sel = await ev(`(() => { const ed = window.__nodeGraphEditor; const n = ed.findNodeWithId(${JSON.stringify(t.node)}); if (!n) return 'no node'; ed.selectNode(n); return 'selected ' + (n.model || n).type.name; })()`);
    console.log(t.node, sel);
    await waitFor(`!!document.querySelector('.sidebar-property-editor .property-group')`, 30000);
    await sleep(2500);

    for (const theme of ['dark', 'light']) {
      await ev(`document.documentElement.setAttribute('data-theme', '${theme}')`);
      await sleep(800); // a theme write is not visible in the same eval
      await ev(`(() => { const s = document.querySelector('.sidebar-property-editor'); let p = s; while (p && p.scrollHeight <= p.clientHeight) p = p.parentElement; if (p) p.scrollTop = 0; })()`);
      await sleep(400);
      const m = JSON.parse(await ev(MEASURE));
      results[`${t.label}-${theme}`] = m;
      console.log(t.label, theme, JSON.stringify({ ...m, cutLabels: undefined }));
      const box = JSON.parse(await ev(`(() => { const p = [...document.querySelectorAll('[class*="BasePanel-module__Root"]')].find((x) => x.offsetParent !== null && x.querySelector('.sidebar-property-editor')); const r = (p || document.querySelector('.sidebar-property-editor')).getBoundingClientRect(); return JSON.stringify({ x: Math.max(0, r.x), width: r.width }); })()`));
      const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { x: box.x, y: 0, width: box.width, height: 900, scale: 1 } });
      fs.writeFileSync(path.join(outDir, `props-${t.label}-top-${theme}.png`), Buffer.from(data, 'base64'));
    }
  }
  fs.writeFileSync(path.join(outDir, `${TAG}-results.json`), JSON.stringify(results, null, 2));
  console.log('wrote', outDir);
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
