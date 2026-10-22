---
id: P18-EXP022-S2-EMITDECIDES
title: Six decisions about when a component's logic runs are made in the React printer, not the plan, so the Swift printer copies each one, and the copies can drift
status: open
severity: low
area: export / the plan's contract with its printers (`packages/nodegx-export/src/emit/component.ts`, copied into `src/emit/swift/view.ts`)
found: EXP-022 session 2, 2026-10-22, printing todo-list's logic components in SwiftUI from the plan
evidence: dev-docs/tasks/phase-18-code-export-v2/EXP-022-THE-SAME-GRAPH-IN-SWIFT.md §9 S2; tests/the-same-graph-in-swift-s2.test.ts
---

S1 found one place the plan leaks into the React printer (`P18-EXP022-S1-COLLAPSE`). Printing the logic found six more.
Each is a target-neutral fact about the graph that `component.ts` derives from the plan at print time, so a second
printer has to derive it again:

1. **Which Functions keep a node** (`pulsedRunIds`: a run with pulses, a host trait, or a materialized pulsed run). Swift
   reads it as `def.pulsed || def.host`, which agrees on every Function in the templates and is not the same rule.
2. **Which reads are render runs, and that they are memoised** (`jsLocals`, `memoJsIds`, P18-S138-LIFTLOOP). Swift
   memoises every render run.
3. **`expandActions`' flattening** (which chains are following statements: a Set Variable's Done, a run's own statement).
4. **`combinedLifted`** (a placement's one lifted port with several rows becomes one callback).
5. **Which kept Functions get a `late` handler**, and which row and pulses it writes (a walk over every chain).
6. **Which fields a chain focuses, blurs or Sets** (the field refs).

**Copied since S2:** (7) S4, a node authored Mounted false whose Mounted wire the plan does not carry is removed from
the tree (P18-EXP022-S4-MOUNTEDFALSE). (8) S5, a Log's Done chain is following statements (`expandActions`, EXP-011
§39), copied with the Log action itself. Eight decisions in five sessions, each a few lines of Swift.

None changes behaviour today: the Hook Desk reads the same in both exports. Each is a place where a change to one printer
moves one target and not the other, with no test comparing them.

**Fix:** the plan carries each answer (a `kept` flag on `JsFunctionPlan`, render runs as plan rows, chains already
flattened, lifts grouped per port, late handlers and field refs as plan rows) and both printers read it. It changes
`plan.ts`, so it goes through the React session's whole-package suite first.
