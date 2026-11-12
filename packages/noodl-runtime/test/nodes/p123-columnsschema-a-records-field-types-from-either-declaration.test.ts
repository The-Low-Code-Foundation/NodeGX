/**
 * P123-RT-COLUMNSSCHEMA — a record's field types are read from the project's declaration in either of its shapes.
 *
 * `dbCollections` holds a Parse-era entry (`schema.properties`, a map) or a NodeGX one (`columns`, a list): the built-in
 * backend's cache, the MCP server's write-back and NodeGX Studio all write `columns`. The Model glue read only
 * `schema.properties`, so on every NodeGX project a File field arrived as the wire's `{ __type, name, url }` and an Image
 * wired to it asked for `/runtime/[object Object]` (Swapshop's listing photos, STU-090), and a Pointer written as an id
 * was sent as a bare string. `queryutils` and `schema-ports` already read both shapes; this pins the Model glue.
 */
const declared: { current: unknown[] } = { current: [] };
jest.mock('../../noodl-runtime', () => ({
  instance: { getMetaData: (key: string) => (key === 'dbCollections' ? declared.current : undefined) }
}));

import CloudStore = require('../../src/api/cloudstore');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CloudFile = require('../../src/api/cloudfile');

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

const URL = 'http://127.0.0.1:8578/files/abc_chair.png';
const DUE = '2026-10-30T09:00:00.000Z';
const wire = () => ({
  objectId: 'listing1',
  photo: { __type: 'File', name: 'abc_chair.png', url: URL },
  due: { __type: 'Date', iso: DUE },
  seller: { __type: 'Pointer', className: '_User', objectId: 'u1' }
});

const NODEGX = [{ name: 'Listing', columns: [{ name: 'photo', type: 'File' }, { name: 'due', type: 'Date' }, { name: 'seller', type: 'Pointer', targetClass: '_User' }] }];
const PARSE = [{ name: 'Listing', schema: { properties: { photo: { type: 'File' }, due: { type: 'Date' }, seller: { type: 'Pointer', targetClass: '_User' } } } }];

describe.each([
  ['a NodeGX declaration (columns)', NODEGX],
  ['a Parse-era declaration (schema.properties)', PARSE]
])('P123-RT-COLUMNSSCHEMA — %s', (_name, collections) => {
  beforeEach(() => {
    declared.current = collections;
    (CloudStore as Any).invalidateCollections();
  });

  test('a File field reads as a Cloud File, which an Image takes as its url', () => {
    const m = (CloudStore as Any)._fromJSON(wire(), 'Listing');
    expect(m.get('photo')).toBeInstanceOf(CloudFile);
    expect(String(m.get('photo'))).toBe(URL);
  });

  test('a Date field reads as a Date', () => {
    const m = (CloudStore as Any)._fromJSON({ ...wire(), objectId: 'listing2' }, 'Listing');
    expect(m.get('due')).toBeInstanceOf(Date);
    expect(m.get('due').toISOString()).toBe(DUE);
  });

  test('a Pointer written as an id goes on the wire as a Pointer to its class', () => {
    const out = (CloudStore as Any)._serializeObject({ seller: 'u1', due: DUE }, 'Listing');
    expect(out.seller).toEqual({ __type: 'Pointer', className: '_User', objectId: 'u1' });
    expect(out.due).toEqual({ __type: 'Date', iso: DUE });
  });
});
