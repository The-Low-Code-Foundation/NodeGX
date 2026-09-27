#!/usr/bin/env node
/**
 * HLT-017 — pick a card up, drop it on another column. Drive the real viewer bundle and read it off
 * the page AND off the graph.
 *
 * Usage:
 *   node scripts/devtools/drive-hlt017-drop.js               # the fixed build: every arm must hold
 *   node scripts/devtools/drive-hlt017-drop.js --expect head # the HEAD build: nothing may move (AC1)
 *   node scripts/devtools/drive-hlt017-drop.js --shots <dir> # write the mid-drag frames there
 *   node scripts/devtools/drive-hlt017-drop.js --keep        # print the fixture directory
 *
 * Runs against whatever `packages/noodl-editor/src/external/viewer/noodl.viewer.js` was last built
 * from (`cd packages/noodl-viewer-react && npx webpack --config webpack-configs/webpack.viewer.prod.js`),
 * so a reading is about a BUILD. Rebuild after every source edit.
 *
 * ## The fixture
 *
 * The board IS the shipped example, `docs/node-catalog/examples/vis-kanban-drag-between-columns.json`,
 * loaded verbatim — so a drive that passes is a drive of what a person copies. The drive adds
 * probes to its Column component (outside the drop zone, so they are not counted by Drop Index) and
 * puts two probe areas under the board: a zone inside a zone (AC3) and a zone that takes only
 * `photo` (AC4), with one static draggable to aim at them.
 *
 * ## The instruments
 *
 * - **Input is real.** `Input.dispatchMouseEvent`, `Input.dispatchTouchEvent`, `Input.dispatchKeyEvent`
 *   — the browser turns them into pointer events, scrolls a page under a finger, and moves focus,
 *   exactly as it would for a person. Every press first checks `elementFromPoint` lands inside its
 *   target ([[a-rendered-surface-can-be-behind-a-blocker]]).
 * - **Outcomes are read off the graph.** `Drag Over`, `Dropped Value`, `Drop Index` each drive a
 *   Text; `Dropped` and the source's signals drive Counters. A port that does not exist (HEAD) reads
 *   through the same path as one that never fired.
 * - **"Nothing re-rendered while hovering" is a MutationObserver** on each zone, counting childList
 *   and characterData records between pickup and drop. The gap is `translate`, a style change, so it
 *   is counted apart.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const { withRenderedPage } = require('./render-report');

const argv = process.argv.slice(2);
const flag = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const EXPECT_HEAD = flag('--expect') === 'head';
const KEEP = argv.includes('--keep');
const SHOTS = flag('--shots');

const EXAMPLE = path.join(REPO_ROOT, 'docs/node-catalog/examples/vis-kanban-drag-between-columns.json');
const STARTER_MODULES = path.join(REPO_ROOT, 'packages/noodl-editor/src/assets/starter-project/noodl_modules');

// ── The fixture ─────────────────────────────────────────────────────────────

const text = (id, value, parent, extra = {}) => ({ id, type: 'Text', parent, parameters: { text: value, ...extra } });
const counter = (id) => ({ id, type: 'Counter', parameters: {} });
const wire = (fromId, fromProperty, toId, toProperty) => ({ fromId, fromProperty, toId, toProperty });

/** A Counter shown in a Text classed `cls`, counting `fromId.fromProperty`. */
function countProbe(name, cls, parent, fromId, fromProperty) {
  return {
    nodes: [counter(`count-${name}`), text(`show-${name}`, '0', parent, { cssClassName: cls })],
    connections: [
      wire(fromId, fromProperty, `count-${name}`, 'increase'),
      wire(`count-${name}`, 'currentCount', `show-${name}`, 'text')
    ]
  };
}

