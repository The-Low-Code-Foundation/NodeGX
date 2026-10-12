import React from 'react';

import css from './HowItWorks.module.scss';
import { ruleParts, type RuleGroup } from './nodeRules';
import { summariseDisagreements, type DisagreementRow } from './specDisagreements';

/**
 * NSP-019 R33 — the modal's left column: a node's rules, per input port, each case with the
 * outcome it reports as a chip (Done, Unchanged, Failure) and the signals it sends beneath it.
 *
 * The words are NSP-018's, from the catalog (`rulesFor`); `ruleParts` only moves them — the
 * outcome to the chip, the rest under the case. Where the spec and the running node ever
 * disagreed (the bug ledger's rows, `specDisagreements`), the column says so last, with each ruling.
 *
 * Hook-free, so the plain-Node runner evaluates it as an element tree (`tests-unit/support/renderElements`).
 */
export interface NodeRulesColumnProps {
  groups: readonly RuleGroup[];
  disagreements?: readonly DisagreementRow[];
}

const CHIP_CLASS: Record<string, string> = {
  Done: 'Chip-done',
  Unchanged: 'Chip-unchanged',
  Failure: 'Chip-failure',
  Completed: 'Chip-completed'
};

function capitalise(text: string): string {
  return text.length > 0 ? text[0].toUpperCase() + text.slice(1) : text;
}

export function NodeRulesColumn({ groups, disagreements = [] }: NodeRulesColumnProps) {
  return (
    <section className={css['Rules']} aria-label="The rules">
      <h2 className={css['SectionTitle']}>The rules</h2>
      {groups.map((group) => (
        <div key={group.port} className={css['RuleGroup']}>
          <h3 className={css['RulePort']}>{group.label}</h3>
          {group.lines.map((line, i) => {
            const { when, pulses, outcome, silent } = ruleParts(line);
            const then = [pulses.length > 0 ? `Sends ${pulses.join(', ')}` : '', silent ? capitalise(silent) : '']
              .filter(Boolean)
              .join('. ');
            return (
              <div key={i} className={css['Rule']}>
                <span className={css['RuleText']}>
                  <span className={css['RuleWhen']}>{capitalise(when)}</span>
                  {then && <span className={css['RuleThen']}>{then}</span>}
                </span>
                {outcome && <span className={`${css['Chip']} ${css[CHIP_CLASS[outcome]]}`}>{outcome}</span>}
              </div>
            );
          })}
        </div>
      ))}
      {disagreements.length > 0 && (
        <div className={css['Disagreed']} role="note">
          <span className={css['Label']}>
            The spec and the running node disagreed {summariseDisagreements(disagreements)}
          </span>
          <ul className={css['DisagreedList']}>
            {disagreements.map((row) => (
              <li key={row.id}>
                <span className={css['DisagreedId']}>{row.id}</span> {row.title}
                <span className={css['RuleThen']}>
                  {' '}
                  — {row.status}
                  {row.commit ? ` in ${row.commit}` : ''}
                </span>
                {row.ruling && <div className={css['DisagreedRuling']}>{row.ruling}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
