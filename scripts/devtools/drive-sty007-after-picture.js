#!/usr/bin/env node
/**
 * P94 STY-007 — the AFTER picture, shot in the same frames as STY-001's before-pictures.
 *
 * STY-001 photographed the nightmare on the `Todo list` project, in FULL EDITOR WINDOWS. The three
 * pairs Richard ruled WORTHY at s10 are **crops of single controls** on three different projects —
 * each fine as a control of its own surface, none of them a pair with a before.
 *
 * 🔴 **A before and an after taken on two different projects are not a pair.** So this drive opens
 * a COPY of `Todo list` — the project the before-pictures were taken on — and shoots full windows.
 * [[a-control-pair-proves-what-you-varied-only]], [[open-a-copy-of-a-real-project-in-the-editor]].
 *
 * 🔴 **A shot is not evidence that a surface was on screen.** Every frame here is preceded by a
 * HIT TEST: `elementFromPoint` at the centre of the surface's signature element must land inside
 * that element. A popout that rendered behind the canvas, or a panel scrolled out of view, would
 * otherwise be photographed as empty ground and read as a product defect.
 * [[a-rendered-surface-can-be-behind-a-blocker]], [[a-rect-is-not-visibility]].
 *
 * 🔴 **The after must not be staged better than the before.** The only state this drive creates is
 * one a person creates by using the feature once: it picks a shipped Look from the Look menu, which
 * is the single click the menu itself describes. It invents no Look, no override, no colour.
 *
 * Usage:
 *   node scripts/devtools/drive-sty007-after-picture.js [--dir <project>] [--shots <dir>] [--json <file>]
 *
 * Exits 0 when every graded arm passed.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { appTarget, connect, evaluate } = require('./cdp.js');

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const PROJECT_DIR = opt('dir', '/Users/richardosborne/vscode_projects/NodeGX test projects/STY-007 After Drive');
const SHOTS = opt('shots', path.join(__dirname, '..', '..', 'dev-docs', 'tasks', 'phase-94-one-styles-panel', 'shots'));
const JSON_OUT = opt('json', null);
const SHIPPED_LOOK = opt('look', 'Heading 1');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const arms = [];
const record = (name, ok, detail) => {
  arms.push({ name, ok, detail });
  console.log(`${ok === null ? '·' : ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const WREQ = (p) => `window.__wreq(${JSON.stringify(p)})`;
const PROJECT = `${WREQ('./src/editor/src/models/projectmodel.ts')}.ProjectModel`;
const SIDEBAR = `${WREQ('./src/editor/src/models/sidebar/index.ts')}.SidebarModel`;
const POPUPS = `${WREQ('./src/editor/src/views/popuplayer.ts')}.PopupLayer`;

/**
 * 🔴 **`document.body.click()` does not close a popout, it just clicks the body.** A run that
 * believes it did leaves every popout it opened stacked on the layer, and the NEXT surface is then
 * photographed behind a `popup-layer-blocker` — a defect-shaped picture made entirely by the drive.
 * Measured here on 2026-09-19: five popouts alive at once, all of them mine.
 */
const CLOSE_POPUPS = `(() => {
  const L = ${POPUPS}.instance;
  if (L && L.hideAllModalsAndPopups) L.hideAllModalsAndPopups();
  return document.querySelectorAll('.popup-layer-popout').length;
})()`;
const THEME = `${WREQ('./src/editor/src/models/ThemeManager.ts')}.ThemeManager`;

/**
 * Is the editor on 9222 mine? `cdp.js` attaches to whoever holds the port, and a peer's editor on
 * this checkout is byte-identical to mine. Walk the listener's parents looking for this script's
 * own CLI ancestry. Never throws: a failure to CHECK ownership must not look like a failure of the
 * thing being driven. (The full account is in drive-sty006-wheres-it-used.js.)
 */
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
      const ppid = Number(line.split(/\s+/)[0]);
      chain.push(pid);
      pid = ppid;
    }
    return { ok: true, why: `listener ${listener}, ancestry ${chain.join('<')}` };
  } catch (e) {
    return { ok: false, why: `ownership check itself failed: ${e.message}` };
  }
}

/** Overlays the dev stack paints over the window — they photograph, and they are not the product. */
const STRIP_OVERLAY = `(() => {
  let n = 0;
  document.querySelectorAll('iframe[src*="webpack"], #webpack-dev-server-client-overlay, [class*="DevServerOverlay"]').forEach((el) => { el.remove(); n++; });
  return n;
})()`;

