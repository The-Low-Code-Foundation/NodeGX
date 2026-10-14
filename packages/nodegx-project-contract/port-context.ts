/**
 * P107 NSP-020 L5 — what an editor knows about one node WITHOUT a viewer, read from a saved project.
 *
 * `@nodegx/node-spec`'s `drawnPorts(spec, params, context)` draws every port of a node from its params and a
 * `PortContext`: the wires in and out, the project's backends, the selected backend's schema, the Component Stacks and
 * Routers, and the interface of each component a node may name. The runtime reads the same facts from its graph model
 * inside a `setup(context, graphModel)` hook, and only while a viewer runs. `portContextFor(project, nodeId)` makes the
 * context from the project files, so the MCP server, a replacement editor or a test can draw a node's ports with no
 * viewer at all.
 *
 * The types are a structural copy of the spec package's `PortContext` (`nodegx-node-spec/src/spec.ts`), not an import:
 * the two packages stay independent, as `function-ports.ts` does, and the builder is graded by parity — the runtime's
 * own hooks read the same project (`noodl-runtime/test/node-spec/nsp-020-port-context.test.ts`).
 *
 * Each field says the runtime lines it reads as. Not built: `siblings` and `instancePorts` (no spec reads them yet —
 * `derived.needs` names neither).
 */
import type { ConnectionV2, NodeV2 } from './format/types';
import type { V2ProjectStore } from './format/store';

// ─── The context (structural copy of `@nodegx/node-spec` `PortContext`) ────────────────────────────────────────────

export type PortValueType = string;

export interface PortContextField {
  type: PortValueType;
  /** The class a Parse `Relation` column points at. */
  relation?: string;
  /** The column has no Parse native type: the runtime typed it by `getEnhancedFieldType`, and `type` is that port type. */
  enhanced?: true;
  /** A select column's choices (its `enumValues`). */
  enums?: string[];
}

export interface PortContextComponent {
  inputs: Record<string, { type: PortValueType }>;
  outputs: Record<string, { type: PortValueType }>;
  /** The params of the nodes inside the component, by type (`component.getNodesWithType(type)`). */
  nodes?: Record<string, Record<string, unknown>[]>;
}

export interface PortContextPages {
  name: string;
  pages: string[];
  components?: Record<string, string>;
  labels?: Record<string, string>;
}

export interface ProjectPortContext {
  wired?: string[];
  wiredOutputs?: string[];
  backends?: { id: string; name: string }[];
  components?: Record<string, PortContextComponent>;
  routers?: PortContextPages[];
  stacks?: PortContextPages[];
  schema?: { classes: Record<string, { fields: Record<string, PortContextField> }>; backendType?: string };
}

// ─── The project, as the builder reads it ──────────────────────────────────────────────────────────────────────────

export interface PortProjectComponent {
  /** The legacy name a node's params use (`/Components/Card`, `/#__page__/Home`): `component.json`'s `path`. */
  name: string;
  nodes: NodeV2[];
  connections: ConnectionV2[];
}

export interface PortProject {
  /** `nodegx.project.json`'s `metadata`: `cloudservices`, `backendServices`, `dbCollections`, `systemCollections`. */
  metadata: Record<string, unknown>;
  components: PortProjectComponent[];
}

/** A v2 project's components and metadata, read through the store with no snapshot taken. */
export function portProjectFromStore(store: V2ProjectStore): PortProject {
  const registry = store.readRegistry().components;
  const components = Object.entries(registry).map(([key, entry]) => {
    const files = store.filesOf(key, entry);
    return { name: files.component.path ?? '/' + key, nodes: files.nodes.nodes ?? [], connections: files.connections.connections ?? [] };
  });
  return { metadata: (store.readProjectFile()?.metadata ?? {}) as Record<string, unknown>, components };
}

/**
 * The type of one port of a node the project does not describe itself — a library node's port, from the node catalog
 * or a spec. `undefined` when it is not known. The builder asks it only to type a component's ports (below).
 */
export type PortTypeOf = (node: NodeV2, port: string, plug: 'input' | 'output') => PortValueType | undefined;

export interface PortContextOptions {
  portType?: PortTypeOf;
}

// ─── The builder ───────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The node and its component, by node id — in the named component when one is named. `undefined` when no component holds
 * it. A node id is unique within a component, not across a project: 27 of 117 of Richard's local projects reuse one in a
 * second component (P107 s86), and without the component the first one found is read.
 */
