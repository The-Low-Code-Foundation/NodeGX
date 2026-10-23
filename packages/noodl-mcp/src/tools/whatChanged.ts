/**
 * P125 CCN-002 — `what_changed_since`: what the person changed in Studio since this agent last read each component.
 *
 * The hold (`hold.ts`) stops the agent; the store's drift rule refuses a write over a file somebody else changed. Both
 * say "something changed" and neither says what. This is the read that follows: for every component this server has
 * read or written, the nodes added, removed and edited and the wires added and removed, said in the graph's own words
 * (a node by its label or type, a port by name), so the agent can tell the person what it saw before carrying on.
 *
 * It takes no snapshot (`ProjectStore.changesSinceSeen`): reading this is not reading the component. 🔴 Measured while
 * building it: `update_component` re-reads the component before it applies its operations, so a write after the
 * person's edit lands ON their edit (their nodes kept, the same setting overwritten) and is refused only when the
 * agent passes `if_revision` from a read before the edit. The note says so rather than promising a refusal.
 *
 * @module tools/whatChanged
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { ComponentFiles } from '../graph';
import type { ProjectBinding } from '../project/ProjectBinding';
import type { SeenChange } from '../project/ProjectStore';
import { guarded, jsonResult } from './util';

type NodeLike = { id: string; type: string; label?: string; x?: number; y?: number; [k: string]: unknown };
type WireLike = { fromId: string; fromProperty: string; toId: string; toProperty: string };

/** A value as a short string: enough to tell the person what it became, never a whole graph. */
const VALUE_CHARS = 80;
function short(value: unknown): string {
  const text = value === undefined ? '(unset)' : typeof value === 'string' ? JSON.stringify(value) : JSON.stringify(value) ?? String(value);
  return text.length > VALUE_CHARS ? `${text.slice(0, VALUE_CHARS - 1)}…` : text;
}

function nameOf(node: NodeLike | undefined, id: string): string {
  if (!node) return id;
  return node.label ? `${node.label} (${node.type})` : node.type;
}

function nodesOf(files: ComponentFiles): Map<string, NodeLike> {
  return new Map(((files.nodes as { nodes?: NodeLike[] }).nodes ?? []).map((n) => [n.id, n]));
}

function wiresOf(files: ComponentFiles): WireLike[] {
  return (files.connections as { connections?: WireLike[] }).connections ?? [];
}

const wireKey = (w: WireLike) => `${w.fromId}\u0000${w.fromProperty}\u0000${w.toId}\u0000${w.toProperty}`;

/** The fields of a node a person edits by hand, compared one by one; anything else is reported as "other". */
const PARAMETER_BAGS = ['parameters', 'stateParameters'] as const;

export interface NodeEdit {
  node: string;
  id: string;
  /** `parameters.text: "Hi" → "Hello"`, one line per setting that differs. */
  settings: string[];
  moved?: true;
  other?: string[];
}

export interface ComponentChange {
  component: string;
  /** Who wrote the component last, as the writer stamps it: `nodegx-studio` is the person in Studio. */
  lastWrittenBy?: string;
  nodesAdded: string[];
  nodesRemoved: string[];
  nodesEdited: NodeEdit[];
  wiresAdded: string[];
  wiresRemoved: string[];
  /** Fields of component.json that differ (`modified` aside), e.g. its description. */
  componentFields?: string[];
  lastReadAt: string;
}

