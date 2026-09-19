/**
 * Schema — tables, columns, and the declared indexes of FED-002.
 *
 * BRG-003 §3.2 puts declared indexes and unique constraints in the promise
 * because of **BRG-D2**: `generatePostgresSQL()` hardcodes `createdAt` and
 * `updatedAt` and emits nothing else, so a collection whose `id` is
 * `unique: true` exports as a Postgres table with no unique constraint and the
 * dedupe guarantee silently becomes false.
 *
 * §3.5 names this as the case the gate would have caught: FED-002 landed in
 * phase 96 and quietly broke portability, and nobody could have caught it at
 * review because there was no written interface and no gate. These cases are
 * the gate for the storage half.
 *
 * @module conformance/cases/schema
 */

import { deepEq, eq, ok } from '../assert';
import type { ConformanceCase, ConformanceContext } from '../index';

/** The optional members are feature-detected, exactly as their call sites do. */
function hasIndexSupport(ctx: ConformanceContext): boolean {
  return typeof ctx.schema.reconcileIndexes === 'function' && typeof ctx.schema.indexStatus === 'function';
}

export const schemaCases: readonly ConformanceCase[] = Object.freeze([
  {
    id: 'schema/create-table-then-list-it',
    area: 'schema',
    pins: 'a created table appears in listTables()',
    async run(ctx) {
      const c = ctx.collection('Sch');
      ctx.createTable(c, [{ name: 'title', type: 'String' }]);
      const tables = ctx.schema.listTables();
      ok(Array.isArray(tables), 'listTables did not return an array');
      ok(tables.includes(c), `listTables did not include the table just created (${c})`);
    }
  },

  {
    id: 'schema/table-schema-reports-its-columns',
    area: 'schema',
    pins: 'getTableSchema returns the declared columns with their types',
    async run(ctx) {
      const c = ctx.collection('Sch');
      ctx.createTable(c, [
        { name: 'title', type: 'String' },
        { name: 'score', type: 'Number' }
      ]);
      const schema = ctx.schema.getTableSchema(c);
      ok(schema !== null, 'getTableSchema returned null for a table that exists');
      const byName = new Map((schema.columns ?? []).map((col) => [col.name, col.type]));
      eq(byName.get('title'), 'String', 'the String column is missing or mistyped');
      eq(byName.get('score'), 'Number', 'the Number column is missing or mistyped');
    }
  },

  {
    id: 'schema/add-column-is-visible-to-reads',
    area: 'schema',
    pins: 'a column added after rows exist is readable and writable',
    async run(ctx) {
      const c = ctx.collection('Sch');
      ctx.createTable(c, [{ name: 'title', type: 'String' }]);
      const made = await ctx.create(c, { title: 'before the column' });
      ctx.schema.addColumn(c, { name: 'added', type: 'String' });
      await ctx.save(c, String(made.objectId), { added: 'now set' });
      const got = await ctx.fetch(c, String(made.objectId));
      eq(got.added, 'now set', 'a column added after the fact did not round-trip');
    }
  },

  {
    id: 'schema/unknown-table-reports-null-not-an-empty-schema',
    area: 'schema',
    pins: 'getTableSchema distinguishes "no such table" from "a table with no columns"',
    async run(ctx) {
      const schema = ctx.schema.getTableSchema(ctx.collection('NoSuchTableAnywhere'));
      ok(schema === null, 'getTableSchema invented a schema for a table that does not exist');
    }
  },

  {
    id: 'schema/declared-index-is-built',
    area: 'schema',
    pins: 'FED-002: a declared index is reconciled into the database and reports built',
    async run(ctx) {
      if (!hasIndexSupport(ctx)) {
        throw new Error(
          'reconcileIndexes/indexStatus are absent. They are optional on the interface, so an adapter ' +
            'that cannot build declared indexes must DECLARE this case unsupported with a reason — ' +
            'it must not be silently skipped. See §3.4.'
        );
      }
      const c = ctx.collection('Sch');
      ctx.createTable(c, [
        { name: 'email', type: 'String' },
        { name: 'tenant', type: 'String' }
      ]);
      const report = ctx.schema.reconcileIndexes!(c, [{ fields: ['tenant'] }]);
      ok(report.created.length + report.kept.length >= 1, 'reconcileIndexes reported nothing created or kept');

      const status = ctx.schema.indexStatus!(c);
      const forTenant = status.find((s) => deepEqFields(s.fields, ['tenant']));
      ok(forTenant !== undefined, 'the declared index is absent from indexStatus');
      ok(forTenant.built, 'the declared index was reported as not built');
      ok(forTenant.declared, 'the declared index was reported as undeclared drift');
    }
  },

  {
    id: 'schema/unique-index-refuses-a-duplicate',
    area: 'schema',
    pins: 'FED-002: `unique: true` is a constraint the database enforces, not a label',
    async run(ctx) {
      // 🔴 This is BRG-D2 as an executable case. The dedupe guarantee is the
      // whole point of a unique declaration, and the current Postgres export
      // drops it — so an adapter can pass every other case in this file and
      // still lose the property that makes the declaration worth making.
      if (!hasIndexSupport(ctx)) {
        throw new Error('reconcileIndexes/indexStatus are absent — declare this case unsupported (§3.4)');
      }
      const c = ctx.collection('Sch');
      ctx.createTable(c, [{ name: 'email', type: 'String' }]);
      ctx.schema.reconcileIndexes!(c, [{ fields: ['email'], unique: true }]);

      await ctx.create(c, { email: 'one@example.com' });

      const message = await ctx.refused(() => ctx.create(c, { email: 'one@example.com' }));
      ok(message.length > 0, 'the duplicate was refused without saying why');

      eq(await ctx.count(c), 1, 'a duplicate landed despite a unique index');
    }
  },

  {
    id: 'schema/unique-index-still-admits-distinct-values',
    area: 'schema',
    pins: 'the control — a unique index that refuses everything proves nothing',
    async run(ctx) {
      if (!hasIndexSupport(ctx)) {
        throw new Error('reconcileIndexes/indexStatus are absent — declare this case unsupported (§3.4)');
      }
      const c = ctx.collection('Sch');
      ctx.createTable(c, [{ name: 'email', type: 'String' }]);
      ctx.schema.reconcileIndexes!(c, [{ fields: ['email'], unique: true }]);
      await ctx.create(c, { email: 'one@example.com' });
      await ctx.create(c, { email: 'two@example.com' });
      eq(await ctx.count(c), 2, 'a unique index refused two genuinely distinct values');
    }
  },

  {
    id: 'schema/compound-index-is-unique-over-the-tuple',
    area: 'schema',
    pins: 'a multi-field unique index constrains the combination, not each field',
    async run(ctx) {
      // The multi-tenant shape FED-002 exists for: `email` repeats across
      // tenants, and is unique within one. An adapter that applies the
      // constraint per-column instead of per-tuple refuses the second row here.
      if (!hasIndexSupport(ctx)) {
        throw new Error('reconcileIndexes/indexStatus are absent — declare this case unsupported (§3.4)');
      }
      const c = ctx.collection('Sch');
      ctx.createTable(c, [
        { name: 'email', type: 'String' },
        { name: 'tenant', type: 'String' }
      ]);
      ctx.schema.reconcileIndexes!(c, [{ fields: ['tenant', 'email'], unique: true }]);

      await ctx.create(c, { tenant: 't1', email: 'shared@example.com' });
      await ctx.create(c, { tenant: 't2', email: 'shared@example.com' });
      eq(await ctx.count(c), 2, 'a compound unique index was applied per-column rather than over the tuple');

      await ctx.refused(() => ctx.create(c, { tenant: 't1', email: 'shared@example.com' }));
      eq(await ctx.count(c), 2, 'a duplicate of the full tuple landed');
    }
  },

  {
    id: 'schema/index-declaration-survives-a-reread',
    area: 'schema',
    pins: 'the declaration is stored, not merely applied — otherwise it cannot be exported',
    async run(ctx) {
      // BRG-004 reads these back to emit them. An adapter that builds the index
      // without recording the declaration passes every case above and exports a
      // table with no constraints — which is precisely BRG-D2.
      if (!hasIndexSupport(ctx)) {
        throw new Error('reconcileIndexes/indexStatus are absent — declare this case unsupported (§3.4)');
      }
      const c = ctx.collection('Sch');
      ctx.createTable(c, [{ name: 'email', type: 'String' }]);
      ctx.schema.reconcileIndexes!(c, [{ fields: ['email'], unique: true }]);

      const status = ctx.schema.indexStatus!(c);
      const found = status.find((s) => deepEqFields(s.fields, ['email']));
      ok(found !== undefined, 'the declaration was not readable after being applied');
      ok(found.unique, 'the index was recorded, but not as unique');
    }
  }
]);

/** Field lists compare as ordered tuples — `[a,b]` is not `[b,a]` for an index. */
function deepEqFields(a: string[] | undefined, b: string[]): boolean {
  if (!Array.isArray(a) || a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}
