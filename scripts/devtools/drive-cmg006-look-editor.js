#!/usr/bin/env node
/**
 * P103 CMG-006 — edit a Look from Styles, driven (AC1, AC2, AC3, AC5, AC6).
 *
 *   npm run dev:debug -- --quiet      (wait for "launching Electron")
 *   node scripts/devtools/drive-cmg006-look-editor.js [--looks <copy>] [--shots <dir>]
 *
 * On a copy that has two Looks (a Text Look with wearers, a Gamma Look with none). Every arm is a
 * reading off the RUNNING editor: nothing selected → Styles → Looks → the Look's name → the
 * inspector shows the Look editor with its fields; a field changed there → every wearer's rendered
 * style in the PREVIEW window changes and `nodegx.styles.json` holds the new value; the same on a
 * Look nothing wears; one undo step per field; from a node wearing the Look, *In Styles* reveals
 * its row; and the node-side Edit still works exactly as before.
 *
 * 🔴 Drives a COPY (`--looks`): opening a project writes files into it.
 */
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('./cdp.js');

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const PROJECT_DIR = opt('looks', '/Users/richardosborne/vscode_projects/NodeGX test projects/CMG Drive Looks');
const SHOTS = opt('shots', path.join(__dirname, '..', '..', 'dev-docs', 'tasks', 'phase-103-the-composer-grows', 'shots'));
const STYLES_FILE = path.join(PROJECT_DIR, 'nodegx.styles.json');

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
const POPUP = `${WREQ('./src/editor/src/views/popuplayer.ts')}.default.instance`;
const NGC = `${WREQ('./src/editor/src/contexts/NodeGraphContext/NodeGraphContext.tsx')}.NodeGraphContextTmp`;

