# P107 — next session

**Written 2026-10-01 (end of s15).** Read the [README](README.md) §2–§7. Rows to ask first: **C23** (new, high), then
**C19, C17, C21** (asked since s13/s14). Then [NSP-015 §6](NSP-015-BATCH-NAVIGATION-AND-COMPONENTS.md), which holds
the boundary, definitions, C23 and what the eight remaining nodes need, and the BOUNDARY and DEFINITIONS paragraphs
at the top of [graph.ts](../../../packages/nodegx-node-spec/src/graph.ts).

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 the census | ✅ s1 | `3bd71e837` |
| NSP-001 the spec + interpreter | ✅ s1 … s14 | s1 … s14 |
| NSP-002 traces + adapter + runtime target | ✅; **s15: component instances are the runtime's own `ComponentInstanceNode`; definitions registered as real `ComponentModel`s; the context has a project with no variants** | s2 … s15 |
| NSP-003 the runner | ✅; **s15: `playGraph` awaits `mountGraph`; component instances are subjects (before the nodes)** | s2 … s15 |
| NSP-004 the pilot five | ✅ s3 | `ef6f3b6e1` |
| NSP-005 the export adapter | ✅ (s13); s15: a scenario with components or definitions is `outside` ("this harness emits ONE component") | s13, s15 |
| NSP-006 the stranger | ✅ rounds 1, 2, 3; round 4 named | `0dfcc2660` |
| NSP-007 the world | ✅; AC1's export half ✗ | s13 |
| NSP-008 the graph | ✅; **s15: BOUNDARY (instance name, ports, params; the instance is a subject), DEFINITIONS (a component a node makes by name), an OUTCOME claim** | s15 |
| NSP-011 / NSP-012 | as s12; **NSP-012's Run Tasks graded (s15): 13 / 13 T4 named, exempt list EMPTY** | s15 |
| NSP-013 the time batch | 🟡 24 of 24 conform. Left: AC2, the deep run | s14 |
| **NSP-015 navigation + components** | **🟡 6 of 14 (+ Run Tasks)**: Component Inputs, Component Outputs, Component Object, Set Component Object Properties, Parent Component Object, Set Parent Component Object Properties. **Left: 8**: Show / Close Popup, Push Component To Stack, Pop Component Stack, Navigate To Path, Navigate, Page Inputs, External Link. AC2 | `11ba48f84`, `ae02df8d3`, s15 handoff commit |
| NSP-020 ports without a viewer | rows only | — |
| NSP-009, NSP-010, NSP-014, NSP-016 … NSP-019, NSP-021 | — | — |

**75 of 147 conform on the runtime** (T1 45/46 · T2 10/11 · T3 1/39 · T4 19/27; **0 exempt**). Counted from
tiers.json. Catalog parity 55. **Graph 55 / 55 on the runtime** (6 known rows: G1, C11–C14, C23).

## Gate readings (2026-10-01, s15, working tree on `ae02df8d3` + the t11 scenario)

| gate | reading |
|---|---|
| `cd packages/nodegx-node-spec && npx jest` | **16 suites, 597 passed, 17 skipped** (at `ae02df8d3`; t11 then added one: `tests/graph.test.ts` 98 passed) |
| `npx tsc -p packages/nodegx-node-spec/tsconfig.json --noEmit` · `… noodl-runtime …` | exit 0 · exit 0 |
| `cd packages/noodl-runtime && npx jest test/node-spec` | **140 passed, 55 skipped** at `ae02df8d3`; graph test alone after t11: **66 passed** |
| `cd packages/nodegx-export && npx jest tests/node-spec-conformance.test.ts tests/node-spec-graph.test.ts` | **12 passed, 2 skipped**; graph on export: CONFORM — 1 passed, 2 diverged, 1 known, 51 outside of 55 |
| stranger rounds | not re-graded: no guarded file moved (`graph.ts` and `runner/graph.ts` are not guarded) |
| `npm --prefix packages/noodl-editor run test:main` | NOT RUN (nothing this phase touches is in it) |

## What s15 settled (and where the handoff was wrong)

1. **"NSP-015 needs the component BOUNDARY in the format" was right, and it is built.** A component instance
   declares its name, ports and params and is a subject like a node. The runtime target's instances are the
   runtime's own `ComponentInstanceNode`; s10's stand-in owners are gone, and the 22 s10 scenarios didn't move.
2. **The handoff grouped Run Tasks with "the boundary". It needed more: a component DEFINITION.** Run Tasks, Show
   Popup and Push Component To Stack make an instance BY NAME, so the runtime builds it. A scenario's
   `definitions` are now registered as real `ComponentModel`s (`createFromExportData`). Run Tasks conforms
   through one, and the exempt list is empty.
