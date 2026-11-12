'use strict';

import type { ModelLike } from '@noodl/types';

import { reportOutcomes } from '../../../outcome';
import type {
  AccessControlInstance,
  DbCrudBaseInstance,
  DbCrudNodeModule,
  DbInputPropertiesInstance,
  DbModelIdInstance
} from './crud-mixins';

import DbModelCRUDBase = require('./dbmodelcrudbase');

/**
 * `this` inside Set Record Properties — the intersection of every mixin the file applies.
 *
 * `storeType` is what makes this node two nodes in one: `'cloud'` writes through to the
 * backend, `'local'` only updates the in-memory record.
 */
interface SetDbModelPropertiesInstance
  extends DbCrudBaseInstance,
    DbModelIdInstance,
    DbInputPropertiesInstance,
    AccessControlInstance {
  _internal: DbCrudBaseInstance['_internal'] &
    DbModelIdInstance['_internal'] &
    DbInputPropertiesInstance['_internal'] &
    AccessControlInstance['_internal'] & {
      storeType?: 'cloud' | 'local';
      storeProperties?: 'specified' | 'all';
      /** HLT-016 — the properties that must be unchanged since the record was read. */
      onlyIfUnchanged?: string[];
      /** P112 OWN-026 FIX-03 A — the properties whose value is an amount added on the backend. */
      addTo?: string[];
    };
  /** On the instance rather than in `_internal` — guards {@link scheduleStore}. */
  hasScheduledStore?: boolean;
  scheduleSave(): void;
  scheduleStore(): void;
  _splitAdds(): { adds: Record<string, number>; rest: Record<string, unknown> } | string;
}

