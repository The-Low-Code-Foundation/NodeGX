/**
 * TVW-008 — how big is "every visual component in the project, in its own frame"?
 *
 * §1 promises a board of every visual component at its saved size. §4 AC1 describes six frames
 * fitting at 50% zoom on the corpus project, and §5 warns about an N² export. Neither number was
 * measured. This asks, across every project on this machine:
 *
 *   - how many frames the board would draw (visual components, minus cloud, minus pages);
 *   - how wide that board is at 100%, laid out as §2's wrapping row of fixed-width frames;
 *   - how many nodes the single board export contains, and whether N² is real;
 *   - how many components carry the `bench.frame` / `bench.scenarios[0]` that AC2/AC3/AC4 read.
 *
 * 🔴 **Visual-ness comes from the recorded `graph.visualRoots` field and nothing else** — the
 * lesson TVW-006 paid for at s18. An offline proxy for a runtime predicate (`isVisualRoot`) is a
 * hypothesis; `visualRoots` is written by the editor itself, so it IS the predicate's answer.
 * Components whose file predates the field are EXCLUDED and COUNTED, never guessed at.
 */
const fs = require('fs');
const path = require('path');

const ROOTS = [
  '/Users/richardosborne/vscode_projects/Noodl projects',
  '/Users/richardosborne/vscode_projects/NodeGX test projects'
];

/** previewScope.ts `benchTargets` excludes these — a cloud component is not a browser mount. */
const CLOUD_PREFIX = '/#__cloud__';
/** previewScope.ts DEFAULT_BENCH_WIDTH — what a frame is without a stored `bench.frame`. */
const DEFAULT_W = 768;
const DEFAULT_H = 768;
/** §2: frames sit in a wrapping row. Editor-drawn caption + gutter around each frame. */
const GUTTER = 24;
const CAPTION_H = 20;

function findProjects() {
  const out = [];
  for (const root of ROOTS) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root)) {
      const file = path.join(root, entry, 'project.json');
      if (fs.existsSync(file)) out.push({ file, name: entry });
    }
  }
  return out;
}

const typeName = (n) => (typeof n.type === 'string' ? n.type : n.type && n.type.name);

function countNodes(graph) {
  let n = 0;
  const walk = (nodes) => {
    for (const node of nodes || []) {
      n++;
      walk(node.children);
    }
  };
  walk(graph && graph.roots);
  return n;
}

/** Every component type this component places, at any depth. */
function placedTypes(graph, out) {
  const walk = (nodes) => {
    for (const node of nodes || []) {
      const t = typeName(node);
      if (t && t.startsWith('/')) out.add(t);
      walk(node.children);
    }
  };
  walk(graph && graph.roots);
  return out;
}

const stats = {
  projects: 0,
  components: 0,
  noVisualRootsField: 0,
  visual: 0,
  pages: 0,
  boardFrames: [],
  benchFrame: 0,
  benchScenarios: 0,
  worstBoards: [],
  worstExports: []
};

