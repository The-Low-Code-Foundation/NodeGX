#!/usr/bin/env node
/**
 * P93 TVW-005 — a drag in Layers, against the live graph and the running preview.
 *
 * AC2 asks for "a spec [that] drives every row of the §2 table against `ProjectModel`". Half of it
 * cannot be a jest spec — `NodeGraphNode` imports `projectmodel` → `bugtracker`, which calls
 * `platform.getUserDataPath()` at module scope, so a spec that imports it reports `Tests: 0 total`
 * and grades nothing ([[tests-0-total-can-mean-the-wrong-directory]]). The *decision* is graded by
 * `tests-unit/tvw-005`; this is the other half: the real models, the real undo queue, and the
 * preview that has to agree with them.
 *
 * 🔴 **The drag is dispatched as MOUSE EVENTS, not as calls into the hook.** The whole gesture is
 * the claim: a 5px threshold, which third of a row's height the pointer is in, the row that stops
 * propagation on mouse-up. Calling `onRowDrop` directly would grade the planner a second time
 * ([[verify-the-consequence-not-just-the-mechanism]]).
 *
 * 🔴 **The refusal arm asserts the graph is BYTE-IDENTICAL**, not that "nothing looks different".
 * §2's refusals exist to stop an edit to a component the canvas is not showing, and an edit that
 * went in and was then partly undone would read the same on screen.
 *
 * Usage:
 *   NOODL_REMOTE_DEBUG_PORT=9222 node scripts/devtools/drive-tvw005-drag.js [--json <file>]
 *
 * Exits 0 when every graded arm held, 1 on a failure, 2 when the renderer is not ready.
 */
const fs = require('fs');

const args = process.argv.slice(2);
const opt = (n, fallback = null) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const { appTarget, connect, evaluate } = require('./cdp.js');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * AC1's preview half: **where the runtime actually drew each of these nodes**, in document order.
 *
 * 🔴 Document order, not vertical position. A reorder that the preview honoured would move the
 * elements in the tree whatever the layout does with them afterwards, and a `top` comparison would
 * silently grade the CSS instead — on a row layout it would read as "nothing moved" while the DOM
 * had been rebuilt correctly.
 *
 * The walk is `drive-tvw004-ac2.js`'s, reused rather than written a third time (§ the handoff):
 * up the fibers to the first `noodlNode`, then out through `parentNodeScope.componentOwner` for the
 * instance path. An oracle that called the viewer's own `instancePathOf` would cancel out a bug in
 * it on both sides.
 */
const PREVIEW_ORDER = `(() => {
  const fiberOf = (el) => {
    for (const key in el) {
      if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) return el[key];
    }
    return undefined;
  };
  const composite = (fiber) => {
    let f = fiber && fiber.return;
    while (f && typeof f.type === 'string') f = f.return;
    return f;
  };
  const noodlOf = (el) => {
    const fiber = fiberOf(el);
    if (!fiber) return undefined;
    let f = composite(fiber);
    let guard = 0;
    while (f && guard++ < 512) {
      const props = f.stateNode && f.stateNode.props;
      if (props && props.noodlNode) return props.noodlNode;
      f = composite(f);
    }
    return undefined;
  };
  // 🔴 The instance node itself is never the \`noodlNode\` of an element — the component's ROOT is,
  // and the instance appears only as an owner on the way out. So the reading is the PATH, and a
  // sibling is located by the first element whose path passes through it. The first version of this
  // oracle looked for the ids among the nodes and found none of the three.
  const pathOf = (node) => {
    const path = [node.id];
    let cur = node;
    for (let d = 0; d < 256; d++) {
      const scope = cur.parentNodeScope || cur.nodeScope;
      const owner = scope && scope.componentOwner;
      if (!owner || owner === cur || !owner.parentNodeScope) break;
      path.unshift(owner.id);
      cur = owner;
    }
    return path;
  };
  const order = [];
  const seen = new Set();
  const all = document.querySelectorAll('*');
  for (let i = 0; i < all.length; i++) {
    const node = noodlOf(all[i]);
    if (!node || !node.id) continue;
    const path = pathOf(node);
    const key = path.join('/');
    if (seen.has(key)) continue;
    seen.add(key);
    order.push(path);
  }
  return order;
})()`;

