#!/usr/bin/env node
/**
 * HLT-001 AC1 — the count, on a driven session.
 *
 * The defect: React 19 writes
 *
 *   "Attempted to synchronously unmount a root while React was already rendering…"
 *
 * as a console **error** whenever `root.unmount()` runs inside a render or commit. Richard's own
 * 42-minute session on 2026-09-20 logged it **132 times, in three bursts of 44** — one action
 * tearing down 44 roots at once. Phase 99's bar is that a *fresh driven session* logs **zero**,
 * so this drive is the instrument, not the jasmine spec.
 *
 * 🔴 **This drive is worthless without its control.** "Zero events" is the expected reading of a
 * drive that never reached the defect at all, and that is the easiest possible false pass
 * ([[assert-an-absence-with-a-known-firing-signal-beside-it]]). So:
 *
 *   node scripts/devtools/drive-hlt001-unmount.js --expect 0      # with the fix in the bundle
 *   node scripts/devtools/drive-hlt001-unmount.js --expect firing # with the seam mutated back
 *
 * The `--expect firing` run is made by editing `shared/utils/unmountReactRoot.ts` to call
 * `root.unmount()` directly, letting webpack rebuild, and re-running. A drive that reads 0 in
 * BOTH modes has proven nothing; only the pair proves the drive reaches the code under test
 * ([[a-control-pair-proves-what-you-varied-only]]).
 *
 * ⚠️ **The counter is armed in the renderer before a single action** — a window opened after the
 * event attributes nothing ([[a-window-opened-after-the-event-attributes-nothing]]). Launch-time
 * events happen before CDP can attach, so they are read separately out of `.logs/dev.log` and
 * reported as a second figure rather than folded into the driven count.
 *
 * ⚠️ **Events, not log lines.** `console.error` is mirrored to the log on more than one channel;
 * the renderer-side counter counts the call, which is the event.
 *
 * Usage:
 *   node scripts/devtools/drive-hlt001-unmount.js [--dir <project>] [--json <file>] [--expect 0|firing]
 *
 * Exits 0 when the drive both REACHED the surfaces and read the expected count.
 */
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('./cdp.js');

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

