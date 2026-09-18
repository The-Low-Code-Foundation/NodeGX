#!/usr/bin/env node
/**
 * P93 TVW-004 — Layers: the screen, expanded through every instance. The drive.
 *
 * A spec can grade the rows the walk produces; only a drive can grade the thing they are about —
 * that the row you press is the element you were looking at, that the region tinted is the one the
 * canvas is editing, and that the indent Richard capped is capped **on screen** rather than in the
 * arithmetic that feeds it.
 *
 * 🔴 **Every arm here needs its subject present, or it grades nothing.** The indent arm is the
 * clearest: on a shallow screen every row is inside the cap and the arm passes without ever
 * meeting a row that could break it. So it refuses instead — an arm that cannot fail on this
 * fixture says so out loud ([[an-instrument-must-be-armed-before-it-measures]]).
 *
 * Reads:
 *   tabs     — the panel title, the two tabs, and which is active
 *   rows     — every visible Layers row: kind, label, `data-level`, computed padding-left
 *   tint     — the rows carrying the editing tint, and the band that names them
 *   canvas   — `activeComponent` before and after a double-click on an instance row
 *   select   — the selection store's paths after a click on a row inside a band
 *
 * Usage:
 *   NOODL_REMOTE_DEBUG_PORT=9444 node scripts/devtools/drive-tvw004-layers.js \
 *     [--shots <dir>] [--json <file>] [--editing "/Some/Component"]
 *
 * Exits 0 only when every arm that could be measured held, and 2 when the renderer is not showing
 * a project (on the launcher every reading is absent, and absence passes hardest).
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : null;
};

// 🔴 `cdp.js` reads NOODL_REMOTE_DEBUG_PORT at REQUIRE time.
const { appTarget, connect, evaluate, dispatchClick } = require('./cdp.js');

const shots = opt('shots');
if (shots) fs.mkdirSync(shots, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** The panel's own geometry, as the stylesheet states it — what the cap is measured against. */
const TREE_INSET = 10;
const LAYERS_INDENT = 10;
const MAX_INDENT_LEVEL = 8;

/**
 * Every visible row, as a person sees it.
 *
 * The comments live out here: a backtick inside a template literal ends it, and a `\s` inside one
 * passed through a shell argument collapses to `s` — which is why this script is a FILE and not a
 * `node -e`.
 *
 * - `padding` is the COMPUTED value, not the `--level` the JSX set. The cap is a claim about where
 *   the label starts on screen; reading back the number we supplied would grade the supplier.
 * - `level` is the row's TRUE depth (`data-level`), which keeps counting past the cap. The two
 *   disagreeing is the whole point of the ruling.
 */
const ROWS = `(() => {
  const nodes = document.querySelectorAll('[data-test="layers-node"], [data-test="layers-instance"], [data-test="layers-band"], [data-test="layers-cycle"], [data-test="layers-router-note"]');
  return Array.from(nodes).map((el) => {
    const style = getComputedStyle(el);
    const label = el.querySelector('[class*="Label"], [class*="LayerBandLabel"], [class*="LayerNoteLabel"]');
    return {
      kind: el.getAttribute('data-test').replace('layers-', ''),
      label: label ? label.textContent.trim() : el.textContent.trim(),
      level: Number(el.getAttribute('data-level')),
      padding: Math.round(parseFloat(style.paddingLeft)),
      tinted: /LayerTint/.test(el.className),
      editing: el.getAttribute('data-editing') === 'true',
      component: el.getAttribute('data-component') || null
    };
  });
})()`;

const TABS = `(() => {
  const panel = document.querySelector('[data-test="panel-tabs"]');
  const title = Array.from(document.querySelectorAll('div,span,h1,h2,h3')).find((el) => el.children.length === 0 && el.textContent.trim() === 'Project');
  const header = document.querySelector('[data-test="layers-header-screen"]');
  return {
    tabs: panel ? Array.from(panel.querySelectorAll('button')).map((b) => ({ label: b.textContent.trim(), active: b.getAttribute('data-active') === 'true' })) : null,
    titled: Boolean(title),
    header: header ? header.textContent.trim() : null
  };
})()`;

