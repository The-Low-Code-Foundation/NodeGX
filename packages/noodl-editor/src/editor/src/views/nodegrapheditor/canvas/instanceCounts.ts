/**
 * TVW-007 AC2 — the count on a node card and the `×N` on a panel row are ONE number.
 *
 * Not "the same rule applied twice": the same call. `buildUsageIndex` is TVW-001's single walk of
 * every graph, and this module is a cache in front of it for the one caller that cannot afford to
 * walk — the canvas painter, which runs per frame, per node.
 *
 * 🔴 **The cache is invalidated, never memoised on the components array.** `getComponents()`
 * returns the live array and `addComponent` pushes into it in place, so a memo keyed on it never
 * sees a change ([[componentUsage.ts]] carries the same warning for the same reason). The dirty
 * flag is set by events and the walk happens on the next read, so an edit costs one walk however
 * many frames it triggers.
 *
 * ⚠️ **What the panel and the card are allowed to disagree about.** `rowMetaFor` gives a routed
 * page its route, not its count, so a page that is *also* placed as an instance would show `/about`
 * on its row and `· 2×` on its card. Measured across 128 projects before this was written
 * (`scratchpad/routed-instance-census.js`): **0 instance nodes point at a routed page, and 0 point
 * at the home component.** The population where the two can disagree is empty, and if it ever
 * fills, the card is still right — a node saying how many of it there are is true whatever its
 * component's row chooses to say instead.
 *
 * @module noodl-editor/views/nodegrapheditor/canvas/instanceCounts
 */

import { ProjectModel } from '@noodl-models/projectmodel';

import { EventDispatcher } from '../../../../../shared/utils/EventDispatcher';
import { buildUsageIndex, type UsageIndex } from '../../panels/ComponentsPanelNew/componentUsage';

/**
 * The graph edits that change a count: an instance placed or deleted. Parameter edits cannot —
 * unlike the panel's row meta, which also reads Routers and page paths, this cache holds instance
 * counts and nothing else, so `Model.parametersChanged` is deliberately absent.
 */
const GRAPH_EVENTS = ['Model.nodeAdded', 'Model.nodeRemoved'];
const PROJECT_EVENTS = ['componentAdded', 'componentRemoved', 'componentRenamed'];

const EVENT_GROUP = {};

let index: UsageIndex | null = null;
let subscribed = false;

function invalidate() {
  index = null;
}

function subscribe() {
  if (subscribed) return;
  subscribed = true;

  EventDispatcher.instance.on(GRAPH_EVENTS, invalidate, EVENT_GROUP);
  // Project-level shape changes arrive on the ProjectModel itself, not the global dispatcher —
  // the same split the components panel subscribes across.
  for (const event of PROJECT_EVENTS) {
    ProjectModel.instance?.on(event, invalidate, EVENT_GROUP);
  }
}

/**
 * Drop the cache and every subscription.
 *
 * Called when a project closes: the next project's counts must not be answered out of the last
 * one's walk, and `ProjectModel.instance` is a different object by then, so the listeners above
 * are attached to a model nobody will ever emit on again.
 */
export function resetInstanceCounts() {
  index = null;
  if (subscribed) {
    EventDispatcher.instance.off(EVENT_GROUP);
    ProjectModel.instance?.off(EVENT_GROUP);
    subscribed = false;
  }
}

/**
 * How many instances of `componentName` the project holds, counting the node that asks.
 *
 * 0 when there is no project, no such component, or the name is not a component at all — every
 * one of which `eyebrowText` declines to draw rather than printing `· 0×`.
 */
export function instanceCountOf(componentName: string | undefined): number {
  if (!componentName) return 0;

  const project = ProjectModel.instance;
  if (!project) return 0;

  subscribe();

  if (index === null) {
    index = buildUsageIndex(project.getComponents());
  }

  return index.get(componentName)?.instances.length ?? 0;
}
