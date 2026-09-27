/**
 * TypeScript type definitions for ComponentsPanel
 */

import { ComponentModel } from '@noodl-models/componentmodel';

import { ComponentKind } from './componentKind';
import { SectionId } from './componentSections';
import { RowMeta, UsageInstance } from './componentUsage';

/**
 * Data structure for a component item in the tree
 */
export interface ComponentItemData {
  id: string;
  name: string;
  localName: string;
  component: ComponentModel;
  isRoot: boolean;
  isPage: boolean;
  isCloudFunction: boolean;
  isVisual: boolean;
  /** PNL-006: what this component is — see `componentKind.ts`. */
  kind: ComponentKind;
  /**
   * PNL-006: the canvas category name (`ComponentModel.color`). Drives the
   * glyph's colour via the same `--theme-color-node-category-*` token the canvas
   * painter resolves through `CanvasTheme`.
   */
  category: string;
  hasWarnings: boolean;
  /** PNL-006: real count from `WarningsModel`, for the dot's tooltip. */
  warningCount: number;
  /** TVW-001 (b): `×N`, `unplaced`, `empty`, the route, or `not in a router` — see `componentUsage.ts`. */
  meta: RowMeta | null;
  /** TVW-001 (d): in the `Pages` section, the Router opens this page first. */
  isStartPage?: boolean;
  /**
   * TVW-001 (c): every place this component is instantiated, from the same walk `meta` counts —
   * the rows behind the `×N` button. Grouped by parent in `usedIn.ts`.
   */
  instances?: UsageInstance[];
  path: string;
}

/**
 * Data structure for a folder item in the tree
 */
export interface FolderItemData {
  name: string;
  path: string;
  isOpen: boolean;
  isComponentFolder: boolean;
  component?: ComponentModel;
  children: TreeNode[];
  // Component type flags (only set when isComponentFolder is true)
  isRoot?: boolean;
  isPage?: boolean;
  isCloudFunction?: boolean;
  isVisual?: boolean;
  /** PNL-006, only meaningful when `isComponentFolder`. */
  kind?: ComponentKind;
  category?: string;
  warningCount?: number;
  /** TVW-001 (b), only when `isComponentFolder`. */
  meta?: RowMeta | null;
  /** TVW-001 (c): the rows behind `×N` — a component that is also a folder has them too. */
  instances?: UsageInstance[];
}

/**
 * TVW-001 (d) — a section by role (`Pages`, `Components`, `Logic`, `Cloud functions`), or, inside
 * `Pages` when there are two Routers, one Router's group. Never collapses, never selects, never a
 * drop target: it is a heading over rows, not a folder.
 */
export interface SectionItemData {
  /** `pages` … `cloud`, or `pages:<router>` for a Router's group. Unique in the tree. */
  id: string;
  section: SectionId;
  variant: 'section' | 'router';
  label: string;
  /** Component rows under it (a page two Routers list counts once). */
  count: number;
  /** Which runtime a create menu inside this section authors for (WFA-001). */
  runtimeType: 'browser' | 'cloud';
  /** Said instead of rows when the section has none — only the cloud section is drawn empty. */
  emptyText?: string;
  children: TreeNode[];
}

/**
 * Union type representing either a component or folder in the tree
 */
export type TreeNode =
  | { type: 'component'; data: ComponentItemData }
  | { type: 'folder'; data: FolderItemData }
  | { type: 'section'; data: SectionItemData };

/**
 * Props for ComponentsPanel component
 *
 * TVW-001 (e): `options` is gone with the sheets. It carried `showSheetList`, `hideSheets` and
 * `lockToSheet` — three ways to configure a control that no longer exists — and `router.setup.ts`
 * was its only caller.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ComponentsPanelProps {}

/**
 * WFA-001 — the one place the cloud boundary's identity is written down.
 *
 * `RuntimeType` is resolved from this same prefix (`utils/NodeGraph/index.ts`), so this is a
 * runtime boundary rather than an ordinary organisational folder. TVW-001 (e) retired the sheet UI
 * around it; the boundary itself is untouched, which is why the name still reads `SHEET`.
 *
 * 🔴 **No `displayName` here.** It used to carry one (`'Cloud Functions'`) alongside
 * `SECTION_LABEL.cloud` (`'Cloud functions'`) — two spellings of one user-visible name, already
 * drifted by a capital letter. The section label is the single copy; `folderDisplay.ts` is what
 * turns this folder into it.
 */
export const CLOUD_SHEET = {
  /** Folder name as it appears in a component path: `/#__cloud__/saveOrder`. */
  folderName: '#__cloud__',
  /** Path prefix, including the leading slash and trailing slash. */
  pathPrefix: '/#__cloud__/'
} as const;
