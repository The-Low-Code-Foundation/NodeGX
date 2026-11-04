/**
 * P132 BWF-013: a Run a workflow step's `workflow` row, the piece it runs, picked by NAME.
 *
 * Studio's `pieceField`, drawn in this panel: the reusable pieces (workflows no trigger starts) first, then the
 * workflows something starts; the workflow being edited is in neither, and one that runs it (a ring, which the backend
 * refuses at save) is shown with its reason and not offered. *Open the piece* switches the canvas to it.
 *
 * An id that is not a workflow on this backend stays shown as it is ("not on this backend"): an agent may write the
 * step before the piece, and the backend allows that at save.
 *
 * @module views/panels/propertyeditor/components/WorkflowCondition/WorkflowPieceRow
 */

import React from 'react';

import type { PieceChoices } from '@noodl-models/workflow/workflowPieces';

import styles from './WorkflowCondition.module.scss';

export interface WorkflowPieceRowProps {
  /** `null` until the backend's workflows have been read. */
  choices: PieceChoices | null;
  onChange: (id: string) => void;
  /** Open the piece. Absent when the step names none on this backend. */
  onOpen?: () => void;
  /** The workflow being edited, in words, for a ring's reason. */
  workflowName: string;
  ariaLabel?: string;
}

export function WorkflowPieceRow({ choices, onChange, onOpen, workflowName, ariaLabel }: WorkflowPieceRowProps) {
  if (!choices) {
    return (
      <div className={styles.Value}>
        <div className={styles.Hint} data-test="workflow-piece-state">
          Reading this backend’s workflows…
        </div>
      </div>
    );
  }

  const { value, there, groups } = choices;
  const none = groups.length === 0;

  return (
    <div className={styles.Value}>
      <div className={styles.ValueRow}>
        <select
          className={styles.OpSelect}
          value={value}
          aria-label={ariaLabel || 'The piece it runs'}
          data-test="workflow-piece"
          onChange={(e) => onChange(e.target.value)}
        >
          {!there && (
            <option value={value} disabled>
              {value ? `${value} (not on this backend)` : 'Choose a piece'}
            </option>
          )}
          {groups.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.options.map((o) => (
                <option key={o.id} value={o.id} disabled={o.ring && o.id !== value}>
                  {o.ring ? `${o.name} (it runs ${workflowName})` : o.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {none && (
        <div className={styles.Hint} data-test="workflow-piece-state">
          This backend has no other workflow to run. Make one with no trigger (a reusable piece), ending in a Return.
        </div>
      )}
      {!none && value && !there && (
        <div className={styles.Error} data-test="workflow-piece-state" data-state="missing">
          {`There is no workflow "${value}" on this backend: the step fails if it runs. Choose one, or write the piece.`}
        </div>
      )}

      {onOpen && (
        <div className={styles.RootActions}>
          <button type="button" className={styles.SmallButton} onClick={onOpen} data-test="workflow-piece-open">
            Open the piece ↗
          </button>
        </div>
      )}
    </div>
  );
}
