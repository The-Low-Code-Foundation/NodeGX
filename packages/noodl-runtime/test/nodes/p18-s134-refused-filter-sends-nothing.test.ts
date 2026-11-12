/**
 * P18-S134-REFUSEDFILTERSENDS — a `Noodl.Records` call whose filter the translator refuses rejects, and sends nothing.
 *
 * `convertFilterOp` reports a refusal through its `error` callback and then returns `{}`. The four filtered members
 * rejected with the translator's words and still asked the store, with `where: {}`: a request for every row of the
 * collection, whose answer nobody read. The exported app rejects without sending; the two arms now agree.
 *
 * Known-firing beside each absence: the same member with a filter the translator accepts does reach the store.
 */
jest.mock('../../noodl-runtime', () => ({
  instance: { getMetaData: () => undefined }
}));

import CloudStore = require('../../src/api/cloudstore');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const createRecordsAPI = require('../../src/api/records');

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

/** Two keys in one object: the translator refuses it by name. */
const REFUSED = { title: { equalTo: 'a' }, done: { equalTo: true } };
const ACCEPTED = { title: { equalTo: 'a' } };

const asked: string[] = [];
let spies: jest.SpyInstance[] = [];
beforeEach(() => {
  asked.length = 0;
  const answer = (member: string, value: unknown) =>
    jest.spyOn(CloudStore.prototype as Any, member).mockImplementation(function (this: Any, o: Any) {
      asked.push(member);
      o.success(value);
    });
  spies = [answer('query', []), answer('count', 0), answer('distinct', []), answer('aggregate', {})];
});
afterEach(() => spies.forEach((s) => s.mockRestore()));

const calls: Array<[string, (Records: Any, filter: unknown) => Promise<unknown>]> = [
  ['query', (R, f) => R.query('Task', f)],
  ['count', (R, f) => R.count('Task', f)],
  ['distinct', (R, f) => R.distinct('Task', 'title', f)],
  ['aggregate', (R, f) => R.aggregate('Task', { n: { count: 'title' } }, f)]
];

describe('P18-S134-REFUSEDFILTERSENDS', () => {
  test.each(calls)('%s with a filter the translator accepts asks the store (known-firing)', async (member, call) => {
    await call(createRecordsAPI(), ACCEPTED);
    expect(asked).toEqual([member]);
  });

  test.each(calls)('🔴 %s with a refused filter rejects in the translator’s words and asks the store nothing', async (_member, call) => {
    await expect(call(createRecordsAPI(), REFUSED)).rejects.toEqual(expect.stringContaining('title'));
    expect(asked).toEqual([]);
  });
});
