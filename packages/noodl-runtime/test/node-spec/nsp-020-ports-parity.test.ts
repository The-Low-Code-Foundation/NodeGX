/**
 * NSP-020 — the ports-parity drive, oracle (a): `runtime-discovered` and `numbered-inputs`
 * (task §3.1 decision 5).
 *
 * The runtime announces a node's dynamic ports from a module-level `setup(context, graphModel)`
 * hook (or, for a `numberedInputs` registration, `defineNode(...).setupNumberedInputDynamicPorts`),
 * subscribed to `graphModel.on('nodeAdded.<type>')` and then the node's `parameterUpdated` /
 * `inputConnectionAdded` / `inputConnectionRemoved` (noodl-runtime.ts :663-669; nodedefinition.ts
 * :607-679). It reads the GRAPH MODEL, never a running instance — so this drive mounts nothing:
 * it fires the hook with a fake graph model built from `(params, context)`, exactly as
 * `noodl-editor/tests-unit/sb-017/cloud-ports-agree-with-the-runtime.test.ts` :124-199 does, and
 * reads the last `sendDynamicPorts`. The spec's side is `drawnPorts(spec, params, context)` minus
 * the declared static ports: what an editor would draw WITHOUT this hook ever running.
 *
 * Compared on `name`, `plug`, the type's name, `displayName`, `group`, `default` — both
 * directions (a port the runtime announces and the spec does not draw; a port the spec draws and
 * the runtime does not announce). Not compared: `index`, `tab`, `parent` (the format has no order
 * field; task §3.1). A mismatch is a §6 row (R3 (a): the runtime wins), never a bumped expectation.
 *
 * s79 drives the two mechanisms' first nodes, And (wires count: `collectPorts` :624) and String
 * Format (a `setup` hook), at the catalog's defaults and at the parameter sets the first rows
 * named. The lanes add a module table for the ~50 `setup` callers and the catalog's probes.
 *
 *   npx jest test/node-spec/nsp-020-ports-parity.test.ts
 */
import { drawnPorts, specs } from '../../../nodegx-node-spec/src';
import type { DrawnPort, PortContext } from '../../../nodegx-node-spec/src';

import NodeDefinition = require('../../src/nodedefinition');
import AndModule = require('../../src/nodes/std-library/and');
import StringFormatModule = require('../../src/nodes/std-library/stringformat');

/** One announced port as `EditorConnection.sendDynamicPorts` carries it (noodl-types `RuntimeDiscoveredPort`). */
interface Announced {
  name: string;
  plug: string;
  type?: unknown;
  displayName?: string;
  group?: string;
  default?: unknown;
  index?: number;
}

/** The shape both sides are projected to before comparing. */
interface Compared {
  name: string;
  plug: string;
  type: string | undefined;
  displayName: string | undefined;
  group: string | undefined;
  default: unknown;
}

function typeName(t: unknown): string | undefined {
  if (t === undefined || t === null) return undefined;
  if (typeof t === 'string') return t;
  if (typeof t === 'object' && 'name' in (t as object)) return String((t as { name: unknown }).name);
  return String(t);
}

function fromAnnounced(p: Announced): Compared {
  return { name: p.name, plug: p.plug, type: typeName(p.type), displayName: p.displayName, group: p.group, default: p.default };
}

function fromDrawn(p: DrawnPort): Compared {
  return { name: p.name, plug: p.plug, type: p.type, displayName: p.displayName, group: p.group, default: p.default };
}

const byName = (a: Compared, b: Compared) => (a.plug + a.name).localeCompare(b.plug + b.name);

/**
 * The fake graph model and node the hook reads: `getConnectionsTo` from `context.wired` (as the
 * runtime's `ComponentModel.connections` holds a wire — `targetId`/`targetPort`), `getNodesWithType`
 * from `context.siblings`, `getMetaData` from `context.schema`. `on` records handlers so the test
 * can fire `nodeAdded.<type>` and `editorImportComplete` (the Record and Query families sweep on it).
 */
function announcedPorts(
  hook: (context: unknown, graphModel: unknown) => void,
  type: string,
  params: Record<string, unknown>,
  context: PortContext = {}
): Announced[] {
  const id = 'n1';
  const wires = (context.wired ?? []).map((port) => ({ sourceId: 'src', sourcePort: 'out', targetId: id, targetPort: port }));
  const nodeHandlers: Record<string, Array<(e?: unknown) => void>> = {};
  const node = {
    id,
    type,
    parameters: { ...params },
    component: {
      name: '/spec',
      getConnectionsTo: (nodeId: string) => wires.filter((c) => c.targetId === nodeId),
      getConnectionsFrom: (nodeId: string) => wires.filter((c) => c.sourceId === nodeId),
      on: () => undefined
    },
    outputPorts: {} as Record<string, unknown>,
    on: (name: string, cb: (e?: unknown) => void) => {
      (nodeHandlers[name] = nodeHandlers[name] || []).push(cb);
    }
  };
  const siblings = Object.entries(context.siblings ?? {}).flatMap(([t, nodes]) => nodes.map((n, i) => ({ id: `${t}#${i}`, type: t, parameters: { ...n.params } })));
  const gmHandlers: Record<string, Array<(n?: unknown) => void>> = {};
  const graphModel = {
    getNodesWithType: (t: string) => (t === type ? [node] : siblings.filter((n) => n.type === t)),
    getMetaData: (key: string) => (context.schema ? ({ dbCollections: Object.keys(context.schema.classes) } as Record<string, unknown>)[key] : undefined),
    on: (name: string, cb: (n?: unknown) => void) => {
      (gmHandlers[name] = gmHandlers[name] || []).push(cb);
    },
    fire: (name: string, arg?: unknown) => (gmHandlers[name] || []).forEach((cb) => cb(arg))
  };
  const announcements: Announced[][] = [];
  const editorConnection = {
    isRunningLocally: () => true,
    sendDynamicPorts: (_id: string, ports: Announced[]) => {
      announcements.push(ports);
    },
    sendWarning: () => undefined,
    clearWarning: () => undefined
  };
  hook({ editorConnection }, graphModel);
  graphModel.fire('nodeAdded.' + type, node);
  graphModel.fire('editorImportComplete');
  // the LAST announcement is what the editor holds (sendDynamicPorts replaces the list; NodeGraphNode.ts setDynamicPorts)
  return announcements.length ? announcements[announcements.length - 1] : [];
}

