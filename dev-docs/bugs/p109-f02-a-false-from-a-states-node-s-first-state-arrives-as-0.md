---
id: P109-F02
title: A `false` (or `''`) a States node sends from its first state arrives as the number 0
status: fixed
commit: 06e65ab47
phase: P109
task: ISL-002
severity: medium
area: runtime / States (and export / States)
found: P106 IG-003 §7 s3 item 4, 2026-09-29 (audit P109 F02; cause re-read by ISL-002 scoping 2026-10-01)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/AUDIT-2026-10-01.md §1 F02; dev-docs/tasks/phase-106-the-island-grows/IG-003-DRIVE-TEACH-PLAY.md §7 item 4
---

A States node whose first state sets a boolean value to `false` does not send `false`: four Drive presses recorded
four blocks although the first state said "do not record". Strings from the same state arrived. The recorded reading
("the false never arrives") is probably wrong: the value arrives as `0`, which the template's `record !== false`
read as "record".

**Where:** `packages/noodl-viewer-react/src/nodes/std-library/states.ts:592` (`jumpToState`):
`internal.currentValues[v] = internal.stateParameters[prefix + v] || 0;` — any falsy value (`false`, `''`) becomes
`0`. The exporter copies the same rule (`packages/nodegx-export/src/emit/statesLib.ts:330`, `byState[state] || 0`). Re-read at HEAD `d2b2f0101`.

**Reproduce:** a States node with a boolean value `false` in its first state, wired to a Function that reports
`typeof` — it reads `number`. Not yet a spec (ISL-002 AC1).

**Workaround:** the template sends the strings `'yes'`/`'no'` (`packages/noodl-mcp/tests/cg003Components.ts:1072-1074`).

**Proposed:** send the typed value (`?? 0` or the port's typed default) in runtime and export together. Small. 🔒 ISL-002
asks Richard: typed value, skip unset values, or document only.

**Fixed 2026-10-02 (P109 s3, `06e65ab47`)** on Richard's ruling ("Fix both, one commit"): one helper, `typedStateValue`,
decides a true/false or a text for the first entry and every later move, in the runtime, the export's `statesLib.ts`
and P107's reference spec. ISL-002 §8 session 3 has the readings.
