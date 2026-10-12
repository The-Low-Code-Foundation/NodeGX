/**
 * P109 ISL-044 · P109-S20-LISTDEFAULTTYPE — the Script node's twin of the Function's Type select.
 *
 * A row under Script Outputs showed Type "String", but its port is `parameters['outtype-<name>'] || '*'`. Ruled
 * 2026-10-11 (Richard, P109 s44): the panel says "Any" until a type is picked; nothing saved changes.
 */
import JavascriptModule from '../src/nodes/std-library/javascript';

type Port = { name: string; plug: string; type: unknown; default?: unknown };

function announcedPorts(parameters: Record<string, unknown>): Port[] {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  const sendDynamicPorts = jest.fn();
  const node = { id: 'js', type: 'Javascript2', parameters, outputPorts: {}, component: { name: '/Home' }, on: () => undefined };
  const graphModel = {
    on: (event: string, fn: (...args: unknown[]) => void) => (handlers[event] = fn),
    getNodesWithType: () => [node]
  };
  const context = { editorConnection: { isRunningLocally: () => true, sendDynamicPorts, sendWarning: () => undefined, clearWarning: () => undefined } };
  (JavascriptModule as unknown as { setup(c: unknown, g: unknown): void }).setup(context, graphModel);
  handlers.editorImportComplete();
  return sendDynamicPorts.mock.calls[sendDynamicPorts.mock.calls.length - 1][1] as Port[];
}

describe('P109-S20-LISTDEFAULTTYPE — the Script node', () => {
  it('a listed output with no type picked: the panel shows Any, and the port is Any (*)', () => {
    const ports = announcedPorts({ scriptOutputs: [{ id: 'a', label: 'total' }] });
    const select = ports.find((p) => p.name === 'outtype-total');
    const enums = (select?.type as { enums: Array<{ value: string; label: string }> }).enums;
    expect({ shown: enums.find((e) => e.value === select?.default)?.label, port: ports.find((p) => p.name === 'total' && p.plug === 'output')?.type }).toEqual({
      shown: 'Any',
      port: '*'
    });
  });

  it('…and String, picked, makes a string port (a control)', () => {
    const ports = announcedPorts({ scriptOutputs: [{ id: 'a', label: 'total' }], 'outtype-total': 'string' });
    expect(ports.find((p) => p.name === 'total' && p.plug === 'output')?.type).toBe('string');
  });
});