export function findPortNode(project: PortProject, nodeId: string, componentName?: string): { component: PortProjectComponent; node: NodeV2 } | undefined {
  for (const component of project.components) {
    if (componentName !== undefined && component.name !== componentName) continue;
    const node = component.nodes.find((n) => n.id === nodeId);
    if (node) return { component, node };
  }
  return undefined;
}

/**
 * The `PortContext` for one node of a saved project. Every field the project can say is filled; a field with nothing
 * in it is left out (an empty list and an absent one draw the same ports).
 */
export function portContextFor(project: PortProject, nodeId: string, options: PortContextOptions = {}, componentName?: string): ProjectPortContext {
  return portContextReader(project, options)(nodeId, componentName);
}

/**
 * `portContextFor` for many nodes of one project: the project-wide fields (backends, stacks, routers, every component's
 * interface) are read once, and each call adds the node's own wires and the schema its Backend param selects. Name the
 * node's component (its legacy name) wherever it is known (`findPortNode`).
 */
export function portContextReader(project: PortProject, options: PortContextOptions = {}): (nodeId: string, componentName?: string) => ProjectPortContext {
  const backends = backendEntries(project.metadata).map((b) => ({ id: b.id, name: b.name }));
  const stacks = pagesOf(project, 'Page Stack', stackPages);
  const routers = pagesOf(project, 'Router', routerPages);
  let components: Record<string, PortContextComponent> | undefined;

  return (nodeId, componentName) => {
    const found = findPortNode(project, nodeId, componentName);
    if (!found) throw new Error(`portContextFor: no node ${nodeId} in ${componentName ?? 'the project'}`);
    const { component, node } = found;
    const context: ProjectPortContext = {};

    // nodescope.ts / record-ports.ts :305-308 — the wires into and out of this node, in the component's connection order
    const wired = unique(component.connections.filter((c) => c.toId === nodeId).map((c) => c.toProperty));
    const wiredOutputs = unique(component.connections.filter((c) => c.fromId === nodeId).map((c) => c.fromProperty));
    if (wired.length) context.wired = wired;
    if (wiredOutputs.length) context.wiredOutputs = wiredOutputs;

    if (backends.length) context.backends = backends.map((b) => ({ ...b }));
    const schema = schemaFor(project.metadata, node.parameters ?? {});
    if (schema) context.schema = schema;
    if (stacks.length) context.stacks = stacks;
    if (routers.length) context.routers = routers;

    components = components ?? componentInterfaces(project, options.portType);
    if (Object.keys(components).length) context.components = components;
    return context;
  };
}

function unique(names: string[]): string[] {
  return [...new Set(names)];
}

// ─── Backends (resolveBackend.pure.ts) ─────────────────────────────────────────────────────────────────────────────

interface BackendEntry {
  id: string;
  name: string;
  type?: string;
  schema?: { collections?: NormalisedCollection[] };
}

interface NormalisedCollection {
  name: string;
  fields?: { name: string; type?: string; nativeType?: string; relationTarget?: string; relationType?: string; hidden?: boolean; enumValues?: unknown[] }[];
}

/** resolveBackend.pure.ts :78 — the id a saved node parameter holds for the `cloudservices` endpoint. */
const ENDPOINT_BACKEND_ID = '_endpoint_';
/** resolveBackend.pure.ts :112 — the two backend types served by the Parse wire. */
const PARSE_WIRE_TYPES = ['nodegx', 'parse'];

/**
 * resolveBackend.pure.ts :141-162 `endpointBackendEntry` + :170-174 `backendEntries`: the `cloudservices` endpoint first
 * (`_endpoint_`, "Built-in" on our backend, "Parse Server" on Parse — :130-132 reads a missing type as `nodegx`), then
 * every `backendServices` backend. The Record and User families' picker lists exactly these (record-ports.ts :84-99).
 */
function backendEntries(metadata: Record<string, unknown>): BackendEntry[] {
  const cloud = metadata.cloudservices as { endpoint?: string; type?: string } | undefined;
  const services = metadata.backendServices as { backends?: BackendEntry[] } | undefined;
  const external = Array.isArray(services?.backends) ? services.backends : [];
  if (!cloud || !cloud.endpoint) return external.slice();
  const type = cloud.type === 'external' || cloud.type === 'parse' ? 'parse' : 'nodegx';
  return [{ id: ENDPOINT_BACKEND_ID, name: type === 'nodegx' ? 'Built-in' : 'Parse Server', type }, ...external];
}

