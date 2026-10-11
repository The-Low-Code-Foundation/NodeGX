/**
 * P107 NSP-020 R19 / R20 — the ports a node's spec draws, as the validator's `drawnPorts` callback.
 *
 * `rules/nonexistentPort` (3a) asks it for a wire to a port that the catalog, the node's saved lists and the derived-port
 * rule do not name, on a node whose ports appear at run time: a set → the port is in it or the wire is an ERROR; `undefined`
 * → the old "could not be statically verified" note. R19 (2026-10-11) gave the agent server this callback; R20 (s87,
 * "Error, as the agent does") gives it to the editor's Problems panel too — so one function answers both, over a
 * `PortProject` each reads its own way (the agent server from the saved v2 files and a write's candidate, the editor from
 * its live model, `portProjectFromLegacy`).
 *
 * The answer is every port, static and derived, `@nodegx/node-spec`'s `drawnPorts` draws for the node with the context
 * `@nodegx/project-contract`'s `portContextFor` reads from the project — and every wired name the runtime registers when
 * the wire is made (`derived.discover` / `discoverOutput`, nodescope.ts :150): a For Each's `itemOutputSignal-x` for a row
 * output nothing typed is drawn `itemOutput-x` and the wire registers it (foreach.tsx :1081-1096; 22 such wires in
 * Richard's projects, s86). Only for `DRAWN_PORT_TYPES`: a type whose draw is not graded is never refused.
 *
 * Measured over Richard's 117 local projects (s86): 99 wires refused, every one read and dead, 0 false.
 *
 * Not exported from `./index` on purpose: it brings the spec package with it, and most of the validator's importers
 * (the CLI, the jest suites) do not need it.
 *
 * @module noodl-editor/validation/drawnPortLookup
 */

import { DRAWN_PORT_TYPES, drawnPorts, specs } from '@nodegx/node-spec';
import { findPortNode, portContextReader, type PortProject } from '@nodegx/project-contract/port-context';

import { CatalogIndex } from './CatalogIndex';
import type { DrawnPortsLookup } from './rules/types';

const DRAWN = new Set(DRAWN_PORT_TYPES);

/**
 * The callback over the project `read` returns, typed by `catalog` (a component's ports are typed from the library ports
 * wired to them, `portContextFor`). The project is read once, on the first node asked about: most validations have no
 * wire to a port the catalog and the saved lists do not name, and pay nothing.
 */
export function drawnPortLookup(read: () => PortProject, catalog: CatalogIndex): DrawnPortsLookup {
  let held: { project: PortProject; contextOf: ReturnType<typeof portContextReader> } | undefined;
  return (component, nodeId, nodeType) => {
    if (!DRAWN.has(nodeType) || !specs[nodeType]) return undefined;
    if (!held) {
      const project = read();
      held = {
        project,
        contextOf: portContextReader(project, { portType: (node, port, plug) => CatalogIndex.portTypeName(catalog.getPort(node.type, plug, port)) })
      };
    }
    // the validator names a v2 component `path ?? key`, the builder `path ?? '/' + key`; a legacy name is the same in both
    const name = held.project.components.some((c) => c.name === component) ? component : '/' + component;
    const found = findPortNode(held.project, nodeId, name);
    if (!found) return undefined;
    try {
      const spec = specs[nodeType];
      const context = held.contextOf(nodeId, name);
      const ports = drawnPorts(spec, found.node.parameters ?? {}, context as Parameters<typeof drawnPorts>[2]);
      const input = new Set(ports.filter((p) => p.plug === 'input').map((p) => p.name));
      const output = new Set(ports.filter((p) => p.plug === 'output').map((p) => p.name));
      for (const port of context.wired ?? []) if (!input.has(port) && spec.derived?.discover?.(port)) input.add(port);
      for (const port of context.wiredOutputs ?? []) if (!output.has(port) && spec.derived?.discoverOutput?.(port)) output.add(port);
      return { input, output };
    } catch {
      return undefined;
    }
  };
}

interface LegacyNode {
  id: string;
  type: string;
  parameters?: Record<string, unknown> | null;
  ports?: unknown[];
  children?: LegacyNode[];
}
interface LegacyProject {
  metadata?: Record<string, unknown>;
  components?: Array<{
    name: string;
    graph?: { roots?: LegacyNode[]; connections?: Array<{ fromId: string; fromProperty: string; toId: string; toProperty: string }> };
  }>;
}

/**
 * The editor's live project (`ProjectModel.toJSON()`: each component's nodes as nested trees) as the builder reads a saved
 * v2 project: its metadata, and per component the nodes flat with their parent, params and drawn `ports`, and the wires.
 */
export function portProjectFromLegacy(project: LegacyProject): PortProject {
  return {
    metadata: project.metadata ?? {},
    components: (project.components ?? []).map((c) => {
      const nodes: PortProject['components'][number]['nodes'] = [];
      const visit = (n: LegacyNode, parent?: string) => {
        nodes.push({
          id: n.id,
          type: n.type,
          parameters: n.parameters ?? {},
          ...(n.ports ? { ports: n.ports as never } : {}),
          ...(parent ? { parent } : {}),
          ...(n.children?.length ? { children: n.children.map((k) => k.id) } : {})
        });
        for (const k of n.children ?? []) visit(k, n.id);
      };
      for (const root of c.graph?.roots ?? []) visit(root);
      return { name: c.name, nodes, connections: (c.graph?.connections ?? []).map((w) => ({ fromId: w.fromId, fromProperty: w.fromProperty, toId: w.toId, toProperty: w.toProperty })) };
    })
  };
}
