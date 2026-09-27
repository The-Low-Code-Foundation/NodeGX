// CHR-012 drive: the launcher's Community tab — every room, two window sizes, two themes, one connection.
//   NOODL_REMOTE_DEBUG_PORT=9333 node drive.js <outDir> [--sizes=1368x900,700x500] [--themes=dark,light]
//                                               [--rooms=bench,chat,tutorials,replays,people] [--prefix=x-]
// Per shot: a PNG (top; and bottom when the page scrolls); geometry (title / toolbar / column, sideways
// scroll, anything past the right edge); controls BY KIND (AC2: `PrimaryButton` the only button component,
// `Chip` the only chip); VISIBLE TEXT-BEARING font sizes on the page and inside the content area (R1, ≤ 6);
// words that state a target (AC3, R9); and CHR-005's rendered-contrast pass over every control (R3), copied
// unchanged. Rules carried from CHR-001/003/005: one theme write then a sleep; scroll with scrollBehavior
// auto; viewport by emulation on THIS connection.
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require(path.resolve(__dirname, '../../../../../../scripts/devtools/cdp.js'));

const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--'));
const opt = (name, fallback) => (args.find((a) => a.startsWith(`--${name}=`)) || `=${fallback}`).split('=')[1];
const sizes = opt('sizes', '1368x900,700x500').split(',');
const themes = opt('themes', 'dark,light').split(',');
const rooms = opt('rooms', 'bench,chat,tutorials,replays,people').split(',');
const prefix = opt('prefix', '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const GEOMETRY = `(() => {
  const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const content = document.querySelector('[class*="Launcher-module__ContentArea"]');
  const title = content && content.querySelector('h1');
  const page = title && title.closest('[class*="LauncherPage-module__Root"]');
  const column = page && page.querySelector('[class*="LauncherPage-module__Column"]');
  const toolbar = page && page.querySelector('[class*="LauncherPage-module__Toolbar"]');
  const actions = page && page.querySelector('[class*="LauncherPage-module__Actions"]');
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
    title: rect(title), titleText: title && title.textContent, actions: rect(actions), toolbar: rect(toolbar), column: rect(column),
    contentBottom: column ? Math.round(column.getBoundingClientRect().bottom) : null,
    scrolls: content ? content.scrollHeight > content.clientHeight + 1 : null,
    documentScrollsSideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    contentScrollsSideways: content ? content.scrollWidth > content.clientWidth : null,
    pastRightEdge
  });
})()`;

// AC2 — by KIND, not CHR-001's every-button count (CHR-005 §6.3: that instrument counts tabs, chips and cards).
const CONTROLS = `(() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const key = (el) => { const s = getComputedStyle(el);
    return [s.borderRadius, s.fontSize, s.fontWeight, s.backgroundColor, s.borderTopWidth + ' ' + s.borderTopStyle + ' ' + s.borderTopColor].join(' | '); };
  const content = document.querySelector('[class*="Launcher-module__ContentArea"]');
  const kinds = { 'PrimaryButton': [], 'filter chip': [], 'room tab': [], 'row': [], 'retry link': [], 'other': [] };
  for (const el of (content || document).querySelectorAll('button,[role="button"],a[class*="utton"]')) {
    if (!vis(el)) continue;
    const c = String(el.className);
    const kind = /PrimaryButton-module__Root/.test(c) ? 'PrimaryButton'
      : /is-variant-filter/.test(c) ? 'filter chip'
      : el.getAttribute('role') === 'tab' ? 'room tab'
      : /Community-module__Row\\b|Community-module__Row /.test(c) || /Community-module__Row/.test(c) && !/RowWords/.test(c) ? 'row'
      : /Community-module__RetryButton/.test(c) ? 'retry link' : 'other';
    kinds[kind].push(el);
  }
  const out = {};
  for (const [k, els] of Object.entries(kinds)) {
    const styles = {};
    for (const el of els) { const kk = key(el); (styles[kk] = styles[kk] || []).push((el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)); }
    out[k] = { count: els.length, distinct: Object.keys(styles).length, styles, classes: k === 'other' ? els.map((e) => String(e.className).slice(0, 60)) : undefined };
  }
  return JSON.stringify(out);
})()`;

// R1 — visible (on screen), text-bearing (an element with its own non-blank text node) font sizes.
const TYPE = `(() => {
  const onScreen = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
  const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const count = (root) => { if (!root) return null; const sizes = {};
    for (const el of root.querySelectorAll('*')) { if (!ownText(el) || !onScreen(el)) continue;
      const f = getComputedStyle(el).fontSize; (sizes[f] = sizes[f] || []).push(el.textContent.trim().slice(0, 24)); }
    return { distinct: Object.keys(sizes).length,
      sizes: Object.fromEntries(Object.entries(sizes).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])).map(([k, v]) => [k, { n: v.length, e: v.slice(0, 3) }])) }; };
  return JSON.stringify({ page: count(document.body), content: count(document.querySelector('[class*="Launcher-module__ContentArea"]')) });
})()`;

// AC3 / R9 — no text on the tab states a target or uses n= notation.
const TARGET_WORDS = `(() => {
  const content = document.querySelector('[class*="Launcher-module__ContentArea"]');
  const all = content ? content.innerText : '';
  const words = ['How the community is doing', 'of 30 threads', 'consecutive weeks', 'median first reply', 'n=', 'target under'];
  return JSON.stringify({ chars: all.length, found: words.filter((w) => all.includes(w)) });
})()`;

// CHR-005's rendered contrast, unchanged: a control's boundary is its fill against the ground behind it, or an
// edge that clears BOTH its fill and that ground; a control with no fill and no edge is graded on text only.
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
  const content = document.querySelector('[class*="Launcher-module__ContentArea"]') || document;
  for (const el of content.querySelectorAll('button, [role="button"], select, input')) {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const s = getComputedStyle(el); if (s.visibility === 'hidden') continue;
    const ground = groundOf(el.parentElement); if (!ground) continue;
    const own = parse(s.backgroundColor);
    const fill = own && own.a > 0 ? over(own, ground) : ground;
    const row = { label: (el.getAttribute('aria-label') || el.textContent || el.placeholder || '').trim().slice(0, 28),
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
  const openCommunity = await ev(`(() => { const b = [...document.querySelectorAll('nav[aria-label="Launcher sections"] button')].find((x) => x.textContent === 'Community'); if (b) b.click(); return !!b; })()`);
  if (!openCommunity) throw new Error('no Community tab in the launcher nav');
  await sleep(6000); // the mirror's first read

  const results = {};
  const shoot = async (name) => {
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(data, 'base64'));
  };
  const scrollTo = (where) => ev(`(() => { const c = document.querySelector('[class*="Launcher-module__ContentArea"]'); if (!c) return null;
    c.style.scrollBehavior = 'auto'; c.scrollTop = ${where === 'bottom' ? 'c.scrollHeight' : '0'}; return c.scrollTop; })()`);

  for (const theme of themes) {
    await ev(`document.documentElement.setAttribute('data-theme', '${theme}')`);
    await sleep(700);
    for (const size of sizes) {
      const [width, height] = size.split('x').map(Number);
      await client.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      await sleep(900);
      for (const room of rooms) {
        const clicked = await ev(`(() => { const b = document.querySelector('[data-test="community-tab-${room}"]'); if (b) b.click(); return !!b; })()`);
        const name = `${prefix}community-${room}-${width}x${height}-${theme}`;
        if (!clicked) { results[name] = { room, theme, size, skipped: 'no tab for this room (not wired for this viewer)' }; console.log(name, 'SKIPPED'); continue; }
        await sleep(2500);
        await scrollTo('top');
        await sleep(400);
        await shoot(`${name}-top`);
        const row = { room, theme, size, geometry: JSON.parse(await ev(GEOMETRY)) };
        row.controls = JSON.parse(await ev(CONTROLS));
        row.type = JSON.parse(await ev(TYPE));
        row.targetWords = JSON.parse(await ev(TARGET_WORDS));
        row.contrast = JSON.parse(await ev(CONTRAST));
        if (row.geometry.scrolls) { await scrollTo('bottom'); await sleep(400); await shoot(`${name}-bottom`); row.typeAtBottom = JSON.parse(await ev(TYPE)); await scrollTo('top'); }
        results[name] = row;
        fs.writeFileSync(path.join(outDir, 'raw', `${name}.json`), JSON.stringify(row, null, 2));
        const g = row.geometry;
        const k = row.controls;
        console.log(name, JSON.stringify({ title: g.title, toolbar: g.toolbar, bottom: g.contentBottom, scrolls: g.scrolls,
          sideways: g.documentScrollsSideways || g.contentScrollsSideways, pastRight: g.pastRightEdge.length,
          kinds: Object.fromEntries(Object.entries(k).map(([kk, v]) => [kk, `${v.count}/${v.distinct}`])),
          sizesContent: row.type.content && row.type.content.distinct, sizesPage: row.type.page && row.type.page.distinct,
          target: row.targetWords.found, boundaryUnder3: row.contrast.boundaryUnder3.length, textUnder45: row.contrast.textUnder45.length }));
      }
    }
  }
  await client.send('Emulation.clearDeviceMetricsOverride');
  fs.writeFileSync(path.join(outDir, `${prefix}results.json`), JSON.stringify(results, null, 2));
  console.log('done', Object.keys(results).length, 'rows');
  process.exit(0);
})().catch((e) => {
  console.error('FAILED', e.message);
  process.exit(1);
});
