#!/usr/bin/env node
/**
 * P103 CMG-002 — add a token, copy a token, driven (AC1–AC7).
 *
 *   npm run dev:debug -- --quiet      (wait for "launching Electron")
 *   node scripts/devtools/drive-cmg002-add-copy.js [--dir <copy>] [--shots <dir>]
 *
 * Every arm is a reading off the RUNNING editor and the project file: ＋ in each of the five token
 * sections, a name, a kind, Add → the saved record's category; ⌘Z removes it and nothing else; a
 * duplicate and a bad name are refused inline with nothing written; a new shadow opens the
 * composer; delete on a token worn by two nodes, a Look and another token asks first and names the
 * count; the clipboard holds `var(--name)` after Copy; the padding picker's enumeration offers a
 * new spacing token.
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
const PROJECT_DIR = opt('dir', '/Users/richardosborne/vscode_projects/NodeGX test projects/CMG Drive Looks C');
const SHOTS = opt('shots', path.join(__dirname, '..', '..', 'dev-docs', 'tasks', 'phase-103-the-composer-grows', 'shots'));
const PROJECT_FILE = path.join(PROJECT_DIR, 'nodegx.project.json');

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
const MODEL_READ = (expr) => `(() => { const m = new (${TOKENS_MODEL})(); try { return ${expr}; } finally { m.dispose(); } })()`;

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
const SET_SELECT = (selector, value) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return 'NO SELECT';
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(el, ${JSON.stringify(String(value))});
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return el.value;
})()`;

async function shot(editor, name) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const { data } = await editor.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS, name), Buffer.from(data, 'base64'));
  console.log(`      shot ${name}`);
}

/** The stored custom token of this name on disk, polled for the autosave. */
async function storedOnDisk(name, timeoutMs = 9000) {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < timeoutMs) {
    const p = JSON.parse(fs.readFileSync(PROJECT_FILE, 'utf8'));
    last = (((p.metadata || {}).designTokens || {}).customTokens || []).find((t) => t.name === name) || null;
    if (last) return last;
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
  const closeAll = () => ev(`(() => { ${POPUP}.hidePopouts(true); return 'ok'; })()`);

  await editor.send('Page.setWebLifecycleState', { state: 'active' }).catch(() => {});
  await editor.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  await ev(`(() => { if (!window.__wreq) { webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]); } return !!window.__wreq; })()`);
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

  await ev(`(() => { ${SIDEBAR}.hidePanels(); ${SIDEBAR}.switch('styles'); return 'ok'; })()`);
  await wait(800);
  const SECTION = (id) => `document.querySelector('[data-styles-panel] > [data-section-id="${id}"]')`;
  const tokenValue = (name) => ev(MODEL_READ(`(m.getToken(${JSON.stringify(name)}) || {}).value || 'NONE'`));
  const tokenCategory = (name) => ev(MODEL_READ(`(m.getToken(${JSON.stringify(name)}) || {}).category || 'NONE'`));
  const undoLoc = () => readJson(`JSON.stringify(${UNDO}.getHistoryLocation())`);
  const tokenCount = () => readJson(MODEL_READ(`JSON.stringify(m.getTokens().length)`));

  /** Press ＋ on a section, fill the row, Add. Returns what happened. */
  async function addToken(sectionId, name, kindCategory, value) {
    await closeAll();
    const plus = await ev(CLICK(`[data-test="section-add-${sectionId}"]`));
    await wait(500);
    const rowThere = await ev(`!!document.querySelector('[data-test="add-token-row"]')`);
    await ev(SET_INPUT('[data-test="add-token-name"]', name));
    if (kindCategory) await ev(SET_SELECT('[data-test="add-token-kind"]', kindCategory));
    await wait(100);
    const starting = await ev(`(() => { const i = document.querySelector('[data-test="add-token-value"]'); return i ? i.value : 'NO VALUE FIELD'; })()`);
    if (value !== undefined) await ev(SET_INPUT('[data-test="add-token-value"]', value));
    await ev(CLICK('[data-test="add-token-submit"]'));
    await wait(700);
    const problem = await ev(`(() => { const p = document.querySelector('[data-test="add-token-problem"]'); return p ? p.textContent : null; })()`);
    return { plus, rowThere, starting, problem };
  }

  // ── AC1: one token in each section, the right category on disk ───────────
  const plan = [
    ['spacing', 'space-huge', null, '96px', 'spacing'],
    ['type', 'display-family', 'typography-family', undefined, 'typography-family'],
    ['borders', 'radius-pill', 'border-radius', '999px', 'border-radius'],
    ['effects', 'shadow-brand', 'shadow', undefined, 'shadow'],
    ['motion', 'ease-snappy', 'animation-easing', undefined, 'animation-easing']
  ];
  const before = await tokenCount();
  for (const [sectionId, name, kind, value, expectCategory] of plan) {
    const undo0 = await undoLoc();
    const r = await addToken(sectionId, name, kind, value);
    const full = `--${name}`;
    const category = await tokenCategory(full);
    const v = await tokenValue(full);
    const stored = await storedOnDisk(full);
    const rowRevealed = await ev(`(() => { const row = document.querySelector('[data-style-row="${full}"]'); if (!row) return 'NO ROW'; const b = row.getBoundingClientRect(); return (b.top >= 0 && b.bottom <= window.innerHeight) + ':' + row.getAttribute('data-revealed'); })()`);
    const composerOpen = await ev(`!!document.querySelector('.popup-layer-popout [data-token-composer="${full}"]')`);
    const undo1 = await undoLoc();
    record(
      `AC1 — ＋ in ${sectionId}: ${full} lands as ${expectCategory}, in place and highlighted${['shadow', 'animation-easing', 'typography-family'].includes(expectCategory) ? ', composer open (AC4)' : ''}`,
      r.plus === 'ok' && r.rowThere && r.problem === null && category === expectCategory && v !== 'NONE' && v !== '' && stored && stored.category === expectCategory && rowRevealed.startsWith('true:true') && undo1 === undo0 + 1 && (['shadow', 'animation-easing', 'typography-family'].includes(expectCategory) ? composerOpen : true),
      `starting=${JSON.stringify(r.starting)} value=${v} category=${category} disk=${stored ? stored.category : 'absent'} row=${rowRevealed} composer=${composerOpen} undo ${undo0}→${undo1}`
    );
    if (sectionId === 'effects') await shot(editor, 'cmg002-ac4-new-shadow-composer.png');
    await closeAll();
  }
  const afterAdds = await tokenCount();
  record('five tokens added, five more in the model', afterAdds === before + 5, `${before} → ${afterAdds}`);

  // ── AC2: ⌘Z after an add removes the token and nothing else; ⌘⇧Z brings it back ──
  await ev(`(() => { ${UNDO}.undo(); return 'ok'; })()`);
  await wait(400);
  const afterUndo = await tokenCount();
  const gone = await tokenValue('--ease-snappy');
  const othersStay = await tokenValue('--shadow-brand');
  await ev(`(() => { ${UNDO}.redo(); return 'ok'; })()`);
  await wait(400);
  const back = await tokenValue('--ease-snappy');
  record('AC2 — ⌘Z removes the last added token and nothing else; ⌘⇧Z brings it back', afterUndo === afterAdds - 1 && gone === 'NONE' && othersStay !== 'NONE' && back !== 'NONE', `count ${afterAdds}→${afterUndo} ease=${gone} shadow=${othersStay} redo=${back}`);

  // ── AC3: a duplicate and a bad name are refused inline; nothing written ──
  const c0 = await tokenCount();
  const u0 = await undoLoc();
  const dup = await addToken('spacing', 'space-huge', null, '1px');
  const dupStill = await ev(`!!document.querySelector('[data-test="add-token-row"]')`);
  await ev(SET_INPUT('[data-test="add-token-name"]', 'bad name'));
  await ev(CLICK('[data-test="add-token-submit"]'));
  await wait(300);
  const bad = await ev(`(() => { const p = document.querySelector('[data-test="add-token-problem"]'); return p ? p.textContent : null; })()`);
  await ev(`(() => { const i = document.querySelector('[data-test="add-token-name"]'); if (i) i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return 'ok'; })()`);
  await wait(200);
  record('AC3 — a duplicate name and "bad name" are refused inline, the row stays, nothing is written', /already a token called --space-huge/.test(String(dup.problem)) && dupStill === true && /No spaces/.test(String(bad)) && (await tokenCount()) === c0 && (await undoLoc()) === u0 && (await tokenValue('--space-huge')) === '96px', `dup="${dup.problem}" bad="${bad}"`);
  await shot(editor, 'cmg002-ac3-refused.png');

  // ── AC7: the padding picker's enumeration offers --space-huge ────────────
  const offered = await readJson(MODEL_READ(`JSON.stringify(${PICKING}.tokensForPicking(m.getTokens(), ${PICKING}.tokenCategoriesForPort('paddingLeft')).flatMap((g) => g.tokens.map((t) => t.name)))`));
  record('AC7 — tokensForPicking for a padding port offers --space-huge', Array.isArray(offered) && offered.includes('--space-huge') && offered.includes('--space-4'), `${offered.length} tokens, huge=${offered.includes('--space-huge')}`);

  // ── AC5: delete asks first, with the count from the one walk ─────────────
  // Give --space-huge three kinds of wearer: two nodes, a Look, another token.
  const worn = await readJson(`JSON.stringify((() => {
    const p = ${PROJECT}.instance; const nodes = [];
    for (const c of p.getComponents()) c.graph.forEachNode((n) => { if (nodes.length < 2 && n.typename === 'Group') nodes.push(n); });
    nodes.forEach((n) => n.setParameter('paddingLeft', 'var(--space-huge)'));
    const look = p.variants[0]; look.setParameter('paddingTop', 'var(--space-huge)');
    const m = new (${TOKENS_MODEL})(); m.addCustomToken({ name: '--space-alias', value: 'var(--space-huge)', category: 'spacing' }); m.dispose();
    return { nodes: nodes.length, look: look.name };
  })())`);
  await wait(500);
  const del = await ev(CLICK('[data-test="token-delete---space-huge"]'));
  await wait(500);
  const modal = await readJson(`JSON.stringify((() => { const m = document.querySelector('.confirm-modal'); return m ? m.innerText.replace(/\\s+/g, ' ') : null; })())`);
  record('AC5 — delete on a token worn by 2 nodes, 1 Look and 1 token asks first and says so', del === 'ok' && worn.nodes === 2 && /Used by 2 nodes, 1 Look and 1 other token/.test(String(modal)) && /fall back to their own value/.test(String(modal)), `${JSON.stringify(worn)} modal=${JSON.stringify(modal)}`);
  await shot(editor, 'cmg002-ac5-delete-confirm.png');
  await ev(CLICK('.confirm-modal .cancel-button'));
  await wait(300);
  record('… Cancel keeps it', (await tokenValue('--space-huge')) === '96px', '');
  // A default token has no delete button; an added one does.
  const buttons = await readJson(`JSON.stringify({ added: !!document.querySelector('[data-test="token-delete---space-huge"]'), def: !!document.querySelector('[data-test="token-delete---space-4"]'), copyDef: !!document.querySelector('[data-test="token-copy---space-4"]') })`);
  record('delete is offered on the added token only; copy on both', buttons.added && !buttons.def && buttons.copyDef, JSON.stringify(buttons));
  // Clean up the wearers.
  await ev(`(() => { const p = ${PROJECT}.instance; for (const c of p.getComponents()) c.graph.forEachNode((n) => { if (n.parameters && n.parameters.paddingLeft === 'var(--space-huge)') n.setParameter('paddingLeft', undefined); }); p.variants[0].setParameter('paddingTop', undefined); const m = new (${TOKENS_MODEL})(); m.deleteCustomToken('--space-alias'); m.dispose(); return 'ok'; })()`);
  await wait(300);

  // ── AC6: copy on a row in every section ──────────────────────────────────
  const copies = {};
  for (const [sectionId, name] of [['spacing', '--space-huge'], ['type', '--display-family'], ['borders', '--radius-pill'], ['effects', '--shadow-brand'], ['motion', '--ease-snappy']]) {
    await ev(`(() => { const s = ${SECTION(sectionId)}; if (s && s.getAttribute('data-section-open') !== 'true') s.querySelector('[class*="Header"]').click(); return 'ok'; })()`);
    await wait(300);
    await ev(`(() => { const r = document.querySelector('[data-style-row="${name}"]'); if (r) r.scrollIntoView({ block: 'center' }); return 'ok'; })()`);
    await ev(CLICK(`[data-test="token-copy-${name}"]`));
    await wait(300);
    copies[name] = await ev(`navigator.clipboard.readText()`);
  }
  record('AC6 — Copy on a row in every section: the clipboard holds var(--name), read back', Object.entries(copies).every(([n, v]) => v === `var(${n})`), JSON.stringify(copies));
  const toast = await ev(`document.body.innerText.includes('Copied var(--ease-snappy)')`);
  record('… and says so', toast === true, String(toast));

  finish();
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
