/**
 * The conformance context — the promisified data plane every case is written
 * against, and the only shape a case is allowed to touch.
 *
 * BRG-003 §3.1. Two rules this file exists to enforce:
 *
 * 1. **No case names an adapter.** Every existing adapter test in the monorepo
 *    (`noodl-runtime/test/adapters/*.test.js`) constructs `LocalSQLAdapter` by
 *    name and is therefore an implementation test. A case here receives a
 *    connected {@link IStorageAdapter} and cannot see what implements it.
 * 2. **No case asserts SQL text.** `QueryBuilder.test.js` stays where it is
 *    (§3.3). Asserting emitted SQL across two dialects is how a conformance
 *    suite becomes a second implementation.
 *
 * The data plane is callback-style (`adapter.query({ success, error })`), which
 * is the shape `IStorageDataPlane` declares and BRG-005 must reproduce. Cases
 * are async, so every call is wrapped exactly once, here.
 *
 * @module conformance/context
 */

import type {
  IStorageAdapter,
  IStorageSchema,
  StorageAclOption,
  StorageColumn,
  StorageQueryOptions,
  StorageSearchOptions
} from '../src/storage';

/** A stored row, as the storage layer hands it back. */
export type Row = Record<string, unknown>;

/** What a read returns once the callbacks are unwrapped. */
export interface ReadResult {
  results: Row[];
  count?: number;
}

/**
 * The ACL context a caller presents, in the two spellings every case needs.
 *
 * Transcribed from the enforcement layer's own usage
 * (`noodl-runtime/test/adapters/LocalSQLAdapter.acl.test.js:40-50`): principal
 * keys are `'*'`, a user id, or `'role:<name>'`, and the set is what the
 * service's enforcement layer supplies for the authenticated caller.
 */
export function read(keys: string[]): StorageAclOption {
  return { access: 'read', keys };
}

export function write(keys: string[]): StorageAclOption {
  return { access: 'write', keys };
}

/**
 * A denial, as a case observes it.
 *
 * 🔴 The distinction that matters for rule 4 of the phase README: a denied read
 * may legitimately come back as *no rows* (the ACL predicate is in the SQL, so
 * an invisible row is simply not selected) while a denied **write** must come
 * back as an error. A case asserting "denied" has to say which it means, so
 * there is no single `expectDenied` helper here on purpose.
 */
export class ConformanceError extends Error {}

/**
 * The adapter itself refused the call — its `error` callback fired.
 *
 * 🔴 **Why this is a separate class, added at s4 by AC5.** Until it existed,
 * an adapter *refusing* and a case's own assertion *failing* both threw
 * `ConformanceError`, so nothing downstream could tell them apart. That made
 * §3.4's central promise unenforceable: a capability declared `unsupported`
 * was satisfied by ANY throw, so an adapter that answered — and answered
 * wrongly — was recorded as `failed-as-declared` and travelled as an accepted
 * divergence. Measured, not reasoned: `limited.ts`'s `search-ignores-the-term`
 * returns every row in the collection, and two of the three search cases were
 * laundered exactly that way before this class was introduced.
 *
 * The distinction is the phase's own thesis in miniature. *"Unsupported"* is a
 * promise to fail loudly. An adapter that returns the wrong rows has not failed
 * loudly; it has failed silently, which is the one thing a declaration must
 * never be able to cover.
 */
export class AdapterRefusal extends ConformanceError {}

type CallbackShape = {
  success: (...args: unknown[]) => void;
  error: (message: string) => void;
};

/**
 * Invoke one callback-style data-plane method and resolve to its success
 * arguments. Rejects with a {@link ConformanceError} carrying the adapter's own
 * message, so a case can assert *that* a write was refused without asserting
 * the wording, which is adapter-specific.
 */
function invoke(adapter: IStorageAdapter, method: string, options: Record<string, unknown>): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const call: Record<string, unknown> & CallbackShape = {
      ...options,
      success: (...args: unknown[]) => resolve(args),
      error: (message: string) => reject(new AdapterRefusal(String(message)))
    };
    // The data plane is declared as twelve distinct call shapes rather than one
    // indexed signature, which is right for callers and wrong for a generic
    // dispatcher. This is the single place the index is taken.
    const fn = (adapter as unknown as Record<string, unknown>)[method];
    if (typeof fn !== 'function') {
      reject(new AdapterRefusal(`adapter has no method '${method}'`));
      return;
    }
    (fn as (o: unknown) => void).call(adapter, call);
  });
}

/**
 * Everything a case may do. Deliberately narrower than the adapter: there is no
 * `getDatabase` here, which is how AC6's claim — that nothing in the promise
 * depends on the raw handle — is enforced structurally rather than by review.
 */
export interface ConformanceContext {
  readonly adapter: IStorageAdapter;
  readonly schema: IStorageSchema;