const CLICK = (selector) => `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return 'NO ' + ${JSON.stringify(selector)}; el.click(); return 'ok'; })()`;
const SET_INPUT = (selector, value) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return 'NO INPUT';
  const proto = Object.getPrototypeOf(el);
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  setter.call(el, ${JSON.stringify(String(value))});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return el.value;
})()`;

async function shot(editor, name) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const { data } = await editor.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS, name), Buffer.from(data, 'base64'));
  console.log(`      shot ${name}`);
}

function readLooks() {
  return JSON.parse(fs.readFileSync(STYLES_FILE, 'utf8')).variants || [];
}

/** The autosave lands 1 s after a write, or 3 s later when one is already in flight: poll, don't guess. */
async function lookOnDisk(name, typename, pred, timeoutMs = 9000) {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < timeoutMs) {
    last = readLooks().find((v) => v.name === name && v.typename === typename) || null;
    if (last && pred(last)) return last;
    await wait(400);
  }
  return last;
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
  await ev(`(() => { ${POPUP}.hidePopouts(true); return 'ok'; })()`);
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

  // The Looks in the project, with their wearer counts, from the model.
  const looks = await readJson(`JSON.stringify(${PROJECT}.instance.variants.map((v) => ({ name: v.name, typename: v.typename, worn: (${PROJECT}.instance.variantWearerCounts(v.typename)[v.name] || 0) })))`);
  const worn = looks.find((l) => l.worn > 0);
  const unworn = looks.find((l) => l.worn === 0);
  record('the copy has a worn Look and an unworn one', Boolean(worn && unworn), JSON.stringify(looks));
  if (!worn || !unworn) return finish();

  // Nothing selected; the inspector is empty.
  await ev(`(() => { ${SIDEBAR}.hidePanels(); ${SIDEBAR}.switch('styles'); return 'ok'; })()`);
  await wait(800);
  const SECTION = (id) => `document.querySelector('[data-styles-panel] > [data-section-id="${id}"]')`;
  await ev(`(() => { const s = ${SECTION('looks')}; if (s && s.getAttribute('data-section-open') !== 'true') s.querySelector('[class*="Header"]').click(); return 'ok'; })()`);
  await wait(600);
  const inspectorBefore = await ev(`${SIDEBAR}.InspectorId === undefined ? 'EMPTY' : ${SIDEBAR}.InspectorId`);

  /** A wearer's rendered style in the preview, for a Text port. */
  let viewer = null;
  try {
    viewer = await connect(await appTarget('viewer'));
  } catch {
    viewer = null;
  }

  // ── AC1: the worn Look, from Styles, nothing selected ────────────────────
  const rowOpen = await ev(CLICK(`[data-test="style-row-open-${worn.name}"]`));
  await wait(1200);
  const header = await readJson(`JSON.stringify((() => {
    const h = document.querySelector('[data-test="look-editor-header"]');
    const fields = document.querySelector('[data-test="look-editor-fields"]');
    const rows = fields ? fields.querySelectorAll('[data-identifier], input, select, button').length : 0;
    return { present: !!h, text: h ? h.innerText.replace(/\\s+/g, ' ').slice(0, 160) : null, name: h && h.getAttribute('data-look-name'), rows, inspector: ${SIDEBAR}.InspectorId, active: ${SIDEBAR}.ActiveId };
  })())`);
  record(
    `AC1 — nothing selected (inspector was ${inspectorBefore}); Styles → Looks → "${worn.name}" opens the Look editor in the inspector, with its fields, and Styles stays on the left`,
    rowOpen === 'ok' && header.present && header.name === worn.name && header.inspector === 'LookEditor' && header.active === 'styles' && header.rows > 3 && new RegExp(`worn by ${worn.worn} node`).test(header.text),
    JSON.stringify(header)
  );
  await shot(editor, 'cmg006-ac1-look-editor-from-styles.png');

  // Change a field: opacity is on every visual node and reads back as a number in the preview.
  const PORT = 'opacity';
  // The Opacity row's input, found by the row's label (plain number inputs carry no identifier):
  // tagged so the SET_INPUT helper can address it by selector.
  const TAG_FIELD = `(() => {
    const root = document.querySelector('[data-test="look-editor-fields"]'); if (!root) return 'NO FIELDS';
    document.querySelectorAll('[data-cmg-target]').forEach((e) => e.removeAttribute('data-cmg-target'));
    // The row reads "Opacityfx": the label, then the fx button's text.
    const rows = Array.from(root.querySelectorAll('.property-row-control, [class*="property-row"]')).filter((e) => /^Opacity/.test((e.textContent || '').trim()));
    let input = null;
    for (const r of rows.reverse()) { input = r.querySelector('input[type="text"], input[type="number"], input:not([type="checkbox"])'); if (input) break; }
    if (!input) return 'NO OPACITY INPUT';
    input.setAttribute('data-cmg-target', '1');
    return 'ok';
  })()`;
  const fieldSel = '[data-cmg-target="1"]';
  record('the Opacity row is in the Look editor', (await ev(TAG_FIELD)) === 'ok', '');
  const lookBefore = await ev(`(() => { const v = ${PROJECT}.instance.variants.find((x) => x.name === ${JSON.stringify(worn.name)} && x.typename === ${JSON.stringify(worn.typename)}); return v ? JSON.stringify(v.parameters[${JSON.stringify(PORT)}] ?? null) : 'NO LOOK'; })()`);
  const wearerBefore = viewer ? await evaluate(viewer, `(() => { const els = Array.from(document.querySelectorAll('[data-nodeid], [class*="Text"], p, span, div')).filter((e) => e.textContent && e.children.length === 0 && getComputedStyle(e).opacity !== ''); return els.length ? getComputedStyle(els[0]).opacity : 'NONE'; })()`) : 'NO VIEWER';
  const undo0 = await readJson(`JSON.stringify(${UNDO}.getHistoryLocation())`);
  const set = await ev(SET_INPUT(fieldSel, '0.42'));
  await ev(`(() => { const el = document.querySelector(${JSON.stringify(fieldSel)}); if (el) { el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); el.blur(); } return 'ok'; })()`);
  await wait(900);
  const lookAfter = await ev(`(() => { const v = ${PROJECT}.instance.variants.find((x) => x.name === ${JSON.stringify(worn.name)} && x.typename === ${JSON.stringify(worn.typename)}); return v ? JSON.stringify(v.parameters[${JSON.stringify(PORT)}] ?? null) : 'NO LOOK'; })()`);
  const undo1 = await readJson(`JSON.stringify(${UNDO}.getHistoryLocation())`);
  record(`AC1 — changing ${PORT} in the Look editor writes the Look (${lookBefore} → ${lookAfter}) as ONE undo step`, set !== 'NO INPUT' && lookAfter !== lookBefore && /0\\.42|42/.test(String(lookAfter)) && undo1 === undo0 + 1, `set=${set} undo ${undo0}→${undo1}`);

  // The wearers on the canvas: every node wearing the Look now resolves the new value.
  const wearerValues = await readJson(`JSON.stringify((() => {
    const p = ${PROJECT}.instance; const out = [];
    for (const c of p.getComponents()) c.graph.forEachNode((n) => { if (n.variant && n.variant.name === ${JSON.stringify(worn.name)} && n.typename === ${JSON.stringify(worn.typename)}) out.push(n.getParameter(${JSON.stringify(PORT)})); });
    return out;
  })())`);
  record(`AC1 — every wearer (${wearerValues.length}) resolves the Look's new ${PORT} (the node-side path, unchanged)`, wearerValues.length === worn.worn && wearerValues.every((v) => Number(v) === 0.42), JSON.stringify(wearerValues));
  const onDisk = await lookOnDisk(worn.name, worn.typename, (v) => v.parameters && Number(v.parameters[PORT]) === 0.42);
  record('AC1 — nodegx.styles.json holds the new value (polled up to 9 s for the autosave)', Boolean(onDisk && onDisk.parameters && Number(onDisk.parameters[PORT]) === 0.42), onDisk ? JSON.stringify(onDisk.parameters[PORT]) : 'NOT ON DISK');
  if (viewer) {
    const wearerAfter = await evaluate(viewer, `(() => { const els = Array.from(document.querySelectorAll('*')).filter((e) => getComputedStyle(e).opacity === '0.42'); return els.length; })()`);
    record('AC1 — the preview shows a wearer at the new opacity', Number(wearerAfter) > 0, `elements at 0.42: ${wearerAfter} (before: first text opacity ${wearerBefore})`);
  } else {
    record('AC1 — the preview shows a wearer at the new opacity', null, 'no viewer target');
  }
  await ev(`(() => { ${UNDO}.undo(); return 'ok'; })()`);
  await wait(600);
  const lookUndone = await ev(`(() => { const v = ${PROJECT}.instance.variants.find((x) => x.name === ${JSON.stringify(worn.name)} && x.typename === ${JSON.stringify(worn.typename)}); return v ? JSON.stringify(v.parameters[${JSON.stringify(PORT)}] ?? null) : 'NO LOOK'; })()`);
  record('AC5 — one ⌘Z puts the Look\'s field back', lookUndone === lookBefore, `${lookUndone}`);

  // ── AC2: a Look nothing wears ────────────────────────────────────────────
  await ev(`(() => { ${SIDEBAR}.hidePanels(); return 'ok'; })()`);
  await wait(300);
  await ev(CLICK(`[data-test="style-row-open-${unworn.name}"]`));
  await wait(1200);
  const header2 = await readJson(`JSON.stringify((() => { const h = document.querySelector('[data-test="look-editor-header"]'); const fields = document.querySelector('[data-test="look-editor-fields"]'); return { present: !!h, text: h ? h.innerText.replace(/\\s+/g, ' ').slice(0, 120) : null, name: h && h.getAttribute('data-look-name'), rows: fields ? fields.querySelectorAll('input, select, button').length : 0 }; })())`);
  // This Look's type (a kit component) has its own ports: take the first text field it draws and
  // read back WHICH parameter it wrote, rather than assuming one.
  const LOOK2 = `${PROJECT}.instance.variants.find((x) => x.name === ${JSON.stringify(unworn.name)} && x.typename === ${JSON.stringify(unworn.typename)})`;
  const paramsBefore2 = await readJson(`JSON.stringify((() => { const v = ${LOOK2}; return v ? { ...v.parameters } : null; })())`);
  const tagged2 = await ev(`(() => {
    const root = document.querySelector('[data-test="look-editor-fields"]'); if (!root) return 'NO FIELDS';
    document.querySelectorAll('[data-cmg-target]').forEach((e) => e.removeAttribute('data-cmg-target'));
    const input = Array.from(root.querySelectorAll('input')).find((i) => (i.type === 'text' || i.type === 'number') && !i.disabled);
    if (!input) return 'NO TEXT INPUT';
    input.setAttribute('data-cmg-target', '1');
    const row = input.closest('.property-row-control, [class*="property-row"]');
    return 'ok:' + (row ? row.textContent.trim().slice(0, 30) : '?');
  })()`);
  const set2 = String(tagged2).startsWith('ok') ? await ev(SET_INPUT(fieldSel, 'cmg006')) : 'NO INPUT';
  await ev(`(() => { const el = document.querySelector(${JSON.stringify(fieldSel)}); if (el) { el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); el.blur(); } return 'ok'; })()`);
  await wait(800);
  const paramsAfter2 = await readJson(`JSON.stringify((() => { const v = ${LOOK2}; return v ? { ...v.parameters } : null; })())`);
  const changedKeys = paramsAfter2 && paramsBefore2 ? Object.keys(paramsAfter2).filter((k) => JSON.stringify(paramsAfter2[k]) !== JSON.stringify(paramsBefore2[k])) : [];
  const PORT2 = changedKeys[0];
  const unwornAfter = PORT2 ? JSON.stringify(paramsAfter2[PORT2]) : 'NO CHANGE';
  const unwornDisk = PORT2 ? await lookOnDisk(unworn.name, unworn.typename, (v) => JSON.stringify(v.parameters[PORT2]) === unwornAfter) : null;
  record(
    `AC2 — a Look with 0 wearers ("${unworn.name}"): the fields open, says "worn by nothing yet", a field (${String(tagged2).slice(3)} → ${PORT2 || '?'}) is written to the model and saved`,
    header2.present && header2.name === unworn.name && /worn by nothing yet/.test(header2.text) && header2.rows > 3 && set2 !== 'NO INPUT' && changedKeys.length >= 1 && Boolean(unwornDisk && PORT2 && JSON.stringify(unwornDisk.parameters[PORT2]) === unwornAfter),
    `${JSON.stringify(header2)} set=${set2} changed=${JSON.stringify(changedKeys)} model=${unwornAfter} disk=${unwornDisk && PORT2 ? JSON.stringify(unwornDisk.parameters[PORT2]) : 'absent'}`
  );
  await shot(editor, 'cmg006-ac2-unworn-look.png');
  // A node that then picks the Look wears the new value: give a node of that type the Look.
  const picked = await readJson(`JSON.stringify((() => {
    const p = ${PROJECT}.instance; let hit = null;
    for (const c of p.getComponents()) c.graph.forEachNode((n) => { if (!hit && n.typename === ${JSON.stringify(unworn.typename)} && !n.variant) hit = n; });
    // No free node of that type in the project: a fresh node of the type, as a person would add.
    const { NodeGraphNode } = ${WREQ('./src/editor/src/models/nodegraphmodel/NodeGraphNode.ts')};
    const fresh = !hit;
    if (!hit) hit = new NodeGraphNode({ id: 'cmg006-fresh', type: ${JSON.stringify(unworn.typename)}, parameters: {} });
    const v = p.variants.find((x) => x.name === ${JSON.stringify(unworn.name)} && x.typename === ${JSON.stringify(unworn.typename)});
    hit.setVariant(v, fresh ? undefined : { undo: true });
    const value = hit.getParameter(${JSON.stringify(PORT2 || '')});
    if (!fresh) ${UNDO}.undo();
    return { value, fresh };
  })())`);
  record('AC2 — a node that then picks the Look wears the new value', picked && PORT2 && JSON.stringify(picked.value) === unwornAfter, `${JSON.stringify(picked)} expected ${unwornAfter}`);
  // Put the unworn Look's field back (the write above was one undo step).
  await ev(`(() => { ${UNDO}.undo(); return 'ok'; })()`);
  await wait(400);

  // ── AC3: from a node wearing the Look, In Styles → the row is revealed ───
  await ev(`(() => { ${SIDEBAR}.switch('components'); return 'ok'; })()`);
  await wait(300);
  const selected = await ev(`(() => {
    const p = ${PROJECT}.instance; let hit = null;
    for (const c of p.getComponents()) c.graph.forEachNode((n) => { if (!hit && n.variant && n.variant.name === ${JSON.stringify(worn.name)}) hit = { component: c, id: n.id }; });
    if (!hit) return 'NO WEARER';
    ${NGC}.switchToComponent(hit.component, { node: { id: hit.id }, pushHistory: true });
    return 'ok';
  })()`);
  await wait(1200);
  const inStyles = await ev(CLICK('[data-test="look-show-in-styles"]'));
  await wait(1100);
  const revealed = await readJson(`JSON.stringify((() => {
    const row = document.querySelector('[data-style-row=${JSON.stringify(worn.name)}][data-style-layer="Look"]');
    const section = ${SECTION('looks')};
    const b = row ? row.getBoundingClientRect() : null;
    return { active: ${SIDEBAR}.ActiveId, looksOpen: section && section.getAttribute('data-section-open'), row: !!row, inView: b ? b.top >= 0 && b.bottom <= window.innerHeight && b.height > 0 : false, revealed: row && row.getAttribute('data-revealed') };
  })())`);
  record('AC3 — from a node wearing the Look, "In Styles": Styles showing, Looks open, the row on screen and highlighted', selected === 'ok' && inStyles === 'ok' && revealed.active === 'styles' && revealed.looksOpen === 'true' && revealed.inView && revealed.revealed === 'true', JSON.stringify(revealed));
  await shot(editor, 'cmg006-ac3-in-styles.png');

  // ── AC6: the node-side Edit still works exactly as before ────────────────
  const nodeEdit = await readJson(`JSON.stringify((() => {
    const btn = Array.from(document.querySelectorAll('[data-panel-id="PropertyEditor"] .panel-head-row-action')).find((b) => b.textContent.trim() === 'Edit');
    if (!btn) return { error: 'NO EDIT BUTTON' };
    btn.click();
    return { clicked: true };
  })())`);
  await wait(700);
  const editMode = await readJson(`JSON.stringify((() => {
    const header = document.querySelector('[data-panel-id="PropertyEditor"] .variants-edit-mode-header');
    const body = document.querySelector('[data-panel-id="PropertyEditor"] .sidebar-property-editor');
    return { header: header ? header.textContent.trim() : null, tinted: body ? body.classList.contains('variants-sidepanel-edit-mode') : null };
  })())`);
  record('AC6 — the node-side Edit still switches the property panel into Look edit mode, and its header says "Editing the Look"', nodeEdit.clicked && editMode.header === 'Editing the Look' && editMode.tinted === true, JSON.stringify(editMode));
  await shot(editor, 'cmg006-ac6-node-side-edit.png');
  await ev(`(() => { const b = Array.from(document.querySelectorAll('[data-panel-id="PropertyEditor"] .variants-button')).find((x) => x.textContent.trim() === 'Close'); if (b) b.click(); return 'ok'; })()`);
  await wait(300);
  await ev(`(() => { ${SIDEBAR}.hidePanels(); ${SIDEBAR}.switch('styles'); return 'ok'; })()`);

  finish();
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
