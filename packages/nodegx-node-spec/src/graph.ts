/**
 * Graph scenarios (phase 107, NSP-008): the rules for how values and signals move BETWEEN nodes —
 * `packages/nodegx-core/CONTRACT.md` C1–C11 — graded the same way as one node's rules.
 *
 * A graph scenario is a small graph (2–6 picker nodes) as JSON: nodes by id, wires by port, a
 * scripted stimulus, and the trace the runtime produced for it (`expect`). It is tagged with the
 * clauses it grades; `tests/graph.test.ts` fails when a clause has none (AC1).
 *
 * WHO IS THE REFERENCE. For a single node the spec interpreter is (NSP-003). A graph's semantics
 * are the runtime's — the contract was READ from node.ts, clause by clause — and this package has
 * no graph interpreter (it would be a second runtime; a stranger may build one, NSP-006). So a
 * graph scenario carries its `expect` trace RECORDED from the runtime (the runtime test's record
 * mode writes it), and every other target is graded against that. Circularity is broken by
 * `claims`: the clause's own sentence as a checkable fact about the trace ("at the second settle
 * `c` reads 3", "`b` pulsed twice") — hand-written from the clause, checked against `expect` in
 * this package's tests and against every target's trace by the runner. A recorded trace that
 * fails its claim is a finding, never a claim to edit.
 *
 * THE GRAPH TRACE is one stream, every event carrying `subject` (the node id; trace.ts left that
 * door open in NSP-002). Between two settles the runtime's canonical grouping holds PER NODE, and
 * nodes come in DECLARATION ORDER (the order of the `nodes` object's keys) — a rule of the
 * format, like port-name order inside a node: something every target can compute. One `settle`
 * event per settle (the graph's, not one per node). A `wire` step (a connection made mid-scenario,
 * C11) is a step, not an event: the schema's kinds are unchanged, and its effect is what the next
 * settle shows.
 *
 * ENDPOINTS are `"<node id>.<port>"`; a node id may not contain a dot, a port may.
 *
 * COMPONENTS (NSP-012, the T4 half). A node's behaviour can depend on WHERE it sits: Send Event's
 * `parent` / `children` / `siblings` propagation walks the component tree, and Repeater Item reads
 * the item its enclosing component instance carries. So a scenario may declare `components` — a
 * tree of component INSTANCES by id, each with its parent (absent: placed in the root) and,
 * optionally, the registry record it carries as its current item (the Repeater's row) — and a
 * node may say which component it sits `in` (absent: the root). A target that holds a component
 * tree builds one scope per component, places each child instance inside its parent as a loaded
 * app would (under a visual node of the parent's scope), and mounts each node in its component's
 * scope; the node ids stay global, so wires and claims are unchanged. What a component IS (its
 * ports, Component Inputs / Outputs) is NOT declared here — that boundary is NSP-015's; this is
 * only the tree a node sits in. A target without a component tree refuses a scenario that
 * declares one (`canPlay`).
 */

import * as fs from 'fs';
import * as path from 'path';

import type { Handle, TargetAdapter } from './adapter';
import { canonicalKey, revive } from './canonical';
import type { TraceEvent } from './trace';

/** The contract's clauses. `tests/graph.test.ts` requires at least one scenario tagged with each. */
export const CLAUSES = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11'] as const;
/**
 * NSP-012's two shared-state sentences, graded the same way: S1 — two nodes naming one id see one
 * datum; S2 — two nodes naming different ids do not (the control beside the firing arm).
 */
export const SHARED = ['S1', 'S2'] as const;
/**
 * NSP-012's T4 half: `N` — a graph-by-construction node's OWN sentence (a port description, a
 * docblock rule), graded in the smallest graph that can show it. Such a node has no reducer spec;
 * its scenarios ARE its spec, and `tests/graph.test.ts` requires every T4 node of the batch to be
 * named by at least one or exempted with a reason.
 */
export const NODE = ['N'] as const;
export type Clause = (typeof CLAUSES)[number] | (typeof SHARED)[number] | (typeof NODE)[number];
export const TAGS: readonly Clause[] = [...CLAUSES, ...SHARED, ...NODE];

