/**
 * TVW-001 (e) — how a folder path is *written* once sheets are retired.
 *
 * Sheets were top-level folders whose names began with `#`, and the panel used to answer the `#` by
 * not drawing that folder at all: `/#Design/Card` rendered as a bare `Card` at the root of its
 * section, and the folder the author made was invisible. R-C retires the sheet UI, so there is
 * nothing left for a `#` to mean — but **no name on disk changes** (TVW-001 §2 row e), because a
 * rename would break every legacy project to make a cosmetic point.
 *
 * So the `#` survives in the path and dies in the label. That split is the whole of this module,
 * and it is why it is a module rather than two `replace` calls at the call sites: the tree and the
 * create menu both write folder paths in front of a person, and if they disagreed, the menu would
 * promise a destination the tree does not show.
 *
 * 🔴 **The label is never a path.** `useComponentActions` maps what the tree hands it straight back
 * onto real component names (`sheetPrefix` used to do the putting-back, and slice 4 deletes it
 * precisely because display and truth are now the same string). Feeding a label anywhere a path is
 * expected renames `/#Design/Card` to `/Design/Card` — a silent move, on load-bearing folders, in
 * exactly the legacy projects the compatibility policy protects.
 *
 * Deliberately free of editor imports so it grades in plain Node (`tests-unit/tvw-001`).
 *
 * @module noodl-editor/views/panels/ComponentsPanelNew/folderDisplay
 */

import { CLOUD_PATH_PREFIX, SECTION_LABEL } from './componentSections';

/** `#__cloud__`, without the slashes `CLOUD_PATH_PREFIX` carries. */
const CLOUD_SEGMENT = CLOUD_PATH_PREFIX.slice(1, -1);

/** What the root of the project is called when a create menu has to name it. */
export const PROJECT_ROOT_LABEL = 'the project root';

/**
 * One folder segment, as a person reads it.
 *
 * `index` is the segment's depth, and the `#` is only stripped at depth 0 — sheets could only ever
 * be top-level, so a nested `#thing` is a folder somebody deliberately named with a `#` and keeping
 * it is the honest reading. The cloud boundary is not a folder anybody named: it is the runtime
 * seam (`types.ts` `CLOUD_SHEET`), and it reads as its section's own heading so the menu and the
 * tree call it the same thing.
 */
export function folderSegmentLabel(segment: string, index = 0): string {
  if (segment === CLOUD_SEGMENT) return SECTION_LABEL.cloud;
  if (index === 0 && segment.startsWith('#')) return segment.slice(1);
  return segment;
}

/**
 * A folder path as a destination a person can check against the tree in front of them —
 * `/#Design/Cards` → `Design / Cards` — or `null` at the root, where there is no folder to name.
 *
 * The separator is the one the component trail uses, so the two surfaces read alike.
 */
export function folderPathLabel(path: string | undefined | null): string | null {
  const segments = String(path || '')
    .split('/')
    .filter(Boolean);
  if (segments.length === 0) return null;
  return segments.map((segment, index) => folderSegmentLabel(segment, index)).join(' / ');
}
