#!/usr/bin/env node
/**
 * P102 — the token composer, driven (CMP-001 AC1–AC5, AC7–AC8; CMP-008 AC2–AC3).
 *
 *   npm run dev:debug -- --quiet      (wait for "launching Electron")
 *   node scripts/devtools/drive-cmp001-composer.js [--dir <copy>] [--shots <dir>] [--json <file>]
 *
 * Every arm is a reading off the RUNNING editor and preview, never off a stylesheet: which
 * gradient swatches paint, whether the popout's Apply is the element under its own centre
 * (`elementFromPoint`), what the preview's `:root` says `--shadow-md` is while a slider is
 * mid-drag, and whether the undo queue grew by exactly one on Apply and by nothing on Cancel.
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
const PROJECT_DIR = opt('dir', '/Users/richardosborne/vscode_projects/NodeGX test projects/CMP-001 Composer Drive');
const SHOTS = opt(
  'shots',
  path.join(__dirname, '..', '..', 'dev-docs', 'tasks', 'phase-102-the-token-composer', 'shots')
);
const JSON_OUT = opt('json', null);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const arms = [];
const record = (name, ok, detail) => {
  arms.push({ name, ok, detail });
  console.log(`${ok === null ? 'UNGRADED' : ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const WREQ = (p) => `window.__wreq(${JSON.stringify(p)})`;
const PROJECT = `${WREQ('./src/editor/src/models/projectmodel.ts')}.ProjectModel`;
const INJECTOR = `${WREQ('./src/editor/src/services/PreviewTokenInjector.ts')}.PreviewTokenInjector.instance`;
const UNDO = `${WREQ('./src/editor/src/models/undo-queue-model.ts')}.UndoQueue.instance`;
const TOKENS_MODEL = `${WREQ('./src/editor/src/models/StyleTokensModel/StyleTokensModel.ts')}.StyleTokensModel`;
const MAKE = WREQ('./src/editor/src/views/panels/propertyeditor/components/makeShadowToken.tsx');

/** Set a React-controlled range/text input the way a real drag does: native setter + `input` event. */
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

