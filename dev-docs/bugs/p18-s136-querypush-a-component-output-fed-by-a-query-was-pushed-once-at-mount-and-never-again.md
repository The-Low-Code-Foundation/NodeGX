---
id: P18-S136-QUERYPUSH
title: A Component Outputs value fed by a query's rows (or a named array, or a list derived from either) was pushed to the parent once, at mount, and never again
status: fixed
severity: high
area: export / the push effect's dependencies (`effectDeps`, `src/emit/component.ts`)
found: P18 session 136, 2026-10-21, reading the emitted code of the nodes EXP-021 slice 1 gained (todo-list's `Logic/Todo data`)
fixed: P18 session 136, 2026-10-21; EXP-011 §106, EXP-021 §6
commit: 7abdb4257
evidence: dev-docs/tasks/phase-18-code-export-v2/s136-hooks/README.md; tests/a-logic-component-is-a-hook.test.ts E1; mutant arm H
regression: packages/nodegx-export/tests/a-logic-component-is-a-hook.test.ts
---

A component lifts a Component Outputs value with a push effect (`useEffect(() => onXChanged?.(x), [deps])`). `effectDeps`
had no case for a query's rows (`query-get`), a named array (`collection-get`) or a list transform over them, so the
effect's dependency list held only the callback: it ran once at mount, pushing the empty list the query boots with, and
never again when the query answered. todo-list's `Todo data` lifts six lists this way; every list on the page would have
stayed empty.

Latent before session 136 (a visual component lifting a query's rows has the same push), reached when logic components
began to export. Fixed: the row (or the hook's local) is the dependency, and a list transform walks its source.
