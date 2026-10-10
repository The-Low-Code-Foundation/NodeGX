/**
 * Filters — every operator `QueryBuilder` implements.
 *
 * BRG-003 §3.2: *"the filter surface is what an author actually builds with."*
 * A missing operator here is a Data node on the canvas that returns the wrong
 * rows rather than an error, which is why each case asserts *which* rows came
 * back and not merely how many.
 *
 * @module conformance/cases/filters
 */

import { deepEq, eq, ok, pluck } from '../assert';
import type { ConformanceCase, ConformanceContext } from '../index';

/**
 * The shared fixture. Six rows whose `name` identifies them, chosen so that
 * every operator below has at least one row it must exclude — an operator that
 * matches everything and an operator that works are indistinguishable over a
 * fixture where every row qualifies.
 */
async function seed(ctx: ConformanceContext, base: string): Promise<string> {
  const c = ctx.collection(base);
  const rows = [
    { name: 'ada', score: 10, tag: 'alpha', note: 'hello world' },
    { name: 'bo', score: 20, tag: 'beta', note: 'hello there' },
    { name: 'cy', score: 30, tag: 'alpha', note: 'goodbye world' },
    { name: 'di', score: 40, tag: 'gamma', note: 'nothing here' },
    { name: 'eve', score: 50, tag: 'beta', note: 'hello again' },
    { name: 'fay', score: 60, tag: 'gamma' } // `note` deliberately absent
  ];
  for (const r of rows) await ctx.create(c, r);
  return c;
}

async function names(ctx: ConformanceContext, c: string, where: Record<string, unknown>): Promise<string[]> {
  const got = await ctx.query(c, { where });
  return pluck(got.results, 'name');
}

