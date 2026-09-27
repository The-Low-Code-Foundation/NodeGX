/**
 * TVW-004 — `layersTree` over every project on this machine, before the UI exists.
 *
 * The s12 technique: run the pure module offline over the corpus and let it change the design
 * before a pixel is drawn. It found three things §2 did not anticipate (see the task file §6):
 * the app shell is on 73 of 78 routed screens, 28% of rows fall past the right edge of a 240px
 * panel at 14px of indent per level, and one modest page is 330 rows fully expanded.
 *
 *     TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS","target":"ES2019","esModuleInterop":true,"strict":false}' \
 *       node_modules/.bin/ts-node --transpile-only scripts/devtools/tvw004-layers-census.ts /tmp/census.json
 *
 * ⚠️ **Project files written before the `visualRoots` field existed have none**, and the editor
 * computes it live from the resolved type. The first run of this script read **57 screens as
 * empty** because of it. {@link isVisualOffline} is the stand-in: every type that appears as a
 * child anywhere in the corpus is provably `allowAsChild`, which is measured rather than guessed.
 * 57 → 4.
 */
import * as fs from 'fs';
import * as path from 'path';

import {
  layersOfScreen,
  LayerComponent,
  LayerNode
} from '../../packages/noodl-editor/src/editor/src/views/panels/ComponentsPanelNew/layersTree';

const ROOTS = [
  '/Users/richardosborne/vscode_projects/Noodl projects',
  '/Users/richardosborne/vscode_projects/NodeGX test projects'
];

const CHILD_TYPES = new Set<string>();

function findProjects(): string[] {
  const out: string[] = [];
  for (const root of ROOTS) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root)) {
      const file = path.join(root, entry, 'project.json');
      if (fs.existsSync(file)) out.push(file);
    }
  }
  return out;
}

interface Stats {
  project: string;
  components: number;
  rootComponent?: string;
  rootHasShell: boolean;       // root draws something other than the Router
  rootShellNodes: number;      // rows above/beside the Router in the root
  screens: { page: string; rows: number; maxDepth: number; instances: number; bands: number }[];
  cyclic: string[];
  repeatersExplicit: number;
  repeatersDynamic: number;
  repeatersUnset: number;
  instancesWithChildren: number;
  unresolved: string[];
}

function build(file: string): Stats | undefined {
  let json: any;
  try {
    json = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return undefined;
  }
  if (!Array.isArray(json.components)) return undefined;

  const index = new Map<string, LayerComponent>();
  let rootComponent: string | undefined;
  const routers: { name: string; routes: string[] }[] = [];
  let repeatersExplicit = 0,
    repeatersDynamic = 0,
    repeatersUnset = 0,
    instancesWithChildren = 0;

  const names = new Set<string>(json.components.map((c: any) => c.name));

  for (const component of json.components) {
    const roots: LayerNode[] = (component.graph?.roots ?? []).map(toNode);
    index.set(component.name, {
      name: component.name,
      roots,
      visualRootIds: component.graph?.visualRoots ?? roots.filter((r) => isVisualOffline(r, names)).map((r) => r.id)
    });

    walk(component.graph?.roots ?? [], (node: any) => {
      if (node.id === json.rootNodeId) rootComponent = component.name;
      if (node.type === 'For Each') {
        const t = node.parameters?.templateType;
        if (t === undefined) repeatersUnset++;
        else if (t === 'explicit') repeatersExplicit++;
        else repeatersDynamic++;
      }
      if (node.type === 'Router') {
        const routes = (node.parameters?.pages?.routes ?? []).filter((r: any) => typeof r === 'string');
        routers.push({ name: node.parameters?.name || 'Main', routes });
      }
      if (names.has(node.type) && (node.children ?? []).length > 0) instancesWithChildren++;
    });
  }

  if (!rootComponent) return undefined;

  const pages: string[] = [];
  for (const router of routers) for (const route of router.routes) if (!pages.includes(route)) pages.push(route);

  // The root's own shell: rows in the root's tree that are not the Router's subtree.
  const bare = layersOfScreen({ root: rootComponent, screenPage: undefined, components: index });
  const rootShellNodes = bare.rows.filter((r) => r.kind !== 'router-note').length;

  const screens: Stats['screens'] = [];
  const cyclic: string[] = [];
  const unresolved = new Set<string>();

  for (const page of pages.length ? pages : [undefined]) {
    const tree = layersOfScreen({ root: rootComponent, screenPage: page, components: index });
    screens.push({
      page: page ?? '(no router)',
      rows: tree.rows.length,
      maxDepth: tree.rows.reduce((m, r) => Math.max(m, r.depth), 0),
      instances: tree.rows.filter((r) => r.kind === 'instance').length,
      bands: tree.rows.filter((r) => r.kind === 'band').length
    });
    if (tree.cyclic) cyclic.push(page ?? '(no router)');
    for (const r of tree.unresolvedRouters) unresolved.add(r);
  }

  return {
    project: path.basename(path.dirname(file)),
    components: json.components.length,
    rootComponent,
    rootHasShell: rootShellNodes > 1,
    rootShellNodes,
    screens,
    cyclic,
    repeatersExplicit,
    repeatersDynamic,
    repeatersUnset,
    instancesWithChildren,
    unresolved: [...unresolved]
  };
}

