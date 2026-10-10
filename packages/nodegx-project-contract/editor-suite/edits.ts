/**
 * P112 OWN-006 — the edit vocabulary an editor is graded on, and the reference way to apply it.
 *
 * Eight edits, closed, each one JSON. They are the *intent* of the MCP's `update_component` operations
 * (`packages/noodl-mcp/src/graph.ts`), not their wire format: a stranger's editor speaks these, and the
 * MCP is one more adapter graded against them. Every edit names the component it touches (registry
 * key, path form: `Pages/Home`), so one script can cross components.
 *
 * `applyEdit` is what the official writers would have done: the same parent/children bookkeeping,
 * the same subtree removal, the same refusal of a duplicate wire. It is the reference an editor's
 * own code path is compared with, so it is deliberately plain.
 */

import type { ComponentFiles } from '../format/store';
import type { ConnectionV2, NodeV2 } from '../format/types';

export interface WireEnd {
  node: string;
  port: string;
}

export type Edit =
  | {
      edit: 'add_node';
      component: string;
      /** The id the reference uses; an editor may mint its own and report it from `apply`. */
      id?: string;
      type: string;
      /** Parent node id for a visual child; absent for a root or a logic node. */
      parent?: string;
      /** Position among the parent's children; appended when absent. */
      index?: number;
      parameters?: Record<string, unknown>;
      label?: string;
      x?: number;
      y?: number;
    }
  | { edit: 'remove_node'; component: string; id: string }
  | { edit: 'connect'; component: string; from: WireEnd; to: WireEnd }
  | { edit: 'disconnect'; component: string; from: WireEnd; to: WireEnd }
  /** `value` absent or `undefined` unsets the parameter. */
  | { edit: 'set_parameter'; component: string; id: string; name: string; value?: unknown }
  | { edit: 'move'; component: string; id: string; x: number; y: number }
  | { edit: 'rename'; component: string; id: string; label: string }
  /** Makes `id` a child of `parent` (detaching it from its old parent first), at `index` or last. */
  | { edit: 'add_child'; component: string; id: string; parent: string; index?: number };

export type EditKind = Edit['edit'];
export const EDIT_KINDS: readonly EditKind[] = [
  'add_node',
  'remove_node',
  'connect',
  'disconnect',
  'set_parameter',
  'move',
  'rename',
  'add_child'
];

/** An edit the reference refuses, in one sentence. The suite reports it as the fixture's fault, not the editor's. */
export class EditRefusal extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EditRefusal';
  }
}

function sameWire(a: ConnectionV2, b: ConnectionV2): boolean {
  return (
    a.fromId === b.fromId && a.fromProperty === b.fromProperty && a.toId === b.toId && a.toProperty === b.toProperty
  );
}

export function wireOf(edit: { from: WireEnd; to: WireEnd }): ConnectionV2 {
  return { fromId: edit.from.node, fromProperty: edit.from.port, toId: edit.to.node, toProperty: edit.to.port };
}

export function wireLabel(c: ConnectionV2): string {
  return `${c.fromId}.${c.fromProperty} → ${c.toId}.${c.toProperty}`;
}

function attach(
  byId: Map<string, NodeV2>,
  child: NodeV2,
  parentId: string,
  index: number | undefined,
  what: string
): void {
  const parent = byId.get(parentId);
  if (!parent) throw new EditRefusal(`${what}: parent "${parentId}" does not exist.`);
  if (!parent.children) parent.children = [];
  if (!parent.children.includes(child.id)) {
    const at = index !== undefined ? Math.max(0, Math.min(index, parent.children.length)) : parent.children.length;
    parent.children.splice(at, 0, child.id);
  }
  child.parent = parentId;
}

/**
 * Applies one edit to a deep copy of a component's files. Returns the copy and, for `add_node`, the
 * id the node got (`edit.id`, or one from `mint`). Throws `EditRefusal` and changes nothing otherwise.
 */
