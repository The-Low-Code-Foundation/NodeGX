/**
 * P112 OWN-001 — the v2 format out of the editor: the schemas validate the templates, a project held
 * in memory round-trips byte for byte, and the store refuses a write after a change it did not read,
 * in memory exactly as on disk.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  FormatRefusal,
  SCHEMA_IDS,
  SchemaValidator,
  V2ProjectStore,
  memoryFiles,
  serializeV2File,
  type ComponentFiles,
  type ProjectFiles
} from '../format';
import { diskFiles } from '../format-node';

const TEMPLATES = path.resolve(__dirname, '../../../templates');

/** Every file of a template folder as project-relative path → text. */
function readTree(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) walk(abs);
      else out[path.relative(root, abs).split(path.sep).join('/')] = fs.readFileSync(abs, 'utf8');
    }
  };
  walk(root);
  return out;
}

function withNode(files: ComponentFiles, label: string): ComponentFiles {
  const copy = JSON.parse(JSON.stringify(files)) as ComponentFiles;
  copy.nodes.nodes.push({ id: `own001-${label}`, type: 'Group', label } as ComponentFiles['nodes']['nodes'][number]);
  return copy;
}

describe('the schemas, from the package', () => {
  test.each(['todo-list', 'planning'])('every file of templates/%s validates', (template) => {
    const tree = readTree(path.join(TEMPLATES, template));
    const v = SchemaValidator.instance;
    const failures: string[] = [];
    const check = (file: string, id: (typeof SCHEMA_IDS)[keyof typeof SCHEMA_IDS]) => {
      const r = v.validate(id, JSON.parse(tree[file]));
      if (!r.valid) failures.push(`${file}: ${r.errors[0].path} ${r.errors[0].message}`);
    };
    check('nodegx.project.json', SCHEMA_IDS.PROJECT);
    check('components/_registry.json', SCHEMA_IDS.REGISTRY);
    const registry = JSON.parse(tree['components/_registry.json']);
    for (const entry of Object.values<{ path: string }>(registry.components)) {
      check(`components/${entry.path}/component.json`, SCHEMA_IDS.COMPONENT);
      check(`components/${entry.path}/nodes.json`, SCHEMA_IDS.NODES);
      check(`components/${entry.path}/connections.json`, SCHEMA_IDS.CONNECTIONS);
    }
    expect(failures).toEqual([]);
    expect(Object.keys(registry.components).length).toBeGreaterThan(50);
  });
});

describe('AC2 — a project in memory round-trips byte for byte', () => {
  const tree = readTree(path.join(TEMPLATES, 'todo-list'));
  const jsonFiles = Object.keys(tree).filter((p) => p.endsWith('.json'));

  test('serializing a parsed file gives back its text, final newline included, for every JSON file', () => {
    const differ = jsonFiles.filter((p) => serializeV2File(JSON.parse(tree[p]), tree[p]) !== tree[p]);
    expect(differ).toEqual([]);
    expect(jsonFiles.length).toBeGreaterThan(200);
  });

  test('a new file is written as the official writers write it: two-space JSON, no final newline', () => {
    expect(serializeV2File({ a: 1 })).toBe('{\n  "a": 1\n}');
    expect(serializeV2File({ a: 1 }, null)).toBe('{\n  "a": 1\n}');
  });

  test('reading every component and writing it back unchanged leaves every file as it was', () => {
    const files = memoryFiles(tree);
    const store = new V2ProjectStore(files, { now: () => '2026-10-09T00:00:00.000Z' });
    const keys = store.componentKeys();
    expect(keys.length).toBe(80);
    for (const key of keys) {
      const c = store.readComponent(key);
      expect(store.writeComponent(key, c.files, { ifRevision: c.revision })).toEqual({ revision: c.revision, unchanged: true });
    }
    expect(files.entries()).toEqual(tree);
  });

  test('a changed component writes its files with the final newline kept and the registry counts true', () => {
    const files = memoryFiles(tree);
    const store = new V2ProjectStore(files, { now: () => '2026-10-09T00:00:00.000Z' });
    const key = store.componentKeys()[0];
    const before = store.readComponent(key);
    store.writeComponent(key, withNode(before.files, 'a'), { ifRevision: before.revision });
    const nodesPath = `components/${before.entry.path}/nodes.json`;
    expect(files.read(nodesPath)!.endsWith('}\n')).toBe(true);
    const registry = store.readRegistry();
    expect(registry.components[key].nodeCount).toBe(before.files.nodes.nodes.length + 1);
    expect(registry.stats!.totalNodes).toBe(
      Object.values(registry.components).reduce((n, e) => n + (e.nodeCount ?? 0), 0)
    );
    expect(registry.lastUpdated).toBe('2026-10-09T00:00:00.000Z');
  });
});

