/**
 * P111 SEE-001 §4 item 3 — the honesty number on the components panel: the header's `67% known` and a row's `50%`.
 *
 * Thin by design: every word comes from `honestyView.ts` (graded in `tests-unit/see-001`), which reads
 * `@nodegx/node-spec`'s one rule. This file only draws it and opens the two popovers:
 *
 *   - the header's lists the components holding the most script; a row there opens that component;
 *   - a row's lists that component's script parts by name; a row there opens the component with that node selected
 *     (`navigateToInstance`, the door the `×N` popover's rows use), where its card carries the script mark.
 *
 * @module noodl-editor/views/panels/ComponentsPanelNew/components/HonestyLabels
 */

import React, { createContext, useContext } from 'react';

import { MenuDialogItem, MenuDialogWidth } from '@noodl-core-ui/components/popups/MenuDialog';

import { ProjectModel } from '@noodl-models/projectmodel';

import { EventDispatcher } from '../../../../../../shared/utils/EventDispatcher';
import { showContextMenuInPopup } from '../../../ShowContextMenuInPopup';
import css from '../ComponentsPanel.module.scss';
import type { HeaderHonesty, RowHonesty } from '../honestyView';
import { navigateToInstance } from '../showUsedInPopover';

export interface HonestyRows {
  /** Each component holding script, by legacy name. */
  rows: ReadonlyMap<string, RowHonesty>;
}

/** The rows' numbers, provided by the panel so the tree builder does not carry them through every level. */
export const HonestyRowsContext = createContext<HonestyRows>({ rows: new Map() });

function Mark() {
  return <span className={css['HonestyMark']} aria-hidden="true" />;
}

function openComponent(name: string) {
  const component = ProjectModel.instance?.getComponentWithName(name);
  if (!component) return;
  EventDispatcher.instance.notifyListeners('ComponentPanel.SwitchToComponent', { component, pushHistory: true });
}

/** The header's number: `67% known`. Nothing at all for a project with no known or script nodes. */
export function HeaderHonestyLabel({ header }: { header: HeaderHonesty | null }) {
  if (!header) return null;

  const open = (anchor: HTMLElement) => {
    const items: (MenuDialogItem | 'divider')[] = [
      {
        key: 'note',
        component: () => (
          <div className={css['HonestyNote']} data-test="honesty-note">
            <Mark />
            <span>{header.note}</span>
          </div>
        )
      }
    ];
    if (header.components.length) {
      items.push('divider');
      for (const row of header.components) {
        items.push({
          label: row.label,
          endSlot: row.detail,
          testId: `honesty-component-${row.component}`,
          onClick: () => openComponent(row.component)
        });
      }
    }
    showContextMenuInPopup({ title: header.menuTitle, items, width: MenuDialogWidth.Large, attachTo: anchor, position: 'bottom' });
  };

  return (
    <button
      type="button"
      className={css['HeaderHonesty']}
      title={header.title}
      aria-label={header.menuTitle}
      data-test="components-panel-honesty"
      onClick={(e) => open(e.currentTarget)}
    >
      {header.text}
    </button>
  );
}

/**
 * A row's number. A component with no script gets the empty slot when any row has a number, so the numbers and the
 * meta beside them line up down the tree, and nothing at all when none does.
 */
export function RowHonestyLabel({ componentName }: { componentName: string | undefined }) {
  const { rows } = useContext(HonestyRowsContext);
  if (!rows.size) return null;
  const row = componentName ? rows.get(componentName) : undefined;
  if (!row || !componentName) return <span className={css['HonestySlot']} aria-hidden="true" />;

  const open = (anchor: HTMLElement) => {
    const items: (MenuDialogItem | 'divider')[] = row.parts.map((part) => ({
      label: part.label,
      endSlot: part.detail,
      testId: `honesty-part-${part.id}`,
      onClick: () => {
        navigateToInstance(componentName, part.id);
      }
    }));
    if (row.more > 0) items.push({ label: `+${row.more} more script ${row.more === 1 ? 'node' : 'nodes'}`, isDisabled: true });
    showContextMenuInPopup({ title: row.menuTitle, items, width: MenuDialogWidth.Large, attachTo: anchor, position: 'bottom' });
  };

  return (
    <button
      type="button"
      className={css['HonestyMeta']}
      title={row.title}
      data-test="component-tree-honesty"
      data-percent={row.text}
      onClick={(e) => {
        // The row underneath would switch the canvas to this component; the popover's rows do that, with a node chosen.
        e.stopPropagation();
        open(e.currentTarget);
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Mark />
      {row.text}
    </button>
  );
}
