#!/usr/bin/env node
/**
 * TVW-008 — the board. The drive AC1, AC3, AC4, AC5, AC6 and AC7 all wait on.
 *
 * Slices 1 and 2 are built and gated offline (102 specs, 12 mutants). Six ACs are open and every
 * one of them names something only a running editor can answer, including the two mechanisms §9.2
 * flags as **argued and not measured**: that a `parameterChanged` on a Group's `marginLeft` moves a
 * rendered frame at all, and that `react-rnd` drags at the right rate inside a scaled document.
 *
 * ## The instrument lessons this is built on — every one paid for by a failed arm
 *
 * 🔴 **`ed.selector.selection` DOES NOT EXIST; it is `_selected`, an Array** (s25). Any reader here
 * that reports an absence is armed with a known-firing control first.
 * 🔴 **`RECT ≠ VISIBLE` and a rendered surface can be behind a blocker** — frames are hit-tested
 * with `elementFromPoint`, never `querySelector` alone, because §9.1 makes the frame body
 * `pointer-events: none` on purpose and a press aimed at one lands on whatever is under it.
 * 🔴 **Grade `boxedRows > 0`, never presence** (s25): 18 rows with every rect `0 × 0` read as "not
 * in the panel" three separate times.
 * 🔴 **A theme flip does not apply in the same eval.**
 *
 * ## AC5 is the arm with a trap in it
 *
 * FIX-011's rule is *a drag never writes*, and the subject is `project.json`'s mtime. The trap is
 * that the autosave is **debounced ~1s** (`scheduleProjectSave`), so an mtime read immediately
 * after mouse-up reads *unchanged* and would grade a write-through drag GREEN. The arm therefore
 * waits past the debounce on BOTH sides, and the control is the release: unchanged across 200
 * moves **and then changed once**, together. Either half alone passes for the wrong reason
 * ([[a-rule-reading-zero-in-both-arms-grades-nothing]]).
 *
 *   node scripts/devtools/drive-tvw008-board.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { appTarget, connect, evaluate } = require('./cdp.js');

/** The raw CDP target list — `appTarget` cannot express "the sandbox, not the app preview". */
function httpTargets() {
  return new Promise((resolve, reject) => {
    require('http')
      .get('http://127.0.0.1:9222/json/list', (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', reject);
  });
}

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const has = (n) => argv.includes(`--${n}`);

const PROJECT_DIR = opt('dir', '/Users/richardosborne/vscode_projects/NodeGX test projects/TVW-008 s26 Board');
const SHOTS = opt('shots', path.join(__dirname, '../../dev-docs/tasks/phase-93-three-views-of-one-app/verdicts/tvw-008'));

const PRIMARY = '/Buttons/Primary Button';
const SECONDARY = '/Buttons/Secondary Button';
const GHOST = '/Buttons/Ghost Button';
const PICKS = [PRIMARY, SECONDARY, GHOST];

/** What the fixture claims, restated here so a drive against the wrong project fails loudly. */
const EXPECT = {
  [PRIMARY]: { width: 768, height: null, scenario: 'Checkout', instances: 2, text: 'Continue to checkout' },
  [SECONDARY]: { width: 320, height: 180, scenario: null, instances: 1, text: 'Button' },
  [GHOST]: { width: 768, height: null, scenario: null, instances: 1, text: 'Button' }
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const arms = [];
const record = (name, ok, detail) => {
  arms.push({ name, ok, detail });
  console.log(`  ${ok === null ? '??' : ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const BOOT = `(() => { if (typeof window.__wreq !== 'function' && typeof webpackChunknoodl_editor !== 'undefined') { webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]); } })();`;
const WREQ = (p) => `window.__wreq(${JSON.stringify(p)})`;
const PROJECT = `${WREQ('./src/editor/src/models/projectmodel.ts')}.ProjectModel`;

async function readJson(client, expression) {
  const raw = await evaluate(client, expression);
  try {
    return JSON.parse(String(raw));
  } catch (error) {
    throw new Error(`not JSON: ${String(raw).slice(0, 400)}`);
  }
}

/** 🔴 Whose editor is on 9222. Fails CLOSED — an owner you cannot name is not an absent one. */
function walkToCli(startPid) {
  const sh = (cmd) => {
    try {
      return execSync(cmd, { encoding: 'utf8' }).trim();
    } catch (error) {
      return '';
    }
  };
  let p = String(startPid);
  for (let i = 0; i < 40; i++) {
    const args = sh(`ps -o args= -p ${p}`);
    if (/anthropic\.claude-code.*\/claude/.test(args)) return String(p);
    const pp = sh(`ps -o ppid= -p ${p}`);
    if (!pp || pp === '1' || pp === p) break;
    p = pp;
  }
  return null;
}

function ownerOfPort9222() {
  let pid = '';
  try {
    pid = execSync('lsof -nP -iTCP:9222 -sTCP:LISTEN -t', { encoding: 'utf8' }).trim().split('\n')[0];
  } catch (error) {
    pid = '';
  }
  if (!pid) return { pid: null, owner: null };
  return { pid, owner: walkToCli(pid) };
}

// ── readers ───────────────────────────────────────────────────────────────────────────────────

/**
 * Every frame on the board, with the box a PERSON sees.
 *
 * 🔴 `hit` is `elementFromPoint` at the caption's centre, resolved back up to the frame it belongs
 * to. §9.1 makes the frame body `pointer-events: none` so a click can reach the `<webview>`, which
 * means a rect is emphatically not a press target here — the caption is.
 */
const READ_FRAMES = `JSON.stringify((() => {
  const board = document.querySelector('[data-test="component-board"]');
  if (!board) return { board: false, frames: [] };
  const frames = Array.from(document.querySelectorAll('[data-test^="board-frame-"]')).map((el) => {
    const r = el.getBoundingClientRect();
    const cap = el.querySelector('[data-test^="board-caption-"]');
    const cr = cap ? cap.getBoundingClientRect() : null;
    let hit = null;
    if (cr && cr.width > 0 && cr.height > 0) {
      const at = document.elementFromPoint(Math.round(cr.left + cr.width / 2), Math.round(cr.top + cr.height / 2));
      const owner = at && at.closest ? at.closest('[data-test^="board-frame-"]') : null;
      hit = owner ? owner.getAttribute('data-test') : at ? (at.getAttribute('data-test') || at.tagName) : null;
    }
    return {
      test: el.getAttribute('data-test'),
      target: el.getAttribute('data-test').replace(/^board-frame-/, ''),
      left: Math.round(r.left), top: Math.round(r.top),
      width: Math.round(r.width), height: Math.round(r.height),
      caption: cap ? cap.textContent.replace(/\\s+/g, ' ').trim() : null,
      captionRect: cr ? { left: Math.round(cr.left), top: Math.round(cr.top), width: Math.round(cr.width), height: Math.round(cr.height) } : null,
      hit
    };
  });
  const empty = document.querySelector('[data-test="board-empty"]');
  const strip = document.querySelector('[data-test="preview-strip"]');
  return {
    board: true,
    empty: empty ? empty.textContent.replace(/\\s+/g, ' ').trim() : null,
    strip: strip ? strip.textContent.replace(/\\s+/g, ' ').trim() : null,
    frames
  };
})())`;

/** AC6's subject, and TVW-002's negative arm re-run: the app preview's route and mode. */
const READ_PREVIEW = `JSON.stringify((() => {
  const bg = document.querySelector('[data-preview-mode]');
  const w = document.querySelector('[data-test="app-preview"] webview');
  return {
    mode: bg ? bg.getAttribute('data-preview-mode') : null,
    src: w ? (typeof w.getURL === 'function' ? (() => { try { return w.getURL(); } catch (e) { return w.src; } })() : w.src) : null
  };
})())`;

/** `bench.board` as it stands in the live model — the fact AC1's persistence clause is about. */
const READ_BOARD_META = `JSON.stringify((() => {
  const p = ${PROJECT}.instance;
  if (!p) return null;
  const stored = p.getMetaData('bench.board');
  return stored || null;
})())`;

async function shoot(client, name) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const { data } = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const file = path.join(SHOTS, `${name}.png`);
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  console.log(`      shot ${file}`);
  return file;
}

/** A real press, at a point, through the input pipeline the product's own handlers listen on. */
async function press(client, x, y) {
  for (const type of ['mousePressed', 'mouseReleased']) {
    await client.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1, buttons: type === 'mousePressed' ? 1 : 0 });
  }
}

const projectJson = () => path.join(PROJECT_DIR, 'project.json');
const mtime = () => {
  try {
    return fs.statSync(projectJson()).mtimeMs;
  } catch (error) {
    return null;
  }
};

/**
 * Read the text a `<webview>` is actually drawing, with a BOUND on every step.
 *
 * 🔴 **Run 2 hung here for good.** The drive connected to the viewer once and reused that client
 * after benching a component — but benching reloads the window, which destroys the CDP target, and
 * `evaluate` on a dead target never resolves and never rejects. The drive sat with eleven arms
 * recorded and no way to finish. `connect()` has no timeout either, so both halves need one.
 *
 * So each read attaches a FRESH client to whatever target is serving the preview now, and every
 * await is raced against a deadline. A viewer that cannot be read is reported as such — never
 * silently treated as a viewer that drew nothing, which would fail AC4 for the wrong reason.
 */
async function readViewerTexts(label) {
  const bound = (promise, ms, what) =>
    Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${what} did not answer in ${ms}ms`)), ms))]);
  let client = null;
  try {
    /**
     * 🔴 **THE EDITOR HAS TWO `<webview>`s, and `appTarget('viewer')` returns whichever matches
     * first.** Listed live: `http://localhost:8574/` (the **app preview**, titled after the page)
     * and `http://localhost:8574/?noodl-sandbox=<id>&…` (the **sandbox** the bench and the board
     * both mount). Drive 5 read the right one twice by luck; a follow-up probe asking the same
     * question got the app's page back — `Continue | Save draft | Button` — and would have failed
     * AC4 against a window that was never its subject. The sandbox is picked BY ITS URL, and its
     * absence is reported rather than silently read as "the bench drew nothing"
     * ([[cdp-attaches-to-whoever-holds-9222]], one level in).
     */
    const targets = await bound(httpTargets(), 10000, 'the target list');
    const sandbox = targets.find((t) => t.type === 'webview' && String(t.url).includes('noodl-sandbox='));
    if (!sandbox) throw new Error('no sandbox webview is listed — the bench/board window is not up');
    client = await bound(connect(sandbox), 20000, 'the sandbox target');
    await wait(1200);
    const drawn = await bound(
      evaluate(client, `JSON.stringify((() => { const t = Array.from(document.querySelectorAll('div,span,p')).map((el) => (el.children.length === 0 ? el.textContent.trim() : '')).filter(Boolean); return { texts: Array.from(new Set(t)).slice(0, 60), url: location.href }; })())`),
      20000,
      'the viewer read'
    );
    return { ok: true, ...JSON.parse(String(drawn)) };
  } catch (error) {
    record(`instrument: the preview webview is readable (${label})`, false, error.message);
    return { ok: false, texts: [] };
  } finally {
    try {
      if (client && typeof client.close === 'function') client.close();
    } catch (error) {
      /* a socket that will not close is not a result */
    }
  }
}

