/**
 * TVW-001 (c) — the rows behind the `×N` button: *where is this component used?*
 *
 * The instances come from the one walk in `componentUsage.ts` (`usage.instances`, `{parent, nodeId}`
 * in walk order). This groups them **by parent**, which is the question being asked — "where is this
 * used" is answered by places, not by occurrences.
 *
 * ⚠️ That grouping is a deliberate departure from X-Ray's rows, which this list was moved from
 * (`ComponentXRayPanel.tsx:142-160` draws one row per usage). On the P93 corpus every component with
 * three or more instances but one has them all in a single parent — `ServiceCard ×4` is four
 * instances inside `Sections/Services` — so X-Ray's shape would draw the same path four times and
 * answer nothing. A parent holding several carries its own count instead, and picking it goes to the
 * first, as X-Ray does (`instanceNodeIds[0]`).
 *
 * Deliberately free of editor imports so it grades in plain Node (`tests-unit/tvw-001`).
 *
 * @module noodl-editor/views/panels/ComponentsPanelNew/usedIn
 */

import type { UsageInstance } from './componentUsage';

export interface UsedInRow {
  /** The component whose graph holds the instances — its full name, as the project file stores it. */
  parent: string;
  /** The last path segment: what the row reads. */
  label: string;
  /** The folders above it, `/` separated, without the leading slash. Empty at the top level. */
  folder: string;
  /** The instance this row navigates to — the first in walk order, as X-Ray picks. */
  nodeId: string;
  /** How many instances this parent holds. Only drawn above 1. */
  count: number;
}

/**
 * One row per parent, ordered by path (case-insensitively) so the list is stable between openings —
 * walk order is the graph's, and a user re-opening the popover should not find the rows moved.
 */
export function usedInRows(instances: readonly UsageInstance[] | undefined): UsedInRow[] {
  const byParent = new Map<string, UsedInRow>();

  for (const instance of instances ?? []) {
    const existing = byParent.get(instance.parent);
    if (existing) {
      existing.count++;
      continue;
    }
    byParent.set(instance.parent, {
      parent: instance.parent,
      label: labelOf(instance.parent),
      folder: folderOf(instance.parent),
      nodeId: instance.nodeId,
      count: 1
    });
  }

  return [...byParent.values()].sort(
    (a, b) => a.parent.toLowerCase().localeCompare(b.parent.toLowerCase()) || a.parent.localeCompare(b.parent)
  );
}

function labelOf(fullName: string): string {
  const segments = fullName.split('/').filter(Boolean);
  return segments.length ? segments[segments.length - 1] : fullName;
}

function folderOf(fullName: string): string {
  const segments = fullName.split('/').filter(Boolean);
  return segments.slice(0, -1).join('/');
}

/**
 * The popover's heading. It says both numbers whenever they differ, because the button the user
 * pressed said `×8` and a list of three rows has to account for the other five.
 */
export function usedInTitle(rows: readonly UsedInRow[], instanceCount: number): string {
  if (rows.length === instanceCount) {
    return instanceCount === 1 ? 'Used in 1 place' : `Used in ${instanceCount} places`;
  }
  const places = rows.length === 1 ? '1 place' : `${rows.length} places`;
  return `Used in ${places} · ${instanceCount} times`;
}
