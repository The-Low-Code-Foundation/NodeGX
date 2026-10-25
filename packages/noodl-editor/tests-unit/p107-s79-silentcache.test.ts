/**
 * P107-S79-SILENTCACHE — the first port list a viewer announces replaces the one saved in the project, and what it took
 * from a wire is said, where it used to be replaced with no diff.
 *
 * Two halves:
 *  - the pure diff and the warning (`portsReplaced.ts`): dropped and retyped names, renames excluded, and a warning
 *    read against the node as it is NOW, so it clears once the wire is deleted or the port comes back;
 *  - the real `NodeGraphNode`: a node read from JSON with a cached list, then `setDynamicPorts` with a different one,
 *    raises `node-ports-replaced` naming the wired port; a node with no cache, and a second replacement, do not.
 *
 * Mutants: drop the `replacingTheFile` call in `setDynamicPorts` → the node arms redden; drop the `isWired` filter →
 * the unwired arm reddens; diff every replacement instead of the file's → the "person's own edit" arm reddens.
 */

/* eslint-env jest */

const warnings = new Map<string, { message: string; level: string } | undefined>();

jest.mock('@noodl-utils/capability-gating/nodeWarning', () => ({ capabilityWarningFor: () => undefined }));
jest.mock('@noodl-models/warningsmodel', () => ({
  WarningsModel: {
    instance: {
      setWarning: (ref: { node: { id: string }; key: string }, w: { message: string; level: string } | undefined) =>
        warnings.set(`${ref.node.id}/${ref.key}`, w),
      getWarnings: () => undefined
    }
  }
}));

import { NodeGraphNode } from '../src/editor/src/models/nodegraphmodel/NodeGraphNode';
import { diffReplacedPorts, portsReplacedWarning } from '../src/editor/src/models/nodegraphmodel/portsReplaced';

const p = (name: string, type: unknown = 'string', plug = 'input') => ({ name, type, plug });

describe('P107-S79-SILENTCACHE — the diff', () => {
  it('names a dropped port and a retyped one, compares a type by its name, and leaves a rename out', () => {
    const before = [p('a'), p('b', { name: 'string' }), p('c', 'number'), p('old')];
    const after = [p('b', 'string'), p('c', { name: 'boolean' }), p('new')];
    expect(diffReplacedPorts(before, after, ['old'])).toEqual({
      dropped: ['a'],
      retyped: [{ name: 'c', before: 'number', after: 'boolean' }]
    });
  });

  it('nothing to say for an empty cache or an identical list', () => {
    expect(diffReplacedPorts([], [p('a')])).toEqual({ dropped: [], retyped: [] });
    expect(diffReplacedPorts([p('a')], [p('a')])).toEqual({ dropped: [], retyped: [] });
  });

  const replaced = { dropped: ['gone'], retyped: [{ name: 'kind', before: 'string', after: 'number' }] };

  it('warns on a wired port that went and a wired one that changed type', () => {
    const message = portsReplacedWarning(replaced, { isWired: () => true, typeNow: (n) => (n === 'kind' ? 'number' : undefined) });
    expect(message).toContain('gone but still wired: gone');
    expect(message).toContain('kind is wired, and now carries number instead of string');
  });

  it('says nothing about a port no wire uses', () => {
    expect(portsReplacedWarning(replaced, { isWired: () => false, typeNow: () => undefined })).toBeUndefined();
  });

  it('clears once the port is back, or back to the type it was saved with', () => {
    expect(portsReplacedWarning(replaced, { isWired: () => true, typeNow: (n) => (n === 'kind' ? 'string' : 'string') })).toBeUndefined();
  });
});

describe('P107-S79-SILENTCACHE — the real node', () => {
  /** A node read from JSON (cached list as saved) inside a graph with one wire on `title`, in a component. */
  function savedNode(dynamicports: unknown[]) {
    const node = NodeGraphNode.fromJSON({ id: 'n1', type: 'Some Type', dynamicports } as never);
    const graph = {
      connections: [{ fromId: 'other', fromProperty: 'out', toId: 'n1', toProperty: 'title' }],
      roots: [],
      bindTypeModel: () => undefined
    };
    (node as unknown as { owner: unknown }).owner = Object.assign(graph, { owner: { name: '/App' } });
    // The library is not loaded here: only the dynamic ports answer `getPort`, which is the cache this row is about.
    (node as unknown as { getPort: (n: string) => unknown }).getPort = (n: string) =>
      node.dynamicports.find((x) => x.name === n);
    return node;
  }

  beforeEach(() => warnings.clear());
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  afterAll(() => warn.mockRestore());

  it('the first list a viewer announces drops a wired port: a warning on the node names it, and the console logs the diff', () => {
    const node = savedNode([p('title'), p('body')]);
    node.setDynamicPorts([p('body'), p('subtitle')] as never);
    expect(warnings.get('n1/node-ports-replaced')?.message).toContain('gone but still wired: title');
    expect(warnings.get('n1/node-ports-replaced')?.level).toBe('warning');
    expect(warn.mock.calls.some((c) => String(c[0]).includes('Dropped: title'))).toBe(true);
  });

  it('clears when the health check runs after the wire is deleted', () => {
    const node = savedNode([p('title')]);
    node.setDynamicPorts([p('subtitle')] as never);
    expect(warnings.get('n1/node-ports-replaced')).toBeDefined();
    (node.owner as unknown as { connections: unknown[] }).connections = [];
    node.evaluateHealth();
    expect(warnings.get('n1/node-ports-replaced')).toBeUndefined();
  });

  it('a node saved with no cached list: nothing to diff', () => {
    const node = savedNode([]);
    node.setDynamicPorts([p('subtitle')] as never);
    expect(warnings.get('n1/node-ports-replaced')).toBeUndefined();
  });

  it("a later replacement is the person's own edit, and is not diffed", () => {
    const node = savedNode([p('title')]);
    node.setDynamicPorts([p('title')] as never); // the viewer confirms the cache
    node.setDynamicPorts([p('subtitle')] as never); // then an edit drops it
    expect(warnings.get('n1/node-ports-replaced')).toBeUndefined();
  });
});