/** Offline stand-in for `getVisualRootIds()`, for files written before the field existed. */
function isVisualOffline(node: LayerNode, names: Set<string>): boolean {
  if (!node.typename) return false;
  if (CHILD_TYPES.has(node.typename)) return true;
  return names.has(node.typename);
}

function toNode(node: any): LayerNode {
  return {
    id: node.id,
    typename: node.type,
    label: node.label,
    parameters: node.parameters,
    children: (node.children ?? []).map(toNode)
  };
}

function walk(nodes: any[], fn: (n: any) => void) {
  for (const node of nodes) {
    fn(node);
    walk(node.children ?? [], fn);
  }
}

// Pass 1: every type that appears as a CHILD anywhere is provably `allowAsChild` — measured,
// not guessed. Older project files carry no `visualRoots` field at all (57 screens read as empty
// before this), and the editor computes it live from the resolved type.
const files = findProjects();
for (const file of files) {
  try {
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const c of json.components ?? []) walk(c.graph?.roots ?? [], (n: any) => {
      for (const child of n.children ?? []) if (child.type) CHILD_TYPES.add(child.type);
    });
  } catch {}
}
const all = files.map(build).filter(Boolean) as Stats[];
const out = process.argv[2] || '/tmp/tvw004-census.json';
fs.writeFileSync(out, JSON.stringify(all, null, 1));

const screens = all.flatMap((s) => s.screens);
const rows = screens.map((s) => s.rows).sort((a, b) => a - b);
const pct = (p: number) => rows[Math.min(rows.length - 1, Math.floor((rows.length - 1) * p))];

console.log('projects            ', all.length);
console.log('screens             ', screens.length);
console.log('rows  p50/p90/p99/max', pct(0.5), pct(0.9), pct(0.99), rows[rows.length - 1]);
console.log('screens > 200 rows  ', screens.filter((s) => s.rows > 200).length);
console.log('screens = 0 rows    ', screens.filter((s) => s.rows === 0).length);
console.log('max depth (max)     ', Math.max(...screens.map((s) => s.maxDepth)));
console.log('ROOT SHELL: projects whose root draws more than the Router:', all.filter((s) => s.rootHasShell).length, '/', all.length);
console.log('  their shell row counts:', all.filter((s) => s.rootHasShell).map((s) => s.rootShellNodes).sort((a,b)=>b-a).slice(0, 20).join(' '));
console.log('cyclic projects     ', all.filter((s) => s.cyclic.length).map((s) => s.project).join(', ') || 'none');
console.log('repeaters expl/unset/dyn', all.reduce((n,s)=>n+s.repeatersExplicit,0), all.reduce((n,s)=>n+s.repeatersUnset,0), all.reduce((n,s)=>n+s.repeatersDynamic,0));
console.log('instances with children ', all.reduce((n,s)=>n+s.instancesWithChildren,0));
console.log('projects w/ unresolved routers', all.filter((s)=>s.unresolved.length).length);
