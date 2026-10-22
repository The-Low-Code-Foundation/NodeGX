---
id: P100-UPG001-SNAP
title: nodegx export stops outright with "Cannot access 'snapActionList' before initialization" on four real projects
status: fixed
regression: packages/nodegx-export/tests/p100-upg001-snap.test.ts (3 of 4 red on HEAD's plan.ts; the control green on both)
phase: P109
task: ISL-043
severity: high
area: export / plan
found: P100 UPG-001 s6 (§3.8), 2026-09-23
evidence: dev-docs/tasks-archive/phase-100-0.3.0-the-first-upgrade/UPG-001-THE-BREAK-CENSUS.md §3.8 ("Pre-existing, found on the way")
---

Exporting *Landing page test V2* (Richard's own project) and three copies of it (*TVW-001 Slice4 Drive*,
*UPG-001 TextStyles Drive* and its `.before-0.3`) fails before anything is written: `Cannot access
'snapActionList' before initialization`, exit 2 (*export cannot be prepared*). It reproduces on the repo's own
`dist/cli.mjs` and on v0.2.4, so it is older than 0.3.0. P100 left it for P18 to file, and P18 never did.

**Where:** `packages/nodegx-export/src/analyze/plan.ts`. `const snapActionList` is declared at `:15690` (HEAD;
`:15450` when found). It is called from closures declared far above it (`statesPlanOf` and others, calls at
`:12851`, `:13048`, `:13249`, `:13360`, `:13612`, `:13697`). One of those closures runs before the `const` line
has executed, which is a temporal-dead-zone throw.

**Not re-measured since 2026-09-23.** At HEAD the declaration is still below every call. No commit names a fix
(`git log -S snapActionList` shows only feature commits that added callers).

**How to reproduce:** `nodegx export --dry-run` on *Landing page test V2*.

**Proposed:** hoist `snapExpr` / `snapActionList` / `snapAction` above the first closure that can reach them,
or make them `function` declarations. Pin it with a spec that runs a planned States/Script chain on the
smallest project that reproduces. Small.

**Re-measured and fixed 2026-10-14 (P18 session 104, ISL-043 AC1).** It still reproduced at HEAD `393d01038`.
`nodegx export --dry-run` on a copy of *Landing page test V2* exited 2. From source, the stack is `planComponent`
→ the value-output pass (`plan.ts:15406`) → `resolveExpr` → `statesPlanOf`, which snapshots the States node's
listener chains when it registers. The shape is `ServiceCard`: `At open` → Component Outputs `isOpen`, and
`Reached open` → `opened`.

🔴 **There were two TDZs, not one.** Fixing `snapActionList` (with its three siblings `exprTouchesSnap`, `snapExpr`,
`snapAction`, now hoisted `function` declarations, because they close over nothing but each other) exposed
`chainSnapshotFor`, which reads the `chainSnapshots` Map. Both are now declared above `statesPlanOf`. For every
project that exported before, evaluation order is unchanged, because this path always threw.

Readings: all four projects export from source (59 / 63 / 59 / 59 files) and their emitted apps typecheck with 0
diagnostics. The new spec reads 4/4 on the fix and 3 failed on HEAD's `plan.ts`. The whole export jest reads
`Test Suites: 116 passed, 116` and the HLS-001 corpus golden did not move. Package and editor `tsc --noEmit` are 0.
