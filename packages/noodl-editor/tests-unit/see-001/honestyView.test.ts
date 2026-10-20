/**
 * P111 SEE-001 §4 item 3 — the components panel's honesty number, and the canvas's script mark.
 *
 * What this grades: that the editor's walk of its live graphs (`forEachNode`: the node, then its children, stopping on a
 * truthy return) hands `@nodegx/node-spec`'s one rule the same population the templates' ratchet and the MCP read from
 * the files, so the header reads the ledger's number; that the header, a row and the popovers say what the MCP says;
 * and that a card is marked exactly when its node is one of the script parts the panel lists.
 *
 * The training template is read from disk and rebuilt as nested graphs (roots and `children`, as the editor holds them),
 * so a walk that skipped children, or stopped at the first node, would disagree with the ledger.
 */

import * as fs from 'fs';
import * as path from 'path';

import { projectHonesty, type HonestyNode } from '@nodegx/node-spec';

import {
  HEADER_COMPONENTS_SHOWN,
  headerHonesty,
  honestyComponentsOf,
  readProjectHonesty,
  ROW_PARTS_SHOWN,
  rowHonesty,
  rowHonestyIndex,
  SCRIPT_MARK_TOKEN,
  type HonestyWalkComponent,
  type HonestyWalkNode
} from '../../src/editor/src/views/panels/ComponentsPanelNew/honestyView';
import { isScriptNodeType, shippedTypeNames } from '../../src/editor/src/views/nodegrapheditor/canvas/scriptMark';

const REPO = path.join(__dirname, '..', '..', '..', '..');
const TRAINING = path.join(REPO, 'templates', 'digital-bricks-training');
const LEDGER = path.join(REPO, 'dev-docs', 'tasks', 'phase-111-you-can-see-what-it-built', 'honesty-ledger.json');
const EDITOR_SRC = path.join(__dirname, '..', '..', 'src', 'editor', 'src');

interface FileNode {
  id: string;
  type: string;
  label?: string;
  parent?: string;
  children?: string[];
  parameters?: Record<string, unknown>;
}

interface TreeNode extends HonestyWalkNode {
  children: TreeNode[];
}

const readJson = (p: string): unknown => JSON.parse(fs.readFileSync(p, 'utf8'));

/** The editor's `NodeGraphNode.forEach`: the node first, then its children, stop on a truthy return. */
function visit(node: TreeNode, callback: (n: HonestyWalkNode) => unknown): boolean {
  if (callback(node)) return true;
  for (const child of node.children) if (visit(child, callback)) return true;
  return false;
}

/** One component as the editor holds it: roots with children, from a `nodes.json`. */
function liveComponent(name: string, fileNodes: readonly FileNode[]): HonestyWalkComponent {
  const byId = new Map<string, TreeNode>();
  for (const n of fileNodes) byId.set(n.id, { id: n.id, typename: n.type, label: n.label, parameters: n.parameters, children: [] });
  const roots: TreeNode[] = [];
  for (const n of fileNodes) {
    const parent = n.parent ? byId.get(n.parent) : undefined;
    if (parent) parent.children.push(byId.get(n.id) as TreeNode);
    else roots.push(byId.get(n.id) as TreeNode);
  }
  return {
    name,
    forEachNode(callback) {
      for (const root of roots) if (visit(root, callback)) return true;
      return false;
    }
  };
}

interface TemplateComponent {
  name: string;
  registered: boolean;
  nodes: FileNode[];
}

/** Every component folder of the template (the ledger's population), marked with whether the registry lists it. */
function readTemplate(dir: string): TemplateComponent[] {
  const componentsDir = path.join(dir, 'components');
  const registry = readJson(path.join(componentsDir, '_registry.json')) as { components: Record<string, { path: string }> };
  const registeredDirs = new Set(Object.values(registry.components).map((e) => path.join(componentsDir, e.path)));
  const out: TemplateComponent[] = [];
  const walk = (d: string) => {
    for (const f of fs.readdirSync(d).sort()) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) walk(p);
    }
    const nodesFile = path.join(d, 'nodes.json');
    if (!fs.existsSync(nodesFile)) return;
    const componentFile = path.join(d, 'component.json');
    const meta = fs.existsSync(componentFile) ? (readJson(componentFile) as { path?: string }) : {};
    const name = meta.path ?? '/' + path.relative(componentsDir, d).split(path.sep).join('/');
    out.push({ name, registered: registeredDirs.has(d), nodes: ((readJson(nodesFile) as { nodes?: FileNode[] }).nodes ?? []) });
  };
  walk(componentsDir);
  return out;
}