const SetDbModelPropertiedNodeDefinition: DbCrudNodeModule = {
  node: {
    name: 'SetDbModelProperties',
    docs: 'https://docs.noodl.net/nodes/data/cloud-data/set-record-properties',
    // BCN-010 step 3. Label only — `SetDbModelProperties` is unchanged.
    // "Update Record" is the verb the other five backends use and the one the
    // BYOB family already used; "Set Record Properties" described the mechanism.
    displayNodeName: 'Update Record',
    usePortAsLabel: 'collectionName',
    dynamicports: [
      {
        name: 'conditionalports/extended',
        condition: 'storeType = cloud OR storeType NOT SET',
        inputs: ['storeProperties']
      }
    ],
    inputs: {
      store: {
        displayName: 'Do',
        group: 'Actions',
        description:
          'Writes the property inputs onto the record named by Id, and on to the backend unless Store to is Local only',
        valueChangedToTrue: function (this: SetDbModelPropertiesInstance) {
          if (this._internal.storeType === undefined || this._internal.storeType === 'cloud') this.scheduleSave();
          else this.scheduleStore();
        }
      },
      storeProperties: {
        displayName: 'Properties to  store',
        group: 'General',
        description:
          'Whether to send only the properties wired on this node or every property the record holds; not offered when Store to is Local only',
        type: {
          name: 'enum',
          enums: [
            { label: 'Only specified', value: 'specified' },
            { label: 'All', value: 'all' }
          ]
        },
        default: 'specified',
        set: function (this: SetDbModelPropertiesInstance, value: unknown) {
          this._internal.storeProperties = value as 'specified' | 'all';
        }
      },
      storeType: {
        displayName: 'Store to',
        group: 'General',
        description:
          'Whether the change is sent to the backend as well as applied to the in-memory record, or only held locally',
        type: {
          name: 'enum',
          enums: [
            { label: 'Cloud and local', value: 'cloud' },
            { label: 'Local only', value: 'local' }
          ]
        },
        default: 'cloud',
        set: function (this: SetDbModelPropertiesInstance, value: unknown) {
          this._internal.storeType = value as 'cloud' | 'local';
        }
      },
      /**
       * HLT-016 — "change this record only if nobody else has changed it since I read it".
       *
       * Names one or more properties, comma-separated: usually a `version` number the graph
       * bumps on every write. The values sent as the precondition are the ones the record held
       * BEFORE this node applied its inputs, i.e. what was read, so there is nothing else to wire.
       * The backend checks them inside the UPDATE. If someone else wrote the record in between,
       * nothing is written, `Failure` fires with the reason on `Error`, and the record goes back to
       * what it held. The graph should fetch the record again and retry from there: retrying with
       * the same values fails the same way. Empty: the node behaves exactly as it always has.
       */
      onlyIfUnchanged: {
        type: 'string',
        displayName: 'Only If Unchanged',
        group: 'General',
        description:
          'Property names, comma-separated (e.g. version). The update is applied only if these still hold ' +
          'the values the record had when it was read; otherwise Failure fires and nothing is written. ' +
          'Fetch the record again before retrying. Needs a NodeGX backend. Leave empty to always write.',
        set: function (this: SetDbModelPropertiesInstance, value: unknown) {
          const names =
            typeof value === 'string'
              ? value
                  .split(',')
                  .map((n) => n.trim())
                  .filter((n) => n !== '')
              : [];
          this._internal.onlyIfUnchanged = names.length > 0 ? names : undefined;
        }
      },
      /**
       * P112 OWN-026 FIX-03 A — **a change by an amount is one node, no script.**
       *
       * A count, score, balance or progress that two tabs or devices change must be changed on the
       * backend by the amount. That was `Noodl.Records.increment` in a Function node, so the
       * shortest graph (read the value, add one in a Function, write it back whole) was the unsafe
       * one, and a model under pressure took it (t1-nodegx-3: two tabs, one planet, not two). Now
       * it is this node with the field named here and the amount wired in. The backend adds it
       * (`cloudstore.increment`, atomic on the NodeGX backend), and the record shows the total the
       * backend answers with. The other properties are saved as before, first, so Only If
       * Unchanged still guards them and a refused save adds nothing.
       */
      addTo: {
        type: 'string',
        displayName: 'Add To',
        group: 'General',
        description:
          'Property names, comma-separated (e.g. points). For these, the value wired in is an amount ' +
          'added to what the backend holds, in one step on the backend, instead of replacing it: two ' +
          'devices adding at once both count. Wire the amount (1, -1, 5). The record then shows the ' +
          "backend's total. Leave empty to write every value as given.",
        set: function (this: SetDbModelPropertiesInstance, value: unknown) {
          const names =
            typeof value === 'string'
              ? value
                  .split(',')
                  .map((n) => n.trim())
                  .filter((n) => n !== '')
              : [];
          this._internal.addTo = names.length > 0 ? names : undefined;
        }
      }
    },
    // ERG-001 §4: declared once in `dbmodelcrudbase.addBaseInfo` for the whole family; `stored`
    // was one of §0.2 Result 2's four spellings of a single displayed "Done".
    outputs: {},
    methods: {
      /**
       * FIX-03 A — the wired values split into amounts to add (the Add To names) and values to
       * write. A string is the refusal: an Add To property whose value is not a number.
       */
      _splitAdds: function (this: SetDbModelPropertiesInstance) {
        const values = this._internal.inputValues as Record<string, unknown>;
        const names = this._internal.addTo || [];
        const adds: Record<string, number> = {};
        const rest: Record<string, unknown> = {};
        for (const key in values) {
          if (names.indexOf(key) === -1) {
            rest[key] = values[key];
            continue;
          }
          const raw = values[key];
          const amount =
            typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
          if (!Number.isFinite(amount)) {
            return (
              `Add To names "${key}", whose value (${JSON.stringify(raw)}) is not a number. ` +
              'Wire the amount to add, such as 1 or -1.'
            );
          }
          adds[key] = amount;
        }
        return { adds, rest };
      },
      scheduleSave: function (this: SetDbModelPropertiesInstance) {
        const _this = this;
        const internal = this._internal;

        // ERG-001 §4. `Do` reaches one of two methods depending on `Store to`, and both are
        // invocations of the same port — so both mint, and NDA-004 §2's finding (the two
        // branches disagreeing about whether a missing Id is reportable) cannot recur as the
        // two branches disagreeing about whether an outcome is.
        const token = this.beginOutcome();
        if (!this.checkWarningsBeforeCloudOp([token])) return;
        this.pendingOutcomes('Save').push(token);

        this.scheduleOnce('StorageSave', function () {
          const tokens = _this.takeOutcomes('Save');

          if (!internal.model) {
            _this.setError('Missing Record Id', tokens);
            return;
          }

          const model = internal.model;

          // FIX-03 A: the amounts to add, taken out of what is written. A named property that was not
          // wired is not sent at all, as with any property; one whose value is not a number is refused.
          const split = _this._splitAdds();
          if (typeof split === 'string') {
            _this.setError(split, tokens);
            return;
          }
          const { adds, rest } = split;

          // HLT-016: the precondition is what the record held when it was read, so it is taken
          // BEFORE the inputs are applied. A name the record never held is refused rather than sent
          // as `null`: "still empty" is a real precondition and must not be guessed.
          let ifMatch: Record<string, string | number | boolean | null> | undefined;
          if (internal.onlyIfUnchanged) {
            ifMatch = {};
            for (const name of internal.onlyIfUnchanged) {
              const held = model.get(name);
              const scalar =
                held === null || typeof held === 'string' || typeof held === 'boolean' || typeof held === 'number';
              if (!scalar) {
                _this.setError(
                  held === undefined
                    ? `Only If Unchanged names "${name}", which this record has not been read with. Fetch the record first.`
                    : `Only If Unchanged names "${name}", which holds an object or list. Name a plain value such as a version number.`,
                  tokens
                );
                return;
              }
              ifMatch[name] = held as string | number | boolean | null;
            }
          }
          // P107-C35: rules that cannot be sent refuse the save before anything is written or sent
          const aclRefusal = _this._aclRefusal();
          if (aclRefusal !== undefined) {
            _this.setError(aclRefusal, tokens);
            return;
          }

          // BCN-004 step 5: the store the `Backend` input names, not the singleton. P107-C34 (ISL-029, ruled "Put the
          // old values back"): resolved BEFORE the write, so a backend the project does not have writes nothing — it
          // used to leave the record showing values no backend was ever sent.
          const cloudstore = _this.cloudStore(tokens);
          if (!cloudstore) return;

          // C34: what the write replaces, kept for EVERY save — any failure puts it back (it was only a refused
          // precondition), so the record shows what the backend holds.
          const before: Record<string, unknown> = {};
          for (const key in rest) {
            before[key] = model.get(key);
            model.set(key, rest[key], { resolve: true });
          }

          const addNames = Object.keys(adds);
          // FIX-03 A: after the save (or alone), the amounts — so a refused save adds nothing.
          const addThenReport = function () {
            if (addNames.length === 0) {
              reportOutcomes(_this, tokens, 'done');
              return;
            }
            cloudstore.increment({
              collection: internal.collectionId,
              objectId: model.getId(),
              properties: adds,
              success: function (response: Record<string, unknown>) {
                for (const key in response) model.set(key, response[key]);
                reportOutcomes(_this, tokens, 'done');
              },
              error: function (err?: string) {
                const what = addNames.join(', ');
                _this.setError(
                  Object.keys(rest).length > 0
                    ? `The other properties were saved, but adding to ${what} failed: ${err || 'no reason given'}`
                    : err || `Failed to add to ${what}.`,
                  tokens
                );
              }
            });
          };

          const acl = _this._getACL();
          let data: Record<string, unknown> = rest;
          if (internal.storeProperties === 'all') {
            // 'All' sends the record's data, but never an amount's field as a value: that would put
            // back what this page last read, the overwrite Add To exists to prevent.
            data = Object.assign({}, model.data as Record<string, unknown>);
            for (const name of addNames) delete data[name];
          }
          if (addNames.length > 0 && Object.keys(data).length === 0 && acl === undefined && !ifMatch) {
            addThenReport();
            return;
          }

          cloudstore.save({
            collection: internal.collectionId,
            objectId: model.getId(), // Get the objectId part of the model id
            data, // Only store input values by default, if not explicitly specified
            acl,
            ifMatch,
            success: function (response: Record<string, unknown>) {
              for (const key in response) {
                model.set(key, response[key]);
              }

              addThenReport();
            },
            error: function (err?: string, detail?: Record<string, unknown>) {
              // Nothing was written, so the record must not keep showing what was refused (C34: whatever the reason).
              for (const key in before) model.set(key, before[key]);
              if (detail && detail.reason === 'precondition-failed') {
                _this.setError(
                  'Someone else changed this record after it was read, so this update was not applied. ' +
                    'Fetch the record again, then retry.',
                  tokens
                );
                return;
              }
              _this.setError(err || 'Failed to save.', tokens);
            }
          });
        });
      },
      scheduleStore: function (this: SetDbModelPropertiesInstance) {
        // ⚠️ ERG-001 §4: minted **before** the guard, the shape `login.ts` established. The
        // guard exists to coalesce the *work* — two presses in one pass do one write — and
        // dropping the second press's outcome with it would be Rule 1 broken by an optimisation.
        this.pendingOutcomes('Store').push(this.beginOutcome());

        if (this.hasScheduledStore) return;
        this.hasScheduledStore = true;

        const internal = this._internal;
        this.scheduleAfterInputsHaveUpdated(() => {
          this.hasScheduledStore = false;
          const tokens = this.takeOutcomes('Store');

          // NDA-004 §2: the two branches of `Store Type` disagreed about this. `scheduleSave`
          // (cloud) has always answered a missing Id with `setError('Missing Record Id')`;
          // this one, the local branch of the *same node*, returned silently. Same node, same
          // mistake by the author, and whether they heard about it depended on an enum.
          if (!internal.model) {
            this.setError('Missing Record Id', tokens);
            return;
          }

          const split = this._splitAdds();
          if (typeof split === 'string') {
            this.setError(split, tokens);
            return;
          }
          const model = internal.model as ModelLike;
          for (const i in split.rest) {
            model.set(i, split.rest[i], { resolve: true });
          }
          // FIX-03 A: Local only has no backend to add on, so the record held here adds the amount.
          for (const name in split.adds) {
            const held = Number(model.get(name));
            model.set(name, (Number.isFinite(held) ? held : 0) + split.adds[name]);
          }
          reportOutcomes(this, tokens, 'done');
        });
      }
    }
  }
};

DbModelCRUDBase.addBaseInfo(SetDbModelPropertiedNodeDefinition, {
  done: 'Fires once the record has been updated, waiting for the backend to answer unless Store to is Local only'
});
DbModelCRUDBase.addModelId(SetDbModelPropertiedNodeDefinition);
DbModelCRUDBase.addInputProperties(SetDbModelPropertiedNodeDefinition);
DbModelCRUDBase.addAccessControl(SetDbModelPropertiedNodeDefinition);

export = SetDbModelPropertiedNodeDefinition;
