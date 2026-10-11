/**
 * P109 ISL-042 — P99-HLT016-SUCCESS: a Cloud Function wired from `success` validated with 0 errors and never fired.
 *
 * A client Cloud Function's outcomes are `done` and `failure` (ERG-001 renamed `Success`). Its other ports are minted at
 * run time from the called function (`cloudfunction2.ts` `registerOutputIfNeeded` / `registerInputIfNeeded`): an output
 * only if it starts `out-`, an input only if it is `function` or starts `in-`. The validator skipped every port the
 * catalog does not list on a node with runtime ports, so `success` went through the door and the page sat on "Saving…".
 *
 * Graded through the two doors the report named: `validate_component` and the write gate (`create_component`). A wire
 * the runtime can never make is an error. A prefixed name (`out-x`, `in-x`) is minted, so this rule leaves it alone:
 * whether the called function declares it is DEF-002's `connection-unknown-derived-port`, already on the write path.
 * The correctly wired ports in the same component are the known-good arm beside them.
 */
import * as fs from 'fs';
import * as path from 'path';

import type { ValidateComponentResponse } from '../src/tools/responses';
import { call, connect, copyFixture, TestSession } from './helpers';

jest.setTimeout(60000);

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

describe('ISL-042 P99-HLT016-SUCCESS — a Cloud Function wire the function can never answer is refused', () => {
  let dir: string;
  let session: TestSession;
  let found: string[];
  let writeRefused: { isError: boolean | undefined; text: string };
  let writeAccepted: boolean | undefined;

  beforeAll(async () => {
    dir = copyFixture();
    const components = path.join(dir, 'components');

    // The called function: takes `text`, returns `id`.
    const cloud = path.join(components, '__cloud__', 'saveNote');
    writeJson(path.join(cloud, 'component.json'), {
      $schema: 'https://opennoodl.dev/schemas/component-v2.json',
      id: 'c_savenote',
      name: 'saveNote',
      path: '/#__cloud__/saveNote',
      type: 'cloud'
    });
    writeJson(path.join(cloud, 'nodes.json'), {
      $schema: 'https://opennoodl.dev/schemas/nodes-v2.json',
      componentId: 'c_savenote',
      version: 1,
      nodes: [
        { id: 'req', type: 'noodl.cloud.request', parameters: { params: 'text' } },
        { id: 'res', type: 'noodl.cloud.response', parameters: { params: 'id' } }
      ]
    });
    writeJson(path.join(cloud, 'connections.json'), {
      $schema: 'https://opennoodl.dev/schemas/connections-v2.json',
      componentId: 'c_savenote',
      version: 1,
      connections: []
    });
    const registry = JSON.parse(fs.readFileSync(path.join(components, '_registry.json'), 'utf8'));
    registry.components['__cloud__/saveNote'] = { path: '__cloud__/saveNote', type: 'cloud', nodeCount: 2, connectionCount: 0 };
    writeJson(path.join(components, '_registry.json'), registry);

    // The caller, on Card: one Cloud Function, wired right and wrong.
    const card = path.join(components, 'Card');
    const nodes = JSON.parse(fs.readFileSync(path.join(card, 'nodes.json'), 'utf8'));
    nodes.nodes.push(
      { id: 'cf', type: 'CloudFunction2', label: 'Save note', parameters: { function: 'saveNote' } },
      { id: 'saved', type: 'Boolean', parameters: { value: true } },
      { id: 'lost', type: 'Boolean', parameters: { value: true } },
      { id: 'note', type: 'String', parameters: { value: '' } },
      { id: 'noteId', type: 'String', parameters: { value: '' } }
    );
    writeJson(path.join(card, 'nodes.json'), nodes);
    const wire = (fromId: string, fromProperty: string, toId: string, toProperty: string) => ({ fromId, fromProperty, toId, toProperty });
    writeJson(path.join(card, 'connections.json'), {
      $schema: 'https://opennoodl.dev/schemas/connections-v2.json',
      componentId: 'c_card',
      version: 1,
      connections: [
        // Right.
        wire('cf', 'done', 'saved', 'saveValue'),
        wire('cf', 'failure', 'lost', 'saveValue'),
        wire('cf', 'out-id', 'noteId', 'value'),
        wire('note', 'savedValue', 'cf', 'in-text'),
        // Wrong.
        wire('cf', 'success', 'saved', 'saveValue')
      ]
    });

    session = await connect(dir);
    const v = await call<ValidateComponentResponse>(session, 'validate_component', { path: 'Card' });
    // An empty list and a refused call read the same downstream; say which this is.
    expect(v.isError).toBe(false);
    found = (v.data.diagnostics ?? [])
      .filter((d) => d.code === 'nonexistent-port' && d.location?.nodeId === 'cf')
      .map((d) => `${d.severity}:${d.location?.plug}:${d.location?.port}`);

    // The write gate: a new component wired from `success` is refused; the same component wired from `done` is not.
    const caller = (outcome: string) => ({
      nodes: [
        { id: 'root', type: 'Group' },
        { id: 'cf', type: 'CloudFunction2', parameters: { function: 'saveNote' } },
        { id: 'saved', type: 'Boolean', parameters: { value: true } }
      ],
      connections: [{ fromId: 'cf', fromProperty: outcome, toId: 'saved', toProperty: 'saveValue' }]
    });
    const refused = await call(session, 'create_component', { path: 'CallerWrong', ...caller('success') });
    writeRefused = { isError: refused.isError, text: JSON.stringify(refused) };
    writeAccepted = (await call(session, 'create_component', { path: 'CallerRight', ...caller('done') })).isError;
  });

  afterAll(async () => {
    await session?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('validate_component refuses `success`, the old name of `done`, which the runtime never mints', () => {
    expect(found).toContain('error:output:success');
  });

  it('known-good: done, failure, the declared result and the declared parameter pass validate_component', () => {
    expect(found).toEqual(['error:output:success']);
  });

  it('the write gate refuses a component wired from `success`, and takes the same component wired from `done`', () => {
    expect(writeRefused.isError).toBe(true);
    expect(writeRefused.text).toContain('nonexistent-port');
    expect(writeRefused.text).toContain('success');
    expect(writeAccepted).toBe(false);
  });
});
