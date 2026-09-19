#!/usr/bin/env node
/**
 * TVW-007 AC2b — the hover surface and its door, driven.
 *
 * R-Z took the component's name off the node card, so the hover is the only place an instance
 * says what it is. Three things about it cannot be graded by a spec, and all three are here:
 *
 * 1. 🔴 **That the surface is reachable.** A rendered element can sit behind a blocker, and this
 *    one is deliberately placed over the canvas — so every arm below reads it with
 *    `elementFromPoint`, never with `querySelector` alone
 *    ([[a-rendered-surface-can-be-behind-a-blocker]]).
 * 2. 🔴 **That the door can be pressed.** The pointer has to leave the node to reach `Edit ›`,
 *    and the node's `move-out` fires while it is crossing. The journey is driven as real
 *    `Input.dispatchMouseEvent` moves, in steps, because that is the gesture under test — a
 *    click dispatched straight at the button would never test the close condition at all.
 * 3. 🔴 **That the count on the hover is the panel's count.** AC2 asks for one number; this reads
 *    both, in the same run.
 *
 * ⚠️ **UNRUN as of s22.** Written in a session that could not drive — a peer's editor held 9222
 * for its whole length — so this instrument has never executed. Expect its first run to find
 * instrument faults before it finds product ones
 * ([[a-new-instruments-first-drive-finds-instrument-faults]]).
 *
 * Usage:
 *   node scripts/devtools/drive-tvw007-hover.js [--dir <project copy>] [--component <path>] [--shots <dir>]
 *
 * Exits 0 when every graded arm passed, 1 on a product failure, 2 when the instrument is unusable.
 */
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('./cdp.js');

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

