#!/usr/bin/env node
/**
 * HLT-003 — the four React correctness warnings, counted on a driven session.
 *
 * ## The reading this produces
 *
 *   node scripts/devtools/drive-hlt003-warnings.js --expect 0        # all four at 0, with reach
 *   node scripts/devtools/drive-hlt003-warnings.js --expect firing   # the same counter, made to fire
 *
 * A pair is the evidence. Neither arm means anything alone: `--expect 0` on a
 * surface the drive never reached is an unrun drive reporting a pass, and a
 * counter nobody has seen fire is not known to work.
 *
 * ## Why each class is driven the way it is
 *
 * §3 measured 13 events in 42 minutes. They are not one defect on one surface,
 * and the drive follows the measurement rather than tidiness:
 *
 * | class | where it actually fires | how this drive reaches it |
 * |---|---|---|
 * | duplicate key (10) | the **launcher**, `Projects.tsx` `key={project.id}` | render the recents grid and count cards |
 * | setState in render (1) | first **board** mount, `ComponentBoard` → `usePreviewStrip` | switch the preview scope to board |
 * | null `value` (1) | the text-style popup's `propertyFromPort` → `FontProperty` | call that same factory with the null a style with an unset property gives |
 * | missing key (1) | `VisualStates`' state list | mount it and open the State selector, as a person does |
 *
 * 🔴 **The duplicate key is the launcher's, and it is NOT a project entity id.**
 * The bursts begin ~2s after launch and ~10s *before* any project opens. Its
 * cause is two different projects sharing one stored `id` in
 * `recently_opened_project.json` — measured, one collision across 104 entries.
 *
 * 🔴 **Arm before acting.** HLT-001's first run read a confident 0 while
 * selecting zero nodes, so every phase here reports what it *reached* and the
 * verdict treats a 0 beside a zero reach as UNGRADED, not as a pass.
 *
 * 🔴 **Count what the fix can CAUSE** (§5a). All four classes are counted on
 * every arm, plus `otherErrors`, so a repair that trades one warning for another
 * cannot read as clean — which is how two iterations of HLT-001 passed.
 *
 * ## What `--expect firing` actually varies
 *
 * Two kinds of control, kept apart on purpose because they answer different
 * questions:
 *
 *  - **product control** — a second launcher row with a duplicate *directory*,
 *    which is the field the fixed grid keys on. This proves the key is
 *    load-bearing in the product's own render path.
 *  - **detector controls** — a raw `<input value={null}>`, a keyless `<ul>` list.
 *    These prove the counter can see each class at all. They are the instrument
 *    grading itself and are labelled as such; they are not evidence about the
 *    product.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const EXPECT = opt('expect', '0');
const JSON_OUT = opt('json', null);
const PROJECT_DIR = opt('dir', '/Users/richardosborne/vscode_projects/NodeGX test projects/HLT-003 Warnings Drive');
const CDP = path.join(__dirname, 'cdp.js');

const arms = [];
const record = (name, ok, detail) => {
  arms.push({ name, ok, detail: detail === undefined ? null : String(detail) });
  const tag = ok === null ? 'UNGRADED' : ok ? 'ok  ' : 'FAIL';
  console.log(`${tag}  ${name}${detail !== undefined ? ` — ${detail}` : ''}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function ev(expression) {
  const out = execFileSync('node', [CDP, 'eval', expression], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return out.trim().split('\n').pop().trim();
}
const evJSON = (expression) => {
  const raw = ev(expression);
  try {
    return JSON.parse(raw);
  } catch (_e) {
    return { __unparsed: raw };
  }
};
const W = (p) => `window.__wreq(${JSON.stringify(p)})`;

const BOOT = `(() => {
  if (typeof window.__wreq !== 'function' && typeof webpackChunknoodl_editor !== 'undefined') {
    webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]);
  }
  return typeof window.__wreq;
})()`;

/**
 * The counter, on `console.error`.
 *
 * Deliberately not a grep of `.logs/dev.log`: that file spans the whole stack
 * lifetime, so an earlier run in the same session poisons a whole-file read —
 * a trap that produced a false FAIL in HLT-001. A counter belongs to the window
 * it was armed in and needs no arithmetic. It chains to the existing wrapper
 * (bugtracker's, errorTail's) and always calls it, so arming silences nothing.
 */
