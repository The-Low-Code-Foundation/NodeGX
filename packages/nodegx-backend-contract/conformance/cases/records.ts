/**
 * Records — create, fetch, save, delete, count, increment, distinct, aggregate.
 *
 * BRG-003 §3.2: *"this is what every data node on the canvas receives; a
 * difference here is a visibly broken app."*
 *
 * @module conformance/cases/records
 */

import { deepEq, eq, ok, pluck } from '../assert';
import type { ConformanceCase } from '../index';

export const recordCases: readonly ConformanceCase[] = Object.freeze([
  {
    id: 'records/create-returns-the-stored-row',
    area: 'records',
    pins: 'create() answers with the row as stored, carrying an objectId',
    async run(ctx) {
      const c = ctx.collection('Rec');
      const row = await ctx.create(c, { title: 'first', score: 1 });
      ok(typeof row.objectId === 'string' && row.objectId.length > 0, 'create did not return an objectId');
      eq(row.title, 'first', 'create did not echo the stored title');
      eq(row.score, 1, 'create did not echo the stored score');
    }
  },

  {
    id: 'records/fetch-by-objectId',
    area: 'records',
    pins: 'fetch() finds a row by the objectId create() handed back',
    async run(ctx) {
      const c = ctx.collection('Rec');
      const made = await ctx.create(c, { title: 'findable', score: 2 });
      const got = await ctx.fetch(c, String(made.objectId));
      eq(got.objectId, made.objectId, 'fetch returned a different row');
      eq(got.title, 'findable', 'fetch lost the title');
    }
  },

  {
    id: 'records/fetch-accepts-id-and-objectId',
    area: 'records',
    pins: 'the adapter honours BOTH `id` and `objectId` on a fetch',
    async run(ctx) {
      // 🔴 Not a tidiness case. `IStorageAdapter`'s own docstring calls this a
      // wart BRG-005 must reproduce rather than tidy: the facade passes
      // `objectId` and the in-editor callers pass `id`. An adapter honouring
      // only one silently finds nothing — a blank screen, not an error.
      const c = ctx.collection('Rec');
      const made = await ctx.create(c, { title: 'both spellings' });
      const byObjectId = await ctx.fetch(c, String(made.objectId));
      eq(byObjectId.title, 'both spellings', 'fetch by objectId failed');

      const args = await new Promise<Record<string, unknown>>((resolve, reject) => {
        ctx.adapter.fetch({
          collection: c,
          id: String(made.objectId),
          success: (record) => resolve(record),
          error: (message) => reject(new Error(String(message)))
        });
      });
      eq(args.title, 'both spellings', 'fetch by `id` (the in-editor spelling) failed');
    }
  },

  {
    id: 'records/save-updates-in-place',
    area: 'records',
    pins: 'save() mutates the existing row rather than inserting a second one',
    async run(ctx) {
      const c = ctx.collection('Rec');
      const made = await ctx.create(c, { title: 'before', score: 3 });
      await ctx.save(c, String(made.objectId), { title: 'after' });
      const got = await ctx.fetch(c, String(made.objectId));
      eq(got.title, 'after', 'save did not update the row');
      eq(got.score, 3, 'save dropped a column it was not given');
      eq(await ctx.count(c), 1, 'save inserted a second row instead of updating');
    }
  },

  {
    id: 'records/delete-removes-the-row',
    area: 'records',
    pins: 'delete() removes the row and the count follows',
    async run(ctx) {
      const c = ctx.collection('Rec');
      const made = await ctx.create(c, { title: 'doomed' });
      eq(await ctx.count(c), 1, 'fixture did not land');
      await ctx.remove(c, String(made.objectId));
      eq(await ctx.count(c), 0, 'delete did not remove the row');
    }
  },

  {
    id: 'records/count-matches-the-visible-set',
    area: 'records',
    pins: 'count() counts what the same filter would return',
    async run(ctx) {
      const c = ctx.collection('Rec');
      for (const score of [1, 2, 3, 4, 5]) await ctx.create(c, { title: `n${score}`, score });
      eq(await ctx.count(c), 5, 'unfiltered count is wrong');
      eq(await ctx.count(c, { score: { $gt: 3 } }), 2, 'filtered count is wrong');
      const q = await ctx.query(c, { where: { score: { $gt: 3 } } });
      eq(q.results.length, 2, 'query and count disagree on the same filter');
    }
  },

  {
    id: 'records/limit-skip-and-count-compose',
    area: 'records',
    pins: 'count is of the whole matching set, not of the returned page',
    async run(ctx) {
      // The property that breaks pagination when an adapter gets it wrong:
      // `count` must describe the filtered set, while `results` describes the
      // page. An adapter returning the page length as the count paginates to
      // exactly one page and nobody notices until a collection grows.
      const c = ctx.collection('Rec');
      for (const score of [1, 2, 3, 4, 5, 6]) await ctx.create(c, { title: `n${score}`, score });
      const page = await ctx.query(c, { sort: ['score'], limit: 2, skip: 2, count: true });
      eq(page.results.length, 2, 'limit was not applied');
      eq(page.count, 6, 'count described the page rather than the matching set');
      deepEq(page.results.map((r) => r.score), [3, 4], 'skip+sort returned the wrong page');
    }
  },

  {
    id: 'records/sort-ascending-and-descending',
    area: 'records',
    pins: 'sort() orders by the named column, and `-` reverses it',
    async run(ctx) {
      const c = ctx.collection('Rec');
      for (const score of [3, 1, 2]) await ctx.create(c, { title: `n${score}`, score });
      const asc = await ctx.query(c, { sort: ['score'] });
      deepEq(asc.results.map((r) => r.score), [1, 2, 3], 'ascending sort is wrong');
      const desc = await ctx.query(c, { sort: ['-score'] });
      deepEq(desc.results.map((r) => r.score), [3, 2, 1], 'descending sort is wrong');
    }
  },

  {
    id: 'records/select-projects-columns',
    area: 'records',
    pins: 'select limits the columns returned without losing objectId',
    async run(ctx) {
      const c = ctx.collection('Rec');
      await ctx.create(c, { title: 'projected', score: 9, extra: 'dropped' });
      const got = await ctx.query(c, { select: ['title'] });
      eq(got.results.length, 1, 'select changed which rows came back');
      eq(got.results[0].title, 'projected', 'select dropped the column it was asked for');
      ok(got.results[0].objectId !== undefined, 'select dropped objectId, which every caller needs');
    }
  },

  {
    id: 'records/increment-is-atomic-on-the-stored-value',
    area: 'records',
    pins: 'increment() adds to what is stored, not to what the caller last read',
    async run(ctx) {
      const c = ctx.collection('Rec');
      const made = await ctx.create(c, { title: 'counter', score: 10 });
      await ctx.increment(c, String(made.objectId), { score: 5 });
      await ctx.increment(c, String(made.objectId), { score: -2 });
      const got = await ctx.fetch(c, String(made.objectId));
      eq(got.score, 13, 'increment did not accumulate on the stored value');
    }
  },

  {
    id: 'records/distinct-returns-each-value-once',
    area: 'records',
    pins: 'distinct() collapses duplicates over the named property',
    async run(ctx) {
      const c = ctx.collection('Rec');
      for (const tag of ['a', 'b', 'a', 'c', 'b']) await ctx.create(c, { tag });
      const values = await ctx.distinct(c, 'tag');
      deepEq(values.map(String).sort(), ['a', 'b', 'c'], 'distinct did not collapse duplicates');
    }
  },

  {
    id: 'records/aggregate-sum-avg-min-max',
    area: 'records',
    pins: 'the four aggregate spellings compute over the filtered set',
    async run(ctx) {
      const c = ctx.collection('Rec');
      for (const score of [2, 4, 6, 8]) await ctx.create(c, { score });
      const all = await ctx.aggregate(c, {
        total: { sum: 'score' },
        mean: { avg: 'score' },
        lowest: { min: 'score' },
        highest: { max: 'score' }
      });
      eq(Number(all.total), 20, 'sum is wrong');
      eq(Number(all.mean), 5, 'avg is wrong');
      eq(Number(all.lowest), 2, 'min is wrong');
      eq(Number(all.highest), 8, 'max is wrong');

      const filtered = await ctx.aggregate(c, { total: { sum: 'score' } }, { score: { $gt: 4 } });
      eq(Number(filtered.total), 14, 'aggregate ignored the where clause');
    }
  },

  {
    id: 'records/rows-are-isolated-between-collections',
    area: 'records',
    pins: 'a write to one collection is invisible in another',
    async run(ctx) {
      const a = ctx.collection('RecA');
      const b = ctx.collection('RecB');
      await ctx.create(a, { title: 'in a' });
      await ctx.create(b, { title: 'in b' });
      const fromA = await ctx.query(a, {});
      deepEq(pluck(fromA.results, 'title'), ['in a'], 'collections are not isolated');
    }
  },

  {
    id: 'records/search-finds-a-row-by-its-text',
    area: 'records',
    pins: 'BAK-008 full-text search returns the matching rows and only those',
    async run(ctx) {
      // 🔴 Added by the AC6 gate's first run, which is the point of it. `search`
      // is on `IStorageDataPlane`, §3.2 lists it among the read shapes an ACL
      // must hold for, and `ConformanceContext` has carried a `search()` method
      // since s2 — that NO case called. A capability with a door in the harness
      // and nothing walking through it is precisely the silent gap rule 2 names.
      const c = ctx.collection('Srch');
      const fox = await ctx.create(c, { title: 'Quick brown fox', body: 'It jumps over the lazy dog.' });
      const other = await ctx.create(c, { title: 'Totally unrelated', body: 'Nothing to see here.' });
      ctx.schema.rebuildSearchIndex(c, ['title', 'body']);

      const hit = await ctx.search(c, { search: 'quick brown' });
      deepEq(pluck(hit.results, 'objectId'), [String(fox.objectId)], 'search did not return exactly the matching row');

      const miss = await ctx.search(c, { search: 'marmots' });
      eq(miss.results.length, 0, 'search invented a match for a term in no row');
      ok(String(other.objectId).length > 0, 'the control row was not created');
    }
  },

  {
    id: 'records/search-composes-with-a-structured-where',
    area: 'records',
    pins: 'a search term and a where clause intersect rather than either one winning',
    async run(ctx) {
      const c = ctx.collection('Srch');
      await ctx.create(c, { title: 'findable alpha', score: 1 });
      const beta = await ctx.create(c, { title: 'findable beta', score: 9 });
      ctx.schema.rebuildSearchIndex(c, ['title']);

      const both = await ctx.search(c, { search: 'findable', where: { score: { $gt: 4 } } });
      deepEq(
        pluck(both.results, 'objectId'),
        [String(beta.objectId)],
        'search and where did not intersect — one of the two was dropped'
      );
    }
  }
]);
