/**
 * P112 OWN-026 FIX-04 — the same app for less writing, reading and retrying.
 *
 * Measured on t2-nodegx-c01…c03 (DeepSeek V4.1 Flash in Cline, kit FIX-03): wires were 41% of the characters written
 * as graph operations (A); 19 notes that a check did not run were 12k of a 13.5k write answer, sent back on every
 * write (D); and 11 of 26 refused calls were `get_node_type` argument spellings (C). Each block below holds one of
 * those to its measured shape.
 */
import { normalizeArguments } from '../src/tools/argumentAliases';
import type { ToolErrorPayload } from '../src/tools/responses';
import { formatWire, parseWire } from '../src/wireText';
import { call, connect, copyFixture, readJson, TestSession } from './helpers';

type Connections = { connections: Array<{ fromId: string; fromProperty: string; toId: string; toProperty: string }> };
type Answer = {
  ok?: boolean;
  created?: string;
  updated?: string;
  validation?: { summary: { infos: number }; diagnostics?: Array<{ code: string; message: string; count?: number }> };
  error?: { code: string; message: string };
};

// Node ids are unique across a project, and the fixture's own components use the short ones: each graph here
// carries a prefix, so nothing is reallocated under the comparison.
const nodes = (p: string) => [
  { id: `${p}root`, type: 'Group' },
  { id: `${p}title`, type: 'Text', parent: `${p}root`, parameters: { text: 'T' } },
  { id: `${p}sum`, type: 'Expression', parameters: { expression: '1 + 1' } },
  { id: `${p}twice`, type: 'Expression', parameters: { expression: 'a * 2' } }
];
const objects = (p: string) => [
  { fromId: `${p}sum`, fromProperty: 'result', toId: `${p}twice`, toProperty: 'a' },
  { fromId: `${p}twice`, fromProperty: 'result', toId: `${p}title`, toProperty: 'text' }
];
const lines = (p: string) => [`${p}sum.result -> ${p}twice.a`, `${p}twice.result → ${p}title.text`];
const OBJECTS = objects('');

describe('A — parseWire reads the line read_graph prints', () => {
  it('reads both arrows, and gives back what formatWire wrote', () => {
    expect(parseWire('a.click -> b.run')).toEqual({ fromId: 'a', fromProperty: 'click', toId: 'b', toProperty: 'run' });
    expect(parseWire('  a.click→b.run ')).toEqual({ fromId: 'a', fromProperty: 'click', toId: 'b', toProperty: 'run' });
    for (const c of OBJECTS) expect(parseWire(formatWire(c))).toEqual(c);
  });

  it('splits each end at its first dot: a dotted catalog port, a port name with spaces', () => {
    expect(parseWire('btn.onClick -> list.scrollToIndex.do')).toMatchObject({ toId: 'list', toProperty: 'scrollToIndex.do' });
    expect(parseWire('inputs.Racer One -> label.text')).toMatchObject({ fromId: 'inputs', fromProperty: 'Racer One' });
  });

  it('is not a wire without a dot on each side, or with two arrows', () => {
    for (const bad of ['a -> b.run', 'a.click -> b', 'a.click b.run', 'a.x -> b.y -> c.z', 'my node.x -> b.y', '.x -> b.y']) {
      expect({ bad, wire: parseWire(bad) }).toEqual({ bad, wire: undefined });
    }
  });
});

