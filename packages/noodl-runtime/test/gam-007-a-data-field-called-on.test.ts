/**
 * GAM-007 (P78 D64) — a data field called `on`, `get` or `data` reads as the data, or is named.
 *
 * Rocket School's hangar drew no tiles: a shelf row's `on` field came back as the record's event
 * method, and the script threw `Cannot read properties of undefined (reading 'part')`. All 252 gates
 * passed, because every gate fed the script plain JSON.
 *
 * 🔴 So every row here goes through a real `Collection.set`, the way Static Data hands its rows to a
 * Function (`staticdata.ts` → `collection.set` → `Model.create`). A plain object cannot see this.
 *
 * 🔒 R8 (Richard, 2026-09-14): C. The names are reserved loudly now, and data wins later. So the
 * proxy trap stays exactly as it is, and this file pins that it does.
 */
import Collection = require('../src/collection');
import Model = require('../src/model');

type Row = Record<string, unknown>;

/** A value no member of a record could be. */
const SENTINEL = Object.freeze({ gam007: 'the data' });

/** Rows as a Function receives them from Static Data. */
function throughCollection(rows: Row[]): Row[] {
  const collection = Collection.get();
  collection.set(rows);
  return rows.map((_, i) => collection.get(i) as unknown as Row);
}

/**
 * Every name a record could answer for itself: the whole prototype chain of a raw Model (so
 * `Object.prototype` too), and a raw record's own fields once `on` has run and `_class` is set.
 * These are candidates only. Whether one shadows is read off a real row below, never assumed.
 */
function candidateNames(): string[] {
  const RawModel = Model as unknown as new (id: string, data: Row) => Row & {
    on(event: string, listener: () => void): void;
  };
  const raw = new RawModel('gam-007-probe', {});
  raw.on('change', () => undefined);
  raw._class = 'probe';
  const names = new Set<string>(Object.getOwnPropertyNames(raw));
  for (let p = Object.getPrototypeOf(raw); p; p = Object.getPrototypeOf(p)) {
    for (const n of Object.getOwnPropertyNames(p)) names.add(n);
  }
  names.add('__proto__');
  return [...names].sort();
}

type Condition = 'fresh' | 'after on()' | 'after _class';

/** Whether a row carrying `name` reads back something other than its data, and when. */
function shadowedWhen(name: string): Condition[] {
  const when: Condition[] = [];
  const read = (prepare: (row: Row) => void): boolean => {
    const [row] = throughCollection([{ [name]: SENTINEL }]);
    prepare(row);
    return row[name] !== SENTINEL;
  };
  if (read(() => undefined)) when.push('fresh');
  if (read((row) => (row.on as (e: string, l: () => void) => void)('change', () => undefined))) when.push('after on()');
  if (
    read((row) => {
      row._class = 'probe';
    })
  )
    when.push('after _class');
  return when;
}

describe('GAM-007 AC1 — at HEAD, a row field named like a record member reads as the member', () => {
  it('`on` reads as a function, and `faces` beside it reads the data (known-firing)', () => {
    const [row] = throughCollection([{ on: { 'pixel-art': { part: 'hat' } }, faces: { 'pixel-art': { part: 'hat' } } }]);
    expect(typeof row.on).toBe('function');
    expect((row.faces as Row)['pixel-art']).toEqual({ part: 'hat' });
  });

  it('the D64 script shape throws on `on` and draws on `faces`', () => {
    const shelf = [{ id: 'cap', on: { 'pixel-art': { part: 'hat' } } }];
    const renamed = [{ id: 'cap', faces: { 'pixel-art': { part: 'hat' } } }];
    const tiles = (rows: Row[], field: string) =>
      rows.map((r) => ((r[field] as Record<string, Row>)['pixel-art'] as Row).part);
    expect(() => tiles(throughCollection(shelf), 'on')).toThrow("Cannot read properties of undefined (reading 'part')");
    expect(tiles(throughCollection(renamed), 'faces')).toEqual(['hat']);
  });

  it('`Object.keys` lists the field, so a check that inspects keys passes on the broken record (§7)', () => {
    const [row] = throughCollection([{ on: SENTINEL }]);
    expect(Object.keys(row)).toContain('on');
    expect(row.on).not.toBe(SENTINEL);
  });
});

