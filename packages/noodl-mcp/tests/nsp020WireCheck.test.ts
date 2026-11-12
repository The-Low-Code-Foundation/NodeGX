/**
 * P107 NSP-020 R19 part 2 — the write gate refuses a wire to a port the node does not have, for the types whose ports
 * appear at run time and whose spec draws them (`DRAWN_PORT_TYPES`), and names the right one.
 *
 * Before R19 such a wire was "could not be statically verified … Skipped": measured over Richard's 117 local projects
 * (P107 s86), 575 wire endpoints were skipped; with the check 471 are checked and pass, and 99 are refused — every one a
 * wire the runtime never makes: For Each `addToBasket` (CMG Drive Looks: the port is `itemOutputSignal-addToBasket`, and
 * the Add to Basket press did nothing), a Function's `items` / `text` (its ports are `in-` / `out-`), Set Object
 * Properties' `stored` (renamed `done` in ERG-001), For Each `item`, Navigate To Path's `id` (`p-id`). What a wire makes
 * the runtime register is a port too: a For Each's `itemOutputSignal-x` for a row output nothing typed is wired into
 * (drawn `itemOutput-x`) — 22 wires in those projects. At this door the Function's 22 are not new: FIX-007's own rule
 * (`unknown-function-port`) refuses them first, so the arms here are the 77 only this check refuses.
 *
 * Graded through the doors an agent uses: `create_component`, `update_component` (a wire already on disk does not block
 * an unrelated edit), `validate_component`, and `get_component`'s drawn ports in a project where two components reuse
 * one node id (27 of those 117 projects do).
 */
import type { ValidateComponentResponse, GetComponentResponse } from '../src/tools/responses';
import { call, connect, copyFixture, TestSession } from './helpers';

jest.setTimeout(60000);

const wire = (fromId: string, fromProperty: string, toId: string, toProperty: string) => ({ fromId, fromProperty, toId, toProperty });

/** A list of rows whose template sends `addToBasket` (a signal: the Button's click is wired to it) */
const list = (fromProperty: string) => ({
  nodes: [
    { id: 'pg', type: 'Group' },
    { id: 'rows', type: 'For Each', parent: 'pg', parameters: { templateType: 'explicit', template: '/Rows/ProductRow' } },
    { id: 'added', type: 'Counter' }
  ],
  connections: [wire('rows', fromProperty, 'added', 'increase')]
});

/** a refusal's whole payload as text (its diagnostics carry the message, the suggestion and the alternatives) */
const errorsOf = (res: { isError: boolean; data: unknown }) => (res.isError ? JSON.stringify(res.data) : '');

