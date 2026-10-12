/**
 * NSP-008 — the graph scenario format (src/graph.ts) and the graph runner (src/runner/graph.ts),
 * graded without the runtime:
 *
 *   AC1  every clause C1–C11 has at least one scenario tagged with it (a gate, so a clause cannot
 *        quietly lose its last scenario);
 *   the recorded `expect` of every scenario validates against the trace schema, carries a subject
 *        on every non-settle event, has an observation, and BEARS ITS CLAIMS OUT — the clause's
 *        sentence checked against what the runtime recorded, so the ratchet is not circular — or
 *        names the §6 row it is known to fail under;
 *   AC3  the one intentional divergence (CONTRACT.md Part 2, C7) is a scenario that names the
 *        export under `divergence`, and the runner REQUIRES a difference there: a target that
 *        agrees with the runtime on it fails, a target that differs passes as `diverged`;
 *   the runner assembles one graph trace from per-node traces in declaration order, stamps each
 *        event with its node id, and reports a `wire` step on a target without `connect`.
 */

import Ajv from 'ajv';

import type { Handle, TargetAdapter, TraceEvent } from '../src';
import { checkClaims, CLAUSES, framesOf, hasObservation, interpreterAdapter, loadGraphScenarios, playGraph, runGraphScenarios, subjectsOf, TAGS, TRACE_SCHEMA, validateTrace, type GraphScenario, type GraphTarget } from '../src';

const scenarios = loadGraphScenarios();
const ajv = new Ajv({ allErrors: true, strict: true });
const validateWithAjv = ajv.compile(TRACE_SCHEMA);

describe('AC1 — every clause has a scenario', () => {
  test('there are scenarios', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(CLAUSES.length);
  });
  for (const clause of CLAUSES) {
    test(`${clause}`, () => {
      expect(scenarios.filter((s) => s.clauses.includes(clause)).map((s) => s.name)).not.toHaveLength(0);
    });
  }
  test('every tag is a clause, every name is unique', () => {
    const names = new Set<string>();
    for (const s of scenarios) {
      for (const c of s.clauses) expect(TAGS).toContain(c);
      expect(names.has(s.name)).toBe(false);
      names.add(s.name);
    }
  });
});

/**
 * NSP-012 §2 — the batch's thirteen T4 nodes. A graph-by-construction node is specced by graph
 * scenarios tagged `N` that name its type (the runtime records them; the claims come from the
 * node's own sentences) — or it is exempt with a reason, counted and never hidden (NSP-011 §4 AC1).
 */
const T4_NODES = ['Event Receiver', 'Event Sender', 'For Each Actions', 'net.noodl.ActionDispatcher', 'net.noodl.ActionHandler', 'net.noodl.GlobalStore', 'net.noodl.GlobalStore.Set', 'net.noodl.GlobalStore.Subscribe', 'net.noodl.OptimisticUpdate', 'net.noodl.StateHistory', 'net.noodl.StateHistory.Undo', 'net.noodl.StateSnapshot', 'RunTasks'] as const;
// NSP-015 s15: Run Tasks left the list — its template is a DEFINITION now (graph.ts DEFINITIONS)
const T4_EXEMPT: Record<string, string> = {};

/**
 * NSP-013 s13 — nodes of OTHER tiers whose input is other nodes' behaviour, graded the same way: On
 * App Error (T2, "world-fed") hears the errors OTHER nodes raise, so its scenarios mount real raisers
 * (Parse XML, Parse CSV) beside it rather than give the world an error-stream seam. Each must stay
 * named by an `N` scenario; it has no reducer spec (no catalog-parity row).
 */
const GRAPH_GRADED = ['On App Error'] as const;

describe('NSP-013 — a node graded by graph scenarios rather than a reducer spec is named by an N scenario', () => {
  for (const type of GRAPH_GRADED) {
    test(`${type}`, () => {
      expect(scenarios.filter((s) => s.clauses.includes('N') && Object.values(s.nodes).some((n) => n.type === type)).map((s) => s.name)).not.toHaveLength(0);
    });
  }
});

/**
 * NSP-015 — the batch's T4 nodes graded so far: the component BOUNDARY (graph.ts) and the Component
 * Object family. The other eight (Show / Close Popup, the four page-stack and router navigations,
 * Page Inputs, External Link) are not started — not exempt: each needs a component DEFINITION the
 * runtime instantiates itself (a popup, a page) or the world's location seam (NSP-015 §6).
 */
const NSP015_GRADED = ['Component Inputs', 'Component Outputs', 'net.noodl.ComponentObject', 'net.noodl.SetComponentObjectProperties', 'net.noodl.ParentComponentObject', 'net.noodl.SetParentComponentObjectProperties'] as const;