function buildFixture() {
  const example = JSON.parse(fs.readFileSync(EXAMPLE, 'utf8'));
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'drive-hlt017-')), 'p');
  const comps = path.join(dir, 'components');
  fs.mkdirSync(comps, { recursive: true });
  const registry = { version: 1, components: {} };
  let seq = 0;
  const write = (name, nodes, connections) => {
    const id = `e0000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
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

  for (const c of example.components) {
    const nodes = JSON.parse(JSON.stringify(c.nodes));
    const connections = JSON.parse(JSON.stringify(c.connections));
    if (c.name === '/Kanban Column') {
      // Probes beside the zone, never inside it.
      const column = nodes.find((n) => n.id === 'column');
      column.children.push('probes');
      const over = text('p-over', '', 'probes', { cssClassName: 'kprobe-over' });
      const value = text('p-value', '', 'probes', { cssClassName: 'kprobe-value' });
      const index = text('p-index', '', 'probes', { cssClassName: 'kprobe-index' });
      const dropped = countProbe('dropped', 'kprobe-dropped', 'probes', 'list', 'dropped');
      const box = {
        id: 'probes',
        type: 'Group',
        parent: 'column',
        parameters: { flexDirection: 'row', columnGap: 'var(--space-2)', sizeMode: 'contentHeight' },
        children: ['p-over', 'p-value', 'p-index', 'show-dropped']
      };
      nodes.push(box, over, value, index, ...dropped.nodes);
      connections.push(
        wire('list', 'isDropTarget', 'p-over', 'text'),
        wire('list', 'droppedValue', 'p-value', 'text'),
        wire('list', 'dropIndex', 'p-index', 'text'),
        ...dropped.connections
      );
    }
    write(c.name.replace(/^\//, ''), nodes, connections);
  }

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
    []
  );

  // The page: the example's board, then the nesting and kind probes.
  const zoneBox = (id, name, parent, extra = {}) => ({
    id,
    type: 'Group',
    parent,
    parameters: {
      acceptDrops: true,
      dropZoneName: name,
      sizeMode: 'explicit',
      paddingTop: 'var(--space-3)',
      paddingLeft: 'var(--space-3)',
      backgroundColor: 'var(--muted)',
      ...extra
    }
  });
  const probeArea = {
    id: 'probe-area',
    type: 'Group',
    parent: 'page',
    parameters: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 'var(--space-4)', rowGap: 'var(--space-4)', paddingLeft: 'var(--space-4)', sizeMode: 'contentHeight' },
    children: ['nest-card', 'outer', 'photo-zone']
  };
  const nestCard = {
    id: 'nest-card',
    type: 'Group',
    parent: 'probe-area',
    parameters: {
      draggable: true,
      dragKind: 'card',
      sizeMode: 'explicit',
      width: { value: 120, unit: 'px' },
      height: { value: 48, unit: 'px' },
      backgroundColor: 'var(--card)',
      paddingLeft: 'var(--space-2)'
    },
    children: ['nest-card-label']
  };
  const outer = { ...zoneBox('outer', 'Outer', 'probe-area', { width: { value: 240, unit: 'px' }, height: { value: 200, unit: 'px' } }), children: ['outer-label', 'inner'] };
  const inner = { ...zoneBox('inner', 'Inner', 'outer', { width: { value: 140, unit: 'px' }, height: { value: 80, unit: 'px' }, backgroundColor: 'var(--accent)' }), children: ['inner-label'] };
  const photo = {
    ...zoneBox('photo-zone', 'Photos', 'probe-area', { acceptKind: 'photo', width: { value: 160, unit: 'px' }, height: { value: 120, unit: 'px' } }),
    children: ['photo-label', 'photo-over']
  };
  const sigs = [
    countProbe('outer', 'probe-outer-dropped', 'page', 'outer', 'dropped'),
    countProbe('inner', 'probe-inner-dropped', 'page', 'inner', 'dropped'),
    countProbe('photo', 'probe-photo-dropped', 'page', 'photo-zone', 'dropped'),
    countProbe('picked', 'probe-nest-picked', 'page', 'nest-card', 'pickedUp'),
    countProbe('landed', 'probe-nest-landed', 'page', 'nest-card', 'landed'),
    countProbe('cancelled', 'probe-nest-cancelled', 'page', 'nest-card', 'dragCancelled')
  ];
  const pageKids = ['board-instance', 'probe-area', ...sigs.map((s) => s.nodes[1].id), 'nest-lifted', 'plain'];
  write(
    'Drive',
    [
      { id: 'page', type: 'Page', children: pageKids, parameters: { title: 'Drive', urlPath: '' } },
      { id: 'board-instance', type: '/Kanban', parent: 'page' },
      probeArea,
      nestCard,
      text('nest-card-label', 'Nest card', 'nest-card'),
      outer,
      text('outer-label', 'Outer', 'outer'),
      inner,
      text('inner-label', 'Inner', 'inner'),
      photo,
      text('photo-label', 'Photos only', 'photo-zone'),
      text('photo-over', '', 'photo-zone', { cssClassName: 'probe-photo-over' }),
      text('nest-lifted', '', 'page', { cssClassName: 'probe-nest-lifted' }),
      // AC7: a Group with both boxes off, whose markup is compared across builds.
      { id: 'plain', type: 'Group', parent: 'page', parameters: { cssClassName: 'probe-plain', sizeMode: 'contentHeight' }, children: ['plain-label'] },
      text('plain-label', 'Nothing armed here', 'plain'),
      ...sigs.flatMap((s) => s.nodes)
    ],
    [
      ...sigs.flatMap((s) => s.connections),
      wire('photo-zone', 'isDropTarget', 'photo-over', 'text'),
      wire('nest-card', 'isLifted', 'nest-lifted', 'text')
    ]
  );

  // `dragValue` for the static card is a parameter, not a wire.
  const drivePath = path.join(comps, 'Drive', 'nodes.json');
  const drive = JSON.parse(fs.readFileSync(drivePath, 'utf8'));
  drive.nodes.find((n) => n.id === 'nest-card').parameters.dragValue = 'nest';
  fs.writeFileSync(drivePath, JSON.stringify(drive, null, 2));

  fs.writeFileSync(path.join(comps, '_registry.json'), JSON.stringify(registry, null, 2));
  fs.cpSync(STARTER_MODULES, path.join(dir, 'noodl_modules'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'nodegx.project.json'),
    JSON.stringify(
      {
        name: 'HLT-017 drop drive',
        version: '4',
        settings: { bodyScroll: true },
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

// ── Page-side readings ──────────────────────────────────────────────────────

/** Installed once per load: column lookup, zone mutation counters, and the reading. */
const INSTALL = `(() => {
  window.__hlt = window.__hlt || {};
  const H = window.__hlt;
  H.column = (title) => {
    const t = Array.from(document.querySelectorAll('*')).find((el) => el.children.length === 0 && el.textContent.trim() === title);
    if (!t) return null;
    // The title Text's element (or its wrapper) is the column's first child; the zone is the second.
    let col = t;
    while (col.parentElement && !(col.parentElement.children.length >= 3 && col.parentElement.querySelector('.kprobe-over'))) col = col.parentElement;
    return col.parentElement;
  };
  H.zoneOf = (title) => { const c = H.column(title); return c ? c.children[1] : null; };
  H.mutations = { childList: 0, characterData: 0, style: 0 };
  H.watch = () => {
    H.mutations = { childList: 0, characterData: 0, style: 0 };
    if (H.observer) H.observer.disconnect();
    H.observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'attributes') { if (r.attributeName === 'style') H.mutations.style++; }
        else H.mutations[r.type]++;
      }
    });
    for (const t of ['To do', 'Doing', 'Done']) {
      const z = H.zoneOf(t);
      if (z) H.observer.observe(z, { subtree: true, childList: true, characterData: true, attributes: true });
    }
  };
  H.unwatch = () => { if (H.observer) H.observer.disconnect(); H.observer = null; return H.mutations; };
  return true;
})()`;

const READ = `JSON.stringify((() => {
  const H = window.__hlt;
  const q = (sel, root = document) => { const el = root.querySelector(sel); return el ? el.textContent.trim() : null; };
  const columns = {};
  for (const t of ['To do', 'Doing', 'Done']) {
    const col = H.column(t);
    const zone = col && col.children[1];
    columns[t] = !zone ? null : {
      cards: Array.from(zone.children).map((c) => c.textContent.trim()),
      shifts: Array.from(zone.children).map((c) => c.style.translate || ''),
      // Every card drawn inside its zone's box — the first frames showed the gap pushing the last
      // card out over the next column, which no count in this file could see.
      inside: Array.from(zone.children).every((c) => c.getBoundingClientRect().bottom <= zone.getBoundingClientRect().bottom + 1),
      over: q('.kprobe-over', col),
      value: q('.kprobe-value', col),
      index: q('.kprobe-index', col),
      dropped: Number(q('.kprobe-dropped', col))
    };
  }
  const region = document.querySelector('[data-ndl-drag-announcer]');
  return {
    columns,
    copy: document.querySelectorAll('[data-ndl-drag-copy]').length,
    ring: document.querySelectorAll('[data-ndl-hold-ring]').length,
    faded: document.querySelectorAll('[data-ndl-drag-source]').length,
    target: document.querySelectorAll('[data-ndl-drop-target]').length,
    announced: region ? region.textContent : null,
    nest: {
      outer: Number(q('.probe-outer-dropped')), inner: Number(q('.probe-inner-dropped')),
      photo: Number(q('.probe-photo-dropped')), photoOver: q('.probe-photo-over'),
      picked: Number(q('.probe-nest-picked')), landed: Number(q('.probe-nest-landed')),
      cancelled: Number(q('.probe-nest-cancelled')), lifted: q('.probe-nest-lifted')
    },
    styleTag: !!document.querySelector('style[data-ndl-drag-drop]'),
    scrollY: window.scrollY,
    active: document.activeElement ? (document.activeElement.textContent || '').trim().slice(0, 40) : null
  };
})())`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const dir = buildFixture();
  if (KEEP) console.log(`fixture: ${dir}`);
  let failed = 0;
  let passed = 0;
  const check = (label, ok, detail) => {
    if (ok) passed++;
    else failed++;
    console.log(`  ${ok ? 'pass' : 'FAIL'}  ${label}${detail !== undefined ? `  (${detail})` : ''}`);
  };
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  await withRenderedPage({ projectDir: dir }, async (s) => {
    const send = (m, p) => s.client.send(m, p);
    const read = async () => JSON.parse(await s.evaluate(READ));

    const load = async (vp) => {
      await s.setViewport(vp);
      await s.goto('/', 8000);
      await sleep(400);
      await s.evaluate(INSTALL);
      await send('Emulation.setFocusEmulationEnabled', { enabled: true });
    };

    /** Centre of an element picked by an expression, after checking the press would land on it. */
    const centre = async (expr, where = 'centre') => {
      const r = JSON.parse(
        await s.evaluate(`JSON.stringify((() => {
          const el = ${expr};
          if (!el) return { error: 'no element' };
          const b = el.getBoundingClientRect();
          const x = b.left + b.width / 2;
          const y = ${where === 'top' ? 'b.top + 3' : where === 'bottom' ? 'b.bottom - 3' : 'b.top + b.height / 2'};
          const hit = document.elementFromPoint(x, y);
          return { x, y, hit: !!hit && (el === hit || el.contains(hit)), w: b.width, h: b.height, top: b.top, bottom: b.bottom };
        })())`)
      );
      if (r.error) throw new Error(`${r.error}: ${expr}`);
      return r;
    };
    /** A card is a direct child of one of the three zones. */
    const card = (title) =>
      `['To do', 'Doing', 'Done'].map((t) => window.__hlt.zoneOf(t)).filter(Boolean).flatMap((z) => Array.from(z.children)).find((el) => el.textContent.trim() === ${JSON.stringify(title)})`;
    /**
     * The gap between a zone's `n`-th and `n+1`-th card, in its RESTING layout. Read mid-hover the
     * cards are translated, and aiming at the translated gap lands one card further on.
     */
    const between = (title, n) =>
      `(() => {
        const z = window.__hlt.zoneOf(${JSON.stringify(title)});
        const rest = (el) => { const r = el.getBoundingClientRect(); const t = getComputedStyle(el).translate; const dy = t && t !== 'none' ? parseFloat(t.split(' ')[1] || '0') || 0 : 0; return { left: r.left, width: r.width, top: r.top - dy, bottom: r.bottom - dy }; };
        const k = z.children; const a = rest(k[${n - 1}]); const b = k[${n}] ? rest(k[${n}]) : null;
        const y = b ? (a.bottom + b.top) / 2 : a.bottom + 20;
        return { getBoundingClientRect: () => ({ left: a.left, width: a.width, top: y - 1, height: 2, bottom: y + 1 }), contains: () => true };
      })()`;

    const mouse = async (type, x, y, buttons = 1) =>
      send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' && !buttons ? 'none' : 'left', buttons, clickCount: type === 'mouseMoved' ? 0 : 1 });
    /** Moves the pressed mouse from a to b in `steps` real moves. */
    const glide = async (a, b, steps = 12, ms = 16) => {
      for (let i = 1; i <= steps; i++) {
        await mouse('mouseMoved', a.x + ((b.x - a.x) * i) / steps, a.y + ((b.y - a.y) * i) / steps);
        await sleep(ms);
      }
    };
    const touch = async (type, x, y) =>
      send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 4, radiusY: 4, force: 1, id: 1 }] });
    const KEYS = { ' ': [32, 'Space'], ArrowRight: [39, 'ArrowRight'], ArrowLeft: [37, 'ArrowLeft'], ArrowDown: [40, 'ArrowDown'], ArrowUp: [38, 'ArrowUp'], Enter: [13, 'Enter'], Escape: [27, 'Escape'] };
    const key = async (name) => {
      const [code, codeName] = KEYS[name];
      const base = { key: name, code: codeName, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code };
      await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base });
      if (name === ' ') await send('Input.dispatchKeyEvent', { type: 'char', text: ' ', ...base });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
      await sleep(150);
    };
    const shot = async (name) => {
      if (!SHOTS) return;
      fs.mkdirSync(SHOTS, { recursive: true });
      const r = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(SHOTS, `${name}.png`), Buffer.from(r.data, 'base64'));
    };

    const DESK = { width: 1280, height: 900 };
    const PHONE = { width: 390, height: 844, mobile: true };
    const START = {
      'To do': ['Write the brief', 'Sketch the screens', 'Draft the copy'],
      Doing: ['Build the page', 'Review with the team', 'Fix what the review found'],
      Done: ['Kick-off call']
    };
    const AFTER_A = {
      'To do': ['Sketch the screens', 'Draft the copy'],
      Doing: ['Build the page', 'Review with the team', 'Write the brief', 'Fix what the review found'],
      Done: ['Kick-off call']
    };
    // Chrome serialises a zero translate as `0px`, not `0px 0px`, whatever was written.
    const zero = (t) => !t || /^0px( 0px)?$/.test(t);
    const open = (t) => /^0px [1-9]/.test(t || '');
    const cardsOf = (r) => Object.fromEntries(Object.entries(r.columns).map(([k, v]) => [k, v && v.cards]));

    console.log(`\nHLT-017 — ${EXPECT_HEAD ? 'HEAD build: nothing may move' : 'fixed build'}\n`);

    // ── Arm A (AC2 + AC5a): mouse, To do → Doing between its 2nd and 3rd card ──
    await load(DESK);
    const rest = await read();
    check('A reach: the board rendered the example\'s seed', eq(cardsOf(rest), START), JSON.stringify(cardsOf(rest)));
    const plainHtml = await s.evaluate(`document.querySelector('.probe-plain').outerHTML`);

    const from = await centre(card('Write the brief'));
    check('A reach: the press lands on the card', from.hit);
    await s.evaluate(`window.__hlt.watch()`);
    await mouse('mousePressed', from.x, from.y);
    await glide(from, { x: from.x + 10, y: from.y }, 2, 10);
    const lifted = await read();
    // First hover: between Doing's 1st and 2nd card (index 1), then down one block (index 2).
    const gap1 = await centre(between('Doing', 1));
    await glide({ x: from.x + 10, y: from.y }, gap1, 14);
    await sleep(250);
    const hover1 = await read();
    const gap2 = await centre(between('Doing', 2));
    await glide(gap1, gap2, 6);
    await sleep(250);
    const hover2 = await read();
    await shot('hlt017-mid-drag-desktop');
    // Leave the column (to the empty board to its right), then come back.
    const outside = { x: gap2.x + 900, y: gap2.y };
    await glide(gap2, outside, 6);
    await sleep(250);
    const left = await read();
    await glide(outside, gap2, 6);
    await sleep(250);
    const back = await read();
    const mutations = JSON.parse(await s.evaluate(`JSON.stringify(window.__hlt.unwatch())`));
    await mouse('mouseReleased', gap2.x, gap2.y);
    await sleep(500);
    const dropped = await read();
    console.log(`  A lifted  copy=${lifted.copy} faded=${lifted.faded}`);
    console.log(`  A hover1  ${JSON.stringify(hover1.columns.Doing)}`);
    console.log(`  A hover2  ${JSON.stringify(hover2.columns.Doing)}`);
    console.log(`  A left    ${JSON.stringify(left.columns.Doing)}`);
    console.log(`  A mutations while hovering ${JSON.stringify(mutations)}`);
    console.log(`  A dropped ${JSON.stringify(cardsOf(dropped))}\n`);

    if (EXPECT_HEAD) {
      check('AC1 control: no copy lifts on HEAD', lifted.copy === 0 && hover2.copy === 0);
      check('AC1 control: no column reports anything on HEAD', hover2.columns.Doing.over === '' && hover2.columns.Doing.dropped === 0, JSON.stringify(hover2.columns.Doing));
      check('AC1 control: the card does not move on HEAD', eq(cardsOf(dropped), START), JSON.stringify(cardsOf(dropped)));
      fs.writeFileSync(path.join(os.tmpdir(), 'hlt017-plain-head.html'), plainHtml);
    } else {
      check('A lift: a mouse picks up on its first few pixels — copy drawn, original faded', lifted.copy === 1 && lifted.faded === 1);
      check('A AC2: Doing reads Drag Over true while the card is held over it', hover2.columns.Doing.over === 'true' && hover2.columns['To do'].over === 'false');
      check('A AC5a: the gap opens between the 1st and 2nd card', open(hover1.columns.Doing.shifts[1]) && zero(hover1.columns.Doing.shifts[0]), JSON.stringify(hover1.columns.Doing.shifts));
      check(
        'A AC5a: one block down moves the gap to between the 2nd and 3rd',
        zero(hover2.columns.Doing.shifts[1]) && open(hover2.columns.Doing.shifts[2]),
        JSON.stringify(hover2.columns.Doing.shifts)
      );
      check('A AC5a: the open gap keeps every card inside its column', hover2.columns.Doing.inside === true);
      check('A AC5a: leaving the column closes the gap and Drag Over', left.columns.Doing.shifts.every(zero) && left.columns.Doing.over === 'false', JSON.stringify(left.columns.Doing));
      check('A AC5a: coming back reopens it', back.columns.Doing.over === 'true' && open(back.columns.Doing.shifts[2]) && zero(back.columns.Doing.shifts[1]), JSON.stringify(back.columns.Doing.shifts));
      check('A AC5a: no row of any column re-rendered while hovering', mutations.childList === 0 && mutations.characterData === 0, JSON.stringify(mutations));
      check('A AC2: the card lands in Doing between the 2nd and 3rd', eq(cardsOf(dropped), AFTER_A), JSON.stringify(cardsOf(dropped)));
      check('A AC2: Dropped Value is the card\'s Drag Value', dropped.columns.Doing.value === 'card-brief', dropped.columns.Doing.value);
      check('A AC2: Drop Index is 2', dropped.columns.Doing.index === '2', dropped.columns.Doing.index);
      check('A AC2: Dropped fired once, on Doing only', dropped.columns.Doing.dropped === 1 && dropped.columns['To do'].dropped === 0 && dropped.columns.Done.dropped === 0);
      check('A AC2: Drag Over is false after the drop', Object.values(dropped.columns).every((c) => c.over === 'false'));
      check('A R1: the copy and the fade are gone after the drop', dropped.copy === 0 && dropped.faded === 0 && dropped.target === 0);
      check('A: no translate is left on any card', Object.values(dropped.columns).every((c) => c.shifts.every((t) => !t)), JSON.stringify(Object.values(dropped.columns).map((c) => c.shifts)));
      const head = path.join(os.tmpdir(), 'hlt017-plain-head.html');
      if (fs.existsSync(head)) {
        check('AC7: a Group with both boxes off renders the same markup as on HEAD', fs.readFileSync(head, 'utf8') === plainHtml);
      } else console.log('  (AC7 markup comparison needs a --expect head run first)');
    }

    if (!EXPECT_HEAD) {
      // ── Arm B: reorder within a column ────────────────────────────────────
      const b0 = await centre(card('Sketch the screens'));
      const bEnd = await centre(between('To do', 2));
      await mouse('mousePressed', b0.x, b0.y);
      await glide(b0, bEnd, 12);
      await sleep(200);
      await mouse('mouseReleased', bEnd.x, bEnd.y);
      await sleep(500);
      const reordered = await read();
      check('B: a card dragged below its neighbour reorders its own column', eq(reordered.columns['To do'].cards, ['Draft the copy', 'Sketch the screens']), JSON.stringify(reordered.columns['To do']));
      check('B: Drop Index counts without the card itself (1, not 2)', reordered.columns['To do'].index === '1', reordered.columns['To do'].index);

      // ── Arm C (AC3): nesting ──────────────────────────────────────────────
      const nest = await centre(`document.querySelector('.probe-plain') && Array.from(document.querySelectorAll('div')).find((el) => el.textContent.trim() === 'Nest card' && el.children.length)`);
      const innerAt = await centre(`Array.from(document.querySelectorAll('div')).find((el) => el.textContent.trim() === 'Inner' && el.children.length)`);
      await mouse('mousePressed', nest.x, nest.y);
      await glide(nest, innerAt, 10);
      await sleep(200);
      await mouse('mouseReleased', innerAt.x, innerAt.y);
      await sleep(400);
      const c1 = await read();
      const outerAt = await centre(`Array.from(document.querySelectorAll('div')).find((el) => el.textContent.trim().startsWith('Outer') && el.children.length > 1)`, 'bottom');
      await mouse('mousePressed', nest.x, nest.y);
      await glide(nest, outerAt, 10);
      await sleep(200);
      await mouse('mouseReleased', outerAt.x, outerAt.y);
      await sleep(400);
      const c2 = await read();
      console.log(`  C nest    ${JSON.stringify(c1.nest)} → ${JSON.stringify(c2.nest)}`);
      check('C AC3: a drop on the inner zone fires the inner zone only', c1.nest.inner === 1 && c1.nest.outer === 0, JSON.stringify(c1.nest));
      check('C AC3: a drop on the outer zone around it fires the outer one', c2.nest.outer === 1 && c2.nest.inner === 1, JSON.stringify(c2.nest));
      check('C: the source reports Picked Up and Landed per drop', c2.nest.picked === 2 && c2.nest.landed === 2, JSON.stringify(c2.nest));

      // ── Arm D (AC4): kinds ────────────────────────────────────────────────
      const photoAt = await centre(`Array.from(document.querySelectorAll('div')).find((el) => el.textContent.trim().startsWith('Photos only') && el.children.length > 1)`);
      await mouse('mousePressed', nest.x, nest.y);
      await glide(nest, photoAt, 10);
      await sleep(250);
      const d1 = await read();
      await mouse('mouseReleased', photoAt.x, photoAt.y);
      await sleep(400);
      const d2 = await read();
      check('D AC4 reach: the card was lifted over the photo zone', d1.copy === 1 && d1.nest.lifted === 'true', JSON.stringify(d1.nest));
      check('D AC4: a zone of another kind never turns Drag Over true', d1.nest.photoOver !== 'true' && d1.target === 0, d1.nest.photoOver);
      check('D AC4: …and never fires Dropped; the card is cancelled instead', d2.nest.photo === 0 && d2.nest.cancelled === 1, JSON.stringify(d2.nest));

      // ── Arm E: a card let go over nothing stays exactly where it was ─────────
      const before = await read();
      const e0 = await centre(card('Kick-off call'));
      await mouse('mousePressed', e0.x, e0.y);
      await glide(e0, { x: e0.x + 400, y: e0.y }, 10);
      await sleep(150);
      await mouse('mouseReleased', e0.x + 400, e0.y);
      await sleep(400);
      const after = await read();
      check('E R1: a drop on nothing moves nothing', eq(cardsOf(after), cardsOf(before)) && after.copy === 0 && after.faded === 0);

      // ── Arm F (AC6): the keyboard does arm A's move ──────────────────────
      await load(DESK);
      await s.evaluate(`(${card('Write the brief')}).focus()`);
      const said = [];
      await key(' ');
      said.push((await read()).announced);
      await key('ArrowRight');
      said.push((await read()).announced);
      await key('ArrowDown');
      said.push((await read()).announced);
      await key('ArrowDown');
      const kHover = await read();
      said.push(kHover.announced);
      await key('Enter');
      await sleep(400);
      const kDone = await read();
      said.push(kDone.announced);
      console.log(`  F said    ${JSON.stringify(said)}`);
      check('F AC6: Space, →, ↓, ↓, Enter lands where arm A\'s pointer did', eq(cardsOf(kDone), AFTER_A), JSON.stringify(cardsOf(kDone)));
      check('F AC6: Drop Index 2 from the keyboard too', kDone.columns.Doing.index === '2');
      check('F AC6: the gap shows where it will land before Enter', open(kHover.columns.Doing.shifts[2]) && zero(kHover.columns.Doing.shifts[1]), JSON.stringify(kHover.columns.Doing.shifts));
      check('F AC6: every step is announced, ending with where it dropped', said.every(Boolean) && /Picked up Write the brief/.test(said[0]) && /Doing, position 3/.test(said[3]) && /Dropped in Doing, position 3/.test(said[4]), JSON.stringify(said));
      await s.evaluate(`(${card('Build the page')}).focus()`);
      await key(' ');
      const kLift = await read();
      await key('Escape');
      const kEsc = await read();
      check('F reach: Space lifted the focused card', kLift.faded === 1, kLift.announced);
      check('F: Escape puts a keyboard-lifted card back', kEsc.faded === 0 && /Cancelled/.test(kEsc.announced), kEsc.announced);

      // ── Arm G (AC5): touch, on a phone ────────────────────────────────────
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
      await load(PHONE);
      const t0 = await centre(card('Write the brief'));
      // G1: a press let go at 0.3 s picks nothing up and leaves no ring.
      await touch('touchStart', t0.x, t0.y);
      await sleep(120);
      const g1hold = await read();
      await sleep(180);
      await touch('touchEnd', t0.x, t0.y);
      await sleep(200);
      const g1 = await read();
      check('G AC5: the ring appears as soon as a finger presses', g1hold.ring === 1 && g1hold.copy === 0, JSON.stringify({ ring: g1hold.ring, copy: g1hold.copy }));
      check('G AC5: released at 0.3 s — nothing lifted, no ring left', g1.ring === 0 && g1.copy === 0 && g1.faded === 0 && eq(cardsOf(g1), START));
      // G2: a finger that moves before the ring fills scrolls the page instead.
      const y0 = (await read()).scrollY;
      await touch('touchStart', t0.x, t0.y);
      for (let i = 1; i <= 8; i++) {
        await touch('touchMove', t0.x, t0.y - i * 20);
        await sleep(16);
      }
      await touch('touchEnd', t0.x, t0.y - 160);
      await sleep(400);
      const g2 = await read();
      check('G AC5: a finger that moves first scrolls, and picks nothing up', g2.scrollY > y0 && g2.copy === 0 && g2.faded === 0 && g2.ring === 0, `scrollY ${y0} → ${g2.scrollY}`);
      await s.evaluate('window.scrollTo(0, 0)');
      await sleep(200);
      // G3: hold 0.6 s — lifts; carry it to Doing between its 2nd and 3rd; let go.
      const t1 = await centre(card('Write the brief'));
      await touch('touchStart', t1.x, t1.y);
      await sleep(250);
      const g3half = await read();
      await shot('hlt017-hold-ring-phone');
      await sleep(400);
      const g3lift = await read();
      await shot('hlt017-hold-lifted-phone');
      const tg = await centre(between('Doing', 2));
      const steps = 16;
      for (let i = 1; i <= steps; i++) {
        await touch('touchMove', t1.x + ((tg.x - t1.x) * i) / steps, t1.y + ((tg.y - t1.y) * i) / steps);
        await sleep(20);
      }
      await sleep(250);
      const g3hover = await read();
      await shot('hlt017-mid-drag-phone');
      await touch('touchEnd', tg.x, tg.y);
      await sleep(500);
      const g3 = await read();
      console.log(`  G hold    half=${JSON.stringify({ ring: g3half.ring, copy: g3half.copy })} lifted=${JSON.stringify({ ring: g3lift.ring, copy: g3lift.copy })}`);
      console.log(`  G hover   ${JSON.stringify(g3hover.columns.Doing)}`);
      check('G AC5: half-way through the hold the ring is filling and nothing has lifted', g3half.ring === 1 && g3half.copy === 0);
      check('G AC5: at 0.65 s the copy has lifted and the ring is gone', g3lift.copy === 1 && g3lift.ring === 0);
      check('G AC5: carried over Doing, Doing lights up', g3hover.columns.Doing.over === 'true', JSON.stringify(g3hover.columns.Doing));
      check('G AC5a: on a phone the gap keeps every card inside its column', g3hover.columns.Doing.inside === true);
      check('G AC5: the page did not scroll under the lifted copy', g3hover.scrollY === g3lift.scrollY, `${g3lift.scrollY} → ${g3hover.scrollY}`);
      check('G AC5: on a phone the card lands where arm A\'s did', eq(cardsOf(g3), AFTER_A), JSON.stringify(cardsOf(g3)));
      await send('Emulation.setTouchEmulationEnabled', { enabled: false });
    }

    const errors = s.consoleErrors.filter((e) => !/favicon/.test(e));
    check('the page logged no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
