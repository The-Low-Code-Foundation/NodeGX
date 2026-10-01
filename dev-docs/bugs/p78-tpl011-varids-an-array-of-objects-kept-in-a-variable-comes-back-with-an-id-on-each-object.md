---
id: P78-TPL011-VARIDS
title: An array of plain objects kept in a Variable comes back with an `id` on each object, which then gets saved
status: needs-ruling
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
