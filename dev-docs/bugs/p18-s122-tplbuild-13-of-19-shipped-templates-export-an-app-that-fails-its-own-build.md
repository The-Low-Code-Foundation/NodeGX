---
id: P18-S122-TPLBUILD
title: 13 of the 19 shipped templates export an app whose own `npm run build` fails at `tsc -b`
status: fixed
severity: high
area: export / the emitted app's types (all templates)
found: P18 session 122, 2026-10-17, typechecking the templates' exports before and after "Hold the id"
fixed: P18 session 125, 2026-10-19, branch l6-tplbuild (commits b3dd0dc87 … 0f133f30b, 55eae56a1); EXP-011 §92
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

**Ruled by Richard, 2026-10-19: the wrapper moves to its own file, as a Script's does** ("probably their own files
would be cleaner"). The build keeps running `tsc -b`.

**Session 124 (EXP-011 §91.7): the gate and the first class.** Re-measured on HEAD `e7e3e77db`: 337 in 13 of 19, as
above. `tests/the-templates-typecheck.test.ts` now typechecks every tracked template's export (16) and holds each count
to a row, a ratchet both ways. The largest class, a lifted output's push `onXChanged?.(x)` against a callback typed
`(value: T)`, is fixed by typing the callback `T | undefined` (commit `c31409e27`): **311 → 189 in the tracked
templates (11 → 9 of 16), 337 → 203 over all 19, none added.** Left: TS2554 42, TS2448/TS2454 44, TS2786 39, TS2345 35
(`unknown`/`null` pushes), TS17001 12, TS2322 6, TS7006 6 (the body class, the ruling), TS2440 4, TS7053 1.

**Session 125 (EXP-011 §92): every class, and the ruling built.** On the base `a2c4fc09c`, 189 in 9 of 16, as session 124
left it. One commit per class, each lowering the gate's rows and armed by a mutant: an Expression with no inputs called
with none (TS2554, 42); a lifted push of an untyped value cast to the port's type (TS2345, 35); a removed root returning
`null` (TS2786, 39, a render React threw on); a render local printed after the hook it reads (TS2448/TS2454, 44, a
ReferenceError at the first render); **each Function wrapper in its own file, `src/functions/<dir>/<fileBase>/<fnName>.ts`,
one-file `// @ts-nocheck`, the signature typed** (TS7006/TS7053, 7: Richard's ruling; with the directive off the files hold
exactly those 7 and no name from the component's scope); an input called `key` bound as `keyProp` (TS17001, 12); a kit
import aliased off its component's name, a kit `object` input that takes an array, an untyped animation option cast to a
number (TS2440 4, TS2322 6). **The gate: 0 in 0 of 16, every tracked template's export passes `tsc -b`.** All 19: 1 in 1,
nightbook's Expression `null` into a style colour, filed P18-S125-STYLENULL (nightbook is not tracked). `dispdiff.ts`: 0
dispositions changed in the templates (13,432 nodes) or the corpus (27,789). Whole package 141 / 141 suites.
