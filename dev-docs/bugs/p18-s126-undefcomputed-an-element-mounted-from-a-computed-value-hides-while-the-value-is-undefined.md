---
id: P18-S126-UNDEFCOMPUTED
title: An element authored Mounted true, bound to a computed value that is undefined, is hidden in the export and drawn in the runtime
status: open
severity: low
area: export / a Mounted bound to a computed value (`src/emit/component.ts` mountedCondOf)
found: P18 session 126, 2026-10-19, reading the hls001 corpus after the undefined arm (deadline-desk)
evidence: EXP-011 §93.2; tests/fixtures/deadline-desk (four Texts mounted from a Date Compare)
---

Since session 126 an element authored Mounted true keeps it while its source has no value, as the runtime does (a wire
never delivers `undefined`): `(x === undefined || !!x)`. That arm is printed for a read only: a prop, a store's local, a
row's field. A computed value keeps `!!(…)`, so while it is undefined the export hides what the runtime draws:

- a Date Compare's answer (`dateCompare(…)`, unset for a date it cannot read): printing the arm would print and run the
  call twice (deadline-desk's four Texts);
- an Expression's answer: computed in render, a value from the first render, undefined only when its text says so
  (`obj.missing`), which the export does not read.

Fix, its size: bind such a value to a render local once, then print the arm on the local. Small; no shipped template is
known to reach it (not measured beyond the corpus fixture).
