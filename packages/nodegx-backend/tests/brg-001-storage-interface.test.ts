/**
 * BRG-001 AC5 — the storage interface is CLOSED.
 *
 * Two different gates live in this file, and they fail in two different places:
 *
 *  1. **Compile time** (`npm run typecheck:backend-tests`, which reads
 *     `tsconfig.tests.json` and does include `tests/**`): the mock below is
 *     typed `IStorageFacade` and nothing else, and it is handed to every module
 *     under `src/` that takes a facade. A module that reaches past the
 *     interface — for `adapter`, for a private, for anything — stops compiling
 *     here. That is the whole point of the task, and it is not something a
 *     runtime assertion can express.
 *
 *     🔴 `jest.config.js` runs ts-jest with `isolatedModules: true`, which
 *     TRANSPILES and does not typecheck. So this half of the file is green
 *     under `npx jest` whatever it says. It is graded by the typecheck gate,
 *     and by nothing else.
 *
 *  2. **Run time** (this suite): the names on the interface are the names the
 *     implementation actually has. A member deleted from `AdapterFacade` but
 *     left on `IStorageFacade` would compile — the class would simply fail to
 *     implement it, which tsc does catch — but a member renamed on the *adapter*
 *     (untyped CommonJS, reached by string at `AdapterFacade.call()`) would
 *     compile, ship, and fail at request time. That is what the second half
 *     checks, and it is the check that would have caught a real drift.
 */

import type { IStorageAdapter, IStorageFacade, IStorageSchema } from '@noodl/backend-contract';

import { AdapterFacade } from '../src/persistence/AdapterFacade';
import { RoleStore } from '../src/roles/RoleStore';
import { MetadataStore } from '../src/storage/MetadataStore';
import { EmailTokenStore } from '../src/email/tokens';
import { IdentityStore } from '../src/auth/identities';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const localSql = require('@noodl/runtime/src/api/adapters/local-sql');

/**
 * A facade that implements the interface and NOTHING else — no `adapter`, no
 * privates, no class. If this object is enough for every consumer, the
 * consumers are closed over the interface.
 */
function makeFacadeMock(): IStorageFacade {
  const notCalled = (name: string) => () => {
    throw new Error(`BRG-001 mock: ${name} was called; this mock exists to be typechecked, not run.`);
  };
  return {
    rawQuery: notCalled('rawQuery'),
    rawSearch: notCalled('rawSearch'),
    rawFetch: notCalled('rawFetch'),
    rawCreate: notCalled('rawCreate'),
    rawSave: notCalled('rawSave'),
    rawDelete: notCalled('rawDelete'),
    rawCount: notCalled('rawCount'),
    rawIncrement: notCalled('rawIncrement'),
    rawAggregate: notCalled('rawAggregate'),
    rawDistinct: notCalled('rawDistinct'),
    addRelation: notCalled('addRelation'),
    removeRelation: notCalled('removeRelation'),
    wireQuery: notCalled('wireQuery'),
    wireFetch: notCalled('wireFetch'),
    wireSearch: notCalled('wireSearch'),
    wireRecord: notCalled('wireRecord'),
    schemaManager: {} as IStorageSchema,
    getColumns: notCalled('getColumns'),
    existingIds: notCalled('existingIds'),
    ensureImportShape: notCalled('ensureImportShape'),
    upsertBatch: notCalled('upsertBatch')
  } as IStorageFacade;
}

/**
 * Every member of {@link IStorageFacade}, by name.
 *
 * Kept by hand on purpose: a type does not exist at runtime, so this list is
 * the one place the interface is written twice, and the duplication is what
 * lets a runtime check exist at all. BRG-003 §3.5's gate is what makes adding a
 * facade method without touching this list a build failure.
 */
const FACADE_MEMBERS = [
  'rawQuery',
  'rawSearch',
  'rawFetch',
  'rawCreate',
  'rawSave',
  'rawDelete',
  'rawCount',
  'rawIncrement',
  'rawAggregate',
  'rawDistinct',
  'addRelation',
  'removeRelation',
  'wireQuery',
  'wireFetch',
  'wireSearch',
  'wireRecord',
  'getColumns',
  'existingIds',
  'ensureImportShape',
  'upsertBatch'
];

/**
 * The adapter's twenty names: eight reached literally, twelve reached BY STRING
 * from `AdapterFacade.call()` — which is why phase 97's `adapter\.<name>` grep
 * reported eight. These twelve are the entire data plane, and a rename in
 * `@noodl/runtime` would be invisible to every type in this package.
 */
const ADAPTER_LITERAL = ['connect', 'disconnect', 'getDatabase', 'getPersistenceStatus', 'on', 'off', 'transaction'];
const ADAPTER_DATA_PLANE = [
  'query',
  'search',
  'fetch',
  'create',
  'save',
  'delete',
  'count',
  'aggregate',
  'distinct',
  'increment',
  'addRelation',
  'removeRelation'
];

describe('BRG-001 — the storage interface is closed', () => {
  it('every consumer of a facade is satisfied by the interface alone', () => {
    // COMPILE-TIME assertions. Each line fails `typecheck:backend-tests` if the
    // module it names reaches past `IStorageFacade`. At run time they only
    // construct, which is why the constructors chosen are the ones that do no
    // I/O until a method is called.
    const facade = makeFacadeMock();

    expect(new RoleStore(facade)).toBeTruthy();
    expect(new MetadataStore(facade)).toBeTruthy();
    expect(new EmailTokenStore(facade)).toBeTruthy();
    expect(new IdentityStore(facade)).toBeTruthy();
  });

  it('AdapterFacade implements every member the interface declares', () => {
    const missing = FACADE_MEMBERS.filter(
      (name) => typeof (AdapterFacade.prototype as unknown as Record<string, unknown>)[name] !== 'function'
    );
    expect(missing).toEqual([]);

    // `schemaManager` is a getter, so it is a property descriptor rather than a
    // method — asserted separately so the list above stays a list of calls.
    const descriptor = Object.getOwnPropertyDescriptor(AdapterFacade.prototype, 'schemaManager');
    expect(typeof descriptor?.get).toBe('function');
  });

  it('the adapter really has all twenty names the interface claims', () => {
    const proto = localSql.LocalSQLAdapter.prototype as Record<string, unknown>;

    const missingLiteral = ADAPTER_LITERAL.filter((n) => typeof proto[n] !== 'function');
    expect(missingLiteral).toEqual([]);

    // 🔴 The half a type cannot check: these are invoked as `adapter[name](...)`.
    const missingDataPlane = ADAPTER_DATA_PLANE.filter((n) => typeof proto[n] !== 'function');
    expect(missingDataPlane).toEqual([]);

    // `schemaManager` is set per instance, not on the prototype, so it is not
    // asserted here — `AdapterFacade.schemaManager` reads it and every schema
    // route would fail loudly on the first request if it were absent.
  });

  it('a real adapter satisfies IStorageAdapter where an empty object does not', () => {
    // The negative half. Without it, the test above passes against any object
    // that happens to have twenty functions, and proves nothing about the
    // declaration being the thing under test.
    const empty = {} as Record<string, unknown>;
    const absent = [...ADAPTER_LITERAL, ...ADAPTER_DATA_PLANE].filter((n) => typeof empty[n] !== 'function');
    expect(absent.length).toBe(ADAPTER_LITERAL.length + ADAPTER_DATA_PLANE.length);

    // And the compile-time counterpart: a real adapter is assignable.
    const adapter: IStorageAdapter = new localSql.LocalSQLAdapter(':memory:', { allowEphemeral: true });
    expect(typeof adapter.connect).toBe('function');
  });
});
