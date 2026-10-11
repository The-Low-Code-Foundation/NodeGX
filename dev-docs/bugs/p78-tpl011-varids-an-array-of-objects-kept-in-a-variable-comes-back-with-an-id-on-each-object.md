---
id: P78-TPL011-VARIDS
title: An array of plain objects kept in a Variable comes back with an `id` on each object, which then gets saved
status: scheduled
phase: P109
task: ISL-045
severity: low
area: runtime / Variable (arrays of objects become records)
found: P78 TPL-011 s3 (V1-4), 2026-09-26
evidence: dev-docs/tasks/phase-78-the-templates/TPL-011-THE-EVENING-JOURNAL.md §3c "V1-4 done (s3)", "Found building it" (first bullet)
---

Nightbook kept the picked feelings, `[{ w, s }, …]`, in a Variable. Read back, each object had an `id` of its own,
and that id went into her saved page. The page and the backend now store `{ w, s }` only. This is the same family as
Records' default read turning nested objects into Models (fixed for Records with `{ plain: true }`, HLT-022). A
Variable has no such option, and the node reference does not say it happens.

**Where:** the Variable path that turns an array into a Collection of Models (`packages/noodl-runtime/src/model.ts`
/ `collection.ts`). Not re-measured since 2026-09-26.

**Ruling wanted:** should a Variable keep plain values plain, or is the conversion the intended Noodl semantics? If it
is intended, the Variable's description should say so, and the property should be read back without the id. Small.

**Re-measured (P109 s44, 2026-10-11): does not reproduce in its nearest shape.** The drive
`packages/nodegx-backend/tests/isl045-varids-drive.test.ts` runs a Function that makes `[{w,s},{w,s}]`, a
`Set Variable` (Set With: array) that keeps it, and the Variable's value feeding a For Each that draws a row per
object (both rows drew). Read back through a Function wired to the same value, and through the page's
`Noodl.Variables`, the array is plain: `[{"w":"b0","s":5},{"w":"b1","s":2}]`, with no `id`.

`Model.set` stores the value as given, `Set Variable` converts only a string (an id) on its array mode, and
`Model.create` does not write into the object it is handed. So the `id` Nightbook saw came from a step this shape
does not have: a read through a row's item, or the save. ISL-003's change to plain rows (`collection.ts`, 2026-10-03)
is a candidate for having removed it, but it is not bisected. The question to Richard changes from "plain or
converted?" to "close it as not reproduced?".

**Ruled (Richard, P109 s44, 2026-10-11):** Dig into Nightbook's exact path: trace its own read-back before closing.
