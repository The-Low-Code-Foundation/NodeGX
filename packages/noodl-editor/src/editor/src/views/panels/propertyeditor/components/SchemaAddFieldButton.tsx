import React from 'react';

import { managerRoutes, openBackendManager } from '@noodl-models/BackendServices/openBackendManager';

import { ToastLayer } from '../../../ToastLayer/ToastLayer';

export interface SchemaAddFieldButtonProps {
  backendId: string;
  backendName: string;
  /** The table this node is pointed at — never guessed; see `addFieldTarget`. */
  table: string;
}

/**
 * DEF-036 AC4 — the way out, drawn where the question is asked.
 *
 * Richard: *"when someone asks 'where's the First Name field?' because they never added it to
 * the schema, the node is where they are looking, so the way out belongs there."* And the
 * second half of that sentence is the part with teeth: it should jump **straight into the
 * table's schema editor — the exact table already chosen in that node's dropdown, not the data
 * editor's front door.** A button that opens a list of eleven tables has moved the search, not
 * ended it.
 *
 * BMG-012: the schema editor is the backend manager's Schema page now, not an editor panel.
 * The promise is kept by a deep link — `#/schema/<table>/new-field` opens the manager in the
 * browser, signed in, on that collection with the *Add a field* picker already open. The
 * person's editor stays exactly as it was (no panel took the left slot), which is the third
 * place they used to have to navigate out of.
 *
 * 🔴 This draws only when {@link addFieldTarget} returned a destination. AC2: *"an Add button
 * that cannot reach a schema editor is a second dead end"* — so there is no disabled state
 * here, no tooltip explaining why it will not work, and no branch that opens the front door as
 * a fallback. Either the jump lands on the right table or the button is not on the panel. A
 * backend that has stopped since the panel drew is the main process's sentence, toasted.
 */
export function SchemaAddFieldButton({ backendId, backendName, table }: SchemaAddFieldButtonProps) {
  return (
    <div className="property-schema-add-field">
      <button
        type="button"
        className="property-schema-add-field-button"
        data-test={`schema-add-field-${table}`}
        title={`Open the schema for ${table} on ${backendName}`}
        onClick={() => {
          openBackendManager(backendId, managerRoutes.newField(table)).catch((e: Error) => {
            ToastLayer.showError(`Could not open the backend manager: ${e.message}`);
          });
        }}
      >
        Add a field to {table}
      </button>
    </div>
  );
}
