/**
 * P109-S22-COLLECTIONCHURN — a list of OBJECTS on a record, read again with the same contents, is no change.
 *
 * P107-C49 (`c6bf4e8ac`, ruled "Compare the list's contents … or any other list on a record") stopped a plain list from
 * counting as a change when it arrives again: `_fromJSON` skips a list whose contents equal the one the record holds. A list
 * of objects takes another path: `_deserializeJSON` makes it a fresh Collection (`Collection.get()`, new nested Models) on
 * every read, so `Model.set`'s `!==` called it changed and a Record holding one pulsed Changed on every Fetch. The spec
 * world does not model the Collection conversion (world.ts `writeStoreEvent` writes the raw list), so no conformance run can
 * see it; this file is its grade.
 */
jest.mock('../../noodl-runtime', () => ({
  instance: { getMetaData: () => undefined }
}));

import Model = require('../../src/model');
import CloudStore = require('../../src/api/cloudstore');

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

const row = (id: string, tags: unknown) => ({ objectId: id, title: 'Alpha', tags }) as unknown as { objectId?: string } & Record<string, unknown>;

/** The record's `change` events for `tags`, from now on. */
function tagChanges(id: string): string[] {
  const seen: string[] = [];
  (Model.get(id) as Any).on('change', (e: { name: string }) => seen.push(e.name));
  return seen;
}

describe('a list of objects on a record', () => {
  test('read again with the same contents: no change, and the record keeps the list it held', () => {
    CloudStore._fromJSON(row('churn-1', [{ label: 'a' }, { label: 'b', n: 2 }]), 'articles');
    const held = (Model.get('churn-1') as Any).get('tags');
    const seen = tagChanges('churn-1');

    CloudStore._fromJSON(row('churn-1', [{ label: 'a' }, { label: 'b', n: 2 }]), 'articles');

    expect(seen.filter((n) => n === 'tags')).toEqual([]);
    expect((Model.get('churn-1') as Any).get('tags')).toBe(held);
  });

  test('the control: different contents are a change, and the record holds the new list', () => {
    CloudStore._fromJSON(row('churn-2', [{ label: 'a' }]), 'articles');
    const seen = tagChanges('churn-2');

    CloudStore._fromJSON(row('churn-2', [{ label: 'a' }, { label: 'c' }]), 'articles');

    expect(seen.filter((n) => n === 'tags')).toEqual(['tags']);
    expect((Model.get('churn-2') as Any).get('tags').items.map((m: Any) => m.get('label'))).toEqual(['a', 'c']);
  });

  test('the control: the same objects in another order are a change', () => {
    CloudStore._fromJSON(row('churn-3', [{ label: 'a' }, { label: 'b' }]), 'articles');
    const seen = tagChanges('churn-3');

    CloudStore._fromJSON(row('churn-3', [{ label: 'b' }, { label: 'a' }]), 'articles');

    expect(seen.filter((n) => n === 'tags')).toEqual(['tags']);
  });
});
