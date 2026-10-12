import * as fs from 'fs';
import * as path from 'path';
import { V2ProjectStore, componentRevision } from '@nodegx/project-contract/format';
import { diskFiles } from '@nodegx/project-contract/format-node';

import type { NodesV2File, RegistryV2File } from '../src/editor-deps';
import { ToolError } from '../src/errors';
import { ProjectStore, computeRevision } from '../src/project/ProjectStore';
import { copyFixture, readJson } from './helpers';

describe('ProjectStore', () => {
  let dir: string;
  let store: ProjectStore;

  beforeEach(() => {
    dir = copyFixture();
    store = new ProjectStore(dir);
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('rejects non-v2 directories with guidance', () => {
    const empty = fs.mkdtempSync(path.join(require('os').tmpdir(), 'noodl-mcp-empty-'));
    try {
      expect(() => new ProjectStore(empty)).toThrow(/not a NodeGX v2 project/);
      fs.writeFileSync(path.join(empty, 'project.json'), '{}');
      expect(() => new ProjectStore(empty)).toThrow(/legacy monolithic/);
    } finally {
      fs.rmSync(empty, { recursive: true, force: true });
    }
  });

  it('lists components with legacy names', () => {
    const rows = store.listComponents();
    expect(rows.map((r) => r.path)).toEqual(['App', 'Card', 'Pages/Home']);
    const home = rows.find((r) => r.path === 'Pages/Home')!;
    expect(home.legacyName).toBe('/Pages/Home');
    expect(home.type).toBe('page');
    expect(home.nodeCount).toBe(6);
  });

  it('resolves path form and legacy name to the same component', () => {
    const a = store.readComponent('Pages/Home');
    const b = store.readComponent('/Pages/Home');
    expect(a.key).toBe('Pages/Home');
    expect(b.key).toBe('Pages/Home');
    expect(a.revision).toBe(b.revision);
    expect(a.revision).toMatch(/^[0-9a-f]{14}$/);
  });

  it('throws not-found with known components listed', () => {
    let caught: unknown;
    try {
      store.readComponent('Pages/Nope');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ToolError);
    expect((caught as ToolError).code).toBe('not-found');
    expect((caught as ToolError).data?.knownComponents).toContain('Pages/Home');
  });

  it('finds usages of a component', () => {
    const usages = store.findUsages('Card');
    expect(usages).toEqual([{ component: 'Pages/Home', legacyName: '/Pages/Home', nodeId: 'card' }]);
  });

  it('detects on-disk drift between read and write', () => {
    const stored = store.readComponent('Card');
    // External process (an open editor) rewrites the file after our read.
    const nodesFile = path.join(dir, 'components', 'Card', 'nodes.json');
    const nodes = JSON.parse(fs.readFileSync(nodesFile, 'utf8'));
    nodes.nodes[1].parameters.text = 'changed elsewhere';
    fs.writeFileSync(nodesFile, JSON.stringify(nodes, null, 2));

    expect(() => store.writeComponent('Card', stored.files, {})).toThrow(/changed on disk/);
  });

  it('write + registry maintenance round-trips', () => {
    const stored = store.readComponent('Card');
    const files = JSON.parse(JSON.stringify(stored.files));
    files.nodes.nodes.push({ id: 'extra', type: 'Text', parent: 'card_root', parameters: { text: 'x' } });
    files.nodes.nodes[0].children.push('extra');
    const { revision } = store.writeComponent('Card', files, { ifRevision: stored.revision });
    expect(revision).not.toBe(stored.revision);

    const registry = readJson<RegistryV2File>(dir, 'components/_registry.json');
    expect(registry.components['Card'].nodeCount).toBe(3);
    expect(registry.stats?.totalNodes).toBe(11);
    // File on disk actually updated
    const onDisk = readJson<NodesV2File>(dir, 'components/Card/nodes.json');
    expect(onDisk.nodes).toHaveLength(3);
  });

  it('refuses a write with a stale revision', () => {
    const stored = store.readComponent('Card');
    const files = JSON.parse(JSON.stringify(stored.files));
    files.nodes.nodes[1].parameters.text = 'edited once';
    store.writeComponent('Card', files, { ifRevision: stored.revision }); // content (and revision) changes
    const again = JSON.parse(JSON.stringify(files));
    again.nodes.nodes[1].parameters.text = 'edited twice';
    expect(() => store.writeComponent('Card', again, { ifRevision: stored.revision })).toThrow(/Revision mismatch/);
  });

  it("OWN-001 slice 2 — the revision, the no-change rule and the drift rule are the format package's", () => {
    // The MCP's store is the format's store with this door's words on top: the same token for the
    // same files, written through `@nodegx/project-contract/format` over the folder on disk.
    const stored = store.readComponent('Card');
    expect(stored.revision).toBe(componentRevision(stored.files));
    expect(computeRevision).toBe(componentRevision);
    expect(store.format).toBeInstanceOf(V2ProjectStore);
    // A write through the package's store directly is a change this store did not read: refused, in this door's words.
    const other = new V2ProjectStore(diskFiles(dir));
    const theirs = other.readComponent('Card');
    other.writeComponent('Card', {
      ...theirs.files,
      nodes: { ...theirs.files.nodes, nodes: [...theirs.files.nodes.nodes] }
    });
    // (same content: no file written, so no drift yet)
    expect(() => store.writeComponent('Card', stored.files, {})).not.toThrow();
    const edited = JSON.parse(JSON.stringify(theirs.files));
    edited.nodes.nodes[1].parameters.text = 'written by the package';
    other.writeComponent('Card', edited, { ifRevision: other.readComponent('Card').revision });
    let caught: unknown;
    try {
      store.writeComponent('Card', stored.files, {});
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ToolError);
    expect((caught as ToolError).code).toBe('conflict');
    expect((caught as ToolError).message).toMatch(/changed on disk since this server last read it .*get_component/);
    expect((caught as ToolError).data).toEqual({ component: 'Card' });
  });

  it('P112-S2-NEWLINE — rewriting a file that ends with a newline keeps the newline', () => {
    const nodesFile = path.join(dir, 'components', 'Card', 'nodes.json');
    fs.writeFileSync(nodesFile, fs.readFileSync(nodesFile, 'utf8').replace(/\n?$/, '\n'));
    const componentFile = path.join(dir, 'components', 'Card', 'component.json');
    fs.writeFileSync(componentFile, fs.readFileSync(componentFile, 'utf8').replace(/\n$/, ''));
    const stored = store.readComponent('Card');
    const files = JSON.parse(JSON.stringify(stored.files));
    files.nodes.nodes[1].parameters.text = 'edited';
    store.writeComponent('Card', files, { ifRevision: stored.revision });
    expect(fs.readFileSync(nodesFile, 'utf8').endsWith('}\n')).toBe(true);
    // A file that never had one does not gain one.
    expect(fs.readFileSync(componentFile, 'utf8').endsWith('\n')).toBe(false);
  });

  it('deletes only the component files, not nested component dirs', () => {
    // Create a nested component under Pages/ then delete a hypothetical parent-level component.
    const stored = store.readComponent('Pages/Home');
    expect(stored.key).toBe('Pages/Home');
    store.deleteComponent('Pages/Home');
    expect(fs.existsSync(path.join(dir, 'components', 'Pages', 'Home', 'nodes.json'))).toBe(false);
    const registry = readJson<RegistryV2File>(dir, 'components/_registry.json');
    expect(registry.components['Pages/Home']).toBeUndefined();
    expect(registry.stats?.totalComponents).toBe(2);
  });
});
