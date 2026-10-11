/**
 * P107 NSP-020 R19 part 1 — `get_component` returns each node's ports as its spec draws them now (`drawnPorts`), beside
 * the saved nodes, which come back exactly as they are on disk.
 *
 * The saved `dynamicports` is the last list a running editor saved on the node; measured over Richard's projects it is out
 * of date on 1,027 of 4,228 nodes (NSP-020 §6.9). The drawn list comes from the node's spec over `portContextFor` — the
 * project's wires, schema and components — and only for `DRAWN_PORT_TYPES`.
 */
import * as fs from 'fs';
import * as path from 'path';

import { call, connect, copyFixture, type TestSession } from './helpers';
import type { GetComponentResponse } from '../src/tools/responses';

let session: TestSession;
let projectDir: string;

/** A stale saved list on the And: one input, from before the wire into `input 1` was made. */
const STALE = [{ name: 'input 0', plug: 'input', type: 'boolean', displayName: 'Input 0', group: 'Inputs' }];

beforeEach(async () => {
  projectDir = copyFixture();
  // the project's Parse-wire schema, as a project the editor has synced keeps it (`dbCollections` in the project metadata)
  const projectFile = path.join(projectDir, 'nodegx.project.json');
  const project = JSON.parse(fs.readFileSync(projectFile, 'utf8'));
  project.metadata = { ...(project.metadata ?? {}), dbCollections: [{ name: 'Lesson', columns: [{ name: 'title', type: 'String' }, { name: 'n', type: 'Number' }] }] };
  fs.writeFileSync(projectFile, JSON.stringify(project, null, 2));
  // NSP-021 s87 — a cloud function on disk, as ISL-042's test writes one: takes `score`, answers `grade` and `comment`
  const cloud = path.join(projectDir, 'components', '__cloud__', 'grade');
  fs.mkdirSync(cloud, { recursive: true });
  const write = (file: string, json: unknown) => fs.writeFileSync(path.join(cloud, file), JSON.stringify(json, null, 2));
  write('component.json', { $schema: 'https://opennoodl.dev/schemas/component-v2.json', id: 'c_grade', name: 'grade', path: '/#__cloud__/grade', type: 'cloud' });
  write('nodes.json', {
    $schema: 'https://opennoodl.dev/schemas/nodes-v2.json',
    componentId: 'c_grade',
    version: 1,
    nodes: [
      { id: 'req', type: 'noodl.cloud.request', parameters: { params: 'score' } },
      { id: 'res', type: 'noodl.cloud.response', parameters: { params: 'grade,comment' } }
    ]
  });
  write('connections.json', { $schema: 'https://opennoodl.dev/schemas/connections-v2.json', componentId: 'c_grade', version: 1, connections: [] });
  const registryFile = path.join(projectDir, 'components', '_registry.json');
  const registry = JSON.parse(fs.readFileSync(registryFile, 'utf8'));
  registry.components['__cloud__/grade'] = { path: '__cloud__/grade', type: 'cloud', nodeCount: 2, connectionCount: 0 };
  fs.writeFileSync(registryFile, JSON.stringify(registry, null, 2));
  session = await connect(projectDir);
  const res = await call(session, 'create_component', {
    path: 'Components/PortProbe',
    nodes: [
      { id: 'flag', type: 'Boolean' },
      { id: 'both', type: 'And' },
      { id: 'lesson', type: 'DbModel2', parameters: { collectionName: 'Lesson' } },
      { id: 'cloud', type: 'CloudFunction2', parameters: { function: 'grade' } },
      { id: 'http', type: 'net.noodl.HTTP' }
    ],
    connections: [{ fromId: 'flag', fromProperty: 'savedValue', toId: 'both', toProperty: 'input 1' }]
  });
  expect(res.isError).toBe(false);
  // the editor's last save, from before the wire: written on disk as a running editor would have left it
  const nodesFile = path.join(projectDir, 'components', 'Components', 'PortProbe', 'nodes.json');
  const nodes = JSON.parse(fs.readFileSync(nodesFile, 'utf8'));
  nodes.nodes.find((n: { id: string }) => n.id === 'both').dynamicports = STALE;
  fs.writeFileSync(nodesFile, JSON.stringify(nodes, null, 2));
});

afterEach(async () => {
  await session.close();
});

describe('NSP-020 R19 — get_component draws each node\'s ports from its spec', () => {
  it('draws And\'s numbered inputs from its wire — one spare past the highest wired — where the saved list has one', async () => {
    const { data } = await call<GetComponentResponse>(session, 'get_component', { path: 'Components/PortProbe' });
    expect(data.drawnPorts?.both?.map((p) => `${p.plug} ${p.name} ${p.type}`)).toEqual(['input input 0 boolean', 'input input 1 boolean', 'input input 2 boolean']);
    // the saved node comes back as it is on disk: a read-modify-write hands back what was read
    expect(data.nodes.find((n) => n.id === 'both')?.dynamicports).toEqual(STALE);
  });

  it('draws a Record\'s columns from the project\'s schema, typed', async () => {
    const { data } = await call<GetComponentResponse>(session, 'get_component', { path: 'Components/PortProbe' });
    const lesson = (data.drawnPorts?.lesson ?? []).map((p) => `${p.plug} ${p.name} ${p.type}`);
    expect(lesson).toEqual(expect.arrayContaining(['output prop-title string', 'output prop-n number', 'output changed-title signal']));
  });

  // NSP-021 s87 — a type an editor adapter draws (no runtime hook announces it), graded by oracle (c)
  it('draws a Navigate\'s Target from the Router\'s pages and a `pm-` input per parameter of the target page', async () => {
    const page = await call(session, 'create_component', {
      path: 'Pages/Detail',
      nodes: [
        { id: 'page', type: 'Page' },
        { id: 'in', type: 'PageInputs', parameters: { pathParams: 'id', queryParams: 'tab' } }
      ]
    });
    expect(page.isError).toBe(false);
    const nav = await call(session, 'create_component', {
      path: 'Components/GoDetail',
      nodes: [{ id: 'go', type: 'RouterNavigate', parameters: { target: '/Pages/Detail' } }]
    });
    expect(nav.isError).toBe(false);
    const { data } = await call<GetComponentResponse>(session, 'get_component', { path: 'Components/GoDetail' });
    const go = data.drawnPorts?.go ?? [];
    expect(go.map((p) => `${p.plug} ${p.name} ${p.type}`)).toEqual(['input target component', 'input pm-id string', 'input pm-tab string']);
  });

  it('draws a Cloud Function\'s Function picker, an `in-` per Request parameter and an `out-` per Response result', async () => {
    const { data } = await call<GetComponentResponse>(session, 'get_component', { path: 'Components/PortProbe' });
    expect(data.drawnPorts?.cloud?.map((p) => `${p.plug} ${p.name} ${p.type}`)).toEqual(['input function component', 'input in-score *', 'output out-grade *', 'output out-comment *']);
  });

  it('draws nothing for a type whose draw is not graded complete (the HTTP Request: its Output Fields) — its saved list stands', async () => {
    const { data } = await call<GetComponentResponse>(session, 'get_component', { path: 'Components/PortProbe' });
    expect(data.drawnPorts).not.toHaveProperty('http');
    // known-firing beside the absence: the same answer drew the And
    expect(data.drawnPorts).toHaveProperty('both');
  });
});
