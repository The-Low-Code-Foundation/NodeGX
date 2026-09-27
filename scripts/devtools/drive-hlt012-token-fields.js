#!/usr/bin/env node
/**
 * P99 HLT-012 — a numeric field offers the project's design tokens.
 *
 * Grades the person sentence on a driven editor: select a node, open its property panel, press the
 * token button on a Font Size row and on the padding box, and read what is offered and what gets
 * STORED.
 *
 * 🔴 **It presses the real button on the real row.** HLT-006's drive mounted the picker component
 * itself, which grades the list and not the affordance — and the affordance is the whole of this
 * task ([[verify-the-consequence-not-just-the-mechanism]]). Every count here comes from the panel
 * the property editor rendered, reached through `Input.dispatchMouseEvent`.
 *
 * 🔴 **The control is TWO BUILDS, like HLT-011's.** There is no seam to mutate: the decision to
 * draw the button is `tokenCategoriesForPort`, a pure function in a webpack module, and a webpack
 * export cannot be patched (getter-only, then non-configurable — HLT-006 lost a run to exactly
 * that). So `--arm control` is driven against the six files as they stand at HEAD, restored by the
 * caller, and it reads the product as it shipped before this task.
 *
 * 🔴 **Three things the fix can CAUSE are graded beside the thing it cures** (HLT-001's rule):
 *   (a) the button must not eat a press meant for the value — a typed number still commits;
 *   (b) a field holding a token must not be draggable — a one-pixel drag would replace the
 *       reference with the port's default, silently (§6's landmine, which measured true);
 *   (c) a row with no scale — Rotation, Opacity — must draw NO button. A button on every numeric
 *       field is the 91-row problem one field along, and it is AC3.
 *
 * Usage:
 *   node scripts/devtools/drive-hlt012-token-fields.js --dir <project copy> [--arm fixed|control]
 *                                                      [--shots <dir>] [--json <file>]
 *
 * Exits 0 when every graded arm passed.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { appTarget, connect, evaluate, dispatchClick } = require('./cdp.js');

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const PROJECT_DIR = opt('dir', null);
const ARM = opt('arm', 'fixed'); // 'fixed' | 'control'
const SHOTS = opt(
  'shots',
  path.join(__dirname, '..', '..', 'dev-docs', 'tasks', 'phase-99-the-ones-nobody-owned', 'shots')
);
const JSON_OUT = opt('json', null);

if (!PROJECT_DIR) {
  console.error('--dir <project directory> is required: drive a COPY, opening one writes three files into it');
  process.exit(2);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const arms = [];
const record = (name, ok, detail) => {
  arms.push({ name, ok, detail: detail === undefined ? undefined : String(detail).slice(0, 400) });
  console.log(`${ok === null ? '·' : ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const WREQ = (p) => `window.__wreq(${JSON.stringify(p)})`;
const PROJECT = `${WREQ('./src/editor/src/models/projectmodel.ts')}.ProjectModel`;
const POPUPS = `${WREQ('./src/editor/src/views/popuplayer.ts')}.PopupLayer`;
const THEME = `${WREQ('./src/editor/src/models/ThemeManager.ts')}.ThemeManager`;
const DISPATCH = `${WREQ('./src/shared/utils/EventDispatcher.ts')}.EventDispatcher`;
const ED = `${WREQ('./src/editor/src/contexts/NodeGraphContext/NodeGraphContext.tsx')}.NodeGraphContextTmp.nodeGraph`;

const STRIP_OVERLAY = `(() => {
  let n = 0;
  document.querySelectorAll('iframe[src*="webpack"], #webpack-dev-server-client-overlay, [class*="DevServerOverlay"]').forEach((el) => { el.remove(); n++; });
  return n;
})()`;

const CLOSE_POPUPS = `(() => {
  const L = ${POPUPS}.instance;
  if (L && L.hideAllModalsAndPopups) L.hideAllModalsAndPopups();
  return document.querySelectorAll('.popup-layer-popout').length;
})()`;

/** Is the editor on 9222 one this process can account for? A peer's is byte-identical to mine. */
function cdpOwnership(port = 9222) {
  try {
    const listener = execSync(`lsof -ti :${port} -sTCP:LISTEN 2>/dev/null || true`, { encoding: 'utf8' })
      .trim()
      .split(/\s+/)
      .filter(Boolean)[0];
    if (!listener) return { ok: false, why: `nothing is LISTENING on ${port}` };
    const chain = [];
    let pid = Number(listener);
    for (let i = 0; i < 12 && pid > 1; i++) {
      const line = execSync(`ps -p ${pid} -o ppid=,comm= 2>/dev/null || true`, { encoding: 'utf8' }).trim();
      if (!line) break;
      chain.push(pid);
      pid = Number(line.split(/\s+/)[0]);
    }
    return { ok: true, why: `listener ${listener}, ancestry ${chain.join('<')}` };
  } catch (e) {
    return { ok: false, why: `ownership check itself failed: ${e.message}` };
  }
}