/** The difference between what this server last saw and what is on disk now, in the graph's own words. */
export function describeChange(change: SeenChange): ComponentChange {
  const before = nodesOf(change.before.files);
  const now = nodesOf(change.now);
  const nodesAdded: string[] = [];
  const nodesRemoved: string[] = [];
  const nodesEdited: NodeEdit[] = [];

  for (const [id, node] of now) if (!before.has(id)) nodesAdded.push(`${nameOf(node, id)} [${id}]`);
  for (const [id, node] of before) if (!now.has(id)) nodesRemoved.push(`${nameOf(node, id)} [${id}]`);
  for (const [id, after] of now) {
    const was = before.get(id);
    if (!was || JSON.stringify(was) === JSON.stringify(after)) continue;
    const edit: NodeEdit = { node: nameOf(after, id), id, settings: [] };
    for (const bag of PARAMETER_BAGS) {
      const a = (was[bag] ?? {}) as Record<string, unknown>;
      const b = (after[bag] ?? {}) as Record<string, unknown>;
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) edit.settings.push(`${bag}.${k}: ${short(a[k])} → ${short(b[k])}`);
      }
    }
    if (was.x !== after.x || was.y !== after.y) edit.moved = true;
    const other = [...new Set([...Object.keys(was), ...Object.keys(after)])].filter(
      (k) => !(PARAMETER_BAGS as readonly string[]).includes(k) && k !== 'x' && k !== 'y' && JSON.stringify(was[k]) !== JSON.stringify(after[k])
    );
    if (other.length > 0) edit.other = other;
    nodesEdited.push(edit);
  }

  const wireName = (w: WireLike, nodes: Map<string, NodeLike>) =>
    `${nameOf(nodes.get(w.fromId), w.fromId)}.${w.fromProperty} → ${nameOf(nodes.get(w.toId), w.toId)}.${w.toProperty}`;
  const beforeWires = new Map(wiresOf(change.before.files).map((w) => [wireKey(w), w]));
  const nowWires = new Map(wiresOf(change.now).map((w) => [wireKey(w), w]));
  const wiresAdded = [...nowWires].filter(([k]) => !beforeWires.has(k)).map(([, w]) => wireName(w, now));
  const wiresRemoved = [...beforeWires].filter(([k]) => !nowWires.has(k)).map(([, w]) => wireName(w, before));

  const cBefore = change.before.files.component as unknown as Record<string, unknown>;
  const cNow = change.now.component as unknown as Record<string, unknown>;
  const componentFields = [...new Set([...Object.keys(cBefore), ...Object.keys(cNow)])].filter(
    (k) => k !== 'modified' && k !== 'modifiedBy' && JSON.stringify(cBefore[k]) !== JSON.stringify(cNow[k])
  );

  return {
    component: change.key,
    ...(typeof cNow.modifiedBy === 'string' ? { lastWrittenBy: cNow.modifiedBy } : {}),
    nodesAdded,
    nodesRemoved,
    nodesEdited,
    wiresAdded,
    wiresRemoved,
    ...(componentFields.length > 0 ? { componentFields } : {}),
    lastReadAt: change.before.at
  };
}

export function registerWhatChangedTools(server: McpServer, binding: ProjectBinding): void {
  server.registerTool(
    'what_changed_since',
    {
      title: 'What did the person change?',
      description:
        'What changed in the project since you last read each component: nodes added, removed and edited, ' +
        'wires added and removed. Call it after a hold is released or a write is refused as changed on disk.',
      inputSchema: {}
    },
    guarded(() => {
      const store = binding.require();
      const { changed, deleted, added, unchanged } = store.changesSinceSeen();
      const components = changed.map(describeChange);
      const nothing = components.length === 0 && deleted.length === 0 && added.length === 0;
      return jsonResult({
        changed: components,
        deleted,
        added,
        unchanged,
        note: nothing
          ? unchanged === 0
            ? 'You have not read any component yet, so there is nothing to compare: get_component reads one.'
            : `None of the ${unchanged} components you have read changed on disk since you read them.`
          : 'Tell the person, in a sentence, what you see they changed, and build on it rather than undoing it. ' +
            'Re-read a component with get_component before you change it, and pass its revision as if_revision: ' +
            'then a write is refused if they change it again meanwhile.' +
            (added.length > 0 ? ' `added` are components that appeared since this server opened the project.' : '')
      });
    })
  );
}