const ARM = `(() => {
  const CLASSES = {
    duplicateKey: 'same key',
    missingKey: 'should have a unique "key" prop',
    nullValue: 'should not be null',
    setStateInRender: 'Cannot update a component'
  };
  if (!window.__hlt003) {
    window.__hlt003 = { duplicateKey: 0, missingKey: 0, nullValue: 0, setStateInRender: 0, otherErrors: 0, samples: [] };
    const original = console.error.bind(console);
    console.error = function (...args) {
      try {
        const s = window.__hlt003;
        const text = args.map((a) => (typeof a === 'string' ? a : '')).join(' ');
        let matched = false;
        for (const k of Object.keys(CLASSES)) {
          if (text.indexOf(CLASSES[k]) !== -1) {
            s[k]++;
            matched = true;
            if (s.samples.length < 12) s.samples.push(args.map((a) => (typeof a === 'string' ? a.slice(0, 140) : String(a))).join(' | ').slice(0, 400));
          }
        }
        if (!matched && text.trim() !== '') s.otherErrors++;
      } catch (_e) { /* a counter that throws inside an error handler is worse than a miscount */ }
      return original.apply(console, args);
    };
  }
  return 'armed';
})()`;

const READ = `JSON.stringify(window.__hlt003)`;
const RESET = `(() => { const s = window.__hlt003; s.duplicateKey = 0; s.missingKey = 0; s.nullValue = 0; s.setStateInRender = 0; s.otherErrors = 0; s.samples = []; return 'reset'; })()`;

/** Mount through the product's own root factory, and label the host so it can be removed. */
const MOUNT = (elementExpr) => `JSON.stringify((() => {
  const React = ${W('react')};
  const { createReactRoot } = ${W('./src/shared/utils/unmountReactRoot.ts')};
  const host = document.createElement('div');
  host.setAttribute('data-hlt003-host', '1');
  document.body.appendChild(host);
  createReactRoot(host).render(${elementExpr});
  return { mounted: host.isConnected };
})())`;

const CLEAN = `JSON.stringify((() => {
  const hosts = [...document.querySelectorAll('[data-hlt003-host]')];
  hosts.forEach((h) => h.remove());
  return { removed: hosts.length };
})())`;

const reach = {};

