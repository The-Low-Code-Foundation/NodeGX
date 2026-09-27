// PNL-008: `NodeGraphContextTmp` was imported for `hidePanels`'s frontend/backend
// branch alone. With the dead `cloud-functions` branch gone the import goes too,
// which also takes out a circular edge between the sidebar model and the node
// graph context.
import React from 'react';

import { NodeGraphNode } from '@noodl-models/nodegraphmodel';
import { EditorSettings } from '@noodl-utils/editorsettings';
import { Model } from '@noodl-utils/model';

import { IconName } from '@noodl-core-ui/components/common/Icon';

export interface SidebarItem<TProps = Record<string, unknown>> {
  id: string;
  name: string;
  description?: string;
  fineType?: string;
  icon?: IconName;
  order?: number;

  /**
   * Lasting only for a short time.
   * The panel will be re-created every time.
   *
   * Default: false
   */
  transient?: boolean;

  /**
   * CHR-008 §3.4: the panel stays mounted when the selection moves to another node, and receives
   * the new node as a prop instead of being built again.
   *
   * Every other panel is remounted per creation, exactly as before — they were written for that
   * (state read once from `model`, subscriptions with `[]` deps), and nothing measured asks them to
   * change.
   *
   * Default: false
   */
  followsSelection?: boolean;

  placement?: 'top' | 'bottom';

  /**
   * PNL-003: the width this panel opens at the first time, in pixels, **not**
   * counting the 52px icon rail. After that the width the user set is
   * remembered per panel, per project. Omit for the 328px default.
   *
   * It lives here rather than in a table in `EditorPage` so that the number sits
   * next to the panel that has to live with it.
   */
  defaultWidth?: number;

  isDisabled?: boolean /** Default: false */;

  /** Default: false */
  experimental?: boolean;

  onOpen?: () => void;
  onClose?: () => void;
  onClick?: () => void;

  panelProps?: TProps;
  panel: React.ComponentType<TProps>;
}

/**
 * Returns the sidepanel we want to show for this node.
 *
 * @param node Node instance?
 * @returns The side panel name.
 */
function getNodePanelName(nodeModel: NodeGraphNode): { id: string; args?: TSFixme } {
  if (!nodeModel.type.panels) return { id: 'PropertyEditor' };
  if (nodeModel.type.panels === 'none') return { id: 'none' };

  const registeredPanels = SidebarModel.instance.getItems();
  const valids = nodeModel.type.panels.filter((x) => registeredPanels.find((b) => b.id == x.name));
  if (valids.length > 0) {
    return {
      id: valids[0].name,
      args: valids[0]
    };
  }

  return { id: 'PropertyEditor' };
}

let panelCreations = 0;

/**
 * The element factory for a panel.
 *
 * 🔴 CHR-008 §3.4: the factory is CALLED to make the element (`SidePanel` does `factory()`), so the
 * element's type is the registered `item.panel` — one function for the life of the editor. It used
 * to be handed to `React.createElement` as the component type itself, and since this arrow is new
 * on every selection React saw a new type and threw the whole panel away on every click: measured
 * on 0.2.4, a Group reselect painted a blank panel from 47 ms and the rows at scroll 0 until 115 ms.
 *
 * Identity is now the `key`: stable for a `followsSelection` panel, and new per creation for every
 * other panel — which is the remount they had before, kept on purpose.
 */
function createPanel(type: string, args: { [key: string]: unknown }): () => React.ReactElement {
  const items = SidebarModel.instance.getItems();

  const item = items.find((x) => x.id === type);
  if (!item) {
    throw new Error(`Panel not found. (${type})`);
  }

  const key = item.followsSelection ? item.id : `${item.id}#${++panelCreations}`;
  return () => React.createElement(item.panel, { key, ...args, ...(item.panelProps || {}) });
}

const getExperimentalSettingsKey = (item: SidebarItem) => `experimental.panel.${item.id}`;

/**
 * Where the rail goes when whatever was showing stops being available — a node is deselected
 * (`hidePanels`) or the active panel is removed outright ({@link SidebarModel.unregister}).
 *
 * PNL-008 established the value: `components` is registered for the frontend and the backend
 * graph both, which is what the retired `cloud-functions` branch was not.
 */
const FALLBACK_PANEL_ID = 'components';

export enum SidebarModelEvent {
  /** Occurs when a new panel is added. */
  itemsChanged = 'itemsChanged',
  /** Occurs when a panel is selected. */
  activeChanged = 'activeChanged',
  /**
   * INS-001 — the inspector on the right now shows a different node panel, or none.
   * Raised by node selection and deselection, which no longer raise `activeChanged`.
   */
  inspectorChanged = 'inspectorChanged',
  nodeSelected = 'nodeSelected',
  receivedCommand = 'receivedCommand',
  HotReload = 'HotReload'
}

