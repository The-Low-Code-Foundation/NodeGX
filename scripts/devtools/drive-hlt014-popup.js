#!/usr/bin/env node
/**
 * HLT-014 — is a Show Popup a dialog? Drive the real viewer bundle and read it off the page.
 *
 * Usage:
 *   node scripts/devtools/drive-hlt014-popup.js              # the fixed build: every arm must hold
 *   node scripts/devtools/drive-hlt014-popup.js --expect head # the HEAD build: §2's defects must FIRE
 *   node scripts/devtools/drive-hlt014-popup.js --body-scroll # the same arms under `bodyScroll`
 *   node scripts/devtools/drive-hlt014-popup.js --export      # AC6: the same fixture, EXPORTED and run
 *   node scripts/devtools/drive-hlt014-popup.js --export --mutate-role  # AC6's control: the emitted
 *                                                              helper without `role` — the dialog rows must FAIL
 *   node scripts/devtools/drive-hlt014-popup.js --keep        # print the fixture directory, keep it
 *
 * Runs against whatever `packages/noodl-editor/src/external/viewer/noodl.viewer.js` was last built
 * from (`cd packages/noodl-viewer-react && npx webpack --config webpack-configs/webpack.viewer.prod.js`),
 * so a reading is about a BUILD. Rebuild after every source edit or the run grades the last one.
 *
 * ## The instruments
 *
 * - **Presses are real input.** `Input.dispatchMouseEvent` at the element's centre, after checking
 *   `elementFromPoint` lands inside it ([[a-rendered-surface-can-be-behind-a-blocker]]); keys are
 *   `Input.dispatchKeyEvent`. A synthetic `el.click()` would neither focus the button (so there
 *   would be no opener to return to) nor go through the browser's own Tab navigation.
 * - **The accessible name is Chrome's**, from `Accessibility.queryAXTree({ role: 'dialog' })` — not
 *   a re-implementation of the naming algorithm reading `aria-label` back. It is also the only
 *   reading that knows what `inert` hides from a screen reader.
 * - **Outcomes are counted by the graph.** `Cancelled`, `Closed` and `Dismissed` each drive a
 *   `Counter` whose value a `Text` shows, so a port that does not exist (HEAD's `Cancelled`) reads 0
 *   through the same path as one that never fired.
 * - **Every reading carries its reach.** A zero is reported only beside a count of the popups the
 *   arm actually opened ([[assert-an-absence-with-a-known-firing-signal-beside-it]]).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const { withRenderedPage } = require('./render-report');
const { withExportedPage } = require('./exported-app-harness');

const argv = process.argv.slice(2);
const EXPECT_HEAD = argv.includes('--expect') && argv[argv.indexOf('--expect') + 1] === 'head';
const BODY_SCROLL = argv.includes('--body-scroll');
const KEEP = argv.includes('--keep');
/**
 * AC6 — drive an EXPORT of the fixture. The exporter defers a Show Popup whose outputs are consumed
 * and one set to Show On Top (POPUPS-TARGET §7), so the export fixture drops the outcome counters and
 * the two second-popup buttons: what is left is exactly what an exported app can do, and every arm it
 * keeps is graded by the same check as the viewer's.
 */
const EXPORT = argv.includes('--export');
const MUTATE_ROLE = argv.includes('--mutate-role');
/** AC6's mutant: the emitted `PopupDialog` loses `role: 'dialog'` and nothing else. */
const dropRole = (files) => {
  const lib = 'src/lib/popupDialog.ts';
  if (!files[lib] || !files[lib].includes("role: 'dialog',")) throw new Error('mutant did not apply: no role in ' + lib);
  files[lib] = files[lib].replace("role: 'dialog',", '');
  return files;
};

// ── The fixture ─────────────────────────────────────────────────────────────

const STARTER_MODULES = path.join(REPO_ROOT, 'packages/noodl-editor/src/assets/starter-project/noodl_modules');

