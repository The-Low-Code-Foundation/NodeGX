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
  isStart,
  onUsedIn
}: {
  meta: RowMeta | null | undefined;
  /** TVW-001 (d): the Router opens this page first — said before the route, as the mock's `★`. */
  isStart?: boolean;
  /**
   * TVW-001 (c): `×N` is the only meta that answers a question, so it is the only one that is a
   * button. Without a handler it draws as the plain label it was in slice 1.
   */
  onUsedIn?: (anchor: HTMLElement) => void;
}) {
  if (!meta) return null;

  const isButton = meta.tone === 'count' && !!onUsedIn;
  const title = isButton ? `${TITLE.count(meta)} — click to see where` : TITLE[meta.tone](meta);

  return (
    <>
      {isStart && (
        <span className={css['MetaStart']} data-test="component-tree-start" title="The Router opens this page first">
          start
        </span>
      )}
      {isButton ? (
        <button
          type="button"
          className={classNames(css['Meta'], css[`Meta-${meta.tone}`], css['MetaButton'])}
          data-test="component-tree-meta"
          data-tone={meta.tone}
          title={title}
          onClick={(e) => {
            // The row underneath would switch the canvas to this component — the opposite of what
            // the button is for, which is leaving it for one of its parents.
            e.stopPropagation();
            onUsedIn(e.currentTarget);
          }}
          onDoubleClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {meta.text}
        </button>
      ) : (
        <span
          className={classNames(css['Meta'], css[`Meta-${meta.tone}`])}
          data-test="component-tree-meta"
          data-tone={meta.tone}
          title={title}
        >
          {meta.text}
        </span>
      )}
    </>
  );
}
