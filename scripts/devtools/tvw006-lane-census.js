/**
 * TVW-006 — what a structure lane would actually be drawn over, across every project on this
 * machine. Run before a pixel is drawn, the s12/s14 way.
 *
 * Four questions §2 assumes answers to:
 *   1. How many components get ZERO lanes (logic-only), ONE, or TWO+?
 *   2. Is the logic-only eyebrow a rare sight or the common case?
 *   3. Do logic roots sit to the RIGHT of the stack as the MCP guidance claims — or would a lane
 *      be drawn straight over one?
 *   4. How far does a lane's 12px + 22px growth reach into its neighbours?
 *
 * ⚠️ `visualRoots` is absent in files written before the field existed, so visual-ness uses the
 * s14 stand-in: any type seen as a CHILD anywhere in the corpus is provably allowAsChild, plus the
 * project's own component names (an instance of a visual component is visual).
 *
 * ⚠️ The box is a LOWER BOUND — the editor's real `measure()` needs port counts and fonts. Width
 * >= 150 + depth*20, height >= 36 + (subtree-1)*46. So an overlap counted here is REAL; an
 * overlap missed here may still happen. It answers "does this occur", not "how often exactly".
 */
const fs = require('fs');
const path = require('path');

const ROOTS = [
  '/Users/richardosborne/vscode_projects/Noodl projects',
  '/Users/richardosborne/vscode_projects/NodeGX test projects'
];

const NODE_W = 150;
const NODE_H = 36;
const CHILD_MARGIN = 20;
const CHILD_SPACING = 10;
const PADDING = 12;
const EYEBROW = 22;

const CHILD_TYPES = new Set();

function findProjects() {
  const out = [];
  for (const root of ROOTS) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root)) {
      const file = path.join(root, entry, 'project.json');
      if (fs.existsSync(file)) out.push(file);
    }
  }
  return out;
}

function collectChildTypes(component) {
  const walk = (n) => {
    for (const c of n.children || []) {
      if (c.type) CHILD_TYPES.add(typeof c.type === 'string' ? c.type : c.type.name);
      walk(c);
    }
  };
  for (const r of (component.graph && component.graph.roots) || []) walk(r);
}

function typeName(n) {
  return typeof n.type === 'string' ? n.type : n.type && n.type.name;
}

function isVisual(root, componentNames, recorded) {
  if (recorded && recorded.has(root.id)) return true;
  const t = typeName(root);
  if (!t) return false;
  if (CHILD_TYPES.has(t)) return true;
  return componentNames.has(t);
}

/** depth and node count of a subtree — the two numbers the lower-bound box needs. */
function subtree(n) {
  let count = 1;
  let depth = 0;
  for (const c of n.children || []) {
    const s = subtree(c);
    count += s.count;
    depth = Math.max(depth, 1 + s.depth);
  }
  return { count, depth };
}

function boxOf(root) {
  const s = subtree(root);
  return {
    x: root.x || 0,
    y: root.y || 0,
    width: NODE_W + s.depth * CHILD_MARGIN,
    height: NODE_H + (s.count - 1) * (NODE_H + CHILD_SPACING)
  };
}

function laneOf(box) {
  return {
    x: box.x - PADDING,
    y: box.y - PADDING - EYEBROW,
    width: box.width + PADDING * 2,
    height: box.height + PADDING * 2 + EYEBROW
  };
}

function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

const stats = {
  projects: 0,
  components: 0,
  empty: 0,
  laneCounts: {},
  logicOnly: 0,
  logicOnlyWithNodes: 0,
  mixed: 0,
  logicRootOverlapsLane: 0,
  logicRootOverlapsLaneComponents: [],
  laneOverlapsLane: 0,
  laneOverlapsLaneComponents: [],
  logicRootsInMixed: 0,
  componentsWithEnclosedLogic: 0,
  componentsWithLaneOverlap: 0,
  logicLeftOfStack: 0,
  logicRightOfStack: 0,
  gapsUnder12: 0,
  gapsUnder34: 0,
  gapSamples: []
};

const files = findProjects();
const parsed = [];
for (const file of files) {
  let json;
  try {
    json = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    continue;
  }
  if (!json.components) continue;
  parsed.push({ file, json });
  for (const c of json.components) collectChildTypes(c);
}

for (const { file, json } of parsed) {
  stats.projects++;
  const componentNames = new Set(json.components.map((c) => c.name));
  for (const component of json.components) {
    stats.components++;
    const graph = component.graph || {};
    const roots = graph.roots || [];
    if (roots.length === 0) {
      stats.empty++;
      continue;
    }
    const recorded = new Set(graph.visualRoots || []);
    const visual = roots.filter((r) => isVisual(r, componentNames, recorded));
    const logic = roots.filter((r) => !isVisual(r, componentNames, recorded));

    const n = visual.length;
    stats.laneCounts[n >= 3 ? '3+' : String(n)] = (stats.laneCounts[n >= 3 ? '3+' : String(n)] || 0) + 1;
    if (n === 0) {
      stats.logicOnly++;
      if (roots.length > 0) stats.logicOnlyWithNodes++;
      continue;
    }
    if (logic.length > 0) stats.mixed++;

    const lanes = visual.map((r) => laneOf(boxOf(r)));
    const label = `${path.basename(path.dirname(file))} › ${component.name}`;

    // Q3/Q4 — a logic root drawn inside a lane.
    stats.logicRootsInMixed += logic.length;
    let enclosedHere = 0;
    for (const l of logic) {
      const lb = boxOf(l);
      for (const lane of lanes) {
        if (intersects(lb, lane)) {
          stats.logicRootOverlapsLane++;
          enclosedHere++;
          if (stats.logicRootOverlapsLaneComponents.length < 6)
            stats.logicRootOverlapsLaneComponents.push(label + ` [logic ${typeName(l)}]`);
          break;
        }
      }
    }

    if (enclosedHere > 0) stats.componentsWithEnclosedLogic++;
    let laneOverlapHere = 0;

    // Two lanes in one component that touch each other.
    for (let i = 0; i < lanes.length; i++) {
      for (let j = i + 1; j < lanes.length; j++) {
        if (intersects(lanes[i], lanes[j])) {
          stats.laneOverlapsLane++;
          laneOverlapHere++;
          if (stats.laneOverlapsLaneComponents.length < 6) stats.laneOverlapsLaneComponents.push(label);
        }
      }
    }

    if (laneOverlapHere > 0) stats.componentsWithLaneOverlap++;

    // Where do logic roots sit relative to the first stack, and how much clearance is there?
    const stack = boxOf(visual[0]);
    for (const l of logic) {
      const lb = boxOf(l);
      if (lb.x >= stack.x + stack.width) {
        stats.logicRightOfStack++;
        const gap = lb.x - (stack.x + stack.width);
        if (gap < PADDING) stats.gapsUnder12++;
        if (gap < PADDING + EYEBROW) stats.gapsUnder34++;
        if (stats.gapSamples.length < 40) stats.gapSamples.push(Math.round(gap));
      } else if (lb.x + lb.width <= stack.x) {
        stats.logicLeftOfStack++;
      }
    }
  }
}

stats.gapSamples.sort((a, b) => a - b);
console.log(JSON.stringify(stats, null, 1));
