import { ProjectModel } from '@noodl-models/projectmodel';

/**
 * TVW-007 AC3 — an entry remembers the ROUTE it was reached by, not just where it landed.
 *
 * `via` is the `fullName` of the component whose canvas the person was on when they went
 * **through an instance** into this one (a double-click on an instance node, or the context
 * menu's *Open component*). It is `null` for every other route — the components panel, search,
 * a trail crumb, the tab bar — and the trail then reads as a folder path, exactly as it did
 * before this task.
 *
 * It lives HERE rather than beside the canvas's `activeComponent` because ⌘[ / ⌘] have to
 * rebuild the trail that was on screen *at that step*: a route is a property of the step, and a
 * single "how did I get to the current component" field would be wrong the moment you went back.
 */
export interface NavigationHistoryEntry {
  /** The component's `fullName` — what `getComponentWithName` resolves. */
  name: string;
  /** The parent component entered through, or `null` for every other route. */
  via: string | null;
  /**
   * TVW-007 AC1 — the **instance node** on `via`'s canvas that was entered through.
   *
   * `via` alone gets you back to the right canvas; it cannot get you back to the right *place* on
   * it. AC1 ends *"back on Home with the Hero node selected"*, and a parent component may hold
   * many instances of the same child — so the node is a separate fact from the component, and
   * `leafName(via)` can never recover it.
   *
   * 🔴 It lives on the ENTRY for the same reason `via` does: a route is a property of the step.
   * A single "which node did I come through" field beside `activeComponent` would be wrong the
   * moment you went back one step.
   *
   * `null` whenever `via` is null, and cleared with it when the parent is deleted.
   */
  viaNodeId: string | null;
}

export class NavigationHistory {
  owner: TSFixme;
  history: NavigationHistoryEntry[];
  index: number;
  canNavigateBack: boolean;
  canNavigateForward: boolean;

  constructor({ owner }) {
    this.owner = owner;
    this.reset();
  }

  reset() {
    this.history = [];
    this.index = -1;
    this.canNavigateBack = false;
    this.canNavigateForward = false;
  }

  //History can be incorrect when changing branch, this functions goes through and discards any incorrect entries
  discardInvalidEntries() {
    this.history = this.history.filter((entry) =>
      ProjectModel.instance.getComponentWithName(entry.name) ? true : false
    );

    /**
     * TVW-007 AC3 — a dead route, not a dead entry.
     *
     * §4 asked for entries *whose `via` component is deleted* to be dropped. Building it that way
     * and reading what it costs is what changed it: after deleting `Home`, the entry for `Hero`
     * still names a component that exists and is perfectly reachable — dropping it would make ⌘[
     * skip a valid destination because something ELSE was deleted. What is actually broken is the
     * route: the trail would draw a `Home` crumb wired to `switchToComponent(undefined)`, a crumb
     * that looks live and does nothing.
     *
     * So the `via` is cleared and the entry kept, and the trail falls back to the folder path —
     * which is what the trail shows for every other route anyway. The spec arms BOTH halves (the
     * entry survives AND its `via` is null), because asserting only the second would pass just as
     * happily if the entry had been thrown away.
     */
    for (const entry of this.history) {
      if (entry.via && !ProjectModel.instance.getComponentWithName(entry.via)) {
        entry.via = null;
        // TVW-007 AC1: the node id addresses a node on the canvas that has just gone. Left set, it
        // would be handed to `findNodeWithId` on whatever canvas the fallback trail leads to — a
        // lookup that either misses or, worse, hits an unrelated node with a recycled id.
        entry.viaNodeId = null;
      }
    }

    if (this.index >= this.history.length) {
      this.index = this.history.length - 1;
    }

    //remove components that appear more than once in a row. Can happen when a component is removed and the component before and after is the same.
    for (let i = this.history.length - 1; i > 0; i--) {
      if (this.history[i].name === this.history[i - 1].name) {
        this.history.splice(i, 1);
      }
    }

    this.canNavigateBack = this.index > 0;
    this.canNavigateForward = false;

    if (this.index > this.history.length - 1) {
      this.index = this.history.length - 1;
      this.goToCurrent();
    }
  }

  /**
   * @param via TVW-007 — the parent component's `fullName` when this component was entered
   *   through an instance on that parent's canvas. `null`/omitted for every other route.
   */
  push(component, via: string | null = null, viaNodeId: string | null = null) {
    if (this.history[this.index]?.name === component.name) return;

    this.history.length = this.index + 1; //clear the history after the index
    // TVW-007 AC1: the node is meaningless without the route, so it is stored only alongside one.
    this.history.push({ name: component.name, via, viaNodeId: via ? viaNodeId : null });
    this.index = this.history.length - 1;

    this.canNavigateBack = this.index > 0;
    this.canNavigateForward = false;
  }

