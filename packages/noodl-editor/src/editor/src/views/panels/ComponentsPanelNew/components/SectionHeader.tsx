/**
 * TVW-001 (d) — the heading over a section by role (`Pages`, `Components`, `Logic`,
 * `Cloud functions`), or over one Router's pages when there are two. Not a row: it does not
 * select, collapse or accept a drop. What goes under which heading is `componentSections.ts`.
 */

import classNames from 'classnames';
import React from 'react';

import css from '../ComponentsPanel.module.scss';
import { SectionItemData } from '../types';

export function SectionHeader({ section }: { section: SectionItemData }) {
  return (
    <>
      <div
        className={classNames(css['Section'], section.variant === 'router' && css['Section-router'])}
        data-test="component-tree-section"
        data-section={section.id}
        role="heading"
        aria-level={section.variant === 'router' ? 3 : 2}
      >
        <span className={css['SectionLabel']}>{section.label}</span>
        <span className={css['SectionCount']}>{section.count}</span>
      </div>
      {section.emptyText && <div className={css['SectionEmpty']}>{section.emptyText}</div>}
    </>
  );
}
