/**
 * P125 CCN-005 — how much an agent may build out of the person's sight while Studio is on screen.
 *
 * Studio redraws on every file written, but a component shows only once a page (or a component a page places) has an
 * instance of it. Built leaves-first, a site is invisible until its last write. `create_plan` caps one plan at
 * `STUDIO_BURST` components (planTools.ts); `unplacedAfter` is the same cap for `create_component` called one at a
 * time, which a plan's refusal would otherwise push the agent towards.
 */

import type { ComponentFiles } from '../graph';
import type { ProjectStore } from '../project/ProjectStore';

/**
 * P125-PUPPY-ONEAPPLY (CCN-005) — the most component operations one plan may hold while Studio is on screen for the
 * project. Richard's puppy run, 2026-10-23: a plan of eight components staged for three minutes and applied in one
 * second; the person watched an empty Studio and had nothing to stop. Three is a section with its leaves and the page
 * update that places it (StepItem, HowItWorks, Pages/Home), the largest burst that page needed.
 */
export const STUDIO_BURST = 3;

/**
 * Which of `created` (components this server created, by legacy name) no component of the project places, once
 * `candidate` is written as `legacyName`. A component is placed when any other component's graph has a node whose
 * type is its legacy name; the candidate's own instances count, so a section that places two fresh leaves leaves one
 * unplaced (itself), not three.
 */
export function unplacedAfter(store: ProjectStore, created: Iterable<string>, legacyName: string, candidate: ComponentFiles): string[] {
  const placed = new Set<string>();
  const exists = new Set<string>([legacyName]);
  const scan = (owner: string, files: ComponentFiles) => {
    for (const n of files.nodes.nodes ?? []) if (n.type !== owner) placed.add(n.type);
  };
  for (const row of store.listComponents()) {
    if (row.legacyName === legacyName) continue;
    exists.add(row.legacyName);
    try {
      scan(row.legacyName, store.readComponent(row.legacyName).files);
    } catch {
      /* an unreadable component places nothing; validation reports it elsewhere */
    }
  }
  scan(legacyName, candidate);
  // A created component since deleted is not on screen to place: only the ones still in the project count.
  return [...new Set([...created, legacyName])].filter((name) => exists.has(name) && !placed.has(name));
}
