#!/usr/bin/env node
/**
 * P93 TVW-004 AC1 and AC6 — the five states, in one run, with the shots.
 *
 * AC1 names five things a person does in order, and the ACs after it are about what each one
 * leaves on screen. This drives them as a sequence rather than as five independent readings,
 * because the claim is about *continuity*: the tree stays on the screen the preview is showing
 * while the canvas moves underneath it, and that is only visible across the steps.
 *
 * 🔴 **The arm that matters most is the one only a second renderer can grade.** "Click `Headline`'s
 * row: it is selected on Hero's canvas **and outlined in the preview**" is a claim about the
 * *viewer*, so it is read in the viewer — `Highlighter.selectedNodes`, the map the outline divs are
 * drawn from. Reading the editor's own selection store would confirm the editor agreed with itself,
 * which is exactly what was true while the preview outlined nothing at all
 * ([[verify-the-consequence-not-just-the-mechanism]]).
 *
 * AC6's shots are taken inside each state rather than in a second pass: re-driving to a state to
 * photograph it is two states that are equal only if nothing drifted.
 *
 * Usage:
 *   NOODL_REMOTE_DEBUG_PORT=9222 node scripts/devtools/drive-tvw004-ac1.js \
 *     --shots <dir> [--json <file>] [--page /home] [--other /creator]
 *
 * Exits 0 when every graded arm held, 1 on a failure, 2 when the renderers are not ready.
 */
const fs = require('fs');
const path = require('path');

/** `instance-path.ts`'s matcher, written again — see `drive-tvw004-ac2.js` on why it is not imported. */
function pathAddresses(selector, rendered) {
  if (!selector.length || !rendered.length) return false;
  if (selector[selector.length - 1] !== rendered[rendered.length - 1]) return false;
  let at = 0;
  for (let i = 0; i < selector.length - 1; i++) {
    while (at < rendered.length - 1 && rendered[at] !== selector[i]) at++;
    if (at >= rendered.length - 1) return false;
    at++;
  }
  return true;
}

const args = process.argv.slice(2);
const opt = (n, fallback = null) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : fallback;
};

// 🔴 `cdp.js` reads NOODL_REMOTE_DEBUG_PORT at REQUIRE time.
const { appTarget, connect, evaluate } = require('./cdp.js');

const shotsDir = opt('shots');
if (shotsDir) fs.mkdirSync(shotsDir, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** `useSidePanelLayout`'s rail: the divider sits at `RAIL_WIDTH + panelWidth`. */
const RAIL_WIDTH = 52;

/** Poll until `check` is true, or refuse by name. A sleep long enough to be safe is also a sleep. */
async function until(check, timeoutMs, what) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (await check()) return;
    } catch {
      /* the renderer is mid-reload; that is what we are waiting for */
    }
    await wait(1000);
  }
  throw new Error(`gave up after ${Math.round(timeoutMs / 1000)}s waiting for ${what}`);
}

/**
 * §2's two widths are driven one per run (`--width`); both themes are photographed inside each.
 *
 * ⚠️ The first version of this script flipped the width between shots by writing
 * `editor-sidebar-widths` — and produced twenty screenshots of ONE width while naming two, because
 * `useSidePanelLayout` reads that setting once at mount. Every shot measured 326px, including the
 * ten called `240px`. The filename now carries the width that was **measured**, and `setPanelWidth`
 * drags the divider instead. [[a-write-nobody-reads-is-a-write-nobody-grades]]
 */
const THEMES = ['dark', 'light'];

const HEADER = `(() => {
  const el = document.querySelector('[data-test="layers-header-screen"]');
  const crumb = document.querySelector('[data-test="layers-crumb"]');
  return { header: el ? el.textContent.trim() : null, crumb: crumb ? crumb.textContent.trim() : null };
})()`;