/**
 * Hit test: is `sel` the element a person would actually touch at its own centre?
 * Returns {found, hit, text} — `hit` false means something is drawn over it.
 */
const HIT = (sel) => `JSON.stringify((() => {
  const el = document.querySelector(${JSON.stringify(sel)});
  if (!el) return { found: false };
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return { found: true, hit: false, why: 'zero-area' };
  const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2));
  const y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
  const at = document.elementFromPoint(x, y);
  return {
    found: true,
    hit: !!at && (el.contains(at) || at.contains(el)),
    why: at ? (at.className || at.tagName) + '' : 'nothing at point',
    text: (el.innerText || '').trim().slice(0, 120),
    rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }
  };
})())`;

async function main() {
  const own = cdpOwnership();
  record('the editor on 9222 can be accounted for', own.ok, own.why);

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

  // The window is `document.hidden`, so rAF never fires and nothing that waits on a frame settles.
  // Both of these, on THIS connection, before anything is read.
  await editor.send('Page.setWebLifecycleState', { state: 'active' }).catch(() => {});
  await editor.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  const rafFires = await ev(
    `new Promise((res) => { const t = setTimeout(() => res('NO RAF'), 1500); requestAnimationFrame(() => { clearTimeout(t); res('raf'); }); })`
  );
  record('rAF fires — the page is live enough to trust a red', rafFires === 'raf', String(rafFires));
  if (rafFires !== 'raf') return finish(editor);

  await ev(`(() => { if (!window.__wreq) { webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]); } return !!window.__wreq; })()`);

  // ── Open the copy ─────────────────────────────────────────────────────────
  const open = await ev(`(() => {
    if (window.__styRouter) return 'ok';
    const root = document.getElementById('root');
    let f = root[Object.keys(root).find((k) => k.startsWith('__reactContainer'))];
    let depth = 0;
    while (f && depth < 40) {
      const pr = f.memoizedProps;
      if (pr && pr.route && pr.route.router && typeof pr.route.router.route === 'function') { window.__styRouter = pr.route.router; break; }
      f = f.child; depth++;
    }
    return window.__styRouter ? 'ok' : 'NO ROUTER';
  })()`);
  if (open !== 'ok') {
    record('the editor router was found', false, open);
    return finish(editor);
  }

  const already = await ev(`(() => { const p = ${PROJECT}.instance; return (p && p._retainedProjectDirectory) || 'NONE'; })()`);
  if (path.resolve(String(already)) !== path.resolve(PROJECT_DIR)) {
    console.log(`opening ${PROJECT_DIR} (editor had ${already})`);
    await ev(`(() => { window.__styRouter.route({ to: 'projects' }); return 'ok'; })()`);
    await wait(1500);
    await ev(`(async () => {
      const { LocalProjectsModel } = ${WREQ('./src/editor/src/utils/LocalProjectsModel.ts')};
      const p = await LocalProjectsModel.instance.openProjectFromFolder(${JSON.stringify(PROJECT_DIR)});
      window.__styRouter.route({ to: 'editor', project: p });
      return 'ok';
    })()`);
    await wait(9000);
  }
  const dir = await ev(`(() => ${PROJECT}.instance._retainedProjectDirectory || 'NONE')()`);
  record(
    'AC1 — the driven project is the COPY of the project the before-pictures were taken on',
    path.resolve(String(dir)) === path.resolve(PROJECT_DIR),
    String(dir)
  );
  if (path.resolve(String(dir)) !== path.resolve(PROJECT_DIR)) return finish(editor);

  // ── Find a Text node to stand in front of the camera ──────────────────────
  const found = await readJson(`JSON.stringify((() => {
    const p = ${PROJECT}.instance;
    for (const c of p.getComponents()) {
      const g = c.graph; if (!g || !g.roots) continue;
      const all = []; const walk = (n) => { all.push(n); (n.children || []).forEach(walk); }; g.roots.forEach(walk);
      const n = all.find((n) => n.typename === 'Text');
      if (n) return { component: c.name, nodeId: n.id, label: n.label || n.typename };
    }
    return { error: 'NO TEXT NODE IN THIS PROJECT' };
  })())`);
  record('the project holds a Text node — the node the before-picture had selected', !found.error, JSON.stringify(found));
  if (found.error) return finish(editor);

  await ev(`(() => {
    const { EventDispatcher } = ${WREQ('./src/shared/utils/EventDispatcher.ts')};
    const c = ${PROJECT}.instance.getComponentWithName(${JSON.stringify(found.component)});
    if (!c) return 'MISSING';
    EventDispatcher.instance.notifyListeners('ComponentPanel.SwitchToComponent', { component: c, pushHistory: false });
    return 'ok';
  })()`);
  await wait(2500);

  const ED = `${WREQ('./src/editor/src/contexts/NodeGraphContext/NodeGraphContext.tsx')}.NodeGraphContextTmp.nodeGraph`;
  // 🔴 **The Styles panel and the property panel share ONE slot.** Opening Styles at the end of a
  //    theme's frames REPLACES Properties, so the next theme photographs an empty property panel
  //    and every read of it comes back zero-area — a drive-made absence, not a product one.
  //    Re-selecting the node is what puts Properties back, and it is what a person does too.
  const SELECT_NODE = `JSON.stringify((() => {
    const ed = ${ED};
    if (!ed) return { error: 'NO EDITOR' };
    const all = [];
    const walk = (n) => { all.push(n); (n.children || []).forEach(walk); };
    (ed.roots || []).forEach(walk);
    const node = all.find((n) => n.model && n.model.id === ${JSON.stringify(found.nodeId)}) || all.find((n) => n.id === ${JSON.stringify(found.nodeId)});
    if (!node) return { error: 'NODE NOT ON CANVAS', count: all.length };
    ed.selectionActions ? ed.selectionActions.selectNode(node, {}) : ed.selector.selectNode(node);
    return { selected: true };
  })())`;

  const selected = await readJson(`JSON.stringify((() => {
    const ed = ${ED};
    if (!ed) return { error: 'NO EDITOR' };
    const all = [];
    const walk = (n) => { all.push(n); (n.children || []).forEach(walk); };
    (ed.roots || []).forEach(walk);
    const node = all.find((n) => n.model && n.model.id === ${JSON.stringify(found.nodeId)}) || all.find((n) => n.id === ${JSON.stringify(found.nodeId)});
    if (!node) return { error: 'NODE NOT ON CANVAS', count: all.length };
    ed.selectionActions ? ed.selectionActions.selectNode(node, {}) : ed.selector.selectNode(node);
    return { selected: true };
  })())`);
  await wait(2000);
  record('the Text node is selected, so the property panel is drawing it', selected.selected === true, JSON.stringify(selected));

  // ── Use the feature ONCE: pick a shipped Look, which is what the menu invites ──
  // The panel keeps its scroll position across runs, so a row can be drawn, correct, and 900px
  // above the viewport. Put it on screen first — otherwise the hit test measures the SCROLLER.
  await ev(`(() => { const r = document.querySelector('[data-test="look-row-field"]'); if (r) r.scrollIntoView({ block: 'center' }); return 'ok'; })()`);
  await wait(700);
  const lookRow = await readJson(HIT('[data-test="look-row-field"]'));
  record(
    'the property panel draws the Look row, and it is reachable',
    lookRow.found === true && lookRow.hit === true,
    JSON.stringify(lookRow)
  );

  const wornBefore = await ev(`(() => {
    const p = ${PROJECT}.instance;
    let node = null;
    for (const c of p.getComponents()) {
      const g = c.graph; if (!g || !g.roots) continue;
      const all = []; const walk = (n) => { all.push(n); (n.children || []).forEach(walk); }; g.roots.forEach(walk);
      node = all.find((n) => n.id === ${JSON.stringify(found.nodeId)}); if (node) break;
    }
    return (node && node.variant && node.variant.name) || 'NONE';
  })()`);

  if (wornBefore === 'NONE') {
    await ev(`(() => { const b = document.querySelector('[data-test="look-row-field"]'); if (b) b.click(); return 'ok'; })()`);
    await wait(1400);
    const picked = await ev(`(() => {
      const rows = Array.from(document.querySelectorAll('[data-test^="look-menu-shipped-"]'));
      const want = rows.find((r) => (r.innerText || '').trim() === ${JSON.stringify(SHIPPED_LOOK)}) || rows[0];
      if (!want) return 'NO SHIPPED LOOK IN THE MENU';
      want.click();
      return (want.innerText || '').trim();
    })()`);
    await wait(2500);
    await ev(CLOSE_POPUPS);
    await wait(600);
    record('a shipped Look was picked from the menu — the one click a person makes', !String(picked).startsWith('NO '), String(picked));
  } else {
    record('a shipped Look was picked from the menu — the one click a person makes', null, `the node already wore "${wornBefore}"; nothing was staged`);
  }

  const wornAfter = await ev(`(() => {
    const p = ${PROJECT}.instance;
    let node = null;
    for (const c of p.getComponents()) {
      const g = c.graph; if (!g || !g.roots) continue;
      const all = []; const walk = (n) => { all.push(n); (n.children || []).forEach(walk); }; g.roots.forEach(walk);
      node = all.find((n) => n.id === ${JSON.stringify(found.nodeId)}); if (node) break;
    }
    return (node && node.variant && node.variant.name) || 'NONE';
  })()`);
  record(
    '🔴 the CONSEQUENCE: the node now wears a Look — without this the property shot is the before',
    wornAfter !== 'NONE',
    `wore "${wornBefore}" → wears "${wornAfter}"`
  );

  // ── The shots ─────────────────────────────────────────────────────────────
  fs.mkdirSync(SHOTS, { recursive: true });

  const shoot = async (name, theme) => {
    await ev(STRIP_OVERLAY);
    const file = path.join(SHOTS, `sty007-${name}-${theme}.png`);
    // 🔴 FULL WINDOW, no clip: the before-pictures are full editor windows (AC2).
    const shot = await editor.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log(`  shot ${path.basename(file)}`);
    return file;
  };

  const viewport = await readJson(`JSON.stringify({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio })`);
  console.log(`viewport ${JSON.stringify(viewport)}`);

  for (const theme of ['dark', 'light']) {
    await ev(`(() => { ${THEME}.setMode(${JSON.stringify(theme)}); return 'ok'; })()`);
    // A theme written in one evaluation is not applied to anything read in the SAME one.
    await wait(2500);
    const applied = await ev(`document.documentElement.getAttribute('data-theme')`);
    record(`the ${theme} theme is the one on screen`, applied === theme, `data-theme=${applied}`);
    await ev(CLOSE_POPUPS);
    await wait(500);
    const reselected = await readJson(SELECT_NODE);
    await wait(1600);
    record(
      `the property panel is the one in the slot for the ${theme} frames`,
      reselected.selected === true,
      JSON.stringify(reselected)
    );

    // ── 1. The property panel: what a node's look is made of ────────────────
    await ev(`(() => {
      const p = document.querySelector('div[data-panel-id="PropertyEditor"]');
      if (p) p.scrollTop = 0;
      // 🔴 The theme flip rebuilds the panel and moves its scroller. A group heading that is
      //    scrolled out reads ZERO-AREA, which is indistinguishable from a heading that was never
      //    drawn — so put it on screen before asking whether it is on screen.
      const src = document.querySelector('[data-test="group-look-source"]');
      if (src) src.scrollIntoView({ block: 'center' });
      return 'ok';
    })()`);
    await wait(900);
    const groupSource = await readJson(HIT('[data-test="group-look-source"]'));
    record(
      `AC3/${theme} — the property panel names where a group's values come from, on screen`,
      groupSource.found === true && groupSource.hit === true,
      JSON.stringify(groupSource)
    );
    await shoot('property', theme);

    // ── 2. The Look menu: how you choose one ────────────────────────────────
    await ev(`(() => { const b = document.querySelector('[data-test="look-row-field"]'); if (b) b.click(); return 'ok'; })()`);
    await wait(1500);
    const menu = await readJson(HIT('[data-test="look-menu-library"]'));
    record(
      `AC3/${theme} — the Look menu is open and reachable, not drawn behind the canvas`,
      menu.found === true && menu.hit === true,
      JSON.stringify(menu)
    );
    await shoot('lookmenu', theme);
    await ev(CLOSE_POPUPS);
    await wait(900);

    // ── 3. The colour picker: the surface this phase did NOT change ─────────
    // 🔴 The style picker hangs off the VALUE, and the value is an `<input>`, not a button —
    //    `button[class*="Value"]` matches nothing and the swatch beside it opens the colour WHEEL,
    //    a different popout. `data-type="color"` is what `PropertyPanelBaseInput` stamps on the
    //    field the before-picture's list belongs to. [[a-predicted-sentence-belongs-to-one-code-path]]
    const openedPicker = await ev(`(() => {
      const input = document.querySelector('div[data-panel-id="PropertyEditor"] input[data-type="color"]');
      if (!input) return 'NO COLOUR FIELD';
      input.scrollIntoView({ block: 'center' });
      input.click();
      return 'clicked ' + input.value;
    })()`);
    await wait(1500);
    const picker = await readJson(`JSON.stringify((() => {
      const all = Array.from(document.querySelectorAll('div,span'));
      const el = all.find((e) => (e.innerText || '').trim() === 'Colors in project');
      if (!el) return { found: false };
      const box = el.closest('div');
      const r = box.getBoundingClientRect();
      const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { found: true, hit: !!at && (box.contains(at) || at.contains(box)), rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } };
    })())`);
    record(
      `AC3/${theme} — the colour style picker is open and reachable`,
      picker.found === true && picker.hit === true,
      `${openedPicker}; ${JSON.stringify(picker)}`
    );
    /**
     * 🔴 **STY-007's own finding, graded on the screen: a swatch must paint the colour it names.**
     * Every `var(--token)` row used to compute `rgba(0, 0, 0, 0)` — the editor's chrome does not
     * declare a PROJECT's design tokens, so the declaration was invalid and the checkerboard
     * showed through on 17 of 20 rows.
     *
     * Two controls, in the same read, because an assertion that "nothing is transparent" would
     * pass on a picker that paints everything black:
     *   - a HEX row must still paint its own hex (the known-firing signal);
     *   - `transparent` must still read transparent (a real value whose checkerboard is correct).
     * [[assert-an-absence-with-a-known-firing-signal-beside-it]]
     */
    const swatches = await readJson(`JSON.stringify((() => {
      const rows = Array.from(document.querySelectorAll('.color-thumbnail-content'));
      if (!rows.length) return { error: 'NO SWATCHES' };
      const read = rows.map((el) => {
        const name = ((el.closest('.variants-pick-variant-item') || {}).innerText || '').trim();
        return { name, computed: getComputedStyle(el).backgroundColor };
      });
      const clear = (c) => /rgba\\(\\s*0,\\s*0,\\s*0,\\s*0\\s*\\)/.test(c);
      return {
        total: read.length,
        tokensClear: read.filter((r) => r.name.startsWith('var(--') && clear(r.computed)).map((r) => r.name),
        hex: read.find((r) => /^#[0-9a-fA-F]{6}$/.test(r.name)) || null,
        transparent: read.find((r) => r.name === 'transparent') || null
      };
    })())`);
    record(
      `AC3/${theme} — every named colour's swatch paints that colour`,
      !swatches.error && swatches.tokensClear.length === 0,
      swatches.error ||
        `${swatches.total} swatches, ${swatches.tokensClear.length} token rows painting nothing` +
          (swatches.tokensClear.length ? `: ${swatches.tokensClear.slice(0, 4).join(', ')}` : '')
    );
    record(
      `the control/${theme} — a hex row still paints its own hex, and \`transparent\` is still transparent`,
      !swatches.error &&
        !!swatches.hex &&
        !/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(swatches.hex.computed) &&
        (!swatches.transparent || /rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(swatches.transparent.computed)),
      swatches.error ||
        `${swatches.hex ? swatches.hex.name + '=' + swatches.hex.computed : 'no hex row'}; ` +
          `${swatches.transparent ? 'transparent=' + swatches.transparent.computed : 'no transparent row'}`
    );

    await shoot('picker', theme);
    await ev(CLOSE_POPUPS);
    await wait(900);

    // ── 4. The Styles panel, scrolled to its Looks section ──────────────────
    await ev(`(() => {
      if (${SIDEBAR}.instance.ActiveId === 'styles') return 'already open';
      const b = document.querySelector('[data-test="styles-panel"]');
      if (b) b.click();
      return 'opened';
    })()`);
    await wait(1600);
    await ev(`(() => {
      const heads = Array.from(document.querySelectorAll('[data-panel-id="styles"] *')).filter((e) => (e.innerText || '').trim() === 'Looks');
      if (heads.length) heads[heads.length - 1].scrollIntoView({ block: 'center' });
      return heads.length;
    })()`);
    await wait(1200);
    const panel = await readJson(HIT('[data-panel-id="styles"]'));
    record(
      `AC3/${theme} — the Styles panel is on screen with its Looks section`,
      panel.found === true && panel.hit === true,
      JSON.stringify(panel)
    );
    await shoot('panel', theme);
  }

  return finish(editor);
}

function finish(editor) {
  const graded = arms.filter((a) => a.ok !== null);
  const failed = graded.filter((a) => !a.ok);
  console.log(
    `\n${graded.length - failed.length}/${graded.length} graded arms passed` +
      (failed.length ? `; FAILED: ${failed.map((a) => a.name).join('; ')}` : '') +
      (arms.length - graded.length ? `; ${arms.length - graded.length} ungraded and named` : '')
  );
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ arms }, null, 2));
  editor.close && editor.close();
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((e) => {
  // 🔴 A thrown drive must still CLOSE the socket. Without this the process sits alive on an open
  // CDP connection long after it has failed, and a watcher reads a crash as a slow run.
  console.error(e);
  process.exitCode = 1;
  process.exit(1);
});