3. **Three harness facts:**
   - `ComponentInstanceNode`'s prototype methods are read-only descriptors, so the intercept installs its
     wrappers as own properties.
   - An instance's teardown resets its whole scope, so it is disposed as a node only.
   - The headless runtime has no project, so `graphModel.variants` was undefined and every instance a node made
     by name threw. The target now has an empty variants list, as it already has empty colour styles.
4. **A signal crosses a component boundary as `true` then `false`.** The trace records it as a `signal`. The
   first recording read `value false`, which is right on the wire and wrong as a trace.
5. **Claims can count OUTCOMES now** (`{ at, subject, outcome, count }`). s10 noted on C15 that "claims cannot
   name" an outcome, and Run Tasks answers only through outcomes.
6. **C23**, measured with a control beside it: a Parent Component Object created before its parent's
   Component Object binds the GRANDPARENT's record for good, while Set Parent … writes the parent's.
7. **The derived signal over a WIRE** (t11, States `To B` from a Counter's Count Changed) behaves as a direct
   press does. That path was graded by nothing before.

## Rulings — R1 R2 R3 R5 R6 ruled; R4 taken as (a) (confirm); R7, R8 asked; rows open

Ask in plain words, first: **C23** (a Parent Component Object can silently read the wrong ancestor's data in a
deployed app), **C19** (one bad Easing Curve stops every timer in the app), **C17** (the JSON stream parser
hangs on a stray `}`), **C21** (a non-curve transition silently loses every move into that state). Then C22,
D19, C11, C12, C15, C16, C20, C7, D14, D16. Each is in `dev-docs/bugs/` (`node scripts/bugs.js --from P107`: 42
needs-ruling).

## What s16 does

- **External Link and the world's LOCATION.** This is the design step for NSP-015's other navigation nodes.
  External Link reads `window` (absent in jest, so it always answers Unchanged), `window.open`, and
  `navigator.userActivation`. The world needs four things:
  - a `window` with `open`
  - whether the press was a user action
  - a record of what was opened
  - a trace event for it (a schema change, so guarded).

  Decide the event's shape first. It must also carry path, hash and history for Navigate, NSP-015 §3 and §5
  ("a hash change is not a navigation"). `world.ts` and the schema are guarded: refresh hashes and re-grade
  all three rounds in the same commit.
- **Popups and the page stack** need the viewer's visual layer. `showPopup` builds a `Group` in the ROOT
  component's scope and calls `onShowPopup`; Page Stack and Router are visual nodes. Either stand them in
  (say so) or wait for NSP-016. A definition already covers the "made by name" half.
- **AC2 (export)** for the boundary needs a multi-component emit in the export harness. Route it to P18 when
  it is built.
- **Cheap, alongside:** the deep run for s11–s15 (`NSP_DEEP=10000`, quiet box, one batch); a round-4 stranger
  brief that includes States (the derived-signal and `pulses` sentences) and now a graph with the boundary.

**If C23 is ruled "fix it":** in `parentcomponentobject.ts` `nodeScopeDidInitialize`, re-resolve
unconditionally and rebind when the id differs. Remove the scenario's `row` mark in the same commit, and
close the ledger file.

**Human decisions outstanding:** C23, C19, C17, C21 first; R7; R8; R4's confirmation; rows C2–C23, D1–D19,
G1; the stray root `package.json` (still Nightbook's, so `npm run` at the root fails).

## Before you start

- Shared checkout: pathspec commits through a temporary index (`GIT_INDEX_FILE=…; git read-tree HEAD; git add
  <mine>; commit-tree; update-ref <branch> NEW OLD`), then `git reset -q -- <mine>`. Never `git add -A`, never
  `git stash`; one heavy job at a time. Peers have open edits in `packages/nodegx-export/` (P18: src/emit,
  tests/*) and in other phases' docs. The two export node-spec files are this phase's.
- Throwaway probes go in `packages/noodl-runtime/test/node-spec/zz-*.test.ts`, deleted in the same command.
  s15's recipe for a runtime-made instance that fails: call `nodeScope.createNode(name)` in a probe and print
  `e.stack`, since the node's own error detail holds only the message.
- Graph claims: write them from the sentence, before recording (`NSP_RECORD=1 … -t "<name>"`). Read a failed
  claim against the frame before calling it a finding. Two of s15's three failures were mine: a Component
  Object output exists only once wired, and States' value output is `x`, not `value-x`.
- A component id and a node id share one namespace. A definition's nodes are never subjects.