async function main() {
  console.log(`TVW-008 — the board. project: ${PROJECT_DIR}\n`);

  if (!fs.existsSync(projectJson())) {
    console.error(`UNGRADABLE: no fixture at ${projectJson()}. Run scripts/devtools/tvw008-board-fixture.js first.`);
    process.exit(2);
  }

  const { pid: electronPid, owner } = ownerOfPort9222();
  const mine = walkToCli(process.pid);
  if (!electronPid) {
    console.error('UNGRADABLE: nothing is listening on 9222 — no editor to drive.');
    process.exit(2);
  }
  if (!owner || !mine) {
    console.error(`REFUSING: could not attribute the editor on 9222 (pid ${electronPid}) — owner=${owner || 'unknown'}, self=${mine || 'unknown'}. An unattributable owner is NOT an absent one.`);
    process.exit(2);
  }
  if (owner !== mine) {
    console.error(`REFUSING: the editor on 9222 (pid ${electronPid}) belongs to session ${owner}, not this one (${mine}).`);
    process.exit(2);
  }
  record('the editor on 9222 belongs to this session', true, `electron ${electronPid}, owner ${owner}`);

  const editor = await connect(await appTarget('editor'));
  for (const [method, params] of [
    ['Page.setWebLifecycleState', { state: 'active' }],
    ['Emulation.setFocusEmulationEnabled', { enabled: true }]
  ]) {
    try {
      await editor.send(method, params);
    } catch (error) {
      console.log(`(${method} failed: ${error.message})`);
    }
  }
  await editor.send('Emulation.setDeviceMetricsOverride', { width: 1760, height: 1200, deviceScaleFactor: 2, mobile: false });
  await wait(1200);
  /**
   * 🔴 **BOOT has to be RETRIED, not called once.** `webpackChunknoodl_editor` does not exist until
   * the bundle has evaluated, so a drive that starts shortly after a renderer reload runs BOOT
   * against a page that has not got there yet — `__wreq` stays undefined and the next read dies
   * with *"window.__wreq is not a function"*, forty lines later and looking nothing like the cause.
   * Bounded, so a renderer that never arrives is a refusal rather than a hang.
   */
  let booted = false;
  for (let attempt = 0; attempt < 30 && !booted; attempt++) {
    await evaluate(editor, BOOT);
    booted = String(await evaluate(editor, `(() => typeof window.__wreq === 'function')()`)) === 'true';
    if (!booted) await wait(1000);
  }
  record('instrument: the editor bundle is evaluated and reachable (__wreq)', booted, booted ? 'ok' : 'gave up after 30s');
  if (!booted) {
    console.error('UNGRADABLE: the renderer never finished loading its bundle.');
    process.exit(2);
  }

  const raf = await readJson(editor, `new Promise((res) => { let n = 0; const t = () => { n++; if (n < 3) requestAnimationFrame(t); }; requestAnimationFrame(t); setTimeout(() => res(JSON.stringify({ frames: n, hidden: document.hidden })), 900); })`);
  record('instrument: the window is awake and rAF fires', raf.frames >= 2, `frames=${raf.frames}`);
  if (!(raf.frames >= 2)) process.exit(2);

  // --- the project -----------------------------------------------------------------------------
  const router = await evaluate(editor, `(() => {
    if (window.__tvw008Router) return 'ok';
    const root = document.getElementById('root');
    let f = root[Object.keys(root).find((k) => k.startsWith('__reactContainer'))];
    let depth = 0;
    while (f && depth < 40) {
      const pr = f.memoizedProps;
      if (pr && pr.route && pr.route.router && typeof pr.route.router.route === 'function') { window.__tvw008Router = pr.route.router; break; }
      f = f.child; depth++;
    }
    return window.__tvw008Router ? 'ok' : 'NO ROUTER';
  })()`);
  if (String(router) !== 'ok') {
    record('the editor router was found', false, String(router));
    process.exit(2);
  }

  const already = await evaluate(editor, `(() => { const p = ${PROJECT}.instance; return (p && p._retainedProjectDirectory) || 'NONE'; })()`);
  if (path.resolve(String(already)) !== path.resolve(PROJECT_DIR)) {
    console.log(`opening ${PROJECT_DIR} (editor had ${already})`);
    await evaluate(editor, `(() => { window.__tvw008Router.route({ to: 'projects' }); return 'ok'; })()`);
    await wait(1500);
    await evaluate(editor, `(async () => {
      const { LocalProjectsModel } = ${WREQ('./src/editor/src/utils/LocalProjectsModel.ts')};
      const p = await LocalProjectsModel.instance.openProjectFromFolder(${JSON.stringify(PROJECT_DIR)});
      window.__tvw008Router.route({ to: 'editor', project: p });
      return 'ok';
    })()`);
    await wait(14000);
  }
  const dir = await evaluate(editor, `(() => ${PROJECT}.instance ? (${PROJECT}.instance._retainedProjectDirectory || 'NONE') : 'NONE')()`);
  record('the driven project is the fixture this drive names', path.resolve(String(dir)) === path.resolve(PROJECT_DIR), String(dir));
  if (path.resolve(String(dir)) !== path.resolve(PROJECT_DIR)) process.exit(2);

  const comps = await readJson(editor, `JSON.stringify(${PROJECT}.instance.getComponents().map((c) => c.name))`);
  record('the fixture carries the three buttons AC1 compares', PICKS.every((p) => comps.includes(p)), `${comps.length} components`);

  await wait(2500);
  await evaluate(editor, `(() => { const d = document.querySelector('[data-test="preview-strip-dismiss"]'); if (d) { d.click(); return 'dismissed'; } return 'none'; })()`);
  await wait(500);

  // 🔴 AC6's baseline, read BEFORE anything is pressed. A negative arm with no before is not an arm.
  const previewBefore = await readJson(editor, READ_PREVIEW);
  const previewReadable = !!previewBefore.src && !!previewBefore.mode;
  record('instrument: the app preview is running and readable', previewReadable, `mode=${previewBefore.mode} src=${String(previewBefore.src).slice(-48)}`);
  /**
   * 🔴 **REFUSE rather than grade 25 arms against a surface that is not there.**
   *
   * The first run of this drive reported `mode=null src=null` and then went on to record every
   * later arm as a FAIL — including AC6's negative arm as a **PASS**, because `null === null`.
   * That is [[a-rule-reading-zero-in-both-arms-grades-nothing]] in its purest form: an arm whose
   * two sides are both absent grades nothing, and it was the only green in a run whose subject had
   * crashed. The cause was real and is now fixed (`applyInspectScript` — a `.catch()` on a
   * synchronous throw unmounted the whole preview), which is exactly why this drive must stop here
   * instead of producing a scorecard about it.
   */
  if (!previewReadable) {
    console.error('\nUNGRADABLE: the app preview is not in the DOM, so nothing below is about the board.');
    console.error('  Check the dev-stack log for an <ComponentBoard> error boundary message.');
    process.exit(2);
  }

  // --- AC1 step 1: the board segment, and the empty state ---------------------------------------
  const openBoard = async () => {
    await evaluate(editor, `(() => { const c = document.querySelector('[data-test="preview-scope-chip"]'); if (c) c.click(); return 'ok'; })()`);
    await wait(700);
    const r = await evaluate(editor, `(() => { const b = document.querySelector('[data-test="preview-scope-board"]'); if (!b) return 'NO BOARD SEGMENT'; b.click(); return 'ok'; })()`);
    await wait(1800);
    return String(r);
  };

  const opened = await openBoard();
  record('the chooser offers a third segment, and it opens the board', opened === 'ok', opened);

  let view = await readJson(editor, READ_FRAMES);
  record('AC1 — the board opens on the empty state, not an error', view.board && view.frames.length === 0 && /Put components side by side/.test(String(view.empty)), `empty=${String(view.empty).slice(0, 80)}`);
  await shoot(editor, 'ac7-01-empty-board');

  // --- AC1 step 2: pick three ------------------------------------------------------------------
  await evaluate(editor, `(() => { const b = document.querySelector('[data-test="board-empty-add"]') || document.querySelector('[data-test="board-add"]'); if (b) b.click(); return 'ok'; })()`);
  await wait(600);
  const pickerUp = await readJson(editor, `JSON.stringify((() => {
    const p = document.querySelector('[data-test="board-picker"]');
    if (!p) return { picker: false };
    const r = p.getBoundingClientRect();
    const rows = Array.from(p.querySelectorAll('[data-test^="board-pick-"]'));
    const boxed = rows.filter((el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; });
    return { picker: true, w: Math.round(r.width), h: Math.round(r.height), rows: rows.length, boxedRows: boxed.length, addAll: !!p.querySelector('[data-test="board-add-all"]') };
  })())`);
  // 🔴 boxedRows, never presence — s25's `0 × 0` tree cost three arms.
  record('the picker is open and has rows a person could press', pickerUp.picker && pickerUp.boxedRows > 0, `${pickerUp.w}×${pickerUp.h} rows=${pickerUp.rows} boxed=${pickerUp.boxedRows} addAll=${pickerUp.addAll}`);
  record('AC2 (surface half) — `Add all` is offered: the fixture has 5 components, under the 12 bound', pickerUp.addAll === true, `addAll=${pickerUp.addAll}`);

  for (const target of PICKS) {
    const r = await evaluate(editor, `(() => { const b = document.querySelector('[data-test="board-pick-${target}"]'); if (!b) return 'NO ROW'; b.click(); return 'ok'; })()`);
    if (String(r) !== 'ok') record(`picked ${target}`, false, String(r));
    await wait(500);
  }
  await evaluate(editor, `(() => { const b = document.querySelector('[data-test="board-add"]'); if (b) b.click(); return 'ok'; })()`);
  await wait(2600);

  view = await readJson(editor, READ_FRAMES);
  record('AC1 — three picks draw three frames', view.frames.length === 3, `frames=${view.frames.map((f) => f.target).join(', ')}`);

  const overlaps = [];
  for (let i = 0; i < view.frames.length; i++) {
    for (let j = i + 1; j < view.frames.length; j++) {
      const a = view.frames[i];
      const b = view.frames[j];
      if (a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height) {
        overlaps.push(`${a.target} ∩ ${b.target}`);
      }
    }
  }
  record('AC1 — they land side by side, none overlapping', view.frames.length === 3 && overlaps.length === 0, overlaps.length ? overlaps.join('; ') : 'no pair intersects');

  // 🔴 RECT ≠ REACHABLE. §9.1 makes the frame body pointer-transparent on purpose; the caption is
  // the handle AND the door, so the caption is what must hit-test to its own frame.
  const mishits = view.frames.filter((f) => f.hit !== f.test);
  record('the caption of each frame hit-tests to THAT frame (§9.1, the handle and the door)', view.frames.length === 3 && mishits.length === 0, mishits.length ? mishits.map((f) => `${f.target}→${f.hit}`).join('; ') : 'all three');

  // --- AC3 / AC4: the boxes and the captions ----------------------------------------------------
  for (const target of PICKS) {
    const f = view.frames.find((x) => x.target === target);
    const want = EXPECT[target];
    if (!f) {
      record(`AC3 — ${target} has a frame`, false, 'absent');
      continue;
    }
    // The caption is the one place the authored size is stated; the measured box is what a person
    // compares. Both are read, and the caption's own size clause is what AC3 names.
    const capSize = /(\d+)\s*×\s*(\d+|auto)/.exec(f.caption || '');
    record(`AC3 — ${target}: the caption states a size`, !!capSize, `caption="${f.caption}"`);
    record(`AC4 — ${target}: the caption says where its values came from`,
      want.scenario ? (f.caption || '').includes(`scenario: ${want.scenario}`) : (f.caption || '').includes('no inputs set'),
      `expected ${want.scenario ? `scenario: ${want.scenario}` : 'no inputs set'}`);
    record(`AC3 — ${target}: the caption states how many times it is placed`, (f.caption || '').includes(`×${want.instances}`), `expected ×${want.instances} in "${f.caption}"`);
  }

  const capRects = view.frames.map((f) => f.captionRect).filter(Boolean);
  const capOverlaps = [];
  for (let i = 0; i < capRects.length; i++) {
    for (let j = i + 1; j < capRects.length; j++) {
      const a = capRects[i];
      const b = capRects[j];
      if (a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height) capOverlaps.push(`${i}∩${j}`);
    }
  }
  record('AC3 — captions do not overlap at the opening zoom', capOverlaps.length === 0, capOverlaps.join(', ') || 'none');

  await shoot(editor, 'ac7-02-three-frames-before');

  // --- AC4: what the RUNTIME actually drew ------------------------------------------------------
  // 🔴 The caption saying `scenario: Checkout` is the editor's claim ABOUT the export. What AC4
  // asks is whether the scenario reached the screen — which lives inside the <webview>, a separate
  // target. [[verify-the-consequence-not-just-the-mechanism]].
  const drawn = await readViewerTexts('the board');
  if (drawn.ok) {
    const seen = drawn.texts.join(' | ');
    record('AC4 🔴 — the scenario REACHED THE SCREEN: Primary draws its scenario value, not its own default',
      drawn.texts.includes(EXPECT[PRIMARY].text), `looking for "${EXPECT[PRIMARY].text}" in: ${seen.slice(0, 220)}`);
    record('AC4 — a component with no scenario draws its own value',
      drawn.texts.includes('Button'), `looking for "Button" in: ${seen.slice(0, 160)}`);
  }

  // --- AC5: a drag writes nothing until mouse-up ------------------------------------------------
  const before = view.frames.slice().sort((a, b) => a.left - b.left);
  const middle = before[1];
  record('AC5 — a middle frame to drag', !!middle, middle ? middle.target : 'none');

  let ac5 = { skipped: true };
  if (middle && middle.captionRect) {
    const from = { x: Math.round(middle.captionRect.left + middle.captionRect.width / 2), y: Math.round(middle.captionRect.top + middle.captionRect.height / 2) };
    const to = { x: from.x - 260, y: from.y + 360 };

    // 🔴 Past the ~1s autosave debounce on BOTH sides, or "unchanged" is just "too soon".
    await wait(2500);
    const m0 = mtime();
    const metaBefore = await readJson(editor, READ_BOARD_META);
    const storedBefore = metaBefore && metaBefore.frames ? metaBefore.frames.find((f) => f.target === middle.target) : null;

    await editor.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: from.x, y: from.y, button: 'left', clickCount: 1, buttons: 1 });
    const STEPS = 200;
    for (let i = 1; i <= STEPS; i++) {
      const x = Math.round(from.x + ((to.x - from.x) * i) / STEPS);
      const y = Math.round(from.y + ((to.y - from.y) * i) / STEPS);
      await editor.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1 });
    }
    await wait(2500); // past the debounce, still holding the button down
    const mMid = mtime();
    const midView = await readJson(editor, READ_FRAMES);
    const moving = midView.frames.find((f) => f.target === middle.target);
    /**
     * 🔴 **`project.json`'s mtime alone ATTRIBUTES NOTHING.** This editor writes that file for
     * reasons that have nothing to do with the board — `projectmodel.ts:1760` logged *"Project
     * saved"* twice during the open — so an mtime that moved during a drag is a coincidence until
     * something ties it to the drag ([[a-url-filtered-capture-attributes-nothing-to-a-producer]]).
     *
     * The producer FIX-011's rule is about is `setMetaData('bench.board', …)`, because that is the
     * call that reaches `scheduleProjectSave()`. So the subject is the stored coordinate: if
     * `bench.board` still holds the PRE-drag position while the frame is visibly elsewhere under
     * the cursor, the drag has written nothing, whatever the file's mtime did.
     */
    const metaMid = await readJson(editor, READ_BOARD_META);
    const storedMid = metaMid && metaMid.frames ? metaMid.frames.find((f) => f.target === middle.target) : null;

    await editor.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: to.x, y: to.y, button: 'left', clickCount: 1, buttons: 0 });
    await wait(3000); // past the debounce again, now on the other side of the release
    const mAfter = mtime();
    const metaAfter = await readJson(editor, READ_BOARD_META);

    ac5 = { skipped: false, m0, mMid, mAfter, movedLive: moving ? { left: moving.left, top: moving.top } : null, from, to };

    const storedAfter = metaAfter && metaAfter.frames ? metaAfter.frames.find((f) => f.target === middle.target) : null;
    const movedInStore = !!(storedMid && storedAfter) && (storedMid.x !== storedAfter.x || storedMid.y !== storedAfter.y);

    record('AC5 🔴 — 200 intermediate moves write NOTHING to `bench.board` (the call that schedules the save)',
      !!storedMid && !!storedBefore && storedMid.x === storedBefore.x && storedMid.y === storedBefore.y,
      `stored ${storedBefore ? `${storedBefore.x},${storedBefore.y}` : '?'} → ${storedMid ? `${storedMid.x},${storedMid.y}` : '?'} while the frame was visibly elsewhere`);
    record('AC5 🔴 — and the RELEASE commits, once (the control without which the half above grades nothing)',
      movedInStore, `stored ${storedMid ? `${storedMid.x},${storedMid.y}` : '?'} → ${storedAfter ? `${storedAfter.x},${storedAfter.y}` : '?'}`);
    // Kept as an OBSERVATION, deliberately not an arm: this file has other writers.
    console.log(`      (project.json mtime, for the record: ${m0} → ${mMid} → ${mAfter}${mMid !== m0 ? ' — moved mid-drag, but see the attribution note above' : ''})`);
    record('§9.2 🔴 — the frame MOVED under the cursor while the button was down (argued at s23, measured here)',
      !!moving && (Math.abs(moving.left - middle.left) > 40 || Math.abs(moving.top - middle.top) > 40),
      moving ? `${middle.left},${middle.top} → ${moving.left},${moving.top}` : 'frame not found mid-drag');

    await wait(600);
    await shoot(editor, 'ac7-03-three-frames-after-rearrange');
  }

  // --- AC1: the arrangement survives a scope round trip ------------------------------------------
  const afterDrop = await readJson(editor, READ_FRAMES);
  const droppedAt = afterDrop.frames.find((f) => f.target === (middle && middle.target));
  const storedAfterDrop = await readJson(editor, READ_BOARD_META);
  record('AC1 — the drop is written to `bench.board` as project state', !!(storedAfterDrop && Array.isArray(storedAfterDrop.frames) && storedAfterDrop.frames.length === 3), JSON.stringify(storedAfterDrop).slice(0, 180));

  await evaluate(editor, `(() => { const c = document.querySelector('[data-test="preview-scope-chip"]'); if (c) c.click(); return 'ok'; })()`);
  await wait(600);
  await evaluate(editor, `(() => { const a = document.querySelector('[data-test="preview-scope-app"]'); if (a) a.click(); return 'ok'; })()`);
  await wait(2200);
  const onApp = await readJson(editor, READ_FRAMES);
  record('the board is gone while the scope is App', onApp.board === false || onApp.frames.length === 0, `board=${onApp.board}`);

  await openBoard();
  await wait(2200);
  const backOnBoard = await readJson(editor, READ_FRAMES);
  const backFrame = backOnBoard.frames.find((f) => f.target === (middle && middle.target));
  /**
   * 🔴 **The subject is the ARRANGEMENT, not the screen pixel — my first arm graded the wrong one.**
   *
   * Run 2 failed this with `984,520 → 1124,340` and the frame had not moved at all: `bench.board`
   * held the identical `{x:696, y:180}` on both sides. What changed was the board's **viewport** —
   * zoom and pan are session state and reset to `DEFAULT_BOARD_VIEWPORT` when the surface
   * remounts, so every frame's screen position shifts together while their relationship to each
   * other is untouched. A raw screen comparison cannot tell "the frame moved" from "the camera
   * moved", and AC1's sentence is about the first ([[a-control-pair-proves-what-you-varied-only]]).
   *
   * So it is graded twice, on the two facts that actually carry the sentence: the STORED
   * coordinate is identical, and the frame's OFFSET FROM ITS NEIGHBOURS is identical.
   */
  const storedBack = await readJson(editor, READ_BOARD_META);
  const findStored = (meta, target) => (meta && meta.frames ? meta.frames.find((f) => f.target === target) : null);
  const beforeStored = findStored(storedAfterDrop, middle && middle.target);
  const afterStored = findStored(storedBack, middle && middle.target);
  record('AC1 🔴 — switch to App and back: the frame is where it was dropped (the stored arrangement)',
    !!(beforeStored && afterStored) && beforeStored.x === afterStored.x && beforeStored.y === afterStored.y,
    beforeStored && afterStored ? `stored ${beforeStored.x},${beforeStored.y} → ${afterStored.x},${afterStored.y}` : 'missing');

  const relative = (frames, target) => {
    const me = frames.find((f) => f.target === target);
    const other = frames.find((f) => f.target !== target);
    return me && other ? { dx: me.left - other.left, dy: me.top - other.top } : null;
  };
  const relBefore = relative(afterDrop.frames, middle && middle.target);
  const relAfter = relative(backOnBoard.frames, middle && middle.target);
  record('AC1 — and it is still in the same place RELATIVE to the other frames on screen',
    !!(relBefore && relAfter) && Math.abs(relBefore.dx - relAfter.dx) <= 4 && Math.abs(relBefore.dy - relAfter.dy) <= 4,
    relBefore && relAfter ? `offset ${relBefore.dx},${relBefore.dy} → ${relAfter.dx},${relAfter.dy}` : 'missing');
  // Recorded because it is the thing that MOVED, and a reader of the shots will see it.
  console.log(`      (the board's viewport resets on remount: screen ${droppedAt ? `${droppedAt.left},${droppedAt.top}` : '?'} → ${backFrame ? `${backFrame.left},${backFrame.top}` : '?'} — zoom/pan are session state, not project state)`);

  // --- AC6: the app preview never moved ----------------------------------------------------------
  /**
   * 🔴 **`[data-preview-mode]` is the SCOPE's mode, not the app's — my arm read the wrong element.**
   *
   * Run 2 failed AC6 with `mode app→board`, which is the drive doing exactly what AC1 told it to:
   * pressing the board segment MAKES the scope read `board`. TVW-002's negative arm is about the
   * **app preview** — that looking at something else never navigates the running app — and the
   * fact that carries it is the app window's URL. The mode attribute answers a different question
   * ([[a-client-property-read-as-a-fact-about-the-source]]).
   */
  await evaluate(editor, `(() => { const c = document.querySelector('[data-test="preview-scope-chip"]'); if (c) c.click(); return 'ok'; })()`);
  await wait(500);
  await evaluate(editor, `(() => { const a = document.querySelector('[data-test="preview-scope-app"]'); if (a) a.click(); return 'ok'; })()`);
  await wait(2200);
  const previewAfter = await readJson(editor, READ_PREVIEW);
  // 🔴 `previewReadable` is carried into the arm itself, not just checked above: an equality over
  // two nulls is not a negative result, it is an absent measurement.
  record('AC6 🔴 — the app preview is on the same ROUTE it started on, after every step above',
    previewReadable && !!previewAfter.src && previewAfter.src === previewBefore.src,
    `src ${String(previewBefore.src)} → ${String(previewAfter.src)}`);
  record('AC6 — and the scope came back to App, so the arm above is about a preview that is actually showing',
    previewAfter.mode === previewBefore.mode, `mode ${previewBefore.mode} → ${previewAfter.mode}`);

  // --- AC4's other half + AC7's benched shot -----------------------------------------------------
  const openTarget = PRIMARY;
  /**
   * ⚠️ **Back to the board first — the AC6 arm above deliberately left the scope on App.**
   *
   * Run 4 failed the next two arms with `chip="App"` and a viewer showing `Continue | Save draft`
   * (the app's own page), because the press went looking for `board-open-…` on a surface that was
   * not mounted. Neither failure was about the product: the drive had moved the scope for AC6's
   * sake and then asked the board a question. An arm is only about its subject if the subject is
   * on screen when it runs.
   */
  await openBoard();
  await wait(2000);
  const benched = await evaluate(editor, `(() => { const b = document.querySelector('[data-test="board-open-${openTarget}"]'); if (!b) return 'NO OPEN CONTROL'; b.click(); return 'ok'; })()`);
  await wait(2800);
  const scopeNow = await evaluate(editor, `(() => { const c = document.querySelector('[data-test="preview-scope-chip"]'); return c ? c.textContent.replace(/\\s+/g, ' ').trim() : 'NO CHIP'; })()`);
  record('AC1 — pressing a frame benches THAT component', String(benched) === 'ok' && String(scopeNow).includes('Primary Button'), `chip="${scopeNow}"`);
  const benchDrawn = await readViewerTexts('the single bench');
  if (benchDrawn.ok) {
    record('AC4 🔴 — the SINGLE BENCH renders the same scenario values as the board did',
      benchDrawn.texts.includes(EXPECT[PRIMARY].text), `looking for "${EXPECT[PRIMARY].text}" in: ${benchDrawn.texts.join(' | ').slice(0, 200)}`);
  }
  await shoot(editor, 'ac7-04-one-frame-benched');

  // --- AC7: both themes --------------------------------------------------------------------------
  await openBoard();
  await wait(2000);
  // 🔴 A theme flip does not apply in the same eval — set it, then let a frame pass before shooting.
  const themeBefore = await evaluate(editor, `(() => document.documentElement.getAttribute('data-theme') || document.body.className)()`);
  await evaluate(editor, `(() => {
    const t = ${WREQ('./src/editor/src/utils/theme.ts')};
    if (t && t.Theme && typeof t.Theme.setTheme === 'function') { t.Theme.setTheme('light'); return 'ok'; }
    return 'NO THEME API';
  })()`).catch(() => 'NO THEME API');
  await wait(2500);
  await shoot(editor, 'ac7-05-board-light');
  await evaluate(editor, `(() => {
    const t = ${WREQ('./src/editor/src/utils/theme.ts')};
    if (t && t.Theme && typeof t.Theme.setTheme === 'function') { t.Theme.setTheme('dark'); return 'ok'; }
    return 'NO THEME API';
  })()`).catch(() => 'NO THEME API');
  await wait(2500);
  await shoot(editor, 'ac7-06-board-dark');
  record('AC7 — both themes photographed', true, `theme was ${String(themeBefore).slice(0, 30)}`);

  // --- summary -----------------------------------------------------------------------------------
  const failed = arms.filter((a) => a.ok === false);
  console.log(`\n${arms.length - failed.length}/${arms.length} arms green`);
  if (ac5.skipped) console.log('AC5 was SKIPPED — no draggable middle frame.');
  fs.mkdirSync(SHOTS, { recursive: true });
  fs.writeFileSync(path.join(SHOTS, 'arms.json'), JSON.stringify({ when: new Date().toISOString(), project: PROJECT_DIR, arms, ac5 }, null, 2));
  if (failed.length) {
    console.log('\nFAILED:');
    for (const a of failed) console.log(`  - ${a.name}${a.detail ? ` — ${a.detail}` : ''}`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error('DRIVE ERROR:', error && error.stack ? error.stack : error);
  process.exit(3);
});
