# NSP-008 — The graph: CONTRACT C1–C11 as scenarios on every target

**Opened 2026-09-29.** **Depends on NSP-005.**
**Status: 📋 not started.**

## 1. The person sentence

> **The rules for how values and signals move between nodes — the part every target gets subtly
> wrong — are graded the same way as a single node's rules.**

## 2. Why this is its own task

A node spec says what one node does. Most real divergences between the runtime and a target live
**between** nodes: frame draining, lockstep inputs, the first update, a late connection catching
up, a signal and a value sent together, the order a component's outputs relay in. The runtime's
semantics for these are already written down, clause by clause, in
[`nodegx-core/CONTRACT.md`](../../../packages/nodegx-core/CONTRACT.md) (C1–C11), and graded for
`@nodegx/core` alone by `nodegx-core/tests/contract.test.ts`.

## 3. What to build

- **Graph scenarios**: small graphs (2–6 nodes) as JSON, each tagged with the CONTRACT clause it
  grades, run on the runtime and the export adapters (and the stranger's target, NSP-006).
- The adapter interface grows `mountGraph(graph)` — nodes by type, wires by port — and the
  runtime adapter uses `node-harness.ts`'s `createGraph`.
- Existing graph-level runtime tests that name a clause-shaped behaviour are listed, and each
  gets a graph scenario beside it: `gam-004-gate-reads-the-same-turn`,
  `gam-011-a-value-sent-with-a-signal-arrives`, `node-signal-value-pairing`,
  `export/chain-wire-order`, `export/foreach-relay-ports` (census the full list first; these are
  examples).

## 4. Acceptance criteria

1. Every clause C1–C11 has **at least one** graph scenario tagged with it; a gate fails if a
   clause has none.
2. All graph scenarios pass on the runtime (they are read from it); every export mismatch is a
   row in §6, routed to phase 18.
3. The *one intentional divergence* named in CONTRACT.md Part 2 is a scenario with an **expected
   difference**, asserted as a difference — not skipped.
4. T4 nodes (Send/Receive Event, Component Inputs/Outputs, Repeater Item) can now be specced;
   NSP-012 and NSP-015 are unblocked.

## 5. Watch for

- Memory: *`connectInput` seeds the target with the source's current value* — a wire is not
  inert when made. That is C11; make sure the graph builder wires in the order a loaded project
  would.
- Memory: *a repeated row sends one signal per update — the second wins.* Repeater semantics are
  graph semantics; they belong here, not in a node spec.
- Memory: *`forEachNode` stops on a truthy return.* If the graph builder walks nodes with it,
  return nothing.

## 6. Built

*(empty)*
