/**
 * P109 ISL-019 — the same plan writes the same bytes.
 *
 * Ruled 2026-10-02, "Keep the same id": a component rebuilt in the same place keeps its id, in
 * every session; and (ruling 1, taken as the engineering default) whoever starts the server can
 * ask for reproducible output — the epoch for every stamp, a namespace for every id.
 *
 * Every case applies ONE small plan (a section, a page that the door registers in the router,
 * and an update) to two fresh copies of the same fixture, through the in-process door, and
 * diffs the two trees field by field. The diff is the instrument, so it has a known-firing
 * control: on the wall clock, the stamps differ (the diff can see a difference), and the node
 * ids never do (the diff does not report "everything").
 *
 * @module noodl-mcp/tests/isl019SameBytes
 */
import * as fs from 'fs';
import * as path from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import type { ProjectStore } from '../src/project/ProjectStore';
import { parseReproducibleFlag, stableComponentId, type ReproducibleOutput } from '../src/project/writeClock';
import { createServer } from '../src/server';
import type { UpdateComponentResponse } from '../src/tools/responses';
import { call, copyFixture, type TestSession } from './helpers';

const EPOCH = '2026-09-27T00:00:00.000Z';
const REPRODUCIBLE: ReproducibleOutput = { namespace: 'isl019', epoch: EPOCH };

async function open(
  projectDir: string,
  reproducible?: ReproducibleOutput
): Promise<TestSession & { store: ProjectStore }> {
  const { server, binding } = createServer({
    projectDir,
    allowWrites: true,
    ...(reproducible ? { reproducible } : {})
  });
  const store = binding.require();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'isl019', version: '0.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return {
    client,
    store,
    projectDir,
    close: async () => {
      await client.close();
      await server.close();
    }
  };
}

async function must<T>(session: TestSession, tool: string, args: Record<string, unknown>): Promise<T> {
  const res = await call<T>(session, tool, args);
  if (res.isError) throw new Error(`${tool} refused: ${JSON.stringify(res.data)}`);
  return res.data;
}

const BADGE = [
  { id: 'badge-root', type: 'Group' },
  { id: 'badge-label', type: 'Text', parent: 'badge-root', parameters: { text: 'New' } }
];
const ABOUT = [
  { id: 'about-page', type: 'Page' },
  { id: 'about-title', type: 'Text', parent: 'about-page', parameters: { text: 'About us' } }
];

/** The plan: a section, a page (registered in the router — a write to App), and an update. */
async function applyPlan(projectDir: string, reproducible?: ReproducibleOutput): Promise<void> {
  const session = await open(projectDir, reproducible);
  try {
    await must(session, 'create_component', { path: 'Sections/Badge', nodes: BADGE });
    await must(session, 'create_component', { path: 'Pages/About', nodes: ABOUT });
    await must(session, 'update_component', {
      path: 'Sections/Badge',
      operations: [{ op: 'update_node', id: 'badge-label', parameters: { text: 'Fresh' } }]
    });
  } finally {
    await session.close();
  }
}

function filesUnder(root: string, dir = root): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? filesUnder(root, path.join(dir, e.name)) : [path.relative(root, path.join(dir, e.name))]
    )
    .sort();
}

/** Every differing leaf, as `file → dotted.path`. */
function diffTrees(a: string, b: string): string[] {
  const out: string[] = [];
  const files = new Set([...filesUnder(a), ...filesUnder(b)]);
  const walk = (file: string, x: unknown, y: unknown, at: string) => {
    if (x && y && typeof x === 'object' && typeof y === 'object') {
      for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
        walk(file, (x as Record<string, unknown>)[k], (y as Record<string, unknown>)[k], at ? `${at}.${k}` : k);
      }
    } else if (JSON.stringify(x) !== JSON.stringify(y)) out.push(`${file} → ${at}`);
  };
  for (const file of files) {
    const pa = path.join(a, file);
    const pb = path.join(b, file);
    if (!fs.existsSync(pa) || !fs.existsSync(pb)) {
      out.push(`${file} → (only in one tree)`);
      continue;
    }
    const ra = fs.readFileSync(pa, 'utf8');
    const rb = fs.readFileSync(pb, 'utf8');
    if (ra === rb) continue;
    if (file.endsWith('.json')) walk(file, JSON.parse(ra), JSON.parse(rb), '');
    else out.push(`${file} → (bytes)`);
  }
  return out;
}

const read = (dir: string, rel: string) => JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8'));
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const STAMP = /(^|\.)(created|modified|lastUpdated)$/;

