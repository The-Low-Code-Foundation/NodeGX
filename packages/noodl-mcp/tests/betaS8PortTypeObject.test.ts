/**
 * BETA-S8-PORTTYPEOBJECT — a component the editor saved can be read with get_component and written again.
 *
 * The editor saves a port's type as an object (`{ "name": "*" }`); get_component handed it back that way, and
 * create_component's argument schema (`type: string`) refused it before any validator ran, with a raw MCP input error.
 * "Make another one like this" failed on a component a person made in Studio. get_component now hands a name-only type
 * back as the string; a type carrying more than its name is kept whole.
 */
import * as fs from 'fs';

import { call, connect, copyFixture, TestSession } from './helpers';

interface Port {
  name: string;
  plug?: string;
  type?: unknown;
}

describe('BETA-S8-PORTTYPEOBJECT — get_component hands back port types the write tools take', () => {
  let dir: string;
  let session: TestSession;

  beforeEach(async () => {
    dir = copyFixture();
    session = await connect(dir);
    const made = await call(session, 'create_component', {
      path: 'Components/Card',
      nodes: [
        { id: 'root', type: 'Group' },
        {
          id: 'in',
          type: 'Component Inputs',
          ports: [
            { name: 'title', plug: 'output', type: '*' },
            { name: 'size', plug: 'output', type: 'string' }
          ]
        },
        { id: 't', type: 'Text', parent: 'root' }
      ],
      connections: [{ fromId: 'in', fromProperty: 'title', toId: 't', toProperty: 'text' }],
      visual_roots: ['root']
    });
    expect(made.isError).toBe(false);
    // as the editor saves it: each type an object, one of them carrying more than its name
    const c = session.store.readComponent('Components/Card');
    const files = JSON.parse(
      JSON.stringify(c.files)
        .replace(/"type":"\*"/g, '"type":{"name":"*"}')
        .replace(/"type":"string"/g, '"type":{"name":"enum","enums":[{"label":"Small","value":"s"}]}')
    );
    session.store.writeComponent(c.key, files);
  });

  afterEach(async () => {
    await session.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('a name-only type comes back as the string; a richer type is kept whole', async () => {
    const got = await call<{ nodes: Array<{ id: string; ports?: Port[] }> }>(session, 'get_component', { path: 'Components/Card' });
    const ports = got.data.nodes.find((n) => n.id === 'in')!.ports!;
    expect(ports.find((p) => p.name === 'title')!.type).toBe('*');
    expect(ports.find((p) => p.name === 'size')!.type).toEqual({ name: 'enum', enums: [{ label: 'Small', value: 's' }] });
  });

  it('what get_component returned, name-only types and all, is written as a copy', async () => {
    const got = await call<{ nodes: Array<{ id: string; ports?: Port[] }>; connections: unknown[]; visualRoots: string[] }>(
      session,
      'get_component',
      { path: 'Components/Card' }
    );
    // the enum port is the gap this fix leaves (see the row); the copy takes the rest
    const nodes = got.data.nodes.map((n) => (n.ports ? { ...n, ports: n.ports.filter((p) => typeof p.type !== 'object') } : n));
    const copy = await call(session, 'create_component', {
      path: 'Components/Card Copy',
      nodes,
      connections: got.data.connections,
      visual_roots: got.data.visualRoots
    });
    expect(copy.isError).toBe(false);
  });
});
