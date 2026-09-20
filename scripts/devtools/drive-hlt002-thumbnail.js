#!/usr/bin/env node
/**
 * HLT-002 AC1/AC3 — the thumbnail capture, counted on a driven session.
 *
 * The defect: `UseCaptureThumbnails` calls `CanvasView.captureThumbnail()` on a 20-second timer,
 * `captureThumbnail` awaits `webview.capturePage()`, and nothing catches the rejection. Richard's
 * 42-minute session on 2026-09-20 logged **116** of
 *
 *   Uncaught (in promise) Error: Error invoking remote method 'GUEST_VIEW_MANAGER_CALL':
 *     Error: UnknownVizError
 *
 * 🔴 **This drive's first job is not the count — it is the MECHANISM.** HLT-002's task file says
 * the capture runs against a webview "that is not attached", and `captureThumbnail` has carried an
 * attachment guard (`webviewDomReady && webview.isConnected`) since the initial commit. Both cannot
 * be true. So the drive wraps the real method and, on every failure, records what the webview
 * actually was at that moment — attached or not, visible or not, window shown or occluded
 * ([[measure-the-artefact-before-believing-the-task-file]]).
 *
 * 🔴 **The rejection is UNHANDLED, so `console.error` is the wrong instrument.** Chromium reports
 * an unhandled rejection through its own channel, not through a `console.error` call a wrapper can
 * see. The counter here is an `unhandledrejection` listener, which is the event the product
 * actually emits. A second counter wraps `console.error` anyway, so a fix that merely converts the
 * rejection into a logged error is visible as a move rather than as a cure.
 *
 * 🔴 **A zero is worthless without a reach arm beside it.** A 20-second timer that never fired, a
 * preview panel that never mounted, or a project that never opened all read as a clean zero
 * ([[assert-an-absence-with-a-known-firing-signal-beside-it]]). The drive therefore grades
 * `attempts > 0` and, for AC3, `succeeded > 0` — the capture must still WORK, or the fix is
 * indistinguishable from deleting the feature.
 *
 *   node scripts/devtools/drive-hlt002-thumbnail.js --expect firing   # at HEAD, or with the guard mutated back
 *   node scripts/devtools/drive-hlt002-thumbnail.js --expect 0        # with the fix in the bundle
 *   node scripts/devtools/drive-hlt002-thumbnail.js --expect 0 --minutes 20   # the AC1 session
 *
 * ⚠️ **Events, not log lines** — the same event reaches `.logs/dev.log` on two channels
 * (`[renderer:error]` and `[renderer:exception]`), so a line count reads double. The renderer-side
 * counter counts the event.
 *
 * ⚠️ **The log window is bounded by a byte offset taken before the drive acts.** `.logs/dev.log`
 * spans the whole stack's lifetime, so a `--expect firing` run earlier in the same session leaves
 * exactly the lines counted here ([[a-post-drive-control-reads-the-state-the-drive-leaves]]).
 *
 * Usage:
 *   node scripts/devtools/drive-hlt002-thumbnail.js [--dir <project>] [--json <file>]
 *                                                   [--expect 0|firing] [--minutes <n>]
 *
 * Exits 0 when the drive both REACHED the capture and read the expected count.
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
const PROJECT_DIR = opt('dir', '/Users/richardosborne/vscode_projects/NodeGX test projects/HLT-002 Thumbnail Drive');
const JSON_OUT = opt('json', null);
const EXPECT = opt('expect', '0'); // '0' = fixed build; 'firing' = HEAD / mutated guard
const MINUTES = Number(opt('minutes', '0')) || 0; // 0 = the short diagnostic pass
const LOG = path.join(__dirname, '..', '..', '.logs', 'dev.log');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const arms = [];
const record = (name, ok, detail) => {
  arms.push({ name, ok, detail });
  console.log(`${ok === null ? 'UNGRADED' : ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const WREQ = (p) => `window.__wreq(${JSON.stringify(p)})`;
const PROJECT = `${WREQ('./src/editor/src/models/projectmodel.ts')}.ProjectModel`;

/** The stable clause of the rejection. Not the whole sentence — the remote-method wrapper varies. */
const NEEDLE = 'UnknownVizError';

