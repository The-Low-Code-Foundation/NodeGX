#!/usr/bin/env node
/**
 * P107 NSP-016 AC4 step 3 — the measurement: each placed visual node's box, keyed by node id, at each viewport, on a real
 * browser (headless Chrome through `render-report.js`'s `withRenderedPage` — the one browser this repo boots, not a second).
 *
 * Usage:
 *   node scripts/node-spec/layout-measure.js <fixture.json> [--viewports 1280x800,390x844] [--keep]
 *   node scripts/node-spec/layout-measure.js <project-dir>  [--viewports …]
 *   node scripts/node-spec/layout-measure.js --record packages/nodegx-node-spec/layout-fixtures [--only a,b] [--viewports …]
 *
 * A FIXTURE is `{ "name": "…", "nodes": [ { "id", "type", "parameters"?, "children"?: [ …nested ] } ] }`: the nodes are placed
 * on a Page (id `page`) that a Router shows at `/`, inside an App Group of 100% × 100% (id `app-root`). `--keep` prints the
 * project directory built for it and leaves it on disk.
 *
 * ## Which node made which element
 *
 * The viewer stamps no node id on what it renders. Every visual node renders inside a `NoodlReactComponent` whose props carry
 * the node itself (`props.noodlNode`, react-component-node.ts :977), and the node knows its element (`getDOMElement()`, :299 —
 * how the editor's highlight finds it). So the reader walks React's fibers from the page's elements to those wrappers: no
 * viewer change, no attribute. A node's PARENT is the nearest wrapper above its own in the fiber tree — the node that placed
 * it, which is the model's parent.
 *
 * ## What it measured (each field says)
 *
 *   `box`     `getBoundingClientRect()`: the BORDER box after every transform up the tree, axis-aligned, in viewport px. The
 *             model's DRAWN box (layout.ts) when the node or an ancestor is transformed; its layout box otherwise.
 *   `size`    `offsetWidth` / `offsetHeight`: the border box BEFORE transforms, rounded to whole px by the browser.
 *   `inParent` the box's origin less the parent's PADDING-box origin (its box less its left / top border) — the model's
 *             coordinates (layout.ts places a child in the parent's padding box). Absent for a node with no measured parent.
 *   `hit`     whether `elementFromPoint` at the box's centre lands inside the element (`el.contains`): a rect is not
 *             visibility — a blocker can sit on it, `pointer-events: none` never hits, a box off screen has no point.
 *   `opacity` the PRODUCT of the computed opacities from the element up: an `opacity: 0` element still lays out.
 *   `transformed` whether the element or an ancestor carries a transform (then `box` is not the layout box).
 *   and the computed `display`, `visibility`, `position`, `overflow`, padding and border widths, `className` (a node a
 *   stylesheet class reaches is reported by step 5, not graded — R17), and the scroll extent (`scrollWidth` / `clientWidth`…).
 *   `inner`   a Group with Native platform scroll off: its inner box's size — how far the scroller lets a person scroll.
 *
 * The Page and the App Group are measured too (`page`, `app-root`): the parents of the fixture's top level.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const { withRenderedPage } = require(path.join(REPO_ROOT, 'scripts/devtools/render-report'));
const STARTER_MODULES = path.join(REPO_ROOT, 'packages/noodl-editor/src/assets/starter-project/noodl_modules');

const DEFAULT_VIEWPORTS = [
  { name: '1280x800', width: 1280, height: 800 },
  { name: '390x844', width: 390, height: 844 }
];

/** `1280x800,390x844` → viewports. */
function parseViewportList(text) {
  return text.split(',').map((v) => {
    const m = /^(\d+)x(\d+)$/.exec(v.trim());
    if (!m) throw new Error(`a viewport is WIDTHxHEIGHT, not "${v}"`);
    return { name: v.trim(), width: Number(m[1]), height: Number(m[2]) };
  });
}

/** Nested fixture nodes → the flat v2 shape (`parent` and `children` by id), under `parent`. */
function flatten(nodes, parent) {
  const out = [];
  for (const n of nodes || []) {
    if (!n.id || !n.type) throw new Error(`a fixture node has an id and a type: ${JSON.stringify(n).slice(0, 120)}`);
    const { children, ...rest } = n;
    out.push({ ...rest, parent, parameters: n.parameters || {}, ...(children && children.length ? { children: children.map((c) => c.id) } : {}) });
    out.push(...flatten(children, n.id));
  }
  return out;
}

