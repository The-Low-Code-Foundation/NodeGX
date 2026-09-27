#!/usr/bin/env node
/**
 * P103 CMG-003 + CMG-007, driven.
 *
 *   npm run dev:debug -- --quiet      (wait for "launching Electron")
 *   node scripts/devtools/drive-cmg003-007-colours-and-shadows.js [--looks <copy>] [--shots <dir>]
 *
 * CMG-003 (a new colour is a colour you can change), on a copy with 9 old colour styles:
 * *New colour* → a name → the picker is open with no extra press; a hex committed in it lands as
 * a `color-palette` token in the project file and NOT in `metadata.styles.colors`; the token is
 * offered in the node picker's open half; an old colour style's swatch opens the picker and the
 * commit reaches the style; ⌘Z per write; a bad name is refused inline with nothing written.
 *
 * CMG-007 (a popout casts a shadow, not a glow): the theme flipped to light — and measured in a
 * SECOND eval ([[a-theme-flip-does-not-apply-in-the-same-eval]]) — `getComputedStyle(...).boxShadow`
 * on a popout (the composer, the colour picker, the Look popup), a popup (a context menu) and a
 * modal (a confirm) contains no `rgba(255, 255, 255`. Light shots of each; dark shots of three.
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
const PROJECT_FILE = path.join(PROJECT_DIR, 'nodegx.project.json');
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
const TOKENS_MODEL = `${WREQ('./src/editor/src/models/StyleTokensModel/StyleTokensModel.ts')}.StyleTokensModel`;
const PICKING = WREQ('./src/editor/src/models/StyleTokensModel/TokensForPicking.ts');
const THEME = `${WREQ('./src/editor/src/models/ThemeManager.ts')}.ThemeManager`;
const CTX_MENU = WREQ('./src/editor/src/views/ShowContextMenuInPopup.tsx');
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
const PRESS_ENTER = (selector) => `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return 'NO INPUT'; el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); return 'ok'; })()`;
const MODEL_READ = (expr) => `(() => { const m = new (${TOKENS_MODEL})(); try { return ${expr}; } finally { m.dispose(); } })()`;

/** The first open popout, popup and modal: their computed box-shadow, and whether a white one is in it. */
const SHADOWS = `JSON.stringify((() => {
  const read = (sel) => { const el = document.querySelector(sel); if (!el) return null; const s = getComputedStyle(el).boxShadow; return { boxShadow: s.slice(0, 90), white: /rgba\\(255, 255, 255/.test(s) }; };
  return { theme: document.documentElement.getAttribute('data-theme'), popout: read('.popup-layer-popout'), popup: read('.popup-layer-popup'), modal: read('.popup-layer-modal'), reactModal: read('.popup-layer-react-modal .popup') || read('.popup-layer-react-modal') };
})())`;

async function shot(editor, name) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const { data } = await editor.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS, name), Buffer.from(data, 'base64'));
  console.log(`      shot ${name}`);
}