describe('A — a wire written as a line is the same wire on disk', () => {
  let session: TestSession;
  let dir: string;
  beforeEach(async () => {
    dir = copyFixture();
    session = await connect(dir);
  });
  afterEach(async () => {
    await session.close();
  });

  const wiresOf = (path: string) => readJson<Connections>(dir, `components/${path}/connections.json`).connections;

  it('create_component: lines and objects write identical connections', async () => {
    const asObjects = await call<Answer>(session, 'create_component', { path: 'Components/Objects', nodes: nodes('o-'), connections: objects('o-') });
    const asLines = await call<Answer>(session, 'create_component', { path: 'Components/Lines', nodes: nodes('l-'), connections: lines('l-') });
    expect([asObjects.isError, asLines.isError]).toEqual([false, false]);
    const strip = (cs: Connections['connections']) => cs.map((c) => ({ ...c, fromId: c.fromId.slice(2), toId: c.toId.slice(2) }));
    expect(strip(wiresOf('Components/Lines'))).toEqual(strip(wiresOf('Components/Objects')));
    expect(wiresOf('Components/Objects')).toEqual(objects('o-'));
  });

  it('update_component: a bare line in operations adds the wire; remove_connection takes a line', async () => {
    await call<Answer>(session, 'create_component', { path: 'Components/W', nodes: nodes('w-') });
    const added = await call<Answer>(session, 'update_component', { path: 'Components/W', operations: lines('w-') });
    expect(added.isError).toBe(false);
    expect(wiresOf('Components/W')).toEqual(objects('w-'));

    const removed = await call<Answer>(session, 'update_component', {
      path: 'Components/W',
      operations: [{ op: 'remove_connection', connection: 'w-twice.result -> w-title.text' }]
    });
    expect(removed.isError).toBe(false);
    expect(wiresOf('Components/W')).toEqual([objects('w-')[0]]);
  });

  it('update_component: set.connections takes lines', async () => {
    await call<Answer>(session, 'create_component', { path: 'Components/S', nodes: nodes('s-'), connections: objects('s-') });
    const res = await call<Answer>(session, 'update_component', { path: 'Components/S', set: { nodes: nodes('s-'), connections: [lines('s-')[1]] } });
    expect(res.isError).toBe(false);
    expect(wiresOf('Components/S')).toEqual([objects('s-')[1]]);
  });

  it('a line that is not a wire is refused in its own words, and nothing is written', async () => {
    const res = await call<ToolErrorPayload & { raw?: string }>(session, 'call_tool', {
      name: 'create_component',
      arguments: { path: 'Components/Bad', nodes: nodes('b-'), connections: ['b-sum result -> b-twice a'] }
    });
    expect(res.data.error.message).toContain('is not a wire: write');
    expect(() => readJson(dir, 'components/Components/Bad/nodes.json')).toThrow();
  });

  it('the validator still judges a line: a port that does not exist is refused', async () => {
    const res = await call<ToolErrorPayload>(session, 'create_component', {
      path: 'Components/Wrong',
      nodes: nodes('x-'),
      connections: ['x-sum.nope -> x-twice.a']
    });
    expect(res.isError).toBe(true);
    expect(JSON.stringify(res.data)).toContain('nope');
  });
});

describe('D — a write says once that some checks did not run', () => {
  let session: TestSession;
  beforeEach(async () => {
    session = await connect(copyFixture());
  });
  afterEach(async () => {
    await session.close();
  });

  const setters = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `set${i}`, type: 'Set Variable', parameters: { name: `V${i}`, value: `x${i}` } }));
  const skipNotes = (a: Answer) => (a.validation?.diagnostics ?? []).filter((d) => d.code === 'dynamic-port-skipped');

  it('three nodes, one line: the count, and each node with the parameter left unchecked', async () => {
    const res = await call<Answer>(session, 'create_component', { path: 'Components/Three', nodes: setters(3) });
    expect(res.isError).toBe(false);
    const notes = skipNotes(res.data);
    expect(notes).toHaveLength(1);
    expect(notes[0].count).toBe(3);
    expect(notes[0].message).toContain('Set Variable: set0 "value", set1 "value", set2 "value"');
    // The summary still counts every note.
    expect(res.data.validation!.summary.infos).toBeGreaterThanOrEqual(3);
  });

  it('one node keeps the note as it was — the known-firing control', async () => {
    const res = await call<Answer>(session, 'create_component', { path: 'Components/One', nodes: setters(1) });
    const notes = skipNotes(res.data);
    expect(notes).toHaveLength(1);
    expect(notes[0].count).toBeUndefined();
    expect(notes[0].message).toMatch(/^Parameter "value" on Set Variable names no port/);
  });

  it('nineteen nodes, the measured page: the answer is a fraction of the notes it stands for', async () => {
    const res = await call<Answer>(session, 'create_component', { path: 'Components/Nineteen', nodes: setters(19) });
    const one = await call<Answer>(session, 'create_component', { path: 'Components/Single', nodes: setters(1).map((n) => ({ ...n, id: 'solo' })) });
    const each = JSON.stringify(skipNotes(one.data)[0]).length;
    expect(JSON.stringify(skipNotes(res.data)).length).toBeLessThan((19 * each) / 4);
  });
});

