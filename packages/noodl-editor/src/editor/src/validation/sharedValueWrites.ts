/**
 * P112 OWN-026 FIX-03 C — the two shapes of a save that loses or doubles a change, said where the
 * graph is written, as a result rather than a rule.
 *
 * The lessons were in the guidance, and a model that read them argued them away ("contention is
 * negligible", "double presses are a minor risk"). So the write's own answer says so, about the
 * node it was just given, with the one-node repair:
 *
 * 1. **`shared-value-written-back-whole`** — an Update Record's `prop-X` is worked out (through at
 *    least one node: a Function, an Expression) from `prop-X` of a Record of the same class. That is
 *    read, change, write back whole: two tabs or devices that save it overwrite each other. The
 *    repair is `addTo` (the backend adds the change) or, for a value that is not a count,
 *    `onlyIfUnchanged`. Silent when the field is already in either list, or under Local only. A
 *    Record wired straight into the same field is a copy, not a change, and is left alone.
 * 2. **`two-controls-start-one-save`** — two press controls (a Button's Click, a Text Input's On
 *    Enter) reach the same saving node's `Do` through DIFFERENT first nodes. The runtime takes a
 *    press that saves once (`@noodl/runtime/src/pressguard`), and controls wired to the same node
 *    share that guard; wired to different nodes, one press of each still saves twice. Silent when
 *    every control's press goes into the same node, and for a control that opted out
 *    (`repeatWhileSaving`).
 *
 * **Info, never blocking.** Both shapes have correct uses (a field only one device ever writes;
 * two buttons meant to save twice), and the graph cannot tell them apart. What it can do is say it
 * at the moment the decision is made.
 *
 * The walks are bounded (three hops back) and stay inside the component: what crosses a component
 * boundary is not claimed. Pure: the caller supplies nodes and wires.
 *
 * @module noodl-editor/validation/sharedValueWrites
 */

import { DiagnosticCode, type Diagnostic } from './diagnostics';
import type { FunctionWireLike } from './functionPorts';
import type { ParameterizedNode } from './parameterValues';

/** Update Record's stored type name. */
export const UPDATE_RECORD_TYPE = 'SetDbModelProperties';
/** Record's stored type name. */
export const RECORD_TYPE = 'DbModel2';

/** The nodes whose `store` (Do) writes to the backend. */
const SAVING_TYPES = new Set([
  'SetDbModelProperties',
  'NewDbModelProperties',
  'DeleteDbModelProperties',
  'AddDbModelRelation',
  'RemoveDbModelRelation'
]);

/** The press signals the runtime guards, by control type (`controls/utils.ts` `addTakenOnceWhileSaving`). */
const PRESS_OUTPUTS: Readonly<Record<string, string>> = {
  'net.noodl.controls.button': 'onClick',
  'net.noodl.controls.textinput': 'onEnter'
};

const PROP = 'prop-';
const MAX_HOPS = 3;

/** `addTo` / `onlyIfUnchanged` as the runtime parses them. */
function names(value: unknown): string[] {
  return typeof value === 'string'
    ? value
        .split(',')
        .map((n) => n.trim())
        .filter((n) => n !== '')
    : [];
}

function labelOf(node: ParameterizedNode | undefined): string {
  return node ? (node.label ? `"${node.label}"` : node.type) : '?';
}

export interface CheckSharedValueWritesOptions {
  /** Legacy name of the component being submitted. */
  component: string;
  /** Every connection in the component. */
  wires?: readonly FunctionWireLike[];
}

