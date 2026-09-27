// CHR-009 §3.6 — the verdict set AC1 is ruled on, and AC2's eval, over the nodes whose rows differ most.
//
// For each target a FRESH node of that type is added to `/App` on the scratch copy (so every panel is at its defaults
// and no earlier drive's writes show), selected, and read:
//   - at the docked width (328) and at `wide` (the side panel's own toggle), both themes: the top of the panel as a PNG
//     and AC2's numbers over the VISIBLE, text-bearing part (font sizes, fills, radii, label left edges, control heights);
//   - dark, docked and wide: every section opened (then put back as it was), and every label, text or input value
//     whose content is wider than its box — the ellipsis census (R6's trial, `Box Sizing`, `Text Horizontal Align`).
// The TabGroup target is the Group (per-edge borders and corners); the PopoutGroup target is the Button (Label Text Style).
//
// 🔴 Refuses to run against anything but the scratch copy — it adds nodes, and opening a project writes into it.
//
//   NOODL_REMOTE_DEBUG_PORT=9333 node drive-set.js --expect=<scratch copy dir> [--out=<dir>] [--only=group,text]
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const outDir = opt('out', path.join(__dirname, 'after'));
const EXPECT = opt('expect', '');
const ONLY = opt('only', '').split(',').filter(Boolean);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TARGETS = [
  { label: 'group', type: 'Group' },
  { label: 'text', type: 'Text' },
  { label: 'image', type: 'Image' },
  { label: 'function', type: 'JavaScriptFunction' },
  { label: 'query-records', type: 'DbCollection2' },
  { label: 'columns', type: 'net.noodl.visual.columns' },
  { label: 'states', type: 'States' },
  { label: 'button-popout', type: 'net.noodl.controls.button' }
].filter((t) => !ONLY.length || ONLY.includes(t.label));

const P = `document.querySelector('.sidebar-property-editor')`;

const MEASURE = `(() => {
  const panel = ${P};
  if (!panel) return JSON.stringify({ error: 'no panel' });
  const pr = panel.getBoundingClientRect();
  const vh = window.innerHeight;
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > Math.max(pr.top, 0) && r.top < vh; };
  const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const all = [...panel.querySelectorAll('*')];
  const shown = all.filter(visible);
  const sizes = {}, fills = {}, radii = {};
  for (const el of shown) {
    const cs = getComputedStyle(el);
    if (ownText(el)) sizes[cs.fontSize] = (sizes[cs.fontSize] || 0) + 1;
    if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') fills[cs.backgroundColor] = (fills[cs.backgroundColor] || 0) + 1;
    if (cs.borderTopLeftRadius !== '0px') radii[cs.borderTopLeftRadius] = (radii[cs.borderTopLeftRadius] || 0) + 1;
  }
  const labels = all.filter((el) => /PropertyPanelInput-module__Label/.test(el.className) || el.classList.contains('property-label'));
  const labelLefts = {};
  for (const l of labels.filter(visible)) { const x = Math.round(l.getBoundingClientRect().left); labelLefts[x] = (labelLefts[x] || 0) + 1; }
  // 🔴 A number+unit field is ONE drawn box (26, bordered) holding a 24px input and a 24px unit select: the first run
  // read those insides as "12 controls at 24". Grade the outermost drawn field.
  const controls = [...new Set(shown.filter((el) => el.matches('input:not([type=checkbox]):not([type=radio]):not([type=range]), select, textarea, [class*="SelectInput-module__Root"], [class*="BaseInput-module__Root"]')).map((el) => el.closest('[class*="NumberUnitInput-module__Field"]') || el))];
  const heights = {};
  for (const c of controls) { const h = Math.round(c.getBoundingClientRect().height); heights[h] = (heights[h] || 0) + 1; }
  return JSON.stringify({ elements: all.length, panelWidth: Math.round(pr.width), visibleTextSizes: sizes, fills, radii, labelLefts, controlHeights: heights });
})()`;