describe('C — a spelling whose meaning is not in doubt is the call it means', () => {
  let session: TestSession;
  beforeAll(async () => {
    session = await connect(copyFixture());
  });
  afterAll(async () => {
    await session.close();
  });

  type Types = { types: Array<{ typeName: string }>; notAnswered?: string[] };

  it.each([
    ['typeName', { typeName: 'Group' }],
    ['node_type', { node_type: 'Group' }],
    ['nodeType', { nodeType: 'Group' }],
    ['a string for the list', { type_names: 'Group' }],
    ['ports: true', { type_names: ['Group'], ports: true }],
    ['detail: "brief"', { type_names: ['Group'], detail: 'brief' }]
  ])('get_node_type takes %s, directly and through call_tool', async (_, args) => {
    const direct = await call<Types>(session, 'get_node_type', args);
    expect(direct.isError).toBe(false);
    expect(direct.data.types.map((t) => t.typeName)).toEqual(['Group']);
    const proxied = await call<Types & { ok?: boolean }>(session, 'call_tool', { name: 'get_node_type', arguments: args });
    expect(proxied.data.ok).toBeUndefined();
    expect(proxied.data.types.map((t) => t.typeName)).toEqual(['Group']);
  });

  it('a call that sends the right name AND an alias is still refused for the extra key', async () => {
    const res = await call<ToolErrorPayload>(session, 'get_node_type', { type_names: ['Group'], typeName: 'Text' });
    expect(res.isError).toBe(true);
    expect(res.data.error.message).toContain('"typeName"');
  });

  it('past eight names: the first eight answered, the rest named, not a refusal', async () => {
    const names = ['Group', 'Text', 'Expression', 'Counter', 'Boolean', 'String', 'Number', 'Variable2', 'Set Variable', 'Page'];
    const res = await call<Types>(session, 'get_node_type', { type_names: names });
    expect(res.isError).toBe(false);
    expect(res.data.types).toHaveLength(8);
    expect(res.data.notAnswered).toEqual(['Set Variable', 'Page']);
  });

  it('search_project takes query as text', async () => {
    const res = await call<{ ok?: boolean; matches: unknown[] }>(session, 'call_tool', {
      name: 'search_project',
      arguments: { query: 'zzz-nothing-has-this' }
    });
    expect(res.data.ok).toBeUndefined();
    expect(Array.isArray(res.data.matches)).toBe(true);
  });

  it("drive_page's wait_for takes text_contains as text (which already matches part of the page)", () => {
    expect(
      normalizeArguments('drive_page', { steps: [{ wait_for: { text_contains: 'Not quite' }, timeout_ms: 500 }, { tap: { text_contains: 'Go' } }] })
    ).toEqual({ steps: [{ wait_for: { text: 'Not quite' }, timeout_ms: 500 }, { tap: { text_contains: 'Go' } }] });
    const both = { steps: [{ wait_for: { text: 'a', text_contains: 'b' } }] };
    expect(normalizeArguments('drive_page', both)).toBe(both);
  });

  it('leaves every other tool, and arguments already right, as they were sent', () => {
    const args = { type_names: ['Group'] };
    expect(normalizeArguments('get_node_type', args)).toBe(args);
    const other = { typeName: 'x' };
    expect(normalizeArguments('list_node_types', other)).toBe(other);
  });
});