const training = readTemplate(TRAINING);
const coreTypes = shippedTypeNames();

describe('SEE-001 editor — the walk reads the population the ledger and the MCP read', () => {
  it('the bundled catalog the kit test reads is the 180 shipped types', () => {
    expect(coreTypes).toHaveLength(180);
    expect(new Set(coreTypes).size).toBe(180);
  });

  it("over every component folder, the header's number is the ledger's for the training template", () => {
    const ledger = (readJson(LEDGER) as { templates: Record<string, { percent: number; known: number; script: number; unspecced: number }> })
      .templates['digital-bricks-training'];
    const h = readProjectHonesty(
      training.map((c) => liveComponent(c.name, c.nodes)),
      coreTypes
    );
    expect({ percent: h.percent, known: h.known, script: h.script, unspecced: h.unspecced }).toEqual(ledger);
    expect(headerHonesty(h)?.text).toBe(`${ledger.percent}% known`);
  });

  it('over the registry (what the editor loads), it is the number the MCP reports — 66% (475 known, 245 script, 20 unspecced)', () => {
    const registered = training.filter((c) => c.registered);
    expect(registered).toHaveLength(49);
    const h = readProjectHonesty(
      registered.map((c) => liveComponent(c.name, c.nodes)),
      coreTypes
    );
    expect({ percent: h.percent, known: h.known, script: h.script, unspecced: h.unspecced }).toEqual({ percent: 66, known: 475, script: 245, unspecced: 20 });
    expect(headerHonesty(h)?.text).toBe('66% known');
  });

  it('the walk reaches every node at any depth: per component, it equals the rule over the flat file', () => {
    // A walk that stopped on the first node (a callback returning `push`'s count) or skipped children would differ here.
    const nested = training.filter((c) => c.nodes.some((n) => n.parent));
    expect(nested.length).toBeGreaterThan(10);
    const live = projectHonesty(honestyComponentsOf(training.map((c) => liveComponent(c.name, c.nodes))), { coreTypes });
    const flat = projectHonesty(
      training.map((c) => ({ name: c.name, nodes: c.nodes as HonestyNode[] })),
      { coreTypes }
    );
    for (const c of flat.components) {
      const mine = live.components.find((r) => r.component === c.component);
      // The lines and the names too: a walk that dropped a node's parameters or its label would still count right.
      const names = (r: typeof c | undefined) => (r?.scriptParts ?? []).map((p) => `${p.id}:${p.label ?? ''}:${p.lines}`).sort();
      expect([c.component, mine?.known, mine?.script, mine?.unspecced, mine?.instances, mine?.exempt, mine?.scriptLines, names(mine)]).toEqual([
        c.component,
        c.known,
        c.script,
        c.unspecced,
        c.instances,
        c.exempt,
        c.scriptLines,
        names(c)
      ]);
    }
  });
});

