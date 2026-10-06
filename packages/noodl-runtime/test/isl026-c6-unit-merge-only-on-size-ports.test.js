/**
 * ISL-026 / P107-C6 (R7, ruled "Only on size inputs") — a bare number is merged into the unit a port
 * holds only on a port built for sizes. Every other port receives exactly what was sent.
 *
 * node.ts merges in two places: `setInputValue`, and the first update's queue, where a wired number
 * replaces a queued `{ value, unit }`. Both are graded here, on both kinds of port. The size port is
 * declared through `defineNode`, the way every library port is: its type is NOT kept on the instance's
 * input (nodedefinition.ts keeps only colour, text style, array, object and string), so `node.ts` reads
 * the `hasUnits` mark `defineNode` sets. A first version read `input.type.units` alone, which is
 * undefined for every library port, and switched the merge off everywhere; GAM-015 caught it in the
 * viewer. The size rows here are that miss, in the runtime's own suite.
 *
 * The `*` rows are the conformance scenarios' subject (Value Changed, Log, HTTP, Variable2,
 * StreamBuffer, Model2), at the core.
 */

/* eslint-env jest */

/* eslint-disable @typescript-eslint/no-var-requires */
const NodeContext = require('../src/nodecontext');
const NodeDefinition = require('../src/nodedefinition');
const Node = require('../src/node');
/* eslint-enable @typescript-eslint/no-var-requires */

const SIZE = { name: 'number', units: ['px', '%'], defaultUnit: 'px' };

function build() {
  const seen = { size: [], any: [] };
  const definition = NodeDefinition.defineNode({
    name: 'isl026.C6',
    category: 'test',
    inputs: {
      size: { type: SIZE, default: 10, set: (v) => seen.size.push(v) },
      any: { type: '*', set: (v) => seen.any.push(v) }
    }
  });
  const context = new NodeContext();
  context.nodeRegister.register(definition);
  const node = context.nodeRegister.createNode('isl026.C6', 'n1');
  return { node, seen };
}

describe('ISL-026 C6 — the unit merge, only on a port built for sizes', () => {
  test('setInputValue: a number after a unit object on a size port keeps the unit', () => {
    const { node } = build();
    node.setInputValue('size', { value: 5, unit: '%' });
    node.setInputValue('size', 7);
    expect(node._inputValues.size).toEqual({ value: 7, unit: '%' });
  });

  test('setInputValue: a number after a unit object on a * port arrives as sent', () => {
    const { node, seen } = build();
    node.setInputValue('any', { value: 5, unit: '%' });
    node.setInputValue('any', 7);
    node.setInputValue('any', null);
    expect(node._inputValues.any).toBe(null);
    expect(seen.any.slice(1)).toEqual([7, null]);
  });

  test('first update: a wired number replacing a queued unit object on a size port keeps the unit', () => {
    const { node } = build();
    expect(node._isFirstUpdate).toBe(true);
    node.queueInput('size', { value: 5, unit: '%' });
    node.queueInput('size', 7);
    expect(node._inputValuesQueue.size).toEqual([{ value: 7, unit: '%' }]);
  });

  test('first update: a wired number replacing a queued unit object on a * port is queued as sent', () => {
    const { node } = build();
    node.queueInput('any', { value: 5, unit: '%' });
    node.queueInput('any', 7);
    expect(node._inputValuesQueue.any).toEqual([7]);
  });

  test('a port registered at run time keeps its whole type, and merges by it', () => {
    const node = new Node({ updateIteration: 0, nodeIsDirty() {}, styles: { resolveColor: (c) => c }, getDefaultValueForInput: () => undefined }, 'n2');
    node.registerInput('height', { type: SIZE, default: 100, set() {} });
    node.registerInput('label', { type: '*', set() {} });
    node.setInputValue('height', 400);
    node.setInputValue('label', { value: 1, unit: 'px' });
    node.setInputValue('label', 2);
    expect(node._inputValues.height).toEqual({ value: 400, unit: 'px' });
    expect(node._inputValues.label).toBe(2);
  });
});