export function applyEdit(
  files: ComponentFiles,
  edit: Edit,
  mint: () => string = () => `n-${Math.random().toString(36).slice(2, 10)}`
): { files: ComponentFiles; id?: string } {
  const out: ComponentFiles = JSON.parse(JSON.stringify(files));
  const nodes = out.nodes.nodes;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const must = (id: string, what: string): NodeV2 => {
    const n = byId.get(id);
    if (!n) throw new EditRefusal(`${what}: node "${id}" does not exist in ${edit.component}.`);
    return n;
  };

  switch (edit.edit) {
    case 'add_node': {
      const id = edit.id ?? mint();
      if (byId.has(id)) throw new EditRefusal(`add_node: node id "${id}" already exists in ${edit.component}.`);
      const node: NodeV2 = { id, type: edit.type };
      if (edit.label !== undefined) node.label = edit.label;
      if (edit.x !== undefined) node.x = edit.x;
      if (edit.y !== undefined) node.y = edit.y;
      if (edit.parameters) node.parameters = { ...edit.parameters };
      if (edit.parent !== undefined) attach(byId, node, edit.parent, edit.index, 'add_node');
      nodes.push(node);
      return { files: out, id };
    }
    case 'remove_node': {
      must(edit.id, 'remove_node');
      const doomed = new Set<string>([edit.id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const n of nodes) {
          if (n.parent !== undefined && doomed.has(n.parent) && !doomed.has(n.id)) {
            doomed.add(n.id);
            grew = true;
          }
        }
      }
      out.nodes.nodes = nodes.filter((n) => !doomed.has(n.id));
      for (const n of out.nodes.nodes) {
        if (n.children) {
          n.children = n.children.filter((c) => !doomed.has(c));
          if (n.children.length === 0) delete n.children;
        }
      }
      out.connections.connections = out.connections.connections.filter(
        (c) => !doomed.has(c.fromId) && !doomed.has(c.toId)
      );
      if (out.nodes.visualRoots) {
        out.nodes.visualRoots = out.nodes.visualRoots.filter((id) => !doomed.has(id));
        if (out.nodes.visualRoots.length === 0) delete out.nodes.visualRoots;
      }
      return { files: out };
    }
    case 'connect': {
      const c = wireOf(edit);
      must(c.fromId, 'connect');
      must(c.toId, 'connect');
      if (out.connections.connections.some((x) => sameWire(x, c))) {
        throw new EditRefusal(`connect: the wire ${wireLabel(c)} already exists in ${edit.component}.`);
      }
      out.connections.connections.push(c);
      return { files: out };
    }
    case 'disconnect': {
      const c = wireOf(edit);
      const before = out.connections.connections.length;
      out.connections.connections = out.connections.connections.filter((x) => !sameWire(x, c));
      if (out.connections.connections.length === before) {
        throw new EditRefusal(`disconnect: no wire ${wireLabel(c)} in ${edit.component}.`);
      }
      return { files: out };
    }
    case 'set_parameter': {
      const node = must(edit.id, 'set_parameter');
      if (edit.value === undefined) {
        if (node.parameters) delete node.parameters[edit.name];
      } else {
        node.parameters = { ...(node.parameters ?? {}), [edit.name]: edit.value };
      }
      return { files: out };
    }
    case 'move': {
      const node = must(edit.id, 'move');
      node.x = edit.x;
      node.y = edit.y;
      return { files: out };
    }
    case 'rename': {
      const node = must(edit.id, 'rename');
      node.label = edit.label;
      return { files: out };
    }
    case 'add_child': {
      const node = must(edit.id, 'add_child');
      must(edit.parent, 'add_child');
      if (edit.parent === edit.id) throw new EditRefusal(`add_child: "${edit.id}" cannot be its own parent.`);
      // No cycles: the new parent must not be inside the node's own subtree.
      for (let cur = byId.get(edit.parent); cur; cur = cur.parent !== undefined ? byId.get(cur.parent) : undefined) {
        if (cur.id === edit.id)
          throw new EditRefusal(`add_child: "${edit.parent}" is inside "${edit.id}"'s own subtree.`);
      }
      if (node.parent !== undefined) {
        const old = byId.get(node.parent);
        if (old?.children) {
          old.children = old.children.filter((c) => c !== node.id);
          if (old.children.length === 0) delete old.children;
        }
      }
      attach(byId, node, edit.parent, edit.index, 'add_child');
      return { files: out };
    }
    default: {
      const never: never = edit;
      throw new EditRefusal(`unknown edit ${JSON.stringify(never)}`);
    }
  }
}
