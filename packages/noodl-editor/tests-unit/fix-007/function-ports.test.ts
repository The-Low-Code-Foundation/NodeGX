/**
 * FIX-007 — the wire to a Function node's display label.
 *
 * Two things are graded here, and the first is the reason the second is allowed
 * to exist:
 *
 *  1. **Agreement with the Function's reader.** Since P109 ISL-006 `functionPorts.ts`
 *     holds no regexes: it reads `@nodegx/project-contract/function-ports`, the
 *     module the runtime's Function node imports. This file pins the mapping,
 *     and pins where that reader parts from the old shared one
 *     (`javascriptnodeparser.js`, still used by the Script node and the filters):
 *     on exactly the rows ruling 3 changed. The old parser is loaded here as a
 *     test-time dependency, not a product one.
 *
 *  2. **The check itself**, with its negative controls. The mistake is invisible
 *     to everything else we own — a bare `toProperty: "amount"` is four
 *     well-formed strings to zod, a runtime-discovered port to the semantic
 *     validator, and a red canvas warning to the user an hour later.
 */

import { functionScriptPortNames } from '@nodegx/project-contract/function-ports';

import { loadDefaultCatalog } from '../../src/editor/src/validation/catalog';
import { DiagnosticCode } from '../../src/editor/src/validation/diagnostics';
import {
  checkFunctionNodePorts,
  mineFunctionScriptPorts,
  FUNCTION_INPUT_PREFIX,
  FUNCTION_OUTPUT_PREFIX
} from '../../src/editor/src/validation/functionPorts';

const catalog = loadDefaultCatalog();

/** Scripts chosen to exercise every regex family, plus the shapes that trip them. */
const CORPUS: string[] = [
  'const a = Inputs.amount;\nOutputs.formatted = a;\nOutputs.done();',
  "Outputs.total = Inputs['unit price'] * Inputs.qty;",
  'Outputs["Ready"]();\nOutputs.Failure();',
  'Outputs["payload"] = { ok: true };',
  '// Inputs.commented is mined too — the parser does not strip comments\nOutputs.x = 1;',
  'const snake_case = Inputs.first_name + Inputs.last_name;\nOutputs.full_name = snake_case;',
  'await fetch(Inputs.url).then((r) => r.json()).then((j) => { Outputs.body = j; Outputs.Success(); });',
  'Outputs.done();', // a signal whose display name is also a declared port
  '', // no script
  'const nothing = 1;', // no ports at all
  // P109 ISL-006 — the shapes ruling 3 decided ("Fix all three"), plus the ones a comment strip must not break.
  'Outputs.do_it();', // a signal now; the old reader made a `*` value port (same name, so equal by name here)
  "const k = 'c';\nOutputs[k] = 1;\nconst v = Inputs[k];", // a computed key mints nothing, in either reader
  'const both = Inputs["a"] + Inputs["b"];', // two inputs now; the old reader made one, `a"] + Inputs["b`
  'const url = "https://api.example.com/v1/" + Inputs.id;\nOutputs.ok = true;', // a `//` in a string is no comment
  'const re = /https?:\\/\\//;\nOutputs.k = re.test(Inputs.s);', // nor in a regular expression
  '/* Outputs.gone = 1; */\nOutputs.kept = `a // ${Inputs.t}`;' // a block comment goes; a template keeps its text
];

/** The rows where ruling 3 says the Function's reader and the old shared reader name different ports. */
const RULED_DIFFERENCES = [
  '// Inputs.commented is mined too — the parser does not strip comments\nOutputs.x = 1;',
  'const both = Inputs["a"] + Inputs["b"];',
  '/* Outputs.gone = 1; */\nOutputs.kept = `a // ${Inputs.t}`;'
];

