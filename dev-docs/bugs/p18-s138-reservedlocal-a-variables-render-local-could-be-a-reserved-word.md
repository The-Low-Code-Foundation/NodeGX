---
id: P18-S138-RESERVEDLOCAL
title: A Variable's render local is named after the last word of its export name, which could be a reserved word (bot-garden's gardenChallengeFor became `const for`)
status: fixed
severity: low
area: export / the emitter's Variable hook locals (`src/emit/component.ts`, `hookLocals`)
found: P18 session 138, 2026-10-22, by the template typecheck (`tplbuild`), once a hook's Variable-fed prop earned its local (P18-S138-HOOKPROPWALK)
fixed: P18 session 138, 2026-10-22; EXP-011 §108
commit: 10dc1c990
evidence: dev-docs/tasks/phase-18-code-export-v2/s138-lifted-list/README.md
regression: packages/nodegx-export/tests/a-logic-component-is-a-hook.test.ts
---

The local for `useValue(<variable>)` is the last camel-case word of the Variable's export name, unless another local
already uses it. A reserved word was not ruled out: bot-garden's `gardenChallengeFor` gave `const for = useValue(...)`,
which is 28 syntax errors in `Play.tsx`. There was no reach on HEAD, because that read had no local until
P18-S138-HOOKPROPWALK was fixed. Fixed: a reserved word takes the long form, `gardenChallengeForValue`, as a taken name
already did.
