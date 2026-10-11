/**
 * NSP-020 oracle (a) — the drive's machinery, shared by `nsp-020-ports-parity.test.ts` (task §3.1 decision 5).
 *
 * `announcedPorts` fires a module's `setup(context, graphModel)` hook (or a `numberedInputs` registration's
 * `setupNumberedInputDynamicPorts`) against a fake graph model built from `(params, context)` and reads the LAST
 * `sendDynamicPorts` — the list the editor holds (`NodeGraphNode.ts setDynamicPorts` replaces it). `compareWithSpec`
 * lays that announcement over the spec's `drawnPorts` the way the editor lays it over the registration
 * (`getPorts` → `replaceOrAppendPorts`, NodeGraphNode.ts :505-566):
 *
 *   - an announced port under a name and plug the spec DECLARES replaces that port — the `runtime-narrowed` mechanism.
 *     It is compared with the declared port as `drawnPorts` draws it for these params (after `when` and `narrow`);
 *   - every other announced port must be one the spec DERIVES for these params, and every derived port must be announced.
 *
 * Compared on `name`, `plug`, the type's name, `displayName`, `group`, `default` — and, for a replaced declared port,
 * the enum's values (a `narrow` that returns the wrong enums is the thing it is there to catch). Not compared: `index`,
 * `tab`, `parent` (the format has no order field), an enum's labels (the format's `enums` are values only).
 */
import {
  drawnPorts,
  OUTCOME_PORTS,
  specs,
  type AnyNodeSpec,
  type DrawnPort,
  type PortContext,
  type ValueInputDecl
} from '../../../nodegx-node-spec/src';
import { dataAttributeNames } from '../../../nodegx-node-spec/src/nodes/data-attributes';

/** One announced port as `EditorConnection.sendDynamicPorts` carries it (noodl-types `RuntimeDiscoveredPort`). */
export interface Announced {
  name: string;
  plug: string;
  type?: unknown;
  displayName?: string;
  group?: string;
  default?: unknown;
  index?: number;
}

/** The shape both sides are projected to before comparing. */
export interface Compared {
  name: string;
  plug: string;
  type: string | undefined;
  displayName: string | undefined;
  group: string | undefined;
  default: unknown;
}

export function typeName(t: unknown): string | undefined {
  if (t === undefined || t === null) return undefined;
  if (typeof t === 'string') return t;
  if (typeof t === 'object' && 'name' in (t as object)) return String((t as { name: unknown }).name);
  return String(t);
}

function enumValues(t: unknown): string[] | undefined {
  if (!t || typeof t !== 'object' || !Array.isArray((t as { enums?: unknown }).enums)) return undefined;
  return (t as { enums: unknown[] }).enums.map((e) =>
    e && typeof e === 'object' && 'value' in (e as object) ? String((e as { value: unknown }).value) : String(e)
  );
}

export function fromAnnounced(p: Announced): Compared {
  return {
    name: p.name,
    plug: p.plug,
    type: typeName(p.type),
    displayName: p.displayName,
    group: p.group,
    default: p.default
  };
}

export function fromDrawn(p: DrawnPort): Compared {
  return { name: p.name, plug: p.plug, type: p.type, displayName: p.displayName, group: p.group, default: p.default };
}

export const byName = (a: Compared, b: Compared) => (a.plug + a.name).localeCompare(b.plug + b.name);

export type Hook = (context: unknown, graphModel: unknown) => void;

/**
 * The fake graph model and node the hook reads: `getConnectionsTo` from `context.wired` (as the runtime's
 * `ComponentModel.connections` holds a wire — `targetId`/`targetPort`), `getNodesWithType` from `context.siblings`,
 * `getMetaData('dbCollections')` from `context.schema`. `on` records handlers so the drive can fire `nodeAdded.<type>`
 * and `editorImportComplete` (the Record and Query families sweep on it).
 */
/** The spec's `BackendSchema` field types as the Parse wire names them (record-ports.ts `PARSE_PORT_TYPES` :63-68 maps them back). */
const PARSE_TYPE_OF: Record<string, string> = { string: 'String', number: 'Number', boolean: 'Boolean', date: 'Date', object: 'Object', array: 'Array' };

