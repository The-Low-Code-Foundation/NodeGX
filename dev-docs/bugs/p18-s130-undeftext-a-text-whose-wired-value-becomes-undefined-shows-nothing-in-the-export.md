---
id: P18-S130-UNDEFTEXT
title: A Text whose wired value becomes undefined shows nothing in the export; the runtime never delivers undefined, so it keeps its last text
status: open
severity: low
area: export / a rendered read of a store or prop that holds `undefined` (`src/emit/component.ts`, `String(x ?? '')`)
found: P18 session 130, 2026-10-19, the Relay Desk's control (no relayed value wire), EXP-011 §99
evidence: dev-docs/tasks/phase-18-code-export-v2/s130-relay/EXPECTED.md (the control row); packages/nodegx-export/tests/the-row-relays-its-values.test.ts A6
---

On the Relay Desk with the relayed value wires removed, the Shower's `show` runs two Set Variables whose Value is an input
nothing ever delivers. The runtime's Set writes `undefined` into the Variable (`setvariablenode.ts`, `forceChange`), and the
Variable sends nothing on, because a wire never delivers `undefined` (`node.ts` `sendValue`): the page's Texts keep
"said nothing" and "title nothing". The export hands the Shower `undefined`, the Set writes it, and the Text prints
`String(undefined ?? '')`, an empty line.

The same family as P18-S126-UNDEFCOMPUTED and P18-S126-PROPUNDEF (the runtime never delivers `undefined`). Pinned as the
known difference in A6. Reach not measured: a Text reading a Variable or prop that a run can set to `undefined` after it
held a value. A fix would keep the last delivered text for a read that holds `undefined`, as §93's undefined arm does for
Mounted.
