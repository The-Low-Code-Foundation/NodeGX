# TBM-007 — The wall passes the editor suite

**Opened 2026-10-11.** **Depends on P112 OWN-006 (built) and, for the graph half, OWN-003 (built s8).** **Status: 📋.**
**Model:** either; Orbit's `real/suite-adapter.mjs` is the model to copy.

"Done means done" (P112 §2): a home-made editor is finished when the editor suite says its edits match the reference
writer's. The wall has the eight edits as page functions already (`addNode`, `removeNode`, `connect`, `disconnect`,
`setParam`, `moveNode`, `rename`; `add_child` is the one it does not do — the wall hides Groups and does not reparent).

## What to build

1. `prototype/suite-adapter.mjs`: open through `?open=wait` + `window.__openProject` (as Orbit), `apply(edit)` through the
   page's functions, `save()` as the files; `add_child` reported as "this page cannot do", which the suite records.
2. Run on small, todo-list, planning; every difference is either a fix here or a finding for OWN-010.

## Acceptance criteria

1. The suite is green on the three fixtures but for `add_child`, which the suite lists as unsupported by name.
2. The official editor opens a project the wall saved after the eight edits (the suite's own check).