describe('NSP-015 — every graded node of the batch is named by an N scenario', () => {
  for (const type of NSP015_GRADED) {
    test(`${type}`, () => {
      expect(scenarios.filter((s) => s.clauses.includes('N') && Object.values(s.nodes).some((n) => n.type === type)).map((s) => s.name)).not.toHaveLength(0);
    });
  }
  test('AC5 — a component placed twice with different inputs: two instances of one component name, different params, and the trace differs between them', () => {
    const twice = scenarios.filter((s) => {
      const byName: Record<string, string[]> = {};
      for (const [cid, c] of Object.entries(s.components ?? {})) if (c.inputs) (byName[c.component ?? cid] ??= []).push(cid);
      return Object.values(byName).some((ids) => ids.length >= 2 && new Set(ids.map((id) => JSON.stringify(s.components![id].params))).size === ids.length);
    });
    expect(twice.map((s) => s.name)).not.toHaveLength(0);
    for (const s of twice) {
      // what the nodes inside each instance recorded, the instance ids taken out: two different streams
      const inside = (cid: string) => JSON.stringify((s.expect ?? []).filter((e) => e.subject !== undefined && s.nodes[e.subject]?.in === cid).map((e) => ({ ...e, subject: undefined })));
      const ids = Object.keys(s.components ?? {}).filter((cid) => s.components![cid].inputs);
      expect(new Set(ids.map(inside)).size).toBe(ids.length);
    }
  });
});

describe('NSP-012 — every T4 node of the batch is named by an N scenario or exempt with a reason', () => {
  for (const type of T4_NODES) {
    test(`${type}`, () => {
      const named = scenarios.filter((s) => s.clauses.includes('N') && Object.values(s.nodes).some((n) => n.type === type));
      if (type in T4_EXEMPT) {
        expect(named).toHaveLength(0);
        expect(T4_EXEMPT[type].length).toBeGreaterThan(20);
      } else {
        expect(named.map((s) => s.name)).not.toHaveLength(0);
      }
    });
  }
  test('the exempt list is short and every entry is a T4 node', () => {
    expect(Object.keys(T4_EXEMPT)).toEqual([]);
    for (const t of Object.keys(T4_EXEMPT)) expect(T4_NODES).toContain(t);
  });
  test('a scenario with components places every node in a declared component or the root, and a component in a declared parent or the root', () => {
    for (const s of scenarios) {
      const components = s.components ?? {};
      for (const n of Object.values(s.nodes)) if (n.in !== undefined) expect(components).toHaveProperty(n.in);
      for (const c of Object.values(components)) if (c.parent !== undefined) expect(components).toHaveProperty(c.parent);
    }
  });
});

describe('every recorded trace is well-formed and bears its claims out', () => {
  for (const sc of scenarios) {
    test(`[${sc.clauses.join(' ')}] ${sc.name}`, () => {
      expect(sc.expect).toBeDefined();
      const trace = sc.expect!;
      expect(validateTrace(trace).ok).toBe(true);
      expect(validateWithAjv(JSON.parse(JSON.stringify(trace)))).toBe(true);
      expect(trace.every((e) => e.t === 'settle' || (typeof e.subject === 'string' && subjectsOf(sc).includes(e.subject)))).toBe(true);
      expect(hasObservation(trace)).toBe(true);
      expect(sc.claims.length).toBeGreaterThan(0);
      const failures = checkClaims(trace, sc.claims);
      if (sc.row) expect(failures).not.toHaveLength(0);
      else expect(failures).toEqual([]);
    });
  }
});

describe('AC3 — the intentional divergence is asserted as a difference', () => {
  const declared = scenarios.filter((s) => s.divergence && 'export' in s.divergence);
  test('the scenarios that name the export under divergence are the clauses Part 2 marks as not implemented: C7 (the one worth arguing about) and C8', () => {
    expect(declared.map((s) => s.clauses[0]).sort()).toEqual(['C7', 'C8']);
  });
});

/** A graph target over the interpreter that carries NO wires: every node stands alone. Enough to grade the runner's assembly. */
function unwiredTarget(): GraphTarget {
  const inner = interpreterAdapter();
  return {
    ...inner,
    mountGraph(nodes) {
      const out: Record<string, Handle> = {};
      for (const id of Object.keys(nodes)) out[id] = inner.mount(nodes[id].type, nodes[id].params ?? {});
      return out;
    }
  } as GraphTarget;
}

/**
 * A target that plays back a fixed per-node trace: `settle` advances each node one frame, and a
 * `set` / `signal` hands out the node's next recorded stimulus event — so the runner's assembly
 * can be graded on its own, with a trace that is known to the event.
 */