/**
 * A selector's centre AND whether the element is the thing a person would press there.
 *
 * ⚠️ A rect is not visibility ([[a-rect-is-not-visibility]]). Every press below goes through this,
 * so a button drawn under the canvas or behind a toast refuses to grade rather than passing.
 */
const HIT = (sel) => `JSON.stringify((() => {
  const el = document.querySelector(${JSON.stringify(sel)});
  if (!el) return { found: false };
  // The property panel is a scroller and most of its rows start below the fold. Bring the row up
  // first: a coordinate for an element nobody can see is a coordinate for whatever IS there.
  if (el.scrollIntoView) el.scrollIntoView({ block: 'center' });
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return { found: true, hit: false, why: 'zero-area' };
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const onScreen = cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight;
  if (!onScreen) {
    return { found: true, hit: false, why: 'off-screen after scrollIntoView', rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } };
  }
  const at = document.elementFromPoint(cx, cy);
  return {
    found: true,
    // 🔴 **\`el.contains(at)\` ONLY.** The usual form in this phase's drives also accepts
    // \`at.contains(el)\`, and that half is what let a button 568px below the fold report
    // \`hit: true\`: the coordinates were clamped into the viewport, \`elementFromPoint\` returned
    // the panel ROOT, and the root contains the button, so the ancestor test passed. The drive
    // then pressed the panel background and read an empty popout as "0 tokens offered".
    // An ancestor at the point is not the element at the point.
    hit: !!at && el.contains(at),
    why: at ? String(at.className || at.tagName) : 'nothing at point',
    x: Math.round(cx), y: Math.round(cy),
    rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }
  };
})())`;

/**
 * What the token popout is showing, read from the RENDERED DOM.
 *
 * 🔴 Never from the model. "The model holds 13 font sizes" is a fact about the model; this task is
 * about a list that could always have held them and showed none.
 */
const READ_POPOUT = `JSON.stringify((() => {
  const root = document.querySelector('[data-test="token-field-picker"]');
  if (!root) return { open: false, rows: 0, headings: [], tokens: [] };
  const headings = [...root.querySelectorAll('.variants-header span:first-child')].map((s) => s.innerText.trim());
  const rows = [...root.querySelectorAll('[data-token]')];
  return {
    open: true,
    rows: rows.length,
    headings,
    tokens: rows.map((r) => r.getAttribute('data-token')),
    values: rows.slice(0, 4).map((r) => {
      const v = r.querySelector('.token-item-value');
      return v ? v.innerText.trim() : '';
    })
  };
})())`;

/**
 * A shot of one field's picker, in both themes.
 *
 * ⚠️ **Both fields get one.** AC5 is Richard's ruling on what this looks like, and the two surfaces
 * do not look alike: the numeric row's button sits inside the field on its trailing edge, the box
 * widget's IS the edge glyph. A shot of one is not a picture of the other.
 */