const button = (id, label, parent) => ({
  id,
  type: 'net.noodl.controls.button',
  parent,
  parameters: { label, sizeMode: 'contentSize', marginTop: 8 }
});
const text = (id, value, parent, extra = {}) => ({
  id,
  type: 'Text',
  parent,
  parameters: { text: value, ...extra }
});
/** A Counter the graph increments on `signal`, shown in a Text classed `probe-<name>`. */
const probe = (name, parent) => ({
  nodes: [
    { id: `count-${name}`, type: 'Counter', parameters: {} },
    text(`probe-${name}`, '0', parent, { cssClassName: `probe-${name}` })
  ],
  connections: [
    { fromId: `count-${name}`, fromProperty: 'currentCount', toId: `probe-${name}`, toProperty: 'text' }
  ]
});
// Connections in the ON-DISK shape (`fromId`/`fromProperty`), which is what a real project holds and
// what the exporter parses. The first version wrote the runtime's `sourceId`/`sourcePort`: the
// viewer's loader tolerates it, the exporter does not, and the export arm read "nothing opened".
const count = (fromId, fromProperty, name) => ({ fromId, fromProperty, toId: `count-${name}`, toProperty: 'increase' });
const press = (fromId, toId, toProperty) => ({ fromId, fromProperty: 'onClick', toId, toProperty });

/** The popup body: a heading, buttons for every exit, and the two ways to open a second popup. */
function dialogComponent(prefix, heading, extraButtons) {
  const root = {
    id: `${prefix}-root`,
    type: 'Group',
    parameters: {
      sizeMode: 'contentHeight',
      width: { value: 360, unit: 'px' },
      backgroundColor: '#ffffff',
      paddingTop: 16,
      paddingLeft: 16,
      paddingRight: 16,
      paddingBottom: 16
    }
  };
  const kids = [
    text(`${prefix}-heading`, heading, root.id, { as: 'h2' }),
    button(`${prefix}-first`, `${heading}: first`, root.id),
    button(`${prefix}-close`, `${heading}: close`, root.id),
    ...extraButtons.map(([id, label]) => button(id, label, root.id))
  ];
  root.children = kids.map((k) => k.id);
  return [root, ...kids];
}

function buildFixture() {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'drive-hlt014-')), 'p');
  const comps = path.join(dir, 'components');
  fs.mkdirSync(comps, { recursive: true });
  const registry = { version: 1, components: {} };
  const write = (name, nodes, connections, id) => {
    const d = path.join(comps, name);
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(
      path.join(d, 'component.json'),
      JSON.stringify({ id, name: name.split('/').pop(), path: '/' + name, type: 'visual' }, null, 2)
    );
    fs.writeFileSync(path.join(d, 'nodes.json'), JSON.stringify({ componentId: id, version: 1, nodes }, null, 2));
    fs.writeFileSync(path.join(d, 'connections.json'), JSON.stringify({ componentId: id, version: 1, connections }, null, 2));
    registry.components[name] = { path: name, type: 'visual', nodeCount: nodes.length, connectionCount: connections.length };
  };

  write(
    'App',
    [
      {
        id: 'app-root',
        type: 'Group',
        children: ['router'],
        parameters: { sizeMode: 'explicit', width: { value: 100, unit: '%' }, height: { value: 100, unit: '%' } }
      },
      { id: 'router', type: 'Router', parent: 'app-root', parameters: { name: 'Main', pages: { startPage: '/Drive', routes: ['/Drive'] } } }
    ],
    [],
    'e0000000-0000-4000-8000-000000000001'
  );

  // The page: the opener, a focusable control BEHIND the popup (what a Tab that escapes lands
  // on), a second opener whose popup must not close on Escape, and one probe per outcome.
  const probes = ['cancelled', 'closed', 'dismissed', 'cancelled-noesc'].map((n) => probe(n, 'page'));
  const pageKids = [
    text('page-heading', 'The page under the popup', 'page', { as: 'h1' }),
    button('opener', 'Open dialog', 'page'),
    button('opener-noesc', 'Open unescapable', 'page'),
    button('behind', 'Behind the popup', 'page'),
    ...probes.map((p) => p.nodes[1])
  ];
  write(
    'Drive',
    [
      { id: 'page', type: 'Page', children: pageKids.map((k) => k.id), parameters: { title: 'Drive', urlPath: '' } },
      ...pageKids,
      ...probes.map((p) => p.nodes[0]),
      { id: 'show', type: 'NavigationShowPopup', parameters: { target: '/Dialog', stackPolicy: 'replace' } },
      {
        id: 'show-noesc',
        type: 'NavigationShowPopup',
        parameters: { target: '/Dialog', stackPolicy: 'replace', closeOnEscape: false, accessibleName: 'Unsaved changes' }
      }
    ],
    [
      ...probes.flatMap((p) => p.connections),
      press('opener', 'show', 'show'),
      press('opener-noesc', 'show-noesc', 'show'),
      ...(EXPORT
        ? []
        : [
            count('show', 'Cancelled', 'cancelled'),
            count('show', 'Closed', 'closed'),
            count('show', 'Dismissed', 'dismissed'),
            count('show-noesc', 'Cancelled', 'cancelled-noesc')
          ])
    ],
    'e0000000-0000-4000-8000-000000000002'
  );

  write(
    'Dialog',
    [
      ...dialogComponent('d1', 'Dialog one', EXPORT ? [] : [
        ['d1-stack', 'Open on top'],
        ['d1-replace', 'Replace it']
      ]),
      { id: 'd1-closer', type: 'NavigationClosePopup', parameters: {} },
      { id: 'd1-show-stack', type: 'NavigationShowPopup', parameters: { target: '/Dialog2', stackPolicy: 'stack' } },
      { id: 'd1-show-replace', type: 'NavigationShowPopup', parameters: { target: '/Dialog2', stackPolicy: 'replace' } }
    ],
    [
      press('d1-close', 'd1-closer', 'close'),
      ...(EXPORT ? [] : [press('d1-stack', 'd1-show-stack', 'show'), press('d1-replace', 'd1-show-replace', 'show')])
    ],
    'e0000000-0000-4000-8000-000000000003'
  );

  write(
    'Dialog2',
    [...dialogComponent('d2', 'Dialog two', []), { id: 'd2-closer', type: 'NavigationClosePopup', parameters: {} }],
    [press('d2-close', 'd2-closer', 'close')],
    'e0000000-0000-4000-8000-000000000004'
  );

  fs.writeFileSync(path.join(comps, '_registry.json'), JSON.stringify(registry, null, 2));
  fs.cpSync(STARTER_MODULES, path.join(dir, 'noodl_modules'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'nodegx.project.json'),
    JSON.stringify(
      {
        name: 'HLT-014 popup drive',
        version: '4',
        settings: BODY_SCROLL ? { bodyScroll: true } : {},
        structure: { componentsDir: 'components', assetsDir: 'assets' },
        metadata: {},
        rootNodeId: 'app-root'
      },
      null,
      2
    )
  );
  return dir;
}

