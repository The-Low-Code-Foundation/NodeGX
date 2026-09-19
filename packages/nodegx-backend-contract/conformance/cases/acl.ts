/**
 * Row ACLs — the highest-stakes area in the suite.
 *
 * BRG-003 §3.2: *"a row-level predicate that translates loosely is a data
 * breach, not a bug."* Phase 97 README rule 4: *"no security downgrade is ever
 * emitted silently."*
 *
 * These cases are adversarial in the house style of
 * `nodegx-backend/tests/security-enforcement.test.ts` (AC4): for each read
 * shape and each write shape, a principal who should not be able to reach a row
 * tries to, through every door the adapter offers.
 *
 * 🔴 **Why `count`, `distinct` and `aggregate` are in here and not in
 * `records`.** They are the doors an ACL implementation forgets. A `query` that
 * filters correctly while `count` counts the whole table leaks the *size* of a
 * private set; an `aggregate` that sums invisible rows leaks their contents in
 * arithmetic. The built-in adapter applies the predicate IN the SQL for exactly
 * this reason (`QueryBuilder.ts` — `local-sql`), and BRG-005 has to do the same
 * rather than filtering in application code after the fact.
 *
 * @module conformance/cases/acl
 */

import { deepEq, eq, ok, pluck } from '../assert';
import { read, write, type ConformanceCase, type ConformanceContext } from '../index';

const ANON = ['*'];
const ALICE = ['*', 'user-alice'];
const BOB = ['*', 'user-bob'];
const CAROL_EDITOR = ['*', 'user-carol', 'role:editors'];

interface Seeded {
  c: string;
  ids: Record<string, string>;
}

/**
 * The fixture, transcribed from the enforcement semantics the built-in adapter
 * already implements (`LocalSQLAdapter.acl.test.js:64-80`).
 *
 * A NULL ACL means public — retrofit semantics, so rows written before row ACLs
 * existed keep working. `wo` grants alice write but **not** read, which is the
 * row that catches an adapter treating one grant as both.
 */
async function seed(ctx: ConformanceContext): Promise<Seeded> {
  const c = ctx.collection('Acl');
  const fixtures: [string, Record<string, unknown>][] = [
    ['pub', { title: 'public', score: 1, ACL: null }],
    ['alicePriv', { title: 'alice private', score: 4, ACL: { 'user-alice': { read: true, write: true } } }],
    [
      'aliceOpen',
      { title: 'alice world-readable', score: 8, ACL: { 'user-alice': { read: true, write: true }, '*': { read: true } } }
    ],
    ['bobPriv', { title: 'bob private', score: 16, ACL: { 'user-bob': { read: true, write: true } } }],
    ['roleOnly', { title: 'editors only', score: 32, ACL: { 'role:editors': { read: true, write: true } } }],
    ['writeOnly', { title: 'write only', score: 64, ACL: { 'user-alice': { write: true } } }]
  ];
  const ids: Record<string, string> = {};
  for (const [key, data] of fixtures) {
    const row = await ctx.create(c, data);
    ids[key] = String(row.objectId);
  }
  return { c, ids };
}