describe('FIX-007 — the mined port set agrees with the Function reader the runtime uses (P109 ISL-006)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const JavascriptNodeParser = require('../../../noodl-runtime/src/javascriptnodeparser');

  /** What the runtime actually registers, reduced to the two name sets. */
  function runtimePorts(script: string): { inputs: Set<string>; outputs: Set<string> } {
    const ports: { name: string; displayName: string; plug: string }[] = [];
    JavascriptNodeParser.parseAndAddPortsFromScript(script, ports, {
      inputPrefix: FUNCTION_INPUT_PREFIX,
      outputPrefix: FUNCTION_OUTPUT_PREFIX
    });
    const inputs = new Set<string>();
    const outputs = new Set<string>();
    for (const port of ports) {
      // `plug` is 'input' | 'inputs' | 'output' in the parser's own families.
      (port.plug.startsWith('input') ? inputs : outputs).add(port.displayName);
    }
    return { inputs, outputs };
  }

  it.each(CORPUS)('mines the names the Function reader makes: %j', (script) => {
    const theirs = functionScriptPortNames(script);
    const ours = mineFunctionScriptPorts(script);
    expect([...ours.inputs].sort()).toEqual([...theirs.inputs].sort());
    expect([...ours.outputs].sort()).toEqual([...theirs.signals, ...theirs.outputs].sort());
  });

  it('differs from the old shared reader on exactly the rows ruling 3 changed', () => {
    const differing = CORPUS.filter((script) => {
      const old = runtimePorts(script);
      const now = mineFunctionScriptPorts(script);
      const same = (a: Set<string>, b: Set<string>) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
      return !same(old.inputs, now.inputs) || !same(old.outputs, now.outputs);
    });
    expect(differing).toEqual(RULED_DIFFERENCES);
  });

  it('names the ports with the prefix, and displays them without it', () => {
    const ports: { name: string; displayName: string }[] = [];
    JavascriptNodeParser.parseAndAddPortsFromScript('const a = Inputs.amount;\nOutputs.formatted = a;', ports, {
      inputPrefix: FUNCTION_INPUT_PREFIX,
      outputPrefix: FUNCTION_OUTPUT_PREFIX
    });
    // The whole defect in one assertion: the two differ, and the panel shows the
    // one a connection must not use.
    expect(ports.map((p) => p.name).sort()).toEqual(['in-amount', 'out-formatted']);
    expect(ports.map((p) => p.displayName).sort()).toEqual(['amount', 'formatted']);
  });
});

const FUNCTION_NODE = {
  id: 'fn',
  type: 'JavaScriptFunction',
  label: 'Format as EUR',
  parameters: {
    functionScript: "const amount = Number(Inputs.amount) || 0;\nOutputs.formatted = String(amount);\nOutputs.done();"
  }
};

function check(wires: { fromId: string; fromProperty: string; toId: string; toProperty: string }[]) {
  return checkFunctionNodePorts([FUNCTION_NODE, { id: 'txt', type: 'Text' }], {
    component: '/Price Preview',
    wires,
    catalog
  });
}

describe('FIX-007 — a connection that names the display label', () => {
  it('rejects an input wired to the bare script name, and names the port it should be', () => {
    const [d, ...rest] = check([{ fromId: 'txt', fromProperty: 'text', toId: 'fn', toProperty: 'amount' }]);
    expect(rest).toHaveLength(0);
    expect(d.code).toBe(DiagnosticCode.UnprefixedFunctionPort);
    expect(d.severity).toBe('error');
    expect(d.message).toContain('"in-amount"');
    expect(d.suggestion).toContain('toProperty: "in-amount"');
    expect(d.location.connection?.toProperty).toBe('amount');
  });

  it('rejects an output wired to the bare script name', () => {
    const [d] = check([{ fromId: 'fn', fromProperty: 'formatted', toId: 'txt', toProperty: 'text' }]);
    expect(d.code).toBe(DiagnosticCode.UnprefixedFunctionPort);
    expect(d.suggestion).toContain('fromProperty: "out-formatted"');
  });

  // ── The negative controls ──────────────────────────────────────────────────

  it('says nothing about the correctly prefixed wire', () => {
    expect(
      check([
        { fromId: 'txt', fromProperty: 'text', toId: 'fn', toProperty: 'in-amount' },
        { fromId: 'fn', fromProperty: 'out-formatted', toId: 'txt', toProperty: 'text' }
      ])
    ).toEqual([]);
  });

  it('says nothing about the node\'s own declared ports, including one the script also names', () => {
    // `Outputs.done()` mines `done`, and `done` is *also* a declared signal
    // output. Wiring it is legitimate — this exclusion is what keeps the check
    // off working graphs, and it is why the prefix exists at all.
    expect(
      check([
        { fromId: 'txt', fromProperty: 'onClick', toId: 'fn', toProperty: 'run' },
        { fromId: 'fn', fromProperty: 'done', toId: 'txt', toProperty: 'text' },
        { fromId: 'fn', fromProperty: 'failure', toId: 'txt', toProperty: 'text' }
      ])
    ).toEqual([]);
  });

  it('says nothing about a name the script does not mention — it does not guess', () => {
    // The port rule's territory: could be legitimately runtime-created, could be
    // a typo. This check has no evidence either way, so it stays silent.
    expect(check([{ fromId: 'txt', fromProperty: 'text', toId: 'fn', toProperty: 'nowhere' }])).toEqual([]);
  });

  it('says nothing when there are no wires, and nothing about other node types', () => {
    expect(checkFunctionNodePorts([FUNCTION_NODE], { component: '/c', catalog })).toEqual([]);
    expect(
      checkFunctionNodePorts([{ id: 'js', type: 'Javascript2', parameters: { code: 'x' } }], {
        component: '/c',
        catalog,
        wires: [{ fromId: 'js', fromProperty: 'total', toId: 'txt', toProperty: 'text' }]
      })
    ).toEqual([]);
  });
});
