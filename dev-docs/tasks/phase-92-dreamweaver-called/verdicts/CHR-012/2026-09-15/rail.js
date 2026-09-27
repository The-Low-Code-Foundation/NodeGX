// CHR-012 §7.5 item 3: the rail's Community panel (`Panel` density), which CHR-012 touched in exactly two
// places — the filter pill is now `Chip` (28px, not the old 18px box) and `.ChipRow[role='group']` spaces it.
//   NOODL_REMOTE_DEBUG_PORT=9333 node rail.js <outDir> [--themes=dark,light]
// Precondition: a project is open in the editor. One connection; viewport by emulation on it.
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require(path.resolve(__dirname, '../../../../../../scripts/devtools/cdp.js'));

const args = process.argv.slice(2);
const outDir = args.find((a) => !a.startsWith('--'));
const themes = ((args.find((a) => a.startsWith('--themes=')) || '--themes=dark,light').split('=')[1]).split(',');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The rail's live Community panel: a visible BasePanel whose title reads Community.
const PANEL = `(() => [...document.querySelectorAll('[class*="BasePanel-module__Root"]')]
  .find((p) => p.offsetParent !== null && /^\\s*Community/.test(p.innerText)))()`;

// The rail's buttons are unlabelled DIVs; each carries `data-test="<panel id>-panel"`.
const OPEN = `(() => {
  const btn = document.querySelector('[data-test="community-panel"]');
  if (!btn || btn.offsetParent === null) return 'no rail button';
  btn.click();
  return 'clicked';
})()`;

const MEASURE = `(() => {
  const panel = ${PANEL};
  if (!panel) return JSON.stringify({ panel: null });
  const pr = panel.getBoundingClientRect();
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
    && r.bottom > pr.top && r.top < pr.bottom; };
  const key = (el) => { const s = getComputedStyle(el);
    return [s.borderRadius, s.fontSize, s.fontWeight, s.backgroundColor, s.borderTopWidth + ' ' + s.borderTopStyle].join(' | '); };
  const kinds = { PrimaryButton: [], 'filter chip': [], 'room tab': [], row: [], link: [], other: [] };
  for (const el of panel.querySelectorAll('button,[role="button"]')) {
    if (!vis(el)) continue;
    const c = String(el.className);
    const k = /PrimaryButton-module__Root/.test(c) ? 'PrimaryButton' : /is-variant-filter/.test(c) ? 'filter chip'
      : el.getAttribute('role') === 'tab' ? 'room tab' : /Community-module__Row/.test(c) ? 'row'
      : /LinkButton|RetryButton/.test(c) ? 'link' : 'other';
    kinds[k].push(el);
  }
  const controls = {};
  for (const [k, els] of Object.entries(kinds)) {
    const styles = {};
    for (const el of els) (styles[key(el)] = styles[key(el)] || []).push((el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24));
    controls[k] = { count: els.length, distinct: Object.keys(styles).length, styles,
      classes: k === 'other' ? els.map((e) => String(e.className).slice(0, 60)) : undefined };
  }
  const chips = [...panel.querySelectorAll('[class*="is-variant-filter"]')].filter(vis).map((el) => {
    const r = el.getBoundingClientRect(); return { text: el.textContent.trim().slice(0, 28), h: Math.round(r.height), w: Math.round(r.width), x: Math.round(r.x - pr.x), y: Math.round(r.y - pr.y) }; });
  const rows = [...panel.querySelectorAll('[role="group"]')].filter((g) => g.querySelector('[class*="is-variant-filter"]')).map((g) => {
    const s = getComputedStyle(g); const r = g.getBoundingClientRect();
    return { gap: s.gap, marginBottom: s.marginBottom, w: Math.round(r.width), h: Math.round(r.height), panelW: Math.round(pr.width), overflows: g.scrollWidth > g.clientWidth + 1 }; });
  const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const sizes = {};
  for (const el of panel.querySelectorAll('*')) { if (!ownText(el) || !vis(el)) continue; const f = getComputedStyle(el).fontSize; sizes[f] = (sizes[f] || 0) + 1; }
  const pastRight = [...panel.querySelectorAll('*')].filter((el) => { const r = el.getBoundingClientRect(); return vis(el) && r.right > pr.right + 0.5; })
    .map((el) => ({ cls: String(el.className).slice(0, 40), text: (el.textContent || '').trim().slice(0, 24), over: Math.round(el.getBoundingClientRect().right - pr.right) }));
  return JSON.stringify({ panel: { x: Math.round(pr.x), y: Math.round(pr.y), w: Math.round(pr.width), h: Math.round(pr.height) },
    rooms: [...panel.querySelectorAll('[data-test^="community-tab-"]')].map((t) => t.getAttribute('data-test')),
    controls, chips, chipRows: rows, sizes, pastRight: pastRight.slice(0, 8), pastRightCount: pastRight.length });
})()`;

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const client = await connect(await appTarget());
  await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1368, height: 900, deviceScaleFactor: 1, mobile: false });
  const ev = (expr) => evaluate(client, expr);
  await sleep(800);
  console.log('open:', await ev(OPEN));
  await sleep(6000);
  const first = JSON.parse(await ev(MEASURE));
  if (!first.panel) throw new Error('no visible Community panel in the rail');
  const rooms = first.rooms.length ? first.rooms.map((r) => r.replace('community-tab-', '')) : ['(default)'];
  const results = {};
  for (const theme of themes) {
    await ev(`document.documentElement.setAttribute('data-theme', '${theme}')`);
    await sleep(700);
    for (const room of rooms) {
      if (room !== '(default)') {
        await ev(`(() => { const p = ${PANEL}; const t = p && p.querySelector('[data-test="community-tab-${room}"]'); if (t) t.click(); return !!t; })()`);
        await sleep(2500);
      }
      const m = JSON.parse(await ev(MEASURE));
      const name = `rail-community-${room}-${theme}`;
      const { data } = await client.send('Page.captureScreenshot', { format: 'png',
        clip: { x: Math.max(0, m.panel.x - 60), y: 0, width: Math.min(m.panel.w + 60, 1368 - Math.max(0, m.panel.x - 60)), height: 900, scale: 1 } });
      fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(data, 'base64'));
      results[name] = m;
      console.log(name, JSON.stringify({ panel: m.panel, kinds: Object.fromEntries(Object.entries(m.controls).map(([k, v]) => [k, `${v.count}/${v.distinct}`])),
        chipH: [...new Set(m.chips.map((c) => c.h))], chipRows: m.chipRows, sizes: Object.keys(m.sizes), pastRight: m.pastRightCount }));
    }
  }
  await client.send('Emulation.clearDeviceMetricsOverride');
  fs.writeFileSync(path.join(outDir, 'rail-results.json'), JSON.stringify(results, null, 2));
  console.log('done', Object.keys(results).length, 'rows');
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