/**
 * resolveBackend.pure.ts :184-210 `defaultBackendId` — what `_active_` (or no Backend param) means: a converged project's
 * own `activeBackendId` (backendServices `version` ≥ 2, :220-222) when it names a backend; else the endpoint; else the
 * BYOB active backend when it names one; else the only backend there is; else the active id as written.
 */
function defaultBackendId(metadata: Record<string, unknown>, entries: BackendEntry[]): string | undefined {
  if (entries.length === 0) return undefined;
  const services = metadata.backendServices as { activeBackendId?: string; version?: number } | undefined;
  const active = services?.activeBackendId;
  if ((services?.version ?? 1) >= 2 && active && entries.some((e) => e.id === active)) return active;
  const cloud = metadata.cloudservices as { endpoint?: string } | undefined;
  if (cloud?.endpoint) return ENDPOINT_BACKEND_ID;
  if (active && entries.some((e) => e.id === active)) return active;
  if (entries.length === 1) return entries[0].id;
  return active;
}

// ─── Schema (schema-ports.ts) ──────────────────────────────────────────────────────────────────────────────────────

/** record-ports.ts :63-68 `PARSE_PORT_TYPES` — the four Parse types a port keeps; every other Parse type is `*`. */
const PARSE_KEPT: Record<string, PortValueType> = { String: 'string', Number: 'number', Boolean: 'boolean', Date: 'date' };
/** The two Parse types the spec names beside the kept four (an Object column, an Array column — both drawn `*`). */
const PARSE_NAMED: Record<string, PortValueType> = { Object: 'object', Array: 'array' };

/**
 * schema-ports.ts :479-520 `resolveSchemaPortContext`, as the Record family calls it (record-ports.ts :84-99) and the User
 * family (user-ports.ts :119-139): the node's Backend param (`_active_` or none → `defaultBackendId`) picks a backend; its
 * introspected `schema.collections`, or — when it has none and is a Parse-wire backend (or there is no backend at all) —
 * the project's `dbCollections` then `systemCollections`. One class per collection, in that order.
 */
function schemaFor(metadata: Record<string, unknown>, params: Record<string, unknown>): ProjectPortContext['schema'] {
  const entries = backendEntries(metadata);
  const param = params.backendId;
  const selectedId = param === '_active_' || !param ? defaultBackendId(metadata, entries) : param;
  const selected = entries.find((e) => e.id === selectedId);

  const classes: Record<string, { fields: Record<string, PortContextField> }> = {};
  const parseWire = !selected?.type || PARSE_WIRE_TYPES.includes(selected.type);
  const introspected = selected?.schema?.collections ?? [];
  if (introspected.length > 0) {
    for (const c of introspected) if (c && c.name) classes[c.name] = { fields: normalisedFields(c) };
  } else if (parseWire) {
    for (const c of [...parseClassList(metadata.dbCollections), ...parseClassList(metadata.systemCollections)]) {
      const name = (c.className ?? c.name) as string | undefined;
      if (name) classes[name] = { fields: parseFields(c) };
    }
  }
  // P107-S85-RESTCOLTYPES — the backend's type (schema-ports.ts `backendType`): off the Parse wire the Class picker has no
  // system classes and the User family reads the type's accounts table, so a REST backend with no classes is still a schema
  if (!Object.keys(classes).length && parseWire) return undefined;
  return selected?.type ? { classes, backendType: selected.type } : { classes };
}

type ParseClass = { className?: string; name?: string; fields?: Record<string, ParseField>; schema?: { properties?: Record<string, ParseField> }; columns?: (ParseField & { name?: string })[] };
type ParseField = { type?: string; targetClass?: string };

/** schema-ports.ts :323-331 `parseClassList` — a bare array, `{results}` (Parse `GET /schemas`) or `{tables}` (our backend). */
function parseClassList(data: unknown): ParseClass[] {
  if (Array.isArray(data)) return data as ParseClass[];
  const results = (data as { results?: unknown } | undefined)?.results;
  if (Array.isArray(results)) return results as ParseClass[];
  const tables = (data as { tables?: unknown } | undefined)?.tables;
  if (Array.isArray(tables)) return tables as ParseClass[];
  return [];
}

/**
 * schema-ports.ts :341-352 `parseClassFields` (`fields`, `schema.properties` or a `columns` array) and :359-381
 * `parseFieldToSchemaField`: a `Relation` keeps its target class; the four kept Parse types keep theirs, Object and
 * Array are named, anything else (Pointer, File, GeoPoint) is `*`. `ACL` is kept: the Record family hides it by name, the
 * User family on the Parse wire draws it (P107-S84-USERACL), and that choice is the spec's, not the project's.
 */
