/**
 * P125 CCN-002 — the hold everywhere.
 *
 * The person's hold is a file (`.nodegx-hold.json`, `src/hold.ts`). These cases grade the facts the rest of the kit
 * now carries about it: `session_status` reports it to a model that joins late, a hold left on for days says so, and
 * after it is released `what_changed_since` says what the person did in Studio meanwhile — in the graph's words.
 *
 * The person's Studio edit is played by writing the component's files on disk, exactly as Studio's store does
 * (`modifiedBy: 'nodegx-studio'`). Each "changed" assertion has an "unchanged" control beside it: a component read and
 * left alone must not be reported, or the tool would be listing everything it read.
 *
 * @module noodl-mcp/tests/ccn002HoldEverywhere
 */
import * as fs from 'fs';
import * as path from 'path';

import { HOLD_FILE, readHold } from '../src/hold';
import { call, connect, copyFixture, readJson, reveal, type TestSession } from './helpers';

interface Changed {
  changed: Array<{
    component: string;
    lastWrittenBy?: string;
    nodesAdded: string[];
    nodesRemoved: string[];
    nodesEdited: Array<{ node: string; id: string; settings: string[]; moved?: true }>;
    wiresAdded: string[];
    wiresRemoved: string[];
  }>;
  deleted: string[];
  added: string[];
  unchanged: number;
  note: string;
}

const HOME = 'components/Pages/Home';

type Refusal = { error: { code: string; message: string } };

function hold(projectDir: string, at: string, note?: string): void {
  fs.writeFileSync(path.join(projectDir, HOLD_FILE), JSON.stringify({ by: 'nodegx-studio', at, ...(note ? { note } : {}) }));
}

/** The person's edit in Studio: the title's text, a node added and wired, the button moved. */
function studioEdit(projectDir: string): void {
  const nodesFile = path.join(projectDir, HOME, 'nodes.json');
  const nodes = readJson<{ nodes: Array<Record<string, unknown>> }>(projectDir, `${HOME}/nodes.json`);
  const title = nodes.nodes.find((n) => n.id === 'title')!;
  title.parameters = { text: 'Hello, world' };
  const btn = nodes.nodes.find((n) => n.id === 'btn')!;
  btn.x = 400;
  nodes.nodes.push({ id: 'toast', type: 'Text', label: 'Toast', parent: 'layout', parameters: { text: 'Saved' } });
  fs.writeFileSync(nodesFile, JSON.stringify(nodes, null, 2));

  const wires = readJson<{ connections: unknown[] }>(projectDir, `${HOME}/connections.json`);
  wires.connections.push({ fromId: 'btn', fromProperty: 'onClick', toId: 'toast', toProperty: 'show' });
  fs.writeFileSync(path.join(projectDir, HOME, 'connections.json'), JSON.stringify(wires, null, 2));

  const component = readJson<Record<string, unknown>>(projectDir, `${HOME}/component.json`);
  fs.writeFileSync(
    path.join(projectDir, HOME, 'component.json'),
    JSON.stringify({ ...component, modified: new Date().toISOString(), modifiedBy: 'nodegx-studio' }, null, 2)
  );
}

