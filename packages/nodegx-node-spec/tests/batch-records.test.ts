/**
 * NSP-014 — the record nodes on the interpreter, through the world's BACKEND seam (world.ts; R9, ruled 2026-10-02:
 * the request, not the wire).
 *
 *   AC1–4 (as NSP-011 §4): every batch spec with a reducer conforms on the interpreter against its own scenarios,
 *          with every mutant killed or declared and no reducer unreached — on TWO seeds, because a mutant one seed's
 *          sequences kill and another's do not is a hole a hand scenario must close (s21: the relation pair's
 *          `repeaterComponent` mutant, killed at 13, alive at 20728). The runtime-side reading is
 *          packages/noodl-runtime/test/node-spec/conformance.test.ts.
 *   AC5    every failure path the node can meet before or after its call has a scenario asserting the outcome AND
 *          the Error text — checked here by counting, per spec, the distinct Error values its scenarios record.
 *   AC6    the call is asserted (the `backend` event, with its args), and a scenario proves NO call is made when
 *          the node's inputs are not ready — beside a scenario that makes one (the known-firing control).
 */

import type { TraceEvent } from '../src';
import { EQUIVALENT_MUTANTS, interpreterAdapter, loadScenarios, play, runConformance, specs, World } from '../src';

const BATCH = ['DeleteDbModelProperties', 'AddDbModelRelation', 'RemoveDbModelRelation', 'NewDbModelProperties', 'SetDbModelProperties', 'DbModel2'];

describe('NSP-014 — every batch spec conforms on the interpreter: scenarios, 200 sequences on two seeds, every mutant killed or declared', () => {
  for (const type of BATCH) {
    for (const seed of [13, 20728]) {
      test(`${type} (seed ${seed})`, async () => {
        const spec = specs[type];
        expect(spec).toBeDefined();
        const report = await runConformance(spec, interpreterAdapter({ resolve: () => spec }), { sequences: 200, seed, mutants: true, equivalent: EQUIVALENT_MUTANTS[type] });
        expect(report.refused).toBeUndefined();
        expect(report.scenarios.filter((s) => s.status !== 'passed').map((s) => `${s.name}: ${s.reason ?? JSON.stringify(s.difference)}`)).toEqual([]);
        expect(report.generated.divergences).toEqual([]);
        expect(report.mutants!.survivors.map((m) => `${m.reducer} ${m.kind} ${m.branch}`)).toEqual([]);
        expect(report.mutants!.unreached).toEqual([]);
        expect(report.conforms).toBe(true);
      }, 120_000);
    }
  }
});

describe('NSP-014 AC5 / AC6 — failures carry their sentence; a call is made only when the inputs are ready, beside one that is', () => {
  const traces = async (type: string): Promise<Array<{ name: string; trace: TraceEvent[] }>> => {
    const spec = specs[type];
    const out: Array<{ name: string; trace: TraceEvent[] }> = [];
    for (const sc of loadScenarios(type)) out.push({ name: sc.name, trace: await play(interpreterAdapter({ resolve: () => spec }), type, sc.params, sc.steps, new World(sc.world)) });
    return out;
  };

  test.each([
    ['DeleteDbModelProperties', ['No class name specified', 'Missing Record Id', 'Forbidden', 'Failed to delete.']],
    ['AddDbModelRelation', ['No class specified', 'No relation property specified', 'No target record Id (the record to add a relation to) specified', 'No record Id specified (the record that should get the relation)', 'Relation not found', 'Failed to add relation.']],
    ['RemoveDbModelRelation', ['No class specified', 'No relation property specified', 'No target record Id (the record to remove a relation from) specified', 'No record Id specified (the record that should lose the relation)', 'Relation not found', 'Failed to remove relation.']],
    // s22
    ['NewDbModelProperties', ['No class name specified', 'Duplicate value', 'Failed to insert.']],
    [
      'SetDbModelProperties',
      [
        'No class name specified',
        'Missing Record Id',
        'Forbidden',
        'Failed to save.',
        'Someone else changed this record after it was read, so this update was not applied. Fetch the record again, then retry.',
        'Only If Unchanged names "nothere", which this record has not been read with. Fetch the record first.',
        'Only If Unchanged names "tags", which holds an object or list. Name a plain value such as a version number.'
      ]
    ],
    // s23 — the read
    ['DbModel2', ['Missing Id.', 'Forbidden', 'Failed to fetch.']]
  ])('%s: every failure sentence is on Error beside a Failure outcome in some scenario, and so is the not-configured backend', async (type, sentences) => {
    const all = await traces(type);
    const errors = new Set<string>();
    for (const { trace } of all) {
      const failed = trace.some((e) => e.t === 'outcome' && e.value === 'failure');
      for (const e of trace) if (failed && e.t === 'value' && e.port === 'error') errors.add(String((e as { value: unknown }).value));
    }
    for (const s of sentences) expect([...errors]).toContain(s);
    expect([...errors].some((e) => e.startsWith('The backend this node is set to ("nope")'))).toBe(true);
  });

  test.each(BATCH)('%s: a scenario that calls the backend (the control) and one that does not (inputs not ready) — both observed', async (type) => {
    const all = await traces(type);
    const calls = all.filter((x) => x.trace.some((e) => e.t === 'backend'));
    const none = all.filter((x) => !x.trace.some((e) => e.t === 'backend') && x.trace.some((e) => e.t === 'outcome' && e.value === 'failure'));
    expect(calls.length).toBeGreaterThan(0);
    expect(none.length).toBeGreaterThan(0);
    // the call carries the contract's words: the op and the Class as `collection`
    const ev = calls[0].trace.find((e) => e.t === 'backend') as TraceEvent & { op: string; args: Record<string, unknown> };
    const op: Record<string, string> = { DeleteDbModelProperties: 'delete', AddDbModelRelation: 'addRelation', RemoveDbModelRelation: 'removeRelation', NewDbModelProperties: 'create', SetDbModelProperties: 'save', DbModel2: 'fetch' };
    expect(ev.op).toBe(op[type]);
    expect(typeof ev.args.collection).toBe('string');
  });
});