function parseFields(cls: ParseClass): Record<string, PortContextField> {
  let fields: Record<string, ParseField> = {};
  if (cls.fields) fields = cls.fields;
  else if (cls.schema?.properties) fields = cls.schema.properties;
  else if (Array.isArray(cls.columns)) for (const col of cls.columns) if (col && col.name) fields[col.name] = col;
  const out: Record<string, PortContextField> = {};
  for (const [name, f] of Object.entries(fields)) out[name] = parseField(f);
  return out;
}

function parseField(f: ParseField | undefined): PortContextField {
  const type = f?.type;
  if (type === 'Relation') return { type: '*', relation: f?.targetClass ?? '' };
  if (type !== undefined && type in PARSE_KEPT) return { type: PARSE_KEPT[type] };
  if (type !== undefined && type in PARSE_NAMED) return { type: PARSE_NAMED[type] };
  return { type: '*' };
}

/**
 * A backend's introspected collection (the editor's `SchemaCollection`, already normalised), typed as record-ports.ts
 * :208-218 `recordPortType` types a column: by its `nativeType` when it has one (a Parse-named type as above, any other
 * native type `*`), else by schema-ports.ts :119-195 `getEnhancedFieldType` — an enum list is an `enum`, the numeric
 * names `number`, `boolean`, `json` / `array` an `object`, and EVERYTHING else `string` (a neutral `date` too: the port
 * carries text with a placeholder). A many-to-many column keeps its target. A `hidden` field is dropped
 * (schema-ports.ts :87-105 `shouldShowField`) unless it is the `ACL`, which the spec decides on by name.
 */
function normalisedFields(c: NormalisedCollection): Record<string, PortContextField> {
  const out: Record<string, PortContextField> = {};
  for (const f of c.fields ?? []) {
    if (!f || !f.name) continue;
    if (f.hidden && f.name !== 'ACL') continue;
    if (f.relationType === 'many-to-many') out[f.name] = { type: '*', relation: f.relationTarget ?? '' };
    else if (f.nativeType !== undefined) out[f.name] = parseField({ type: f.nativeType });
    else {
      const field: PortContextField = { type: enhancedType(f), enhanced: true };
      if (field.type === 'enum') field.enums = (f.enumValues ?? []).map(String);
      out[f.name] = field;
    }
  }
  return out;
}

const NUMERIC = ['integer', 'bigInteger', 'float', 'decimal', 'number'];

function enhancedType(f: { type?: string; enumValues?: unknown[] }): PortValueType {
  if (Array.isArray(f.enumValues) && f.enumValues.length > 0) return 'enum';
  if (f.type !== undefined && NUMERIC.includes(f.type)) return 'number';
  if (f.type === 'boolean') return 'boolean';
  if (f.type === 'json' || f.type === 'array') return 'object';
  return 'string';
}

// ─── Component Stacks and Routers ──────────────────────────────────────────────────────────────────────────────────

function pagesOf(project: PortProject, type: string, read: (params: Record<string, unknown>) => PortContextPages): PortContextPages[] {
  return project.components.flatMap((c) => c.nodes.filter((n) => n.type === type).map((n) => read(n.parameters ?? {})));
}

/** navigate.ts :338-363 — a Page Stack's `name` (blank is `Main`), its `pages` by id, and `pageComp-<id>` per page. */
function stackPages(params: Record<string, unknown>): PortContextPages {
  const pages = (Array.isArray(params.pages) ? params.pages : []).map((p) => (p as { id?: string })?.id).filter((id): id is string => typeof id === 'string');
  const components: Record<string, string> = {};
  for (const id of pages) if (typeof params['pageComp-' + id] === 'string') components[id] = params['pageComp-' + id] as string;
  const out: PortContextPages = { name: (params.name as string) || 'Main', pages };
  if (Object.keys(components).length) out.components = components;
  // P107 s101 — each page's name, what the Target picker shows (navigate.ts :1389-1392 reads `pages[].label`)
  const labels: Record<string, string> = {};
  for (const p of Array.isArray(params.pages) ? params.pages : []) {
    const { id, label } = (p ?? {}) as { id?: unknown; label?: unknown };
    if (typeof id === 'string' && typeof label === 'string') labels[id] = label;
  }
  if (Object.keys(labels).length) out.labels = labels;
  return out;
}

/** A Router's `name` (blank is `Main`) and the components its `pages.routes` lists. */
function routerPages(params: Record<string, unknown>): PortContextPages {
  const routes = (params.pages as { routes?: unknown } | undefined)?.routes;
  return { name: (params.name as string) || 'Main', pages: Array.isArray(routes) ? routes.filter((r): r is string => typeof r === 'string') : [] };
}

