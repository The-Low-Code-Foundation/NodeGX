// CHR-006 drive: the Templates tab as the homepage's Demos grid, at two window sizes and two themes.
//   NOODL_REMOTE_DEBUG_PORT=9333 node drive.js <outDir> [--sizes=1368x900,900x700] [--themes=dark,light] [--prefix=x-]
// Per size×theme: a shot at the top of the page and one scrolled to the grid's end, plus
//   - the shelf STATE first (loading / unreadable / partial / rows): an empty grid is a different surface;
//   - every card: rect, eyebrow, title, sentence, footer words, and its picture (img present, loaded, natural size);
//   - the grid's rows as the x-positions of cards sharing a y (2 + 3 + 2 at 1368; two columns at 900);
//   - every resource URL the page requested that names an image host other than the shelf (placekitten = AC3);
//   - the rendered-contrast rows for the eyebrow, title, sentence, action and tags on their card.
// Rules carried from CHR-001/003/005: one theme write then a sleep; scrollBehavior auto; emulation on THIS connection.
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require(path.resolve(__dirname, '../../../../../../scripts/devtools/cdp.js'));

const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--'));
const opt = (name, fallback) => (args.find((a) => a.startsWith(`--${name}=`)) || `=${fallback}`).split('=')[1];
const sizes = opt('sizes', '1368x900,900x700').split(',');
const themes = opt('themes', 'dark,light').split(',');
const prefix = opt('prefix', '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const READ = `(() => {
  const parse = (c) => { const m = /rgba?\\(([^)]+)\\)/.exec(c || ''); if (!m) return null;
    const p = m[1].split(',').map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const groundOf = (el) => { const stack = [];
    for (let n = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; } }
    let g = { r: 255, g: 255, b: 255, a: 1 }; for (let i = stack.length - 1; i >= 0; i--) g = over(stack[i], g); return g; };
  const textRatio = (el) => { if (!el) return null; const fg = parse(getComputedStyle(el).color); const g = groundOf(el);
    return fg ? +ratio(over(fg, g), g).toFixed(2) : null; };
  const rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };

  const content = document.querySelector('[class*="Launcher-module__ContentArea"]');
  const title = content && content.querySelector('h1');
  const words = content ? content.innerText : '';
  const grid = content && content.querySelector('ul[data-layout]');
  const cards = [...document.querySelectorAll('[data-test="template-card"]')].map((card) => {
    const img = card.querySelector('img');
    const q = (c) => card.querySelector('[class*="LauncherCard-module__' + c + '"]');
    return {
      rect: rect(card),
      eyebrow: q('Eyebrow') && q('Eyebrow').textContent,
      title: q('Title') && q('Title').textContent,
      sentence: q('Description') && q('Description').textContent.slice(0, 60),
      footer: q('Footer') && q('Footer').innerText.replace(/\\s+/g, ' '),
      picture: img ? { src: img.getAttribute('src'), hidden: img.hidden, complete: img.complete, natural: [img.naturalWidth, img.naturalHeight],
        objectPosition: getComputedStyle(img).objectPosition, objectFit: getComputedStyle(img).objectFit }
        : (q('Wireframe') ? 'wireframe' : null),
      contrast: { eyebrow: textRatio(q('Eyebrow')), title: textRatio(q('Title')), sentence: textRatio(q('Description')),
        action: textRatio(q('Action')), tags: [...card.querySelectorAll('[class*="LauncherCard-module__Tag"]')].filter((t) => !/Tags/.test(t.className)).map((t) => ({ text: t.textContent, ratio: textRatio(t) })) }
    };
  });
  const byRow = {};
  for (const c of cards) (byRow[c.rect.y] = byRow[c.rect.y] || []).push(c.rect.w);
  const resources = performance.getEntriesByType('resource').map((e) => e.name);
  return JSON.stringify({
    viewport: [innerWidth, innerHeight],
    theme: document.documentElement.getAttribute('data-theme'),
    titleText: title && title.textContent,
    state: { loading: /Looking for templates/.test(words), unreadable: /could not be loaded/.test(words),
      bare: /No templates published yet/.test(words), partialNotice: !!(content && content.querySelector('[role="status"]')) },
    gridLayout: grid && grid.getAttribute('data-layout'),
    gridColumns: grid && getComputedStyle(grid).gridTemplateColumns,
    rows: Object.entries(byRow).map(([y, widths]) => ({ y: +y, cards: widths.length, widths })),
    cards,
    thumbnailRequests: resources.filter((u) => /thumbnail|templates\\/landing-pages\\.webp/.test(u)),
    kittenRequests: resources.filter((u) => /placekitten/.test(u)),
    documentScrollsSideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    contentScrollsSideways: content ? content.scrollWidth > content.clientWidth : null
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
  const clicked = await ev(`(() => { const b = [...document.querySelectorAll('nav[aria-label="Launcher sections"] button')].find((x) => x.textContent === 'Templates'); if (b) b.click(); return !!b; })()`);
  if (!clicked) throw new Error('no Templates tab');
  // The shelf is a network read: wait for it to SETTLE, then read which state it settled in.
  const t1 = Date.now();
  while (await ev(`/Looking for templates/.test(document.body.innerText)`)) {
    if (Date.now() - t1 > 30000) throw new Error('the shelf never settled');
    await sleep(500);
  }
  await sleep(2500);

  const results = {};
  for (const theme of themes) {
    await ev(`document.documentElement.setAttribute('data-theme', '${theme}')`);
    await sleep(700);
    for (const size of sizes) {
      const [width, height] = size.split('x').map(Number);
      await client.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      await sleep(1500);
      for (const where of ['top', 'bottom']) {
        await ev(`(() => { const c = document.querySelector('[class*="Launcher-module__ContentArea"]'); if (c) { c.style.scrollBehavior = 'auto'; c.scrollTop = ${where === 'top' ? 0 : 'c.scrollHeight'}; } })()`);
        await sleep(900);
        const name = `${prefix}templates-${width}x${height}-${theme}-${where}`;
        const { data } = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(data, 'base64'));
        const row = JSON.parse(await ev(READ));
        results[name] = row;
        fs.writeFileSync(path.join(outDir, 'raw', `${name}.json`), JSON.stringify(row, null, 2));
        console.log(name, JSON.stringify({
          state: row.state, layout: row.gridLayout, cols: row.gridColumns, rows: row.rows.map((r) => r.widths.join('+')),
          pictures: row.cards.map((c) => (typeof c.picture === 'object' && c.picture ? (c.picture.complete && c.picture.natural[0] > 0 && !c.picture.hidden ? 'img' : 'img-FAILED') : c.picture)).join(','),
          kitten: row.kittenRequests.length, sideways: row.documentScrollsSideways || row.contentScrollsSideways,
          minText: Math.min(...row.cards.flatMap((c) => [c.contrast.eyebrow, c.contrast.title, c.contrast.sentence, c.contrast.action, ...c.contrast.tags.map((t) => t.ratio)]).filter((x) => x !== null))
        }));
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