describe('GAM-007 AC2 — the list is read off the runtime, not typed', () => {
  const derived = () =>
    candidateNames()
      .map((name) => ({ name, when: shadowedWhen(name) }))
      .filter((r) => r.when.length > 0);

  it('prints the derived list (recorded in GAM-007 §8)', () => {
    const rows = derived();
    // eslint-disable-next-line no-console
    console.log('GAM-007 AC2 derived:\n' + rows.map((r) => `${r.name}\t${r.when.join(', ')}`).join('\n'));
    expect(rows.length).toBeGreaterThan(0);
  });

  it('known-firing and safe arms: `on`, `get`, `data` shadow; `id` and `faces` read their data', () => {
    const names = new Set(derived().map((r) => r.name));
    expect([names.has('on'), names.has('get'), names.has('data'), names.has('toString')]).toEqual([true, true, true, true]);
    expect(shadowedWhen('faces')).toEqual([]);
    expect(candidateNames()).toContain('id');
    expect(names.has('id')).toBe(false);
  });

  it('`listeners` shadows only once something has called `on`, and `_class` only once it is set', () => {
    expect(shadowedWhen('listeners')).toEqual(['after on()']);
    expect(shadowedWhen('_class')).toEqual(['after _class']);
  });

  it('`Model.isReservedFieldName` answers exactly the derived list, so the runtime check cannot drift from the trap', () => {
    const isReserved = (Model as unknown as { isReservedFieldName?: (name: string) => boolean }).isReservedFieldName;
    expect(typeof isReserved).toBe('function');
    const derivedNames = derived().map((r) => r.name);
    expect(candidateNames().filter((n) => isReserved!(n))).toEqual(derivedNames);
    expect(['faces', 'id', 'title', 'part'].map((n) => isReserved!(n))).toEqual([false, false, false, false]);
  });
});

/**
 * 🔒 R8's B, the runtime half: `Collection.set` says so, naming the field and the row. The trap is
 * unchanged, so the row still reads as the member. That is C's "data wins later", not this task.
 *
 * No `NodeContext` is built in this file, so `raiseUnattributedRuntimeError` falls back to
 * `console.error`, which is the channel every deployed app without an `On App Error` node has.
 */
describe('GAM-007 AC4 (B, runtime) — Collection.set names a reserved row field', () => {
  const CODE = 'collection/reserved-field-name';
  let errors: jest.SpyInstance;
  beforeEach(() => {
    errors = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => errors.mockRestore());

  const raised = () =>
    errors.mock.calls
      .map((args) => args[1] as { code?: string; detail?: { field?: string; row?: number } } | undefined)
      .filter((event) => event?.code === CODE)
      .map((event) => ({ field: event!.detail?.field, row: event!.detail?.row }));

  it('a row with `on` raises one error naming the field and the row; a row with `faces` beside it raises none', () => {
    throughCollection([{ id: 'glasses', faces: SENTINEL }]);
    expect(raised()).toEqual([]);
    throughCollection([{ id: 'glasses', faces: SENTINEL }, { id: 'cap', on: SENTINEL }]);
    expect(raised()).toEqual([{ field: 'on', row: 1 }]);
    const message = String(errors.mock.calls.find((args) => (args[1] as { code?: string })?.code === CODE)?.[0]);
    expect(message).toContain('"on"');
    expect(message).toContain('row 1');
  });

  it('twelve rows carrying `on` raise once, and `on` plus `data` raise once each', () => {
    throughCollection(Array.from({ length: 12 }, (_, i) => ({ id: `r${i}`, on: SENTINEL })));
    expect(raised()).toEqual([{ field: 'on', row: 0 }]);
    errors.mockClear();
    throughCollection([{ faces: SENTINEL }, { data: SENTINEL, on: SENTINEL }]);
    expect(raised()).toEqual([
      { field: 'data', row: 1 },
      { field: 'on', row: 1 }
    ]);
  });

  it('`id` is not reserved, and the trap is unchanged: `on` still reads as the member', () => {
    const [row] = throughCollection([{ id: 'cap', on: SENTINEL }]);
    expect(raised().map((r) => r.field)).toEqual(['on']);
    expect(typeof row.on).toBe('function');
    expect(row.id).toBe('cap');
  });

  it('setting the same row objects again does not raise again (F50 keeps the record)', () => {
    const rows = [{ on: SENTINEL }];
    const collection = Collection.get();
    collection.set(rows);
    collection.set(rows);
    expect(raised()).toEqual([{ field: 'on', row: 0 }]);
  });
});