const ROWS = `(() => {
  const nodes = document.querySelectorAll('[data-test="layers-node"], [data-test="layers-instance"], [data-test="layers-band"], [data-test="layers-cycle"], [data-test="layers-router-note"], [data-test="layers-dynamic-template"]');
  return Array.from(nodes).map((el) => ({
    kind: el.getAttribute('data-test').replace('layers-', ''),
    label: (el.querySelector('[class*="Label"], [class*="LayerBandLabel"], [class*="LayerNoteLabel"]') || el).textContent.trim(),
    level: Number(el.getAttribute('data-level')),
    tinted: /LayerTint/.test(el.className),
    editing: el.getAttribute('data-editing') === 'true',
    component: el.getAttribute('data-component') || null,
    path: (el.getAttribute('data-node-path') || '').split('/').filter(Boolean)
  }));
})()`;

/**
 * What is actually on screen when a shot is taken: the resolved theme, and the panel's real width.
 *
 * The width is measured on the element that carries the tabs, walking up to the first ancestor
 * wider than it — the panel's own box. Measured, because the number this drive asked for and the
 * number the panel is drawn at were different for a whole run.
 */
const MEASURED = `(() => {
  const tabs = document.querySelector('[data-test="panel-tabs"]');
  let panel = tabs;
  while (panel && panel.parentElement && panel.getBoundingClientRect().width < 100) panel = panel.parentElement;
  const box = panel ? panel.closest('[class*="SidePanel"]') || panel : null;
  return {
    theme: document.documentElement.getAttribute('data-theme'),
    panel: box ? Math.round(box.getBoundingClientRect().width) : -1
  };
})()`;

/**
 * The instance paths of everything the preview is actually drawing.
 *
 * 🔴 **Used to CHOOSE the drive's subjects, not to grade them.** An arm that clicks whichever row
 * happens to be first cannot fail honestly: the first run of this script picked a `Loader` — a
 * component that draws nothing until something is loading — and then reported that the preview
 * outlined nothing, which was true and meant nothing. An arm about the outline needs a subject that
 * is *on screen* ([[an-instrument-must-be-armed-before-it-measures]]).
 */
const RENDERED_PATHS = `(() => {
  const fiberOf = (el) => { for (const k in el) if (k.startsWith('__reactFiber$')) return el[k]; };
  const composite = (f) => { let x = f && f.return; while (x && typeof x.type === 'string') x = x.return; return x; };
  const noodlOf = (el) => {
    let f = composite(fiberOf(el));
    for (let i = 0; f && i < 512; i++) {
      const props = f.stateNode && f.stateNode.props;
      if (props && props.noodlNode) return props.noodlNode;
      f = composite(f);
    }
  };
  const pathOf = (node) => {
    const p = [node.id];
    let cur = node;
    for (let d = 0; d < 256; d++) {
      const owner = (cur.parentNodeScope || cur.nodeScope || {}).componentOwner;
      if (!owner || owner === cur || !owner.parentNodeScope) break;
      p.unshift(owner.id);
      cur = owner;
    }
    return p;
  };
  const out = new Set();
  for (const el of document.querySelectorAll('*')) {
    const n = noodlOf(el);
    if (n && n.id) out.add(pathOf(n).join('/'));
  }
  return Array.from(out);
})()`;

/** What the preview is actually outlining — the map the outline divs are drawn from. */
const PREVIEW_SELECTION = `(() => {
  const h = window.NoodlEditorHighlightAPI && window.NoodlEditorHighlightAPI.highlighter;
  if (!h) return { available: false };
  return { available: true, selected: h.selectedNodes ? h.selectedNodes.size : -1 };
})()`;

