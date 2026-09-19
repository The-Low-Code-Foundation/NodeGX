#!/usr/bin/env node
/**
 * P94 STY-003 — the one drive AC8 is waiting on.
 *
 * Three things the panel has been changed for, and NEITHER FIX HAS BEEN SEEN RUNNING:
 *
 *  1. **The gutter.** Richard, ruling AC8: *"the little dot to the left of the label that says
 *     when something is changed is overlapping with the blue or red vertical line next to each
 *     label from a 'look' controlled value."* The Look bar moved from `left:-8px` to `left:-15px`
 *     so it clears CHR-009's `GutterDot` at `-11px → -5px`. 🔴 **Those are the STYLESHEETS'
 *     numbers.** The two rules live in different containing blocks (`.Root` in noodl-core-ui,
 *     `.property-panel-row` here), so the only honest reading is off the rendered elements —
 *     twice now this surface has been green in every assertion and wrong on screen.
 *     The bar is a `::before`, which has no `getBoundingClientRect`, so its span is computed
 *     from the row's own rect plus `getComputedStyle(row, '::before')`.
 *
 *  2. **The rename.** `Ports.bindModel` now subscribes to the PROJECT's `variantRenamed` /
 *     `variantDeleted`. Before the fix a rename updated the `Look` row and the menu and left
 *     every group heading reading `— from <old>` and every override line `<old> says …`.
 *     Graded by renaming and then reading the naming back **with no other interaction** —
 *     the whole point is that nobody had to touch anything else.
 *     Negative arm in the same run: editing an already-owned field's VALUE must still NOT
 *     rebuild the groups (§8's caret). Rebuild is detected by stamping the rows and seeing
 *     whether the stamps survive — [[a-negative-arm-needs-its-control-in-the-same-run]].
 *
 *  3. **Persistence, which s6 asserted and this measures.** s6's handoff says the rename
 *     "persisted, Project saved". At the time of writing, `nodegx.styles.json` in the driven
 *     project still names the Look `test` and nothing in that directory has been written since
 *     2026-09-06. So the rename is read back OFF DISK after the autosave debounce, and the
 *     answer goes in the report either way — [[measure-the-artefact-before-believing-the-task-file]].
 *
 * Then the shots AC8 actually closes on: both themes, cropped to the styled group so the gutter
 * is legible at 2×.
 *
 * Usage:
 *   node scripts/devtools/drive-sty003-gutter.js [options]
 *     --dir <project>      project directory to open (default: members area Richard test)
 *     --override-port <p>  the field the drive takes over so an overridden row exists (fontSize)
 *     --override-value <v> what it sets it to (var(--text-2xl))
 *     --rename <name>      rename the project's Look to this (default: "Section Heading")
 *     --no-rename          skip the rename arm entirely
 *     --shots <dir>        where the screenshots go (default: the phase's shots/)
 *     --json <file>        write the graded arms as JSON
 *
 * Exits 0 when every graded arm passed.
 */
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('./cdp.js');

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const PROJECT_DIR = opt('dir', '/Users/richardosborne/vscode_projects/NodeGX test projects/members area Richard test');
/**
 * The field the drive overrides so Richard's worst case exists to be photographed.
 *
 * 🔴 **The node on disk wears the Look and owns NOTHING** (`components/__page__/Home/nodes.json`:
 * `{ type: 'Text', variant: 'test' }`, no `parameters` at all), so every row it draws is `linked`
 * and no row draws a reset dot. The two marks he saw sharing a lane can only coincide on an
 * OVERRIDDEN row — a node owning the value is exactly what both marks report — so the drive makes
 * one rather than hoping the project still holds s5's unsaved edit.
 */
