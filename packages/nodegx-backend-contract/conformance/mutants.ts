/**
 * Mutants — the proof that the suite can fail.
 *
 * BRG-003 AC3: *"A deliberately broken adapter … fails the suite, one distinct
 * failure per mutation, and each is recorded here by name. A suite that cannot
 * fail proves nothing."*
 *
 * Each mutation is a plausible way a second adapter gets it wrong — not a
 * cartoon break. `drop-acl-on-reads` is what you get by filtering in
 * application code after the query rather than putting the predicate in the
 * SQL; `count-returns-page-length` is the single most common pagination bug
 * there is; `ignore-unique` is **BRG-D2 itself**, which is live in the Postgres
 * exporter at HEAD. If the suite cannot catch these, it cannot catch BRG-005
 * getting them wrong either.
 *
 * These live beside the suite rather than in a test file because BRG-005 needs
 * them: the Postgres adapter should be checked against the same mutations, and
 * a mutation list maintained twice diverges.
 *
 * @module conformance/mutants
 */

import type { IStorageAdapter, IStorageSchema, StorageIndexDecl } from '../src/storage';

/** The mutations, by name. AC3 records failures against these. */
export type MutationKind =
  | 'drop-acl-on-reads'
  | 'drop-acl-on-writes'
  | 'count-returns-page-length'
  | 'ignore-unique'
  | 'relation-inverse-ignores-target'
  | 'aggregate-ignores-acl'
  | 'drop-precondition-on-save'
  | 'drop-where-on-index'
  | 'skip-checks';

export const MUTATIONS: readonly MutationKind[] = Object.freeze([
  'drop-acl-on-reads',
  'drop-acl-on-writes',
  'count-returns-page-length',
  'ignore-unique',
  'relation-inverse-ignores-target',
  'aggregate-ignores-acl',
  'drop-precondition-on-save',
  'drop-where-on-index',
  'skip-checks'
]);

/** What each mutation models, for the record AC3 asks for. */
export const MUTATION_DESCRIPTIONS: Readonly<Record<MutationKind, string>> = Object.freeze({
  'drop-acl-on-reads':
    'the row ACL predicate is not applied to query/count/distinct — what an adapter does when it filters in application code after the fact, or forgets the predicate on one read shape',
  'drop-acl-on-writes':
    'save/delete/increment do not check write permission — a non-owner can modify any row they can name',
  'count-returns-page-length':
    'count reports the length of the returned page rather than the size of the matching set — paginates to exactly one page',
  'ignore-unique':
    'a declared index is built, but `unique: true` is dropped — BRG-D2, live in the Postgres exporter at HEAD, where the dedupe guarantee silently becomes false',
  'relation-inverse-ignores-target':
    'getRelationOwners ignores its relatedId and returns every owner — reads as "everyone has this role"',
  'aggregate-ignores-acl':
    'aggregate computes over rows the caller cannot read — private values leak as arithmetic',
  'drop-precondition-on-save':
    'save ignores `expect` (HLT-016) and writes unconditionally — the lost update DBT L62 shipped, reported as success',
  'drop-where-on-index':
    'a partial index is built as a full one (HLT-016) — the predicate a parser or an exporter drops, which refuses every row the declaration deliberately allowed',
  'skip-checks':
    'a declared check is recorded but never enforced (HLT-016) — the rule reads as present in the schema while every row it forbids is written'
});

/**
 * Drop the `acl` context from a call, keeping the call's own type.
 *
 * Generic rather than `Record<string, unknown>`: the first version widened
 * every call shape to an index signature, which typechecked nowhere and — because
 * this package's cases run under the backend's ts-jest with
 * `isolatedModules: true`, which transpiles without typechecking — still went
 * green under jest. `tsc --noEmit` is the gate that saw it.
 */
function stripAcl<T extends { acl?: unknown }>(options: T): T {
  const { acl: _dropped, ...rest } = options;
  return rest as T;
}

/**
 * Wrap a real adapter so that exactly one property is broken.
 *
 * Everything not named by the mutation delegates untouched, so a failure the
 * suite reports against a mutant is attributable to that one mutation and not
 * to the wrapper.
 */