export function announcedPorts(
  hook: Hook,
  type: string,
  params: Record<string, unknown>,
  context: PortContext = {},
  /** Project metadata `PortContext` has no field for (the backend list, `backendServices`) — a case that needs it is a row. */
  meta: Record<string, unknown> = {}
): Announced[] {
  const id = 'n1';
  const wires = [
    ...(context.wired ?? []).map((port) => ({ sourceId: 'src', sourcePort: 'out', targetId: id, targetPort: port })),
    // NSP-020 s82 — the wires OUT (`context.wiredOutputs`): what `getConnectionsFrom(id)` answers (record-ports.ts :305-308)
    ...(context.wiredOutputs ?? []).map((port) => ({ sourceId: id, sourcePort: port, targetId: 'sink', targetPort: 'in' }))
  ];
  // NSP-020 s82 — project metadata from the context: the backend list (`backendServices`, P107-S80-BACKENDPICKER) from
  // `context.backends`, the schema as the legacy `dbCollections` cache holds it (schema-ports.ts :323-408 parses the
  // Parse class list, `collectionsFromParseClasses`), one class per `context.schema.classes` entry with its fields typed
  // by the Parse table (record-ports.ts :63-68). A `meta` key the case names wins.
  const fromContext: Record<string, unknown> = {};
  if (context.backends) {
    fromContext.backendServices = {
      backends: context.backends.map((b) => ({ id: b.id, name: b.name, type: 'parse', endpoint: `https://${b.id}.example/parse`, appId: b.id })),
      activeBackendId: context.backends[0]?.id
    };
  }
  if (context.schema) {
    fromContext.dbCollections = Object.entries(context.schema.classes).map(([className, c]) => ({
      className,
      fields: Object.fromEntries(Object.entries(c.fields).map(([f, d]) => [f, { type: PARSE_TYPE_OF[d.type] ?? 'Object' }]))
    }));
  }
  const nodeHandlers: Record<string, Array<(e?: unknown) => void>> = {};
  const node = {
    id,
    type,
    parameters: { ...params },
    component: {
      name: '/spec',
      getConnectionsTo: (nodeId: string) => wires.filter((c) => c.targetId === nodeId),
      getConnectionsFrom: (nodeId: string) => wires.filter((c) => c.sourceId === nodeId),
      getNodesWithType: () => [],
      on: () => undefined
    },
    inputPorts: {} as Record<string, unknown>,
    outputPorts: {} as Record<string, unknown>,
    on: (name: string, cb: (e?: unknown) => void) => {
      (nodeHandlers[name] = nodeHandlers[name] || []).push(cb);
    }
  };
  const siblings = Object.entries(context.siblings ?? {}).flatMap(([t, nodes]) =>
    nodes.map((n, i) => ({ id: `${t}#${i}`, type: t, parameters: { ...n.params }, on: () => undefined }))
  );
  const gmHandlers: Record<string, Array<(n?: unknown) => void>> = {};
  const graphModel = {
    components: {} as Record<string, unknown>,
    getNodesWithType: (t: string) => (t === type ? [node] : siblings.filter((n) => n.type === t)),
    getMetaData: (key: string) => (key in meta ? meta[key] : fromContext[key]),
    on: (name: string, cb: (n?: unknown) => void) => {
      (gmHandlers[name] = gmHandlers[name] || []).push(cb);
    },
    fire: (name: string, arg?: unknown) => (gmHandlers[name] || []).slice().forEach((cb) => cb(arg))
  };
  const announcements: Announced[][] = [];
  const editorConnection = {
    isRunningLocally: () => true,
    isConnected: () => false,
    sendDynamicPorts: (nodeId: string, ports: Announced[]) => {
      if (nodeId === id) announcements.push(ports);
    },
    sendWarning: () => undefined,
    clearWarning: () => undefined,
    sendNodeSubLabel: () => undefined
  };
  hook({ editorConnection }, graphModel);
  graphModel.fire('nodeAdded.' + type, node);
  graphModel.fire('editorImportComplete');
  // the LAST announcement is what the editor holds (sendDynamicPorts replaces the list; NodeGraphNode.ts setDynamicPorts)
  return announcements.length ? announcements[announcements.length - 1] : [];
}

/** The spec's dynamic ports for these params: what `drawnPorts` adds beyond the declared static list. */
export function specDynamicPorts(type: string, params: Record<string, unknown>, context: PortContext = {}): Compared[] {
  const spec = specs[type];
  if (!spec) throw new Error(`no spec for ${type}`);
  return drawnPorts(spec, params, context)
    .filter((p) => p.source === 'derived')
    .map(fromDrawn)
    .sort(byName);
}

/** One disagreement, said in a line: `<plug> <name>: <what>`. */
export type Diff = string;

const FIELDS = ['type', 'displayName', 'group', 'default'] as const;

function show(v: unknown): string {
  return v === undefined ? 'unset' : JSON.stringify(v);
}

/**
 * The ports the editor derives ON READ from a rule in the registration, not from any `setup` hook: a visual node's
 * `dataAttributes` list (`namedports/derived`, react-component-node.ts :808-830 — "derived by the editor on read, so it
 * never competes with a node's own `sendDynamicPorts`"). A spec draws them as derived ports; this oracle does not ask the
 * hook for them.
 */