const OVERRIDE_PORT = opt('override-port', 'fontSize');
const OVERRIDE_VALUE = opt('override-value', 'var(--text-2xl)');
const NEW_NAME = opt('rename', 'Section Heading');
const SHOTS = opt('shots', path.join(__dirname, '..', '..', 'dev-docs', 'tasks', 'phase-94-one-styles-panel', 'shots'));
const JSON_OUT = opt('json', null);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const arms = [];
const record = (name, ok, detail) => {
  arms.push({ name, ok, detail });
  console.log(`${ok === null ? 'UNGRADED' : ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const WREQ = (p) => `window.__wreq(${JSON.stringify(p)})`;
const PROJECT = `${WREQ('./src/editor/src/models/projectmodel.ts')}.ProjectModel`;
const ED = `${WREQ('./src/editor/src/contexts/NodeGraphContext/NodeGraphContext.tsx')}.NodeGraphContextTmp.nodeGraph`;

/**
 * The gutter reading, run in the page.
 *
 * Per treated row: the Look bar's span (from the row's rect and the `::before`'s computed
 * `left`/`width`, because a pseudo-element has no box to ask) and the gutter dot's span (a real
 * element, so its own rect). Both in viewport x, so they are comparable across two containing
 * blocks — which is exactly the thing the stylesheets could not tell us.
 */
const LANES = `JSON.stringify((() => {
  const rows = Array.from(document.querySelectorAll('.property-panel-row[data-look-treatment]'));
  const read = (row) => {
    const rr = row.getBoundingClientRect();
    const cs = getComputedStyle(row, '::before');
    const barLeft = rr.left + parseFloat(cs.left || '0');
    const barWidth = parseFloat(cs.width || '0');
    const dot = row.querySelector('[title="Reset to default"], [title="Connected"]');
    const dr = dot ? dot.getBoundingClientRect() : null;
    const label = (row.querySelector('[class*="Label"]') || {}).textContent;
    return {
      label: (label || '').trim().slice(0, 28),
      treatment: row.getAttribute('data-look-treatment'),
      lookName: row.getAttribute('data-look-name'),
      barVisible: cs.content !== 'none' && barWidth > 0,
      bar: [Math.round(barLeft * 10) / 10, Math.round((barLeft + barWidth) * 10) / 10],
      barColor: cs.backgroundColor,
      dot: dr ? [Math.round(dr.left * 10) / 10, Math.round(dr.right * 10) / 10] : null,
      dotTitle: dot ? dot.getAttribute('title') : null,
      gap: dr ? Math.round((dr.left - (barLeft + barWidth)) * 10) / 10 : null,
      overlaps: dr ? barLeft + barWidth > dr.left && barLeft < dr.right : null
    };
  };
  return { theme: document.documentElement.getAttribute('data-theme'), rows: rows.map(read) };
})())`;

/** What the panel SAYS about the Look — the two places the rename defect left stale. */
const NAMING = `JSON.stringify((() => ({
  groupSources: Array.from(document.querySelectorAll('[data-test="group-look-source"]')).map((e) => e.textContent.trim()),
  overrideLines: Array.from(document.querySelectorAll('.property-look-override')).map((e) => e.textContent.trim()),
  rowLookNames: Array.from(new Set(Array.from(document.querySelectorAll('[data-look-name]')).map((e) => e.getAttribute('data-look-name')))),
  lookRow: (() => {
    const el = Array.from(document.querySelectorAll('.property-editor-variant-name, [data-test="variant-name"]'))[0];
    return el ? el.textContent.trim() : null;
  })(),
  marksAlive: document.querySelectorAll('[data-drive-mark]').length
}))())`;

/** Stamp every treated row, so a rebuild is visible as the stamps going missing. */
const STAMP = `(() => {
  const rows = document.querySelectorAll('.property-panel-row[data-look-treatment]');
  rows.forEach((r, i) => r.setAttribute('data-drive-mark', String(i)));
  return rows.length;
})()`;

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const editor = await connect(await appTarget('editor'));
  const ev = (e) => evaluate(editor, e);
  const readJson = async (e) => JSON.parse(await ev(e));

  /**
   * 🔴 The save can REFUSE a file and only say so to the console.
   *
   * `toDirectory`'s v2 path writes "only the … project-level files that actually changed", and
   * when one of them moved under the editor (an agent, a git checkout, another editor) the saver
   * SKIPS it, warns, and the save still reports success — so the toast says "Project saved" while
   * the edit stays in memory. `nodegx.styles.json` is a project-level file, and this project's
   * copy has not been written since 2026-09-06. So the console is part of the measurement, not
   * decoration: a persistence arm that reads only the toast reads the wrong thing.
   */
  const consoleLines = [];
  editor.on((msg) => {
    if (msg.method !== 'Runtime.consoleAPICalled') return;
    const text = (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
    if (/refus|skip|save|variant|styles\.json/i.test(text)) consoleLines.push(`${msg.params.type}: ${text.slice(0, 300)}`);
  });
  await editor.send('Runtime.enable', {});

  /**
   * 🔴 The Electron window is `document.hidden`, so `requestAnimationFrame` never fires — a panel
   * that mutates and then waits for a frame reads as a dead feature. Reported by the session that
   * had the box before this one (P93 TVW-006). `Page.bringToFront` does not lift it; these two do,
   * and they have to be sent on the SAME connection the readings are taken on
   * ([[cdp-keys-need-focus-emulation-on-the-same-connection]]).
   */
  await editor.send('Page.enable', {}).catch(() => {});
  await editor.send('Page.setWebLifecycleState', { state: 'active' }).catch(() => {});
  await editor.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  const rafFires = await ev(
    `new Promise((r) => { const t = setTimeout(() => r(false), 1500); requestAnimationFrame(() => { clearTimeout(t); r(true); }); })`
  );
  record('requestAnimationFrame fires — the readings below are of a live page', rafFires === true, `rAF=${rafFires}`);

  // `__wreq` is the editor's webpack require, and it is not there until something asks for it.
  const wreq = await ev(`(() => {
    if (typeof window.__wreq === 'function') return 'present';
    window.webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]);
    return typeof window.__wreq === 'function' ? 'installed' : 'FAILED';
  })()`);
  record('the editor’s module registry is reachable', wreq !== 'FAILED', String(wreq));
  if (wreq === 'FAILED') return finish(editor);

  // ── Open the project. The router is reached through `#root`'s fiber, not a module export
  //    ([[open-a-copy-of-a-real-project-in-the-editor]] is why this is a named directory).
  const open = await ev(`(() => {
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

  const already = await ev(`(() => { const p = ${PROJECT}.instance; return p && p._retainedProjectDirectory || 'NONE'; })()`);
  if (path.resolve(already) !== path.resolve(PROJECT_DIR)) {
    console.log(`opening ${PROJECT_DIR} (editor had ${already})`);
    await ev(`(() => { window.__styRouter.route({ to: 'projects' }); return 'ok'; })()`);
    await wait(1500);
    await ev(`(async () => {
      const { LocalProjectsModel } = ${WREQ('./src/editor/src/utils/LocalProjectsModel.ts')};
      const p = await LocalProjectsModel.instance.openProjectFromFolder(${JSON.stringify(PROJECT_DIR)});
      window.__styRouter.route({ to: 'editor', project: p });
      return 'ok';
    })()`);
    await wait(6000);
  }
  const dir = await ev(`(() => ${PROJECT}.instance._retainedProjectDirectory || 'NONE')()`);
  record('the driven project is the one this task names', path.resolve(dir) === path.resolve(PROJECT_DIR), dir);

  // The Look on disk BEFORE anything, so the persistence arm has a baseline rather than a memory.
  const stylesPath = path.join(PROJECT_DIR, 'nodegx.styles.json');
  const diskBefore = readDiskLooks(stylesPath);
  console.log(`disk before: ${JSON.stringify(diskBefore)}`);

  // ── Find the node that WEARS a Look, wherever it lives. Searched across every component's
  //    model rather than named: which component holds it is a fact about this project, and a
  //    named guess that misses reads as "no Look on this node" — an absence, not a miss.
  const found = await readJson(`JSON.stringify((() => {
    const p = ${PROJECT}.instance;
    for (const c of p.getComponents()) {
      const graph = c.graph;
      if (!graph || !graph.roots) continue;
      const all = [];
      const walk = (n) => { all.push(n); (n.children || []).forEach(walk); };
      graph.roots.forEach(walk);
      const hit = all.find((n) => n.variant && n.variant.name);
      if (hit) return { component: c.name, nodeId: hit.id, type: hit.type && (hit.type.name || hit.type) , look: hit.variant.name };
    }
    return { error: 'NO NODE WEARS A LOOK' };
  })())`);
  record('the project holds a node wearing a Look', !found.error, JSON.stringify(found));
  if (found.error) return finish(editor);

  // Selection through the editor's own action rather than a canvas click: the nodes are
  // canvas-drawn, so there is no selector, and a coordinate is a fact about one zoom level.
  await ev(`(() => {
    const { EventDispatcher } = ${WREQ('./src/shared/utils/EventDispatcher.ts')};
    const c = ${PROJECT}.instance.getComponentWithName(${JSON.stringify(found.component)});
    if (!c) return 'MISSING';
    EventDispatcher.instance.notifyListeners('ComponentPanel.SwitchToComponent', { component: c, pushHistory: false });
    return 'ok';
  })()`);
  await wait(2000);

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
  await wait(1500);
  record('the node wearing the Look is selected', selected.selected === true, JSON.stringify(selected));

  // ── Make Richard's worst case exist. An OVERRIDDEN row is the only row where both marks are
  //    drawn, so a run that never makes one grades nothing at all.
  const overrode = await ev(`(() => {
    const p = ${PROJECT}.instance;
    let node = null;
    for (const c of p.getComponents()) {
      const g = c.graph; if (!g || !g.roots) continue;
      const all = []; const walk = (n) => { all.push(n); (n.children || []).forEach(walk); }; g.roots.forEach(walk);
      node = all.find((n) => n.id === ${JSON.stringify(found.nodeId)}); if (node) break;
    }
    if (!node) return 'NO NODE';
    const cur = node.parameters && node.parameters[${JSON.stringify(OVERRIDE_PORT)}];
    if (cur === ${JSON.stringify(OVERRIDE_VALUE)}) return 'already';
    node.setParameter(${JSON.stringify(OVERRIDE_PORT)}, ${JSON.stringify(OVERRIDE_VALUE)});
    return 'set';
  })()`);
  await wait(1200);
  record(
    `an override exists to photograph — ${OVERRIDE_PORT} is the node's own`,
    overrode === 'set' || overrode === 'already',
    String(overrode)
  );

  // ═══ 1. THE GUTTER ═══
  const lanes = await readJson(LANES);
  const treated = lanes.rows.length;
  const withBoth = lanes.rows.filter((r) => r.dot && r.barVisible);
  record('the panel is drawing treated rows at all', treated > 0, `${treated} rows, theme=${lanes.theme}`);
  // 🔴 Without a row that draws BOTH marks, "they do not overlap" is true of nothing.
  record(
    'at least one row draws BOTH marks — the case Richard saw',
    withBoth.length > 0,
    `${withBoth.length}/${treated} rows carry a bar and a dot`
  );
  if (withBoth.length) {
    const clashes = withBoth.filter((r) => r.overlaps);
    record(
      'the Look bar and the gutter dot no longer share a lane',
      clashes.length === 0,
      clashes.length
        ? clashes.map((r) => `${r.label}: bar ${r.bar} vs dot ${r.dot}`).join('; ')
        : withBoth.map((r) => `${r.label}[${r.treatment}] bar ${r.bar} dot ${r.dot} gap ${r.gap}px`).join('; ')
    );
  } else {
    record('the Look bar and the gutter dot no longer share a lane', null, 'no row draws both marks');
  }
  console.log(JSON.stringify(lanes, null, 1));

  // ═══ 2. THE RENAME ═══
  const before = await readJson(NAMING);
  console.log(`naming before: ${JSON.stringify(before)}`);
  const oldName = (before.rowLookNames || [])[0] || null;

  if (flag('no-rename') || !oldName) {
    record('a rename reaches the group headings and the override lines', null, oldName ? 'skipped' : 'no Look on this node');
  } else {
    /**
     * 🔴 TWO SENTINEL NAMES, AND A BASELINE THE PANEL IS MADE TO PRINT FIRST.
     *
     * A first version of this arm renamed to the name the panel already displayed and passed
     * without the panel updating at all — the assertion was string containment and the target
     * string was already on screen. So: rename to `Look Alpha` and force ONE unrelated rebuild
     * (a keystroke in the filter box, which is in `renderGroups`'s hash and touches no Look) so
     * the panel is KNOWN to be printing it; then rename to `Look Bravo` and touch nothing.
     * Neither name is a substring of the other, and the arm fails if `Look Alpha` survives
     * anywhere or `Look Bravo` does not appear.
     */
    /**
     * 🔴 PRECONDITION, MEASURED RATHER THAN ASSUMED: the node must hold the PROJECT'S Look
     * object, not a copy of it.
     *
     * Measured in this drive: a node can hold a `VariantModel` that is **not** the one in
     * `ProjectModel.instance.variants`, and then three names disagree at once — `variantName:
     * "Probe Two"`, `node.variant.name: "Section Heading"`, `project.variants[0].name:
     * "Orphan Check"`. While that is true, every word the panel says about the Look is a true
     * statement about a ghost, and a rename of the project's Look is invisible to it by
     * construction. `setVariant(project.variants[0])` repairs it; a save does NOT cause it
     * (measured: no `projectLevelReloadedFromDisk`, identity held across one). Filed separately.
     *
     * So the arm below is graded only when the node and the project are talking about the same
     * object — otherwise it would fail for a reason that has nothing to do with the fix.
     */
    const bound = await readJson(`JSON.stringify((() => {
      const p = ${PROJECT}.instance;
      let node = null;
      for (const c of p.getComponents()) {
        const g = c.graph; if (!g || !g.roots) continue;
        const all = []; const walk = (n) => { all.push(n); (n.children || []).forEach(walk); }; g.roots.forEach(walk);
        node = all.find((n) => n.id === ${JSON.stringify(found.nodeId)}); if (node) break;
      }
      if (!node) return { error: 'NO NODE' };
      const same = node.variant === p.variants.find((v) => v === node.variant);
      return { same, nodeLook: node.variant && node.variant.name, projectLook: p.variants[0] && p.variants[0].name, staleVariantName: node.variantName };
    })())`);
    record(
      'the node holds the PROJECT\u2019s Look object, not a copy of it',
      bound.same === true,
      JSON.stringify(bound)
    );

    const A = 'Look Alpha';
    const B = 'Look Bravo';
    const renameTo = (name, from) => ev(`(() => {
      const p = ${PROJECT}.instance;
      const v = p.variants.find((x) => x.name === ${JSON.stringify(from)}) || p.variants.find((x) => x.typename === ${JSON.stringify(found.type)});
      if (!v) return 'NO VARIANT';
      p.renameVariant(v, ${JSON.stringify(name)}, { undo: true });
      return v.name;
    })()`);

    const modelName = () => ev(`(() => { const v = ${PROJECT}.instance.variants.find((x) => x.typename === ${JSON.stringify(found.type)}); return v ? v.name : null; })()`);
    await renameTo(A, await modelName());
    // The one deliberate interaction in this arm, and it is BEFORE the subject: a keystroke in
    // the filter box, typed and removed, so the baseline below is something the panel printed.
    const filterTyped = await ev(`(() => {
      const box = document.querySelector('.property-panel-filter input, input[placeholder*="ilter"], .property-editor-filter input');
      if (!box) return 'NO FILTER BOX';
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      set.call(box, 'f'); box.dispatchEvent(new Event('input', { bubbles: true }));
      return 'typed';
    })()`);
    await wait(500);
    const filterCleared = await ev(`(() => {
      const box = document.querySelector('.property-panel-filter input, input[placeholder*="ilter"], .property-editor-filter input');
      if (!box) return 'NO FILTER BOX';
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      set.call(box, ''); box.dispatchEvent(new Event('input', { bubbles: true }));
      return 'cleared';
    })()`);
    await wait(800);
    const baseline = await readJson(NAMING);
    record(
      `the panel is printing "${A}" before the rename under test (filter box: ${filterTyped}/${filterCleared})`,
      baseline.groupSources.some((t) => t.includes(A)),
      JSON.stringify(baseline.groupSources)
    );

    await ev(STAMP);
    const renamed = await renameTo(B, A);
    // No interaction of any kind between the rename and the reading. That IS the criterion.
    await wait(1000);
    const after = await readJson(NAMING);
    console.log(`naming after:  ${JSON.stringify(after)}`);
    const said = [...after.groupSources, ...after.overrideLines];
    record(
      'a rename reaches the group headings and the override lines, with no other interaction',
      renamed !== 'NO VARIANT' &&
        said.length > 0 &&
        said.every((t) => !t.includes(A)) &&
        after.groupSources.some((t) => t.includes(B)) &&
        after.overrideLines.some((t) => t.includes(B)),
      said.join(' | ')
    );

    // Leave the Look with a name Richard can read in the shot, and confirm a second time on the
    // way out — again with nothing else touched.
    await renameTo(NEW_NAME, B);
    await wait(1000);
    const finalNaming = await readJson(NAMING);
    record(
      `a second rename, to "${NEW_NAME}", follows too`,
      finalNaming.groupSources.some((t) => t.includes(NEW_NAME)) && finalNaming.groupSources.every((t) => !t.includes(B)),
      JSON.stringify(finalNaming.groupSources)
    );

    // ── Negative arm, same run: typing into a field the node already owns must NOT rebuild the
    //    groups. 🔴 Graded on the CONSEQUENCE — the caret — not on a marker.
    //
    //    An earlier version of this arm stamped the rows and checked the stamps survived. That
    //    grades nothing: React reconciles, so the same DOM elements (and any attribute set on them
    //    from outside) survive a rebuild intact. What §8 actually protects is a person typing in a
    //    field: a rebuild replaces the controls and the caret is gone mid-number.
    const caret = await readJson(`JSON.stringify((() => {
      const row = document.querySelector('.property-panel-row[data-look-treatment="overridden"]');
      const input = row && row.querySelector('input:not([type="checkbox"]), textarea');
      if (!input) return { error: 'NO INPUT ON AN OVERRIDDEN ROW' };
      input.focus();
      const at = (input.value || '').length;
      input.setSelectionRange(at, at);
      window.__styInput = input;
      return { focused: document.activeElement === input, value: input.value, at };
    })())`);
    if (caret.error) {
      record('typing in an own field does NOT rebuild the groups (§8’s caret)', null, caret.error);
    } else {
      // A real keypress through the input pipeline, so React's onChange and the row class's
      // commit path run exactly as they do for a person.
      for (const text of ['0']) {
        await editor.send('Input.dispatchKeyEvent', { type: 'keyDown', text, key: text, windowsVirtualKeyCode: 48 });
        await editor.send('Input.dispatchKeyEvent', { type: 'char', text, key: text });
        await editor.send('Input.dispatchKeyEvent', { type: 'keyUp', text, key: text, windowsVirtualKeyCode: 48 });
      }
      await wait(900);
      const after = await readJson(`JSON.stringify((() => {
        const input = window.__styInput;
        return {
          stillInDocument: document.contains(input),
          stillFocused: document.activeElement === input,
          value: input && input.value,
          caretAt: input && input.selectionStart
        };
      })())`);
      record(
        'typing in an own field does NOT rebuild the groups (§8’s caret)',
        after.stillInDocument === true && after.stillFocused === true,
        JSON.stringify(after)
      );
    }

    // ═══ 3. PERSISTENCE — the save is debounced 1000ms; give it three times that. ═══
    await wait(3000);
    const diskAfter = readDiskLooks(stylesPath);
    record(
      'the rename reaches nodegx.styles.json on disk',
      Array.isArray(diskAfter.names) && diskAfter.names.includes(NEW_NAME),
      `before ${JSON.stringify(diskBefore)} → after ${JSON.stringify(diskAfter)}`
    );
    if (consoleLines.length) console.log(`console during the run:\n  ${consoleLines.join('\n  ')}`);
  }

  // ═══ SHOTS — both themes, cropped to the styled group. ═══
  for (const theme of ['dark', 'light']) {
    await ev(`(() => { ${WREQ('./src/editor/src/models/ThemeManager.ts')}.ThemeManager.setMode(${JSON.stringify(theme)}); return 'ok'; })()`);
    // A theme written in one evaluation is not applied to anything read in the same one.
    await wait(900);
    // 🔴 Scroll the styled group back into view FIRST. The theme flip rebuilds the panel and the
    //    scroller returns to the top, so the rows the clip is computed from can be below the
    //    viewport — and the shot is then a photograph of DIMENSIONS, with the gutter nowhere in
    //    it. `behavior: 'instant'`: a smooth scroll has not happened yet when the next read runs
    //    ([[a-theme-flip-does-not-apply-in-the-same-eval]]).
    await ev(`(() => {
      // The OVERRIDDEN row is the one Richard described — a node owning the value is what both
      // marks report, so that is where they coincided. Prefer it over the first treated row.
      const row =
        document.querySelector('.property-panel-row[data-look-treatment="overridden"]') ||
        document.querySelector('.property-panel-row[data-look-treatment]');
      if (!row) return 'NO ROW';
      row.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
      return 'scrolled';
    })()`);
    await wait(500);
    const clip = await readJson(`JSON.stringify((() => {
      // Only what is ON SCREEN after the scroll: a clip built from rows above and below the
      // viewport is a clip of everything between them, and the marks are 2px wide.
      const rows = Array.from(
        document.querySelectorAll('.property-panel-row[data-look-treatment], [data-test="group-look-source"]')
      ).filter((el) => {
        const q = el.getBoundingClientRect();
        return q.bottom > 0 && q.top < window.innerHeight && q.width > 0;
      });
      if (!rows.length) return null;
      let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
      for (const el of rows) {
        const q = el.getBoundingClientRect();
        l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom);
      }
      // Clamped to the viewport: a clip that runs past the window is padded with empty ground,
      // and a shot that is three quarters empty is a worse picture of a 2px gutter mark.
      const x = Math.max(0, Math.round(l - 40));
      const y = Math.max(0, Math.round(t - 40));
      return {
        x,
        y,
        width: Math.min(Math.round(r - l + 80), window.innerWidth - x),
        height: Math.min(Math.round(b - t + 80), window.innerHeight - y)
      };
    })())`);
    const applied = await ev(`document.documentElement.getAttribute('data-theme')`);
    const file = path.join(SHOTS, `sty003-gutter-${applied}.png`);
    const { data } = await editor.send('Page.captureScreenshot', {
      format: 'png',
      ...(clip ? { clip: { ...clip, scale: 2 } } : {})
    });
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    console.log(`shot ${path.basename(file)} — theme=${applied}${clip ? '' : ' (FULL WINDOW — no treated row to crop to)'}`);
    // And the gutter re-read in THIS theme, because a bar that vanishes under a token is a
    // defect the dark reading cannot see.
    const perTheme = await readJson(LANES);
    const both = perTheme.rows.filter((r) => r.dot && r.barVisible);
    record(
      `the two marks keep their lanes in ${applied}`,
      both.length > 0 && both.every((r) => !r.overlaps),
      both.map((r) => `${r.label} gap ${r.gap}px ${r.barColor}`).join('; ') || 'no row draws both marks'
    );
  }

  return finish(editor);
}

/** The Look names as the SIDECAR has them, plus its mtime — the file is the artefact, not the toast. */
function readDiskLooks(p) {
  try {
    const st = fs.statSync(p);
    const j = JSON.parse(fs.readFileSync(p, 'utf-8'));
    return { names: (j.variants || []).map((v) => v.name), mtime: st.mtime.toISOString() };
  } catch (e) {
    return { error: String(e.message || e) };
  }
}

function finish(editor) {
  const graded = arms.filter((a) => a.ok !== null);
  const failed = graded.filter((a) => !a.ok);
  console.log(`\n${graded.length - failed.length}/${graded.length} graded arms passed (${arms.length - graded.length} ungraded)`);
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ arms }, null, 2));
  editor.close();
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
