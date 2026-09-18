/**
 * TVW-004 — which of the panel's two tabs opens, and what they are called.
 *
 * One panel, two tabs, the Figma shape. The rule is §2's: **Layers when the canvas opens a page or
 * a placed visual component; Components otherwise** — because Layers answers *where is this on
 * screen*, and for a component nothing places, or one that draws nothing, that question has no
 * answer worth opening on.
 *
 * ⚠️ **A placed visual gets Layers even when it is placed on some other page.** Layers then shows
 * the screen the preview is on, with TVW-002's note over it saying where the thing you are editing
 * actually lives. That is the teaching, not a miss: the alternative — silently showing the
 * Components tree — is the editor declining to say which surface shows which thing, which is the
 * confusion this phase exists to end (proposal §2 row 11).
 *
 * Pure, so `tests-unit/tvw-004` grades the decision rather than a screenshot of it.
 *
 * @module noodl-editor/views/panels/ComponentsPanelNew/layersTab
 */

import type { ComponentKind } from './componentKind';
import type { TreeNode } from './types';

export type PanelTab = 'layers' | 'components';

/** The two tab labels, and the panel's own title — the one copy of each. */
export const TAB_LABEL: Record<PanelTab, string> = {
  layers: 'Layers',
  components: 'Components'
};

/** R-E: the rail entry and the panel are titled after the thing, not after one of its two views. */
export const PANEL_TITLE = 'Project';

export interface TabSubject {
  /** What the canvas's component is — `componentKind.ts`'s answer, not a guess. */
  kind: ComponentKind | undefined;
  /** Whether anything in the project places an instance of it. */
  isPlaced: boolean;
}

export function defaultTabFor(subject: TabSubject): PanelTab {
  switch (subject.kind) {
    // A page, and the home component, *are* screens: Layers is showing the thing you are editing.
    case 'page':
    case 'home':
      return 'layers';
    // A visual component is on a screen only if something places it. Unplaced, Layers would open
    // on a screen that has nothing to do with what the canvas is showing.
    case 'visual':
    case 'popup':
      return subject.isPlaced ? 'layers' : 'components';
    // Logic, cloud functions, empty and unclassifiable components: nothing to point at on a screen.
    default:
      return 'components';
  }
}

/** ⌘⇧L. Flipping is symmetric — there are two tabs and no third state. */
export function flipTab(tab: PanelTab): PanelTab {
  return tab === 'layers' ? 'components' : 'layers';
}

/**
 * What the canvas's component is, read off the rows the Components tab has **already** built.
 *
 * ⚠️ Deliberately not a second walk. `useComponentsPanel` computes every component's kind and its
 * placement count once per change, and asking the project again for the two fields this decision
 * needs would be a second answer that can disagree with the first — which is the failure
 * `componentKind.ts` and `componentUsage.ts` were each written to avoid.
 */
export function tabSubjectFor(nodes: readonly TreeNode[], componentName: string | undefined): TabSubject {
  if (!componentName) return { kind: undefined, isPlaced: false };

  let found: TabSubject | undefined;

  const visit = (list: readonly TreeNode[]) => {
    for (const node of list) {
      if (found) return;
      if (node.type === 'component' && node.data.name === componentName) {
        found = { kind: node.data.kind, isPlaced: isPlaced(node.data.meta, node.data.instances) };
        return;
      }
      if (node.type === 'folder') {
        if (node.data.isComponentFolder && node.data.component?.name === componentName) {
          found = { kind: node.data.kind, isPlaced: isPlaced(node.data.meta, node.data.instances) };
          return;
        }
        visit(node.data.children);
      }
      if (node.type === 'section') visit(node.data.children);
    }
  };

  visit(nodes);
  return found ?? { kind: undefined, isPlaced: false };
}

/**
 * ⚠️ The **instances**, not the meta's tone. A page's meta carries its route and the home
 * component's carries nothing at all, so a placement test written on `tone === 'count'` would read
 * every page as unplaced — true of the file, and not what this decision is asking.
 */
function isPlaced(meta: { tone: string } | null | undefined, instances: readonly unknown[] | undefined): boolean {
  if (instances && instances.length > 0) return true;
  return meta?.tone === 'count';
}