export interface GraphNodeDecl {
  /** The catalog type name, as `mount` takes it. */
  type: string;
  /** Applied at mount as `mount(type, params)` does: in key order, recorded as `set` events. */
  params?: Record<string, unknown>;
  /** NSP-012: the component instance (a key of `components`) this node sits in; absent: the root. */
  in?: string;
}

/** NSP-012: one component INSTANCE in the scenario's tree (the header's COMPONENTS paragraph). */
export interface ComponentDecl {
  /** The component instance this one is placed inside; absent: the root. */
  parent?: string;
  /**
   * The registry record (by id, from the world's script) this instance carries as its current
   * item — what a Repeater or Run Tasks hangs on the template instance it creates, and what
   * Repeater Item reads. Absent: the instance carries no item.
   */
  item?: string;
}

export interface Wire {
  /** `"<node id>.<output port>"` */
  from: string;
  /** `"<node id>.<input port>"` */
  to: string;
}

export interface Endpoint {
  node: string;
  port: string;
}

export function parseEndpoint(s: string): Endpoint {
  const dot = s.indexOf('.');
  if (dot <= 0 || dot === s.length - 1) throw new Error(`an endpoint is "<node id>.<port>", not ${JSON.stringify(s)}`);
  return { node: s.slice(0, dot), port: s.slice(dot + 1) };
}

export type GraphStep =
  | { node: string; set: string; value?: unknown }
  | { node: string; signal: string }
  /** A connection made after mount — C11. The target's `connect` seeds the receiver as a loaded project's wire would. */
  | { wire: Wire }
  /** NSP-012: the world's clock moves (adapter.ts `advance`), recorded on the named node's trace. */
  | { node: string; advance: number }
  | 'settle';

/**
 * A claim is a clause's sentence as a fact about ONE frame of the trace. `at` is the settle's
 * ordinal, 1-based: frame 1 is what the first settle records.
 */
export type Claim =
  /** The frame records this canonical value on the port. */
  | { at: number; subject: string; port: string; value: unknown }
  /** The frame records NO value event for the port (the wire carried nothing new — assert it beside a frame where it did). */
  | { at: number; subject: string; port: string; absent: true }
  /** The frame records exactly `count` pulses of the signal. */
  | { at: number; subject: string; signal: string; count: number };

export interface GraphScenario {
  name: string;
  /** The clauses this scenario grades. */
  clauses: Clause[];
  nodes: Record<string, GraphNodeDecl>;
  /** NSP-012: the component instances the nodes sit in; absent: every node is in the root. */
  components?: Record<string, ComponentDecl>;
  wires?: Wire[];
  steps: GraphStep[];
  /** The clause as facts about the trace; checked against `expect` and against every target. */
  claims: Claim[];
  /** The runtime's trace, recorded by the runtime test's record mode. Absent until recorded. */
  expect?: TraceEvent[];
  /** Free text: the clause's sentence, the runtime test it sits beside, the row it found. */
  because?: string;
  /**
   * A target on which this scenario is EXPECTED to differ from the runtime, with the reason —
   * CONTRACT.md Part 2's one intentional divergence (C7). The target's test asserts the
   * DIFFERENCE (AC3): equality there is the finding.
   */
  divergence?: Record<string, string>;
  /**
   * The §6 row (NSP-008) this scenario is KNOWN to fail its claims under on the runtime: the
   * recorded trace does not bear the clause's sentence out, and the sentence is what is under a
   * ruling (R3 (a): the runtime wins until ruled). The runtime test reports the claim failure as
   * known — and red the day it passes. `expect` still records what the runtime does.
   */
  row?: string;
  /** NSP-012: the world the play starts from (world.ts `WorldScript` — a seeded registry, a seed); a graph of registry nodes gets one even when absent. */
  world?: import('./world').WorldScript;
  /** The file the scenario was loaded from; filled by `loadGraphScenarios`. */
  file?: string;
}

