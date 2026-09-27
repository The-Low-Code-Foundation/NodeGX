#!/usr/bin/env node
/**
 * P103 CMG-009 — a token in a field reads as a token, driven (AC1–AC5, AC7).
 *
 *   npm run dev:debug -- --quiet      (wait for "launching Electron")
 *   node scripts/devtools/drive-cmg009-chip.js [--dir <copy>] [--shots <dir>]
 *
 * On a copy: a Group's padding is given two tokens and two numbers, a Text's font size and family
 * a token each, the Group's shadow a shadow token. Every arm reads the RUNNING property panel at
 * the inspector's 328px: the chip is there and its name is readable without an ellipsis; no text
 * box holds a `var()`; a press on the chip opens the token picker; ✕ puts the resolved number in
 * and ⌘Z brings the token back, one step each way; the padding glyph's `{·}` shows on hover
 * (computed style, rest vs hover); a `calc()` stays text and is not rewritten.
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
const PROJECT_DIR = opt('dir', '/Users/richardosborne/vscode_projects/NodeGX test projects/CMG Drive Looks J');
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
const SETTINGS = `${WREQ('./src/editor/src/utils/editorsettings.ts')}.EditorSettings.instance`;
const NGC = `${WREQ('./src/editor/src/contexts/NodeGraphContext/NodeGraphContext.tsx')}.NodeGraphContextTmp`;
const POPUP = `${WREQ('./src/editor/src/views/popuplayer.ts')}.PopupLayer.instance`;
const PANEL = '[data-panel-id="PropertyEditor"]';
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

  // The inspector at its default 328px — the width every "~60px per padding side" number is about.
  await ev(`(() => { ${SETTINGS}.set('inspector.width', 328); ${SETTINGS}.set('inspector.collapsed', false); return 'ok'; })()`);

  // ── 1. A Group and a Text, given tokens ──────────────────────────────────
  const setup = await readJson(`JSON.stringify((() => {
    const p = ${PROJECT}.instance;
    let group = null, text = null, comp = null;
    for (const c of p.getComponents()) {
      let g = null, t = null;
      c.graph.forEachNode((n) => {
        if (!g && n.typename === 'Group' && !n.variant) g = n;
        if (!t && n.typename === 'Text' && !n.variant) t = n;
      });
      if (g && t) { group = g; text = t; comp = c; break; }
    }
    if (!group || !text) return { error: 'NEED A GROUP AND A TEXT IN ONE COMPONENT' };
    group.setParameter('paddingLeft', 'var(--space-4)');
    group.setParameter('paddingRight', 'var(--space-8)');
    group.setParameter('paddingTop', { value: 8, unit: 'px' });
    group.setParameter('paddingBottom', { value: 12, unit: '%' });
    group.setParameter('boxShadowEnabled', true);
    group.setParameter('boxShadowSource', 'token');
    group.setParameter('boxShadowToken', 'var(--shadow-lg)');
    text.setParameter('fontSize', 'var(--text-lg)');
    text.setParameter('fontFamily', 'var(--font-sans)');
    const { resolveProjectTokenValue } = ${WREQ('./src/editor/src/models/StyleTokensModel/ProjectTokenCss.ts')};
    return { group: group.id, text: text.id, component: comp.name,
      resolved: { space4: resolveProjectTokenValue(p, 'var(--space-4)'), space8: resolveProjectTokenValue(p, 'var(--space-8)'), textLg: resolveProjectTokenValue(p, 'var(--text-lg)'), shadowLg: resolveProjectTokenValue(p, 'var(--shadow-lg)'), fontSans: resolveProjectTokenValue(p, 'var(--font-sans)') } };
  })())`);
  record('setup — a Group with two padding tokens and two numbers, a shadow token; a Text with a size and a family token', !setup.error && setup.resolved && setup.resolved.space4 && setup.resolved.textLg, JSON.stringify(setup).slice(0, 300));
  if (setup.error) return finish();
  const R = setup.resolved;

  // 🔴 Through the OTHER node first: re-selecting the node the panel already shows is a no-op, and a
  // panel left over from a previous run of this drive would then be read as this run's.
  const select = async (id) => {
    const other = id === setup.group ? setup.text : setup.group;
    await ev(`(() => { const p = ${PROJECT}.instance; const c = p.getComponentWithName(${JSON.stringify(setup.component)}); ${NGC}.switchToComponent(c, { node: { id: ${JSON.stringify(other)} }, pushHistory: true }); return 'ok'; })()`);
    await wait(500);
    await ev(`(() => { const p = ${PROJECT}.instance; const c = p.getComponentWithName(${JSON.stringify(setup.component)}); ${NGC}.switchToComponent(c, { node: { id: ${JSON.stringify(id)} }, pushHistory: true }); return 'ok'; })()`);
    await wait(1200);
  };
  const param = (id, name) => readJson(`JSON.stringify((() => { const p = ${PROJECT}.instance; let n = null; for (const c of p.getComponents()) c.graph.forEachNode((x) => { if (x.id === ${JSON.stringify(id)}) n = x; }); return { v: n.parameters[${JSON.stringify(name)}] === undefined ? null : n.parameters[${JSON.stringify(name)}] }; })())`).then((r) => r.v);
  const undoSteps = () => readJson(`JSON.stringify(${UNDO}.getHistoryLocation())`);
  const expandPadding = async () => {
    const r = await ev(`(() => { const b = document.querySelector('${PANEL} [data-test="marginpadding-expand-padding"]'); if (!b) return 'NO EXPANDER'; if (b.getAttribute('aria-expanded') !== 'true') b.click(); return 'ok'; })()`);
    await wait(600);
    return r;
  };
  const undo = async () => {
    await ev(`(() => { ${UNDO}.undo(); return 'ok'; })()`);
    await wait(500);
  };

  /** Everything a chip says, or null. */
  const CHIP = (test) => `JSON.stringify((() => {
    const chip = document.querySelector('${PANEL} [data-test="${test}"]');
    if (!chip) return null;
    const name = chip.querySelector('[class*="Name"]');
    const r = chip.getBoundingClientRect();
    const visible = Array.from(chip.children).filter((c) => !/Measure/.test(c.className || '') && !/Detach/.test(c.className || ''));
    return { token: chip.getAttribute('data-token-chip'), value: chip.getAttribute('data-token-value'), text: visible.map((c) => c.textContent).join('').trim(), title: chip.getAttribute('title'),
      shows: chip.getAttribute('data-token-shows'),
      fits: name ? (() => { const n = name.getBoundingClientRect(); return n.left >= r.left - 0.5 && n.right <= r.right + 0.5 && chip.scrollWidth <= chip.clientWidth + 1; })() : null, width: Math.round(r.width), height: Math.round(r.height), detach: !!chip.querySelector('[data-test="${test}-detach"]'),
      debug: name ? (() => { const n = name.getBoundingClientRect(); return { nl: Math.round(n.left), nr: Math.round(n.right), rl: Math.round(r.left), rr: Math.round(r.right), sw: chip.scrollWidth, cw: chip.clientWidth }; })() : null,
      shadow: (() => { const c = chip.querySelector('[class*="ShadowCard"]'); return c ? c.style.boxShadow : null; })() };
  })())`;
  const INPUTS_IN = (selector) => `(() => { const el = document.querySelector('${PANEL} ${selector}'); return el ? Array.from(el.querySelectorAll('input')).map((i) => i.value).join('|') || 'NONE' : 'NO ELEMENT'; })()`;

  // ── AC1 / AC4: the padding box at 328px ──────────────────────────────────
  await select(setup.group);
  const panelWidth = await ev(`(() => { const p = document.querySelector('${PANEL}'); return p ? Math.round(p.getBoundingClientRect().width) : 0; })()`);
  record('the inspector is at a width the ~60px-per-side numbers are about (260–360px; the stored width, read at mount)', Number(panelWidth) >= 260 && Number(panelWidth) <= 360, `${panelWidth}px`);
  const expanded = await expandPadding();
  const left = await readJson(CHIP('token-chip-padding-left'));
  const right = await readJson(CHIP('token-chip-padding-right'));
  const topInputs = await ev(INPUTS_IN('[data-comp="padding-top"]'));
  const bottomInputs = await ev(INPUTS_IN('[data-comp="padding-bottom"]'));
  const leftInputs = await ev(INPUTS_IN('[data-comp="padding-left"]'));
  record('AC1 — the padding side holding --space-4 is a chip you can read: "space-4", or "16px" where the name does not fit — whole, never an ellipsis', expanded === 'ok' && left && left.token === 'var(--space-4)' && (left.text === 'space-4' || left.text === R.space4) && left.fits === true, JSON.stringify(left));
  record(`AC1 — its tooltip carries the full name and the value (${R.space4}), and it offers ✕`, left && /--space-4 = /.test(String(left.title)) && left.detach, String(left && left.title));
  record('AC1 — no text box holds var(…) any more: the token side has no <input>', leftInputs === 'NONE', String(leftInputs));
  record('AC4 — the numeric sides are still boxes: 8 and 12', topInputs === '8' && bottomInputs === '12', `top=${topInputs} bottom=${bottomInputs}`);
  record('AC4 — the second token side (--space-8) is a chip too, read whole', right && right.token === 'var(--space-8)' && (right.text === 'space-8' || right.text === R.space8) && right.fits === true, JSON.stringify(right));
  await ev(`(() => { const el = document.querySelector('${PANEL} [data-test="marginpadding-row-padding"]'); if (el) el.scrollIntoView({ block: 'center' }); return 'ok'; })()`);
  await wait(300);
  await shot(editor, 'cmg009-ac4-padding-328.png');

  // A press on the chip opens the token picker, not a two-character input.
  const pressed = await ev(CLICK(`${PANEL} [data-test="token-chip-padding-left"]`));
  await wait(600);
  const picker = await ev(`(() => { const p = document.querySelector('[data-test="token-field-picker"]'); if (!p) return 'NO PICKER'; const r = p.getBoundingClientRect(); return r.width > 100 && r.height > 50 ? 'ok' : 'PICKER ' + r.width + 'x' + r.height; })()`);
  record('AC1 — pressing the chip opens the token picker', pressed === 'ok' && picker === 'ok', `${pressed} / ${picker}`);
  await shot(editor, 'cmg009-ac1-picker-from-chip.png');
  await ev(`(() => { ${POPUP}.hidePopouts(); return 'ok'; })()`);
  await wait(400);

  // ── AC3: Detach puts the resolved number in; ⌘Z brings the token back ────
  const steps0 = await undoSteps();
  const detached = await ev(CLICK(`${PANEL} [data-test="token-chip-padding-left-detach"]`));
  await wait(600);
  const afterDetach = await param(setup.group, 'paddingLeft');
  const steps1 = await undoSteps();
  const expectDetached = { value: parseFloat(String(R.space4)), unit: String(R.space4).replace(/^[\d.]+/, '') || 'px' };
  record(`AC3 — ✕ on the padding chip writes the resolved number ${JSON.stringify(expectDetached)}, one undo step`, detached === 'ok' && afterDetach && afterDetach.value === expectDetached.value && afterDetach.unit === expectDetached.unit && steps1 - steps0 === 1, `${JSON.stringify(afterDetach)} steps=${steps1 - steps0}`);
  const afterDetachInputs = await ev(INPUTS_IN('[data-comp="padding-left"]'));
  record('AC3 — and the side is a number box again', afterDetachInputs === String(expectDetached.value), String(afterDetachInputs));
  await undo();
  const afterUndo = await param(setup.group, 'paddingLeft');
  const steps2 = await undoSteps();
  await select(setup.group);
  await expandPadding(); // a re-selected node gets a fresh, collapsed box
  const leftBack = await readJson(CHIP('token-chip-padding-left'));
  record('AC3 — ⌘Z brings --space-4 back, one step, and the chip is drawn again', afterUndo === 'var(--space-4)' && steps2 === steps0 && leftBack && leftBack.token === 'var(--space-4)', `${JSON.stringify(afterUndo)} steps=${steps2 - steps0}`);

  // ── AC5: the padding glyph shows the {·} on hover — computed style, rest vs hover ──
  await ev(`(() => { const b = document.querySelector('${PANEL} [data-test="token-button-padding-top"]'); if (b) b.scrollIntoView({ block: 'center' }); return 'ok'; })()`);
  await wait(400);
  const glyphRest = await readJson(`JSON.stringify((() => {
    const b = document.querySelector('${PANEL} [data-test="token-button-padding-top"]');
    if (!b) return null;
    const mark = b.querySelector('[class*="PickMark"]'); const arrow = b.querySelector('[class*="Glyph"]:not([class*="GlyphBox"])');
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, mark: mark ? getComputedStyle(mark).opacity : null, arrow: arrow ? getComputedStyle(arrow).opacity : null };
  })())`);
  if (glyphRest && glyphRest.mark !== null) {
    await editor.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: glyphRest.x, y: glyphRest.y });
    await wait(400);
    const glyphHover = await readJson(`JSON.stringify((() => {
      const b = document.querySelector('${PANEL} [data-test="token-button-padding-top"]');
      const mark = b.querySelector('[class*="PickMark"]'); const arrow = b.querySelector('[class*="Glyph"]:not([class*="GlyphBox"])');
      return { hovered: b.matches(':hover'), mark: getComputedStyle(mark).opacity, arrow: getComputedStyle(arrow).opacity, title: b.getAttribute('title') };
    })())`);
    await shot(editor, 'cmg009-ac5-glyph-hover.png');
    await editor.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
    await wait(300);
    const glyphAfter = await readJson(`JSON.stringify((() => { const b = document.querySelector('${PANEL} [data-test="token-button-padding-top"]'); const mark = b.querySelector('[class*="PickMark"]'); return { mark: getComputedStyle(mark).opacity }; })())`);
    record('AC5 — at rest the padding glyph is the edge arrow and the {·} is hidden', glyphRest.mark === '0' && glyphRest.arrow === '1', JSON.stringify(glyphRest));
    record('AC5 — hovered, the {·} takes the arrow\'s place (computed opacity 1 / 0), and the tooltip says "Pick a design token"', glyphHover.hovered && glyphHover.mark === '1' && glyphHover.arrow === '0' && /design token/i.test(String(glyphHover.title)), JSON.stringify(glyphHover));
    record('AC5 — and it is the arrow again when the pointer leaves', glyphAfter.mark === '0', JSON.stringify(glyphAfter));
  } else {
    record('AC5 — the padding glyph carries a {·} mark', false, JSON.stringify(glyphRest));
  }

  // ── AC2: the shadow token on the same Group ──────────────────────────────
  const shadow = await readJson(CHIP('token-chip-boxShadowToken'));
  const shadowInputs = await ev(`(() => { const chip = document.querySelector('${PANEL} [data-test="token-chip-boxShadowToken"]'); if (!chip) return 'NO CHIP'; const row = chip.closest('[class*="Root"]'); return row && row.querySelector('input') ? 'HAS INPUT' : 'NONE'; })()`);
  record('AC2 — boxShadowToken holding --shadow-lg is a chip that draws the shadow it resolves to, and no text box', shadow && shadow.token === 'var(--shadow-lg)' && shadow.text === 'shadow-lg' && shadow.shadow && shadow.shadow.length > 5 && shadowInputs === 'NONE', JSON.stringify(shadow));
  await ev(`(() => { const el = document.querySelector('${PANEL} [data-test="token-chip-boxShadowToken"]'); if (el) el.scrollIntoView({ block: 'center' }); return 'ok'; })()`);
  await wait(300);
  await shot(editor, 'cmg009-ac2-shadow-chip.png');
  const shadowPressed = await ev(CLICK(`${PANEL} [data-test="token-chip-boxShadowToken"]`));
  await wait(600);
  const shadowPicker = await ev(`document.querySelector('[data-test="token-field-picker"]') ? 'ok' : 'NO PICKER'`);
  record('AC2 — pressing the shadow chip opens the token picker', shadowPressed === 'ok' && shadowPicker === 'ok', `${shadowPressed} / ${shadowPicker}`);
  await ev(`(() => { ${POPUP}.hidePopouts(); return 'ok'; })()`);
  await wait(400);

  // ── AC2: font size (NumberWithUnits) and font family (the picker row) on the Text ──
  await select(setup.text);
  const size = await readJson(CHIP('token-chip-fontSize'));
  const sizeInputs = await ev(`(() => { const chip = document.querySelector('${PANEL} [data-test="token-chip-fontSize"]'); if (!chip) return 'NO CHIP'; const field = chip.parentElement; return field.querySelector('input') ? 'HAS INPUT' : 'NONE'; })()`);
  record(`AC2 — Font Size holding --text-lg is a chip: "text-lg" (and ${R.textLg} where it fits), whole, no value box, no unit`, size && size.token === 'var(--text-lg)' && (size.text === 'text-lg' || size.text === `text-lg${R.textLg}`) && size.fits === true && sizeInputs === 'NONE', JSON.stringify(size));
  const family = await readJson(CHIP('token-chip-fontFamily'));
  record(`AC2 — Font Family holding --font-sans is a chip too (the picker row): "font-sans", whole; the stack it resolves to is in the tooltip`, family && family.token === 'var(--font-sans)' && /^font-sans/.test(family.text) && family.fits === true && family.value === R.fontSans && String(family.title).includes(R.fontSans), JSON.stringify({ ...family, value: undefined, title: undefined }));
  await ev(`(() => { const el = document.querySelector('${PANEL} [data-test="token-chip-fontSize"]'); if (el) el.scrollIntoView({ block: 'center' }); return 'ok'; })()`);
  await wait(300);
  await shot(editor, 'cmg009-ac2-font-size-chip.png');
  const sizePressed = await ev(CLICK(`${PANEL} [data-test="token-chip-fontSize"]`));
  await wait(600);
  const sizePicker = await ev(`document.querySelector('[data-test="token-field-picker"]') ? 'ok' : 'NO PICKER'`);
  record('AC2 — pressing the font-size chip opens the token picker', sizePressed === 'ok' && sizePicker === 'ok', `${sizePressed} / ${sizePicker}`);
  await ev(`(() => { ${POPUP}.hidePopouts(); return 'ok'; })()`);
  await wait(400);

  // AC3 on the number field: ✕ writes the resolved size; ⌘Z brings the token back.
  const s0 = await undoSteps();
  const sizeDetached = await ev(CLICK(`${PANEL} [data-test="token-chip-fontSize-detach"]`));
  await wait(600);
  const sizeAfter = await param(setup.text, 'fontSize');
  const s1 = await undoSteps();
  const expectSize = { value: parseFloat(String(R.textLg)), unit: String(R.textLg).replace(/^[\d.]+/, '') || 'px' };
  record(`AC3 — ✕ on Font Size writes ${JSON.stringify(expectSize)}, one undo step`, sizeDetached === 'ok' && sizeAfter && sizeAfter.value === expectSize.value && sizeAfter.unit === expectSize.unit && s1 - s0 === 1, `${JSON.stringify(sizeAfter)} steps=${s1 - s0}`);
  await undo();
  const sizeUndone = await param(setup.text, 'fontSize');
  record('AC3 — ⌘Z brings --text-lg back', sizeUndone === 'var(--text-lg)', JSON.stringify(sizeUndone));

  // ── AC7: anything that is not exactly one var() stays text and is not rewritten ──
  await ev(`(() => { const p = ${PROJECT}.instance; let n = null; for (const c of p.getComponents()) c.graph.forEachNode((x) => { if (x.id === ${JSON.stringify(setup.group)}) n = x; }); n.setParameter('paddingLeft', 'calc(var(--space-4) * 2)'); return 'ok'; })()`);
  await select(setup.group);
  await ev(`(() => { const b = document.querySelector('${PANEL} [data-test="marginpadding-expand-padding"]'); if (b && b.getAttribute('aria-expanded') !== 'true') b.click(); return 'ok'; })()`);
  await wait(500);
  const calcChip = await readJson(CHIP('token-chip-padding-left'));
  const calcInputs = await ev(INPUTS_IN('[data-comp="padding-left"]'));
  const calcStored = await param(setup.group, 'paddingLeft');
  record('AC7 — calc(var(--space-4) * 2) on a padding side: no chip, the text box shows it verbatim', calcChip === null && calcInputs === 'calc(var(--space-4) * 2)', `chip=${JSON.stringify(calcChip)} inputs=${calcInputs}`);
  record('AC7 — and nothing rewrote it: the model still holds the calc()', calcStored === 'calc(var(--space-4) * 2)', JSON.stringify(calcStored));

  finish();
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