export function editorRulePorts(params: Record<string, unknown>): Set<string> {
  return new Set(dataAttributeNames(params.dataAttributes).map((n) => 'input ' + n));
}

/**
 * The announcement laid over the spec as the editor lays it over the registration (see the module docblock). Empty is
 * agreement. `announced` is what the runtime sent; the spec side is `drawnPorts(spec, params, context)`.
 *
 * Three shapes the editor reads that are not one plain port each: a port announced with `plug: 'input/output'` is an
 * input AND an output of that name (the Object family's `prop-<p>`); an output named by the spec's `outcomes` (ERG-001:
 * `done`, `completed`, and `unchanged` / `failure` when listed) is the registration's outcome port, which `drawnPorts`
 * does not draw — compared on its type only, and counted in `outcomePorts`; a port of `editorRulePorts` is skipped.
 */
export function compareWithSpec(
  spec: AnyNodeSpec,
  announced: readonly Announced[],
  params: Record<string, unknown>,
  context: PortContext = {},
  tally: { outcomePorts: number; editorRule: number } = { outcomePorts: 0, editorRule: 0 }
): Diff[] {
  const drawn = drawnPorts(spec, params, context);
  const key = (plug: string, name: string) => plug + ' ' + name;
  const drawnBy = new Map(drawn.map((p) => [key(p.plug, p.name), p]));
  const declares = (plug: string, name: string) => (plug === 'input' ? name in spec.inputs : name in spec.outputs);
  const outcomes = new Set<string>(
    spec.outcomes && spec.outcomes.length ? ['done', 'completed', ...spec.outcomes] : []
  );
  const ruled = editorRulePorts(params);
  const expanded = announced.flatMap((a) =>
    a.plug === 'input/output'
      ? [
          { ...a, plug: 'input' },
          { ...a, plug: 'output' }
        ]
      : [a]
  );
  const diffs: Diff[] = [];
  const seen = new Set<string>();
  for (const a of expanded) {
    const k = key(a.plug, a.name);
    if (seen.has(k)) diffs.push(`${k}: announced twice`);
    seen.add(k);
    const d = drawnBy.get(k);
    if (!d) {
      if (a.plug === 'output' && outcomes.has(a.name) && OUTCOME_PORTS.includes(a.name as never)) {
        tally.outcomePorts++;
        if (typeName(a.type) !== 'signal') diffs.push(`${k}: an outcome port announced as ${show(typeName(a.type))}`);
        continue;
      }
      diffs.push(
        `${k}: announced; the spec ${
          declares(a.plug, a.name) ? 'declares it but does not draw it for these params' : 'does not draw it'
        }`
      );
      continue;
    }
    const got = fromAnnounced(a);
    const want = fromDrawn(d);
    // s82 — `drawnPorts` draws the outcome ports now (§6.4 gap 1); a node may group them its own way (`outcomeOutputs({ group })`),
    // which the spec does not say, so they are compared on their type alone, as before
    if (a.plug === 'output' && outcomes.has(a.name) && OUTCOME_PORTS.includes(a.name as never)) {
      tally.outcomePorts++;
      if (got.type !== 'signal') diffs.push(`${k}: an outcome port announced as ${show(got.type)}`);
      continue;
    }
    for (const f of FIELDS) {
      if (JSON.stringify(got[f]) !== JSON.stringify(want[f]))
        diffs.push(`${k}: ${f} runtime ${show(got[f])}, spec ${show(want[f])}`);
    }
    if (d.source === 'declared') {
      const re = enumValues(a.type);
      if (re !== undefined || d.enums !== undefined) {
        if (JSON.stringify(re) !== JSON.stringify(d.enums ? [...d.enums] : undefined))
          diffs.push(`${k}: enums runtime ${show(re)}, spec ${show(d.enums)}`);
      }
    }
  }
  for (const d of drawn) {
    const k = key(d.plug, d.name);
    if (seen.has(k)) continue;
    if (d.source === 'derived') {
      if (ruled.has(k)) {
        tally.editorRule++;
        continue;
      }
      diffs.push(`${k}: the spec draws it; the runtime does not announce it`);
      continue;
    }
    // a declared port the spec NARROWS for these params must be announced too, or the editor keeps the static one
    const input = d.plug === 'input' ? spec.inputs[d.name] : undefined;
    const decl = input && input.type !== 'signal' ? (input as ValueInputDecl) : undefined;
    if (decl && decl.narrow) {
      const moved = (['type', 'enums', 'default'] as const).filter(
        (f) => JSON.stringify((d as unknown as Record<string, unknown>)[f]) !== JSON.stringify(decl[f])
      );
      if (moved.length) diffs.push(`${k}: the spec narrows it (${moved.join(', ')}); the runtime does not announce it`);
    }
  }
  return diffs;
}
