#!/usr/bin/env node
/**
 * TVW-007 AC1 — the three arms `drive-tvw007-hover.js` does not cover.
 *
 * AC1's sentence is a single walk, and s24's drive took only the first half of it (the hover, the
 * `Edit ›` press, the diamond crumb). What is left:
 *
 *   1. **Press `Home` in the trail: back on Home WITH THE HERO NODE SELECTED.**
 *   2. **Open the component from the Components panel: the trail reads the CONTAINMENT form**
 *      (`Buttons › Primary Button`), not the instance form.
 *   3. **⌘[ twice, ⌘] twice: each trail is the one that was shown at that step.**
 *
 * 🔴 **Arm 1 could not pass before s25.** `via` names the parent COMPONENT, and one canvas holds
 * many instances of the same child — `/Pages/Logged in/Account` holds 33 instances of 16
 * components — so the crumb landed on the right canvas with nothing selected. s25 put `viaNodeId`
 * on the history entry. **This drive is what grades that wire on the real surface.**
 *
 * 🔴 **Arm 3 presses REAL KEYS and must.** `navBack`/`navForward` (`EditorDocument.tsx:755-763`)
 * call the same `navigationHistory.goBack/goForward` the trail's back button calls, so invoking
 * them directly would be a duplicate of an already-graded path
 * ([[a-check-in-a-second-pipeline-is-a-duplicate-first]]). The shortcut's OWN risk is the focus
 * predicate in `keyboardhandler.ts`, which only a dispatched keystroke crosses.
 * ⚠️ The match is on `event.key` — `KeyCodeUtils.fromString(event.key)` — so the dispatch sets
 * `key: '['` with `modifiers: 4` (Meta). `windowsVirtualKeyCode` alone fires nothing.
 *
 * Built on s24's instrument: the same 9222 attribution, `NODE_RECTS`, `FOCUS_ON`, `insideCanvas`
 * and `remeasure`, because every one of those was paid for by a failed arm.
 *
 *   node scripts/devtools/drive-tvw007-ac1.js
 */

