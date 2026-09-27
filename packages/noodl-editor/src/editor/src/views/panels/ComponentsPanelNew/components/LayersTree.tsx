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
import React, { useCallback, useRef } from 'react';

import { Icon, IconName, IconSize } from '@noodl-core-ui/components/common/Icon';

import css from '../ComponentsPanel.module.scss';
import type { DropSide } from '../layersDrag';
import type { LayerRow } from '../layersTree';
import type { LayersDragApi } from '../hooks/useLayersDrag';
import type { LayersView } from '../hooks/useLayersTree';

/**
 * TVW-005 — where in a row's height the three drop meanings live.
 *
 * ⚠️ **Not a third each.** A reparent is the destructive one — it changes what a node is inside,
 * not just what it is next to — so the two reorder bands are widened to give it a smaller target
 * than the gesture a person makes most. The canvas's own attach uses the same asymmetry
 * (`nodeAttachment.ts` measures against the node's top and bottom edges, not its middle).
 */
const REORDER_BAND = 0.32;

function sideFromPointer(element: HTMLElement, clientY: number): DropSide {
  const rect = element.getBoundingClientRect();
  const at = rect.height ? (clientY - rect.top) / rect.height : 0.5;
  if (at < REORDER_BAND) return 'before';
  if (at > 1 - REORDER_BAND) return 'after';
  return 'inside';
}

export interface LayersTreeProps {
  view: LayersView;
  /** TVW-005. Absent while the tab is read-only — every row then behaves as TVW-004 drew it. */
  drag?: LayersDragApi;
  /** Open this component on the canvas — `Edit ›`, double-click, or `Enter` on an instance row. */
  onEditComponent(componentName: string): void;
  /** The person selected this row. The path is TVW-003's instance-path identity. */
  onSelectRow(row: LayerRow): void;
  /** Hover in, or `null` on the way out. */
  onHoverRow(row: LayerRow | null): void;
}

export function LayersTree({ view, drag, onEditComponent, onSelectRow, onHoverRow }: LayersTreeProps) {
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
          drag={drag}
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
  drag?: LayersDragApi;
  isOpen: boolean;
  hasChildren: boolean;
  onToggle(key: string): void;
  onEditComponent(componentName: string): void;
  onSelectRow(row: LayerRow): void;
  onHoverRow(row: LayerRow | null): void;
}

function LayerRowItem({
  row,
  drag,
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
      // TVW-005 §3: ⌥↑ / ⌥↓ reorders the selected row. The refusal is the same one a drag gets.
      if (drag && event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault();
        event.stopPropagation();
        drag.moveByKeyboard(row.key, event.key === 'ArrowUp' ? 'up' : 'down');
      }
    },
    [drag, onEditComponent, row.component, row.key]
  );

  /**
   * The drag, in the Components tab's own protocol: a 5px threshold on `mousemove`, `PopupLayer`
   * carrying the ghost, and `dragCompleted()` on the way out — mirrored from `ComponentItem` so
   * the two trees in this panel behave identically under the hand.
   */
  const itemRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      // ⚠️ The threshold is the hook's, watched on the window: a row cannot see the mouse once the
      // pointer has left it, and leaving it is what dragging in a tree IS.
      if (drag && itemRef.current) drag.onRowPress(row, itemRef.current, event.clientX, event.clientY);
    },
    [drag, row]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!drag || !itemRef.current) return;
      // Hovering during a drag — including a drag that started in the Components tab.
      drag.onRowDragOver(row, sideFromPointer(itemRef.current, event.clientY), event.altKey);
    },
    [drag, row]
  );

  const handleMouseUp = useCallback(
    (event: React.MouseEvent) => {
      if (!drag || !itemRef.current) return;
      // A mouse-up that is not the end of a drag is a click, and a click is TVW-003's selection.
      if (!drag.isDragging()) return;
      event.stopPropagation();
      drag.onRowDrop(row, sideFromPointer(itemRef.current, event.clientY), event.altKey);
    },
    [drag, row]
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
   * Which indicator this row draws, if any. Only a drop that would actually do something draws one:
   * a refused hover leaves the row alone and puts its sentence on the drag instead, so the panel
   * never shows a line where nothing can land.
   */
  const dropSide = drag?.target && drag.target.key === row.key && drag.target.ok ? drag.target.side : null;

  /**
   * `data-node-path` is AC2's seam. The row's identity is its instance path, and the preview's own
   * inspector addresses a rendered element by exactly the same path (`instancePathOf`) — so the two
   * walks can be compared element for element rather than by counting. A bare node id would not do
   * it: a component placed twice draws the same ids twice, and AC2 is a claim about *this* copy.
   */
  return (
    <div
      ref={itemRef}
      className={classNames(css['TreeItem'], {
        [css['LayerTint']]: row.tinted,
        [css['LayerInstance']]: isInstance,
        [css['LayerDragging']]: drag?.draggingKey === row.key,
        [css['LayerRefused']]: drag?.shakingKey === row.key,
        [css['LayerDropBefore']]: dropSide === 'before',
        [css['LayerDropAfter']]: dropSide === 'after',
        [css['LayerDropInto']]: dropSide === 'inside'
      })}
      style={{ '--level': String(row.indent) } as React.CSSProperties}
      data-test={isInstance ? 'layers-instance' : 'layers-node'}
      data-level={row.depth}
      data-component={row.component ?? undefined}
      data-node-path={row.path.join('/')}
      data-drop={dropSide ?? undefined}
      title={row.typename ? `${row.label} · ${row.typename}` : row.label}
      tabIndex={0}
      onClick={() => onSelectRow(row)}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
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
