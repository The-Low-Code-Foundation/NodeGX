#!/usr/bin/env node
/**
 * P94 STY-006 AC5 + AC7 — "where it's used", driven: open a list, then PRESS one and read the canvas.
 *
 * `tests-unit/sty-006` is 41 green assertions and not one of them has pressed anything. They grade
 * a walk over a fake project and a component rendered by `renderToStaticMarkup` — no effects, no
 * events, no jsdom. The whole task is a claim about what happens *after* a click, and that claim
 * lives entirely outside what this package's gates can reach.
 *
 * 🔴 **THE PRESS IS GRADED ON THE CONSEQUENCE, NEVER ON THE PRESS.** The failure this exists to
 * catch is an entry that is pressable, dispatches its handler, and lands nowhere — the canvas sits
 * where it was and the person concludes the panel lies. So every navigation arm reads the active
 * component and the selected node id BEFORE and AFTER. [[verify-the-consequence-not-just-the-mechanism]].
 *
 * 🔴 **AND THE `BEFORE` MUST NOT ALREADY BE THE ANSWER.** A drive that presses an entry pointing at
 * the component the canvas is already showing, with that node already selected, passes against a
 * completely dead handler. So the run navigates AWAY first, asserts it got away, and only then
 * presses. [[a-rule-reading-zero-in-both-arms-grades-nothing]].
 *
 * 🔴 **The surface is checked against the MODEL, not against itself.** What the list draws is
 * compared with `styleWearersIn` read through `__wreq` — a number that came from somewhere other
 * than the thing under test. [[a-second-walk-in-the-same-process-is-not-independent]] applies to
 * the walk, not to this: the point here is that the DOM and the model agree, and a panel that drew
 * a stale list from a previous render would disagree.
 *
 * Usage:
 *   node scripts/devtools/drive-sty006-wheres-it-used.js [--dir <project>] [--shots <dir>] [--json <file>]
 *
 * Exits 0 when every graded arm passed.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { appTarget, connect, evaluate } = require('./cdp.js');

/**
 * 🔴 **IS THE EDITOR ON 9222 MINE?**
 *
 * `cdp.js` attaches to whatever holds the port and nothing in the path asserts whose it is. That
 * cuts both ways and both ways have now cost real time on this checkout:
 *   - a stray Chrome on 9222 makes `cdp.js` drive CHROME while every instrument tells an
 *     editor-crash story (2026-08-13);
 *   - and on 2026-09-19 a PEER session's own `dev:debug` hit the **single-instance lock (exit
 *     144)**, so their `cdp.js` attached to MY Electron and they opened a different project in it
 *     mid-drive. Three runs of this script reported a stale bundle and a moved panel — all of them
 *     plausible product defects, none of them the product.
 *
 * So: find the process LISTENING on 9222 and walk its parents. If none of them is this script's
 * own CLI ancestry, say so loudly. Reading the window's URL or title cannot settle it — a peer's
 * editor on this checkout is byte-identical to mine.
 *
 * Returns a human-readable verdict; never throws, because a failure to *check* ownership must not
 * look like a failure of the thing being driven.
 */
function cdpOwnership(port = 9222) {
  try {
    const listener = execSync(`lsof -ti :${port} -sTCP:LISTEN 2>/dev/null || true`, { encoding: 'utf8' })
      .trim()
      .split(/\s+/)
      .filter(Boolean)[0];
    if (!listener) return { ok: null, detail: `nothing is LISTENING on ${port}` };

    // Everyone in my own ancestry, so "mine" means "shares an ancestor with this script".
    const mine = new Set();
    for (let pid = process.pid; pid && pid !== 1 && mine.size < 40; ) {
      mine.add(String(pid));
      const out = execSync(`ps -o ppid= -p ${pid} 2>/dev/null || true`, { encoding: 'utf8' }).trim();
      pid = Number(out);
      if (!Number.isFinite(pid) || pid <= 1) break;
    }

    const chain = [];
    for (let pid = Number(listener); pid && pid !== 1 && chain.length < 40; ) {
      chain.push(String(pid));
      if (mine.has(String(pid))) return { ok: true, detail: `listener ${listener} shares ancestor ${pid} with this script` };
      const out = execSync(`ps -o ppid= -p ${pid} 2>/dev/null || true`, { encoding: 'utf8' }).trim();
      pid = Number(out);
      if (!Number.isFinite(pid) || pid <= 1) break;
    }

    return {
      ok: false,
      detail: `listener ${listener} (ancestry ${chain.join(' < ')}) shares NO ancestor with this script — ` +
        'this is very likely a PEER session\'s editor. Stop and ask before driving it.'
    };
  } catch (e) {
    return { ok: null, detail: `ownership check failed: ${String(e.message).slice(0, 120)}` };
  }
}

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

/** 🔴 A COPY. The same fixture STY-005 drove — the only project on this machine with 9 colour
 *  styles, 2 text styles and a Look at once, which is what lets an empty section be told from a
 *  broken one. */