/**
 * Arm the instrument, BEFORE a single action.
 *
 * Three things at once, because they answer three different questions and only together do they
 * distinguish "cured" from "never reached" from "traded for something else":
 *
 *  1. `rejections` — the `unhandledrejection` events matching the needle. **This is the defect.**
 *  2. `attempts` / `succeeded` / `failed` — the real `captureThumbnail` calls, wrapped on the
 *     prototype. `attempts` is the reach arm; `succeeded` is AC3's control, in the same run.
 *  3. `states` — for the first eight failures, what the webview WAS at the moment it failed.
 *     This is the arm that decides whether the task file's "not attached" is the mechanism.
 *
 * ⚠️ The wrapper must not change the outcome it is measuring. It observes the returned promise
 * through a detached `.then(…, …)` and returns the ORIGINAL promise to the caller, so the product's
 * own rejection still goes unhandled exactly as it does without the instrument. Returning the
 * observing promise instead would HANDLE the rejection and the drive would read a triumphant zero
 * caused entirely by itself.
 */
const ARM = `(() => {
  const w = window;
  if (!w.__hlt002) {
    w.__hlt002 = { rejections: 0, consoleErrors: 0, attempts: 0, succeeded: 0, failed: 0, capturePageCalls: 0, states: [], samples: [] };
    const state = w.__hlt002;

    w.addEventListener('unhandledrejection', (e) => {
      let text = '';
      try {
        const r = e.reason;
        text = (r && (r.message || r.toString())) || String(r);
      } catch (err) { text = ''; }
      if (text.indexOf(${JSON.stringify(NEEDLE)}) !== -1) {
        state.rejections++;
        if (state.samples.length < 3) state.samples.push(text.slice(0, 200));
      }
    });

    const originalError = console.error;
    console.error = function (...args) {
      let text = '';
      try { text = args.map((a) => (a && a.message) ? a.message : String(a)).join(' '); } catch (e) { text = ''; }
      if (text.indexOf(${JSON.stringify(NEEDLE)}) !== -1) state.consoleErrors++;
      return originalError.apply(console, args);
    };
  }

  const state = w.__hlt002;
  // Re-arming RESETS the counts. A second run inheriting the first run's reading would be two
  // drives reported as one.
  state.rejections = 0; state.consoleErrors = 0;
  state.attempts = 0; state.succeeded = 0; state.failed = 0;
  state.capturePageCalls = 0;
  state.states = []; state.samples = [];

  try {
    const mod = ${WREQ('./src/editor/src/views/VisualCanvas/CanvasView.ts')};
    const proto = mod.CanvasView.prototype;
    if (!proto.__hlt002Wrapped) {
      const original = proto.captureThumbnail;
      // 🔴 Keep the PRODUCT's source before it is wrapped. The seam check below reads this rather
      // than the live prototype, because from the next line onwards the live prototype is the
      // instrument's own function — and a drive that grades its own wrapper grades nothing.
      state.productCaptureSource = String(original);
      proto.captureThumbnail = function (...args) {
        const s = w.__hlt002;
        s.attempts++;
        // The snapshot is taken BEFORE the call, because the answer to "why did it fail" is the
        // state the call was made in, not the state it left behind.
        const snap = (() => {
          try {
            const v = this.webview;
            const r = v && v.getBoundingClientRect ? v.getBoundingClientRect() : null;
            return {
              domReady: !!this.webviewDomReady,
              isConnected: !!(v && v.isConnected),
              // \`checkVisibility\` is the only reading that sees an ANCESTOR's \`visibility: hidden\`,
              // which is exactly how BEN-004 R3 hides the app stage behind the bench and the board.
              visible: v && v.checkVisibility
                ? v.checkVisibility({ visibilityProperty: true, opacityProperty: true, contentVisibilityAuto: true })
                : null,
              pageVisibility: document.visibilityState,
              rect: r ? Math.round(r.width) + 'x' + Math.round(r.height) : 'none'
            };
          } catch (e) { return { snapshotError: String(e && e.message) }; }
        })();

        let out;
        try {
          out = original.apply(this, args);
        } catch (e) {
          // 🔴 A SYNCHRONOUS throw. \`executeJavaScript\` on an unattached <webview> throws rather
          // than rejecting (P93 TVW-008 §10), so this arm is not hypothetical.
          s.failed++;
          if (s.states.length < 8) s.states.push(Object.assign({ how: 'sync throw', error: String(e && e.message).slice(0, 120) }, snap));
          throw e;
        }

        if (out && typeof out.then === 'function') {
          // Detached observation — the ORIGINAL promise is what the caller gets back, so the
          // product's unhandled rejection stays unhandled.
          out.then(
            (img) => { img ? s.succeeded++ : s.states.length < 8 && s.states.push(Object.assign({ how: 'skipped (returned null)' }, snap)); },
            (e) => {
              s.failed++;
              if (s.states.length < 8) s.states.push(Object.assign({ how: 'rejected', error: String(e && e.message).slice(0, 120) }, snap));
            }
          );
        } else if (out) {
          s.succeeded++;
        } else if (s.states.length < 8) {
          s.states.push(Object.assign({ how: 'skipped (returned null)' }, snap));
        }
        return out;
      };
      proto.__hlt002Wrapped = true;
    }
  } catch (e) {
    return 'NO CANVASVIEW IN BUNDLE: ' + e.message;
  }
  return 'armed';
})()`;

