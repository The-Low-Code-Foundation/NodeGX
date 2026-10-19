---
id: P18-S129-SEEDANNOUNCE
title: A text field announces its Value at mount before the authored Value of a Variable in the same component is stored, so the export announces "" where the running app announces the seed
status: open
severity: low
area: export / the mount announcement (`FieldMountPlan`, `component.ts`) against the Variable seed effect (`plan.variableSeeds`)
found: P18 session 129, 2026-10-19, the Field Desk's first draft (`draft` seeded "Ann" on the page that holds the field)
evidence: dev-docs/tasks/phase-18-code-export-v2/s129-fieldset/EXPECTED.md (the second thing the first drafts read)
---

In the running app a Variable's authored Value is stored at node creation (`variablenode2.ts`), before anything mounts,
so a field whose Value reads it starts from the seed and announces it (`TextInput.tsx` `componentDidMount`): the field's
text goes on to its sinks as "Ann".

The export stores the seed from a mount effect (`variableSeeds`) and announces the field from another mount effect that
reads the Variable as the first render saw it (`const arrival = draftValue;`), which is still `undefined`. So it announces
`''`; the sync effect then puts "Ann" in the field without sending it on (P18-S129-VALUEARRIVAL).

Measured on the Field Desk's first draft at load: the runtime read `typed` "Ann" and the field "Ann", the export `typed`
`''` and the field "Ann". The desk now seeds nothing a field announces.

Not counted on the templates (a field reading a Variable seeded in its own component). Fix, small: the announcement reads
the store (`draft.get()`, after the seed effect, which prints first) instead of the render's value; StrictMode's second
seed (P18-S121-SEEDTWICE) is a separate row.