export const aclCases: readonly ConformanceCase[] = Object.freeze([
  {
    id: 'acl/no-context-is-unfiltered',
    area: 'acl',
    pins: 'an absent acl context means no row filtering (admin, dev-open, scoped keys)',
    async run(ctx) {
      const { c } = await seed(ctx);
      eq((await ctx.query(c, {})).results.length, 6, 'an absent acl context filtered rows it should not have');
    }
  },

  {
    id: 'acl/anonymous-sees-only-public-and-world-readable',
    area: 'acl',
    pins: 'an anonymous caller reads NULL-ACL rows and rows granting `*`, and nothing else',
    async run(ctx) {
      const { c } = await seed(ctx);
      const got = await ctx.query(c, { acl: read(ANON) });
      deepEq(pluck(got.results, 'title'), ['alice world-readable', 'public'], 'anonymous visibility is wrong');
    }
  },

  {
    id: 'acl/a-user-sees-public-plus-their-own',
    area: 'acl',
    pins: 'a user id in the key set grants exactly the rows that name it',
    async run(ctx) {
      const { c } = await seed(ctx);
      const got = await ctx.query(c, { acl: read(ALICE) });
      deepEq(
        pluck(got.results, 'title'),
        ['alice private', 'alice world-readable', 'public'],
        "alice's visibility is wrong"
      );
    }
  },

  {
    id: 'acl/roles-grant-visibility',
    area: 'acl',
    pins: 'a `role:<name>` key grants the rows that name that role',
    async run(ctx) {
      const { c } = await seed(ctx);
      const got = await ctx.query(c, { acl: read(CAROL_EDITOR) });
      deepEq(
        pluck(got.results, 'title'),
        ['alice world-readable', 'editors only', 'public'],
        'role-granted visibility is wrong'
      );
    }
  },

  {
    id: 'acl/a-write-grant-does-not-confer-read',
    area: 'acl',
    pins: 'write permission alone never makes a row readable',
    async run(ctx) {
      const { c } = await seed(ctx);
      const got = await ctx.query(c, { acl: read(ALICE) });
      ok(
        !pluck(got.results, 'title').includes('write only'),
        'a row granting only write was returned to a read — one grant was treated as both'
      );
    }
  },

  {
    id: 'acl/empty-key-set-sees-only-public',
    area: 'acl',
    pins: 'an empty key set is not an absent context',
    async run(ctx) {
      // 🔴 The distinction an adapter is most likely to collapse. `keys: []`
      // means "a caller with no principals" and must see only NULL-ACL rows;
      // `acl: undefined` means "do not filter at all". Treating the first as
      // the second hands the whole collection to an unauthenticated request.
      const { c } = await seed(ctx);
      const got = await ctx.query(c, { acl: { access: 'read', keys: [] } });
      deepEq(pluck(got.results, 'title'), ['public'], 'an empty key set did not collapse to public rows only');
    }
  },

  {
    id: 'acl/filters-compose-with-the-predicate',
    area: 'acl',
    pins: 'a where clause ANDs with the ACL predicate rather than replacing it',
    async run(ctx) {
      const { c } = await seed(ctx);
      const got = await ctx.query(c, { where: { score: { $gte: 1 } }, acl: read(BOB) });
      deepEq(
        pluck(got.results, 'title'),
        ['alice world-readable', 'bob private', 'public'],
        'a where clause displaced the ACL predicate'
      );
    }
  },

  {
    id: 'acl/count-counts-only-visible-rows',
    area: 'acl',
    pins: 'count() applies the ACL — otherwise the size of a private set leaks',
    async run(ctx) {
      const { c } = await seed(ctx);
      eq(await ctx.count(c, undefined, read(ANON)), 2, 'count leaked rows the caller cannot read');
      eq(await ctx.count(c, undefined, read(BOB)), 3, "count is wrong for bob");
    }
  },

  {
    id: 'acl/distinct-reveals-only-visible-values',
    area: 'acl',
    pins: 'distinct() applies the ACL — otherwise private column values leak wholesale',
    async run(ctx) {
      const { c } = await seed(ctx);
      const values = (await ctx.distinct(c, 'title', undefined, read(ANON))).map(String).sort();
      deepEq(values, ['alice world-readable', 'public'], 'distinct leaked values from rows the caller cannot read');
    }
  },

  {
    id: 'acl/aggregate-computes-only-over-visible-rows',
    area: 'acl',
    pins: 'aggregate() applies the ACL — otherwise private values leak as arithmetic',
    async run(ctx) {
      const { c } = await seed(ctx);
      const got = await ctx.aggregate(c, { total: { sum: 'score' } }, undefined, read(ANON));
      // public(1) + world-readable(8) = 9. The full table sums to 125.
      eq(Number(got.total), 9, 'aggregate summed rows the caller cannot read');
    }
  },

  {
    id: 'acl/fetch-of-an-invisible-row-does-not-return-it',
    area: 'acl',
    pins: 'a direct fetch by objectId cannot bypass the predicate',
    async run(ctx) {
      // Fetching by a known id is the cheapest bypass to try, and an adapter
      // that routes fetch around the ACL path fails only here.
      const { c, ids } = await seed(ctx);
      let leaked: Record<string, unknown> | undefined;
      try {
        leaked = await ctx.fetch(c, ids.bobPriv, read(ALICE));
      } catch {
        return; // Refusing is the other acceptable answer.
      }
      ok(
        !leaked || leaked.objectId === undefined,
        "alice fetched bob's private row by objectId — fetch bypassed the ACL predicate"
      );
    }
  },

  {
    id: 'acl/a-non-owner-cannot-save',
    area: 'acl',
    pins: 'a write to a row the caller cannot write is refused, and the row is untouched',
    async run(ctx) {
      const { c, ids } = await seed(ctx);
      try {
        await ctx.save(c, ids.bobPriv, { title: 'defaced' }, write(ALICE));
      } catch {
        // Refused, as it must be.
      }
      const after = await ctx.fetch(c, ids.bobPriv);
      eq(after.title, 'bob private', "a non-owner's save modified the row");
    }
  },

  {
    id: 'acl/a-non-owner-cannot-delete',
    area: 'acl',
    pins: 'a delete of a row the caller cannot write leaves it in place',
    async run(ctx) {
      const { c, ids } = await seed(ctx);
      try {
        await ctx.remove(c, ids.bobPriv, write(ALICE));
      } catch {
        // Refused, as it must be.
      }
      const after = await ctx.fetch(c, ids.bobPriv);
      eq(after.objectId, ids.bobPriv, "a non-owner's delete removed the row");
    }
  },

  {
    id: 'acl/a-non-owner-cannot-increment',
    area: 'acl',
    pins: 'increment is a write, and is refused like one',
    async run(ctx) {
      // The door an ACL implementation most often leaves open: increment
      // reaches the row by a different code path from save, and a value that
      // can be incremented without permission can also be *read* by
      // incrementing by zero and watching the answer.
      const { c, ids } = await seed(ctx);
      try {
        await ctx.increment(c, ids.bobPriv, { score: 1000 }, write(ALICE));
      } catch {
        // Refused, as it must be.
      }
      const after = await ctx.fetch(c, ids.bobPriv);
      eq(after.score, 16, "a non-owner's increment changed the stored value");
    }
  },

  {
    id: 'acl/an-owner-can-write-their-own-row',
    area: 'acl',
    pins: 'the control — enforcement that denies everything proves nothing',
    async run(ctx) {
      // 🔴 Without this case every one above passes against an adapter that
      // refuses every write. A negative arm needs its control in the same run.
      const { c, ids } = await seed(ctx);
      await ctx.save(c, ids.alicePriv, { title: 'alice edited' }, write(ALICE));
      const after = await ctx.fetch(c, ids.alicePriv);
      eq(after.title, 'alice edited', 'an owner was refused a write to their own row');
    }
  }
]);
