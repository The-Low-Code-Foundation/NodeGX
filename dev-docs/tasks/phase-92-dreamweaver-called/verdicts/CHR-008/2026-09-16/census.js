// CHR-008 §3.2 — is the panel the same panel, now that its rows are React siblings?
//
// The rows moved from "elements appended into a host by `RowHost`" to "`<PropertyRow>` nodes in one
// tree", and three decorators became props. Nothing about that is supposed to be visible. This
// counts the panel on two nodes, in both themes, so "nothing changed" is a reading rather than a
// hope — and so the one thing that DOES change is recorded rather than discovered later:
// `.property-panel-row` + `.property-row-control` add two elements per row, which moves CHR-001's
// element count UP until the widgets themselves convert (§3.1).
//
//   NOODL_REMOTE_DEBUG_PORT=9333 node census.js <outDir>
//
// 🔴 Run it against the DEV STACK: the change is uncompiled source, so the packaged 0.2.4 is the
// BEFORE arm, not the after. Take the before on 0.2.4 with this same script.
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');

const outDir = process.argv.slice(2).find((a) => !a.startsWith('--'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CENSUS = `(() => {
  const sel = '.sidebar-property-editor';
  const root = document.querySelector(sel);
  if (!root) return JSON.stringify({ error: 'no panel' });
  const all = [...root.querySelectorAll('*')];
  const count = (q) => root.querySelectorAll(q).length;
  const groupNames = [...root.querySelectorAll('.property-group')].map((g) => {
    const n = g.querySelector(':scope > .property-group-label .property-group-name');
    return n ? n.textContent.trim() : '?'; });
  return JSON.stringify({
    // The shape a person sees.
    groups: count('.property-group'),
    groupNames,
    rows: count('.properties > *'),
    gateWrappers: count('.property-port-gated'),
    gateReasons: count('.property-port-gate-reason'),
    gateLinks: count('.property-port-gate-link'),
    deadWires: count('.property-port-gate-dead-wire'),
    groupGateLines: count('.property-group-gate'),
    capabilityWrappers: count('.property-capability-gated'),
    structuralHints: count('.property-structural-hint'),
    hintMarked: count('[data-hint-ports]'),
    rowsWithTitle: [...root.querySelectorAll('.properties > *')].filter((r) => r.getAttribute('title')).length,
    // CHR-008 §3.2's own additions — expected 0 before, one per row after.
    propertyPanelRows: count('.property-panel-row'),
    controlHosts: count('.property-row-control'),
    emptyControlHosts: count('.property-row-control:empty'),
    // CHR-001's numbers, so the baseline stays comparable.
    elements: all.length,
    inlineStyled: all.filter((e) => e.getAttribute('style')).length,
    fontSizes: [...new Set(all.filter((e) => e.textContent && e.textContent.trim() && !e.children.length)
      .map((e) => getComputedStyle(e).fontSize))].sort(),
    // 🔴 The gate sentences, verbatim: R8's one-line-per-group must not have moved.
    gateTexts: [...root.querySelectorAll('.property-group')].map((g) => ({
      group: (g.querySelector(':scope > .property-group-label .property-group-name') || {}).textContent,
      texts: [...g.querySelectorAll('.property-group-gate, .property-port-gate-reason')].map((t) => t.textContent.trim())
    })).filter((g) => g.texts.length)
  });
})()`;

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const client = await connect(await appTarget());
  await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1368, height: 900, deviceScaleFactor: 1, mobile: false });
  const ev = (e) => evaluate(client, e);
  const waitFor = async (expr, ms = 60000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { try { if ((await ev(expr)) === true) return; } catch (e) {} await sleep(400); }
    throw new Error('timed out waiting for ' + expr);
  };
  const shoot = async (name) => {
    const { data } = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(data, 'base64'));
  };
  const select = (component, id) => ev(`(() => { const ed = window.__nodeGraphEditor;
    const c = ed.getActiveComponent().owner.getComponentWithName(${JSON.stringify(component)}); if (!c) return 'no component';
    if (ed.getActiveComponent() !== c) ed.switchToComponent(c, { pushHistory: false });
    const n = ed.findNodeWithId(${JSON.stringify(id)}); if (!n) return 'no node';
    ed.selectNode(n); return 'selected ' + (n.model || n).type.name; })()`);
  const setTheme = (theme) => ev(`(() => { document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)});
    document.body.setAttribute('data-theme', ${JSON.stringify(theme)}); return 'ok'; })()`);

  await waitFor(`!!window.__nodeGraphEditor && !!window.__nodeGraphEditor.getActiveComponent()`);
  await sleep(3000);

  const results = { instrument: await ev('location.href'), nodes: {} };

  // Two nodes: the Group is CHR-001's baseline subject and carries R8's Box Shadow line; the Button
  // carries the Icon group, which the s8 census found printing seven sentences before R8.
  for (const [label, component, id] of [
    ['group-psWrap', '/Story/Passage', 'psWrap'],
    ['button-paPlay', '/Story/Passage', 'paPlay']
  ]) {
    const selected = await select(component, id);
    if (String(selected).startsWith('no ')) { results.nodes[label] = { skipped: selected }; continue; }
    await waitFor(`!!document.querySelector('.sidebar-property-editor .property-group')`, 20000);
    await sleep(1500);

    results.nodes[label] = { selected };
    for (const theme of ['dark', 'light']) {
      await setTheme(theme);
      await sleep(600);
      results.nodes[label][theme] = JSON.parse(await ev(CENSUS));
      await shoot(`census-${label}-${theme}`);
    }
    console.log(label, JSON.stringify(results.nodes[label].dark));
  }

  await client.send('Emulation.clearDeviceMetricsOverride');
  fs.writeFileSync(path.join(outDir, 'census-results.json'), JSON.stringify(results, null, 2));
  console.log('done');
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.stack || e.message); process.exit(1); });
