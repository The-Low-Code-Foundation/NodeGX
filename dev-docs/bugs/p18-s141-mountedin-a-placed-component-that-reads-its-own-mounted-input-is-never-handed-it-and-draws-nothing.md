---
id: P18-S141-MOUNTEDIN
title: A placed component that reads its own Mounted input is never handed it, so one that mounts its root on `m === true` draws nothing (rocket-school's Edit player form, every Confirm)
status: fixed
severity: high
area: export / placed components (`packages/nodegx-export/src/emit/component.ts` `instanceAttrs`, the binding loop's `mounted`)
found: P18 session 141, 2026-10-22, driving rocket-school's Header (Edit player opened nothing in either export arm)
evidence: dev-docs/tasks/phase-18-code-export-v2/s141-header-app/ (`readings.json` H2, `mountedin.ts`, `mountedin.out`, `EXPECTED.md` "the desk")
commit: 8364e498c
---

The runtime hands a component instance's Mounted to its Component Inputs port named `mounted`, as it hands any other
input. rocket-school and star-class use that port: a component sends its own `mounted` through an Expression into its
root Group's Mounted. The export spent a wired Mounted on the render wrapper alone (`{form && <NewPlayerForm …/>}`)
and passed no `mounted` prop, so inside the component `m` was `undefined`.

- `m !== false` (the Choice row, the Lists Editor): `undefined` draws, so these worked by accident.
- `m === true` (the New player form, Hangar/Confirm): **never drawn**. The Header's Edit player opened nothing, and
  neither did the Profiles page's new-player form. Every "are you sure?" before a purchase in the Hangar and on the
  Moon never appeared, so nothing could be bought.

**Reach** (`mountedin.ts`, HEAD's templates): 24 components in 2 templates read their own `mounted`; 77 placements, 42
of them with Mounted wired, 0 authored, 35 with nothing.

**Graded** on s126's Root Desk plus Ask (`m === true`, Mounted wired from a Variable) and Unless (`m !== false`,
nothing wired), predicted first. The runtime draws the ask only while the Variable is true. HEAD's export never drew it;
the fixed export draws every Text the runtime draws at every step.

**Fix (session 141):** where the target declares `mounted` among its inputs, the wired value is handed in as that prop
too (`mounted={closedTheMenuOrEditingThePlayer.values.form}`). Where it cannot be expressed, the prop is left off as before,
and the placement is not refused for it.
