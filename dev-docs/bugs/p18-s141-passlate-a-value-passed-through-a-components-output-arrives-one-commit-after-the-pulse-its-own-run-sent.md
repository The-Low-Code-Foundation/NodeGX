---
id: P18-S141-PASSLATE
title: A value passed through a component's output reaches the parent one commit after the pulse its own run sent, so the parent writes the value before (over a persisted store, `undefined`)
status: fixed
severity: high
area: export / the §4d pass-through (`packages/nodegx-export/src/analyze/plan.ts` `liftInto`, `intoOutputs`; `src/emit/component.ts` the lifted callbacks)
found: P18 session 141, 2026-10-22, measuring the order of rocket-school's Header writes on a desk before building them (EXP-021)
evidence: dev-docs/tasks/phase-18-code-export-v2/s141-header-app/ (`EXPECTED.md`, `readings-runtime.json` beside `readings-head.json`, the Header Desk's Solo)
commit: 8364e498c
---

Session 139 made a placed component's value straight into a component's own output a pass-through: the component kept
the value in a row of its own (`onAppChanged: setApp2`), and an effect pushed the row on (`onAppChanged?.(app2)`). That
is two commits from the placed component to the parent's row. A pulse the same run sends (`done` → the component's
`write`) is a callback: the parent counts it at once and hands it to its sink one commit later (P18-S127-SIBLINGVALUE).
So the sink runs one commit before the value lands, on what the parent's row held before.

**Measured on the Header Desk** (`tests/helpers/header-desk.ts`, Solo: one Mark placed, its `app` the output, its `done`
the output `write`, the page wiring both into a persisted Global Store's Set). Predicted from the emitted code before
either arm ran, read exactly:

| scenario | runtime | HEAD's export |
|---|---|---|
| nothing stored; Solo, Solo | s; s,s | none / `{}`; s (one press late) |
| `["kept"]` stored; Header drop, Solo | empty; s | kept; **none / `{}`: the stored copy written over with `undefined`** |

**Reach:** 190 single pass-throughs in 8 templates whose placement also sends a pulse into the same Component Outputs
(`census.ts`, `census.out`), an upper bound on the ones whose parent reads the value on that pulse. s139's desk (A6) did
not see it: the Editor's word was set by Next, long before Save.

**Fix (session 141):** no row between. The placed component is handed this component's own callback
(`onAppChanged={onAppChanged}`), through one stable `useCallback` where it also writes a row here or needs a cast. The
value then lands in the parent's row in the commit the pulse is counted in, as from any placed component. The same
forwarding carries an output fed by several placed components (the Header's three writers).

🔴 **The forward needs a stable callback from the parent.** Every parent the export emits passes a setter or a
`useCallback`. Handed a fresh arrow each render (mutant M3), every writer re-pushes its last value on each render, and
the last placed (the Header's Drop, `undefined` before it runs) wins: the store is wiped on the first write.