async function main() {
  const client = await connect(await appTarget('editor'));
  const ev = (expr) => evaluate(client, expr);

  // 🔴 Return a STRING. `window.__wreq` is webpack's require — a function whose object graph the
  // CDP serialiser walks until it gives up with `Object reference chain is too long`, which reads
  // as a dead editor rather than as a bad read. The first run of this script died here.
  await ev(`(() => { if (!window.__wreq) webpackChunknoodl_editor.push([[Symbol()],{},(r)=>{window.__wreq=r;}]); return typeof window.__wreq; })()`);
  await wait(200);

  const ready = await ev(`(() => ({
    preview: !!document.querySelector('[data-test="app-preview"] webview'),
    panel: !!document.querySelector('[data-test="panel-tabs"]')
  }))()`);
  if (!ready.preview) {
    console.error('refusing: this renderer is not showing a project — open one first.');
    process.exit(2);
  }

  const info = await ev(`(() => {
    const p = window.__wreq('./src/editor/src/models/projectmodel.ts').ProjectModel.instance;
    return { name: p.name, components: p.getComponents().length, root: p.getRootComponent() && p.getRootComponent().name };
  })()`);
  console.log(`project: ${JSON.stringify(info)}`);

  const result = { project: info, arms: [], rows: [] };
  const arm = (name, held, detail) => {
    result.arms.push({ name, held, detail });
    console.log(`${held === null ? 'UNGRADED' : held ? 'HELD    ' : 'FAILED  '}  ${name}${detail ? ` — ${detail}` : ''}`);
  };

  // ---------------------------------------------------------------- the tabs
  if (!ready.panel) {
    // The Project panel may simply not be the open one. Open it the way the keybinding does.
    await ev(`(() => {
      const { SidebarModel } = window.__wreq('./src/editor/src/models/sidebar/sidebarmodel.tsx');
      SidebarModel.instance.switch('components');
      return 'switched';
    })()`);
    await wait(400);
  }

  const tabs = await ev(TABS);
  result.tabs = tabs;
  arm('the panel is titled Project and carries two tabs', Boolean(tabs.tabs && tabs.tabs.length === 2 && tabs.titled), JSON.stringify(tabs));

  // --------------------------------------------------------------- the rows
  let rows = await ev(ROWS);
  result.rows = rows;
  arm('Layers drew rows', rows.length > 0, `${rows.length} visible`);

  if (!rows.length) {
    finish(result, client);
    return;
  }

  // ------------------------------------------------------------- the indent
  //
  // 🔴 Expand until a row deeper than the cap is on screen, or say the arm could not be measured.
  // A screen whose deepest row is level 5 cannot tell a capped indent from an uncapped one.
  for (let attempt = 0; attempt < 12; attempt++) {
    if (rows.some((r) => r.level > MAX_INDENT_LEVEL)) break;
    const opened = await ev(`(() => {
      const carets = Array.from(document.querySelectorAll('[data-test="layers-caret"]'));
      const shut = carets.filter((c) => !/Expanded/.test(c.className));
      shut.slice(0, 20).forEach((c) => c.click());
      return shut.length;
    })()`);
    if (!opened) break;
    await wait(250);
    rows = await ev(ROWS);
  }
  result.rows = rows;

  const deep = rows.filter((r) => r.level > MAX_INDENT_LEVEL);
  const maxPadding = Math.max(...rows.map((r) => r.padding));
  const cap = TREE_INSET + MAX_INDENT_LEVEL * LAYERS_INDENT;
  arm(
    `the indent stops at ${cap}px however deep the row is`,
    deep.length ? maxPadding <= cap : null,
    deep.length
      ? `deepest row level ${Math.max(...rows.map((r) => r.level))}, widest padding ${maxPadding}px of a ${cap}px cap`
      : 'no row deeper than the cap is on screen — this fixture cannot grade it'
  );

  // The step itself, read off two rows one level apart rather than off the stylesheet.
  const byLevel = new Map();
  for (const r of rows) if (r.level <= MAX_INDENT_LEVEL && !byLevel.has(r.level)) byLevel.set(r.level, r.padding);
  const steps = [];
  for (const [level, padding] of byLevel) {
    if (byLevel.has(level - 1)) steps.push(padding - byLevel.get(level - 1));
  }
  arm(
    `one level of nesting is ${LAYERS_INDENT}px`,
    steps.length ? steps.every((s) => s === LAYERS_INDENT) : null,
    steps.length ? `steps seen: ${[...new Set(steps)].join(', ')}` : 'fewer than two depths on screen'
  );

  // ------------------------------------------------------- the editing tint
  const target =
    opt('editing') ||
    (rows.find((r) => r.kind === 'instance' && r.component) || {}).component ||
    null;

  if (target) {
    await ev(`(() => {
      const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
      const { EventDispatcher } = window.__wreq('./src/shared/utils/EventDispatcher.ts');
      const component = ProjectModel.instance.getComponentWithName(${JSON.stringify(target)});
      if (!component) return 'MISSING';
      EventDispatcher.instance.notifyListeners('ComponentPanel.SwitchToComponent', { component, pushHistory: true });
      return 'ok';
    })()`);
    await wait(600);

    const tinted = await ev(ROWS);
    result.tinted = { target, rows: tinted.filter((r) => r.tinted) };
    const band = tinted.find((r) => r.kind === 'band' && r.editing);
    arm(
      'the canvas component is drawn as a tinted region with an EDITING band',
      Boolean(band) && tinted.some((r) => r.tinted && r.kind !== 'band'),
      band ? `${band.label} · ${tinted.filter((r) => r.tinted).length} tinted rows` : 'no EDITING band on screen'
    );

    // ------------------------------------------------- a row opens the canvas
    const before = await ev(`(() => {
      const { NodeGraphContextTmp } = window.__wreq('./src/editor/src/contexts/NodeGraphContext/NodeGraphContext.tsx');
      return NodeGraphContextTmp.nodeGraph && NodeGraphContextTmp.nodeGraph.activeComponent ? NodeGraphContextTmp.nodeGraph.activeComponent.name : null;
    })()`);

    const other = tinted.find((r) => r.kind === 'instance' && r.component && r.component !== target);
    if (other) {
      await ev(`(() => {
        const rowsEls = Array.from(document.querySelectorAll('[data-test="layers-instance"]'));
        const el = rowsEls.find((e) => e.getAttribute('data-component') === ${JSON.stringify(other.component)});
        if (!el) return 'MISSING';
        el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        return 'ok';
      })()`);
      await wait(600);
      const after = await ev(`(() => {
        const { NodeGraphContextTmp } = window.__wreq('./src/editor/src/contexts/NodeGraphContext/NodeGraphContext.tsx');
        return NodeGraphContextTmp.nodeGraph && NodeGraphContextTmp.nodeGraph.activeComponent ? NodeGraphContextTmp.nodeGraph.activeComponent.name : null;
      })()`);
      arm('double-clicking an instance row opens that component on the canvas', after === other.component, `${before} → ${after} (wanted ${other.component})`);
    } else {
      arm('double-clicking an instance row opens that component on the canvas', null, 'no second instance row on screen');
    }

    // ------------------------------------------------------- the selection
    //
    // 🔴 **The row has to be one INSIDE a band**, or this arm cannot fail. The first row in the
    // tree belongs to the root component, so its path is a single id — and a build that had lost
    // the instance trail entirely would produce exactly that and pass. The arm wants a row whose
    // owner is a component something places, and asserts the path is longer than one.
    const inside = await ev(`(() => {
      const rowsEls = Array.from(document.querySelectorAll('[data-test="layers-node"]'));
      const bands = Array.from(document.querySelectorAll('[data-test="layers-band"]'));
      if (!bands.length) return null;
      const first = bands[0];
      const after = rowsEls.filter((el) => first.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
      const el = after[0];
      if (!el) return null;
      el.click();
      return el.textContent.trim().slice(0, 40);
    })()`);

    const selected = await ev(`(() => {
      const { selectionStore } = window.__wreq('./src/editor/src/models/selection/selectionStore.ts');
      const s = selectionStore.selection;
      const { SidebarModel } = window.__wreq('./src/editor/src/models/sidebar/sidebarmodel.tsx');
      return {
        source: s.source,
        component: s.component ? s.component.name : null,
        pathLengths: s.nodes.map((p) => p.length),
        panel: SidebarModel.instance.ActiveId,
        layersStillOnScreen: !!document.querySelector('[data-test="layers-header-screen"]')
      };
    })()`);
    result.selection = { row: inside, ...selected };
    arm(
      'clicking a row inside a band writes a PATH, not a bare node id',
      Boolean(inside && selected.source === 'layers' && selected.pathLengths.some((n) => n > 1)),
      JSON.stringify(result.selection)
    );

    // 🔴 The arm the seven green ones missed, and the screenshot caught: selecting a node opens
    // its Properties in the side panel, so a Layers row click used to replace the Project panel
    // with Properties — the tree removing itself on the first click in it.
    arm(
      'the Project panel is still on screen after a row is clicked',
      selected.panel === 'components' && selected.layersStillOnScreen,
      `panel=${selected.panel}, header present=${selected.layersStillOnScreen}`
    );
  }

  // ------------------------------------------------------------------ reset
  //
  // 🔴 A drive that ends by moving state is not an instrument: this one switches the canvas and
  // opens every caret it can reach, so a second run would read a different screen and report five
  // correct answers to a question nobody asked. It resets, and ASSERTS the reset — a reset that
  // silently did not happen leaves the next run reading the last one's leftovers.
  if (result.project.root) {
    await ev(`(() => {
      const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
      const { EventDispatcher } = window.__wreq('./src/shared/utils/EventDispatcher.ts');
      const component = ProjectModel.instance.getRootComponent();
      EventDispatcher.instance.notifyListeners('ComponentPanel.SwitchToComponent', { component, pushHistory: false });
      return 'ok';
    })()`);
    await wait(600);
    const back = await ev(`(() => {
      const { NodeGraphContextTmp } = window.__wreq('./src/editor/src/contexts/NodeGraphContext/NodeGraphContext.tsx');
      return NodeGraphContextTmp.nodeGraph && NodeGraphContextTmp.nodeGraph.activeComponent ? NodeGraphContextTmp.nodeGraph.activeComponent.name : null;
    })()`);
    arm('the drive put the canvas back where it found it', back === result.project.root, `${back} (root ${result.project.root})`);
  }

  if (shots) await shot(client, path.join(shots, 'layers.png'));
  finish(result, client);
}

async function shot(client, file) {
  const { data } = await client.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  console.log(`shot: ${file}`);
}

function finish(result, client) {
  const json = opt('json');
  if (json) fs.writeFileSync(json, JSON.stringify(result, null, 1));
  const graded = result.arms.filter((a) => a.held !== null);
  const failed = graded.filter((a) => !a.held);
  console.log(`\n${graded.length - failed.length}/${graded.length} graded arms held; ${result.arms.length - graded.length} ungraded.`);
  client.close();
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