const READ = `JSON.stringify(window.__hlt002 || { error: 'NOT ARMED' })`;

/**
 * 🔴 The deterministic half of the control: count calls to `capturePage` ITSELF.
 *
 * The rejection is not reliably reproducible on demand — whether a hidden webview's capture fails
 * depends on whether Chromium still holds a surface for it, and two runs of this drive against the
 * identical unguarded build read 7 and 0. A count that only sometimes fires cannot grade a zero.
 *
 * What IS deterministic is the thing the fix actually changes: with the guard, `capturePage` is
 * **never called** while the stage is hidden; without it, it is called every 20 seconds. So this
 * wraps the element prototype and counts the calls, and the drive grades the calls per phase. The
 * rejection count stays as the product-level reading beside it, but the calls are the pair
 * ([[a-control-pair-proves-what-you-varied-only]]).
 *
 * Armed after the project opens, because the `<webview>` — and therefore its prototype — does not
 * exist until the editor document mounts one.
 */
const ARM_CAPTURE_PAGE = `(() => {
  const el = document.querySelector('[data-test="app-preview"] webview');
  if (!el) return 'NO WEBVIEW';
  const proto = Object.getPrototypeOf(el);
  if (!proto || typeof proto.capturePage !== 'function') return 'NO capturePage ON PROTOTYPE';
  if (!proto.__hlt002Wrapped) {
    const original = proto.capturePage;
    proto.capturePage = function (...args) {
      window.__hlt002.capturePageCalls++;
      return original.apply(this, args);
    };
    proto.__hlt002Wrapped = true;
  }
  return 'armed';
})()`;

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
  const finish = () => {
    const failed = arms.filter((a) => a.ok === false);
    console.log(`\n${failed.length ? 'FAILED' : 'PASSED'} — ${arms.length - failed.length}/${arms.length} graded arms`);
    if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ expect: EXPECT, project: PROJECT_DIR, arms }, null, 2));
    process.exit(failed.length ? 1 : 0);
  };

  // `window.__wreq` is the editor's webpack require and is not there until something asks for it.
  const wreq = await ev(
    `(() => { if (!window.__wreq) { webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]); } return !!window.__wreq; })()`
  );
  record('the editor bundle is reachable (__wreq pushed)', wreq === true || String(wreq) === 'true', String(wreq));

  // ═══ 0. ARM FIRST, BEFORE ANY ACTION ═══
  const armed = await ev(ARM);
  record('the instrument is armed before a single action is driven', String(armed) === 'armed', String(armed));
  if (String(armed) !== 'armed') return finish();

  // The guard is read out of the RUNNING bundle, not off disk — the on-disk bundle is not the one
  // running, and a drive that grades a stale build grades nothing.
  //
  // ⚠️ Read from the source the ARM stashed BEFORE it wrapped the prototype. Reading the live
  // prototype here returns the instrument's own wrapper — which is how the first version of this
  // arm reported `UNGUARDED` against a build that carried the guard, and, worse, reported it as a
  // PASS on the `--expect firing` runs. An arm that cannot see the product cannot grade it.
  const seam = await ev(`(() => {
    try {
      const src = (window.__hlt002 && window.__hlt002.productCaptureSource) ||
        String(${WREQ('./src/editor/src/views/VisualCanvas/CanvasView.ts')}.CanvasView.prototype.captureThumbnail);
      return src.indexOf('captureThumbnailSafely') !== -1 ? 'GUARDED' : 'UNGUARDED';
    } catch (e) { return 'NO SEAM IN BUNDLE: ' + e.message; }
  })()`);
  const seamText = String(seam);
  const seamOk = EXPECT === 'firing' ? seamText !== 'GUARDED' : seamText === 'GUARDED';
  record(`the RUNNING bundle carries the seam this run means to grade (--expect ${EXPECT})`, seamOk, seamText);

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
    return finish();
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
    // Opening re-mounts EditorDocument, and the wrapper lives on the prototype, so it survives —
    // but the counters are reset here so the reading belongs to the driven window only.
    await ev(`(() => { const s = window.__hlt002; s.rejections = 0; s.consoleErrors = 0; s.attempts = 0; s.succeeded = 0; s.failed = 0; s.capturePageCalls = 0; s.states = []; s.samples = []; return 'reset'; })()`);
  }
  const dir = await ev(`(() => ${PROJECT}.instance._retainedProjectDirectory || 'NONE')()`);
  record(
    'the driven project is the copy this drive names',
    path.resolve(String(dir)) === path.resolve(PROJECT_DIR),
    String(dir)
  );

  const overlay = await ev(STRIP_OVERLAY);
  record('no dev-server error overlay is covering the window', String(overlay) === 'none', String(overlay));

  // The `<webview>` exists only once the editor document has mounted one, so this arm is installed
  // here rather than beside the others.
  const capArmed = await ev(ARM_CAPTURE_PAGE);
  record(
    'the capturePage counter is armed — the deterministic half of the control',
    String(capArmed) === 'armed',
    String(capArmed)
  );

  // ═══ 2. DRIVE THE SURFACES ═══
  //
  // The timer is 20 seconds, so every phase below must outlast one tick or it measures nothing.
  // The phases are the three the preview surface actually has (BEN-004 R1), because the app
  // webview is hidden with `visibility: hidden` — NOT unmounted — for two of them, and "hidden but
  // attached" is the state the existing attachment guard cannot see.
  const components = await readJson(`JSON.stringify((() => {
    const p = ${PROJECT}.instance;
    if (!p) return { error: 'NO PROJECT' };
    return { names: (p.getComponents() || []).map((c) => c.fullName).slice(0, 6) };
  })())`);
  record(
    'the project has components to drive',
    Array.isArray(components.names) && components.names.length > 0,
    `${(components.names || []).length} components`
  );
  if (!components.names || !components.names.length) return finish();

  /** Read the counters mid-drive, so each phase's contribution is attributable to that phase. */
  const snapshot = async (label) => {
    const s = await readJson(READ);
    console.log(
      `  [${label}] attempts ${s.attempts} · capturePage calls ${s.capturePageCalls} · succeeded ${s.succeeded} · failed ${s.failed} · rejections ${s.rejections}`
    );
    return s;
  };

  /**
   * 🔴 Switch the preview scope THROUGH THE CONTROL A PERSON USES, and read back what mode the
   * surface ended in.
   *
   * The first version of this drive matched buttons by their visible text ("app", "board"). Every
   * one of those searches found nothing, the editor sat in bench mode for three phases, and the
   * drive reported per-phase figures for phases it had never entered — including a *failed* AC3
   * arm that was measuring the instrument rather than the product. The scope picker is a chip that
   * opens a listbox; the rows do not exist until it is open, and they are addressed by
   * `data-test`, not by their label ([[a-rendered-surface-can-be-behind-a-blocker]]).
   */
  /**
   * 🔴 What mode the surface is ACTUALLY in, read so that the three answers EXCLUDE each other.
   *
   * The first version read only `is-hidden` on the app stage. `hidden` is true in bench mode and
   * in board mode alike, so a board phase whose click never landed read "hidden" and the arm
   * passed — a reading that fits without excluding ([[a-reading-that-fits-is-not-one-that-excludes]]).
   * The board and the bench each mount a component of their own, so their presence is what
   * separates them.
   */
  const readMode = () => ev(`(() => {
    const c = document.querySelector('[data-test="app-preview"]');
    if (!c) return 'NO PREVIEW';
    const hidden = /is-hidden/.test(c.className);
    const board = !!document.querySelector('[data-test="component-board"]');
    const bench = !!document.querySelector('[data-test="bench-stage"], [class*="ComponentBench-module"]');
    if (board) return 'board';
    if (bench) return 'bench';
    return hidden ? 'hidden-but-neither' : 'app';
  })()`);

  const setScope = async (which) => {
    // The rows do not exist until the chip's listbox is open, and the listbox takes a render to
    // appear. Poll for the row rather than sleeping a guessed interval — the first version slept
    // 600ms, missed the row, reported 'NO ROW', and the phase that depended on it still passed.
    let clicked = 'NO ROW';
    for (let attempt = 0; attempt < 5 && clicked !== 'ok'; attempt++) {
      await ev(`(() => {
        const menu = document.querySelector('[data-test="preview-scope-menu"]');
        const chip = document.querySelector('[data-test="preview-scope-chip"]');
        if (!chip) return 'NO CHIP';
        if (!menu) chip.click();
        return 'ok';
      })()`);
      await wait(500);
      clicked = String(
        await ev(`(() => {
          const row = document.querySelector('[data-test="preview-scope-${which}"]');
          if (!row) return 'NO ROW';
          row.click();
          return 'ok';
        })()`)
      );
    }
    await wait(1500);
    return { clicked, mode: String(await readMode()) };
  };

  // ── phase A: the app preview, showing. The capture SHOULD work here — AC3's control. ──
  //
  // 🔴 Put the surface in app mode rather than assuming it is. The scope survives in project state,
  // so a re-run in the same editor session starts wherever the previous run left off: the first
  // version of this drive assumed app mode, ran its "the capture should succeed here" phase in
  // BENCH mode, and reported three failures against a phase it was never in.
  const TICK = 21000;
  console.log('\nphase A — app preview showing (the capture should succeed here)');
  const toAppFirst = await setScope('app');
  record(
    'phase A really is the app preview — the mode is read, not assumed',
    toAppFirst.mode === 'app',
    `${toAppFirst.clicked} → ${toAppFirst.mode}`
  );
  // Re-armed after the switch: the counters must carry this phase's events, not the ones the
  // editor made while it was sitting in whatever mode the last run left it in.
  await ev(
    `(() => { const s = window.__hlt002; s.rejections = 0; s.consoleErrors = 0; s.attempts = 0; s.succeeded = 0; s.failed = 0; s.capturePageCalls = 0; s.states = []; s.samples = []; return 'reset'; })()`
  );
  await wait(TICK * 2);
  const afterApp = await snapshot('app');
  record(
    '🔴 the capture SUCCEEDS while the app preview is showing — the feature works, here, in this run',
    Number(afterApp.succeeded) > 0,
    `${afterApp.succeeded} successful captures, ${afterApp.failed} failed`
  );

  // ── phase B: the bench. `visibility: hidden` on the app stage; the webview stays connected. ──
  console.log('\nphase B — bench mode (app stage hidden with visibility, webview still attached)');
  const benched = await ev(`(() => {
    const { requestBenchMount } = ${WREQ('./src/editor/src/views/VisualCanvas/benchRequest.ts')};
    requestBenchMount(${JSON.stringify(components.names[0])});
    return 'ok';
  })()`);
  await wait(2000);
  const hiddenState = await readJson(`JSON.stringify((() => {
    const c = document.querySelector('[data-test="app-preview"]');
    const v = c && c.querySelector('webview');
    if (!v) return { error: 'NO WEBVIEW' };
    return {
      isConnected: v.isConnected,
      visible: v.checkVisibility ? v.checkVisibility({ visibilityProperty: true, opacityProperty: true }) : null,
      containerClass: c.className
    };
  })())`);
  const benchMode = String(await readMode());
  record(
    '🔴 in bench mode the app webview is STILL ATTACHED but NOT VISIBLE — the state the guard cannot see',
    hiddenState.isConnected === true && hiddenState.visible === false && benchMode === 'bench',
    `mode=${benchMode} isConnected=${hiddenState.isConnected} visible=${hiddenState.visible} ${String(benched)}`
  );
  await wait(TICK * 2);
  const afterBench = await snapshot('bench');

  // ── phase C: the board. Same hiding, a different surface on top of it. ──
  console.log('\nphase C — board mode');
  const toBoard = await setScope('board');
  record(
    'the drive REALLY ENTERED board mode — the board is mounted, not merely "something is hidden"',
    toBoard.mode === 'board',
    `${toBoard.clicked} → ${toBoard.mode}`
  );
  const beforeBoardHold = await readJson(READ);
  await wait(TICK * 2);
  const afterBoard = await snapshot('board');

  // 🔴 THE DETERMINISTIC PAIR. While the stage is hidden the guarded build must not call
  // `capturePage` at all — the rejection is *prevented*, not caught. The unguarded build calls it
  // on every tick, whether or not that particular call happens to reject.
  const callsWhileHidden = Number(afterBoard.capturePageCalls) - Number(beforeBoardHold.capturePageCalls);
  const attemptsWhileHidden = Number(afterBoard.attempts) - Number(beforeBoardHold.attempts);
  if (EXPECT === 'firing') {
    record(
      '🔴 THE CONTROL — the unguarded build DOES call capturePage while the stage is hidden',
      callsWhileHidden > 0,
      `${callsWhileHidden} calls across ${attemptsWhileHidden} ticks`
    );
  } else {
    record(
      '🔴 the guarded build calls capturePage ZERO times while the stage is hidden, having still ticked',
      callsWhileHidden === 0 && attemptsWhileHidden > 0,
      `${callsWhileHidden} calls across ${attemptsWhileHidden} ticks`
    );
  }

  // ── phase D: back to the app. The capture must come back — hiding must not be a one-way door. ──
  console.log('\nphase D — back to the app preview');
  const toApp = await setScope('app');
  record(
    'the drive REALLY RETURNED to the app preview — the stage is showing again',
    toApp.mode === 'app',
    `${toApp.clicked} → ${toApp.mode}`
  );
  const beforeReturn = await readJson(READ);
  await wait(TICK * 2);
  const afterReturn = await snapshot('app again');
  record(
    'AC3 — the capture still SUCCEEDS once the app preview is showing again (the control, in this run)',
    Number(afterReturn.succeeded) > Number(beforeReturn.succeeded),
    `${beforeReturn.succeeded} → ${afterReturn.succeeded} successful captures`
  );

  // ── phase E: the long session AC1 asks for, if this run is the verdict run. ──
  if (MINUTES > 0) {
    const elapsedSoFar = (TICK * 8 + 20000) / 60000;
    const remaining = Math.max(0, MINUTES - elapsedSoFar);
    console.log(`\nphase E — ${remaining.toFixed(1)} more minutes of ordinary use (AC1 asks for ${MINUTES})`);
    const until = Date.now() + remaining * 60000;
    let i = 0;
    while (Date.now() < until) {
      // Ordinary use: switch component, select a node, save, switch preview mode. Every one of
      // these is a thing Richard did in the 42 minutes that produced the 116.
      const name = components.names[i % components.names.length];
      await ev(`(() => {
        const { EventDispatcher } = ${WREQ('./src/shared/utils/EventDispatcher.ts')};
        const c = ${PROJECT}.instance.getComponentWithName(${JSON.stringify('')} + ${JSON.stringify(name)});
        if (c) EventDispatcher.instance.notifyListeners('ComponentPanel.SwitchToComponent', { component: c, pushHistory: false });
        return 'ok';
      })()`);
      await wait(TICK);
      if (i % 3 === 2) {
        await ev(`(() => { const p = ${PROJECT}.instance; if (p && p.save) p.save(); return 'ok'; })()`);
        // A round trip through the hidden modes, on the same control a person uses. This is the
        // half of "ordinary use" that produced the 116 — Richard spent much of his 42 minutes on
        // surfaces that hide the app stage without unmounting it.
        await setScope('board');
        await wait(TICK);
        await setScope('app');
      }
      if (i % 6 === 5) {
        // AC1 asks for "project open/close" specifically, and it is not decoration: closing tears
        // the whole EditorDocument down, and the interval's cleanup and the webview's teardown
        // race with any capture already in flight.
        await ev(`(() => { window.__hltRouter.route({ to: 'projects' }); return 'ok'; })()`);
        await wait(TICK);
        await ev(`(async () => {
          const { LocalProjectsModel } = ${WREQ('./src/editor/src/utils/LocalProjectsModel.ts')};
          const p = await LocalProjectsModel.instance.openProjectFromFolder(${JSON.stringify(PROJECT_DIR)});
          window.__hltRouter.route({ to: 'editor', project: p });
          return 'ok';
        })()`);
        await wait(9000);
      }
      i++;
      await snapshot(`minute ${((Date.now() - (until - remaining * 60000)) / 60000 + elapsedSoFar).toFixed(1)}`);
    }
  }

  // ═══ 3. READ THE COUNT ═══
  const state = await readJson(READ);
  console.log(
    `\ncapture attempts: ${state.attempts} (succeeded ${state.succeeded}, failed ${state.failed}) · capturePage calls: ${state.capturePageCalls}`
  );
  console.log(`driven UNHANDLED REJECTIONS matching "${NEEDLE}": ${state.rejections}`);
  console.log(`console.error events matching "${NEEDLE}": ${state.consoleErrors}`);
  if (state.samples && state.samples.length) console.log(`sample: ${state.samples[0]}`);
  if (state.states && state.states.length) {
    console.log('\nwhat the webview WAS at each failure (the mechanism arm):');
    for (const s of state.states) console.log(`  ${JSON.stringify(s)}`);
  }
  console.log(
    `\nper phase — app ${afterApp.rejections} · bench ${afterBench.rejections} · board ${afterBoard.rejections} · app again ${afterReturn.rejections} (cumulative)`
  );

  // 🔴 Only the lines written SINCE this drive began. A `--expect firing` run earlier in the same
  // session leaves exactly the line counted here.
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
  console.log(`log lines matching, written SINCE this drive began (lines ≠ events): ${sinceStart}`);

  // 🔴 THE REACH ARM. Graded in both directions: a drive that never called the capture at all is
  // the easiest false pass available here.
  record(
    '🔴 the drive REACHED the capture — it ran on the timer during this session',
    Number(state.attempts) > 0,
    `${state.attempts} attempts`
  );

  if (EXPECT === 'firing') {
    // ⚠️ RECORDED, NOT GRADED — and this is the honest thing to do with it.
    //
    // Whether a hidden webview's capture *rejects* depends on whether Chromium still holds a
    // surface for it. Two runs of this drive against the identical unguarded build read **7** and
    // **0**. A signal that fires only sometimes cannot grade anything, in either direction: it
    // would fail an unguarded run that happened to keep its surface, and a later reader would
    // take that for evidence the defect was gone. The graded control is the capturePage-calls
    // arm above, which is deterministic. This number is kept beside it as the product-level
    // reading ([[a-reading-that-fits-is-not-one-that-excludes]]).
    record(
      'the rejection count on the unguarded build (RECORDED, not graded — it is surface-dependent)',
      null,
      `${state.rejections} rejections`
    );
  } else {
    record(
      'AC1 — the driven session logs ZERO UnknownVizError rejections',
      Number(state.rejections) === 0,
      `${state.rejections} rejections`
    );
    record(
      'and the log written since this drive began carries none either',
      sinceStart === 0,
      `${sinceStart} log lines`
    );
    // 🔴 AC4 — silence is not the criterion. A fix that made the rejection into a console.error
    // would pass the arm above and have moved the defect rather than cured it.
    record(
      'AC4 — the cure is not a move: no console.error carries it either',
      Number(state.consoleErrors) === 0,
      `${state.consoleErrors} console errors`
    );
  }

  return finish();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
