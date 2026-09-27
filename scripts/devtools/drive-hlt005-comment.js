#!/usr/bin/env node
/**
 * P99 HLT-005 — the node comment wraps inside the panel instead of widening it.
 *
 * Grades the person sentence on a driven editor: put a line longer than the panel is wide into a
 * node's comment, open the Comment tab, and ask the SCROLLPORT whether it can be scrolled
 * sideways. The number is `scrollLeft` — 0 when the bar is inside its port, non-zero when it is
 * not — measured at the panel's **minimum** docked width and at its **maximum**, in both themes.
 *
 * 🔴 **A rect is not the reading.** `getBoundingClientRect().width` on the bar is one half; an
 * element that overflows its container still reports a perfectly healthy rect, and the container
 * is where the damage is. So every arm takes BOTH: the bar's rect against the port's
 * `clientWidth`, and the port's own `scrollWidth`/reachable `scrollLeft`
 * ([[a-rect-is-not-visibility]]).
 *
 * 🔴 **Count what the fix can CAUSE, not only what it cures** ([[a-drive-that-counts-only-the-cured-error-cannot-see-a-trade]]).
 * Two trades are available here and both are graded on every fixed run:
 *   (a) the **vertical** behaviour — the hidden mirror is what gives the field its height, so a
 *       width fix that breaks the mirror's measurement trades one defect for another. Growth must
 *       still happen and must still stop at 184px (AC3).
 *   (b) an **unbreakable run** — `min-width: 0` is what lets a flex item come back inside its
 *       scrollport, and without it a 200-character word with no spaces re-widens the panel. The
 *       automatic minimum size is precisely the trap FB-017 (b) documents, so it is measured, not
 *       assumed.
 *
 * 🔴 **The control is the product as it shipped.** `--arm control` injects
 * `.property-comment-bar { flex: 0 0 auto !important }`, which is the declaration that was on the
 * element at HEAD `b684a81cd`, and — unlike a patched module — it survives the panel remounting
 * between two panel widths. A pair is the evidence, never either reading
 * ([[assert-an-absence-with-a-known-firing-signal-beside-it]]).
 *
 * ⚠️ **Unarm first and grade the unarming.** The injected rule lives in the RENDERER and outlives
 * this node process, so a fixed run started after a control run would read the control's overflow
 * and call the fix broken ([[an-instrument-must-be-armed-before-it-measures]]).
 *
 * Usage:
 *   node scripts/devtools/drive-hlt005-comment.js --dir <project copy> [--arm fixed|control]
 *                                                 [--shots <dir>] [--json <file>]
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

const PROJECT_DIR = opt('dir', null);
const ARM = opt('arm', 'fixed'); // 'fixed' | 'control'
const SHOTS = opt('shots', path.join(__dirname, '..', '..', 'dev-docs', 'tasks', 'phase-99-the-ones-nobody-owned', 'shots'));
const JSON_OUT = opt('json', null);

if (!PROJECT_DIR) {
  console.error('--dir <project directory> is required: drive a COPY, opening one writes three files into it');
  process.exit(2);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const arms = [];
const record = (name, ok, detail) => {
  arms.push({ name, ok, detail });
  console.log(`${ok === null ? '·' : ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const WREQ = (p) => `window.__wreq(${JSON.stringify(p)})`;
const PROJECT = `${WREQ('./src/editor/src/models/projectmodel.ts')}.ProjectModel`;
const DISPATCH = `${WREQ('./src/shared/utils/EventDispatcher.ts')}.EventDispatcher`;
const ED = `${WREQ('./src/editor/src/contexts/NodeGraphContext/NodeGraphContext.tsx')}.NodeGraphContextTmp.nodeGraph`;
const THEME = `${WREQ('./src/editor/src/models/ThemeManager.ts')}.ThemeManager`;

/**
 * The fixture: one line, no newline, longer than the panel is wide AT ITS WIDEST. Still an
 * ordinary note somebody would type — a paragraph about why a node is the way it is — not a
 * pathological string.
 *
 * ⚠️ **It had to be lengthened, and the first version printed a verdict before it was.** At 139
 * characters the line renders 796px, which fits inside the 980px scrollport the panel has at its
 * maximum docked width — so the control arm at `max` read "does not overflow" and was scored a
 * FAILURE TO FIRE. It was neither: the defect is a function of the content against the panel,
 * and a fixture that fits proves nothing in either direction. The criterion says min AND max, so
 * the fixture has to beat the max.
 */