  /**
   *
   * @returns Returns true when successfully went back; Otherwise, false.
   */
  public goBack(): boolean {
    if (this.index <= 0) {
      return false;
    }

    /**
     * TVW-007 AC1 — **RULED by Richard 2026-09-20: ⌘[ selects the node, exactly as the crumb does.**
     *
     * s25 built the crumb's selection and deliberately left ⌘[ without one, because §4 asks for
     * selection only on the trail press — so the two gestures landed in the same place and differed
     * in what was highlighted. Richard's call: *"make ⌘[ select it too"*, and the reason is the one
     * the question was asked on — the highlight says where you came from however you got back.
     *
     * 🔴 **The node is read off the entry being LEFT, not the one being entered.** `viaNodeId`
     * describes the route *into* an entry, so it names a node on the PREVIOUS entry's canvas — which
     * is precisely the canvas ⌘[ is about to land on. Reading the arriving entry instead (the
     * obvious one, since that is what `goToCurrent` resolves) would hand `findNodeWithId` an id
     * belonging to a component one step further back.
     */
    const leaving = this.history[this.index];
    this.index--;
    const arriving = this.history[this.index];

    /**
     * ⚠️ The route has to still name the destination. `via` and the index are two separate facts,
     * and `discardInvalidEntries` splices entries out from under both — so an entry whose `via`
     * names some component other than the one we are arriving at addresses a node on a canvas this
     * press is not opening, and `findNodeWithId` would either miss or hit a recycled id.
     */
    const selectNodeId = leaving?.via && leaving.via === arriving?.name ? leaving.viaNodeId : null;

    this.goToCurrent(selectNodeId);
    return true;
  }

  /**
   *
   * @returns Returns true when successfully went forward; Otherwise, false.
   */
  /**
   * ⚠️ TVW-007 AC1 — ⌘] selects nothing, and that is not an omission of the ruling above.
   *
   * There is no node for it to select. Forward moves INTO an entry, whose `viaNodeId` names a node
   * on the canvas being left, not the one being opened — and the entry before it describes a route
   * into *itself*. The asymmetry is in the data, not in the gesture: going back you step out of a
   * component and the instance you came through is on the canvas you land on; going forward you
   * step into one and there is nothing on that canvas that the route names.
   */
  public goForward(): boolean {
    if (this.index === this.history.length - 1) {
      return false;
    }

    this.index++;
    this.goToCurrent();
    return true;
  }

  /**
   * ⚠️ The removal is done by `discardInvalidEntries`, and always was.
   *
   * This used to `filter(componentName => componentName !== component)` first — a string compared
   * to a `ComponentModel`, so it never matched and never removed anything. The entry goes because
   * the component no longer resolves out of `ProjectModel`, one line below. Restating that here as
   * a name comparison would be a second copy of the same rule; the dead filter is simply gone.
   */
  onComponentRemoved(_component) {
    this.discardInvalidEntries();
  }

  /**
   * TVW-007 — the entry the trail is currently standing on, route included.
   *
   * `undefined` before anything has been pushed (a canvas with no history yet), which the trail
   * reads as "no route recorded" and draws the folder path.
   */
  public currentEntry(): NavigationHistoryEntry | undefined {
    return this.history[this.index];
  }

  /**
   *
   * @returns Returns true when successfully went to current component; Otherwise, false.
   */
  public goToCurrent(selectNodeId: string | null = null): boolean {
    const entry = this.history[this.index];
    if (!entry) return false;

    const component = ProjectModel.instance.getComponentWithName(entry.name);
    if (!component) return false;

    this.canNavigateBack = this.index > 0;
    this.canNavigateForward = this.index < this.history.length - 1;

    /**
     * TVW-007 AC1 — `{ node: { id } }` is the SAME argument the trail's instance crumb passes
     * (`NodeGraphComponentTrail.tsx:411`), so the ruled behaviour is one code path, not a second
     * copy of it: `switchToComponent` clears the selection, selects the node and centres the
     * canvas on it. Deliberately WITHOUT `pushHistory` — the crumb is a navigation and this is a
     * move through history that has already set `index` itself.
     *
     * ⚠️ `undefined` rather than `{ node: undefined }` when there is nothing to select, because
     * every other caller of `goToCurrent` (`discardInvalidEntries`, `goForward`) has always passed
     * no args at all and must keep behaving identically.
     */
    this.owner.switchToComponent(component, selectNodeId ? { node: { id: selectNodeId } } : undefined);
    return true;
  }
}