// ── The page-side reading ───────────────────────────────────────────────────

/** Everything one reading needs, as ONE JSON string (the drive compares in Node). */
/**
 * What a popup IS, per host. The viewer classes its container `noodl-popup`; an exported slot is a
 * portal straight into `<body>`, so it is every body child that is not the app's `#root`. Both
 * selectors are about the CONTAINER, never about `role`, so HEAD — which has no role — is found too.
 */
const POPUP_SELECTOR = EXPORT ? 'body > :not(#root):not(script)' : '.noodl-popup';
const READ = `JSON.stringify((() => {
  const popups = Array.from(document.querySelectorAll(${JSON.stringify(POPUP_SELECTOR)}));
  const top = popups[popups.length - 1] || null;
  const a = document.activeElement;
  const describe = (el) => !el ? 'null' : el === document.body ? 'body'
    : el.tagName.toLowerCase() + ':' + (el.textContent || '').trim().slice(0, 30);
  const probe = (n) => { const el = document.querySelector('.probe-' + n); return el ? Number(el.textContent.trim()) : NaN; };
  const opener = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Open dialog');
  return {
    popups: popups.length,
    dialogs: document.querySelectorAll('[role="dialog"][aria-modal="true"]').length,
    active: describe(a),
    activeInTop: !!(top && a && top.contains(a)),
    activeIsOpener: !!opener && a === opener,
    openerInert: !!(opener && opener.closest('[inert]')),
    inertCount: document.querySelectorAll('[inert]').length,
    popupsInert: popups.map((p) => !!p.closest('[inert]')),
    probes: { cancelled: probe('cancelled'), closed: probe('closed'), dismissed: probe('dismissed'), cancelledNoesc: probe('cancelled-noesc') }
  };
})())`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** One popup open or close is a frame for the runtime plus a frame for React; 400ms covers both. */
const SETTLE = 400;