describe('SEE-001 editor — what the header, a row and the popovers say', () => {
  const live = training.filter((c) => c.registered).map((c) => liveComponent(c.name, c.nodes));
  const h = readProjectHonesty(live, coreTypes);

  it('the header: the number and one word, the counts and the line weight on hover', () => {
    const header = headerHonesty(h);
    expect(header?.text).toBe('66% known');
    expect(header?.menuTitle).toBe('Honesty: 66% known (475 known, 245 script, 20 unspecced)');
    expect(header?.title).toContain(`${h.percentByLines}% weighed by script lines (${h.scriptLines} lines)`);
    expect(header?.title).toContain('It is not a quality score');
    expect(header?.components).toHaveLength(HEADER_COMPONENTS_SHOWN);
    // The most script first, as `get_project_info`'s `mostScript`.
    const counts = (header?.components ?? []).map((c) => Number(c.detail.split(' ')[0]));
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });

  it('a component with no script carries no number; one with script carries its own', () => {
    const index = rowHonestyIndex(h);
    const withScript = h.components.filter((c) => c.script > 0);
    const without = h.components.filter((c) => c.script === 0);
    expect(withScript.length).toBeGreaterThan(0);
    expect(without.length).toBeGreaterThan(0);
    expect(index.size).toBe(withScript.length);
    for (const c of without) expect(index.has(c.component)).toBe(false);
    for (const c of withScript) expect(index.get(c.component)?.text).toBe(`${c.percent}%`);
  });

  it("a row's popover names its script parts, the most lines first, and says a kit node is a kit node", () => {
    const settings = h.components.find((c) => c.component === '/Pages/Settings');
    expect(settings?.script).toBeGreaterThan(ROW_PARTS_SHOWN);
    const row = settings ? rowHonesty(settings) : null;
    expect(row?.parts).toHaveLength(ROW_PARTS_SHOWN);
    expect(row?.more).toBe((settings?.script ?? 0) - ROW_PARTS_SHOWN);
    const lines = (row?.parts ?? []).filter((p) => p.detail.endsWith('lines') || p.detail.endsWith('line')).map((p) => parseInt(p.detail, 10));
    expect([...lines].sort((a, b) => b - a)).toEqual(lines);

    const kitParts = h.components.flatMap((c) => c.scriptParts.filter((p) => p.kit).map((p) => ({ c, p })));
    expect(kitParts.length).toBeGreaterThan(0);
    const { c, p } = kitParts[0];
    const kitRow = rowHonesty({ ...c, scriptParts: [p] });
    expect(kitRow?.parts[0].detail).toBe('kit node, no spec');
  });

  it('a planted Function lowers the row and the header by the amounts the rule computes', () => {
    const target = live.find((c) => c.name === '/Logic/Standing') as HonestyWalkComponent;
    const planted: HonestyWalkComponent = {
      name: target.name,
      forEachNode(callback) {
        if (target.forEachNode(callback)) return true;
        return !!callback({ id: 'planted', typename: 'JavaScriptFunction', label: 'Planted by SEE-001', parameters: { functionScript: 'a\nb' } });
      }
    };
    const after = readProjectHonesty(
      live.map((c) => (c === target ? planted : c)),
      coreTypes
    );
    const before = h.components.find((c) => c.component === '/Logic/Standing');
    const now = after.components.find((c) => c.component === '/Logic/Standing');
    expect(now?.script).toBe((before?.script ?? 0) + 1);
    expect(after.script).toBe(h.script + 1);
    expect(headerHonesty(after)?.menuTitle).toBe('Honesty: 65.9% known (475 known, 246 script, 20 unspecced)');
    expect(rowHonesty(now as NonNullable<typeof now>)?.parts.map((p) => p.label)).toContain('Planted by SEE-001');
  });

  it('an empty project shows no number', () => {
    expect(headerHonesty(readProjectHonesty([], coreTypes))).toBeNull();
  });
});

describe('SEE-001 editor — the canvas marks exactly the script parts', () => {
  it('a card is marked exactly when its node is one of the script parts the panel lists', () => {
    const h = readProjectHonesty(
      training.map((c) => liveComponent(c.name, c.nodes)),
      coreTypes
    );
    const scriptIds = new Set(h.components.flatMap((c) => c.scriptParts.map((p) => `${c.component}|${p.id}`)));
    let marked = 0;
    for (const c of training) {
      for (const n of c.nodes) {
        const isMarked = isScriptNodeType(n.type);
        if (isMarked) marked++;
        expect([c.name, n.id, n.type, isMarked]).toEqual([c.name, n.id, n.type, scriptIds.has(`${c.name}|${n.id}`)]);
      }
    }
    expect(marked).toBe(h.script);
  });

  it('a component instance, a built-in with a spec and nothing at all are not marked; a Function and a kit node are', () => {
    expect(isScriptNodeType('JavaScriptFunction')).toBe(true);
    expect(isScriptNodeType('Expression')).toBe(true);
    expect(isScriptNodeType('some-kit.Thing')).toBe(true);
    expect(isScriptNodeType('Group')).toBe(false);
    expect(isScriptNodeType('/Pages/Home')).toBe(false);
    expect(isScriptNodeType('/#__cloud__/Save')).toBe(false);
    expect(isScriptNodeType(undefined)).toBe(false);
  });

  it('the panel and the canvas draw the mark in one token', () => {
    const scss = fs.readFileSync(path.join(EDITOR_SRC, 'views', 'panels', 'ComponentsPanelNew', 'ComponentsPanel.module.scss'), 'utf8');
    const markRule = scss.slice(scss.indexOf('.HonestyMark'));
    expect(markRule.slice(0, markRule.indexOf('}'))).toContain(`var(${SCRIPT_MARK_TOKEN})`);

    const theme = fs.readFileSync(path.join(EDITOR_SRC, 'views', 'nodegrapheditor', 'canvas', 'CanvasTheme.ts'), 'utf8');
    expect(theme).toMatch(new RegExp(`categoryJavascript: \\{ css: '${SCRIPT_MARK_TOKEN}'`));

    const painter = fs.readFileSync(path.join(EDITOR_SRC, 'views', 'nodegrapheditor', 'NodeGraphEditorNodePainter.ts'), 'utf8');
    const block = painter.slice(painter.indexOf('isScriptNodeType(node.model.typename)'));
    expect(block.slice(0, 400)).toContain('theme.categoryJavascript');
  });
});
