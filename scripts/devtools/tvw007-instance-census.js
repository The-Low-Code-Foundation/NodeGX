/**
 * TVW-007 — what an instance eyebrow would actually have to say, across the corpus.
 *
 * §2 specifies `INSTANCE · Sections/Hero · used 3×` in 10px mono under a node's name. The node is
 * 150px wide. This asks whether that sentence fits, how often a component has more than one
 * parent (the `in 3 places ▾` case), and how many instance nodes there are to draw it on.
 *
 * ⚠️ Text width is ESTIMATED at 6.0px/char for 10.5px mono (`CanvasFonts.portLabel`); real
 * advance widths vary by glyph. A string this estimate calls too wide IS too wide by a margin;
 * one it calls a near fit is a near fit. The estimate is stated so the finding can be re-measured
 * against the real `measureText` in the editor.
 */
const fs = require('fs');
const path = require('path');

const ROOTS = [
  '/Users/richardosborne/vscode_projects/Noodl projects',
  '/Users/richardosborne/vscode_projects/NodeGX test projects'
];

const NODE_W = 150;
/** `NodeGraphEditorNode.headerTextInset` territory — the text does not start at the node's edge. */
const TEXT_INSET = 7;
const CHIP = 22; // the header chip an instance already carries (FIX-018)
const AVAILABLE = NODE_W - TEXT_INSET * 2 - CHIP;
const PX_PER_CHAR = 6.0;

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

const typeName = (n) => (typeof n.type === 'string' ? n.type : n.type && n.type.name);

const stats = {
  projects: 0,
  components: 0,
  instanceNodes: 0,
  componentsWithAnInstance: 0,
  /** component name -> Set of parent component names that place it */
  parentCounts: { one: 0, two: 0, threePlus: 0 },
  eyebrow: { fits: 0, overflows: 0, widths: [] },
  nameOnly: { fits: 0, overflows: 0 },
  worst: [],
  deepestPaths: []
};

for (const file of findProjects()) {
  let json;
  try {
    json = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    continue;
  }
  if (!json.components) continue;
  stats.projects++;

  const names = new Set(json.components.map((c) => c.name));
  /** placed component -> set of components that place it */
  const parents = new Map();

  for (const component of json.components) {
    stats.components++;
    let hasInstance = false;
    const walk = (n) => {
      const t = typeName(n);
      if (t && names.has(t)) {
        stats.instanceNodes++;
        hasInstance = true;
        if (!parents.has(t)) parents.set(t, new Set());
        parents.get(t).add(component.name);
      }
      for (const c of n.children || []) walk(c);
    };
    for (const r of (component.graph && component.graph.roots) || []) walk(r);
    if (hasInstance) stats.componentsWithAnInstance++;
  }

  for (const [placed, parentSet] of parents) {
    const n = parentSet.size;
    if (n === 1) stats.parentCounts.one++;
    else if (n === 2) stats.parentCounts.two++;
    else stats.parentCounts.threePlus++;

    // §2's eyebrow, on the component's own path, with a plausible count.
    const shown = placed.replace(/^\//, '');
    const text = `INSTANCE · ${shown} · used 1×`;
    const width = text.length * PX_PER_CHAR;
    stats.eyebrow.widths.push(Math.round(width));
    if (width <= AVAILABLE) stats.eyebrow.fits++;
    else stats.eyebrow.overflows++;

    // What if the eyebrow dropped the path and said only the last segment?
    const leaf = shown.split('/').pop();
    const leafText = `INSTANCE · ${leaf} · used 1×`;
    if (leafText.length * PX_PER_CHAR <= AVAILABLE) stats.nameOnly.fits++;
    else stats.nameOnly.overflows++;

    if (stats.worst.length < 8 && width > AVAILABLE * 3) stats.worst.push({ text, width: Math.round(width) });
  }
}

stats.eyebrow.widths.sort((a, b) => a - b);
const pct = (p) => stats.eyebrow.widths[Math.floor(stats.eyebrow.widths.length * p)];
stats.eyebrow.p50 = pct(0.5);
stats.eyebrow.p90 = pct(0.9);
stats.eyebrow.max = stats.eyebrow.widths[stats.eyebrow.widths.length - 1];
delete stats.eyebrow.widths;
stats.available = AVAILABLE;

console.log(JSON.stringify(stats, null, 1));
