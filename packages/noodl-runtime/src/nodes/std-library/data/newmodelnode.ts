'use strict';

import type { ModelModule, OutcomeToken } from '@noodl/types';

import type { MixinNodeModule, ModelIdInstance } from './crud-mixins';

import ModelImport = require('../../../model');
import ModelCRUDBase = require('./modelcrudbase');
import { outcomeOutputs, reportOutcomes } from '../../../outcome';

const Model = ModelImport as unknown as ModelModule;

/** `this` inside Create New Object — `addModelId` and `addInputProperties` are both applied. */
interface NewModelNodeInstance extends ModelIdInstance {
  /** On the instance rather than in `_internal` — guards {@link scheduleNew}. */
  hasScheduledNew?: boolean;
  /** One token per `Do` of the frame: the presses share one object, and each is answered (P107-C9). */
  pendingNewOutcomes?: OutcomeToken[];
  scheduleNew(): void;
  _pushInputValues(model: ReturnType<ModelModule['get']>): void;
}

const NewModelNodeDefinition: MixinNodeModule = {
  node: {
    name: 'NewModel',
    docs: 'https://docs.noodl.net/nodes/data/object/create-new-object',
    displayNodeName: 'Create New Object',
    inputs: {
      new: {
        displayName: 'Do',
        group: 'Actions',
        description: 'Creates a new object with a generated id and writes the property values currently on the inputs',
        valueChangedToTrue: function (this: NewModelNodeInstance) {
          this.scheduleNew();
        }
      }
    },
    /**
     * ERG-001 §4. `created` was one of the four internal names that all displayed as "Done"
     * (§0.2 Result 2); it is `done` now, and `Completed` joins it.
     *
     * No `Failure`: this node builds its own object and has nothing to fail at, which is why
     * `addFailure` is deliberately not applied below. No `Unchanged`: every `Do` mints a
     * *distinct* object, so the post-condition can never already hold.
     */
    outputs: outcomeOutputs({
      done: 'Fires once the new object exists, its properties are written and Id names it'
    }),
    methods: {
      scheduleNew: function (this: NewModelNodeInstance) {
        // P107-C9: opened BEFORE the coalescing guard. Two `Do` pulses inside one frame still mint
        // one object — the node deliberately collapses them into one store — but each press is
        // answered, and both Dones name that object. The tokens are taken off the instance in the
        // callback, so none outlives the frame it was opened in (NV-iii's latched-result class).
        if (!this.pendingNewOutcomes) this.pendingNewOutcomes = [];
        this.pendingNewOutcomes.push(this.beginOutcome());
        if (this.hasScheduledNew) return;
        this.hasScheduledNew = true;

        this.scheduleAfterInputsHaveUpdated(() => {
          this.hasScheduledNew = false;
          const tokens = this.pendingNewOutcomes || [];
          this.pendingNewOutcomes = undefined;
          const newModel = (this.nodeScope.modelScope || Model).get();

          this._pushInputValues(newModel);

          this.setModel(newModel);

          // Last, after `setModel` has flagged `Id` dirty: a graph wired `Done -> Insert` must
          // already be able to read the id when the pulse lands.
          reportOutcomes(this, tokens, 'done');
        });
      }
    }
  }
};

ModelCRUDBase.addBaseInfo(NewModelNodeDefinition);
ModelCRUDBase.addModelId(NewModelNodeDefinition, { includeOutputs: true });
ModelCRUDBase.addInputProperties(NewModelNodeDefinition);

export = NewModelNodeDefinition;
