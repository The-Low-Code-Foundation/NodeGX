import React, { useState } from 'react';

import type { NodeGraphNode } from '@noodl-models/nodegraphmodel';

import css from './HowItWorks.module.scss';
import { HowItWorksModal } from './HowItWorksModal';
import { rulesFor } from './nodeRules';
import { isSpecInProgress } from './specInProgress';

/**
 * NSP-019 R33 — the property panel's entry to a node's spec, at the top of the panel under the
 * node's name (R31: "you can have the 'how this node works' button at the top of the panel even,
 * like a help popup"). It replaces the two folds that sat under the property rows (s77).
 *
 * Three arms:
 * - the catalog has `rules` for the type → *How this node works*, which opens the modal;
 * - the type has a spec and no words yet (And, Or, Query Records, Page Inputs, Screen Resolution;
 *   `specInProgress`) → a dashed *How it works: spec in progress* (R31: never an empty Try);
 * - anything else → nothing at all (absent, not empty — NSP-019 AC1).
 *
 * The modal is mounted only while open; the spec package it plays (~890 KB of source) is loaded by
 * the modal's *Try it* on its first opening, so an ordinary selection pays for none of it.
 */

export interface HowItWorksButtonProps {
  model: NodeGraphNode;
}

function HelpIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14M12 17.5v.01" />
    </svg>
  );
}

export function HowItWorksButton({ model }: HowItWorksButtonProps) {
  const [isOpen, setOpen] = useState(false);
  const typeName = model.typename;

  if (!rulesFor(typeName)) {
    if (!isSpecInProgress(typeName)) return null;
    return (
      <div className={css['Entry']}>
        <div className={css['InProgress']}>How it works: spec in progress</div>
      </div>
    );
  }

  return (
    <div className={css['Entry']}>
      <button type="button" className={css['OpenButton']} onClick={() => setOpen(true)}>
        <HelpIcon />
        How this node works
      </button>
      {isOpen && <HowItWorksModal model={model} onClose={() => setOpen(false)} />}
    </div>
  );
}
