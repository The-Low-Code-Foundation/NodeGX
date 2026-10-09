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

export function deletesThroughTheFacade(adapter: IStorageAdapter): IStorageAdapter {
  const facade = new AdapterFacade(adapter);
  return new Proxy(adapter, {
    get(target, key) {
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