function shotPass(editor, ev, readJson, selector, label) {
  return (async () => {
    for (const theme of ['dark', 'light']) {
      await ev(`(() => { ${THEME}.setMode(${JSON.stringify('%T%')}); return 'ok'; })()`.replace('%T%', theme));
      // ⚠️ A theme flip does not apply in the same eval — the write and the paint are two frames.
      await wait(1200);
      await ev(CLOSE_POPUPS);
      await wait(300);
      const b = await readJson(HIT(selector));
      if (b.found && b.hit) {
        await dispatchClick(editor, { x: b.x, y: b.y });
        await wait(900);
      }
      await ev(STRIP_OVERLAY);
      fs.mkdirSync(SHOTS, { recursive: true });
      const file = path.join(SHOTS, `hlt012-${label}-${ARM}-${theme}.png`);
      const shot = await editor.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      console.log(`  shot ${path.basename(file)}`);
    }
    await ev(`(() => { ${THEME}.setMode('dark'); return 'ok'; })()`);
    await wait(900);
    await ev(CLOSE_POPUPS);
  })();
}

async function main() {
  const own = cdpOwnership();
  record('the CDP endpoint on 9222 can be accounted for', own.ok, own.why);
  if (!own.ok) return finish(null);

  const target = await appTarget('editor');
  const editor = await connect(target);
  const ev = (expr) => evaluate(editor, expr);
  const readJson = async (expr) => {
    const raw = await ev(expr);
    try {
      return JSON.parse(raw);
    } catch (e) {
      return { error: `unparseable: ${String(raw).slice(0, 160)}` };
    }
  };

  await ev(STRIP_OVERLAY);

  // The renderer's own module registry, borrowed the way every drive in this phase borrows it.
  // ⚠️ It is NOT installed by the app — a drive that assumes `window.__wreq` exists reads
  // `undefined is not a function` and reports it as "no router".
  const wreq = await ev(
    `(() => { if (!window.__wreq) { webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]); } return !!window.__wreq; })()`
  );
  record('the renderer module registry is reachable', wreq === true, `__wreq=${wreq}`);
  if (wreq !== true) return finish(editor);

  // ── the project: a COPY, with the shape real projects have ────────────────
  const routerOk = await ev(`(() => {
    if (window.__hltRouter) return 'ok';
    const host = document.querySelector('#root') || document.querySelector('#app') || document.body;
    const key = Object.keys(host).find((k) => k.startsWith('__reactContainer'));
    let f = key ? host[key] : null; let depth = 0;
    while (f && depth < 40) {
      const pr = f.memoizedProps;
      if (pr && pr.route && pr.route.router && typeof pr.route.router.route === 'function') { window.__hltRouter = pr.route.router; break; }
      f = f.child; depth++;
    }
    return window.__hltRouter ? 'ok' : 'NO ROUTER';
  })()`);
  if (routerOk !== 'ok') {
    record('the editor router was found', false, routerOk);
    return finish(editor);
  }

  const already = await ev(`(() => { const p = ${PROJECT}.instance; return (p && p._retainedProjectDirectory) || 'NONE'; })()`);
  if (path.resolve(String(already)) !== path.resolve(PROJECT_DIR)) {
    console.log(`opening ${PROJECT_DIR} (editor had ${already})`);
    await ev(`(() => { window.__hltRouter.route({ to: 'projects' }); return 'ok'; })()`);
    await wait(1500);
    await ev(`(async () => {
      const { LocalProjectsModel } = ${WREQ('./src/editor/src/utils/LocalProjectsModel.ts')};
      const p = await LocalProjectsModel.instance.openProjectFromFolder(${JSON.stringify(PROJECT_DIR)});
      window.__hltRouter.route({ to: 'editor', project: p });
      return 'ok';
    })()`);
    await wait(9000);
  }

  const dir = await ev(`(() => ${PROJECT}.instance._retainedProjectDirectory || 'NONE')()`);
  record(
    'the driven project is the COPY this run was pointed at',
    path.resolve(String(dir)) === path.resolve(PROJECT_DIR),
    String(dir)
  );
  if (path.resolve(String(dir)) !== path.resolve(PROJECT_DIR)) return finish(editor);

  const shape = await readJson(`JSON.stringify((() => {
    const p = ${PROJECT}.instance;
    const styles = p.getMetaData('styles');
    const dt = p.getMetaData('designTokens');
    return {
      legacyStyles: styles === null ? 'null' : styles === undefined ? 'absent' : 'PRESENT',
      customTokens: dt && Array.isArray(dt.customTokens) ? dt.customTokens.length : 0
    };
  })())`);
  record(
    '🔴 the driven project has the REAL shape — no legacy style layer, design tokens present (AC4)',
    (shape.legacyStyles === 'null' || shape.legacyStyles === 'absent') && shape.customTokens > 0,
    `metadata.styles=${shape.legacyStyles}, customTokens=${shape.customTokens}`
  );

  // ── reach: select a node, and prove the panel drew the row this drive presses ──
  //
  // 🔴 **Two nodes, because no node in a real project has both rows.** The first draft asked for
  // one carrying `fontSize` AND `paddingTop`; it found a Button, whose Font Size lives inside a
  // Label **popout group** and therefore never reaches a row — 43 rows rendered, none of them the
  // one being pressed. `Text` has the font scale and no box model; the controls have the box model
  // and their text ports in popouts. So the drive selects each in turn and grades the row it can
  // actually see ([[a-rendered-surface-can-be-behind-a-blocker]], one layer up: not rendered at all).
  const selectNodeWith = async (portName) => {
    const picked = await readJson(`JSON.stringify((() => {
      const p = ${PROJECT}.instance;
      for (const c of p.getComponents()) {
        const g = c.graph; if (!g || !g.roots) continue;
        const all = []; const walk = (n) => { all.push(n); (n.children || []).forEach(walk); }; g.roots.forEach(walk);
        for (const n of all) {
          const port = (n.getPorts ? n.getPorts('input') : []).find((pt) => pt.name === ${JSON.stringify(portName)} && !pt.popout);
          if (port) {
            window.__hltNodeId = n.id;
            window.__hltNode = n;
            ${DISPATCH}.instance.notifyListeners('ComponentPanel.SwitchToComponent', { component: c, pushHistory: false });
            return { component: c.name, nodeId: n.id, typename: n.typename };
          }
        }
      }
      return { error: 'NO NODE WITH A NON-POPOUT ' + ${JSON.stringify(portName)} + ' PORT' };
    })())`);
    if (picked.error) return picked;
    await wait(2500);

    const sel = await readJson(`JSON.stringify((() => {
      const ed = ${ED};
      if (!ed) return { error: 'NO NODE GRAPH' };
      const all = []; const walk = (n) => { all.push(n); (n.children || []).forEach(walk); }; (ed.roots || []).forEach(walk);
      const node = all.find((n) => n.model && n.model.id === window.__hltNodeId) || all.find((n) => n.id === window.__hltNodeId);
      if (!node) return { error: 'NODE NOT ON CANVAS', count: all.length };
      ed.selectionActions ? ed.selectionActions.selectNode(node, {}) : ed.selector.selectNode(node);
      return { selected: true };
    })())`);
    await wait(2500);
    return { ...picked, ...sel };
  };

  const textNode = await selectNodeWith('fontSize');
  record(
    '🔴 REACH — a node with a Font Size ROW is selected',
    textNode.selected === true,
    JSON.stringify(textNode)
  );
  if (!textNode.selected) return finish(editor);

  const panel = await readJson(`JSON.stringify((() => {
    const rows = [...document.querySelectorAll('[data-identifier]')].map((e) => e.getAttribute('data-identifier'));
    return { rows: rows.length, hasFontSize: rows.includes('fontSize') };
  })())`);
  record(
    '🔴 REACH — the property panel rendered, with a Font Size row on it',
    panel.rows > 0 && panel.hasFontSize,
    `${panel.rows} rows, fontSize=${panel.hasFontSize}`
  );
  if (!panel.hasFontSize) return finish(editor);

  // ── THE NUMBER (a): the Font Size row offers the typography scale ─────────
  const fontButton = await readJson(HIT('[data-test="token-button-fontSize"]'));
  record(
    `🔴 THE NUMBER (a) — the Font Size row draws a token button [arm: ${ARM}]`,
    ARM === 'control' ? fontButton.found === false : fontButton.found === true && fontButton.hit === true,
    JSON.stringify(fontButton)
  );

  let fontOffer = { open: false, rows: 0, headings: [], tokens: [] };
  if (fontButton.found && fontButton.hit) {
    await dispatchClick(editor, { x: fontButton.x, y: fontButton.y });
    await wait(900);
    fontOffer = await readJson(READ_POPOUT);
  }
  record(
    `🔴 THE NUMBER (b) — font sizes offered on a driven session [arm: ${ARM}]`,
    ARM === 'control' ? fontOffer.rows === 0 : fontOffer.rows > 0,
    `${fontOffer.rows} rows under ${JSON.stringify(fontOffer.headings)}; first values ${JSON.stringify(fontOffer.values || [])}`
  );

  record(
    '🔴 AC3 — the Font Size list is font sizes ONLY, never the spacing ramp',
    ARM === 'control'
      ? fontOffer.rows === 0
      : fontOffer.rows > 0 && fontOffer.tokens.every((t) => /^--(text|display)-/.test(t)),
    ARM === 'control' ? 'not offered in this arm' : `${fontOffer.tokens.slice(0, 5).join(', ')}…`
  );

  // ── the consequence: what gets STORED ─────────────────────────────────────
  let stored = { before: null, after: null };
  if (fontOffer.rows > 0) {
    const row = await readJson(HIT('[data-test="token-field-picker"] [data-token="--text-xl"]'));
    if (row.found && row.hit) {
      stored.before = await ev(`(() => JSON.stringify(window.__hltNode.parameters.fontSize ?? null))()`);
      await dispatchClick(editor, { x: row.x, y: row.y });
      await wait(900);
      stored.after = await ev(`(() => JSON.stringify(window.__hltNode.parameters.fontSize ?? null))()`);
    } else {
      stored.after = `ROW NOT REACHABLE: ${JSON.stringify(row)}`;
    }
  }
  record(
    `🔴 THE CONSEQUENCE — picking a row stores \`var(--text-xl)\` on the node [arm: ${ARM}]`,
    ARM === 'control' ? stored.after === null : String(stored.after) === '"var(--text-xl)"',
    `${stored.before} → ${stored.after}`
  );

  await ev(CLOSE_POPUPS);
  await wait(400);

  // ── the trades this fix can CAUSE (HLT-001's rule) ───────────────────────
  //
  // 🔴 **Read here, while the TEXT node is still selected.** The first run took them after the
  // padding selection and got `NO FONT SIZE FIELD` — the panel had moved on to a Page, whose 7
  // rows contain neither the field whose drag is being graded nor the opacity/rotation rows AC3
  // is about. A trade arm pointed at the wrong surface reports a clean absence
  // ([[a-post-drive-control-reads-the-state-the-drive-leaves]]).

  // (c) AC3's other half: a row with no scale draws NO button, in EITHER arm. This is the arm that
  // proves the instrument can read an absence — it is false in both builds for the same reason.
  const noScale = await readJson(`JSON.stringify((() => {
    const rows = [...document.querySelectorAll('[data-identifier]')].map((e) => e.getAttribute('data-identifier'));
    const withButton = [...document.querySelectorAll('[data-test^="token-button-"]')]
      .map((b) => b.getAttribute('data-test').replace('token-button-', ''));
    const offered = ['fontSize', 'lineHeight', 'letterSpacing', 'borderRadius'].filter((n) => withButton.includes(n));
    const refused = ['opacity', 'transformRotation', 'transformX', 'zIndex'].filter((n) => rows.includes(n) && withButton.includes(n));
    return { present: rows.length, buttons: withButton.length, offered, refused };
  })())`);
  record(
    `🔴 AC3 — no button on a row with no scale (opacity, rotation, z-index) [arm: ${ARM}]`,
    noScale.refused.length === 0,
    `${noScale.buttons} buttons on ${noScale.present} rows; offered=${JSON.stringify(noScale.offered)}, wrongly-offered=${JSON.stringify(noScale.refused)}`
  );

  // (b) §6's landmine: the field holding the token must not be draggable.
  const scrubbable = await readJson(`JSON.stringify((() => {
    const el = document.querySelector('[data-identifier="fontSize"]');
    if (!el) return { error: 'NO FONT SIZE FIELD' };
    const cls = String(el.className || '');
    return { value: el.value, scrubbable: /scrub/i.test(cls), className: cls.slice(0, 120) };
  })())`);
  record(
    `⚠️ THE TRADE — a field holding a token is not draggable [arm: ${ARM}]`,
    ARM === 'control' ? true : scrubbable.scrubbable === false,
    JSON.stringify(scrubbable)
  );

  // (a) the button must not take a press meant for the value.
  // ⚠️ The async function returns the JSON — `await` outside one is a `ReferenceError` in a
  // `Runtime.evaluate` expression, and `evaluate` already waits on a returned promise.
  const typed = await readJson(`(async () => {
    const el = document.querySelector('[data-identifier="fontSize"]');
    if (!el) return JSON.stringify({ error: 'NO FONT SIZE FIELD' });
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    el.focus();
    setter.call(el, '42');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    el.blur();
    await new Promise((r) => setTimeout(r, 600));
    return JSON.stringify({ stored: JSON.stringify(window.__hltNode.parameters.fontSize ?? null) });
  })()`);
  record(
    `⚠️ THE TRADE — a typed number still commits with the button beside it [arm: ${ARM}]`,
    typed.stored === '{"value":42,"unit":"px"}' || typed.stored === '42',
    JSON.stringify(typed)
  );

  if (ARM === 'fixed') await shotPass(editor, ev, readJson, '[data-test="token-button-fontSize"]', 'fontsize');

  // ── THE NUMBER (c): the padding box, where most of the tokens live ────────
  const boxNode = await selectNodeWith('paddingTop');
  record(
    '🔴 REACH — a node with a padding BOX is selected',
    boxNode.selected === true,
    JSON.stringify(boxNode)
  );
  if (!boxNode.selected) return finish(editor);

  const padButton = await readJson(HIT('[data-test="token-button-padding-vertical"]'));
  record(
    `🔴 THE NUMBER (c) — the padding box's ↕ field draws a token button [arm: ${ARM}]`,
    ARM === 'control' ? padButton.found === false : padButton.found === true && padButton.hit === true,
    JSON.stringify(padButton)
  );

  let padOffer = { rows: 0, headings: [], tokens: [] };
  let padStored = null;
  if (padButton.found && padButton.hit) {
    await dispatchClick(editor, { x: padButton.x, y: padButton.y });
    await wait(900);
    padOffer = await readJson(READ_POPOUT);

    const row = await readJson(HIT('[data-test="token-field-picker"] [data-token="--space-5"]'));
    if (row.found && row.hit) {
      await dispatchClick(editor, { x: row.x, y: row.y });
      await wait(900);
      padStored = await readJson(
        `JSON.stringify({ top: window.__hltNode.parameters.paddingTop ?? null, bottom: window.__hltNode.parameters.paddingBottom ?? null })`
      );
    }
  }
  record(
    `🔴 THE NUMBER (d) — spacing tokens offered on the padding box [arm: ${ARM}]`,
    ARM === 'control' ? padOffer.rows === 0 : padOffer.rows > 0 && padOffer.tokens.every((t) => t.startsWith('--space')),
    `${padOffer.rows} rows under ${JSON.stringify(padOffer.headings)}`
  );
  record(
    `🔴 THE CONSEQUENCE — a \`↕\` pick writes BOTH sides, as typing in that field does [arm: ${ARM}]`,
    ARM === 'control'
      ? padStored === null
      : Boolean(padStored) && padStored.top === 'var(--space-5)' && padStored.bottom === 'var(--space-5)',
    JSON.stringify(padStored)
  );

  await ev(CLOSE_POPUPS);
  await wait(400);

  if (ARM === 'fixed') await shotPass(editor, ev, readJson, '[data-test="token-button-padding-vertical"]', 'padding');

  return finish(editor, { fontOffer, padOffer, stored, padStored, noScale });
}

function finish(editor, extra) {
  const graded = arms.filter((a) => a.ok !== null);
  const failed = graded.filter((a) => !a.ok);
  console.log(`\n${failed.length === 0 ? '✓' : '✗'} ${graded.length - failed.length}/${graded.length} arms passed [arm: ${ARM}]`);

  if (JSON_OUT) {
    fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
    fs.writeFileSync(
      JSON_OUT,
      JSON.stringify({ arm: ARM, at: new Date().toISOString(), project: PROJECT_DIR, arms, ...extra }, null, 2)
    );
    console.log(`  wrote ${JSON_OUT}`);
  }

  if (editor && editor.close) editor.close();
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e) => {
  record('the drive itself completed', false, e.message);
  finish(null);
});
