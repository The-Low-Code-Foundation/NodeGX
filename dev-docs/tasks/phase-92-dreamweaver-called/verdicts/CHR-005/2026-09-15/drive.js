// CHR-005 drive: the launcher's four tabs at two window sizes and two themes, over one connection.
//   NOODL_REMOTE_DEBUG_PORT=9333 node drive.js <outDir> [--sizes=1368x900,700x500] [--themes=dark,light]
//                                              [--tabs=Projects,Community,Learning,Templates] [--prefix=x-]
// Per shot: a PNG; the geometry AC1 grades (title / toolbar / column rects, sideways scroll, anything
// past the window's right edge); a per-kind count of button and chip styles (AC2) with CHR-001's
// measure.js run UNCHANGED beside it; and a rendered-contrast pass over every control (AC5, R3).
// Rules carried from CHR-001/003: one theme write then a sleep (a write is invisible in the same eval);
// scroll with scrollBehavior auto (smooth scroll reads 0); viewport by emulation on THIS connection.
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require(path.resolve(__dirname, '../../../../../../scripts/devtools/cdp.js'));

const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--'));
const opt = (name, fallback) => (args.find((a) => a.startsWith(`--${name}=`)) || `=${fallback}`).split('=')[1];
const sizes = opt('sizes', '1368x900,700x500').split(',');
const themes = opt('themes', 'dark,light').split(',');
const tabs = opt('tabs', 'Projects,Community,Learning,Templates').split(',');
const prefix = opt('prefix', '');
const MEASURE = fs.readFileSync(path.resolve(__dirname, '../../CHR-001/2026-09-15/measure.js'), 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const GEOMETRY = `(() => {
  const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const content = document.querySelector('[class*="Launcher-module__ContentArea"]');
  const title = content && content.querySelector('h1');
  const page = title && title.closest('[class*="LauncherPage-module__Root"]');
  const column = page && page.querySelector('[class*="LauncherPage-module__Column"]');
  const toolbar = page && page.querySelector('[class*="LauncherPage-module__Toolbar"]');
  const pastRightEdge = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.left >= innerWidth) continue;
    if (getComputedStyle(el).visibility === 'hidden') continue;
    if (r.right > innerWidth + 0.5) pastRightEdge.push({ tag: el.tagName, cls: String(el.className).slice(0, 50),
      text: (el.textContent || '').trim().slice(0, 30), right: Math.round(r.right) });
  }
  return JSON.stringify({
    viewport: [innerWidth, innerHeight],
    theme: document.documentElement.getAttribute('data-theme'),
    title: rect(title), titleText: title && title.textContent, toolbar: rect(toolbar), column: rect(column),
    header: rect(document.querySelector('header')),
    documentScrollsSideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    contentScrollsSideways: content ? content.scrollWidth > content.clientWidth : null,
    pastRightEdge
  });
})()`;

const CONTROLS = `(() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const key = (el) => { const s = getComputedStyle(el);
    return [s.borderRadius, s.fontSize, s.fontWeight, s.backgroundColor, s.borderTopWidth + ' ' + s.borderTopStyle + ' ' + s.borderTopColor].join(' | '); };
  const kinds = { 'header tab': [], 'PrimaryButton': [], 'filter chip': [], 'card': [], 'other': [] };
  for (const el of document.querySelectorAll('button,[role="button"],a[class*="utton"]')) {
    if (!vis(el)) continue;
    const c = String(el.className);
    const kind = el.closest('nav[aria-label="Launcher sections"]') ? 'header tab'
      : /PrimaryButton-module__Root/.test(c) ? 'PrimaryButton'
      : /is-variant-filter/.test(c) ? 'filter chip'
      : /LauncherCard-module__Card/.test(c) ? 'card' : 'other';
    kinds[kind].push(el);
  }
  const out = {};
  for (const [k, els] of Object.entries(kinds)) {
    const styles = {};
    for (const el of els) { const kk = key(el); (styles[kk] = styles[kk] || []).push((el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)); }
    out[k] = { count: els.length, distinct: Object.keys(styles).length, styles };
  }
  const radii = {};
  for (const el of document.querySelectorAll('body *')) { if (!vis(el)) continue; const r = getComputedStyle(el).borderRadius; if (r !== '0px') radii[r] = (radii[r] || 0) + 1; }
  return JSON.stringify({ kinds: out, radii });
})()`;

// Rendered contrast. A control's boundary is found either by its fill against the ground behind it,
// or by an edge that clears BOTH its fill and that ground (POL-016's two sides). A control with no
// fill and no edge is identified by its words (the text variant) and is graded on text only.
const CONTRAST = `(() => {
  const parse = (c) => { const m = /rgba?\\(([^)]+)\\)/.exec(c || ''); if (!m) return null;
    const p = m[1].split(',').map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const groundOf = (el) => { const stack = [];
    for (let n = el; n; n = n.parentElement) { const s = getComputedStyle(n);
      if (s.backgroundImage && s.backgroundImage !== 'none') return null;
      const c = parse(s.backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; } }
    let g = { r: 255, g: 255, b: 255, a: 1 }; for (let i = stack.length - 1; i >= 0; i--) g = over(stack[i], g); return g; };
  const rows = [];
  const sel = 'button, [role="button"], select, [class*="LauncherSearchBar-module__Search"], [class*="LauncherSearchBar-module__Select"]';
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const s = getComputedStyle(el); if (s.visibility === 'hidden') continue;
    if (el.tagName === 'SELECT' && parseFloat(s.borderTopWidth) === 0) continue; // its box is the wrapper
    const ground = groundOf(el.parentElement); if (!ground) continue;           // on a picture or gradient
    const own = parse(s.backgroundColor);
    const fill = own && own.a > 0 ? over(own, ground) : ground;
    const row = { label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 28),
      cls: String(el.className).split(' ')[0].slice(0, 44), disabled: el.disabled === true };
    row.fillOnGround = +ratio(fill, ground).toFixed(2);
    const bc = parse(s.borderTopColor);
    const hasEdge = parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none' && bc && bc.a > 0;
    if (hasEdge) { row.edgeOnFill = +ratio(over(bc, fill), fill).toFixed(2); row.edgeOnGround = +ratio(over(bc, ground), ground).toFixed(2); }
    row.textOnly = !hasEdge && row.fillOnGround < 1.05;
    row.boundary = +Math.max(row.fillOnGround, hasEdge ? Math.min(row.edgeOnFill, row.edgeOnGround) : 0).toFixed(2);
    const fg = parse(s.color); if (fg) row.text = +ratio(over(fg, fill), fill).toFixed(2);
    rows.push(row);
  }
  return JSON.stringify({
    controls: rows.length,
    boundaryUnder3: rows.filter((r) => !r.textOnly && !r.disabled && r.boundary < 3),
    textUnder45: rows.filter((r) => !r.disabled && r.text !== undefined && r.text < 4.5),
    rows
  });
})()`;

(async () => {
  fs.mkdirSync(path.join(outDir, 'raw'), { recursive: true });
  const client = await connect(await appTarget());
  await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  const ev = (expr) => evaluate(client, expr);
  const t0 = Date.now();
  while (!(await ev(`!!document.querySelector('nav[aria-label="Launcher sections"]')`))) {
    if (Date.now() - t0 > 60000) throw new Error('launcher nav never appeared');
    await sleep(500);
  }

  const results = {};
  for (const theme of themes) {
    await ev(`document.documentElement.setAttribute('data-theme', '${theme}')`);
    await sleep(700);
    for (const size of sizes) {
      const [width, height] = size.split('x').map(Number);
      await client.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      await sleep(900);
      for (const tab of tabs) {
        const clicked = await ev(`(() => { const b = [...document.querySelectorAll('nav[aria-label="Launcher sections"] button')].find((x) => x.textContent === '${tab}'); if (b) b.click(); return !!b; })()`);
        if (!clicked) throw new Error('no tab ' + tab);
        await sleep(3500);
        await ev(`(() => { const c = document.querySelector('[class*="Launcher-module__ContentArea"]'); if (c) { c.style.scrollBehavior = 'auto'; c.scrollTop = 0; } })()`);
        await sleep(400);
        const name = `${prefix}launcher-${tab.toLowerCase()}-${width}x${height}-${theme}`;
        const { data } = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(data, 'base64'));
        const row = { tab, theme, size, geometry: JSON.parse(await ev(GEOMETRY)) };
        row.controls = JSON.parse(await ev(CONTROLS));
        row.contrast = JSON.parse(await ev(CONTRAST));
        if (tab === 'Templates') row.chr001Measure = JSON.parse(await ev(MEASURE.split('__ROOT__').join('body')));
        results[name] = row;
        fs.writeFileSync(path.join(outDir, 'raw', `${name}.json`), JSON.stringify(row, null, 2));
        const g = row.geometry;
        console.log(name, JSON.stringify({ title: g.title, toolbar: g.toolbar, column: g.column, sideways: g.documentScrollsSideways || g.contentScrollsSideways,
          pastRight: g.pastRightEdge.length, boundaryUnder3: row.contrast.boundaryUnder3.length, textUnder45: row.contrast.textUnder45.length }));
      }
    }
  }
  await client.send('Emulation.clearDeviceMetricsOverride');
  fs.writeFileSync(path.join(outDir, `${prefix}results.json`), JSON.stringify(results, null, 2));
  console.log('done', Object.keys(results).length, 'shots');
  process.exit(0);
})().catch((e) => {
  console.error('FAILED', e.message);
  process.exit(1);
});
