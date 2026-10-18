/**
 * P121-TWO001-MEMBERSPHOTO — `_Files` gained a `readers` column. `createTable` leaves an existing table alone, so a
 * backend made before the column would never have it, and a shared photo's readers would be dropped on write. This
 * holds `ensureFilesTable` to adding what an older table lacks, and nothing it already has.
 */
import type { IStorageSchema } from '@noodl/backend-contract';

import { ensureFilesTable, FILES_COLLECTION } from '../src/storage/MetadataStore';

type Column = { name: string; type?: string; targetClass?: string };

function fakeSchema(existing: Column[] | null) {
  const added: Column[] = [];
  const created: Column[][] = [];
  const schema = {
    createTable: (spec: { name: string; columns: Column[] }) => {
      if (existing) return false;
      created.push(spec.columns);
      return true;
    },
    getTableSchema: (name: string) => (name === FILES_COLLECTION && existing ? { name, columns: existing } : null),
    addColumn: (_table: string, column: Column) => added.push(column)
  } as unknown as IStorageSchema;
  return { schema, added, created };
}

const BEFORE_READERS: Column[] = ['storedName', 'originalName', 'size', 'contentType', 'hash', 'driver', 'key', 'owner', 'private'].map((name) => ({ name }));

describe('ensureFilesTable', () => {
  it('a new backend: one table, with readers among its columns, nothing added after', () => {
    const { schema, added, created } = fakeSchema(null);
    ensureFilesTable(schema);
    expect(created).toHaveLength(1);
    expect(created[0].find((c) => c.name === 'readers')).toEqual({ name: 'readers', type: 'Array' });
    expect(added).toEqual([]);
  });

  it('🔴 a backend made before readers: the column is added, and only it', () => {
    const { schema, added } = fakeSchema(BEFORE_READERS);
    ensureFilesTable(schema);
    expect(added).toEqual([{ name: 'readers', type: 'Array' }]);
  });

  it('a backend that has it: nothing added', () => {
    const { schema, added } = fakeSchema([...BEFORE_READERS, { name: 'readers', type: 'Array' }]);
    ensureFilesTable(schema);
    expect(added).toEqual([]);
  });
});
