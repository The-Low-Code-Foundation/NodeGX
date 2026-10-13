/**
 * The settings a **cloud** node's panel draws, from the node's spec — P107 R37 (s100, "From the node specs").
 *
 * ## Why this exists
 *
 * A node's settings — Class, Filter, an aggregate's Property and Operation, a Function's typed inputs — reach the editor
 * from its module's `setup()` hook, which a runtime client runs and announces over `sendDynamicPorts`. A cloud function has
 * no runtime client since WF-007 (`cloudDynamicPorts.ts` says why), so no cloud node's hook runs and a node placed in a
 * cloud function today has none of them (P107-S100-CLOUDSETUPPORTS: a new Aggregate Records showed only its Aggregates
 * list). SB-017 restored the families a WIRE needs; this restores the rest, from the one description of each node that
 * needs no runtime: its spec's `drawnPorts(spec, params, context)` (NSP-020).
 *
 * ## Only a type whose draw is graded
 *
 * {@link CLOUD_SPEC_PORT_TYPES} is the cloud library's types whose spec draws derived ports and is in `DRAWN_PORT_TYPES`:
 * oracle (a) fires the type's own hook and lays its announcement over the spec's draw, names, types, enums and the panel's
 * fields (`noodl-runtime/test/node-spec/nsp-020-ports-parity.test.ts`). A type with no spec, or an ungraded draw, keeps
 * today's gap and is named here: Component Inputs / Outputs, RunTasks, REST2, Component Object and its setter, On App
 * Error (no spec); the HTTP Request (its Output Fields are not in its spec). Create User and Update User, Request and
 * Response draw their parameters from a `namedports/list` rule (`NamedPortsAdapter`), which is their writer.
 *
 * ## What is drawn
 *
 * The derived ports, in the editor's port shape: an enum's `{ value, label }`, `allowEditOnly`, `allowConnectionsOnly`,
 * `codeeditor`. A Filter builder's `schema` and `backend` are the backend's, not the node's: they are read from the project
 * the way the runtime reads them (`record-ports.ts recordSchemaContext` / `recordFilterSchema`), so the builder offers the
 * same columns and the same operators either way.
 *
 * Not here: which nodes, and when — `NodeTypeAdapters/CloudDynamicPortsAdapter.ts`, the one writer per node.
 *
 * @module models/nodelibrary/cloudSpecPorts
 */

import { DRAWN_PORT_TYPES, drawnPorts, drawnWiredPort, specs, type DrawnPort, type PortContext } from '@nodegx/node-spec';
import { portContextReader, type PortProject } from '@nodegx/project-contract/port-context';
import {
  recordFilterBackendType,
  recordFilterSchema,
  recordSchemaContext
} from '@noodl/runtime/src/nodes/std-library/data/record-ports';

import {
  QUERY_TYPES,
  RECORD_READ_TYPES,
  RECORD_WRITE_TYPES,
  SCRIPT_PORT_TYPES,
  type ConnectionLike,
  type GeneratedPort,
  type PortNodeLike
} from './cloudDynamicPorts';

/**
 * The cloud library's types drawn from their spec: graded (`DRAWN_PORT_TYPES`), with derived ports, and no other writer.
 * Held to `cloud-node-library.json` and `DRAWN_PORT_TYPES` both ways by `tests-unit/nsp-020/cloud-spec-ports.test.ts`.
 */
export const CLOUD_SPEC_PORT_TYPES: readonly string[] = [
  'Expression',
  'JavaScriptFunction',
  'Logic Builder',
  'DbCollection2',
  'DbModel2',
  'SetDbModelProperties',
  'DeleteDbModelProperties',
  'NewDbModelProperties',
  'AddDbModelRelation',
  'RemoveDbModelRelation',
  'FilterDBModels',
  'Model2',
  'SetModelProperties',
  'NewModel',
  'Filter Collection',
  'Set Variable',
  'Sign File URL',
  'And',
  'Or',
  'String Mapper',
  'String Format',
  'net.noodl.user.SetUserProperties',
  'net.noodl.user.User',
  'noodl.cloud.aggregate'
];

/**
 * The spec-drawn types no SB-017 family owns — `CloudSpecPortsAdapter`'s. The families' adapters draw their own types' spec
 * ports, so each node has one writer (`setDynamicPorts` replaces).
 */
export const CLOUD_SPEC_ONLY_TYPES: readonly string[] = CLOUD_SPEC_PORT_TYPES.filter(
  (t) => ![...SCRIPT_PORT_TYPES, ...RECORD_WRITE_TYPES, ...RECORD_READ_TYPES, ...QUERY_TYPES].includes(t)
);

/** Graded types in the cloud library that another writer draws: a `namedports/list` rule (`NamedPortsAdapter`). */
export const CLOUD_RULE_DRAWN_TYPES: readonly string[] = ['noodl.cloud.request', 'noodl.cloud.response'];

/** What the drawing reads of the project: its metadata, through the same accessor the runtime's graph model has. */
export interface CloudProjectLike {
  metadata: Record<string, unknown>;
}

/** One port as a panel draws it — the shape a runtime hook announces. */
export function editorPortOf(port: DrawnPort, filter?: { schema: unknown; backend: string }): GeneratedPort | undefined {
  const type: Record<string, unknown> = { name: port.type };
  if (port.type === 'enum' && port.enums) type.enums = port.enums.map((value) => ({ value, label: port.labels?.[value] ?? value }));
  if (port.type === 'query-filter' || port.type === 'query-sorting') {
    // the runtime declares no builder it has no schema for (dbcollectionnode2.ts "not declared at all rather than empty")
    if (!filter) return undefined;
    type.schema = filter.schema;
    if (port.filterBackend) type.backend = filter.backend;
  }
  if (port.editOnly) type.allowEditOnly = true;
  if (port.connectionsOnly) type.allowConnectionsOnly = true;
  if (port.codeEditor !== undefined) type.codeeditor = port.codeEditor;
  if (port.valuePortPrefix !== undefined) type.valuePortPrefix = port.valuePortPrefix;

  const out: GeneratedPort = {
    name: port.name,
    plug: port.plug,
    type: Object.keys(type).length === 1 ? port.type : type
  };
  if (port.displayName !== undefined) out.displayName = port.displayName;
  if (port.group !== undefined) out.group = port.group;
  if (port.default !== undefined) out.default = port.default;
  return out;
}

