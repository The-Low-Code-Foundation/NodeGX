---
id: P18-S116-QUERYFETCH
title: An exported Query Records ignores its wired Fetch and queries once at mount
status: fixed
commit: 8f9c90a3a
severity: medium
area: export / Query Records
found: P18 session 116, 2026-10-16, fixing P18-S115-QUERYPARAMS (measuring which wired filters it reaches)
evidence: dev-docs/tasks/phase-18-code-export-v2/EXP-011-PICKER-COVERAGE.md §83, §84 (the fix, session 117); dev-docs/tasks/phase-18-code-export-v2/s117-queryfetch-drive/; nodegx-export src/analyze/plan.ts (no rule reads `storageFetch`; the wire falls to pass 6's "has no deterministic translation in step 5"); runtime dbcollectionnode2.ts `registerInputIfNeeded` (`storageFetch: scheduleFetch`) and the NDA-017 settle (a wired Fetch unticks every Run On Value Change box)
---

A page refreshes its list after a save: Create Record's Done is wired into the Query Records' Fetch. In the running
app the query runs when Fetch is sent, and only then: wiring Fetch settles every Run On Value Change box unticked
(NDA-017's migration, which the export's parser applies too), so neither the Class nor the Filter nor a parameter
re-runs it. The exported page queries once at mount and never again; the wire is reported only with pass 6's generic
"has no deterministic translation in step 5", and the list goes stale after the save.

Reach on this machine (48 projects, 281 Query Records): **112 have Fetch wired.** The sources: a Set/New Record's
Done (50), a For Each row's Changed signal (45), a component input such as `refresh` / `load` (34), a Condition's
On True (15), a Page's Did Mount (6). Of the 84 Query Records whose Filter reads a wired value, 39 have Fetch wired,
and P18-S115-QUERYPARAMS refuses those by name pointing here.

The fix: a wired Fetch is a handler action (`query-fetch`) in the chain of whatever sends it, reading the filter's
wired values at that moment; no mount effect unless a box is ticked or Did Mount sends it. Then a ticked box (7 of the
39) re-runs on its value as well.

**Fixed in session 117 (EXP-011 §84).** A wired Fetch is a `query-fetch` handler action in its sender's chain; the filter's
wired values are read at the pulse; the query asks at mount only where a box ticked again (or a Page's Did Mount) says the
runtime does, graded against the node's own setters. A later write in the same chain to a value the filter reads, and
value boxes that disagree, are refused by name. Driven on a real backend (`s117-queryfetch-drive/`): the runtime and the
fixed export agree on every row and every request in six steps (load, type, Refresh, a Create Record's Done, clear,
another city); HEAD had no list. Measured after the fix, over 216 Query Records with 107 Fetch wires: 27 wires export
(HEAD: none); the 61 Fetch-wired queries kept their dispositions' kinds; the 19 wired filters this row stopped now stop at
a Function chain (18) or a Page Inputs value (1).