function readStyles() {
  return JSON.parse(fs.readFileSync(STYLES_FILE, 'utf8'));
}
function readProject() {
  return JSON.parse(fs.readFileSync(PROJECT_FILE, 'utf8'));
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
  const finish = async () => {
    await ev(`(() => { ${THEME}.setMode('dark'); return 'ok'; })()`).catch(() => {});
    const failed = arms.filter((a) => a.ok === false);
    console.log(`\n${failed.length ? 'FAILED' : 'PASSED'} — ${arms.length - failed.length}/${arms.length} graded arms`);
    process.exit(failed.length ? 1 : 0);
  };

  await editor.send('Page.setWebLifecycleState', { state: 'active' }).catch(() => {});
  await editor.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  await ev(`(() => { if (!window.__wreq) { webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]); } return !!window.__wreq; })()`);
  const closeAll = () => ev(`(() => { ${POPUP}.hidePopouts(true); return 'ok'; })()`);
  await closeAll();
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

  await ev(`(() => { ${SIDEBAR}.switch('styles'); return 'ok'; })()`);
  await wait(800);
  const SECTION = (id) => `document.querySelector('[data-styles-panel] > [data-section-id="${id}"]')`;
  await ev(`(() => { const s = ${SECTION('colours')}; if (s && s.getAttribute('data-section-open') !== 'true') s.querySelector('[class*="Header"]').click(); return 'ok'; })()`);
  await wait(500);

  // ═══ CMG-003 ═══════════════════════════════════════════════════════════════
  const stylesBefore = Object.keys(readStyles().colors || {});
  const undo0 = await readJson(`JSON.stringify(${UNDO}.getHistoryLocation())`);

  // AC3 first (a bad name): refused inline, nothing written.
  await ev(CLICK('[data-test="add-colour"]'));
  await wait(300);
  await ev(SET_INPUT('[data-styles-panel] input[placeholder="Name, like brand-orange"]', 'bad name'));
  await ev(PRESS_ENTER('[data-styles-panel] input[placeholder="Name, like brand-orange"]'));
  await wait(300);
  const problem = await ev(`(() => { const p = document.querySelector('[data-test="new-colour-problem"]'); return p ? p.textContent : 'NO PROBLEM SHOWN'; })()`);
  const stillEditing = await ev(`!!document.querySelector('[data-styles-panel] input[placeholder="Name, like brand-orange"]')`);
  const noToken = await ev(MODEL_READ(`m.getToken('--bad name') === undefined && m.getToken('--bad') === undefined`));
  record('a bad name is refused inline, the field stays, nothing is written', /No spaces/.test(String(problem)) && stillEditing === true && noToken === true && (await readJson(`JSON.stringify(${UNDO}.getHistoryLocation())`)) === undo0, `${problem} · editing=${stillEditing}`);

  // AC1: New colour → name → the picker is open with no extra press.
  await ev(SET_INPUT('[data-styles-panel] input[placeholder="Name, like brand-orange"]', 'brand-orange'));
  await ev(PRESS_ENTER('[data-styles-panel] input[placeholder="Name, like brand-orange"]'));
  await wait(900);
  const afterCreate = await readJson(`JSON.stringify((() => {
    const row = document.querySelector('[data-style-row="--brand-orange"]');
    const picker = document.querySelector('.popup-layer-popout .color-picker-popup');
    const hexInput = picker ? picker.querySelector('input') : null;
    return { row: !!row, rowVisible: row ? row.getBoundingClientRect().height > 0 : false, picker: !!picker, hex: hexInput ? hexInput.value : null };
  })())`);
  const created = await readJson(MODEL_READ(`JSON.stringify(m.getToken('--brand-orange') || null)`));
  record(
    'AC1 — New colour → name: the row exists in the open token list and the picker is open, no extra press; the token is color-palette and not grey',
    afterCreate.row && afterCreate.rowVisible && afterCreate.picker && created && created.category === 'color-palette' && created.value !== '#808080',
    `${JSON.stringify(afterCreate)} token=${JSON.stringify(created)}`
  );
  await shot(editor, 'cmg003-ac1-new-colour-picker-open.png');

  // Pick orange: commit through the picker's own hex field (Enter commits, as it does for a node).
  await ev(SET_INPUT('.popup-layer-popout .color-picker-popup input', 'c2410c'));
  await ev(PRESS_ENTER('.popup-layer-popout .color-picker-popup input'));
  await wait(500);
  const picked = await ev(MODEL_READ(`(m.getToken('--brand-orange') || {}).value || 'NONE'`));
  const rowSwatch = await ev(`(() => { const s = document.querySelector('[data-test="style-row-swatch---brand-orange"] div'); return s ? getComputedStyle(s).backgroundColor : 'NO SWATCH'; })()`);
  record('AC1 — pick orange, the row is orange', /#c2410c/i.test(String(picked)) && rowSwatch === 'rgb(194, 65, 12)', `token=${picked} swatch=${rowSwatch}`);
  await closeAll();
  await wait(2500); // autosave
  const proj = readProject();
  const storedTok = ((proj.metadata.designTokens || {}).customTokens || []).find((t) => t.name === '--brand-orange');
  const stylesAfter = Object.keys(readStyles().colors || {});
  record(
    'AC1 — the project file holds a color-palette custom token with the value; nothing was written to metadata.styles.colors',
    storedTok && storedTok.category === 'color-palette' && /#c2410c/i.test(storedTok.value) && JSON.stringify(stylesAfter) === JSON.stringify(stylesBefore) && !stylesAfter.includes('brand-orange') && !stylesAfter.includes('--brand-orange'),
    `stored=${JSON.stringify(storedTok)} styles ${stylesBefore.length}→${stylesAfter.length}`
  );

  // AC2: the node picker offers it, in the open half beside --primary.
  const offered = await readJson(MODEL_READ(`JSON.stringify((() => { const s = ${PICKING}.colourTokensForPicking(m.getTokens()); return { open: s.semantic.map((t) => t.name), ramp: s.palette.length }; })())`));
  record('AC2 — the node colour picker\'s open list (colourTokensForPicking.semantic) offers --brand-orange beside --primary; the ramp is unchanged', offered.open.includes('--brand-orange') && offered.open.includes('--primary') && offered.ramp === 61, `open=${offered.open.length} ramp=${offered.ramp}`);

  // AC4: undo for every write — one ⌘Z per visible change: the pick, then the create.
  await ev(`(() => { ${UNDO}.undo(); return 'ok'; })()`);
  await wait(400);
  const afterUndo1 = await ev(MODEL_READ(`(m.getToken('--brand-orange') || {}).value || 'NONE'`));
  await ev(`(() => { ${UNDO}.undo(); return 'ok'; })()`);
  await wait(400);
  const afterUndo2 = await ev(MODEL_READ(`(m.getToken('--brand-orange') || {}).value || 'NONE'`));
  record('AC4 — ⌘Z undoes the pick (back to the starting colour), a second ⌘Z removes the token; nothing left behind', afterUndo1 !== 'NONE' && !/#c2410c/i.test(String(afterUndo1)) && afterUndo2 === 'NONE', `${afterUndo1} → ${afterUndo2}`);
  await ev(`(() => { ${UNDO}.redo(); ${UNDO}.redo(); return 'ok'; })()`);
  await wait(400);

  // AC3: an EXISTING colour style's swatch opens the picker; the change reaches the style.
  const styleName = 'Primary Dark';
  const styleBefore = await ev(`(() => { const s = ${PROJECT}.instance.getMetaData('styles'); return (s && s.colors && s.colors[${JSON.stringify(styleName)}]) || 'NONE'; })()`);
  await ev(CLICK(`[data-test="style-row-swatch-${styleName}"]`));
  await wait(600);
  const stylePicker = await ev(`!!document.querySelector('.popup-layer-popout .color-picker-popup')`);
  await shot(editor, 'cmg003-ac3-colour-style-picker.png');
  await ev(SET_INPUT('.popup-layer-popout .color-picker-popup input', '123456'));
  await ev(PRESS_ENTER('.popup-layer-popout .color-picker-popup input'));
  await wait(500);
  const styleAfter = await ev(`(() => { const s = ${PROJECT}.instance.getMetaData('styles'); return (s && s.colors && s.colors[${JSON.stringify(styleName)}]) || 'NONE'; })()`);
  const wearers = await ev(`(() => { const { StylesModel } = ${WREQ('./src/editor/src/models/StylesModel.ts')}; const m = new StylesModel(); try { const w = m.styleWearers('colors')[${JSON.stringify(styleName)}]; return w ? w.nodes.length : 0; } finally { m.dispose(); } })()`);
  record(`AC3 — clicking the swatch of the old colour style "${styleName}" opens the picker; the commit reaches the style (worn by ${wearers} node(s), through the same setStyle the node picker uses)`, stylePicker === true && styleBefore !== 'NONE' && /#123456/i.test(String(styleAfter)), `${styleBefore} → ${styleAfter}`);
  await ev(`(() => { ${UNDO}.undo(); return 'ok'; })()`);
  await wait(400);
  const styleUndone = await ev(`(() => { const s = ${PROJECT}.instance.getMetaData('styles'); return (s && s.colors && s.colors[${JSON.stringify(styleName)}]) || 'NONE'; })()`);
  record('AC4 — one ⌘Z puts the colour style back', styleUndone === styleBefore, `${styleUndone}`);
  await closeAll();

  // ═══ CMG-007 ═══════════════════════════════════════════════════════════════
  // Dark first (the control): the same surfaces, then light, measured in later evals.
  const surfaces = async (label) => {
    const out = {};
    // popout: the composer
    await ev(`(() => { const s = ${SECTION('effects')}; if (s && s.getAttribute('data-section-open') !== 'true') s.querySelector('[class*="Header"]').click(); return 'ok'; })()`);
    await wait(500);
    await ev(`(() => { const b = document.querySelector('[aria-label="Open composer for --shadow-lg"]'); if (b) { b.closest('[data-style-row]').scrollIntoView({ block: 'center' }); b.click(); } return !!b; })()`);
    await wait(700);
    out.composer = (await readJson(SHADOWS)).popout;
    await shot(editor, `cmg007-${label}-composer.png`);
    await closeAll();
    // popout: the colour picker
    await ev(`(() => { const s = ${SECTION('colours')}; if (s && s.getAttribute('data-section-open') !== 'true') s.querySelector('[class*="Header"]').click(); return 'ok'; })()`);
    await wait(400);
    await ev(`(() => { const b = document.querySelector('[data-test="style-row-swatch-${styleName}"]'); if (b) { b.scrollIntoView({ block: 'center' }); b.click(); } return !!b; })()`);
    await wait(600);
    out.picker = (await readJson(SHADOWS)).popout;
    await shot(editor, `cmg007-${label}-colour-picker.png`);
    await closeAll();
    // popup: a context menu, the one the rail's ⋯ opens
    await ev(`(() => { const anchor = document.querySelector('[data-test="side-panel-mode-overflow"]') || document.body; ${CTX_MENU}.showContextMenuInPopup({ items: [{ label: 'One', onClick: () => {} }, { label: 'Two', onClick: () => {} }], attachTo: anchor, position: 'bottom' }); return 'ok'; })()`);
    await wait(500);
    out.contextMenu = (await readJson(SHADOWS)).popup;
    await shot(editor, `cmg007-${label}-context-menu.png`);
    await ev(`(() => { ${POPUP}.hidePopup && ${POPUP}.hidePopup(); ${POPUP}.hidePopouts(true); return 'ok'; })()`);
    await wait(300);
    // modal: a confirm
    await ev(`(() => { ${POPUP}.showConfirmModal({ title: 'CMG-007', message: 'A modal, for its shadow.', onConfirm: () => {}, onCancel: () => {} }); return 'ok'; })()`);
    await wait(500);
    const m = await readJson(SHADOWS);
    out.modal = m.reactModal || m.modal;
    await shot(editor, `cmg007-${label}-modal.png`);
    await ev(`(() => { const b = document.querySelector('.confirm-modal .cancel-button'); if (b) b.click(); return 'ok'; })()`);
    await wait(300);
    // popout: the Look popup, from a node wearing a Look
    // The Look row is on every node whose type takes Looks (`useVariants`), worn or not — the popup
    // is the same one either way. A wearer first, any such node otherwise.
    const look = await ev(`(() => {
      const p = ${PROJECT}.instance;
      let wearer = null, any = null;
      for (const c of p.getComponents()) {
        c.graph.forEachNode((n) => {
          if (!any && n.type && n.type.useVariants) any = { component: c, id: n.id };
          if (!wearer && n.variant) wearer = { component: c, id: n.id };
        });
      }
      const hit = wearer || any;
      if (!hit) return 'NO NODE WITH A LOOK ROW';
      ${NGC}.switchToComponent(hit.component, { node: { id: hit.id }, pushHistory: true });
      return wearer ? 'wearer' : 'any';
    })()`);
    await wait(1200);
    await ev(CLICK('[data-test="look-row-field"]'));
    await wait(700);
    out.lookPopup = (await readJson(SHADOWS)).popout;
    out.lookOpened = look;
    await shot(editor, `cmg007-${label}-look-popup.png`);
    await closeAll();
    await ev(`(() => { ${SIDEBAR}.switch('styles'); return 'ok'; })()`);
    await wait(400);
    return out;
  };

  await ev(`(() => { ${THEME}.setMode('dark'); return 'ok'; })()`);
  await wait(600);
  const dark = await surfaces('dark');
  record('control — in dark the surfaces have a shadow at all (not white either)', ['composer', 'picker', 'contextMenu', 'modal'].every((k) => dark[k] && dark[k].boxShadow !== 'none' && !dark[k].white), JSON.stringify(dark).slice(0, 300));

  await ev(`(() => { ${THEME}.setMode('light'); return 'ok'; })()`);
  await wait(800);
  const theme = await ev(`document.documentElement.getAttribute('data-theme')`);
  record('the theme is light, read in a later eval', theme === 'light', String(theme));
  const light = await surfaces('light');
  for (const k of ['composer', 'picker', 'contextMenu', 'modal', 'lookPopup']) {
    const r = light[k];
    record(`AC2 — light mode: ${k} box-shadow has no rgba(255, 255, 255`, r ? !r.white && r.boxShadow !== 'none' : null, r ? r.boxShadow : `not measured (${light.lookOpened || 'no element'})`);
  }
  // The token the glow came from is not in any of the measured shadows either way.
  await ev(`(() => { ${THEME}.setMode('dark'); return 'ok'; })()`);
  await wait(400);

  await finish();
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
