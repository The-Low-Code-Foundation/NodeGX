/**
 * P112 OWN-006 AC3 (second half) — the Electron editor as an adapter of the editor suite.
 *
 * NSP-021's round trip is two adapters in one suite: the MCP's (`packages/noodl-mcp/tests/editorSuite.test.ts`)
 * and this one. Both are graded against the same reference (`@nodegx/project-contract`'s writer), so the
 * round trip is built once: if the MCP and the editor each save what the reference saves, they save the same
 * thing.
 *
 * The adapter goes through the editor's own code path, the one a person's click goes through:
 *
 *  - **open** — `ProjectStructureService.loadProject` (on an in-memory filesystem), then what
 *    `projectFromDirectory`'s `openFromContent` does: `applyPatches`, `upgradeOnLoad`, `ProjectModel.fromJSON`
 *    with the model listeners off.
 *  - **add_node** — the node picker (`NodePicker.utils` `createNodeFunction`, and `NodeOperations` for a place in a
 *    parent): `NodeGraphNode.fromJSON` with a minted `guid()`, `insertChild` / `addChild` / `addRoot`, `seedNewNode`;
 *    then each parameter as the property panel sets it, the label as the Node panel renames. **Without** the
 *    picker's look (`ElementConfigRegistry.applyDefaults`) unless `pickerLook` is set: the suite's `add_node` is "a
 *    node of this type with these parameters", the MCP's intent; the look is the picker's own policy, measured in
 *    its own spec below (and P112-S7-TEXTDEFAULTS is what it found).
 *  - **remove_node** — `NodeGraphNodeDelete` (`graph.removeNode` in an undo group).
 *  - **connect / disconnect** — the connect popup (`ConnectionPopups`) and `NodeOperations.removeConnection`.
 *  - **set_parameter** — the property panel's `setParameter` (an absent value unsets).
 *  - **move** — `NodeOperations.commitMoveNode` (`model.set({x, y})`).
 *  - **rename** — `NodeGraphNodeRename` (`setLabel`).
 *  - **add_child** — the Layers drag (`layersDragApply` `applyMove`: `detachNode` then `attachNode`).
 *  - **save** — `ProjectStructureService.saveProject(dir, model.toJSON())`, which is `ProjectModel.toDirectory`'s
 *    v2 branch: `ComponentSaver`, the registry, the project-level files.
 *
 * 🔴 **The fixture the suite grades is the project after the editor has opened and saved it once** (OWN-006 §5,
 * and memory: opening a project writes files into it). What the open alone changes is not a difference the edits
 * made; it is measured separately below and printed, so it is seen rather than hidden.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  formatReport,
  referenceAdapter,
  runSuite,
  type Edit,
  type EditorAdapter,
  type Files,
  type Fixture,
  type SavedFilesCheck
} from '@nodegx/project-contract/editor-suite';
import { readProjectTree } from '@nodegx/project-contract/editor-suite-node';

import Model from '../../src/shared/model';
import { legacyNameToPath } from '../../src/editor/src/io/ProjectExporter';
import { ElementConfigRegistry } from '../../src/editor/src/models/ElementConfigs';
import { NodeGraphModel, NodeGraphNode } from '../../src/editor/src/models/nodegraphmodel';
import { NodeLibrary } from '@noodl-models/nodelibrary';
import { seedNewNode } from '../../src/editor/src/models/nodeSeed/seedNewNode';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — a JS module
import { applyPatches } from '../../src/editor/src/models/ProjectPatches/applypatches';
import { upgradeOnLoad } from '../../src/editor/src/models/ProjectPatches/upgradeOnLoad';
import { ProjectModel } from '../../src/editor/src/models/projectmodel';
import { UndoActionGroup } from '../../src/editor/src/models/undo-queue-model';
import { ProjectStructureService } from '../../src/editor/src/services/ProjectStructure';
import { guid } from '../../src/editor/src/utils/utils';
import { loadV2Directory } from '../../src/editor/src/validation/loadV2Project';
import { SemanticValidator } from '../../src/editor/src/validation/SemanticValidator';
import { MemFs } from '../services/ProjectStructure/memfs';

// process.cwd(), not __dirname: the webpack test bundle resolves __dirname to tests/ (see v2-loader.test.ts).
const REPO = path.join(process.cwd(), '..', '..');
const FIXTURES = path.join(REPO, 'packages', 'nodegx-project-contract', 'tests', 'fixtures', 'editor-suite');
const TEMPLATES = path.join(REPO, 'templates');
const DIR = '/proj';

function edits(name: string): Edit[] {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, `${name}.edits.json`), 'utf8')) as Edit[];
}

function filesOf(memfs: MemFs): Files {
  const out: Files = {};
  for (const p of memfs.pathsUnder(DIR)) out[p.slice(DIR.length + 1)] = memfs.files.get(p)!;
  return out;
}

/** The editor, as an adapter. `opened()` reports what the open itself changed (the upgrade's sections). */
export function electronAdapter(
  options: { pickerLook?: boolean } = {}
): EditorAdapter & { model(): ProjectModel; upgraded(): string[] } {
  let memfs = new MemFs();
  let service = new ProjectStructureService(memfs);
  let project: ProjectModel | undefined;
  let sections: string[] = [];

  const graphOf = (component: string): NodeGraphModel => {
    if (!project) throw new Error('open() first');
    const c = project.getComponents().find((x) => legacyNameToPath(x.name) === component);
    if (!c) throw new Error(`the editor has no component "${component}"`);
    return c.graph;
  };
  const nodeIn = (graph: NodeGraphModel, id: string, component: string): NodeGraphNode => {
    const n = graph.findNodeWithId(id);
    if (!n) throw new Error(`the editor has no node "${id}" in ${component}`);
    return n;
  };
  const wireIn = (graph: NodeGraphModel, e: Extract<Edit, { edit: 'disconnect' }>) =>
    graph.connections.find(
      (c) =>
        c.fromId === e.from.node &&
        c.fromProperty === e.from.port &&
        c.toId === e.to.node &&
        c.toProperty === e.to.port
    );

  return {
    name: 'the Electron editor (ProjectStructureService + ProjectModel + the UI model calls)',
    model: () => {
      if (!project) throw new Error('open() first');
      return project;
    },
    upgraded: () => sections,
    async open(files: Files) {
      memfs = new MemFs();
      for (const [rel, text] of Object.entries(files)) memfs.files.set(`${DIR}/${rel}`, text);
      service = new ProjectStructureService(memfs);
      const { project: content, warnings } = await service.loadProject(DIR);
      if (warnings.length > 0) throw new Error(`the editor opened the project with warnings: ${warnings.join(' | ')}`);
      // projectFromDirectory → openFromContent → openProject, in order.
      applyPatches(content);
      const upgraded = JSON.parse(JSON.stringify(content));
      const report = upgradeOnLoad(upgraded);
      sections = report.sections.map((s) => s.title);
      for (const file of report.files) {
        const full = `${DIR}/${file.path}`;
        memfs.files.set(full, file.merge(memfs.files.get(full)));
      }
      Model._listenersEnabled = false;
      project = ProjectModel.fromJSON(report.sections.length > 0 ? upgraded : content);
      Model._listenersEnabled = true;
      project._retainedProjectDirectory = DIR;
      project._projectFormat = 'v2';
    },
    apply(edit: Edit) {
      const graph = graphOf(edit.component);
      const undo = new UndoActionGroup({ label: `suite ${edit.edit}` });
      switch (edit.edit) {
        case 'add_node': {
          // NodePicker.utils createNodeFunction / NodeOperations: a guid, the type's version, the drop point.
          const type = NodeLibrary.instance.getNodeTypeWithName?.(edit.type) as { version?: number } | undefined;
          const node = NodeGraphNode.fromJSON({
            type: edit.type,
            ...(type?.version !== undefined ? { version: type.version } : {}),
            ...(edit.x !== undefined ? { x: edit.x } : {}),
            ...(edit.y !== undefined ? { y: edit.y } : {}),
            id: guid()
          } as Parameters<typeof NodeGraphNode.fromJSON>[0]);
          if (options.pickerLook) ElementConfigRegistry.applyDefaults(node, edit.type);
          if (edit.parent !== undefined) {
            const parent = nodeIn(graph, edit.parent, edit.component);
            if (edit.index !== undefined) parent.insertChild(node, edit.index, { undo, label: 'create' });
            else parent.addChild(node, { undo, label: 'create' });
          } else {
            graph.addRoot(node, { undo, label: 'create' });
          }
          seedNewNode(node, edit.type);
          // Then the person fills in the property panel and names it in the Node panel.
          for (const [name, value] of Object.entries(edit.parameters ?? {}))
            node.setParameter(name, value, { undo, label: 'change ' + name });
          if (edit.label !== undefined) node.setLabel(edit.label, { undo, label: 'change label' });
          return { id: node.id };
        }
        case 'remove_node':
          graph.removeNode(nodeIn(graph, edit.id, edit.component), { undo });
          return undefined;
        case 'connect':
          graph.addConnection(
            { fromId: edit.from.node, fromProperty: edit.from.port, toId: edit.to.node, toProperty: edit.to.port },
            { undo, label: 'connect' }
          );
          return undefined;
        case 'disconnect': {
          const wire = wireIn(graph, edit);
          if (!wire) throw new Error(`the editor has no wire ${edit.from.node}.${edit.from.port} → ${edit.to.node}.${edit.to.port}`);
          graph.removeConnection(wire, { undo, label: 'disconnect' });
          return undefined;
        }
        case 'set_parameter':
          nodeIn(graph, edit.id, edit.component).setParameter(edit.name, edit.value, {
            undo,
            label: 'change ' + edit.name
          });
          return undefined;
        case 'move':
          nodeIn(graph, edit.id, edit.component).set({ x: edit.x, y: edit.y });
          return undefined;
        case 'rename':
          nodeIn(graph, edit.id, edit.component).setLabel(edit.label, { undo, label: 'change label' });
          return undefined;
        case 'add_child': {
          const node = nodeIn(graph, edit.id, edit.component);
          const parent = nodeIn(graph, edit.parent, edit.component);
          graph.detachNode(node, { undo, label: 'move' });
          graph.attachNode(parent, node, edit.index ?? parent.children.length, { undo, label: 'move' });
          return undefined;
        }
      }
    },
    async save() {
      if (!project) throw new Error('open() first');
      const res = await service.saveProject(DIR, project.toJSON());
      if (res.result !== 'success') throw new Error(`the editor's save failed: ${res.message}`);
      return filesOf(memfs);
    }
  };
}

