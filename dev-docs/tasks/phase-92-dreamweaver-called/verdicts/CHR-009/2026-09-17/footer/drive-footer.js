// CHR-009 slice 9 — `Advanced CSS` as the panel's footer row: count as plain muted text, a rule above.
//
// Group `app_root` on the scratch copy. If nothing under Advanced CSS is set, sets `cssClassName` (the copy only)
// and reselects so the count is drawn. Then, both themes, scrolled to the bottom: measures the footer heading, its
// count's computed style, and the rule above it (the previous group's border-bottom); shoots the crop with the
// footer modifier removed in the page (BEFORE: the rule keys on that class alone) and restored (AFTER), plus a 4x
// zoom of each. Finally clicks the footer open and closed with the mouse.
//
// 🔴 Refuses to run against anything but the scratch copy.
//
//   NOODL_REMOTE_DEBUG_PORT=9333 node drive-footer.js --expect=<scratch copy dir> [--out=<dir>]
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const outDir = opt('out', path.join(__dirname, 'after'));
const EXPECT = opt('expect', '');
const NODE = 'app_root';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FOOTER = `[...document.querySelectorAll('.sidebar-property-editor .property-group--advanced > .property-group-label')][0]`;

const MEASURE = `(() => {
  const f = ${FOOTER};
  if (!f) return JSON.stringify({ error: 'no Advanced CSS heading' });
  const base = [...document.querySelectorAll('[class*="BasePanel-module__Root"]')].find((x) => x.offsetParent !== null && x.querySelector('.sidebar-property-editor'));
  const top0 = base.getBoundingClientRect().top, left0 = base.getBoundingClientRect().left;
  const rel = (r) => ({ top: Math.round(r.top - top0), left: Math.round(r.left - left0), width: Math.round(r.width), height: Math.round(r.height) });
  const group = f.parentElement;
  const prev = group.previousElementSibling;
  const b = f.querySelector('.property-group-badge');
  const bs = b && getComputedStyle(b);
  const ps = prev && getComputedStyle(prev);
  const fs = getComputedStyle(f);
  return JSON.stringify({
    hasFooterClass: f.classList.contains('property-group-label--footer'),
    expanded: f.getAttribute('aria-expanded'),
    heading: rel(f.getBoundingClientRect()),
    headingColor: fs.color, headingFont: fs.fontFamily.split(',')[0] + ' ' + fs.fontSize,
    name: f.querySelector('.property-group-name').textContent,
    count: b ? { text: b.textContent, rect: rel(b.getBoundingClientRect()), bg: bs.backgroundColor, padding: bs.padding, radius: bs.borderRadius, color: bs.color, weight: bs.fontWeight, letterSpacing: bs.letterSpacing, font: bs.fontFamily.split(',')[0] + ' ' + bs.fontSize } : null,
    countRightGap: b ? Math.round(f.getBoundingClientRect().right - b.getBoundingClientRect().right) : null,
    ruleAbove: prev ? { prevClass: prev.className, borderBottom: ps.borderBottomWidth + ' ' + ps.borderBottomStyle + ' ' + ps.borderBottomColor, prevBottom: Math.round(prev.getBoundingClientRect().bottom - top0), groupTop: Math.round(group.getBoundingClientRect().top - top0) } : null
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
  const shot = async (name) => {
    const box = JSON.parse(await ev(`(() => { const p = [...document.querySelectorAll('[class*="BasePanel-module__Root"]')].find((x) => x.offsetParent !== null && x.querySelector('.property-editor-tabs')); const r = p.getBoundingClientRect(); return JSON.stringify({ x: Math.max(0, r.x), width: r.width }); })()`));
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { x: box.x, y: 0, width: box.width, height: 900, scale: 1 } });
    fs.writeFileSync(path.join(outDir, name), Buffer.from(data, 'base64'));
  };
  const zoom = async (selectorExpr, name) => {
    const r = JSON.parse(await ev(`JSON.stringify((${selectorExpr}).getBoundingClientRect())`));
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { x: r.x - 4, y: r.y - 12, width: r.width + 8, height: r.height + 16, scale: 4 } });
    fs.writeFileSync(path.join(outDir, name), Buffer.from(data, 'base64'));
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
  // 🔴 s17/s19: the served bundle can carry the change while the renderer still runs the old module.
  const fresh = await ev(`(() => { let r; window.webpackChunknoodl_editor.push([['drv-' + Math.floor(Math.random() * 1e9)], {}, (x) => { r = x; }]); const k = Object.keys(r.m).find((k) => k.endsWith('propertyeditor/components/PropertyGroups.tsx')); return !!k && String(r.m[k]).includes('property-group-label--footer'); })()`);
  console.log('renderer runs slice 9:', fresh);
  if (!fresh) throw new Error('renderer does not run the slice-9 PropertyGroups');
  if (!EXPECT || dir !== EXPECT) throw new Error('refusing to drive a project that is not the scratch copy: ' + dir);

  await ev(`(() => { const ed = window.__nodeGraphEditor; ed.switchToComponent(ed.getActiveComponent().owner.getComponentWithName('/App'), { pushHistory: false }); })()`);
  await sleep(3000);
  const select = async () => {
    console.log(await ev(`(() => { const ed = window.__nodeGraphEditor; const n = ed.findNodeWithId(${JSON.stringify(NODE)}); if (!n) return 'no node'; ed.selectNode(n); return 'selected ' + n.model.type.name; })()`));
    await must(`!!${FOOTER}`, 30000, 'Advanced CSS heading');
    await sleep(1200);
  };
  await select();

  const results = { setup: {}, measured: {}, click: {} };
  // The footer is folded by default; make sure it is, so the count is drawn.
  if ((await ev(`${FOOTER}.getAttribute('aria-expanded')`)) === 'true') {
    await ev(`${FOOTER}.click()`);
    await sleep(600);
  }
  if (!(await ev(`!!${FOOTER}.querySelector('.property-group-badge')`))) {
    // 🔴 A setup write to setParameter is invisible to an open panel: reselect after.
    results.setup.wrote = await ev(`(() => { const m = window.__nodeGraphEditor.findNodeWithId(${JSON.stringify(NODE)}).model; const has = (m.getPorts ? m.getPorts('input') : []).some((p) => p.name === 'cssClassName'); if (!has) return 'no cssClassName port'; m.setParameter('cssClassName', 'drive-footer'); return 'cssClassName=drive-footer'; })()`);
    await ev(`window.__nodeGraphEditor.deselect ? window.__nodeGraphEditor.deselect() : window.__nodeGraphEditor.clearSelection && window.__nodeGraphEditor.clearSelection()`);
    await sleep(800);
    await select();
  }
  if (!(await ev(`!!${FOOTER}.querySelector('.property-group-badge')`))) {
    // 🔴 First run: the reselect did not redraw the count either (the ports hash is unchanged). A toggle
    // clears the hash, so open and fold it once.
    await ev(`${FOOTER}.click()`);
    await sleep(600);
    await ev(`${FOOTER}.click()`);
    await sleep(600);
    results.setup.toggledToRedraw = true;
  }
  results.setup.badge = await ev(`!!${FOOTER}.querySelector('.property-group-badge')`);
  if (!results.setup.badge) throw new Error('no count drawn on the Advanced CSS footer; nothing to measure');
  console.log('setup', JSON.stringify(results.setup));

  const scroller = `(() => { const s = document.querySelector('.sidebar-property-editor'); let p = s; while (p && p.scrollHeight <= p.clientHeight) p = p.parentElement; return p; })()`;
  for (const theme of ['dark', 'light']) {
    await ev(`document.documentElement.setAttribute('data-theme', '${theme}')`);
    await sleep(800); // a theme write is not visible in the same eval
    await ev(`(() => { const p = ${scroller}; if (p) p.scrollTop = p.scrollHeight; })()`);
    await sleep(600);
    // BEFORE: the modifier removed in the page — the only thing the new CSS keys on.
    await ev(`${FOOTER}.classList.remove('property-group-label--footer')`);
    await sleep(400);
    results.measured[theme + 'Before'] = JSON.parse(await ev(MEASURE));
    await shot(`props-group-footer-before-${theme}.png`);
    await zoom(FOOTER, `zoom-footer-before-${theme}.png`);
    await ev(`${FOOTER}.classList.add('property-group-label--footer')`);
    await sleep(400);
    results.measured[theme + 'After'] = JSON.parse(await ev(MEASURE));
    await shot(`props-group-footer-${theme}.png`);
    await zoom(FOOTER, `zoom-footer-${theme}.png`);
    console.log(theme, JSON.stringify({ before: results.measured[theme + 'Before'].count, after: results.measured[theme + 'After'] }));
  }

  // Real mouse: open, then close.
  await ev(`document.documentElement.setAttribute('data-theme', 'dark')`);
  await sleep(600);
  const pressFooter = async () => {
    const pt = JSON.parse(await ev(`(() => { const el = ${FOOTER}; const r = el.getBoundingClientRect(); const x = r.left + 60, y = r.top + r.height / 2; const hit = document.elementFromPoint(x, y); return JSON.stringify({ x, y, reachable: !!hit && (hit === el || el.contains(hit)) }); })()`));
    if (!pt.reachable) throw new Error('footer not reachable ' + JSON.stringify(pt));
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await client.send('Input.dispatchMouseEvent', { type, x: pt.x, y: pt.y, button: 'left', clickCount: type === 'mouseMoved' ? 0 : 1 });
    }
    await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
    await sleep(700);
    return JSON.parse(await ev(`JSON.stringify({ expanded: ${FOOTER}.getAttribute('aria-expanded'), footerClass: ${FOOTER}.classList.contains('property-group-label--footer'), badge: !!${FOOTER}.querySelector('.property-group-badge'), childrenHidden: ${FOOTER}.parentElement.querySelector('.property-group-children').classList.contains('hidden') })`));
  };
  results.click.open = await pressFooter();
  await shot('props-group-footer-open-dark.png');
  results.click.close = await pressFooter();
  console.log('click', JSON.stringify(results.click));

  fs.writeFileSync(path.join(outDir, 'footer-results.json'), JSON.stringify(results, null, 2));
  console.log('wrote', outDir);
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