export type SidebarModelEventEvents = {
  [SidebarModelEvent.itemsChanged]: () => void;
  [SidebarModelEvent.activeChanged]: (panelId: string, previousActiveId: string) => void;
  [SidebarModelEvent.inspectorChanged]: (panelId: string | undefined) => void;
  [SidebarModelEvent.nodeSelected]: (nodeId: string) => void;
  [SidebarModelEvent.receivedCommand]: (panelId: string, command: string, args: unknown[] | any) => void;
  [SidebarModelEvent.HotReload]: () => void;
};

/**
 * The Sidebar Model.
 *
 * ## Nodes
 * Nodes can have custom panels when selected.
 *
 * Before telling a node to use a specific panel we have to register it with
 * SidebarModel. Which is done by calling register.
 *
 * To add a custom panel to a node, you have to add it to the **node definition**.
 * ```js
 *  {
 *    ...
 *    panels: [
 *      {
 *        name: "PortEditor",
 *      }
 *    ],
 *    ...
 *  }
 * ```
 *
 */
export class SidebarModel extends Model<SidebarModelEvent, SidebarModelEventEvents> {
  public static instance = new SidebarModel();

  /** The panel in the left slot — the one the rail's icons choose. */
  private activeId: string;

  /**
   * INS-001 — the node panel in the inspector on the right, or `undefined` when nothing is selected.
   *
   * 🔴 **This used to be the same slot as `activeId`.** `switchToNode` wrote the node's panel into
   * the one active slot and stashed what had been there in `previousActiveId`; `hidePanels` switched
   * back. That is the takeover Richard named on drive A (2026-09-23): *"I'm doing styles or backend
   * stuff in the left panel, click a node and the props take over from what I was doing."* The
   * left rail answers "what is in this app"; a node's panel answers "what is this one thing" — two
   * axes, so two slots. Nothing about selection touches `activeId` any more.
   */
  private inspectorId: string | undefined;

  private items: SidebarItem[] = [];
  private experimentalItems: SidebarItem[] = [];

  private panels: {
    [key: string]: () => React.ReactElement;
  } = {};

  private groupRef = {};

  public get ActiveId(): string {
    return this.activeId;
  }

  /** INS-001 — the node panel the inspector shows, or `undefined` for "No node selected". */
  public get InspectorId(): string | undefined {
    return this.inspectorId;
  }

  constructor() {
    super();

    EditorSettings.instance.on(
      'updated',
      ({ key }: { key: string }) => {
        // Check if the key is an experimental panel
        const experimentalKeys = this.experimentalItems.map(getExperimentalSettingsKey);
        if (!experimentalKeys.includes(key)) {
          return;
        }

        const enabled = EditorSettings.instance.get(key);
        const id = key.split('.').at(-1);

        if (enabled) {
          const experimentalItem = this.experimentalItems.find((x) => x.id === id);

          // Check if item exists
          if (!experimentalItem) {
            return;
          }

          // Already enabled
          if (this.items.some((x) => x.id === id)) {
            return;
          }

          // Enable the item
          this.items.push(experimentalItem);
          this.notifyListeners(SidebarModelEvent.itemsChanged);
        } else {
          const index = this.items.findIndex((x) => x.id === id);
          if (index >= 0) {
            this.items.splice(index, 1);
            this.notifyListeners(SidebarModelEvent.itemsChanged);
          }
        }
      },
      this.groupRef
    );
  }

  public reset() {
    this.activeId = undefined;
    this.inspectorId = undefined;

    this.items = [];
    this.experimentalItems = [];
    this.panels = {};
  }

  // TODO: Rename to getActive()
  public getCurrent(): SidebarItem {
    return this.items.find((x) => x.id === this.activeId) || this.items[0];
  }

  public getPanel(panelId: string) {
    return this.items.find((x) => x.id === panelId) || null;
  }

  public getPanelComponent(panelId: string): () => React.ReactElement {
    if (panelId) {
      return this.panels[panelId];
    }
    return null;
  }

  public getActive(): () => React.ReactElement | null {
    if (this.activeId) {
      return this.panels[this.activeId];
    }
    return null;
  }

  /** INS-001 — the factory for the node panel the inspector draws, or `null` when it is empty. */
  public getInspector(): (() => React.ReactElement) | null {
    if (this.inspectorId) {
      return this.panels[this.inspectorId] ?? null;
    }
    return null;
  }

  public getItems(): readonly SidebarItem[] {
    return this.items.sort((a, b) => a.order - b.order);
  }

  public getVisibleItems(): readonly SidebarItem[] {
    return this.getItems().filter((x) => !x.transient);
  }