/** A v2 project directory showing the fixture's nodes on a Page at `/` (header). Returns the directory. */
function buildLayoutProject(fixture) {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), `layout-${String(fixture.name || 'fixture').replace(/[^\w-]+/g, '-').slice(0, 40)}-`)), 'p');
  const comps = path.join(dir, 'components');
  fs.mkdirSync(comps, { recursive: true });
  const registry = { version: 1, components: {} };
  const write = (name, nodes, id) => {
    const key = name.replace(/^\/+/, '');
    const d = path.join(comps, key);
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'component.json'), JSON.stringify({ id, name: key, path: name, type: 'visual' }, null, 2));
    fs.writeFileSync(path.join(d, 'nodes.json'), JSON.stringify({ componentId: id, version: 1, nodes }, null, 2));
    fs.writeFileSync(path.join(d, 'connections.json'), JSON.stringify({ componentId: id, version: 1, connections: [] }, null, 2));
    registry.components[key] = { path: key, type: 'visual', nodeCount: nodes.length, connectionCount: 0 };
  };
  write(
    '/App',
    [
      { id: 'app-root', type: 'Group', children: ['router'], parameters: { sizeMode: 'explicit', width: { value: 100, unit: '%' }, height: { value: 100, unit: '%' } } },
      { id: 'router', type: 'Router', parent: 'app-root', parameters: { name: 'Main', pages: { startPage: '/Fixture', routes: ['/Fixture'] } } }
    ],
    'd0000000-0000-4000-8000-0000000000a1'
  );
  const top = fixture.nodes || [];
  write(
    '/Fixture',
    [{ id: 'page', type: 'Page', children: top.map((n) => n.id), parameters: { title: 'Fixture', urlPath: '', ...(fixture.page || {}) } }, ...flatten(top, 'page')],
    'd0000000-0000-4000-8000-0000000000a2'
  );
  fs.writeFileSync(path.join(comps, '_registry.json'), JSON.stringify(registry, null, 2));
  if (fs.existsSync(STARTER_MODULES)) fs.cpSync(STARTER_MODULES, path.join(dir, 'noodl_modules'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'nodegx.project.json'),
    JSON.stringify({ name: `layout ${fixture.name || 'fixture'}`, version: '4', settings: {}, structure: { componentsDir: 'components', assetsDir: 'assets' }, metadata: {}, rootNodeId: 'app-root' }, null, 2)
  );
  return dir;
}

/** The page-side reader (header): one `Runtime.evaluate`, by value. */
const READ = `(() => {
  const fiberOf = (el) => { for (const k in el) if (k.startsWith('__reactFiber$')) return el[k]; return undefined; };
  const wrappers = new Map(); // node → its wrapper fiber
  for (const el of document.querySelectorAll('*')) {
    for (let f = fiberOf(el); f; f = f.return) {
      const n = f.memoizedProps && f.memoizedProps.noodlNode;
      if (n && !wrappers.has(n)) wrappers.set(n, f);
    }
  }
  // the node's own wrapper hands its inner component the node too (\`noodlNodeAsProp\`): the parent is the first OTHER node above
  const parentOf = (node, f) => { for (let p = f.return; p; p = p.return) { const n = p.memoizedProps && p.memoizedProps.noodlNode; if (n && n !== node) return n; } return undefined; };
  const px = (v) => parseFloat(v) || 0;
  const rows = [];
  const byNode = new Map();
  for (const [node, f] of wrappers) {
    const el = node.getDOMElement && node.getDOMElement();
    const row = { id: node.id, type: (node.model && node.model.type) || node.name, parent: undefined };
    const p = parentOf(node, f);
    if (p) row.parent = p.id;
    if (!el || !el.getBoundingClientRect) { row.element = false; rows.push(row); continue; }
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    row.box = { x: r.left, y: r.top, w: r.width, h: r.height };
    row.size = { w: el.offsetWidth, h: el.offsetHeight };
    row.padding = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px);
    row.border = [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].map(px);
    row.display = cs.display; row.visibility = cs.visibility; row.position = cs.position; row.overflow = cs.overflowX + ' ' + cs.overflowY;
    row.className = typeof el.className === 'string' ? el.className : '';
    row.scroll = { sw: el.scrollWidth, sh: el.scrollHeight, cw: el.clientWidth, ch: el.clientHeight };
    // With Native platform scroll off the scroller moves an inner box and scrolls as far as that box reaches, not as far as
    // the children overflow it — so its size is what a person can scroll through (P109 ISL-052)
    const inner = el.firstElementChild;
    if (inner && inner.classList && inner.classList.contains('scroll-wrapper-internal')) row.inner = { w: inner.offsetWidth, h: inner.offsetHeight };
    let opacity = 1, transformed = false;
    for (let a = el; a && a.nodeType === 1; a = a.parentElement) { const s = getComputedStyle(a); opacity *= parseFloat(s.opacity); if (s.transform && s.transform !== 'none') transformed = true; }
    row.opacity = opacity; row.transformed = transformed;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const at = r.width > 0 && r.height > 0 && cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight ? document.elementFromPoint(cx, cy) : null;
    row.hit = !!at && el.contains(at);
    rows.push(row);
    byNode.set(node.id, row);
  }
  for (const row of rows) {
    const p = row.parent && byNode.get(row.parent);
    if (!row.box || !p || !p.box) continue;
    row.inParent = { x: row.box.x - p.box.x - p.border[3], y: row.box.y - p.box.y - p.border[0] };
  }
  return { viewport: { width: innerWidth, height: innerHeight }, nodes: rows };
})()`;

