#!/usr/bin/env node
/**
 * P93 TVW-005 — the drop-target strip on the Layers tab header (§2 row 4, AC1's third sentence).
 *
 * The two tabs are exclusive: a component row lives in the Components tab and the rows it could be
 * dropped between live in Layers, and they are **never on screen together**. So the strip is not a
 * decoration on a gesture that already worked — without it there is no gesture at all, which is the
 * state slice 1 shipped in.
 *
 * 🔴 **Everything here is dispatched as MOUSE EVENTS.** The claim is the gesture: that a press on a
 * Components row and a release on the Layers tab is a thing the editor understands. Calling into
 * the hook would grade the planner a second time, and `tests-unit/tvw-005` already grades that
 * ([[verify-the-consequence-not-just-the-mechanism]]).
 *
 * 🔴 **AC4 is a SPY, not a comparison.** "The same create path as a canvas drop" is a claim about
 * which function ran, and two code paths that produce equal-looking nodes today would still be two
 * sets of defaults tomorrow. `NodeOperations.prototype.createNewNode` is wrapped for the duration
 * of the drop and the placement it was handed is read off the call.
 *
 * Usage:
 *   node scripts/devtools/drive-tvw005-strip.js [--dir <project>] [--json <file>]
 *
 * Exits 0 when every graded arm held, 1 on a failure, 2 when the editor is not ready.
 */
const fs = require('fs');

const args = process.argv.slice(2);
const opt = (n, fallback = null) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const { appTarget, connect, evaluate } = require('./cdp.js');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const PROJECT_DIR = opt('dir', '/Users/richardosborne/vscode_projects/NodeGX test projects/TVW-005 s17 Strip');
/** The page whose `Page` node is the root a strip drop lands in. */
const PAGE = '/Pages/Main/Home';

/** What to put in the Components filter to surface one row of each kind, and nothing else. */
const SUBJECTS = {
  visual: 'Divider',
  page: 'Home',
  logic: 'GTM - Send Page View'
};