/**
 * The Filter builder's schema and backend for this node, as the runtime reads them; `undefined` when the project has
 * nothing to build a filter from.
 */
function filterOf(project: CloudProjectLike, parameters: Record<string, unknown>): { schema: unknown; backend: string } | undefined {
  const graphModel = { getMetaData: (key: string) => project.metadata[key] };
  const ctx = recordSchemaContext(graphModel as Parameters<typeof recordSchemaContext>[0], parameters);
  const schema = recordFilterSchema(ctx);
  // `QueryUtils.backendType()`'s answer with no store to ask (queryutils.ts :157-167): `nodegx`, the more permissive table
  return schema ? { schema, backend: recordFilterBackendType(ctx, 'nodegx') } : undefined;
}

/**
 * The ports a cloud node's spec draws for it — derived ones, which the static library entry does not have — or `[]` for a
 * type not drawn from its spec.
 */
export function specPortsForNode(
  node: PortNodeLike & { id: string },
  typename: string | undefined,
  connections: readonly ConnectionLike[],
  project: CloudProjectLike
): GeneratedPort[] {
  if (!typename || !CLOUD_SPEC_PORT_TYPES.includes(typename) || !specs[typename]) return [];
  const parameters = node.parameters || {};

  // the node and its component's wires are all a cloud type's spec reads beyond the metadata (`derived.needs`: schema,
  // backends, wired, wiredOutputs — measured over the list above, s101)
  const portProject: PortProject = {
    metadata: project.metadata,
    components: [{ name: 'cloud', nodes: [{ id: node.id, type: typename, parameters } as never], connections: connections.map((c) => ({ ...c })) }]
  };
  const spec = specs[typename];
  let drawn: DrawnPort[];
  try {
    const context = portContextReader(portProject)(node.id, 'cloud');
    drawn = drawnPorts(spec, parameters, context as PortContext);
    // a wired name the params do not draw is a port the runtime registers on the wire (nodescope.ts :149-150), as the
    // Problems panel reads it (`drawnPortLookup`): drawn, so an old project's wire keeps its port when the class it was
    // drawn for is not in the metadata today, and so a deploy does not drop it (SB-017)
    const has = new Set(drawn.map((p) => p.plug + ' ' + p.name));
    for (const name of context.wired ?? []) {
      const decl = has.has('input ' + name) ? undefined : spec.derived?.discover?.(name);
      if (decl) drawn.push(drawnWiredPort(name, 'input', decl));
    }
    for (const name of context.wiredOutputs ?? []) {
      const decl = has.has('output ' + name) ? undefined : spec.derived?.discoverOutput?.(name);
      if (decl) drawn.push(drawnWiredPort(name, 'output', decl));
    }
  } catch {
    // a spec that throws on these params draws nothing: the node keeps its static ports, as before R37
    return [];
  }

  let filter: { schema: unknown; backend: string } | undefined | null = null;
  const ports: GeneratedPort[] = [];
  for (const port of drawn) {
    if (port.source !== 'derived') continue;
    if ((port.type === 'query-filter' || port.type === 'query-sorting') && filter === null) filter = filterOf(project, parameters);
    const editor = editorPortOf(port, filter ?? undefined);
    if (editor) ports.push(editor);
  }
  return ports;
}

/**
 * The ports a node keeps from the list it SAVED: every one a wire uses that `ports` does not draw. The runtime registers a
 * wired port on the wire (nodescope.ts :149-150), so the wire works; dropping its port would make the wire unhealthy, and a
 * deploy drops an unhealthy wire (SB-017). Measured on lepetitpicnic_local_backend's 113 spec-drawn cloud nodes (s101): one
 * such port, a Query Records' Javascript-filter value `storageFilterValue-ParentRecordId` — the Javascript filter is not in
 * the spec (P107-S101-JSFILTERVALUES). A saved `input/output` port counts as both plugs.
 */
export function keepWiredSavedPorts(
  ports: readonly GeneratedPort[],
  saved: readonly GeneratedPort[] | undefined,
  nodeId: string,
  connections: readonly ConnectionLike[]
): GeneratedPort[] {
  const out = [...ports];
  const drawn = new Set(out.map((p) => p.plug + ' ' + p.name));
  const wired = new Set([
    ...connections.filter((c) => c.toId === nodeId).map((c) => 'input ' + c.toProperty),
    ...connections.filter((c) => c.fromId === nodeId).map((c) => 'output ' + c.fromProperty)
  ]);
  for (const port of saved ?? []) {
    const keys = port.plug === 'input/output' ? ['input ' + port.name, 'output ' + port.name] : [port.plug + ' ' + port.name];
    if (keys.some((k) => wired.has(k)) && !keys.some((k) => drawn.has(k))) {
      out.push(port);
      keys.forEach((k) => drawn.add(k));
    }
  }
  return out;
}

/** Every graded type the cloud library has with derived ports — what {@link CLOUD_SPEC_PORT_TYPES} and the rule list cover. */
export function gradedCloudTypes(libraryTypes: readonly string[]): string[] {
  return libraryTypes.filter((t) => DRAWN_PORT_TYPES.includes(t) && !!specs[t]?.derived);
}
