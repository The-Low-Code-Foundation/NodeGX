// CHR-009 slice 7 — the Border Style / Corner Radius scope pickers as rows of the label column.
//
// Was an unlabelled strip of 32px icons off the column. Now `Edge` / `Corner` rows: a 26px segmented track,
// a segment per side, a mark on a side holding its own value. This drive measures both rows at slice 6's
// bottom crop (scrollTop 1120), both themes, and shoots it; then (dark) real input: pick the top-left corner,
// type 8 into the one Corner Radius field it shows, go back to All corners — the mark is on top-left — undo.
//
// 🔴 Refuses to run against anything but the scratch copy.
//
//   NOODL_REMOTE_DEBUG_PORT=9333 node drive-scope.js --expect=<scratch copy dir> [--out=<dir>] [--no-input]
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const outDir = opt('out', path.join(__dirname, 'after'));
const EXPECT = opt('expect', '');
const NO_INPUT = args.includes('--no-input');
const NODE = 'app_root';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MEASURE = `(() => {
  const panel = document.querySelector('.sidebar-property-editor');
  if (!panel) return JSON.stringify({ error: 'no panel' });
  const base = [...document.querySelectorAll('[class*="BasePanel-module__Root"]')].find((x) => x.offsetParent !== null && x.querySelector('.sidebar-property-editor'));
  const top0 = base.getBoundingClientRect().top, left0 = base.getBoundingClientRect().left;
  const rel = (r) => ({ top: Math.round(r.top - top0), left: Math.round(r.left - left0), width: Math.round(r.width * 10) / 10, height: Math.round(r.height * 10) / 10 });
  const rows = [...panel.querySelectorAll('[data-test="scope-row"]')].map((row) => {
    const label = row.querySelector('[class*="PropertyPanelInput-module__Label"]');
    const track = row.querySelector('[role="group"]');
    const segs = [...track.querySelectorAll('button')];
    const group = row.closest('.property-tab-group');
    const shown = [...group.querySelector('.properties').children].filter((c) => c.offsetParent !== null);
    return {
      label: label && label.textContent.trim(), labelBox: rel(label.getBoundingClientRect()), labelCut: label.scrollWidth > label.clientWidth,
      track: rel(track.getBoundingClientRect()), rowHeight: Math.round(row.getBoundingClientRect().height * 10) / 10,
      segments: segs.map((b) => ({ tab: b.dataset.tab, pressed: b.getAttribute('aria-pressed'), set: b.dataset.set || null, title: b.title, box: rel(b.getBoundingClientRect()),
        glyph: b.querySelector('svg') ? rel(b.querySelector('svg').getBoundingClientRect()) : null, color: getComputedStyle(b).color, bg: getComputedStyle(b).backgroundColor,
        mark: b.querySelector('[class*="SetMark"]') ? rel(b.querySelector('[class*="SetMark"]').getBoundingClientRect()) : null })),
      shownRows: shown.map((c) => { const l = c.querySelector('[class*="PropertyPanelInput-module__Label"], .property-label'); return l ? l.textContent.trim() : c.className; })
    };
  });
  return JSON.stringify({
    rows,
    oldStripElements: panel.querySelectorAll('.property-tab, .property-tab-icon').length,
    groupHeaders: [...panel.querySelectorAll('.property-group-label')].map((h) => ({ name: h.textContent.trim(), top: Math.round(h.getBoundingClientRect().top - top0) })).filter((h) => /Border|Corner|Shadow|Style/i.test(h.name)),
    labelLefts: [...new Set([...panel.querySelectorAll('[class*="PropertyPanelInput-module__Label"], .property-label')].filter((l) => l.offsetParent !== null).map((l) => Math.round(l.getBoundingClientRect().left - left0)))]
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
    while (Date.now() - t0 < ms) { try { if ((await ev(expr)) === true) return true; } catch (e) { /* reloading */ } await sleep(200); }
    return false;
  };
  const must = async (expr, ms, what) => { if (!(await waitFor(expr, ms))) throw new Error('timed out: ' + (what || expr)); };
  const pointOf = async (selectorExpr, what) => {
    const pt = JSON.parse(await ev(`(() => { const el = ${selectorExpr}; if (!el) return JSON.stringify({ miss: 'no element' }); const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const hit = document.elementFromPoint(x, y); return JSON.stringify({ x, y, reachable: !!hit && (hit === el || el.contains(hit)), hit: hit && (hit.className || hit.tagName) + '' }); })()`));
    if (pt.miss || !pt.reachable) throw new Error(`${what}: not reachable ${JSON.stringify(pt)}`);
    return pt;
  };
  const click = async (selectorExpr, what) => {
    const pt = await pointOf(selectorExpr, what);
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await client.send('Input.dispatchMouseEvent', { type, x: pt.x, y: pt.y, button: 'left', clickCount: type === 'mouseMoved' ? 0 : 1 });
    }
    await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
    return pt;
  };
  const model = `window.__nodeGraphEditor.findNodeWithId(${JSON.stringify(NODE)}).model`;
  const param = async (name) => JSON.parse(await ev(`JSON.stringify(${model}.parameters[${JSON.stringify(name)}] ?? null)`));
  const scroller = `(() => { const s = document.querySelector('.sidebar-property-editor'); let p = s; while (p && p.scrollHeight <= p.clientHeight) p = p.parentElement; return p; })()`;
  const shot = async (name) => {
    const box = JSON.parse(await ev(`(() => { const p = [...document.querySelectorAll('[class*="BasePanel-module__Root"]')].find((x) => x.offsetParent !== null && x.querySelector('.property-editor-tabs')); const r = p.getBoundingClientRect(); return JSON.stringify({ x: Math.max(0, r.x), width: r.width }); })()`));
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { x: box.x, y: 0, width: box.width, height: 900, scale: 1 } });
    fs.writeFileSync(path.join(outDir, name), Buffer.from(data, 'base64'));
  };
  const rowByLabel = (label) => `[...document.querySelectorAll('.sidebar-property-editor [class*="PropertyPanelInput-module__Root"]')].find((r) => { const l = r.querySelector('[class*="PropertyPanelInput-module__Label"]'); return l && l.textContent.trim() === ${JSON.stringify(label)}; })`;
  const scrollToLabel = async (label) => {
    await ev(`(() => { const p = ${scroller}; const r = ${rowByLabel(label)}; if (p && r) p.scrollTop += r.getBoundingClientRect().top - 400; })()`);
    await sleep(500);
  };

  if (!(await ev(`!!(window.__nodeGraphEditor && window.__nodeGraphEditor.getActiveComponent())`))) {
    await must(`!!document.querySelector('nav[aria-label="Launcher sections"]')`, 240000, 'launcher');
    await ev(`[...document.querySelectorAll('nav[aria-label="Launcher sections"] button')].find((b) => b.textContent === 'Projects').click()`);
    await sleep(2500);
    const clicked = await ev(`(() => { const c = [...document.querySelectorAll('[class*="LauncherCard-module__Card"]')].find((x) => x.innerText.includes('Story engine')); if (!c) return false; c.click(); return true; })()`);
    if (!clicked) throw new Error('no Story engine card');
  }
  await must(`!!window.__nodeGraphEditor && !!window.__nodeGraphEditor.getActiveComponent()`, 120000, 'editor');
  await sleep(4000);
  const dir = await ev(`(() => { let r; window.webpackChunknoodl_editor.push([['drv-' + Math.floor(Math.random() * 1e9)], {}, (x) => { r = x; }]); const m = r.c['./src/editor/src/models/projectmodel.ts']; return m ? m.exports.ProjectModel.instance._retainedProjectDirectory : 'unknown'; })()`);
  console.log('project:', dir);
  // 🔴 s17: the served bundle can carry the change while the renderer still runs the old module.
  const fresh = await ev(`(() => { let r; window.webpackChunknoodl_editor.push([['drv-' + Math.floor(Math.random() * 1e9)], {}, (x) => { r = x; }]); const k = Object.keys(r.m).find((k) => k.endsWith('propertyeditor/model/scopeRows.ts')); return !!k && String(r.m[k]).includes('Top left corner'); })()`);
  console.log('renderer runs scopeRows:', fresh);
  if (!fresh) throw new Error('renderer does not run the slice-7 module');
  if (!EXPECT || dir !== EXPECT) throw new Error('refusing to drive a project that is not the scratch copy: ' + dir);

  await ev(`(() => { const ed = window.__nodeGraphEditor; ed.switchToComponent(ed.getActiveComponent().owner.getComponentWithName('/App'), { pushHistory: false }); })()`);
  await sleep(3000);
  console.log(await ev(`(() => { const ed = window.__nodeGraphEditor; const n = ed.findNodeWithId(${JSON.stringify(NODE)}); if (!n) return 'no node'; ed.selectNode(n); return 'selected ' + n.model.type.name; })()`));
  await must(`!!document.querySelector('.sidebar-property-editor [data-test="scope-row"]')`, 30000, 'scope rows');
  await sleep(1500);

  const results = { measured: {}, interaction: {} };
  for (const theme of ['dark', 'light']) {
    await ev(`document.documentElement.setAttribute('data-theme', '${theme}')`);
    await sleep(800); // a theme write is not visible in the same eval
    await ev(`(() => { const p = ${scroller}; if (p) p.scrollTop = 1120; })()`);
    await sleep(600);
    results.measured[theme + 'Bottom'] = JSON.parse(await ev(MEASURE));
    await shot(`props-group-bottom-${theme}.png`);
    const m = results.measured[theme + 'Bottom'];
    console.log(theme, JSON.stringify({ old: m.oldStripElements, headers: m.groupHeaders, lefts: m.labelLefts, rows: m.rows.map((r) => ({ label: r.label, labelLeft: r.labelBox.left, cut: r.labelCut, row: r.rowHeight, track: r.track, segW: r.segments.map((s) => s.box.width), glyph: r.segments.map((s) => s.glyph && s.glyph.width + 'x' + s.glyph.height), pressed: r.segments.filter((s) => s.pressed === 'true').map((s) => s.tab), shown: r.shownRows })) }));
  }

  if (!NO_INPUT) {
    await ev(`document.documentElement.setAttribute('data-theme', 'dark')`);
    await sleep(600);
    const I = results.interaction;
    const seg = (tab) => `document.querySelector('.sidebar-property-editor [data-test="scope-row"] button[data-tab="${tab}"]')`;
    const cornerRow = () => `[...document.querySelectorAll('.sidebar-property-editor [data-test="scope-row"]')].find((r) => r.querySelector('button[data-tab^="corners"]'))`;
    const readCorner = async () => JSON.parse(await ev(`(() => { const row = ${cornerRow()}; const g = row.closest('.property-tab-group'); const shown = [...g.querySelector('.properties').children].filter((c) => c.offsetParent !== null); return JSON.stringify({ pressed: [...row.querySelectorAll('button[aria-pressed="true"]')].map((b) => b.dataset.tab), set: [...row.querySelectorAll('button[data-set="true"]')].map((b) => b.dataset.tab), marks: row.querySelectorAll('[class*="SetMark"]').length, shownRows: shown.length, shownValue: shown[0] && shown[0].querySelector('input') ? shown[0].querySelector('input').value : null }); })()`));
    await ev(`(() => { const p = ${scroller}; const r = ${cornerRow()}; if (p && r) p.scrollTop += r.getBoundingClientRect().top - 400; })()`);
    await sleep(600);
    I.before = { model: await param('borderTopLeftRadius'), ...(await readCorner()) };
    await click(seg('corners-top-left'), 'top-left segment');
    await sleep(600);
    I.topLeftPicked = { model: await param('borderTopLeftRadius'), ...(await readCorner()) };
    // the one Corner Radius field now on screen: real keystrokes, Enter
    await click(`(() => { const g = ${cornerRow()}.closest('.property-tab-group'); const shown = [...g.querySelector('.properties').children].find((c) => c.offsetParent !== null); return shown.querySelector('[class*="NumberUnitInput-module__Field"] input, input'); })()`, 'top-left radius field');
    await ev(`document.activeElement && document.activeElement.select && document.activeElement.select()`);
    await client.send('Input.insertText', { text: '8' });
    await client.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await sleep(800);
    await ev(`document.activeElement && document.activeElement.blur()`);
    await sleep(400);
    I.typed8 = { model: await param('borderTopLeftRadius'), allRadius: await param('borderRadius'), ...(await readCorner()) };
    await click(seg('corners-all'), 'all-corners segment');
    await sleep(600);
    I.backToAll = { model: await param('borderTopLeftRadius'), ...(await readCorner()) };
    await shot('props-group-scope-set-dark.png');
    await ev(`window.__nodeGraphEditor.undo()`);
    await sleep(1000);
    I.undo = { model: await param('borderTopLeftRadius'), ...(await readCorner()) };
    await shot('props-group-scope-undo-dark.png');
    // borders: Left edge shows exactly Left's rows
    console.log('corner interaction', JSON.stringify(I));
    await ev(`(() => { const p = ${scroller}; const r = ${seg('borders-left')}; if (p && r) p.scrollTop += r.getBoundingClientRect().top - 400; })()`);
    await sleep(600);
    await click(seg('borders-left'), 'left edge segment');
    await sleep(600);
    I.leftEdge = JSON.parse(await ev(`(() => { const row = document.querySelector('.sidebar-property-editor [data-test="scope-row"] button[data-tab="borders-left"]').closest('[data-test="scope-row"]'); const g = row.closest('.property-tab-group'); const shown = [...g.querySelector('.properties').children].filter((c) => c.offsetParent !== null); return JSON.stringify({ pressed: [...row.querySelectorAll('button[aria-pressed="true"]')].map((b) => b.dataset.tab), shown: shown.map((c) => (c.querySelector('[class*="PropertyPanelInput-module__Label"], .property-label') || c).textContent.trim()), hiddenCount: g.querySelector('.properties').children.length - shown.length }); })()`));
    await shot('props-group-scope-left-edge-dark.png');
    await click(seg('borders-all'), 'all edges segment');
    await sleep(400);
    console.log('interaction', JSON.stringify(I));
  }

  fs.writeFileSync(path.join(outDir, 'scope-results.json'), JSON.stringify(results, null, 2));
  console.log('wrote', outDir);
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
