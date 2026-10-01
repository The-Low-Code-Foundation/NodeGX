/**
 * NSP-012 — the second batch (arrays, objects, variables, stores) on the interpreter, and the
 * seam the format grew for it: the REGISTRY (registry.ts) — shared records and arrays a reducer
 * reads and writes through the world, watched entries notifying a spec's `change` handler, derived
 * OUTPUTS, and the two wire forms (a record as its data plus `id`; an array as `{ $array, items }`).
 *
 *   - every batch spec conforms on the interpreter against its own scenarios, every mutant killed,
 *     no reducer unreached (the runtime-side reading is
 *     packages/noodl-runtime/test/node-spec/conformance.test.ts);
 *   - the registry's rules, pinned one by one against the sentences in registry.ts's header;
 *   - AC6: an Array node's `items` on the wire keeps its name across an in-place mutation and
 *     Array Filter's gets a new one on every run — the difference the trace can grade;
 *   - the findings NSP-012 §6 records, each pinned to the interpreter so the row cannot drift.
 */

import { EQUIVALENT_MUTANTS, interpreterAdapter, run, runConformance, specs, World } from '../src';
import { Collection2, FilterCollection, Model2, SetVariable, StaticData, Variable2 } from '../src/nodes';
import { canonicalise } from '../src/canonical';

const BATCH = ['Collection2', 'CollectionNew', 'CollectionClear', 'CollectionInsert', 'CollectionRemove', 'Filter Collection', 'Map Collection', 'Model2', 'NewModel', 'SetModelProperties', 'Static Data', 'Variable2', 'Set Variable'];

describe('NSP-012 — every batch spec conforms on the interpreter: scenarios, 200 sequences, every mutant killed', () => {
  for (const type of BATCH) {
    test(`${type}`, async () => {
      const spec = specs[type];
      expect(spec).toBeDefined();
      const report = await runConformance(spec, interpreterAdapter({ resolve: () => spec }), { sequences: 200, seed: 12, mutants: true, equivalent: EQUIVALENT_MUTANTS[type] });
      expect(report.scenarios.filter((s) => s.status === 'failed' || s.status === 'refused').map((s) => `${s.name}: ${s.reason ?? ''}`)).toEqual([]);
      expect(report.scenarios.length).toBeGreaterThanOrEqual(3);
      expect(report.generated.divergences).toEqual([]);
      expect(report.mutants!.survivors.map((m) => `${m.reducer} ${m.kind} ${m.branch}`)).toEqual([]);
      expect(report.mutants!.unreached).toEqual([]);
      expect(report.mutants!.total).toBeGreaterThan(0);
      expect(report.conforms).toBe(true);
    }, 120_000);
  }
});

describe('the registry (registry.ts) — one play, one store', () => {
  test('a name is a rendezvous: two reads of one id are one record; a number and its string are one record', () => {
    const w = new World();
    const a = w.registry.model('x');
    a.set('k', 1);
    expect(w.registry.model('x').get('k')).toBe(1);
    expect(w.registry.model(7)).toBe(w.registry.model('7'));
    // the id is the RAW value that first named the entry; the key is its string
    expect(w.registry.model(7).getId()).toBe(7);
    expect(w.registry.model(null)).toBe(w.registry.model('null'));
    expect(w.registry.model(null).getId()).toBe(null);
  });
  test('an anonymous record draws a 10-character guid from the seeded stream, deterministic under the seed, and is reachable by that id afterwards', () => {
    const a = new World({ seed: 5 }).registry.model();
    const b = new World({ seed: 5 }).registry.model();
    expect(a.getId()).toHaveLength(10);
    expect(a.getId()).toBe(b.getId());
    const w = new World({ seed: 5 });
    const anon = w.registry.model();
    expect(w.registry.modelExists(anon.getId())).toBe(true);
    expect(w.registry.model(anon.getId())).toBe(anon);
    expect(w.registry.modelExists('never')).toBe(false);
  });
  test('a record notifies change per key when the value differs, or when forced; silent mutes; the Proxy reads and writes through', () => {
    const w = new World();
    const seen: unknown[] = [];
    w.registry.onRecord('r', (c) => seen.push(c));
    const r = w.registry.model('r');
    r.set('a', 1);
    r.set('a', 1);
    r.set('a', 1, { forceChange: true });
    r.set('b', 2, { silent: true });
    r.c = 3;
    expect(r.a).toBe(1);
    expect(seen).toEqual([
      { name: 'a', value: 1, old: undefined },
      { name: 'a', value: 1, old: 1 },
      { name: 'c', value: 3, old: undefined }
    ]);
    expect(r.toJSON()).toEqual({ a: 1, b: 2, c: 3, id: 'r' });
  });
  test('an array diffs in place: plain objects become records (the same object the same record), one change per set, none when nothing moved', () => {
    const w = new World({ seed: 3 });
    let changes = 0;
    w.registry.onCollection('c', () => changes++);
    const c = w.registry.collection('c');
    const row = { a: 1 };
    c.set([row, { a: 2 }]);
    expect(c.size()).toBe(2);
    expect(changes).toBe(1);
    const first = c.get(0)!;
    c.set([row]);
    expect(c.get(0)).toBe(first);
    expect(changes).toBe(2);
    c.set([row]);
    expect(changes).toBe(2);
    c.set([]);
    expect(changes).toBe(3);
    c.set([]);
    expect(changes).toBe(3);
    c.add(first);
    c.add(first);
    expect(c.size()).toBe(1);
    expect(changes).toBe(4);
  });
  test('the wire forms: a record is its data plus id; an array carries its name and its records', () => {
    const w = new World({ seed: 3 });
    const c = w.registry.collection('c');
    c.set([{ id: 'r1', a: 1 }]);
    expect(canonicalise(c)).toEqual({ $array: 'c', items: [{ a: 1, id: 'r1' }] });
    expect(canonicalise(w.registry.model('r1'))).toEqual({ a: 1, id: 'r1' });
    expect(canonicalise([1, 2])).toEqual([1, 2]);
  });
  test('the script seeds named records and arrays, and the seed is the whole starting state', () => {
    const w = new World({ registry: { models: { m1: { a: 1 } }, collections: { abc: ['m1'] } } });
    expect(w.registry.collection('abc').get(0)).toBe(w.registry.model('m1'));
    expect(w.registry.collectionExists('abc')).toBe(true);
    expect(w.registry.collectionExists('def')).toBe(false);
  });
});