describe('P125 CCN-002 — the hold everywhere', () => {
  let session: TestSession;
  let dir: string;

  beforeEach(async () => {
    dir = copyFixture();
    session = await connect(dir);
    await reveal(session, 'project');
  });

  afterEach(async () => {
    await session.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('session_status reports the hold to a model that joins late, and a hold is still a hold for every other tool', async () => {
    const before = await call<{ hold?: unknown }>(session, 'session_status');
    expect(before.data.hold).toBeUndefined();

    hold(dir, new Date().toISOString(), 'let me fix the colours');
    const status = await call<{ hold?: { held: boolean; note?: string }; note: string }>(session, 'session_status');
    expect(status.isError).toBe(false);
    expect(status.data.hold).toMatchObject({ held: true, note: 'let me fix the colours' });
    expect(status.data.note).toContain('HOLD');

    const info = await call<Refusal>(session, 'get_project_info');
    expect(info.isError).toBe(true);
    expect(info.data.error.code).toBe('held');
    expect(info.data.error.message).toContain('what_changed_since');
  });

  it('a hold left on for days says how old it is; a fresh one does not', () => {
    hold(dir, new Date(Date.now() - 3 * 24 * 3_600_000).toISOString());
    expect(readHold(dir).ageHours).toBeGreaterThanOrEqual(72);

    hold(dir, new Date().toISOString());
    expect(readHold(dir).ageHours).toBe(0);
  });

  it('the held refusal names an old hold as old', async () => {
    hold(dir, new Date(Date.now() - 2 * 24 * 3_600_000).toISOString());
    const refused = await call<Refusal>(session, 'list_components');
    expect(refused.isError).toBe(true);
    expect(refused.data.error.message).toContain('on for 2 days');

    hold(dir, new Date().toISOString());
    const fresh = await call<Refusal>(session, 'list_components');
    expect(fresh.data.error.message).not.toContain('on for');
  });

  it('what_changed_since: after the hold, what the person did in Studio, in the graph’s words', async () => {
    expect((await call(session, 'get_component', { path: 'Pages/Home' })).isError).toBe(false);
    expect((await call(session, 'get_component', { path: 'Card' })).isError).toBe(false);

    hold(dir, new Date().toISOString());
    studioEdit(dir);
    fs.unlinkSync(path.join(dir, HOLD_FILE));

    const res = await call<Changed>(session, 'what_changed_since');
    expect(res.isError).toBe(false);
    // The control: Card was read and left alone.
    expect(res.data.unchanged).toBe(1);
    expect(res.data.changed.map((c) => c.component)).toEqual(['Pages/Home']);

    const home = res.data.changed[0];
    expect(home.lastWrittenBy).toBe('nodegx-studio');
    expect(home.nodesAdded).toEqual(['Toast (Text) [toast]']);
    expect(home.nodesRemoved).toEqual([]);
    const title = home.nodesEdited.find((e) => e.id === 'title');
    expect(title?.settings).toEqual(['parameters.text: "Welcome home" → "Hello, world"']);
    expect(home.nodesEdited.find((e) => e.id === 'btn')).toMatchObject({ moved: true, settings: [] });
    expect(home.wiresAdded).toEqual(['Go Button (net.noodl.controls.button).onClick → Toast (Text).show']);
    expect(home.wiresRemoved).toEqual([]);
  });

  // 🔴 Measured while building: update_component re-reads before it applies, so without if_revision the write lands
  // on the person's edit (kept, not refused). With the revision from the read before their edit, it is refused.
  it('after a Studio edit, a write with the revision read before it is refused; without one it builds on their edit', async () => {
    const read = await call<{ revision: string }>(session, 'get_component', { path: 'Pages/Home' });
    studioEdit(dir);
    await call(session, 'what_changed_since');
    const stale = await call<Refusal>(session, 'update_component', {
      path: 'Pages/Home',
      if_revision: read.data.revision,
      operations: [{ op: 'update_node', id: 'title', parameters: { text: 'Over the top' } }]
    });
    expect(stale.isError).toBe(true);
    expect(stale.data.error.code).toBe('conflict');

    const onTop = await call(session, 'update_component', {
      path: 'Pages/Home',
      operations: [{ op: 'update_node', id: 'btn', parameters: { label: 'Go now' } }]
    });
    expect(onTop.isError).toBe(false);
    const nodes = readJson<{ nodes: Array<{ id: string; parameters?: Record<string, unknown> }> }>(dir, `${HOME}/nodes.json`).nodes;
    expect(nodes.find((n) => n.id === 'toast')).toBeDefined();
    expect(nodes.find((n) => n.id === 'title')?.parameters?.text).toBe('Hello, world');
  });

  it('a component the agent wrote is its own baseline, not a change; one deleted or added in Studio is named', async () => {
    const res0 = await call<Changed>(session, 'what_changed_since');
    expect(res0.data.note).toContain('not read any component');

    // The agent's own write is the new baseline: read, write, and nothing is reported.
    await call(session, 'get_component', { path: 'Pages/Home' });
    const wrote = await call(session, 'update_component', {
      path: 'Pages/Home',
      operations: [{ op: 'update_node', id: 'title', parameters: { text: 'Written by the agent' } }]
    });
    expect(wrote.isError).toBe(false);
    const afterWrite = await call<Changed>(session, 'what_changed_since');
    // (the write also reads what it registers against, so more than one component counts as read)
    expect(afterWrite.data.changed).toEqual([]);
    expect(afterWrite.data.unchanged).toBeGreaterThanOrEqual(1);

    // A component the agent CREATED was never read; it is the agent's, so it is not "added" by the person.
    const created = await call(session, 'create_component', {
      path: 'Sections/Badge',
      nodes: [{ id: 'badge', type: 'Text', label: 'Badge', parameters: { text: 'New' } }]
    });
    expect(created.isError).toBe(false);
    const afterCreate = await call<Changed>(session, 'what_changed_since');
    expect(afterCreate.data.added).toEqual([]);
    expect(afterCreate.data.changed).toEqual([]);

    await call(session, 'get_component', { path: 'Card' });
    fs.rmSync(path.join(dir, 'components/Card'), { recursive: true });
    const registry = readJson<{ components: Record<string, unknown> }>(dir, 'components/_registry.json');
    delete registry.components.Card;
    registry.components['Pages/About'] = { path: 'Pages/About', type: 'page', nodeCount: 0, connectionCount: 0 };
    fs.writeFileSync(path.join(dir, 'components/_registry.json'), JSON.stringify(registry, null, 2));

    const res = await call<Changed>(session, 'what_changed_since');
    expect(res.data.deleted).toEqual(['Card']);
    expect(res.data.added).toEqual(['Pages/About']);
  });
});
