/**
 * TVW-001 (b) — the right-hand meta on a row: `×N`, `unplaced`, `empty`, a page's route, or
 * `not in a router`. What each one means, and when a row has none, is decided in
 * `componentUsage.ts`; this only draws it.
 */

import classNames from 'classnames';
import React from 'react';

import css from '../ComponentsPanel.module.scss';
import { RowMeta } from '../componentUsage';

const TITLE: Record<RowMeta['tone'], (meta: RowMeta) => string> = {
  count: (meta) =>
    `Placed ${(meta as { count: number }).count} ${
      (meta as { count: number }).count === 1 ? 'time' : 'times'
    } in this app`,
  unplaced: () => 'Nothing in this app places this component',
  empty: () => 'This component has no nodes yet',
  route: (meta) => `The page's route: ${meta.text}`,
  unrouted: () => 'No Router lists this page, so nothing can navigate to it'
};

export function RowMetaLabel({
  meta,
  isStart
}: {
  meta: RowMeta | null | undefined;
  /** TVW-001 (d): the Router opens this page first — said before the route, as the mock's `★`. */
  isStart?: boolean;
}) {
  if (!meta) return null;

  return (
    <>
      {isStart && (
        <span className={css['MetaStart']} data-test="component-tree-start" title="The Router opens this page first">
          start
        </span>
      )}
      <span
        className={classNames(css['Meta'], css[`Meta-${meta.tone}`])}
        data-test="component-tree-meta"
        data-tone={meta.tone}
        title={TITLE[meta.tone](meta)}
      >
        {meta.text}
      </span>
    </>
  );
}