describe('AC6 — mutated in place or replaced, graded from the trace', () => {
  const seeded = { registry: { models: { m1: { a: 1 }, m2: { a: 2 } }, collections: { abc: ['m1', 'm2'] } } };
  test('Array: a copy into the bound array keeps the name on the wire; Count moves and Items is not re-sent', () => {
    const t = run(Collection2, { collectionId: 'abc' }, ['settle', { set: 'items', value: [{ a: 9 }] }, 'settle'], new World(seeded));
    const items = t.filter((e) => e.t === 'value' && e.port === 'items');
    expect(items).toHaveLength(1);
    expect((items[0] as { value: { $array: string } }).value.$array).toBe('abc');
    const after = t.slice(t.lastIndexOf({ t: 'settle' } as never));
    expect(t.filter((e) => e.t === 'value' && e.port === 'count').map((e) => (e as { value: unknown }).value)).toEqual([2, 1]);
    expect(t.filter((e) => e.t === 'signal' && e.port === 'changed')).toHaveLength(1);
    expect(after).toBeDefined();
  });
  test('Array Filter: every run builds a new array — a new name on the wire each time', () => {
    const t = run(FilterCollection, { items: [{ a: 1 }, { a: 2 }] }, ['settle', { signal: 'refresh' }, 'settle'], new World({ seed: 2 }));
    const names = t.filter((e) => e.t === 'value' && e.port === 'items').map((e) => (e as { value: { $array: string } }).value.$array);
    expect(names).toHaveLength(2);
    expect(names[0]).not.toBe(names[1]);
  });
  test('Static Array: a parse replaces the array; a failed parse leaves it', () => {
    const t = run(StaticData, { type: 'json', json: '[{"a":1}]' }, ['settle', { set: 'json', value: 'nope' }, 'settle', { set: 'json', value: '[]' }, 'settle'], new World({ seed: 2 }));
    const names = t.filter((e) => e.t === 'value' && e.port === 'items').map((e) => (e as { value: { $array: string } }).value.$array);
    expect(names).toHaveLength(2);
    expect(names[0]).not.toBe(names[1]);
    expect(t.filter((e) => e.t === 'signal' && e.port === 'failure')).toHaveLength(1);
  });
});

describe('the shared record, from one node at a time (the two-node reading is the graph scenarios)', () => {
  test('Set Variable writes a key the Variable node reads: the seeded registry carries it across plays of one world', () => {
    const w = new World();
    run(SetVariable, { name: 'x', value: 5 }, [{ signal: 'do' }, 'settle'], w);
    const t = run(Variable2, { name: 'x' }, ['settle'], w);
    expect(t).toContainEqual({ t: 'value', port: 'value', value: 5 });
  });
  test('Object: a property written by one node is what a second node bound to the same id reads', () => {
    const w = new World();
    run(Model2, { properties: 'a', modelId: 'm1' }, ['settle', { set: 'prop-a', value: 'hello' }, 'settle'], w);
    const t = run(Model2, { properties: 'a', modelId: 'm1' }, ['settle'], w);
    expect(t).toContainEqual({ t: 'value', port: 'prop-a', value: 'hello' });
    expect(t).toContainEqual({ t: 'value', port: 'object', value: { a: 'hello', id: 'm1' } });
  });
});