/** 🔴 A COPY. Opening a project writes three files into it and dirties every component. */
const PROJECT_DIR = opt('dir', '/Users/richardosborne/vscode_projects/Noodl projects/TVW-007 s20 Eyebrow');
/** The s20 fixture: 33 instance nodes, 7 renamed, counts up to three digits. */
const COMPONENT = opt('component', '/Pages/Logged in/Account');
const SHOTS = opt(
  'shots',
  path.join(__dirname, '..', '..', 'dev-docs', 'tasks', 'phase-93-three-views-of-one-app', 'verdicts', 'TVW-007')
);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const arms = [];
const record = (name, ok, detail) => {
  arms.push({ name, ok, detail });
  console.log(`${ok === null ? 'UNGRADED' : ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
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

/**
 * 🔴 Whose editor is on 9222.
 *
 * Copied from `drive-tvw007-eyebrow.js` rather than shared, because a shared module under
 * `scripts/devtools/` is a file every session's drives would depend on mid-week. Both copies say
 * the same thing and both fail CLOSED: an owner you cannot name is not an absent one — the first
 * version of this check capped the walk at 12 hops, the CLI is about 11 up, and it drove a peer's
 * editor for an hour.
 */
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

/** The node's rect in VIEWPORT pixels, which is what `Input.dispatchMouseEvent` takes. */
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
      left: Math.round(left),
      top: Math.round(top),
      width: Math.round(n.nodeSize.width * ps.scale),
      height: Math.round(n.nodeSize.height * ps.scale)
    });
    for (const c of n.children || []) visit(c);
  };
  for (const r of ed.roots || []) visit(r);
  return { scale: ps.scale, nodes: out };
})())`;

/**
 * The card as a PERSON meets it: what is actually at the pixel.
 *
 * `querySelector` says the element exists. `elementFromPoint` says nothing is over it — which is
 * the half AC2b asks for and the half a spec cannot reach.
 */
const READ_CARD = `JSON.stringify((() => {
  const card = document.querySelector('[data-test="instance-hover-card"]');
  if (!card) return { present: false };
  const pathEl = card.querySelector('[data-test="instance-hover-path"]');
  const countEl = card.querySelector('[data-test="instance-hover-count"]');
  const editEl = card.querySelector('[data-test="instance-hover-edit"]');
  const centre = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return { x: 0, y: 0, zero: true };
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  };
  const hit = (el) => {
    const c = centre(el);
    if (!c || c.zero) return 'no box';
    const top = document.elementFromPoint(c.x, c.y);
    if (!top) return 'nothing';
    if (top === el || el.contains(top) || (top.closest && top.closest('[data-test="instance-hover-card"]') === card)) {
      return 'reachable';
    }
    return (top.getAttribute && top.getAttribute('data-test')) || top.tagName;
  };
  const style = getComputedStyle(card);
  return {
    present: true,
    path: pathEl ? pathEl.textContent.trim() : null,
    count: countEl ? countEl.textContent.trim() : null,
    editLabel: editEl ? editEl.textContent.trim() : null,
    editTag: editEl ? editEl.tagName : null,
    pathReachable: hit(pathEl),
    editReachable: hit(editEl),
    editCentre: centre(editEl),
    opacity: style.opacity,
    alignX: card.getAttribute('data-align-x'),
    alignY: card.getAttribute('data-align-y')
  };
})())`;

/** The trail, read off the DOM — the crumb kinds differ in markup, not only in a class name. */
const READ_TRAIL = `JSON.stringify((() => {
  const bar = document.querySelector('.nodegraph-component-trail-root');
  if (!bar) return { present: false };
  const crumbs = Array.from(bar.querySelectorAll('[data-test^="trail-instance-crumb-"]')).map((el) => ({
    test: el.getAttribute('data-test'),
    tag: el.tagName,
    text: el.textContent.trim(),
    diamond: !!el.querySelector('[data-test="trail-instance-diamond"]')
  }));
  return { present: true, text: bar.textContent.replace(/\\s+/g, ' ').trim(), crumbs };
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
      `REFUSING: the editor on 9222 (pid ${electronPid}) belongs to session ${owner}, not this one (${mine}). ` +
        'Driving it opens projects in a peer’s window and reloads it under them.'
    );
    process.exit(2);
  }
  record('the editor on 9222 belongs to this session', true, `electron ${electronPid}, owner ${owner}`);

  const editor = await connect(await appTarget('editor'));

  // A hidden window never fires rAF, so the canvas never repaints and every arm below would be
  // reading a frame that was painted before the drive started.
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
  // ⚠️ The override lives on THIS connection and reverts when it closes, so every shot has to be
  // taken before this script ends.
  await editor.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1200, deviceScaleFactor: 2, mobile: false });
  await wait(1200);

  await evaluate(editor, BOOT);

  const raf = await readJson(
    editor,
    `new Promise((res) => { let n = 0; const t = () => { n++; if (n < 3) requestAnimationFrame(t); }; requestAnimationFrame(t); setTimeout(() => res(JSON.stringify({ frames: n, hidden: document.hidden })), 900); })`
  );
  record('instrument: the window is awake and rAF fires', raf.frames >= 2, `frames=${raf.frames}, hidden=${raf.hidden}`);
  if (!(raf.frames >= 2)) process.exit(2);

  // --- the project and the canvas ----------------------------------------------------------
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

  const already = await evaluate(editor, `(() => { const p = ${PROJECT}.instance; return (p && p._retainedProjectDirectory) || 'NONE'; })()`);
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
  const dir = await evaluate(editor, `(() => ${PROJECT}.instance ? (${PROJECT}.instance._retainedProjectDirectory || 'NONE') : 'NONE')()`);
  record('the driven project is the copy this drive names', path.resolve(String(dir)) === path.resolve(PROJECT_DIR), String(dir));

  await evaluate(
    editor,
    `(() => {
      const ed = ${ED};
      const component = ${PROJECT}.instance.getComponentWithName(${JSON.stringify(COMPONENT)});
      if (component) ed.switchToComponent(component, { pushHistory: false });
      return component ? 'ok' : 'NO SUCH COMPONENT';
    })()`
  );
  await wait(2500);
  const landed = await evaluate(editor, `(() => { const c = ${ED}.activeComponent; return c ? c.name : 'NONE'; })()`);
  record('the canvas is on the component with the instances', String(landed) === COMPONENT, String(landed));

  await evaluate(
    editor,
    `(() => { const d = document.querySelector('[data-test="preview-strip-dismiss"]'); if (d) { d.click(); return 'dismissed'; } return 'none'; })()`
  );
  await wait(400);

  const geometry = await readJson(editor, NODE_RECTS);
  if (geometry.error) {
    record('instrument: the canvas geometry could be read', false, geometry.error);
    process.exit(2);
  }
  const instances = geometry.nodes.filter((n) => n.isInstance && n.top > 60 && n.left > 40);
  const plain = geometry.nodes.filter((n) => !n.isInstance && n.top > 60 && n.left > 40);
  record('the canvas holds instance nodes and a non-instance control', instances.length > 0 && plain.length > 0, `${instances.length} instances, ${plain.length} others`);
  if (!instances.length) process.exit(2);

  const subject = instances[0];
  const nodeCentre = { x: subject.left + Math.round(subject.width / 2), y: subject.top + Math.round(subject.height / 2) };

  // --- AC2b: the surface --------------------------------------------------------------------
  await moveTo(editor, nodeCentre.x, nodeCentre.y, 4, { x: nodeCentre.x, y: nodeCentre.y + 120 });
  await wait(400);
  const card = await readJson(editor, READ_CARD);
  record('hovering an instance node shows a card', card.present === true, JSON.stringify(card).slice(0, 200));
  record('the card names the component, folder included', typeof card.path === 'string' && card.path.includes('/'), String(card.path));
  // 🔴 Rendered is not reachable.
  record('the path is at the pixel it is drawn at', card.pathReachable === 'reachable', String(card.pathReachable));
  record('the door is a real button, reachable', card.editTag === 'BUTTON' && card.editReachable === 'reachable', `${card.editTag} / ${card.editReachable}`);
  await shoot(editor, `ac2b-hover-${subject.typename ? String(subject.typename).replace(/[^\w]+/g, '-') : 'instance'}`);

  // AC2: the count on the card is TVW-001's count for the same component.
  const panelCount = await evaluate(
    editor,
    `(() => {
      const { buildUsageIndex } = ${WREQ('./src/editor/src/views/panels/ComponentsPanelNew/componentUsage.ts')};
      const index = buildUsageIndex(${PROJECT}.instance.getComponents());
      const usage = index.get(${JSON.stringify(subject.typename)});
      return usage ? String(usage.instances.length) : 'NONE';
    })()`
  );
  record(
    'the count on the hover is the panel’s count',
    card.count === null ? panelCount === 'NONE' : card.count === `· ${panelCount}×`,
    `hover=${card.count} panel=${panelCount}`
  );

  // --- the journey: can the door be pressed at all? -----------------------------------------
  const editCentre = card.editCentre;
  if (!editCentre || editCentre.zero) {
    record('the door has a box to aim at', false, JSON.stringify(editCentre));
  } else {
    // Real moves, in steps, leaving the node on the way — which is what fires `move-out` and what
    // the grace window exists for.
    await moveTo(editor, editCentre.x, editCentre.y, 8, nodeCentre);
    await wait(120);
    const surviving = await readJson(editor, READ_CARD);
    record('the card survives the pointer travelling to the door', surviving.present === true, `present=${surviving.present}`);

    await editor.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: editCentre.x, y: editCentre.y, button: 'left', buttons: 1, clickCount: 1 });
    await editor.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: editCentre.x, y: editCentre.y, button: 'left', buttons: 0, clickCount: 1 });
    await wait(2500);

    // --- AC1/AC3: the door leads somewhere, and the trail says how you got there -------------
    const arrived = await evaluate(editor, `(() => { const c = ${ED}.activeComponent; return c ? c.name : 'NONE'; })()`);
    record('pressing the door opens the component', String(arrived) === String(subject.typename), `${arrived} (expected ${subject.typename})`);

    const trail = await readJson(editor, READ_TRAIL);
    const instanceCrumb = (trail.crumbs || []).find((c) => c.diamond);
    record('the trail\u2019s first crumb is the instance it came through', !!instanceCrumb, JSON.stringify(trail).slice(0, 240));
    record(
      'that crumb is a real button',
      !!instanceCrumb && instanceCrumb.tag === 'BUTTON',
      instanceCrumb ? instanceCrumb.tag : 'absent'
    );
    await shoot(editor, 'ac1-trail-after-the-door');

    // The card must be gone: it was anchored to a node on a canvas that is no longer on screen.
    const afterNav = await readJson(editor, READ_CARD);
    record('the card does not outlive the canvas it was anchored to', afterNav.present === false, `present=${afterNav.present}`);

    // Back where we came from, so the arms below run on the graph they were measured against.
    await evaluate(
      editor,
      `(() => {
        const ed = ${ED};
        const component = ${PROJECT}.instance.getComponentWithName(${JSON.stringify(COMPONENT)});
        if (component) ed.switchToComponent(component, { pushHistory: false });
        return 'ok';
      })()`
    );
    await wait(2000);
  }

  // --- the control, in the same run ---------------------------------------------------------
  // 🔴 A negative arm needs its control beside it: without this, "no card on a plain node" and
  // "the hover is broken" read identically.
  const control = plain[0];
  await moveTo(editor, control.left + Math.round(control.width / 2), control.top + Math.round(control.height / 2), 6, {
    x: control.left,
    y: control.top + 200
  });
  await wait(400);
  const controlCard = await readJson(editor, READ_CARD);
  record('a node that is not an instance gets no card', controlCard.present === false, `present=${controlCard.present} on ${control.label}`);

  // --- AC2b: a LOGIC instance, and the zoom the painted count is hidden at -------------------
  const logic = instances.find((n) => n.height < 90) || instances[instances.length - 1];
  await moveTo(editor, logic.left + Math.round(logic.width / 2), logic.top + 12, 6, { x: logic.left, y: logic.top + 200 });
  await wait(400);
  const logicCard = await readJson(editor, READ_CARD);
  record('the second instance kind also carries the card', logicCard.present === true, `${logic.label}: ${logicCard.path}`);

  // Below the painted count's 75% gate the hover is the ONLY place the identity lives, so this is
  // the arm R-Z's ruling makes load-bearing.
  await evaluate(editor, `(() => { const ed = ${ED}; const ps = ed.getPanAndScale(); ed.setPanAndScale({ x: ps.x, y: ps.y, scale: 0.5 }); ed.repaint(); return 'ok'; })()`);
  await wait(800);
  const zoomed = await readJson(editor, NODE_RECTS);
  const zoomedSubject = (zoomed.nodes || []).find((n) => n.id === subject.id);
  if (!zoomedSubject) {
    record('the subject is still on screen at 50%', false, 'not found');
  } else {
    await moveTo(
      editor,
      zoomedSubject.left + Math.round(zoomedSubject.width / 2),
      zoomedSubject.top + Math.round(zoomedSubject.height / 2),
      6,
      { x: zoomedSubject.left, y: zoomedSubject.top + 200 }
    );
    await wait(400);
    const zoomCard = await readJson(editor, READ_CARD);
    record(
      'the path is still readable at 50%, where the painted count is hidden',
      zoomCard.present === true && zoomCard.pathReachable === 'reachable',
      `present=${zoomCard.present} reachable=${zoomCard.pathReachable} scale=${zoomed.scale}`
    );
    await shoot(editor, 'ac2b-hover-at-50-percent');
  }

  // --- AC5: both themes ---------------------------------------------------------------------
  for (const theme of ['light', 'dark']) {
    // The same door P94's drives use — `ThemeManager.setMode`, not a settings key.
    await evaluate(editor, `(() => { ${WREQ('./src/editor/src/models/ThemeManager.ts')}.ThemeManager.setMode(${JSON.stringify(theme)}); return 'ok'; })()`);
    // ⚠️ A theme flip does not apply in the SAME eval — the write and the read have to be two
    // round trips ([[a-theme-flip-does-not-apply-in-the-same-eval]]).
    await wait(1200);
    await moveTo(editor, nodeCentre.x, nodeCentre.y, 4, { x: nodeCentre.x, y: nodeCentre.y + 120 });
    await wait(500);
    const applied = await evaluate(editor, `document.documentElement.getAttribute('data-theme')`);
    const themed = await readJson(editor, READ_CARD);
    record(
      `the card is reachable in the ${theme} theme`,
      String(applied) === theme && themed.present === true && themed.pathReachable === 'reachable',
      `theme=${applied} present=${themed.present} reachable=${themed.pathReachable}`
    );
    await shoot(editor, `ac5-hover-${theme}`);
  }

  const graded = arms.filter((a) => a.ok !== null);
  const failed = graded.filter((a) => !a.ok);
  console.log(`\n${graded.length - failed.length}/${graded.length} arms passed`);
  if (failed.length) {
    for (const a of failed) console.log(`  FAIL ${a.name} — ${a.detail}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(2);
  });
}
