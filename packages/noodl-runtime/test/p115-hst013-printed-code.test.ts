/**
 * P115 HST-013 (P115-HST004-NOCODEGEN) — code nodes printed at deploy, looked up before a string is compiled.
 *
 * A Cloudflare Worker refuses `new Function`. The seam (`printedcode.ts`) answers a compile from a table the host
 * installs; the printer (`printcode.ts`) builds that table from a set of cloud functions, from the same helpers the
 * nodes compile with. These tests hold the two halves to each other and say what a deploy refuses.
 *
 * The whole path (a cloud function with each code node, called through the backend with the table installed and
 * every other text refused) is `nodegx-backend/tests/p115-hst013-code-nodes-printed.test.ts`.
 *
 * Sabotage: in `printedcode.ts` `compileCode`, drop the `findPrintedCode` hit → "a printed text answers from the
 * table" and the module round trip fail; change one name in `LOGIC_BUILDER_PARAMS` → "the Logic Builder's list" fails.
 */
import {
  LOGIC_BUILDER_PARAMS,
  NOT_PRINTED_MESSAGE,
  compileCode,
  findPrintedBody,
  hasPrintedCode,
  installPrintedCode,
  type PrintedCodeRow
} from '../src/printedcode';
import { codeOfNode, collectCode, printCodeModule, refusalSentence } from '../src/printcode';

import LogicBuilder = require('../src/nodes/std-library/logic-builder');

/** The rows a printed module's text holds, evaluated the way a Worker would import it (Node may compile here). */
function importPrinted(text: string): PrintedCodeRow[] {
  return new Function(text.replace('export default [', 'return [')) () as PrintedCodeRow[];
}

afterEach(() => installPrintedCode(null));

describe('the seam', () => {
  test('with no table installed, compileCode is new Function and nothing is looked up (Node, AC3)', () => {
    expect(hasPrintedCode()).toBe(false);
    const add = compileCode<(a: number, b: number) => number>(['a', 'b'], 'return a + b;');
    expect(add(2, 3)).toBe(5);
    expect(() => compileCode([], 'return (;')).toThrow(SyntaxError);
  });

  test('a printed text answers from the table, and with refuseOthers anything else is refused in words', () => {
    const printed = () => 'printed';
    installPrintedCode([[false, ['x'], 'return x;', printed]], { refuseOthers: true });
    expect(compileCode(['x'], 'return x;')).toBe(printed);
    // Same body, other parameters, or async: not the same compile.
    expect(() => compileCode(['y'], 'return x;')).toThrow(NOT_PRINTED_MESSAGE);
    expect(() => compileCode(['x'], 'return x;', { async: true })).toThrow(NOT_PRINTED_MESSAGE);
    expect(findPrintedBody('return x;', false)?.params).toEqual(['x']);
  });
});

describe('the printer', () => {
  const fnScript = "Outputs.total = Inputs.a * 2;\nOutputs.done();";
  const components = [
    {
      name: '/#__cloud__/sum',
      nodes: [
        { id: 'f', type: 'JavaScriptFunction', parameters: { functionScript: fnScript } },
        { id: 'e', type: 'Expression', parameters: { expression: 'a + min(b, 2)' } },
        { id: 'lb', type: 'Logic Builder', parameters: { generatedCode: 'Outputs.n = 1;' } },
        { id: 'r', type: 'REST2', parameters: {} },
        { id: 'm', type: 'Map Collection', parameters: { mapScript: "map({ t: 'title' })" } },
        { id: 'text', type: 'String', parameters: { value: 'not code' } }
      ]
    },
    // The same Function text in a second function is printed once, with both sites.
    { name: '/#__cloud__/again', nodes: [{ id: 'f2', type: 'JavaScriptFunction', parameters: { functionScript: fnScript } }] }
  ];

  test('every code node the cloud runtime carries is printed, defaults included, each text once', () => {
    const { print, refusals } = collectCode(components);
    expect(refusals).toEqual([]);
    const ports = print.flatMap((e) => e.sites.map((s) => `${s.fn}/${s.nodeId}.${s.port}`)).sort();
    expect(ports).toEqual(
      ['again/f2.functionScript', 'sum/e.expression', 'sum/f.functionScript', 'sum/lb.generatedCode', 'sum/m.mapScript', 'sum/r.requestScript', 'sum/r.responseScript'].sort()
    );
    expect(print).toHaveLength(6);
    expect(codeOfNode({ id: 'e', type: 'Expression', parameters: { expression: 'a + min(b, 2)' } })[0].params).toEqual(['a', 'b', 'Noodl']);
  });

  test('the printed module, imported, gives the functions the nodes would have compiled', () => {
    const rows = importPrinted(printCodeModule(collectCode(components).print));
    installPrintedCode(rows, { refuseOthers: true });
    const [fnRow] = rows.filter((r) => r[0] === true);
    // The Function node's body, compiled through the seam, is the printed function, and it runs.
    const fn = compileCode(fnRow[1], fnRow[2], { async: true }) as (...a: unknown[]) => Promise<void>;
    expect(fn).toBe(fnRow[3]);
    const outputs: Record<string, unknown> = { done: () => (outputs.called = true) };
    return fn({ a: 21 }, outputs).then(() => expect(outputs).toMatchObject({ total: 42, called: true }));
  });

  test('a text that does not compile, or compiles only outside strict mode, is refused by function and node', () => {
    const { print, refusals } = collectCode([
      {
        name: '/#__cloud__/bad',
        nodes: [
          { id: 'broken', type: 'JavaScriptFunction', parameters: { functionScript: 'Outputs.x = (;' } },
          { id: 'sloppy', type: 'JavaScriptFunction', parameters: { functionScript: 'with (Inputs) { Outputs.x = a; }' } },
          { id: 'ok', type: 'Expression', parameters: { expression: 'a * 2' } }
        ]
      }
    ]);
    expect(print.map((e) => e.sites[0].nodeId)).toEqual(['ok']);
    expect(refusals.map((r) => r.nodeId)).toEqual(['broken', 'sloppy']);
    expect(refusalSentence(refusals[1])).toMatch(/^The Function node "sloppy" in the cloud function "bad" cannot run on Cloudflare: .*strict mode/);
  });

  test('a body that would close the printed function early is refused, never printed', () => {
    const { print, refusals } = collectCode([
      { name: '/#__cloud__/x', nodes: [{ id: 'esc', type: 'JavaScriptFunction', parameters: { functionScript: '}); globalThis.pwned = 1; (function(){' } }] }
    ]);
    expect(print).toEqual([]);
    expect(refusals[0].reason).toMatch(/does not compile/);
  });

  test("the Logic Builder's list in the node is the list the printer prints with", () => {
    // Compiled the node's own way (no table: new Function), its parameter list is in the function's text.
    const node = (LogicBuilder as unknown as { node: { methods: { _compileFunction: (this: unknown) => () => unknown } } }).node;
    const fn = node.methods._compileFunction.call({ _internal: { generatedCode: 'return 1;' } });
    const declared = String(fn).slice(String(fn).indexOf('(') + 1, String(fn).indexOf(')')).split(',').map((s) => s.trim());
    expect(declared).toEqual(LOGIC_BUILDER_PARAMS);
  });
});