/** The fixture as the editor leaves it after one open and one save, with no edit: what the suite grades from. */
async function openedOnce(name: string, projectDir: string): Promise<{ fixture: Fixture; opened: string[]; changed: string[] }> {
  const raw = readProjectTree(projectDir);
  const editor = electronAdapter();
  await editor.open(raw);
  const files = await editor.save();
  const changed = Object.keys(files)
    .filter((f) => files[f] !== raw[f])
    .map((f) => {
      if (raw[f] === undefined) return `${f} (new)`;
      try {
        const [a, b] = [JSON.parse(raw[f]), JSON.parse(files[f])] as Array<Record<string, unknown>>;
        const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(
          (k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])
        );
        return `${f} (${keys.length > 0 ? keys.join(', ') : 'same JSON, other bytes'})`;
      } catch {
        return f;
      }
    });
  return { fixture: { name, files, edits: edits(name) }, opened: editor.upgraded(), changed };
}

/** The semantic validator's errors and warnings, one line each, keyed without node ids (an editor mints its own). */
function semanticLines(files: Files): string[] {
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'own006-semantic-'));
  try {
    for (const [rel, text] of Object.entries(files)) {
      const abs = path.join(dir, ...rel.split('/'));
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, text, 'utf8');
    }
    const report = new SemanticValidator().validate(loadV2Directory(dir));
    return report.diagnostics
      .filter((d) => d.severity === 'error' || d.severity === 'warning')
      .map((d) => `${d.severity} ${d.code} in ${d.location.component}${d.location.nodeType ? ` (${d.location.nodeType})` : ''}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * §3.5's two checks the editor owns. The semantic validator: nothing the reference's save of the same script does
 * not also have (a script may add a node that is legitimately incomplete; the editor must not add a fault of its own).
 * The official loader: what the editor saved opens again with no warning.
 */
const CHECKS: Record<string, SavedFilesCheck> = {
  'semantic validator': async (saved, fixture) => {
    const reference = referenceAdapter();
    reference.open(fixture.files);
    for (const e of fixture.edits) reference.apply(e);
    const allowed = semanticLines(reference.save());
    const out: string[] = [];
    for (const line of semanticLines(saved)) {
      const at = allowed.indexOf(line);
      if (at === -1) out.push(`the semantic validator reports something the reference's save does not: ${line}`);
      else allowed.splice(at, 1);
    }
    return out;
  },
  'official loader': async (saved) => {
    const memfs = new MemFs();
    for (const [rel, text] of Object.entries(saved)) memfs.files.set(`${DIR}/${rel}`, text);
    const { warnings } = await new ProjectStructureService(memfs).loadProject(DIR);
    return warnings.map((w) => `the official loader warns on reopening: ${w}`);
  }
};