/** 🔴 A COPY, never a project Richard might open — opening one writes three files into it. */
const PROJECT_DIR = opt('dir', '/Users/richardosborne/vscode_projects/NodeGX test projects/HLT-001 Unmount Drive');
const JSON_OUT = opt('json', null);
const EXPECT = opt('expect', '0'); // '0' = fixed build; 'firing' = mutant control
const LOG = path.join(__dirname, '..', '..', '.logs', 'dev.log');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const arms = [];
const record = (name, ok, detail) => {
  arms.push({ name, ok, detail });
  console.log(`${ok === null ? 'UNGRADED' : ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const WREQ = (p) => `window.__wreq(${JSON.stringify(p)})`;
const PROJECT = `${WREQ('./src/editor/src/models/projectmodel.ts')}.ProjectModel`;
const ED = `${WREQ('./src/editor/src/contexts/NodeGraphContext/NodeGraphContext.tsx')}.NodeGraphContextTmp.nodeGraph`;

/** The message React writes. Matched on the stable first clause, not the whole sentence. */
const NEEDLE = 'synchronously unmount';

/**
 * 🔴 The two errors a DEFERRED teardown can CAUSE, counted beside the one it cures.
 *
 * Both were measured on this drive on 2026-09-20: zero with the seam synchronous, eight and two
 * per drive with it deferred. Deferring opens a window, and in that window the caller can empty the
 * container (React then commits its deletions against nodes that are no longer there) or hand the
 * same container to a fresh `createRoot`.
 *
 * A drive that counted only `NEEDLE` would have reported a clean cure and shipped a trade
 * ([[a-recommendation-carries-a-measurement-of-some-property-not-the-right-one]]).
 */
const SIDE_EFFECTS = [
  { key: 'removeChild', needle: "Failed to execute 'removeChild'" },
  { key: 'doubleCreateRoot', needle: 'has already been passed to createRoot' }
];

/**
 * Arm the renderer-side counter. Wraps `console.error` and counts CALLS, so the doubled log
 * channels cannot inflate the figure. Keeps the first three messages for the record, and a
 * separate total of every other console error so a drive that merely went quiet is visible.
 */
const ARM = `(() => {
  // Re-arming RESETS the counters. A second run that inherited the first run's reading would be
  // measuring two drives and calling it one.
  if (window.__hlt001) {
    window.__hlt001.unmount = 0;
    window.__hlt001.removeChild = 0;
    window.__hlt001.doubleCreateRoot = 0;
    window.__hlt001.otherErrors = 0;
    window.__hlt001.samples = [];
    return 'armed';
  }
  const state = { unmount: 0, removeChild: 0, doubleCreateRoot: 0, otherErrors: 0, samples: [] };
  const original = console.error;
  console.error = function (...args) {
    let text = '';
    try { text = args.map((a) => (a && a.message) ? a.message : String(a)).join(' '); } catch (e) { text = ''; }
    if (text.indexOf(${JSON.stringify(NEEDLE)}) !== -1) {
      state.unmount++;
      if (state.samples.length < 3) state.samples.push(text.slice(0, 160));
    } else if (text.indexOf(${JSON.stringify(SIDE_EFFECTS[0].needle)}) !== -1) {
      state.removeChild++;
    } else if (text.indexOf(${JSON.stringify(SIDE_EFFECTS[1].needle)}) !== -1) {
      state.doubleCreateRoot++;
    } else {
      state.otherErrors++;
    }
    return original.apply(console, args);
  };
  window.__hlt001 = state;
  return 'armed';
})()`;

const READ = `JSON.stringify(window.__hlt001 || { error: 'NOT ARMED' })`;

/** Strip the dev-server error overlay — an instrument fault that reads like a product one. */
const STRIP_OVERLAY = `(() => {
  const f = document.getElementById('webpack-dev-server-client-overlay');
  if (!f) return 'none';
  let why = '';
  try { why = (f.contentDocument.body.innerText || '').split('\\n').slice(0, 3).join(' / '); } catch (e) { why = 'unreadable'; }
  f.remove();
  return 'REMOVED: ' + why.slice(0, 200);
})()`;

async function main() {
  // Mark where the log is NOW — see the bounded window read at the end of the drive.
  let logOffsetAtStart = 0;
  try {
    logOffsetAtStart = fs.statSync(LOG).size;
  } catch (e) {
    /* no log yet */
  }

  const editor = await connect(await appTarget('editor'));
  const ev = (expr) => evaluate(editor, expr);
  const readJson = async (expr) => {
    const raw = await ev(expr);
    try {
      return JSON.parse(String(raw));
    } catch (e) {
      return { error: `unparseable: ${String(raw).slice(0, 200)}` };
    }
  };
  const finish = (ok) => {
    const failed = arms.filter((a) => a.ok === false);
    console.log(`\n${failed.length ? 'FAILED' : 'PASSED'} — ${arms.length - failed.length}/${arms.length} graded arms`);
    if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ expect: EXPECT, project: PROJECT_DIR, arms }, null, 2));
    process.exit(failed.length ? 1 : 0);
  };

  // ═══ 0. ARM FIRST, BEFORE ANY ACTION ═══
  const armed = await ev(ARM);
  record('the counter is armed before a single action is driven', String(armed) === 'armed', String(armed));

  // `window.__wreq` is the editor's webpack require and it is not there until something asks
  // for it — every module read below goes through it.
  const wreq = await ev(
    `(() => { if (!window.__wreq) { webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]); } return !!window.__wreq; })()`
  );
  record('the editor bundle is reachable (__wreq pushed)', wreq === true || String(wreq) === 'true', String(wreq));

  // The seam is in the running bundle, not merely on disk — the on-disk bundle is not the one
  // running, and a drive that grades a stale build grades nothing.
  const seam = await ev(`(() => {
    try {
      const m = ${WREQ('./src/shared/utils/unmountReactRoot.ts')};
      const src = String(m.unmountReactRoot);
      return src.indexOf('queueMicrotask') !== -1 || src.indexOf('setTimeout') !== -1 ? 'DEFERRED' : 'SYNCHRONOUS';
    } catch (e) { return 'NO SEAM IN BUNDLE: ' + e.message; }
  })()`);
  const seamOk = EXPECT === 'firing' ? String(seam) === 'SYNCHRONOUS' : String(seam) === 'DEFERRED';
  record(`the RUNNING bundle carries the seam this run means to grade (--expect ${EXPECT})`, seamOk, String(seam));

  // ═══ 1. OPEN THE COPY ═══
  const routed = await ev(`(() => {
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
  if (String(routed) !== 'ok') {
    record('the editor router was found', false, String(routed));
    return finish(false);
  }

  const already = await ev(
    `(() => { const p = ${PROJECT}.instance; return (p && p._retainedProjectDirectory) || 'NONE'; })()`
  );
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
    'the driven project is the copy this drive names',
    path.resolve(String(dir)) === path.resolve(PROJECT_DIR),
    String(dir)
  );

  const overlay = await ev(STRIP_OVERLAY);
  record('no dev-server error overlay is covering the window', String(overlay) === 'none', String(overlay));

  // ═══ 2. DRIVE THE SURFACES §3 NAMES ═══
  // Components, then every node in each — selecting a node builds the property editor's rows and
  // DESELECTING tears them all down at once, which is the 44-root burst this task exists for.
  const components = await readJson(`JSON.stringify((() => {
    const p = ${PROJECT}.instance;
    if (!p) return { error: 'NO PROJECT' };
    return { names: (p.getComponents() || []).map((c) => c.fullName).slice(0, 12) };
  })())`);
  record(
    'the project has components to drive — the control for every count below',
    Array.isArray(components.names) && components.names.length > 0,
    `${(components.names || []).length} components`
  );
  if (!components.names || !components.names.length) return finish(false);

  let nodesVisited = 0;
  let selections = 0;
  for (const name of components.names) {
    await ev(`(() => {
      const { EventDispatcher } = ${WREQ('./src/shared/utils/EventDispatcher.ts')};
      const p = ${PROJECT}.instance;
      const c = p.getComponentWithName(${JSON.stringify('')} + ${JSON.stringify(name)});
      if (!c) return 'no component';
      EventDispatcher.instance.notifyListeners('ComponentPanel.SwitchToComponent', { component: c, pushHistory: false });
      return 'ok';
    })()`);
    await wait(1200);

    // 🔴 ONE SELECTION PER TURN, from Node, with a wait between.
    // Ten selections inside a single synchronous JS turn are batched by React into one render,
    // and the build-then-tear-down cycle this task measures never happens at all. The first
    // version of this drive did exactly that and read a confident, meaningless zero.
    const ids = await readJson(`JSON.stringify((() => {
      const ed = ${ED};
      if (!ed) return { error: 'NO EDITOR' };
      const all = [];
      const walk = (n) => { all.push(n); (n.children || []).forEach(walk); };
      (ed.roots || []).forEach(walk);
      return { ids: all.map((n) => (n.model && n.model.id) || n.id).filter(Boolean).slice(0, 8), onCanvas: all.length };
    })())`);
    nodesVisited += Number(ids.onCanvas) || 0;

    for (const id of ids.ids || []) {
      const picked = await ev(`(() => {
        const ed = ${ED};
        if (!ed) return 'NO EDITOR';
        const all = [];
        const walk = (n) => { all.push(n); (n.children || []).forEach(walk); };
        (ed.roots || []).forEach(walk);
        const node = all.find((n) => (n.model && n.model.id) === ${JSON.stringify(
          id
        )}) || all.find((n) => n.id === ${JSON.stringify(id)});
        if (!node) return 'GONE';
        ed.selectionActions ? ed.selectionActions.selectNode(node, {}) : ed.selector.selectNode(node);
        return 'ok';
      })()`);
      if (String(picked) === 'ok') selections++;
      await wait(450);
    }
    // Clearing the selection is the teardown half: every row the property editor built comes down.
    await ev(
      `(() => { const ed = ${ED}; try { ed.selector && ed.selector.deselectAll && ed.selector.deselectAll(); } catch (e) {} return 'ok'; })()`
    );
    await wait(700);
  }
  record(
    'nodes were actually selected — the property editor really built and tore down rows',
    selections > 0,
    `${selections} selections across ${nodesVisited} nodes on canvas`
  );

  // A context menu, opened and dismissed — ShowContextMenuInPopup / NodeContextMenu.
  await ev(`(() => {
    const { PopupLayer } = ${WREQ('./src/editor/src/views/popuplayer.ts')} || {};
    return 'noop';
  })()`);
  for (let i = 0; i < 3; i++) {
    await ev(`(() => {
      const canvas = document.querySelector('.nodegraph-canvas, canvas');
      if (!canvas) return 'no canvas';
      const r = canvas.getBoundingClientRect();
      const opts = { bubbles: true, clientX: Math.round(r.left + r.width / 2), clientY: Math.round(r.top + r.height / 2) };
      canvas.dispatchEvent(new MouseEvent('contextmenu', opts));
      return 'ok';
    })()`);
    await wait(700);
    await ev(
      `(() => { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return 'ok'; })()`
    );
    await wait(500);
  }

  // Save — the path whose thumbnail capture bracketed all three of Richard's bursts.
  for (let i = 0; i < 2; i++) {
    await ev(
      `(() => { const p = ${PROJECT}.instance; if (p && p.save) { p.save(); return 'saved'; } return 'no save'; })()`
    );
    await wait(2500);
  }

  // Switch away and back — tears the whole graph down and rebuilds it.
  await ev(`(() => { window.__hltRouter.route({ to: 'projects' }); return 'ok'; })()`);
  await wait(2500);
  await ev(`(async () => {
    const { LocalProjectsModel } = ${WREQ('./src/editor/src/utils/LocalProjectsModel.ts')};
    const p = await LocalProjectsModel.instance.openProjectFromFolder(${JSON.stringify(PROJECT_DIR)});
    window.__hltRouter.route({ to: 'editor', project: p });
    return 'ok';
  })()`);
  await wait(8000);

  // ═══ 3. READ THE COUNT ═══
  const state = await readJson(READ);
  const driven = Number(state.unmount);
  console.log(`\ndriven console.error events matching "${NEEDLE}": ${driven}`);
  console.log(`other console errors during the drive: ${state.otherErrors}`);
  console.log(`deferral side effects — removeChild: ${state.removeChild}, doubleCreateRoot: ${state.doubleCreateRoot}`);
  if (state.samples && state.samples.length) console.log(`sample: ${state.samples[0]}`);

  // 🔴 Only the lines written SINCE this drive began. `.logs/dev.log` spans the whole stack's
  // lifetime, so a control run earlier in the same session leaves over a thousand of exactly the
  // line counted here; reading the whole file afterwards measures those leavings and calls them
  // this drive's ([[a-post-drive-control-reads-the-state-the-drive-leaves]]).
  //
  // It is a SECOND reading, not a duplicate of the counter above: the renderer counter can only be
  // armed once a page exists, so anything written during launch is invisible to it.
  let sinceStart = 0;
  try {
    const size = fs.statSync(LOG).size;
    const len = Math.max(0, size - logOffsetAtStart);
    const fd = fs.openSync(LOG, 'r');
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, logOffsetAtStart);
    fs.closeSync(fd);
    sinceStart = buf
      .toString('utf8')
      .split('\n')
      .filter((l) => l.includes(NEEDLE)).length;
  } catch (e) {
    /* no log is not this drive's failure */
  }
  console.log(`log lines matching, written SINCE this drive began (lines \u2260 events): ${sinceStart}`);

  if (EXPECT === 'firing') {
    record(
      '🔴 THE CONTROL — the mutated (synchronous) seam DOES produce the error on this drive',
      driven > 0,
      `${driven} events`
    );
  } else {
    record('AC1 — the driven session logs ZERO "synchronously unmount" events', driven === 0, `${driven} events`);
    record(
      'and the log written since this drive began carries none either',
      sinceStart === 0,
      `${sinceStart} log lines`
    );
    // 🔴 The cure must not be a trade. Both of these read 0 with the seam SYNCHRONOUS, so a
    // non-zero here is the deferral's own doing and belongs to this task, not to a later one.
    record(
      'the deferral causes no "removeChild" failures of its own',
      Number(state.removeChild) === 0,
      `${state.removeChild} events`
    );
    record(
      'and no container is handed to createRoot() twice',
      Number(state.doubleCreateRoot) === 0,
      `${state.doubleCreateRoot} events`
    );
  }

  return finish(true);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
