/**
 * TVW-001 (c) — open the *Used in* list from a row's `×N` button.
 *
 * The rows themselves are grouped in `usedIn.ts` (pure, graded). This is the editor half: it turns
 * them into menu rows and, when one is picked, does what X-Ray's *Used In* rows do —
 * `switchToComponent(parent, { node })`, which moves the canvas to the parent and selects the
 * instance node there. The panel's own highlight then follows through `activeComponentChanged`
 * (slice 1), so nothing here touches the selection in the panel.
 *
 * ⚠️ Anchored with `attachTo`, never to the cursor: a synthesised click does not move the OS cursor,
 * so a cursor-anchored menu cannot be driven or asserted on (PNL-009, `ShowContextMenuInPopup.tsx`).
 *
 * @module noodl-editor/views/panels/ComponentsPanelNew/showUsedInPopover
 */

import { IconName } from '@noodl-core-ui/components/common/Icon';
import { MenuDialogItem, MenuDialogWidth } from '@noodl-core-ui/components/popups/MenuDialog';

import { ProjectModel } from '@noodl-models/projectmodel';

import { NodeGraphContextTmp } from '@noodl-contexts/NodeGraphContext/NodeGraphContext';
import { showContextMenuInPopup } from '../../ShowContextMenuInPopup';
import type { UsageInstance } from './componentUsage';
import { usedInRows, usedInTitle } from './usedIn';

/**
 * Move the canvas to `parentName` and select the instance node inside it.
 *
 * Exported so the drive can call the same door the menu row calls. Returns false when the parent or
 * the node has gone — a stale popover left open across a delete, which must not throw into the menu.
 */
export function navigateToInstance(parentName: string, nodeId: string): boolean {
  const parent = ProjectModel.instance?.getComponentWithName(parentName);
  if (!parent) return false;

  const node = parent.graph?.findNodeWithId(nodeId);
  NodeGraphContextTmp.switchToComponent(parent, { node: node ?? undefined, pushHistory: true });
  return true;
}

export function showUsedInPopover(instances: readonly UsageInstance[] | undefined, attachTo: HTMLElement) {
  const rows = usedInRows(instances);
  if (!rows.length) return;

  const items: MenuDialogItem[] = rows.map((row) => ({
    label: row.folder ? `${row.folder}/${row.label}` : row.label,
    icon: IconName.Component,
    testId: `used-in-row-${row.parent}`,
    // The parent's own count, so a list shorter than the button's number explains itself per row.
    endSlot: row.count > 1 ? `×${row.count}` : undefined,
    onClick: () => {
      navigateToInstance(row.parent, row.nodeId);
    }
  }));

  showContextMenuInPopup({
    title: usedInTitle(
      rows,
      (instances ?? []).length
    ),
    items,
    width: MenuDialogWidth.Large,
    attachTo,
    position: 'bottom'
  });
}
