/**
 * TVW-004 — the Layers tab: the screen the preview is showing, expanded through every instance.
 *
 * §5 says *do not share the builder; share the row component* — so this draws the Components tab's
 * own `.TreeItem` geometry, classes and indent guides, from the same stylesheet, over rows built by
 * a completely different walk (`layersTree.ts`, from graphs rather than from names). The two trees
 * look like one panel because they *are* one row, drawn twice.
 *
 * 🔴 **The indent step is 10px here, and it stops at eight levels** (Richard, 2026-09-18). Measured
 * over 47,494 rows: at the Components tab's 12px step, 28% of Layers rows would sit past the right
 * edge of a 240px panel with no room for a name at all. The depth keeps counting past the cap; only
 * the drawing stops, and the indent guides carry the rest.
 *
 * @module noodl-editor/views/panels/ComponentsPanelNew/components/LayersTree
 */

import classNames from 'classnames';
import React, { useCallback } from 'react';

import { Icon, IconName, IconSize } from '@noodl-core-ui/components/common/Icon';

import css from '../ComponentsPanel.module.scss';
import type { LayerRow } from '../layersTree';
import type { LayersView } from '../hooks/useLayersTree';

export interface LayersTreeProps {
  view: LayersView;
  /** Open this component on the canvas — `Edit ›`, double-click, or `Enter` on an instance row. */
  onEditComponent(componentName: string): void;
  /** The person selected this row. The path is TVW-003's instance-path identity. */
  onSelectRow(row: LayerRow): void;
  /** Hover in, or `null` on the way out. */
  onHoverRow(row: LayerRow | null): void;
}

export function LayersTree({ view, onEditComponent, onSelectRow, onHoverRow }: LayersTreeProps) {
  const { rows, expanded, withChildren, toggle } = view;

  if (!rows.length) {
    return (
      /* §2's empty page. A screen with nothing on it is a real state — a new project's first page
         is exactly this — and the two doors out of it are the two things a screen can start with. */
      <div className={css['PlaceholderMessage']} data-test="layers-empty">
        <span>Nothing here yet.</span>
        <span>Add a Group to start a screen, or a Function to start logic.</span>
      </div>
    );
  }

  return (
    <>
      {rows.map((row) => (
        <LayerRowItem
          key={row.key}
          row={row}
          isOpen={expanded.has(row.key)}
          hasChildren={withChildren.has(row.key)}
          onToggle={toggle}
          onEditComponent={onEditComponent}
          onSelectRow={onSelectRow}
          onHoverRow={onHoverRow}
        />
      ))}
    </>
  );
}

interface LayerRowItemProps {
  row: LayerRow;
  isOpen: boolean;
  hasChildren: boolean;
  onToggle(key: string): void;
  onEditComponent(componentName: string): void;
  onSelectRow(row: LayerRow): void;
  onHoverRow(row: LayerRow | null): void;
}

function LayerRowItem({
  row,
  isOpen,
  hasChildren,
  onToggle,
  onEditComponent,
  onSelectRow,
  onHoverRow
}: LayerRowItemProps) {
  const handleToggle = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onToggle(row.key);
    },
    [onToggle, row.key]
  );

  const handleEdit = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      if (row.component) onEditComponent(row.component);
    },
    [onEditComponent, row.component]
  );

  const handleDoubleClick = useCallback(() => {
    if (row.component) onEditComponent(row.component);
  }, [onEditComponent, row.component]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && row.component) onEditComponent(row.component);
    },
    [onEditComponent, row.component]
  );

  /**
   * The band is a **heading over the rows it introduces**, not a row you can select: it names a
   * boundary between two components' files. It carries the `Edit ›` door instead, except when it
   * is the region you are already editing — which is what `EDITING HERO` means.
   */
  if (row.kind === 'band') {
    return (
      <div
        className={classNames(css['TreeItem'], css['LayerBand'], { [css['LayerTint']]: row.tinted })}
        style={{ '--level': String(row.indent) } as React.CSSProperties}
        data-test="layers-band"
        data-editing={row.editing ? 'true' : 'false'}
        data-level={row.depth}
      >
        <div className={css['CaretSlot']} />
        <div className={css['ItemContent']}>
          <div className={css['LayerBandLabel']}>{row.label}</div>
          {!row.editing && row.component && (
            <button type="button" className={css['LayerEdit']} onClick={handleEdit} data-test="layers-edit">
              Edit ›
            </button>
          )}
        </div>
      </div>
    );
  }

  if (row.kind === 'cycle' || row.kind === 'router-note' || row.kind === 'dynamic-template') {
    return (
      <div
        className={classNames(css['TreeItem'], css['LayerNote'])}
        style={{ '--level': String(row.indent) } as React.CSSProperties}
        data-test={`layers-${row.kind}`}
        data-level={row.depth}
      >
        <div className={css['CaretSlot']} />
        <div className={css['ItemContent']}>
          <div className={css['LayerNoteLabel']}>{row.label}</div>
        </div>
      </div>
    );
  }

  const isInstance = row.kind === 'instance';

  /**
   * `data-node-path` is AC2's seam. The row's identity is its instance path, and the preview's own
   * inspector addresses a rendered element by exactly the same path (`instancePathOf`) — so the two
   * walks can be compared element for element rather than by counting. A bare node id would not do
   * it: a component placed twice draws the same ids twice, and AC2 is a claim about *this* copy.
   */
  return (
    <div
      className={classNames(css['TreeItem'], {
        [css['LayerTint']]: row.tinted,
        [css['LayerInstance']]: isInstance
      })}
      style={{ '--level': String(row.indent) } as React.CSSProperties}
      data-test={isInstance ? 'layers-instance' : 'layers-node'}
      data-level={row.depth}
      data-component={row.component ?? undefined}
      data-node-path={row.path.join('/')}
      title={row.typename ? `${row.label} · ${row.typename}` : row.label}
      tabIndex={0}
      onClick={() => onSelectRow(row)}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => onHoverRow(row)}
      onMouseLeave={() => onHoverRow(null)}
    >
      {hasChildren ? (
        <div
          className={classNames(css['Caret'], { [css['Expanded']]: isOpen })}
          data-test="layers-caret"
          onClick={handleToggle}
        >
          <Icon icon={IconName.CaretRight} size={IconSize.Tiny} />
        </div>
      ) : (
        /* Where a caret would be, so glyphs at one depth share one x — the Components tab's own
           rule, and the reason a leaf and a parent line up. */
        <div className={css['CaretSlot']} />
      )}
      <div className={css['ItemContent']}>
        <div className={classNames(css['Icon'], css[`Cat-${row.category}`])}>
          <Icon icon={isInstance ? IconName.Component : IconName.UI} size={IconSize.Small} />
        </div>
        <div className={css['Label']}>{row.label}</div>
        {row.repeatedBy && (
          /* §2 asked for `× n`. There is no n: a repeater draws one row per item and the items are
             data the editor has not run. The row says how it repeats instead — see `layersTree`. */
          <div className={css['LayerRepeat']} data-test="layers-repeat" title={`Drawn once per item by ${row.repeatedBy}`}>
            one per item
          </div>
        )}
        {isInstance && row.component && (
          <button type="button" className={css['LayerEdit']} onClick={handleEdit} data-test="layers-edit">
            ›
          </button>
        )}
      </div>
    </div>
  );
}
