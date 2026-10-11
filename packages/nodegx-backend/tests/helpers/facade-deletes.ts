/**
 * P116 R10 — the adapter, with the backend's own delete.
 *
 * A link's "when it goes" rule is kept by the backend at delete time (`AdapterFacade.rawDelete` →
 * `@noodl/backend-contract` `deleteKeepingLinks`), above the engine — not by the adapter. The claim
 * specs grade an adapter through the conformance context, whose `remove` calls the adapter's
 * `delete` straight. Handed THIS adapter instead, that `delete` is the facade's: the claims grade
 * the path every door runs (`/classes`, `/api/:table`, the batch), not a copy of the rule.
 *
 * 🔴 Never put the rule in the conformance context itself: the claims would then pass while the
 * facade forgot to call it — a grade with a hole the shape of the defect.
 *
 * P116 ONT-014: a SAVE that carries an ACL is the facade's too (`rawSave`), for the same reason: a
 * claim's change step on a collection with `onlyWhile` hands its rules over as data in that ACL,
 * and only the facade keeps them. A save with no ACL is the adapter's, as before.
 *
 * Every other member is the adapter's own, bound to it.
 */
import type { IStorageAdapter } from '@noodl/backend-contract';

import { AdapterFacade } from '../../src/persistence/AdapterFacade';

interface DeleteCall {
  collection: string;
  objectId?: string;
  id?: string;
  acl?: Parameters<AdapterFacade['rawDelete']>[2];
  success(): void;
  error(message: string): void;
}

interface SaveCall {
  collection: string;
  objectId: string;
  data: Record<string, unknown>;
  acl?: Parameters<AdapterFacade['rawSave']>[3];
  expect?: Parameters<AdapterFacade['rawSave']>[4];
  success(record: unknown): void;
  error(message: string): void;
}

export function deletesThroughTheFacade(adapter: IStorageAdapter): IStorageAdapter {
  const facade = new AdapterFacade(adapter);
  const save = Reflect.get(adapter, 'save', adapter) as (call: SaveCall) => void;
  return new Proxy(adapter, {
    get(target, key) {
      if (key === 'save')
        return (call: SaveCall): void => {
          if (!call.acl) return save.call(target, call);
          facade.rawSave(call.collection, call.objectId, call.data, call.acl, call.expect).then(
            (record) => call.success(record),
            (e: unknown) => call.error(e instanceof Error ? e.message : String(e))
          );
        };
      if (key === 'delete')
        return (call: DeleteCall): void => {
          facade.rawDelete(call.collection, String(call.objectId ?? call.id), call.acl).then(
            () => call.success(),
            (e: unknown) => call.error(e instanceof Error ? e.message : String(e))
          );
        };
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
}