describe('NSP-020 R19 — a wire to a port the node does not have is refused at the write, and the near port named', () => {
  let session: TestSession;

  beforeAll(async () => {
    session = await connect(copyFixture());
    const row = await call(session, 'create_component', {
      path: 'Rows/ProductRow',
      nodes: [
        { id: 'root', type: 'Group' },
        { id: 'add', type: 'net.noodl.controls.button', parent: 'root', parameters: { label: 'Add' } },
        { id: 'out', type: 'Component Outputs', ports: [{ name: 'addToBasket', plug: 'input', type: '*' }] }
      ],
      connections: [wire('add', 'onClick', 'out', 'addToBasket')]
    });
    // eslint-disable-next-line no-console
    if (row.isError) console.log('door refused the row:', JSON.stringify(row).slice(0, 2000));
    expect(row.isError).toBe(false);
  });

  afterAll(async () => {
    await session?.close();
  });

  it('refuses For Each `addToBasket` and names `itemOutputSignal-addToBasket`; takes the list wired to it', async () => {
    const wrong = await call(session, 'create_component', { path: 'Lists/Wrong', ...list('addToBasket') });
    expect(wrong.isError).toBe(true);
    expect(errorsOf(wrong)).toContain('For Each has no output named \\"addToBasket\\" with its settings in this project.');
    expect(errorsOf(wrong)).toContain('itemOutputSignal-addToBasket');
    const right = await call(session, 'create_component', { path: 'Lists/Right', ...list('itemOutputSignal-addToBasket') });
    // eslint-disable-next-line no-console
    if (right.isError) console.log('door refused the right list:', JSON.stringify(right).slice(0, 2000));
    expect(right.isError).toBe(false);
  });

  it("refuses Set Object Properties' `stored` (renamed `done` in ERG-001; the copies of a prefab made before it still wire it), and takes `done`", async () => {
    const setter = (fromProperty: string) => ({
      nodes: [
        { id: 'save', type: 'SetModelProperties' },
        { id: 'saved', type: 'Counter' }
      ],
      connections: [wire('save', fromProperty, 'saved', 'increase')]
    });
    const wrong = await call(session, 'create_component', { path: 'Save/Wrong', ...setter('stored') });
    expect(wrong.isError).toBe(true);
    expect(errorsOf(wrong)).toContain(
      'SetModelProperties has no output named \\"stored\\" with its settings in this project. It was renamed \\"done\\" in August 2026: wire \\"done\\".'
    );
    const right = await call(session, 'create_component', { path: 'Save/Right', ...setter('done') });
    // eslint-disable-next-line no-console
    if (right.isError) console.log('door refused the right setter:', JSON.stringify(right).slice(0, 2000));
    expect(right.isError).toBe(false);
  });

  it('a wrong wire already on disk does not block an unrelated edit, and validate_component reports it', async () => {
    // on disk as an editor or an older server left it
    const right = await call<GetComponentResponse>(session, 'get_component', { path: 'Lists/Right' });
    const files = session.store.readComponent('Lists/Right').files;
    const connections = files.connections.connections.map((c) => (c.fromId === 'rows' ? { ...c, fromProperty: 'addToBasket' } : c));
    session.store.writeComponent(session.store.readComponent('Lists/Right').key, { ...files, connections: { ...files.connections, connections } });

    const v = await call<ValidateComponentResponse>(session, 'validate_component', { path: 'Lists/Right' });
    expect(v.isError).toBe(false);
    expect((v.data.diagnostics ?? []).filter((d) => d.code === 'nonexistent-port').map((d) => `${d.severity}:${d.location?.port}:${d.suggestion}`)).toEqual([
      'error:addToBasket:itemOutputSignal-addToBasket'
    ]);

    const edit = await call(session, 'update_component', {
      path: 'Lists/Right',
      set: { nodes: [...right.data.nodes, { id: 'note', type: 'Text', parent: 'pg', parameters: { text: 'Basket' } }], connections }
    });
    // eslint-disable-next-line no-console
    if (edit.isError) console.log('door refused the edit:', JSON.stringify(edit).slice(0, 2000));
    expect(edit.isError).toBe(false);
  });

  it("get_component draws each node from its own component's wires where two components reuse a node id", async () => {
    // the server gives a node it writes a fresh id (`both` → `both-2`), so a reused id comes from a component copied on
    // disk — as in those 27 projects. The copy: the same ids, the wire into `input 2`.
    const one = await call(session, 'create_component', {
      path: 'Ands/One',
      nodes: [
        { id: 'flag', type: 'Boolean' },
        { id: 'both', type: 'And' }
      ],
      connections: [wire('flag', 'savedValue', 'both', 'input 0')]
    });
    expect(one.isError).toBe(false);
    const files = session.store.readComponent('Ands/One').files;
    session.store.writeComponent(
      'Ands/Three',
      {
        component: { ...files.component, id: 'c_ands_three', name: 'Three', path: '/Ands/Three' },
        nodes: { ...files.nodes, componentId: 'c_ands_three' },
        connections: { ...files.connections, componentId: 'c_ands_three', connections: [wire('flag', 'savedValue', 'both', 'input 2')] }
      },
      { expectNew: true }
    );
    const inputsOf = async (path: string) =>
      ((await call<GetComponentResponse>(session, 'get_component', { path })).data.drawnPorts?.both ?? []).map((p) => p.name);
    // one spare past the highest wired input, each from its own wire
    expect(await inputsOf('Ands/One')).toEqual(['input 0', 'input 1']);
    expect(await inputsOf('Ands/Three')).toEqual(['input 0', 'input 1', 'input 2', 'input 3']);
  });
});
