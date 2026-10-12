/**
 * P109 ISL-029 — Query Records' Javascript filter says what happened to the script (P107-C38, P107-C39).
 *
 * C38, ruled 2026-10-05 "Run the shown script; report typos": with Filter set to Javascript and no script saved, the
 * node never queried and never said so (`filterCode.replace` threw on `undefined`, the catch logged it, `fetch` then
 * read `.where` on `undefined` inside the frame-end callback). It now runs the starter script the editor shows
 * (`where({ })`, every record). A script that does not parse fails the node, its error on Error, and asks nothing.
 *
 * C39, ruled "Fail with the script's error": a script that THREW before calling `where(…)` was logged and the node
 * queried with no filter — every row in the class, as a Success. FLD-008 closed that widening for the translator's
 * error callback; this closes it for a throw.
 *
 * The node in a published app's shape (`editorConnection: undefined`), its store's `query` recorded — FLD-008's arming.
 */

jest.mock('../../noodl-runtime', () => ({
  instance: { getMetaData: () => undefined }
}));

import type { NodeModule } from '@noodl/types';

const NodeDefinition = require('../../src/nodedefinition');

import CloudStore = require('../../src/api/cloudstore');
import Model = require('../../src/model');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const QueryRecordsModule = require('../../src/nodes/std-library/data/dbcollectionnode2');

interface QueryCall {
  where: unknown;
  success(results: Record<string, unknown>[], count?: number): void;
  error(err: string): void;
}

interface QueryRecordsNode {
  _internal: Record<string, unknown>;
  setCollectionName(name: string): void;
  getOutput(name: string): { value: unknown };
  fetch(): void;
}

function armed(storageJSONFilter: string | undefined) {
  const scope = { modelScope: new (Model as unknown as { Scope: new () => Record<string, unknown> }).Scope(), deleteNode() {} };
  const store = (CloudStore as unknown as { forScope(s: unknown): { query(opts: QueryCall): void } }).forScope(scope.modelScope);
  const calls: QueryCall[] = [];
  store.query = (opts: QueryCall) => {
    calls.push(opts);
  };
  const context = {
    hasFatalError: false,
    scheduleUpdate() {},
    scheduleAfterUpdate() {},
    scheduleAfterInputsHaveUpdated(cb: () => void) {
      cb();
    },
    connectionSentValue() {},
    nodeIsDirty() {},
    connectionSentSignal() {},
    editorConnection: undefined,
    modelScope: undefined
  };
  const definition = NodeDefinition.defineNode((QueryRecordsModule as NodeModule).node);
  const node: QueryRecordsNode = definition(context, 'isl029-query-records', scope);
  node.setCollectionName('Lesson');
  const settings: Record<string, unknown> = { storageFilterType: 'json' };
  if (storageJSONFilter !== undefined) settings.storageJSONFilter = storageJSONFilter;
  node._internal.storageSettings = settings;
  return { node, calls };
}

describe('ISL-029 C38 — a Javascript filter with no script saved runs the starter script', () => {
  it('no script: the node queries (the starter script, every record) and says nothing is wrong', () => {
    const { node, calls } = armed(undefined);
    expect(() => node.fetch()).not.toThrow();
    expect(calls).toHaveLength(1);
    expect(node.getOutput('error').value).toBeUndefined();
    calls[0].success([{ objectId: 'r-1' }, { objectId: 'r-2' }]);
    expect(node.getOutput('count').value).toBe(2);
  });

  it('a script that does not parse fails the node with the parse error, and asks nothing', () => {
    const { node, calls } = armed('where({ title: ');
    expect(() => node.fetch()).not.toThrow();
    expect(calls).toHaveLength(0);
    expect(String(node.getOutput('error').value)).toMatch(/^The filter script could not be read: /);
  });
});

describe('ISL-029 C39 — a filter script that throws fails the node, and asks nothing', () => {
  it('a throw before where(…): Error carries the script\'s own message, and no query goes out', () => {
    const { node, calls } = armed("nope(); where({ title: { equalTo: 'a' } })");
    node.fetch();
    expect(calls).toHaveLength(0);
    expect(String(node.getOutput('error').value)).toMatch(/^The filter script failed: .*nope is not defined/);
  });

  it('(control) the same script without the throw queries, filtered', () => {
    const { node, calls } = armed("where({ title: { equalTo: 'a' } })");
    node.fetch();
    expect(calls).toHaveLength(1);
    expect(calls[0].where).toEqual({ title: { $eq: 'a' } });
    expect(node.getOutput('error').value).toBeUndefined();
  });
});