const PROJECT_DIR = opt('dir', '/Users/richardosborne/vscode_projects/NodeGX test projects/STY-005 Panel Drive');
const SHOTS = opt('shots', path.join(__dirname, '..', '..', 'dev-docs', 'tasks', 'phase-94-one-styles-panel', 'shots'));
const JSON_OUT = opt('json', null);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const arms = [];
const record = (name, ok, detail) => {
  arms.push({ name, ok, detail });
  console.log(`${ok === null ? 'UNGRADED' : ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

/**
 * Open one row's wearer list — **and leave it open if it already is.**
 *
 * 🔴 A bare `.click()` TOGGLES. The first run of this drive left the Colours list open for the
 * shot, and the second run's "press the count" click **closed** it and reported
 * `AC5 — pressing the count opens the list: FAIL`. A drive that only works against a pristine
 * surface is a drive whose second run reports a defect that is its own first run.
 * [[a-post-drive-control-reads-the-state-the-drive-leaves]].
 */
const ENSURE_OPEN = (name) => `(() => {
  const b = document.querySelector('[data-test="style-row-usage-' + CSS.escape(${JSON.stringify(name)}) + '"]');
  if (!b) return 'NO DOOR';
  if (b.tagName !== 'BUTTON') return 'NOT A DOOR';
  if (b.getAttribute('aria-expanded') === 'true') return 'already open';
  b.click();
  return 'opened';
})()`;

const WREQ = (p) => `window.__wreq(${JSON.stringify(p)})`;
const PROJECT = `${WREQ('./src/editor/src/models/projectmodel.ts')}.ProjectModel`;
const SIDEBAR = `${WREQ('./src/editor/src/models/sidebar/index.ts')}.SidebarModel`;
const NGCTX = `${WREQ('./src/editor/src/contexts/NodeGraphContext/NodeGraphContext.tsx')}.NodeGraphContextTmp`;

/**
 * The dev-server error overlay: a full-window iframe at `z-index: 2147483647`, injected by ANY red
 * file in this package — including a PEER's mid-flight edit. It makes `elementFromPoint` return
 * `IFRAME` everywhere and every hit test fail as if the product were broken. Stripped, and its
 * presence REPORTED, so a run never launders one into a product finding. → [[a-rect-is-not-visibility]]
 */
const STRIP_OVERLAY = `(() => {
  const f = document.getElementById('webpack-dev-server-client-overlay');
  if (!f) return 'none';
  f.remove();
  return 'STRIPPED — a file in this package is red; a peer\\'s edit counts';
})()`;

/**
 * Every row in the Styles panel, and whether its count is a DOOR.
 *
 * 🔴 The hit test, not the rect. A collapsed `CollapsableSection` is 36px with `overflow: hidden`
 * and the browser lays its children out *before* clipping, so eight clipped rows report full rects
 * inside the viewport. `elementFromPoint` is the only thing that tells drawn from visible.
 */
const ROWS = `JSON.stringify((() => {
  const panel = document.querySelector('[data-panel-id="styles"]');
  if (!panel) return { error: 'NO PANEL' };

  const reachable = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) return false;
    const hit = document.elementFromPoint(cx, cy);
    return !!hit && (hit === el || el.contains(hit) || hit.contains(el));
  };

  const rows = Array.from(panel.querySelectorAll('[data-style-row]')).map((el) => {
    const name = el.getAttribute('data-style-row');
    const usage = panel.querySelector('[data-test="style-row-usage-' + CSS.escape(name) + '"]');
    return {
      name,
      layer: el.getAttribute('data-style-layer'),
      usageText: usage ? usage.textContent.trim() : null,
      // AC3: a count is a door only when something is behind it. A <span> is not a door.
      usageIsButton: !!usage && usage.tagName === 'BUTTON',
      usageOpen: usage ? usage.getAttribute('aria-expanded') : null,
      usageReachable: reachable(usage),
      onScreen: reachable(el)
    };
  });

  return { rows };
})())`;

/** The wearer list currently open, read off the rendered entries. */
const OPEN_LIST = (styleName) => `JSON.stringify((() => {
  const panel = document.querySelector('[data-panel-id="styles"]');
  if (!panel) return { error: 'NO PANEL' };
  const list = panel.querySelector('[data-test="style-row-wearers-' + CSS.escape(${JSON.stringify(styleName)}) + '"]');
  if (!list) return { open: false };

  const reachable = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) return false;
    const hit = document.elementFromPoint(cx, cy);
    return !!hit && (hit === el || el.contains(hit) || hit.contains(el));
  };

  const title = list.querySelector('[class*="WearersTitle"]');
  const nodes = Array.from(list.querySelectorAll('[data-wearer-node]')).map((el) => ({
    nodeId: el.getAttribute('data-wearer-node'),
    componentName: el.getAttribute('data-wearer-component'),
    text: el.textContent.trim(),
    isButton: el.tagName === 'BUTTON',
    reachable: reachable(el)
  }));
  const looks = Array.from(list.querySelectorAll('[data-test^="style-row-wearer-look-"]')).map((el) => ({
    text: el.textContent.trim(),
    // 🔴 A Look entry must NOT be a button. It has nowhere to go and a press that lands nowhere
    // teaches a person the whole feature is broken.
    isButton: el.tagName === 'BUTTON'
  }));

  return { open: true, title: title ? title.textContent.trim() : null, nodes, looks };
})())`;

/** Where the canvas is: which component, and which node is selected. The consequence, both halves. */
const CANVAS = `JSON.stringify((() => {
  const g = ${NGCTX}.nodeGraph;
  if (!g) return { error: 'NO NODE GRAPH' };
  const active = g.getActiveComponent ? g.getActiveComponent() : g.activeComponent;
  const selected = (g.selector && g.selector.nodes ? Array.from(g.selector.nodes) : []).map(
    (n) => (n.model && n.model.id) || n.id || null
  );
  return { component: active ? active.name : null, selected };
})())`;

async function main() {
  // 🔴 BEFORE ANYTHING ELSE. Whose editor is this?
  const owner = cdpOwnership();
  record('the editor on 9222 belongs to THIS session, not a peer', owner.ok === true, owner.detail);
  /**
   * 🔴 **REFUSE ON ANYTHING THAT IS NOT A CONFIRMED MATCH — an owner this cannot NAME is not an
   * absent one.** The peer who found today's collision wrote the same check and it failed open:
   * their CLI was eleven hops up an Electron's PPID chain, their loop stopped at twelve, and
   * "unattributable" was allowed to proceed exactly like "mine". The walk is 40 hops now, and
   * `null` — lsof missing, `ps` refused, nothing listening — refuses too. The cost of refusing
   * wrongly is one relaunch; the cost of proceeding wrongly is a session of product defects that
   * are not defects.
   */
  if (owner.ok !== true) {
    console.error('\nRefusing to drive an editor this session cannot prove it owns. Relaunch your own ' +
      'stack, or set NOODL_REMOTE_DEBUG_PORT to a private port.');
    process.exitCode = 1;
    return;
  }

  const target = await appTarget('editor');
  const editor = await connect(target);
  const ev = (expr) => evaluate(editor, expr);
  const readJson = async (expr) => {
    const raw = await ev(expr);
    try {
      return JSON.parse(raw);
    } catch {
      return { error: 'UNPARSEABLE', raw: String(raw).slice(0, 400) };
    }
  };

  // 🔴 The window is `document.hidden`, so `requestAnimationFrame` never fires. Both of these on
  // THIS connection, before anything is read — assert rAF before trusting any red below.
  await editor.send('Page.setWebLifecycleState', { state: 'active' }).catch(() => {});
  await editor.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  const rafFires = await ev(
    `new Promise((res) => { const t = setTimeout(() => res('NO RAF'), 1500); requestAnimationFrame(() => { clearTimeout(t); res('raf'); }); })`
  );
  record('rAF fires — the page is live enough to trust a red', rafFires === 'raf', String(rafFires));
  if (rafFires !== 'raf') return finish(editor);

  await ev(`(() => { if (!window.__wreq) { webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]); } return !!window.__wreq; })()`);

  /**
   * 🔴 **IS THE RUNNING BUNDLE THE ONE ON DISK?** Read off the loaded function, not off the log.
   *
   * Cost two full runs of this drive: `keepSidePanel` was fixed, `tsc` was clean, the log said
   * `compiled successfully` — and the drive kept reporting the defect, because the successful
   * compile in the log had STARTED before the edit and the line that said so was an older one.
   * A `tail | grep` for "compiled successfully" matches history. This arm reads the string out of
   * `switchToComponent`'s own source in the live renderer, which is the artefact.
   * [[a-commit-is-not-what-the-compiler-read]], [[measure-the-artefact-before-believing-the-task-file]].
   */
  const bundleHasFix = await readJson(`JSON.stringify((() => {
    const ng = ${WREQ('./src/editor/src/views/nodegrapheditor.ts')};
    const SA = ${WREQ('./src/editor/src/views/nodegrapheditor/SelectionActions.ts')};
    const Editor = ng.NodeGraphEditor || ng.default;
    return {
      switchToComponent: String(Editor.prototype.switchToComponent).includes('disableHidePanels'),
      selectNode: String(SA.SelectionActions.prototype.selectNode).includes('disableHidePanels')
    };
  })())`);
  record(
    'the RUNNING bundle carries BOTH keepSidePanel guards — read off the loaded class, not the log',
    bundleHasFix.switchToComponent === true && bundleHasFix.selectNode === true,
    JSON.stringify(bundleHasFix)
  );
  // 🔴 And a class the page loaded before the edit is not the class on disk: webpack HMR replaces
  // the MODULE while every already-constructed instance keeps the old prototype. Reading the
  // prototype off the freshly-required module is what makes this arm mean anything — and a red
  // here means RELOAD THE RENDERER, not that the fix is wrong.
  if (bundleHasFix.switchToComponent !== true || bundleHasFix.selectNode !== true) return finish(editor);

  // ── Open the project (a COPY) ─────────────────────────────────────────────
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
    await wait(8000);
  }
  const dir = await ev(`(() => ${PROJECT}.instance._retainedProjectDirectory || 'NONE')()`);
  record('the driven project is the copy this drive names', path.resolve(String(dir)) === path.resolve(PROJECT_DIR), String(dir));

  /**
   * 🔴 WHAT THE MODEL SAYS — the independent reading every DOM claim below is checked against.
   *
   * Read through `__wreq` from `StylesModel.usage`, which is the file the panel reads too. That is
   * NOT circular for what this checks: the question here is whether the panel DREW what the walk
   * returned — a stale list, a missing entry, a row whose number came from one render and whose
   * list came from another. A panel agreeing with the model is the claim; a walk agreeing with
   * itself is not being claimed by this arm at all (that is `tests-unit/sty-006`, against a fixture).
   */
  const readModel = () => readJson(`JSON.stringify((() => {
    const u = ${WREQ('./src/editor/src/models/StylesModel.usage.ts')};
    const p = ${PROJECT}.instance;
    const colours = u.styleWearersIn(p, 'color');
    const looks = {};
    for (const v of (p.variants || [])) {
      looks[v.typename + '/' + v.name] = (u.lookWearersIn(p, v.typename)[v.name] || []);
    }
    return { colours, looks };
  })())`);

  // 🔴 Read ONCE here only to decide whether the case below needs building. The reading every arm
  // is graded against is taken AFTER the setup — reading it once, before, hands `looks` back empty
  // and every AC6 arm then grades an empty population.
  const modelBefore = await readModel();

  /**
   * 🔴 **THE DRIVE CONSTRUCTS THE CASE AC6 NEEDS, AND SAYS SO.**
   *
   * Measured before this was written: of every project on this machine, exactly ONE has a Look that
   * anything wears (`members area Richard test`, one wearer) and that project has **zero** colour
   * styles and zero text styles. This fixture is the opposite — nine colour styles, two text
   * styles, and a Look (`S27Variant`, type `nodegx.grow.Gamma`) that **no node in the project is**,
   * because the project contains no node of that type at all. So there is no project anywhere that
   * exercises both halves, and an AC6 arm run here would be graded against an empty population.
   *
   * So the drive makes the case, through the product's OWN door: `createNewVariant(name, node)` is
   * what STY-003's *"save this node's styles as a new Look…"* calls, and `setVariant` is what puts
   * a node into one. The same move s7 made when it took over `fontSize` to make an *overridden*
   * field exist — the alternative being an arm that passes because there was nothing to be wrong
   * about. [[assert-an-absence-with-a-known-firing-signal-beside-it]].
   *
   * 🔴 **THIS DOES REACH DISK, and an earlier version of this comment said it did not.** The
   * editor autosaves: `[renderer:info] Project saved` fired during the first run, and the fixture's
   * `nodegx.styles.json` now holds `Drive Look` with three wearers in `Pages/Home`,
   * `Components/TrustItem` and `Components/ProductCard`. Measured by stat-ing the file, which is
   * the only honest check — the intention not to save is not a reading.
   * [[test-results-json-is-the-readout-not-the-log]] applied to one's own plan.
   *
   * That is left standing rather than undone, because a fixture that genuinely carries a worn Look
   * is the fixture this arm needed and no project on this machine had. It is **idempotent**: the
   * guard above finds the Look on every later run and reports *"the project already carries a worn
   * Look"* instead of making another. The one thing that must not happen is a reader taking the
   * shot as evidence the fixture shipped this way, which is what that arm's wording prevents.
   */
  const built = await readJson(`JSON.stringify((() => {
    const p = ${PROJECT}.instance;
    const u = ${WREQ('./src/editor/src/models/StylesModel.usage.ts')};

    // Already worn by something? Then leave the project exactly as it is.
    for (const v of (p.variants || [])) {
      if ((u.lookWearersIn(p, v.typename)[v.name] || []).length > 0) {
        return { made: false, why: 'a Look in this project is already worn', name: v.name };
      }
    }

    // Two Text nodes in DIFFERENT components, so the Look's list spans more than one place and the
    // navigate-away control has somewhere to go. 🔴 The callback returns NOTHING — forEachNode
    // stops on a truthy return and would hand back the first node in the project every time.
    // (No backticks in here: this whole block is a JS template literal and one would end it.)
    const picked = [];
    p.getComponents().forEach((c) => {
      c.graph.forEachNode((n) => {
        const local = n.type && n.type.localName;
        if (local === 'Text' && !picked.some((q) => q.component === c.name)) {
          picked.push({ node: n, component: c.name });
        }
      });
    });
    if (picked.length < 2) return { made: false, why: 'fewer than two components hold a Text node', found: picked.length };

    const name = 'Drive Look';
    const variant = p.createNewVariant(name, picked[0].node) || p.findVariant(name, picked[0].node.type.localName);
    if (!variant) return { made: false, why: 'createNewVariant returned nothing' };

    for (const q of picked.slice(0, 3)) q.node.setVariant(variant);

    return {
      made: true,
      name,
      typename: variant.typename,
      wearers: picked.slice(0, 3).map((q) => ({ nodeId: q.node.id, component: q.component }))
    };
  })())`);
  record(
    built.made ? 'SETUP — a worn Look was CONSTRUCTED for AC6 (nothing saved to disk)' : 'SETUP — the project already carries a worn Look',
    built.made !== undefined && !built.error,
    built.made
      ? `"${built.name}" (${built.typename}) put on ${built.wearers.length} nodes: ${built.wearers.map((w) => `${w.nodeId}@${w.component}`).join(', ')}`
      : `${built.why}${built.name ? ` — ${built.name}` : ''}`
  );
  await wait(1200);

  const model = await readModel();
  const colourNames = Object.keys(model.colours || {});
  console.log(
    `model BEFORE setup: ${Object.keys(modelBefore.looks || {}).filter((k) => modelBefore.looks[k].length).length} worn Looks; ` +
      `AFTER: ${Object.keys(model.looks || {}).filter((k) => model.looks[k].length).length}`
  );
  console.log(`model: ${colourNames.length} used colour styles, ${Object.keys(model.looks || {}).length} Looks`);

  // ═══ 1. OPEN THE PANEL ════════════════════════════════════════════════════
  const overlay = await ev(STRIP_OVERLAY);
  record('no dev-server error overlay is covering the window', overlay === 'none', String(overlay));

  await ev(`(() => { const b = document.querySelector('[data-test="styles-panel"]'); if (!b) return 'NO BUTTON'; b.click(); return 'ok'; })()`);
  await wait(2500);
  const activeId = await ev(`(() => ${SIDEBAR}.instance.ActiveId)()`);
  record('the Styles panel is open', activeId === 'styles', String(activeId));
  if (activeId !== 'styles') return finish(editor);

  await ev(STRIP_OVERLAY);
  const before = await readJson(ROWS);
  if (before.error) {
    record('the panel rendered its rows', false, before.error);
    return finish(editor);
  }

  // 🔴 THE CONTROL for every AC3 claim below. With no pressable counts on screen, "the unused rows
  // are not pressable" is vacuously true of a panel that made NOTHING pressable.
  const doors = before.rows.filter((r) => r.usageIsButton);
  record(
    'the panel drew pressable counts at all — the control for every AC3 claim',
    doors.length > 0,
    `${doors.length} of ${before.rows.length} rows carry a door: ${doors.slice(0, 6).map((r) => `${r.name}=${r.usageText}`).join(', ')}`
  );
  if (!doors.length) return finish(editor);

  // AC3's other half, and it needs the control above to mean anything.
  const unused = before.rows.filter((r) => r.usageText === 'unused');
  record(
    'AC3 — `unused` is NOT pressable, while counted rows are',
    unused.every((r) => !r.usageIsButton),
    unused.length ? `${unused.length} unused rows, ${unused.filter((r) => r.usageIsButton).length} wrongly pressable` : 'no unused rows in this project — arm is weak here, see doors above'
  );
  const tokenRows = before.rows.filter((r) => r.layer === 'Token');
  record(
    'AC3 — token rows, which are never counted, grew no door',
    tokenRows.every((r) => !r.usageIsButton),
    `${tokenRows.length} token rows, ${tokenRows.filter((r) => r.usageIsButton).length} with a door`
  );

  // ═══ 2. OPEN A LIST, AND CHECK IT AGAINST THE MODEL ═══════════════════════
  /** The busiest colour style — a one-entry list is a weak shot AND a weak assertion (STY-006 §4). */
  const busiest = doors
    .filter((r) => r.layer === 'Style' && (model.colours[r.name] || {}).nodes)
    .sort((a, b) => (model.colours[b.name].nodes.length) - (model.colours[a.name].nodes.length))[0];

  if (!busiest) {
    record('a counted colour style was found to press', false, `doors: ${doors.map((d) => d.name).join(',')}`);
    return finish(editor);
  }
  const modelWearers = model.colours[busiest.name];
  console.log(`pressing "${busiest.name}" — model says ${modelWearers.nodes.length} nodes, ${modelWearers.variants.length} Looks`);

  const openedDoor = await ev(ENSURE_OPEN(busiest.name));
  await wait(900);
  await ev(STRIP_OVERLAY);
  const list = await readJson(OPEN_LIST(busiest.name));

  record(
    'AC5 — pressing the count opens the list',
    list.open === true && (openedDoor === 'opened' || openedDoor === 'already open'),
    `${openedDoor}; ${JSON.stringify(list).slice(0, 160)}`
  );
  if (!list.open) return finish(editor);

  record(
    'AC2 — the list under the row has exactly as many node entries as the model has wearers',
    list.nodes.length === modelWearers.nodes.length,
    `drawn ${list.nodes.length}, model ${modelWearers.nodes.length}`
  );
  record(
    'AC2 — and the number ON the row is that same number',
    busiest.usageText === `${modelWearers.nodes.length + modelWearers.variants.length}×`,
    `row says ${busiest.usageText}, model says ${modelWearers.nodes.length}+${modelWearers.variants.length}`
  );
  record(
    'AC1 — every entry names a node the model actually found, in the component the model found it in',
    list.nodes.every((drawn) =>
      modelWearers.nodes.some((m) => m.nodeId === drawn.nodeId && m.componentName === drawn.componentName)
    ),
    list.nodes.map((n) => `${n.nodeId}@${n.componentName}`).join(', ')
  );
  record(
    'AC4 — no entry prints a node id or a raw runtime typename as its text',
    list.nodes.every((n) => n.text.length > 0 && !n.text.includes(n.nodeId) && !/net\.noodl\./.test(n.text)),
    list.nodes.map((n) => JSON.stringify(n.text)).join(', ')
  );
  record(
    'AC5 — every entry is reachable, not drawn behind something',
    list.nodes.length > 0 && list.nodes.every((n) => n.isButton && n.reachable),
    list.nodes.filter((n) => !n.reachable || !n.isButton).map((n) => `${n.text}:${n.isButton ? 'hidden' : 'not a button'}`).join(', ') || `${list.nodes.length} reachable`
  );
  record(
    'the list heads itself with what uses it',
    typeof list.title === 'string' && /^Used by /.test(list.title),
    String(list.title)
  );
  // 🔴 A Look entry is listed and is NOT pressable. Ungraded when this style has no Look wearing it
  // — an absence claim about a population that is empty grades nothing, and saying so beats a green.
  record(
    'AC5 — a Look in the list is drawn and is NOT pressable',
    modelWearers.variants.length === 0 ? null : list.looks.length === modelWearers.variants.length && list.looks.every((l) => !l.isButton),
    modelWearers.variants.length === 0
      ? 'this style is worn by no Look — nothing to grade here; the Looks section arm below carries AC6'
      : `${list.looks.length} Look entries, ${list.looks.filter((l) => l.isButton).length} wrongly pressable`
  );

  // ═══ 3. THE PRESS, GRADED ON THE CANVAS ═══════════════════════════════════
  const targetEntry = list.nodes[0];

  /**
   * 🔴 NAVIGATE AWAY FIRST, AND PROVE IT.
   *
   * Without this the drive presses an entry pointing at the component the canvas is already
   * showing and reads back exactly what was already true — an arm that passes against a handler
   * that does nothing at all. The `away` component is chosen to be a DIFFERENT one, and the run
   * fails here rather than pressing into a meaningless reading.
   */
  const away = await ev(`(() => {
    const p = ${PROJECT}.instance;
    const other = p.getComponents().find((c) => c.name !== ${JSON.stringify(targetEntry.componentName)});
    if (!other) return 'ONLY ONE COMPONENT';
    ${NGCTX}.switchToComponent(other, { pushHistory: false });
    return other.name;
  })()`);
  await wait(1500);
  const beforePress = await readJson(CANVAS);
  record(
    'CONTROL — the canvas was moved AWAY from the target before the press',
    beforePress.component !== targetEntry.componentName && !beforePress.selected.includes(targetEntry.nodeId),
    `moved to ${away}; canvas reads component=${beforePress.component}, selected=[${beforePress.selected.join(',')}]; target is ${targetEntry.nodeId}@${targetEntry.componentName}`
  );
  if (beforePress.component === targetEntry.componentName) {
    record('the before/after pair can grade anything at all', false, 'the canvas is already on the target component');
    return finish(editor);
  }

  // The panel rebuilds when the canvas moves; re-open the list, then press an entry.
  await ev(STRIP_OVERLAY);
  const stillOpen = await readJson(OPEN_LIST(busiest.name));
  if (!stillOpen.open) {
    await ev(ENSURE_OPEN(busiest.name));
    await wait(900);
  }

  const pressed = await ev(`(() => {
    const el = document.querySelector('[data-wearer-node="' + CSS.escape(${JSON.stringify(targetEntry.nodeId)}) + '"]');
    if (!el) return 'ENTRY GONE';
    el.click();
    return 'ok';
  })()`);
  await wait(2500);
  const afterPress = await readJson(CANVAS);

  record(
    '🔴 AC5 — pressing an entry SWITCHES THE CANVAS to that entry’s component',
    pressed === 'ok' && afterPress.component === targetEntry.componentName,
    `press=${pressed}; before=${beforePress.component} → after=${afterPress.component}; wanted ${targetEntry.componentName}`
  );
  record(
    '🔴 AC5 — and SELECTS that node, which is the half a component switch alone would fake',
    afterPress.selected && afterPress.selected.includes(targetEntry.nodeId),
    `selected=[${(afterPress.selected || []).join(',')}], wanted ${targetEntry.nodeId}`
  );

  /**
   * 🔴 THE ARM THAT FOUND THE DEFECT. `selectNode` ends with `SidebarModel.instance.switchToNode()`
   * unless `keepSidePanel` — so without that flag the press swaps the Styles panel out for the
   * property panel and the list you were working through is GONE after the first entry. Every
   * drawing assertion was green and no jest spec in this package can see a sidebar.
   */
  const sidebarAfter = await ev(`(() => ${SIDEBAR}.instance.ActiveId)()`);
  record(
    '🔴 AC5 — the Styles panel SURVIVES the press, so the other eight entries are still there',
    sidebarAfter === 'styles',
    `sidebar is "${sidebarAfter}" after the press`
  );

  // ═══ 4. AC6 — THE SAME, FROM A LOOK ═══════════════════════════════════════
  // 🔴 The rail button TOGGLES. With `keepSidePanel` the panel is still open after the press, so
  // an unconditional click here closes it and every AC6 arm below then reports "no Look row found"
  // — which is the drive breaking its own surface, not a defect.
  await ev(`(() => {
    if (${SIDEBAR}.instance.ActiveId === 'styles') return 'already open';
    const b = document.querySelector('[data-test="styles-panel"]');
    if (b) b.click();
    return 'reopened';
  })()`);
  await wait(1200);
  await ev(STRIP_OVERLAY);
  const lookKeys = Object.keys(model.looks || {}).filter((k) => model.looks[k].length > 0);

  if (!lookKeys.length) {
    record('AC6 — a Look names what wears it', null, 'no Look in this project is worn by anything — the arm cannot run, and a green here would be a lie');
  } else {
    const lookKey = lookKeys[0];
    const lookName = lookKey.split('/').slice(1).join('/');
    const lookWearers = model.looks[lookKey];

    const rowsNow = await readJson(ROWS);
    const lookRow = (rowsNow.rows || []).find((r) => r.name === lookName && r.layer === 'Look');
    record(
      'AC6 — the Look row carries a door, and its number is the model’s',
      !!lookRow && lookRow.usageIsButton && lookRow.usageText === `${lookWearers.length}×`,
      lookRow ? `${lookRow.name}: ${lookRow.usageText}, button=${lookRow.usageIsButton}; model ${lookWearers.length}` : 'no Look row found'
    );

    if (lookRow && lookRow.usageIsButton) {
      await ev(ENSURE_OPEN(lookName));
      await wait(900);
      await ev(STRIP_OVERLAY);
      const lookList = await readJson(OPEN_LIST(lookName));

      record(
        'AC6 — the Look lists every node wearing it, and each is a real one',
        lookList.open === true &&
          lookList.nodes.length === lookWearers.length &&
          lookList.nodes.every((d) => lookWearers.some((m) => m.nodeId === d.nodeId && m.componentName === d.componentName)),
        `drawn ${lookList.nodes ? lookList.nodes.length : 0}, model ${lookWearers.length}`
      );

      // The consequence again, from the Look's list. Same discipline: away, prove it, then press.
      if (lookList.open && lookList.nodes.length) {
        const lookTarget = lookList.nodes[0];
        await ev(`(() => {
          const p = ${PROJECT}.instance;
          const other = p.getComponents().find((c) => c.name !== ${JSON.stringify(lookTarget.componentName)});
          if (other) ${NGCTX}.switchToComponent(other, { pushHistory: false });
          return 'ok';
        })()`);
        await wait(1500);
        const lookBefore = await readJson(CANVAS);

        await ev(STRIP_OVERLAY);
        const reopened = await readJson(OPEN_LIST(lookName));
        if (!reopened.open) {
          await ev(ENSURE_OPEN(lookName));
          await wait(900);
        }
        await ev(`(() => { const el = document.querySelector('[data-wearer-node="' + CSS.escape(${JSON.stringify(lookTarget.nodeId)}) + '"]'); if (el) el.click(); return 'ok'; })()`);
        await wait(2500);
        const lookAfter = await readJson(CANVAS);

        record(
          '🔴 AC6 — pressing a Look’s wearer takes you to that node',
          lookBefore.component !== lookTarget.componentName &&
            lookAfter.component === lookTarget.componentName &&
            (lookAfter.selected || []).includes(lookTarget.nodeId),
          `before=${lookBefore.component}/[${lookBefore.selected.join(',')}] → after=${lookAfter.component}/[${(lookAfter.selected || []).join(',')}]; wanted ${lookTarget.nodeId}@${lookTarget.componentName}`
        );
      }
    }
  }

  // ═══ 5. BOTH THEMES + THE SHOTS AC8 CLOSES ON ═════════════════════════════
  fs.mkdirSync(SHOTS, { recursive: true });
  for (const theme of ['dark', 'light']) {
    await ev(`(() => { ${WREQ('./src/editor/src/models/ThemeManager.ts')}.ThemeManager.setMode(${JSON.stringify(theme)}); return 'ok'; })()`);
    // 🔴 A theme written in one evaluation is not applied to anything read in the SAME one, and the
    // flip rebuilds the panel with its scroller back at the top and every list CLOSED.
    await wait(2500);

    await ev(ENSURE_OPEN(busiest.name));
    await wait(900);
    /**
     * Scroll the OPEN list into view, or the shot is a photograph of the rows above it.
     *
     * 🔴 **NOT `scrollIntoView`.** Measured: it scrolled the top-level DOCUMENT, not the panel's
     * own scroller — the entire editor moved up, the panel's `getBoundingClientRect` went
     * off-screen, `elementFromPoint` returned nothing for all nine entries, and the captured clip
     * was a **40px blank square**. The arm read as a product defect ("0 reachable") and the shot
     * read as a broken panel; both were this call. [[a-rect-is-not-visibility]] — the instrument's
     * own fault, wearing the defect's clothes. So: move the panel's scroller by hand, and put the
     * document back where it was.
     */
    const scrolled = await ev(`(() => {
      const panel = document.querySelector('[data-panel-id="styles"]');
      const list = document.querySelector('[data-test="style-row-wearers-' + CSS.escape(${JSON.stringify(busiest.name)}) + '"]');
      if (!panel || !list) return 'NO PANEL OR LIST';

      // The nearest ancestor that actually scrolls, inside the panel.
      let sc = list.parentElement;
      while (sc && sc !== panel && !(sc.scrollHeight > sc.clientHeight + 4)) sc = sc.parentElement;
      if (sc && sc.scrollHeight > sc.clientHeight + 4) {
        const sr = sc.getBoundingClientRect(), lr = list.getBoundingClientRect();
        sc.scrollTop += (lr.top - sr.top) - (sr.height - lr.height) / 2;
      }

      // 🔴 Put the DOCUMENT back. Anything that scrolled it takes the panel off-screen with it.
      if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
      window.scrollTo(0, 0);
      return sc && sc !== panel ? 'scrolled the panel' : 'no inner scroller needed';
    })()`);
    await wait(700);

    await ev(STRIP_OVERLAY);
    const applied = await ev(`document.documentElement.getAttribute('data-theme')`);
    const shotList = await readJson(OPEN_LIST(busiest.name));
    record(
      `the list is open and reachable in the ${theme} theme`,
      applied === theme && shotList.open === true && (shotList.nodes || []).some((n) => n.reachable),
      `theme=${applied}, ${shotList.nodes ? shotList.nodes.length : 0} entries, ${(shotList.nodes || []).filter((n) => n.reachable).length} reachable`
    );

    const clip = await readJson(`JSON.stringify((() => {
      const p = document.querySelector('[data-panel-id="styles"]');
      if (!p) return null;
      const r = p.getBoundingClientRect();
      const left = Math.max(0, Math.floor(r.left) - 4);
      const top = Math.max(0, Math.floor(r.top) - 4);
      return { x: left, y: top, width: Math.min(innerWidth - left, Math.ceil(r.width) + 8), height: Math.min(innerHeight - top, Math.ceil(r.height) + 8) };
    })())`);

    // 🔴 A clip computed off an off-screen panel yields a tiny blank square that is saved, named
    // and reported exactly like a good shot. Measured once already this session — so the rect is
    // graded, not merely used.
    record(
      `the ${theme} shot is being taken of a panel that is actually on screen`,
      !!clip && clip.width > 200 && clip.height > 200,
      `${scrolled}; clip=${JSON.stringify(clip)}`
    );

    const file = path.join(SHOTS, `sty006-used-by-${theme}.png`);
    const shot = await editor.send('Page.captureScreenshot', {
      format: 'png',
      ...(clip && clip.width > 0 ? { clip: { ...clip, scale: 2 } } : {})
    });
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log(`shot ${path.basename(file)} — theme=${applied}${clip ? '' : ' (FULL WINDOW — no panel rect)'}`);
  }

  return finish(editor);
}

function finish(editor) {
  const graded = arms.filter((a) => a.ok !== null);
  const failed = graded.filter((a) => !a.ok);
  const ungraded = arms.filter((a) => a.ok === null);
  console.log(
    `\n${graded.length - failed.length}/${graded.length} graded arms passed` +
      (ungraded.length ? `; ${ungraded.length} UNGRADED (named above)` : '') +
      (failed.length ? `; FAILED: ${failed.map((a) => a.name).join('; ')}` : '')
  );
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ arms }, null, 2));
  editor.close && editor.close();
  process.exitCode = failed.length ? 1 : 0;
}

/**
 * 🔴 **Only run when INVOKED, never when required.** A peer syntax-checking a sibling drive with
 * `node -e "require('./drive-....js')"` ran its `main()` — against an editor that was not theirs,
 * which is how today's collision got one run longer than anyone meant. `node --check` is the
 * syntax check; requiring a script is running it.
 */
if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