/** The same two-writer sequence on any backend: what is refused, and with which code. */
function twoWriters(files: ProjectFiles): { secondWrite: string; staleRevision: string; afterReread: string } {
  const a = new V2ProjectStore(files);
  const b = new V2ProjectStore(files);
  const key = a.componentKeys()[0];
  const readByA = a.readComponent(key);
  const readByB = b.readComponent(key);
  b.writeComponent(key, withNode(readByB.files, 'b'), { ifRevision: readByB.revision });
  const outcome = (fn: () => unknown) => {
    try {
      fn();
      return 'written';
    } catch (err) {
      return err instanceof FormatRefusal ? err.code : String(err);
    }
  };
  const secondWrite = outcome(() => a.writeComponent(key, withNode(readByA.files, 'a')));
  // A third store that never read, passing A's stale revision: refused by the revision rule alone.
  const staleRevision = outcome(() =>
    new V2ProjectStore(files).writeComponent(key, withNode(readByA.files, 'c'), { ifRevision: readByA.revision })
  );
  const fresh = a.readComponent(key);
  const afterReread = outcome(() => a.writeComponent(key, withNode(fresh.files, 'a'), { ifRevision: fresh.revision }));
  return { secondWrite, staleRevision, afterReread };
}

describe('AC3 — a write after a change the writer did not read is refused', () => {
  const tree = readTree(path.join(TEMPLATES, 'todo-list'));
  const expected = { secondWrite: 'conflict', staleRevision: 'conflict', afterReread: 'written' };

  test('in memory', () => {
    expect(twoWriters(memoryFiles(tree))).toEqual(expected);
  });

  test('on disk, the same outcome', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'own001-'));
    try {
      for (const [p, text] of Object.entries(tree)) {
        const abs = path.join(dir, p);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, text);
      }
      expect(twoWriters(diskFiles(dir))).toEqual(expected);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('creating over an existing component, or updating a missing one, is refused', () => {
    const store = new V2ProjectStore(memoryFiles(tree));
    const key = store.componentKeys()[0];
    const c = store.readComponent(key);
    expect(() => store.writeComponent(key, c.files, { expectNew: true })).toThrow(
      expect.objectContaining({ code: 'already-exists' })
    );
    expect(() => store.writeComponent('Nope/Missing', c.files)).toThrow(expect.objectContaining({ code: 'not-found' }));
  });

  test('a folder that is not a v2 project is refused at the door', () => {
    expect(() => new V2ProjectStore(memoryFiles({ 'project.json': '{}' }))).toThrow(
      expect.objectContaining({ code: 'not-a-v2-project' })
    );
  });

  test('delete removes the three files and the registry entry', () => {
    const files = memoryFiles(tree);
    const store = new V2ProjectStore(files);
    const key = store.componentKeys()[0];
    const { entry } = store.readComponent(key);
    expect(store.deleteComponent(key).removed).toHaveLength(3);
    expect(files.read(`components/${entry.path}/nodes.json`)).toBeNull();
    expect(store.readRegistry().components[key]).toBeUndefined();
    expect(store.readRegistry().stats!.totalComponents).toBe(79);
  });
});