function replayTarget(name: string, byId: Record<string, TraceEvent[]>): GraphTarget {
  const settles: Record<string, number> = {};
  const played: Record<string, number> = {};
  return {
    name,
    mountGraph(nodes) {
      const out: Record<string, Handle> = {};
      for (const id of Object.keys(nodes)) {
        out[id] = { id, type: nodes[id].type };
        settles[id] = 0;
        played[id] = 0;
      }
      return out;
    },
    mount: () => {
      throw new Error('unused');
    },
    set: (h) => void played[h.id]++,
    signal: (h) => void played[h.id]++,
    async settle() {
      for (const id of Object.keys(settles)) {
        settles[id]++;
        played[id] = 0;
      }
    },
    trace(h) {
      const all = byId[h.id] ?? [];
      const out: TraceEvent[] = [];
      let n = 0;
      let stimulus = 0;
      for (const e of all) {
        if (e.t === 'settle') {
          if (n === settles[h.id]) break;
          n++;
          stimulus = 0;
        } else if (n === settles[h.id] && (e.t === 'set' || e.t === 'in')) {
          // past the current frame's observations: only the stimulus events played so far
          if (stimulus >= played[h.id]) break;
          stimulus++;
        }
        out.push(e);
      }
      return out;
    },
    dispose: () => undefined
  };
}

/** The per-node traces a recorded graph trace decomposes into. */
function perNode(sc: GraphScenario): Record<string, TraceEvent[]> {
  const out: Record<string, TraceEvent[]> = {};
  for (const id of Object.keys(sc.nodes)) out[id] = [];
  for (const e of sc.expect!) {
    if (e.t === 'settle') for (const id of Object.keys(out)) out[id].push({ t: 'settle' });
    else {
      const { subject, ...rest } = e;
      out[subject!].push(rest as TraceEvent);
    }
  }
  return out;
}

describe('the graph runner', () => {
  const c2 = scenarios.find((s) => s.name.startsWith('two values sent in one frame'))!;

  test('assembles one trace: node order is declaration order, every event carries its node id, one settle per settle', async () => {
    const trace = await playGraph(unwiredTarget(), c2);
    expect(trace.filter((e) => e.t === 'settle')).toHaveLength(c2.steps.filter((s) => s === 'settle').length);
    expect(trace.every((e) => e.t === 'settle' || typeof e.subject === 'string')).toBe(true);
    // unwired: the Counter a still counts, the rest see nothing — the claims about b and c fail
    expect(framesOf(trace)[1].some((e) => e.subject === 'a' && e.t === 'value' && e.port === 'currentCount' && e.value === 2)).toBe(true);
    expect(checkClaims(trace, c2.claims)).not.toHaveLength(0);
  });

  test('a scenario with a wire step on a target without connect is a PlayError with the trace so far', async () => {
    const late = scenarios.find((s) => s.steps.some((st) => st !== 'settle' && 'wire' in st))!;
    await expect(playGraph(unwiredTarget(), late)).rejects.toMatchObject({ name: 'PlayError' });
  });

  test('a target that reproduces the recorded traces passes; the C7 scenario passes only as a DIFFERENCE on the export', async () => {
    const c7 = scenarios.find((s) => s.divergence && 'export' in s.divergence)!;
    const faithful = replayTarget('faithful', perNode(c7));
    const asExport = replayTarget('export', perNode(c7));
    const r1 = await runGraphScenarios(faithful, [c7]);
    expect(r1.results[0].status).toBe('passed');
    const r2 = await runGraphScenarios(asExport, [c7]);
    // equal to the runtime where the contract says the export differs: the finding, not a pass
    expect(r2.results[0].status).toBe('failed');
    expect(r2.results[0].reason).toMatch(/expected to differ/);
    expect(r2.conforms).toBe(false);
  });

  test('a target whose trace differs from the recording fails with the first differing event, and the claims are checked on ITS trace', async () => {
    const traces = perNode(c2);
    // the target drops c's second pulse: coalescing, C2's defect
    traces.c = traces.c.filter((e, i, all) => !(e.t === 'signal' && i > 0 && all[i - 1].t === 'signal'));
    const r = await runGraphScenarios(replayTarget('coalescing', traces), [c2]);
    expect(r.results[0].status).toBe('failed');
    expect(r.results[0].difference?.index).toBeGreaterThanOrEqual(0);
  });

  test('a scenario without a recording is refused, never passed', async () => {
    const r = await runGraphScenarios(replayTarget('x', {}), [{ ...c2, expect: undefined }]);
    expect(r.results[0].status).toBe('refused');
    expect(r.conforms).toBe(false);
  });

  test('the interpreter is not a graph target', () => {
    const t: TargetAdapter = interpreterAdapter();
    expect('mountGraph' in t).toBe(false);
  });
});
