/**
 * NSP-016 — the VISUAL nodes on the interpreter (the reference): every spec that needs `person` conforms against its
 * own scenarios, 200 generated sequences and every mutant, at one fixed seed. The runtime target grades the same specs
 * in `noodl-runtime/test/node-spec/conformance.test.ts`; this is the cheap half, the one a format change to the acts
 * (`PersonPatch`, the drain) is caught by first. s37 ran these by hand at three seeds; s38 pinned one.
 */
import { EQUIVALENT_MUTANTS, formatReport, interpreterAdapter, runConformance, specs } from '../src';

const VISUAL = Object.values(specs)
  .filter((s) => s.needs?.includes('person'))
  .map((s) => s.type)
  .sort();

describe('NSP-016 — every visual spec conforms on the interpreter: scenarios, 200 sequences, every mutant killed or declared', () => {
  test('the batch is the specs that need a person', () => {
    expect(VISUAL).toEqual(['Circle', 'Drag', 'For Each', 'Group', 'Image', 'Page Stack', 'Radio Button Group', 'Router', 'Text', 'Video', 'net.noodl.controls.button', 'net.noodl.controls.checkbox', 'net.noodl.controls.options', 'net.noodl.controls.radiobutton', 'net.noodl.controls.range', 'net.noodl.controls.textinput', 'net.noodl.visual.columns', 'net.noodl.visual.icon']);
  });
  for (const type of VISUAL) {
    test(`${type}`, async () => {
      const spec = specs[type];
      const report = await runConformance(spec, interpreterAdapter({ resolve: () => spec }), { sequences: 200, seed: 13, mutants: true, equivalent: EQUIVALENT_MUTANTS[type] });
      if (!report.conforms) process.stdout.write(formatReport(report) + '\n');
      expect(report.scenarios.filter((s) => s.status === 'failed' || s.status === 'refused').map((s) => s.name)).toEqual([]);
      expect(report.generated.divergences).toEqual([]);
      expect(report.mutants!.survivors.map((m) => `${m.reducer} ${m.kind} ${m.branch}`)).toEqual([]);
      expect(report.mutants!.unreached).toEqual([]);
      expect(report.conforms).toBe(true);
    }, 300_000);
  }
});