export function mutate(adapter: IStorageAdapter, kind: MutationKind): IStorageAdapter {

  const schema: IStorageSchema =
    kind === 'ignore-unique'
      ? Object.create(adapter.schemaManager, {
          reconcileIndexes: {
            value(table: string, indexes: unknown) {
              // Build the index, but quietly drop the uniqueness — exactly what
              // generatePostgresSQL() does today by emitting no index at all.
              const stripped = Array.isArray(indexes)
                ? (indexes as StorageIndexDecl[]).map((i) => ({ ...i, unique: false }))
                : indexes;
              return adapter.schemaManager.reconcileIndexes?.(table, stripped);
            },
            enumerable: true
          }
        })
      : kind === 'drop-where-on-index'
        ? Object.create(adapter.schemaManager, {
            reconcileIndexes: {
              value(table: string, indexes: unknown) {
                const stripped = Array.isArray(indexes)
                  ? (indexes as StorageIndexDecl[]).map((i) => {
                      const rest = { ...i };
                      delete rest.where;
                      return rest;
                    })
                  : indexes;
                return adapter.schemaManager.reconcileIndexes?.(table, stripped);
              },
              enumerable: true
            }
          })
      : kind === 'skip-checks'
        ? Object.create(adapter.schemaManager, {
            reconcileChecks: {
              value(table: string, checks: unknown) {
                // Report success and enforce nothing.
                const declared = Array.isArray(checks) ? checks : [];
                return { created: [], dropped: [], kept: [], checks: declared };
              },
              enumerable: true
            }
          })
      : kind === 'relation-inverse-ignores-target'
        ? Object.create(adapter.schemaManager, {
            getRelationOwners: {
              value(table: string, key: string, relatedId: string) {
                // Models an inverse lookup that under-constrains its target:
                // the real owners, plus one that has no such edge. That is
                // what a JOIN missing its `relatedId` predicate returns, and
                // on the authorization path it reads as a user holding a role
                // nobody granted them.
                return adapter.schemaManager.getRelationOwners(table, key, relatedId).concat('phantom-owner');
              },
              enumerable: true
            }
          })
        : adapter.schemaManager;

  const wrapper: IStorageAdapter = {
    connect: () => adapter.connect(),
    disconnect: () => adapter.disconnect(),
    getPersistenceStatus: () => adapter.getPersistenceStatus(),
    transaction: <T>(fn: () => T): T => adapter.transaction(fn),
    schemaManager: schema,

    query(options) {
      if (kind === 'drop-acl-on-reads') {
        adapter.query(stripAcl(options));
        return;
      }
      adapter.query(options);
    },
    search(options) {
      if (kind === 'drop-acl-on-reads') {
        // 🔴 Added when the AC6 gate found that NO case called `search` at all
        // (s4). Search is the read shape where forgetting the predicate costs
        // most: an index built over the text of private rows answers on their
        // CONTENT, so the leak is what the rows say and not merely that they
        // exist. A mutant that left search filtered was modelling an adapter
        // more careful than any real one.
        adapter.search(stripAcl(options));
        return;
      }
      adapter.search(options);
    },

    fetch(options) {
      if (kind === 'drop-acl-on-reads') {
        // The same hole, found beside it: `acl/fetch-of-an-invisible-row-does-
        // not-return-it` existed from s2 and no mutation could make it fail,
        // so the case was pinning nothing that had been shown to move.
        adapter.fetch(stripAcl(options));
        return;
      }
      adapter.fetch(options);
    },

    create: (options) => adapter.create(options),

    save(options) {
      if (kind === 'drop-acl-on-writes') {
        adapter.save(stripAcl(options));
        return;
      }
      if (kind === 'drop-precondition-on-save') {
        const unguarded = { ...options };
        delete unguarded.expect;
        adapter.save(unguarded);
        return;
      }
      adapter.save(options);
    },

    delete(options) {
      if (kind === 'drop-acl-on-writes') {
        adapter.delete(stripAcl(options));
        return;
      }
      adapter.delete(options);
    },

    increment(options) {
      if (kind === 'drop-acl-on-writes') {
        adapter.increment(stripAcl(options));
        return;
      }
      adapter.increment(options);
    },

    count(options) {
      if (kind === 'count-returns-page-length') {
        // The page-length bug: answer with whatever one default page holds.
        adapter.query({
          collection: options.collection,
          where: options.where,
          acl: options.acl,
          limit: 2,
          success: (results) => options.success(results.length),
          error: options.error
        });
        return;
      }
      if (kind === 'drop-acl-on-reads') {
        adapter.count(stripAcl(options));
        return;
      }
      adapter.count(options);
    },

    distinct(options) {
      if (kind === 'drop-acl-on-reads') {
        adapter.distinct(stripAcl(options));
        return;
      }
      adapter.distinct(options);
    },

    aggregate(options) {
      if (kind === 'aggregate-ignores-acl' || kind === 'drop-acl-on-reads') {
        adapter.aggregate(stripAcl(options));
        return;
      }
      adapter.aggregate(options);
    },

    addRelation: (options) => adapter.addRelation(options),
    removeRelation: (options) => adapter.removeRelation(options)
  };

  if (typeof adapter.on === 'function') wrapper.on = (t, h) => adapter.on!(t, h);
  if (typeof adapter.off === 'function') wrapper.off = (t, h) => adapter.off!(t, h);

  return wrapper;
}
