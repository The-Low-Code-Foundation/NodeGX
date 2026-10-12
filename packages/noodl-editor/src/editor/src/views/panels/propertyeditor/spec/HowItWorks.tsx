import React from 'react';

import css from './HowItWorks.module.scss';
import { rulesFor } from './nodeRules';
import { NodeRulesColumn } from './NodeRulesColumn';
import { disagreementsFor } from './specDisagreements';
import { TryIt, type TryItProps } from './TryIt';
import type { StageColors } from './TryStage';

/**
 * NSP-019 R33 — what the *How this node works* modal holds: a header naming the node, its rules on
 * the left and *Try it* on the right, both open (R31: "leave both open in the modal").
 *
 * The shell (`HowItWorksModal`) owns the dialog, the backdrop, Escape and the theme's node colours;
 * this body owns none of them, so `react-dom/server` renders it in the plain-Node runner (no
 * `document`, no `Icon`), and what Richard reads is graded rather than inferred.
 */
export interface HowItWorksProps {
  typeName: string;
  /** What the canvas calls this node: its label, or its type's display name. */
  title: string;
  /** The type's display name. */
  typeLabel: string;
  parameters?: Readonly<Record<string, unknown>>;
  colors?: StageColors;
  onClose?: () => void;
  /** Passed through to *Try it* (a test's preloaded spec package). */
  loaded?: TryItProps['loaded'];
}

export function HowItWorks({ typeName, title, typeLabel, parameters, colors, onClose, loaded }: HowItWorksProps) {
  const groups = rulesFor(typeName) ?? [];
  return (
    <div className={css['Modal']}>
      <header className={css['Header']}>
        <span
          className={css['Swatch']}
          style={colors ? { background: colors.header, color: colors.text } : undefined}
          aria-hidden="true"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4" y="5" width="16" height="14" rx="3" />
            <path d="M2 10h2M2 14h2M20 12h2" />
          </svg>
        </span>
        <div className={css['Titles']}>
          <h1 className={css['Title']}>How the {typeLabel} works</h1>
          <span className={css['Subtitle']}>
            Its rules on the left. Try it on the right: it runs the node&apos;s spec, and nothing in your app is
            touched.
          </span>
        </div>
        {onClose && (
          <button type="button" className={css['Close']} aria-label="Close" onClick={onClose}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        )}
      </header>
      <div className={css['Body']}>
        <NodeRulesColumn groups={groups} disagreements={disagreementsFor(typeName)} />
        <TryIt typeName={typeName} title={title} typeLabel={typeLabel} parameters={parameters} loaded={loaded} />
      </div>
    </div>
  );
}