async function main() {
  const dir = buildFixture();
  if (KEEP) console.log(`fixture: ${dir}`);
  let failed = 0;
  const rows = [];
  const check = (label, passed, detail) => {
    rows.push({ label, passed });
    if (!passed) failed++;
    console.log(`  ${passed ? 'pass' : 'FAIL'}  ${label}${detail !== undefined ? `  (${detail})` : ''}`);
  };

  const withPage = EXPORT ? withExportedPage : withRenderedPage;
  await withPage({ projectDir: dir, transform: MUTATE_ROLE ? dropRole : undefined }, async (s) => {
    if (EXPORT) {
      const deferred = s.built.notes.filter((n) => /Show Popup|popup/i.test(n));
      console.log(`  export notes about popups: ${deferred.length ? deferred.join(' | ') : 'none'}`);
    }
    const send = (m, p) => s.client.send(m, p);
    await s.setViewport({ width: 1280, height: 900 });
    // Headless Chrome has no focused window; without this a real Tab moves nothing
    // ([[cdp-keys-need-focus-emulation-on-the-same-connection]]).
    await send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await send('Accessibility.enable', {});

    const read = async () => JSON.parse(await s.evaluate(READ));

    const pressButton = async (label) => {
      const at = await s.evaluate(`JSON.stringify((() => {
        const els = Array.from(document.querySelectorAll('button')).filter((b) => b.textContent.trim() === ${JSON.stringify(label)});
        const el = els[els.length - 1];
        if (!el) return { error: 'no button ' + ${JSON.stringify(label)} };
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        const hit = document.elementFromPoint(x, y);
        return { x, y, hit: !!hit && el.contains(hit) };
      })())`);
      const p = JSON.parse(at);
      if (p.error || !p.hit) throw new Error(`cannot press "${label}": ${p.error || 'something else is on top of it'}`);
      for (const type of ['mousePressed', 'mouseReleased']) {
        await send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
      }
      await sleep(SETTLE);
    };

    const KEYS = { Escape: 27, Tab: 9 };
    const key = async (name, settle = SETTLE) => {
      const base = { key: name, code: name, windowsVirtualKeyCode: KEYS[name], nativeVirtualKeyCode: KEYS[name] };
      await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
      await sleep(settle);
    };

    const axDialogs = async () => {
      const doc = await send('DOM.getDocument', { depth: 0 });
      const r = await send('Accessibility.queryAXTree', { backendNodeId: doc.root.backendNodeId, role: 'dialog' });
      return (r.nodes || []).filter((n) => !n.ignored).map((n) => (n.name && n.name.value) || '');
    };

    /**
     * Tab `n` times from inside the top popup and sort where each one landed.
     *
     * Two kinds of "outside", kept apart because only one is the defect: `page` is an element of
     * the app underneath, which is what §2 measured; `chrome` is `body`, which is where focus
     * reads when a Tab leaves the DOCUMENT for the browser's own UI at the end of the tab order.
     * `inert` permits that exactly as a native modal `<dialog>` does, and the next Tab comes back
     * to the first control in the popup. The first run of the fixed build scored both as escapes.
     */
    const tabEscapes = async (n) => {
      let page = 0;
      let chrome = 0;
      const where = [];
      for (let i = 0; i < n; i++) {
        await key('Tab', 60);
        const r = await read();
        if (r.active === 'body') chrome++;
        else if (!r.activeInTop) page++;
        if (i < 6 || !r.activeInTop) where.push(r.active);
      }
      return { out: page, chrome, where: [...new Set(where)] };
    };

    const reload = async () => {
      await s.goto('/', 6000);
      await sleep(300);
    };

    const mode = EXPORT ? `EXPORTED app${MUTATE_ROLE ? ' — MUTANT: no role' : ''}` : BODY_SCROLL ? 'bodyScroll' : 'default layout';
    console.log(`\nHLT-014 — ${EXPECT_HEAD ? 'HEAD build, expecting §2 to FIRE' : 'fixed build'} — ${mode}\n`);

    // ── Arm A: one popup, the person sentence end to end ────────────────────
    await reload();
    const rest = await read();
    await pressButton('Open dialog');
    const open = await read();
    const names = await axDialogs();
    const tabs = await tabEscapes(20);
    await key('Escape');
    const afterEsc = await read();
    // Close whatever Escape left, so the next arm starts clean either way.
    console.log(`  A at rest   ${JSON.stringify(rest)}`);
    console.log(`  A open      ${JSON.stringify(open)}  ax=${JSON.stringify(names)}`);
    console.log(`  A tabs      ${JSON.stringify(tabs)}`);
    console.log(`  A escape    ${JSON.stringify(afterEsc)}\n`);
    const reachA = open.popups === 1;

    // ── Arm B: close by the author's own button ─────────────────────────────
    await reload();
    await pressButton('Open dialog');
    const openB = await read();
    await pressButton('Dialog one: close');
    const closedB = await read();
    console.log(`  B open      ${JSON.stringify(openB)}`);
    console.log(`  B closed    ${JSON.stringify(closedB)}\n`);

    // ── Arm C: stack — Escape takes the top only (not in an export: Show On Top defers) ──
    let stacked;
    let afterEscC;
    if (!EXPORT) {
      await reload();
      await pressButton('Open dialog');
      await pressButton('Open on top');
      stacked = await read();
      await key('Escape');
      afterEscC = await read();
      console.log(`  C stacked   ${JSON.stringify(stacked)}`);
      console.log(`  C escape    ${JSON.stringify(afterEscC)}\n`);
    }

    // ── Arm D: Close on Escape off ──────────────────────────────────────────
    await reload();
    await pressButton('Open unescapable');
    const openD = await read();
    const namesD = await axDialogs();
    await key('Escape');
    const afterEscD = await read();
    console.log(`  D open      ${JSON.stringify(openD)}  ax=${JSON.stringify(namesD)}`);
    console.log(`  D escape    ${JSON.stringify(afterEscD)}\n`);

    // ── Arm E: replaced — Dismissed, and focus still lands somewhere real (viewer only) ──
    let replaced;
    let afterReplaceClose;
    if (!EXPORT) {
      await reload();
      await pressButton('Open dialog');
      await pressButton('Replace it');
      replaced = await read();
      await pressButton('Dialog two: close');
      afterReplaceClose = await read();
      console.log(`  E replaced  ${JSON.stringify(replaced)}`);
      console.log(`  E closed    ${JSON.stringify(afterReplaceClose)}\n`);
    }

    // 🔴 Found by this drive, NOT caused by this task: `NodeContext.showPopup` has created every
    // popup's container with `flexDirection: 'node'` since the initial commit, and since NDA-012
    // (2026-08-01) Group raises that on the runtime error bus — once per popup opened, in every
    // app, on both builds. Counted separately so the row below still grades what THIS change can
    // cause ([[count-the-errors-your-fix-can-cause]]); HLT-010 owns the class.
    const KNOWN = /group\/layout-not-a-flex-direction|Layout is "node"/;
    // HEAD only: the fixture wires `Cancelled`, which HEAD's Show Popup does not have.
    const HEAD_ONLY = /doesn't have a port named Cancelled/;
    const all = s.consoleErrors.filter((e) => !/favicon/.test(e));
    const known = all.filter((e) => KNOWN.test(e));
    const errors = all.filter((e) => !KNOWN.test(e) && !(EXPECT_HEAD && HEAD_ONLY.test(e)));
    console.log(`  pre-existing "Layout is node" raises: ${known.length} (one per popup opened)\n`);

    if (EXPORT && !EXPECT_HEAD) {
      // AC6 — the export's numbers against AC2's and AC4's, arm for arm. The counters are not in the
      // export fixture (a consumed output defers the node), so `Cancelled` is not read here; what is
      // read is that Escape EMPTIED the slot, which is the only thing the exported slot can do with it.
      check('reach: the popup opened', reachA, `popups=${open.popups}`);
      check('AC6 Escape closes it', afterEsc.popups === 0, `popups=${afterEsc.popups}`);
      check('AC6 one [role=dialog][aria-modal=true]', open.dialogs === 1, `dialogs=${open.dialogs}`);
      check('AC6 Chrome names it from its heading', names.length === 1 && names[0] === 'Dialog one', JSON.stringify(names));
      check('AC6 focus moved in on open', open.activeInTop, open.active);
      check('AC6 focus back on the opener after Escape', afterEsc.activeIsOpener, afterEsc.active);
      check('AC6 20 Tabs never reach the page underneath', tabs.out === 0, `${tabs.out}/20 on the page, ${tabs.chrome} to the browser, at ${tabs.where.join(' | ')}`);
      check('AC6 page inert while open', open.openerInert && open.popupsInert[0] === false, `openerInert=${open.openerInert} popupInert=${open.popupsInert}`);
      check('AC6 nothing inert after', afterEsc.inertCount === 0, `inert=${afterEsc.inertCount}`);
      check('AC6 Close Popup returns focus too', closedB.popups === 0 && closedB.activeIsOpener, closedB.active);
      check('AC6 reach: the unescapable one opened', openD.popups === 1, `popups=${openD.popups}`);
      check('AC6 Accessible Name wins over the heading', namesD.length === 1 && namesD[0] === 'Unsaved changes', JSON.stringify(namesD));
      check('AC6 Close On Escape off: Escape leaves it open', afterEscD.popups === 1, `popups=${afterEscD.popups}`);
    } else if (EXPECT_HEAD) {
      // AC1 — §2 by driving. Every row here must FIRE on HEAD, beside the reach that makes it mean something.
      check('reach: the popup opened', reachA, `popups=${open.popups}`);
      check('AC1 Escape leaves the popup open', afterEsc.popups === 1, `popups=${afterEsc.popups}`);
      check('AC1 no [role=dialog][aria-modal]', open.dialogs === 0, `dialogs=${open.dialogs}`);
      check('AC1 Chrome sees no dialog', names.length === 0, JSON.stringify(names));
      check('AC1 Tab reaches the page underneath', tabs.out > 0, `${tabs.out}/20 on the page, ${tabs.chrome} to the browser, at ${tabs.where.join(' | ')}`);
      check('AC1 focus after close is body', closedB.popups === 0 && closedB.active === 'body', `${closedB.active}`);
    } else {
      check('reach: the popup opened', reachA, `popups=${open.popups}`);
      // AC2
      check('AC2 Escape closes it', afterEsc.popups === 0, `popups=${afterEsc.popups}`);
      check('AC2 Cancelled fired once', afterEsc.probes.cancelled === 1, `cancelled=${afterEsc.probes.cancelled}`);
      check('AC2 and Closed did not', afterEsc.probes.closed === 0, `closed=${afterEsc.probes.closed}`);
      check('AC2 one [role=dialog][aria-modal=true]', open.dialogs === 1, `dialogs=${open.dialogs}`);
      check('AC2 Chrome names it from its heading', names.length === 1 && names[0] === 'Dialog one', JSON.stringify(names));
      check('AC2 focus moved in on open', open.activeInTop, open.active);
      check('AC2 focus back on the opener after Escape', afterEsc.activeIsOpener, afterEsc.active);
      check('AC2 20 Tabs never reach the page underneath', tabs.out === 0, `${tabs.out}/20 on the page, ${tabs.chrome} to the browser, at ${tabs.where.join(' | ')}`);
      check('AC2 page inert while open', open.openerInert && open.popupsInert[0] === false, `openerInert=${open.openerInert} popupInert=${open.popupsInert}`);
      check('AC2 nothing inert after', afterEsc.inertCount === 0, `inert=${afterEsc.inertCount}`);
      check('AC2 Close Popup returns focus too', closedB.popups === 0 && closedB.activeIsOpener && closedB.probes.closed === 1, `${closedB.active}, closed=${closedB.probes.closed}`);
      // AC3
      check('AC3 reach: two popups', stacked.popups === 2, `popups=${stacked.popups}`);
      check('AC3 only the lower one is inert', JSON.stringify(stacked.popupsInert) === '[true,false]', JSON.stringify(stacked.popupsInert));
      check('AC3 Escape closes only the top', afterEscC.popups === 1, `popups=${afterEscC.popups}`);
      check('AC3 focus goes to the lower one', afterEscC.activeInTop && /Open on top/.test(afterEscC.active), afterEscC.active);
      check('AC3 the lower one is no longer inert', JSON.stringify(afterEscC.popupsInert) === '[false]', JSON.stringify(afterEscC.popupsInert));
      // AC4
      check('AC4 reach: opened', openD.popups === 1, `popups=${openD.popups}`);
      check('AC4 Accessible Name wins over the heading', namesD.length === 1 && namesD[0] === 'Unsaved changes', JSON.stringify(namesD));
      check('AC4 Escape leaves it open', afterEscD.popups === 1, `popups=${afterEscD.popups}`);
      check('AC4 and fires nothing', afterEscD.probes.cancelledNoesc === 0, `cancelled=${afterEscD.probes.cancelledNoesc}`);
      // AC5
      check('AC5 reach: replaced, Dismissed fired', replaced.popups === 1 && replaced.probes.dismissed === 1, `popups=${replaced.popups} dismissed=${replaced.probes.dismissed}`);
      check('AC5 focus is inside the replacement', replaced.activeInTop, replaced.active);
      check('AC5 closing the replacement returns to the page opener', afterReplaceClose.activeIsOpener, afterReplaceClose.active);
    }
    check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | ').slice(0, 300));
  });

  if (!KEEP) fs.rmSync(path.dirname(dir), { recursive: true, force: true });
  console.log(`\n${rows.length - failed}/${rows.length} ${EXPECT_HEAD ? 'fired as §2 says' : 'held'}`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e.stack || e);
  process.exit(2);
});
