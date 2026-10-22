---
id: P18-S138-LIFTLOOP
title: A Function computed in render whose value a component lifts to its parent ran on every render, so a list it returned was a new array each time and the push effect, the parent and the child re-rendered for ever
status: fixed
severity: high
area: export / render-run Functions (`src/emit/component.ts`, `renderLocalLines`, `memoJsIds`)
found: P18 session 138, 2026-10-22, the Hook Desk's Shelf (a logic component returning a list into a For Each) hung the export arm
fixed: P18 session 138, 2026-10-22; EXP-011 §108
evidence: dev-docs/tasks/phase-18-code-export-v2/s138-lifted-list/README.md, hookprops.out (the 64 memoised runs)
regression: packages/nodegx-export/tests/a-logic-component-is-a-hook.test.ts
---

A Function with no Run and no host trait is emitted as a call in render, `const WorkOut = Work({ n })`, while the runtime
runs it only when an input changes. When a push effect hands one of its outputs to the parent (§4d, `onRowsChanged`) and
the output is an object or a list, every render made a new value. The effect fired, the parent's row was set, the
parent rendered the child again, and so on without end. A number or a string settles, because React skips a same-value
set.

On HEAD the loop needed a parent that took an object-valued lift. The lists §108 binds are all objects (the Hook Desk
hung its arm). How many HEAD templates looped was not measured: the drives so far (todo-list, s137) lifted arrival runs,
which are state rows. Fixed: a render run whose output a push effect reads is
`useMemo(() => Work({ n }), [n])`, with its inputs as the dependencies. 64 such runs in the templates (mostly bot-garden).