/**
 * What a graph target can OBSERVE (NSP-005's reach, for a graph). The React export lifts value
 * outputs into callback props and nothing else: no signal, no outcome. The runner projects the
 * recorded reference and the claims through this before grading, so an event the target cannot
 * see is the reach's edge, not a divergence. A target that omits it has full reach.
 */
export interface GraphReach {
  signals: boolean;
  outcomes: boolean;
  /** Whether a value output is observed; absent means every one is. */
  output?: (subject: string, port: string) => boolean;
}

/** The reference (or a trace) as the reach sees it. */
export function projectGraphTrace(trace: readonly TraceEvent[], reach: GraphReach): TraceEvent[] {
  return trace.filter((e) => {
    if (e.t === 'signal') return reach.signals;
    if (e.t === 'outcome') return reach.outcomes;
    if (e.t === 'value') return reach.output ? reach.output(e.subject ?? '', e.port) : true;
    return true;
  });
}

/** The claims the reach can check. */
export function projectClaims(claims: readonly Claim[], reach: GraphReach): Claim[] {
  return claims.filter((c) => {
    if ('signal' in c) return reach.signals;
    return reach.output ? reach.output(c.subject, c.port) : true;
  });
}

/** A target that can hold a graph: nodes wired together, with a late wire on demand. */
export interface GraphTarget<H extends Handle = Handle> extends TargetAdapter<H> {
  /**
   * Why this scenario cannot be played on this target at all — a step it cannot drive (the export
   * drives element events only, never a `set`; it makes no wire after mount), or a graph its
   * translator refuses (the exporter's own sentences). The runner reports `outside`, counted and
   * never hidden. Absent: everything can be played.
   */
  canPlay?(scenario: GraphScenario): string | undefined;
  /** The reach for THIS graph, once mounted or emitted; absent: full reach. */
  graphReach?(scenario: GraphScenario): GraphReach | undefined;
  /**
   * Mounts every node in declaration order (each exactly as `mount(type, params)` would, params
   * recorded as `set` events on that node) and then every wire in order, and returns a handle per
   * node id. A wire's making seeds the receiver with the source's current value (C11) — that is
   * the target's business, and the first settle shows it.
   */
  mountGraph(nodes: Readonly<Record<string, GraphNodeDecl>>, wires: readonly Wire[], components?: Readonly<Record<string, ComponentDecl>>): Record<string, H>;
  /** A wire made after mount. A target that cannot (the export: a component is emitted whole) omits it; a `wire` step then throws. */
  connect?(from: H, fromPort: string, to: H, toPort: string): void;
}

export function isGraphTarget<H extends Handle>(t: TargetAdapter<H>): t is GraphTarget<H> {
  return typeof (t as GraphTarget<H>).mountGraph === 'function';
}

/** The package's own graph scenarios directory. */
export const GRAPH_SCENARIOS_DIR = path.join(__dirname, '..', 'scenarios', 'graph');

