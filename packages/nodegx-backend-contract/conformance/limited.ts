/**
 * Adapters with a genuine limitation — the material AC5 needs.
 *
 * BRG-003 AC5: *"the declaration mechanism works: a capability marked
 * `unsupported` and then exercised produces a loud failure and never a wrong
 * row; a capability marked `degraded` returns correct rows."*
 *
 * 🔴 **These are not mutants and the difference is the whole point.** A mutant
 * (`./mutants`) is an adapter that is *wrong*: it claims to do something and
 * does it incorrectly, and the suite must catch it. A limited adapter here is
 * one that is *honest*: it genuinely cannot do a thing, says so, and declares
 * it — §3.4's *"declared divergence, not silent divergence"*. The suite must
 * let that through, and must **still** refuse the third shape below, which is
 * the one that looks like the second and is neither.
 *
 * | kind | what it models | what §3.4 says must happen |
 * |---|---|---|
 * | `no-search` | an engine with no full-text index — the real Postgres-without-`tsvector` case | declared `unsupported`: the case fails loudly, and that is **accepted** |
 * | `search-ignores-the-term` | an adapter that "supports" search by returning everything | declared `unsupported`: **rejected**, because it answered, and answered wrongly |
 * | `reordered-reads` | ranking and collation that differ, which they genuinely do between FTS5 and `tsvector` | declared `degraded`: correct rows, different order — every case must still pass |
 *
 * @module conformance/limited
 */

import type { IStorageAdapter } from '../src/storage';

export type LimitationKind = 'no-search' | 'search-ignores-the-term' | 'reordered-reads';

export const LIMITATIONS: readonly LimitationKind[] = Object.freeze([
  'no-search',
  'search-ignores-the-term',
  'reordered-reads'
]);

export const LIMITATION_DESCRIPTIONS: Readonly<Record<LimitationKind, string>> = Object.freeze({
  'no-search':
    'full-text search is refused outright, the way an engine with no text index refuses it — the honest shape a declaration exists for',
  'search-ignores-the-term':
    'search returns every row in the collection, ignoring the term — an adapter that answers rather than refuses, and answers wrongly. This is the shape a declaration must NOT be able to cover',
  'reordered-reads':
    'reads return the correct rows in the reverse order — ranking and collation genuinely differ between FTS5 and tsvector, which is what `degraded` is for'
});

/**
 * Wrap a real adapter so that exactly one capability is limited.
 *
 * Everything not named delegates untouched, for the same reason the mutants do
 * it: a result the suite reports has to be attributable to the limitation and
 * not to the wrapper.
 */
export function limit(adapter: IStorageAdapter, kind: LimitationKind): IStorageAdapter {
  const reversed = <T>(rows: T[]): T[] => [...rows].reverse();

  const wrapper: IStorageAdapter = {
    connect: () => adapter.connect(),
    disconnect: () => adapter.disconnect(),
    getPersistenceStatus: () => adapter.getPersistenceStatus(),
    transaction: <T>(fn: () => T): T => adapter.transaction(fn),
    schemaManager: adapter.schemaManager,

    query(options) {
      // 🔴 Only where no order was asked for. AC5's first run reversed every
      // read, and the two cases that are ABOUT ordering
      // (`records/sort-ascending-and-descending`, `records/limit-skip-and-count-compose`)
      // went red — correctly. Reversing a requested `sort` is not a divergence
      // in ranking, it is an adapter getting `sort` wrong, and `degraded` has
      // no business covering it. §3.4 says *"may differ in order"*, and an
      // order the caller specified is not one the adapter may differ on.
      if (kind === 'reordered-reads' && !options.sort) {
        adapter.query({ ...options, success: (results, count) => options.success(reversed(results), count) });
        return;
      }
      adapter.query(options);
    },

    search(options) {
      if (kind === 'no-search') {
        // A refusal, in the adapter's own voice — this is what
        // `LocalSQLAdapter` itself does when no search index exists.
        options.error('this engine has no full-text index');
        return;
      }
      if (kind === 'search-ignores-the-term') {
        // The dangerous shape: it answers. Every row comes back, filtered by
        // nothing but the where clause and the ACL, and the caller cannot tell
        // from the response that the term was never applied.
        const { search: _ignored, ...rest } = options;
        adapter.query({ ...rest, success: options.success, error: options.error });
        return;
      }
      if (kind === 'reordered-reads' && !options.sort) {
        adapter.search({ ...options, success: (results, count) => options.success(reversed(results), count) });
        return;
      }
      adapter.search(options);
    },

    fetch: (options) => adapter.fetch(options),
    create: (options) => adapter.create(options),
    save: (options) => adapter.save(options),
    delete: (options) => adapter.delete(options),
    count: (options) => adapter.count(options),
    aggregate: (options) => adapter.aggregate(options),

    distinct(options) {
      if (kind === 'reordered-reads') {
        adapter.distinct({ ...options, success: (values) => options.success(reversed(values)) });
        return;
      }
      adapter.distinct(options);
    },

    increment: (options) => adapter.increment(options),
    addRelation: (options) => adapter.addRelation(options),
    removeRelation: (options) => adapter.removeRelation(options)
  };

  if (typeof adapter.on === 'function') wrapper.on = (t, h) => adapter.on!(t, h);
  if (typeof adapter.off === 'function') wrapper.off = (t, h) => adapter.off!(t, h);

  return wrapper;
}
