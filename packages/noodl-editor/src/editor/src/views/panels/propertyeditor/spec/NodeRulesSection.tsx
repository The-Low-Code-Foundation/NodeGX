import React from 'react';

import { splitRule, type RuleGroup } from './nodeRules';
import css from './SpecSections.module.scss';

/**
 * NSP-019 AC1 — "What this node does": a node's rules, per input port, folded.
 *
 * Hook-free on purpose: the plain-Node runner evaluates it as an element tree
 * (`tests-unit/support/renderElements`), so what it draws for Counter is graded, not inferred
 * from source. The fold is a native `<details>` — no state, no `Collapsible` (which measures
 * itself with a `ResizeObserver`), and the open/closed choice is the caller's (`SpecSections`
 * remembers it across nodes the way the tab strip remembers its tab).
 */
export interface NodeRulesSectionProps {
  groups: readonly RuleGroup[];
  isOpen: boolean;
  onToggle?: (isOpen: boolean) => void;
}

export function NodeRulesSection({ groups, isOpen, onToggle }: NodeRulesSectionProps) {
  const lineCount = groups.reduce((n, g) => n + g.lines.length, 0);
  return (
    <details
      className={css['Fold']}
      open={isOpen}
      onToggle={(event) => onToggle?.((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className={css['FoldTitle']}>
        What this node does
        <span className={css['FoldCount']}>
          {lineCount} {lineCount === 1 ? 'rule' : 'rules'}
        </span>
      </summary>
      <div className={css['FoldBody']}>
        <p className={css['Intro']}>
          Generated from the node&apos;s spec — the same rules its tests grade, port by port.
        </p>
        {groups.map((group) => (
          <section key={group.port} className={css['RuleGroup']}>
            <h4 className={css['RulePort']}>{group.label}</h4>
            <ul className={css['RuleList']}>
              {group.lines.map((line, i) => {
                const { when, then } = splitRule(line);
                return (
                  <li key={i} className={css['Rule']}>
                    <span className={css['RuleWhen']}>{when}</span>
                    {then !== undefined && (
                      <>
                        <span className={css['RuleArrow']} aria-hidden="true">
                          {' → '}
                        </span>
                        <span className={css['RuleThen']}>{then}</span>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </details>
  );
}
