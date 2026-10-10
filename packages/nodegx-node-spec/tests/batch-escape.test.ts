/**
 * NSP-017 — the escape hatches on the interpreter (the runtime-side reading is packages/noodl-runtime/test/node-spec/conformance.test.ts).
 *
 *   every batch spec conforms on the interpreter against its own scenarios, with every mutant killed or declared equivalent and no
 *   reducer unreached; and the Expression's text runs as the runtime runs it — JavaScript, the preamble's Math shortcuts, the ports
 *   the runtime's lexer names (NSP-017 §6.1).
 */

import { Expression } from '../src/nodes';
import { EQUIVALENT_MUTANTS, interpreterAdapter, runConformance, specs } from '../src';

const BATCH = ['Expression', 'JavaScriptFunction', 'Javascript2', 'Logic Builder'];

describe('NSP-017 — every batch spec conforms on the interpreter: scenarios, 200 sequences, every mutant killed or declared', () => {
  for (const type of BATCH) {
    test(`${type}`, async () => {
      const spec = specs[type];
      expect(spec).toBeDefined();
      const report = await runConformance(spec, interpreterAdapter({ resolve: () => spec }), { sequences: 200, seed: 13, mutants: true, equivalent: EQUIVALENT_MUTANTS[type] });
      expect(report.refused).toBeUndefined();
      expect(report.scenarios.filter((s) => s.status === 'failed' || s.status === 'refused').map((s) => `${s.name}: ${s.reason ?? JSON.stringify(s.difference)}`)).toEqual([]);
      expect(report.scenarios.length).toBeGreaterThanOrEqual(4);
      expect(report.generated.divergences).toEqual([]);
      expect(report.mutants!.survivors.map((m) => `${m.reducer} ${m.kind} ${m.branch}`)).toEqual([]);
      expect(report.mutants!.unreached).toEqual([]);
      expect(report.mutants!.total).toBeGreaterThan(0);
      for (const e of report.mutants!.equivalent) expect(`${type}: ${e.why} ×${e.count}`).not.toMatch(/×0$/);
      expect(report.conforms).toBe(true);
    }, 120_000);
  }
});

describe('NSP-017 §6.1 — the Expression runs its text as JavaScript, with the ports the lexer names', () => {
  test('the ports an editor draws: each name read, once, in order, with its checkbox; JavaScript and the Math shortcuts are not ports', () => {
    expect(Object.keys(Expression.derived!.inputs({ expression: 'String(n) + max(a, pi) + typeof b + a' }, {}))).toEqual(['n', 'runOnChange-n', 'a', 'runOnChange-a', 'b', 'runOnChange-b']);
    // a declared input's name is never derived: the runtime mints no input for it (the editor still draws one — row C145)
    expect(Object.keys(Expression.derived!.inputs({ expression: 'run + expression' }, {}))).toEqual([]);
  });

  test('a text over two ports: a template literal and a Math shortcut — JavaScript as the engine runs it', async () => {
    const t = interpreterAdapter();
    const h = await t.mount('Expression', { expression: '`${a}:${round(b)}`' });
    t.set(h, 'a', 'x');
    t.set(h, 'b', 2.6);
    await t.settle();
    const values = t.trace(h).filter((e) => e.t === 'value' && e.port === 'result');
    // the placing and the evaluation land in one settle: Result's `null` before the first answer is never on the wire here
    expect(values).toEqual([{ t: 'value', port: 'result', value: 'x:3' }]);
  });
});
