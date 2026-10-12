/**
 * P109 ISL-006 AC6/AC9 — the exporter reads a Function's ports the way the runtime's Function node does.
 *
 * Both import `@nodegx/project-contract/function-ports` now (the runtime's `simplejavascript.ts` and this package's
 * `jsfun.ts`), so agreement is by construction. This file pins the one place they may still part, the mapping in
 * `functionMinedPortsOf`, over the shapes ruling 3 decided and the ones a comment strip must not break. Until ISL-006
 * `jsfun.ts` held "verbatim clones" of the runtime's regexes that no test compared (s19 added the first comparison
 * against the old parser; slice 2 moved both readers onto the shared module).
 *
 * The one deliberate difference is asserted on its own: the exporter also reads `Outputs.x.send()` as a signal, the
 * documented second spelling, where the runtime's reader makes `x` a `*` value port.
 */
import { functionScriptPortNames } from '@nodegx/project-contract/function-ports';

import { functionMinedPortsOf } from '../src/analyze/jsfun';

const sorted = (m: { inputs: string[]; outputs: string[]; signals: string[] }) => ({
  inputs: [...m.inputs].sort(),
  outputs: [...m.outputs].sort(),
  signals: [...m.signals].sort()
});

const CORPUS = [
  'const a = Inputs.amount;\nOutputs.formatted = a;\nOutputs.done();',
  "Outputs.total = Inputs['unit price'] * Inputs.qty;",
  'Outputs["Ready"]();\nOutputs.Failure();',
  'Outputs["payload"] = { ok: true };',
  'const snake_case = Inputs.first_name + Inputs.last_name;\nOutputs.full_name = snake_case;',
  // Ruling 3's shapes, and the strings a comment strip must leave alone.
  'Outputs.do_it();',
  'const both = Inputs["a"] + Inputs["b"];',
  '// Inputs.commented\n/* Outputs.gone */\nOutputs.x = 1;',
  'const url = "https://api.example.com/v1/" + Inputs.id;\nOutputs.ok = true;',
  "const k = 'c';\nOutputs[k] = 1;\nconst v = Inputs[k];",
  '',
  'const nothing = 1;'
];

describe('ISL-006 — the exporter mines a Function the way the runtime does', () => {
  it.each(CORPUS.map((s) => [JSON.stringify(s).slice(0, 60), s]))('%s', (_label, script) => {
    expect(sorted(functionMinedPortsOf(script))).toEqual(sorted(functionScriptPortNames(script)));
  });

  it('not vacuous: ruling 3 holds here too', () => {
    expect(functionMinedPortsOf('Outputs.do_it();').signals).toEqual(['do_it']);
    expect(functionMinedPortsOf('const both = Inputs["a"] + Inputs["b"];').inputs).toEqual(['a', 'b']);
    expect(functionMinedPortsOf('// Inputs.commented\nOutputs.x = 1;').inputs).toEqual([]);
    expect(functionMinedPortsOf('f("https://x.io/" + Inputs.id)').inputs).toEqual(['id']);
  });

  it('the one deliberate difference: `Outputs.x.send()` is a signal to the exporter, a value to the runtime', () => {
    const script = 'Outputs.ready.send();';
    expect(functionMinedPortsOf(script).signals).toEqual(['ready']);
    expect(functionScriptPortNames(script)).toEqual({ inputs: [], signals: [], outputs: ['ready'] });
  });
});