async function main() {
  const editor = await connect(await appTarget('editor'));

  /**
   * 🔴 **Every evaluation re-establishes `__wreq` itself.** This drive reloads the renderer on
   * purpose (the panel width is read once at mount), and a reload throws the handle away. Doing the
   * bootstrap once and then polling for it was not enough: webpack issues its own reloads, so a
   * poll that passed was answered by a page that had since been replaced, and the very next
   * evaluation died with `window.__wreq is not a function` — three runs in a row, at three
   * different lines. Prepending the bootstrap costs nothing and cannot race.
   */
  const BOOT = `(() => { if (typeof window.__wreq !== 'function' && typeof webpackChunknoodl_editor !== 'undefined') { webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]); } })();`;
  const ev = (expr) => evaluate(editor, `${BOOT}${expr}`);

  await ev(`(() => { if (!window.__wreq) webpackChunknoodl_editor.push([[Symbol()],{},(r)=>{window.__wreq=r;}]); return typeof window.__wreq; })()`);
  await wait(200);

  const ready = await ev(`(() => ({ preview: !!document.querySelector('[data-test="app-preview"] webview'), panel: !!document.querySelector('[data-test="panel-tabs"]') }))()`);
  if (!ready.preview) {
    console.error('refusing: this renderer is not showing a project — open one first.');
    process.exit(2);
  }

  /**
   * The width, set the way a person sets it: by dragging the divider.
   *
   * 🔴 **Not by writing the setting and reloading**, which is what this drive did for an hour and
   * what cost it four failed runs. `useSidePanelLayout` seeds `widths` with
   * `useState(readStoredWidths)` — read once at mount — so the setting only takes effect across a
   * reload; and a reload throws away `__wreq`, races webpack's own reloads, and on the last
   * attempt the written width did not survive the reopen at all (`editor-sidebar-widths` came back
   * `undefined`). The divider needs none of it: it is the supported way to resize the panel, it
   * applies immediately, and it leaves the renderer alone.
   *
   * ⚠️ Two dividers match the class; the one that splits the panel from the canvas is the one
   * **taller than it is wide**. Picking the first match grabbed the horizontal canvas/preview
   * splitter and resized nothing.
   */
  const setPanelWidth = async (target) => {
    const at = await ev(`(() => {
      const d = Array.from(document.querySelectorAll('[class*="FrameDivider-module__Divider--"]'))
        .find((e) => { const b = e.getBoundingClientRect(); return b.height > b.width; });
      if (!d) return null;
      const r = d.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    })()`);
    if (!at) throw new Error('no vertical frame divider on screen');

    const to = RAIL_WIDTH + target;
    const mouse = (type, x) =>
      editor.send('Input.dispatchMouseEvent', {
        type,
        x,
        y: at.y,
        button: 'left',
        buttons: type === 'mouseReleased' ? 0 : 1,
        clickCount: 1
      });

    await mouse('mousePressed', at.x);
    await wait(80);
    // ⚠️ Step TOWARDS the target and stop at it. A fixed-size step that just keeps going overshoots
    // and then oscillates for ever — this loop hung the drive until it was written this way.
    const steps = Math.max(1, Math.ceil(Math.abs(to - at.x) / 8));
    for (let i = 1; i <= steps; i++) {
      await mouse('mouseMoved', Math.round(at.x + ((to - at.x) * i) / steps));
      await wait(12);
    }
    await mouse('mouseReleased', to);
    await wait(800);
  };

  const width = Number(opt('width', '0'));
  if (width) {
    await setPanelWidth(width);
    const seen = await ev(MEASURED);
    // The panel box measures a couple of pixels under its width (its own border), so this refuses a
    // leftover width rather than demanding the two numbers match. The filename carries what was
    // measured either way.
    if (Math.abs(seen.panel - width) > 6) {
      console.error(`refusing: asked for a ${width}px panel and the panel is ${seen.panel}px — the shots would be mislabelled.`);
      process.exit(2);
    }
    console.log(`panel width: ${seen.panel}px (asked ${width})`);
  }

  //
  // 🔴 **Design mode, or AC1 state 3 cannot be graded.** `EditorDocument` gates the whole outline
  // channel behind `if (!previewMode)` — DES-001: the editor does not draw its chrome over an app
  // somebody is only previewing. So "it is outlined in the preview" is a claim about DESIGN mode,
  // and a drive that stays in preview mode reads an absence the product is right to produce.
  //
  // ⚠️ Through the topbar's own segmented control, not an invented event. `request-preview-mode`
  // exists and goes the OTHER way; there is no `request-design-mode`, and emitting one did exactly
  // nothing while reporting success.
  await ev(`(() => {
    if (document.querySelector('[data-test="design-mode-banner"]')) return 'already';
    const design = Array.from(document.querySelectorAll('button'))
      .find((b) => b.children.length === 0 && b.textContent.trim() === 'Design');
    if (!design) return 'MISSING';
    design.click();
    return 'clicked';
  })()`);
  await wait(1500);
  if (!(await ev(`(() => !!document.querySelector('[data-test="design-mode-banner"]'))()`))) {
    console.error('refusing: the preview is still in preview mode, so no selection can be outlined — AC1 state 3 would read a designed-in absence.');
    process.exit(2);
  }

  const viewer = await connect(await appTarget('viewer'));

  const project = await ev(`(() => {
    const p = window.__wreq('./src/editor/src/models/projectmodel.ts').ProjectModel.instance;
    return { name: p.name, root: p.getRootComponent() && p.getRootComponent().name };
  })()`);
  console.log(`project: ${project.name} (root ${project.root})`);

  const result = { project, states: [], arms: [], shots: [] };
  const arm = (name, held, detail) => {
    result.arms.push({ name, held, detail });
    console.log(`${held === null ? 'UNGRADED' : held ? 'HELD    ' : 'FAILED  '}  ${name}${detail ? ` — ${detail}` : ''}`);
  };

  const switchCanvas = async (component) =>
    ev(`(() => {
      const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
      const { EventDispatcher } = window.__wreq('./src/shared/utils/EventDispatcher.ts');
      const c = ProjectModel.instance.getComponentWithName(${JSON.stringify(component)});
      if (!c) return 'MISSING';
      EventDispatcher.instance.notifyListeners('ComponentPanel.SwitchToComponent', { component: c, pushHistory: false });
      return 'ok';
    })()`);

  const canvasComponent = async () =>
    ev(`(() => {
      const { NodeGraphContextTmp } = window.__wreq('./src/editor/src/contexts/NodeGraphContext/NodeGraphContext.tsx');
      const g = NodeGraphContextTmp.nodeGraph;
      return g && g.activeComponent ? g.activeComponent.name : null;
    })()`);

  const navigate = async (to) => {
    // The app's own navigation API — `pushState` plus the synthetic `popstate` the Router listens
    // for, which is exactly what a `Navigate` node does. Driven in the VIEWER, because that is
    // where a person's click would land.
    await evaluate(viewer, `(() => { window.Noodl.Navigation.navigateToPath(${JSON.stringify(to)}); return location.href; })()`);
    await wait(2500);
  };

  /**
   * AC6. Four photographs of the state on screen: both themes at both widths.
   *
   * ⚠️ The theme flip and the width write are each followed by a wait and then a **re-read**, never
   * trusted in the same evaluation that made them — a `data-theme` written on `documentElement` is
   * not applied to anything `getComputedStyle` can see until the next frame
   * ([[a-theme-flip-does-not-apply-in-the-same-eval]]).
   */
  const photograph = async (state) => {
    if (!shotsDir) return;
    for (const theme of THEMES) {
      await ev(`(() => {
        const { ThemeManager } = window.__wreq('./src/editor/src/models/ThemeManager.ts');
        ThemeManager.setMode(${JSON.stringify(theme)});
        return 'ok';
      })()`);
      await wait(900);
      // 🔴 Read the theme and the width back off the DOM AFTER the wait, and stamp both into the
      // filename from what was READ rather than from what was asked for. A shot named for the
      // setting that produced it is a caption, not a measurement.
      const applied = await ev(MEASURED);
      const file = path.join(shotsDir, `${state}--${applied.theme}--${applied.panel}px.png`);
      const { data } = await editor.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
      result.shots.push({ state, theme: applied.theme, panel: applied.panel, file: path.basename(file) });
      console.log(`         shot ${path.basename(file)}`);
    }
    await ev(`(() => {
      const { ThemeManager } = window.__wreq('./src/editor/src/models/ThemeManager.ts');
      ThemeManager.setMode('dark');
      return 'ok';
    })()`);
    await wait(600);
  };

  // ============================================================ state 1 — the screen
  await navigate(opt('page', '/home'));
  const homePage = await ev(HEADER);
  await switchCanvas(project.root);
  await wait(900);

  let rows = await ev(ROWS);
  result.states.push({ state: 'canvas-on-the-shell', header: homePage, rows: rows.length });
  arm(
    '1. Layers is headed with the screen the preview is showing, in the preview',
    Boolean(homePage.header && /^Layers · /.test(homePage.header)),
    JSON.stringify(homePage)
  );
  const showing = rows.find((r) => r.kind === 'band' && /^SHOWING /.test(r.label));
  arm(
    '1. the tree starts at the top of the screen, with a band where the page begins (R-R)',
    Boolean(showing) && rows[0] && rows[0].kind === 'node' && showing.level > rows[0].level,
    showing ? `${rows.length} rows, first "${rows[0].label}" at level ${rows[0].level}, "${showing.label}" at ${showing.level}` : 'no SHOWING band'
  );
  await photograph('1-screen');

  // ================================================ state 2 — editing something on it
  //
  // Expand until an instance row is on screen, then open it the way a person does: a double-click
  // on the row, not a call to `switchToComponent`.
  //
  // 🔴 **Expand until an instance that is ON SCREEN is reachable, not until any instance is.**
  // Stopping at the first instance row picked `Loader` on both of the first two runs — the shell's
  // spinner, which draws nothing until something is loading. Every arm after it then measured a
  // component that was not on the screen, and the outline arm reported an absence that meant
  // nothing.
  const renderedPaths = (await evaluate(viewer, RENDERED_PATHS)).map((p) => p.split('/'));
  const isOnScreen = (rowPath) => rowPath.length > 0 && renderedPaths.some((r) => pathAddresses(rowPath, r));
  console.log(`         the preview is drawing ${renderedPaths.length} nodes`);

  //
  // ⚠️ **An instance row is never "on screen" by the leaf test, and that is correct.** A component
  // instance draws no element of its own — its insides do — so no rendered node's path *ends* in
  // the instance's id, and `pathAddresses` (which demands the last ids match) says no to every one
  // of them. AC2's run said the same thing out loud: `Main Navbar`, `Limiter`, `Logo` and
  // `Icon Button` were all among the rows "with nothing rendered". What makes an instance on screen
  // is that something INSIDE it is: its path is a prefix subsequence of some rendered path.
  const drawsSomething = (rowPath) =>
    rowPath.length > 0 &&
    renderedPaths.some((rendered) => {
      let at = 0;
      for (const id of rowPath) {
        while (at < rendered.length && rendered[at] !== id) at++;
        if (at >= rendered.length) return false;
        at++;
      }
      return true;
    });

  const onScreenInstance = () => rows.find((r) => r.kind === 'instance' && r.component && drawsSomething(r.path));
  for (let attempt = 0; attempt < 14; attempt++) {
    if (onScreenInstance()) break;
    const opened = await ev(`(() => {
      const shut = Array.from(document.querySelectorAll('[data-test="layers-caret"]')).filter((c) => !/Expanded/.test(c.className));
      shut.slice(0, 16).forEach((c) => c.click());
      return shut.length;
    })()`);
    if (!opened) break;
    await wait(300);
    rows = await ev(ROWS);
  }

  const instance = onScreenInstance();
  if (!instance) {
    arm('2. double-clicking an instance row opens it on the canvas', null, 'no instance row on this screen is drawn by the preview');
  } else {
    const before = await canvasComponent();
    await ev(`(() => {
      const el = Array.from(document.querySelectorAll('[data-test="layers-instance"]')).find((e) => e.getAttribute('data-component') === ${JSON.stringify(instance.component)});
      if (!el) return 'MISSING';
      el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      return 'ok';
    })()`);
    await wait(1200);

    const after = await canvasComponent();
    const state2 = await ev(HEADER);
    rows = await ev(ROWS);
    const band = rows.find((r) => r.kind === 'band' && r.editing);
    const tinted = rows.filter((r) => r.tinted);
    result.states.push({ state: 'editing-an-instance', header: state2, rows: rows.length, tinted: tinted.length });

    arm('2. double-clicking an instance row opens it on the canvas', after === instance.component, `${before} → ${after} (wanted ${instance.component})`);
    arm(
      '2. Layers still shows the screen, not the thing being edited',
      state2.header === homePage.header,
      `${state2.header} (was ${homePage.header})`
    );
    arm(
      '2. the region being edited is tinted and its band says EDITING',
      Boolean(band) && tinted.some((r) => r.kind !== 'band'),
      band ? `"${band.label}" · ${tinted.length} tinted rows` : 'no EDITING band'
    );
    arm(
      '2. the second header line says where it sits and in how many places',
      Boolean(state2.crumb && /in \d+ place/.test(state2.crumb)),
      state2.crumb || 'no crumb'
    );
    await photograph('2-editing');

    // ========================================== state 3 — a row selects, in both surfaces
    //
    // 🔴 A row INSIDE the band: the first row of the tree belongs to the root, so its path is one
    // id long and a build that had lost the instance trail would pass on it.
    //
    // ⚠️ And a row whose node the preview is DRAWING, or the outline arm below grades an absence
    // against an absence. The candidates are the rows after the `EDITING` band; the one chosen is
    // the first of them that is on screen.
    rows = await ev(ROWS);
    const bandIndex = rows.findIndex((r) => r.kind === 'band' && r.editing);
    const candidates = bandIndex < 0 ? [] : rows.slice(bandIndex + 1).filter((r) => r.kind === 'node');
    const subject = candidates.find((r) => isOnScreen(r.path)) || candidates[0];

    const clicked = subject
      ? await ev(`(() => {
          const el = Array.from(document.querySelectorAll('[data-test="layers-node"]'))
            .find((e) => e.getAttribute('data-node-path') === ${JSON.stringify(subject.path.join('/'))});
          if (!el) return null;
          el.click();
          return { label: (el.querySelector('[class*="Label"]') || el).textContent.trim(), path: el.getAttribute('data-node-path') };
        })()`)
      : null;
    const subjectOnScreen = Boolean(subject && isOnScreen(subject.path));
    await wait(1200);

    const editorSide = await ev(`(() => {
      const { selectionStore } = window.__wreq('./src/editor/src/models/selection/selectionStore.ts');
      const { SidebarModel } = window.__wreq('./src/editor/src/models/sidebar/sidebarmodel.tsx');
      const s = selectionStore.selection;
      return {
        source: s.source,
        component: s.component ? s.component.name : null,
        pathLengths: s.nodes.map((p) => p.length),
        panel: SidebarModel.instance.ActiveId,
        layersStillOnScreen: !!document.querySelector('[data-test="layers-header-screen"]')
      };
    })()`);
    const previewSide = await evaluate(viewer, PREVIEW_SELECTION);
    result.states.push({ state: 'a-row-selects', clicked, editorSide, previewSide });

    arm(
      '3. clicking a row inside a band writes a PATH, not a bare node id',
      Boolean(clicked && editorSide.source === 'layers' && editorSide.pathLengths.some((n) => n > 1)),
      `${clicked ? clicked.label : 'no row'} — ${JSON.stringify(editorSide.pathLengths)}`
    );
    arm(
      '3. the Project panel is still on screen after a row is clicked',
      editorSide.panel === 'components' && editorSide.layersStillOnScreen,
      `panel=${editorSide.panel}, header present=${editorSide.layersStillOnScreen}`
    );
    // The consequence, read where it happens.
    arm(
      '3. THE PREVIEW OUTLINES IT',
      !previewSide.available || !subjectOnScreen ? null : previewSide.selected > 0,
      !previewSide.available
        ? 'the preview exposes no highlight API — cannot grade'
        : !subjectOnScreen
          ? `"${subject ? subject.label : 'no row'}" is not among the ${renderedPaths.length} nodes the preview draws — this row cannot grade an outline`
          : `Highlighter.selectedNodes = ${previewSide.selected} for ${clicked ? clicked.path : '(no row)'}`
    );
    await photograph('3-selected');
  }

  // ====================================== state 4 — the preview goes somewhere else
  const other = opt('other', '/creator');
  await navigate(other);
  const state4 = await ev(HEADER);
  const rows4 = await ev(ROWS);
  result.states.push({ state: 'preview-navigated', to: other, header: state4, rows: rows4.length });
  arm(
    `4. navigating the preview to ${other} moves Layers to that screen`,
    Boolean(state4.header && state4.header !== homePage.header && /^Layers · /.test(state4.header)),
    `${homePage.header} → ${state4.header}, ${rows4.length} rows`
  );
  await photograph('4-navigated');

  // ================================ state 5 — the canvas is on something not on screen
  //
  // 🔴 **"On no screen" is a claim about PLACEMENT, not about this row list.** The first run read
  // the components named on rows and picked the first that was not among them — and chose `/App`,
  // the project's own root, which is on every screen there is. `data-component` is only set on
  // instance and band rows, so the root is never named on one, and "not named here" quietly meant
  // "not on screen". The question this asks instead is the one TVW-002's strip asks: is there any
  // node anywhere in the project whose type is this component?
  const offScreen = await ev(`(() => {
    const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
    const project = ProjectModel.instance;
    const placed = new Set();
    for (const c of project.getComponents()) {
      c.forEachNode((n) => { if (n.typename) placed.add(n.typename); });
    }
    const root = project.getRootComponent() && project.getRootComponent().name;
    for (const c of project.getComponents()) {
      if (c.name === root || placed.has(c.name)) continue;
      if (c.name.startsWith('/#') || c.name.includes('/Pages/')) continue;
      // It must DRAW something, or "it isn't on this screen" is not the interesting sentence.
      const roots = (c.graph && c.graph.roots) || [];
      if (roots.length) return c.name;
    }
    return null;
  })()`);

  if (!offScreen) {
    arm('5. a component that is on no screen says so', null, 'no such component in this project');
  } else {
    await switchCanvas(offScreen);
    await wait(1400);

    // 🔴 **The panel may well be on the OTHER tab here, and that is AC5, not a bug.**
    // `defaultTabFor` sends an *unplaced* visual to Components, because Layers answers "where is
    // this on screen" and for a component nothing places there is no answer to open on. The first
    // run of this drive read `layers-header-screen` as null and called it an empty tree; what it
    // had actually measured was the tab rule working. So the panel is put back on Layers, and then
    // AC1's real question is asked — does the tree still show the screen?
    //
    // 🔴 **But AC5's tab rule is NOT graded here, and trying to was a mistake worth writing down.**
    // `defaultTabFor` is a COLD-START default: `ComponentsPanelReact` keeps `chosenTab` and only
    // falls back to the default while it is null, and §2 says that choice is remembered for the
    // session. This drive *makes* such a choice two lines below — it clicks `Layers` to ask AC1's
    // own question — and the panel does not remount between runs, so the next run found the panel
    // on Layers and called the tab rule broken. It was the memory, working as specified: the same
    // arm read `Components` at 300px and `Layers` at 240px from one unchanged build.
    //
    // An arm whose answer depends on what the previous run did is not measuring the product. AC5
    // wants a cold start on each of four component kinds, which is a drive of its own.
    await ev(`(() => {
      const panel = document.querySelector('[data-test="panel-tabs"]');
      const layers = Array.from(panel.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Layers');
      if (layers) layers.click();
      return 'ok';
    })()`);
    await wait(1000);

    const state5 = await ev(HEADER);
    const strip = await ev(`(() => {
      const el = document.querySelector('[data-test="preview-strip"]');
      return el ? el.textContent.trim() : null;
    })()`);
    const rows5 = await ev(ROWS);
    result.states.push({ state: 'not-on-this-screen', component: offScreen, header: state5, strip, rows: rows5.length });

    arm(
      '5. Layers keeps showing the screen when the canvas is on something not on it',
      Boolean(state5.header === state4.header && rows5.length > 0),
      `${state5.header}, ${rows5.length} rows, canvas on ${offScreen}`
    );
    arm(
      '5. the panel carries no crumb for a component that is not on this screen (R-U)',
      state5.crumb === null,
      state5.crumb === null ? 'no crumb, correctly' : `crumb present: ${state5.crumb}`
    );
    arm(
      '5. the sentence is on screen exactly once, at the seam',
      Boolean(strip && strip.length > 0),
      strip ? strip.slice(0, 90) : 'no strip on screen'
    );
    await photograph('5-not-on-screen');
  }

  // ------------------------------------------------------------------ reset
  await navigate(opt('page', '/home'));
  await switchCanvas(project.root);
  await wait(900);
  const back = await canvasComponent();
  arm('the drive put the canvas back where it found it', back === project.root, `${back} (root ${project.root})`);

  const json = opt('json');
  if (json) fs.writeFileSync(json, JSON.stringify(result, null, 1));
  const graded = result.arms.filter((a) => a.held !== null);
  const failed = graded.filter((a) => !a.held);
  console.log(`\n${graded.length - failed.length}/${graded.length} graded arms held; ${result.arms.length - graded.length} ungraded.`);
  viewer.close();
  editor.close();
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