const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('./cdp.js');

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const PROJECT_DIR = opt('dir', '/Users/richardosborne/vscode_projects/Noodl projects/TVW-007 s20 Eyebrow');
const PARENT = opt('component', '/Pages/Logged in/Account');
const SHOTS = opt(
  'shots',
  path.join(__dirname, '../../dev-docs/tasks/phase-93-three-views-of-one-app/verdicts/tvw-007-ac1')
);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const arms = [];
const record = (name, ok, detail) => {
  arms.push({ name, ok, detail });
  console.log(`  ${ok === null ? '??' : ok ? 'ok' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const BOOT = `(() => { if (typeof window.__wreq !== 'function' && typeof webpackChunknoodl_editor !== 'undefined') { webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]); } })();`;
const WREQ = (p) => `window.__wreq(${JSON.stringify(p)})`;
const ED = `${WREQ('./src/editor/src/contexts/NodeGraphContext/NodeGraphContext.tsx')}.NodeGraphContextTmp.nodeGraph`;
const PROJECT = `${WREQ('./src/editor/src/models/projectmodel.ts')}.ProjectModel`;

async function readJson(client, expression) {
  const raw = await evaluate(client, expression);
  try {
    return JSON.parse(String(raw));
  } catch (error) {
    throw new Error(`not JSON: ${String(raw).slice(0, 300)}`);
  }
}

/** 🔴 Whose editor is on 9222. Fails CLOSED: an owner you cannot name is not an absent one. */
function walkToCli(startPid) {
  const { execSync } = require('child_process');
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
  const { execSync } = require('child_process');
  let pid = '';
  try {
    pid = execSync('lsof -nP -iTCP:9222 -sTCP:LISTEN -t', { encoding: 'utf8' }).trim().split('\n')[0];
  } catch (error) {
    pid = '';
  }
  if (!pid) return { pid: null, owner: null };
  return { pid, owner: walkToCli(pid) };
}

const NODE_RECTS = `JSON.stringify((() => {
  const ed = ${ED};
  if (!ed || !ed.activeComponent) return { error: 'no active component' };
  const canvas = document.getElementById('nodegraphcanvas');
  if (!canvas) return { error: 'no canvas element' };
  const box = canvas.getBoundingClientRect();
  const ps = ed.getPanAndScale();
  const out = [];
  const visit = (n) => {
    const left = (n.global.x + ps.x) * ps.scale + box.left;
    const top = (n.global.y + ps.y) * ps.scale + box.top;
    out.push({
      id: n.model.id,
      label: typeof n.labelText === 'function' ? String(n.labelText()) : '?',
      typename: n.model && n.model.typename,
      isInstance: typeof n.isComponent === 'function' ? !!n.isComponent() : false,
      allowAsChild: !!(n.model && n.model.type && n.model.type.allowAsChild),
      graphX: n.global.x,
      graphY: n.global.y,
      rawWidth: n.nodeSize.width,
      rawHeight: n.nodeSize.height,
      left: Math.round(left),
      top: Math.round(top),
      width: Math.round(n.nodeSize.width * ps.scale),
      height: Math.round(n.nodeSize.height * ps.scale)
    });
    for (const c of n.children || []) visit(c);
  };
  for (const r of ed.roots || []) visit(r);
  return { scale: ps.scale, box: { left: box.left, top: box.top, width: box.width, height: box.height }, nodes: out };
})())`;

/** Centre the canvas on a node — a coordinate is not a surface, and most nodes are off it. */
const FOCUS_ON = (node) => `(() => {
  const ed = ${ED};
  const canvas = document.getElementById('nodegraphcanvas');
  const box = canvas.getBoundingClientRect();
  const ps = ed.getPanAndScale();
  const x = (box.width / 2 - ${node.rawWidth} * ps.scale / 2) / ps.scale - ${node.graphX};
  const y = (box.height / 2 - ${node.rawHeight} * ps.scale / 2) / ps.scale - ${node.graphY};
  ed.setPanAndScale({ x, y, scale: ps.scale });
  ed.repaint();
  return 'ok';
})()`;

const insideCanvas = (n, box) => {
  if (!box) return false;
  const cx = n.left + n.width / 2;
  const cy = n.top + n.height / 2;
  const m = 8;
  return cx > box.left + m && cx < box.left + box.width - m && cy > box.top + m && cy < box.top + box.height - m;
};

/** The trail as rendered, plus the shape of its crumbs. */
const READ_TRAIL = `JSON.stringify((() => {
  const bar = document.querySelector('.nodegraph-component-trail-root');
  if (!bar) return { present: false };
  const instance = Array.from(bar.querySelectorAll('[data-test^="trail-instance-crumb-"]')).map((el) => ({
    test: el.getAttribute('data-test'),
    tag: el.tagName,
    text: el.textContent.trim(),
    diamond: !!el.querySelector('[data-test="trail-instance-diamond"]')
  }));
  return {
    present: true,
    text: bar.textContent.replace(/\\s+/g, ' ').trim(),
    instanceCrumbs: instance,
    hasDiamond: instance.some((c) => c.diamond)
  };
})())`;

/** What the canvas is on, and what is selected on it — AC1's arm 1 reads BOTH. */
const READ_STATE = `JSON.stringify((() => {
  const ed = ${ED};
  // 🔴 \`selector.selection\` DOES NOT EXIST — reading it returned undefined, which this mapped to
  // [] and reported as "nothing is selected". The field is \`_selected\`, an Array of nodes. The
  // first run failed AC1's headline arm on that alone. Armed with a known-firing control before
  // being trusted: selectNode(x) then read it back ([[assert-an-absence-with-a-known-firing-signal-beside-it]]).
  const sel = ed.selector && Array.isArray(ed.selector._selected) ? ed.selector._selected : null;
  return {
    component: ed.activeComponent ? ed.activeComponent.fullName || ed.activeComponent.name : null,
    selectionReadable: Array.isArray(sel),
    selectedIds: (sel || []).map((n) => (n && n.model ? n.model.id : null)).filter(Boolean),
    selectedLabels: (sel || []).map((n) => (typeof n.labelText === 'function' ? String(n.labelText()) : '?')),
    historyIndex: ed.navigationHistory ? ed.navigationHistory.index : null,
    history: ed.navigationHistory ? ed.navigationHistory.history.map((e) => e.name + (e.via ? ' via ' + e.via : '') + (e.viaNodeId ? ' @' + e.viaNodeId : '')) : null
  };
})())`;

/**
 * 🔴 The card belongs to whichever node the CONTROLLER resolved, which is not always the one the
 * pointer was aimed at: a nested node's centre can hit-test to its parent. The first run aimed at
 * `Main Navbar` and opened `Page Main`'s card, then failed an arm for "landing on the wrong
 * component" that had in fact landed on the right one for the card that was open. So the drive
 * reads the hovered node out of `ed.instanceHover.state` and treats THAT as the subject.
 */
const READ_CARD_EDIT = `JSON.stringify((() => {
  const ed = ${ED};
  const st = ed.instanceHover && ed.instanceHover.state;
  const overNode = st && st.node && st.node.model ? { id: st.node.model.id, type: st.node.model.typename || (st.node.model.type && st.node.model.type.name) || null } : null;
  const card = document.querySelector('[data-test="instance-hover-card"]');
  if (!card) return { present: false, overNode };
  const editEl = card.querySelector('[data-test="instance-hover-edit"]');
  if (!editEl) return { present: true, edit: null, overNode };
  const r = editEl.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return { present: true, edit: null, overNode };
  const x = Math.round(r.left + r.width / 2);
  const y = Math.round(r.top + r.height / 2);
  const top = document.elementFromPoint(x, y);
  const reachable = top === editEl || editEl.contains(top) || (top && top.closest && !!top.closest('[data-test="instance-hover-edit"]'));
  const pathEl = card.querySelector('[data-test="instance-hover-path"]');
  return { present: true, overNode, path: pathEl ? pathEl.textContent.trim() : null, edit: { x, y, reachable, label: editEl.textContent.trim() } };
})())`;

async function moveTo(client, x, y, steps = 6, from = null) {
  const start = from || { x, y };
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: Math.round(start.x + (x - start.x) * t),
      y: Math.round(start.y + (y - start.y) * t),
      button: 'none',
      buttons: 0,
      pointerType: 'mouse'
    });
    await wait(24);
  }
}

async function clickAt(client, x, y) {
  const base = { x, y, button: 'left', clickCount: 1, pointerType: 'mouse' };
  await client.send('Input.dispatchMouseEvent', { ...base, type: 'mouseMoved', button: 'none', buttons: 0 });
  await client.send('Input.dispatchMouseEvent', { ...base, type: 'mousePressed', buttons: 1 });
  await client.send('Input.dispatchMouseEvent', { ...base, type: 'mouseReleased', buttons: 0 });
}

/**
 * 🔴 A real ⌘[ / ⌘], as the editor's own handler reads it.
 *
 * `keyboardhandler.ts` computes `getKeyMod(event) + KeyCodeUtils.fromString(event.key)`, so the
 * only two fields that decide whether `navBack` runs are **`event.key`** and **`metaKey`**.
 * `modifiers: 4` is CDP's Meta bit; `code`/`windowsVirtualKeyCode` are set for fidelity only.
 */
async function pressMeta(client, key) {
  const code = key === '[' ? 'BracketLeft' : 'BracketRight';
  const vk = key === '[' ? 219 : 221;
  for (const type of ['keyDown', 'keyUp']) {
    await client.send('Input.dispatchKeyEvent', {
      type,
      key,
      code,
      windowsVirtualKeyCode: vk,
      nativeVirtualKeyCode: vk,
      modifiers: 4
    });
  }
  await wait(700);
}

async function shoot(client, name) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const { data } = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const file = path.join(SHOTS, `${name}.png`);
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  console.log(`      shot ${file}`);
  return file;
}

async function main() {
  const { pid: electronPid, owner } = ownerOfPort9222();
  const mine = walkToCli(process.pid);
  if (!electronPid) {
    console.error('UNGRADABLE: nothing is listening on 9222 — no editor to drive.');
    process.exit(2);
  }
  if (!owner || !mine) {
    console.error(
      `REFUSING: could not attribute the editor on 9222 (pid ${electronPid}) — owner=${owner || 'unknown'}, self=${
        mine || 'unknown'
      }. An unattributable owner is NOT an absent one.`
    );
    process.exit(2);
  }
  if (owner !== mine) {
    console.error(
      `REFUSING: the editor on 9222 (pid ${electronPid}) belongs to session ${owner}, not this one (${mine}).`
    );
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
  await editor.send('Emulation.setDeviceMetricsOverride', {
    width: 1600,
    height: 1200,
    deviceScaleFactor: 2,
    mobile: false
  });
  await wait(1200);
  await evaluate(editor, BOOT);

  const raf = await readJson(
    editor,
    `new Promise((res) => { let n = 0; const t = () => { n++; if (n < 3) requestAnimationFrame(t); }; requestAnimationFrame(t); setTimeout(() => res(JSON.stringify({ frames: n, hidden: document.hidden })), 900); })`
  );
  record('instrument: the window is awake and rAF fires', raf.frames >= 2, `frames=${raf.frames}`);
  if (!(raf.frames >= 2)) process.exit(2);

  // --- the project ---------------------------------------------------------------------------
  const router = await evaluate(
    editor,
    `(() => {
      if (window.__tvw007Router) return 'ok';
      const root = document.getElementById('root');
      let f = root[Object.keys(root).find((k) => k.startsWith('__reactContainer'))];
      let depth = 0;
      while (f && depth < 40) {
        const pr = f.memoizedProps;
        if (pr && pr.route && pr.route.router && typeof pr.route.router.route === 'function') { window.__tvw007Router = pr.route.router; break; }
        f = f.child; depth++;
      }
      return window.__tvw007Router ? 'ok' : 'NO ROUTER';
    })()`
  );
  if (String(router) !== 'ok') {
    record('the editor router was found', false, String(router));
    process.exit(2);
  }

  const already = await evaluate(
    editor,
    `(() => { const p = ${PROJECT}.instance; return (p && p._retainedProjectDirectory) || 'NONE'; })()`
  );
  if (path.resolve(String(already)) !== path.resolve(PROJECT_DIR)) {
    console.log(`opening ${PROJECT_DIR} (editor had ${already})`);
    await evaluate(editor, `(() => { window.__tvw007Router.route({ to: 'projects' }); return 'ok'; })()`);
    await wait(1500);
    await evaluate(
      editor,
      `(async () => {
        const { LocalProjectsModel } = ${WREQ('./src/editor/src/utils/LocalProjectsModel.ts')};
        const p = await LocalProjectsModel.instance.openProjectFromFolder(${JSON.stringify(PROJECT_DIR)});
        window.__tvw007Router.route({ to: 'editor', project: p });
        return 'ok';
      })()`
    );
    await wait(12000);
  }
  const dir = await evaluate(
    editor,
    `(() => ${PROJECT}.instance ? (${PROJECT}.instance._retainedProjectDirectory || 'NONE') : 'NONE')()`
  );
  record('the driven project is the copy this drive names', path.resolve(String(dir)) === path.resolve(PROJECT_DIR), String(dir));

  const goTo = async (fullName, viaHistory) =>
    evaluate(
      editor,
      `(() => {
        const ed = ${ED};
        const c = ${PROJECT}.instance.getComponentWithName(${JSON.stringify(fullName)});
        if (c) ed.switchToComponent(c, { pushHistory: ${viaHistory ? 'true' : 'false'} });
        return c ? 'ok' : 'NO SUCH COMPONENT';
      })()`
    );

  await goTo(PARENT, false);
  await wait(2500);
  await evaluate(
    editor,
    `(() => { const d = document.querySelector('[data-test="preview-strip-dismiss"]'); if (d) { d.click(); return 'dismissed'; } return 'none'; })()`
  );
  await wait(400);

  const landed = await readJson(editor, READ_STATE);
  record('the canvas is on the parent component', landed.component === PARENT, String(landed.component));

  // --- pick the subject ----------------------------------------------------------------------
  /**
   * 🔴 A node is only a usable subject if HOVERING it opens ITS card.
   *
   * The first run aimed at `Main Navbar` and got `Page Main`'s card: in this graph a visual child
   * is drawn inside its parent, so the child's centre hit-tests to the parent. Aiming is not
   * hitting, and the arm that failed ("landed on the wrong component") was measuring the drive's
   * aim, not the product ([[a-rendered-surface-can-be-behind-a-blocker]] — one layer further out).
   *
   * So the subject is CHOSEN BY MEASUREMENT: hover each candidate and keep the first whose card
   * names it. `instanceHover.state.node` is not exposed, so the card's own path is the identity.
   */
  let geometry = await readJson(editor, NODE_RECTS);
  if (geometry.error) {
    record('instrument: the canvas geometry could be read', false, geometry.error);
    process.exit(2);
  }
  const norm = (t) => String(t || '').replace(/^\//, '');
  const candidates = geometry.nodes
    .filter((n) => n.isInstance && n.typename)
    // Prefer one in a folder, so arm 2's containment trail has two segments to read.
    .sort((a, b) => norm(b.typename).split('/').length - norm(a.typename).split('/').length);

  let subject = null;
  let card = null;
  const tried = [];
  for (const cand of candidates.slice(0, 8)) {
    await evaluate(editor, FOCUS_ON(cand));
    await wait(600);
    const g = await readJson(editor, NODE_RECTS);
    const live = g.nodes.find((n) => n.id === cand.id && insideCanvas(n, g.box));
    if (!live) {
      tried.push(`${cand.label}: off-canvas`);
      continue;
    }
    // Leave any open card before the next hover — a card still up is what made s24's negative arm lie.
    await moveTo(editor, g.box.left + 12, g.box.top + 12, 3);
    await wait(350);
    await moveTo(
      editor,
      live.left + Math.round(live.width / 2),
      live.top + Math.round(live.height / 2),
      6,
      { x: live.left, y: live.top + 200 }
    );
    await wait(550);
    const c = await readJson(editor, READ_CARD_EDIT);
    if (c.present && c.edit && c.edit.reachable && norm(c.path) === norm(cand.typename)) {
      subject = live;
      subject.typename = cand.typename;
      card = c;
      break;
    }
    tried.push(`${cand.label}(${norm(cand.typename)}): card said ${c.present ? norm(c.path) : 'no card'}`);
  }

  if (!subject || !card) {
    record('instrument: a candidate whose own card opens on hover', false, tried.join(' | ').slice(0, 400));
    process.exit(2);
  }

  const CHILD = String(subject.typename);
  const childSegments = CHILD.split('/').filter(Boolean);
  const CHILD_LEAF = childSegments[childSegments.length - 1];
  const CHILD_FOLDER = childSegments[childSegments.length - 2] || null;
  const PARENT_LEAF = PARENT.split('/').filter(Boolean).pop();
  const ENTERED = CHILD;
  const ENTERED_ID = subject.id;
  record(
    'instrument: a subject whose OWN card opens on hover',
    true,
    `node ${ENTERED_ID} — ${CHILD} (leaf "${CHILD_LEAF}", folder "${CHILD_FOLDER}")${tried.length ? ` after ${tried.length} rejected` : ''}`
  );

  // ============================================================================================
  // ARM 1 — the trail `Home` press returns WITH THE NODE SELECTED
  // ============================================================================================
  console.log('\n--- AC1 arm 1: the trail crumb returns to the node -------------------------');

  // The card is already open on the subject, and its path is what identified it.
  record('the `Edit ›` door is on screen and reachable', true, `"${card.edit.label}" on ${norm(card.path)}`);

  await clickAt(editor, card.edit.x, card.edit.y);
  await wait(2000);

  const inChild = await readJson(editor, READ_STATE);
  record('the door lands the canvas on the component its card named', inChild.component === ENTERED, `${inChild.component} vs card's ${ENTERED}`);

  const childTrail = await readJson(editor, READ_TRAIL);
  record(
    'the trail reads the INSTANCE form — the parent crumb wears the diamond',
    childTrail.hasDiamond === true && childTrail.instanceCrumbs.some((c) => c.text.includes(PARENT_LEAF)),
    `"${childTrail.text}"`
  );
  await shoot(editor, 'ac1-trail-instance-form');

  // 🔴 The press. Before s25 this landed on the parent with NOTHING selected.
  const crumb = await readJson(
    editor,
    `JSON.stringify((() => {
      const el = document.querySelector('[data-test^="trail-instance-crumb-"]');
      if (!el) return { present: false };
      const r = el.getBoundingClientRect();
      const x = Math.round(r.left + r.width / 2);
      const y = Math.round(r.top + r.height / 2);
      const top = document.elementFromPoint(x, y);
      return { present: true, x, y, tag: el.tagName, reachable: !!(top && (top === el || el.contains(top))) };
    })())`
  );
  if (!crumb.present || !crumb.reachable) {
    record('the instance crumb is reachable at its own pixel', false, JSON.stringify(crumb));
    process.exit(1);
  }
  record('the instance crumb is a reachable <button>', crumb.tag === 'BUTTON', `${crumb.tag} at ${crumb.x},${crumb.y}`);

  await clickAt(editor, crumb.x, crumb.y);
  await wait(2000);

  const back = await readJson(editor, READ_STATE);
  record('pressing the crumb returns the canvas to the parent', back.component === PARENT, String(back.component));
  record(
    'instrument: the selection is READABLE at all (not an unarmed absence)',
    back.selectionReadable === true,
    `selector._selected is ${back.selectionReadable ? 'an array' : 'NOT readable'}`
  );
  record(
    '🔴 AC1 — and the instance node that was entered through is SELECTED',
    back.selectionReadable === true && back.selectedIds.includes(ENTERED_ID),
    `selected=[${back.selectedIds.join(',')}] labels=[${back.selectedLabels.join(',')}] expected ${ENTERED_ID}`
  );
  await shoot(editor, 'ac1-returned-with-node-selected');

  // ============================================================================================
  // ARM 2 — the Components panel gives the CONTAINMENT trail
  // ============================================================================================
  console.log('\n--- AC1 arm 2: opening from the panel reads the folder form ----------------');

  /**
   * 🔴 The sidebar panel is COLLAPSED TO ZERO, and every row in it is unclickable.
   *
   * Measured: 18 rows in the DOM, `display:flex`, `visibility:visible`, and the tree's own
   * bounding box **0 x 0** — so every row's rect was 0 too, and a click computed from one lands
   * at (0,0). Three arms in a row read as "the component is not in the panel" when what was true
   * is that the panel had no size. `SidebarModel.switch` is what gives it one.
   */
  await evaluate(
    editor,
    `(() => { const { SidebarModel } = ${WREQ('./src/editor/src/models/sidebar/index.ts')}; SidebarModel.instance.switch('components'); return 'ok'; })()`
  );
  await wait(1200);

  // 🔴 The panel opens on the **Layers** tab, so `component-tree-item` matched 0 rows and the arm
  // read as "the component is not in the panel". The tree is not hidden — it is NOT RENDERED.
  const tabbed = await evaluate(
    editor,
    `(() => { const t = document.querySelector('[data-test="panel-tab-components"]'); if (!t) return 'NO TAB'; t.click(); return 'ok'; })()`
  );
  await wait(1200);
  const treeUp = await readJson(
    editor,
    `JSON.stringify((() => {
      const t = document.querySelector('[data-test="component-tree"]');
      const b = t ? t.getBoundingClientRect() : null;
      const rows = Array.from(document.querySelectorAll('[data-test="component-tree-item"]'));
      const boxed = rows.filter((r) => { const rb = r.getBoundingClientRect(); return rb.width > 0 && rb.height > 0; });
      return { tree: !!t, w: b ? Math.round(b.width) : 0, h: b ? Math.round(b.height) : 0, rows: rows.length, boxedRows: boxed.length };
    })())`
  );
  // ⚠️ Graded on a row that HAS A BOX, not on a row that exists.
  record(
    'instrument: the Components panel is open AND has a size',
    treeUp.tree === true && treeUp.boxedRows > 0,
    `tab=${tabbed} tree=${treeUp.w}x${treeUp.h} rows=${treeUp.rows} withBoxes=${treeUp.boxedRows}`
  );

  /**
   * 🔴 The tree renders only what is EXPANDED, and the filter is not usable.
   *
   * The first attempt typed into `input[placeholder="Filter components"]` and nothing changed.
   * The input exists but is **not visible** — `offsetWidth` and `offsetHeight` are both 0 — so the
   * keystrokes went nowhere and the arm read "the component is not in the panel" while the tree
   * showed its usual 18 rows. A control that is in the DOM is not a control a person can use
   * ([[a-rendered-surface-can-be-behind-a-blocker]]).
   *
   * So the folders are opened the way a person opens them: by clicking each one in turn. The
   * folder rows are there — `Noodl Component System`, `Pages`, `Modals`, `Templates` — carrying a
   * bare name as their title, where a component row's title is `Kind · Name`.
   */
  const clickRowByTitle = async (matcher) =>
    readJson(
      editor,
      `JSON.stringify((() => {
        const rows = Array.from(document.querySelectorAll('[data-test="component-tree-item"]'));
        // 🔴 Take only a row that is actually LAID OUT. The title appears twice in this tree and
        // the first match had a zero rect — a row in the DOM with no box, which produced a click
        // at (0,0). Same lesson as the invisible filter input: present is not reachable.
        const matches = rows.filter((el) => { const t = el.getAttribute('title') || ''; return ${matcher}; });
        const row = matches.find((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
        if (!row) return { present: false, matched: matches.length,
                           titles: rows.map((r) => r.getAttribute('title')) };
        row.scrollIntoView({ block: 'center' });
        const r = row.getBoundingClientRect();
        const x = Math.round(r.left + r.width / 2);
        const y = Math.round(r.top + r.height / 2);
        const top = document.elementFromPoint(x, y);
        return { present: true, x, y, title: row.getAttribute('title'), kind: row.getAttribute('data-kind'),
                 reachable: !!(top && (top === row || row.contains(top))) };
      })())`
    );

  // Walk the folder chain down to the component. `#Noodl Component System` shows as a bare name.
  const folderSegs = childSegments.slice(0, -1).map((seg) => seg.replace(/^#/, ''));
  let expandedAll = true;
  for (const seg of folderSegs) {
    const row = await clickRowByTitle(`t === ${JSON.stringify(seg)}`);
    if (!row.present || !row.reachable) {
      expandedAll = false;
      record(`instrument: the panel folder "${seg}" could be opened`, false, JSON.stringify(row).slice(0, 240));
      break;
    }
    await clickAt(editor, row.x, row.y);
    await wait(700);
  }
  if (expandedAll) {
    record('instrument: the folder chain to the component is expanded', true, folderSegs.join(' > '));
  }

  const panel = expandedAll
    ? await clickRowByTitle(`t.endsWith('\u00b7 ' + ${JSON.stringify(CHILD_LEAF)})`)
    : { present: false, reason: 'folder chain not expanded' };

  if (!panel.present || !panel.reachable) {
    // Not fatal to the run: arms 1 and 3 still report. But it IS a failure of this arm.
    record(
      'the component is findable in the Components panel',
      false,
      JSON.stringify(panel).slice(0, 220)
    );
  } else {
    record('the component is findable in the Components panel', true, panel.title);
    // The panel opens a component on DOUBLE click; a single click only selects the row.
    await clickAt(editor, panel.x, panel.y);
    await wait(300);
    await editor.send('Input.dispatchMouseEvent', {
      type: 'mousePressed', x: panel.x, y: panel.y, button: 'left', buttons: 1, clickCount: 2, pointerType: 'mouse'
    });
    await editor.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased', x: panel.x, y: panel.y, button: 'left', buttons: 0, clickCount: 2, pointerType: 'mouse'
    });
    await wait(2200);

    const viaPanel = await readJson(editor, READ_STATE);
    record('the panel opens the component on the canvas', viaPanel.component === CHILD, String(viaPanel.component));

    const panelTrail = await readJson(editor, READ_TRAIL);
    // 🔴 The whole point of the arm: NO diamond, and the folder segment is present.
    record(
      '🔴 AC1 — a panel route reads the CONTAINMENT trail, with no instance crumb',
      panelTrail.present === true && panelTrail.hasDiamond === false,
      `"${panelTrail.text}" diamond=${panelTrail.hasDiamond}`
    );
    record(
      `the containment trail names the folder ("${CHILD_FOLDER} › ${CHILD_LEAF}")`,
      CHILD_FOLDER ? panelTrail.text.includes(CHILD_FOLDER) && panelTrail.text.includes(CHILD_LEAF) : true,
      `"${panelTrail.text}"`
    );
    await shoot(editor, 'ac1-trail-containment-form');
  }

  // ⚠️ Clear the filter and drop focus. `keyboardhandler`'s predicate gives every keystroke to a
  // focused text entry, so leaving the filter focused would make arm 3's ⌘[ do nothing — and the
  // arm would have read as a broken shortcut.
  await evaluate(
    editor,
    `(() => {
      const el = document.querySelector('input[placeholder="Filter components"]');
      if (el) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, '');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.blur();
      }
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      return 'ok';
    })()`
  );
  await wait(600);

  // ============================================================================================
  // ARM 3 — ⌘[ twice, ⌘] twice, each step showing the trail it showed at that step
  // ============================================================================================
  console.log('\n--- AC1 arm 3: real ⌘[ / ⌘] keys -------------------------------------------');

  // Build a known walk and RECORD the trail at each step, so "the trail shown at that step" is a
  // measurement taken at that step rather than a prediction written here.
  // ⚠️ The focus predicate declines commands while a text entry is focused, so blur first.
  await evaluate(editor, `(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); return 'ok'; })()`);
  await wait(200);

  const steps = [];
  const capture = async (label) => {
    const st = await readJson(editor, READ_STATE);
    const tr = await readJson(editor, READ_TRAIL);
    steps.push({ label, component: st.component, trail: tr.text, diamond: tr.hasDiamond });
    return steps[steps.length - 1];
  };

  await goTo(PARENT, true);
  await wait(1500);
  await capture('parent');

  // Re-enter the child THROUGH the instance, so the two steps differ in trail FORM and not only
  // in name — which is what makes "the trail that was shown at that step" a real assertion.
  let g = await readJson(editor, NODE_RECTS);
  let s2 = g.nodes.find((n) => n.id === subject.id);
  if (s2) {
    await evaluate(editor, FOCUS_ON(s2));
    await wait(600);
    g = await readJson(editor, NODE_RECTS);
    s2 = g.nodes.find((n) => n.id === subject.id && insideCanvas(n, g.box));
  }
  if (s2) {
    await moveTo(editor, s2.left + Math.round(s2.width / 2), s2.top + Math.round(s2.height / 2), 6, {
      x: s2.left,
      y: s2.top + 200
    });
    await wait(500);
    const c2 = await readJson(editor, READ_CARD_EDIT);
    if (c2.present && c2.edit && c2.edit.reachable) {
      await clickAt(editor, c2.edit.x, c2.edit.y);
      await wait(2000);
    }
  }
  await capture('child via instance');

  await goTo('/Pages/Logged in/Account', true);
  await wait(1500);
  const third = await capture('third');

  record(
    'instrument: three distinct steps were recorded to walk back through',
    steps.length === 3 && steps[0].trail && steps[1].trail,
    steps.map((s) => `${s.label}:"${s.trail}"`).join(' | ').slice(0, 220)
  );

  // Move the pointer off any hover surface so a card cannot sit over the trail.
  await moveTo(editor, 20, 20, 3);
  await wait(300);

  const beforeBack = await readJson(editor, READ_STATE);
  await pressMeta(editor, '[');
  const afterOne = await readJson(editor, READ_STATE);
  record(
    '🔴 ⌘[ is received by the editor at all — a real keystroke through the focus predicate',
    afterOne.historyIndex !== null && afterOne.historyIndex === beforeBack.historyIndex - 1,
    `index ${beforeBack.historyIndex} -> ${afterOne.historyIndex}`
  );

  const trailOne = await readJson(editor, READ_TRAIL);
  record(
    'after one ⌘[ the canvas and trail are the step that was shown then',
    afterOne.component === steps[1].component && trailOne.text === steps[1].trail,
    `on ${afterOne.component} "${trailOne.text}" — expected ${steps[1].component} "${steps[1].trail}"`
  );
  await shoot(editor, 'ac1-back-one');

  await pressMeta(editor, '[');
  const afterTwo = await readJson(editor, READ_STATE);
  const trailTwo = await readJson(editor, READ_TRAIL);
  record(
    '🔴 after ⌘[ TWICE the trail is the one shown at that step',
    afterTwo.component === steps[0].component && trailTwo.text === steps[0].trail,
    `on ${afterTwo.component} "${trailTwo.text}" — expected ${steps[0].component} "${steps[0].trail}"`
  );
  await shoot(editor, 'ac1-back-two');

  await pressMeta(editor, ']');
  const fwdOne = await readJson(editor, READ_TRAIL);
  const fwdOneState = await readJson(editor, READ_STATE);
  record(
    'after one ⌘] the instance trail is REBUILT, diamond and all',
    fwdOneState.component === steps[1].component && fwdOne.text === steps[1].trail && fwdOne.hasDiamond === steps[1].diamond,
    `on ${fwdOneState.component} "${fwdOne.text}" diamond=${fwdOne.hasDiamond} — expected "${steps[1].trail}" diamond=${steps[1].diamond}`
  );

  await pressMeta(editor, ']');
  const fwdTwo = await readJson(editor, READ_TRAIL);
  const fwdTwoState = await readJson(editor, READ_STATE);
  record(
    '🔴 after ⌘] TWICE the trail is the one shown at that step',
    fwdTwoState.component === steps[2].component && fwdTwo.text === steps[2].trail,
    `on ${fwdTwoState.component} "${fwdTwo.text}" — expected ${steps[2].component} "${steps[2].trail}"`
  );
  await shoot(editor, 'ac1-forward-two');

  const graded = arms.filter((a) => a.ok !== null);
  const failed = graded.filter((a) => !a.ok);
  console.log(`\n${graded.length - failed.length}/${graded.length} arms passed`);
  if (failed.length) {
    for (const a of failed) console.log(`  FAIL ${a.name} — ${a.detail}`);
    process.exit(1);
  }
  // 🔴 The happy path gets an exit too: the CDP socket holds the loop open, and a drive that
  // reports success by never returning is indistinguishable from a wedged editor.
  process.exit(0);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(2);
  });
}