const FIXTURE_DIRS: Record<string, string> = {
  small: path.join(FIXTURES, 'small'),
  'todo-list': path.join(TEMPLATES, 'todo-list'),
  planning: path.join(TEMPLATES, 'planning')
};

describe('P112 OWN-006 AC3 — the Electron editor as an adapter of the editor suite', () => {
  for (const name of Object.keys(FIXTURE_DIRS)) {
    it(`${name}: the editor saves what the reference saves`, async () => {
      const { fixture, opened, changed } = await openedOnce(name, FIXTURE_DIRS[name]);
      if (opened.length > 0 || changed.length > 0)
        console.log(`[own-006] ${name}: the open alone upgraded [${opened.join(', ')}] and changed ${changed.length} file(s): ${changed.join(', ')}`);
      const report = await runSuite(electronAdapter(), fixture, { checks: CHECKS });
      console.log(`[own-006] ${formatReport(report, 20)}`);
      expect(report.sentences).toEqual([]);
      // The structural validator is the suite's own; the other two are the editor's, handed in: all three ran.
      expect(Object.keys(report.checks).sort()).toEqual(['official loader', 'semantic validator', 'structural validator']);
    });
  }

  it("the picker's look is the only other thing a person's drop adds: the registry's defaults, on the added nodes", async () => {
    const { fixture } = await openedOnce('small', FIXTURE_DIRS.small);
    const report = await runSuite(electronAdapter({ pickerLook: true }), fixture);
    console.log(`[own-006] the picker's look: ${formatReport(report, 30)}`);
    // The reference's id for each node the script added (runSuite's default mint), and the look its type gets:
    // exactly what `applyDefaults` writes on a node with no parameters.
    const lookOf = new Map<string, Record<string, unknown>>();
    fixture.edits.forEach((e, i) => {
      if (e.edit !== 'add_node') return;
      const stub = { parameters: {} as Record<string, unknown> };
      ElementConfigRegistry.applyDefaults(stub, e.type);
      lookOf.set(e.id ?? `suite-${i}`, stub.parameters);
    });
    const notTheLook = report.differences.filter((d) => {
      const m = /^parameters\.(.+)$/.exec(d.field);
      const look = d.node !== undefined ? lookOf.get(d.node) : undefined;
      return !m || !look || d.reference !== undefined || look[m[1]] !== d.candidate;
    });
    expect(notTheLook.map((d) => d.sentence)).toEqual([]);
    // The control that makes the empty list mean something: the look did arrive.
    expect(report.differences.length).toBeGreaterThan(0);
  });

  it('control: an editor whose reparent ignores the index fails, naming the children', async () => {
    const { fixture } = await openedOnce('small', FIXTURE_DIRS.small);
    const editor = electronAdapter();
    const broken: EditorAdapter = {
      ...editor,
      name: 'the Electron editor with its reparent index dropped',
      apply: (edit) => editor.apply(edit.edit === 'add_child' ? { ...edit, index: undefined } : edit)
    };
    const report = await runSuite(broken, fixture);
    expect(report.pass).toBe(false);
    expect(report.sentences.some((s) => s.includes('"children"'))).toBe(true);
  });
});
