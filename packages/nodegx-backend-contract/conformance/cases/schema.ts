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
import type { StorageColumn } from '../../src/storage';

/** The optional members are feature-detected, exactly as their call sites do. */
function hasIndexSupport(ctx: ConformanceContext): boolean {
  return typeof ctx.schema.reconcileIndexes === 'function' && typeof ctx.schema.indexStatus === 'function';
}

function hasCheckSupport(ctx: ConformanceContext): boolean {
  return typeof ctx.schema.reconcileChecks === 'function' && typeof ctx.schema.checkStatus === 'function';
}

/**
 * The message a SCHEMA call throws with. `ctx.refused` is for the data plane
 * (only an `AdapterRefusal` counts there); a schema manager refuses
 * synchronously, and its `code: 'COLUMN_IN_USE'` is what BMG-003 pins.
 */
function thrownBy(fn: () => unknown): string {
  try {
    fn();
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code !== 'COLUMN_IN_USE') throw new Error(`refused with code ${String(e.code)}, not COLUMN_IN_USE: ${String(e.message)}`);
    return String(e.message);
  }
  throw new Error('expected the call to be refused, and it succeeded');
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
    id: 'schema/a-partial-unique-index-holds-only-where-it-says',
    area: 'schema',
    pins: 'HLT-016: `where` narrows a unique index to the rows it matches — enforced by the database, on both sides of it',
    async run(ctx) {
      // The DBT product's `lessons_one_pinned_per_learner_concept`: one pinned
      // lesson per (learner, concept), any number unpinned. An adapter that
      // drops the predicate builds a full unique index, which refuses the
      // second UNPINNED row below — so both halves are asserted, not one.
      if (!hasIndexSupport(ctx)) {
        throw new Error('reconcileIndexes/indexStatus are absent — declare this case unsupported (§3.4)');
      }
      const c = ctx.collection('Sch');
      ctx.createTable(c, [
        { name: 'learner', type: 'String' },
        { name: 'concept', type: 'String' },
        { name: 'pinned', type: 'Boolean' }
      ]);
      ctx.schema.reconcileIndexes!(c, [{ fields: ['learner', 'concept'], unique: true, where: { pinned: true } }]);

      await ctx.create(c, { learner: 'L', concept: 'C', pinned: false });
      await ctx.create(c, { learner: 'L', concept: 'C', pinned: false });
      eq(await ctx.count(c), 2, 'a partial unique index refused a row outside its predicate');

      await ctx.create(c, { learner: 'L', concept: 'C', pinned: true });
      await ctx.refused(() => ctx.create(c, { learner: 'L', concept: 'C', pinned: true }));
      eq(await ctx.count(c), 3, 'a second row inside the predicate landed despite the partial unique index');

      const found = ctx.schema.indexStatus!(c).find((s) => deepEqFields(s.fields, ['learner', 'concept']));
      ok(found !== undefined, 'the partial index is absent from indexStatus');
      ok(found.built && found.declared, 'the partial index is not reported as built and declared');
      deepEq(found.where, { pinned: true }, 'indexStatus lost the predicate');
    }
  },

  {
    id: 'schema/a-check-refuses-a-row-that-breaks-it',
    area: 'schema',
    pins: 'HLT-016: a declared check is enforced by the database on create AND update, and admits the rows that satisfy it',
    async run(ctx) {
      // The DBT product's `assignments_one_scope`: an assignment belongs to a
      // learner or to a cohort, never both and never neither. Before this a
      // rule like that lived as a branch in whichever function wrote the table,
      // which is a filter, not a constraint.
      if (!hasCheckSupport(ctx)) {
        throw new Error('reconcileChecks/checkStatus are absent — declare this case unsupported (§3.4)');
      }
      const c = ctx.collection('Sch');
      ctx.createTable(c, [
        { name: 'learner', type: 'String' },
        { name: 'cohort', type: 'String' },
        { name: 'score', type: 'Number' }
      ]);
      ctx.schema.reconcileChecks!(c, [{ exactlyOne: ['learner', 'cohort'] }, { field: 'score', min: 1, max: 10 }]);

      const ok1 = await ctx.create(c, { learner: 'L', score: 5 });
      await ctx.create(c, { cohort: 'C' });
      eq(await ctx.count(c), 2, 'a row that satisfies every check was refused');

      await ctx.refused(() => ctx.create(c, { learner: 'L', cohort: 'C' }));
      await ctx.refused(() => ctx.create(c, { score: 5 }));
      await ctx.refused(() => ctx.create(c, { learner: 'L', score: 11 }));
      eq(await ctx.count(c), 2, 'a row that breaks a check landed');

      await ctx.refused(() => ctx.save(c, ok1.objectId as string, { cohort: 'C' }));
      const after = await ctx.fetch(c, ok1.objectId as string);
      eq(after.cohort ?? null, null, 'an update that breaks a check was applied');

      const status = ctx.schema.checkStatus!(c);
      ok(
        status.length === 2 && status.every((s) => s.built && s.declared),
        'checkStatus does not report both checks as built'
      );
    }
  },

  {
    id: 'schema/drop-column-removes-it-and-refuses-one-in-use',
    area: 'schema',
    pins: 'BMG-003: dropColumn removes the column from the schema and from reads; a column a declared index or check reads is refused by name, and nothing is dropped with it',
    async run(ctx) {
      if (typeof ctx.schema.dropColumn !== 'function') {
        throw new Error('dropColumn is absent — declare this case unsupported (§3.4)');
      }
      const c = ctx.collection('Sch');
      ctx.createTable(c, [
        { name: 'title', type: 'String' },
        { name: 'colour', type: 'String' },
        { name: 'score', type: 'Number' }
      ]);
      const row = await ctx.create(c, { title: 'T', colour: 'red', score: 5 });

      ok(ctx.schema.dropColumn(c, 'colour') === true, 'dropColumn did not report the drop');
      const schema = ctx.schema.getTableSchema(c);
      ok(!!schema && !(schema.columns || []).some((col) => col.name === 'colour'), 'the dropped column is still declared');
      const back = await ctx.fetch(c, row.objectId as string);
      ok(!('colour' in back), 'a read still carries the dropped column');
      eq(back.title, 'T', 'dropping one column disturbed another');

      if (hasIndexSupport(ctx)) {
        ctx.schema.reconcileIndexes!(c, [{ fields: ['title'], unique: true }]);
        const why = thrownBy(() => ctx.schema.dropColumn!(c, 'title'));
        ok(/idx_/.test(why), `the refusal does not name the index: ${why}`);
        ok((ctx.schema.getTableSchema(c)?.columns || []).some((col) => col.name === 'title'), 'a refused drop dropped the column anyway');
        // A field only the index's `where` reads is read by it too: PostgreSQL would take the index with the column.
        ctx.schema.reconcileIndexes!(c, [{ fields: ['title'], unique: true, where: { score: 5 } }]);
        const onlyWhere = thrownBy(() => ctx.schema.dropColumn!(c, 'score'));
        ok(/idx_/.test(onlyWhere), `the refusal does not name the index whose where reads it: ${onlyWhere}`);
        ctx.schema.reconcileIndexes!(c, []);
      }
      if (hasCheckSupport(ctx)) {
        ctx.schema.reconcileChecks!(c, [{ field: 'score', min: 0 }]);
        const why = thrownBy(() => ctx.schema.dropColumn!(c, 'score'));
        ok(/score is at least 0/.test(why), `the refusal does not name the rule: ${why}`);
        // With the rule gone, the drop goes through.
        ctx.schema.reconcileChecks!(c, []);
        ok(ctx.schema.dropColumn(c, 'score') === true, 'the drop was refused after the rule was removed');
      }
      const after = await ctx.fetch(c, row.objectId as string);
      ok(!('score' in after) || !hasCheckSupport(ctx), 'a read still carries the second dropped column');
    }
  },
  {
    id: 'schema/rename-column-keeps-its-values-and-refuses-one-in-use',
    area: 'schema',
    pins:
      'P116-ONT-007-renamecolumn: renameColumn keeps the values under the new name; a column a declared index or check ' +
      'reads is refused by name, as dropColumn refuses it, and nothing is renamed — a rename that went through left the ' +
      'rule naming a field that is gone, still reported built, and the same declaration pushed again was refused',
    async run(ctx) {
      const c = ctx.collection('Sch');
      ctx.createTable(c, [
        { name: 'title', type: 'String' },
        { name: 'tier', type: 'String' }
      ]);
      const row = await ctx.create(c, { title: 'T', tier: 'gold' });
      const declared = () => (ctx.schema.getTableSchema(c)?.columns || []).map((col) => col.name);

      ctx.schema.renameColumn(c, 'title', 'name');
      ok(declared().includes('name') && !declared().includes('title'), `the declaration did not follow the rename: ${declared().join(', ')}`);
      const back = await ctx.fetch(c, row.objectId as string);
      eq(back.name, 'T', 'the renamed column lost its value');
      ok(!('title' in back), 'a read still carries the old name');

      if (hasIndexSupport(ctx)) {
        ctx.schema.reconcileIndexes!(c, [{ fields: ['name'], unique: true }]);
        const why = thrownBy(() => ctx.schema.renameColumn(c, 'name', 'label'));
        ok(/rename/.test(why) && /idx_/.test(why), `the refusal does not say rename and name the index: ${why}`);
        ok(declared().includes('name') && !declared().includes('label'), 'a refused rename renamed the column anyway');
        ctx.schema.reconcileIndexes!(c, [{ fields: ['name'], unique: true, where: { tier: 'gold' } }]);
        const onlyWhere = thrownBy(() => ctx.schema.renameColumn(c, 'tier', 'level'));
        ok(/idx_/.test(onlyWhere), `the refusal does not name the index whose where reads it: ${onlyWhere}`);
        ctx.schema.reconcileIndexes!(c, []);
      }
      if (hasCheckSupport(ctx)) {
        const rule = { field: 'tier', oneOf: ['basic', 'gold'] };
        ctx.schema.reconcileChecks!(c, [rule]);
        const why = thrownBy(() => ctx.schema.renameColumn(c, 'tier', 'level'));
        ok(/rename/.test(why) && /tier is one of basic, gold/.test(why), `the refusal does not say rename and name the rule: ${why}`);
        ok(declared().includes('tier') && !declared().includes('level'), 'a refused rename renamed the column anyway');
        // The declaration still reads true: pushed again as it stands, it is accepted.
        ctx.schema.reconcileChecks!(c, [rule]);
        // With the rule taken off, the rename goes through.
        ctx.schema.reconcileChecks!(c, []);
        ctx.schema.renameColumn(c, 'tier', 'level');
        const after = await ctx.fetch(c, row.objectId as string);
        eq(after.level, 'gold', 'the rename after the rule came off lost the value');
      }
    }
  },
  {
    id: 'schema/delete-table-takes-only-its-own-relations',
    area: 'schema',
    pins:
      "P116-ONT-007-junctions: deleteTable drops the junction tables of the collection it deletes and no other's — a " +
      'name match took the links of every collection whose name ended with its name ("Account" took "MyAccount"\'s on ' +
      'one engine and "My_Account"\'s on both) — and leaves none of its own behind, declared or made by addRelation alone',
    async run(ctx) {
      if (typeof ctx.schema.deleteTable !== 'function') {
        throw new Error('deleteTable is absent — declare this case unsupported (§3.4)');
      }
      const base = ctx.collection('Acct');
      const tags = ctx.collection('Tag');
      const names = [base, `My${base}`, `My_${base}`];
      ctx.createTable(tags, [{ name: 'label', type: 'String' }]);
      const t = String((await ctx.create(tags, { label: 't' })).objectId);
      const owner: Record<string, string> = {};
      const related = async (n: string, key: string): Promise<string[]> => {
        const got = await Promise.resolve(ctx.schema.getRelatedIds(n, owner[n], key));
        return (Array.isArray(got) ? got : []).map(String);
      };
      for (const n of names) {
        ctx.createTable(n, [{ name: 'tags', type: 'Relation', targetClass: tags }]);
        owner[n] = String((await ctx.create(n, { title: n })).objectId);
        await ctx.addRelation(n, owner[n], 'tags', t);
      }
      // A key nothing declares, made by addRelation alone: it is the deleted collection's too.
      await ctx.addRelation(base, owner[base], 'loose', t);
      for (const n of names) deepEq(await related(n, 'tags'), [t], `the control: "${n}" has its link before the delete`);
      deepEq(await related(base, 'loose'), [t], 'the control: the undeclared link is there before the delete');

      ok(ctx.schema.deleteTable(base) === true, 'deleteTable did not report the delete');
      for (const n of names.slice(1)) deepEq(await related(n, 'tags'), [t], `deleting "${base}" took "${n}"'s links`);
      // Made again under the same name, the collection has none of the old links.
      ctx.createTable(base, [{ name: 'tags', type: 'Relation', targetClass: tags }]);
      deepEq(await related(base, 'tags'), [], 'the deleted collection\'s declared links came back with its name');
      deepEq(await related(base, 'loose'), [], 'the deleted collection\'s undeclared links came back with its name');
    }
  },
  {
    id: 'schema/set-when-target-goes-changes-the-declaration',
    area: 'schema',
    pins: 'P116 R10: setWhenTargetGoes changes what a link says happens when its record goes — read back by getTableSchema, taken away by null, refused on a field that is not a link and on a required one told to stay without it; the other columns untouched',
    async run(ctx) {
      if (typeof ctx.schema.setWhenTargetGoes !== 'function') {
        throw new Error('setWhenTargetGoes is absent — declare this case unsupported (§3.4)');
      }
      const target = ctx.collection('SchT');
      const c = ctx.collection('Sch');
      ctx.createTable(target, [{ name: 'name', type: 'String' }]);
      ctx.schema.createTable({
        name: c,
        columns: [
          { name: 'title', type: 'String' },
          { name: 'owner', type: 'Pointer', targetClass: target, whenTargetGoes: 'blocks' },
          { name: 'must', type: 'Pointer', targetClass: target, required: true } as StorageColumn
        ]
      });
      const rule = (field: string) => (ctx.schema.getTableSchema(c)?.columns || []).find((col) => col.name === field)?.whenTargetGoes;
      eq(rule('owner'), 'blocks', 'createTable did not keep the rule');

      ok(ctx.schema.setWhenTargetGoes(c, { owner: 'goes-too', must: 'blocks' }) === true, 'setWhenTargetGoes did not report the change');
      eq(rule('owner'), 'goes-too', 'the changed rule is not read back');
      eq(rule('must'), 'blocks', 'a rule put on a link that had none is not read back');

      ok(/link|Pointer/i.test(refusalOf(() => ctx.schema.setWhenTargetGoes!(c, { title: 'blocks' }))), 'a rule on a text field was not refused as not a link');
      ok(/required/i.test(refusalOf(() => ctx.schema.setWhenTargetGoes!(c, { must: 'stays-unlinked' }))), 'stays-unlinked on a required link was not refused');
      ok(/nope/.test(refusalOf(() => ctx.schema.setWhenTargetGoes!(c, { nope: 'blocks' }))), 'a field the collection does not have was not refused');
      eq(rule('must'), 'blocks', 'a refused change changed the rule anyway');

      ctx.schema.setWhenTargetGoes(c, { owner: null });
      eq(rule('owner'), undefined, 'null did not take the rule away');
      ok(deepEqFields((ctx.schema.getTableSchema(c)?.columns || []).map((col) => col.name), ['title', 'owner', 'must']), 'setWhenTargetGoes disturbed the columns');
    }
  },
  {
    id: 'schema/set-required-over-records',
    area: 'schema',
    pins:
      'P116-ONT-007-required: setRequired makes a field the records already have required, and optional again — refused in the same words, naming how many, while a record holds none (and nothing changes); kept by the next create once it goes through; every record and value kept; a list, a system field and an unknown field refused; a second ask reports nothing done',
    async run(ctx) {
      if (typeof ctx.schema.setRequired !== 'function') {
        throw new Error('setRequired is absent — declare this case unsupported (§3.4)');
      }
      const target = ctx.collection('ReqT');
      const c = ctx.collection('Req');
      ctx.createTable(target, [{ name: 'name', type: 'String' }]);
      ctx.createTable(c, [
        { name: 'title', type: 'String' },
        { name: 'owner', type: 'Pointer', targetClass: target },
        { name: 'tags', type: 'Relation', targetClass: target }
      ]);
      const t = String((await ctx.create(target, { name: 'ada' })).objectId);
      const owner = { __type: 'Pointer', className: target, objectId: t };
      const a = String((await ctx.create(c, { title: 'a', owner })).objectId);
      const b = String((await ctx.create(c, { title: 'b' })).objectId);
      const required = () => ((ctx.schema.getTableSchema(c)?.columns || []).find((col) => col.name === 'owner') as { required?: boolean } | undefined)?.required;
      const set = (columns: Record<string, boolean>) => () => ctx.schema.setRequired!(c, columns);

      const words = await refusedOverRecords(ctx, c, set({ owner: true }));
      ok(/owner/.test(words) && /\b1 record\b/.test(words), `the refusal does not say which field and how many records hold none: ${words}`);
      ok(!required(), 'a refused setRequired left the field declared required');
      await ctx.create(c, { title: 'c' }); // the control: nothing physical changed either
      eq(await ctx.count(c, { owner: { $exists: false } }), 2, 'the control: two records hold no owner');

      for (const id of (await ctx.query(c, { where: { owner: { $exists: false } } })).results.map((r) => String(r.objectId))) {
        await ctx.save(c, id, { owner });
      }
      ok(ctx.schema.setRequired(c, { owner: true }) === true, 'setRequired did not report the change');
      eq(await ctx.count(c), 3, 'records went missing when the field was made required');
      ok(required() === true, 'the field is not read back as required');
      await ctx.refused(() => ctx.create(c, { title: 'd' }));
      await ctx.create(c, { title: 'e', owner });
      const kept = await ctx.fetch(c, a);
      eq(kept.title, 'a', 'a record lost its other values when the field was made required');
      eq((kept.owner as { objectId?: string } | undefined)?.objectId ?? kept.owner, t, 'a record lost its link when the field was made required');
      ok((await ctx.fetch(c, b)).title === 'b', 'a filled record was not kept');
      ok(ctx.schema.setRequired(c, { owner: true }) === false, 'a field already required was reported changed');

      ok(/list/i.test(refusalOf(set({ tags: true }))), 'a list of links was not refused');
      ok(/backend/i.test(refusalOf(set({ objectId: false }))), 'a system field was not refused');
      ok(/nope/.test(refusalOf(set({ nope: true }))), 'a field the collection does not have was not refused');

      ok(ctx.schema.setRequired(c, { owner: false }) === true, 'making it optional did not report the change');
      await ctx.create(c, { title: 'f' });
      ok(!required(), 'the field is still read back as required');
      eq(await ctx.count(c), 5, 'the records are not all there');
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
/** The message of a refusal of any kind; fails the case when the call goes through. */
function refusalOf(fn: () => unknown): string {
  try {
    fn();
  } catch (err) {
    return String((err as { message?: string }).message);
  }
  throw new Error('expected the call to be refused, and it succeeded');
}

/**
 * A schema change refused because of the records already there: SQLite throws it from the call;
 * PostgreSQL queues the change and throws it at the barrier the next data-plane call passes. Either
 * way, the words.
 */
async function refusedOverRecords(ctx: ConformanceContext, collection: string, fn: () => unknown): Promise<string> {
  try {
    fn();
  } catch (err) {
    return String((err as { message?: string }).message);
  }
  return ctx.refused(() => ctx.count(collection));
}

function deepEqFields(a: string[] | undefined, b: string[]): boolean {
  if (!Array.isArray(a) || a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}
