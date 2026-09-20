import type { NavigationHistoryEntry } from './NavigationHistory';

/**
 * TVW-007 §2 — the trail's containment form, as a rule that can be read without an editor.
 *
 * When the current component was entered **through an instance**, the trail is not the folder
 * path it is stored under — it is the one place you actually came from:
 *
 * ```
 * entered from the Components panel:   Sections › Hero
 * entered through the Hero node:       [◆ Home] › Hero
 * ```
 *
 * The parent REPLACES the folder crumbs rather than being prepended to them (§2, AC1). A trail
 * reading `Home › Sections › Hero` would be three crumbs of two different kinds — one route, two
 * folders — and only the first is a place you have been.
 *
 * This module holds the decision and nothing else: `OverlayViews.updateTitle` calls it and turns
 * the answer into crumbs. Kept pure because the alternative is grading a trail shape through an
 * Electron renderer and a live `ProjectModel`, and every branch below is a reason to draw a
 * DIFFERENT trail — which is exactly what a spec has to be able to enumerate.
 */

export interface InstanceParentCrumb {
  /** The parent's leaf name — `Home` for `/Pages/Home`. What the crumb reads. */
  name: string;
  /** The parent's `fullName`, which is what `switchToComponent` is given. */
  fullName: string;
  /** The resolved `ComponentModel`; a crumb without one is inert, so this is never null here. */
  component: unknown;
  /**
   * TVW-007 AC1 — the instance node to select on arrival, or `null`.
   *
   * Carried through to `switchToComponent({ node })`, which looks it up with `findNodeWithId` on
   * the canvas it has just switched to. `null` is the pre-AC1 behaviour — land on the parent with
   * nothing selected — and is what an entry recorded before this field existed still produces.
   */
  viaNodeId: string | null;
}

/** `/Pages/Home` → `Home`. A name with no `/` is its own leaf. */
export function leafName(fullName: string): string {
  const parts = fullName.split('/');
  return parts[parts.length - 1] || fullName;
}

/**
 * The parent crumb to draw, or `null` to draw the ordinary folder path.
 *
 * @param currentFullName the canvas's `activeComponent.fullName`
 * @param entry the navigation history entry the canvas is standing on (`currentEntry()`)
 * @param resolve `ProjectModel.getComponentWithName`, passed in so this stays import-free
 */
export function instanceParentCrumb(
  currentFullName: string | undefined,
  entry: NavigationHistoryEntry | undefined,
  resolve: (fullName: string) => unknown
): InstanceParentCrumb | null {
  if (!currentFullName) return null;

  // No route recorded: the panel, search, a crumb, the tab bar, or a canvas with no history yet.
  if (!entry || !entry.via) return null;

  /**
   * 🔴 The entry has to be the one for the component ON SCREEN.
   *
   * `switchToComponent` runs for routes that push no history at all — a workflow canvas
   * (`canPushHistory` is false for it), and every caller passing `pushHistory: false`. The index
   * then still points at the component you were on BEFORE, and reading its `via` would draw that
   * component's parent as the crumb for a canvas it has nothing to do with. Checked by name
   * rather than trusted, because the failure is silent and looks plausible: a real component,
   * a live crumb, the wrong one.
   */
  if (entry.name !== currentFullName) return null;

  // A component cannot be its own parent; a route that says so is corrupt, not interesting.
  if (entry.via === currentFullName) return null;

  /**
   * The parent may have been deleted since. `NavigationHistory.discardInvalidEntries` clears a
   * dead `via` when it runs, but it runs on project events — not on every repaint — so the trail
   * does not get to assume it has. An unresolvable parent draws the folder path.
   */
  const component = resolve(entry.via);
  if (!component) return null;

  return { name: leafName(entry.via), fullName: entry.via, component, viaNodeId: entry.viaNodeId ?? null };
}

/**
 * A crumb as `updateTitle` builds it — structurally the React bar's `ComponentTrailItem`, declared
 * here rather than imported so this module stays free of React and reachable from a plain-Node
 * runner. `isFolderComponent` is carried for the bar's existing callers; nothing here reads it.
 */
export interface ComponentTrailCrumb {
  name: string;
  fullName: string;
  component?: unknown;
  isCurrent: boolean;
  isFolderComponent: boolean;
  /**
   * ⚠️ `string`, not the bar's `'Read only' | null`. This is a pass-through of
   * `NodeGraphEditor.stateText`, which is typed `string` — narrowing it here would make the ONE
   * call site a type error and tempt a cast at exactly the place the value is least understood.
   */
  stateText?: string | null;
  isInstanceCrumb?: boolean;
  /** TVW-007 AC1 — set only on the instance crumb; the node to select on the parent's canvas. */
  viaNodeId?: string | null;
}

/**
 * TVW-007 — every crumb after the (optional) workflow-descent one, for one canvas.
 *
 * 🔴 **This is here because the alternative was thirty lines only a drive could reach.** The rule
 * it holds is a CHOICE BETWEEN TWO TRAILS for the same component — the route or the folder path —
 * and a branch whose two arms are both plausible is exactly the kind a spec has to be able to
 * enumerate. Left inside `updateTitle` it would have needed a live `ProjectModel`, an Electron
 * renderer and a real navigation to grade, so in practice it would have been graded by looking at
 * it.
 *
 * @param nameParts the component's `fullName` split on `/` with the leading empty segment already
 *   shifted off — `['Sections', 'Hero']` for `/Sections/Hero`.
 * @param hasDescent WFA-006 owns the first crumb on a cloud function reached from a workflow step;
 *   the containment trail stands down rather than offering a second answer to the same question.
 */
export function buildComponentTrail({
  fullName,
  nameParts,
  entry,
  stateText,
  hasDescent,
  resolve
}: {
  fullName: string;
  nameParts: string[];
  entry: NavigationHistoryEntry | undefined;
  stateText?: string | null;
  hasDescent: boolean;
  resolve: (fullName: string) => unknown;
}): ComponentTrailCrumb[] {
  const parent = hasDescent ? null : instanceParentCrumb(fullName, entry, resolve);

  if (parent) {
    return [
      {
        name: parent.name,
        fullName: parent.fullName,
        component: parent.component,
        isCurrent: false,
        isFolderComponent: false,
        // What draws the diamond and the component-hue wash — see `NodeGraphComponentTrail`.
        isInstanceCrumb: true,
        // TVW-007 AC1 — the node this crumb selects on arrival.
        viaNodeId: parent.viaNodeId
      },
      {
        name: nameParts[nameParts.length - 1],
        fullName,
        stateText,
        component: resolve(fullName),
        isCurrent: true,
        isFolderComponent: false
      }
    ];
  }

  const crumbs: ComponentTrailCrumb[] = [];

  for (let i = 0; i < nameParts.length; i++) {
    let part = '';

    for (let j = 0; j <= i; j++) {
      part += '/' + nameParts[j];
    }

    crumbs.push({
      name: nameParts[i],
      fullName: part,
      stateText,
      // TODO: this returns undefined if the component is a folder,
      // but if a folder and a component has the same name the result
      // of this check will be wrong. i think this is a rare edge case though
      component: resolve(part),
      isCurrent: i === nameParts.length - 1,
      isFolderComponent: nameParts.length > 1 && !fullName.endsWith(part)
    });
  }

  return crumbs;
}
