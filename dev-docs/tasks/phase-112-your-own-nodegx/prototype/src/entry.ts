import { GraphRun, type NodeDecl, type WireDecl } from './graphrun';
import { nodes, wires } from './app';
import { specs } from '../../../../../packages/nodegx-node-spec/src/nodes';
import picker from './picker.json';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
export function create() {
  return new GraphRun(clone(nodes), wires.map((w) => ({ ...w })));
}
/** A fresh graph from any node and wire lists: what a mission check plays its scenario on. */
export function createFrom(n: Record<string, NodeDecl>, w: WireDecl[]) {
  return new GraphRun(clone(n), w.map((x) => ({ ...x })));
}
export { nodes, wires, picker };
export const specCount = Object.keys(specs).length;
export const hasDerived = (type: string) => !!(specs as Record<string, { derived?: unknown }>)[type]?.derived;

/** What a node's spec says about each port, with the node's live values beside it. */
export function describe(g: GraphRun, id: string) {
  const inst = g.inst[id];
  const s = inst.spec;
  const ins = { ...s.inputs, ...inst.derivedInputs } as Record<string, any>;
  const outs = { ...s.outputs, ...inst.derivedOutputs } as Record<string, any>;
  const inVal = { ...inst.inputs, ...inst.derivedValues } as Record<string, unknown>;
  return {
    type: s.type,
    source: s.source,
    needs: [...(s.needs ?? [])],
    derived: !!s.derived,
    inputs: Object.entries(ins).map(([name, d]) => ({ name, label: d.displayName ?? name, description: d.description ?? '', signal: d.type === 'signal', type: d.type, enums: d.enums, value: inVal[name] })),
    outputs: Object.entries(outs).map(([name, d]) => ({ name, label: d.displayName ?? name, description: d.description ?? '', signal: d.type === 'signal', type: d.type, value: g.outputs[id][name] }))
  };
}
