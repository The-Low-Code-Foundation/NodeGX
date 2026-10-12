import classNames from 'classnames';
import React from 'react';

import css from './HowItWorks.module.scss';
import type { TryRow } from './tryNodeModel';

/**
 * NSP-019 R33 — *What happened*: one row per thing the person did (the first row is what the node
 * started with), the node's answers beside it in plain words, each outcome as a chip. The newest
 * row is last and tinted; the caller scrolls it into view (R30: "the 'what happened' list doesn't
 * focus so you have to scroll down").
 *
 * NSP-019 s95 — a warning the node raised in that row (Richard's drive: "show why the settings are FUBAR") reads under the
 * row's answer in the danger colour, chipped *Warning*; one it withdrew reads *Fixed*.
 *
 * Hook-free, so the plain-Node runner evaluates it as an element tree.
 */
export interface TryRowsProps {
  rows: readonly TryRow[];
  error?: string;
}

const OUTCOME_WORD = { done: 'Done', unchanged: 'Unchanged', failure: 'Failure' } as const;

export function TryRows({ rows, error }: TryRowsProps) {
  const latest = rows.length - 1;
  return (
    <ol className={css['RowList']}>
      {rows.map((row, i) => {
        // an outcome with nothing sent (Unchanged) still says so in words, not only in its chip
        const detail = row.quiet
          ? 'nothing happens'
          : row.answers.length === 0 && row.outcomes.length > 0
          ? 'nothing moves'
          : row.answers.join(', ');
        // a chip names its input only when the row pressed more than one (Same frame), or another input answered
        const named =
          new Set(row.outcomes.map((o) => o.label)).size > 1 || row.outcomes.some((o) => o.label !== row.what);
        return (
          <li key={i} className={classNames(css['Row'], i === latest && i > 0 && css['is-latest'])} data-row={i + 1}>
            <span className={css['RowN']}>{i + 1}</span>
            <span className={css['RowWhat']}>{row.what}</span>
            <span className={classNames(css['RowDetail'], row.quiet && css['is-quiet'])}>
              {detail || (row.kind === 'load' && row.problems.length === 0 ? 'nothing to start with' : '')}
              {row.problems.map((p, k) => (
                <span key={k} className={classNames(css['RowProblem'], css[`is-${p.state}`])} data-problem={p.state}>
                  {p.state === 'raised' ? p.text : `No longer: ${p.text}`}
                </span>
              ))}
            </span>
            {(row.outcomes.length > 0 || row.problems.length > 0) && (
              <span className={css['RowChips']}>
                {row.outcomes.map((o, k) => (
                  <span
                    key={k}
                    className={`${css['Chip']} ${css[`Chip-${o.value}`]}`}
                    title={o.error ? `${o.label}: ${o.error}` : undefined}
                  >
                    {named ? `${o.label}: ` : ''}
                    {OUTCOME_WORD[o.value]}
                  </span>
                ))}
                {row.problems.map((p, k) => (
                  <span key={`p${k}`} className={`${css['Chip']} ${css[p.state === 'raised' ? 'Chip-failure' : 'Chip-done']}`}>
                    {p.state === 'raised' ? 'Warning' : 'Fixed'}
                  </span>
                ))}
              </span>
            )}
          </li>
        );
      })}
      {error !== undefined && <li className={css['RowError']}>The spec refused that: {error}</li>}
    </ol>
  );
}