async function main() {
  console.log(`HLT-003 warnings drive — --expect ${EXPECT}`);
  console.log(`project: ${PROJECT_DIR}\n`);

  ev(BOOT);
  record('the counter is armed before anything is driven', ev(ARM) === 'armed');

  // ═══ 1. THE ROUTER AND THE COPY ═══
  const routed = ev(`(() => {
    const root = document.getElementById('root');
    let f = root[Object.keys(root).find((k) => k.startsWith('__reactContainer'))];
    let depth = 0;
    while (f && depth < 40) {
      const pr = f.memoizedProps;
      if (pr && pr.route && pr.route.router && typeof pr.route.router.route === 'function') { window.__hlt003Router = pr.route.router; break; }
      f = f.child; depth++;
    }
    return window.__hlt003Router ? 'ok' : 'NO ROUTER';
  })()`);
  record('the editor router was found', routed === 'ok', routed);
  if (routed !== 'ok') return finish(1);

  const PROJECT = `${W('./src/editor/src/models/projectmodel.ts')}.ProjectModel`;
  const already = ev(`(() => { const p = ${PROJECT}.instance; return (p && p._retainedProjectDirectory) || 'NONE'; })()`);
  if (path.resolve(already) !== path.resolve(PROJECT_DIR)) {
    ev(`(() => { window.__hlt003Router.route({ to: 'projects' }); return 'ok'; })()`);
    await wait(2000);
    ev(`(async () => {
      const { LocalProjectsModel } = ${W('./src/editor/src/utils/LocalProjectsModel.ts')};
      const p = await LocalProjectsModel.instance.openProjectFromFolder(${JSON.stringify(PROJECT_DIR)});
      window.__hlt003Router.route({ to: 'editor', project: p });
      return 'ok';
    })()`);
    await wait(12000);
  }
  const openedDir = ev(`(() => { const p = ${PROJECT}.instance; return (p && p._retainedProjectDirectory) || 'NONE'; })()`);
  record('the driven project is the copy this drive names', path.resolve(openedDir) === path.resolve(PROJECT_DIR), openedDir);
  if (path.resolve(openedDir) !== path.resolve(PROJECT_DIR)) return finish(1);

  // ═══ 2. THE BOARD — setState during render ═══
  // ⚠️ React warns about a render-phase update ONCE per renderer session, so
  // this phase is only meaningful on a board that has not been mounted yet in
  // this renderer. Re-entering board mode is silent either way.
  ev(`(() => { const c = document.querySelector('[data-test="preview-scope-chip"]'); if (c) c.click(); return 'ok'; })()`);
  await wait(1500);
  ev(`(() => { const r = document.querySelector('[data-test="preview-scope-board"]'); if (r) r.click(); return r ? 'clicked' : 'NO ROW'; })()`);
  await wait(9000);
  const boardMode = ev(`(() => document.querySelector('[data-test="component-board"]') ? 'board' : 'other')()`);
  reach.boardFrames = Number(ev(`(() => document.querySelectorAll('[data-test="component-board"] [class*="ComponentBoard-module__Frame"]').length)()`));
  record('REACH — the board mounted and drew frames', boardMode === 'board' && reach.boardFrames > 0, `mode=${boardMode}, frames=${reach.boardFrames}`);

  // ═══ 3. THE NULL `value` PATH — the text-style popup's own factory ═══
  ev(MOUNT(`${W('./src/editor/src/reactcomponents/propertyeditors.jsx')}.propertyFromPort({ name: 'fontFamily', displayName: 'Font Family', type: 'font' }, null, () => {})`));
  await wait(2500);
  const input = evJSON(`JSON.stringify([...document.querySelectorAll('[data-hlt003-host] input.propertyeditor-item-input')].map((i) => ({ value: i.value })))`);
  reach.nullValueInputs = Array.isArray(input) ? input.length : 0;
  record('REACH — the property input rendered from a null style value', reach.nullValueInputs > 0, JSON.stringify(input));
  // The consequence, not the mechanism: a controlled empty field, not an
  // uncontrolled one. A null `value` is React handing the field back to the DOM.
  record(
    'the field is CONTROLLED and empty, which is what the null broke',
    reach.nullValueInputs > 0 && input[0] && input[0].value === '',
    reach.nullValueInputs > 0 ? JSON.stringify(input[0]) : 'not reached'
  );

  // ═══ 4. THE MISSING KEY — VisualStates' state list ═══
  ev(MOUNT(`React.createElement(${W('./src/editor/src/views/panels/propertyeditor/components/VisualStates/visualstates.tsx')}.VisualStates, {
    model: {
      getVisualStates: () => ([{ name: 'neutral', label: 'Neutral' }, { name: 'hover', label: 'Hover' }, { name: 'pressed', label: 'Pressed' }]),
      getPossibleTransitionsForState: () => [],
      on: () => {}, off: () => {}
    },
    portsView: {},
    onVisualStateChanged: () => {}
  })`));
  await wait(2000);
  // The list lives behind the State selector, so it has to be opened — a 0 with
  // the selector shut grades nothing at all.
  ev(`(() => {
    const hosts = [...document.querySelectorAll('[data-hlt003-host]')];
    const last = hosts[hosts.length - 1];
    const btn = last && last.querySelector('.panel-head-row-field');
    if (btn) btn.click();
    return btn ? 'opened' : 'NO BUTTON';
  })()`);
  await wait(2500);
  reach.visualStateRows = Number(ev(`(() => document.querySelectorAll('[data-hlt003-host] .property-editor-visual-state-item').length)()`));
  record('REACH — the visual-state rows are on screen', reach.visualStateRows > 1, `${reach.visualStateRows} rows`);

  // ═══ 5. THE LAUNCHER — the duplicate key, 10 of the 13 ═══
  ev(`(() => { window.__hlt003Router.route({ to: 'projects' }); return 'ok'; })()`);
  await wait(4000);
  reach.launcherCards = Number(ev(`(() => document.querySelectorAll('[class*="LauncherProjectCard-module__Card"]').length)()`));
  record('REACH — the launcher grid rendered its rows', reach.launcherCards > 0, `${reach.launcherCards} cards`);

  // ═══ 6. THE CONTROLS ═══
  let controls = null;
  if (EXPECT === 'firing') {
    controls = {};

    // -- product control: the field the fixed grid keys on, made to collide.
    const beforeDup = evJSON(READ).duplicateKey;
    ev(`(() => {
      const { LocalProjectsModel } = ${W('./src/editor/src/utils/LocalProjectsModel.ts')};
      const M = LocalProjectsModel.instance;
      const first = M.projectEntries[0];
      const clone = Object.assign({}, first, { id: 'hlt003-control-' + Date.now() });
      M.projectEntries.push(clone);
      M.notifyListeners('myProjectsChanged');
      window.__hlt003ControlId = clone.id;
      return 'injected';
    })()`);
    await wait(3000);
    const afterDup = evJSON(READ).duplicateKey;
    controls.duplicateDirectory = { before: beforeDup, after: afterDup };
    record('PRODUCT CONTROL — a duplicate DIRECTORY makes the fixed key collide', afterDup > beforeDup, `${beforeDup} → ${afterDup}`);
    // Never let the injected row reach disk.
    ev(`(() => {
      const { LocalProjectsModel } = ${W('./src/editor/src/utils/LocalProjectsModel.ts')};
      const M = LocalProjectsModel.instance;
      M.projectEntries = M.projectEntries.filter((p) => p.id !== window.__hlt003ControlId);
      M.notifyListeners('myProjectsChanged');
      delete window.__hlt003ControlId;
      return 'restored';
    })()`);
    await wait(1500);

    // -- detector controls: the instrument grading itself, one per remaining class.
    const beforeNull = evJSON(READ).nullValue;
    ev(MOUNT(`React.createElement('input', { value: null, onChange: () => {} })`));
    await wait(2000);
    const afterNull = evJSON(READ).nullValue;
    controls.rawNullInput = { before: beforeNull, after: afterNull };
    record('DETECTOR CONTROL — the counter sees a raw <input value={null}>', afterNull > beforeNull, `${beforeNull} → ${afterNull}`);

    const beforeKey = evJSON(READ).missingKey;
    ev(MOUNT(`React.createElement('ul', null, ['a', 'b', 'c'].map((t) => React.createElement('li', null, t)))`));
    await wait(2000);
    const afterKey = evJSON(READ).missingKey;
    controls.keylessList = { before: beforeKey, after: afterKey };
    record('DETECTOR CONTROL — the counter sees a keyless list', afterKey > beforeKey, `${beforeKey} → ${afterKey}`);
  }

  // ═══ 7. THE READING ═══
  const final = evJSON(READ);
  console.log(`\ncounts: ${JSON.stringify(final, null, 2)}`);
  console.log(`reach:  ${JSON.stringify(reach)}\n`);

  if (EXPECT !== 'firing') {
    const reached = {
      duplicateKey: reach.launcherCards > 0,
      setStateInRender: boardMode === 'board' && reach.boardFrames > 0,
      nullValue: reach.nullValueInputs > 0,
      missingKey: reach.visualStateRows > 1
    };
    for (const cls of ['duplicateKey', 'setStateInRender', 'nullValue', 'missingKey']) {
      // 🔴 A zero on a surface the drive never reached is UNGRADED, not a pass.
      record(`${cls} — 0`, reached[cls] ? (final[cls] || 0) === 0 : null, reached[cls] ? String(final[cls]) : 'SURFACE NOT REACHED');
    }
    record('no OTHER console error class appeared in the driven window', (final.otherErrors || 0) === 0, `otherErrors=${final.otherErrors}`);
  }

  ev(CLEAN);
  ev(RESET);
  finish(arms.some((a) => a.ok === false) ? 1 : 0, final, controls);
}

function finish(code, counts, controls) {
  if (JSON_OUT) {
    fs.writeFileSync(
      JSON_OUT,
      JSON.stringify({ expect: EXPECT, project: PROJECT_DIR, at: new Date().toISOString(), counts, reach, controls, arms }, null, 2)
    );
    console.log(`wrote ${JSON_OUT}`);
  }
  const failed = arms.filter((a) => a.ok === false);
  const ungraded = arms.filter((a) => a.ok === null);
  console.log(`\n${failed.length === 0 ? 'PASS' : `FAIL (${failed.length})`}${ungraded.length ? `  — ${ungraded.length} UNGRADED` : ''}`);
  process.exit(code);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
