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
 *          (s25) Filter Records makes no call at all ("one subscription, no requests"): no scenario of it records a
 *          `backend` event — beside one where a save made elsewhere re-runs it (the store is reached; the control).
 */

import type { TraceEvent } from '../src';
import { EQUIVALENT_MUTANTS, interpreterAdapter, loadScenarios, play, runConformance, specs, World } from '../src';

const BATCH = ['DeleteDbModelProperties', 'AddDbModelRelation', 'RemoveDbModelRelation', 'NewDbModelProperties', 'SetDbModelProperties', 'DbModel2', 'DbCollection2'];

/** s25 — Filter Records: no backend call, so graded here but not in the AC6 call table below */
/** s26 — the user nodes (world.ts AUTH): calls without a `collection`, so their AC5 / AC6 tests are their own, below */
const USERS = ['net.noodl.user.User', 'net.noodl.user.SetUserProperties'];
const CONFORMING = [...BATCH, 'FilterDBModels', ...USERS];

describe('NSP-014 — every batch spec conforms on the interpreter: scenarios, 200 sequences on two seeds, every mutant killed or declared', () => {
  for (const type of CONFORMING) {
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

/** A failure as the node reports it: the outcome contract's, or — on Query Records, which predates ERG-001 — its plain `Failure` pulse. */
const isFailure = (e: TraceEvent) => (e.t === 'outcome' && e.value === 'failure') || (e.t === 'signal' && e.port === 'failure');

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
    ['DbModel2', ['Missing Id.', 'Forbidden', 'Failed to fetch.']],
    ['DbCollection2', ['Unknown class', 'Failed to fetch.']]
  ])('%s: every failure sentence is on Error beside a Failure outcome in some scenario, and so is the not-configured backend', async (type, sentences) => {
    const all = await traces(type);
    const errors = new Set<string>();
    for (const { trace } of all) {
      const failed = trace.some(isFailure);
      for (const e of trace) if (failed && e.t === 'value' && e.port === 'error') errors.add(String((e as { value: unknown }).value));
    }
    for (const s of sentences) expect([...errors]).toContain(s);
    expect([...errors].some((e) => e.startsWith('The backend this node is set to ("nope")'))).toBe(true);
  });

  test.each(BATCH)('%s: a scenario that calls the backend (the control) and one that does not (inputs not ready) — both observed', async (type) => {
    const all = await traces(type);
    const calls = all.filter((x) => x.trace.some((e) => e.t === 'backend'));
    const none = all.filter((x) => !x.trace.some((e) => e.t === 'backend') && x.trace.some(isFailure));
    expect(calls.length).toBeGreaterThan(0);
    expect(none.length).toBeGreaterThan(0);
    // the call carries the contract's words: the op and the Class as `collection`
    const ev = calls[0].trace.find((e) => e.t === 'backend') as TraceEvent & { op: string; args: Record<string, unknown> };
    const op: Record<string, string> = { DeleteDbModelProperties: 'delete', AddDbModelRelation: 'addRelation', RemoveDbModelRelation: 'removeRelation', NewDbModelProperties: 'create', SetDbModelProperties: 'save', DbModel2: 'fetch', DbCollection2: 'query' };
    expect(ev.op).toBe(op[type]);
    expect(typeof ev.args.collection).toBe('string');
  });

  // s26 — the user nodes: the AUTH operation is the call (no collection); every failure sentence is on Error beside a
  // Failure; the not-configured Backend makes no call — beside a scenario that makes one (the control)
  test.each([
    ['net.noodl.user.User', 'fetchCurrentUser', ['Nobody is signed in.', 'HTTP 503: {}', 'Token expired.', 'Failed to fetch.', 'The backend this node is set to ("gone") is not configured in this project.']],
    ['net.noodl.user.SetUserProperties', 'setUserProperties', ['Nobody is signed in.', 'Forbidden', 'The backend this node is set to ("gone") is not configured in this project.']]
  ])('%s: every failure sentence on Error beside a Failure; the call is %s — and a scenario makes none', async (type, op, sentences) => {
    const all = await traces(type);
    const errors = new Set<string>();
    for (const { trace } of all) {
      const failed = trace.some(isFailure);
      for (const e of trace) if (failed && e.t === 'value' && e.port === 'error') errors.add(String((e as { value: unknown }).value));
    }
    for (const sentence of sentences) expect([...errors]).toContain(sentence);
    const calls = all.filter((x) => x.trace.some((e) => e.t === 'backend'));
    const none = all.filter((x) => !x.trace.some((e) => e.t === 'backend') && x.trace.some(isFailure));
    expect(calls.length).toBeGreaterThan(0);
    expect(none.map((x) => x.name).some((n) => n.includes('does not have'))).toBe(true);
    for (const { trace } of calls) for (const e of trace) if (e.t === 'backend') expect((e as TraceEvent & { op: string }).op).toBe(op);
  });

  // s25 — Filter Records
  test('FilterDBModels: every failure sentence is on Error beside a failure, and no scenario calls a backend — beside a save made elsewhere that re-runs it', async () => {
    const all = await traces('FilterDBModels');
    const errors = new Set<string>();
    for (const { trace } of all) {
      const failed = trace.some(isFailure);
      for (const e of trace) if (failed && e.t === 'value' && e.port === 'error') errors.add(String((e as { value: unknown }).value));
    }
    expect([...errors]).toContain('Nothing to filter — no records are connected to the Items input');
    expect([...errors]).toContain('The filter could not be applied: model.get is not a function');
    expect([...errors].filter((e) => e.startsWith('The filter could not be applied: ') && !e.includes('.get is not a function')).length).toBeGreaterThan(0); // the refused pointsTo
    expect(all.filter((x) => x.trace.some((e) => e.t === 'backend')).map((x) => x.name)).toEqual([]);
    // the control: the store reached — a run (Filtered) in the frame after an advance that delivered a save
    const frameAfter = (trace: TraceEvent[], i: number) => {
      const start = trace.findIndex((x, k) => k > i && x.t === 'settle');
      if (start < 0) return [];
      const end = trace.findIndex((x, k) => k > start && x.t === 'settle');
      return trace.slice(start + 1, end < 0 ? undefined : end);
    };
    const reRunByASave = all.filter(({ trace }) => trace.some((e, i) => e.t === 'advance' && frameAfter(trace, i).some((x) => x.t === 'signal' && x.port === 'modified')));
    expect(reRunByASave.length).toBeGreaterThan(0);
  });
});
