/**
 * P109 ISL-044 · P109-S20-LISTDEFAULTTYPE — a listed output's Type says what its port is.
 *
 * A row under the Function's Script Outputs has a Type select. It showed "String" by default, but the port's type is
 * `parameters['outtype-<name>'] || '*'`, and a default is never written as a parameter: a row left on String was a `*`
 * port. Ruled 2026-10-11 (Richard, P109 s44): the panel says "Any" until a type is picked; nothing saved changes.
 *
 * Read off the module's own `setup` hook, as the editor gets it (`sendDynamicPorts`), with a fake graph.
 */
/* eslint-env jest */
import SimpleJavascriptNode = require('../../src/nodes/std-library/simplejavascript');

type Port = { name: string; plug: string; type: unknown; default?: unknown };

function announcedPorts(parameters: Record<string, unknown>): Port[] {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  const sendDynamicPorts = jest.fn();
  const node = { id: 'fn', type: 'JavaScriptFunction', parameters, outputPorts: {}, component: { name: '/Home' }, on: () => undefined };
  const graphModel = {
    on: (event: string, fn: (...args: unknown[]) => void) => (handlers[event] = fn),
    getNodesWithType: () => [node]
  };
  const context = { editorConnection: { isRunningLocally: () => true, sendDynamicPorts, sendWarning: () => undefined, clearWarning: () => undefined } };
  (SimpleJavascriptNode as unknown as { setup(c: unknown, g: unknown): void }).setup(context, graphModel);
  handlers.editorImportComplete();
  return sendDynamicPorts.mock.calls[sendDynamicPorts.mock.calls.length - 1][1] as Port[];
}

const scriptOutputs = [{ id: 'a', label: 'total' }];

describe('P109-S20-LISTDEFAULTTYPE — the Function', () => {
  it('a listed output with no type picked: the panel shows Any, and the port is Any (*)', () => {
    const ports = announcedPorts({ scriptOutputs, functionScript: '' });
    const select = ports.find((p) => p.name === 'outtype-total');
    const port = ports.find((p) => p.name === 'out-total');
    const enums = (select?.type as { enums: Array<{ value: string; label: string }> }).enums;
    expect({ shown: enums.find((e) => e.value === select?.default)?.label, port: port?.type }).toEqual({ shown: 'Any', port: '*' });
  });

  it('…and String, picked, makes a string port (a control: the choice still reaches the port)', () => {
    const ports = announcedPorts({ scriptOutputs, functionScript: '', 'outtype-total': 'string' });
    expect(ports.find((p) => p.name === 'out-total')?.type).toBe('string');
  });

  it('an input keeps String: its port falls back to string, as its panel says', () => {
    const ports = announcedPorts({ scriptInputs: [{ id: 'b', label: 'count' }], functionScript: '' });
    expect([ports.find((p) => p.name === 'intype-count')?.default, ports.find((p) => p.name === 'in-count')?.type]).toEqual(['string', 'string']);
  });
});