for (const { file, name } of findProjects()) {
  let json;
  try {
    json = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    continue;
  }
  stats.projects++;
  const components = json.components || [];

  // A page is a component a Router lists. Same rule the product uses, read off the router index
  // rather than guessed from a `Page` node, because a Page node at a root is necessary not
  // sufficient — §2 defaults pages OUT of the board.
  const pageNames = new Set();
  for (const c of components) {
    const walk = (nodes) => {
      for (const node of nodes || []) {
        const t = typeName(node);
        if (t === 'Router' && node.parameters && node.parameters.pages) {
          const p = node.parameters.pages;
          const list = (p && p.routes) || (Array.isArray(p) ? p : []);
          for (const r of list) {
            const target = typeof r === 'string' ? r : r && (r.component || r.name);
            if (target) pageNames.add(target);
          }
        }
        walk(node.children);
      }
    };
    walk(c.graph && c.graph.roots);
  }

  let frames = 0;
  let exportNodes = 0;
  let boardW = 0;
  const byName = new Map(components.map((c) => [c.name, c]));

  for (const c of components) {
    stats.components++;
    if (c.metadata && c.metadata['bench.frame']) stats.benchFrame++;
    if (c.metadata && c.metadata['bench.scenarios']) stats.benchScenarios++;

    const graph = c.graph || {};
    if (!Array.isArray(graph.visualRoots)) {
      stats.noVisualRootsField++;
      continue;
    }
    if (graph.visualRoots.length === 0) continue;
    stats.visual++;
    if (String(c.name).startsWith(CLOUD_PREFIX)) continue;
    if (pageNames.has(c.name)) {
      stats.pages++;
      continue;
    }

    frames++;
    const stored = c.metadata && c.metadata['bench.frame'];
    const w = stored && typeof stored.width === 'number' ? stored.width : DEFAULT_W;
    boardW += w + GUTTER;

    // §5's N²: the frame renders the component's own tree, and every component IT places renders
    // too. Count the transitive closure's node total — that is what the ONE export carries.
    const seen = new Set();
    const queue = [c];
    let nodes = 0;
    while (queue.length) {
      const cur = queue.pop();
      if (!cur || seen.has(cur.name)) continue;
      seen.add(cur.name);
      nodes += countNodes(cur.graph);
      for (const t of placedTypes(cur.graph, new Set())) {
        const child = byName.get(t);
        if (child && !seen.has(t)) queue.push(child);
      }
    }
    exportNodes += nodes;
  }

  stats.boardFrames.push(frames);
  stats.worstBoards.push({ name, frames, boardW });
  stats.worstExports.push({ name, frames, exportNodes });
}

const pct = (n, d) => (d ? ((n / d) * 100).toFixed(1) + '%' : '—');
const sorted = stats.boardFrames.slice().sort((a, b) => a - b);
const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];

console.log('=== TVW-008 board census ===');
console.log(`projects ${stats.projects}  components ${stats.components}`);
console.log(`components with NO visualRoots field (EXCLUDED): ${stats.noVisualRootsField} (${pct(stats.noVisualRootsField, stats.components)})`);
console.log(`visual components: ${stats.visual}   of which pages (excluded by default): ${stats.pages}`);
console.log('');
console.log(`bench.frame present:     ${stats.benchFrame} (${pct(stats.benchFrame, stats.components)})  <- AC3's subject`);
console.log(`bench.scenarios present: ${stats.benchScenarios} (${pct(stats.benchScenarios, stats.components)})  <- AC2/AC4's subject`);
console.log('');
console.log('FRAMES PER BOARD');
console.log(`  min ${sorted[0]}  p25 ${q(0.25)}  p50 ${q(0.5)}  p75 ${q(0.75)}  p90 ${q(0.9)}  max ${sorted[sorted.length - 1]}`);
const buckets = { '0': 0, '1-6': 0, '7-20': 0, '21-50': 0, '51-100': 0, '100+': 0 };
for (const f of sorted) {
  if (f === 0) buckets['0']++;
  else if (f <= 6) buckets['1-6']++;
  else if (f <= 20) buckets['7-20']++;
  else if (f <= 50) buckets['21-50']++;
  else if (f <= 100) buckets['51-100']++;
  else buckets['100+']++;
}
for (const k of Object.keys(buckets)) console.log(`  ${k.padEnd(8)} ${String(buckets[k]).padStart(4)}  ${pct(buckets[k], sorted.length)}`);

console.log('');
console.log('WIDEST BOARDS AT 100% (one row, no wrap)');
for (const b of stats.worstBoards.sort((a, b) => b.boardW - a.boardW).slice(0, 8)) {
  console.log(`  ${String(b.frames).padStart(4)} frames  ${String(b.boardW).padStart(7)}px  ${b.name}`);
}

console.log('');
console.log('BIGGEST SINGLE EXPORT (nodes the one board export carries)');
for (const b of stats.worstExports.sort((a, b) => b.exportNodes - a.exportNodes).slice(0, 8)) {
  console.log(`  ${String(b.exportNodes).padStart(7)} nodes  ${String(b.frames).padStart(4)} frames  ${b.name}`);
}
