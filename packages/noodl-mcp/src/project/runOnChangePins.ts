/**
 * P109 ISL-018 — the door states the run-on-value-change boxes of the nodes IT writes, in a project the editor will
 * still upgrade.
 *
 * A project below format 5 gets the editor's one-time clean-up on its next open (`applypatches.js`): every value input
 * of a node whose Run is wired, with no `runOnChange-<input>` key, is written `false` — the pre-checkbox behaviour,
 * the right repair for a graph authored before 2026-08-01. The door writes no such key (an absent key is a ticked box
 * to the runtime), so a node an agent adds to such a project was being unticked on that open: its values stopped
 * running it.
 *
 * Ruled 2026-10-05 (README §8 round 5, "Agent writes 'ticked'"): the door is the author of what it writes, so it says
 * what it means — `true` — on exactly those boxes, as the template generators do (DEF-007,
 * `pinRunOnValueChangeDefaults`). The clean-up never touches a key that is present, so these nodes keep running on
 * value change; every node the call did NOT write is left to the clean-up, which still repairs the genuinely old ones.
 *
 * "Written by this call" = new, or different from the copy on disk, or with a different set of wires into it (a Run
 * wire the agent just added makes the node signal-driven). The plan comes from the editor's own planner, run over the
 * whole component, so a Run wire from a node the call did not touch still counts.
 *
 * Key order: the pinned boxes go first in the parameter bag, as `writeGovernedCheckboxes` writes them (queued inputs
 * drain in key order).
 *
 * @module noodl-mcp/project/runOnChangePins
 */
import {
  planRunOnValueChangeMigration,
  projectPredatesRunOnValueChange
} from '@nodegx/project-contract/run-on-value-change-migration';

import type { ComponentFiles } from '../graph';

type Node = ComponentFiles['nodes']['nodes'][number];
type Connection = ComponentFiles['connections']['connections'][number];

/** Whether a project at `version` will still get the editor's one-time clean-up. */
export const projectWillBeCleanedUp = (version: unknown): boolean => projectPredatesRunOnValueChange(version);

const incomingOf = (connections: Connection[] | undefined, id: string): string =>
  JSON.stringify(
    (connections ?? [])
      .filter((c) => c.toId === id)
      .map((c) => `${c.fromId}.${c.fromProperty}>${c.toProperty}`)
      .sort()
  );

/**
 * One box the door ticked: the node, and the parameter it wrote `true` on (`runOnChange-in-books`). `component` is
 * set where one response covers several components (apply_plan).
 */
export interface TickedBox {
  component?: string;
  node: string;
  parameter: string;
}

/**
 * Pin `true` on every governed box the clean-up would write `false` on, for the nodes this write authors. Mutates
 * `files` in place and returns the boxes it wrote.
 */
export function pinAuthoredRunOnChange(key: string, files: ComponentFiles, onDisk: ComponentFiles | null): TickedBox[] {
  const nodes = files.nodes.nodes ?? [];
  const plan = planRunOnValueChangeMigration({
    components: [{ name: key, graph: { roots: nodes as never, connections: files.connections.connections as never } }]
  });
  if (plan.writes.length === 0) return [];

  const before = new Map<string, Node>();
  for (const n of onDisk?.nodes.nodes ?? []) before.set(n.id, n);
  const authored = (n: Node): boolean => {
    const old = before.get(n.id);
    if (!old) return true;
    if (JSON.stringify(old) !== JSON.stringify(n)) return true;
    return incomingOf(onDisk?.connections.connections, n.id) !== incomingOf(files.connections.connections, n.id);
  };

  const byNode = new Map<string, string[]>();
  for (const w of plan.writes) byNode.set(w.nodeId, [...(byNode.get(w.nodeId) ?? []), w.parameter]);

  const written: TickedBox[] = [];
  for (const node of nodes) {
    const parameters = byNode.get(node.id);
    if (!parameters || !authored(node)) continue;
    const existing = (node.parameters ?? {}) as Record<string, unknown>;
    const rebuilt: Record<string, unknown> = {};
    for (const p of parameters) rebuilt[p] = true;
    for (const name of Object.keys(existing)) if (!(name in rebuilt)) rebuilt[name] = existing[name];
    node.parameters = rebuilt as Node['parameters'];
    for (const p of parameters) written.push({ node: node.id, parameter: p });
  }
  return written;
}

/**
 * What a write response says when the door ticked boxes (ISL-018 §5, "Report it"): which, and why, so the agent can
 * see the door changed its graph and send `false` where it meant one. Nothing when it ticked none.
 */
export interface RunOnChangeTickedSummary {
  ticked?: { boxes: TickedBox[]; why: string };
}

export const TICKED_WHY =
  'This project was saved before the "run on value change" setting existed. The editor upgrades it the next time ' +
  'it opens. That upgrade unticks every unset box on a node whose Run is wired. The door wrote these boxes as ' +
  'ticked, which is what an unset box means today. Each node still runs when these values change. Send the ' +
  'parameter as false to switch one off.';

export function tickedPayload(boxes: readonly TickedBox[] | undefined): RunOnChangeTickedSummary {
  return boxes && boxes.length > 0 ? { ticked: { boxes: [...boxes], why: TICKED_WHY } } : {};
}
