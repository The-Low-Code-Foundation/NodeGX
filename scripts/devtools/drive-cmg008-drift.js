#!/usr/bin/env node
/**
 * P103 CMG-008 — every field says when it leaves its Look, driven (AC1, AC2, AC4, AC5) + the census.
 *
 *   npm run dev:debug -- --quiet      (wait for "launching Electron")
 *   node scripts/devtools/drive-cmg008-drift.js [--dir <copy>] [--shots <dir>] [--census <json>]
 *
 * On a copy: a Group is given alignment, padding, a corner radius and a border side, saved as the
 * Look *Card*, then each of those is changed on the node. Every arm reads the RUNNING property
 * panel: the merged row's `data-look-treatment`, the sentence naming the field and the Look, and
 * that *Put back* restores the Look's value (one undo step). AC2: a second Group wearing *Card*
 * with nothing of its own shows the Look's `alignItems` pressed. AC4: a named row (opacity) still
 * says *Card says …*. AC5: a Group with no Look draws no marker, and the Look editor draws none.
 *
 * The census (§3.3): for every node type that takes Looks, a detached node wearing a synthetic
 * Look that sets EVERY input port; the property panel's rows are read for `data-look-ports`, and
 * the ports no row covers are listed by name. Written to `--census`.
 *
 * 🔴 Drives a COPY (`--dir`): opening a project writes files into it.
 */
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('./cdp.js');

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const PROJECT_DIR = opt('dir', '/Users/richardosborne/vscode_projects/NodeGX test projects/CMG Drive Looks D');
const SHOTS = opt('shots', path.join(__dirname, '..', '..', 'dev-docs', 'tasks', 'phase-103-the-composer-grows', 'shots'));
const CENSUS = opt('census', path.join(__dirname, '..', '..', 'dev-docs', 'tasks', 'phase-103-the-composer-grows', 'cmg008-census.json'));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const arms = [];
const record = (name, ok, detail) => {
  arms.push({ name, ok, detail });
  console.log(`${ok === null ? 'UNGRADED' : ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const WREQ = (p) => `window.__wreq(${JSON.stringify(p)})`;
const PROJECT = `${WREQ('./src/editor/src/models/projectmodel.ts')}.ProjectModel`;
const UNDO = `${WREQ('./src/editor/src/models/undo-queue-model.ts')}.UndoQueue.instance`;
const SIDEBAR = `${WREQ('./src/editor/src/models/sidebar/sidebarmodel.tsx')}.SidebarModel.instance`;
const NGC = `${WREQ('./src/editor/src/contexts/NodeGraphContext/NodeGraphContext.tsx')}.NodeGraphContextTmp`;
const CLICK = (selector) => `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return 'NO ' + ${JSON.stringify(selector)}; el.click(); return 'ok'; })()`;

async function shot(editor, name) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const { data } = await editor.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS, name), Buffer.from(data, 'base64'));
  console.log(`      shot ${name}`);
}

async function main() {
  const editor = await connect(await appTarget('editor'));
  const ev = (expr) => evaluate(editor, expr);
  const readJson = async (expr) => {
    const raw = await ev(expr);
    try {
      return JSON.parse(raw);
    } catch {
      return { error: 'UNPARSEABLE', raw: String(raw).slice(0, 400) };
    }
  };
  const finish = () => {
    const failed = arms.filter((a) => a.ok === false);
    console.log(`\n${failed.length ? 'FAILED' : 'PASSED'} — ${arms.length - failed.length}/${arms.length} graded arms`);
    process.exit(failed.length ? 1 : 0);
  };

  await editor.send('Page.setWebLifecycleState', { state: 'active' }).catch(() => {});
  await editor.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  await ev(`(() => { if (!window.__wreq) { webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]); } return !!window.__wreq; })()`);
  await wait(300);

  // ── 0. Open the copy ─────────────────────────────────────────────────────
  const routed = await ev(`(() => {
    if (window.__cmgRouter) return 'ok';
    const root = document.getElementById('root');
    let f = root[Object.keys(root).find((k) => k.startsWith('__reactContainer'))];
    let depth = 0;
    while (f && depth < 40) {
      const pr = f.memoizedProps;
      if (pr && pr.route && pr.route.router && typeof pr.route.router.route === 'function') { window.__cmgRouter = pr.route.router; break; }
      f = f.child; depth++;
    }
    return window.__cmgRouter ? 'ok' : 'NO ROUTER';
  })()`);
  if (String(routed) !== 'ok') {
    record('the editor router was found', false, String(routed));
    return finish();
  }
  const already = await ev(`(() => { const p = ${PROJECT}.instance; return (p && p._retainedProjectDirectory) || 'NONE'; })()`);
  if (path.resolve(String(already)) !== path.resolve(PROJECT_DIR)) {
    await ev(`(() => { window.__cmgRouter.route({ to: 'projects' }); return 'ok'; })()`);
    await wait(1500);
    await ev(`(async () => {
      const { LocalProjectsModel } = ${WREQ('./src/editor/src/utils/LocalProjectsModel.ts')};
      const p = await LocalProjectsModel.instance.openProjectFromFolder(${JSON.stringify(PROJECT_DIR)});
      window.__cmgRouter.route({ to: 'editor', project: p });
      return 'ok';
    })()`);
    await wait(10000);
  }
  const dir = await ev(`(() => ${PROJECT}.instance._retainedProjectDirectory || 'NONE')()`);
  record('the driven project is the copy this drive names', path.resolve(String(dir)) === path.resolve(PROJECT_DIR), String(dir));

  // ── 1. Two Groups; one styled and saved as the Look "Card"; both wear it ──
  const setup = await readJson(`JSON.stringify((() => {
    const p = ${PROJECT}.instance;
    const groups = [];
    let comp = null;
    for (const c of p.getComponents()) c.graph.forEachNode((n) => { if (groups.length < 2 && n.typename === 'Group' && !n.variant) { groups.push(n); comp = comp || c; } });
    if (groups.length < 2) return { error: 'NEED TWO GROUPS' };
    const [a, b] = groups;
    a.setParameter('alignX', 'center'); a.setParameter('alignItems', 'center');
    a.setParameter('paddingLeft', { value: 16, unit: 'px' });
    a.setParameter('borderTopLeftRadius', { value: 8, unit: 'px' });
    a.setParameter('borderLeftStyle', 'solid');
    a.setParameter('opacity', 0.9);
    a.createNewVariant('Card', { undo: true });
    const look = p.variants.find((v) => v.name === 'Card' && v.typename === 'Group');
    b.setVariant(look);
    return { a: a.id, b: b.id, component: comp.name, look: look ? Object.keys(look.parameters) : null, aOwn: Object.keys(a.parameters) };
  })())`);
  record('setup — a Group styled and saved as the Look "Card"; a second Group wears it', setup.look && setup.look.includes('alignX') && setup.look.includes('paddingLeft'), JSON.stringify(setup).slice(0, 300));
  if (!setup.look) return finish();

  const select = async (id) => {
    await ev(`(() => { const p = ${PROJECT}.instance; const c = p.getComponentWithName(${JSON.stringify(setup.component)}); ${NGC}.switchToComponent(c, { node: { id: ${JSON.stringify(id)} }, pushHistory: true }); return 'ok'; })()`);
    await wait(1200);
  };

  /** What the panel says about the rows covering these ports. */
  const ROWS = (ports) => `JSON.stringify((() => {
    const out = {};
    for (const port of ${JSON.stringify(ports)}) {
      const row = Array.from(document.querySelectorAll('[data-panel-id="PropertyEditor"] [data-look-ports]')).find((r) => r.getAttribute('data-look-ports').split(',').includes(port));
      if (!row) { out[port] = null; continue; }
      const line = row.querySelector('[data-test="look-override-line"]');
      out[port] = { treatment: row.getAttribute('data-look-treatment'), lookName: row.getAttribute('data-look-name'), fields: line ? line.getAttribute('data-look-fields') : null, text: line ? line.querySelector('span').textContent : null, buttons: line ? Array.from(line.querySelectorAll('button')).map((b) => b.getAttribute('data-test')) : [] };
    }
    return out;
  })())`;

  // ── AC5 first: a Group with no Look shows no marker ──────────────────────
  const plain = await readJson(`JSON.stringify((() => {
    const p = ${PROJECT}.instance; let hit = null;
    for (const c of p.getComponents()) c.graph.forEachNode((n) => { if (!hit && n.typename === 'Group' && !n.variant) hit = { id: n.id, component: c.name }; });
    return hit;
  })())`);
  if (plain) {
    await ev(`(() => { const p = ${PROJECT}.instance; const c = p.getComponentWithName(${JSON.stringify(plain.component)}); ${NGC}.switchToComponent(c, { node: { id: ${JSON.stringify(plain.id)} }, pushHistory: true }); return 'ok'; })()`);
    await wait(1200);
    const markers = await ev(`document.querySelectorAll('[data-panel-id="PropertyEditor"] [data-look-treatment]').length`);
    record('AC5 — a Group without a Look draws no marker on any row', Number(markers) === 0, `markers=${markers}`);
  }

  // ── AC2: the wearer with nothing of its own shows the Look's alignItems pressed ──
  await select(setup.b);
  const pressed = await readJson(`JSON.stringify((() => {
    const row = document.querySelector('[data-panel-id="PropertyEditor"] [data-test="align-row-align-items"]');
    if (!row) return { error: 'NO ALIGN ITEMS ROW' };
    const on = row.querySelector('button[aria-pressed="true"]');
    return { pressed: on ? on.getAttribute('data-align-value') : null, changedDot: !!row.querySelector('[class*="GutterDot"], [data-test*="reset"]') };
  })())`);
  const linkedRows = await readJson(ROWS(['alignItems', 'paddingLeft', 'borderTopLeftRadius', 'borderLeftStyle']));
  record('AC2 — a Group whose Look sets alignItems: center, with nothing on the node, shows CENTER pressed', pressed.pressed === 'center', JSON.stringify(pressed));
  record('… and its merged rows read "linked" from Card, no override line', ['alignItems', 'paddingLeft', 'borderTopLeftRadius', 'borderLeftStyle'].every((p) => linkedRows[p] && linkedRows[p].treatment === 'linked' && linkedRows[p].lookName === 'Card' && !linkedRows[p].text), JSON.stringify(linkedRows).slice(0, 300));
  await shot(editor, 'cmg008-ac2-linked-wearer.png');

  // ── AC1: the first Group — change each field on the node ─────────────────
  await select(setup.a);
  const undo0 = await readJson(`JSON.stringify(${UNDO}.getHistoryLocation())`);
  await ev(`(() => { const p = ${PROJECT}.instance; let n = null; for (const c of p.getComponents()) c.graph.forEachNode((x) => { if (x.id === ${JSON.stringify(setup.a)}) n = x; });
    n.setParameter('alignX', 'right', { undo: true });
    n.setParameter('paddingLeft', { value: 40, unit: 'px' }, { undo: true });
    n.setParameter('borderTopLeftRadius', { value: 2, unit: 'px' }, { undo: true });
    n.setParameter('borderLeftStyle', 'dashed', { undo: true });
    n.setParameter('opacity', 0.5, { undo: true });
    return 'ok'; })()`);
  await select(setup.a); // re-render the panel on the same node
  await wait(600);
  const rows = await readJson(ROWS(['alignX', 'paddingLeft', 'borderTopLeftRadius', 'borderLeftStyle', 'opacity']));
  // The shot shows the lines, not the top of the panel: scroll the first merged override into view.
  await ev(`(() => { const line = document.querySelector('[data-panel-id="PropertyEditor"] [data-look-fields]'); if (line) line.scrollIntoView({ block: 'center' }); return 'ok'; })()`);
  await wait(400);
  await shot(editor, 'cmg008-ac1-overrides.png');
  const okRow = (p, fieldLabel) => rows[p] && rows[p].treatment === 'overridden' && rows[p].lookName === 'Card' && new RegExp(`${fieldLabel}.*differs? from Card`).test(String(rows[p].text)) && (rows[p].buttons || []).includes(`look-revert-${p}`);
  record('AC1 — Align: the merged row says it differs from Card and names Align X, with its own Put back', okRow('alignX', 'Align X'), JSON.stringify(rows.alignX));
  record('AC1 — one padding side: names Pad Left', okRow('paddingLeft', 'Pad Left'), JSON.stringify(rows.paddingLeft));
  record('AC1 — one corner radius (a tab group): names Corner Radius \\(TopLeft\\)', okRow('borderTopLeftRadius', 'Corner Radius \\(TopLeft\\)'), JSON.stringify(rows.borderTopLeftRadius));
  record('AC1 — one border side (a tab group): names the left border style', rows.borderLeftStyle && rows.borderLeftStyle.treatment === 'overridden' && /differs? from Card/.test(String(rows.borderLeftStyle.text)) && (rows.borderLeftStyle.buttons || []).includes('look-revert-borderLeftStyle'), JSON.stringify(rows.borderLeftStyle));
  record('AC4 — a named row (opacity) still says "Card says 0.9" with Revert, unchanged', rows.opacity && rows.opacity.treatment === 'overridden' && /Card says 0\.9/.test(String(rows.opacity.text)) && (rows.opacity.buttons || []).includes('look-revert'), JSON.stringify(rows.opacity));

  // Put back: one field at a time; the node's own value goes, the Look's renders again, one undo step each.
  const putBack = async (port) => {
    const before = await readJson(`JSON.stringify(${UNDO}.getHistoryLocation())`);
    const clicked = await ev(CLICK(`[data-panel-id="PropertyEditor"] [data-test="look-revert-${port}"]`));
    await wait(600);
    const after = await readJson(`JSON.stringify(${UNDO}.getHistoryLocation())`);
    const own = await ev(`(() => { const p = ${PROJECT}.instance; let n = null; for (const c of p.getComponents()) c.graph.forEachNode((x) => { if (x.id === ${JSON.stringify(setup.a)}) n = x; }); return JSON.stringify({ own: n.parameters[${JSON.stringify(port)}] ?? null, resolved: n.getParameter(${JSON.stringify(port)}) }); })()`);
    return { clicked, steps: after - before, ...JSON.parse(own) };
  };
  const a1 = await putBack('alignX');
  record('AC1 — Put back on Align X: the node\'s own value is gone, Card\'s center renders, one undo step', a1.clicked === 'ok' && a1.own === null && a1.resolved === 'center' && a1.steps === 1, JSON.stringify(a1));
  const a2 = await putBack('paddingLeft');
  record('AC1 — Put back on Pad Left: Card\'s 16px renders again, one undo step', a2.clicked === 'ok' && a2.own === null && a2.resolved && a2.resolved.value === 16 && a2.steps === 1, JSON.stringify(a2));
  const a3 = await putBack('borderTopLeftRadius');
  record('AC1 — Put back on the corner: Card\'s 8px renders again', a3.clicked === 'ok' && a3.own === null && a3.resolved && a3.resolved.value === 8 && a3.steps === 1, JSON.stringify(a3));
  const a4 = await putBack('borderLeftStyle');
  record('AC1 — Put back on the border side: Card\'s solid renders again', a4.clicked === 'ok' && a4.own === null && a4.resolved === 'solid' && a4.steps === 1, JSON.stringify(a4));
  const after = await readJson(ROWS(['alignX', 'paddingLeft', 'borderTopLeftRadius', 'borderLeftStyle']));
  record('… and every one of those rows now reads linked', ['alignX', 'paddingLeft', 'borderTopLeftRadius', 'borderLeftStyle'].every((p) => after[p] && after[p].treatment === 'linked'), JSON.stringify(after).slice(0, 200));

  // AC5 — the Look editor (CMG-006) draws no marker either.
  await ev(`(() => { ${SIDEBAR}.showInInspector('LookEditor', { typename: 'Group', name: 'Card' }); return 'ok'; })()`);
  await wait(1200);
  const inEditor = await ev(`document.querySelectorAll('[data-panel-id="LookEditor"] [data-look-treatment]').length`);
  record('AC5 — the Look editor shows no marker on any row', Number(inEditor) === 0, `markers=${inEditor}`);
  await ev(`(() => { ${SIDEBAR}.hidePanels(); return 'ok'; })()`);

  // ── §3.3 the runtime census ──────────────────────────────────────────────
  // Two evals: the rows are React, rendered on the next tick — read them after they exist.
  const setupResult = await ev(`(() => {
    const NL = ${WREQ('./src/editor/src/models/nodelibrary/nodelibrary.ts')}.NodeLibrary.instance;
    const { NodeGraphNode } = ${WREQ('./src/editor/src/models/nodegraphmodel/NodeGraphNode.ts')};
    const { VariantModel } = ${WREQ('./src/editor/src/models/VariantModel.ts')};
    const { ModelProxy } = ${WREQ('./src/editor/src/views/panels/propertyeditor/models/modelProxy.ts')};
    const { Ports } = ${WREQ('./src/editor/src/views/panels/propertyeditor/DataTypes/Ports.ts')};
    const types = NL.getNodeTypes ? NL.getNodeTypes() : Object.values(NL.nodeTypes || {});
    window.__census = [];
    for (const type of types) {
      if (!type || !type.useVariants) continue;
      const name = type.name || type.localName;
      try {
        const node = new NodeGraphNode({ id: 'census:' + name, type: name, parameters: {} });
        const ports = node.getPorts('input').filter((p) => p.plug === 'input' || (p.plug || '').includes('input'));
        const look = new VariantModel({ name: 'census', typename: name });
        for (const p of ports) look.parameters[p.name] = p.default !== undefined ? p.default : 1;
        node.variant = look;
        const proxy = new ModelProxy({ model: node });
        const view = new Ports({ model: proxy });
        view.render();
        const host = document.createElement('div'); host.style.position = 'fixed'; host.style.left = '-9999px'; host.style.width = '340px'; host.appendChild(view.el); document.body.appendChild(host);
        // What the panel DRAWS a style row for: not the Look row itself, not a signal, not a child
        // port (drawn inside its parent's row). Those are the census's named exceptions.
        const all = proxy.getPorts('input');
        const { widgetForPort } = ${WREQ('./src/editor/src/views/panels/propertyeditor/model/widgets.ts')};
        const isSignal = (p) => p.type === 'signal' || (p.type && p.type.name === 'signal') || p.isSignal === true;
        // The same table the panel decides a row with: a port with no widget (a signal, a star type,
        // an unknown type) gets no row and has nothing to mark. A child port is drawn inside its
        // parent's row. The Look row is the Look row. (No backticks in here: this is a template.)
        const why = (p) => (p.name === 'variant' ? 'the Look row' : isSignal(p) ? 'signal' : p.parent ? 'child' : widgetForPort(p) === undefined ? 'no row' : widgetForPort(p) === 'logicBuilderHidden' ? 'hidden' : null);
        const shown = all.filter((p) => why(p) === null).map((p) => p.name);
        const excepted = all.filter((p) => why(p) !== null).map((p) => p.name + ' (' + why(p) + ')');
        window.__census.push({ name, host, view, shown, excepted });
      } catch (e) {
        window.__census.push({ name, error: String(e && e.message).slice(0, 120) });
      }
    }
    return window.__census.length;
  })()`).catch((e) => `SETUP FAILED: ${e && e.message}`);
  record('census setup — a Ports view per Look-taking type, rendered off screen', typeof setupResult === 'number' && setupResult > 0, String(setupResult));
  await wait(2500);
  const census = await readJson(`JSON.stringify((() => {
    const out = [];
    for (const entry of window.__census) {
      if (entry.error) { out.push({ type: entry.name, error: entry.error }); continue; }
      const covered = new Set();
      entry.host.querySelectorAll('[data-look-ports]').forEach((r) => r.getAttribute('data-look-ports').split(',').forEach((n) => covered.add(n)));
      const rows = entry.host.querySelectorAll('.property-panel-row').length;
      const uncovered = entry.shown.filter((n) => !covered.has(n));
      out.push({ type: entry.name, rows, shown: entry.shown.length, covered: entry.shown.filter((n) => covered.has(n)).length, uncovered, excepted: entry.excepted });
      entry.host.remove(); try { entry.view.dispose && entry.view.dispose(); } catch (e) {}
    }
    delete window.__census;
    return out;
  })())`);
  fs.writeFileSync(CENSUS, JSON.stringify(census, null, 2) + '\n');
  const totals = census.reduce((t, r) => ({ types: t.types + 1, shown: t.shown + (r.shown || 0), covered: t.covered + (r.covered || 0), errors: t.errors + (r.error ? 1 : 0) }), { types: 0, shown: 0, covered: 0, errors: 0 });
  const uncovered = census.flatMap((r) => (r.uncovered || []).map((n) => `${r.type}.${n}`));
  const excepted = census.reduce((n, r) => n + (r.excepted || []).length, 0);
  record(`§3.3 — runtime census: ${totals.types} Look-taking types, ${totals.shown} style ports shown, ${totals.covered} reachable by the marker, ${uncovered.length} not (${excepted} named exceptions: the Look row, signals, child ports)`, totals.types >= 5 && totals.errors === 0 && uncovered.length === 0, uncovered.slice(0, 20).join(', ') || `errors=${totals.errors}`);

  await ev(`(() => { ${UNDO}.undo(); return 'ok'; })()`).catch(() => {});
  finish();
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