  public getExperimentalItems() {
    return this.experimentalItems
      .filter((x) => !x.transient)
      .map((x) => ({
        id: x.id,
        settingsKey: getExperimentalSettingsKey(x),
        name: x.name,
        description: x.description,
        enabled: !!EditorSettings.instance.get(getExperimentalSettingsKey(x))
      }));
  }

  public register<TProps extends Record<string, unknown>>(item: SidebarItem<TProps>): void {
    // Set default placement
    if (!item.placement) {
      item.placement = 'top';
    }

    if (item.experimental) {
      this.experimentalItems.push(item);

      if (EditorSettings.instance.get(getExperimentalSettingsKey(item))) {
        this.items.push(item);
        this.notifyListeners(SidebarModelEvent.itemsChanged);
      }
    } else {
      this.items.push(item);
      this.notifyListeners(SidebarModelEvent.itemsChanged);
    }
  }

  /**
   * NAT-012 AC7 — take a panel back off the rail, and take the SURFACE with it.
   *
   * 🔴 **THE OBVIOUS REMOVAL HAS A HOLE SHAPED LIKE THE DEFECT, AND IT WAS MEASURED BEFORE THIS
   * WAS WRITTEN.** The experimental-panel branch in the constructor already removes an item the
   * only way that looked necessary — splice `items`, notify `itemsChanged`. Run exactly that
   * against a live, *active* Community panel and the rail icon does disappear, while
   * `activeId` stays `'community'`, `panels['community']` stays registered, and **the panel
   * itself keeps drawing**. That is the inverse of what D15 asks for: a refused viewer handed
   * the surface with no icon on it.
   *
   * So removal is three things, not one:
   *
   *  1. splice `items` — the rail entry, which is all the old path did;
   *  2. `delete panels[id]` — the CONSTRUCTED panel. {@link getActive} reads `panels`, not
   *     `items`, so a surviving entry here is a surface with no way to close it;
   *  3. when the removed panel is the active one, **switch away** — to `components`, for
   *     PNL-008's reason (it is registered for both graphs, and it is what `hidePanels`
   *     already falls back to).
   *
   * ⚠️ The inspector is emptied too when it is showing the removed panel — the same hole,
   * reached by a different door. (Before INS-001 that door was `previousActiveId`, which
   * `hidePanels()` switched *back* to on the next deselect.)
   *
   * ⚠️ `activeId` is cleared **before** the fallback switch rather than after, so that
   * {@link switch}'s `activeId === id` early return cannot leave the model pointing at a panel
   * that no longer exists, and so that a fallback which itself fails to build leaves *nothing*
   * active rather than the thing we just removed.
   *
   * Idempotent: unregistering an id that was never registered does nothing and notifies nobody.
   *
   * @param id The panel id.
   */
  public unregister(id: string): void {
    const index = this.items.findIndex((x) => x.id === id);
    const experimentalIndex = this.experimentalItems.findIndex((x) => x.id === id);
    if (index < 0 && experimentalIndex < 0) {
      return;
    }

    if (index >= 0) {
      this.items.splice(index, 1);
    }

    // ⚠️ The experimental list as well, when the panel is on it. Leaving the descriptor there
    // means a later settings toggle re-`push`es it into `items` — a resurrection nothing would
    // have checked the viewer for.
    if (experimentalIndex >= 0) {
      this.experimentalItems.splice(experimentalIndex, 1);
    }

    delete this.panels[id];

    if (this.inspectorId === id) {
      this.inspectorId = undefined;
      this.notifyListeners(SidebarModelEvent.inspectorChanged, undefined);
    }

    const wasActive = this.activeId === id;
    if (wasActive) {
      this.activeId = undefined;
    }

    this.notifyListeners(SidebarModelEvent.itemsChanged);

    if (wasActive) {
      this.switch(FALLBACK_PANEL_ID);
    }
  }

  /**
   *
   * @param id The panel id.
   * @returns
   */
  public switch(id: string): boolean {
    if (this.activeId === id) {
      return true;
    }

    // Debug info
    // let logText = `switch side panel to: '${id}'`;
    // if (this.activeId) logText += ` (from: ${this.activeId})`;
    // console.log(logText);
    try {
      if (this.panels[id]) {
        const lastActiveTab = this.items.find((x) => x.id === this.activeId);
        if (lastActiveTab) {
          lastActiveTab.onClose && lastActiveTab.onClose();
        }

        const previousActiveId = this.activeId;
        this.activeId = id;
        this.notifyListeners(SidebarModelEvent.activeChanged, this.activeId, previousActiveId);

        const newActiveTab = this.items.find((x) => x.id === this.activeId);
        if (newActiveTab) {
          newActiveTab.onOpen && newActiveTab.onOpen();
        }

        return true;
      }

      // Create the panel
      this.setActivePanel(id, false, createPanel(id, {}));
      return true;
    } catch (error) {
      // This is most likely caused by missing panel or some error creating
      // the panel. Lets try to select the first visible item, so the user
      // will have some panel.
      const visibleItems = this.getVisibleItems().filter((item) => item.panel);
      if (visibleItems.length > 0 && visibleItems[0].id === id) {
        this.switch(visibleItems[0].id);
        return;
      }

      // In case it fails we still continue since this can be
      // user created code too.
      console.error(error);
      return false;
    }
  }

