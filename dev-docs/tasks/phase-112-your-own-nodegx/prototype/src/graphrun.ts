/**
 * A tiny graph runner over @nodegx/node-spec's per-node interpreter.
 *
 * The spec package runs ONE node; how values and signals cross wires is a target's business
 * (graph.ts: "this package has no graph interpreter"). This is the smallest one that works:
 * each frame, every node settles; every value/signal a settle recorded is carried along its
 * wires to the receivers (set / signal); repeat until a wave carries nothing. It is NOT the
 * runtime's scheduler (per-setter delivery inside one pass, CONTRACT C7) — it is wave-at-a-time.
 */
import { advance, mount, set, settle, signal, type Instance } from '../../../../../packages/nodegx-node-spec/src/interpreter';
import { specFor } from '../../../../../packages/nodegx-node-spec/src/nodes';
import { World } from '../../../../../packages/nodegx-node-spec/src/world';

export interface NodeDecl {
  type: string;
  params?: Record<string, unknown>;
  label?: string;
}
export interface WireDecl {
  from: string; // "node.port"
  to: string;
  /** Drawn as the loop back to the start; ignored by the runner. */
  feedback?: boolean;
}
/** One thing that moved along a wire this frame. */
export interface Fire {
  wire: number;
  /** `"<from>><to>"` — stable while wires come and go. */
  key: string;
  kind: 'value' | 'signal';
  value?: unknown;
}
/** One thing a node recorded this frame (for the inspector). */
export interface Rec {
  node: string;
  kind: 'value' | 'signal' | 'outcome';
  port: string;
  value?: unknown;
}

const split = (s: string) => {
  const i = s.indexOf('.');
  return { node: s.slice(0, i), port: s.slice(i + 1) };
};

export class GraphRun {
  readonly inst: Record<string, Instance> = {};
  readonly outputs: Record<string, Record<string, unknown>> = {};
  readonly wires: { from: { node: string; port: string }; to: { node: string; port: string } }[];
  private clocked: string[] = [];

  constructor(readonly nodes: Record<string, NodeDecl>, wires: WireDecl[]) {
    this.wires = wires.map((w) => ({ from: split(w.from), to: split(w.to) }));
    for (const [id, n] of Object.entries(nodes)) {
      const spec = specFor(n.type);
      if (!spec) throw new Error(`no spec for ${n.type}`);
      this.inst[id] = mount(spec, n.params ?? {}, new World());
      this.outputs[id] = {};
      if ((spec.needs ?? []).includes('clock')) this.clocked.push(id);
    }
  }

  /** A node placed while the graph runs: mounted as a loaded project's would be, settled with the next frame. */
  addNode(id: string, decl: NodeDecl) {
    const spec = specFor(decl.type);
    if (!spec) throw new Error(`no spec for ${decl.type}`);
    if (this.inst[id]) throw new Error(`${id} exists`);
    this.nodes[id] = decl;
    this.inst[id] = mount(spec, decl.params ?? {}, new World());
    this.outputs[id] = {};
    if ((spec.needs ?? []).includes('clock')) this.clocked.push(id);
  }
  removeNode(id: string) {
    for (let i = this.wires.length - 1; i >= 0; i--) if (this.wires[i].from.node === id || this.wires[i].to.node === id) this.wires.splice(i, 1);
    delete this.inst[id];
    delete this.outputs[id];
    delete this.nodes[id];
    this.clocked = this.clocked.filter((c) => c !== id);
  }
  /**
   * A wire made while the graph runs. Like the runtime's connectInput, making it hands the
   * receiver the source's current value (CONTRACT C11) — a value wire, never a signal.
   */
  addWire(from: string, to: string) {
    const w = { from: split(from), to: split(to) };
    if (this.wires.some((x) => `${x.from.node}.${x.from.port}` === from && `${x.to.node}.${x.to.port}` === to)) return;
    this.wires.push(w);
    const out = this.inst[w.from.node].spec.outputs[w.from.port] ?? this.inst[w.from.node].derivedOutputs[w.from.port];
    const current = this.outputs[w.from.node][w.from.port];
    if (out && out.type !== 'signal' && current !== undefined) set(this.inst[w.to.node], w.to.port, current);
  }
  removeWire(from: string, to: string) {
    const i = this.wires.findIndex((x) => `${x.from.node}.${x.from.port}` === from && `${x.to.node}.${x.to.port}` === to);
    if (i >= 0) this.wires.splice(i, 1);
  }

  /** A press from outside (a button in the prototype). */
  poke(id: string, port: string) {
    signal(this.inst[id], port);
  }
  write(id: string, port: string, value: unknown) {
    set(this.inst[id], port, value);
  }

  /** Move every clocked node's world by `ms`, then settle in waves until nothing moves. */
  frame(ms: number): { fires: Fire[]; recs: Rec[] } {
    for (const id of this.clocked) if (ms > 0) advance(this.inst[id], ms);
    const fires: Fire[] = [];
    const recs: Rec[] = [];
    for (let wave = 0; wave < 32; wave++) {
      const sent: Rec[] = [];
      for (const [id, inst] of Object.entries(this.inst)) {
        const from = inst.trace.length;
        settle(inst);
        for (const e of inst.trace.slice(from)) {
          if (e.t === 'value') {
            this.outputs[id][e.port] = e.value;
            sent.push({ node: id, kind: 'value', port: e.port, value: e.value });
          } else if (e.t === 'signal') sent.push({ node: id, kind: 'signal', port: e.port });
          else if (e.t === 'outcome') sent.push({ node: id, kind: 'outcome', port: e.port, value: e.value });
        }
        // the trace is the recording; the prototype only needs this frame's slice
        (inst.trace as unknown[]).length = 0;
      }
      if (!sent.length) break;
      recs.push(...sent);
      for (const r of sent) {
        if (r.kind === 'outcome') continue;
        this.wires.forEach((w, i) => {
          if (w.from.node !== r.node || w.from.port !== r.port) return;
          if (r.kind === 'value') set(this.inst[w.to.node], w.to.port, r.value);
          else signal(this.inst[w.to.node], w.to.port);
          fires.push({ wire: i, key: `${w.from.node}.${w.from.port}>${w.to.node}.${w.to.port}`, kind: r.kind, value: r.value });
        });
      }
    }
    return { fires, recs };
  }
}