// ─── Component interfaces (the editor's ComponentModel.getPorts) ───────────────────────────────────────────────────

const COMPONENT_INPUTS = 'Component Inputs';
const COMPONENT_OUTPUTS = 'Component Outputs';

/**
 * Every component's interface, by legacy name. The editor makes a component's ports from its Component Inputs and
 * Component Outputs nodes (`haveComponentPorts`) and TYPES each one from the ports wired to it, not from the type saved
 * on the node (noodl-editor componentmodel.ts :134-240 `getPorts` `_deriveType`): no wire is `*`, one wire is that port's
 * type, several are the type all of them share (the editor's castability search, nodelibrary.ts :406
 * `findCompatiblePortType`, can find a type where they differ; this says `*` there). A wired port's type is a component
 * instance's interface when the node is one, else `options.portType`, else the node's own saved `ports` /
 * `dynamicports`. `nodes` is every node inside the component by type, with its params.
 */
function componentInterfaces(project: PortProject, portType: PortTypeOf | undefined): Record<string, PortContextComponent> {
  const byName = new Map(project.components.map((c) => [c.name, c]));
  const done = new Map<string, PortContextComponent>();
  const busy = new Set<string>();

  const interfaceOf = (component: PortProjectComponent): PortContextComponent => {
    const cached = done.get(component.name);
    if (cached) return cached;
    busy.add(component.name);
    const nodeById = new Map(component.nodes.map((n) => [n.id, n]));
    const typeOfPort = (node: NodeV2 | undefined, port: string, plug: 'input' | 'output'): PortValueType | undefined => {
      if (!node) return undefined;
      const inner = byName.get(node.type);
      if (inner) {
        if (busy.has(inner.name)) return undefined;
        const face = interfaceOf(inner);
        return (plug === 'input' ? face.inputs : face.outputs)[port]?.type;
      }
      const fromOption = portType?.(node, port, plug);
      if (fromOption !== undefined) return fromOption;
      const saved = [...(node.ports ?? []), ...(node.dynamicports ?? [])].find((p) => p.name === port && (p.plug === plug || p.plug === 'input/output'));
      return saved ? typeName(saved.type) : undefined;
    };
    const derive = (types: (PortValueType | undefined)[]): PortValueType => {
      const known = types.filter((t): t is PortValueType => t !== undefined);
      if (known.length === 0 || known.length !== types.length) return '*';
      return known.every((t) => t === known[0]) ? known[0] : '*';
    };

    const inputs: Record<string, { type: PortValueType }> = {};
    const outputs: Record<string, { type: PortValueType }> = {};
    for (const node of component.nodes) {
      if (node.type === COMPONENT_INPUTS) {
        // a Component Inputs node's OUTPUT ports are the component's inputs; typed by the inputs they feed
        for (const p of (node.ports ?? []).filter((p) => p.plug === 'output' || p.plug === undefined)) {
          const wires = component.connections.filter((c) => c.fromId === node.id && c.fromProperty === p.name);
          inputs[p.name] = { type: derive(wires.map((c) => typeOfPort(nodeById.get(c.toId), c.toProperty, 'input'))) };
        }
      } else if (node.type === COMPONENT_OUTPUTS) {
        // a Component Outputs node's INPUT ports are the component's outputs; typed by the outputs that feed them
        for (const p of (node.ports ?? []).filter((p) => p.plug === 'input' || p.plug === undefined)) {
          const wires = component.connections.filter((c) => c.toId === node.id && c.toProperty === p.name);
          outputs[p.name] = { type: derive(wires.map((c) => typeOfPort(nodeById.get(c.fromId), c.fromProperty, 'output'))) };
        }
      }
    }
    const nodes: Record<string, Record<string, unknown>[]> = {};
    for (const node of component.nodes) (nodes[node.type] = nodes[node.type] ?? []).push({ ...(node.parameters ?? {}) });

    busy.delete(component.name);
    const face: PortContextComponent = { inputs, outputs, nodes };
    done.set(component.name, face);
    return face;
  };

  const out: Record<string, PortContextComponent> = {};
  for (const c of project.components) out[c.name] = interfaceOf(c);
  return out;
}

function typeName(t: unknown): PortValueType | undefined {
  if (typeof t === 'string') return t;
  if (t && typeof t === 'object' && typeof (t as { name?: unknown }).name === 'string') return (t as { name: string }).name;
  return undefined;
}
