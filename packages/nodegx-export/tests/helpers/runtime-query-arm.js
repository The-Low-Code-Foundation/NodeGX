/**
 * The runtime arm of `tests/the-query-asks.test.ts` (P18-S115-QUERYFILTER): what the running app's Query Records hands
 * the backend, from the runtime's OWN code, in a child process.
 *
 * A child process because ts-jest typechecks every TypeScript file it transforms against this package's strict config,
 * and `@noodl/runtime` is not written for it; here the runtime is loaded as it is in its own suite, transpiled only.
 *
 * stdin: `[{ parameters: [{ name, value }], collections }]`, one per case — the node's parameters as the parser reads
 * them, and the project's `dbCollections`. stdout: per case, either `{ failed }` (the node's `setError`: Failure and no
 * request) or `{ asked, body }`: `asked` is what `fetch()` hands the store (`getStorageFilter`'s where and sort,
 * `getStorageLimit`, `getStorageSkip`), `body` what `ParseWireAdapter.query` puts on the wire for it.
 *
 * The node's setters, by name (`dbcollectionnode2.ts` `registerInputIfNeeded`): `collectionName` → `_internal.name`;
 * `visualFilter` → `_internal.visualFilter`; `visualSort` → `_internal.visualSorting`; `qp-<x>` →
 * `_internal.queryParameters[x]`; every other input → `storageSettings[name]` (`userInputSetter`). The schema reaches
 * the translator through `CloudStore._collections`, which reads the project's `dbCollections`, as in a running app.
 */

const path = require('path');

require(require.resolve('ts-node', { paths: [path.join(__dirname, '..', '..', '..', '..')] })).register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS', allowJs: false }
});

const RUNTIME = path.join(__dirname, '..', '..', '..', 'noodl-runtime');
const NoodlRuntime = require(path.join(RUNTIME, 'noodl-runtime'));
const CloudStore = require(path.join(RUNTIME, 'src', 'api', 'cloudstore'));
const QueryRecords = require(path.join(RUNTIME, 'src', 'nodes', 'std-library', 'data', 'dbcollectionnode2'));
const { ParseWireAdapter } = require(path.join(RUNTIME, 'src', 'api', 'backends', 'ParseWireAdapter'));
const methods = QueryRecords.node.prototypeExtensions;

const valueOf = (value) => (value && (value.kind === 'literal' || value.kind === 'json') ? value.value : undefined);

function runCase({ parameters, collections }) {
  NoodlRuntime.instance = { getMetaData: (key) => (key === 'dbCollections' ? collections : []) };
  CloudStore.invalidateCollections();
  const internal = { storageSettings: {}, queryParameters: {} };
  for (const { name, value } of parameters) {
    const v = valueOf(value);
    if (name === 'collectionName') internal.name = v;
    else if (name === 'visualFilter') internal.visualFilter = v;
    else if (name === 'visualSort') internal.visualSorting = v;
    else if (name.startsWith('qp-')) internal.queryParameters[name.slice(3)] = v;
    else internal.storageSettings[name] = v;
  }
  const self = { _internal: internal, context: {}, id: 'query' };
  const filter = methods.getStorageFilter.call(self);
  if (filter && filter.failed) return { failed: filter.failed };
  const asked = {};
  if (filter.where !== undefined) asked.where = filter.where;
  if (filter.sort !== undefined) asked.sort = filter.sort;
  const limit = methods.getStorageLimit.call(self);
  const skip = methods.getStorageSkip.call(self);
  if (limit !== undefined) asked.limit = limit;
  if (skip !== undefined) asked.skip = skip;

  // `fetch()`'s own call: `count` is `getStorageFetchTotalCount()`, a boolean, always passed.
  let body;
  const adapter = new ParseWireAdapter({ serializeObject: (x) => x, normalize: (x) => x, normalizeAll: (x) => x });
  adapter._makeRequest = (_handle, _path, options) => {
    body = options.content;
  };
  adapter.query({}, {
    collection: internal.name,
    ...asked,
    count: methods.getStorageFetchTotalCount.call(self),
    success: () => undefined,
    error: () => undefined
  });
  return { asked, body: JSON.parse(JSON.stringify(body)) };
}

let input = '';
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  process.stdout.write(JSON.stringify(JSON.parse(input).map(runCase)));
});