export const filterCases: readonly ConformanceCase[] = Object.freeze([
  {
    id: 'filters/equality-and-implicit-and',
    area: 'filters',
    pins: 'bare values match exactly, and two keys compose as AND',
    async run(ctx) {
      const c = await seed(ctx, 'Flt');
      deepEq(await names(ctx, c, { tag: 'alpha' }), ['ada', 'cy'], 'equality is wrong');
      deepEq(await names(ctx, c, { tag: 'alpha', score: 30 }), ['cy'], 'two keys did not compose as AND');
    }
  },

  {
    id: 'filters/comparison-gt-gte-lt-lte',
    area: 'filters',
    pins: '$gt/$gte/$lt/$lte are inclusive exactly where they say they are',
    async run(ctx) {
      const c = await seed(ctx, 'Flt');
      deepEq(await names(ctx, c, { score: { $gt: 40 } }), ['eve', 'fay'], '$gt is wrong');
      deepEq(await names(ctx, c, { score: { $gte: 40 } }), ['di', 'eve', 'fay'], '$gte is not inclusive');
      deepEq(await names(ctx, c, { score: { $lt: 20 } }), ['ada'], '$lt is wrong');
      deepEq(await names(ctx, c, { score: { $lte: 20 } }), ['ada', 'bo'], '$lte is not inclusive');
    }
  },

  {
    id: 'filters/range-composes-on-one-key',
    area: 'filters',
    pins: 'two operators on the same key AND together into a range',
    async run(ctx) {
      const c = await seed(ctx, 'Flt');
      deepEq(
        await names(ctx, c, { score: { $gte: 20, $lte: 40 } }),
        ['bo', 'cy', 'di'],
        'a two-sided range on one key is wrong'
      );
    }
  },

  {
    id: 'filters/ne',
    area: 'filters',
    pins: '$ne excludes the value',
    async run(ctx) {
      const c = await seed(ctx, 'Flt');
      deepEq(await names(ctx, c, { tag: { $ne: 'alpha' } }), ['bo', 'di', 'eve', 'fay'], '$ne is wrong');
    }
  },

  {
    id: 'filters/in-and-nin',
    area: 'filters',
    pins: '$in matches any of the set; $nin excludes all of it',
    async run(ctx) {
      const c = await seed(ctx, 'Flt');
      deepEq(await names(ctx, c, { tag: { $in: ['alpha', 'gamma'] } }), ['ada', 'cy', 'di', 'fay'], '$in is wrong');
      deepEq(await names(ctx, c, { tag: { $nin: ['alpha', 'gamma'] } }), ['bo', 'eve'], '$nin is wrong');
      deepEq(await names(ctx, c, { tag: { $in: [] } }), [], '$in over an empty set must match nothing');
    }
  },

  {
    id: 'filters/exists',
    area: 'filters',
    pins: '$exists distinguishes a missing column from a present one',
    async run(ctx) {
      // `fay` has no `note`. An adapter that stores absent as empty-string and
      // an adapter that stores it as NULL both pass every other case in this
      // file and disagree here.
      const c = await seed(ctx, 'Flt');
      const present = await names(ctx, c, { note: { $exists: true } });
      deepEq(present, ['ada', 'bo', 'cy', 'di', 'eve'], '$exists: true is wrong');
      deepEq(await names(ctx, c, { note: { $exists: false } }), ['fay'], '$exists: false is wrong');
    }
  },

  {
    id: 'filters/regex',
    area: 'filters',
    pins: '$regex matches on a pattern, anchored where the pattern says',
    async run(ctx) {
      // §3.4 territory: SQLite's $regex and Postgres `~` differ at the edges,
      // so this case stays on the common core — a literal prefix and a literal
      // substring. An adapter needing to declare `degraded` here should do it
      // for ordering or collation, not for these two.
      const c = await seed(ctx, 'Flt');
      deepEq(await names(ctx, c, { note: { $regex: '^hello' } }), ['ada', 'bo', 'eve'], '$regex prefix is wrong');
      deepEq(await names(ctx, c, { note: { $regex: 'world' } }), ['ada', 'cy'], '$regex substring is wrong');
    }
  },

  {
    id: 'filters/or',
    area: 'filters',
    pins: '$or unions its branches without duplicating a row matching both',
    async run(ctx) {
      const c = await seed(ctx, 'Flt');
      const got = await names(ctx, c, { $or: [{ tag: 'alpha' }, { score: { $gte: 50 } }] });
      deepEq(got, ['ada', 'cy', 'eve', 'fay'], '$or is wrong');

      // A row satisfying both branches must appear once, not twice — the
      // classic join-shaped bug in an $or implemented as a UNION ALL.
      const both = await names(ctx, c, { $or: [{ tag: 'alpha' }, { score: 10 }] });
      deepEq(both, ['ada', 'cy'], '$or duplicated a row that matched both branches');
    }
  },

  {
    id: 'filters/empty-where-returns-everything',
    area: 'filters',
    pins: 'an absent or empty filter is not a filter that matches nothing',
    async run(ctx) {
      const c = await seed(ctx, 'Flt');
      eq((await ctx.query(c, {})).results.length, 6, 'an absent where did not return every row');
      eq((await ctx.query(c, { where: {} })).results.length, 6, 'an empty where did not return every row');
    }
  },

  {
    id: 'filters/unknown-column-does-not-match-everything',
    area: 'filters',
    pins: 'filtering on a column that does not exist returns nothing, never everything',
    async run(ctx) {
      // The failure this pins is a security one as much as a correctness one:
      // an adapter that drops an unrecognised predicate rather than failing it
      // turns a narrowing filter into a full-collection read.
      const c = await seed(ctx, 'Flt');
      let matched: number | undefined;
      try {
        matched = (await ctx.query(c, { where: { nosuchcolumn: 'x' } })).results.length;
      } catch {
        return; // Refusing outright is an acceptable answer.
      }
      ok(matched === 0, `a filter on an unknown column returned ${String(matched)} rows instead of 0 or an error`);
    }
  },

  {
    id: 'filters/equality-on-an-array-matches-an-element',
    area: 'filters',
    pins: 'a bare value against an Array field matches the rows whose array holds it, as Parse does',
    async run(ctx) {
      // P109 ISL-039 (P100-UPG001-ARRAYEQ): the equality compared the value with the array's stored
      // JSON text, so `tags = "fantasy"` matched nothing, with no error.
      const c = ctx.collection('Arr');
      ctx.createTable(c, [
        { name: 'name', type: 'String' },
        { name: 'tags', type: 'Array' }
      ]);
      await ctx.create(c, { name: 'ada', tags: ['fantasy', 'sea'] });
      await ctx.create(c, { name: 'bo', tags: ['crime'] });
      await ctx.create(c, { name: 'cy', tags: ['fantasy'] });
      await ctx.create(c, { name: 'di', tags: [] });
      await ctx.create(c, { name: 'eve', tags: [1, 2] });
      deepEq(await names(ctx, c, { tags: 'fantasy' }), ['ada', 'cy'], 'equality on an array did not match by element');
      deepEq(await names(ctx, c, { tags: { $eq: 'crime' } }), ['bo'], '$eq on an array did not match by element');
      deepEq(await names(ctx, c, { tags: 2 }), ['eve'], 'a number did not match its element');
      deepEq(await names(ctx, c, { tags: 'nothing' }), [], 'a value no array holds matched');
      // An array value is the whole array (the admin's "is empty" asks `$eq: []`).
      deepEq(await names(ctx, c, { tags: { $eq: [] } }), ['di'], '$eq with an empty array did not find the empty array');
      deepEq(await names(ctx, c, { tags: { $eq: ['crime'] } }), ['bo'], '$eq with an array did not compare the whole array');
    }
  },

  {
    id: 'filters/a-nul-in-a-value-matches-nothing-on-every-engine',
    area: 'filters',
    pins: 'a string holding \\u0000 compares like any value no row holds — never an error on one engine',
    async run(ctx) {
      // P109 ISL-039 (P78-DBT-NUL): DBT used '\u0000none' as an impossible value for an empty
      // `containedIn`. SQLite answered [] and PostgreSQL, whose text cannot hold a NUL, a 400.
      const c = await seed(ctx, 'Nul');
      deepEq(await names(ctx, c, { name: 'a\u0000b' }), [], 'equality with a NUL matched a row');
      deepEq(await names(ctx, c, { name: { $eq: '\u0000none' } }), [], '$eq with a NUL matched a row');
      deepEq(await names(ctx, c, { name: { $in: ['\u0000none', 'ada'] } }), ['ada'], '$in with a NUL lost its other value');
      deepEq(await names(ctx, c, { name: { $in: ['\u0000none'] } }), [], '$in of only a NUL matched a row');
      deepEq(await names(ctx, c, { name: { $nin: ['\u0000none', 'ada'] } }), ['bo', 'cy', 'di', 'eve', 'fay'], '$nin with a NUL is wrong');
      deepEq(await names(ctx, c, { tag: { $ne: '\u0000x' } }), ['ada', 'bo', 'cy', 'di', 'eve', 'fay'], '$ne with a NUL is wrong');
    }
  },

  {
    id: 'filters/a-pointer-written-as-a-parse-pointer-is-a-value',
    area: 'filters',
    pins: 'a condition `{__type: "Pointer", objectId}` matches like the bare id, rather than being read as operators',
    async run(ctx) {
      // P109 ISL-039 (P100-UPG001-PTREQ): every key of the object was read as an operator, and
      // `__type` was refused as one the backend "cannot translate" — a 500 for the way a Parse
      // client writes a pointer match.
      const c = ctx.collection('Ptr');
      ctx.createTable(c, [
        { name: 'name', type: 'String' },
        { name: 'author', type: 'Pointer', targetClass: '_User' }
      ]);
      await ctx.create(c, { name: 'ada', author: { __type: 'Pointer', className: '_User', objectId: 'u1' } });
      await ctx.create(c, { name: 'bo', author: { __type: 'Pointer', className: '_User', objectId: 'u2' } });
      deepEq(await names(ctx, c, { author: 'u1' }), ['ada'], 'the bare id (the control) did not match');
      deepEq(
        await names(ctx, c, { author: { __type: 'Pointer', className: '_User', objectId: 'u1' } }),
        ['ada'],
        'a Parse pointer did not match like its id'
      );
    }
  }
]);