export function checkSharedValueWrites(
  nodes: readonly ParameterizedNode[],
  options: CheckSharedValueWritesOptions
): Diagnostic[] {
  const { component, wires } = options;
  if (!wires || wires.length === 0) return [];
  const byId = new Map(nodes.map((n) => [n.id, n] as const));
  const into = (id: string) => wires.filter((w) => w.toId === id);
  const diagnostics: Diagnostic[] = [];

  for (const node of nodes) {
    if (node.type === UPDATE_RECORD_TYPE) diagnostics.push(...writtenBackWhole(node));
    if (SAVING_TYPES.has(node.type)) diagnostics.push(...twoControls(node));
  }
  return diagnostics;

  /**
   * Shape 1. For each `prop-X` wired into the Update Record, walk back up to {@link MAX_HOPS}
   * nodes; a Record of the same class whose `prop-X` feeds the walk (not directly) is the read.
   */
  function writtenBackWhole(update: ParameterizedNode): Diagnostic[] {
    const params = update.parameters ?? {};
    if (params['storeType'] === 'local') return [];
    const collection = params['collectionName'];
    if (typeof collection !== 'string' || collection === '') return [];
    const guarded = new Set([...names(params['addTo']), ...names(params['onlyIfUnchanged'])]);

    const found: { field: string; record: ParameterizedNode; via: ParameterizedNode }[] = [];
    for (const wire of into(update.id)) {
      if (!wire.toProperty.startsWith(PROP)) continue;
      const field = wire.toProperty.slice(PROP.length);
      if (guarded.has(field)) continue;
      const first = byId.get(wire.fromId);
      if (!first || first.type === RECORD_TYPE) continue; // a copy, not a change
      const record = readBack(first.id, PROP + field, collection, new Set([update.id]), 1);
      if (record) found.push({ field, record, via: first });
    }
    if (found.length === 0) return [];

    const fields = found.map((f) => f.field);
    const quoted = fields.map((f) => `"${f}"`).join(', ');
    const first = found[0];
    return [
      {
        code: DiagnosticCode.SharedValueWrittenBackWhole,
        severity: 'info',
        message:
          `This Update Record writes ${quoted} worked out from the ${quoted} the page read ` +
          `(Record ${labelOf(first.record)}, through ${labelOf(first.via)}). Two tabs or devices that save it ` +
          'overwrite each other, and two quick saves both count from the same old value. For a count, score, ' +
          'balance or progress, name the field in Add To and wire the CHANGE (1, -1) instead of the new total: ' +
          'the backend adds it in one step (example cloud-shared-counter). For a value that is not a count, set ' +
          'Only If Unchanged so a write over a newer one is refused.',
        location: {
          component,
          nodeId: update.id,
          nodeType: update.type,
          ...(update.label ? { nodeLabel: update.label } : {}),
          port: PROP + first.field,
          plug: 'input' as const
        },
        suggestion: `"addTo": "${fields.join(', ')}"`
      }
    ];
  }

  /** The Record of `collection` whose `port` reaches `nodeId`'s inputs within the hop budget, if any. */
  function readBack(
    nodeId: string,
    port: string,
    collection: string,
    seen: Set<string>,
    hops: number
  ): ParameterizedNode | undefined {
    if (seen.has(nodeId)) return undefined;
    seen.add(nodeId);
    for (const wire of into(nodeId)) {
      const from = byId.get(wire.fromId);
      if (!from) continue;
      if (from.type === RECORD_TYPE) {
        if (wire.fromProperty === port && (from.parameters ?? {})['collectionName'] === collection) return from;
        continue;
      }
      if (hops < MAX_HOPS) {
        const hit = readBack(from.id, port, collection, seen, hops + 1);
        if (hit) return hit;
      }
    }
    return undefined;
  }

  /** Shape 2. The press controls that reach the saving node's `store`, each with the first node it presses. */
  function twoControls(save: ParameterizedNode): Diagnostic[] {
    const presses: { control: ParameterizedNode; target: string }[] = [];
    const seen = new Set<string>();
    const walk = (nodeId: string, port: string | undefined, hops: number) => {
      const key = nodeId + '|' + (port ?? '*');
      if (seen.has(key)) return;
      seen.add(key);
      for (const wire of into(nodeId)) {
        if (port !== undefined && wire.toProperty !== port) continue;
        const from = byId.get(wire.fromId);
        if (!from) continue;
        const press = PRESS_OUTPUTS[from.type];
        if (press !== undefined && wire.fromProperty === press) {
          if ((from.parameters ?? {})['repeatWhileSaving'] !== true) presses.push({ control: from, target: nodeId });
          continue;
        }
        if (hops < MAX_HOPS && !(from.type in PRESS_OUTPUTS)) walk(from.id, undefined, hops + 1);
      }
    };
    walk(save.id, 'store', 1);

    const controls = new Map<string, { control: ParameterizedNode; targets: Set<string> }>();
    for (const p of presses) {
      const entry = controls.get(p.control.id) ?? { control: p.control, targets: new Set<string>() };
      entry.targets.add(p.target);
      controls.set(p.control.id, entry);
    }
    if (controls.size < 2) return [];
    const targets = new Set(presses.map((p) => p.target));
    if (targets.size < 2) return [];

    const list = [...controls.values()].map((c) => labelOf(c.control)).join(' and ');
    return [
      {
        code: DiagnosticCode.TwoControlsStartOneSave,
        severity: 'info',
        message:
          `${list} both start this save, wired into different nodes. A press that saves is taken once, and ` +
          'controls wired to the same node share that; wired to different nodes, one press of each saves twice ' +
          "(a click on the button, then Enter in the field). Wire both into the same node: the same Function's " +
          'Run, or this Do.',
        location: {
          component,
          nodeId: save.id,
          nodeType: save.type,
          ...(save.label ? { nodeLabel: save.label } : {}),
          port: 'store',
          plug: 'input' as const
        }
      }
    ];
  }
}