const LONG_LINE =
  'This node is ordered by the timeline rather than by the list, because the list is rebuilt on every fetch and the order has to survive that, which is the kind of rule the graph cannot state for itself and the next person to touch this component will otherwise undo.';
/** Two lines: the vertical control's lower reading. */
const TWO_LINES = 'The first line of the note.\nThe second line of the note.';
/** Thirty lines: the vertical control's upper reading, well past the ten the cap allows. */
const MANY_LINES = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`).join('\n');
/** No spaces anywhere. Grades the automatic minimum size, which `overflow-wrap` does not relieve. */
const UNBREAKABLE = 'x'.repeat(200);

/** The panel's own clamps, from `useSidePanelLayout.tsx`. Not guessed — read from the source. */
const RAIL_WIDTH = 52;
const MIN_PANEL_WIDTH = 240;
const MIN_CANVAS_WIDTH = 320;

/** The `184px` cap, from `propertyeditor.css` — 10 lines × 17 + 12 padding + 2 border. */
const SIZER_MAX_HEIGHT = 184;

const STRIP_OVERLAY = `(() => {
  let n = 0;
  document.querySelectorAll('iframe[src*="webpack"], #webpack-dev-server-client-overlay, [class*="DevServerOverlay"]').forEach((el) => { el.remove(); n++; });
  return n;
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
 * The reading, taken in the page.
 *
 * 🔴 Both instruments, every time. `barWidth` is the element; `maxScrollLeft` and
 * `portScrollWidth` are the container — and the container is what a person sees go wrong.
 */
const MEASURE = `JSON.stringify((() => {
  const bar = document.querySelector('.property-comment-bar');
  if (!bar) return { error: 'NO COMMENT BAR' };
  const container = bar.parentElement;
  const port = container && container.parentElement;
  if (!port) return { error: 'NO SCROLLPORT' };
  const sizer = bar.querySelector('.property-comment-sizer');
  const input = bar.querySelector('.property-comment-input');
  const cs = getComputedStyle(bar);

  // Ask the port to scroll and read how far it went, then put it back. A declaration that says
  // overflow-x is auto proves nothing; a port that MOVES is the defect.
  const before = port.scrollLeft;
  port.scrollLeft = 99999;
  const maxScrollLeft = port.scrollLeft;
  port.scrollLeft = before;

  const r = bar.getBoundingClientRect();
  const sr = sizer ? sizer.getBoundingClientRect() : null;
  const ir = input ? input.getBoundingClientRect() : null;
  return {
    barWidth: Math.round(r.width * 10) / 10,
    portClientWidth: port.clientWidth,
    portScrollWidth: port.scrollWidth,
    maxScrollLeft: Math.round(maxScrollLeft * 10) / 10,
    flex: cs.flex,
    flexShrink: cs.flexShrink,
    minWidth: cs.minWidth,
    sizerWidth: sr ? Math.round(sr.width * 10) / 10 : null,
    sizerHeight: sr ? Math.round(sr.height * 10) / 10 : null,
    inputWidth: ir ? Math.round(ir.width * 10) / 10 : null,
    inputHeight: ir ? Math.round(ir.height * 10) / 10 : null,
    commentChars: input ? (input.value || '').length : null
  };
})())`;

/**
 * Hit-test the field at two points, because the two answers mean different things.
 *
 * 🔴 The first run of this drive hit-tested the CENTRE and used it as the reach precondition. It
 * failed at HEAD — and it was right to: a 796px field inside a 378px panel has its own middle out
 * over the canvas, and `elementFromPoint` returned the preview webview. That is the DEFECT
 * reporting itself through the instrument, not the instrument failing
 * ([[a-rendered-surface-can-be-behind-a-blocker]] read the other way round).
 *
 * So: `nearLeft` is the precondition — the field is really on screen and really touchable — and
 * `centre` is an ACCEPTANCE reading: the middle of the field a person clicks into is inside the
 * panel. A drive that only took one of them would have had to choose between measuring nothing
 * and grading its own precondition red.
 */
const HIT = `JSON.stringify((() => {
  const el = document.querySelector('.property-comment-input');
  if (!el) return { found: false };
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return { found: true, nearLeft: false, centre: false, why: 'zero-area' };
  const at = (x, y) => document.elementFromPoint(
    Math.min(innerWidth - 1, Math.max(0, x)),
    Math.min(innerHeight - 1, Math.max(0, y))
  );
  const y = r.top + Math.min(8, r.height / 2);
  const left = at(r.left + 6, y);
  const mid = at(r.left + r.width / 2, y);
  return {
    found: true,
    nearLeft: left === el,
    centre: mid === el,
    why: 'left=' + (left ? String(left.className || left.tagName) : 'nothing') +
         ' centre=' + (mid ? String(mid.className || mid.tagName) : 'nothing')
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

  await editor.send('Page.setWebLifecycleState', { state: 'active' }).catch(() => {});
  await editor.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  const rafFires = await ev(
    `new Promise((res) => { const t = setTimeout(() => res('NO RAF'), 1500); requestAnimationFrame(() => { clearTimeout(t); res('raf'); }); })`
  );
  record('rAF fires — the page is live enough to trust a red', rafFires === 'raf', String(rafFires));
  if (rafFires !== 'raf') return finish(editor);

  await ev(`(() => { if (!window.__wreq) { webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]); } return !!window.__wreq; })()`);

  // ── Open the copy ─────────────────────────────────────────────────────────
  const routerOk = await ev(`(() => {
    if (window.__hltRouter) return 'ok';
    const root = document.getElementById('root');
    let f = root[Object.keys(root).find((k) => k.startsWith('__reactContainer'))];
    let depth = 0;
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
    await wait(10000);
  }

  const dir = await ev(`(() => ${PROJECT}.instance._retainedProjectDirectory || 'NONE')()`);
  record(
    'the driven project is the COPY this run was pointed at',
    path.resolve(String(dir)) === path.resolve(PROJECT_DIR),
    String(dir)
  );
  if (path.resolve(String(dir)) !== path.resolve(PROJECT_DIR)) return finish(editor);

  // ── 🔴 Unarm ANY control left in this renderer by an earlier run ──────────
  const unarmed = await ev(`(() => {
    const el = document.getElementById('hlt005-control');
    if (el) el.remove();
    return document.getElementById('hlt005-control') ? 'STILL ARMED' : (el ? 'removed' : 'never armed');
  })()`);
  record('the renderer carries no control left over from an earlier run', unarmed !== 'STILL ARMED', unarmed);

  // ── Put a long single line into a node's comment and select that node ─────
  const setComment = async (text) =>
    readJson(`JSON.stringify((() => {
      const p = ${PROJECT}.instance;
      for (const c of p.getComponents()) {
        const g = c.graph; if (!g || !g.roots || !g.roots.length) continue;
        const all = []; const walk = (n) => { all.push(n); (n.children || []).forEach(walk); }; g.roots.forEach(walk);
        if (!all.length) continue;
        const n = all[0];
        n.setComment(${JSON.stringify('%TEXT%')}.replace(/%NL%/g, String.fromCharCode(10)), { undo: false });
        ${DISPATCH}.instance.notifyListeners('ComponentPanel.SwitchToComponent', { component: c, pushHistory: false });
        window.__hltNodeId = n.id;
        return { component: c.name, nodeId: n.id, typename: n.typename, chars: (n.getComment() || '').length };
      }
      return { error: 'NO NODE IN THIS PROJECT' };
    })())`.replace('%TEXT%', text.replace(/\n/g, '%NL%')));

  const fixture = await setComment(LONG_LINE);
  record(
    'a node in the copy carries a single line longer than any docked panel',
    !fixture.error && fixture.chars === LONG_LINE.length,
    JSON.stringify(fixture)
  );
  if (fixture.error) return finish(editor);
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
  record('the commented node is the selected one', sel.selected === true, JSON.stringify(sel));
  if (!sel.selected) return finish(editor);
  await wait(2000);

  // ── Arm the control, if this is the firing run ────────────────────────────
  // 🔴 A stylesheet, not a patched module. The panel REMOUNTS between the two panel widths below
  // (the tab content is not kept alive), so anything written onto the element itself is gone by
  // the second reading and the control would silently stop firing half way through the run.
  if (ARM === 'control') {
    const armed = await ev(`(() => {
      let el = document.getElementById('hlt005-control');
      if (!el) {
        el = document.createElement('style');
        el.id = 'hlt005-control';
        document.head.appendChild(el);
      }
      el.textContent = '.property-comment-bar { flex: 0 0 auto !important; }';
      const bar = document.querySelector('.property-comment-bar');
      return bar ? getComputedStyle(bar).flexShrink : 'NO BAR';
    })()`);
    record(
      '🔴 CONTROL armed — proven by READING the computed style off the element, not by inserting a rule',
      armed === '0',
      `flex-shrink computes to ${armed}`
    );
    if (armed !== '0') return finish(editor);
  }

  const openCommentTab = async () => {
    const clicked = await ev(`(() => {
      const btn = [...document.querySelectorAll('.property-editor-tabs [class*="Tabs-module__Button"]')]
        .find((b) => (b.innerText || '').trim() === 'Comment');
      if (!btn) return 'NO COMMENT TAB';
      if (btn.className.includes('is-active')) return 'already';
      btn.click();
      return 'clicked';
    })()`);
    await wait(1200);
    return clicked;
  };

  // ── The divider's own gesture, so the panel width goes through the real clamp ──
  const viewportWidth = await ev(`window.innerWidth`);
  const maxPanelWidth = Math.max(MIN_PANEL_WIDTH, viewportWidth - RAIL_WIDTH - MIN_CANVAS_WIDTH);

  const dragPanelTo = async (panelWidth) => {
    const target = RAIL_WIDTH + panelWidth;
    const box = await readJson(`JSON.stringify((() => {
      const roots = [...document.querySelectorAll('[class*="FrameDivider-module__Root"]')];
      // The side-panel divider is the one whose first container holds the property editor.
      const root = roots.find((rt) => rt.querySelector('.property-editor-tabs, [class*="SidePanel-model__PanelItem"]'));
      if (!root) return { error: 'NO SIDE PANEL DIVIDER' };
      // 🔴 NOT \`root.querySelector\`. A FrameDivider renders its own Divider AFTER Container2,
      // and Container2 holds the canvas/preview FrameDivider — whose Divider is therefore the
      // first match in document order. The first run of this drive dragged that one: the canvas
      // split moved, the panel did not, and all four readings came back at the SAME 312px port
      // while the run reported "min" and "max". Take the DIRECT child.
      const d = [...root.children].find((c) => String(c.className).includes('FrameDivider-module__Divider'));
      if (!d) return { error: 'NO DIVIDER HANDLE' };
      const r = d.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + Math.min(200, r.height / 2) };
    })())`);
    if (box.error) return box;
    const mouse = (type, x, y, extra) =>
      editor.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1, buttons: 1, ...extra });
    await mouse('mousePressed', box.x, box.y);
    await wait(120);
    // Two moves: FrameDivider writes the CSS variables from the LAST mousemove it saw.
    await mouse('mouseMoved', (box.x + target) / 2, box.y);
    await wait(80);
    await mouse('mouseMoved', target, box.y);
    await wait(120);
    await mouse('mouseReleased', target, box.y, { buttons: 0 });
    await wait(1400);
    return { target };
  };

  const shoot = async (name) => {
    await ev(STRIP_OVERLAY);
    fs.mkdirSync(SHOTS, { recursive: true });
    const file = path.join(SHOTS, `hlt005-${name}.png`);
    const shot = await editor.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log(`  shot ${path.basename(file)}`);
    return file;
  };

  const readings = {};

  for (const theme of ['dark', 'light']) {
    await ev(`(() => { ${THEME}.setMode(${JSON.stringify(theme)}); return 'ok'; })()`);
    // A theme written in one evaluation is not applied to anything read in the SAME one.
    await wait(1600);
    const applied = await ev(`document.documentElement.getAttribute('data-theme')`);
    record(`the ${theme} theme is the one on screen`, applied === theme, `data-theme=${applied}`);

    for (const [label, width] of [['min', MIN_PANEL_WIDTH], ['max', maxPanelWidth]]) {
      const dragged = await dragPanelTo(width);
      if (dragged.error) {
        record(`the panel could be dragged to its ${label} width`, false, dragged.error);
        continue;
      }
      const tab = await openCommentTab();
      const m = await readJson(MEASURE);
      if (!m.error) readings[`${theme}-${label}`] = m;
      if (m.error) {
        record(`the comment bar is on screen (${theme}, ${label})`, false, m.error);
        continue;
      }

      // 🔴 REACH before COUNT. HLT-001's first drive read its 0 while selecting zero nodes.
      const hit = await readJson(HIT);
      record(
        `🔴 REACH (${theme}, ${label} ${width}px) — the comment field is on screen and touchable`,
        hit.found === true && hit.nearLeft === true,
        `${tab}; ${hit.why}`
      );
      // The port really did change width — otherwise "min" and "max" are one reading printed twice.
      record(
        `the panel really is at its ${label} width (${width}px asked for)`,
        Math.abs(m.portClientWidth - (width - 16)) <= 24,
        `scrollport clientWidth ${m.portClientWidth}`
      );

      console.log(
        `  ${theme}/${label}: bar ${m.barWidth} in port ${m.portClientWidth} (scrollWidth ${m.portScrollWidth}), maxScrollLeft ${m.maxScrollLeft}, flex ${m.flex}`
      );

      const inside = m.barWidth <= m.portClientWidth + 1;
      const noScroll = m.maxScrollLeft === 0;
      if (ARM === 'fixed') {
        record(
          `🔴 AC1 (${theme}, ${label}) — the bar is inside its scrollport`,
          inside,
          `${m.barWidth}px in ${m.portClientWidth}px`
        );
        record(
          `🔴 AC1 (${theme}, ${label}) — the panel cannot be scrolled sideways`,
          noScroll,
          `maxScrollLeft ${m.maxScrollLeft}, scrollWidth ${m.portScrollWidth} vs clientWidth ${m.portClientWidth}`
        );
        record(
          `AC1 (${theme}, ${label}) — the MIDDLE of the field is inside the panel, not over the canvas`,
          hit.centre === true,
          hit.why
        );
      } else {
        record(
          `🔴 CONTROL FIRES (${theme}, ${label}) — the shipped declaration overflows the port`,
          !inside && !noScroll,
          `${m.barWidth}px in ${m.portClientWidth}px, maxScrollLeft ${m.maxScrollLeft}`
        );
      }

      await shoot(`${ARM}-${theme}-${label}`);
    }
  }

  // ── AC3: the vertical control, in the same instrument ─────────────────────
  // A width fix that breaks the mirror's height measurement trades one defect for another, and a
  // run that never made a tall comment could not tell.
  await dragPanelTo(MIN_PANEL_WIDTH);
  await openCommentTab();

  await setComment(TWO_LINES);
  await wait(1200);
  const two = await readJson(MEASURE);
  await setComment(MANY_LINES);
  await wait(1200);
  const many = await readJson(MEASURE);
  record(
    '🔴 AC3 — vertical growth still HAPPENS: thirty lines is taller than two',
    !two.error && !many.error && many.sizerHeight > two.sizerHeight,
    `two lines ${two.sizerHeight}px → thirty lines ${many.sizerHeight}px`
  );
  record(
    `🔴 AC3 — and it still STOPS at ${SIZER_MAX_HEIGHT}px`,
    !many.error && Math.round(many.sizerHeight) === SIZER_MAX_HEIGHT,
    `thirty lines gives ${many.sizerHeight}px`
  );
  record(
    'AC3 — the textarea still matches the mirror it is positioned over',
    !many.error && Math.abs(many.inputHeight - many.sizerHeight) <= 1,
    `input ${many.inputHeight}px vs sizer ${many.sizerHeight}px`
  );

  // ── The second trade: an unbreakable run ──────────────────────────────────
  // `overflow-wrap: break-word` does NOT reduce an element's min-content width, so this is the
  // case that decides whether the automatic minimum size has actually been relieved.
  await setComment(UNBREAKABLE);
  await wait(1200);
  const unbroken = await readJson(MEASURE);
  if (ARM === 'fixed') {
    record(
      '🔴 TRADE — a 200-character word with no spaces still does not widen the panel',
      !unbroken.error && unbroken.barWidth <= unbroken.portClientWidth + 1 && unbroken.maxScrollLeft === 0,
      `bar ${unbroken.barWidth} in ${unbroken.portClientWidth}, maxScrollLeft ${unbroken.maxScrollLeft}, min-width ${unbroken.minWidth}`
    );
  } else {
    record(
      'CONTROL — the unbreakable run overflows too, as it did before the fix',
      !unbroken.error && unbroken.maxScrollLeft > 0,
      `maxScrollLeft ${unbroken.maxScrollLeft}`
    );
  }

  // Put the fixture back so the last frame is the one the verdict talks about.
  await setComment(LONG_LINE);
  await wait(1000);

  // ── THE NUMBER ────────────────────────────────────────────────────────────
  // 🔴 A zero has to come from four readings, not from the absence of any. An earlier run of this
  // drive crashed the panel at every cell, stored nothing, and still printed
  // "THE NUMBER ... ✓ dark-min=undefined" — because `Math.max(a, undefined || 0)` is 0 and a
  // missing measurement reads exactly like a clean one
  // ([[a-window-opened-after-the-event-attributes-nothing]]). The count of cells is asserted first.
  const CELLS = 4; // {dark,light} × {min,max}
  const numbers = Object.entries(readings).map(([k, v]) => `${k}=${v.maxScrollLeft}`);
  const complete =
    Object.keys(readings).length === CELLS && Object.values(readings).every((v) => typeof v.maxScrollLeft === 'number');
  record(
    `all ${CELLS} cells produced a reading — a zero from a blank panel is not a zero`,
    complete,
    `${Object.keys(readings).length} cells: ${numbers.join(' ') || '(none)'}`
  );
  const worst = Object.values(readings).reduce((a, v) => Math.max(a, v.maxScrollLeft || 0), 0);
  if (ARM === 'fixed') {
    record('THE NUMBER — reachable horizontal scroll on a driven session', complete && worst === 0, numbers.join(' '));
  } else {
    record('THE NUMBER — with the shipped declaration back', complete && worst > 0, numbers.join(' '));
  }

  await ev(`(() => { const el = document.getElementById('hlt005-control'); if (el) el.remove(); return 'unarmed'; })()`);
  return finish(editor);
}

function finish(editor) {
  const graded = arms.filter((a) => a.ok !== null);
  const failed = graded.filter((a) => !a.ok);
  console.log(
    `\n${graded.length - failed.length}/${graded.length} graded arms passed` +
      (failed.length ? `; FAILED: ${failed.map((a) => a.name).join('; ')}` : '')
  );
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ arm: ARM, arms }, null, 2));
  editor.close && editor.close();
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
  process.exit(1);
});