const PROJECT_DIR = opt('dir', '/Users/richardosborne/vscode_projects/NodeGX test projects/TVW-004 s15 Drive');
/** A page with three instances under its `Page` node — the reorder is visible in the preview. */
const PAGE = '/Pages/Main/Home';

async function main() {
  const editor = await connect(await appTarget('editor'));
  /**
   * The preview is a second renderer and a second CDP target. It is optional: every model arm below
   * stands without it, and an absent preview makes AC1's preview half UNGRADED rather than red.
   */
  let viewer = null;
  try {
    viewer = await connect(await appTarget('viewer'));
  } catch (error) {
    console.log(`(no viewer target — the preview arms will be ungraded: ${error.message})`);
  }
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
  const open = await ev(`(() => {
    const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
    const p = ProjectModel.instance;
    return p ? { dir: p._retainedProjectDirectory, components: p.getComponents().length } : null;
  })()`);
  if (!open || open.dir !== PROJECT_DIR) {
    console.error(`refusing: the editor has ${open ? open.dir : 'no project'} open, not ${PROJECT_DIR}.`);
    process.exit(2);
  }

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

  /** The page node's children, as the MODEL has them — the thing every arm is really about. */
  const childrenOfPage = async () =>
    ev(`(() => {
      const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
      const c = ProjectModel.instance.getComponentWithName(${JSON.stringify(PAGE)});
      let page = null;
      c.graph.forEachNode((n) => { if (n.type && n.type.name === 'Page') page = n; });
      if (!page) return null;
      return { pageId: page.id, children: page.children.map((k) => ({ id: k.id, type: typeof k.type === 'string' ? k.type : k.type.name })) };
    })()`);

  /** A whole component's graph, for the byte-identity claim. */
  const graphJson = async (component) =>
    ev(`(() => {
      const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
      const c = ProjectModel.instance.getComponentWithName(${JSON.stringify(component)});
      return JSON.stringify(c.graph.toJSON());
    })()`);

  /**
   * Where a Layers row is on screen — **and whether a click there would reach it**.
   *
   * 🔴 A row scrolled out of the panel's viewport still answers `getBoundingClientRect()` with
   * perfectly plausible coordinates, and a press at them lands on `<html>`. The first two runs of
   * this drive did exactly that and read as a drag that would not start
   * ([[a-rendered-surface-can-be-behind-a-blocker]]). The row is scrolled into view first and the
   * point is then checked with `elementFromPoint`.
   */
  const rowRect = async (nodeId) =>
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
        label: row.textContent.trim().slice(0, 30),
        reachable: Boolean(hit && row.contains(hit))
      };
    })()`);

  /**
   * Collapse a row's subtree so its siblings are next to each other.
   *
   * Without this, `Main Footer` is hundreds of rows below `Main Navbar` — the two cannot be on
   * screen at once, and a drag between them is not a gesture a person could make either.
   */
  const collapse = async (nodeId) =>
    ev(`(() => {
      const rows = Array.from(document.querySelectorAll('[data-test="layers-node"], [data-test="layers-instance"]'));
      const row = rows.find((r) => (r.getAttribute('data-node-path') || '').split('/').pop() === ${JSON.stringify(nodeId)});
      const caret = row && row.querySelector('[data-test="layers-caret"]');
      if (!caret) return 'no caret';
      if (!caret.className.includes('Expanded')) return 'already closed';
      caret.click();
      return 'collapsed';
    })()`);

  const mouse = (type, x, y, buttons = 1) =>
    editor.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons, clickCount: 1 });

  /**
   * A real drag: press, past the 5px threshold, across the target, and up.
   *
   * ⚠️ Two moves at the destination. The first is what React sees as the pointer arriving; the
   * indicator and the plan are computed on `mousemove`, and a single move that both enters and
   * lands can be delivered before the row has rendered its state.
   */
  const dragRowOnto = async (fromNodeId, toNodeId, where /* 'before' | 'after' | 'inside' */) => {
    // The source is scrolled into view LAST, because scrolling to the target moves the source.
    let to = await rowRect(toNodeId);
    const from = await rowRect(fromNodeId);
    to = await rowRect(toNodeId);
    if (!from || !to) return { ok: false, because: `no row on screen for ${!from ? fromNodeId : toNodeId}` };
    if (!from.reachable || !to.reachable) {
      return { ok: false, because: `a row is drawn but not reachable (from: ${from.reachable}, to: ${to.reachable}) — scrolled out of the panel` };
    }

    const y =
      where === 'before' ? to.top + Math.round(to.height * 0.15)
      : where === 'after' ? to.bottom - Math.round(to.height * 0.15)
      : to.top + Math.round(to.height * 0.5);

    const startY = from.top + Math.round(from.height / 2);
    await mouse('mousePressed', from.x, startY);
    await wait(60);
    // 🔴 DOWNWARD past the row's own bottom edge, deliberately. This is the move that found the
    // defect: the threshold used to be measured inside the pressed row's own `mousemove`, so a
    // person who moved down 13px — half a row — left the row before it had decided a drag was
    // happening, and nothing happened at all. It is the regression arm now.
    await mouse('mouseMoved', from.x + 6, startY + 18);
    await wait(120);
    await mouse('mouseMoved', to.x, y);
    await wait(150);
    await mouse('mouseMoved', to.x, y);
    await wait(150);

    /**
     * 🔴 What the drag SAYS, sampled while it is still in the air.
     *
     * A refusal and a gesture that quietly died leave the same graph behind, so "byte-identical"
     * alone cannot tell them apart — it is the shape of green this phase keeps being bitten by.
     * The sentence on the drag is the difference, and it only exists between the hover and the
     * mouse-up ([[assert-an-absence-with-a-known-firing-signal-beside-it]]).
     */
    const said = await ev(`(() => {
      // popuplayer.ts:363 builds the element with these exact class names. Guessing at the
      // selector is how the first run of this arm read an absence that was its own.
      const box = document.querySelector('.popup-layer-drag-message');
      const text = document.querySelector('.popup-layer-drag-message-text');
      if (!box) return { text: 'ABSENT', visible: false };
      return { text: text ? text.textContent.trim() : 'ABSENT', visible: box.style.display !== 'none' };
    })()`);

    await mouse('mouseReleased', to.x, y, 0);
    await wait(700);
    return { ok: true, from: from.label, to: to.label, said };
  };

  /** ⌘Z, through the keyboard, on the same connection as the focus emulation. */
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

  await ev(`(() => { window.__wreq('./src/editor/src/models/sidebar/index.ts').SidebarModel.instance.switch('components'); return 'ok'; })()`);
  await until(async () => ev(`(() => !!document.querySelector('[data-test="panel-tabs"]'))()`), 15000, 'the panel');
  await ev(`(() => { const t = document.querySelector('[data-test="panel-tab-layers"]'); if (t) t.click(); return 'ok'; })()`);
  await switchCanvas(PAGE);
  await until(async () => ev(`(() => !!document.querySelector('[data-test="layers-tree"] [data-test="layers-instance"]'))()`), 15000, 'the Layers rows');

  const start = await childrenOfPage();
  if (!start || start.children.length < 3) {
    console.error('refusing: this page does not have the three siblings the drive reorders.');
    process.exit(2);
  }
  console.log(`page ${start.pageId}: ${start.children.map((c) => c.type.split('/').pop()).join(' | ')}\n`);

  /**
   * The order the three siblings are drawn in, as the PREVIEW has it. Read before anything moves,
   * so the claim after the drag is a change and not a shape.
   */
  const previewOrder = async () => {
    if (!viewer) return null;
    const drawn = await evaluate(viewer, PREVIEW_ORDER);
    const ours = start.children.map((c) => drawn.findIndex((path) => path.includes(c.id)));
    return ours.some((i) => i < 0) ? null : { ids: start.children.map((c) => c.id), at: ours };
  };
  const drawnBefore = await previewOrder();

  // ------------------------------------------------- 1. a reorder, and one undo
  const last = start.children[start.children.length - 1];
  const first = start.children[0];
  for (const child of start.children) await collapse(child.id);
  await wait(600);
  const moved = await dragRowOnto(last.id, first.id, 'before');
  const afterMove = await childrenOfPage();
  arm(
    'a legal drag carries NO refusal sentence — the known-firing signal the two arms above need',
    Boolean(moved.ok && moved.said && !moved.said.visible),
    moved.said ? `${moved.said.visible ? 'SHOWN' : 'hidden'}: ${moved.said.text}` : 'nothing sampled'
  );
  arm(
    'a row dragged above its first sibling reorders the page',
    Boolean(moved.ok && afterMove && afterMove.children[0].id === last.id && afterMove.children.length === start.children.length),
    moved.ok
      ? `${moved.from} → above ${moved.to}: ${afterMove.children.map((c) => c.type.split('/').pop()).join(' | ')}`
      : moved.because
  );

  /**
   * 🔴 AC1's own words: *"sees the page reorder in the preview"*. The model arm above is about the
   * graph; this is about what the runtime drew, and they are two claims. The drag moved the LAST
   * sibling above the FIRST, so the element that was drawn last must now be drawn first.
   */
  const drawnAfter = await previewOrder();
  arm(
    'the PREVIEW draws them in the new order — AC1 first sentence, second half',
    drawnBefore && drawnAfter
      ? Boolean(
          drawnBefore.at[drawnBefore.at.length - 1] > drawnBefore.at[0] &&
            drawnAfter.at[drawnAfter.at.length - 1] < drawnAfter.at[0]
        )
      : null,
    drawnBefore && drawnAfter
      ? `document order was [${drawnBefore.at.join(', ')}], now [${drawnAfter.at.join(', ')}]`
      : 'UNGRADED: the preview did not draw all three siblings'
  );

  const reordered = Boolean(afterMove && afterMove.children[0].id === last.id);
  await pressUndo();
  await wait(900);
  const afterUndo = await childrenOfPage();
  // ⚠️ UNGRADED when the move did not happen. "It is back where it started" is true of a page
  // nothing moved on, and an arm that reads the same in both worlds grades nothing
  // ([[a-rule-reading-zero-in-both-arms-grades-nothing]]).
  arm(
    'one ⌘Z puts it back — the move is a single undo step (AC3)',
    reordered
      ? Boolean(afterUndo && afterUndo.children.map((c) => c.id).join() === start.children.map((c) => c.id).join())
      : null,
    reordered
      ? afterUndo.children.map((c) => c.type.split('/').pop()).join(' | ')
      : 'UNGRADED: nothing moved, so there was nothing to undo'
  );

  const drawnUndone = await previewOrder();
  arm(
    'and the PREVIEW goes back with it',
    reordered && drawnBefore && drawnUndone
      ? Boolean(drawnUndone.at.join() === drawnBefore.at.join() || drawnUndone.at[drawnUndone.at.length - 1] > drawnUndone.at[0])
      : null,
    drawnUndone ? `document order [${drawnUndone.at.join(', ')}]` : 'UNGRADED: no preview reading'
  );

  // --------------------------------------- 2. a row inside a band cannot move
  // The rows inside an instance are collapsed until somebody opens them (R-S opens the branch
  // being edited, and that is the page's own). Open one, or there is no band row to refuse.
  await ev(`(() => {
    const row = document.querySelector('[data-test="layers-instance"]');
    const caret = row && row.querySelector('[data-test="layers-caret"]');
    if (caret) caret.click();
    return caret ? 'opened' : 'NO CARET';
  })()`);
  await wait(800);

  /**
   * Two rows the canvas does not own, and they are different cases:
   *  - **inside a band** — a node belonging to a placed component (path longer than one id);
   *  - **the shell** — a node of the app's root component, drawn ABOVE every band there is, which
   *    is the case a rule written as "rows below a band" would happily let through.
   */
  const refusers = await ev(`(() => {
    const rows = Array.from(document.querySelectorAll('[data-test="layers-node"], [data-test="layers-instance"]'));
    const untinted = rows.filter((r) => !r.className.includes('LayerTint'));
    const pick = (test) => {
      const row = untinted.find((r) => test((r.getAttribute('data-node-path') || '').split('/')));
      if (!row) return null;
      const path = (row.getAttribute('data-node-path') || '').split('/');
      return { nodeId: path[path.length - 1], depth: path.length, label: row.textContent.trim().slice(0, 24) };
    };
    return { band: pick((p) => p.length >= 2), shell: pick((p) => p.length === 1) };
  })()`);

  const ownerOf = async (nodeId) =>
    ev(`(() => {
      const { ProjectModel } = window.__wreq('./src/editor/src/models/projectmodel.ts');
      for (const c of ProjectModel.instance.getComponents()) {
        let found = false;
        c.graph.forEachNode((n) => { if (n.id === ${JSON.stringify('%ID%')}) found = true; });
        if (found) return c.name;
      }
      return null;
    })()`.replace('%ID%', nodeId));

  for (const [what, row] of [['inside a band', refusers.band], ['in the app shell', refusers.shell]]) {
    if (!row) {
      arm(`a row ${what} refuses to move, and both graphs stay byte-identical`, null, 'UNGRADED: no such row on screen');
      continue;
    }
    const owner = await ownerOf(row.nodeId);
    const before = owner ? await graphJson(owner) : null;
    const pageBefore = await graphJson(PAGE);
    const attempted = await dragRowOnto(row.nodeId, first.id, 'before');
    const after = owner ? await graphJson(owner) : null;
    const pageAfter = await graphJson(PAGE);
    const short = owner ? owner.split('/').filter(Boolean).pop() : '';
    arm(
      `a row ${what} refuses to move, and both graphs stay byte-identical`,
      Boolean(attempted.ok && before === after && pageBefore === pageAfter),
      `${row.label} (owned by ${owner}): its own graph ${before === after ? 'unchanged' : 'CHANGED'}, the page's ${pageBefore === pageAfter ? 'unchanged' : 'CHANGED'}${attempted.ok ? '' : ' — ' + attempted.because}`
    );
    arm(
      `...and it SAYS so, naming ${short}`,
      Boolean(attempted.ok && attempted.said && attempted.said.visible && attempted.said.text === `This is part of ${short} — edit ${short} to change it`),
      attempted.said ? `${attempted.said.visible ? 'shown' : 'hidden'}: ${attempted.said.text}` : 'nothing sampled'
    );
  }

  // ----------------------------------------------- 3. ⌥↓ on the selected row
  const beforeKeys = await childrenOfPage();
  const keyMoved = await ev(`(() => {
    const rows = Array.from(document.querySelectorAll('[data-test="layers-node"], [data-test="layers-instance"]'));
    const row = rows.find((r) => (r.getAttribute('data-node-path') || '').split('/').pop() === ${JSON.stringify(first.id)});
    if (!row) return 'MISSING';
    row.focus();
    return document.activeElement === row ? 'focused' : 'NOT FOCUSED';
  })()`);
  if (keyMoved === 'focused') {
    await editor.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    for (const type of ['rawKeyDown', 'keyUp']) {
      await editor.send('Input.dispatchKeyEvent', {
        type,
        modifiers: 1, // Alt
        key: 'ArrowDown',
        code: 'ArrowDown',
        windowsVirtualKeyCode: 40,
        nativeVirtualKeyCode: 40
      });
    }
    await wait(800);
    const afterKeys = await childrenOfPage();
    arm(
      '⌥↓ on a focused row moves it one place down',
      Boolean(
        afterKeys &&
          beforeKeys &&
          afterKeys.children[1] &&
          afterKeys.children[1].id === first.id &&
          afterKeys.children.length === beforeKeys.children.length
      ),
      afterKeys ? afterKeys.children.map((c) => c.type.split('/').pop()).join(' | ') : 'no page'
    );
    await pressUndo();
    await wait(900);
  } else {
    arm('⌥↓ on a focused row moves it one place down', null, `UNGRADED: ${keyMoved}`);
  }

  // ------------------------------------------------------- put the page back
  const end = await childrenOfPage();
  arm(
    'the drive left the page as it found it',
    Boolean(end && end.children.map((c) => c.id).join() === start.children.map((c) => c.id).join()),
    end ? end.children.map((c) => c.type.split('/').pop()).join(' | ') : 'no page'
  );

  const json = opt('json');
  if (json) fs.writeFileSync(json, JSON.stringify(result, null, 1));
  const graded = result.arms.filter((a) => a.held !== null);
  const failed = graded.filter((a) => !a.held);
  console.log(`\n${graded.length - failed.length}/${graded.length} graded arms held; ${result.arms.length - graded.length} ungraded.`);
  editor.close();
  if (viewer) viewer.close();
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