/**
 * Boots `projectDir` once and measures it at each viewport: `{ [viewport name]: { viewport, nodes, consoleErrors } }`.
 * One browser, torn down by `withRenderedPage` when this returns.
 */
async function measureLayout(projectDir, viewports = DEFAULT_VIEWPORTS) {
  return withRenderedPage({ projectDir }, async (page) => {
    const out = {};
    for (const vp of viewports) {
      const before = page.consoleErrors.length;
      await page.setViewport(vp);
      const raw = await page.evaluate(READ);
      out[vp.name] = { ...raw, consoleErrors: page.consoleErrors.slice(before) };
    }
    return out;
  });
}

/** The ids a fixture places, depth first, with the Page. */
function fixtureIds(fixture) {
  const ids = ['page'];
  const walk = (nodes) => {
    for (const n of nodes || []) {
      ids.push(n.id);
      walk(n.children);
    }
  };
  walk(fixture.nodes);
  return ids;
}

/**
 * `--record <dir>`: measures every `<dir>/*.json` fixture (one browser each, one at a time) and writes what was measured of its
 * own nodes to `<dir>/measured/<name>.json` — what tests/layout-check.test.ts grades the model against, in CI, with no browser.
 */
async function record(dir, viewports, only) {
  const out = path.join(dir, 'measured');
  fs.mkdirSync(out, { recursive: true });
  const names = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && (!only || only.includes(f.replace(/\.json$/, ''))));
  for (const file of names.sort()) {
    const fixture = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const project = buildLayoutProject(fixture);
    try {
      const measured = await measureLayout(project, viewports);
      const keep = new Set(fixtureIds(fixture));
      const result = { fixture: fixture.name, measuredWith: 'scripts/node-spec/layout-measure.js (header: what each field is)', viewports: {} };
      for (const [name, m] of Object.entries(measured)) {
        const nodes = m.nodes.filter((n) => keep.has(n.id));
        const missing = [...keep].filter((id) => !nodes.some((n) => n.id === id));
        result.viewports[name] = { viewport: m.viewport, consoleErrors: m.consoleErrors, ...(missing.length ? { missing } : {}), nodes };
      }
      fs.writeFileSync(path.join(out, file), JSON.stringify(result, null, 2) + '\n');
      console.error(`recorded ${file}`);
    } finally {
      fs.rmSync(path.dirname(project), { recursive: true, force: true });
    }
  }
}

module.exports = { buildLayoutProject, measureLayout, parseViewportList, record, fixtureIds, DEFAULT_VIEWPORTS, READ };

if (require.main === module && process.argv[2] === '--record') {
  const args = process.argv.slice(3);
  const vi = args.indexOf('--viewports');
  const oi = args.indexOf('--only');
  record(args[0], vi >= 0 ? parseViewportList(args[vi + 1]) : DEFAULT_VIEWPORTS, oi >= 0 ? args[oi + 1].split(',') : undefined).catch((e) => {
    console.error(e.stack || e);
    process.exit(1);
  });
} else if (require.main === module) {
  const args = process.argv.slice(2);
  const target = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--viewports');
  if (!target) {
    console.error('usage: layout-measure.js <fixture.json | project-dir> [--viewports 1280x800,390x844] [--keep]');
    process.exit(2);
  }
  const vi = args.indexOf('--viewports');
  const viewports = vi >= 0 ? parseViewportList(args[vi + 1]) : DEFAULT_VIEWPORTS;
  const isFixture = fs.statSync(target).isFile();
  const dir = isFixture ? buildLayoutProject(JSON.parse(fs.readFileSync(target, 'utf8'))) : target;
  measureLayout(dir, viewports)
    .then((result) => {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      if (isFixture && args.includes('--keep')) console.error(`project kept at ${dir}`);
      else if (isFixture) fs.rmSync(path.dirname(dir), { recursive: true, force: true });
    })
    .catch((e) => {
      console.error(e.stack || e);
      process.exit(1);
    });
}
