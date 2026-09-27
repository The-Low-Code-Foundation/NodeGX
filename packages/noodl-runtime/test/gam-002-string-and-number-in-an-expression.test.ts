/**
 * GAM-002 (P78 D54) — `String(n)` and `Number(s)` work inside an Expression.
 *
 * Someone types the JavaScript they already know, `String(n)`, and the node said *"The expression
 * threw: String is not a function"*. The port scan minted `String` as an input, the compiled
 * function took every input as a parameter, and a parameter named `String` holding `undefined`
 * shadowed the global.
 *
 * R4 (Richard, 2026-09-14): an Expression stops minting ports for JavaScript globals and keywords,
 * and a saved wire into one is migrated. The runtime cannot rely on the migration: a project
 * deployed before it still carries the wire, and `registerInputIfNeeded` would put the name back
 * into the parameter list. The last block pins that.
 *
 * Each row reads the port set the node minted (`referencedPorts`, the list `updatePorts` sends the
 * editor too) and the parameters it compiled (`scope`), not only the result.
 */

/* eslint-env jest */

import * as fs from 'fs';
import * as path from 'path';

import type { NodeInstance, NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from './corpus/graph-harness';

import ExpressionNode = require('../src/nodes/std-library/expression');

const TriggerModule: NodeModule = {
  node: {
    name: 'corpus.Trigger',
    category: 'Corpus',
    outputs: {
      value: {
        type: '*',
        getter: function (this: NodeInstance) {
          return this._internal.value;
        }
      }
    },
    methods: {
      send(this: NodeInstance, value: unknown) {
        this._internal.value = value;
        this.flagOutputDirty('value');
      }
    }
  }
};

interface TriggerInstance extends NodeInstance {
  send(value: unknown): void;
}

interface Evaluated {
  graph: CorpusGraph;
  result: unknown;
  ports: string[];
  parameters: string[];
  errors: string[];
}

/** One Expression, one trigger per named input wired into the port of that name, all fed, settled. */
async function evaluate(expression: string, inputs: Record<string, unknown>): Promise<Evaluated> {
  const names = Object.keys(inputs);
  const graph = await createCorpusGraph({
    modules: [TriggerModule, ExpressionNode as unknown as NodeModule],
    rootComponent: '/root',
    data: {
      components: [
        {
          name: '/root',
          nodes: [
            ...names.map((name) => ({ id: `in-${name}`, type: 'corpus.Trigger' })),
            { id: 'expr', type: 'Expression', parameters: { expression } }
          ],
          connections: names.map((name) => ({
            sourceId: `in-${name}`,
            sourcePort: 'value',
            targetId: 'expr',
            targetPort: name
          }))
        }
      ]
    } as never
  });
  await graph.settle(4);
  for (const name of names) graph.node<TriggerInstance>(`in-${name}`).send(inputs[name]);
  await graph.settle(4);

  const node = graph.node('expr');
  const internal = node._internal as { referencedPorts: string[]; scope: Record<string, unknown> };
  return {
    graph,
    result: node.getOutput('result').value,
    ports: [...internal.referencedPorts],
    parameters: Object.keys(internal.scope),
    errors: graph.errors.map((e) => `${e.code}: ${e.message}`)
  };
}

describe('GAM-002 AC1: the known-firing control', () => {
  test("'' + n gives \"5\" (the workaround Rocket School uses, which worked before and after)", async () => {
    const r = await evaluate("'' + n", { n: 5 });
    expect(r.errors).toEqual([]);
    expect(r.result).toBe('5');
    expect(r.ports).toEqual(['n']);
  });

  test('Math.min(a, b) works (the register said Math became a port; it never did)', async () => {
    const r = await evaluate('Math.min(a, b)', { a: 2, b: 3 });
    expect(r.errors).toEqual([]);
    expect(r.result).toBe(2);
    expect(r.ports).toEqual(['a', 'b']);
  });
});

describe('GAM-002 AC2: the JavaScript someone already knows', () => {
  const rows: Array<[string, Record<string, unknown>, (v: unknown) => void, string[]]> = [
    ['String(n)', { n: 5 }, (v) => expect(v).toBe('5'), ['n']],
    ['Number(s)', { s: '42' }, (v) => expect(v).toBe(42), ['s']],
    ['JSON.stringify(o)', { o: { a: 1 } }, (v) => expect(v).toBe('{"a":1}'), ['o']],
    ['parseInt(s)', { s: '12px' }, (v) => expect(v).toBe(12), ['s']],
    ['Date.now() - t', { t: 0 }, (v) => expect(v as number).toBeGreaterThan(1.7e12), ['t']],
    ['typeof n', { n: 5 }, (v) => expect(v).toBe('number'), ['n']]
  ];

  test.each(rows)('%s evaluates, and its only ports are its data', async (expression, inputs, check, ports) => {
    const r = await evaluate(expression, inputs);
    expect(r.errors).toEqual([]);
    check(r.result);
    expect(r.ports).toEqual(ports);
    expect(r.parameters).toEqual(ports);
  });
});

describe('GAM-002 AC7: what a text scan mistook for a name', () => {
  const rows: Array<[string, Record<string, unknown>, unknown, string[]]> = [
    ["(first + ' ' + last).trim()", { first: 'Ada ', last: 'Lovelace ' }, 'Ada  Lovelace', ['first', 'last']],
    ['a /* plus b */ + 1', { a: 1 }, 2, ['a']],
    ['`${a}px wide`', { a: 3 }, '3px wide', ['a']],
    ['1e3 * a', { a: 2 }, 2000, ['a']],
    ['"say \\"hi\\" to " + who', { who: 'Tom' }, 'say "hi" to Tom', ['who']],
    ['(v || []).length', { v: [1, 2] }, 2, ['v']],
    ['/x+/.test(s)', { s: 'axx' }, true, ['s']],
    ['a?.b', { a: { b: 7 } }, 7, ['a']],
    // An object key is still read as a name (the lexer is not a parse), in text order: `k` first.
    ['`${ {k: a}.k } and ${b}`', { a: 1, b: 2 }, '1 and 2', ['k', 'a', 'b']]
  ];

  test.each(rows)('%s', async (expression, inputs, expected, ports) => {
    const r = await evaluate(expression, inputs);
    expect(r.errors).toEqual([]);
    expect(r.result).toEqual(expected);
    expect(r.ports).toEqual(ports);
  });
});

describe('GAM-002: a saved wire into a name that is now reserved', () => {
  test('String(n) with an old wire into String still evaluates, and String is not a parameter', async () => {
    // A project saved before GAM-002 carries this wire. The editor migrates it on load; a deployed
    // copy of the project does not go through the editor.
    const r = await evaluate('String(n)', { String: 'stale', n: 5 });
    expect(r.errors).toEqual([]);
    expect(r.result).toBe('5');
    expect(r.parameters).toEqual(['n']);
  });

  test('a wire into a keyword does not stop the node compiling', async () => {
    const r = await evaluate('n + 1', { typeof: 1, n: 1 });
    expect(r.errors).toEqual([]);
    expect(r.result).toBe(2);
  });
});

describe('GAM-002 AC5: what can never be a port is written where the author reads', () => {
  const NAMED = ['String', 'Number', 'JSON', 'Date', 'parseInt', 'Math', 'typeof'];

  test('the Expression port description names them', () => {
    const inputs = (ExpressionNode as unknown as { node: { inputs: Record<string, { description: string }> } }).node
      .inputs;
    for (const name of NAMED) expect(inputs.expression.description).toContain(name);
  });

  test('the catalog antiPatterns name them, and the object-literal key that still mints a port', () => {
    const file = path.join(__dirname, '../../../docs/node-catalog/enrichment/expression.json');
    const antiPatterns = (JSON.parse(fs.readFileSync(file, 'utf8')).antiPatterns as string[]).join('\n');
    for (const name of NAMED) expect(antiPatterns).toContain(name);
    expect(antiPatterns).toContain('a wire into one delivers nothing');
    expect(antiPatterns).toContain('object literal');
  });
});