// Every drawn thing whose content is wider than its box. Labels, text-bearing elements and input VALUES (a clipped
// placeholder is not visible to scrollWidth — the PNG is the check for those).
const CUTS = `(() => {
  const panel = ${P};
  const drawn = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const rowLabel = (el) => { const row = el.closest('.property-panel-row, [class*="PropertyPanelInput-module__Root"]'); const l = row && row.querySelector('[class*="PropertyPanelInput-module__Label"], .property-label'); return l ? l.textContent.trim() : null; };
  const out = [];
  for (const el of panel.querySelectorAll('*')) {
    if (!drawn(el)) continue;
    if (el.matches('input, textarea')) {
      if (el.value && el.scrollWidth > el.clientWidth + 1) out.push({ kind: 'value', row: rowLabel(el), text: el.value, box: el.clientWidth, content: el.scrollWidth });
    } else if (ownText(el) && el.scrollWidth > el.clientWidth + 1) {
      const isLabel = /PropertyPanelInput-module__Label/.test(el.className) || el.classList.contains('property-label');
      out.push({ kind: isLabel ? 'label' : 'text', row: isLabel ? null : rowLabel(el), text: el.textContent.trim().slice(0, 80), box: el.clientWidth, content: el.scrollWidth, cls: String(el.className).slice(0, 60) });
    }
  }
  const labels = [...panel.querySelectorAll('[class*="PropertyPanelInput-module__Label"], .property-label')].filter(drawn);
  return JSON.stringify({ labelsDrawn: labels.length, cuts: out });
})()`;

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const client = await connect(await appTarget());
  await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1368, height: 900, deviceScaleFactor: 1, mobile: false });
  const ev = (e) => evaluate(client, e);
  const waitFor = async (expr, ms = 120000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { try { if ((await ev(expr)) === true) return true; } catch (e) { /* reloading */ } await sleep(300); }
    return false;
  };
  const must = async (expr, ms, what) => { if (!(await waitFor(expr, ms))) throw new Error('timed out: ' + (what || expr)); };
  const mod = (suffix) => `(() => { let r; window.webpackChunknoodl_editor.push([['drv-' + Math.floor(Math.random() * 1e9)], {}, (x) => { r = x; }]); return r(Object.keys(r.m).find((k) => k.endsWith('${suffix}'))); })()`;

  if (!(await ev(`!!(window.__nodeGraphEditor && window.__nodeGraphEditor.getActiveComponent && window.__nodeGraphEditor.getActiveComponent())`))) {
    await must(`[...document.querySelectorAll('[class*="LauncherCard-module__Card"]')].some((x) => x.innerText.includes('Story engine'))`, 600000, 'launcher card');
    await sleep(2500);
    const clicked = await ev(`(() => { const c = [...document.querySelectorAll('[class*="LauncherCard-module__Card"]')].find((x) => x.innerText.includes('Story engine')); if (!c) return false; c.click(); return true; })()`);
    if (!clicked) throw new Error('no Story engine card');
  }
  await must(`!!window.__nodeGraphEditor && !!window.__nodeGraphEditor.getActiveComponent()`, 120000, 'editor');
  await sleep(4000);
  const dir = await ev(`${mod('models/projectmodel.ts')}.ProjectModel.instance._retainedProjectDirectory`);
  console.log('project:', dir);
  if (!EXPECT || dir !== EXPECT) throw new Error('refusing to drive a project that is not the scratch copy: ' + dir);

  await ev(`(() => { const ed = window.__nodeGraphEditor; ed.switchToComponent(ed.getActiveComponent().owner.getComponentWithName('/App'), { pushHistory: false }); })()`);
  await sleep(3000);

  const panelHostBox = async () => JSON.parse(await ev(`(() => { const p = [...document.querySelectorAll('[class*="BasePanel-module__Root"]')].find((x) => x.offsetParent !== null && x.querySelector('.sidebar-property-editor')); const r = (p || ${P}).getBoundingClientRect(); return JSON.stringify({ x: Math.max(0, r.x), width: r.width }); })()`));
  const scrollTop0 = () => ev(`(() => { let p = ${P}; while (p && p.scrollHeight <= p.clientHeight) p = p.parentElement; if (p) p.scrollTop = 0; })()`);
  const mode = () => ev(`(() => { const b = document.querySelector('[data-test="side-panel-wide-toggle"]'); return b ? (b.closest('[class]') && document.querySelector('.sidebar-property-editor') ? Math.round(${P}.getBoundingClientRect().width) : 0) : -1; })()`);
  const setWide = async (wide) => {
    const w0 = await mode();
    if (w0 === -1) throw new Error('no wide toggle');
    const isWide = w0 > 400;
    if (isWide !== wide) { await ev(`document.querySelector('[data-test="side-panel-wide-toggle"]').click()`); await sleep(1500); }
    return mode();
  };

  const results = {};
  for (const t of TARGETS) {
    const id = `chr009-set-${t.label}`;
    const added = await ev(`(() => {
      const ed = window.__nodeGraphEditor; const c = ed.getActiveComponent().owner.getComponentWithName('/App');
      if (c.graph.findNodeWithId('${id}')) return 'existing';
      const { NodeGraphNode } = ${mod('models/nodegraphmodel/NodeGraphNode.ts')};
      c.graph.addRoot(NodeGraphNode.fromJSON({ type: '${t.type}', id: '${id}', x: 900, y: 40 }));
      return 'added';
    })()`);
    await must(`!!window.__nodeGraphEditor.findNodeWithId('${id}')`, 20000, 'view node for ' + id);
    const sel = await ev(`(() => { const ed = window.__nodeGraphEditor; const n = ed.findNodeWithId('${id}'); ed.selectNode(n); return n.model.type.name + ' / ' + (n.model.type.displayNodeName || n.model.type.displayName || ''); })()`);
    console.log(t.label, added, sel);
    await must(`!!${P} && !!${P}.querySelector('.property-group, .property-panel-row, [class*="PropertyPanelInput-module__Root"]')`, 30000, 'panel rows for ' + t.label);
    await sleep(2500);

    const r = (results[t.label] = { type: t.type, selected: sel });
    for (const wide of [false, true]) {
      const width = await setWide(wide);
      const w = wide ? 'wide' : 'docked';
      r[`${w}-width`] = width;
      for (const theme of ['dark', 'light']) {
        await ev(`document.documentElement.setAttribute('data-theme', '${theme}')`);
        await sleep(800); // a theme write is not visible in the same eval
        await ev(`document.dispatchEvent(new MouseEvent('mousemove', { clientX: 5, clientY: 5 }))`);
        await scrollTop0();
        await sleep(400);
        r[`${w}-${theme}`] = JSON.parse(await ev(MEASURE));
        const box = await panelHostBox();
        const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { x: box.x, y: 0, width: box.width, height: 900, scale: 1 } });
        fs.writeFileSync(path.join(outDir, `props-${t.label}-${w}-top-${theme}.png`), Buffer.from(data, 'base64'));
      }
      await ev(`document.documentElement.setAttribute('data-theme', 'dark')`);
      await sleep(600);
      // Open every section, read the cuts, put the sections back as they were.
      const opened = JSON.parse(await ev(`(() => { const hs = [...${P}.querySelectorAll('button.property-group-label[aria-expanded="false"]')]; const names = hs.map((h) => h.querySelector('.property-group-name').textContent.trim()); hs.forEach((h) => h.click()); return JSON.stringify(names); })()`));
      await sleep(1500);
      r[`${w}-cuts`] = JSON.parse(await ev(CUTS));
      r[`${w}-opened`] = opened;
      await ev(`(() => { const names = ${JSON.stringify(opened)}; [...${P}.querySelectorAll('button.property-group-label[aria-expanded="true"]')].filter((h) => names.includes(h.querySelector('.property-group-name').textContent.trim())).forEach((h) => h.click()); })()`);
      await sleep(1000);
      const c = r[`${w}-cuts`];
      console.log(t.label, w, 'width', width, 'sizes', JSON.stringify(r[`${w}-dark`].visibleTextSizes), 'heights', JSON.stringify(r[`${w}-dark`].controlHeights), 'lefts', JSON.stringify(r[`${w}-dark`].labelLefts), `cuts ${c.cuts.length}/${c.labelsDrawn} labels drawn:`, JSON.stringify(c.cuts.map((x) => `${x.kind}:${x.row ? x.row + '=' : ''}${x.text}`)));
    }
    await setWide(false);
  }
  fs.writeFileSync(path.join(outDir, 'set-results.json'), JSON.stringify(results, null, 2));
  console.log('wrote', outDir);
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
