// CHR-007 AC1: the property panel for ~20 node types, fingerprinted, so before and after can be diffed.
//   NOODL_REMOTE_DEBUG_PORT=9333 node panelFingerprint.js <outJson> [shotDir]
// Opens "Landing page test V2" from the launcher, walks components, selects the first node of each
// type through window.__nodeGraphEditor (no canvas coordinates), and reads .sidebar-property-editor.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const [outJson, shotDir] = process.argv.slice(2);
const COMPONENTS = ['/Sections/Contact', '/Sections/Work', '/Pages/Home', '/Components/WorkCard', '/Sections/Testimonials', '/App'];
const LIMIT = 20;
const SHOOT = ['Group', 'JavaScriptFunction', 'net.noodl.visual.columns', 'Expression'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const client = await connect(await appTarget());
  const ev = async (expr) => evaluate(client, expr);
  const waitFor = async (expr, ms = 90000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      try { if ((await ev(expr)) === true) return; } catch (e) { /* page reloading */ }
      await sleep(500);
    }
    throw new Error('timed out waiting for ' + expr);
  };

  const alreadyOpen = await ev(`!!(window.__nodeGraphEditor && window.__nodeGraphEditor.getActiveComponent())`);
  if (!alreadyOpen) {
    await waitFor(`!!document.querySelector('nav[aria-label="Launcher sections"]')`);
    await ev(`window.resizeTo(outerWidth + (1368 - innerWidth), outerHeight + (781 - innerHeight))`);
    await sleep(800);
    await ev(`[...document.querySelectorAll('nav[aria-label="Launcher sections"] button')].find(b => b.textContent === 'Projects').click()`);
    await sleep(2000);
    const opened = await ev(`(() => {
      const card = [...document.querySelectorAll('div[class^=LauncherProjectCard-module__Card]')].find(c => c.textContent.includes('Landing page test V2'));
      if (!card) return false; card.click(); return true; })()`);
    if (!opened) throw new Error('no Landing page test V2 card');
  } else {
    console.log('project already open — skipping the launcher');
  }
  await waitFor(`!!window.__nodeGraphEditor && !!window.__nodeGraphEditor.getActiveComponent()`);
  await sleep(5000);

  const picked = [];
  const seen = new Set();
  for (const name of COMPONENTS) {
    if (picked.length >= LIMIT) break;
    const found = await ev(`(() => {
      const ed = window.__nodeGraphEditor;
      const comp = ed.getActiveComponent().owner.getComponentWithName(${JSON.stringify(name)});
      if (!comp) return JSON.stringify(null);
      ed.switchToComponent(comp, { pushHistory: false });
      const rows = [];
      comp.graph.forEachNode((n) => { rows.push({ id: n.id, type: n.type && (n.type.name || n.type.localName), label: n.label }); });
      return JSON.stringify(rows);
    })()`);
    const rows = JSON.parse(found);
    if (!rows) { console.log('no component', name); continue; }
    await sleep(2500);
    for (const row of rows) {
      if (picked.length >= LIMIT) break;
      if (!row.type || seen.has(row.type)) continue;
      seen.add(row.type);
      picked.push({ component: name, ...row });
    }
  }

  const results = [];
  for (const p of picked) {
    const current = await ev(`window.__nodeGraphEditor.getActiveComponent().name`);
    if (current !== p.component) {
      await ev(`(() => { const ed = window.__nodeGraphEditor; ed.switchToComponent(ed.getActiveComponent().owner.getComponentWithName(${JSON.stringify(p.component)}), { pushHistory: false }); })()`);
      await sleep(2500);
    }
    const ok = await ev(`(() => { const ed = window.__nodeGraphEditor; const n = ed.findNodeWithId(${JSON.stringify(p.id)}); if (!n) return false; ed.selectNode(n); return true; })()`);
    if (!ok) { results.push({ ...p, error: 'node not found on canvas' }); continue; }
    await sleep(2500);
    const raw = await ev(`(() => {
      const root = document.querySelector('.sidebar-property-editor');
      if (!root) return JSON.stringify({ error: 'no panel' });
      const all = root.querySelectorAll('*');
      const leafText = [...all].filter(e => e.children.length === 0 && e.textContent.trim()).map(e => e.textContent.trim());
      const html = root.outerHTML
        .replace(/\\s(id|for|aria-controls|aria-labelledby|aria-describedby)="[^"]*"/g, '')
        .replace(/:r[0-9a-z]+:/g, ':r:');
      return JSON.stringify({
        chip: (document.querySelector('.property-type-chip') || {}).textContent || null,
        elements: all.length + 1,
        inlineStyled: root.querySelectorAll('[style]').length + (root.hasAttribute('style') ? 1 : 0),
        leafText,
        html
      });
    })()`);
    const m = JSON.parse(raw);
    if (m.html) { m.htmlHash = crypto.createHash('sha256').update(m.html).digest('hex').slice(0, 16); m.htmlLength = m.html.length; }
    const entry = { ...p, ...m };
    delete entry.html;
    entry.html = m.html;
    results.push(entry);
    console.log(p.type.padEnd(40), m.chip, m.elements, m.inlineStyled, m.htmlHash);
    if (shotDir && SHOOT.includes(p.type)) {
      fs.mkdirSync(shotDir, { recursive: true });
      const { data } = await client.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(shotDir, `panel-${p.type.replace(/[^a-z0-9]+/gi, '-')}.png`), Buffer.from(data, 'base64'));
    }
  }

  fs.writeFileSync(outJson, JSON.stringify({ at: new Date().toISOString(), viewport: JSON.parse(await ev('JSON.stringify([innerWidth, innerHeight])')), results }, null, 2));
  console.log('picked', picked.length, 'wrote', outJson);
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