const CLICK_TEXT = (text, within = 'body') => `(() => {
  const root = document.querySelector(${JSON.stringify(within)}) || document.body;
  const b = Array.from(root.querySelectorAll('button')).find((x) => x.textContent.trim() === ${JSON.stringify(text)});
  if (!b) return 'NO BUTTON ' + ${JSON.stringify(text)};
  b.click();
  return 'ok';
})()`;

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
    if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ project: PROJECT_DIR, arms }, null, 2));
    process.exit(failed.length ? 1 : 0);
  };

  // The window is `document.hidden`; make the page live on THIS connection before reading.
  await editor.send('Page.setWebLifecycleState', { state: 'active' }).catch(() => {});
  await editor.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  await ev(
    `(() => { if (!window.__wreq) { webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]); } return !!window.__wreq; })()`
  );
  // A crashed earlier run leaves its popout open, and every reading below would then read that
  // one ([[a-post-drive-control-reads-the-state-the-drive-leaves]]). Start from none.
  await ev(
    `(() => { ${WREQ('./src/editor/src/views/popuplayer.ts')}.default.instance.hidePopouts(true); return 'ok'; })()`
  );
  await wait(300);

  // ── 0. Open the copy ─────────────────────────────────────────────────────
  const routed = await ev(`(() => {
    if (window.__cmpRouter) return 'ok';
    const root = document.getElementById('root');
    let f = root[Object.keys(root).find((k) => k.startsWith('__reactContainer'))];
    let depth = 0;
    while (f && depth < 40) {
      const pr = f.memoizedProps;
      if (pr && pr.route && pr.route.router && typeof pr.route.router.route === 'function') { window.__cmpRouter = pr.route.router; break; }
      f = f.child; depth++;
    }
    return window.__cmpRouter ? 'ok' : 'NO ROUTER';
  })()`);
  if (String(routed) !== 'ok') {
    record('the editor router was found', false, String(routed));
    return finish();
  }
  const already = await ev(
    `(() => { const p = ${PROJECT}.instance; return (p && p._retainedProjectDirectory) || 'NONE'; })()`
  );
  if (path.resolve(String(already)) !== path.resolve(PROJECT_DIR)) {
    await ev(`(() => { window.__cmpRouter.route({ to: 'projects' }); return 'ok'; })()`);
    await wait(1500);
    await ev(`(async () => {
      const { LocalProjectsModel } = ${WREQ('./src/editor/src/utils/LocalProjectsModel.ts')};
      const p = await LocalProjectsModel.instance.openProjectFromFolder(${JSON.stringify(PROJECT_DIR)});
      window.__cmpRouter.route({ to: 'editor', project: p });
      return 'ok';
    })()`);
    await wait(10000);
  }
  const dir = await ev(`(() => ${PROJECT}.instance._retainedProjectDirectory || 'NONE')()`);
  record(
    'the driven project is the copy this drive names',
    path.resolve(String(dir)) === path.resolve(PROJECT_DIR),
    String(dir)
  );

  // ── 1. The Styles panel, Effects open ────────────────────────────────────
  await ev(
    `(() => { const b = document.querySelector('[data-test="styles-panel"]'); if (!b) return 'NO BUTTON'; b.click(); return 'ok'; })()`
  );
  await wait(1200);
  // Open "Other tokens", then "Effects", "Animation" and "Typography" (collapsed by default) —
  // by checking the rows are VISIBLE, not by counting clicks: a header click toggles, and a
  // second click on an open section closes it.
  const visible = (sel) =>
    `(() => { const el = document.querySelector(${JSON.stringify(
      sel
    )}); if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; })()`;
  const clickHeader = (title) => `(() => {
    const hs = Array.from(document.querySelectorAll('[class*="CollapsableSection"], [class*="Section"] [class*="Header"], header, [role="button"]'));
    const h = hs.find((x) => x.textContent.trim().startsWith(${JSON.stringify(
      title
    )}) && x.getBoundingClientRect().height < 60);
    if (h) h.click();
    return h ? 'ok' : 'NO HEADER ' + ${JSON.stringify(title)};
  })()`;
  for (const [title, probe] of [
    ['Other tokens', '[aria-label^="Open composer for --"]'],
    ['Effects', '[aria-label="Edit --gradient-brand"]'],
    ['Animation', '[aria-label="Open composer for --ease-out"]'],
    ['Typography', '[aria-label="Open composer for --font-sans"]']
  ]) {
    for (let tries = 0; tries < 2 && (await ev(visible(probe))) !== true; tries++) {
      await ev(clickHeader(title));
      await wait(500);
    }
  }
  await wait(600);
  record(
    'the Effects rows are on screen for the AC1 shot',
    (await ev(visible('[aria-label="Edit --gradient-brand"]'))) === true,
    ''
  );

  // AC1: every gradient swatch paints, none carries an unresolved var().
  const paints = await readJson(`JSON.stringify((() => {
    const buttons = Array.from(document.querySelectorAll('[aria-label^="Edit --gradient-"]'));
    return buttons.map((b) => {
      const sw = b.querySelector('div');
      const bg = sw ? getComputedStyle(sw).backgroundImage : 'NO SWATCH';
      return { name: b.getAttribute('aria-label'), bg: bg.slice(0, 80), gradient: /gradient\\(/.test(bg), unresolved: /var\\(/.test(bg) };
    });
  })())`);
  const rows = Array.isArray(paints) ? paints : [];
  record(
    'AC1 — all five gradient rows paint a real gradient with no var() left in it',
    rows.length === 5 && rows.every((r) => r.gradient && !r.unresolved),
    `${rows.length} rows; painting ${rows.filter((r) => r.gradient).length}; unresolved ${
      rows.filter((r) => r.unresolved).length
    }`
  );
  const words =
    await readJson(`JSON.stringify(Array.from(document.querySelectorAll('[aria-label^="Open composer for --"]')).slice(0, 40).map((b) => {
    const row = b.closest('[class*="TokenRow"]');
    return row ? row.textContent.trim().slice(0, 90) : '';
  }))`);
  record(
    'RC-3 — the composer rows say their value in words (no raw CSS box)',
    Array.isArray(words) && words.some((w) => /Shadow · /.test(w)) && words.some((w) => /Linear · |Radial · /.test(w)),
    (Array.isArray(words) ? words.slice(0, 6) : []).join(' | ')
  );
  await shot(editor, 'cmp001-ac1-effects-after.png');

  // ── 2. Open --shadow-md; Apply is reachable ─────────────────────────────
  const opened = await ev(
    `(() => { const b = document.querySelector('[aria-label="Open composer for --shadow-md"]'); if (!b) return 'NO ROW'; b.click(); return 'ok'; })()`
  );
  await wait(800);
  const reach = await readJson(`JSON.stringify((() => {
    const root = document.querySelector('[data-token-composer="--shadow-md"]');
    if (!root) return { error: 'NO COMPOSER' };
    const apply = Array.from(root.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Apply');
    const r = apply.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const canvas = document.querySelector('webview, .canvas-view, [class*="CanvasView"]');
    const cr = canvas ? canvas.getBoundingClientRect() : null;
    const pr = root.getBoundingClientRect();
    return { hitEl: hit ? hit.tagName + '.' + String(hit.className).slice(0, 40) : null, onScreen: r.left >= 0 && r.top >= 0 && r.bottom <= innerHeight && r.right <= innerWidth, hit: hit === apply || apply.contains(hit), popout: [Math.round(pr.left), Math.round(pr.top), Math.round(pr.width), Math.round(pr.height)], canvas: cr ? [Math.round(cr.left), Math.round(cr.width)] : null, win: [innerWidth, innerHeight] };
  })())`);
  record(
    'AC2 — the popout opens fully on screen and Apply is the element under its own centre',
    String(opened) === 'ok' && reach.onScreen === true && reach.hit === true,
    JSON.stringify(reach)
  );
  const summary = await ev(
    `(() => { const s = document.querySelector('[data-token-composer] [data-summary]'); return s ? s.textContent : 'NO SUMMARY'; })()`
  );
  record('the header says the value in words with its preset lit', /Soft/.test(String(summary)), String(summary));
  await shot(editor, 'cmp002-shadow-composer.png');

  // ── 3. Slide: the canvas follows the draft; Cancel leaves nothing ───────
  const tokenFile = path.join(PROJECT_DIR, 'nodegx.project.json');
  const mtimeBefore = fs.statSync(tokenFile).mtimeMs;
  const undoBefore = await ev(`${UNDO}.getHistoryLocation()`);
  const savedValue = await ev(
    `(() => { const p = ${PROJECT}.instance; const t = new (${TOKENS_MODEL})(); const v = t.getToken('--shadow-md').value; t.dispose && t.dispose(); return v; })()`
  );
  for (let i = 1; i <= 10; i++)
    await ev(SET_INPUT('[data-token-composer="--shadow-md"] input[type=range]', 10 + i * 3));
  await wait(400);
  const draft = await readJson(`JSON.stringify(${INJECTOR}.draft)`);
  record(
    'AC7 — before Apply the injector holds a draft for --shadow-md that differs from the saved value',
    draft && draft.name === '--shadow-md' && draft.value !== savedValue,
    JSON.stringify(draft)
  );
  let viewer = null;
  try {
    viewer = await connect(await appTarget('viewer'));
  } catch (e) {
    record('the preview window is reachable for the canvas reading', false, String(e.message));
  }
  const vev = (expr) => (viewer ? evaluate(viewer, expr) : Promise.resolve('NO VIEWER'));
  const onCanvas = await readJson(
    `JSON.stringify((() => {
    const el = document.getElementById('noodl-design-tokens-draft');
    const tokens = document.getElementById('noodl-design-tokens');
    return { present: !!el, afterTokens: !!(el && tokens && tokens.nextElementSibling === el), value: getComputedStyle(document.documentElement).getPropertyValue('--shadow-md').trim() };
  })())`.replace('JSON.stringify', 'JSON.stringify')
  ).catch(() => null);
  const canvas = viewer
    ? JSON.parse(
        await vev(`JSON.stringify((() => {
    const el = document.getElementById('noodl-design-tokens-draft');
    const tokens = document.getElementById('noodl-design-tokens');
    return { present: !!el, afterTokens: !!(el && tokens && tokens.nextElementSibling === el), value: getComputedStyle(document.documentElement).getPropertyValue('--shadow-md').trim() };
  })())`)
      )
    : { error: 'NO VIEWER' };
  void onCanvas;
  record(
    'AC7 — the preview carries the draft style element AFTER the token block, and :root reads the draft',
    canvas.present === true && canvas.afterTokens === true && draft && canvas.value === draft.value,
    JSON.stringify(canvas)
  );
  await shot(editor, 'cmp001-ac7-mid-slide.png');

  await ev(CLICK_TEXT('Cancel', '[data-token-composer="--shadow-md"]'));
  await wait(500);
  const afterCancel = viewer
    ? JSON.parse(
        await vev(
          `JSON.stringify({ present: !!document.getElementById('noodl-design-tokens-draft'), value: getComputedStyle(document.documentElement).getPropertyValue('--shadow-md').trim() })`
        )
      )
    : {};
  const undoAfterCancel = await ev(`${UNDO}.getHistoryLocation()`);
  const valueAfterCancel = await ev(
    `(() => { const t = new (${TOKENS_MODEL})(); const v = t.getToken('--shadow-md').value; t.dispose && t.dispose(); return v; })()`
  );
  record(
    'AC4/AC7 — Cancel: draft element gone, :root back to the saved value, undo stack and token file untouched',
    afterCancel.present === false &&
      afterCancel.value === savedValue &&
      Number(undoAfterCancel) === Number(undoBefore) &&
      valueAfterCancel === savedValue &&
      fs.statSync(tokenFile).mtimeMs === mtimeBefore,
    JSON.stringify({
      afterCancel,
      undoBefore,
      undoAfterCancel,
      mtimeSame: fs.statSync(tokenFile).mtimeMs === mtimeBefore
    })
  );
  record(
    'the composer popout is gone after Cancel',
    (await ev(`document.querySelectorAll('[data-token-composer]').length`)) === 0,
    ''
  );

  // ── 4. Slide ten times, Apply: one undo step ────────────────────────────
  await ev(
    `(() => { document.querySelector('[aria-label="Open composer for --shadow-md"]').click(); return 'ok'; })()`
  );
  await wait(700);
  for (let i = 1; i <= 10; i++)
    await ev(SET_INPUT('[data-token-composer="--shadow-md"] input[type=range]', 20 + i * 2));
  await wait(200);
  await ev(CLICK_TEXT('Apply', '[data-token-composer="--shadow-md"]'));
  await wait(600);
  const undoAfterApply = await ev(`${UNDO}.getHistoryLocation()`);
  const valueAfterApply = await ev(
    `(() => { const t = new (${TOKENS_MODEL})(); const v = t.getToken('--shadow-md').value; t.dispose && t.dispose(); return v; })()`
  );
  record(
    'AC3 — Apply after ten slides is ONE undo step and the token changed',
    Number(undoAfterApply) === Number(undoBefore) + 1 && valueAfterApply !== savedValue,
    `${undoBefore} → ${undoAfterApply}; ${valueAfterApply}`
  );
  await ev(`(() => { ${UNDO}.undo(); return 'ok'; })()`);
  await wait(400);
  const valueAfterUndo = await ev(
    `(() => { const t = new (${TOKENS_MODEL})(); const v = t.getToken('--shadow-md').value; t.dispose && t.dispose(); return v; })()`
  );
  record('AC3 — one ⌘Z puts the value back where it started', valueAfterUndo === savedValue, String(valueAfterUndo));
  record(
    'after Apply the preview carries no draft element',
    viewer ? (await vev(`!!document.getElementById('noodl-design-tokens-draft')`)) === false : null,
    ''
  );

  // ── 5. Text mode and the door out ───────────────────────────────────────
  const textToken = await ev(
    `(() => { const t = new (${TOKENS_MODEL})(); const hit = t.getTokens().find((x) => x.category === 'shadow' && x.isCustom && x.value === '#29201933'); t.dispose && t.dispose(); return hit ? hit.name : 'NONE'; })()`
  );
  if (String(textToken) !== 'NONE') {
    const openedText = await ev(
      `(() => { const b = document.querySelector('[aria-label="Open composer for ${textToken}"]'); if (!b) return 'NO ROW'; b.click(); return 'ok'; })()`
    );
    await wait(700);
    const textMode = await readJson(`JSON.stringify((() => {
      const root = document.querySelector('[data-token-composer="${textToken}"]');
      if (!root) return { error: 'NO COMPOSER' };
      return { sentence: !!root.querySelector('[data-text-mode]'), css: !!root.querySelector('[data-show-css]'), ranges: root.querySelectorAll('input[type=range]').length, replace: Array.from(root.querySelectorAll('button')).some((b) => /^Replace with a preset/.test(b.textContent.trim())), textarea: !!root.querySelector('textarea') };
    })())`);
    record(
      'AC5 — a value the codec refuses opens in text mode: sentence, Show CSS open, a text box, no sliders, Replace with a preset',
      String(openedText) === 'ok' &&
        textMode.sentence &&
        textMode.css &&
        textMode.ranges === 0 &&
        textMode.replace &&
        textMode.textarea,
      JSON.stringify(textMode)
    );
    await shot(editor, 'cmp001-ac5-text-mode.png');
    await ev(
      `(() => { const b = Array.from(document.querySelectorAll('[data-token-composer="${textToken}"] button')).find((x) => /^Replace with a preset/.test(x.textContent.trim())); b.click(); return 'ok'; })()`
    );
    await wait(500);
    const replaced = await readJson(
      `JSON.stringify((() => { const root = document.querySelector('[data-token-composer="${textToken}"]'); return { ranges: root.querySelectorAll('input[type=range]').length, sentence: !!root.querySelector('[data-text-mode]') }; })())`
    );
    const rowStillText = await ev(
      `(() => { const r = document.querySelector('[aria-label="Value for ${textToken}"]'); return r ? r.value : 'NO INPUT'; })()`
    );
    record(
      'AC8 — Replace with a preset draws the visual controls and the row keeps its text until Apply',
      replaced.ranges > 0 && replaced.sentence === false && String(rowStillText) === '#29201933',
      JSON.stringify(replaced)
    );
    await ev(CLICK_TEXT('Cancel', '[data-token-composer="--shadow-md"]'));
    await wait(400);
    const restored = await ev(
      `(() => { const t = new (${TOKENS_MODEL})(); const v = t.getToken('${textToken}').value; t.dispose && t.dispose(); return v; })()`
    );
    record('AC8 — Cancel restores the text value byte-identical', String(restored) === '#29201933', String(restored));
  } else {
    record(
      'AC5 — the fixture carries the text-mode shadow this drive expects',
      false,
      'no custom shadow token holding #29201933'
    );
  }

  // ── 6. The other composers open and draw ────────────────────────────────
  for (const [token, file, expect] of [
    ['--gradient-spotlight', 'cmp003-gradient-composer.png', /Radial/],
    ['--ease-out', 'cmp004-easing-composer.png', /Slows at the end/],
    ['--duration-150', 'cmp004-duration-composer.png', /Quick/],
    ['--font-sans', 'cmp005-font-composer.png', /sans serif|System/]
  ]) {
    const ok = await ev(
      `(() => { const b = document.querySelector('[aria-label="Open composer for ${token}"]'); if (!b) return 'NO ROW'; b.click(); return 'ok'; })()`
    );
    await wait(900);
    const s = await ev(
      `(() => { const s = document.querySelector('[data-token-composer="${token}"] [data-summary]'); return s ? s.textContent : 'NO SUMMARY'; })()`
    );
    record(`${token} opens with its words`, String(ok) === 'ok' && expect.test(String(s)), String(s));
    await shot(editor, file);
    if (token === '--font-sans') {
      const fontRows = await readJson(
        `JSON.stringify((() => { const rows = Array.from(document.querySelectorAll('[data-token-composer] [role="option"]')); return { rows: rows.length, unavailable: rows.filter((r) => /preview unavailable/.test(r.textContent)).length, drawn: rows.filter((r) => !/preview unavailable/.test(r.textContent)).length }; })())`
      );
      record(
        'CMP-005 AC3 — the font list draws each font in itself, and says when it cannot',
        fontRows.rows > 10 && fontRows.drawn > 0,
        JSON.stringify(fontRows)
      );
    }
    await ev(CLICK_TEXT('Cancel', '[data-token-composer]'));
    await wait(300);
  }

  // ── 7. CMP-008: a Group wears a shadow token; Make this a token is one undo step ──
  const groupInfo = await readJson(`JSON.stringify((() => {
    const p = ${PROJECT}.instance;
    const comps = p.getComponents();
    for (const c of comps) {
      let found = null;
      c.graph.forEachNode((n) => { if (!found && /group/i.test(n.typename || (n.type && n.type.name) || '') && n.getParameter('boxShadowEnabled') === true) found = n; });
      if (found) { window.__cmpNode = found; return { component: c.fullName, id: found.id, source: found.getParameter('boxShadowSource') }; }
    }
    return { error: 'NO GROUP WITH A SHADOW' };
  })())`);
  if (groupInfo.id) {
    const before = await readJson(
      `JSON.stringify({ x: window.__cmpNode.getParameter('boxShadowOffsetX'), color: window.__cmpNode.getParameter('boxShadowColor') })`
    );
    const undoB = await ev(`${UNDO}.getHistoryLocation()`);
    const made = await ev(
      `(() => { const t = new (${TOKENS_MODEL})(); const name = ${MAKE}.makeShadowTokenNow(window.__cmpNode, t, '--shadow-drive'); const v = t.getToken(name); t.dispose && t.dispose(); return JSON.stringify({ name, value: v && v.value }); })()`
    );
    const madeJ = JSON.parse(String(made));
    const nodeAfter = await readJson(
      `JSON.stringify({ source: window.__cmpNode.getParameter('boxShadowSource'), token: window.__cmpNode.getParameter('boxShadowToken'), x: window.__cmpNode.getParameter('boxShadowOffsetX'), color: window.__cmpNode.getParameter('boxShadowColor') })`
    );
    const undoA = await ev(`${UNDO}.getHistoryLocation()`);
    record(
      'CMP-008 AC3 — Make this a token writes the six fields as one token, switches the node, keeps the fields, ONE undo step',
      madeJ.value &&
        /^(inset )?-?\d/.test(madeJ.value) &&
        nodeAfter.source === 'token' &&
        nodeAfter.token === 'var(--shadow-drive)' &&
        JSON.stringify(nodeAfter.x) === JSON.stringify(before.x) &&
        Number(undoA) === Number(undoB) + 1,
      JSON.stringify({ madeJ, nodeAfter, undoB, undoA })
    );
    await ev(`(() => { ${UNDO}.undo(); return 'ok'; })()`);
    await wait(300);
    const undone = await readJson(
      `JSON.stringify((() => { const t = new (${TOKENS_MODEL})(); const tok = t.getToken('--shadow-drive'); t.dispose && t.dispose(); return { source: window.__cmpNode.getParameter('boxShadowSource'), token: !!tok, x: window.__cmpNode.getParameter('boxShadowOffsetX') }; })())`
    );
    record(
      'CMP-008 AC3 — one ⌘Z: the node is back in Custom with its values and the token is gone',
      (undone.source === undefined || undone.source === 'custom') &&
        undone.token === false &&
        JSON.stringify(undone.x) === JSON.stringify(before.x),
      JSON.stringify(undone)
    );
  } else {
    record('CMP-008 — the fixture has a Group with a shadow to make a token from', false, JSON.stringify(groupInfo));
  }

  await shot(editor, 'cmp001-end.png');
  finish();
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
