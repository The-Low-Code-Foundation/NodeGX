/**
 * NSP-002 AC2 — canonicalisation has its own table-driven spec: `-0`, `NaN`, `Date`, key order,
 * unit object. Every row of the table in canonical.ts's docblock is a row here.
 */

import { Blob as NodeBlob, File as NodeFile } from 'buffer';

import { canonicalise, canonicalKey, findNonCanonical, CanonicalError, StoredFile } from '../src';

describe('canonicalise — the table', () => {
  const rows: Array<[string, unknown, unknown]> = [
    ['a finite number is itself', 42.5, 42.5],
    ['0 is itself', 0, 0],
    ['-0 is tagged (Object.is, not ===)', -0, { $num: '-0' }],
    ['NaN is tagged', NaN, { $num: 'NaN' }],
    ['Infinity is tagged', Infinity, { $num: 'Infinity' }],
    ['-Infinity is tagged', -Infinity, { $num: '-Infinity' }],
    ['a string is itself', 'abc', 'abc'],
    ['a boolean is itself', false, false],
    ['null is itself', null, null],
    ['a Date is tagged with its ISO text', new Date('2026-09-30T12:00:00.000Z'), { $date: '2026-09-30T12:00:00.000Z' }],
    ['an invalid Date is tagged null', new Date('nope'), { $date: null }],
    ['an array is element-wise', [1, 'a', null], [1, 'a', null]],
    ['an undefined array element becomes null (JSON rule)', [1, undefined, 3], [1, null, 3]],
    ['object keys are sorted', { b: 1, a: 2 }, { a: 2, b: 1 }],
    ['sorting is recursive', { z: { y: 1, x: 2 } }, { z: { x: 2, y: 1 } }],
    ['an undefined value drops its key (JSON rule)', { a: undefined, b: 1 }, { b: 1 }],
    ['a unit object is kept whole (C10)', { value: 12, unit: 'px' }, { unit: 'px', value: 12 }],
    ['tags nest inside structures', { n: -0, d: [NaN] }, { d: [{ $num: 'NaN' }], n: { $num: '-0' } }],
    ['toJSON is honoured first', { toJSON: () => ({ q: 1, p: 2 }) }, { p: 2, q: 1 }],
    ['a class instance is its own enumerable keys, no class tag', new (class Model { b = 1; a = 2; })(), { a: 2, b: 1 }],
    ['top-level undefined stays undefined (the caller decides)', undefined, undefined],
    // NSP-014 s30 — the two file shapes
    // NSP-014 s34 — bytes are tagged and listed in order: a typed array's own keys sort "10" before "2", an ArrayBuffer has none
    ['an ArrayBuffer is its bytes', new Uint8Array([104, 105]).buffer, { $bytes: [104, 105] }],
    ['a typed array is the bytes it views, in order', new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]).subarray(1), { $bytes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }],
    ['a DataView is the bytes it views', new DataView(new Uint8Array([7, 8, 9]).buffer, 1, 1), { $bytes: [8] }],
    ['a TextEncoder result is its UTF-8 bytes', new TextEncoder().encode('é'), { $bytes: [195, 169] }],
    ['a File is tagged: name, size, type — no bytes, no lastModified', new NodeFile([new Uint8Array(3)], 'photo.png', { type: 'image/png', lastModified: 5 }), { $file: { name: 'photo.png', size: 3, type: 'image/png' } }],
    ['a bare Blob is tagged without a name', new NodeBlob(['ab'], { type: 'text/plain' }), { $file: { size: 2, type: 'text/plain' } }],
    ['a stored file is tagged from its getters, an absent field dropped', new StoredFile({ name: 'k_a.png', url: 'u', size: 0 }), { $cloudFile: { name: 'k_a.png', size: 0, url: 'u' } }],
    [
      'a stored file\'s target is canonical inside the tag',
      new StoredFile({ name: 'f', url: 'u', contentType: 'image/png', target: { kind: 'record', field: 'a', collection: 'c' } }),
      { $cloudFile: { contentType: 'image/png', name: 'f', target: { collection: 'c', field: 'a', kind: 'record' }, url: 'u' } }
    ],
    ['a plain object with a stored file\'s keys is a plain object', { url: 'u', name: 'f' }, { name: 'f', url: 'u' }]
  ];
  for (const [name, input, expected] of rows) {
    test(name, () => {
      expect(canonicalise(input)).toEqual(expected);
    });
  }

  test('a function, a symbol, a bigint and a cycle are refused with the path', () => {
    expect(() => canonicalise({ a: [() => 1] })).toThrow(CanonicalError);
    expect(() => canonicalise({ a: [() => 1] })).toThrow('$.a[0]');
    expect(() => canonicalise(Symbol('s'))).toThrow('$');
    expect(() => canonicalise({ big: 1n })).toThrow('$.big');
    const cyc: Record<string, unknown> = {};
    cyc.self = cyc;
    expect(() => canonicalise(cyc)).toThrow(/circular reference at \$\.self/);
  });
});

describe('canonicalKey — "did this value change"', () => {
  test('NaN equals NaN and -0 differs from 0', () => {
    expect(canonicalKey(NaN)).toBe(canonicalKey(NaN));
    expect(canonicalKey(-0)).not.toBe(canonicalKey(0));
  });
  test('key order does not matter; a Date and its ISO string are different values', () => {
    expect(canonicalKey({ a: 1, b: 2 })).toBe(canonicalKey({ b: 2, a: 1 }));
    expect(canonicalKey(new Date(0))).not.toBe(canonicalKey('1970-01-01T00:00:00.000Z'));
  });
  test('undefined has a key no JSON text can produce', () => {
    expect(canonicalKey(undefined)).toBe('undefined');
    expect(canonicalKey('undefined')).toBe('"undefined"');
  });
});

describe('findNonCanonical — is a value already in the form', () => {
  const ok: unknown[] = [1, 'a', null, true, [1, [2]], { a: 1, b: { c: 2 } }, { $num: 'NaN' }, { $date: null }, { $date: '2026-01-01T00:00:00.000Z' }];
  for (const v of ok) {
    test(`accepts ${JSON.stringify(v)}`, () => expect(findNonCanonical(v)).toBeNull());
  }
  const bad: Array<[unknown, string]> = [
    [NaN, '$'],
    [-0, '$'],
    [undefined, '$'],
    [{ b: 1, a: 2 }, '$.a'],
    [{ x: { b: 1, a: 2 } }, '$.x.a'],
    [[1, NaN], '$[1]'],
    [{ $num: 'nope' }, '$.$num'],
    [{ $date: 5 }, '$.$date'],
    [new Date(0), '$'],
    [() => 1, '$']
  ];
  for (const [v, path] of bad) {
    test(`refuses at ${path}`, () => expect(findNonCanonical(v)).toBe(path));
  }
});
