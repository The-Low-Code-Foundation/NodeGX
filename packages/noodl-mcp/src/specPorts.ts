/**
 * P107 NSP-020 R19 part 1 — a node's ports as the spec draws them now, for `get_component`.
 *
 * A node whose ports depend on its settings or on the project (a Record's columns, a For Each's template outputs, a
 * Function's script, And's numbered inputs) has them announced by the runtime only while a viewer runs; the editor saves
 * the last announcement on the node as `dynamicports`, and nothing refreshes it until a viewer connects again. Measured
 * over Richard's projects (NSP-020 §6.9): that saved list is out of date on 1,027 of 4,228 nodes, and an agent reading
 * `get_component` had only it.
 *
 * `drawnPortsFor` draws them from the node's spec instead: `@nodegx/node-spec`'s `drawnPorts(spec, params, context)` with
 * the context `@nodegx/project-contract`'s `portContextFor` reads from the saved project (the wires, the backends and
 * schema, the stacks, each component's interface). Only for the types in `DRAWN_PORT_TYPES` — graded against the
 * runtime's own announcement, names complete — so Cloud Function, Navigate and the HTTP Request's Output Fields, which the
 * spec does not draw yet, are never shown as if it did. Only the ports the spec DERIVES (the ones `dynamicports` holds),
 * as name, plug and type: the static ports are `get_node_type`'s.
 *
 * Read-only: the saved nodes are returned as they are, so a read-modify-write hands back exactly what was read.
 *
 * @module noodl-mcp/specPorts
 */
import { DRAWN_PORT_TYPES, drawnPorts, specs } from '@nodegx/node-spec';
import { portContextReader, portProjectFromStore, type PortTypeOf } from '@nodegx/project-contract/port-context';

import { catalogIndex } from './catalog';
import { CatalogIndex } from './editor-deps';
import type { ProjectStore } from './project/ProjectStore';

export interface DrawnPort {
  name: string;
  plug: 'input' | 'output';
  type: string;
}

const DRAWN = new Set(DRAWN_PORT_TYPES);

/** A library node's static port type, from the catalog the validator reads — how a component's ports are typed from their wires. */
const catalogPortType: PortTypeOf = (node, port, plug) => CatalogIndex.portTypeName(catalogIndex().getPort(node.type, plug, port));

/**
 * The spec-drawn ports of every node in `nodeIds` whose type is in `DRAWN_PORT_TYPES`, by node id. A node the spec draws
 * no derived port for is left out; a spec that throws on a node's saved params leaves that node out (the saved list is
 * still in `nodes`).
 */
export function drawnPortsFor(store: ProjectStore, nodes: readonly { id: string; type: string; parameters?: Record<string, unknown> }[]): Record<string, DrawnPort[]> {
  const wanted = nodes.filter((n) => DRAWN.has(n.type) && specs[n.type]);
  if (wanted.length === 0) return {};
  const contextOf = portContextReader(portProjectFromStore(store.format), { portType: catalogPortType });
  const out: Record<string, DrawnPort[]> = {};
  for (const n of wanted) {
    try {
      const ports = drawnPorts(specs[n.type], n.parameters ?? {}, contextOf(n.id) as Parameters<typeof drawnPorts>[2])
        .filter((p) => p.source === 'derived')
        .map((p) => ({ name: p.name, plug: p.plug, type: p.type as string }));
      if (ports.length) out[n.id] = ports;
    } catch {
      // the saved list stands for this node
    }
  }
  return out;
}
