#!/usr/bin/env node
/**
 * P103 CMG-010 — from the field to the token, and back, driven (AC1–AC6).
 *
 *   npm run dev:debug -- --quiet      (wait for "launching Electron")
 *   node scripts/devtools/drive-cmg010-field-to-token.js [--dir <copy>] [--shots <dir>]
 *
 * On a copy: two Groups wear `--shadow-lg` (Shadow source: From a style token), one of them
 * `--space-4` on a padding side. From the first Group's shadow chip: *Show in Styles* → the Styles
 * panel is showing, Effects open, the `--shadow-lg` row in view and highlighted. Back on the node:
 * ✎ → the composer opens beside the field with *Used by 2 nodes* in its header; a slider moved and
 * Apply → the token's value changed (so BOTH Groups, which reference it, change) and ⌘Z undoes it
 * in one step. ✎ on the padding chip (a non-composer type) → the row editor with *Changes --space-4
 * everywhere (N places)*; a new value applied reaches the token, ⌘Z brings it back. In Styles the
 * `--shadow-lg` row says 2×; its list goes to each Group. `--primary`'s list shows the tokens built
 * from it. A fresh token says *Nothing wears this yet*.
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
const PROJECT_DIR = opt('dir', '/Users/richardosborne/vscode_projects/NodeGX test projects/CMG Drive Looks K');
const SHOTS = opt('shots', path.join(__dirname, '..', '..', 'dev-docs', 'tasks', 'phase-103-the-composer-grows', 'shots'));

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
const POPUP = `${WREQ('./src/editor/src/views/popuplayer.ts')}.PopupLayer.instance`;
const TOKENS_MODEL = `${WREQ('./src/editor/src/models/StyleTokensModel/StyleTokensModel.ts')}.StyleTokensModel`;
const PANEL = '[data-panel-id="PropertyEditor"]';
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
const TOKEN_VALUE = (name) => `(() => { const m = new (${TOKENS_MODEL})(); const t = m.getToken(${JSON.stringify(name)}); m.dispose(); return t ? t.value : 'NO TOKEN'; })()`;
const CANVAS = `JSON.stringify((() => {
  const g = ${NGC}.nodeGraph;
  if (!g) return { error: 'NO NODE GRAPH' };
  const active = g.getActiveComponent ? g.getActiveComponent() : g.activeComponent;
  const selected = (g.selector && g.selector.nodes ? Array.from(g.selector.nodes) : []).map((n) => (n.model && n.model.id) || n.id || null);
  return { component: active ? active.name : null, selected };
})())`;

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

  // ── 1. Two Groups wearing --shadow-lg; one with --space-4 on a padding side ──
  const setup = await readJson(`JSON.stringify((() => {
    const p = ${PROJECT}.instance;
    let groups = [], comp = null;
    for (const c of p.getComponents()) {
      const g = [];
      c.graph.forEachNode((n) => { if (n.typename === 'Group' && !n.variant) g.push(n); });
      if (g.length >= 2) { groups = g.slice(0, 2); comp = c; break; }
    }
    if (groups.length < 2) return { error: 'NEED TWO GROUPS IN ONE COMPONENT' };
    for (const g of groups) { g.setParameter('boxShadowEnabled', true); g.setParameter('boxShadowSource', 'token'); g.setParameter('boxShadowToken', 'var(--shadow-lg)'); }
    groups[0].setParameter('paddingLeft', 'var(--space-4)');
    return { a: groups[0].id, b: groups[1].id, component: comp.name, labels: groups.map((g) => { try { return g.label; } catch (e) { return ''; } }) };
  })())`);
  record('setup — two Groups in one component wear --shadow-lg; the first wears --space-4 on Pad Left', !setup.error, JSON.stringify(setup).slice(0, 200));
  if (setup.error) return finish();
  const shadowBefore = await ev(TOKEN_VALUE('--shadow-lg'));
  const spaceBefore = await ev(TOKEN_VALUE('--space-4'));

  const select = async (id) => {
    const other = id === setup.a ? setup.b : setup.a;
    for (const target of [other, id]) {
      await ev(`(() => { const p = ${PROJECT}.instance; const c = p.getComponentWithName(${JSON.stringify(setup.component)}); ${NGC}.switchToComponent(c, { node: { id: ${JSON.stringify(target)} }, pushHistory: true }); return 'ok'; })()`);
      await wait(target === id ? 1200 : 500);
    }
  };
  const undoSteps = () => readJson(`JSON.stringify(${UNDO}.getHistoryLocation())`);
  const undo = async () => {
    await ev(`(() => { ${UNDO}.undo(); return 'ok'; })()`);
    await wait(600);
  };

  // ── AC1 (i): Show in Styles from the shadow chip ─────────────────────────
  await select(setup.a);
  const showBtn = await ev(`(() => { const b = document.querySelector('${PANEL} [data-test="token-show-boxShadowToken"]'); if (!b) return 'NO BUTTON'; b.scrollIntoView({ block: 'center' }); return b.getAttribute('title'); })()`);
  record('the shadow chip carries Show in Styles', /Show --shadow-lg in Styles/.test(String(showBtn)), String(showBtn));
  await ev(CLICK(`${PANEL} [data-test="token-show-boxShadowToken"]`));
  await wait(1500);
  const active = await ev(`${SIDEBAR}.ActiveId`);
  const landing = await readJson(`JSON.stringify((() => {
    const section = document.querySelector('[data-styles-panel] [data-section-id="effects"]');
    const rows = Array.from(document.querySelectorAll('[data-style-row="--shadow-lg"]'));
    const r = rows.find((x) => x.getBoundingClientRect().height > 0) || rows[0];
    if (!r) return { section: section && section.getAttribute('data-section-open'), found: false };
    const b = r.getBoundingClientRect();
    return { section: section && section.getAttribute('data-section-open'), found: true, inView: b.top >= 0 && b.bottom <= window.innerHeight && b.height > 0, revealed: r.getAttribute('data-revealed') };
  })())`);
  await shot(editor, 'cmg010-ac1-show-in-styles.png');
  record('AC1 — Show in Styles: the Styles panel is showing, Effects is open, --shadow-lg is in view and highlighted', active === 'styles' && landing.section === 'true' && landing.found && landing.inView && landing.revealed === 'true', `active=${active} ${JSON.stringify(landing)}`);

  // ── AC3: the row says 2×; its list goes to each Group ────────────────────
  await wait(1700);
  const usageText = await ev(`(() => { const u = document.querySelector('[data-test="token-usage---shadow-lg"]'); return u ? u.tagName + ':' + u.textContent.trim() + ':' + u.getAttribute('title') : 'NO USAGE'; })()`);
  record('AC3 — the --shadow-lg row shows Used by 2 (a pressable 2×)', /^BUTTON:2×:Used by 2 nodes/.test(String(usageText)), String(usageText));
  // Open, not toggle: the Styles panel stays mounted between runs of this drive, and a list left
  // open by the previous run would be closed by a blind press.
  const OPEN_USAGE = (selector) => `(() => { const b = document.querySelector(${JSON.stringify(selector)}); if (!b) return 'NO BUTTON'; if (b.getAttribute('data-usage-open') !== 'true') b.click(); return 'ok'; })()`;
  await ev(OPEN_USAGE('[data-test="token-usage---shadow-lg"]'));
  await wait(500);
  const wearers = await readJson(`JSON.stringify(Array.from(document.querySelectorAll('[data-test="token-wearer---shadow-lg"]')).map((w) => ({ node: w.getAttribute('data-wearer-node'), component: w.getAttribute('data-wearer-component'), field: (w.querySelector('[class*="WearerField"]') || {}).textContent })))`);
  await shot(editor, 'cmg010-ac3-used-by.png');
  record('AC3 — the list names both Groups, with the field (boxShadowToken)', Array.isArray(wearers) && wearers.length === 2 && wearers.every((w) => w.field === 'boxShadowToken') && wearers.map((w) => w.node).sort().join() === [setup.a, setup.b].sort().join(), JSON.stringify(wearers));
  const before = await readJson(CANVAS);
  await ev(`(() => { const el = document.querySelector('[data-test="token-wearer---shadow-lg"][data-wearer-node="' + CSS.escape(${JSON.stringify(setup.b)}) + '"]'); if (el) el.click(); return 'ok'; })()`);
  await wait(2000);
  const after = await readJson(CANVAS);
  record('AC3 — pressing the second Group in the list selects it on the canvas', after.component === setup.component && (after.selected || []).includes(setup.b), `before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);

  // ── AC4: --primary's list shows the tokens built from it ─────────────────
  await ev(`(() => { ${WREQ('./src/editor/src/views/panels/StylesPanel/stylesPanelRoute.ts')}.revealStyle({ kind: 'token', name: '--primary' }); return 'ok'; })()`);
  await wait(1500);
  const expectedTokens = await readJson(`JSON.stringify((() => {
    const m = new (${TOKENS_MODEL})(); const tokens = m.getTokens(); m.dispose();
    const { tokenUsageIn } = ${WREQ('./src/editor/src/models/StyleTokensModel/tokenUsage.ts')};
    const u = tokenUsageIn(${PROJECT}.instance, tokens, '--primary');
    return { tokens: u.tokens, nodes: u.nodes.length, looks: u.looks.length };
  })())`);
  // A colour token's row is a `StyleRow` in the Colours section (its ids say `style-row-…`), inside
  // the "Design tokens (N)" list the reveal opens.
  const primaryUsage = await ev(`(() => { const u = document.querySelector('[data-test="style-row-usage---primary"]'); return u ? u.tagName + ':' + u.textContent.trim() + ':' + u.getAttribute('title') : 'NO USAGE'; })()`);
  await ev(OPEN_USAGE('[data-test="style-row-usage---primary"]'));
  await wait(500);
  const primaryList = await readJson(`JSON.stringify(Array.from(document.querySelectorAll('[data-test="style-row-wearer-token---primary"]')).map((w) => w.getAttribute('data-wearer-token')))`);
  await shot(editor, 'cmg010-ac4-primary-wearers.png');
  record('AC4 — the --primary row counts nodes and the tokens built from it in one number', new RegExp('^BUTTON:' + (expectedTokens.nodes + expectedTokens.looks + (expectedTokens.tokens || []).length) + '×:Used by').test(String(primaryUsage)), String(primaryUsage));
  record(`AC4 — --primary's list shows the tokens built from it (${(expectedTokens.tokens || []).length}: ${(expectedTokens.tokens || []).join(', ')}) beside its ${expectedTokens.nodes} node(s) and ${expectedTokens.looks} Look(s)`, Array.isArray(primaryList) && expectedTokens.tokens && expectedTokens.tokens.length > 0 && JSON.stringify(primaryList) === JSON.stringify(expectedTokens.tokens), JSON.stringify(primaryList));

  // ── AC5: a fresh token says Nothing wears this yet ───────────────────────
  await ev(`(() => { const m = new (${TOKENS_MODEL})(); m.addCustomToken({ name: '--cmg010-fresh', value: '7px', category: 'spacing' }, { undo: true, label: 'Add token' }); m.dispose(); return 'ok'; })()`);
  await ev(`(() => { ${WREQ('./src/editor/src/views/panels/StylesPanel/stylesPanelRoute.ts')}.revealStyle({ kind: 'token', name: '--cmg010-fresh' }); return 'ok'; })()`);
  await wait(1500);
  const fresh = await ev(`(() => { const u = document.querySelector('[data-test="token-usage---cmg010-fresh"]'); return u ? u.tagName + ':' + u.textContent.trim() + ':' + u.getAttribute('title') : 'NO USAGE'; })()`);
  record('AC5 — a fresh token: "unused", titled Nothing wears this yet, not pressable', fresh === 'SPAN:unused:Nothing wears this yet', String(fresh));
  await undo(); // the added token

  // ── AC1 (ii): ✎ from the field opens the composer beside it, with the count; Apply reaches both ──
  await select(setup.a);
  await ev(`(() => { const b = document.querySelector('${PANEL} [data-test="token-edit-boxShadowToken"]'); if (b) b.scrollIntoView({ block: 'center' }); return 'ok'; })()`);
  await wait(300);
  const edited = await ev(CLICK(`${PANEL} [data-test="token-edit-boxShadowToken"]`));
  await wait(900);
  const composer = await readJson(`JSON.stringify((() => {
    const c = document.querySelector('[data-token-composer="--shadow-lg"]');
    if (!c) return null;
    const chip = document.querySelector('${PANEL} [data-test="token-chip-boxShadowToken"]');
    const cr = c.getBoundingClientRect(); const kr = chip ? chip.getBoundingClientRect() : null;
    const worn = c.querySelector('[data-worn-by]');
    // Beside the field: the chip's line falls inside the popout's height, and the popout sits to
    // one side of the chip (the inspector is at the window's right edge, so it opens leftward).
    const near = kr ? kr.top >= cr.top - 20 && kr.bottom <= cr.bottom + 20 && (cr.right <= kr.left + 30 || cr.left >= kr.right - 30) : null;
    return { wornBy: worn ? worn.textContent : null, near, side: kr ? (cr.right <= kr.left + 30 ? 'left of the chip' : cr.left >= kr.right - 30 ? 'right of the chip' : 'over it') : null, hasRange: !!c.querySelector('input[type="range"]') };
  })())`);
  await shot(editor, 'cmg010-ac1-composer-from-field.png');
  record('AC1 — ✎ on the shadow chip opens the composer beside the field, its header saying Used by 2 nodes', edited === 'ok' && composer && composer.wornBy === 'Used by 2 nodes' && composer.near && composer.hasRange, JSON.stringify(composer));
  const steps0 = await undoSteps();
  const range = await readJson(`JSON.stringify((() => { const r = document.querySelector('[data-token-composer="--shadow-lg"] input[type="range"]'); return r ? { min: +r.min, max: +r.max, value: +r.value } : null; })())`);
  if (range) {
    const target = range.value === range.max ? range.min : range.max;
    await ev(SET_INPUT('[data-token-composer="--shadow-lg"] input[type="range"]', target));
    await wait(300);
  }
  const applied = await ev(`(() => { const c = document.querySelector('[data-token-composer="--shadow-lg"]'); const b = c && Array.from(c.querySelectorAll('button')).find((x) => x.textContent.trim() === 'Apply'); if (!b) return 'NO APPLY'; if (b.disabled) return 'APPLY DISABLED'; b.click(); return 'ok'; })()`);
  await wait(800);
  const shadowAfter = await ev(TOKEN_VALUE('--shadow-lg'));
  const steps1 = await undoSteps();
  const bothReference = await readJson(`JSON.stringify((() => { const p = ${PROJECT}.instance; const out = []; for (const c of p.getComponents()) c.graph.forEachNode((n) => { if (n.id === ${JSON.stringify(setup.a)} || n.id === ${JSON.stringify(setup.b)}) out.push(n.getParameter('boxShadowToken')); }); return out; })())`);
  record('AC1 — a slider moved and Apply: --shadow-lg changed, both Groups still reference it (so both change), one undo step', applied === 'ok' && shadowAfter !== shadowBefore && steps1 - steps0 === 1 && Array.isArray(bothReference) && bothReference.length === 2 && bothReference.every((v) => v === 'var(--shadow-lg)'), `${String(shadowBefore).slice(0, 40)} → ${String(shadowAfter).slice(0, 40)} steps=${steps1 - steps0}`);
  await undo();
  const shadowUndone = await ev(TOKEN_VALUE('--shadow-lg'));
  record('AC1 — ⌘Z puts --shadow-lg back in one step', shadowUndone === shadowBefore, String(shadowUndone).slice(0, 60));

  // ── AC2: ✎ on the padding chip (a non-composer type) edits --space-4 for every wearer ──
  await select(setup.a);
  await ev(`(() => { const b = document.querySelector('${PANEL} [data-test="marginpadding-expand-padding"]'); if (b && b.getAttribute('aria-expanded') !== 'true') b.click(); return 'ok'; })()`);
  await wait(600);
  const padEdit = await ev(`(() => { const b = document.querySelector('${PANEL} [data-test="token-edit-paddingLeft"]'); if (!b) return 'NO BUTTON'; b.scrollIntoView({ block: 'center' }); return 'ok'; })()`);
  // The buttons live in the chip's hover overlay: pointer on the chip, then the press.
  const chipRect = await readJson(`JSON.stringify((() => { const c = document.querySelector('${PANEL} [data-test="token-chip-padding-left"]'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })())`);
  if (chipRect) await editor.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: chipRect.x, y: chipRect.y });
  await wait(300);
  const overlay = await readJson(`JSON.stringify((() => { const o = document.querySelector('${PANEL} [data-test="token-chip-padding-left"] [data-token-hover-actions]'); return o ? { opacity: getComputedStyle(o).opacity, pointer: getComputedStyle(o).pointerEvents } : null; })())`);
  record('AC2 — hovering the padding chip shows ✎ and Show in Styles over its edge (computed opacity 1)', padEdit === 'ok' && overlay && overlay.opacity === '1' && overlay.pointer === 'auto', JSON.stringify(overlay));
  await shot(editor, 'cmg010-ac2-padding-chip-hover.png');
  await ev(CLICK(`${PANEL} [data-test="token-edit-paddingLeft"]`));
  await wait(700);
  const rowEditor = await readJson(`JSON.stringify((() => { const e = document.querySelector('[data-token-row-editor="--space-4"]'); if (!e) return null; const reach = e.querySelector('[data-test="token-row-editor-reach"]'); const v = e.querySelector('[data-test="token-row-editor-value"]'); return { reach: reach && reach.textContent, value: v && v.value }; })())`);
  record('AC2 — ✎ on the padding chip opens the row editor for --space-4, saying what it reaches', rowEditor && /^Changes --space-4 everywhere \(\d+ places?\)$/.test(String(rowEditor.reach)) && rowEditor.value === spaceBefore, JSON.stringify(rowEditor));
  await shot(editor, 'cmg010-ac2-row-editor.png');
  const s0 = await undoSteps();
  await ev(SET_INPUT('[data-test="token-row-editor-value"]', '20px'));
  await wait(200);
  const rowApplied = await ev(CLICK('[data-test="token-row-editor-apply"]'));
  await wait(800);
  const spaceAfter = await ev(TOKEN_VALUE('--space-4'));
  const s1 = await undoSteps();
  const resolvedOnNode = await ev(`(() => { const { resolveProjectTokenValue } = ${WREQ('./src/editor/src/models/StyleTokensModel/ProjectTokenCss.ts')}; return resolveProjectTokenValue(${PROJECT}.instance, 'var(--space-4)'); })()`);
  record('AC2 — Apply 20px: --space-4 is 20px, the Group\'s Pad Left resolves to it, one undo step', rowApplied === 'ok' && spaceAfter === '20px' && resolvedOnNode === '20px' && s1 - s0 === 1, `${spaceBefore} → ${spaceAfter} node=${resolvedOnNode} steps=${s1 - s0}`);
  await undo();
  const spaceUndone = await ev(TOKEN_VALUE('--space-4'));
  record('AC2 — ⌘Z brings --space-4 back', spaceUndone === spaceBefore, String(spaceUndone));

  // Show in Styles from the padding chip too (one press, any chip).
  await ev(CLICK(`${PANEL} [data-test="token-show-paddingLeft"]`));
  await wait(1500);
  const padLanding = await readJson(`JSON.stringify((() => { const s = document.querySelector('[data-styles-panel] [data-section-id="spacing"]'); const r = Array.from(document.querySelectorAll('[data-style-row="--space-4"]')).find((x) => x.getBoundingClientRect().height > 0); return { active: ${SIDEBAR}.ActiveId, section: s && s.getAttribute('data-section-open'), revealed: r && r.getAttribute('data-revealed') }; })())`);
  record('AC2 — Show in Styles from the padding chip lands on --space-4 in Spacing', padLanding.active === 'styles' && padLanding.section === 'true' && padLanding.revealed === 'true', JSON.stringify(padLanding));

  await ev(`(() => { ${POPUP}.hidePopouts(); return 'ok'; })()`).catch(() => {});
  finish();
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
