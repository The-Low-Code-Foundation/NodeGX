/**
 * P107-S86-STOREDWIRE — opening a project moves a wire saved before ERG-001 renamed its output onto the new name.
 *
 * The Multi Choice filter's Item, as 22 copies of CMG Drive Looks save it: Set Object Properties' `stored` into its
 * Component Outputs' Selection Changed. The canvas drew that wire to a port the node no longer has, and the runtime
 * dropped it. `applyPatches` is the seam every editor open goes through; the runtime's own alias is graded in
 * `noodl-runtime/test/corpus/p107-s86-stored-wire.test.ts`.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { applyPatches } = require('../../src/editor/src/models/ProjectPatches/applypatches');

function project(version: string) {
  return {
    name: 'p107-s86',
    version,
    components: [
      {
        name: '/Filters/Multi Choice/Item',
        graph: {
          roots: [
            { id: 'set', type: 'SetModelProperties', parameters: {}, ports: [] },
            { id: 'out', type: 'Component Outputs', parameters: {}, ports: [{ name: 'Selection Changed', plug: 'input', type: 'signal' }] }
          ],
          connections: [{ fromId: 'set', fromProperty: 'stored', toId: 'out', toProperty: 'Selection Changed' }]
        }
      }
    ]
  };
}

describe('P107-S86-STOREDWIRE — applyPatches renames wires from outputs ERG-001 renamed', () => {
  let info: jest.SpyInstance;
  beforeEach(() => {
    info = jest.spyOn(console, 'info').mockImplementation(() => undefined);
  });
  afterEach(() => info.mockRestore());

  test.each(['4', '5'])('a project at format %s opens with the wire on `done`, and says so once', (version) => {
    const p = project(version);
    applyPatches(p);

    expect(p.components[0].graph.connections).toEqual([
      { fromId: 'set', fromProperty: 'done', toId: 'out', toProperty: 'Selection Changed' }
    ]);
    expect(info.mock.calls.map((c) => String(c[0])).filter((l) => l.startsWith('Renamed'))).toEqual([
      'Renamed 1 wire from outputs renamed in August 2026: SetModelProperties.stored → done.'
    ]);
  });

  test('a second open finds nothing to move and logs nothing', () => {
    const p = project('5');
    applyPatches(p);
    info.mockClear();
    applyPatches(p);

    expect(p.components[0].graph.connections[0].fromProperty).toBe('done');
    expect(info).not.toHaveBeenCalled();
  });
});