  /**
   * A fresh collection name, unique to this run **and to this call**.
   *
   * 🔴 Unique per *call*, not per base name. The first version of this keyed
   * only on the run, so every case that asked for `collection('Flt')` got the
   * same table and each one ran against the accumulated fixtures of all the
   * others — which showed up as `["ada","ada","ada"]` rather than as an error,
   * because piling rows into a shared table breaks no invariant the adapter
   * has. A suite whose cases are not isolated reports the adapter's behaviour
   * plus its own execution order, and the second one is not in the promise.
   */
  collection(base: string): string;

  /** Declare a table up front. Most cases do not need it — `create` autocreates. */
  createTable(name: string, columns: StorageColumn[]): boolean;

  create(collection: string, data: Row): Promise<Row>;
  fetch(collection: string, objectId: string, acl?: StorageAclOption): Promise<Row>;
  save(collection: string, objectId: string, data: Row, acl?: StorageAclOption): Promise<Row>;
  remove(collection: string, objectId: string, acl?: StorageAclOption): Promise<void>;
  query(collection: string, options?: StorageQueryOptions): Promise<ReadResult>;
  search(collection: string, options: StorageSearchOptions): Promise<ReadResult>;
  count(collection: string, where?: Row, acl?: StorageAclOption): Promise<number>;
  distinct(collection: string, property: string, where?: Row, acl?: StorageAclOption): Promise<unknown[]>;
  aggregate(
    collection: string,
    group: Record<string, { avg?: string; sum?: string; max?: string; min?: string; distinct?: string }>,
    where?: Row,
    acl?: StorageAclOption
  ): Promise<Row>;
  increment(
    collection: string,
    objectId: string,
    properties: Record<string, number>,
    acl?: StorageAclOption
  ): Promise<Row>;
  addRelation(collection: string, objectId: string, key: string, targetObjectId: string): Promise<void>;
  removeRelation(collection: string, objectId: string, key: string, targetObjectId: string): Promise<void>;

  /**
   * Run `fn` and return the error message it was refused with. Fails the case
   * if `fn` resolves — an "expected denial" that silently succeeds is the
   * failure mode rule 4 exists to catch.
   */
  refused(fn: () => Promise<unknown>): Promise<string>;
}

/** Build the context a run of the suite hands to every case. */
export function makeContext(adapter: IStorageAdapter, runId: string): ConformanceContext {
  const one = async (method: string, options: Record<string, unknown>): Promise<Row> => {
    const args = await invoke(adapter, method, options);
    return (args[0] ?? {}) as Row;
  };

  let seq = 0;

  return {
    adapter,
    schema: adapter.schemaManager,

    collection(base: string): string {
      seq += 1;
      return `${base}_${runId}_${seq}`;
    },

    createTable(name: string, columns: StorageColumn[]): boolean {
      return adapter.schemaManager.createTable({ name, columns });
    },

    create: (collection, data) => one('create', { collection, data }),

    fetch: (collection, objectId, acl) => one('fetch', { collection, objectId, acl }),

    save: (collection, objectId, data, acl) => one('save', { collection, objectId, data, acl }),

    async remove(collection, objectId, acl): Promise<void> {
      await invoke(adapter, 'delete', { collection, objectId, acl });
    },

    async query(collection, options = {}): Promise<ReadResult> {
      const args = await invoke(adapter, 'query', { ...options, collection });
      return { results: (args[0] ?? []) as Row[], count: args[1] as number | undefined };
    },

    async search(collection, options): Promise<ReadResult> {
      const args = await invoke(adapter, 'search', { ...options, collection });
      return { results: (args[0] ?? []) as Row[], count: args[1] as number | undefined };
    },

    async count(collection, where, acl): Promise<number> {
      const args = await invoke(adapter, 'count', { collection, where, acl });
      return args[0] as number;
    },

    async distinct(collection, property, where, acl): Promise<unknown[]> {
      const args = await invoke(adapter, 'distinct', { collection, property, where, acl });
      return (args[0] ?? []) as unknown[];
    },

    aggregate: (collection, group, where, acl) => one('aggregate', { collection, group, where, acl }),

    increment: (collection, objectId, properties, acl) =>
      one('increment', { collection, objectId, properties, acl }),

    async addRelation(collection, objectId, key, targetObjectId): Promise<void> {
      await invoke(adapter, 'addRelation', { collection, objectId, key, targetObjectId });
    },

    async removeRelation(collection, objectId, key, targetObjectId): Promise<void> {
      await invoke(adapter, 'removeRelation', { collection, objectId, key, targetObjectId });
    },

    async refused(fn: () => Promise<unknown>): Promise<string> {
      try {
        await fn();
      } catch (err) {
        // Only the ADAPTER can refuse. An assertion that failed inside `fn`
        // is the case finding something wrong, and reading it as a refusal
        // would turn a real failure into the evidence the case was looking
        // for — an expectation satisfied by its own collapse.
        if (err instanceof AdapterRefusal) return err.message;
        throw err;
      }
      throw new ConformanceError('expected the call to be refused, and it succeeded');
    }
  };
}