/** Every scenario in every `*.json` of the directory, file order then array order, values revived. */
export function loadGraphScenarios(dir = GRAPH_SCENARIOS_DIR): GraphScenario[] {
  if (!fs.existsSync(dir)) return [];
  const out: GraphScenario[] = [];
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const file = path.join(dir, name);
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
    if (!Array.isArray(parsed)) throw new Error(`${file}: a graph scenario file is an array of scenarios`);
    parsed.forEach((s, i) => {
      const sc = s as GraphScenario;
      if (!sc || typeof sc.name !== 'string' || !sc.nodes || !Array.isArray(sc.steps) || !Array.isArray(sc.clauses) || !Array.isArray(sc.claims)) {
        throw new Error(`${file}[${i}]: a graph scenario needs name, clauses, nodes, steps and claims`);
      }
      const components = sc.components;
      if (components) {
        for (const cid of Object.keys(components)) {
          if (cid.includes('.')) throw new Error(`${file}[${i}]: component id ${JSON.stringify(cid)} contains a dot`);
          // the parent chain ends in the root and names declared components only
          const seen = new Set<string>();
          for (let c: string | undefined = cid; c !== undefined; c = components[c].parent) {
            if (!(c in components)) throw new Error(`${file}[${i}]: component ${JSON.stringify(cid)} is inside ${JSON.stringify(c)}, which is not declared`);
            if (seen.has(c)) throw new Error(`${file}[${i}]: component ${JSON.stringify(cid)} is inside itself`);
            seen.add(c);
          }
        }
      }
      const nodes: Record<string, GraphNodeDecl> = {};
      for (const id of Object.keys(sc.nodes)) {
        if (id.includes('.')) throw new Error(`${file}[${i}]: node id ${JSON.stringify(id)} contains a dot`);
        const n = sc.nodes[id];
        if (n.in !== undefined && !(components && n.in in components)) throw new Error(`${file}[${i}]: node ${JSON.stringify(id)} sits in component ${JSON.stringify(n.in)}, which is not declared`);
        const decl: GraphNodeDecl = n.params ? { type: n.type, params: reviveRecord(n.params) } : { type: n.type };
        if (n.in !== undefined) decl.in = n.in;
        nodes[id] = decl;
      }
      out.push({
        ...sc,
        nodes,
        wires: sc.wires ?? [],
        steps: sc.steps.map(reviveStep),
        claims: sc.claims.map((c) => ('value' in c ? { ...c, value: revive(c.value) } : c)),
        expect: sc.expect ? sc.expect.map((e) => reviveEvent(e)) : undefined,
        file
      });
    });
  }
  return out;
}

function reviveRecord(r: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(r)) out[k] = revive(r[k]);
  return out;
}
function reviveStep(step: GraphStep): GraphStep {
  return step !== 'settle' && 'set' in step && 'value' in step ? { ...step, value: revive(step.value) } : step;
}
function reviveEvent(e: TraceEvent): TraceEvent {
  return 'value' in e && e.value !== undefined ? ({ ...e, value: revive(e.value) } as TraceEvent) : e;
}

/** The frames of a trace: `frames[k]` is what settle k+1 recorded (observation events only); `frames[0]` is frame 1. */
export function framesOf(trace: readonly TraceEvent[]): TraceEvent[][] {
  const frames: TraceEvent[][] = [];
  let current: TraceEvent[] | undefined;
  for (const e of trace) {
    if (e.t === 'settle') {
      current = [];
      frames.push(current);
    } else if (current && (e.t === 'value' || e.t === 'signal' || e.t === 'outcome')) {
      current.push(e);
    }
  }
  return frames;
}

/** Every claim that the trace does NOT bear out, as a sentence each; `[]` when all hold. */
export function checkClaims(trace: readonly TraceEvent[], claims: readonly Claim[]): string[] {
  const frames = framesOf(trace);
  const failures: string[] = [];
  for (const c of claims) {
    const frame = frames[c.at - 1];
    if (!frame) {
      failures.push(`frame ${c.at}: the trace has only ${frames.length} settle(s)`);
      continue;
    }
    if ('signal' in c) {
      const n = frame.filter((e) => e.t === 'signal' && e.subject === c.subject && e.port === c.signal).length;
      if (n !== c.count) failures.push(`frame ${c.at}: ${c.subject}.${c.signal} pulsed ${n} time(s), the claim says ${c.count}`);
      continue;
    }
    const values = frame.filter((e) => e.t === 'value' && e.subject === c.subject && e.port === c.port) as Array<TraceEvent & { t: 'value' }>;
    if ('absent' in c) {
      if (values.length) failures.push(`frame ${c.at}: ${c.subject}.${c.port} recorded ${JSON.stringify(values[0].value)}, the claim says nothing is recorded`);
      continue;
    }
    if (!values.length) failures.push(`frame ${c.at}: ${c.subject}.${c.port} recorded nothing, the claim says ${JSON.stringify(c.value)}`);
    else if (canonicalKey(values[0].value) !== canonicalKey(c.value)) failures.push(`frame ${c.at}: ${c.subject}.${c.port} recorded ${JSON.stringify(values[0].value)}, the claim says ${JSON.stringify(c.value)}`);
  }
  return failures;
}