/** The spec's dynamic ports for these params: what `drawnPorts` adds beyond the declared static list. */
function specDynamicPorts(type: string, params: Record<string, unknown>, context: PortContext = {}): Compared[] {
  const spec = specs[type];
  if (!spec) throw new Error(`no spec for ${type}`);
  return drawnPorts(spec, params, context)
    .filter((p) => p.source === 'derived')
    .map(fromDrawn)
    .sort(byName);
}

function numberedHook(mod: { node: unknown }) {
  const defined = NodeDefinition.defineNode(mod.node as never) as unknown as { setupNumberedInputDynamicPorts?: (c: unknown, g: unknown) => void };
  if (!defined.setupNumberedInputDynamicPorts) throw new Error('no numbered-inputs hook on the registration');
  return defined.setupNumberedInputDynamicPorts;
}

describe('NSP-020 oracle (a): what the runtime announces is what the spec draws', () => {
  describe('And (numbered-inputs — nodedefinition.ts collectPorts)', () => {
    const hook = numberedHook(AndModule as unknown as { node: unknown });
    const cases: Array<[string, Record<string, unknown>, PortContext]> = [
      ['the catalog defaults', {}, {}],
      ['input 1 set', { 'input 1': true }, {}],
      ['a gap: input 4 set, input 3 empty', { 'input 4': false }, {}],
      ['a WIRE on input 3 and no param', {}, { wired: ['input 3'] }],
      ['a param and a higher wire', { 'input 0': true }, { wired: ['input 2'] }],
      ['a wire on a non-numbered port counts nothing', {}, { wired: ['result'] }]
    ];
    test.each(cases)('%s', (_name, params, context) => {
      const runtime = announcedPorts(hook, 'And', params, context).map(fromAnnounced).sort(byName);
      expect(runtime.length).toBeGreaterThan(0); // never two empty lists agreeing
      expect(specDynamicPorts('And', params, context)).toEqual(runtime);
    });

    test('PLANTED: the s79 spec, counting params alone, is red on the wire case', () => {
      // what And's `derived.inputs` was before s79 — the first thing this drive found
      const paramsOnly = {
        ...specs['And'],
        derived: {
          ...specs['And'].derived!,
          inputs: (params: Readonly<Record<string, unknown>>) => specs['And'].derived!.inputs(params, {})
        }
      };
      const context = { wired: ['input 3'] };
      const runtime = announcedPorts(hook, 'And', {}, context).map(fromAnnounced).sort(byName);
      const spec = drawnPorts(paramsOnly, {}, context).filter((p) => p.source === 'derived').map(fromDrawn).sort(byName);
      expect(runtime.map((p) => p.name)).toEqual(['input 0', 'input 1', 'input 2', 'input 3', 'input 4']);
      expect(spec.map((p) => p.name)).toEqual(['input 0']);
      expect(spec).not.toEqual(runtime);
    });
  });

  describe('String Format (runtime-discovered — a setup hook)', () => {
    const hook = (StringFormatModule as unknown as { setup: (c: unknown, g: unknown) => void }).setup;
    const cases: Array<[string, Record<string, unknown>]> = [
      ['the catalog defaults', {}],
      ['two placeholders', { format: 'Hi {name}, {n} new' }],
      ['a repeated placeholder', { format: '{a} and {a}' }],
      ['the empty placeholder and a hyphen', { format: '{} {first-name} {a_1}' }],
      ['no placeholders', { format: 'plain' }]
    ];
    test.each(cases)('%s', (_name, params) => {
      const runtime = announcedPorts(hook, 'String Format', params).map(fromAnnounced).sort(byName);
      // a format with a `{` names at least one port on both sides — the empty cases are the two without one
      if (String(params.format ?? '').includes('{')) expect(runtime.length).toBeGreaterThan(0);
      expect(specDynamicPorts('String Format', params)).toEqual(runtime);
    });

    test('PLANTED: a spec that draws only the first placeholder is red', () => {
      const firstOnly = {
        ...specs['String Format'],
        derived: {
          ...specs['String Format'].derived!,
          inputs: (params: Readonly<Record<string, unknown>>, context: PortContext) =>
            Object.fromEntries(Object.entries(specs['String Format'].derived!.inputs(params, context)).slice(0, 1))
        }
      };
      const params = { format: '{a} then {b}' };
      const runtime = announcedPorts(hook, 'String Format', params).map(fromAnnounced).sort(byName);
      const spec = drawnPorts(firstOnly, params).filter((p) => p.source === 'derived').map(fromDrawn).sort(byName);
      expect(runtime.map((p) => p.name)).toEqual(['a', 'b']);
      expect(spec.map((p) => p.name)).toEqual(['a']);
      expect(spec).not.toEqual(runtime);
    });
  });
});