  /**
   * Show a node's panel in the inspector.
   *
   * INS-001 — the panel is built exactly as before (`getNodePanelName` still lets a node type name
   * its own panel, so the inspector hosts node panels as a category, not just Properties), and it
   * goes into the inspector slot. **The left slot is not touched**: no `activeId` change, no
   * `onClose`/`onOpen` on the left panel, no `activeChanged`.
   *
   * A node type that says `panels: 'none'` empties the inspector. It used to reach `createPanel`
   * with the id `'none'` and throw `Panel not found`.
   */
  public switchToNode(nodeModel: NodeGraphNode) {
    const { id, args } = getNodePanelName(nodeModel);

    if (id === 'none') {
      this.setInspector(undefined);
      this.notifyListeners(SidebarModelEvent.nodeSelected, nodeModel.id);
      return;
    }

    // Built afresh per selection, exactly as `setActivePanel(id, true, …)` did. For a
    // `followsSelection` panel the element keeps its `key`, so React keeps the component (CHR-008).
    this.panels[id] = createPanel(id, {
      model: nodeModel,
      ...args
    });

    // Always raised, even when the id is unchanged: the panel the inspector draws is a new element
    // for a new node, and the inspector re-reads it on this event.
    this.inspectorId = id;
    this.notifyListeners(SidebarModelEvent.inspectorChanged, id);
    this.notifyListeners(SidebarModelEvent.nodeSelected, nodeModel.id);
  }

  /**
   * P103 CMG-006 — put a registered (transient) panel in the inspector with these props, the way
   * `switchToNode` puts a node's panel there. The Look editor opens this way from the Styles
   * panel: there is no node to select, and the inspector is where a Look's fields are edited
   * whether or not anything wears it. The next node selection replaces it, `hidePanels` clears it.
   */
  public showInInspector(id: string, args: Record<string, unknown>) {
    this.panels[id] = createPanel(id, args);
    this.inspectorId = id;
    this.notifyListeners(SidebarModelEvent.inspectorChanged, id);
  }

  /**
   * Used by "doubleClick"
   *
   * @param command
   */
  public invokeActive(command: string, args?: unknown) {
    this.notifyListeners(SidebarModelEvent.receivedCommand, this.activeId, command, args);
  }

  /**
   * INS-001 — send a command to the node panel in the inspector.
   *
   * The canvas's double-click used `invokeActive`, which addressed `activeId` — correct only while
   * the node's panel *was* the active one. It lives in the inspector now, so a double-click sent to
   * `activeId` would reach Styles or Components and nobody would answer.
   */
  public invokeInspector(command: string, args?: unknown) {
    if (!this.inspectorId) return;
    this.notifyListeners(SidebarModelEvent.receivedCommand, this.inspectorId, command, args);
  }

  /**
   * Empty the inspector — nothing is selected.
   *
   * INS-001 — this used to switch the LEFT slot back to `previousActiveId` (or fall back to
   * `components`), because the node's panel had taken the left slot over. It never takes it over
   * now, so there is nothing on the left to restore. PNL-008's fallback stays in
   * {@link unregister}, where it still means something.
   */
  public hidePanels() {
    this.setInspector(undefined);
  }

  private setInspector(id: string | undefined) {
    if (this.inspectorId === id) return;
    this.inspectorId = id;
    this.notifyListeners(SidebarModelEvent.inspectorChanged, id);
  }

  private setActivePanel(id: string, force: boolean, component: () => React.ReactElement): void {
    const lastActiveTab = this.items.find((x) => x.id === this.activeId);
    if (lastActiveTab) {
      lastActiveTab.onClose && lastActiveTab.onClose();
    }

    const previousActiveId = this.activeId;
    this.activeId = id;

    if (force || !this.panels[id]) {
      if (this.panels[id]) {
        delete this.panels[id];
      }

      this.panels[id] = component;
    }

    this.notifyListeners(SidebarModelEvent.activeChanged, this.activeId, previousActiveId);

    const newActiveTab = this.items.find((x) => x.id === this.activeId);
    if (newActiveTab) {
      newActiveTab.onOpen && newActiveTab.onOpen();
    }
  }
}