describe('ISL-019 — an ordinary session: ids derived, stamps on the wall clock', () => {
  it('two runs of one plan differ in timestamps only — never in an id', async () => {
    const a = copyFixture();
    const b = copyFixture();
    await applyPlan(a);
    await pause(5); // so no stamp of run B can equal one of run A
    await applyPlan(b);

    const diff = diffTrees(a, b);
    // Known-firing control: the instrument sees the wall clock.
    expect(diff).toContain('components/Sections/Badge/component.json → modified');
    expect(diff).toContain('components/App/component.json → modified'); // the router write
    // Ruling 2: no id differs — not the component's, not the two sidecars' copies of it.
    expect(diff.filter((d) => !STAMP.test(d.split(' → ')[1]))).toEqual([]);
    // Known-firing control the other way: node ids never differed, before this task or after.
    expect(read(a, 'components/Pages/About/nodes.json').nodes.map((n: { id: string }) => n.id)).toEqual([
      'about-page',
      'about-title'
    ]);
  });

  it('the id is the project id and the path, so a component deleted and recreated gets its old id back', async () => {
    const dir = copyFixture();
    const session = await open(dir);
    try {
      await must(session, 'create_component', { path: 'Sections/Badge', nodes: BADGE });
      const first = read(dir, 'components/Sections/Badge/component.json').id;
      expect(first).toBe(stableComponentId('demo-app-0001', '/Sections/Badge'));
      expect(read(dir, 'components/Sections/Badge/nodes.json').componentId).toBe(first);
      expect(read(dir, 'components/Sections/Badge/connections.json').componentId).toBe(first);

      await must(session, 'delete_component', { path: 'Sections/Badge' });
      await must(session, 'create_component', { path: 'Sections/Badge', nodes: BADGE });
      expect(read(dir, 'components/Sections/Badge/component.json').id).toBe(first);
    } finally {
      await session.close();
    }
  });

  it('an update that changes nothing writes nothing — not the component, not the registry', async () => {
    const dir = copyFixture();
    const session = await open(dir);
    try {
      await must(session, 'create_component', { path: 'Sections/Badge', nodes: BADGE });
      const files = ['component.json', 'nodes.json', 'connections.json'].map((f) =>
        path.join(dir, 'components/Sections/Badge', f)
      );
      const registry = path.join(dir, 'components/_registry.json');
      const before = [...files, registry].map((f) => [fs.readFileSync(f, 'utf8'), fs.statSync(f).mtimeMs] as const);
      await pause(5);

      // The rebuild an agent does: read the component, send its whole graph back.
      const got = await must<{ nodes: unknown[]; connections: unknown[] }>(session, 'get_component', {
        path: 'Sections/Badge'
      });
      const same = await must<UpdateComponentResponse>(session, 'update_component', {
        path: 'Sections/Badge',
        set: { nodes: got.nodes, connections: got.connections }
      });
      expect(same.unchanged).toBe(true);
      const after = [...files, registry].map((f) => [fs.readFileSync(f, 'utf8'), fs.statSync(f).mtimeMs] as const);
      expect(after).toEqual(before);

      // Control: a real change is still written, and is not called unchanged.
      const changed = await must<UpdateComponentResponse>(session, 'update_component', {
        path: 'Sections/Badge',
        operations: [{ op: 'update_node', id: 'badge-label', parameters: { text: 'Fresh' } }]
      });
      expect(changed.unchanged).toBeUndefined();
      expect(fs.readFileSync(files[1], 'utf8')).toContain('Fresh');
      expect(read(dir, 'components/Sections/Badge/component.json').modified).not.toBe(
        JSON.parse(before[0][0]).modified
      );
    } finally {
      await session.close();
    }
  });
});

describe('ISL-019 — a reproducible server: the same plan, the same bytes', () => {
  it('AC2: two runs leave byte-identical trees', async () => {
    const a = copyFixture();
    const b = copyFixture();
    await applyPlan(a, REPRODUCIBLE);
    await pause(5);
    await applyPlan(b, REPRODUCIBLE);
    expect(diffTrees(a, b)).toEqual([]);

    // And the bytes are the pins' bytes: the template generators' formula and epoch.
    const badge = read(a, 'components/Sections/Badge/component.json');
    expect(badge.id).toBe(stableComponentId('isl019', '/Sections/Badge'));
    expect([badge.created, badge.modified]).toEqual([EPOCH, EPOCH]);
    const registry = read(a, 'components/_registry.json');
    expect(registry.lastUpdated).toBe(EPOCH);
    expect([registry.components['Pages/About'].created, registry.components['Pages/About'].modified]).toEqual([
      EPOCH,
      EPOCH
    ]);
    expect(read(a, 'components/App/component.json').modified).toBe(EPOCH); // the router write
  });

  it('AC4: update keeps the id and `created`, sets `modified` to the epoch', async () => {
    const dir = copyFixture();
    const session = await open(dir, REPRODUCIBLE);
    try {
      await must(session, 'create_component', { path: 'Sections/Badge', nodes: BADGE });
      const before = read(dir, 'components/Sections/Badge/component.json');
      await must(session, 'update_component', {
        path: 'Sections/Badge',
        operations: [{ op: 'update_node', id: 'badge-label', parameters: { text: 'Fresh' } }]
      });
      const after = read(dir, 'components/Sections/Badge/component.json');
      expect(after).toMatchObject({ id: before.id, created: before.created, modified: EPOCH });
      expect(read(dir, 'components/Sections/Badge/nodes.json').nodes[1].parameters.text).toBe('Fresh');
    } finally {
      await session.close();
    }
  });

  it('project settings take the epoch too', async () => {
    const dir = copyFixture();
    const session = await open(dir, REPRODUCIBLE);
    try {
      expect(session.store.writeProjectSettings({ bodyScroll: true })).toEqual(['bodyScroll']);
      expect(read(dir, 'nodegx.project.json').modified).toBe(EPOCH);
    } finally {
      await session.close();
    }
  });
});

describe('ISL-019 — `--reproducible <namespace>@<epoch>`', () => {
  it('parses a namespace and a full ISO epoch', () => {
    expect(parseReproducibleFlag(`cg003@${EPOCH}`)).toEqual({ namespace: 'cg003', epoch: EPOCH });
  });
  it.each(['cg003', `@${EPOCH}`, 'cg003@2026-09-27', 'cg003@yesterday', ''])('refuses %p by name', (value) => {
    expect(() => parseReproducibleFlag(value)).toThrow(/--reproducible expects <namespace>@<epoch>/);
  });
});
