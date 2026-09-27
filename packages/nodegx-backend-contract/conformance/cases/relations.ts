/**
 * Relations, and the junction behaviour underneath them.
 *
 * BRG-003 §3.2 puts relations in the promise because of **BRG-D3**: relation
 * columns currently vanish from the Postgres export entirely
 * (`POSTGRES_TYPE_MAP.Relation = null`, so `if (pgType)` skips them with no
 * warning and no error). These cases are what turns that from a defect someone
 * noticed into a defect CI cannot ship past.
 *
 * 🔴 **The junction table's name is not in the promise.** BRG-002 §6.1 measured
 * this the expensive way: `security/state.ts` needed the inverse of
 * `getRelatedIds`, and querying `_Join_users__Role` as an ordinary collection
 * *worked* — while being the wrong answer, because the junction name is the
 * SQLite adapter's private storage convention. An adapter storing relations as
 * an array column, a jsonb field or a real foreign table must pass every case
 * here. So no case names a junction table, and the inverse lookup is asserted
 * through `getRelationOwners()` — the one member of the schema interface that
 * was not already an object-method call.
 *
 * @module conformance/cases/relations
 */

import { deepEq, eq, ok } from '../assert';
import type { ConformanceCase } from '../index';

export const relationCases: readonly ConformanceCase[] = Object.freeze([
  {
    id: 'relations/add-then-read-back',
    area: 'relations',
    pins: 'a relation added through addRelation is readable through getRelatedIds',
    async run(ctx) {
      const owners = ctx.collection('RelOwner');
      const targets = ctx.collection('RelTarget');
      const owner = await ctx.create(owners, { title: 'owner' });
      const t1 = await ctx.create(targets, { title: 't1' });
      const t2 = await ctx.create(targets, { title: 't2' });

      await ctx.addRelation(owners, String(owner.objectId), 'items', String(t1.objectId));
      await ctx.addRelation(owners, String(owner.objectId), 'items', String(t2.objectId));

      const related = ctx.schema.getRelatedIds(owners, String(owner.objectId), 'items');
      const ids = (Array.isArray(related) ? related : []).map(String).sort();
      deepEq(ids, [String(t1.objectId), String(t2.objectId)].sort(), 'the related ids did not come back');
    }
  },

  {
    id: 'relations/remove-detaches-only-the-named-target',
    area: 'relations',
    pins: 'removeRelation detaches one edge and leaves the siblings attached',
    async run(ctx) {
      const owners = ctx.collection('RelOwner');
      const targets = ctx.collection('RelTarget');
      const owner = await ctx.create(owners, { title: 'owner' });
      const t1 = await ctx.create(targets, { title: 't1' });
      const t2 = await ctx.create(targets, { title: 't2' });
      await ctx.addRelation(owners, String(owner.objectId), 'items', String(t1.objectId));
      await ctx.addRelation(owners, String(owner.objectId), 'items', String(t2.objectId));

      await ctx.removeRelation(owners, String(owner.objectId), 'items', String(t1.objectId));

      const related = ctx.schema.getRelatedIds(owners, String(owner.objectId), 'items');
      const ids = (Array.isArray(related) ? related : []).map(String);
      deepEq(ids, [String(t2.objectId)], 'removeRelation detached the wrong edge, or too many');
    }
  },

  {
    id: 'relations/keys-are-independent',
    area: 'relations',
    pins: 'two relation keys on one row do not share storage',
    async run(ctx) {
      const owners = ctx.collection('RelOwner');
      const targets = ctx.collection('RelTarget');
      const owner = await ctx.create(owners, { title: 'owner' });
      const a = await ctx.create(targets, { title: 'a' });
      const b = await ctx.create(targets, { title: 'b' });

      await ctx.addRelation(owners, String(owner.objectId), 'items', String(a.objectId));
      await ctx.addRelation(owners, String(owner.objectId), 'tags', String(b.objectId));

      const items = ctx.schema.getRelatedIds(owners, String(owner.objectId), 'items');
      const tags = ctx.schema.getRelatedIds(owners, String(owner.objectId), 'tags');
      deepEq((Array.isArray(items) ? items : []).map(String), [String(a.objectId)], 'the `items` key is wrong');
      deepEq((Array.isArray(tags) ? tags : []).map(String), [String(b.objectId)], 'the `tags` key is wrong');
    }
  },

  {
    id: 'relations/inverse-lookup-finds-the-owners',
    area: 'relations',
    pins: 'getRelationOwners answers "who points at this", the inverse of getRelatedIds',
    async run(ctx) {
      // BRG-002 added this member because `rolesForUser` needed exactly this
      // direction and `$relatedTo` answers the other one. It is in the promise
      // like everything else on the interface: a security module resolving a
      // user's roles depends on it, so an adapter that implements only the
      // forward direction returns "this user has no roles" rather than an
      // error — a permissions outage that reads as an empty answer.
      const owners = ctx.collection('RelOwner');
      const targets = ctx.collection('RelTarget');
      const o1 = await ctx.create(owners, { title: 'o1' });
      const o2 = await ctx.create(owners, { title: 'o2' });
      const o3 = await ctx.create(owners, { title: 'o3' });
      const shared = await ctx.create(targets, { title: 'shared' });
      const other = await ctx.create(targets, { title: 'other' });

      await ctx.addRelation(owners, String(o1.objectId), 'items', String(shared.objectId));
      await ctx.addRelation(owners, String(o2.objectId), 'items', String(shared.objectId));
      await ctx.addRelation(owners, String(o3.objectId), 'items', String(other.objectId));

      const found = ctx.schema.getRelationOwners(owners, 'items', String(shared.objectId));
      ok(Array.isArray(found), 'getRelationOwners did not return an array');
      deepEq(
        found.map(String).sort(),
        [String(o1.objectId), String(o2.objectId)].sort(),
        'the inverse lookup returned the wrong owners'
      );
    }
  },

  {
    id: 'relations/inverse-lookup-of-an-unrelated-target-is-empty',
    area: 'relations',
    pins: 'the inverse lookup returns nothing rather than everything when there is no edge',
    async run(ctx) {
      // The negative arm. Without it, an adapter whose inverse lookup ignores
      // its `relatedId` argument and returns every owner passes the case above.
      const owners = ctx.collection('RelOwner');
      const targets = ctx.collection('RelTarget');
      const o1 = await ctx.create(owners, { title: 'o1' });
      const attached = await ctx.create(targets, { title: 'attached' });
      const orphan = await ctx.create(targets, { title: 'orphan' });
      await ctx.addRelation(owners, String(o1.objectId), 'items', String(attached.objectId));

      const found = ctx.schema.getRelationOwners(owners, 'items', String(orphan.objectId));
      deepEq((Array.isArray(found) ? found : []).map(String), [], 'the inverse lookup ignored its target argument');
    }
  },

  {
    id: 'relations/relatedTo-filters-by-membership',
    area: 'relations',
    pins: '$relatedTo narrows a query to the members of one relation',
    async run(ctx) {
      const owners = ctx.collection('RelOwner');
      const targets = ctx.collection('RelTarget');
      const owner = await ctx.create(owners, { title: 'owner' });
      const inRel = await ctx.create(targets, { title: 'in' });
      await ctx.create(targets, { title: 'out' });
      await ctx.addRelation(owners, String(owner.objectId), 'items', String(inRel.objectId));

      const got = await ctx.query(targets, {
        where: { $relatedTo: { object: { objectId: String(owner.objectId), className: owners }, key: 'items' } }
      });
      eq(got.results.length, 1, '$relatedTo returned the wrong number of members');
      eq(got.results[0].title, 'in', '$relatedTo returned the wrong member');
    }
  }
]);
