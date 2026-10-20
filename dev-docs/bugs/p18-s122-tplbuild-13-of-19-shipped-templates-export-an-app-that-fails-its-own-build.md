---
id: P18-S122-TPLBUILD
title: 13 of the 19 shipped templates export an app whose own `npm run build` fails at `tsc -b`
status: open
severity: high
area: export / the emitted app's types (all templates)
found: P18 session 122, 2026-10-17, typechecking the templates' exports before and after "Hold the id"
evidence: dev-docs/tasks/phase-18-code-export-v2/s122-holdtheid/tc.ts (tests/helpers/typecheckApp, the scaffold's strict options) over templates/ and the two materialized `*.content.json`; EXP-011 §89.6
---

The exported app's `build` script is `tsc -b && vite build`, so one type error stops it. Typechecked as that build does
(strict, `tests/helpers/typecheckApp.ts`), at the session-122 tree, **13 of 19 template exports have errors**:

| template | errors | template | errors |
|---|---|---|---|
| rocket-school | 78 | bot-garden | 16 |
| star-class | 78 | Site Builder (`site-builder.content.json`) | 9 |
| todo-list, todo-list-demo | 44 each | gram | 4 |
| planning, planning-demo | 21 each | digital-bricks-training, story-engine | 2 each |
| nightbook | 17 | marketplace | 1 |

Clean: members-area, landing-pages (both forms), learn-with-simple-rick, pixel-game, digital-bricks-training-demo.

The classes, most first: an argument `string | undefined` where `string` is taken (TS2345, about 150), a call with an
argument the callee does not declare (TS2554, 42), a component whose body returns `{}` used as JSX (TS2786, 20), and an
author's untyped parameter inside a Function body re-hosted verbatim (TS7006, 20: `function v(typed, loaded)`,
`const same = (a, b) => …`; the Site Builder's Messages on HEAD, its PageEditor once "Hold the id" exports it).

`tests/typecheck-emitted.test.ts` grades the fixtures only, which is why none of this is red. The proposed fix is a gate
first (the templates' exports typecheck, by count, ratcheting down), then each class: the first three are emitter
type bugs; the fourth needs a ruling (the body is the author's JavaScript: a per-wrapper `// @ts-nocheck` cannot be
scoped to one function, so either the wrapper moves to its own file, as a Script's does, or the build stops at
`vite build`).