async function main() {
  const editor = await connect(await appTarget('editor'));
  const BOOT = `(() => { if (typeof window.__wreq !== 'function' && typeof webpackChunknoodl_editor !== 'undefined') { webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]); } })();`;
  const ev = (expr) => evaluate(editor, `${BOOT}${expr}`);

  const result = { arms: [] };
  const arm = (name, held, detail) => {
    result.arms.push({ name, held, detail });
    console.log(`${held === null ? 'UNGRADED' : held ? 'HELD    ' : 'FAILED  '}  ${name}${detail ? ` — ${detail}` : ''}`);
  };

  async function until(check, timeoutMs, what) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        if (await check()) return;
      } catch {
        /* mid-remount */
      }
      await wait(700);
    }
    throw new Error(`gave up after ${Math.round(timeoutMs / 1000)}s waiting for ${what}`);
  }

  // ------------------------------------------------------------- the project
  const openHere = async () => {
    const open = await ev(`(() => {
      const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
      const p = ProjectModel.instance;
      return p ? p._retainedProjectDirectory : null;
    })()`);
    if (open === PROJECT_DIR) return;
    // The launcher round trip, from TVW-004 AC5: the router handle is three fibers down from
    // `#root`, not a module export ([[open-a-copy-of-a-real-project-in-the-editor]]).
    await ev(`(() => {
      const root = document.getElementById('root');
      let f = root[Object.keys(root).find((k) => k.startsWith('__reactContainer'))];
      let depth = 0;
      while (f && depth < 40) {
        const pr = f.memoizedProps;
        if (pr && pr.route && pr.route.router && typeof pr.route.router.route === 'function') { window.__stripRouter = pr.route.router; break; }
        f = f.child; depth++;
      }
      if (!window.__stripRouter) return 'NO ROUTER';
      window.__stripRouter.route({ to: 'projects' });
      return 'ok';
    })()`);
    await wait(1500);
    await ev(`(async () => {
      const { LocalProjectsModel } = window.__wreq('./src/editor/src/utils/LocalProjectsModel.ts');
      const p = await LocalProjectsModel.instance.openProjectFromFolder(${JSON.stringify(PROJECT_DIR)});
      window.__stripRouter.route({ to: 'editor', project: p });
      return 'ok';
    })()`);
    await until(async () => ev(`(() => !!document.querySelector('[data-test="panel-tabs"]'))()`), 60000, 'the project');
  };

  const switchCanvas = async (component) => {
    await ev(`(() => {
      const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
      const { EventDispatcher } = window.__wreq('./src/shared/utils/EventDispatcher.ts');
      const c = ProjectModel.instance.getComponentWithName(${JSON.stringify(component)});
      if (!c) return 'MISSING';
      EventDispatcher.instance.notifyListeners('ComponentPanel.SwitchToComponent', { component: c, pushHistory: false });
      return 'ok';
    })()`);
    await wait(1200);
  };

  /** The page node and its children, as the MODEL has them. */
  const childrenOfPage = async () =>
    ev(`(() => {
      const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
      const c = ProjectModel.instance.getComponentWithName(${JSON.stringify(PAGE)});
      let page = null;
      c.graph.forEachNode((n) => { if (n.type && n.type.name === 'Page') page = n; });
      if (!page) return null;
      return { pageId: page.id, children: page.children.map((k) => ({ id: k.id, type: typeof k.type === 'string' ? k.type : k.type.name })) };
    })()`);

  const graphJson = async (component) =>
    ev(`(() => {
      const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
      const c = ProjectModel.instance.getComponentWithName(${JSON.stringify(component)});
      return JSON.stringify(c.graph.toJSON());
    })()`);

  const openPanel = async () => {
    await ev(`(() => { window.__wreq('./src/editor/src/models/sidebar/index.ts').SidebarModel.instance.switch('components'); return 'ok'; })()`);
    await until(async () => ev(`(() => !!document.querySelector('[data-test="panel-tabs"]'))()`), 15000, 'the tab bar');
  };

  const clickTab = async (which) => {
    await ev(`(() => { const t = document.querySelector('[data-test="panel-tab-${which}"]'); if (t) t.click(); return 'ok'; })()`);
    await wait(700);
  };

  /**
   * The filter is how a component row is got on screen — PNL-006's own door, and the alternative
   * is clicking folders open until the right one appears. Written through the native value setter
   * so React sees a real `input` event rather than a value that changed under it.
   */
  const filterTo = async (query) => {
    await ev(`(() => {
      const input = document.querySelector('input[placeholder="Filter components"]');
      if (!input) return 'NO FILTER';
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, ${JSON.stringify(query)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return 'ok';
    })()`);
    await wait(900);
  };

  /**
   * Where a Components row is, and whether a press there would reach it.
   *
   * 🔴 A row scrolled out of the panel answers `getBoundingClientRect()` with plausible
   * coordinates and a press at them lands on `<html>` — two runs of the sibling drive read as
   * *the drag will not start* for exactly that reason ([[a-rendered-surface-can-be-behind-a-blocker]]).
   */
  const componentRow = async (kind) =>
    ev(`(() => {
      const rows = Array.from(document.querySelectorAll('[data-test="component-tree-item"]'));
      const row = rows.find((r) => r.getAttribute('data-kind') === ${JSON.stringify(kind)});
      if (!row) return null;
      row.scrollIntoView({ block: 'center' });
      const b = row.getBoundingClientRect();
      const x = Math.round(b.left + b.width / 2);
      const y = Math.round(b.top + b.height / 2);
      const hit = document.elementFromPoint(x, y);
      // The NAME comes off the title attribute (kind, then the local name), never off textContent:
      // a row draws its usage meta beside its name, so the first run of this drive compared the
      // product's sentence against "GTM - Send Page Viewunplaced" and read a correct sentence as a
      // failure. The instrument was wrong, not the build.
      const title = row.getAttribute('title') || '';
      const name = title.includes(' · ') ? title.split(' · ').pop() : row.textContent.trim();
      return { x, y, name, label: row.textContent.trim().slice(0, 32), kind: row.getAttribute('data-kind'), reachable: Boolean(hit && row.contains(hit)) };
    })()`);

  const tabRect = async (which) =>
    ev(`(() => {
      const t = document.querySelector('[data-test="panel-tab-${which}"]');
      if (!t) return null;
      const b = t.getBoundingClientRect();
      return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) };
    })()`);

  /** What both tabs and the drag are saying, sampled while the gesture is still in the air. */
  const inTheAir = async () =>
    ev(`(() => {
      const layers = document.querySelector('[data-test="panel-tab-layers"]');
      const components = document.querySelector('[data-test="panel-tab-components"]');
      // popuplayer.ts:363 builds the drag message with these exact class names.
      const box = document.querySelector('.popup-layer-drag-message');
      const text = document.querySelector('.popup-layer-drag-message-text');
      return {
        strip: layers ? layers.getAttribute('data-drop-strip') : 'NO TAB',
        hint: Boolean(layers && layers.querySelector('[data-test="panel-tab-drop-hint"]')),
        layersActive: layers ? layers.getAttribute('data-active') : 'NO TAB',
        componentsActive: components ? components.getAttribute('data-active') : 'NO TAB',
        said: { text: text ? text.textContent.trim() : 'ABSENT', visible: Boolean(box) && box.style.display !== 'none' }
      };
    })()`);

  /**
   * 🔴 **webpack-dev-server's overlay is an `about:blank` iframe the size of the window at
   * z-index 2147483647**, and while it is up every row in the panel is drawn and none of them can
   * be pressed. Two arms of an earlier run went UNGRADED on it — correctly, because the reachability
   * guard caught it, but the reading was about the harness rather than about the build
   * ([[a-rendered-surface-can-be-behind-a-blocker]]). A rebuild can start at any moment while the
   * watchers are running, so it is waited out rather than assumed absent.
   */
  const overlayUp = async () =>
    ev(`(() => Array.from(document.querySelectorAll('iframe')).some((f) => {
      const b = f.getBoundingClientRect();
      return b.width >= window.innerWidth - 2 && b.height >= window.innerHeight - 2;
    }))()`);

  const settle = async () => {
    await until(async () => !(await overlayUp()), 120000, 'the dev-server overlay to clear');
  };

  const mouse = (type, x, y, buttons = 1) =>
    editor.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons, clickCount: 1 });

  /**
   * Press a Components row, carry it to the Layers tab, sample, and let go.
   *
   * ⚠️ The first move is 8px **sideways inside the row**. `ComponentItem` still measures its 5px
   * threshold in its own `onMouseMove` (the row-local pattern this task's own §7.1 found the defect
   * in), so a first move that leaves the row would never start the drag at all.
   */
  const dragComponentToStrip = async (row, { release = true, dwell = 0 } = {}) => {
    const tab = await tabRect('layers');
    if (!tab) return { ok: false, because: 'no Layers tab on screen' };
    await mouse('mousePressed', row.x, row.y);
    await wait(60);
    await mouse('mouseMoved', row.x + 8, row.y);
    await wait(120);
    await mouse('mouseMoved', tab.x, tab.y);
    await wait(60);
    await mouse('mouseMoved', tab.x, tab.y);
    await wait(60);

    /**
     * 🔴 **The sample is taken BEFORE the dwell, and the dwell defaults to nothing.**
     *
     * The first version waited 240ms and then sampled, and the sample is a CDP round trip — so a
     * "quick" drop was released ~500ms after the pointer reached the strip, which is exactly
     * `SPRING_MS`. The tab sprang open, the strip's handlers came off with it, and the drop landed
     * on nothing: three arms went red describing a build that was working
     * ([[a-new-instruments-first-drive-finds-instrument-faults]]). Time spent on the strip is the
     * thing under test here; it cannot also be instrument overhead.
     */
    const air = await inTheAir();
    if (dwell) await wait(dwell);
    if (release) {
      await mouse('mouseReleased', tab.x, tab.y, 0);
      await wait(900);
    }
    return { ok: true, air, tab };
  };

  /** A Layers row, once the spring has opened the tab under the drag. */
  const layersRow = async (nodeId) =>
    ev(`(() => {
      const rows = Array.from(document.querySelectorAll('[data-test="layers-node"], [data-test="layers-instance"]'));
      const row = rows.find((r) => (r.getAttribute('data-node-path') || '').split('/').pop() === ${JSON.stringify(nodeId)});
      if (!row) return null;
      row.scrollIntoView({ block: 'center' });
      const b = row.getBoundingClientRect();
      const x = Math.round(b.left + b.width / 2);
      const y = Math.round(b.top + b.height / 2);
      const hit = document.elementFromPoint(x, y);
      return {
        x,
        top: Math.round(b.top),
        bottom: Math.round(b.bottom),
        height: Math.round(b.height),
        label: row.textContent.trim().slice(0, 24),
        reachable: Boolean(hit && row.contains(hit))
      };
    })()`);

  const pressUndo = async () => {
    await editor.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    for (const type of ['rawKeyDown', 'keyUp']) {
      await editor.send('Input.dispatchKeyEvent', {
        type,
        modifiers: 4,
        key: 'z',
        code: 'KeyZ',
        windowsVirtualKeyCode: 90,
        nativeVirtualKeyCode: 90
      });
    }
    await wait(40);
  };

  // ------------------------------------------------------------------ set up
  await openHere();
  await openPanel();
  await switchCanvas(PAGE);
  await clickTab('components');
  await until(
    async () => ev(`(() => !!document.querySelector('input[placeholder="Filter components"]'))()`),
    20000,
    'the Components tab'
  );

  const start = await childrenOfPage();
  if (!start) {
    console.error(`refusing: ${PAGE} has no Page node.`);
    process.exit(2);
  }
  const pageStartJson = await graphJson(PAGE);
  console.log(`page ${start.pageId}: ${start.children.map((c) => c.type.split('/').pop()).join(' | ')}\n`);

  // --------------------------------------------- 1. at rest it is just a tab
  const atRest = await inTheAir();
  arm(
    'at rest the Layers tab is a tab — no strip, no hint',
    atRest.strip === null && atRest.hint === false,
    `data-drop-strip=${atRest.strip}, hint=${atRest.hint}`
  );

  // ------------------------------- 2. a visual component: armed, ok, placed
  await settle();
  await filterTo(SUBJECTS.visual);
  const visual = await componentRow('visual');
  if (!visual || !visual.reachable) {
    arm(
      'a component in the hand makes the Layers tab a target',
      null,
      `UNGRADED: ${visual ? 'the visual row is drawn but something is over it' : 'no visual row for "' + SUBJECTS.visual + '"'}`
    );
    process.exit(2);
  }

  /**
   * 🔴 AC4. The wrapper goes on for the length of the drop and comes straight off again: it is an
   * instrument, and an instrument left in the product is a defect of its own.
   */
  await ev(`(() => {
    const M = window.__wreq('./src/editor/src/views/nodegrapheditor/NodeOperations.ts');
    const proto = M.NodeOperations.prototype;
    if (window.__stripSpyOff) return 'already';
    const original = proto.createNewNode;
    window.__stripSpy = [];
    proto.createNewNode = function (type, pos, options, placement) {
      window.__stripSpy.push({
        type: type && type.name,
        placement: placement ? { parent: placement.parent && placement.parent.id, index: placement.index } : null
      });
      return original.apply(this, arguments);
    };
    window.__stripSpyOff = () => { proto.createNewNode = original; };
    return 'spying';
  })()`);

  const placed = await dragComponentToStrip(visual);
  const spy = await ev(`(() => { const s = window.__stripSpy || []; if (window.__stripSpyOff) { window.__stripSpyOff(); window.__stripSpyOff = undefined; } return s; })()`);
  const afterPlace = await childrenOfPage();

  arm(
    'a component in the hand makes the Layers tab a target, and hovering it says the drop would land',
    Boolean(placed.ok && placed.air.strip === 'ok' && placed.air.hint),
    placed.ok ? `${visual.label}: data-drop-strip=${placed.air.strip}, hint=${placed.air.hint}` : placed.because
  );
  arm(
    'a legal hover carries NO refusal sentence — the known-firing control the two refusals need',
    Boolean(placed.ok && !placed.air.said.visible),
    placed.ok ? `${placed.air.said.visible ? 'SHOWN' : 'hidden'}: ${placed.air.said.text}` : 'nothing sampled'
  );
  arm(
    'the tab does NOT switch during the drag (§2 says so in its own sentence)',
    Boolean(placed.ok && placed.air.componentsActive === 'true' && placed.air.layersActive === 'false'),
    placed.ok ? `components=${placed.air.componentsActive}, layers=${placed.air.layersActive}` : 'nothing sampled'
  );

  const grew = Boolean(afterPlace && afterPlace.children.length === start.children.length + 1);
  const newChild = grew ? afterPlace.children[afterPlace.children.length - 1] : null;
  /**
   * ⚠️ The identity of the thing placed comes off the SPY, not off the row's label: the row shows a
   * component's local name and the graph holds its full path. The two are tied together by the
   * second half of the claim — the name the create call was given ends in the name on the row the
   * person pressed — so a plan that placed the wrong component could not read as green.
   */
  const created = spy && spy.length === 1 ? spy[0].type : null;
  arm(
    'dropping on the strip places the component at the END of the screen root',
    Boolean(grew && newChild && created && newChild.type === created && created.split('/').pop() === visual.name),
    `${afterPlace ? afterPlace.children.map((c) => c.type.split('/').pop()).join(' | ') : 'no page'} (row said "${visual.name}", created ${created})`
  );
  arm(
    'AC4 — the placement went through the canvas own createNewNode, with a parent and an index',
    Boolean(
      spy &&
        spy.length === 1 &&
        spy[0].placement &&
        spy[0].placement.parent === start.pageId &&
        spy[0].placement.index === start.children.length
    ),
    JSON.stringify(spy)
  );

  const opened = await inTheAir();
  const selected = await ev(`(() => {
    const { selectionStore } = window.__wreq('./src/editor/src/models/selection/selectionStore.ts');
    const s = selectionStore.selection;
    return JSON.stringify({ component: s.component && s.component.name, nodes: s.nodes, source: s.source });
  })()`);
  arm(
    'and it opens Layers with the new row selected (§2: "opens Layers with the row selected")',
    Boolean(newChild && opened.layersActive === 'true' && typeof selected === 'string' && selected.includes(newChild.id)),
    `layers active=${opened.layersActive}; selection=${String(selected).slice(0, 120)}`
  );

  // ------------------------------------------------- 3. one ⌘Z takes it back
  await pressUndo();
  await wait(1200);
  const afterUndo = await childrenOfPage();
  arm(
    'one ⌘Z removes it — the placement is a single undo step (AC3)',
    grew
      ? Boolean(afterUndo && afterUndo.children.map((c) => c.id).join() === start.children.map((c) => c.id).join())
      : null,
    grew ? afterUndo.children.map((c) => c.type.split('/').pop()).join(' | ') : 'UNGRADED: nothing was placed'
  );

  // ------------------------------------------- 3b. the spring (TVW-005 §11)
  //
  // Richard, 2026-09-18: being able to put the thing exactly where it goes, in one gesture, is
  // worth more than §2's "the tab does not switch during the drag". So the strip keeps BOTH
  // meanings and this is the second one: rest on it, and the tree opens under the drag.
  await clickTab('components');
  await settle();
  await filterTo(SUBJECTS.visual);
  const forSpring = await componentRow('visual');
  if (!forSpring || !forSpring.reachable) {
    arm('holding on the strip opens Layers without ending the drag', null, 'UNGRADED: no reachable visual row');
  } else {
    const held = await dragComponentToStrip(forSpring, { release: false, dwell: 1100 });
    const sprung = await ev(`(() => {
      const layers = document.querySelector('[data-test="panel-tab-layers"]');
      const components = document.querySelector('[data-test="panel-tab-components"]');
      const PopupLayer = window.__wreq('./src/editor/src/views/popuplayer.ts').default;
      return {
        layersActive: layers && layers.getAttribute('data-active'),
        componentsActive: components && components.getAttribute('data-active'),
        stillDragging: Boolean(PopupLayer.instance.isDragging()),
        rows: document.querySelectorAll('[data-test="layers-tree"] [data-test="layers-node"], [data-test="layers-tree"] [data-test="layers-instance"]').length
      };
    })()`);
    // ⚠️ What the STRIP said while the pointer was on it, carried into the detail: a spring that
    // never armed and a spring that armed and did nothing are different failures, and the strip's
    // own state is what tells them apart.
    const armedAs = held.ok ? held.air.strip : 'no drag';

    // 🔴 Both halves in one arm, because either alone is a different feature: a tab that opens
    // AFTER the drag ends is a panel moving on its own, and a drag that survives without the tab
    // opening is what shipped this morning.
    arm(
      'holding on the strip opens Layers WITHOUT ending the drag (§11)',
      Boolean(held.ok && sprung.layersActive === 'true' && sprung.stillDragging && sprung.rows > 0),
      `strip said "${armedAs}" → layers=${sprung.layersActive}, components=${sprung.componentsActive}, still dragging=${sprung.stillDragging}, ${sprung.rows} rows`
    );

    // …and now the thing the ruling was FOR: dropping between two rows, not at the end.
    const anchor = start.children[start.children.length - 1];
    const target = await layersRow(anchor.id);
    let landed = null;
    let placedRow = null;
    if (target && target.reachable) {
      const y = target.top + Math.round(target.height * 0.15); // the "before" third
      await mouse('mouseMoved', target.x, y);
      await wait(200);
      await mouse('mouseMoved', target.x, y);
      await wait(200);
      const indicator = await ev(`(() => {
        const row = document.querySelector('[data-test="layers-node"][data-drop], [data-test="layers-instance"][data-drop]');
        return row ? row.getAttribute('data-drop') : 'NONE';
      })()`);
      await mouse('mouseReleased', target.x, y, 0);
      await wait(1200);
      landed = await childrenOfPage();
      placedRow = { indicator, label: target.label };
    } else {
      await mouse('mouseReleased', 10, 400, 0);
      await wait(600);
    }

    const sprungPlace = landed && landed.children.length === start.children.length + 1 ? landed.children : null;
    arm(
      'and dropping between two rows puts it THERE, not at the end (the point of the ruling)',
      target && target.reachable
        ? Boolean(sprungPlace && sprungPlace[sprungPlace.length - 1].id === anchor.id)
        : null,
      sprungPlace
        ? `${placedRow.indicator} above ${placedRow.label}: ${sprungPlace.map((c) => c.type.split('/').pop()).join(' | ')}`
        : 'UNGRADED: the anchor row was not reachable after the spring'
    );

    const sprungSelected = await ev(`(() => {
      const { selectionStore } = window.__wreq('./src/editor/src/models/selection/selectionStore.ts');
      const s = selectionStore.selection;
      return JSON.stringify(s.nodes);
    })()`);
    arm(
      'the row placed by a sprung drop is selected too',
      sprungPlace
        ? Boolean(String(sprungSelected).includes(sprungPlace[sprungPlace.length - 2].id))
        : null,
      String(sprungSelected).slice(0, 110)
    );

    if (sprungPlace) {
      await pressUndo();
      await wait(1200);
      const back = await childrenOfPage();
      arm(
        'one ⌘Z removes a sprung placement too',
        Boolean(back && back.children.map((c) => c.id).join() === start.children.map((c) => c.id).join()),
        back.children.map((c) => c.type.split('/').pop()).join(' | ')
      );
    } else {
      arm('one ⌘Z removes a sprung placement too', null, 'UNGRADED: nothing was placed');
    }
  }

  // ------------------------------- 3c. an abandoned spring puts the tab back
  await clickTab('components');
  await settle();
  await filterTo(SUBJECTS.visual);
  const forAbandon = await componentRow('visual');
  if (!forAbandon || !forAbandon.reachable) {
    arm('an abandoned spring puts the tab back where the person left it', null, 'UNGRADED: no reachable visual row');
  } else {
    const graphBefore = await graphJson(PAGE);
    await dragComponentToStrip(forAbandon, { release: false, dwell: 1100 });
    const opened = await ev(`(() => document.querySelector('[data-test="panel-tab-layers"]').getAttribute('data-active'))()`);
    // Released on the panel header, which is not a target for anything.
    const nowhere = await ev(`(() => { const b = document.querySelector('[data-test="panel-tabs"]').getBoundingClientRect(); return { x: Math.round(b.left + 6), y: Math.round(b.top - 20) }; })()`);
    await mouse('mouseMoved', nowhere.x, nowhere.y);
    await wait(200);
    await mouse('mouseReleased', nowhere.x, nowhere.y, 0);
    await wait(900);
    const after = await ev(`(() => ({
      layers: document.querySelector('[data-test="panel-tab-layers"]').getAttribute('data-active'),
      components: document.querySelector('[data-test="panel-tab-components"]').getAttribute('data-active')
    }))()`);
    const graphAfter = await graphJson(PAGE);
    arm(
      'an abandoned spring puts the tab back where the person left it, and places nothing',
      Boolean(opened === 'true' && after.components === 'true' && after.layers === 'false' && graphBefore === graphAfter),
      `opened=${opened} → components=${after.components}, layers=${after.layers}; graph ${graphBefore === graphAfter ? 'unchanged' : 'CHANGED'}`
    );
  }

  // ------------------------------------------------------- 4. the refusals
  for (const [kind, expected] of [
    ['page', 'Pages go in a Router, not on another page'],
    ['logic', null]
  ]) {
    await clickTab('components');
    await settle();
    await filterTo(SUBJECTS[kind]);
    const domKind = kind === 'page' ? 'page' : 'component';
    let row = await componentRow(domKind);
    if (kind === 'page' && !row) row = await componentRow('home');
    if (!row || !row.reachable) {
      arm(
        `a ${kind} component is refused on the strip, and nothing is created`,
        null,
        `UNGRADED: ${row ? 'the ' + kind + ' row is drawn but something is over it' : 'no ' + kind + ' row for "' + SUBJECTS[kind] + '"'}`
      );
      continue;
    }
    const before = await graphJson(PAGE);
    // 🔴 Held PAST the dwell, deliberately: the spring is armed only when the drop would land, so a
    // refused component must not open the tab however long it rests there. A refusal arm that used
    // the quick dwell would pass without ever asking the question.
    const attempt = await dragComponentToStrip(row, { dwell: 1100 });
    const after = await graphJson(PAGE);
    const sentence = expected ?? `${row.name} has no screen. Drop it on the canvas.`;
    arm(
      `a ${kind} component is refused on the strip, and the page graph stays byte-identical`,
      Boolean(attempt.ok && attempt.air.strip === 'refused' && before === after),
      `${row.label}: data-drop-strip=${attempt.ok ? attempt.air.strip : '?'}, graph ${before === after ? 'unchanged' : 'CHANGED'}`
    );
    arm(
      `...and it SAYS why, on the drag`,
      Boolean(attempt.ok && attempt.air.said.visible && attempt.air.said.text === sentence),
      attempt.ok ? `${attempt.air.said.visible ? 'shown' : 'hidden'}: "${attempt.air.said.text}" (wanted "${sentence}")` : 'nothing sampled'
    );
    arm(
      `...and it does not SPRING either, held well past the dwell`,
      Boolean(attempt.ok && attempt.air.componentsActive === 'true' && attempt.air.layersActive === 'false'),
      attempt.ok ? `after ~1.1s on the strip: components=${attempt.air.componentsActive}, layers=${attempt.air.layersActive}` : 'nothing sampled'
    );
  }

  // ------------------------------------------------------- put the page back
  const endJson = await graphJson(PAGE);
  arm(
    'the drive left the page byte-identical to how it found it',
    endJson === pageStartJson,
    endJson === pageStartJson ? 'unchanged' : 'CHANGED'
  );

  const json = opt('json');
  if (json) fs.writeFileSync(json, JSON.stringify(result, null, 1));
  const graded = result.arms.filter((a) => a.held !== null);
  const failed = graded.filter((a) => !a.held);
  console.log(`\n${graded.length - failed.length}/${graded.length} graded arms held; ${result.arms.length - graded.length} ungraded.`);
  editor.close();
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
